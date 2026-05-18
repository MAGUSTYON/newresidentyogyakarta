import { supabase } from "./supabaseClient.js";

// active_parts dibaca dari Supabase (quotes_settings.active_parts).
// Ubah lewat Admin Panel — tidak perlu edit file ini.
let ACTIVE_PARTS = []; // e.g. [53, 54, 55]

async function loadRatingConfig() {
  try {
    const { data } = await supabase
      .from("quotes_settings")
      .select("active_parts")
      .eq("id", 1)
      .maybeSingle();
    const raw = data?.active_parts;
    ACTIVE_PARTS = Array.isArray(raw) ? raw.map(Number).sort((a, b) => a - b) : [];
  } catch (e) {
    console.warn("Gagal baca active_parts, form kosong:", e);
    ACTIVE_PARTS = [];
  }
}

const elName    = document.getElementById("name");
const elReason  = document.getElementById("reason");
const elSubmit  = document.getElementById("submitBtn");
const elList    = document.getElementById("list");
const elRefresh = document.getElementById("refreshBtn");
const elStatus  = document.getElementById("status");
const elModal   = document.getElementById("ratingModal");
const elPartsContainer = document.getElementById("partsContainer");

function setStatus(text) {
  if (!elStatus) return;
  elStatus.style.display = "inline-block";
  elStatus.textContent = text;
}

function escapeHtml(str = "") {
  return String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function sanitizeScore(value) {
  if (value === "" || value === null || value === undefined) return null;
  const normalized = String(value).replace(",", ".").trim();
  const num = Number(normalized);
  if (!Number.isFinite(num)) return null;
  if (num < 0 || num > 10) return null;
  return Math.round(num * 10) / 10;
}

function partInputId(num) {
  return "part_" + num;
}

// Buat input field per part secara dinamis dari ACTIVE_PARTS
function buildPartInputs() {
  if (!elPartsContainer) return;
  elPartsContainer.innerHTML = "";

  if (ACTIVE_PARTS.length === 0) {
    elPartsContainer.innerHTML = '<p style="color:rgba(255,255,255,.5);font-size:13px;grid-column:1/-1;">Rating belum tersedia minggu ini.</p>';
    return;
  }

  ACTIVE_PARTS.forEach((num, index) => {
    const input = document.createElement("input");
    input.id          = partInputId(num);
    input.type        = "number";
    input.min         = "0";
    input.max         = "10";
    input.step        = "0.1";
    input.inputMode   = "decimal";
    input.placeholder = "Part " + num + " (0-10)";

    if (ACTIVE_PARTS.length % 2 !== 0 && index === ACTIVE_PARTS.length - 1) {
      input.className = "full";
    }

    attachInputHandlers(input);
    elPartsContainer.appendChild(input);
  });
}

function attachInputHandlers(input) {
  input.addEventListener("input", (e) => {
    let raw = e.target.value;
    if (raw === "") return;
    raw = raw.replace(",", ".");
    const cleaned = raw.replace(/[^0-9.]/g, "");
    const firstDotIndex = cleaned.indexOf(".");
    let normalized = cleaned;
    if (firstDotIndex !== -1) {
      const beforeDot = cleaned.slice(0, firstDotIndex + 1);
      const afterDot  = cleaned.slice(firstDotIndex + 1).replaceAll(".", "").slice(0, 1);
      normalized = beforeDot + afterDot;
    }
    if (normalized === "." || normalized === "") { e.target.value = ""; return; }
    let num = Number(normalized);
    if (!Number.isFinite(num)) { e.target.value = ""; return; }
    if (num < 0) num = 0;
    if (num > 10) num = 10;
    e.target.value = normalized.includes(".") ? num.toFixed(1) : String(num);
  });

  input.addEventListener("blur", (e) => {
    const score = sanitizeScore(e.target.value);
    e.target.value = score === null ? "" : score.toFixed(1);
  });
}

function validateForm() {
  for (const num of ACTIVE_PARTS) {
    const el = document.getElementById(partInputId(num));
    if (!el) continue;
    const score = sanitizeScore(el.value);
    if (score === null) {
      setStatus("Part " + num + " harus angka 0 sampai 10, boleh 1 angka di belakang koma.");
      el.focus();
      return false;
    }
  }
  return true;
}

function averageScore(scores) {
  const vals = Object.values(scores).map(Number).filter(n => Number.isFinite(n));
  if (!vals.length) return "0.0";
  return (vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1);
}

function renderItem(item) {
  const name    = item.name && item.name.trim() ? escapeHtml(item.name.trim()) : "Anonim";
  const created = new Date(item.created_at).toLocaleString("id-ID");
  const reason  = escapeHtml(item.reason || "-");
  const scores  = item.scores || {};
  const partNums = Object.keys(scores).map(Number).sort((a, b) => a - b);
  const avg     = averageScore(scores);

  const scoresHtml = partNums.map(function(num) {
    const score = Number(scores[num] || 0).toFixed(1);
    return '<div class="scoreBox"><small>Part ' + num + '</small><b>' + score + '/10</b></div>';
  }).join("");

  const rangeLabel = partNums.length > 1
    ? "Part " + partNums[0] + "\u2013" + partNums[partNums.length - 1]
    : partNums.length === 1
      ? "Part " + partNums[0]
      : "\u2014";

  return (
    '<div class="ratingCard">' +
      '<div class="ratingMeta">' +
        '<div><b>' + name + '</b><span class="badge">' + created + '</span></div>' +
        '<div class="badge avgBadge">Rata-rata ' + avg + '/10</div>' +
      '</div>' +
      '<div class="badge" style="margin-bottom:12px;">' + rangeLabel + '</div>' +
      '<div class="scoreGrid">' + scoresHtml + '</div>' +
      '<div class="reasonBlock"><b>Alasan:</b><br>' + reason + '</div>' +
    '</div>'
  );
}

async function loadFeed() {
  if (!elList) return;
  elList.innerHTML = "<small>Loading...</small>";

  const { data, error } = await supabase
    .from("au_ratings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    elList.innerHTML = "<small>Gagal load: " + escapeHtml(error.message) + "</small>";
    return;
  }

  elList.innerHTML = (data || []).map(renderItem).join("") || "<small>Belum ada rating.</small>";
}

async function submitRating() {
  if (ACTIVE_PARTS.length === 0) {
    setStatus("Rating belum tersedia minggu ini.");
    return;
  }
  if (!validateForm()) return;

  const scores = {};
  for (const num of ACTIVE_PARTS) {
    const el = document.getElementById(partInputId(num));
    scores[String(num)] = sanitizeScore(el ? el.value : null);
  }

  const payload = {
    name:   elName ? elName.value.trim() || null : null,
    reason: elReason ? elReason.value : "",
    scores,
  };

  elSubmit.disabled = true;
  setStatus("Mengirim...");

  const { error } = await supabase.from("au_ratings").insert(payload);

  elSubmit.disabled = false;

  if (error) {
    setStatus("Gagal kirim: " + error.message);
    return;
  }

  setStatus("Terkirim \u2705");

  if (elName)   elName.value   = "";
  if (elReason) elReason.value = "";
  document.querySelectorAll("#partsContainer input").forEach(function(el) { el.value = ""; });

  if (elModal) elModal.classList.add("hidden");

  await loadFeed();
}

if (elSubmit)  elSubmit.addEventListener("click", submitRating);
if (elRefresh) elRefresh.addEventListener("click", loadFeed);

(async function() {
  await loadRatingConfig();
  buildPartInputs();
  await loadFeed();
})();
