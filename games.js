// games.js
import { supabase } from "./supabaseClient.js";

/* ===== SOUND SYSTEM ===== */
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
const buzzOwner = document.getElementById("buzzOwner");
const buzzTimer = document.getElementById("buzzTimer");

const answerBox = document.getElementById("answerBox");
const answerText = document.getElementById("answerText");
const sendAnswerBtn = document.getElementById("sendAnswerBtn");
const answerStatus = document.getElementById("answerStatus") || null;

const leaveBtn = document.getElementById("leaveBtn");

const feedStatus = document.getElementById("feedStatus") || null;
const feedList = document.getElementById("feedList");

const lbStatus = document.getElementById("lbStatus");
const lbList = document.getElementById("lbList");
const meTag = document.getElementById("meTag");

const endOverlay = document.getElementById("endOverlay");
const closeOverlay = document.getElementById("closeOverlay");
const finalSub = document.getElementById("finalSub");
const finalList = document.getElementById("finalList");

const chatList = document.getElementById("chatList");
const chatText = document.getElementById("chatText");
const sendChatBtn = document.getElementById("sendChatBtn");

/* ===== STATE ===== */
const LS_KEY = "cc_state_final_v3";

let state = {
  room_id: null,
  room_code: null,
  player_id: null,
  nickname: null,
  current_question_id: null,
};

let roomCh = null;
let ansCh = null;
let playersCh = null;
let chatCh = null;
let buzzCh = null;

let lastRoomStatus = null;
let canAnswer = false;

let activeBuzz = null;
// shape:
// {
//   id,
//   player_id,
//   nickname,
//   created_at,
//   expires_at,
//   released_at
// }

let buzzCountdownInt = null;
let releasingBuzz = false;

