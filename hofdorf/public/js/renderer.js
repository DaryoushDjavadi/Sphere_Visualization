/** Richer procedural pixel-art renderer for Hofdorf */

export const T = {
  GRASS: 0,
  PATH: 1,
  DIRT: 2,
  WATER: 3,
  FENCE: 4,
  BUILDING: 5,
  TREE: 6,
  ROCK: 7,
  FLOWER: 8,
  FLOOR: 9,
  BED: 10,
  COUNTER: 11,
  DOOR: 12,
};

const TILE = 32;

function mulberry32(a) {
  return function () {
    let t = (a += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  return { c, ctx };
}

function px(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
}

/** Build a small grass atlas with 4 variants */
function buildGrassAtlas() {
  const { c, ctx } = makeCanvas(TILE * 4, TILE);
  for (let v = 0; v < 4; v++) {
    const ox = v * TILE;
    const rnd = mulberry32(9000 + v * 97);
    const bases = ['#3f9a58', '#3a9252', '#378a4e', '#419e5c'];
    const darks = ['#2f7a44', '#2c7340', '#2a6e3d', '#317c46'];
    const lights = ['#57b36c', '#5cbc74', '#4eaa64', '#62c47a'];
    const base = bases[v];
    const dark = darks[v];
    const light = lights[v];
    px(ctx, ox, 0, TILE, TILE, base);
    // soft mottling
    for (let i = 0; i < 28; i++) {
      const gx = ox + Math.floor(rnd() * 30) + 1;
      const gy = Math.floor(rnd() * 30) + 1;
      px(ctx, gx, gy, rnd() > 0.6 ? 3 : 2, 2, rnd() > 0.45 ? dark : light);
    }
    // blades clustered
    for (let i = 0; i < 10; i++) {
      const bx = ox + 2 + Math.floor(rnd() * 28);
      const bh = 3 + Math.floor(rnd() * 6);
      px(ctx, bx, 30 - bh, 1, bh, dark);
      if (rnd() > 0.4) px(ctx, bx + 1, 29 - bh, 1, bh, light);
    }
    // tiny flowers sometimes
    if (v === 2 || v === 3) {
      px(ctx, ox + 8, 10, 2, 2, '#f0c75e');
      px(ctx, ox + 22, 18, 2, 2, '#e85d4c');
    }
  }
  return c;
}

function buildPathTile() {
  const { c, ctx } = makeCanvas(TILE, TILE);
  px(ctx, 0, 0, TILE, TILE, '#c9a66c');
  px(ctx, 0, 0, TILE, TILE, '#c2a06a');
  // edge darken
  px(ctx, 0, 0, TILE, 2, '#a88450');
  px(ctx, 0, 30, TILE, 2, '#d4b57a');
  const rnd = mulberry32(4242);
  for (let i = 0; i < 12; i++) {
    px(ctx, 2 + Math.floor(rnd() * 26), 2 + Math.floor(rnd() * 26), 2 + (rnd() > 0.7 ? 2 : 0), 2, rnd() > 0.5 ? '#b08c58' : '#d8b87e');
  }
  // pebbles
  px(ctx, 8, 10, 3, 2, '#9a7a48');
  px(ctx, 20, 18, 4, 3, '#8e6e40');
  px(ctx, 14, 24, 2, 2, '#e0c090');
  return c;
}

function buildDirtTile(wet) {
  const { c, ctx } = makeCanvas(TILE, TILE);
  const base = wet ? '#5a3820' : '#7d5432';
  const furrow = wet ? '#472914' : '#654226';
  const highlight = wet ? '#6e4630' : '#916340';
  px(ctx, 0, 0, TILE, TILE, base);
  for (let row = 0; row < 4; row++) {
    px(ctx, 2, 5 + row * 7, 28, 2, furrow);
    px(ctx, 2, 4 + row * 7, 28, 1, highlight);
  }
  if (wet) {
    px(ctx, 6, 8, 5, 2, 'rgba(80,140,200,0.25)');
    px(ctx, 18, 16, 7, 2, 'rgba(80,140,200,0.2)');
  }
  return c;
}

function buildFloorTile() {
  const { c, ctx } = makeCanvas(TILE, TILE);
  px(ctx, 0, 0, TILE, TILE, '#dcc8a0');
  px(ctx, 0, 0, 16, 16, '#e4d0a8');
  px(ctx, 16, 16, 16, 16, '#e4d0a8');
  px(ctx, 16, 0, 16, 16, '#d4bc90');
  px(ctx, 0, 16, 16, 16, '#d4bc90');
  ctx.strokeStyle = 'rgba(90,60,30,0.18)';
  ctx.strokeRect(0.5, 0.5, 31, 31);
  ctx.beginPath();
  ctx.moveTo(16.5, 0);
  ctx.lineTo(16.5, 32);
  ctx.moveTo(0, 16.5);
  ctx.lineTo(32, 16.5);
  ctx.stroke();
  return c;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.tiles = null;
    this.worldW = 112;
    this.worldH = 96;
    this.dpr = 1;
    this.shake = 0;
    this.grassAtlas = buildGrassAtlas();
    this.pathTile = buildPathTile();
    this.dirtTile = buildDirtTile(false);
    this.dirtWetTile = buildDirtTile(true);
    this.floorTile = buildFloorTile();
    this.cloudPhase = 0;
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.floor(w * this.dpr);
    this.canvas.height = Math.floor(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;
  }

  setTiles(base64, w, h) {
    const bin = atob(base64);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    this.tiles = arr;
    this.worldW = w;
    this.worldH = h;
  }

  tile(x, y) {
    if (!this.tiles || x < 0 || y < 0 || x >= this.worldW || y >= this.worldH) return T.FENCE;
    return this.tiles[y * this.worldW + x];
  }

  follow(px, py) {
    const viewW = window.innerWidth;
    const viewH = window.innerHeight;
    const targetX = px * TILE - viewW / 2;
    const targetY = py * TILE - viewH / 2 - 8;
    this.camX += (targetX - this.camX) * 0.16;
    this.camY += (targetY - this.camY) * 0.16;
    const maxX = Math.max(0, this.worldW * TILE - viewW);
    const maxY = Math.max(0, this.worldH * TILE - viewH);
    this.camX = Math.max(0, Math.min(maxX, this.camX));
    this.camY = Math.max(0, Math.min(maxY, this.camY));
  }

  skyColor(timeStr, weather) {
    const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    const t = hh + mm / 60;
    let top;
    let bot;
    if (t < 6 || t >= 21) {
      top = '#0a1220';
      bot = '#1c2a44';
    } else if (t < 8) {
      top = '#ffb068';
      bot = '#87c0e8';
    } else if (t < 17) {
      if (weather === 'regen') {
        top = '#6a7f92';
        bot = '#8fa3b4';
      } else if (weather === 'bewölkt') {
        top = '#9bb0c2';
        bot = '#c2d4e2';
      } else {
        top = '#6eb4e0';
        bot = '#c8e6f8';
      }
    } else if (t < 19) {
      top = '#e87848';
      bot = '#6a88b0';
    } else {
      top = '#2a3a68';
      bot = '#1a2448';
    }
    return { top, bot, t };
  }

  draw(state, crops) {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const sky = this.skyColor(state.time, state.weather);
    this.cloudPhase = performance.now() / 1000;

    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sky.top);
    g.addColorStop(0.55, sky.bot);
    g.addColorStop(1, '#d8eccf');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    // soft distant clouds (decorative)
    if (sky.t >= 6 && sky.t < 20 && state.weather !== 'regen') {
      this.drawClouds(ctx, w, h, state.weather === 'bewölkt');
    }

    const me = state.players.find((p) => p.self) || state.players[0];
    if (me) this.follow(me.x, me.y);

    let ox = -this.camX;
    let oy = -this.camY;
    if (this.shake > 0) {
      ox += (Math.random() - 0.5) * this.shake * 5;
      oy += (Math.random() - 0.5) * this.shake * 5;
      this.shake *= 0.82;
    }

    const x0 = Math.max(0, Math.floor(this.camX / TILE) - 1);
    const y0 = Math.max(0, Math.floor(this.camY / TILE) - 1);
    const x1 = Math.min(this.worldW, Math.ceil((this.camX + w) / TILE) + 1);
    const y1 = Math.min(this.worldH, Math.ceil((this.camY + h) / TILE) + 1);

    // Ground pass
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        this.drawGround(ctx, tx, ty, ox, oy, state);
      }
    }

    // Tall props / buildings / labels sorted roughly by y for depth
    const deco = [];
    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        const kind = this.tile(tx, ty);
        if (kind === T.TREE || kind === T.ROCK || kind === T.FLOWER || kind === T.FENCE
          || kind === T.BUILDING || kind === T.DOOR || kind === T.BED || kind === T.COUNTER) {
          deco.push({ tx, ty, kind, y: ty });
        }
      }
    }
    if (state.overlays) {
      for (const [key, ov] of Object.entries(state.overlays)) {
        const [tx, ty] = key.split(',').map(Number);
        if (tx < x0 || tx >= x1 || ty < y0 || ty >= y1) continue;
        deco.push({ tx, ty, ov, crops, y: ty + 0.2 });
      }
    }
    for (const p of state.players) deco.push({ player: p, y: p.y });
    for (const n of state.npcs || []) deco.push({ npc: n, y: n.y });
    for (const farm of state.farms || []) {
      for (const a of farm.animals || []) {
        deco.push({
          animal: a,
          x: farm.spawn ? farm.ox + 4 + (a.id.charCodeAt(1) % 5) : farm.ox + 5,
          y: farm.oy + farm.h - 4,
          farm,
        });
      }
    }
    deco.sort((a, b) => a.y - b.y);

    for (const d of deco) {
      if (d.player) this.drawPlayer(ctx, d.player, ox, oy);
      else if (d.npc) this.drawNpc(ctx, d.npc, ox, oy);
      else if (d.animal) this.drawAnimal(ctx, d.animal, d.x, d.y, ox, oy);
      else if (d.ov) this.drawOverlay(ctx, d.tx, d.ty, d.ov, ox, oy, d.crops);
      else this.drawProp(ctx, d.tx, d.ty, d.kind, ox, oy);
    }

    // Farm labels (after world so readable)
    if (state.farms) {
      ctx.font = '700 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      for (const farm of state.farms) {
        const owner = state.players.find((p) => p.id === farm.ownerId);
        const label = owner
          ? `${farm.displayName || farm.name} · ${owner.name}`
          : `${farm.displayName || farm.name} · frei`;
        const lx = farm.ox * TILE + (farm.w * TILE) / 2 + ox;
        const ly = farm.oy * TILE + 16 + oy;
        const tw = ctx.measureText(label).width + 14;
        ctx.fillStyle = 'rgba(12,18,14,0.55)';
        roundRect(ctx, lx - tw / 2, ly - 13, tw, 18, 6);
        ctx.fill();
        ctx.fillStyle = owner ? '#f0c75e' : '#f3e6c8';
        ctx.fillText(label, lx, ly);
      }
    }

    if (state.shops) {
      ctx.font = '700 11px Nunito, sans-serif';
      ctx.textAlign = 'center';
      for (const shop of state.shops) {
        const sx = shop.x * TILE + TILE / 2 + ox;
        const sy = shop.y * TILE + oy;
        // signpost
        px(ctx, sx - 1, sy, 2, 14, '#5a3a22');
        px(ctx, sx - 16, sy - 10, 32, 12, '#c45c3a');
        px(ctx, sx - 16, sy - 10, 32, 3, '#e08a4a');
        const label = shop.ownerName ? shop.name : `${shop.name}`;
        ctx.fillStyle = '#fff8ef';
        ctx.fillText(label, sx, sy - 1);
      }
    }

    // Lighting veil
    const [hh] = (state.time || '12:00').split(':').map(Number);
    if (hh < 6 || hh >= 20) {
      ctx.fillStyle = 'rgba(8, 12, 36, 0.42)';
      ctx.fillRect(0, 0, w, h);
      this.drawStars(ctx, w, h);
    } else if (hh < 8) {
      ctx.fillStyle = 'rgba(255, 140, 80, 0.12)';
      ctx.fillRect(0, 0, w, h);
    } else if (hh >= 18) {
      ctx.fillStyle = 'rgba(220, 90, 50, 0.14)';
      ctx.fillRect(0, 0, w, h);
    } else if (state.weather === 'regen') {
      ctx.fillStyle = 'rgba(40, 60, 80, 0.16)';
      ctx.fillRect(0, 0, w, h);
      this.drawRain(ctx, w, h);
    } else if (state.weather === 'bewölkt') {
      ctx.fillStyle = 'rgba(60, 70, 90, 0.08)';
      ctx.fillRect(0, 0, w, h);
    }

    // vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.9);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.32)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  drawClouds(ctx, w, h, dense) {
    const t = this.cloudPhase;
    const n = dense ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const x = ((i * 170 + t * (8 + i)) % (w + 120)) - 60;
      const y = 30 + (i * 37) % 90;
      ctx.fillStyle = dense ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.28)';
      roundRect(ctx, x, y, 70 + i * 6, 22, 12);
      ctx.fill();
      roundRect(ctx, x + 20, y - 10, 40, 20, 10);
      ctx.fill();
    }
  }

  drawStars(ctx, w, h) {
    ctx.fillStyle = 'rgba(255,255,220,0.7)';
    for (let i = 0; i < 40; i++) {
      const x = (i * 97) % w;
      const y = (i * 53) % (h * 0.45);
      const tw = 0.5 + Math.sin(this.cloudPhase * 3 + i) * 0.5;
      if (tw > 0.3) ctx.fillRect(x, y, 2, 2);
    }
  }

  drawRain(ctx, w, h) {
    ctx.strokeStyle = 'rgba(200,220,255,0.4)';
    ctx.lineWidth = 1.2;
    const t = performance.now() / 28;
    for (let i = 0; i < 80; i++) {
      const x = (i * 97 + t * 4) % w;
      const y = (i * 53 + t * 10) % h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 3, y + 12);
      ctx.stroke();
    }
  }

  drawGround(ctx, tx, ty, ox, oy, state) {
    const kind = this.tile(tx, ty);
    const x = Math.floor(tx * TILE + ox);
    const y = Math.floor(ty * TILE + oy);
    const rnd = mulberry32(tx * 374761 + ty * 668265);
    const variant = Math.floor(rnd() * 4);

    // ground under props
    if (kind === T.GRASS || kind === T.FLOWER || kind === T.TREE || kind === T.ROCK || kind === T.FENCE) {
      ctx.drawImage(this.grassAtlas, variant * TILE, 0, TILE, TILE, x, y, TILE, TILE);
      return;
    }
    if (kind === T.PATH) {
      ctx.drawImage(this.pathTile, x, y);
      return;
    }
    if (kind === T.DIRT) {
      const wet = state.overlays?.[`${tx},${ty}`]?.watered;
      ctx.drawImage(wet ? this.dirtWetTile : this.dirtTile, x, y);
      return;
    }
    if (kind === T.WATER) {
      this.drawWater(ctx, x, y, tx, ty);
      return;
    }
    if (kind === T.FLOOR || kind === T.BUILDING || kind === T.DOOR || kind === T.BED || kind === T.COUNTER) {
      ctx.drawImage(this.floorTile, x, y);
      if (kind === T.FLOOR) return;
      // building footprint tint
      px(ctx, x, y, TILE, TILE, 'rgba(90,50,30,0.25)');
      return;
    }
    // fallback
    ctx.drawImage(this.grassAtlas, 0, 0, TILE, TILE, x, y, TILE, TILE);
  }

  drawWater(ctx, x, y, tx, ty) {
    const t = this.cloudPhase;
    const wave = Math.sin(t * 2.2 + tx * 0.7 + ty * 0.5);
    px(ctx, x, y, TILE, TILE, '#246890');
    px(ctx, x, y, TILE, TILE, '#2c7aa3');
    // depth edge
    px(ctx, x, y, TILE, 3, '#1d5a7a');
    px(ctx, x, y + 29, TILE, 3, '#3f96c0');
    px(ctx, x + 3, y + 8 + wave * 2, 12, 3, 'rgba(180,230,255,0.35)');
    px(ctx, x + 14, y + 16 - wave * 2, 10, 2, 'rgba(180,230,255,0.28)');
    px(ctx, x + 6, y + 22 + wave, 8, 2, 'rgba(255,255,255,0.15)');
  }

  drawProp(ctx, tx, ty, kind, ox, oy) {
    const x = Math.floor(tx * TILE + ox);
    const y = Math.floor(ty * TILE + oy);
    const rnd = mulberry32(tx * 91 + ty * 53);

    if (kind === T.FENCE) {
      // posts + rails with shadow
      px(ctx, x + 6, y + 26, 20, 3, 'rgba(0,0,0,0.18)');
      px(ctx, x + 8, y + 6, 5, 22, '#5a3a22');
      px(ctx, x + 19, y + 6, 5, 22, '#5a3a22');
      px(ctx, x + 9, y + 6, 3, 20, '#7a5230');
      px(ctx, x + 20, y + 6, 3, 20, '#7a5230');
      px(ctx, x + 4, y + 10, 24, 4, '#6b4226');
      px(ctx, x + 4, y + 20, 24, 4, '#6b4226');
      px(ctx, x + 4, y + 10, 24, 1, '#8a6040');
      px(ctx, x + 4, y + 20, 24, 1, '#8a6040');
      return;
    }

    if (kind === T.TREE) {
      // shadow
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.beginPath();
      ctx.ellipse(x + 16, y + 28, 11, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // trunk
      px(ctx, x + 13, y + 16, 6, 14, '#6b4226');
      px(ctx, x + 14, y + 16, 2, 14, '#8a5a34');
      // canopy layers
      const sway = Math.sin(this.cloudPhase * 1.5 + tx) * 1.2;
      drawCanopy(ctx, x + 16 + sway, y + 12, 14, '#1a5c32');
      drawCanopy(ctx, x + 12 + sway, y + 10, 10, '#247a42');
      drawCanopy(ctx, x + 20 + sway * 0.5, y + 11, 9, '#2f8f4e');
      drawCanopy(ctx, x + 16 + sway, y + 8, 7, '#49a862');
      return;
    }

    if (kind === T.ROCK) {
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.beginPath();
      ctx.ellipse(x + 16, y + 26, 10, 3.5, 0, 0, Math.PI * 2);
      ctx.fill();
      px(ctx, x + 6, y + 14, 20, 12, '#7a8088');
      px(ctx, x + 8, y + 12, 16, 4, '#9aa2aa');
      px(ctx, x + 10, y + 16, 6, 3, '#b0b8c0');
      px(ctx, x + 18, y + 20, 5, 3, '#5e646c');
      return;
    }

    if (kind === T.FLOWER) {
      const colors = ['#e85d4c', '#f0c75e', '#e87ab8', '#7ec8ff'];
      const col = colors[Math.floor(rnd() * colors.length)];
      px(ctx, x + 15, y + 18, 2, 8, '#2f6b45');
      px(ctx, x + 12, y + 15, 3, 3, col);
      px(ctx, x + 17, y + 15, 3, 3, col);
      px(ctx, x + 14, y + 12, 3, 3, col);
      px(ctx, x + 15, y + 15, 2, 2, '#fff3a0');
      return;
    }

    if (kind === T.BUILDING || kind === T.DOOR || kind === T.BED || kind === T.COUNTER) {
      this.drawBuildingPiece(ctx, x, y, kind, tx, ty);
    }
  }

  drawBuildingPiece(ctx, x, y, kind, tx, ty) {
    const above = this.tile(tx, ty - 1);
    const below = this.tile(tx, ty + 1);
    const left = this.tile(tx - 1, ty);
    const right = this.tile(tx + 1, ty);
    const isWallish = (k) => k === T.BUILDING || k === T.DOOR || k === T.BED || k === T.COUNTER;
    const topEdge = !isWallish(above);
    const bottomEdge = !isWallish(below);

    // wall body
    px(ctx, x, y, TILE, TILE, '#9a6544');
    px(ctx, x, y, TILE, 3, '#7e4e32');
    for (let i = 0; i < 5; i++) {
      px(ctx, x + 2, y + 6 + i * 5, 28, 1, 'rgba(50,25,10,0.16)');
    }
    // side shading
    if (!isWallish(left)) px(ctx, x, y, 2, TILE, 'rgba(0,0,0,0.12)');
    if (!isWallish(right)) px(ctx, x + 30, y, 2, TILE, 'rgba(255,255,255,0.08)');

    if (kind === T.BUILDING && topEdge) {
      // single roof spanning this top tile
      ctx.fillStyle = '#b84e32';
      ctx.beginPath();
      ctx.moveTo(x - 4, y + 8);
      ctx.lineTo(x + 16, y - 10);
      ctx.lineTo(x + 36, y + 8);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = '#e07850';
      ctx.beginPath();
      ctx.moveTo(x - 1, y + 8);
      ctx.lineTo(x + 16, y - 6);
      ctx.lineTo(x + 22, y + 2);
      ctx.lineTo(x + 5, y + 8);
      ctx.closePath();
      ctx.fill();
      // ridge
      px(ctx, x + 14, y - 8, 4, 3, '#8a3a22');
      if ((tx + ty) % 4 === 0) {
        px(ctx, x + 22, y - 6, 6, 12, '#6b4226');
        px(ctx, x + 21, y - 7, 8, 3, '#4a2e18');
      }
    }

    if (kind === T.BUILDING) {
      // window only on mid wall tiles
      if (!topEdge || bottomEdge) {
        px(ctx, x + 10, y + 10, 12, 10, '#5a3a22');
        px(ctx, x + 11, y + 11, 10, 8, '#7ec8e8');
        px(ctx, x + 11, y + 11, 10, 2, 'rgba(255,255,255,0.35)');
        px(ctx, x + 15, y + 11, 2, 8, '#5a3a22');
        px(ctx, x + 11, y + 14, 10, 2, '#5a3a22');
      }
    }

    if (kind === T.DOOR) {
      px(ctx, x + 6, y + 4, 20, 28, '#2a1a0c');
      px(ctx, x + 7, y + 5, 18, 26, '#5a3a22');
      px(ctx, x + 9, y + 8, 6, 9, '#3d2914');
      px(ctx, x + 19, y + 16, 3, 3, '#f0c75e');
      px(ctx, x + 5, y + 30, 22, 2, '#8a6a40');
    }

    if (kind === T.BED) {
      px(ctx, x + 3, y + 8, 26, 20, '#2f5a9a');
      px(ctx, x + 3, y + 8, 26, 5, '#4c8fe8');
      px(ctx, x + 4, y + 6, 12, 8, '#f3e6c8');
      px(ctx, x + 5, y + 7, 10, 2, '#fff');
      px(ctx, x + 2, y + 26, 28, 3, '#5a3a22');
    }

    if (kind === T.COUNTER) {
      px(ctx, x + 2, y + 10, 28, 18, '#7a4e2e');
      px(ctx, x + 2, y + 8, 28, 4, '#e0c89a');
      px(ctx, x + 4, y + 14, 6, 6, '#c45c3a');
      px(ctx, x + 13, y + 14, 6, 6, '#4c8fe8');
      px(ctx, x + 22, y + 14, 6, 6, '#f0c75e');
    }
  }

  drawOverlay(ctx, tx, ty, ov, ox, oy, crops) {
    const x = Math.floor(tx * TILE + ox);
    const y = Math.floor(ty * TILE + oy);
    if (ov.type === 'wet' && ov.watered) {
      px(ctx, x + 4, y + 8, 8, 3, 'rgba(100,170,230,0.25)');
      return;
    }
    if (ov.type !== 'crop') return;

    const crop = crops?.[ov.crop];
    const stage = ov.stage || 0;
    const max = ov.maxStage || 4;
    const grown = stage >= max;
    const sprout = crop?.sproutColor || '#7cb342';
    const fruit = crop?.color || '#e8c96a';

    if (ov.watered) {
      px(ctx, x + 3, y + 22, 10, 3, 'rgba(90,160,220,0.22)');
      px(ctx, x + 16, y + 24, 8, 2, 'rgba(90,160,220,0.18)');
    }

    if (stage === 0) {
      px(ctx, x + 13, y + 20, 6, 4, '#6b4226');
      px(ctx, x + 14, y + 18, 2, 3, sprout);
      px(ctx, x + 17, y + 19, 2, 2, sprout);
      return;
    }

    const h = 8 + (stage / max) * 16;
    // stem
    px(ctx, x + 15, y + 28 - h, 2, h, sprout);
    px(ctx, x + 16, y + 28 - h, 1, h, '#9ccc65');

    // leaves
    if (stage >= 2) {
      px(ctx, x + 10, y + 26 - h + 4, 5, 3, sprout);
      px(ctx, x + 17, y + 28 - h + 6, 5, 3, sprout);
    }
    if (stage >= 3) {
      px(ctx, x + 9, y + 22 - h + 6, 6, 4, '#66bb6a');
      px(ctx, x + 18, y + 24 - h + 5, 5, 4, '#66bb6a');
    }

    if (grown) {
      // fruit / head
      ctx.fillStyle = fruit;
      ctx.beginPath();
      ctx.arc(x + 16, y + 12, 7, 0, Math.PI * 2);
      ctx.fill();
      px(ctx, x + 13, y + 9, 3, 2, 'rgba(255,255,255,0.35)');
      // sparkle
      const pulse = 0.4 + Math.sin(performance.now() / 180 + tx * 2) * 0.4;
      px(ctx, x + 22, y + 7, 2, 2, `rgba(255,255,200,${pulse})`);
      px(ctx, x + 10, y + 8, 2, 2, `rgba(255,255,200,${pulse * 0.7})`);
    }
  }

  drawPlayer(ctx, p, ox, oy) {
    const x = p.x * TILE + ox;
    const y = p.y * TILE + oy;
    const movingBob = Math.sin(performance.now() / 140 + p.x * 3) * (p.anim > 0 ? 0 : 1.2);
    const actionBob = p.anim > 0 ? Math.sin(performance.now() / 35) * 2.5 : 0;
    const bob = movingBob + actionBob;
    const dir = p.dir || 'down';
    const skin = '#f0c49a';
    const shirt = p.color || '#e85d4c';
    const pants = shadeColor(shirt, -35);
    const hair = '#3d2914';

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.28)';
    ctx.beginPath();
    ctx.ellipse(x, y + 12, 9, 3.5, 0, 0, Math.PI * 2);
    ctx.fill();

    // legs
    const legSwing = Math.sin(performance.now() / 120 + p.x) * 2;
    px(ctx, x - 6, y + 2 + bob, 5, 10, pants);
    px(ctx, x + 1, y + 2 + bob, 5, 10, pants);
    px(ctx, x - 6 + (dir === 'left' ? -legSwing : 0), y + 10 + bob, 5, 3, '#3d2914');
    px(ctx, x + 1 + (dir === 'right' ? legSwing : 0), y + 10 + bob, 5, 3, '#3d2914');

    // body
    px(ctx, x - 8, y - 12 + bob, 16, 14, shirt);
    px(ctx, x - 7, y - 11 + bob, 14, 3, shadeColor(shirt, 25));
    // overalls strap
    px(ctx, x - 6, y - 10 + bob, 3, 10, '#f0c75e');
    px(ctx, x + 3, y - 10 + bob, 3, 10, '#f0c75e');

    // arms
    px(ctx, x - 11, y - 10 + bob, 4, 10, shirt);
    px(ctx, x + 7, y - 10 + bob, 4, 10, shirt);
    px(ctx, x - 11, y - 1 + bob, 4, 3, skin);
    px(ctx, x + 7, y - 1 + bob, 4, 3, skin);

    // head
    px(ctx, x - 7, y - 24 + bob, 14, 12, skin);
    // hair / hat
    px(ctx, x - 8, y - 28 + bob, 16, 6, hair);
    px(ctx, x - 9, y - 24 + bob, 18, 4, '#c45c3a'); // straw hat brim
    px(ctx, x - 6, y - 30 + bob, 12, 6, '#e08a4a'); // hat top
    px(ctx, x - 5, y - 28 + bob, 10, 2, '#f0c75e');

    // face
    if (dir === 'down' || dir === 'left' || dir === 'right') {
      const eyeX = dir === 'left' ? -4 : dir === 'right' ? 2 : -3;
      px(ctx, x + eyeX, y - 20 + bob, 2, 2, '#1c140c');
      if (dir === 'down') px(ctx, x + 2, y - 20 + bob, 2, 2, '#1c140c');
      px(ctx, x - 1, y - 16 + bob, 3, 1, '#d4886a');
    }

    // nameplate
    ctx.font = '700 11px Nunito, sans-serif';
    ctx.textAlign = 'center';
    const label = p.self ? `${p.name} (du)` : p.name;
    const tw = ctx.measureText(label).width + 10;
    ctx.fillStyle = 'rgba(12,18,14,0.55)';
    roundRect(ctx, x - tw / 2, y - 44 + bob, tw, 14, 5);
    ctx.fill();
    ctx.fillStyle = '#f3e6c8';
    ctx.fillText(label, x, y - 33 + bob);
  }

  drawNpc(ctx, n, ox, oy) {
    const x = n.x * TILE + ox;
    const y = n.y * TILE + oy;
    const bob = Math.sin(performance.now() / 400 + n.x) * 0.8;
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    px(ctx, x - 7, y - 10 + bob, 14, 14, n.color || '#e87ab8');
    px(ctx, x - 6, y - 22 + bob, 12, 12, '#f0c49a');
    px(ctx, x - 7, y - 26 + bob, 14, 5, '#3d2914');
    ctx.font = '700 10px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12,18,14,0.55)';
    const label = n.name;
    const tw = ctx.measureText(label).width + 8;
    roundRect(ctx, x - tw / 2, y - 40 + bob, tw, 12, 4);
    ctx.fill();
    ctx.fillStyle = '#f0c75e';
    ctx.fillText(label, x, y - 31 + bob);
  }

  drawAnimal(ctx, a, tileX, tileY, ox, oy) {
    const x = tileX * TILE + ox + 16;
    const y = tileY * TILE + oy + 16;
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(x, y + 6, 8, 3, 0, 0, Math.PI * 2);
    ctx.fill();
    if (a.type === 'cow') {
      px(ctx, x - 10, y - 8, 20, 12, '#f3e6c8');
      px(ctx, x - 8, y - 6, 4, 4, '#3d2914');
      px(ctx, x + 4, y - 6, 4, 4, '#3d2914');
      px(ctx, x - 12, y - 12, 8, 8, '#f3e6c8');
    } else {
      px(ctx, x - 6, y - 6, 12, 10, '#f5f5f0');
      px(ctx, x - 4, y - 10, 8, 6, '#f5f5f0');
      px(ctx, x - 2, y - 8, 2, 2, '#1c140c');
      px(ctx, x + 2, y - 12, 2, 4, '#e85d4c');
    }
    if (a.ready) {
      px(ctx, x + 6, y - 14, 3, 3, '#f0c75e');
    }
  }
}

function drawCanopy(ctx, cx, cy, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

function shadeColor(hex, amt) {
  const c = hex.replace('#', '');
  const num = parseInt(c.length === 3 ? c.split('').map((x) => x + x).join('') : c, 16);
  let r = (num >> 16) + amt;
  let g = ((num >> 8) & 0xff) + amt;
  let b = (num & 0xff) + amt;
  r = Math.max(0, Math.min(255, r));
  g = Math.max(0, Math.min(255, g));
  b = Math.max(0, Math.min(255, b));
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, '0')}`;
}
