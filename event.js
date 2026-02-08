import { supabase } from "./supabaseClient.js";

const list = document.getElementById("list");
const statusEl = document.getElementById("status");
const refreshBtn = document.getElementById("refreshBtn");

const esc = (s = "") =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

function fmtDate(d) {
  if (!d) return "-";
  try {
    return new Date(d).toLocaleDateString("id-ID");
  } catch {
    return String(d);
  }
}

function renderEvent(e) {
  const title = esc(e.title || "");
  const desc = e.description ? esc(e.description) : "";
  const start = fmtDate(e.start_date);
  const end = fmtDate(e.end_date);

  const bannerHtml = e.banner_url
    ? `<img class="eventBanner" src="${e.banner_url}" alt="Banner event">`
    : "";

  const hasDesc = desc.trim().length > 0;

  return `
    <div class="card eventCard" data-event>
      ${bannerHtml}

      <div class="eventMeta">
        <div>
          <div class="eventTitle">${title}</div>
          <div class="eventDates">${esc(start)} → ${esc(end)}</div>
        </div>
      </div>

      ${hasDesc ? `<div class="eventDesc" data-desc>${desc}</div>` : ""}

      ${hasDesc ? `
        <div class="eventActions">
          <button class="eventBtn" type="button" data-toggle>Lihat detail</button>
        </div>
      ` : ""}
    </div>
  `;
}

function applyToggleHandlers() {
  list.querySelectorAll("[data-event]").forEach((card) => {
    const btn = card.querySelector("[data-toggle]");
    const desc = card.querySelector("[data-desc]");
    if (!btn || !desc) return;

    // default hidden
    desc.classList.remove("show");

    btn.addEventListener("click", () => {
      const isOpen = desc.classList.toggle("show");
      btn.textContent = isOpen ? "Tutup detail" : "Lihat detail";
    });
  });
}

async function loadEvents() {
  if (!list) return;

  statusEl.textContent = "Loading...";
  list.innerHTML = "";

  const { data, error } = await supabase
    .from("events")
    .select("id, created_at, title, description, banner_url, start_date, end_date")
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) {
    statusEl.textContent = "Gagal load event: " + error.message;
    list.innerHTML = `<div class="card"><small>${esc(error.message)}</small></div>`;
    return;
  }

  if (!data || data.length === 0) {
    statusEl.textContent = "Belum ada event.";
    list.innerHTML = `<div class="card"><small>Belum ada event.</small></div>`;
    return;
  }

  statusEl.textContent = `${data.length} event ditampilkan`;
  list.innerHTML = data.map(renderEvent).join("");

  applyToggleHandlers();
}

refreshBtn?.addEventListener("click", loadEvents);

// load pertama kali
loadEvents();
