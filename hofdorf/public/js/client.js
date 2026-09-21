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
  hoe: 'Hack',
  can: 'Gieß',
  axe: 'Axt',
  pickaxe: 'Pick',
  scythe: 'Sense',
  parsnip_seed: 'Past',
  potato_seed: 'Kart',
  cauliflower_seed: 'Blum',
  tomato_seed: 'Toma',
  corn_seed: 'Mais',
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
      else if (msg.farmName) toast(`Hof heißt jetzt „${msg.farmName}“`);
      else if (msg.claimed) toast(`Übernommen: ${msg.claimed}`);
      else if (msg.partner) toast(`Teilhaber: ${msg.partner}`);
      else if (msg.produced) toast(`${msg.produced} (+${msg.gold}g)`);
      else if (msg.collected != null) toast(`Ausgezahlt: ${msg.collected} Gold`);
      else if (msg.deposited) toast(`Eingelagert: ${msg.deposited}`);
      else if (msg.shop) openShop();
      else if (msg.tilled || msg.watered || msg.wood || msg.stone) renderer.shake = 1;
      if (!shopEl.classList.contains('hidden')) renderBusiness();
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
  if (e.code === 'KeyM') openMap();
  if (e.code === 'KeyH' || e.key === '?') openHelp();
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
document.getElementById('btnMap').addEventListener('click', () => openMap());
document.getElementById('btnShop').addEventListener('click', () => openShop());
document.getElementById('btnHelp').addEventListener('click', () => openHelp());
document.getElementById('btnSleep').addEventListener('click', () => sendAction({ sleep: true }));
document.getElementById('closeShop').addEventListener('click', () => shopEl.classList.add('hidden'));
document.getElementById('closeHelp').addEventListener('click', () => helpEl.classList.add('hidden'));
document.getElementById('closeMap').addEventListener('click', () => mapModal.classList.add('hidden'));
document.getElementById('minimapBtn').addEventListener('click', () => openMap());
document.getElementById('sellAll').addEventListener('click', () => {
  sendAction({ shop: true, sell: true });
});
document.getElementById('renameFarmBtn').addEventListener('click', () => {
  const name = document.getElementById('farmNameInput').value;
  sendAction({ renameFarm: name });
});
document.getElementById('farmNameInput').addEventListener('keydown', (e) => {
  e.stopPropagation();
  if (e.key === 'Enter') document.getElementById('renameFarmBtn').click();
});

const helpEl = document.getElementById('help');
const helpBody = document.getElementById('helpBody');
const mapModal = document.getElementById('mapModal');
const minimapCanvas = document.getElementById('minimap');
const worldMapCanvas = document.getElementById('worldMap');
const mapLegend = document.getElementById('mapLegend');
const businessList = document.getElementById('businessList');
const businessDetail = document.getElementById('businessDetail');
let selectedBiz = null;

const MAP_COLORS = {
  grass: '#2f6b45',
  path: '#c2a06a',
  dirt: '#7a5230',
  water: '#2f6f9e',
  fence: '#6b4226',
  building: '#8b5a3c',
  tree: '#1f6b38',
  rock: '#7a7f88',
  flower: '#e85d4c',
  floor: '#d8c49a',
  bed: '#4c8fe8',
  counter: '#a07040',
  door: '#3d2914',
};

function tileColor(kind) {
  const map = [
    MAP_COLORS.grass, MAP_COLORS.path, MAP_COLORS.dirt, MAP_COLORS.water,
    MAP_COLORS.fence, MAP_COLORS.building, MAP_COLORS.tree, MAP_COLORS.rock,
    MAP_COLORS.flower, MAP_COLORS.floor, MAP_COLORS.bed, MAP_COLORS.counter,
    MAP_COLORS.door,
  ];
  return map[kind] || MAP_COLORS.grass;
}