/* ===== HELPERS ===== */
function esc(s = "") {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function saveState() {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function loadState() {
  try {
    const raw = JSON.parse(localStorage.getItem(LS_KEY) || "null");
    if (raw) state = raw;
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

function setAnswerEnabled(enabled, note = "") {
  canAnswer = !!enabled;

  if (answerText) answerText.disabled = !canAnswer;
  if (sendAnswerBtn) sendAnswerBtn.disabled = !canAnswer;
  if (answerBox) answerBox.dataset.disabled = canAnswer ? "0" : "1";

  if (answerStatus) {
    answerStatus.textContent = note || "";
  }
}

function setChatEnabled(enabled) {
  if (chatText) chatText.disabled = !enabled;
  if (sendChatBtn) sendChatBtn.disabled = !enabled;
}

function scrollFeedToBottom() {
  if (!feedList) return;
  queueMicrotask(() => {
    feedList.scrollTop = feedList.scrollHeight;
  });
}

function scrollChatToBottom() {
  if (!chatList) return;
  queueMicrotask(() => {
    chatList.scrollTop = chatList.scrollHeight;
  });
}

function clearBuzzCountdown() {
  if (buzzCountdownInt) {
    clearInterval(buzzCountdownInt);
    buzzCountdownInt = null;
  }
}

function resetBuzzVisual(text = "Belum ada pemenang buzz.", timerText = "") {
  if (buzzOwner) buzzOwner.textContent = text;
  if (buzzTimer) buzzTimer.textContent = timerText;
}

function clearBuzzState() {
  activeBuzz = null;
  clearBuzzCountdown();
  resetBuzzVisual();
}

function showJoin(msg = "") {
  if (joinCard) {
    joinCard.style.display = "block";
    joinCard.removeAttribute("hidden");
  }

  if (gameCard) {
    gameCard.style.display = "none";
    gameCard.setAttribute("hidden", "");
  }

  if (joinStatus) joinStatus.textContent = msg;
}

function showGame() {
  if (joinCard) {
    joinCard.style.display = "none";
    joinCard.setAttribute("hidden", "");
  }

  if (gameCard) {
    gameCard.removeAttribute("hidden");
    gameCard.style.display = "grid";
  }

  if (roomLabel) roomLabel.textContent = state.room_code || "-";
  if (meTag) meTag.textContent = state.nickname ? `@${state.nickname}` : "—";
}

/* ===== SUPABASE FETCH ===== */
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

/* ===== BUZZ HELPERS ===== */
async function releaseActiveBuzz(reason = "expired") {
  if (!state.current_question_id || releasingBuzz) return;

  releasingBuzz = true;

  try {
    const nowIso = new Date().toISOString();

    const { error } = await supabase
      .from("cc_buzzes")
      .update({ released_at: nowIso })
      .eq("question_id", state.current_question_id)
      .eq("is_winner", true)
      .is("released_at", null);

    if (error) {
      console.log("releaseActiveBuzz error:", error.message);
      return;
    }

    activeBuzz = null;
    clearBuzzCountdown();

    if (reason === "expired") {
      resetBuzzVisual("Belum ada pemenang buzz.", "Waktu habis. Buzz terbuka lagi.");
      if (lastRoomStatus === "live") {
        if (buzzBtn) buzzBtn.disabled = false;
        if (buzzInfo) buzzInfo.textContent = "Buzz terbuka lagi.";
      }
      setAnswerEnabled(false, "Waktu jawab habis. Tekan BUZZ lagi.");
    } else if (reason === "answered") {
      resetBuzzVisual("Menunggu verifikasi jawaban...", "");
    } else if (reason === "wrong") {
      resetBuzzVisual("Belum ada pemenang buzz.", "");
      if (lastRoomStatus === "live") {
        if (buzzBtn) buzzBtn.disabled = false;
        if (buzzInfo) buzzInfo.textContent = "Buzz terbuka lagi.";
      }
      setAnswerEnabled(false, "Salah. Buzz dibuka lagi.");
    } else if (reason === "correct") {
      resetBuzzVisual("Jawaban benar.", "");
    } else {
      resetBuzzVisual("Belum ada pemenang buzz.", "");
    }
  } finally {
    releasingBuzz = false;
  }
}

function startBuzzCountdown() {
  clearBuzzCountdown();

  buzzCountdownInt = setInterval(async () => {
    if (!activeBuzz?.expires_at) {
      clearBuzzCountdown();
      return;
    }

    const leftMs = new Date(activeBuzz.expires_at).getTime() - Date.now();

    if (leftMs <= 0) {
      clearBuzzCountdown();
      await releaseActiveBuzz("expired");
      return;
    }

    const sec = Math.ceil(leftMs / 1000);
    if (buzzTimer) buzzTimer.textContent = `Waktu jawab: ${sec} detik`;
  }, 250);
}

async function fetchActiveBuzz() {
  if (!state.room_id || !state.current_question_id) {
    clearBuzzState();
    return null;
  }

  const nowIso = new Date().toISOString();

  // release otomatis buzz yang expired di DB
  await supabase
    .from("cc_buzzes")
    .update({ released_at: nowIso })
    .eq("question_id", state.current_question_id)
    .eq("is_winner", true)
    .is("released_at", null)
    .lt("expires_at", nowIso);

  const { data: buzzRow, error: buzzErr } = await supabase
    .from("cc_buzzes")
    .select("id, player_id, created_at, expires_at, released_at, cc_players(nickname)")
    .eq("room_id", state.room_id)
    .eq("question_id", state.current_question_id)
    .eq("is_winner", true)
    .is("released_at", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (buzzErr) {
    console.log("fetchActiveBuzz error:", buzzErr.message);
    clearBuzzState();
    return null;
  }

  if (!buzzRow) {
    clearBuzzState();
    return null;
  }
  
  activeBuzz = {
    id: buzzRow.id,
    player_id: buzzRow.player_id,
    nickname: buzzRow.cc_players?.nickname || "Player",
    created_at: buzzRow.created_at,
    expires_at: buzzRow.expires_at,
    released_at: buzzRow.released_at,
  };

  if (buzzOwner) {
    buzzOwner.textContent = `Pemenang buzz: ${activeBuzz.nickname}`;
  }

  if (state.player_id === activeBuzz.player_id) {
    if (buzzInfo) buzzInfo.textContent = "Kamu menang buzz! Jawab dalam 15 detik.";
    setAnswerEnabled(true, "");
    if (buzzBtn) buzzBtn.disabled = true;
  } else {
    if (buzzInfo) buzzInfo.textContent = `${activeBuzz.nickname} sedang menjawab...`;
    setAnswerEnabled(false, `Menunggu ${activeBuzz.nickname} menjawab.`);
    if (buzzBtn) buzzBtn.disabled = true;
  }

  startBuzzCountdown();
  return activeBuzz;
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
  await loadAnswerFeed();
  await loadChatFeed();
  await fetchActiveBuzz();
}

/* ===== UI SYNC ===== */
async function syncRoomUI(room) {
  const prevQ = state.current_question_id;
  state.current_question_id = room.current_question_id;
  saveState();

  if (room.status === "live" && lastRoomStatus !== "live") {
    play(sTimer);
  }
  lastRoomStatus = room.status;

  if (room.status === "ended") {
    if (gameStatus) gameStatus.textContent = "Sesi sudah berakhir.";
    if (qText) qText.textContent = "—";
    if (buzzBtn) buzzBtn.disabled = true;
    if (buzzInfo) buzzInfo.textContent = "";
    resetBuzzVisual("Sesi berakhir.", "");
    clearBuzzCountdown();
    setAnswerEnabled(false, "Sesi sudah berakhir.");
    setChatEnabled(true);

    await refreshLeaderboard();
    await loadAnswerFeed();
    await loadChatFeed();
    await showFinalOverlay();
    return;
  }

  if (room.status !== "live") {
    if (gameStatus) gameStatus.textContent = `Status: ${room.status}. Menunggu admin mulai…`;
    if (qText) qText.textContent = "—";
    if (buzzBtn) buzzBtn.disabled = true;
    if (buzzInfo) buzzInfo.textContent = "Buzz akan aktif saat live.";
    resetBuzzVisual("Belum ada pemenang buzz.", "");
    clearBuzzCountdown();
    setAnswerEnabled(false, "Jawaban aktif saat LIVE dan kamu menang BUZZ.");
    setChatEnabled(true);

    await refreshLeaderboard();
    await loadChatFeed();
    await loadAnswerFeed();
    return;
  }

  if (prevQ !== room.current_question_id) {
    if (answerText) answerText.value = "";
    setAnswerEnabled(false, "Tekan BUZZ dulu untuk menjawab.");
    clearBuzzState();
  }

  if (gameStatus) {
    gameStatus.textContent = `LIVE • Soal #${(room.question_index || 0) + 1}`;
  }

  const q = await fetchQuestion(room.current_question_id);
  if (qText) qText.textContent = q?.question_text || "—";

  await refreshLeaderboard();
  await loadAnswerFeed();
  await loadChatFeed();

  const active = await fetchActiveBuzz();

  if (!active) {
    resetBuzzVisual("Belum ada pemenang buzz.", "");
    if (buzzBtn) buzzBtn.disabled = false;
    if (buzzInfo) buzzInfo.textContent = "Buzz terbuka.";
    setAnswerEnabled(false, "Tekan BUZZ dulu untuk menjawab.");
  }

  setChatEnabled(true);
}

/* ===== LEADERBOARD ===== */
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
    if (lbStatus) lbStatus.textContent = "Leaderboard error: " + error.message;
    if (lbList) lbList.innerHTML = "";
    return;
  }

  const clean = (data || []).filter((p) => !p.kicked);

  if (lbStatus) lbStatus.textContent = `${clean.length} peserta`;

  if (lbList) {
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
        .join("") || `<div class="lb-item"><div class="muted">Belum ada peserta.</div></div>`;
  }
}

/* ===== ANSWER FEED ===== */
async function loadAnswerFeed() {
  if (!state.current_question_id) {
    if (feedStatus) feedStatus.textContent = "";
    if (feedList) feedList.innerHTML = "";
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
    if (feedList) feedList.innerHTML = "";
    return;
  }

  if (!data?.length) {
    if (feedStatus) feedStatus.textContent = "";
    if (feedList) {
      feedList.innerHTML = `
        <div class="ansItem">
          <span style="opacity:.75">Belum ada jawaban.</span>
        </div>
      `;
    }
    return;
  }

  if (feedStatus) feedStatus.textContent = `${data.length} jawaban`;

  if (feedList) {
    feedList.innerHTML = data
      .map((a) => {
        const verdict = a.verdict || "pending";
        const name = a.cc_players?.nickname || "Player";
        return `
          <div class="ansItem">
            <div class="meta">
              <span><b>${esc(name)}</b></span>
              <span class="verdict ${esc(verdict)}">${esc(verdict)}</span>
            </div>
            <div style="white-space:pre-wrap;">${esc(a.answer_text)}</div>
          </div>
        `;
      })
      .join("");
  }

  scrollFeedToBottom();
}

/* ===== CHAT FEED ===== */
async function loadChatFeed() {
  if (!state.room_id) {
    if (chatList) chatList.innerHTML = "";
    return;
  }

  const { data, error } = await supabase
    .from("cc_chats")
    .select("id, message, created_at, cc_players(nickname)")
    .eq("room_id", state.room_id)
    .order("created_at", { ascending: true })
    .limit(80);

  if (error) {
    if (chatList) {
      chatList.innerHTML = `
        <div class="ansItem">
          <span class="muted">Chat error: ${esc(error.message)}</span>
        </div>
      `;
    }
    return;
  }

  if (!data?.length) {
    if (chatList) {
      chatList.innerHTML = `
        <div class="ansItem">
          <span style="opacity:.75">Belum ada chat.</span>
        </div>
      `;
    }
    return;
  }

  if (chatList) {
    chatList.innerHTML = data
      .map((c) => {
        const name = esc(c.cc_players?.nickname || "Player");
        const msg = esc(c.message);
        const time = new Date(c.created_at).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });

        return `
          <div class="ansItem">
            <div class="meta">
              <b>${name}</b>
              <span style="opacity:.65;font-size:11px;">${time}</span>
            </div>
            <div style="white-space:pre-wrap;">${msg}</div>
          </div>
        `;
      })
      .join("");
  }

  scrollChatToBottom();
}

async function sendChat() {
  if (!state.room_id || !state.player_id) return;

  const text = (chatText?.value || "").trim();
  if (!text) return;

  if (sendChatBtn) sendChatBtn.disabled = true;

  const { error } = await supabase.from("cc_chats").insert({
    room_id: state.room_id,
    player_id: state.player_id,
    message: text,
  });

  if (sendChatBtn) sendChatBtn.disabled = false;

  if (error) {
    console.log("Chat insert error:", error.message);
    return;
  }

  if (chatText) chatText.value = "";
}

/* ===== GAME ACTIONS ===== */
async function buzz() {
  if (!state.room_id || !state.player_id || !state.current_question_id) return;

  await fetchActiveBuzz();

  if (activeBuzz) {
    if (activeBuzz.player_id === state.player_id) {
      if (buzzInfo) buzzInfo.textContent = "Kamu sudah menang buzz. Jawab sekarang.";
      setAnswerEnabled(true, "");
    } else {
      if (buzzInfo) buzzInfo.textContent = `${activeBuzz.nickname} sedang menjawab...`;
      setAnswerEnabled(false, `Menunggu ${activeBuzz.nickname} menjawab.`);
    }
    return;
  }

  if (buzzBtn) buzzBtn.disabled = true;
  if (buzzInfo) buzzInfo.textContent = "Mengirim buzz…";

  const expiresAt = new Date(Date.now() + 15000).toISOString();

  const { error } = await supabase.from("cc_buzzes").insert({
    room_id: state.room_id,
    question_id: state.current_question_id,
    player_id: state.player_id,
    is_winner: true,
    expires_at: expiresAt,
    released_at: null,
  });

  if (error) {
    if (String(error.message || "").includes("cc_buzzes_one_active_winner_per_question")) {
      await fetchActiveBuzz();

      if (activeBuzz) {
        if (buzzInfo) {
          buzzInfo.textContent =
            activeBuzz.player_id === state.player_id
              ? "Kamu sudah menang buzz. Jawab sekarang."
              : `${activeBuzz.nickname} sedang menjawab...`;
        }
      } else {
        if (buzzInfo) buzzInfo.textContent = "Buzz masih terkunci. Coba sebentar lagi.";
        if (buzzBtn) buzzBtn.disabled = false;
      }
      return;
    }

    if (buzzBtn) buzzBtn.disabled = false;
    if (buzzInfo) buzzInfo.textContent = "Gagal buzz. Coba lagi.";
    console.log("buzz insert error:", error.message);
    return;
  }

  play(sBuzz);
  await fetchActiveBuzz();

  if (activeBuzz?.player_id === state.player_id) {
    setAnswerEnabled(true, "");
    if (answerText) answerText.focus();
  } else {
    setAnswerEnabled(false, "Menunggu pemenang buzz menjawab.");
  }
}

async function sendAnswer() {
  if (!canAnswer) {
    if (answerStatus) {
      answerStatus.textContent = "Kamu harus menang BUZZ dulu untuk menjawab.";
    }
    return;
  }

  const text = (answerText?.value || "").trim();
  if (!text) {
    if (answerStatus) answerStatus.textContent = "Jawaban tidak boleh kosong.";
    return;
  }

  if (sendAnswerBtn) sendAnswerBtn.disabled = true;
  if (answerStatus) answerStatus.textContent = "Mengirim jawaban…";

  const { error } = await supabase.from("cc_answers").insert({
    room_id: state.room_id,
    question_id: state.current_question_id,
    player_id: state.player_id,
    answer_text: text,
  });

  if (error) {
    if (sendAnswerBtn) sendAnswerBtn.disabled = false;
    if (answerStatus) answerStatus.textContent = "Gagal kirim: " + error.message;
    return;
  }

 if (answerText) answerText.value = "";
setAnswerEnabled(false, "Jawaban terkirim. Menunggu verifikasi admin…");

// buzz tetap dikunci sampai admin kasih verdict
resetBuzzVisual(
  `Pemenang buzz: ${state.nickname || "Player"}`,
  "Menunggu ACC admin..."
);

if (buzzBtn) buzzBtn.disabled = true;
if (buzzInfo) buzzInfo.textContent = "Menunggu keputusan admin...";

await loadAnswerFeed();

/* ===== REALTIME ===== */
function unsubscribe() {
  if (roomCh) supabase.removeChannel(roomCh);
  if (ansCh) supabase.removeChannel(ansCh);
  if (playersCh) supabase.removeChannel(playersCh);
  if (chatCh) supabase.removeChannel(chatCh);
  if (buzzCh) supabase.removeChannel(buzzCh);

  roomCh = null;
  ansCh = null;
  playersCh = null;
  chatCh = null;
  buzzCh = null;

  clearBuzzCountdown();
}

function subscribeRealtime() {
  unsubscribe();

  roomCh = supabase
    .channel(`cc-room-${state.room_id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cc_rooms",
        filter: `id=eq.${state.room_id}`,
      },
      async (payload) => {
        if (payload?.new) {
          await syncRoomUI(payload.new);
        }
      }
    )
    .subscribe();

  ansCh = supabase
    .channel(`cc-ans-${state.room_id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cc_answers",
        filter: `room_id=eq.${state.room_id}`,
      },
      async (payload) => {
        const a = payload.new;
        if (!a) return;
        if (a.question_id !== state.current_question_id) return;

        if (a.player_id === state.player_id) {
          if (a.verdict === "correct") {
            if (answerStatus) answerStatus.textContent = "✅ Benar!";
            play(sCorrect);
            await releaseActiveBuzz("correct");
          } else if (a.verdict === "wrong") {
            if (answerStatus) answerStatus.textContent = "❌ Salah!";
            play(sWrong);
            await releaseActiveBuzz("wrong");
          }
        }

        await loadAnswerFeed();
        await fetchActiveBuzz();

        if (!activeBuzz && lastRoomStatus === "live") {
          if (buzzBtn) buzzBtn.disabled = false;
          if (buzzInfo) buzzInfo.textContent = "Buzz terbuka.";
        }
      }
    )
    .subscribe();

  playersCh = supabase
    .channel(`cc-players-${state.room_id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cc_players",
        filter: `room_id=eq.${state.room_id}`,
      },
      async () => {
        await refreshLeaderboard();
      }
    )
    .subscribe();

  chatCh = supabase
    .channel(`cc-chat-${state.room_id}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "cc_chats",
        filter: `room_id=eq.${state.room_id}`,
      },
      async () => {
        await loadChatFeed();
      }
    )
    .subscribe();

  buzzCh = supabase
    .channel(`cc-buzz-${state.room_id}`)
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "cc_buzzes",
        filter: `room_id=eq.${state.room_id}`,
      },
      async (payload) => {
        const b = payload.new || payload.old;
        if (!b) return;
        if (b.question_id !== state.current_question_id) return;

        await fetchActiveBuzz();

        if (activeBuzz?.player_id === state.player_id) {
          setAnswerEnabled(true, "");
          if (answerText) answerText.focus();
        } else if (activeBuzz) {
          setAnswerEnabled(false, "Menunggu pemenang buzz menjawab.");
        } else {
          setAnswerEnabled(false, "Tekan BUZZ dulu untuk menjawab.");
          if (lastRoomStatus === "live") {
            if (buzzBtn) buzzBtn.disabled = false;
            if (buzzInfo) buzzInfo.textContent = "Buzz terbuka.";
          }
        }
      }
    )
    .subscribe();
}

