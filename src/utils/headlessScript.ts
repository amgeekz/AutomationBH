import { UpdateConfig } from "../types";

export function compileHeadlessScript(config: UpdateConfig): string {
  return `(function () {
  "use strict";

  console.log("[AUTOMATOR] ===========================================");
  console.log("[AUTOMATOR] 🤖 HEADLESS DIGIFLAZZ ENGINE RUNNING");
  console.log("[AUTOMATOR] Setting: " + JSON.stringify(${JSON.stringify(config)}));
  console.log("[AUTOMATOR] ===========================================");

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

  const wait = ms => new Promise(r => setTimeout(r, ms));

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
        console.log("[AUTOMATOR] Timeout deteksiTableSeller:", mode);
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
        console.log("[AUTOMATOR] Timeout deteksiSaveModal:", mode);
        resolve(null);
      }, timeout);
    });
  }

  function getTimeNow() {
    const now = new Date();
    return now.toISOString();
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
    console.log("[AUTOMATOR] Membuka pencarian seller terbaik...");
    const header = document.querySelector(".el-table_2_column_16");
    if (header && !header.classList.contains("ascending")) {
      header.querySelector("i.sort-caret.ascending")?.click();
      await wait(500);
    }

    const dlg = document.querySelectorAll(".el-dialog__wrapper")[1];
    if (!dlg) {
      console.log("[AUTOMATOR] Dialog seller tidak ditemukan");
      return null;
    }

    let rows = dlg.querySelectorAll(".el-table__body-wrapper tbody tr");
    if (!rows.length) {
      dlg.querySelector(".el-dialog__headerbtn")?.click();
      await deteksiTableSeller("hide", 2000);
      console.log("[AUTOMATOR] Tidak ada seller di dialog");
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

      console.log(\`[AUTOMATOR] Seller Terpilih: \${nama} (Rating: \${rating}, Harga: \${hargaText})\default_api:create_file\`);
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
    console.log("[AUTOMATOR] Tidak ada seller cocok");
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
      console.log("[AUTOMATOR] Data tidak ditemukan pada halaman ini");
      return false;
    }
    wrap = wrap.length === 1 ? wrap[0] : wrap[1];
    const rows = wrap.querySelectorAll(".el-table__row");
    if (!rows.length) return false;

    console.log(\`[AUTOMATOR] Menelusuri \${rows.length} layanan pada \${type} -> \${cat} -> \${sub}...\`);

    for (const row of rows) {
      if (!proses) break;
      if (dataGlobal.only_warning && !rowHasWarning(row)) continue;

      const layanan = row.querySelectorAll("td")[4]?.innerText.trim() || "";
      const oldSeller = row.querySelector("td.el-table_1_column_5")?.innerText || "";
      const oldHarga = row.querySelector("td.el-table_1_column_8")?.innerText || "";
      const kodeInput = row.querySelector(".el-table_1_column_3 input");
      const maxInput = row.querySelector(".el-table_1_column_4 input");
      const autoSwitch = row.querySelector(".el-table_1_column_11 .el-switch");
      const newCode = generateCode(type + "|" + cat + "|" + sub + "|" + layanan);

      if (kodeInput.value.length > 1 && dataGlobal.update_all === false) continue;

      console.log(\`[AUTOMATOR] Mengupdate produk: \${layanan}\`);

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

      console.log(\`[PROGRESS_UPDATE] Updated: \${layanan}\`);

      if (dataGlobal.harga_max && maxInput) {
        try {
          maxInput.value = String(seller.hargaNum);
          maxInput.dispatchEvent(new Event("input", { bubbles: true }));
        } catch (e) {
          console.log("[AUTOMATOR] Error set harga max:", e);
        }
      }

      if (!autoSwitch.classList.contains("is-checked")) {
        autoSwitch.querySelector("input")?.click();
      }
      
      await wait(300);
    }
    return true;
  }

  async function start(type, cat, sub) {
    let page = 1;
    while (true) {
      if (!proses) break;
      console.log(\`[AUTOMATOR] SubKategori: \${sub} - Halaman \${page}\`);
      const ok = await startPage(type, cat, sub);
      if (!ok) break;

      const active = getMainPagerActive();
      if (!active) break;
      const next = active.nextElementSibling;
      if (!next || !next.classList.contains("number")) break;

      next.click();
      page++;
      await wait(1000);
    }
  }

  async function triggerSave() {
    try {
      console.log("[AUTOMATOR] Menyimpan perubahan sub kategori...");
      const buttons = [...document.querySelectorAll("button.el-button--primary")];
      const saveBtn = buttons.find(b => b.textContent.includes("Simpan Semua Perubahan"));
      if (!saveBtn) {
        console.log("[AUTOMATOR] Tombol simpan tidak ditemukan");
        return;
      }
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
      if (!confirmModal) {
        console.log("[AUTOMATOR] Modal konfirmasi tidak ditemukan");
         return;
      }

      const confirmButton = confirmModal.querySelector(".el-button.el-button--primary");
      if (!confirmButton) return;

      confirmButton.click();
      await deteksiSaveModal("hide", 5000);
      console.log("[AUTOMATOR] ✅ Simpan Sukses!");
    } catch (error) {
      console.log("[AUTOMATOR] ERROR SAVE:", error);
    }
  }

  async function subCategory(type, cat) {
    let btns = document.querySelectorAll(".el-tab-pane > span > button.el-button--info");
    btns = [...btns].filter(b => {
      const pane = b.closest(".el-tab-pane");
      return pane && window.getComputedStyle(pane).display !== "none";
    });

    console.log(\`[AUTOMATOR] Ditemukan \${btns.length} Sub Kategori dalam \${cat}\`);

    let i = 1;
    for (const btn of btns) {
      if (!proses) break;
      const sub = btn.innerText;
      if (i > 1) {
        btn.click();
        await wait(1000);
      }

      await start(type, cat, sub);
      await wait(800);

      if (dataGlobal.auto_save) {
        await triggerSave();
        await wait(1200);
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

    console.log(\`[AUTOMATOR] Ditemukan \${btns.length} Kategori dalam tipe \${type}\`);

    let i = 1;
    for (const btn of btns) {
      if (!proses) break;
      if (i > 1) {
        btn.click();
        await wait(1200);
      }
      await subCategory(type, btn.innerText);
      i++;
    }
  }

  async function typeProcess() {
    console.log("[AUTOMATOR] Memindai menu grup produk (Daftar Produk)...");
    const btns = document.querySelectorAll("#daftarProduk .el-tabs__nav .el-tabs__item");
    if (!btns.length) {
      console.log("[AUTOMATOR] ❌ Tab daftar produk tidak ditemukan pada halaman!");
      finishWorkflow();
      return;
    }

    console.log(\`[AUTOMATOR] Ditemukan \${btns.length} Tipe Produk\`);

    let i = 1;
    for (const btn of btns) {
      if (!proses) break;
      console.log(\`[AUTOMATOR] Mengaktifkan Tipe: \${btn.innerText}\`);
      if (i > 1) {
        btn.click();
        await wait(1200);
      }
      await category(btn.innerText);
      i++;
    }

    if (proses) finishWorkflow();
  }

  function finishWorkflow() {
    proses = false;
    console.log("[AUTOMATOR_FINISHED] Proses selesai.");
    console.log("[RESULT_LOGS]" + JSON.stringify(saveDataUpdate));
  }

  setTimeout(typeProcess, 2000);

})();`;
}
