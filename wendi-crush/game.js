(() => {
  const SIZE = 8;
  const TARGET = 800;
  const START_MOVES = 20;

  const PIECES = [
    { id: "cat", emoji: "🐱", cls: "tile--cat" },
    { id: "tiger", emoji: "🐯", cls: "tile--tiger" },
    { id: "monkey", emoji: "🐵", cls: "tile--monkey" },
    { id: "sponge", emoji: "🧽", cls: "tile--sponge" },
    { id: "heart", emoji: "💖", cls: "tile--heart" },
  ];

  const els = {
    title: document.getElementById("screen-title"),
    game: document.getElementById("screen-game"),
    board: document.getElementById("board"),
    score: document.getElementById("score"),
    target: document.getElementById("target"),
    moves: document.getElementById("moves"),
    tip: document.getElementById("tip"),
    overlay: document.getElementById("overlay"),
    overlayEyebrow: document.getElementById("overlay-eyebrow"),
    overlayTitle: document.getElementById("overlay-title"),
    overlayText: document.getElementById("overlay-text"),
    btnStart: document.getElementById("btn-start"),
    btnMenu: document.getElementById("btn-menu"),
    btnAgain: document.getElementById("btn-again"),
    btnHome: document.getElementById("btn-home"),
  };

  let grid = [];
  let selected = null;
  let score = 0;
  let moves = START_MOVES;
  let busy = false;
  let ended = false;

  els.target.textContent = String(TARGET);

  function randPiece() {
    return PIECES[Math.floor(Math.random() * PIECES.length)].id;
  }

  function pieceMeta(id) {
    return PIECES.find((p) => p.id === id);
  }

  function createGridWithoutMatches() {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(null));
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        let id;
        do {
          id = randPiece();
        } while (
          (c >= 2 && g[r][c - 1] === id && g[r][c - 2] === id) ||
          (r >= 2 && g[r - 1][c] === id && g[r - 2][c] === id)
        );
        g[r][c] = id;
      }
    }
    return g;
  }

  function findMatches(g = grid) {
    const matched = new Set();

    for (let r = 0; r < SIZE; r++) {
      let run = 1;
      for (let c = 1; c <= SIZE; c++) {
        const same = c < SIZE && g[r][c] && g[r][c] === g[r][c - 1];
        if (same) {
          run++;
        } else {
          if (run >= 3) {
            for (let k = 0; k < run; k++) matched.add(`${r},${c - 1 - k}`);
          }
          run = 1;
        }
      }
    }

    for (let c = 0; c < SIZE; c++) {
      let run = 1;
      for (let r = 1; r <= SIZE; r++) {
        const same = r < SIZE && g[r][c] && g[r][c] === g[r - 1][c];
        if (same) {
          run++;
        } else {
          if (run >= 3) {
            for (let k = 0; k < run; k++) matched.add(`${r - 1 - k},${c}`);
          }
          run = 1;
        }
      }
    }

    return matched;
  }

  function areAdjacent(a, b) {
    return Math.abs(a.r - b.r) + Math.abs(a.c - b.c) === 1;
  }

  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  function updateHud() {
    els.score.textContent = String(score);
    els.moves.textContent = String(moves);
  }

  function renderBoard({ animateNew = false } = {}) {
    els.board.innerHTML = "";
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const id = grid[r][c];
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "tile";
        btn.dataset.r = String(r);
        btn.dataset.c = String(c);

        if (!id) {
          btn.style.visibility = "hidden";
          btn.disabled = true;
        } else {
          const meta = pieceMeta(id);
          btn.classList.add(meta.cls);
          btn.textContent = meta.emoji;
          btn.setAttribute("aria-label", meta.id);
          if (!animateNew) btn.style.animation = "none";
        }

        if (selected && selected.r === r && selected.c === c) {
          btn.classList.add("is-selected");
        }

        btn.addEventListener("click", () => onTileClick(r, c));
        els.board.appendChild(btn);
      }
    }
  }

  function getTileEl(r, c) {
    return els.board.querySelector(`[data-r="${r}"][data-c="${c}"]`);
  }

  async function onTileClick(r, c) {
    if (busy || ended || !grid[r][c]) return;

    const pos = { r, c };

    if (!selected) {
      selected = pos;
      renderBoard();
      els.tip.textContent = "Jetzt einen Nachbarn tippen.";
      return;
    }

    if (selected.r === r && selected.c === c) {
      selected = null;
      renderBoard();
      els.tip.textContent = "Zwei benachbarte Steine tippen zum Tauschen.";
      return;
    }

    if (!areAdjacent(selected, pos)) {
      selected = pos;
      renderBoard();
      els.tip.textContent = "Nur benachbarte Steine. Nochmal einen Nachbarn tippen.";
      return;
    }

    const from = selected;
    selected = null;
    await trySwap(from, pos);
  }

  function swapCells(a, b) {
    const tmp = grid[a.r][a.c];
    grid[a.r][a.c] = grid[b.r][b.c];
    grid[b.r][b.c] = tmp;
  }

  async function trySwap(a, b) {
    busy = true;
    swapCells(a, b);
    renderBoard();

    const matches = findMatches();
    if (matches.size === 0) {
      await sleep(160);
      swapCells(a, b);
      renderBoard();
      els.tip.textContent = "Kein Match — Tausch rückgängig.";
      busy = false;
      return;
    }

    moves -= 1;
    updateHud();
    els.tip.textContent = "Nice Crush!";
    await resolveBoard();
    busy = false;
    checkEnd();
  }

  async function resolveBoard() {
    let cascade = 0;
    while (true) {
      const matched = findMatches();
      if (matched.size === 0) break;

      cascade += 1;
      const points = matched.size * 10 * cascade;
      score += points;
      updateHud();

      for (const key of matched) {
        const [r, c] = key.split(",").map(Number);
        const el = getTileEl(r, c);
        if (el) el.classList.add("is-matched");
        grid[r][c] = null;
      }

      await sleep(260);
      applyGravity();
      fillEmpty();
      renderBoard({ animateNew: true });
      await sleep(220);
    }
  }

  function applyGravity() {
    for (let c = 0; c < SIZE; c++) {
      let write = SIZE - 1;
      for (let r = SIZE - 1; r >= 0; r--) {
        if (grid[r][c]) {
          grid[write][c] = grid[r][c];
          if (write !== r) grid[r][c] = null;
          write--;
        }
      }
      for (let r = write; r >= 0; r--) grid[r][c] = null;
    }
  }

  function fillEmpty() {
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        if (!grid[r][c]) grid[r][c] = randPiece();
      }
    }
  }

  function checkEnd() {
    if (score >= TARGET) {
      ended = true;
      showOverlay({
        eyebrow: "Level klar",
        title: "Crush complete, Wendi.",
        text: `Score ${score}. Die Katzen sind stolz. 🐱🐯`,
      });
      return;
    }
    if (moves <= 0) {
      ended = true;
      showOverlay({
        eyebrow: "Keine Züge mehr",
        title: "Almost, Wendi.",
        text: `Score ${score} / ${TARGET}. Nochmal versuchen?`,
      });
    }
  }

  function showOverlay({ eyebrow, title, text }) {
    els.overlayEyebrow.textContent = eyebrow;
    els.overlayTitle.textContent = title;
    els.overlayText.textContent = text;
    els.overlay.hidden = false;
  }

  function hideOverlay() {
    els.overlay.hidden = true;
  }

  function showScreen(which) {
    const isTitle = which === "title";
    els.title.hidden = !isTitle;
    els.game.hidden = isTitle;
    els.title.classList.toggle("is-active", isTitle);
  }

  function startGame() {
    hideOverlay();
    score = 0;
    moves = START_MOVES;
    selected = null;
    busy = false;
    ended = false;
    grid = createGridWithoutMatches();
    updateHud();
    els.tip.textContent = "Zwei benachbarte Steine tippen zum Tauschen.";
    showScreen("game");
    renderBoard({ animateNew: true });
  }

  function goTitle() {
    hideOverlay();
    showScreen("title");
  }

  els.btnStart.addEventListener("click", startGame);
  els.btnAgain.addEventListener("click", startGame);
  els.btnHome.addEventListener("click", goTitle);
  els.btnMenu.addEventListener("click", goTitle);
})();
