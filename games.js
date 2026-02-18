import { supabase } from "./supabaseClient.js";

/* ===== SOUND SYSTEM ===== */
const sBuzz = new Audio("buzz.mp3");
const sCorrect = new Audio("correct.mp3");
const sWrong = new Audio("wrong.mp3");
const sTimer = new Audio("timer.mp3");
const sWinner = new Audio("winner.mp3");

function play(sound){
  sound.currentTime = 0;
  sound.play().catch(()=>{});
}

const joinCard = document.getElementById("joinCard");
const gameCard = document.getElementById("gameCard");

const roomCodeEl = document.getElementById("roomCode");
const nickEl = document.getElementById("nickname");
const joinBtn = document.getElementById("joinBtn");
const joinStatus = document.getElementById("joinStatus");

const roomLabel = document.getElementById("roomLabel");
const gameStatus = document.getElementById("gameStatus");

const qText = document.getElementById("qText");

const buzzBtn = document.getElementById("buzzBtn");
const buzzInfo = document.getElementById("buzzInfo");

const answerBox = document.getElementById("answerBox");
const answerText = document.getElementById("answerText");
const sendAnswerBtn = document.getElementById("sendAnswerBtn");
const answerStatus = document.getElementById("answerStatus");

const leaveBtn = document.getElementById("leaveBtn");

const feedStatus = document.getElementById("feedStatus");
const feedList = document.getElementById("feedList");

const lbStatus = document.getElementById("lbStatus");
const lbList = document.getElementById("lbList");
const meTag = document.getElementById("meTag");

const endOverlay = document.getElementById("endOverlay");
const closeOverlay = document.getElementById("closeOverlay");
const finalSub = document.getElementById("finalSub");
const finalList = document.getElementById("finalList");

const LS_KEY = "cc_state_final_v1";

let state = {
  room_id: null,
  room_code: null,
  player_id: null,
  nickname: null,
  current_question_id: null,
};

let roomCh = null, buzzCh = null, ansCh = null, playersCh = null;

function esc(s=""){
  return String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;");
}

function saveState(){ localStorage.setItem(LS_KEY, JSON.stringify(state)); }
function loadState(){
  try{
    const s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (s) state = s;
  }catch{}
}
function clearState(){
  localStorage.removeItem(LS_KEY);
  state = { room_id:null, room_code:null, player_id:null, nickname:null, current_question_id:null };
}

function showJoin(msg=""){
  joinCard.style.display = "block";
  gameCard.style.display = "none";
  joinStatus.textContent = msg;
}
function showGame(){
  joinCard.style.display = "none";
  gameCard.style.display = "block";
  roomLabel.textContent = state.room_code || "-";
  meTag.textContent = state.nickname ? `@${state.nickname}` : "—";
}

