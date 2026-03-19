import { supabase } from "./supabaseClient.js";

const loginSection = document.getElementById("loginSection");
const adminPanel   = document.getElementById("adminPanel");

const emailInput   = document.getElementById("email");
const passInput    = document.getElementById("password");
const loginBtn     = document.getElementById("loginBtn");
const logoutBtn    = document.getElementById("logoutBtn");
const loginStatus  = document.getElementById("loginStatus");

const confList      = document.getElementById("confessionsList");
const refreshConf   = document.getElementById("refreshConfBtn");

const quotesList    = document.getElementById("quotesList");
const refreshQuotes = document.getElementById("refreshQuotesBtn");

const ratingsList    = document.getElementById("ratingsList");
const refreshRatings = document.getElementById("refreshRatingsBtn");

const eventTitle   = document.getElementById("eventTitle");
const eventStart   = document.getElementById("eventStart");
const eventEnd     = document.getElementById("eventEnd");
const eventDesc    = document.getElementById("eventDesc");
const eventBanner  = document.getElementById("eventBanner");
const createEvent  = document.getElementById("createEventBtn");
const eventStatus  = document.getElementById("eventStatus");
const eventsList   = document.getElementById("eventsList");

function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function showLogin(msg = "") {
  if (loginStatus) loginStatus.textContent = msg;
  if (loginSection) loginSection.style.display = "block";
  if (adminPanel) adminPanel.style.display = "none";
}

function showPanelInstant() {
  if (loginSection) loginSection.style.display = "none";
  if (adminPanel) adminPanel.style.display = "block";
}

function setEventStatus(msg = "") {
  if (eventStatus) eventStatus.textContent = msg;
}

function safeName(filename = "file") {
  return filename.toLowerCase().replace(/[^a-z0-9._-]+/g, "-");
}

function scoreText(value) {
  const num = Number(value ?? 0);
  return Number.isFinite(num) ? num.toFixed(1) : "0.0";
}

function averageRating(row) {
  const values = [
    Number(row.part1 || 0),
    Number(row.part2 || 0),
    Number(row.part3 || 0),
    Number(row.part4 || 0),
    Number(row.part5 || 0),
    Number(row.part6 || 0),
    Number(row.part7 || 0),
  ];
  const total = values.reduce((sum, n) => sum + n, 0);
  return (total / values.length).toFixed(1);
}

function getPartLabel(startPart, offset) {
  return `Part ${Number(startPart || 1) + offset}`;
}

function emptyState(text) {
  return `<div class="adminItem"><small>${esc(text)}</small></div>`;
}

async function verifyAdminOrKick() {
  const { data: sessRes, error: sessErr } = await supabase.auth.getSession();
  if (sessErr || !sessRes?.session) {
    showLogin("");
    return false;
  }

  const email = sessRes.session.user?.email;

  const { data: adminRow, error: adminErr } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  if (adminErr) {
    await supabase.auth.signOut();
    showLogin("Error cek admin: " + adminErr.message);
    return false;
  }

  if (!adminRow) {
    await supabase.auth.signOut();
    showLogin("Akun ini bukan admin.");
    return false;
  }

  return true;
}

async function loadConfessions() {
  if (!confList) return;

  confList.innerHTML = emptyState("Loading...");

  const { data, error } = await supabase
    .from("confessions")
    .select("id, name, message, impression, spotify_url, created_at")
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    confList.innerHTML = emptyState("Gagal load confessions: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    confList.innerHTML = emptyState("Tidak ada confession.");
    return;
  }

  confList.innerHTML = data.map((c) => {
    const name = c.name?.trim() ? esc(c.name) : "Anonim";
    const msg = esc(c.message || "");
    const imp = c.impression
      ? `<div style="margin-top:8px;"><small><b>Impression:</b> ${esc(c.impression)}</small></div>`
      : "";
    const sp = c.spotify_url
      ? `<div style="margin-top:8px;"><small><a href="${esc(c.spotify_url)}" target="_blank" rel="noreferrer">Spotify link</a></small></div>`
      : "";
    const time = c.created_at ? new Date(c.created_at).toLocaleString("id-ID") : "";

    return `
      <div class="adminItem">
        <div class="adminItemTop">
          <div>
            <b>${name}</b>
            <div class="adminMeta">${esc(time)}</div>
          </div>
          <button class="btn secondary" data-del-conf="${c.id}">Delete</button>
        </div>
        <p style="white-space:pre-wrap; margin:10px 0 0;">${msg}</p>
        ${imp}
        ${sp}
      </div>
    `;
  }).join("");

  confList.querySelectorAll("[data-del-conf]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-conf");
      if (!confirm("Yakin hapus confession ini?")) return;

      const { error: delErr } = await supabase.from("confessions").delete().eq("id", id);
      if (delErr) {
        alert("Gagal delete: " + delErr.message);
        return;
      }
      await loadConfessions();
    });
  });
}

