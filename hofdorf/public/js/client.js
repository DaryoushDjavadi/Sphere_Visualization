import { Renderer } from './renderer.js';

const boot = document.getElementById('boot');
const gameEl = document.getElementById('game');
const canvas = document.getElementById('canvas');
const nameInput = document.getElementById('nameInput');
const joinBtn = document.getElementById('joinBtn');
const clockEl = document.getElementById('clock');
const statsEl = document.getElementById('stats');
const zoneEl = document.getElementById('zoneLabel');
const toastEl = document.getElementById('toast');
const hotbarEl = document.getElementById('hotbar');
const chatLog = document.getElementById('chatLog');
const shopEl = document.getElementById('shop');
const shopList = document.getElementById('shopList');
const stick = document.getElementById('stick');
const knob = document.getElementById('knob');

const savedName = localStorage.getItem('hofdorf_name') || '';
nameInput.value = savedName;

const renderer = new Renderer(canvas);
const input = { up: false, down: false, left: false, right: false, action: false, select: 0 };

let ws = null;
let state = null;
let crops = null;
let youId = null;
let toastTimer = null;
let stickTouchId = null;

const ICONS = {
  hoe: '🪓',
  can: '💧',
  axe: '🪚',
  pickaxe: '⛏️',
  scythe: '🌾',
  parsnip_seed: '🌱',
  potato_seed: '🥔',
  cauliflower_seed: '🥬',
  tomato_seed: '🍅',
  corn_seed: '🌽',
};

function toast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
}

