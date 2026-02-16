import { supabase } from "./supabaseClient.js";

const loginCard = document.getElementById("loginCard");
const panel = document.getElementById("panel");
const emailEl = document.getElementById("email");
const passEl = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const loginStatus = document.getElementById("loginStatus");

const createRoomBtn = document.getElementById("createRoomBtn");
const roomInfo = document.getElementById("roomInfo");
const loadCode = document.getElementById("loadCode");
const loadRoomBtn = document.getElementById("loadRoomBtn");

const startBtn = document.getElementById("startBtn");
const nextBtn = document.getElementById("nextBtn");
const endBtn = document.getElementById("endBtn");
const liveStatus = document.getElementById("liveStatus");

const qText = document.getElementById("qText");
const addQBtn = document.getElementById("addQBtn");
const qStatus = document.getElementById("qStatus");
const qList = document.getElementById("qList");

const refreshBtn = document.getElementById("refreshBtn");
const lbStatus = document.getElementById("lbStatus");
const lbList = document.getElementById("lbList");

const ansStatus = document.getElementById("ansStatus");
const ansList = document.getElementById("ansList");

let room = null;
let questions = [];
let channels = [];

function esc(s=""){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function showLogin(msg=""){
  loginStatus.textContent = msg;
  loginCard.style.display = "block";
  panel.style.display = "none";
}

function showPanel(){
  loginCard.style.display = "none";
  panel.style.display = "block";
}

async function verifyAdmin(){
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session) return false;
  const email = sess.session.user.email;

  const { data: adminRow } = await supabase
    .from("admins")
    .select("email")
    .eq("email", email)
    .maybeSingle();

  return !!adminRow;
}

function genCode(){
  const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i=0;i<6;i++) out += chars[Math.floor(Math.random()*chars.length)];
  return out;
}

function setRoomInfo(){
  if (!room) { roomInfo.textContent = ""; return; }
  roomInfo.textContent = `Kode: ${room.code} • status: ${room.status} • qid: ${room.current_question_id || "-"}`;
}

async function fetchRoomByCode(code){
  const { data, error } = await supabase
    .from("cc_rooms")
    .select("*")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchQuestions(){
  if (!room) return [];
  const { data, error } = await supabase
    .from("cc_questions")
    .select("id, order_no, question_text, created_at")
    .eq("room_id", room.id)
    .order("order_no", { ascending: true });
  if (error) throw error;
  return data || [];
}

async function refreshQuestions(){
  questions = await fetchQuestions();
  if (!questions.length){
    qList.innerHTML = `<div class="item"><small>Belum ada pertanyaan.</small></div>`;
    return;
  }
  qList.innerHTML = questions.map(q => `
    <div class="item">
      <b>#${q.order_no}</b>
      <div style="white-space:pre-wrap;margin-top:8px;">${esc(q.question_text)}</div>
    </div>
  `).join("");
}

async function refreshLeaderboard(){
  if (!room){ lbList.innerHTML = ""; lbStatus.textContent=""; return; }

  const { data, error } = await supabase
    .from("cc_players")
    .select("id, nickname, points, kicked, created_at")
    .eq("room_id", room.id)
    .order("points", { ascending:false })
    .order("created_at", { ascending:true })
    .limit(50);

  if (error){
    lbStatus.textContent = error.message;
    lbList.innerHTML = "";
    return;
  }

  const clean = (data||[]);

  lbStatus.textContent = `${clean.length} peserta`;
  lbList.innerHTML = clean.map((p, i)=>`
    <div class="item" style="display:flex;justify-content:space-between;gap:12px;align-items:center;">
      <div style="min-width:0;">
        <b>${i+1}. ${esc(p.nickname)}</b>
        <div><small>${p.kicked ? "KICKED" : "aktif"}</small></div>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;justify-content:flex-end;">
        <b style="font-size:18px">${p.points}</b>
        <button class="btn danger" data-kick="${p.id}" type="button">${p.kicked ? "Unkick" : "Kick"}</button>
      </div>
    </div>
  `).join("") || `<div class="item"><small>Kosong.</small></div>`;

  lbList.querySelectorAll("button[data-kick]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-kick");
      const row = clean.find(x => x.id === id);
      const next = !row?.kicked;

      const { error: upErr } = await supabase
        .from("cc_players")
        .update({ kicked: next })
        .eq("id", id);

      if (upErr){ lbStatus.textContent = upErr.message; return; }
      await refreshLeaderboard();
    });
  });
}

