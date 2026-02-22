// games.js
import { supabase } from "./supabaseClient.js";

/* ===== SOUND SYSTEM (ALL IN ROOT) ===== */
const sBuzz = new Audio("buzz.mp3");
const sCorrect = new Audio("correct.mp3");
const sWrong = new Audio("wrong.mp3");
const sTimer = new Audio("timer.mp3");
const sWinner = new Audio("winner.mp3");

function play(sound) {
  try {
    sound.currentTime = 0;
    sound.play().catch(() => {});
  } catch {}
}

/* ===== DOM ===== */
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
// NOTE: di HTML stage4 kamu TIDAK punya #answerStatus, jadi kita guard:
const answerStatus = document.getElementById("answerStatus") || null;

const leaveBtn = document.getElementById("leaveBtn");

// NOTE: di HTML stage4 kamu TIDAK punya #feedStatus, jadi kita guard:
const feedStatus = document.getElementById("feedStatus") || null;
const feedList = document.getElementById("feedList");

const lbStatus = document.getElementById("lbStatus");
const lbList = document.getElementById("lbList");
const meTag = document.getElementById("meTag");

const endOverlay = document.getElementById("endOverlay");
const closeOverlay = document.getElementById("closeOverlay");
const finalSub = document.getElementById("finalSub");
const finalList = document.getElementById("finalList");

/* ===== TAB DOM (Jawaban / Obrolan) =====
   (Kalau kamu sudah pindah ke layout 4 kotak tanpa tabs, ini aman karena pakai optional chaining)
*/
let tabJawaban = document.getElementById("tabJawaban");
let tabObrolan = document.getElementById("tabObrolan");
let panelJawaban = document.getElementById("panelJawaban");
let panelObrolan = document.getElementById("panelObrolan");

/* ===== TAB STATE ===== */
let obrolanUnlocked = false;

function setActiveTab(which) {
  const isJawaban = which === "jawaban";

  tabJawaban?.classList.toggle("is-active", isJawaban);
  tabObrolan?.classList.toggle("is-active", !isJawaban);

  panelJawaban?.classList.toggle("is-active", isJawaban);
  panelObrolan?.classList.toggle("is-active", !isJawaban);
}

function lockObrolan(locked) {
  obrolanUnlocked = !locked;

  tabObrolan?.classList.toggle("is-locked", locked);
  tabObrolan?.setAttribute("aria-disabled", locked ? "true" : "false");
  tabObrolan && (tabObrolan.style.pointerEvents = locked ? "none" : "auto");
  tabObrolan && (tabObrolan.style.opacity = locked ? "0.55" : "1");
}

function initTabsOnce() {
  // pasang listener sekali aja
  tabJawaban?.addEventListener("click", () => setActiveTab("jawaban"));
  tabObrolan?.addEventListener("click", () => {
    if (!obrolanUnlocked) return;
    setActiveTab("obrolan");
  });

  // default state
  setActiveTab("jawaban");
  lockObrolan(true);
}
initTabsOnce();

/* ===== STATE ===== */
const LS_KEY = "cc_state_final_v1";

let state = {
  room_id: null,
  room_code: null,
  player_id: null,
  nickname: null,
  current_question_id: null,
};

let roomCh = null,
  ansCh = null,
  playersCh = null;

let lastRoomStatus = null;

/* ===== helpers ===== */
function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

let canAnswer = false;

function setAnswerEnabled(enabled, note = "") {
  canAnswer = !!enabled;

  if (answerText) answerText.disabled = !canAnswer;
  if (sendAnswerBtn) sendAnswerBtn.disabled = !canAnswer;

  // kasih style biar keliatan disabled
  if (answerBox) answerBox.dataset.disabled = canAnswer ? "0" : "1";

  if (answerStatus) {
    if (note) answerStatus.textContent = note;
    else answerStatus.textContent = "";
  }
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}
function loadState() {
  try {
    const s = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (s) state = s;
  } catch {}
}
function clearState() {
  localStorage.removeItem(LS_KEY);
  state = {
    room_id: null,
    room_code: null,
    player_id: null,
    nickname: null,
    current_question_id: null,
  };
}

/* ===== show/hide ===== */
function showJoin(msg = "") {
  joinCard.style.display = "block";
  gameCard.style.display = "none";
  joinStatus.textContent = msg;
}

