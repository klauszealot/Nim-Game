"use strict";

const EASY_MAX_DEPTH = 4;  // Depth limit for Easy mode minimax
const HUMAN = "human";
const AI = "ai";

function getMaxTake(sticks) {
  return sticks > 30 ? 6 : 3;
}

const state = {
  screen: "landing",
  mode: "pve",
  difficulty: "normal",
  initCount: 12,
  volume: 65,
  piles: [12],
  turn: 0,
  moves: 0,
  running: false,
  paused: false,
  aiTimeoutId: null,
  lastBenchmark: null,
  previousSessionBenchmark: null,
  players: [
    { name: "PLAYER 1", type: HUMAN },
    { name: "AI 2", type: AI }
  ]
};

const $ = (id) => document.getElementById(id);
const modeLabel = { pve: "Player vs COM", pvp: "Player vs Player", aivai: "COM vs COM" };
const difficultyLabel = { easy: "EASY", normal: "NORMAL", hard: "HARD" };

const playlist = [
  { label: "Gorillaz - Tranz (8-bit)", src: "Music/Gorillaz - Tranz (8-bit).mp3" },
  { label: "Gorillaz - Feel Good Inc. (8-bit)", src: "Music/Gorillaz - Feel Good Inc. (8-bit).mp3" },
  { label: "Gorillaz - Clint Eastwood (8-bit)", src: "Music/Gorillaz - Clint Eastwood (8-bit).mp3" },
  { label: "Blur - Song 2 (8-bit)", src: "Music/Blur - Song 2 (8-bit).mp3" },
  { label: "Blur - Coffee & TV (8-bit)", src: "Music/Blur - Coffee & TV (8-bit).mp3" },
  { label: "Blur - Beetlebum (8-bit)", src: "Music/Blur - Beetlebum (8-bit).mp3" }
];

let currentSongIndex = 0;
let userSelectedSong = false;
const PREV_BENCHMARK_STORAGE_KEY = "nim_prev_benchmark";

function currentAiFamily() {
  return state.difficulty === "hard" ? "alphabeta" : "minimax";
}

function setSong(index, { autoplay } = { autoplay: true }) {
  const bgm = $("bgm");
  const select = $("song-select");
  if (!bgm) return;
  const safeIndex = Math.max(0, Math.min(playlist.length - 1, index));
  currentSongIndex = safeIndex;
  if (select) select.value = String(safeIndex);
  bgm.src = playlist[safeIndex].src;
  bgm.currentTime = 0;
  if (autoplay) bgm.play().catch(() => {});
}

function playRandomNext() {
  if (playlist.length <= 1) return;
  let next = currentSongIndex;
  while (next === currentSongIndex) next = Math.floor(Math.random() * playlist.length);
  setSong(next, { autoplay: true });
}

function hydrateSongSelect() {
  const select = $("song-select");
  if (!select) return;
  select.innerHTML = "";
  playlist.forEach((s, idx) => {
    const opt = document.createElement("option");
    opt.value = String(idx);
    opt.textContent = s.label;
    select.appendChild(opt);
  });
  select.value = String(currentSongIndex);
}

function syncVolumeUI() {
  const text = `${state.volume}%`;
  $("header-volume-label").textContent = text;
  $("header-volume-slider").value = String(state.volume);
  $("telemetry-volume").textContent = text;
  const bgm = $("bgm");
  if (bgm) bgm.volume = state.volume / 100;
}

function showScreen(id) {
  document.querySelectorAll(".screen").forEach((s) => s.classList.add("hidden"));
  $(id).classList.remove("hidden");
  state.screen = id;
}

// AI is now handled in python via IPC

function updateBenchmarkView() {}

function noMoves(piles) {
  return piles.every((p) => p <= 0);
}

function addLog(text, tone) {
  const row = document.createElement("div");
  row.textContent = `> ${text}`;
  row.className = "leading-5";
  row.style.color = tone === "secondary" ? "#ffb783" : tone === "primary" ? "#8aebff" : "#bbc9cd";
  $("action-log").appendChild(row);
  $("action-log").scrollTop = $("action-log").scrollHeight;
}

