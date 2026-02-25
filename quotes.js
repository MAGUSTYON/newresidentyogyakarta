import { supabase } from "./supabaseClient.js";

const list = document.getElementById("list");
const refreshBtn = document.getElementById("refreshBtn");

const nameEl = document.getElementById("name");
const quoteEl = document.getElementById("quote");
const submitBtn = document.getElementById("submitBtn");
const statusEl = document.getElementById("status");

const modal = document.getElementById("quotesModal");

function esc(s=""){
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function fmtTime(iso){
  try{
    return new Date(iso).toLocaleString([], { dateStyle:"medium", timeStyle:"short" });
  }catch{
    return "";
  }
}

async function loadQuotes(){
  list.innerHTML = `<div class="quoteCard"><div class="quoteText" style="opacity:.75;">Loading…</div></div>`;

  const { data, error } = await supabase
    .from("quotes")
    .select("id, name, quote, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (error){
    list.innerHTML = `<div class="quoteCard"><div class="quoteText" style="opacity:.75;">Error: ${esc(error.message)}</div></div>`;
    return;
  }

  if (!data?.length){
    list.innerHTML = `<div class="quoteCard"><div class="quoteText" style="opacity:.75;">Belum ada quotes.</div></div>`;
    return;
  }

  list.innerHTML = data.map((q) => {
    const nm = esc(q.name || "Anonim");
    const qt = esc(q.quote || "");
    const tm = fmtTime(q.created_at);

    return `
      <div class="quoteCard">
        <div class="quoteText">“${qt}”</div>
        <div class="quoteMeta">
          <div>— <b>${nm}</b></div>
          <div class="badge">${esc(tm)}</div>
        </div>
      </div>
    `;
  }).join("");
}

async function sendQuote(){
  const name = (nameEl.value || "").trim();
  const quote = (quoteEl.value || "").trim();

  if (!quote){
    statusEl.textContent = "Quotes tidak boleh kosong.";
    return;
  }

  submitBtn.disabled = true;
  statusEl.textContent = "Mengirim…";

  const { error } = await supabase.from("quotes").insert({
    name: name || null,
    quote
  });

  submitBtn.disabled = false;

  if (error){
    statusEl.textContent = "Gagal: " + error.message;
    return;
  }

  statusEl.textContent = "Terkirim ✅";
  quoteEl.value = "";

  // tutup modal + refresh feed
  modal.classList.add("hidden");
  await loadQuotes();
}

refreshBtn?.addEventListener("click", loadQuotes);
submitBtn?.addEventListener("click", sendQuote);

// boot
loadQuotes();