async function fetchRoomByCode(code){
  const { data, error } = await supabase
    .from("cc_rooms")
    .select("id, code, status, current_question_id, question_index")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchQuestion(qid){
  if (!qid) return null;
  const { data, error } = await supabase
    .from("cc_questions")
    .select("id, question_text")
    .eq("id", qid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function joinRoom(code, nickname){
  const room = await fetchRoomByCode(code);
  if (!room) throw new Error("Room tidak ditemukan.");

  const { data: player, error } = await supabase
    .from("cc_players")
    .insert({ room_id: room.id, nickname })
    .select("id")
    .single();

  if (error) throw error;

  state.room_id = room.id;
  state.room_code = room.code;
  state.player_id = player.id;
  state.nickname = nickname;
  state.current_question_id = room.current_question_id;
  saveState();

  showGame();
  await syncRoomUI(room);
  subscribeRealtime();
  await refreshLeaderboard();
}

async function syncRoomUI(room){
  state.current_question_id = room.current_question_id;
  saveState();

  if (room.status === "ended"){
    gameStatus.textContent = "Sesi sudah berakhir.";
    buzzBtn.disabled = true;
    answerBox.style.display = "none";
    await refreshLeaderboard();
    await loadAnswerFeed();
    await showFinalOverlay();
    return;
  }

  if (room.status !== "live"){
    gameStatus.textContent = `Status: ${room.status}. Menunggu admin mulai…`;
    qText.textContent = "—";
    buzzBtn.disabled = true;
    buzzInfo.textContent = "Buzz akan aktif saat live.";
    answerBox.style.display = "none";
    await refreshLeaderboard();
    await loadAnswerFeed();
    return;
    play(sTimer);

  }

  gameStatus.textContent = `LIVE • Soal #${(room.question_index || 0) + 1}`;
  buzzBtn.disabled = false;
  buzzInfo.textContent = "";

  const q = await fetchQuestion(room.current_question_id);
  qText.textContent = q?.question_text || "—";

  // reset area jawab tiap soal baru
  answerBox.style.display = "none";
  answerStatus.textContent = "";
  answerText.value = "";
  sendAnswerBtn.disabled = false;

  await refreshLeaderboard();
  await loadAnswerFeed();
}

async function refreshLeaderboard(){
  if (!state.room_id) return;

  const { data, error } = await supabase
    .from("cc_players")
    .select("id, nickname, points, kicked")
    .eq("room_id", state.room_id)
    .order("points", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);

  if (error){
    lbStatus.textContent = "Leaderboard error: " + error.message;
    lbList.innerHTML = "";
    return;
  }

  const clean = (data||[]).filter(p => !p.kicked);
  lbStatus.textContent = `${clean.length} peserta`;
  lbList.innerHTML = clean.map((p, i) => `
    <div class="lb-item">
      <div><b>${i+1}. ${esc(p.nickname)}</b></div>
      <div><b>${p.points}</b></div>
    </div>
  `).join("") || `<div class="lb-item"><div class="muted">Belum ada peserta.</div></div>`;
}

async function loadAnswerFeed(){
  if (!state.current_question_id){
    feedStatus.textContent = "";
    feedList.innerHTML = "";
    return;
  }

  const { data, error } = await supabase
    .from("cc_answers")
    .select("id, answer_text, verdict, created_at, cc_players(nickname)")
    .eq("question_id", state.current_question_id)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error){
    feedStatus.textContent = "Feed error: " + error.message;
    feedList.innerHTML = "";
    return;
  }

  if (!data?.length){
    feedStatus.textContent = "Belum ada jawaban.";
    feedList.innerHTML = `<div class="a"><span class="muted">Belum ada jawaban.</span></div>`;
    return;
  }

  feedStatus.textContent = `${data.length} jawaban`;
  feedList.innerHTML = data.map(a => `
    <div class="a">
      <div style="display:flex;justify-content:space-between;gap:10px;align-items:center;">
        <b>${esc(a.cc_players?.nickname || "Player")}</b>
        <span class="verdict">${esc(a.verdict)}</span>
      </div>
      <div style="white-space:pre-wrap;margin-top:8px;">${esc(a.answer_text)}</div>
    </div>
  `).join("");
}

async function buzz(){
  if (!state.room_id || !state.player_id || !state.current_question_id) return;

  buzzBtn.disabled = true;
  buzzInfo.textContent = "Mengirim buzz…";

  // kunci: yang pertama insert is_winner=true akan lolos,
  // yang kedua dst akan gagal karena unique winner per question
  const { error } = await supabase
    .from("cc_buzzes")
    .insert({
      room_id: state.room_id,
      question_id: state.current_question_id,
      player_id: state.player_id,
      is_winner: true
      play(sBuzz);
    });

  if (error){
    buzzBtn.disabled = false;
    buzzInfo.textContent = "Kamu telat 😭 (" + error.message + ")";
    return;
  }

  buzzInfo.textContent = "Kamu menang buzz! Silakan jawab.";
  answerBox.style.display = "block";
  sendAnswerBtn.disabled = false;
  
}

async function sendAnswer(){
  const text = (answerText.value || "").trim();
  if (!text){
    answerStatus.textContent = "Jawaban tidak boleh kosong.";
    return;
  }

  sendAnswerBtn.disabled = true;
  answerStatus.textContent = "Mengirim jawaban…";

  const { error } = await supabase
    .from("cc_answers")
    .insert({
      room_id: state.room_id,
      question_id: state.current_question_id,
      player_id: state.player_id,
      answer_text: text
    });

  if (error){
    sendAnswerBtn.disabled = false;
    answerStatus.textContent = "Gagal kirim: " + error.message;
    return;
  }

  answerStatus.textContent = "Jawaban terkirim. Menunggu verifikasi admin…";
  await loadAnswerFeed();
}

function unsubscribe(){
  if (roomCh) supabase.removeChannel(roomCh);
  if (buzzCh) supabase.removeChannel(buzzCh);
  if (ansCh) supabase.removeChannel(ansCh);
  if (playersCh) supabase.removeChannel(playersCh);
  roomCh = buzzCh = ansCh = playersCh = null;
}

function subscribeRealtime(){
  unsubscribe();

  roomCh = supabase.channel(`cc-room-${state.room_id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"cc_rooms", filter:`id=eq.${state.room_id}` }, async (p)=>{
      await syncRoomUI(p.new);
    })
    .subscribe();

  ansCh = supabase.channel(`cc-ans-${state.room_id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"cc_answers", filter:`room_id=eq.${state.room_id}` }, async (p)=>{
      const a = p.new;
      if (a.question_id === state.current_question_id){
        await loadAnswerFeed();
        if (a.player_id === state.player_id){
  if (a.verdict === "correct"){
    answerStatus.textContent = "✅ Benar!";
    play(sCorrect);
  }

  if (a.verdict === "wrong"){
    answerStatus.textContent = "❌ Salah!";
    play(sWrong);
  }
}
      }
    })
    .subscribe();

  playersCh = supabase.channel(`cc-players-${state.room_id}`)
    .on("postgres_changes", { event:"*", schema:"public", table:"cc_players", filter:`room_id=eq.${state.room_id}` }, async ()=>{
      await refreshLeaderboard();
    })
    .subscribe();
}

async function showFinalOverlay(){
  // ambil leaderboard top 20
  const { data } = await supabase
    .from("cc_players")
    .select("nickname, points, kicked")
    .eq("room_id", state.room_id)
    .order("points", { ascending:false })
    .order("created_at", { ascending:true })
    .limit(20);

  const list = (data||[]).filter(x => !x.kicked);
  const winner = list[0];

  finalSub.textContent = winner
    ? `Pemenang: ${winner.nickname} (${winner.points} poin)`
    : "Belum ada data peserta.";

  finalList.innerHTML = list.map((p, i)=>`
    <div class="lb-item" style="margin-top:10px;">
      <div><b>${i+1}. ${esc(p.nickname)}</b></div>
      <div><b>${p.points}</b></div>
    </div>
  `).join("") || `<div class="lb-item"><div class="muted">Kosong.</div></div>`;

  endOverlay.style.display = "flex";
}

closeOverlay.addEventListener("click", ()=>{
  endOverlay.style.display = "none";
});

joinBtn.addEventListener("click", async ()=>{
  joinStatus.textContent = "Joining…";
  try{
    const code = (roomCodeEl.value || "").trim().toUpperCase();
    const nick = (nickEl.value || "").trim();
    if (!code || !nick) { joinStatus.textContent = "Kode room & nickname wajib."; return; }
    await joinRoom(code, nick);
  }catch(e){
    joinStatus.textContent = e.message || "Gagal join.";
  }
});

buzzBtn.addEventListener("click", buzz);
sendAnswerBtn.addEventListener("click", sendAnswer);

leaveBtn.addEventListener("click", ()=>{
  unsubscribe();
  clearState();
  showJoin("");
});

(async ()=>{
  loadState();
  if (state.room_code && state.room_id && state.player_id){
    try{
      showGame();
      const room = await fetchRoomByCode(state.room_code);
      if (!room) { clearState(); showJoin("Room tidak ditemukan."); return; }
      await syncRoomUI(room);
      subscribeRealtime();
      await refreshLeaderboard();
    }catch{
      clearState();
      showJoin("Session join invalid. Join ulang ya.");
    }
  }else{
    showJoin("");
  }
})();