function updateModeCards() {
  document.querySelectorAll("[data-mode]").forEach((el) => {
    el.classList.toggle("mode-active", el.dataset.mode === state.mode);
  });
}

function updateDifficultyButtons() {
  document.querySelectorAll("[data-difficulty]").forEach((el) => {
    el.classList.toggle("seg-active", el.dataset.difficulty === state.difficulty);
  });
  $("difficulty-label").textContent = difficultyLabel[state.difficulty];
}

function refreshTelemetry() {
  $("telemetry-mode").textContent = modeLabel[state.mode];
  $("telemetry-ai").textContent = difficultyLabel[state.difficulty];
  $("telemetry-init").textContent = String(state.initCount);
  $("telemetry-volume").textContent = `${state.volume}%`;
}

function renderPreviousBenchmark() {}

function savePreviousBenchmark() {
  if (!state.previousSessionBenchmark) return;
  try {
    localStorage.setItem(PREV_BENCHMARK_STORAGE_KEY, JSON.stringify(state.previousSessionBenchmark));
  } catch (_) {
    // ignore storage errors
  }
}

function loadPreviousBenchmark() {
  try {
    const raw = localStorage.getItem(PREV_BENCHMARK_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (parsed && parsed.minimax && parsed.alphaBeta) {
      state.previousSessionBenchmark = parsed;
    }
  } catch (_) {
    // ignore parse/storage errors
  }
}

function setupPlayersByMode() {
  let p1Name = $("p1-input").value.trim().toUpperCase();
  let p2Name = $("p2-input").value.trim().toUpperCase();

  let aiNamePvE = "";
  let aiNamePvP1 = "";
  let aiNamePvP2 = "";

  if (state.difficulty === "easy") {
    aiNamePvE = "MINIMAX";
    aiNamePvP1 = "MINIMAX A";
    aiNamePvP2 = "MINIMAX B";
  } else if (state.difficulty === "normal") {
    aiNamePvE = "MINIMAX SUPER";
    aiNamePvP1 = "MINIMAX SUPER A";
    aiNamePvP2 = "MINIMAX SUPER B";
  } else {
    aiNamePvE = "MINIMAX + ALPHA BETA";
    aiNamePvP1 = "MINIMAX + ALPHA BETA A";
    aiNamePvP2 = "MINIMAX + ALPHA BETA B";
  }

  if (state.mode === "pvp") {
    state.players = [
      { name: p1Name || "PLAYER 1", type: HUMAN },
      { name: p2Name || "PLAYER 2", type: HUMAN }
    ];
  } else if (state.mode === "aivai") {
    state.players = [
      { name: aiNamePvP1, type: AI },
      { name: aiNamePvP2, type: AI }
    ];
  } else {
    state.players = [
      { name: p1Name || "PLAYER", type: HUMAN },
      { name: aiNamePvE, type: AI }
    ];
  }
}

function validateConfig() {
  $("btn-initialize").disabled = false;
  $("btn-initialize").classList.remove("opacity-50", "cursor-not-allowed");
}

function updateConfigVisibility() {
  const isPve = state.mode === "pve";
  const isAivai = state.mode === "aivai";
  
  let aiNamePvE = "";
  let aiNamePvP1 = "";
  if (state.difficulty === "easy") {
    aiNamePvE = "MINIMAX";
    aiNamePvP1 = "MINIMAX A";
  } else if (state.difficulty === "normal") {
    aiNamePvE = "MINIMAX SUPER";
    aiNamePvP1 = "MINIMAX SUPER A";
  } else {
    aiNamePvE = "MINIMAX + ALPHA BETA";
    aiNamePvP1 = "MINIMAX + ALPHA BETA A";
  }
  
  $("p2-wrap").style.display = isPve || isAivai ? "none" : "block";
  $("p1-input").parentElement.style.display = isAivai ? "none" : "block";
  $("p1-input").value = isAivai ? aiNamePvP1 : $("p1-input").value;
  $("p2-input").value = isPve ? aiNamePvE : $("p2-input").value;
  validateConfig();
}

let selectedPileIndex = 0;

function totalCells(piles) {
  return piles.reduce((a, b) => a + Math.max(0, b), 0);
}

function renderGame() {
  $("cells-left").textContent = String(totalCells(state.piles));
  $("hud-p1").textContent = state.players[0].name;
  $("hud-p2").textContent = state.players[1].name;
  $("hud-mode").textContent = modeLabel[state.mode];
  $("hud-moves").textContent = String(state.moves);

  const currentPlayer = state.players[state.turn];
  $("current-turn").textContent = `TURN: ${currentPlayer.name}`;
  $("current-turn").style.color = state.turn === 0 ? "#8aebff" : "#ffb783";

  $("game-subtitle").textContent = "Take cells based on remaining limit. Taking the final cell loses.";

  const area = $("piles-area");
  area.innerHTML = "";

  const grid = document.createElement("div");
  grid.className = "cells-grid";
  for (let i = 0; i < state.piles[0]; i += 1) {
    const cell = document.createElement("div");
    cell.className = `energy-cell ${state.turn === 0 ? "" : "energy-cell--p2"}`;
    const core = document.createElement("div");
    core.className = "energy-core";
    cell.appendChild(core);
    grid.appendChild(cell);
  }
  area.appendChild(grid);
  selectedPileIndex = 0;
}

function renderMoveButtons(disabled) {
  const wrap = $("move-buttons");
  wrap.innerHTML = "";
  const pile = state.piles[0] ?? 0;
  const maxMove = Math.min(getMaxTake(pile), pile);
  for (let i = 1; i <= maxMove; i += 1) {
    const btn = document.createElement("button");
    btn.className = "move-btn";
    btn.disabled = disabled;
    btn.textContent = `TAKE ${i}`;
    btn.addEventListener("click", () => doMove({ pileIndex: 0, take: i }));
    wrap.appendChild(btn);
  }
}

async function finishGame(loserIndex) {
  const winnerIndex = 1 - loserIndex;
  // If there's an ongoing AI timeout, clear it.
  if (state.aiTimeoutId) {
    clearTimeout(state.aiTimeoutId);
    state.aiTimeoutId = null;
  }
  state.running = false;
  state.paused = false;
  $("btn-pause").textContent = "PAUSE";
  $("r-init").textContent = String(state.initCount);
  $("r-moves").textContent = String(state.moves);
  $("result-title").textContent = `${state.players[winnerIndex].name} WINS`;
  $("result-sub").textContent = `${state.players[loserIndex].name} took the final cell and loses.`;

  let benchmarkForHistory = state.lastBenchmark;
  if (!benchmarkForHistory) {
      try {
          const res = await window.electronAPI.getAiMove(Math.max(1, state.initCount), "normal");
          benchmarkForHistory = res.comparison;
      } catch (err) {
          console.error(err);
          // Dummy fallback if AI call fails
          benchmarkForHistory = {
            minimax: { elapsedMs: 0, nodes: 0, maxDepth: 0 },
            alphaBeta: { elapsedMs: 0, nodes: 0, maxDepth: 0 }
          };
      }
  }

  state.previousSessionBenchmark = benchmarkForHistory;
  const bm = benchmarkForHistory;
  $("r-mm-time").textContent = `${bm.minimax.elapsedMs.toFixed(3)} ms`;
  $("r-mm-nodes").textContent = String(bm.minimax.nodes);
  $("r-mm-depth").textContent = String(bm.minimax.maxDepth);
  $("r-ab-time").textContent = `${bm.alphaBeta.elapsedMs.toFixed(3)} ms`;
  $("r-ab-nodes").textContent = String(bm.alphaBeta.nodes);
  $("r-ab-depth").textContent = String(bm.alphaBeta.maxDepth);
  
  savePreviousBenchmark();
  $("modal-result").classList.remove("hidden");
  $("modal-result").classList.add("flex");
  renderPreviousBenchmark();
}

function openPauseModal() {
  $("pause-cells").textContent = String(totalCells(state.piles));
  $("pause-moves").textContent = String(state.moves);
  $("pause-mode").textContent = modeLabel[state.mode];
  $("pause-turn").textContent = state.players[state.turn].name;
  $("modal-pause").classList.remove("hidden");
  $("modal-pause").classList.add("flex");
}

function closePauseModal() {
  $("modal-pause").classList.add("hidden");
  $("modal-pause").classList.remove("flex");
}

function animateTake(pileIndex, take) {
  const area = $("piles-area");
  if (!area) return Promise.resolve();
  const taken = [];
  const cells = area.querySelectorAll(".energy-cell");
  for (let i = cells.length - 1; i >= 0 && taken.length < take; i -= 1) taken.push(cells[i]);
  taken.forEach((el) => el.classList.add("energy-cell--taken"));
  return new Promise((resolve) => setTimeout(resolve, 280));
}

async function doMove(move) {
  if (!state.running || state.paused) return;
  const pileIndex = typeof move === "number" ? 0 : move.pileIndex;
  const take = typeof move === "number" ? move : move.take;
  const pile = state.piles[pileIndex] ?? 0;
  if (typeof take !== "number" || Number.isNaN(take) || take < 1 || take > Math.min(getMaxTake(pile), pile)) return;
  const player = state.players[state.turn];
  await animateTake(pileIndex, take);
  state.piles[pileIndex] = Math.max(0, pile - take);
  state.moves += 1;
  addLog(`${player.name} takes ${take} cell${take > 1 ? "s" : ""}.`, state.turn === 0 ? "primary" : "secondary");

  if (noMoves(state.piles)) {
    finishGame(state.turn);
    return;
  }

  state.turn = 1 - state.turn;
  renderGame();
  nextTurn();
}

function nextTurn() {
  if (!state.running || state.paused) return;
  if (noMoves(state.piles)) {
    finishGame(1 - state.turn);
    return;
  }
  const current = state.players[state.turn];
  const isAiTurn = current.type === AI;
  renderMoveButtons(isAiTurn);
  if (isAiTurn) {
    state.aiTimeoutId = setTimeout(async () => {
      if (!state.running) return;
      try {
        const result = await window.electronAPI.getAiMove(state.piles[0], state.difficulty);
        if (!state.running) return;
        state.lastBenchmark = result.comparison;
        updateBenchmarkView();
        doMove({ pileIndex: 0, take: result.bestMove });
      } catch (err) {
        console.error(err);
        addLog("AI Error, fallback move.", "secondary");
        doMove({ pileIndex: 0, take: 1 });
      }
      state.aiTimeoutId = null;
    }, 550);
  }
}

function startGameFromConfig() {

  setupPlayersByMode();
  const p1Name = $("p1-input").value.trim().toUpperCase();
  const p2Name = $("p2-input").value.trim().toUpperCase();
  if (state.mode === "pvp") {
    if (p1Name) state.players[0].name = p1Name;
    if (p2Name) state.players[1].name = p2Name;
  } else if (state.mode === "pve") {
    if (p1Name) state.players[0].name = p1Name;
  }

  state.piles = [state.initCount];
  state.turn = 0;
  state.moves = 0;
  state.running = true;
  state.paused = false;
  if (state.aiTimeoutId) {
    clearTimeout(state.aiTimeoutId);
    state.aiTimeoutId = null;
  }
  $("btn-pause").textContent = "PAUSE";
  state.lastBenchmark = null;
  $("action-log").innerHTML = "";
  addLog(`Session initialized in ${modeLabel[state.mode]}.`, "primary");
  addLog(`Initial cells: ${state.initCount}.`, "primary");
  showScreen("screen-game");
  renderGame();
  updateBenchmarkView();
  nextTurn();
}

function togglePause() {
  if (!state.running) return;
  state.paused = !state.paused;
  $("btn-pause").textContent = state.paused ? "RESUME" : "PAUSE";
  addLog(state.paused ? "Game paused." : "Game resumed.", "neutral");
  if (state.paused && state.aiTimeoutId) {
    clearTimeout(state.aiTimeoutId);
    state.aiTimeoutId = null;
  }
  if (state.paused) openPauseModal();
  else {
    closePauseModal();
    nextTurn();
  }
}

function returnToHomeFromPause() {
  state.running = false;
  state.paused = false;
  if (state.aiTimeoutId) {
    clearTimeout(state.aiTimeoutId);
    state.aiTimeoutId = null;
  }
  $("btn-pause").textContent = "PAUSE";
  closePauseModal();
  showScreen("screen-landing");
}



function bindEvents() {
  $("btn-start").addEventListener("click", () => showScreen("screen-settings"));
  $("btn-go-config").addEventListener("click", () => {
    renderPreviousBenchmark();
    refreshTelemetry();
    updateConfigVisibility();
    showScreen("screen-config");
  });
  $("btn-back-settings").addEventListener("click", () => showScreen("screen-settings"));
  $("btn-home").addEventListener("click", () => {
    $("modal-result").classList.add("hidden");
    $("modal-result").classList.remove("flex");
    showScreen("screen-landing");
    renderPreviousBenchmark();
  });
  $("btn-restart").addEventListener("click", () => {
    $("modal-result").classList.add("hidden");
    $("modal-result").classList.remove("flex");
    startGameFromConfig();
  });
  $("btn-initialize").addEventListener("click", startGameFromConfig);
  $("btn-pause").addEventListener("click", togglePause);
  $("btn-resume-modal").addEventListener("click", togglePause);
  $("btn-home-modal").addEventListener("click", returnToHomeFromPause);

  document.querySelectorAll("[data-mode]").forEach((el) => {
    el.addEventListener("click", () => {
      state.mode = el.dataset.mode;
      updateModeCards();
      setupPlayersByMode();
      updateConfigVisibility();
      refreshTelemetry();
    });
  });

  document.querySelectorAll("[data-difficulty]").forEach((el) => {
    el.addEventListener("click", () => {
      state.difficulty = el.dataset.difficulty;
      updateDifficultyButtons();
      setupPlayersByMode();
      updateConfigVisibility();
      refreshTelemetry();
    });
  });

  $("initial-count").addEventListener("input", (ev) => {
    state.initCount = Number(ev.target.value);
    $("initial-count-label").textContent = String(state.initCount);
    refreshTelemetry();
  });

  $("header-volume-slider").addEventListener("input", (ev) => {
    state.volume = Number(ev.target.value);
    syncVolumeUI();
    refreshTelemetry();
  });

  const select = $("song-select");
  if (select) {
    select.addEventListener("change", (ev) => {
      const idx = Number(ev.target.value);
      userSelectedSong = true;
      setSong(idx, { autoplay: true });
    });
  }

  $("p1-input").addEventListener("input", validateConfig);
  $("p2-input").addEventListener("input", validateConfig);
}

function init() {
  bindEvents();
  hydrateSongSelect();
  loadPreviousBenchmark();
  updateModeCards();
  updateDifficultyButtons();
  refreshTelemetry();
  renderPreviousBenchmark();
  updateConfigVisibility();
  const bgm = $("bgm");
  if (bgm) {
    syncVolumeUI();
    bgm.addEventListener("ended", () => {
      if (userSelectedSong) {
        userSelectedSong = false;
      }
      playRandomNext();
    });
    bgm.play().catch(() => {
      const unlockAudio = () => {
        bgm.play().catch(() => {});
        document.removeEventListener("click", unlockAudio);
      };
      document.addEventListener("click", unlockAudio);
    });
  }
  showScreen("screen-landing");
}

init();