async function loadQuotes() {
  if (!quotesList) return;

  quotesList.innerHTML = emptyState("Loading...");

  const { data, error } = await supabase
    .from("quotes")
    .select("id, name, quote, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    quotesList.innerHTML = emptyState("Gagal load quotes: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    quotesList.innerHTML = emptyState("Tidak ada quotes.");
    return;
  }

  quotesList.innerHTML = data.map((q) => {
    const name = q.name?.trim() ? esc(q.name) : "Anonim";
    const quote = esc(q.quote || "");
    const time = q.created_at ? new Date(q.created_at).toLocaleString("id-ID") : "";

    return `
      <div class="adminItem">
        <div class="adminItemTop">
          <div>
            <b>${name}</b>
            <div class="adminMeta">${esc(time)}</div>
          </div>
          <button class="btn secondary" data-del-quote="${q.id}">Delete</button>
        </div>
        <p style="white-space:pre-wrap; margin:10px 0 0;">${quote}</p>
      </div>
    `;
  }).join("");

  quotesList.querySelectorAll("[data-del-quote]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-quote");
      if (!confirm("Yakin hapus quote ini?")) return;

      const { error: delErr } = await supabase.from("quotes").delete().eq("id", id);
      if (delErr) {
        alert("Gagal delete quote: " + delErr.message);
        return;
      }
      await loadQuotes();
    });
  });
}

async function loadRatings() {
  if (!ratingsList) return;

  ratingsList.innerHTML = emptyState("Loading...");

  const { data, error } = await supabase
    .from("au_ratings")
    .select("id, name, reason, start_part, part1, part2, part3, part4, part5, part6, part7, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) {
    ratingsList.innerHTML = emptyState("Gagal load ratings: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    ratingsList.innerHTML = emptyState("Tidak ada rating.");
    return;
  }

  ratingsList.innerHTML = data.map((r) => {
    const name = r.name?.trim() ? esc(r.name) : "Anonim";
    const reason = esc(r.reason || "-");
    const time = r.created_at ? new Date(r.created_at).toLocaleString("id-ID") : "";
    const startPart = Number(r.start_part || 1);
    const avg = averageRating(r);

    const partsHtml = [r.part1, r.part2, r.part3, r.part4, r.part5, r.part6, r.part7]
      .map((value, index) => `
        <div class="ratingItem">
          <small>${getPartLabel(startPart, index)}</small>
          <b>${scoreText(value)}/10</b>
        </div>
      `).join("");

    return `
      <div class="adminItem">
        <div class="adminItemTop">
          <div>
            <b>${name}</b>
            <div class="adminMeta">${esc(time)}</div>
            <div class="adminMeta">Range: Part ${startPart}-${startPart + 6}</div>
          </div>
          <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
            <span class="btn secondary" style="cursor:default;">Avg ${avg}</span>
            <button class="btn secondary" data-del-rating="${r.id}">Delete</button>
          </div>
        </div>

        <div class="ratingGrid">
          ${partsHtml}
        </div>

        <p style="white-space:pre-wrap; margin:12px 0 0;"><b>Alasan:</b>\n${reason}</p>
      </div>
    `;
  }).join("");

  ratingsList.querySelectorAll("[data-del-rating]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-rating");
      if (!confirm("Yakin hapus rating ini?")) return;

      const { error: delErr } = await supabase.from("au_ratings").delete().eq("id", id);
      if (delErr) {
        alert("Gagal delete rating: " + delErr.message);
        return;
      }
      await loadRatings();
    });
  });
}

async function uploadBanner(file) {
  const safe = safeName(file.name || "banner.jpg");
  const path = `events/${Date.now()}-${safe}`;

  const { error: upErr } = await supabase.storage
    .from("event-banners")
    .upload(path, file, { upsert: false, contentType: file.type });

  if (upErr) throw new Error("Upload banner gagal: " + upErr.message);

  const { data } = supabase.storage.from("event-banners").getPublicUrl(path);
  return data.publicUrl;
}

