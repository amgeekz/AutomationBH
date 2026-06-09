import { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  Key, 
  Settings, 
  Code, 
  Download, 
  RefreshCw, 
  Play, 
  Check, 
  ExternalLink, 
  AlertTriangle, 
  Cookie, 
  Terminal, 
  Sliders, 
  User, 
  Cpu, 
  Copy, 
  Sparkles,
  HelpCircle,
  FileText,
  FileArchive,
  ArrowRight,
  Send,
  MessageSquare,
  BadgeAlert,
  BookOpen,
  Loader2,
  Square,
  CheckCircle2,
  RotateCcw,
  Database,
  TerminalSquare,
  Clock,
  Calendar,
  Save
} from "lucide-react";
import { UpdateConfig, DigiflazzAccount, LicenseStatus } from "./types";
import { compileScript, generateBookmarklet, generateUserscript } from "./utils/codeGenerator";
import JSZip from "jszip";

export default function App() {
  // License States (Loaded from LocalStorage initially)
  const [licenseKey, setLicenseKey] = useState<string>(() => {
    return localStorage.getItem("digiflazz_license_key") || "";
  });
  
  const [licenseStatus, setLicenseStatus] = useState<LicenseStatus>({
    key: localStorage.getItem("digiflazz_license_key") || "",
    checked: false,
    valid: false,
    status: "unknown",
    message: "Masukkan lisensi Anda untuk mengaktifkan fitur kompilasi otomatis."
  });

  const [checkingLicense, setCheckingLicense] = useState<boolean>(false);
  const [activatingLicense, setActivatingLicense] = useState<boolean>(false);

  // Curl Credentials Input
  const [rawCurl, setRawCurl] = useState<string>(() => {
    return localStorage.getItem("digiflazz_raw_curl") || "";
  });

  const [parsedHeaders, setParsedHeaders] = useState<any>(() => {
    const cached = localStorage.getItem("digiflazz_parsed_headers");
    return cached ? JSON.parse(cached) : null;
  });

  const [digiflazzAccount, setDigiflazzAccount] = useState<DigiflazzAccount | null>(() => {
    const cached = localStorage.getItem("digiflazz_account_cached");
    return cached ? JSON.parse(cached) : null;
  });

  const [testingConnection, setTestingConnection] = useState<boolean>(false);
  const [connectionLog, setConnectionLog] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  // Configuration settings (Loaded from LocalStorage initially)
  const [config, setConfig] = useState<UpdateConfig>(() => {
    const cached = localStorage.getItem("digiflazz_update_config");
    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // use default
      }
    }
    return {
      update_all: true,
      replace_code: true,
      harga_max: true,
      auto_save: true,
      multi_service: false,
      allow_invoice: true,
      only_warning: false,
      rating: "4.0"
    };
  });

  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Automation States
  const [automationStatus, setAutomationStatus] = useState<string>("idle");
  const [automationLogs, setAutomationLogs] = useState<string[]>([]);
  const [automationProgress, setAutomationProgress] = useState<number>(0);
  const [automationUpdatedCount, setAutomationUpdatedCount] = useState<number>(0);
  const [automationResults, setAutomationResults] = useState<any | null>(null);
  const [automationStartTime, setAutomationStartTime] = useState<string>("");
  const [isStartingAutomation, setIsStartingAutomation] = useState<boolean>(false);
  const [isStoppingAutomation, setIsStoppingAutomation] = useState<boolean>(false);

  // Scheduling States
  const [scheduleEnabled, setScheduleEnabled] = useState<boolean>(false);
  const [cronExpression, setCronExpression] = useState<string>("0 */2 * * *");
  const [schedulePreset, setSchedulePreset] = useState<string>("every-2-hours");
  const [scheduleLastRun, setScheduleLastRun] = useState<string | null>(null);
  const [scheduleNextRun, setScheduleNextRun] = useState<string | null>(null);
  const [scheduleHistory, setScheduleHistory] = useState<any[]>([]);
  const [isSavingSchedule, setIsSavingSchedule] = useState<boolean>(false);
  const [isClearingHistory, setIsClearingHistory] = useState<boolean>(false);

  const fetchScheduleInfo = async () => {
    try {
      const res = await fetch("/api/automation/schedule");
      if (res.ok) {
        const data = await res.json();
        setScheduleEnabled(data.enabled);
        setCronExpression(data.cronExpression);
        setSchedulePreset(data.preset);
        setScheduleLastRun(data.lastRun);
        setScheduleNextRun(data.nextRun);
        setScheduleHistory(data.history || []);
      }
    } catch (e) {
      console.error("Gagal mengambil info jadwal", e);
    }
  };

  useEffect(() => {
    fetchScheduleInfo();
    const interval = setInterval(fetchScheduleInfo, 5000);
    return () => clearInterval(interval);
  }, []);

  const handlePresetChange = (preset: string) => {
    setSchedulePreset(preset);
    switch (preset) {
      case "every-10-minutes":
        setCronExpression("*/10 * * * *");
        break;
      case "every-hour":
        setCronExpression("0 * * * *");
        break;
      case "every-2-hours":
        setCronExpression("0 */2 * * *");
        break;
      case "every-6-hours":
        setCronExpression("0 */6 * * *");
        break;
      case "every-12-hours":
        setCronExpression("0 */12 * * *");
        break;
      case "daily-midnight":
        setCronExpression("0 0 * * *");
        break;
      case "daily-noon":
        setCronExpression("0 12 * * *");
        break;
      default:
        break;
    }
  };

  const handleCronChange = (expr: string) => {
    setCronExpression(expr);
    setSchedulePreset("custom");
  };

  const handleSaveSchedule = async (enableOverriding?: boolean) => {
    if (!parsedHeaders) {
      alert("Silakan parse Curl login terlebih dahulu untuk menyiapkan otentikasi jadwal.");
      return;
    }
    if (!licenseStatus.valid) {
      alert("Silakan aktifkan Lisensi premium terlebih dahulu.");
      return;
    }

    setIsSavingSchedule(true);
    const shouldEnable = enableOverriding !== undefined ? enableOverriding : scheduleEnabled;

    try {
      const res = await fetch("/api/automation/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          enabled: shouldEnable,
          cronExpression,
          preset: schedulePreset,
          headers: parsedHeaders.headers,
          cookies: parsedHeaders.cookies,
          config
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setScheduleEnabled(shouldEnable);
        setScheduleNextRun(data.nextRun);
        alert(data.message);
        fetchScheduleInfo();
      } else {
        alert(`Gagal menyimpan jadwal: ${data.error || "Unknown response"}`);
      }
    } catch (err: any) {
      alert(`Error saat menyimpan jadwal: ${err.message}`);
    } finally {
      setIsSavingSchedule(false);
    }
  };

  const handleToggleSchedule = async () => {
    const nextState = !scheduleEnabled;
    await handleSaveSchedule(nextState);
  };

  const handleClearScheduleHistory = async () => {
    if (!window.confirm("Apakah Anda yakin ingin menghapus riwayat log sinkronisasi otomatis?")) {
      return;
    }
    setIsClearingHistory(true);
    try {
      const res = await fetch("/api/automation/schedule/clear-history", { method: "POST" });
      if (res.ok) {
        fetchScheduleInfo();
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsClearingHistory(false);
    }
  };

  // Poll automation status
  useEffect(() => {
    let intervalId: any;
    if (automationStatus === "running") {
      intervalId = setInterval(async () => {
        try {
          const res = await fetch("/api/automation/status");
          const data = await res.json();
          setAutomationStatus(data.status);
          setAutomationLogs(data.logs || []);
          setAutomationProgress(data.progress || 0);
          setAutomationUpdatedCount(data.updatedCount || 0);
          setAutomationResults(data.results || null);
          setAutomationStartTime(data.startTime || "");

          if (data.status !== "running") {
            clearInterval(intervalId);
          }
        } catch (e) {
          console.error("Poll status error", e);
        }
      }, 1000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [automationStatus]);

  // Start Automation handler
  const handleStartAutomation = async () => {
    if (!parsedHeaders) {
      alert("Silakan parse Curl login terlebih dahulu.");
      return;
    }
    if (!licenseStatus.valid) {
      alert("Silakan aktifkan Lisensi premium terlebih dahulu.");
      return;
    }

    setIsStartingAutomation(true);
    setAutomationLogs(["[SYSTEM] Mempersiapkan payload automation pada server..."]);
    setAutomationStatus("running");
    setAutomationProgress(0);
    setAutomationUpdatedCount(0);
    setAutomationResults(null);

    try {
      const res = await fetch("/api/automation/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: parsedHeaders.headers,
          cookies: parsedHeaders.cookies,
          config,
          licenseKey
        })
      });

      const data = await res.json();
      if (!data.success) {
        setAutomationStatus("failed");
        setAutomationLogs((prev) => [...prev, `❌ Gagal memulai: ${data.error || "Unknown response"}`]);
      }
    } catch (err: any) {
      setAutomationStatus("failed");
      setAutomationLogs((prev) => [...prev, `❌ Error: ${err.message}`]);
    } finally {
      setIsStartingAutomation(false);
    }
  };

  // Stop Automation handler
  const handleStopAutomation = async () => {
    setIsStoppingAutomation(true);
    try {
      const res = await fetch("/api/automation/stop", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAutomationStatus("failed");
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsStoppingAutomation(false);
    }
  };

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("digiflazz_update_config", JSON.stringify(config));
  }, [config]);

  // Effect to automatically do a preliminary verification of cached license on mount
  useEffect(() => {
    if (licenseKey) {
      handleCheckLicense(licenseKey, false);
    }
  }, []);

  // Handler to parse Curl Command in backend
  const handleParseCurl = async () => {
    if (!rawCurl.trim()) return;
    setIsParsing(true);
    addLog("Parsing Curl Command...");
    try {
      const res = await fetch("/api/parse-curl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ curlString: rawCurl })
      });
      const data = await res.json();
      if (data.success) {
        setParsedHeaders(data);
        localStorage.setItem("digiflazz_raw_curl", rawCurl);
        localStorage.setItem("digiflazz_parsed_headers", JSON.stringify(data));
        addLog("✅ Curl command parsed successfully.");
        addLog(`Found CSRF-Token: ${data.csrfToken ? "Ya" : "Tidak"}`);
        addLog(`Found Cookies: ${Object.keys(data.cookies || {}).length} pairs`);
      } else {
        addLog("❌ Gagal parsing Curl: " + (data.error || "Format tidak sesuai"));
      }
    } catch (err: any) {
      addLog("❌ Error: " + err.message);
    } finally {
      setIsParsing(false);
    }
  };

  const addLog = (message: string) => {
    setConnectionLog((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${message}`]);
  };

  // Handler to run backend connection proxy
  const handleTestConnection = async () => {
    if (!parsedHeaders) {
      addLog("❌ Silakan parse Curl login terlebih dahulu.");
      return;
    }

    setTestingConnection(true);
    setConnectionLog([]);
    addLog("Initiating Digiflazz Buyer Area Authentication Session...");
    addLog("Proxying request via server to circumvent browser CORS restrictions...");

    try {
      const res = await fetch("/api/digiflazz/check-balance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: parsedHeaders.headers,
          cookies: parsedHeaders.cookies
        })
      });

      const rootData = await res.json();
      addLog(`HTTP Status: ${rootData.statusCode} (${rootData.ok ? "Success" : "Failed"})`);

      if (rootData.ok && rootData.data) {
        addLog("✅ Successfully fetched account info!");
        const accountInfo: DigiflazzAccount = {
          balance: rootData.data.balance || rootData.data.deposit || 0,
          account_id: rootData.data.username || rootData.data.id || "Connected User",
          seller_name: rootData.data.name || "Digiflazz Member",
          raw_response: rootData.data
        };
        setDigiflazzAccount(accountInfo);
        localStorage.setItem("digiflazz_account_cached", JSON.stringify(accountInfo));
        addLog(`Owner Name: ${accountInfo.seller_name}`);
        addLog(`Balance: Rp ${accountInfo.balance.toLocaleString("id-ID")}`);
      } else {
        addLog("❌ Session Digiflazz tidak valid / Cookies kadaluarsa.");
        addLog("Raw Detail response: " + JSON.stringify(rootData.data || rootData.error));
        setDigiflazzAccount(null);
      }
    } catch (err: any) {
      addLog("❌ API Connection failure: " + err.message);
      setDigiflazzAccount(null);
    } finally {
      setTestingConnection(false);
    }
  };

  // Check & Activate license API call
  const handleCheckLicense = async (key: string, triggerActivation: boolean = true) => {
    if (!key.trim()) return;
    setCheckingLicense(true);
    try {
      const url = `https://licensekey-cyan.vercel.app/api/license/info?licenseKey=${encodeURIComponent(key)}`;
      const res = await fetch(url, {
        method: "GET",
        headers: { "Accept": "application/json" }
      });
      const data = await res.json();

      if (data.ok && data.license) {
        const statusVal = data.license.status;
        
        if (statusVal === "active") {
          setLicenseStatus({
            key,
            checked: true,
            valid: true,
            status: "active",
            message: "Lisensi aktif & terverifikasi."
          });
          localStorage.setItem("digiflazz_license_key", key);
        } else if (statusVal === "unused" && triggerActivation) {
          // If unused, let's run activation
          setActivatingLicense(true);
          const deviceId = "dev_web_dash_" + Math.random().toString(36).substring(2, 10);
          const actRes = await fetch("https://licensekey-cyan.vercel.app/api/license/activate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              licenseKey: key,
              deviceId,
              deviceName: "Digiflazz Auto Update Web Dashboard"
            })
          });
          const actData = await actRes.json();
          if (actData.ok) {
            setLicenseStatus({
              key,
              checked: true,
              valid: true,
              status: "active",
              message: "Aktivasi berhasil! Lisensi Anda sekarang Aktif."
            });
            localStorage.setItem("digiflazz_license_key", key);
          } else {
            setLicenseStatus({
              key,
              checked: true,
              valid: false,
              status: "unused",
              message: actData.message || "Gagal melakukan aktivasi otomatis."
            });
          }
          setActivatingLicense(false);
        } else {
          setLicenseStatus({
            key,
            checked: true,
            valid: false,
            status: "unknown",
            message: `Status lisensi: ${statusVal}. Hubungi Geekz untuk aktivasi.`
          });
        }
      } else {
        setLicenseStatus({
          key,
          checked: true,
          valid: false,
          status: "expired",
          message: data.message || "Lisensi tidak ditemukan atau telah kedaluwarsa."
        });
      }
    } catch (err: any) {
      setLicenseStatus({
        key,
        checked: true,
        valid: false,
        status: "unknown",
        message: "Koneksi ke server lisensi gagal: " + err.message
      });
    } finally {
      setCheckingLicense(false);
    }
  };

  const compiledRawScript = compileScript(config, licenseKey);
  const bookmarkletUrl = generateBookmarklet(compiledRawScript);
  const userscriptCode = generateUserscript(compiledRawScript, licenseKey);

  // Trigger download Chrome Extension ZIP (JSZip)
  const handleDownloadExtension = async () => {
    try {
      const zip = new JSZip();
      
      // 1. manifest.json
      const manifest = {
        "manifest_version": 3,
        "name": "Digiflazz Auto Update by Geekz",
        "version": "1.1.2",
        "description": "Automated product updater extension for Digiflazz Buyer Panel",
        "action": {
          "default_popup": "popup.html"
        },
        "content_scripts": [
          {
            "matches": ["https://member.digiflazz.com/*"],
            "js": ["content.js"],
            "run_at": "document_end"
          }
        ]
      };
      zip.file("manifest.json", JSON.stringify(manifest, null, 2));

      // 2. content.js
      zip.file("content.js", compiledRawScript);

      // 3. popup.html
      const popupHtml = `<!DOCTYPE html>
<html>
<head>
  <style>
    body {
      width: 280px;
      font-family: system-ui, -apple-system, sans-serif;
      margin: 0;
      padding: 16px;
      background: #0f172a;
      color: #e5e7eb;
    }
    .header {
      border-bottom: 1px solid #1e293b;
      padding-bottom: 12px;
      margin-bottom: 12px;
    }
    .title {
      font-weight: bold;
      font-size: 15px;
      color: #3b82f6;
    }
    .author {
      font-size: 11px;
      color: #10b981;
      margin-top: 2px;
    }
    .btn {
      display: block;
      width: 100%;
      padding: 8px;
      background: #10b981;
      color: #022c22;
      border: none;
      text-align: center;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      text-decoration: none;
      box-sizing: border-box;
      margin-top: 12px;
    }
    .info {
      font-size: 12px;
      color: #9ca3af;
      line-height: 1.4;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="title">Digiflazz Auto Update</div>
    <div class="author">Power by Geekz • t.me/amgeekz</div>
  </div>
  <p class="info">Extension dikonfigurasi & siap dijalankan! Buka halaman <strong>member.digiflazz.com/buyer-area</strong>, extension akan otomatis login dengan lisensi Anda dan mulai mengupdate.</p>
  <a class="btn" href="https://wa.me/6285649455626" target="_blank">Contact WhatsApp</a>
</body>
</html>`;
      zip.file("popup.html", popupHtml);

      // 4. README.txt
      const readme = `DIGIFLAZZ AUTO UPDATE EXTENSION BY GEEKZ
=========================================

CARA INSTALASI PADA GOOGLE CHROME:
1. Ekstrak file ZIP ini ke sebuah folder baru di komputer Anda.
2. Buka Google Chrome di komputer Anda.
3. Masuk ke halaman setting extension: chrome://extensions/
4. Aktifkan fitur "Developer mode" (Mode Pengembang) di tombol toggle kanan atas halaman.
5. Klik tombol "Load unpacked" (Muat yang tidak dikemas) di pojok kiri atas.
6. Pilih folder tempat Anda mengekstrak file ZIP ini tadi.
7. Selesai! Extension telah terpasang.
8. Buka tab baru dan buka halaman: https://member.digiflazz.com/buyer-area
9. Program auto-update akan berjalan secara otomatis di halaman tersebut!

=== Dukungan Developer ===
Telegram: t.me/amgeekz
WhatsApp: 0856-4945-5626`;
      zip.file("README.txt", readme);

      // Generate BLOB & Download
      const blob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "digiflazz_auto_update_extension.zip";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert("Error generating file ZIP: " + err.message);
    }
  };

  // Helper to copy text to clipboard
  const handleCopyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(label);
    setTimeout(() => setCopyFeedback(null), 3000);
  };

  // Helper to download Greasemonkey/Tampermonkey file
  const handleDownloadUserscript = () => {
    const blob = new Blob([userscriptCode], { type: "text/javascript" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "digiflazz_auto_update.user.js";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 flex flex-col antialiased">
      {/* Dynamic Header */}
      <header className="border-b border-zinc-900 bg-[#09090b]/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/10 border border-cyan-500/20 p-2.5 rounded-lg shadow-sm">
              <Cpu className="text-cyan-400 w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-sans font-semibold text-lg tracking-tight text-white">
                  Digiflazz Auto Update
                </h1>
                <span className="text-[10px] bg-zinc-900 text-cyan-400 font-mono px-2 py-0.5 rounded-full border border-cyan-500/15">
                  v1.1 Client-Server
                </span>
              </div>
              <p className="text-xs text-zinc-400 font-sans mt-0.5">
                Powered by <strong className="text-cyan-400">Geekz Studio</strong>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <a 
              href="https://t.me/amgeekz" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-[#0a0a0c] hover:border-cyan-500/30 transition duration-150 text-cyan-400 px-3 py-1.5 rounded-md border border-white/5 font-medium"
            >
              <Send className="w-3.5 h-3.5" />
              Telegram
            </a>
            <a 
              href="https://wa.me/6285649455626" 
              target="_blank" 
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs bg-[#0a0a0c] hover:border-emerald-500/30 transition duration-150 text-emerald-400 px-3 py-1.5 rounded-md border border-white/5 font-medium"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              WhatsApp
            </a>
            <div className={`text-xs font-medium px-3 py-1.5 rounded-md border flex items-center gap-1.5 ${
              licenseStatus.valid 
                ? "bg-emerald-950/20 text-emerald-400 border-emerald-800/30" 
                : "bg-amber-950/20 text-amber-400 border-amber-900/30"
            }`}>
              <div className={`w-1.5 h-1.5 rounded-full ${licenseStatus.valid ? "bg-emerald-400 animate-ping" : "bg-amber-500"}`}></div>
              {licenseStatus.valid ? "Lisensi Aktif" : "Cek Lisensi Anda"}
            </div>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-8 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side: Setup Steps Wizard - Columns: 7 */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* Step 1: License Manager */}
          <section id="step-license" className="glass-panel border border-white/5 rounded-xl overflow-hidden shadow-xl hover:border-cyan-500/20 transition duration-300">
            <div className="bg-gradient-to-r from-[#0d0d11] to-[#0a0a0c] px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#131217] text-xs font-mono font-bold text-cyan-400 border border-white/5">
                  1
                </span>
                <h2 className="font-sans font-semibold text-white tracking-wide">
                  Aktivasi & Verifikasi Lisensi
                </h2>
              </div>
              <Key className="text-cyan-400 w-4 h-4" />
            </div>

            <div className="p-5 space-y-5">
              <div>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Gunakan License Key premium yang dibeli melalui partner resmi <span className="text-cyan-400 font-semibold">Geekz</span> untuk mengaktifkan kode script compiler.
                </p>
                
                <div className="mt-4 flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      placeholder="Masukkan License Key (e.g. GEEKZ-XXXX-XXXX)" 
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value)}
                      className="w-full bg-[#030304] border border-white/5 focus:border-cyan-500/40 rounded-lg py-2.5 px-3 text-white font-mono text-sm placeholder-zinc-600 outline-none"
                    />
                  </div>
                  <button 
                    onClick={() => handleCheckLicense(licenseKey)}
                    disabled={checkingLicense || !licenseKey.trim()}
                    className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 font-semibold text-xs px-4 rounded-lg transition duration-150 focus:outline-none flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    {checkingLicense ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      "Aktifkan"
                    )}
                  </button>
                </div>
              </div>

              {/* License Status Widget */}
              <div className={`p-4 rounded-lg border flex gap-3 ${
                licenseStatus.valid 
                  ? "bg-emerald-950/15 border-emerald-500/20 text-emerald-300" 
                  : "bg-[#030304] border border-white/5 text-zinc-300"
              }`}>
                {licenseStatus.valid ? (
                  <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <h4 className="text-bold text-xs font-semibold text-white">
                    {licenseStatus.valid ? "Lisensi Terverifikasi (Sukses)" : "Menunggu Lisensi"}
                  </h4>
                  <p className="text-xs leading-relaxed mt-1 text-zinc-400">
                    {licenseStatus.message}
                  </p>
                  
                  {!licenseStatus.valid && (
                    <div className="mt-3 flex items-center gap-2">
                      <span className="text-[10px] text-zinc-500">Belum punya lisensi? Hubungi developer :</span>
                      <a 
                        href="https://wa.me/6285649455626" 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-cyan-400 font-medium hover:underline flex items-center gap-0.5"
                      >
                        Geekz Studio <ExternalLink className="w-2.5 h-2.5 inline-block" />
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* Step 2: Digiflazz Authenticator via Curl */}
          <section id="step-auth" className="glass-panel border border-white/5 rounded-xl overflow-hidden shadow-xl hover:border-cyan-500/20 transition duration-300">
            <div className="bg-gradient-to-r from-[#0d0d11] to-[#0a0a0c] px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#131217] text-xs font-mono font-bold text-cyan-400 border border-white/5">
                  2
                </span>
                <h2 className="font-sans font-semibold text-white tracking-wide">
                  Otentikasi Digiflazz (Login Proxy)
                </h2>
              </div>
              <Cookie className="text-cyan-400 w-4 h-4" />
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-xs font-medium text-zinc-450 mb-1.5 flex items-center justify-between">
                  <span className="text-zinc-400">Paste Curl Command dari Devtools Browser:</span>
                  <a 
                    href="#how-to" 
                    className="text-cyan-400 text-[10px] hover:underline flex items-center gap-0.5"
                  >
                    Bantuan <HelpCircle className="w-3 h-3" />
                  </a>
                </label>
                <textarea 
                  rows={4}
                  placeholder={`curl 'https://member.digiflazz.com/api/v1/buyer/account/balance' \\
  -H 'cookie: remember_web_59ba36...; laravel_token=...; XSRF-TOKEN=...' \\
  -H 'x-csrf-token: ...' \\
  ...`}
                  value={rawCurl}
                  onChange={(e) => setRawCurl(e.target.value)}
                  className="w-full bg-[#030304] border border-white/5 focus:border-cyan-500/40 rounded-lg p-3 text-zinc-350 font-mono text-xs placeholder-zinc-700 outline-none resize-y"
                />
                
                <div className="mt-3 flex gap-2 justify-end">
                  {rawCurl.trim() && (
                    <button 
                      onClick={() => { setRawCurl(""); setParsedHeaders(null); setDigiflazzAccount(null); }}
                      className="text-zinc-400 hover:text-white text-xs px-3 py-1.5 rounded-lg border border-white/5 hover:border-cyan-500/30 cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <button 
                    onClick={handleParseCurl}
                    disabled={isParsing || !rawCurl.trim()}
                    className="bg-[#0c0c0e] hover:border-cyan-500/30 text-cyan-400 border border-white/5 px-4 py-1.5 rounded-lg text-xs font-medium focus:outline-none flex items-center gap-1.5 disabled:opacity-40 cursor-pointer"
                  >
                    {isParsing && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                    Parse Credentials
                  </button>
                </div>
              </div>

              {/* Balance Widget / Proxy Checker */}
              {parsedHeaders && (
                <div className="bg-[#070709] border border-white/5 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-cyan-400 font-semibold flex items-center gap-1 font-mono">
                      <Terminal className="w-3.5 h-3.5 text-cyan-400" /> credentials.parsed
                    </span>
                    <button 
                      onClick={handleTestConnection}
                      disabled={testingConnection}
                      className="bg-cyan-500 hover:bg-cyan-600 text-slate-950 px-3 py-1.5 text-xs font-semibold rounded-md flex items-center gap-1 cursor-pointer shadow-sm"
                    >
                      {testingConnection ? (
                        <RefreshCw className="w-3 h-3 animate-spin" />
                      ) : (
                        "Test & Ambil Balance"
                      )}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="bg-[#030304] p-2.5 rounded-md border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-0.5 font-mono">CSRF Token loaded</span>
                      <span className="text-xs font-mono text-zinc-300 truncate block">
                        {parsedHeaders.csrfToken ? "Active Token" : "(Tidak ditemukan)"}
                      </span>
                    </div>
                    <div className="bg-[#030304] p-2.5 rounded-md border border-white/5">
                      <span className="text-[10px] text-zinc-500 uppercase tracking-widest block mb-0.5 font-mono">Cookies Count</span>
                      <span className="text-xs font-mono text-zinc-300 block">
                        {Object.keys(parsedHeaders.cookies || {}).length} cookies
                      </span>
                    </div>
                  </div>

                  {digiflazzAccount ? (
                    <div className="bg-emerald-950/15 border border-emerald-500/20 p-4 rounded-lg flex items-center justify-between gap-4 select-text">
                      <div>
                        <div className="flex items-center gap-1 text-[11px] text-emerald-400 font-semibold mb-1 uppercase tracking-wider font-mono">
                          <Check className="w-3.5 h-3.5" /> Digiflazz Auth Active
                        </div>
                        <h4 className="font-bold text-base text-white">
                          Rp {digiflazzAccount.balance?.toLocaleString("id-ID") || "0"}
                        </h4>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Username: <span className="font-mono text-cyan-400 font-medium">{digiflazzAccount.account_id || "Connected"}</span>
                        </p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs block text-zinc-300 font-semibold">{digiflazzAccount.seller_name}</span>
                        <span className="text-[10px] text-zinc-500 block mt-0.5">Akun Buyer Aktif</span>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-[#030304] p-3 rounded-lg border border-white/5 text-[11px] text-zinc-450 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <span className="text-zinc-400">Sesi koneksi belum dicek atau tidak terhubung. Klik tombol <strong>"Test & Ambil Balance"</strong> untuk memverifikasi session cookie Anda dari server proxy.</span>
                      </div>
                    </div>
                  )}

                  {/* Test logs terminal output */}
                  {connectionLog.length > 0 && (
                    <div className="p-3 bg-[#020202] border border-white/5 rounded font-mono text-[10px] text-zinc-400 space-y-1 max-h-[140px] overflow-y-auto">
                      {connectionLog.map((log, index) => (
                        <div key={index} className="leading-5 truncate">
                          {log}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Step 3: Auto-Update Rules / Configs */}
          <section id="step-rules" className="glass-panel border border-white/5 rounded-xl overflow-hidden shadow-xl hover:border-cyan-500/20 transition duration-300">
            <div className="bg-gradient-to-r from-[#0d0d11] to-[#0a0a0c] px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#131217] text-xs font-mono font-bold text-cyan-400 border border-white/5">
                  3
                </span>
                <h2 className="font-sans font-semibold text-white tracking-wide">
                  Konfigurasi Parameter Auto-Update
                </h2>
              </div>
              <Sliders className="text-cyan-400 w-4 h-4" />
            </div>

            <div className="p-5 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Rule Item: update_all */}
                <label className="flex items-start gap-3 p-3 bg-[#030304] border border-white/5 rounded-lg cursor-pointer hover:border-cyan-500/20 transition duration-150 selection:bg-transparent">
                  <input 
                    type="checkbox" 
                    checked={config.update_all}
                    onChange={(e) => setConfig({ ...config, update_all: e.target.checked })}
                    className="mt-1 accent-cyan-500 rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-100 block">Update Semua Layanan</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Mengupdate seluruh layanan baru, non-aktif, atau aktif sekaligus.</span>
                  </div>
                </label>

                {/* Rule Item: replace_code */}
                <label className={`flex items-start gap-3 p-3 bg-[#030304] border border-white/5 rounded-lg cursor-pointer hover:border-cyan-500/20 transition duration-150 selection:bg-transparent ${!config.update_all ? "opacity-30 pointer-events-none" : ""}`}>
                  <input 
                    type="checkbox" 
                    checked={config.replace_code && config.update_all}
                    disabled={!config.update_all}
                    onChange={(e) => setConfig({ ...config, replace_code: e.target.checked })}
                    className="mt-1 accent-cyan-500 rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-100 block">Timpa SKU Code yang Ada</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Mereplace dan menulis ulang kode SKU produk yang sudah terisi kode sebelumnya.</span>
                  </div>
                </label>

                {/* Rule Item: harga_max */}
                <label className="flex items-start gap-3 p-3 bg-[#030304] border border-white/5 rounded-lg cursor-pointer hover:border-cyan-500/20 transition duration-150 selection:bg-transparent">
                  <input 
                    type="checkbox" 
                    checked={config.harga_max}
                    onChange={(e) => setConfig({ ...config, harga_max: e.target.checked })}
                    className="mt-1 accent-cyan-500 rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-100 block">Tulis Harga Max Dari Seller</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Otomatis mencocokkan harga penjualan maksimal (markup) sesuai harga modal seller terbaik.</span>
                  </div>
                </label>

                {/* Rule Item: auto_save */}
                <label className="flex items-start gap-3 p-3 bg-[#030304] border border-white/5 rounded-lg cursor-pointer hover:border-cyan-500/20 transition duration-150 selection:bg-transparent">
                  <input 
                    type="checkbox" 
                    checked={config.auto_save}
                    onChange={(e) => setConfig({ ...config, auto_save: e.target.checked })}
                    className="mt-1 accent-cyan-500 rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-100 block">Auto-Save Tiap Sub Kategori</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Secara rutin mengirim request Simpan ke Digiflazz setelah tiap halaman kategori selesai.</span>
                  </div>
                </label>

                {/* Rule Item: multi_service */}
                <label className="flex items-start gap-3 p-3 bg-[#030304] border border-white/5 rounded-lg cursor-pointer hover:border-cyan-500/20 transition duration-150 selection:bg-transparent">
                  <input 
                    type="checkbox" 
                    checked={config.multi_service}
                    onChange={(e) => setConfig({ ...config, multi_service: e.target.checked })}
                    className="mt-1 accent-cyan-500 rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-100 block">Spesifik Multi-Service Saja</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Hanya memilih seller terpercaya yang mendukung API Multi-Service aktif.</span>
                  </div>
                </label>

                {/* Rule Item: allow_invoice */}
                <label className="flex items-start gap-3 p-3 bg-[#030304] border border-white/5 rounded-lg cursor-pointer hover:border-cyan-500/20 transition duration-150 selection:bg-transparent">
                  <input 
                    type="checkbox" 
                    checked={config.allow_invoice}
                    onChange={(e) => setConfig({ ...config, allow_invoice: e.target.checked })}
                    className="mt-1 accent-cyan-500 rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-zinc-100 block">Izinkan Seller Faktur Pajak</span>
                    <span className="text-[10px] text-zinc-400 mt-1 block">Mengizinkan pencocokan dengan supplier yang mengeluarkan Invoice / Faktur pajak resmi.</span>
                  </div>
                </label>

              </div>

              {/* Sliders and custom value inputs */}
              <div className="bg-[#030304] border border-white/5 rounded-lg p-4 grid grid-cols-1 md:grid-cols-2 gap-5 mt-4">
                <div>
                  <div className="flex justify-between text-xs font-medium text-zinc-350 mb-1.5">
                    <span>Minimal Seller rating:</span>
                    <span className="text-cyan-400 font-bold font-mono">⭐ {config.rating || "Semua"}</span>
                  </div>
                  <input 
                    type="range" 
                    min="0" 
                    max="5" 
                    step="0.1" 
                    value={config.rating}
                    onChange={(e) => setConfig({ ...config, rating: e.target.value })}
                    className="w-full accent-cyan-500 cursor-pointer"
                  />
                  <span className="text-[10px] text-zinc-500 block mt-1">
                    Mengecualikan supplier yang memiliki akumulasi ulasan rating di bawah bintang ini.
                  </span>
                </div>

                <label className="flex items-start gap-3 p-2 bg-[#090506] border border-dashed border-rose-950/40 rounded-lg cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={config.only_warning}
                    onChange={(e) => setConfig({ ...config, only_warning: e.target.checked })}
                    className="mt-1 accent-rose-500 rounded text-slate-900 focus:ring-0 cursor-pointer"
                  />
                  <div>
                    <span className="text-xs font-semibold text-rose-400 block flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Filter Produk Error Saja
                    </span>
                    <span className="text-[10px] text-zinc-400 mt-1 block font-sans">Hanya mengupdate product dengan warning &quot;Harga Max lebih kecil dari Harga Seller&quot;.</span>
                  </div>
                </label>
              </div>

            </div>
          </section>

          {/* Guide section */}
          <section id="how-to" className="glass-panel border border-white/5 rounded-xl overflow-hidden shadow-xl p-5">
            <h3 className="font-sans font-semibold text-sm text-white flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-cyan-400" /> Komando Sistem Cloud Automation
            </h3>
            <div className="space-y-3.5 text-xs text-zinc-400 font-sans leading-relaxed">
              <p>
                Platform ini kini beroperasi penuh sebagai sistem <strong>Cloud Automation & Synchronization</strong> mandiri menggunakan arsitektur headless server.
              </p>
              <div className="pl-4 border-l-2 border-cyan-500/30 space-y-3.5">
                <div>
                  <strong className="text-zinc-200 block mb-0.5">1. Paste Headers & Cookies</strong>
                  Masukkan Curl format dari browser Anda saat login di member area Digiflazz pada panel input di sebelah kiri, kemudian klik <strong>Urutkan & Parse Data Login</strong>.
                </div>
                <div>
                  <strong className="text-zinc-200 block mb-0.5">2. Jalankan Sinkronisasi Langsung</strong>
                  Gunakan panel <strong>Direct Cloud Automator</strong> di sebelah kanan untuk memicu headless browser server guna memperbarui data produk dan mark-up secara instant.
                </div>
                <div>
                  <strong className="text-zinc-200 block mb-0.5">3. Atur Jadwal Otomatis (Cron)</strong>
                  Gunakan panel <strong>Jadwal Sinkronisasi Otomatis</strong> untuk menetapkan interval waktu (seperti setiap jam atau 2 jam sekali) agar server menyinkronkan data secara otonom di latar belakang.
                </div>
              </div>
            </div>
          </section>

        </div>

        {/* Right Side: Direct Web Automation Terminal & Advanced Installers - Columns: 5 */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Main Action Direct Server-Side Automation Box */}
          <section className="glass-panel rounded-xl shadow-2xl border border-cyan-500/20 relative overflow-hidden cyan-glow">
            
            {/* Top decorative badge */}
            <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${automationStatus === "running" ? "bg-emerald-400" : "bg-cyan-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${automationStatus === "running" ? "bg-emerald-500" : "bg-cyan-500"}`}></span>
              </span>
              <span className="text-[10px] font-mono uppercase text-zinc-400">{automationStatus}</span>
            </div>

            <div className="p-5 border-b border-white/5 bg-[#0a0a0c]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wider font-sans">
                <Cpu className="text-cyan-400 w-4 h-4 animate-pulse" /> Direct Cloud Automator
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans">
                Algoritma server akan meluncurkan headless browser virtual untuk menyinkronkan seluruh produk Anda seketika.
              </p>
            </div>

            <div className="p-5 space-y-6 bg-[#070709]/50">
              
              {/* PRIMARY AUTOMATOR CONTROL STATION */}
              <div className="bg-[#030304] border border-white/5 rounded-lg p-5 space-y-4 shadow-inner">
                
                {automationStatus === "idle" && (
                  <div className="space-y-4">
                    <div className="text-center py-4 px-2 space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-cyan-500/10 flex items-center justify-center border border-cyan-500/25">
                        <Terminal className="w-5 h-5 text-cyan-400" />
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200">Siap Menjalankan Sinkronisasi Otomatis</h4>
                      <p className="text-[10px] text-zinc-400 max-w-sm mx-auto leading-normal">
                        Sistem mendeteksi curl cookies Anda aktif. Klik tombol di bawah ini untuk memulai operasi sinkronisasi di latar belakang server.
                      </p>
                    </div>

                    <button 
                      onClick={handleStartAutomation}
                      disabled={isStartingAutomation}
                      className="w-full text-center py-3.5 px-4 rounded-lg bg-gradient-to-r from-cyan-500 via-cyan-400 to-emerald-450 text-slate-950 font-bold text-sm tracking-widest uppercase shadow-lg shadow-cyan-500/10 hover:shadow-cyan-500/35 border-t border-white/20 transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      {isStartingAutomation ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin text-slate-95" /> Memulai Engine...
                        </>
                      ) : (
                        <>
                          <Play className="w-4 h-4 fill-slate-950 text-slate-95" /> Start Server Automation
                        </>
                      )}
                    </button>
                  </div>
                )}

                {automationStatus === "running" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>CLOUD AGENT RUNNING...</span>
                      </div>
                      <span className="text-[10px] font-mono text-zinc-400">Dimulai: {automationStartTime}</span>
                    </div>

                    {/* Progress slider bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between text-[11px] font-mono text-zinc-400">
                        <span>Penyelesaian Sinkronisasi</span>
                        <span className="text-emerald-400 font-bold">{automationProgress}%</span>
                      </div>
                      <div className="w-full bg-zinc-900 rounded-full h-2 overflow-hidden border border-white/5">
                        <div 
                          className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300 rounded-full"
                          style={{ width: `${automationProgress}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-[10px] text-zinc-500 font-mono mt-1">
                        <span>Total Produk Diupdate:</span>
                        <span className="text-zinc-200 font-bold">{automationUpdatedCount}</span>
                      </div>
                    </div>

                    <button 
                      onClick={handleStopAutomation}
                      disabled={isStoppingAutomation}
                      className="w-full text-center py-2.5 px-4 rounded-lg bg-rose-500/10 border border-rose-500/25 hover:bg-rose-500/20 text-rose-400 font-bold text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 active:scale-[0.99]"
                    >
                      {isStoppingAutomation ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <>
                          <Square className="w-3 h-3 fill-rose-400 text-rose-400" /> Stop Automation
                        </>
                      )}
                    </button>
                  </div>
                )}

                {automationStatus === "completed" && (
                  <div className="space-y-4">
                    <div className="text-center py-4 px-2 space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/25">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      </div>
                      <h4 className="text-xs font-bold text-zinc-200">Sinkronisasi Selesai Sukses!</h4>
                      <p className="text-[10px] text-zinc-400 max-w-sm mx-auto leading-normal">
                        Seluruh sub kategori, harga seller, dan status auto-save berhasil diproses dan disimpan di platform Digiflazz.
                      </p>
                      <div className="inline-block py-1.5 px-4 rounded bg-[#091510] border border-emerald-500/10 text-emerald-400 font-bold font-mono text-[11px] mt-2">
                        {automationUpdatedCount} PRODUK BERHASIL DIUPDATE
                      </div>
                    </div>

                    <button 
                      onClick={handleStartAutomation}
                      className="w-full text-center py-2.5 px-4 rounded-lg bg-[#0e0e12] border border-white/5 hover:border-cyan-500/30 text-cyan-400 font-bold text-xs uppercase tracking-wider transition duration-150 cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99]"
                    >
                      <RefreshCw className="w-3.5 h-3.5" /> Jalankan Ulang Sinkronisasi
                    </button>
                  </div>
                )}

                {automationStatus === "failed" && (
                  <div className="space-y-4">
                    <div className="text-center py-4 px-2 space-y-2">
                      <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/15 flex items-center justify-center border border-rose-500/25">
                        <AlertTriangle className="w-5 h-5 text-rose-450 animate-bounce" />
                      </div>
                      <h4 className="text-xs font-bold text-rose-400">Proses Automation Gagal</h4>
                      <p className="text-[10px] text-zinc-400 max-w-sm mx-auto leading-normal">
                        Ada kesalahan otentikasi atau kegagalan struktur halaman. Periksa baris terminal konsol log di bawah ini.
                      </p>
                    </div>

                    <button 
                      onClick={handleStartAutomation}
                      className="w-full text-center py-3 px-4 rounded-lg bg-gradient-to-r from-cyan-500 to-cyan-400 text-slate-950 font-bold text-xs uppercase tracking-wider shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 active:scale-[0.99]"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-slate-95" /> Coba Sinkronisasi Lagi
                    </button>
                  </div>
                )}

              </div>

              {/* REAL-TIME TERMINAL LOG STREAMS */}
              {automationLogs.length > 0 && (
                <div className="space-y-2">
                  <div className="flex justify-between items-center px-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Terminal className="w-3 h-3 text-cyan-400" /> System Terminal Console
                    </span>
                    <button 
                      onClick={() => {
                        const blob = new Blob([automationLogs.join("\n")], { type: "text/plain" });
                        const link = document.createElement("a");
                        link.href = URL.createObjectURL(blob);
                        link.download = `digiflazz_sync_logs_${Date.now()}.txt`;
                        link.click();
                      }}
                      className="text-[9px] font-mono text-cyan-400 hover:text-cyan-350 cursor-pointer"
                    >
                      Download Logs
                    </button>
                  </div>
                  <div className="bg-[#020203] border border-white/5 rounded-lg p-3 font-mono text-[10px] text-cyan-400/80 space-y-1.5 max-h-56 overflow-y-auto min-h-36 shadow-inner relative select-text leading-relaxed">
                    {automationLogs.map((log, index) => {
                      let col = "text-cyan-400/80";
                      if (log.includes("❌") || log.includes("ERROR") || log.includes("Gagal")) col = "text-rose-400";
                      if (log.includes("✅") || log.includes("Sukses") || log.includes("Succeed")) col = "text-emerald-400";
                      if (log.includes("[UPDATE]")) col = "text-amber-400";
                      return (
                        <div key={index} className={`${col} border-b border-white/[0.01] pb-1 break-all`}>
                          {log}
                        </div>
                      );
                    })}
                    <div className="h-1" />
                  </div>
                </div>
              )}

              {/* AUTOMATION SCANNED RESULTS PREVIEW CARD */}
              {automationResults && Object.keys(automationResults).length > 0 && (
                <div className="space-y-2">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1 px-1">
                    <Database className="w-3 h-3 text-emerald-400" /> Scaffolding Update Logs ({Object.values(automationResults).flat().length} items)
                  </span>
                  <div className="bg-[#020203] border border-white/5 rounded-lg overflow-hidden text-[10px] max-h-48 overflow-y-auto">
                    <table className="w-full text-left font-sans">
                      <thead className="bg-[#0e0e12] text-zinc-400 border-b border-white/5 text-[9px] uppercase font-mono">
                        <tr>
                          <th className="p-2">Layanan</th>
                          <th className="p-2">Supplier Baru</th>
                          <th className="p-2 text-right">Harga</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/[0.02]">
                        {Object.entries(automationResults).map(([type, list]: any) => 
                          list.map((item: any, i: number) => (
                            <tr key={`${type}-${i}`} className="hover:bg-white/[0.01]">
                              <td className="p-2 font-medium text-zinc-300 max-w-[120px] truncate">{item.layanan}</td>
                              <td className="p-2 text-zinc-400 truncate max-w-[100px]">{item.new_seller}</td>
                              <td className="p-2 text-emerald-400 text-right font-mono font-bold text-[9px]">{item.new_harga}</td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ADVANCED MANUAL INSTALLERS ACCORDION (BACKUP) */}
              <div className="border-t border-white/5 pt-4">
                <details className="group">
                  <summary className="flex items-center justify-between text-zinc-400 hover:text-white cursor-pointer select-none py-1 text-[11px] font-bold font-sans">
                    <span className="flex items-center gap-1.5 uppercase tracking-wider">
                      <TerminalSquare className="w-3.5 h-3.5 text-zinc-400" /> Advanced Manual Embeds
                    </span>
                    <span className="text-zinc-500 group-open:rotate-180 transition-transform duration-200">▼</span>
                  </summary>
                  
                  <div className="pt-4 space-y-5 group-open:block hidden">
                    
                    {/* BOOKMARKLET PORTFOLIO CARD */}
                    <div className="bg-[#030304] border border-white/5 rounded-lg p-4 space-y-3 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-350 font-bold text-[10px] uppercase tracking-wider font-mono">1. Bookmarklet</span>
                        <span className="text-[10px] text-cyan-400 font-mono">quick.load</span>
                      </div>
                      
                      <div className="py-1">
                        <a 
                          href={bookmarkletUrl}
                          onClick={(e) => {
                            e.preventDefault();
                            alert("Tarik (Hold and drag) tombol ini dan letakkan di Bookmarks Bar browser Anda untuk menginstalnya!");
                          }}
                          className="block text-center py-2.5 px-4 rounded bg-[#0c0c0e] border border-cyan-500/20 text-cyan-400 font-bold text-xs hover:border-cyan-500/50 transition duration-150 cursor-move"
                        >
                          Drag to Bookmarks Bar
                        </a>
                      </div>
                      <p className="text-[9px] text-zinc-500 text-center leading-normal">
                        💡 Tarik tombol di atas ke bilah bookmark Chrome Anda. Klik sesudahnya saat berada di halaman digiflazz.
                      </p>
                    </div>

                    {/* CHROME EXTENSION COMPILER */}
                    <div className="bg-[#030304] border border-white/5 rounded-lg p-4 space-y-3 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-355 font-bold text-[10px] uppercase tracking-wider font-mono">2. Chrome Extension ZIP</span>
                        <span className="text-[10px] text-cyan-400 font-mono">auto.active</span>
                      </div>
                      <button 
                        onClick={handleDownloadExtension}
                        className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded bg-[#0c0c0e] border border-white/5 hover:border-cyan-500/30 transition text-zinc-300 text-xs font-semibold cursor-pointer"
                      >
                        <FileArchive className="w-4 h-4 text-cyan-400" />
                        Download Extension (.zip)
                      </button>
                    </div>

                    {/* USERSCRIPT TAMPERMONKEY BUTTON */}
                    <div className="bg-[#030304] border border-white/5 rounded-lg p-4 space-y-3 shadow-inner">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-355 font-bold text-[10px] uppercase tracking-wider font-mono">3. Tampermonkey Script</span>
                        <span className="text-[10px] text-cyan-400 font-mono">runs.background</span>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={handleDownloadUserscript}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded bg-[#0c0c0e] border border-white/5 hover:border-cyan-500/30 transition text-zinc-300 text-xs font-semibold cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5 text-zinc-400" />
                          Download Script
                        </button>
                        <button 
                          onClick={() => handleCopyText(userscriptCode, "userscript")}
                          className="flex-shrink-0 flex items-center justify-center p-2 rounded bg-[#0c0c0e] border border-white/5 hover:border-cyan-500/30 transition text-zinc-400 hover:text-white cursor-pointer"
                        >
                          {copyFeedback === "userscript" ? (
                            <Check className="w-4 h-4 text-emerald-400" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* RAW CODE VIEW */}
                    <div className="bg-[#030304] border border-white/5 rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-zinc-355 font-bold text-[10px] font-sans">4. Preview Raw JavaScript Code</span>
                        <button 
                          onClick={() => handleCopyText(compiledRawScript, "rawcode")}
                          className="text-[11px] text-cyan-400 hover:text-cyan-350 flex items-center gap-1 font-semibold cursor-pointer"
                        >
                          {copyFeedback === "rawcode" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />} Preview Code
                        </button>
                      </div>
                      <textarea 
                        readOnly
                        rows={3}
                        value={compiledRawScript}
                        className="w-full bg-[#020202] border border-white/5 rounded p-2 text-cyan-400/40 font-mono text-[9px] resize-none select-all"
                      />
                    </div>

                  </div>
                </details>
              </div>

            </div>
          </section>

          {/* Automated Time-Based Cron Scheduler Panel */}
          <section className="glass-panel rounded-xl shadow-2xl border border-cyan-500/20 relative overflow-hidden cyan-glow">
            
            {/* Top decorative badge */}
            <div className="absolute top-0 right-0 p-3 flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${scheduleEnabled ? "bg-emerald-400" : "bg-zinc-500"}`}></span>
                <span className={`relative inline-flex rounded-full h-2 w-2 ${scheduleEnabled ? "bg-emerald-500" : "bg-zinc-500"}`}></span>
              </span>
              <span className="text-[10px] font-mono uppercase text-zinc-400">
                {scheduleEnabled ? "Active Scheduler" : "Inactive"}
              </span>
            </div>

            <div className="p-5 border-b border-white/5 bg-[#0a0a0c]">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2 uppercase tracking-wider font-sans">
                <Clock className="text-cyan-400 w-4 h-4 animate-pulse" /> Jadwal Sinkronisasi Otomatis
              </h3>
              <p className="text-[11px] text-zinc-400 mt-1 font-sans">
                Jadwalkan headless browser server untuk sinkronisasi harga & status Digiflazz otomatis secara real-time.
              </p>
            </div>

            <div className="p-5 space-y-5">
              
              {/* PRIMARY SCHEDULER SWITCH / BUTTON */}
              <div className="bg-[#030304] border border-white/5 rounded-lg p-4 space-y-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-zinc-300 font-bold text-xs uppercase tracking-wider font-mono">Status Penjadwal</span>
                    <p className="text-[10px] text-zinc-500">
                      Aktifkan atau matikan mesin sinkronisasi cron otomatis latar belakang.
                    </p>
                  </div>
                  <button
                    onClick={handleToggleSchedule}
                    disabled={isSavingSchedule}
                    className={`px-4 py-2 rounded font-bold text-xs font-mono select-none cursor-pointer transition-all ${
                      scheduleEnabled 
                        ? "bg-emerald-500/10 border border-emerald-500/35 text-emerald-400 hover:bg-emerald-500/20 shadow-lg shadow-emerald-500/5" 
                        : "bg-zinc-500/10 border border-zinc-500/25 text-zinc-400 hover:bg-zinc-500/15"
                    }`}
                  >
                    {isSavingSchedule ? "Mengupdate..." : scheduleEnabled ? "● ACTIVE (Stop)" : "○ INACTIVE (Start)"}
                  </button>
                </div>

                {/* Warning message if credentials not imported yet */}
                {!parsedHeaders && (
                  <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] leading-relaxed">
                    💡 <strong>Perhatian:</strong> Anda harus memasukkan & mem-parse credentials login (Curl paste) di sebelah kiri terlebih dahulu agar scheduler dapat menghubungkan member area Digiflazz secara terjadwal.
                  </div>
                )}
              </div>

              {/* TIMING CONFIGURATION STATIONS */}
              <div className="bg-[#030304] border border-white/5 rounded-lg p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Interval presets select */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">Preset Waktu</label>
                    <select
                      value={schedulePreset}
                      onChange={(e) => handlePresetChange(e.target.value)}
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2.5 py-1.5 text-xs text-zinc-200 outline-none focus:border-cyan-500/50"
                    >
                      <option value="every-10-minutes">Setiap 10 Menit</option>
                      <option value="every-hour">Setiap Jam</option>
                      <option value="every-2-hours">Setiap 2 Jam</option>
                      <option value="every-6-hours">Setiap 6 Jam</option>
                      <option value="every-12-hours">Setiap 12 Jam</option>
                      <option value="daily-midnight">Setiap Hari (Tengah Malam 00:00)</option>
                      <option value="daily-noon">Setiap Hari (Siang 12:00)</option>
                      <option value="custom">Format Cron Kustom</option>
                    </select>
                  </div>

                  {/* Raw Cron Expression parser */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest block">Format Pola Cron (Linux)</label>
                    <input
                      type="text"
                      value={cronExpression}
                      onChange={(e) => handleCronChange(e.target.value)}
                      placeholder="e.g. * * * * *"
                      className="w-full bg-[#0a0a0c] border border-white/10 rounded px-2.5 py-1.5 text-xs font-mono text-cyan-400 focus:border-cyan-500/50 outline-none"
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-white/[0.03] flex flex-col sm:flex-row justify-between text-[10px] font-mono gap-2 text-zinc-400">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Terakhir Jalan:</span>
                    <span className="text-zinc-200 font-semibold text-[9px]">
                      {scheduleLastRun ? new Date(scheduleLastRun).toLocaleString("id-ID") : "Belum Pernah Run"}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-cyan-400">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Eksekusi Berikutnya:</span>
                    <span className="font-bold underline text-[9px]">
                      {scheduleNextRun ? new Date(scheduleNextRun).toLocaleString("id-ID") : "-"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleSaveSchedule()}
                  disabled={isSavingSchedule}
                  className="w-full mt-2 py-2.5 px-4 rounded bg-[#0a0a0d] hover:bg-cyan-500/10 border border-cyan-500/35 hover:border-cyan-500/50 text-cyan-400 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-cyan-400" /> Simpan Form Penjadwalan
                </button>
              </div>

              {/* SCHEDULER HISTORY LOGGER */}
              <div className="space-y-2">
                <div className="flex justify-between items-center px-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                    <Database className="w-3 h-3 text-cyan-400" /> Riwayat Sinkronisasi Terjadwal ({scheduleHistory.length})
                  </span>
                  {scheduleHistory.length > 0 && (
                    <button
                      onClick={handleClearScheduleHistory}
                      disabled={isClearingHistory}
                      className="text-[9px] font-mono text-zinc-500 hover:text-rose-400 transition cursor-pointer"
                    >
                      Clear Log
                    </button>
                  )}
                </div>
                
                <div className="bg-[#020203] border border-white/5 rounded-lg p-3 font-mono text-[10px] text-zinc-400/80 space-y-2 max-h-48 overflow-y-auto min-h-24 shadow-inner relative leading-normal">
                  {scheduleHistory.length === 0 ? (
                    <div className="text-center py-6 text-zinc-600 font-sans text-[11px]">
                      Belum ada riwayat update cron yang tercatat.
                    </div>
                  ) : (
                    scheduleHistory.map((item, index) => {
                      let tagColor = "px-1.5 py-0.5 text-[8px] font-bold rounded ";
                      if (item.status === "success") tagColor += "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20";
                      else if (item.status === "skipped") tagColor += "bg-amber-500/10 text-amber-500 border border-amber-500/20";
                      else tagColor += "bg-rose-500/10 text-rose-400 border border-rose-500/20";

                      return (
                        <div key={index} className="flex flex-col gap-1 pb-2 border-b border-white/[0.02] last:border-0 last:pb-0">
                          <div className="flex justify-between items-center">
                            <span className="text-zinc-500 text-[9px]">
                              {new Date(item.timestamp).toLocaleString("id-ID")}
                            </span>
                            <span className={tagColor}>{item.status.toUpperCase()}</span>
                          </div>
                          <div className="text-zinc-300 break-words flex justify-between gap-2">
                            <span>{item.message}</span>
                            {item.updatedCount !== undefined && item.updatedCount > 0 && (
                              <span className="text-emerald-400 font-bold shrink-0">
                                +{item.updatedCount} items
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>
          </section>

          {/* Contact and donation details or warnings */}
          <div className="glass-panel border border-white/5 p-5 rounded-xl space-y-4">
            <h4 className="text-xs font-semibold text-zinc-200 uppercase tracking-widest flex items-center gap-1.5 font-sans">
              <BadgeAlert className="text-cyan-400 w-4 h-4" /> Disclaimer & Security
            </h4>
            <div className="text-xs text-zinc-450 leading-relaxed space-y-2 font-sans">
              <p className="text-zinc-400">
                Aplikasi ini tidak menyimpan Cookie, Token, atau License Key Anda di server eksternal mana pun. Segera setelah tab ini ditutup, data otentikasi bersifat temporer dan hanya disimpan secara lokal dalam browser Anda (<code className="text-zinc-200 font-mono">localStorage</code>).
              </p>
              <p className="text-zinc-400">
                Gunakan otentikasi Curl secara bijak. Hubungi developer di Telegram ataupun WhatsApp jika Anda menemukan kendala sinkronisasi harga seller atau bug.
              </p>
            </div>
            
            <div className="pt-3 border-t border-white/5 flex items-center justify-between text-xs font-mono text-zinc-500">
              <span>Developer: Geekz</span>
              <span className={licenseStatus.valid ? "text-emerald-400" : "text-amber-500"}>License Status: {licenseStatus.valid ? "VALID" : "UNPAID"}</span>
            </div>
          </div>

        </div>

      </main>

      {/* Footer */}
      <footer className="bg-[#020203] border-t border-white/5 py-8 text-center text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-1">
          <p>© 2026 Digiflazz Auto Update Dashboard. Dibuat khusus oleh dan untuk Geekz Community.</p>
          <p className="text-zinc-650 text-cyan-400/50 font-mono">Bypass CORS • Local Storage Enabled • Manifest v3 Ready</p>
        </div>
      </footer>
    </div>
  );
}