function drawOverview(canvas, opts = {}) {
  if (!state || !renderer.tiles) return;
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const ww = renderer.worldW;
  const wh = renderer.worldH;
  const scaleX = w / ww;
  const scaleY = h / wh;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#143022';
  ctx.fillRect(0, 0, w, h);

  // Sample tiles for speed on small canvas
  const step = opts.detail ? 1 : Math.max(1, Math.floor(Math.min(ww / w, wh / h)));
  for (let ty = 0; ty < wh; ty += step) {
    for (let tx = 0; tx < ww; tx += step) {
      const kind = renderer.tiles[ty * ww + tx];
      ctx.fillStyle = tileColor(kind);
      ctx.fillRect(Math.floor(tx * scaleX), Math.floor(ty * scaleY), Math.ceil(scaleX * step), Math.ceil(scaleY * step));
    }
  }

  // Town outline
  if (state.town) {
    const t = state.town;
    ctx.strokeStyle = 'rgba(240,199,94,0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(t.ox * scaleX, t.oy * scaleY, t.w * scaleX, t.h * scaleY);
  }

  // Farms + names
  ctx.font = opts.detail ? 'bold 10px Nunito,sans-serif' : 'bold 8px Nunito,sans-serif';
  ctx.textAlign = 'center';
  for (const farm of state.farms || []) {
    const owned = !!farm.ownerId;
    ctx.strokeStyle = owned ? 'rgba(232,93,76,0.9)' : 'rgba(243,230,200,0.35)';
    ctx.lineWidth = owned ? 1.5 : 1;
    ctx.strokeRect(farm.ox * scaleX, farm.oy * scaleY, farm.w * scaleX, farm.h * scaleY);
    const label = farm.displayName || farm.name;
    const lx = (farm.ox + farm.w / 2) * scaleX;
    const ly = (farm.oy + farm.h / 2) * scaleY;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    const tw = ctx.measureText(label).width + 4;
    ctx.fillRect(lx - tw / 2, ly - 6, tw, 11);
    ctx.fillStyle = owned ? '#f0c75e' : '#f3e6c8';
    ctx.fillText(label, lx, ly + 3);
  }

  // Players
  for (const p of state.players || []) {
    ctx.fillStyle = p.color || '#fff';
    ctx.beginPath();
    ctx.arc(p.x * scaleX, p.y * scaleY, opts.detail ? 3.5 : 2.5, 0, Math.PI * 2);
    ctx.fill();
    if (p.self) {
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

let lastMapDraw = 0;
function refreshMaps() {
  const now = performance.now();
  const mapOpen = !mapModal.classList.contains('hidden');
  if (!mapOpen && now - lastMapDraw < 280) return;
  lastMapDraw = now;
  drawOverview(minimapCanvas, { detail: false });
  if (mapOpen) {
    drawOverview(worldMapCanvas, { detail: true });
    renderMapLegend();
  }
}

function renderMapLegend() {
  if (!state?.farms) return;
  const me = state.players.find((p) => p.self);
  mapLegend.innerHTML = state.farms.map((f) => {
    const owner = state.players.find((p) => p.id === f.ownerId);
    const mine = me && f.ownerId === me.id;
    const who = owner ? owner.name : 'frei';
    return `<div><span>${mine ? '★ ' : ''}${escapeHtml(f.displayName || f.name)}</span><span>${escapeHtml(who)}</span></div>`;
  }).join('');
}

function openMap() {
  mapModal.classList.remove('hidden');
  shopEl.classList.add('hidden');
  helpEl.classList.add('hidden');
  const me = state?.players?.find((p) => p.self);
  const farm = state?.farms?.find((f) => f.ownerId === me?.id);
  const input = document.getElementById('farmNameInput');
  if (farm && input) input.value = farm.customName || farm.displayName || farm.name || '';
  drawOverview(worldMapCanvas, { detail: true });
  renderMapLegend();
}

const HELP = {
  steuern: {
    title: 'Steuerung',
    html: `<ul>
      <li><b>Laufen:</b> WASD / Pfeile oder Touch-Stick</li>
      <li><b>Aktion:</b> Leertaste / E / A-Button</li>
      <li><b>Hotbar:</b> Tasten 1–8 oder Slot antippen</li>
      <li><b>Karte:</b> M / Button „Karte“ / Mini-Karte oben rechts tippen</li>
      <li><b>Laden:</b> B · <b>Hilfe:</b> H / ? · <b>Schlaf:</b> Z</li>
    </ul>`,
  },
  farm: {
    title: 'Dein Hof',
    html: `<ul>
      <li>Bis zu <b>10 Höfe</b> pro Server — jeder Spieler bekommt einen freien Slot.</li>
      <li>Hofnamen vergeben unter <b>Karte → Dein Hof nennen</b> — erscheint auf Mini-Karte & Weltkarte.</li>
      <li><b>Hack</b> → säen → <b>Gieß</b> → wachsen → <b>Sense</b> ernten</li>
      <li><b>Axt</b> / <b>Pick</b> für Holz & Stein. Fremde Höfe nur besuchen.</li>
    </ul>`,
  },
  stadt: {
    title: 'Stadt & Karte',
    html: `<ul>
      <li>Der <b>Dorfplatz</b> ist für alle synchron — Wege zu allen Höfen.</li>
      <li>Die <b>Weltkarte</b> zeigt alle Höfe (mit Namen), Stadt und Spieler-Punkte.</li>
      <li>Die <b>Mini-Karte</b> oben rechts aktualisiert sich live.</li>
    </ul>`,
  },
  laden: {
    title: 'Läden & Produktion',
    html: `<ul>
      <li>Unter <b>Laden → Läden</b> kannst du einen Laden übernehmen (Gold).</li>
      <li><b>Samenladen:</b> Anteil an Samenverkäufen + Morgenbonus</li>
      <li><b>Dorfküche / Werkstatt:</b> Farm-Waren einlagern, Rezepte produzieren → Gold</li>
      <li>Als Besitzer: Freunde per Namen als <b>Teilhaber</b> einladen (müssen online sein).</li>
      <li>Einnahmen mit „Auszahlen“ gerecht teilen. Morgens läuft 1 Rezept automatisch, wenn genug Material da ist.</li>
    </ul>`,
  },
  multi: {
    title: 'Online spielen',
    html: `<ul>
      <li>Gleicher Server / gleiche URL = gemeinsame Welt.</li>
      <li>Spieler siehst du mit Namen — in der Stadt und auf Höfen.</li>
      <li>Chat-Log unten links zeigt Beitritte und Laden-Events.</li>
      <li>Tipp: Zwei Tabs oder zwei Handys zum Testen mit Freunden.</li>
    </ul>`,
  },
};

function openShop() {
  shopEl.classList.remove('hidden');
  helpEl.classList.add('hidden');
  mapModal.classList.add('hidden');
  renderBusiness();
}

function openHelp(section = 'steuern') {
  helpEl.classList.remove('hidden');
  shopEl.classList.add('hidden');
  mapModal.classList.add('hidden');
  showHelp(section);
}

function showHelp(section) {
  const data = HELP[section] || HELP.steuern;
  helpBody.innerHTML = `<h3>${data.title}</h3>${data.html}`;
  document.querySelectorAll('#helpTabs .tab').forEach((t) => {
    t.classList.toggle('active', t.dataset.help === section);
  });
}

document.querySelectorAll('#helpTabs .tab').forEach((t) => {
  t.addEventListener('click', () => showHelp(t.dataset.help));
});

document.querySelectorAll('#shop .tabs .tab').forEach((t) => {
  t.addEventListener('click', () => {
    document.querySelectorAll('#shop .tabs .tab').forEach((x) => x.classList.remove('active'));
    t.classList.add('active');
    const market = t.dataset.tab === 'market';
    document.getElementById('tabMarket').classList.toggle('hidden', !market);
    document.getElementById('tabBusiness').classList.toggle('hidden', market);
    if (!market) renderBusiness();
  });
});

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

function renderBusiness() {
  if (!state?.shops) return;
  const me = state.players.find((p) => p.self);
  businessList.innerHTML = '';
  for (const shop of state.shops) {
    const btn = document.createElement('button');
    btn.type = 'button';
    const owner = shop.ownerName ? ` · ${shop.ownerName}` : ' · frei';
    btn.textContent = `${shop.name}${owner} — ${shop.claimPrice} Gold`;
    btn.addEventListener('click', () => {
      selectedBiz = shop.id;
      showBizDetail(shop.id);
    });
    businessList.appendChild(btn);
  }
  if (selectedBiz) showBizDetail(selectedBiz);
  else businessDetail.classList.add('hidden');
}

function showBizDetail(shopId) {
  const shop = state?.shops?.find((s) => s.id === shopId);
  const me = state?.players?.find((p) => p.self);
  if (!shop || !me) return;
  selectedBiz = shopId;
  businessDetail.classList.remove('hidden');
  const isOwner = shop.ownerId === me.id;
  const isMember = isOwner || shop.partners.some((p) => p.id === me.id);
  const vaultStr = Object.entries(shop.vault || {})
    .filter(([, n]) => n > 0)
    .map(([k, n]) => `${k}:${n}`)
    .join(', ') || 'leer';

  let html = `<h3>${shop.name}</h3><p>${shop.blurb}</p>`;
  html += `<p>Besitzer: <b>${shop.ownerName || '—'}</b> · Teilhaber: <b>${shop.partners.map((p) => p.name).join(', ') || '—'}</b></p>`;
  html += `<p>Lager: ${vaultStr} · Einnahmen: ${shop.earnings} Gold</p><div class="row">`;

  if (!shop.ownerId) {
    html += `<button type="button" class="full" id="bizClaim">Übernehmen (${shop.claimPrice} Gold)</button>`;
  }
  if (isOwner) {
    html += `<input id="bizInvite" placeholder="Freund-Name online" /><button type="button" id="bizInviteBtn">Teilhaber</button>`;
  }
  if (isMember) {
    html += `<button type="button" id="bizCollect">Auszahlen</button>`;
    const depositItems = ['parsnip', 'potato', 'tomato', 'corn', 'cauliflower', 'wood', 'stone'];
    for (const item of depositItems) {
      if ((me.inventory[item] || 0) > 0) {
        html += `<button type="button" data-dep="${item}">+1 ${item}</button>`;
      }
    }
    if (shop.recipes) {
      for (const r of shop.recipes) {
        const need = Object.entries(r.needs).map(([k, v]) => `${v} ${k}`).join(', ');
        html += `<button type="button" data-recipe="${r.id}">${r.name} (${need} → ${r.gold}g)</button>`;
      }
    }
  }
  html += '</div>';
  businessDetail.innerHTML = html;

  document.getElementById('bizClaim')?.addEventListener('click', () => {
    sendAction({ shop: true, claim: shop.id });
  });
  document.getElementById('bizInviteBtn')?.addEventListener('click', () => {
    const name = document.getElementById('bizInvite')?.value || '';
    sendAction({ shop: true, shopId: shop.id, invite: name });
  });
  document.getElementById('bizCollect')?.addEventListener('click', () => {
    sendAction({ shop: true, shopId: shop.id, collect: true });
  });
  businessDetail.querySelectorAll('[data-dep]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sendAction({ shop: true, shopId: shop.id, deposit: btn.dataset.dep, qty: 1 });
    });
  });
  businessDetail.querySelectorAll('[data-recipe]').forEach((btn) => {
    btn.addEventListener('click', () => {
      sendAction({ shop: true, shopId: shop.id, produce: btn.dataset.recipe });
    });
  });
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
      ? `Dein ${farm.displayName || farm.name}`
      : owner
        ? `${farm.displayName || farm.name} von ${owner.name}`
        : (farm.displayName || farm.name);
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

  refreshMaps();
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
