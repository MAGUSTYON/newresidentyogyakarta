import { supabase } from "./supabaseClient.js";

const qName = document.getElementById("qName");
const qText = document.getElementById("qText");
const qSend = document.getElementById("qSend");
const qStatus = document.getElementById("qStatus");

const qList = document.getElementById("qList");
const wallStatus = document.getElementById("wallStatus");
const qSearch = document.getElementById("qSearch");
const qRefresh = document.getElementById("qRefresh");

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return "";
  }
}

async function loadQuotes() {
  wallStatus.textContent = "Loading…";

  const { data, error } = await supabase
    .from("quotes")
    .select("id, name, quote, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error) {
    wallStatus.textContent = "Error: " + error.message;
    qList.innerHTML = `
      <div class="quoteItem">
        <div class="quoteText" style="opacity:.75;">Gagal load.</div>
      </div>`;
    return;
  }

  const keyword = (qSearch.value || "").trim().toLowerCase();
  const filtered = (data || []).filter((x) => {
    if (!keyword) return true;
    const hay = `${x.name || ""} ${x.quote || ""}`.toLowerCase();
    return hay.includes(keyword);
  });

  wallStatus.textContent = `${filtered.length} quotes`;

  if (!filtered.length) {
    qList.innerHTML = `
      <div class="quoteItem">
        <div class="quoteText" style="opacity:.75;">Tidak ada hasil.</div>
      </div>`;
    return;
  }

  qList.innerHTML = filtered
    .map((x) => {
      const name = esc(x.name || "Anonim");
      const quote = esc(x.quote || "");
      const time = fmtTime(x.created_at);

      return `
        <div class="quoteItem">
          <div class="quoteText">“${quote}”</div>
          <div class="meta">
            <span>— <b>${name}</b></span>
            <span class="tag">${esc(time)}</span>
          </div>
        </div>
      `;
    })
    .join("");
}

async function sendQuote() {
  const name = (qName.value || "").trim();
  const quote = (qText.value || "").trim();

  if (!quote) {
    qStatus.textContent = "Quotes tidak boleh kosong.";
    return;
  }

  qSend.disabled = true;
  qStatus.textContent = "Mengirim…";

  const { error } = await supabase.from("quotes").insert({
    name: name || null,
    quote,
  });

  qSend.disabled = false;

  if (error) {
    qStatus.textContent = "Gagal: " + error.message;
    return;
  }

  qStatus.textContent = "Terkirim ✅";
  qText.value = "";
  await loadQuotes();
}

qSend?.addEventListener("click", sendQuote);
qRefresh?.addEventListener("click", loadQuotes);

qSearch?.addEventListener("input", () => {
  // debounce kecil
  clearTimeout(window.__qdeb);
  window.__qdeb = setTimeout(loadQuotes, 200);
});

qText?.addEventListener("keydown", (e) => {
  // ctrl+enter untuk kirim
  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    sendQuote();
  }
});

(async () => {
  await loadQuotes();
})();