function showGame() {
  joinCard.style.display = "none";
  // penting: harus grid biar 4 kotak jalan
  gameCard.style.display = "grid";

  roomLabel.textContent = state.room_code || "-";
  meTag.textContent = state.nickname ? `@${state.nickname}` : "—";
}

/* ===== Supabase fetch ===== */
async function fetchRoomByCode(code) {
  const { data, error } = await supabase
    .from("cc_rooms")
    .select("id, code, status, current_question_id, question_index")
    .eq("code", code)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function fetchQuestion(qid) {
  if (!qid) return null;
  const { data, error } = await supabase
    .from("cc_questions")
    .select("id, question_text")
    .eq("id", qid)
    .maybeSingle();
  if (error) throw error;
  return data;
}

/* ===== JOIN ===== */
async function joinRoom(code, nickname) {
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

/* ===== UI Sync ===== */
async function syncRoomUI(room) {
  const prevQ = state.current_question_id;

  state.current_question_id = room.current_question_id;
  saveState();

  // play timer only when status becomes live (once per transition)
  if (room.status === "live" && lastRoomStatus !== "live") {
    play(sTimer);
  }
  lastRoomStatus = room.status;

  if (room.status === "ended") {
    gameStatus.textContent = "Sesi sudah berakhir.";
    buzzBtn.disabled = true;
    setAnswerEnabled(false, "Sesi sudah berakhir.");
    await refreshLeaderboard();
    await loadAnswerFeed();
    await showFinalOverlay();
    return;
  }

  if (room.status !== "live") {
    gameStatus.textContent = `Status: ${room.status}. Menunggu admin mulai…`;
    qText.textContent = "—";
    buzzBtn.disabled = true;
    buzzInfo.textContent = "Buzz akan aktif saat live.";
    setAnswerEnabled(false, "Jawaban aktif saat LIVE dan kamu menang BUZZ.");
    await refreshLeaderboard();
    await loadAnswerFeed();
    return;
  }

  // kalau soal berubah / masuk live baru: reset tab + lock obrolan
  if (prevQ !== room.current_question_id) {
    setActiveTab("jawaban");
    lockObrolan(true);

    // reset jawab untuk soal baru
    if (answerText) answerText.value = "";
    setAnswerEnabled(false, "Tekan BUZZ dulu untuk menjawab.");
  } else {
    // tetap pastikan default tab jawaban
    setActiveTab("jawaban");
  }

  // LIVE
  gameStatus.textContent = `LIVE • Soal #${(room.question_index || 0) + 1}`;
  buzzBtn.disabled = false;
  buzzInfo.textContent = "";

  const q = await fetchQuestion(room.current_question_id);
  qText.textContent = q?.question_text || "—";

  await refreshLeaderboard();
  await loadAnswerFeed();
}

/* ===== Leaderboard ===== */
async function refreshLeaderboard() {
  if (!state.room_id) return;

  const { data, error } = await supabase
    .from("cc_players")
    .select("id, nickname, points, kicked, created_at")
    .eq("room_id", state.room_id)
    .order("points", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) {
    lbStatus.textContent = "Leaderboard error: " + error.message;
    lbList.innerHTML = "";
    return;
  }

  const clean = (data || []).filter((p) => !p.kicked);
  lbStatus.textContent = `${clean.length} peserta`;
  lbList.innerHTML =
    clean
      .map(
        (p, i) => `
    <div class="lb-item">
      <div><b>${i + 1}. ${esc(p.nickname)}</b></div>
      <div><b>${p.points}</b></div>
    </div>
  `
      )
      .join("") ||
    `<div class="lb-item"><div class="muted">Belum ada peserta.</div></div>`;
}

/* ===== Feed Answers ===== */
function scrollFeedToBottom() {
  if (!feedList) return;
  // tunggu DOM selesai render
  queueMicrotask(() => {
    feedList.scrollTop = feedList.scrollHeight;
  });
}

async function loadAnswerFeed() {
  if (!state.current_question_id) {
    if (feedStatus) feedStatus.textContent = "";
    feedList.innerHTML = "";
    return;
  }

  const { data, error } = await supabase
    .from("cc_answers")
    .select("id, answer_text, verdict, created_at, cc_players(nickname)")
    .eq("question_id", state.current_question_id)
    .order("created_at", { ascending: true })
    .limit(50);

  if (error) {
    if (feedStatus) feedStatus.textContent = "Feed error: " + error.message;
    feedList.innerHTML = "";
    return;
  }

  if (!data?.length) {
    if (feedStatus) feedStatus.textContent = "";
    feedList.innerHTML = `
      <div class="ansItem">
        <span style="opacity:.75">Belum ada jawaban.</span>
      </div>`;
    return;
  }

  if (feedStatus) feedStatus.textContent = `${data.length} jawaban`;

  feedList.innerHTML = data
    .map((a) => {
      const verdict = a.verdict || "pending";
      const name = a.cc_players?.nickname || "Player";
      return `
        <div class="ansItem">
          <div class="meta">
            <span><b>${esc(name)}</b></span>
            <span class="verdict">${esc(verdict)}</span>
          </div>
          <div style="white-space:pre-wrap;">${esc(a.answer_text)}</div>
        </div>
      `;
    })
    .join("");

  scrollFeedToBottom();
}

/* ===== GAME ACTIONS ===== */

/**
 * BUZZ FIX (MINIMUM):
 * - cek dulu apakah sudah ada winner untuk question ini
 * - kalau belum ada, insert is_winner:true
 *
 * Catatan: ini masih bisa race condition kalau 2 orang klik bareng persis.
 * Yang paling aman itu pakai trigger/RPC di Supabase. Tapi ini sudah jauh lebih bener
 * daripada sebelumnya (semua orang jadi winner).
 */
async function buzz() {
  if (!state.room_id || !state.player_id || !state.current_question_id) return;

  buzzBtn.disabled = true;
  buzzInfo.textContent = "Mengirim buzz…";

  // 1) cek apakah sudah ada pemenang buzz
  const { data: existing, error: checkErr } = await supabase
    .from("cc_buzzes")
    .select("id")
    .eq("room_id", state.room_id)
    .eq("question_id", state.current_question_id)
    .eq("is_winner", true)
    .limit(1);

  if (checkErr) {
    buzzBtn.disabled = false;
    buzzInfo.textContent = "Gagal cek buzz: " + checkErr.message;
    return;
  }

  if (existing?.length) {
    buzzBtn.disabled = false;
    buzzInfo.textContent = "Kamu telat 😭";
    return;
  }

  // 2) insert sebagai winner
  const { error } = await supabase.from("cc_buzzes").insert({
    room_id: state.room_id,
    question_id: state.current_question_id,
    player_id: state.player_id,
    is_winner: true,
  });

  if (error) {
    buzzBtn.disabled = false;
    buzzInfo.textContent = "Kamu telat 😭 (" + error.message + ")";
    return;
  }

  // setelah buzz sukses
  play(sBuzz);
  buzzInfo.textContent = "Kamu menang buzz! Silakan jawab.";

  setAnswerEnabled(true, "");
  if (answerText) answerText.focus();

  // kalau mau obrolan kebuka setelah menang buzz
  lockObrolan(false);
}

async function sendAnswer() {
  if (!canAnswer) {
    if (answerStatus) answerStatus.textContent = "Kamu harus menang BUZZ dulu untuk menjawab.";
    return;
  }

  const text = (answerText?.value || "").trim();
  if (!text) {
    if (answerStatus) answerStatus.textContent = "Jawaban tidak boleh kosong.";
    return;
  }

  sendAnswerBtn.disabled = true;
  if (answerStatus) answerStatus.textContent = "Mengirim jawaban…";

  const { error } = await supabase.from("cc_answers").insert({
    room_id: state.room_id,
    question_id: state.current_question_id,
    player_id: state.player_id,
    answer_text: text,
  });

  if (error) {
    sendAnswerBtn.disabled = false;
    if (answerStatus) answerStatus.textContent = "Gagal kirim: " + error.message;
    return;
  }

  // setelah kirim: kunci lagi (biar 1x jawab per buzz)
  if (answerText) answerText.value = "";
  setAnswerEnabled(false, "Jawaban terkirim. Menunggu verifikasi admin…");

  await loadAnswerFeed();
}

/* ===== Real-time ===== */
function unsubscribe() {
  if (roomCh) supabase.removeChannel(roomCh);
  if (ansCh) supabase.removeChannel(ansCh);
  if (playersCh) supabase.removeChannel(playersCh);
  roomCh = ansCh = playersCh = null;
}

function subscribeRealtime() {
  unsubscribe();

  roomCh = supabase
    .channel(`cc-room-${state.room_id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cc_rooms", filter: `id=eq.${state.room_id}` },
      async (p) => {
        await syncRoomUI(p.new);
      }
    )
    .subscribe();

  ansCh = supabase
    .channel(`cc-ans-${state.room_id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cc_answers", filter: `room_id=eq.${state.room_id}` },
      async (p) => {
        const a = p.new;
        if (!a) return;
        if (a.question_id !== state.current_question_id) return;

        // update status pribadi + sound verdict
        if (a.player_id === state.player_id) {
          if (a.verdict === "correct") {
            if (answerStatus) answerStatus.textContent = "✅ Benar!";
            play(sCorrect);
          } else if (a.verdict === "wrong") {
            if (answerStatus) answerStatus.textContent = "❌ Salah!";
            play(sWrong);

            // kalau salah: buka buzz lagi & lock jawab
            buzzBtn.disabled = false;
            setAnswerEnabled(false, "Salah. Tekan BUZZ lagi untuk menjawab.");

            // LOCK obrolan lagi kalau salah + balik jawaban
            lockObrolan(true);
            setActiveTab("jawaban");
          }
        }

        await loadAnswerFeed();
      }
    )
    .subscribe();

  playersCh = supabase
    .channel(`cc-players-${state.room_id}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "cc_players", filter: `room_id=eq.${state.room_id}` },
      async () => {
        await refreshLeaderboard();
      }
    )
    .subscribe();
}

/* ===== Final Overlay ===== */
async function showFinalOverlay() {
  const { data, error } = await supabase
    .from("cc_players")
    .select("nickname, points, kicked, created_at")
    .eq("room_id", state.room_id)
    .order("points", { ascending: false })
    .order("created_at", { ascending: true })
    .limit(20);

  if (error) return;

  const list = (data || []).filter((x) => !x.kicked);
  const winner = list[0];

  finalSub.textContent = winner
    ? `Pemenang: ${winner.nickname} (${winner.points} poin)`
    : "Belum ada data peserta.";

  finalList.innerHTML =
    list
      .map(
        (p, i) => `
    <div class="lb-item" style="margin-top:10px;">
      <div><b>${i + 1}. ${esc(p.nickname)}</b></div>
      <div><b>${p.points}</b></div>
    </div>
  `
      )
      .join("") || `<div class="lb-item"><div class="muted">Kosong.</div></div>`;

  endOverlay.style.display = "flex";
  play(sWinner);
}

closeOverlay?.addEventListener("click", () => {
  endOverlay.style.display = "none";
});

/* ===== Events ===== */
joinBtn?.addEventListener("click", async () => {
  joinStatus.textContent = "Joining…";
  try {
    const code = (roomCodeEl.value || "").trim().toUpperCase();
    const nick = (nickEl.value || "").trim();
    if (!code || !nick) {
      joinStatus.textContent = "Kode room & nickname wajib.";
      return;
    }
    await joinRoom(code, nick);
  } catch (e) {
    joinStatus.textContent = e?.message || "Gagal join.";
  }
});

buzzBtn?.addEventListener("click", buzz);
sendAnswerBtn?.addEventListener("click", sendAnswer);

// Enter untuk kirim (enak buat pill input)
answerText?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendAnswer();
  }
});

leaveBtn?.addEventListener("click", () => {
  unsubscribe();
  clearState();
  showJoin("");
});

/* ===== Boot ===== */
(async () => {
  loadState();

  if (state.room_code && state.room_id && state.player_id) {
    try {
      showGame();
      const room = await fetchRoomByCode(state.room_code);
      if (!room) {
        clearState();
        showJoin("Room tidak ditemukan.");
        return;
      }
      await syncRoomUI(room);
      subscribeRealtime();
      await refreshLeaderboard();
    } catch {
      clearState();
      showJoin("Session join invalid. Join ulang ya.");
    }
  } else {
    showJoin("");
  }
})();