function renderEventCard(e) {
  const title = esc(e.title || "");
  const desc = e.description ? esc(e.description) : "";
  const start = e.start_date ? new Date(e.start_date).toLocaleDateString("id-ID") : "-";
  const end = e.end_date ? new Date(e.end_date).toLocaleDateString("id-ID") : "-";
  const banner = e.banner_url
    ? `<div style="margin-top:10px;">
         <img src="${e.banner_url}" alt="" style="width:100%; border-radius:14px; border:1px solid rgba(255,255,255,.14);" />
       </div>`
    : "";

  return `
    <div class="adminItem">
      <div class="adminItemTop">
        <div>
          <b>${title}</b>
          <div class="adminMeta">${start} → ${end}</div>
        </div>
        <button class="btn secondary" data-del-event="${e.id}">Delete</button>
      </div>
      ${desc ? `<p style="white-space:pre-wrap; margin:10px 0 0;">${desc}</p>` : ""}
      ${banner}
    </div>
  `;
}

async function loadEvents() {
  if (!eventsList) return;

  eventsList.innerHTML = emptyState("Loading...");

  const { data, error } = await supabase
    .from("events")
    .select("id, created_at, title, description, banner_url, start_date, end_date")
    .order("start_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(80);

  if (error) {
    eventsList.innerHTML = emptyState("Gagal load events: " + error.message);
    return;
  }

  if (!data || data.length === 0) {
    eventsList.innerHTML = emptyState("Belum ada event.");
    return;
  }

  eventsList.innerHTML = data.map(renderEventCard).join("");

  eventsList.querySelectorAll("[data-del-event]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-del-event");
      if (!confirm("Yakin hapus event ini?")) return;

      const { error: delErr } = await supabase.from("events").delete().eq("id", id);
      if (delErr) {
        alert("Gagal delete event: " + delErr.message);
        return;
      }
      await loadEvents();
    });
  });
}

async function handleCreateEvent() {
  setEventStatus("");

  const title = (eventTitle?.value || "").trim();
  const description = (eventDesc?.value || "").trim() || null;
  const start_date = eventStart?.value || null;
  const end_date = eventEnd?.value || null;

  if (!title) {
    setEventStatus("Judul wajib diisi.");
    return;
  }

  if (start_date && end_date && end_date < start_date) {
    setEventStatus("End date tidak boleh lebih awal dari start date.");
    return;
  }

  createEvent.disabled = true;
  setEventStatus("Menyimpan...");

  try {
    let banner_url = null;
    const file = eventBanner?.files?.[0] || null;

    if (file) {
      banner_url = await uploadBanner(file);
    }

    const payload = { title, description, start_date, end_date, banner_url };
    const { error } = await supabase.from("events").insert(payload);
    if (error) throw new Error(error.message);

    setEventStatus("Event ditambahkan ✅");

    if (eventTitle) eventTitle.value = "";
    if (eventDesc) eventDesc.value = "";
    if (eventStart) eventStart.value = "";
    if (eventEnd) eventEnd.value = "";
    if (eventBanner) eventBanner.value = "";

    await loadEvents();
  } catch (e) {
    setEventStatus("Gagal tambah event: " + (e?.message || "unknown"));
  } finally {
    createEvent.disabled = false;
  }
}

async function initAdmin() {
  await loadConfessions();
  await loadQuotes();
  await loadRatings();
  await loadEvents();
}

loginBtn?.addEventListener("click", async (e) => {
  e.preventDefault();

  const email = (emailInput?.value || "").trim();
  const password = passInput?.value || "";

  if (!email || !password) {
    showLogin("Email & password wajib diisi.");
    return;
  }

  await supabase.auth.signOut();
  showLogin("Login...");

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error || !data?.session) {
    await supabase.auth.signOut();
    showLogin("Login gagal: " + (error?.message || "Unknown error"));
    return;
  }

  showPanelInstant();

  const ok = await verifyAdminOrKick();
  if (!ok) return;

  await initAdmin();
});

logoutBtn?.addEventListener("click", async () => {
  await supabase.auth.signOut();
  showLogin("");
});

refreshConf?.addEventListener("click", loadConfessions);
refreshQuotes?.addEventListener("click", loadQuotes);
refreshRatings?.addEventListener("click", loadRatings);
createEvent?.addEventListener("click", handleCreateEvent);

(async () => {
  const ok = await verifyAdminOrKick();
  if (ok) {
    showPanelInstant();
    await initAdmin();
  } else {
    showLogin("");
  }
})();
