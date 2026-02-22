<!doctype html>
<html lang="id">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Games • New Resident Yogyakarta</title>

<link rel="stylesheet" href="styles.css" />

<style>
html, body{ height:100%; }
body{ margin:0; overflow:hidden; }

.ccWrap{ height:100vh; display:flex; flex-direction:column; }
.ccMain{
  flex:1;
  display:flex;
  gap:18px;
  padding:18px;
  min-height:0;
}

/* LEFT = LEADERBOARD (scroll only here) */
.ccLeft{
  width:320px;
  max-width:35vw;
  min-width:240px;
  display:flex;
  flex-direction:column;
  min-height:0;
}
.ccLbCard{
  flex:1;
  display:flex;
  flex-direction:column;
  min-height:0;
  border-radius:22px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(12,10,24,.55);
  padding:16px;
}
#lbList{ margin-top:12px; overflow:auto; min-height:0; }
.lb-item{
  display:flex; justify-content:space-between; align-items:center;
  padding:12px; border-radius:14px;
  border:1px solid rgba(255,255,255,.08);
  background:rgba(255,255,255,.05);
  margin-bottom:8px;
}

.ccCenter{ flex:1; display:flex; flex-direction:column; gap:14px; min-height:0; }

/* QUESTION BOX */
.ccQuestion{
  flex:1;
  display:flex;
  flex-direction:column;
  min-height:0;
  border-radius:22px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.06);
  overflow:hidden;
}

.ccTopRow{
  display:flex;
  justify-content:space-between;
  align-items:flex-start;
  gap:12px;
  padding:14px 16px 0;
}

.ccRoomInfo{
  display:flex;
  flex-direction:column;
  gap:6px;
}
.ccRoomInfo b{ font-size:14px; }
.ccRoomInfo .muted{ color:rgba(255,255,255,.65); font-size:13px; }

.ccQHeader{
  padding:10px 18px 8px;
  text-align:center;
  font-weight:900;
  letter-spacing:.15em;
  font-size:12px;
  color:rgba(255,255,255,.65);
  text-transform:uppercase;
}
.ccQText{
  flex:1;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:0 22px 18px;
  text-align:center;
  font-size:clamp(18px, 2.5vw, 32px);
  line-height:1.35;
  white-space:pre-wrap;
}

.ccBuzzBar{
  padding:16px;
  display:flex;
  justify-content:center;
  border-top:1px solid rgba(255,255,255,.10);
}

.ccAnswerBox{
  padding:16px;
  border-top:1px solid rgba(255,255,255,.10);
}
.ccAnswerBox textarea{
  width:100%;
  min-height:110px;
  border-radius:16px;
  padding:12px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.06);
  color:#fff;
  resize:vertical;
}

/* TABS */
.ccTabsCard{
  height:260px;
  max-height:35vh;
  min-height:200px;
  display:flex;
  flex-direction:column;
  border-radius:22px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(12,10,24,.55);
  padding:14px;
  min-height:0;
}

