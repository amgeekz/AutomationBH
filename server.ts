import express from "express";
import path from "path";
import puppeteer from "puppeteer";
import { compileHeadlessScript } from "./src/utils/headlessScript.js";
import cron from "node-cron";
import parser from "cron-parser";

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

app.use(express.json());

// Export app instance for serverless platforms like Vercel
export { app };
export default app;

async function startServer() {

  // API Route - Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "healthy", timestamp: new Date().toISOString() });
  });

  // API Route - Parse Curl command
  app.post("/api/parse-curl", (req, res) => {
    const { curlString } = req.body;
    if (!curlString) {
      return res.status(400).json({ error: "Curl string is required" });
    }

    try {
      const headers: Record<string, string> = {};
      let url = "";

      // Simple regex parser for -H / --header inside curl
      // Matches both single-quoted and double-quoted headers
      const headerRegex = /-H\s+['"]([^'"]+)['"]/g;
      let match;
      while ((match = headerRegex.exec(curlString)) !== null) {
        const headerLine = match[1];
        const colonIndex = headerLine.indexOf(":");
        if (colonIndex !== -1) {
          const key = headerLine.slice(0, colonIndex).trim().toLowerCase();
          const value = headerLine.slice(colonIndex + 1).trim();
          headers[key] = value;
        }
      }

      // Extract URL
      const urlMatch = curlString.match(/curl\s+['"]([^'"]+)['"]/i) || 
                       curlString.match(/['"](https?:\/\/[^'"]+)['"]/i) ||
                       curlString.match(/(https?:\/\/[^\s'"]+)/i);
      
      if (urlMatch) {
         url = urlMatch[1];
      }

      // Extract cookie key-values
      const cookieHeader = headers["cookie"] || "";
      const cookies: Record<string, string> = {};
      
      if (cookieHeader) {
        cookieHeader.split(";").forEach((pair) => {
          const parts = pair.split("=");
          if (parts.length >= 2) {
            const k = parts[0].trim();
            const v = parts.slice(1).join("=").trim();
            cookies[k] = v;
          }
        });
      }

      return res.json({
        success: true,
        url,
        headers,
        cookies,
        csrfToken: headers["x-csrf-token"] || cookies["XSRF-TOKEN"] || "",
        userAgent: headers["user-agent"] || "",
      });
    } catch (error: any) {
      return res.status(500).json({ error: "Failed to parse curl command: " + error.message });
    }
  });

  // API Route - Check Digiflazz Balance Proxy
  app.post("/api/digiflazz/check-balance", async (req, res) => {
    const { headers: clientHeaders, cookies: clientCookies } = req.body;

    if (!clientHeaders || Object.keys(clientHeaders).length === 0) {
      return res.status(400).json({ error: "Headers are required to authenticate with Digiflazz" });
    }

    try {
      // Re-construct the headers for privacy and correctness
      const requestHeaders: Record<string, string> = {
        "User-Agent": clientHeaders["user-agent"] || "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Mobile Safari/537.36",
        "Accept": "application/json",
        "Accept-Language": "id-ID,id;q=0.9,en-US;q=0.8,en;q=0.7",
        "Referer": "https://member.digiflazz.com/buyer-area",
        "Origin": "https://member.digiflazz.com",
        "Sec-Fetch-Dest": "empty",
        "Sec-Fetch-Mode": "cors",
        "Sec-Fetch-Site": "same-origin",
        "X-Requested-With": "XMLHttpRequest",
      };

      // Pass exact auth cookies and tokens from client
      if (clientHeaders["cookie"]) requestHeaders["Cookie"] = clientHeaders["cookie"];
      if (clientHeaders["x-csrf-token"]) requestHeaders["X-CSRF-TOKEN"] = clientHeaders["x-csrf-token"];
      if (clientHeaders["x-xsrf-token"]) requestHeaders["X-XSRF-TOKEN"] = clientHeaders["x-xsrf-token"];

      console.log("Proxying balance check request to Digiflazz...");
      
      const response = await fetch("https://member.digiflazz.com/api/v1/buyer/account/balance", {
        method: "GET",
        headers: requestHeaders,
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (e) {
        responseData = { rawResponse: responseText };
      }

      return res.json({
        statusCode: response.status,
        ok: response.ok,
        data: responseData,
      });
    } catch (error: any) {
      console.error("Proxy Balance Error:", error);
      return res.status(500).json({ error: "Failed to connect to Digiflazz: " + error.message });
    }
  });

  // Global Engine state for automation tracking
  let activeAutomation = {
    status: "idle",
    logs: [] as string[],
    progress: 0,
    updatedCount: 0,
    results: null as any,
    startTime: "",
    browser: null as any
  };

  interface ScheduleState {
    enabled: boolean;
    cronExpression: string;
    preset: string;
    headers: any;
    cookies: any;
    config: any;
    lastRun: string | null;
    nextRun: string | null;
    history: Array<{
      timestamp: string;
      status: "success" | "failed" | "skipped";
      message: string;
      updatedCount?: number;
    }>;
  }

  let activeSchedule: ScheduleState = {
    enabled: false,
    cronExpression: "0 */2 * * *", // Default: every 2 hours
    preset: "every-2-hours",
    headers: null,
    cookies: null,
    config: null,
    lastRun: null,
    nextRun: null,
    history: []
  };

  let scheduledJob: any = null;

  function updateNextRun() {
    if (activeSchedule.enabled && activeSchedule.cronExpression) {
      try {
        const interval = parser.parse(activeSchedule.cronExpression);
        activeSchedule.nextRun = interval.next().toString();
      } catch (e: any) {
        activeSchedule.nextRun = "Format Cron Tidak Valid";
      }
    } else {
      activeSchedule.nextRun = null;
    }
  }

  async function executeScheduledSync() {
    const timestamp = new Date().toISOString();
    console.log(`[Scheduler] executeScheduledSync triggered at ${timestamp}`);
    
    if (!activeSchedule.headers || !activeSchedule.cookies) {
      console.warn("[Scheduler Skipped] Missing headers or cookies for automation.");
      activeSchedule.history.unshift({
        timestamp,
        status: "skipped",
        message: "Terlewati: Kredensial login (Curl Cookies) belum pernah dikonfigurasi atau kosong."
      });
      if (activeSchedule.history.length > 20) activeSchedule.history.pop();
      return;
    }

    if (activeAutomation.status === "running") {
      console.warn("[Scheduler Skipped] Manual automation is already in progress.");
      activeSchedule.history.unshift({
        timestamp,
        status: "skipped",
        message: "Terlewati: Proses sinkronisasi manual sedang berjalan."
      });
      if (activeSchedule.history.length > 20) activeSchedule.history.pop();
      return;
    }

    // Set standard activeAutomation states as running, so standard status polling can see it if user is online
    activeAutomation = {
      status: "running",
      logs: [`[${new Date().toLocaleTimeString()}] 📆 [SCHEDULED] Automated Cron Sync Triggered.`],
      progress: 0,
      updatedCount: 0,
      results: null,
      startTime: new Date().toLocaleTimeString(),
      browser: null
    };

    activeSchedule.lastRun = timestamp;
    updateNextRun();

    try {
      console.log("[Scheduler] Launching Headless Chromium session...");
      const browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--no-first-run",
          "--no-zygote",
          "--single-process"
        ]
      });
      activeAutomation.browser = browser;

      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 800 });

      const userAgent = activeSchedule.headers["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
      await page.setUserAgent(userAgent);

      const cookiesList = Object.entries(activeSchedule.cookies || {}).map(([name, value]) => ({
        name,
        value: String(value),
        domain: "member.digiflazz.com",
        path: "/"
      }));

      if (cookiesList.length > 0) {
        await page.setCookie(...cookiesList);
      }

      await page.goto("https://member.digiflazz.com/buyer-area", {
        waitUntil: "networkidle2",
        timeout: 45000
      });

      const currentUrl = page.url();
      if (currentUrl.includes("/login")) {
        activeAutomation.status = "failed";
        activeAutomation.logs.push("❌ AUTHENTICATION ERROR: Session cookies have expired.");
        activeSchedule.history.unshift({
          timestamp,
          status: "failed",
          message: "Gagal: Sesi cookies expired (Halaman diarahkan kembali ke login)."
        });
        await browser.close();
        return;
      }

      page.on('console', msg => {
        const text = msg.text();
        if (text.includes("[AUTOMATOR]") || text.includes("[PROGRESS_UPDATE]") || text.includes("[AUTOMATOR_FINISHED]") || text.includes("[RESULT_LOGS]")) {
          if (text.startsWith("[PROGRESS_UPDATE]")) {
            activeAutomation.updatedCount++;
            activeAutomation.progress = Math.min(100, activeAutomation.progress + 6);
            activeAutomation.logs.push(`[UPDATE] ${text.replace("[PROGRESS_UPDATE]", "").trim()}`);
          } else if (text.startsWith("[RESULT_LOGS]")) {
            try {
              const resultsJson = text.substring("[RESULT_LOGS]".length);
              activeAutomation.results = JSON.parse(resultsJson);
            } catch (e) {}
          } else if (text.startsWith("[AUTOMATOR_FINISHED]")) {
            activeAutomation.progress = 100;
            activeAutomation.status = "completed";
            activeAutomation.logs.push("✅ Automation completed successfully!");
          } else {
            activeAutomation.logs.push(text.replace("[AUTOMATOR]", "[SCRAPER]").trim());
          }
        }
      });

      const botScript = compileHeadlessScript(activeSchedule.config);
      await page.evaluate(botScript);

      const startMs = Date.now();
      const timeoutMs = 15 * 60 * 1000;

      while (activeAutomation.status === "running") {
        if (Date.now() - startMs > timeoutMs) {
          activeAutomation.status = "failed";
          activeAutomation.logs.push("❌ TIMEOUT: Automation loop exceeded 15 minutes.");
          break;
        }

        const isFinished = await page.evaluate(() => {
          return (window as any).proses === false;
        }).catch(() => true);

        if (isFinished) {
          activeAutomation.status = "completed";
          break;
        }

        await new Promise(r => setTimeout(r, 1500));
      }

      await browser.close();

      activeSchedule.history.unshift({
        timestamp,
        status: activeAutomation.status === "completed" ? "success" : "failed",
        message: activeAutomation.status === "completed" 
          ? `Sukses menyinkronkan seluruh produk.` 
          : `Gagal menyelesaikan sinkronisasi otomatis. Periksa log detail.`,
        updatedCount: activeAutomation.updatedCount
      });

    } catch (err: any) {
      console.error("Puppeteer Scheduled Sync Error:", err);
      activeAutomation.status = "failed";
      activeAutomation.logs.push(`❌ EXCEPTION: ${err.message}`);
      activeSchedule.history.unshift({
        timestamp,
        status: "failed",
        message: `Exception: ${err.message}`
      });
      if (activeAutomation.browser) {
        try {
          await activeAutomation.browser.close();
        } catch (e) {}
      }
    }

    if (activeSchedule.history.length > 20) {
      activeSchedule.history.pop();
    }
  }

  function setupScheduler() {
    if (scheduledJob) {
      scheduledJob.stop();
      scheduledJob = null;
    }

    if (activeSchedule.enabled && activeSchedule.cronExpression) {
      console.log(`[Scheduler] Setting up cron job with expression: ${activeSchedule.cronExpression}`);
      try {
        scheduledJob = cron.schedule(activeSchedule.cronExpression, async () => {
          console.log(`[Scheduler] Cron triggered at ${new Date().toISOString()}`);
          await executeScheduledSync();
        });
        updateNextRun();
      } catch (err: any) {
        console.error(`[Scheduler] Error setting up cron job:`, err);
        activeSchedule.history.unshift({
          timestamp: new Date().toISOString(),
          status: "failed",
          message: `Error setting up scheduler: ${err.message}`
        });
      }
    } else {
      activeSchedule.nextRun = null;
    }
  }

  // Start Automation pipeline Headlessly
  app.post("/api/automation/start", async (req, res) => {
    const { headers: clientHeaders, cookies: clientCookies, config, licenseKey } = req.body;

    if (activeAutomation.status === "running") {
      return res.status(400).json({ error: "Automation is already in progress!" });
    }

    // Reset Engine State
    activeAutomation = {
      status: "running",
      logs: [`[${new Date().toLocaleTimeString()}] 🚀 Automation instance spawned on server.`],
      progress: 0,
      updatedCount: 0,
      results: null,
      startTime: new Date().toLocaleTimeString(),
      browser: null
    };

    // Respond immediately to avoid request timeouts while continuing execution in background
    res.json({ success: true, message: "Automation pipeline launched." });

    // Background asynchronous loop
    (async () => {
      try {
        activeAutomation.logs.push(`[SYSTEM] Initializing Headless Chromium session...`);
        
        const browser = await puppeteer.launch({
          headless: true,
          executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-gpu",
            "--no-first-run",
            "--no-zygote",
            "--single-process"
          ]
        });
        activeAutomation.browser = browser;
        
        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        // User Agent matching
        const userAgent = clientHeaders["user-agent"] || "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36";
        await page.setUserAgent(userAgent);

        // Inject authorization cookies
        const cookiesList = Object.entries(clientCookies || {}).map(([name, value]) => ({
          name,
          value: String(value),
          domain: "member.digiflazz.com",
          path: "/"
        }));

        if (cookiesList.length > 0) {
          await page.setCookie(...cookiesList);
          activeAutomation.logs.push(`[SYSTEM] Auth cookies injected into Chromium sandbox.`);
        }

        activeAutomation.logs.push(`[SYSTEM] Accessing member.digiflazz.com/buyer-area...`);
        
        await page.goto("https://member.digiflazz.com/buyer-area", {
          waitUntil: "networkidle2",
          timeout: 45000
        });

        const currentUrl = page.url();
        activeAutomation.logs.push(`[SYSTEM] Destination reached: ${currentUrl}`);

        if (currentUrl.includes("/login")) {
          activeAutomation.status = "failed";
          activeAutomation.logs.push("❌ AUTHENTICATION ERROR: Session cookies have expired. Please retrieve a new curl paste from your browser DevTools.");
          await browser.close();
          return;
        }

        activeAutomation.logs.push("[SYSTEM] Sesi terotentikasi. Menyuntikkan script automation...");

        // Pipe page console messages back to activeAutomation log array
        page.on('console', msg => {
          const text = msg.text();
          if (text.includes("[AUTOMATOR]") || text.includes("[PROGRESS_UPDATE]") || text.includes("[AUTOMATOR_FINISHED]") || text.includes("[RESULT_LOGS]")) {
            if (text.startsWith("[PROGRESS_UPDATE]")) {
              activeAutomation.updatedCount++;
              // update arbitrary progress
              activeAutomation.progress = Math.min(100, activeAutomation.progress + 6);
              activeAutomation.logs.push(`[UPDATE] ${text.replace("[PROGRESS_UPDATE]", "").trim()}`);
            } else if (text.startsWith("[RESULT_LOGS]")) {
              try {
                const resultsJson = text.substring("[RESULT_LOGS]".length);
                activeAutomation.results = JSON.parse(resultsJson);
              } catch (e) {}
            } else if (text.startsWith("[AUTOMATOR_FINISHED]")) {
              activeAutomation.progress = 100;
              activeAutomation.status = "completed";
              activeAutomation.logs.push("✅ Automation completed successfully!");
            } else {
              activeAutomation.logs.push(text.replace("[AUTOMATOR]", "[SCRAPER]").trim());
            }
          }
        });

        // Run client configurations
        const botScript = compileHeadlessScript(config);
        await page.evaluate(botScript);

        const startMs = Date.now();
        const timeoutMs = 15 * 60 * 1000; // 15 mins max run
        
        while (activeAutomation.status === "running") {
          if (Date.now() - startMs > timeoutMs) {
            activeAutomation.status = "failed";
            activeAutomation.logs.push("❌ TIMEOUT: Automation loop exceeded 15 minutes.");
            break;
          }

          // Check if page session variables indicate inactive
          const isFinished = await page.evaluate(() => {
            return (window as any).proses === false;
          }).catch(() => true);

          if (isFinished) {
            activeAutomation.status = "completed";
            break;
          }

          await new Promise(r => setTimeout(r, 1500));
        }

        await browser.close();
        activeAutomation.logs.push("[SYSTEM] Headless Chrome session terminated cleanly.");

      } catch (err: any) {
        console.error("Puppeteer Automation Error:", err);
        activeAutomation.status = "failed";
        activeAutomation.logs.push(`❌ EXCEPTION: ${err.message}`);
        if (activeAutomation.browser) {
          try {
            await activeAutomation.browser.close();
          } catch (e) {}
        }
      }
    })();
  });

  // Stop Active Automation
  app.post("/api/automation/stop", async (req, res) => {
    if (activeAutomation.status === "running") {
      activeAutomation.status = "failed";
      activeAutomation.logs.push("🛑 Automation stopped by manual command.");
      if (activeAutomation.browser) {
        try {
          await activeAutomation.browser.close();
        } catch (e) {}
      }
      return res.json({ success: true, message: "Server worker terminated." });
    }
    res.json({ success: true, message: "No active instance of worker running." });
  });

  // Get active logs & status
  app.get("/api/automation/status", (req, res) => {
    res.json({
      status: activeAutomation.status,
      logs: activeAutomation.logs,
      progress: activeAutomation.progress,
      updatedCount: activeAutomation.updatedCount,
      results: activeAutomation.results,
      startTime: activeAutomation.startTime
    });
  });

  // Get current schedule setup
  app.get("/api/automation/schedule", (req, res) => {
    res.json({
      enabled: activeSchedule.enabled,
      cronExpression: activeSchedule.cronExpression,
      preset: activeSchedule.preset,
      lastRun: activeSchedule.lastRun,
      nextRun: activeSchedule.nextRun,
      history: activeSchedule.history,
      hasCredentials: !!(activeSchedule.headers && activeSchedule.cookies)
    });
  });

  // Save or configure automation scheduler
  app.post("/api/automation/schedule", (req, res) => {
    const { enabled, cronExpression, preset, headers, cookies, config } = req.body;

    if (enabled) {
      if (!cronExpression) {
        return res.status(400).json({ error: "Cron expression is required when schedule is enabled" });
      }
      try {
        parser.parse(cronExpression);
      } catch (e: any) {
        return res.status(400).json({ error: `Format Cron tidak valid: ${e.message}` });
      }
    }

    activeSchedule.enabled = !!enabled;
    if (cronExpression !== undefined) activeSchedule.cronExpression = cronExpression;
    if (preset !== undefined) activeSchedule.preset = preset;
    if (headers !== undefined) activeSchedule.headers = headers;
    if (cookies !== undefined) activeSchedule.cookies = cookies;
    if (config !== undefined) activeSchedule.config = config;

    // Reset/update the node-cron scheduled trigger wrapper
    setupScheduler();

    res.json({
      success: true,
      message: activeSchedule.enabled 
        ? "Jadwal sinkronisasi otomatis berhasil disimpan dan diaktifkan!" 
        : "Jadwal sinkronisasi otomatis dinonaktifkan.",
      nextRun: activeSchedule.nextRun
    });
  });

  // Clear scheduling run log history
  app.post("/api/automation/schedule/clear-history", (req, res) => {
    activeSchedule.history = [];
    res.json({ success: true, message: "History cleared." });
  });

  // Vercel Cron Job Trigger Endpoint (HTTP Trigger)
  app.get("/api/automation/run-cron", async (req, res) => {
    // Basic security token to prevent spam
    const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_JWT;
    const clientSecret = req.query.secret || req.headers["x-cron-secret"];
    
    if (cronSecret && clientSecret !== cronSecret) {
      return res.status(401).json({ error: "Unauthorized: Invalid or missing cron secret." });
    }

    if (!activeSchedule.enabled) {
      return res.json({ success: false, message: "Scheduler is currently disabled in app settings." });
    }

    console.log("[Vercel Cron] Triggering scheduled sync...");
    
    // On Serverless platforms, we MUST await execution so the container doesn't terminate early.
    try {
      await executeScheduledSync();
      res.json({
        success: true,
        message: "Automated cron sync completed successfully via trigger.",
        lastRun: activeSchedule.lastRun,
        history: activeSchedule.history[0] || null
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`[Proxy Server] running on http://localhost:${PORT}`);
    });
  }
}

startServer();
