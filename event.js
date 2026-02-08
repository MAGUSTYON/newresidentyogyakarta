import { supabase } from "./supabaseClient.js";

const elList = document.getElementById("list");
const elRefresh = document.getElementById("refreshBtn");

function escapeHtml(str = "") {
  return str
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderItem(item) {
  const title = escapeHtml(item.title || "");
  const date = item.event_date ? new Date(item.event_date).toLocaleDateString("id-ID") : "-";
  const loc = escapeHtml(item.location || "-");
  const desc = escapeHtml(item.description || "");

  return `
    <div class="card">
      <div style="display:flex; justify-content:space-between; gap:10px; align-items:center;">
        <b>${title}</b>
        <span class="badge">${date}</span>
      </div>
      <p style="margin:10px 0 0; color:#b8b8c7;"><b>Lokasi:</b> ${loc}</p>
      ${desc ? `<p style="white-space:pre-wrap; margin:10px 0 0;">${desc}</p>` : ""}
    </div>
  `;
}

async function loadEvents() {
  elList.innerHTML = `<small>Loading...</small>`;
  const { data, error } = await supabase
    .from("events")
    .select("*")
    .order("event_date", { ascending: true })
    .limit(100);

  if (error) {
    elList.innerHTML = `<small>Gagal load: ${escapeHtml(error.message)}</small>`;
    return;
  }

  elList.innerHTML = data.map(renderItem).join("") || `<small>Belum ada event.</small>`;
}

elRefresh.addEventListener("click", loadEvents);
loadEvents();
