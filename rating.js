import { supabase } from "./supabaseClient.js";

const elName = document.getElementById("name");
const elReason = document.getElementById("reason");
const elSubmit = document.getElementById("submitBtn");
const elList = document.getElementById("list");
const elRefresh = document.getElementById("refreshBtn");
const elStatus = document.getElementById("status");
const elModal = document.getElementById("ratingModal");

const partKeys = ["part1", "part2", "part3", "part4", "part5", "part6", "part7"];
const partInputs = partKeys.map((key) => document.getElementById(key));

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

function validateForm() {
  for (let i = 0; i < partInputs.length; i++) {
    const score = sanitizeScore(partInputs[i].value);
    if (score === null) {
      setStatus(`Part ${i + 1} harus angka 0 sampai 10, boleh 1 angka di belakang koma.`);
      partInputs[i].focus();
      return false;
    }
  }
  return true;
}

function averageScore(item) {
  const total = partKeys.reduce((sum, key) => sum + Number(item[key] || 0), 0);
  return (total / partKeys.length).toFixed(1);
}

function renderItem(item) {
  const name = item.name?.trim() ? escapeHtml(item.name.trim()) : "Anonim";
  const created = new Date(item.created_at).toLocaleString("id-ID");
  const reason = escapeHtml(item.reason || "-");
  const avg = averageScore(item);

  const scoresHtml = partKeys.map((key, index) => {
    const score = Number(item[key] || 0).toFixed(1);
    return `
      <div class="scoreBox">
        <small>Part ${index + 1}</small>
        <b>${score}/10</b>
      </div>
    `;
  }).join("");

  return `
    <div class="ratingCard">
      <div class="ratingMeta">
        <div><b>${name}</b> <span class="badge">${created}</span></div>
        <div class="badge avgBadge">Rata-rata ${avg}/10</div>
      </div>

      <div class="scoreGrid">
        ${scoresHtml}
      </div>

      <div class="reasonBlock">
        <b>Alasan:</b><br>${reason}
      </div>
    </div>
  `;
}

async function loadFeed() {
  if (!elList) return;

  elList.innerHTML = `<small>Loading...</small>`;

  const { data, error } = await supabase
    .from("au_ratings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    elList.innerHTML = `<small>Gagal load: ${escapeHtml(error.message)}</small>`;
    return;
  }

  elList.innerHTML =
    (data || []).map(renderItem).join("") || `<small>Belum ada rating.</small>`;
}

async function submitRating() {
  if (!validateForm()) return;

  const payload = {
    name: elName?.value.trim() || null,
    reason: elReason?.value || "",
  };

  for (const key of partKeys) {
    payload[key] = sanitizeScore(document.getElementById(key).value);
  }

  elSubmit.disabled = true;
  setStatus("Mengirim...");

  const { error } = await supabase.from("au_ratings").insert(payload);

  elSubmit.disabled = false;

  if (error) {
    setStatus("Gagal kirim: " + error.message);
    return;
  }

  setStatus("Terkirim ✅");

  if (elName) elName.value = "";
  if (elReason) elReason.value = "";

  partInputs.forEach((input) => {
    if (input) input.value = "";
  });

  if (elModal) elModal.classList.add("hidden");

  await loadFeed();
}

partInputs.forEach((input) => {
  if (!input) return;

  input.addEventListener("input", (e) => {
    let raw = e.target.value;

    if (raw === "") return;

    raw = raw.replace(",", ".");

    const cleaned = raw.replace(/[^0-9.]/g, "");
    const firstDotIndex = cleaned.indexOf(".");

    let normalized = cleaned;

    if (firstDotIndex !== -1) {
      const beforeDot = cleaned.slice(0, firstDotIndex + 1);
      const afterDot = cleaned
        .slice(firstDotIndex + 1)
        .replaceAll(".", "")
        .slice(0, 1);

      normalized = beforeDot + afterDot;
    }

    if (normalized === "." || normalized === "") {
      e.target.value = "";
      return;
    }

    let num = Number(normalized);

    if (!Number.isFinite(num)) {
      e.target.value = "";
      return;
    }

    if (num < 0) num = 0;
    if (num > 10) num = 10;

    if (normalized.includes(".")) {
      e.target.value = num.toFixed(1);
    } else {
      e.target.value = String(num);
    }
  });

  input.addEventListener("blur", (e) => {
    const score = sanitizeScore(e.target.value);
    if (score === null) {
      e.target.value = "";
      return;
    }
    e.target.value = score.toFixed(1);
  });
});

if (elSubmit) elSubmit.addEventListener("click", submitRating);
if (elRefresh) elRefresh.addEventListener("click", loadFeed);

loadFeed();
