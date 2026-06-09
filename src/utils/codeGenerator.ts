import { UpdateConfig } from "../types";

/**
 * Dynamically compiles the Javascript payload with user-specific configurations.
 */
export function compileScript(config: UpdateConfig, licenseKey: string): string {
  // We recreate the exact script but inject the default settings from our dashboard
  return `(function () {
  "use strict";

  console.log(
    \`%c
===========================================
🔧 DIGIFLAZZ AUTO UPDATE (COMPILED USER VERSION)
👨‍💻 Created By: Geekz
📱 Telegram: t.me/amgeekz
📞 Whatsapp: 0856-4945-5626
===========================================\`,
    "background:#1e293b;color:#10b981;padding:10px;border-radius:5px;font-weight:bold;text-align:center;"
  );

  let dataGlobal = {
    update_all: ${config.update_all},
    replace_code: ${config.replace_code},
    harga_max: ${config.harga_max},
    auto_save: ${config.auto_save},
    multi_service: ${config.multi_service},
    allow_invoice: ${config.allow_invoice},
    only_warning: ${config.only_warning},
    rating: ${config.rating ? `"${config.rating}"` : "null"}
  };
  
  let saveDataUpdate = {};
  let proses = true;
  let licenseValid = false;
  let deviceId = null;

  const wait = ms => new Promise(r => setTimeout(r, ms));

  function generateDeviceId() {
    const randomPart = Math.random().toString(36).substring(2, 15);
    const timePart = Date.now().toString(36);
    return \`device_\${randomPart}_\${timePart}\`.substring(0, 32);
  }

  function getStoredLicense() {
    return "${licenseKey}" || localStorage.getItem('digiflazz_license_key') || '';
  }

  function setStoredLicense(key) {
    localStorage.setItem('digiflazz_license_key', key);
  }

  function getStoredDeviceId() {
    let id = localStorage.getItem('digiflazz_device_id');
    if (!id) {
      id = generateDeviceId();
      localStorage.setItem('digiflazz_device_id', id);
    }
    return id;
  }

  async function checkLicense(key) {
    try {
      console.log('🔍 Checking license:', key);
      const url = 'https://licensekey-cyan.vercel.app/api/license/info?licenseKey=' + encodeURIComponent(key);
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        mode: 'cors'
      });
      const data = await response.json();
      if (data.ok && data.license) {
        return {
          valid: true,
          status: data.license.status,
          message: 'License valid'
        };
      } else {
        return {
          valid: false,
          message: data.message || 'License tidak valid'
        };
      }
    } catch (error) {
      console.error('❌ License check error:', error);
      return {
        valid: false,
        message: 'Gagal terhubung ke server license: ' + error.message
      };
    }
  }

  async function activateLicense(key) {
    try {
      const deviceId = getStoredDeviceId();
      const response = await fetch('https://licensekey-cyan.vercel.app/api/license/activate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          licenseKey: key,
          deviceId: deviceId,
          deviceName: 'Digiflazz Web Dashboard Compiled Script'
        })
      });
      const data = await response.json();
      return data;
    } catch (error) {
      return { ok: false, message: 'Network error' };
    }
  }

  async function verifyAndActivateLicense() {
    const storedLicense = getStoredLicense();
    deviceId = getStoredDeviceId();

    if (!storedLicense) {
      return await showLicensePanel();
    }

    const licenseCheck = await checkLicense(storedLicense);
    if (licenseCheck.valid && licenseCheck.status === 'active') {
      licenseValid = true;
      return true;
    }

    if (licenseCheck.valid && licenseCheck.status === 'unused') {
      const activation = await activateLicense(storedLicense);
      if (activation.ok) {
        licenseValid = true;
        return true;
      }
    }

    return await showLicensePanel();
  }

  function showLicensePanel() {
    return new Promise(resolve => {
      const old = document.getElementById("amr-license-overlay");
      if (old) old.remove();

      const d = document;

      const overlay = d.createElement("div");
      overlay.id = "amr-license-overlay";
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(15,23,42,.85)",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(4px)"
      });

      const box = d.createElement("div");
      Object.assign(box.style, {
        background: "#0f172a",
        borderRadius: "14px",
        padding: "20px",
        maxWidth: "400px",
        width: "90%",
        boxShadow: "0 20px 40px rgba(0,0,0,.7)",
        fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif",
        color: "#e5e7eb",
        fontSize: "14px",
        border: "1px solid rgba(148,163,184,.4)"
      });

      box.innerHTML = \`
        <div style="text-align:center;margin-bottom:20px;">
          <div style="font-size:24px;margin-bottom:8px;">🔐</div>
          <div style="font-size:18px;font-weight:600;color:#f9fafb;margin-bottom:8px;">
            License Required
          </div>
          <div style="font-size:13px;color:#9ca3af;">
            Masukkan license key untuk menggunakan Digiflazz Auto Update
          </div>
        </div>

        <div style="margin-bottom:16px;">
          <input type="text" id="license-input" 
                 placeholder="Contoh: GEEKZ-ABCD-1234"
                 value="\${storedLicense}"
                 style="width:100%;padding:10px 12px;border-radius:8px;border:1px solid rgba(148,163,184,.7);background:#020617;color:#f9fafb;font-size:14px;outline:none;">
        </div>

        <div id="license-message" style="font-size:12px;margin-bottom:16px;min-height:20px;"></div>

        <div style="display:flex;gap:10px;justify-content:flex-end;">
          <button id="license-check" style="padding:8px 16px;border-radius:8px;border:0;background:linear-gradient(135deg,#22c55e,#16a34a);color:#022c22;font-weight:600;cursor:pointer;">
            Cek & Aktivasi
          </button>
        </div>

        <div style="margin-top:16px;padding:12px;background:rgba(30,41,59,.5);border-radius:8px;border:1px solid rgba(148,163,184,.3);">
          <div style="font-size:11px;color:#9ca3af;text-align:center;">
            Belum punya license? Hubungi:<br>
            <span style="color:#22c55e;">Telegram: t.me/amgeekz</span> • 
            <span style="color:#22c55e;">Whatsapp: 0856-4945-5626</span>
          </div>
        </div>
      \`;

      overlay.appendChild(box);
      d.body.appendChild(overlay);

      const licenseInput = d.getElementById('license-input');
      const licenseMessage = d.getElementById('license-message');
      const licenseCheckBtn = d.getElementById('license-check');

      function setMessage(text, isError = false) {
        licenseMessage.textContent = text;
        licenseMessage.style.color = isError ? '#f87171' : '#9ca3af';
      }

      async function handleLicenseCheck() {
        const key = licenseInput.value.trim();
        if (!key) {
          setMessage('Masukkan license key terlebih dahulu', true);
          return;
        }

        setMessage('Memeriksa license...');
        licenseCheckBtn.disabled = true;

        try {
          const checkResult = await checkLicense(key);
          
          if (!checkResult.valid) {
            setMessage(checkResult.message, true);
            licenseCheckBtn.disabled = false;
            return;
          }

          setMessage('Mengaktivasi license...');
          const activationResult = await activateLicense(key);

          if (activationResult.ok) {
            setMessage('✅ License berhasil diaktivasi!', false);
            setStoredLicense(key);
            licenseValid = true;
            
            setTimeout(() => {
              overlay.remove();
              resolve(true);
            }, 1000);
          } else {
            setMessage(activationResult.message || 'Gagal mengaktivasi license', true);
            licenseCheckBtn.disabled = false;
          }

        } catch (error) {
          setMessage('Error: Gagal terhubung ke server', true);
          licenseCheckBtn.disabled = false;
        }
      }

      licenseCheckBtn.addEventListener('click', handleLicenseCheck);
      licenseInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleLicenseCheck();
      });

      licenseInput.focus();
    });
  }

  async function deteksiTableSeller(mode = "show", timeout = 5000) {
    return new Promise(resolve => {
      const intv = setInterval(() => {
        const dlg = document.querySelectorAll(".el-dialog__wrapper")[1];
        if (!dlg) return;
        const disp = dlg.style.display;
        if ((mode === "show" && disp !== "none") || (mode === "hide" && disp === "none")) {
          clearInterval(intv);
          clearTimeout(to);
          resolve(dlg);
        }
      }, 100);
      const to = setTimeout(() => {
        clearInterval(intv);
        console.log("Timeout deteksiTableSeller:", mode);
        resolve(null);
      }, timeout);
    });
  }

  async function deteksiSaveModal(mode = "show", timeout = 5000) {
    return new Promise(resolve => {
      const intv = setInterval(() => {
        const modal = document.querySelectorAll(".el-dialog__wrapper")[3];
        if (!modal) return;
        const disp = modal.style.display;
        if ((mode === "show" && disp !== "none") || (mode === "hide" && disp === "none")) {
          clearInterval(intv);
          clearTimeout(to);
          resolve(modal);
        }
      }, 100);
      const to = setTimeout(() => {
        clearInterval(intv);
        console.log("Timeout deteksiSaveModal:", mode);
        resolve(null);
      }, timeout);
    });
  }

  function getTimeNow() {
    const now = new Date();
    const fmt = new Intl.DateTimeFormat("id-ID", {
      timeZone: "Asia/Jakarta",
      year: "2-digit",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    }).format(now);
    const [d, h] = fmt.split(" ");
    return d.replace(/\\//g, "-") + "_" + h.replace(/:/g, "");
  }

  function saveFile(text, name) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function generateCode(path) {
    const [type, cat, sub, produk] = path.split("|");

    function formatAngka(angka) {
        let num = parseInt(angka.replace(/\\D/g, ""));
        if (num >= 1000) return (num / 1000) + "K";
        return num.toString();
    }

    function singkat(text, duaHuruf = false) {
        if (!text) return "";

        let kurung = "";
        let match = text.match(/\\(([^)]+)\\)/);

        if (match) {
            kurung = match[1];
        }

        let clean = text
            .replace(/\\(.*?\\)/g, " ")
            .replace(/[^a-zA-Z0-9.]/g, " ")
            .replace(/\\s+/g, " ")
            .trim();

        let words = clean.split(" ").filter(Boolean);

        let result = words.map(word => {
            if (/^\\d+[.]?\\d*$/.test(word)) {
                return formatAngka(word);
            }
            if (duaHuruf) {
                return word.substring(0, 2).toUpperCase();
            }
            return word[0].toUpperCase();
        }).join("");

        if (kurung) {
            let singkatKurung = kurung
                .replace(/[^a-zA-Z0-9]/g, " ")
                .split(" ")
                .filter(w => w)
                .map(w => duaHuruf
                    ? w.substring(0, 2).toUpperCase()
                    : w[0].toUpperCase()
                )
                .join("");

            result += singkatKurung;
        }

        return result;
    }

    let typeSingkat = singkat(type);
    let catSingkat = singkat(cat);
    let subSingkat = singkat(sub);
    let produkSingkat = singkat(produk, true);

    return (
        typeSingkat +
        catSingkat +
        subSingkat +
        produkSingkat
    ).slice(0, 25);
  }

  async function selectSeller(minRating = null, multiService = false, allowInvoice = true) {
    const header = document.querySelector(".el-table_2_column_16");
    if (header && !header.classList.contains("ascending")) {
      header.querySelector("i.sort-caret.ascending")?.click();
      await wait(500);
    }

    const dlg = document.querySelectorAll(".el-dialog__wrapper")[1];
    if (!dlg) {
      console.log("Dialog seller tidak ditemukan");
      return null;
    }

    let rows = dlg.querySelectorAll(".el-table__body-wrapper tbody tr");
    if (!rows.length) {
      dlg.querySelector(".el-dialog__headerbtn")?.click();
      await deteksiTableSeller("hide", 2000);
      console.log("Tidak ada seller di dialog");
      return null;
    }

    for (const row of rows) {
      let valid = true;
      const nama = row.querySelector(".el-table_2_column_14 .el-row:nth-child(1)")?.innerText || "";
      let rating = row.querySelector(".el-table_2_column_15")?.innerText || "0";

      const col19 = row.querySelector(".el-table_2_column_19")?.innerText || "";
      const col20 = row.querySelector(".el-table_2_column_20")?.innerText || "";
      const invoice = /Ya/i.test(col19);
      const isMulti = /Ya/i.test(col20);

      const hargaText = row.querySelector(".el-table_2_column_16")?.innerText || "";
      let hargaNum = 0;
      const matchPrice = hargaText.match(/[0-9.]+/);
      if (matchPrice) hargaNum = parseInt(matchPrice[0].replace(/\\./g, ""), 10);

      try {
        const m = rating.match(/([0-9.]+) \\(/);
        rating = m ? m[1] : "0";
      } catch {
        rating = "0";
      }

      if (minRating !== null && parseFloat(rating) < parseFloat(minRating)) valid = false;
      if (multiService && !isMulti) valid = false;
      if (!allowInvoice && invoice) valid = false;
      if (!valid) continue;

      const btn = row.querySelector(".el-table_2_column_24 button.el-button--mini:not(.is-plain)");
      if (btn) btn.click();

      await deteksiTableSeller("hide", 5000);
      return { nama, rating, harga: hargaText, hargaNum };
    }

    const next = dlg.querySelector(".el-pager li.number.active")?.nextElementSibling;
    if (next && next.classList.contains("number")) {
      next.click();
      await wait(500);
      return await selectSeller(minRating, multiService, allowInvoice);
    }

    dlg.querySelector(".el-dialog__headerbtn")?.click();
    await deteksiTableSeller("hide", 2000);
    console.log("Tidak ada seller cocok");
    return null;
  }

  function rowHasWarning(row) {
    if (!row) return false;
    const text = row.innerText || "";
    if (text.includes("Harga Max lebih kecil dari Harga Seller")) return true;
    const selector = [
      '[title*="Harga Max lebih kecil dari Harga Seller"]',
      '[aria-label*="Harga Max lebih kecil dari Harga Seller"]',
      ".el-icon-warning",
      ".fa-exclamation-circle",
      'i[class*="warning"]',
      'svg[class*="warning"]'
    ].join(",");
    return !!row.querySelector(selector);
  }

  function getMainPagerActive() {
    const items = [...document.querySelectorAll(".el-pager li.number.active")];
    return items.find(li => !li.closest(".el-dialog__wrapper"));
  }

  async function startPage(type, cat, sub) {
    let wrap = document.querySelectorAll(".sc-table .el-table__body-wrapper");
    if (!wrap.length) {
      console.log("Data tidak ditemukan");
      return false;
    }
    wrap = wrap.length === 1 ? wrap[0] : wrap[1];
    const rows = wrap.querySelectorAll(".el-table__row");
    if (!rows.length) return false;

    for (const row of rows) {
      if (!proses) break;
      if (dataGlobal.only_warning && !rowHasWarning(row)) continue;

      const layanan = row.querySelectorAll("td")[4]?.innerText.trim() || "";
      const oldSeller = row.querySelector("td.el-table_1_column_5")?.innerText || "";
      const oldHarga = row.querySelector("td.el-table_1_column_8")?.innerText || "";
      const kodeInput = row.querySelector(".el-table_1_column_3 input");
      const maxInput = row.querySelector(".el-table_1_column_4 input");
      const autoSwitch = row.querySelector(".el-table_1_column_11 .el-switch");
      const newCode = generateCode(type + "|" + cat + "|" + sub + "|" + layanan, Date.now());

      if (kodeInput.value.length > 1 && dataGlobal.update_all === false) continue;

      if (kodeInput.value.length > 1 && dataGlobal.replace_code === false) {
        // biarkan kode lama
      } else {
        kodeInput.value = newCode;
        kodeInput.dispatchEvent(new Event("input", { bubbles: true }));
      }

      const btnPilih = row.querySelector(".el-table_1_column_6 button");
      if (!btnPilih) continue;

      btnPilih.click();
      const dialog = await deteksiTableSeller("show", 5000);
      if (!dialog) continue;

      const seller = await selectSeller(
        dataGlobal.rating,
        dataGlobal.multi_service,
        dataGlobal.allow_invoice
      );
      if (!seller) continue;

      if (!saveDataUpdate[type]) saveDataUpdate[type] = [];
      saveDataUpdate[type].push({
        layanan,
        old_seller: oldSeller,
        old_harga: oldHarga,
        new_seller: seller.nama,
        new_rating: seller.rating,
        new_harga: seller.harga
      });

      if (dataGlobal.harga_max && maxInput) {
        try {
          maxInput.value = String(seller.hargaNum);
          maxInput.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (e) {
          console.log("Error set harga max:", e);
        }
      }

      if (!autoSwitch.classList.contains("is-checked")) {
        autoSwitch.querySelector("input")?.click();
      }
    }
    return true;
  }

  async function start(type, cat, sub) {
    let page = 1;
    while (true) {
      if (!proses) break;
      const ok = await startPage(type, cat, sub);
      if (!ok) break;

      const active = getMainPagerActive();
      if (!active) break;
      const next = active.nextElementSibling;
      if (!next || !next.classList.contains("number")) break;

      next.click();
      page++;
      await wait(800);
    }
  }

  async function triggerSave() {
    try {
      const buttons = [...document.querySelectorAll("button.el-button--primary")];
      const saveBtn = buttons.find(b => b.textContent.includes("Simpan Semua Perubahan"));
      if (!saveBtn) return;
      saveBtn.click();
      await deteksiSaveModal("show", 5000);

      const modals = document.querySelectorAll(".el-dialog__wrapper");
      let confirmModal = null;
      for (const m of modals) {
        if (m.innerText.includes("Konfirmasi Perubahan")) {
          confirmModal = m;
          break;
        }
      }
      if (!confirmModal) return;

      const confirmButton = confirmModal.querySelector(".el-button.el-button--primary");
      if (!confirmButton) return;

      confirmButton.click();
      await deteksiSaveModal("hide", 5000);
      console.log("Simpan berhasil");
    } catch (error) {
      console.log("ERROR SAVE", error);
    }
  }

  async function subCategory(type, cat) {
    let btns = document.querySelectorAll(".el-tab-pane > span > button.el-button--info");
    btns = [...btns].filter(b => {
      const pane = b.closest(".el-tab-pane");
      return pane && window.getComputedStyle(pane).display !== "none";
    });

    let i = 1;
    for (const btn of btns) {
      if (!proses) break;
      const sub = btn.innerText;
      if (i > 1) btn.click();
      await wait(500);

      await start(type, cat, sub);
      await wait(500);

      if (dataGlobal.auto_save) {
        await triggerSave();
        await wait(1000);
      }
      i++;
    }
  }

  async function category(type) {
    let btns = document.querySelectorAll(".el-tab-pane > span > button.el-button--primary");
    btns = [...btns].filter(b => {
      const pane = b.closest(".el-tab-pane");
      return pane && window.getComputedStyle(pane).display !== "none";
    });

    let i = 1;
    for (const btn of btns) {
      if (!proses) break;
      if (i > 1) btn.click();
      await wait(800);
      await subCategory(type, btn.innerText);
      i++;
    }
  }

  async function typeProcess() {
    const btns = document.querySelectorAll("#daftarProduk .el-tabs__nav .el-tabs__item");
    if (!btns.length) {
      console.log("Data tidak ditemukan");
      return;
    }

    let i = 1;
    for (const btn of btns) {
      if (!proses) break;
      if (i > 1) btn.click();
      await wait(800);
      await category(btn.innerText);
      i++;
    }

    if (proses) downloadData();
  }

  function downloadData() {
    document.removeEventListener("keydown", handleSpace);
    alert("Proses selesai, data update akan diunduh");
    proses = false;

    setTimeout(() => {
      let out = "";
      Object.entries(saveDataUpdate).forEach(([type, list]) => {
        out += "=======[" + type + "]=======\\n";
        list.forEach(it => {
          out += "Layanan: " + it.layanan + "\\n";
          out += "Old Seller: " + it.old_seller + "\\n";
          out += "Old Harga: " + it.old_harga + "\\n";
          if (it.new_seller) out += "New Seller: " + it.new_seller + "\\n";
          if (it.new_rating) out += "New Rating: " + it.new_rating + "\\n";
          if (it.new_harga) out += "New Harga: " + it.new_harga + "\\n\\n";
        });
        out += "=======[END OF " + type + "]=======\\n";
      });
      saveFile(out, "update_digiflazz_" + getTimeNow() + ".txt");
    }, 3000);
  }

  function handleSpace(e) {
    if (e.code === "Space") downloadData();
  }

  function showConfigPanel() {
    return new Promise(resolve => {
      const old = document.getElementById("amr-config-overlay");
      if (old) old.remove();

      const d = document;
      const ICON_URL = "https://files.catbox.moe/e7c3n3.png";

      const overlay = d.createElement("div");
      overlay.id = "amr-config-overlay";
      Object.assign(overlay.style, {
        position: "fixed",
        inset: "0",
        background: "rgba(15,23,42,.65)",
        zIndex: "99999",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(2px)"
      });

      const box = d.createElement("div");
      Object.assign(box.style, {
        background: "#0f172a",
        borderRadius: "14px",
        padding: "14px 16px 12px",
        maxWidth: "360px",
        width: "92%",
        boxShadow: "0 18px 40px rgba(0,0,0,.55)",
        fontFamily: "system-ui,-apple-system,BlinkMacSystemFont,sans-serif",
        color: "#e5e7eb",
        fontSize: "13px",
        border: "1px solid rgba(148,163,184,.4)",
        position: "relative",
        overflow: "hidden"
      });

      box.innerHTML = \`
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:34px;height:34px;border-radius:999px;overflow:hidden;background:rgba(0,0,0,0.4);display:flex;align-items:center;justify-content:center;">
            <img src="\${ICON_URL}" style="width:100%;height:100%;object-fit:cover;">
          </div>
          <div>
            <div style="font-size:14px;font-weight:600;color:#f9fafb;">
              Digiflazz Auto Update
            </div>
            <div style="font-size:11px;color:#9ca3af;">
              Atur konfigurasi sebelum menjalankan auto update layanan.
            </div>
          </div>
        </div>

        <div style="margin:4px 0 10px;border-radius:9px;height:80px;background:linear-gradient(135deg,#020617,#020617);border:1px solid rgba(148,163,184,.4);display:flex;align-items:center;padding:8px 10px;gap:8px;">
          <div style="font-size:26px">🤖</div>
          <div style="font-size:11px;line-height:1.35;color:#e5e7eb;">
            <span style="color:#fde68a;font-weight:600;">Dibuat oleh Geekz</span><br>
            Telegram: <span style="color:#bfdbfe;">t.me/amgeekz</span><br>
            Panel Bot: <span style="color:#a5b4fc;">t.me/amgeekzbot</span><br>
            Whatsapp: <span style="color:#bbf7d0;">0856-4945-5626</span>
          </div>
        </div>

        <div id="amr-options" style="margin-bottom:6px;"></div>

        <div style="margin:6px 0 8px;display:flex;align-items:center;gap:8px;">
          <span style="white-space:nowrap;font-size:12px;color:#d1d5db;">⭐ Minimal rating:</span>
          <input id="amr-rating" type="number" step="0.1" min="0" max="5" value="\${dataGlobal.rating || "0"}" style="flex:1;padding:4px 6px;border-radius:6px;border:1px solid rgba(148,163,184,.7);background:#020617;color:#f9fafb;font-size:12px;outline:none;">
        </div>

        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px;">
          <div style="font-size:10px;color:#9ca3af;">Tekan <span style="color:#e5e7eb;">Space</span> untuk paksa download log.</div>
          <div style="display:flex;gap:8px;">
            <button id="amr-cancel" style="padding:5px 10px;border-radius:7px;border:1px solid rgba(148,163,184,.6);background:#020617;color:#e5e7eb;font-size:12px;">Batal</button>
            <button id="amr-start" style="padding:5px 12px;border-radius:7px;border:0;background:linear-gradient(135deg,#22c55e,#16a34a);color:#022c22;font-size:12px;font-weight:600;">Mulai</button>
          </div>
        </div>
      \`;

      overlay.appendChild(box);
      d.body.appendChild(overlay);

      const optsWrap = box.querySelector("#amr-options");
      const options = [
        ["update_all",   "Update semua layanan",          "🔁"],
        ["replace_code", "Timpa kode yang sudah ada",     "📝"],
        ["harga_max",    "Isi Harga Max dari seller",     "💰"],
        ["auto_save",    "Auto save tiap sub kategori",   "💾"],
        ["multi_service","Hanya seller multi service",    "🔧"],
        ["allow_invoice","Izinkan seller faktur pajak",   "🧾"],
        ["only_warning", "Hanya produk yang warning",     "⚠️"]
      ];

      const makeRow = (id, label, icon, checked) => {
        const row = d.createElement("label");
        Object.assign(row.style, { display: "flex", alignItems: "center", gap: "8px", padding: "4px 0", fontSize: "12px", color: "#e5e7eb" });
        const iconSpan = d.createElement("span");
        iconSpan.textContent = icon;
        iconSpan.style.width = "18px";
        const cb = d.createElement("input");
        cb.type = "checkbox";
        cb.id = "amr-" + id;
        cb.checked = checked;
        cb.style.accentColor = "#22c55e";
        const text = d.createElement("span");
        text.textContent = label;
        row.append(iconSpan, cb, text);
        optsWrap.appendChild(row);
      };

      options.forEach(([id, label, icon]) => {
        makeRow(id, label, icon, dataGlobal[id]);
      });

      const $ = id => d.getElementById("amr-" + id);
      $("update_all").addEventListener("change", () => {
        if (!$("update_all").checked) $("replace_code").checked = false;
      });

      const ratingInput = d.getElementById("amr-rating");
      const btnCancel = d.getElementById("amr-cancel");
      const btnStart  = d.getElementById("amr-start");

      function cleanupInternal() {
        d.removeEventListener("keydown", onKey);
        overlay.remove();
      }

      function onKey(e) {
        if (e.key === "Escape") {
          cleanupInternal();
          resolve(null);
        }
      }
      d.addEventListener("keydown", onKey);

      btnCancel.onclick = () => {
        cleanupInternal();
        resolve(null);
      };

      btnStart.onclick = () => {
        const cfg = {
          update_all:   $("update_all").checked,
          replace_code: $("replace_code").checked,
          harga_max:    $("harga_max").checked,
          auto_save:    $("auto_save").checked,
          multi_service:$("multi_service").checked,
          allow_invoice:$("allow_invoice").checked,
          only_warning: $("only_warning").checked,
          rating:       ratingInput.value
        };
        if (!cfg.update_all) cfg.replace_code = false;
        cleanupInternal();
        resolve(cfg);
      };
    });
  }

  async function initService() {
    const licenseOk = await verifyAndActivateLicense();
    if (!licenseOk) {
      console.log('License tidak valid, proses dibatalkan');
      return;
    }

    console.log('License valid, melanjutkan proses...');
    const cfg = await showConfigPanel();
    if (!cfg) {
      console.log("Dibatalkan");
      return;
    }

    const ratingVal = (cfg.rating ?? "").toString().trim();
    dataGlobal = {
      update_all: cfg.update_all,
      replace_code: cfg.replace_code,
      harga_max: cfg.harga_max,
      auto_save: cfg.auto_save,
      multi_service: cfg.multi_service,
      allow_invoice: cfg.allow_invoice,
      only_warning: cfg.only_warning,
      rating: !ratingVal || ratingVal === "0" ? null : ratingVal
    };

    console.log("Setting:", dataGlobal);
    await typeProcess();
  }

  document.addEventListener("keydown", handleSpace);
  
  // Start check with minor delay to ensure Vue elements are ready
  setTimeout(initService, 1500);

})();`;
}

/**
 * Returns Bookmarklet-compatible javascript URI.
 */
export function generateBookmarklet(compiledScript: string): string {
  // Compress or simple URI encode
  return `javascript:${encodeURIComponent(compiledScript)}`;
}

/**
 * Returns standard Tampermonkey/Greasemonkey userscript contents.
 */
export function generateUserscript(compiledScript: string, licenseKey: string): string {
  return `// ==UserScript==
// @name         Digiflazz Auto Update (Geekz)
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Automated product updater for Digiflazz Buyer Panel
// @author       Geekz (Compiled via Web Panel)
// @match        https://member.digiflazz.com/*
// @grant        none
// @run-at       document-end
// ==/UserScript==

${compiledScript}`;
}