async function renderAnswers(){
  if (!room?.current_question_id){
    ansList.innerHTML = `<div class="item"><small>Belum ada soal aktif.</small></div>`;
    return;
  }

  const { data, error } = await supabase
    .from("cc_answers")
    .select("id, player_id, answer_text, verdict, created_at, cc_players(nickname)")
    .eq("question_id", room.current_question_id)
    .order("created_at", { ascending:false })
    .limit(20);

  if (error){
    ansList.innerHTML = `<div class="item"><small>${esc(error.message)}</small></div>`;
    return;
  }
  if (!data?.length){
    ansList.innerHTML = `<div class="item"><small>Belum ada jawaban.</small></div>`;
    return;
  }

  ansList.innerHTML = data.map(a=>`
    <div class="item">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
        <b>${esc(a.cc_players?.nickname || "Player")}</b>
        <small>${esc(a.verdict)}</small>
      </div>
      <div style="white-space:pre-wrap;margin-top:8px;">${esc(a.answer_text)}</div>
      <div style="display:flex;gap:10px;justify-content:flex-end;margin-top:10px;flex-wrap:wrap;">
        <button class="btn" data-v="correct" data-id="${a.id}" data-pid="${a.player_id}" type="button">Benar</button>
        <button class="btn ghost" data-v="wrong" data-id="${a.id}" data-pid="${a.player_id}" type="button">Salah</button>
      </div>
    </div>
  `).join("");

  ansList.querySelectorAll("button[data-id]").forEach(btn=>{
    btn.addEventListener("click", async ()=>{
      const id = btn.getAttribute("data-id");
      const pid = btn.getAttribute("data-pid");
      const verdict = btn.getAttribute("data-v");

      // set verdict
      const { error: upErr } = await supabase
        .from("cc_answers")
        .update({ verdict, verified_at: new Date().toISOString() })
        .eq("id", id);

      if (upErr){ ansStatus.textContent = upErr.message; return; }

      // kalau BENAR -> +1 poin
      if (verdict === "correct"){
        const { data: pRow, error: pErr } = await supabase
          .from("cc_players")
          .select("points")
          .eq("id", pid)
          .maybeSingle();

        if (pErr){ ansStatus.textContent = pErr.message; return; }

        const nextPoints = (pRow?.points || 0) + 1;
        const { error: pUpErr } = await supabase
          .from("cc_players")
          .update({ points: nextPoints })
          .eq("id", pid);

        if (pUpErr){ ansStatus.textContent = pUpErr.message; return; }

        ansStatus.textContent = "✅ Benar (+1)";
      }

      // kalau SALAH -> buka buzz lagi untuk soal ini:
      // reset winner: hapus semua buzz winner untuk question (biar yang lain bisa buzz lagi)
      if (verdict === "wrong"){
        const { error: delErr } = await supabase
          .from("cc_buzzes")
          .delete()
          .eq("question_id", room.current_question_id);

        if (delErr){ ansStatus.textContent = delErr.message; return; }
        ansStatus.textContent = "❌ Salah. Buzz dibuka lagi.";
      }

      await refreshLeaderboard();
      await renderAnswers();
    });
  });
}

async function startLive(){
  if (!room) return;
  questions = await fetchQuestions();
  if (!questions.length){ liveStatus.textContent = "Tambah pertanyaan dulu."; return; }

  const first = questions[0];

 const { data, error } = await supabase
  .from("cc_answers")
  .update({
    verdict,
    verified_at: new Date().toISOString(),
    scored_at: new Date().toISOString()
  })
  .eq("id", id)
  .is("scored_at", null)  // ✅ ANTI SPAM
  .select()
  .maybeSingle();

if (error) {
  ansStatus.textContent = error.message;
  return;
}

if (!data) {
  ansStatus.textContent = "Jawaban sudah dinilai sebelumnya.";
  return;
}

  if (error){ liveStatus.textContent = error.message; return; }
  room = data;
  setRoomInfo();
  liveStatus.textContent = "LIVE ✅";
  await renderAnswers();
}

async function nextQuestion(){
  if (!room) return;

  questions = await fetchQuestions();
  if (!questions.length) return;

  const nextIndex = Math.min((room.question_index || 0) + 1, questions.length - 1);
  const nextQ = questions[nextIndex];

  // bersihin buzz & jawaban pending (biar soal baru clean)
  if (room.current_question_id){
    await supabase.from("cc_buzzes").delete().eq("question_id", room.current_question_id);
    // jawaban lama tetap disimpan (history) -> biarin
  }

  const { data, error } = await supabase
    .from("cc_rooms")
    .update({ question_index: nextIndex, current_question_id: nextQ.id })
    .eq("id", room.id)
    .select("*")
    .single();

  if (error){ liveStatus.textContent = error.message; return; }
  room = data;
  setRoomInfo();
  liveStatus.textContent = `Soal #${nextIndex+1}`;
  await renderAnswers();
}