/* ===== FINAL OVERLAY ===== */
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

  if (finalSub) {
    finalSub.textContent = winner
      ? `Pemenang: ${winner.nickname} (${winner.points} poin)`
      : "Belum ada data peserta.";
  }

  if (finalList) {
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
  }

  if (endOverlay) endOverlay.style.display = "flex";
  play(sWinner);
}

/* ===== EVENTS ===== */
closeOverlay?.addEventListener("click", () => {
  if (endOverlay) endOverlay.style.display = "none";
});

joinBtn?.addEventListener("click", async () => {
  if (joinStatus) joinStatus.textContent = "Joining…";

  try {
    const code = (roomCodeEl?.value || "").trim().toUpperCase();
    const nick = (nickEl?.value || "").trim();

    if (!code || !nick) {
      if (joinStatus) joinStatus.textContent = "Kode room & nickname wajib.";
      return;
    }

    await joinRoom(code, nick);
  } catch (e) {
    if (joinStatus) joinStatus.textContent = e?.message || "Gagal join.";
  }
});

buzzBtn?.addEventListener("click", buzz);
sendAnswerBtn?.addEventListener("click", sendAnswer);
sendChatBtn?.addEventListener("click", sendChat);

answerText?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendAnswer();
  }
});

chatText?.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
});

leaveBtn?.addEventListener("click", () => {
  unsubscribe();
  clearState();
  clearBuzzState();
  showJoin("");
});

/* ===== BOOT ===== */
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
      await loadAnswerFeed();
      await loadChatFeed();
      await fetchActiveBuzz();
    } catch (err) {
      console.log("boot error:", err);
      clearState();
      showJoin("Session join invalid. Join ulang ya.");
    }
  } else {
    showJoin("");
  }
})();