.ccTabs{ display:flex; gap:10px; }
.ccTab{
  flex:1;
  padding:10px;
  border-radius:14px;
  border:1px solid rgba(255,255,255,.12);
  background:rgba(255,255,255,.06);
  color:#fff;
  font-weight:800;
  cursor:pointer;
}
.ccTab.active{
  background:linear-gradient(180deg,#f2a3c7,#d98ab7);
  color:#0b0a12;
}

.ccTabBody{ flex:1; overflow:hidden; margin-top:12px; min-height:0; }
#feedList{ overflow:auto; min-height:0; }

.muted{ font-size:13px; color:rgba(255,255,255,.65); }

/* OVERLAY */
.overlay{
  position:fixed; inset:0;
  display:none;
  align-items:center; justify-content:center;
  background:rgba(0,0,0,.75);
  backdrop-filter:blur(10px);
  z-index:9999;
}
.overlayBox{
  width:100%; max-width:700px;
  border-radius:26px;
  border:1px solid rgba(255,255,255,.18);
  background:rgba(12,10,24,.95);
  padding:18px;
}
.iconBtn{
  width:40px; height:40px;
  border-radius:12px;
  border:1px solid rgba(255,255,255,.14);
  background:rgba(255,255,255,.06);
  color:#fff;
  cursor:pointer;
}

@media (max-width:900px){
  body{ overflow:auto; }
  .ccMain{ flex-direction:column; overflow:auto; }
  .ccLeft{ width:100%; max-width:none; }
}
</style>
</head>

<body>

<header class="header">
  <div class="headerInner">
    <div class="brand">
      <b>New Resident</b>
      <small>Yogyakarta</small>
    </div>
    <nav class="nav">
      <a href="index.html">Beranda</a>
      <a href="confession.html">Confession</a>
      <a href="event.html">Event</a>
      <a class="active" href="games.html">Games</a>
    </nav>
  </div>
</header>

<div class="ccWrap">

  <!-- JOIN CARD (wajib ada: joinCard, roomCode, nickname, joinBtn, joinStatus) -->
  <section class="ccMain" id="joinCard">
    <div style="margin:auto; width:min(520px, 92vw);">
      <div class="card" style="padding:16px;">
        <h2 style="margin:0 0 10px;">Cerdas Cermat (Live)</h2>
        <div class="muted" style="margin-bottom:12px;">Masukkan kode room dari admin dan nickname kamu.</div>

        <div class="row" style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
          <div>
            <label>Kode Room</label>
            <input id="roomCode" placeholder="Contoh: ABC123" />
          </div>
          <div>
            <label>Nickname</label>
            <input id="nickname" placeholder="nama kamu" />
          </div>
        </div>

        <div style="margin-top:12px; display:flex; gap:12px; align-items:center;">
          <button class="btn primary" id="joinBtn">Join</button>
          <div class="muted" id="joinStatus"></div>
        </div>
      </div>
    </div>
  </section>

  <!-- GAME CARD (wajib ada: gameCard + semua id yang dipakai games.js) -->
  <div class="ccMain" id="gameCard" style="display:none;">

    <!-- LEFT -->
    <div class="ccLeft">
      <div class="ccLbCard">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>
            <b>Players</b>
            <div class="muted" id="lbStatus">—</div>
          </div>
          <div class="muted" id="meTag">—</div>
        </div>
        <div id="lbList"></div>
      </div>
    </div>

    <!-- CENTER -->
    <div class="ccCenter">

      <div class="ccQuestion">

        <!-- ✅ wajib: roomLabel, gameStatus, leaveBtn -->
        <div class="ccTopRow">
          <div class="ccRoomInfo">
            <b>Room: <span id="roomLabel">-</span></b>
            <div class="muted" id="gameStatus">—</div>
          </div>
          <button class="btn secondary" id="leaveBtn" type="button">Keluar</button>
        </div>

        <div class="ccQHeader">PERTANYAAN</div>
        <div class="ccQText" id="qText">—</div>

        <div class="ccBuzzBar">
          <button class="btn primary" id="buzzBtn" style="min-width:140px;" type="button">BUZZ</button>
        </div>

        <div class="muted" id="buzzInfo" style="text-align:center; padding:0 16px 10px;"></div>

        <div id="answerBox" class="ccAnswerBox" style="display:none;">
          <div class="muted" style="margin-bottom:8px;">Jawab sekarang:</div>
          <textarea id="answerText" placeholder="Tulis jawaban..."></textarea>
          <div style="margin-top:10px; display:flex; gap:12px; align-items:center; flex-wrap:wrap;">
            <button class="btn primary" id="sendAnswerBtn" type="button">Kirim Jawaban</button>
            <div class="muted" id="answerStatus"></div>
          </div>
        </div>

      </div>

      <div class="ccTabsCard">
        <div class="ccTabs">
          <button class="ccTab active" data-tab="answers" type="button">JAWABAN</button>
          <button class="ccTab" data-tab="chat" type="button">OBROLAN</button>
        </div>

        <div class="ccTabBody">
          <div id="paneAnswers">
            <div class="muted" id="feedStatus"></div>
            <div id="feedList"></div>
          </div>

          <div id="paneChat" style="display:none;">
            <div class="muted">Chat coming soon…</div>
          </div>
        </div>
      </div>

    </div>
  </div>
</div>

<!-- FINAL OVERLAY (wajib: endOverlay, closeOverlay, finalSub, finalList) -->
<div class="overlay" id="endOverlay">
  <div class="overlayBox">
    <div style="display:flex;justify-content:space-between;align-items:center;">
      <div>
        <h2 style="margin:0;color:var(--pink);">🏆 Leaderboard Akhir</h2>
        <div class="muted" id="finalSub"></div>
      </div>
      <button class="iconBtn" id="closeOverlay" type="button">✕</button>
    </div>
    <div id="finalList" style="margin-top:14px;"></div>
  </div>
</div>

<script type="module" src="games.js"></script>

<script>
  // Tabs UI only
  const tabs=document.querySelectorAll(".ccTab");
  const paneAnswers=document.getElementById("paneAnswers");
  const paneChat=document.getElementById("paneChat");

  tabs.forEach(t=>{
    t.addEventListener("click",()=>{
      tabs.forEach(x=>x.classList.remove("active"));
      t.classList.add("active");
      const tab=t.getAttribute("data-tab");
      paneAnswers.style.display=(tab==="answers")?"block":"none";
      paneChat.style.display=(tab==="chat")?"block":"none";
    });
  });
</script>

</body>
</html>