async function endLive(){
  if (!room) return;

  const { data, error } = await supabase
    .from("cc_rooms")
    .update({ status: "ended", ended_at: new Date().toISOString() })
    .eq("id", room.id)
    .select("*")
    .single();

  if (error){ liveStatus.textContent = error.message; return; }
  room = data;
  setRoomInfo();
  liveStatus.textContent = "ENDED ✅";
}

function subscribe(){
  unsubscribe();
  if (!room) return;

  const chRoom = supabase.channel(`adm-room-${room.id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"cc_rooms", filter:`id=eq.${room.id}` }, async (p)=>{
      room = p.new;
      setRoomInfo();
      await renderAnswers();
    })
    .subscribe();

  const chAns = supabase.channel(`adm-ans-${room.id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"cc_answers", filter:`room_id=eq.${room.id}` }, async ()=>{
      await renderAnswers();
    })
    .subscribe();

  const chPlayers = supabase.channel(`adm-players-${room.id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"cc_players", filter:`room_id=eq.${room.id}` }, async ()=>{
      await refreshLeaderboard();
    })
    .subscribe();

  channels.push(chRoom, chAns, chPlayers);
}

function unsubscribe(){
  channels.forEach(ch => supabase.removeChannel(ch));
  channels = [];
}

/* ===== UI ===== */
loginBtn.addEventListener("click", async ()=>{
  loginStatus.textContent = "Login…";

  const email = (emailEl.value||"").trim();
  const password = passEl.value||"";

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data?.session){
    showLogin("Login gagal: " + (error?.message || "unknown"));
    return;
  }

  if (!(await verifyAdmin())){
    await supabase.auth.signOut();
    showLogin("Bukan admin.");
    return;
  }

  showPanel();
});

logoutBtn.addEventListener("click", async ()=>{
  await supabase.auth.signOut();
  unsubscribe();
  room = null;
  showLogin("");
});

createRoomBtn.addEventListener("click", async ()=>{
  roomInfo.textContent = "Membuat room…";
  const code = genCode();

  const { data, error } = await supabase
    .from("cc_rooms")
    .insert({ code })
    .select("*")
    .single();

  if (error){ roomInfo.textContent = error.message; return; }
  room = data;
  setRoomInfo();
  await refreshQuestions();
  await refreshLeaderboard();
  await renderAnswers();
  subscribe();
});

loadRoomBtn.addEventListener("click", async ()=>{
  liveStatus.textContent = "";
  try{
    const code = (loadCode.value||"").trim().toUpperCase();
    if (!code){ liveStatus.textContent = "Isi kode dulu."; return; }
    const r = await fetchRoomByCode(code);
    if (!r){ liveStatus.textContent = "Room tidak ditemukan."; return; }
    room = r;
    setRoomInfo();
    await refreshQuestions();
    await refreshLeaderboard();
    await renderAnswers();
    subscribe();
  }catch(e){
    liveStatus.textContent = e.message || "Error.";
  }
});

addQBtn.addEventListener("click", async ()=>{
  qStatus.textContent = "";
  if (!room){ qStatus.textContent = "Buat/load room dulu."; return; }

  const text = (qText.value||"").trim();
  if (!text){ qStatus.textContent = "Pertanyaan kosong."; return; }

  questions = await fetchQuestions();
  const nextOrder = questions.length ? (questions[questions.length-1].order_no + 1) : 1;

  const { error } = await supabase.from("cc_questions").insert({
    room_id: room.id,
    order_no: nextOrder,
    question_text: text
  });

  if (error){ qStatus.textContent = error.message; return; }
  qText.value = "";
  qStatus.textContent = "Pertanyaan ditambahkan ✅";
  await refreshQuestions();
});

startBtn.addEventListener("click", startLive);
nextBtn.addEventListener("click", nextQuestion);
endBtn.addEventListener("click", endLive);
refreshBtn.addEventListener("click", async ()=>{
  await refreshLeaderboard();
  await renderAnswers();
});

(async ()=>{
  if (await verifyAdmin()){
    showPanel();
  }else{
    showLogin("");
  }
})();