function wsUrl() {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/ws`;
}

function connect(name) {
  ws = new WebSocket(wsUrl());
  ws.addEventListener('open', () => {
    ws.send(JSON.stringify({ type: 'join', name }));
  });
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.type === 'welcome') {
      crops = msg.crops;
      youId = msg.you;
      renderer.setTiles(msg.tiles, msg.worldW, msg.worldH);
      state = msg;
      boot.classList.add('hidden');
      gameEl.classList.remove('hidden');
      renderer.resize();
      buildShop();
      toast(`Willkommen auf dem ${msg.farms.find((f) => f.ownerId === youId)?.name || 'Dorfplatz'}!`);
    } else if (msg.type === 'state') {
      state = msg;
    } else if (msg.type === 'tiles') {
      renderer.setTiles(msg.tiles, renderer.worldW, renderer.worldH);
    } else if (msg.type === 'action_result') {
      if (msg.error) toast(msg.error);
      else if (msg.harvest) toast(`Geerntet: ${msg.harvest}`);
      else if (msg.planted) toast(`Gesät: ${msg.planted}`);
      else if (msg.bought) toast(`Gekauft: ${msg.bought}`);
      else if (msg.earned != null) toast(`+${msg.earned} Gold`);
      else if (msg.slept) toast(`Guten Morgen — Tag ${msg.day}`);
      else if (msg.shop) openShop();
      else if (msg.tilled || msg.watered || msg.wood || msg.stone) renderer.shake = 1;
    } else if (msg.type === 'player_join') {
      toast(`${msg.player.name} ist da`);
    } else if (msg.type === 'player_leave') {
      toast('Jemand hat den Server verlassen');
    }
  });
  ws.addEventListener('close', () => {
    toast('Verbindung getrennt — neu laden');
  });
}

function sendInput() {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type: 'input', ...input }));
}

function sendAction(extra = {}) {
  if (!ws || ws.readyState !== 1) return;
  ws.send(JSON.stringify({ type: 'action', ...extra }));
}

joinBtn.addEventListener('click', () => {
  const name = (nameInput.value || 'Bauer').trim().slice(0, 16);
  localStorage.setItem('hofdorf_name', name);
  connect(name);
});

nameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') joinBtn.click();
  e.stopPropagation();
});

// Keyboard
const keyMap = {
  KeyW: 'up', ArrowUp: 'up',
  KeyS: 'down', ArrowDown: 'down',
  KeyA: 'left', ArrowLeft: 'left',
  KeyD: 'right', ArrowRight: 'right',
};

window.addEventListener('keydown', (e) => {
  if (boot && !boot.classList.contains('hidden')) return;
  if (e.code in keyMap) {
    input[keyMap[e.code]] = true;
    sendInput();
    e.preventDefault();
  }
  if (e.code === 'Space' || e.code === 'KeyE') {
    sendAction();
    e.preventDefault();
  }
  if (e.code === 'KeyB') openShop();
  if (e.code === 'KeyZ') sendAction({ sleep: true });
  if (e.code.startsWith('Digit')) {
    const n = Number(e.code.slice(5)) - 1;
    if (n >= 0 && n <= 7) {
      input.select = n;
      sendInput();
    }
  }
});

window.addEventListener('keyup', (e) => {
  if (e.code in keyMap) {
    input[keyMap[e.code]] = false;
    sendInput();
  }
});

// Hotbar clicks
hotbarEl.addEventListener('click', (e) => {
  const slot = e.target.closest('.slot');
  if (!slot) return;
  input.select = Number(slot.dataset.i);
  sendInput();
});

// Touch stick
function setStick(dx, dy) {
  const max = 36;
  const len = Math.hypot(dx, dy) || 1;
  const nx = (dx / len) * Math.min(len, max);
  const ny = (dy / len) * Math.min(len, max);
  knob.style.transform = `translate(${nx}px, ${ny}px)`;
  const dead = 10;
  input.left = dx < -dead;
  input.right = dx > dead;
  input.up = dy < -dead;
  input.down = dy > dead;
  sendInput();
}

function resetStick() {
  knob.style.transform = 'translate(0, 0)';
  input.left = input.right = input.up = input.down = false;
  sendInput();
}

stick.addEventListener('pointerdown', (e) => {
  stickTouchId = e.pointerId;
  stick.setPointerCapture(e.pointerId);
  const rect = stick.getBoundingClientRect();
  setStick(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2);
});
stick.addEventListener('pointermove', (e) => {
  if (e.pointerId !== stickTouchId) return;
  const rect = stick.getBoundingClientRect();
  setStick(e.clientX - rect.left - rect.width / 2, e.clientY - rect.top - rect.height / 2);
});
stick.addEventListener('pointerup', () => {
  stickTouchId = null;
  resetStick();
});
stick.addEventListener('pointercancel', () => {
  stickTouchId = null;
  resetStick();
});

document.getElementById('btnAction').addEventListener('click', () => sendAction());
document.getElementById('btnShop').addEventListener('click', () => openShop());
document.getElementById('btnSleep').addEventListener('click', () => sendAction({ sleep: true }));
document.getElementById('closeShop').addEventListener('click', () => shopEl.classList.add('hidden'));
document.getElementById('sellAll').addEventListener('click', () => {
  sendAction({ shop: true, sell: true });
});

function openShop() {
  shopEl.classList.remove('hidden');
}

function buildShop() {
  if (!crops) return;
  shopList.innerHTML = '';
  for (const crop of Object.values(crops)) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = `${crop.seedName} — ${crop.seedPrice} Gold`;
    btn.addEventListener('click', () => sendAction({ shop: true, buy: crop.id }));
    shopList.appendChild(btn);
  }
}

function updateHud() {
  if (!state) return;
  const me = state.players.find((p) => p.self);
  if (!me) return;

  clockEl.textContent = `Tag ${state.day} · ${state.season} · ${state.time} · ${state.weather}`;
  statsEl.textContent = `⚡ ${Math.round(me.energy)}/${me.maxEnergy} · 🪙 ${me.gold}`;

  const farm = state.farms.find(
    (f) => me.x >= f.ox && me.x < f.ox + f.w && me.y >= f.oy && me.y < f.oy + f.h,
  );
  const town = state.town;
  let zone = 'Wildnis';
  if (farm) {
    const owner = state.players.find((p) => p.id === farm.ownerId);
    zone = farm.ownerId === me.id
      ? `Dein ${farm.name}`
      : owner
        ? `${farm.name} von ${owner.name}`
        : farm.name;
  } else if (
    me.x >= town.ox && me.x < town.ox + town.w &&
    me.y >= town.oy && me.y < town.oy + town.h
  ) {
    zone = 'Dorfplatz — hier treffen sich alle';
  }
  zoneEl.textContent = zone;

  // Hotbar
  hotbarEl.innerHTML = '';
  me.hotbar.forEach((slot, i) => {
    const el = document.createElement('div');
    el.className = `slot${i === me.selected ? ' active' : ''}`;
    el.dataset.i = String(i);
    const qty = me.inventory[slot] || 0;
    el.innerHTML = `<span class="icon">${ICONS[slot] || '•'}</span>${qty > 1 || String(slot).includes('seed') || ['wood','stone'].includes(slot) ? `<span class="qty">${qty}</span>` : ''}`;
    hotbarEl.appendChild(el);
  });

  // Chat
  chatLog.innerHTML = (state.chat || []).map((c) => {
    const who = c.from === 'system' ? '•' : c.from;
    return `<div><b>${who}</b> ${escapeHtml(c.text)}</div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c]);
}

window.addEventListener('resize', () => renderer.resize());
renderer.resize();

function frame() {
  if (state && renderer.tiles) {
    renderer.draw(state, crops);
    updateHud();
  }
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Keep sending input while held (mobile reliability)
setInterval(() => {
  if (input.up || input.down || input.left || input.right) sendInput();
}, 100);
