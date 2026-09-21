/** Pixel-art style canvas renderer for Hofdorf */

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

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.camX = 0;
    this.camY = 0;
    this.tiles = null;
    this.worldW = 80;
    this.worldH = 60;
    this.dpr = 1;
    this.shake = 0;
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
    const targetY = py * TILE - viewH / 2;
    this.camX += (targetX - this.camX) * 0.18;
    this.camY += (targetY - this.camY) * 0.18;
    const maxX = this.worldW * TILE - viewW;
    const maxY = this.worldH * TILE - viewH;
    this.camX = Math.max(0, Math.min(maxX, this.camX));
    this.camY = Math.max(0, Math.min(maxY, this.camY));
  }

  skyColor(timeStr, weather) {
    const [hh, mm] = (timeStr || '12:00').split(':').map(Number);
    const t = hh + mm / 60;
    let top, bot;
    if (t < 6 || t >= 21) {
      top = '#0b1524';
      bot = '#1a2740';
    } else if (t < 8) {
      top = '#f0a060';
      bot = '#7eb6d9';
    } else if (t < 17) {
      top = weather === 'regen' ? '#6a7f90' : weather === 'bewölkt' ? '#9bb4c4' : '#7eb6d9';
      bot = weather === 'regen' ? '#8aa0b0' : '#b7d8ef';
    } else if (t < 19) {
      top = '#e07850';
      bot = '#5a7ea0';
    } else {
      top = '#2a3a60';
      bot = '#1a2840';
    }
    return { top, bot };
  }

  draw(state, crops) {
    const ctx = this.ctx;
    const w = window.innerWidth;
    const h = window.innerHeight;
    const sky = this.skyColor(state.time, state.weather);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, sky.top);
    g.addColorStop(1, sky.bot);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);

    const me = state.players.find((p) => p.self) || state.players[0];
    if (me) this.follow(me.x, me.y);

    let ox = -this.camX;
    let oy = -this.camY;
    if (this.shake > 0) {
      ox += (Math.random() - 0.5) * this.shake * 4;
      oy += (Math.random() - 0.5) * this.shake * 4;
      this.shake *= 0.85;
    }

    const x0 = Math.max(0, Math.floor(this.camX / TILE) - 1);
    const y0 = Math.max(0, Math.floor(this.camY / TILE) - 1);
    const x1 = Math.min(this.worldW, Math.ceil((this.camX + w) / TILE) + 1);
    const y1 = Math.min(this.worldH, Math.ceil((this.camY + h) / TILE) + 1);

    for (let ty = y0; ty < y1; ty++) {
      for (let tx = x0; tx < x1; tx++) {
        this.drawTile(ctx, tx, ty, ox, oy, state);
      }
    }

    // Farm labels
    if (state.farms) {
      ctx.font = '700 12px Nunito, sans-serif';
      ctx.textAlign = 'center';
      for (const farm of state.farms) {
        const owner = state.players.find((p) => p.id === farm.ownerId);
        const label = owner ? `${farm.name} · ${owner.name}` : `${farm.name} · frei`;
        const lx = farm.ox * TILE + (farm.w * TILE) / 2 + ox;
        const ly = farm.oy * TILE + 14 + oy;
        ctx.fillStyle = 'rgba(0,0,0,0.45)';
        const tw = ctx.measureText(label).width + 12;
        ctx.fillRect(lx - tw / 2, ly - 12, tw, 18);
        ctx.fillStyle = '#f3e6c8';
        ctx.fillText(label, lx, ly);
      }
    }

    // Overlays / crops
    if (state.overlays) {
      for (const [key, ov] of Object.entries(state.overlays)) {
        const [tx, ty] = key.split(',').map(Number);
        if (tx < x0 || tx >= x1 || ty < y0 || ty >= y1) continue;
        this.drawOverlay(ctx, tx, ty, ov, ox, oy, crops);
      }
    }

    // Players sorted by y
    const sorted = [...state.players].sort((a, b) => a.y - b.y);
    for (const p of sorted) this.drawPlayer(ctx, p, ox, oy);

    // Day veil
    const [hh] = (state.time || '12:00').split(':').map(Number);
    if (hh < 6 || hh >= 20) {
      ctx.fillStyle = 'rgba(10, 16, 40, 0.35)';
      ctx.fillRect(0, 0, w, h);
    } else if (state.weather === 'regen') {
      ctx.fillStyle = 'rgba(40, 60, 80, 0.12)';
      ctx.fillRect(0, 0, w, h);
      this.drawRain(ctx, w, h);
    }

    // Soft vignette
    const vig = ctx.createRadialGradient(w / 2, h / 2, h * 0.35, w / 2, h / 2, h * 0.85);
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.28)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, w, h);
  }

  drawRain(ctx, w, h) {
    ctx.strokeStyle = 'rgba(200,220,255,0.35)';
    ctx.lineWidth = 1;
    const t = performance.now() / 30;
    for (let i = 0; i < 60; i++) {
      const x = ((i * 97 + t * 3) % w);
      const y = ((i * 53 + t * 8) % h);
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x - 2, y + 10);
      ctx.stroke();
    }
  }

  drawTile(ctx, tx, ty, ox, oy, state) {
    const kind = this.tile(tx, ty);
    const x = tx * TILE + ox;
    const y = ty * TILE + oy;
    const rnd = mulberry32(tx * 374761 + ty * 668265);

    if (kind === T.GRASS || kind === T.FLOWER || kind === T.TREE || kind === T.ROCK) {
      const shade = rnd() > 0.5 ? '#3d8f55' : '#347a49';
      ctx.fillStyle = shade;
      ctx.fillRect(x, y, TILE, TILE);
      if (rnd() > 0.7) {
        ctx.fillStyle = 'rgba(255,255,255,0.08)';
        ctx.fillRect(x + 4, y + 6, 3, 3);
      }
    }

    if (kind === T.PATH) {
      ctx.fillStyle = '#c2a06a';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#b08c58';
      ctx.fillRect(x + 2, y + 2, 6, 4);
      ctx.fillRect(x + 18, y + 20, 8, 5);
    }

    if (kind === T.DIRT) {
      const wet = state.overlays?.[`${tx},${ty}`]?.watered;
      ctx.fillStyle = wet ? '#5a3a22' : '#7a5230';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = wet ? '#4a2e18' : '#6a4528';
      ctx.fillRect(x + 2, y + 8, TILE - 4, 3);
      ctx.fillRect(x + 2, y + 18, TILE - 4, 3);
    }

    if (kind === T.WATER) {
      const wave = Math.sin(performance.now() / 400 + tx + ty) * 2;
      ctx.fillStyle = '#2f6f9e';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#3f8fbe';
      ctx.fillRect(x + 4, y + 10 + wave, 10, 4);
      ctx.fillRect(x + 16, y + 18 - wave, 8, 3);
    }

    if (kind === T.FLOOR) {
      ctx.fillStyle = '#d8c49a';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(0,0,0,0.08)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }

    if (kind === T.FENCE) {
      ctx.fillStyle = '#3d8f55';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(x + 12, y + 4, 8, 24);
      ctx.fillRect(x + 4, y + 10, 24, 5);
      ctx.fillRect(x + 4, y + 20, 24, 5);
    }

    if (kind === T.BUILDING || kind === T.BED || kind === T.COUNTER || kind === T.DOOR) {
      ctx.fillStyle = '#8b5a3c';
      ctx.fillRect(x, y, TILE, TILE);
      if (kind === T.BUILDING) {
        ctx.fillStyle = '#6e3f28';
        ctx.fillRect(x, y, TILE, 8);
        ctx.fillStyle = '#c45c3a';
        ctx.beginPath();
        ctx.moveTo(x - 2, y + 8);
        ctx.lineTo(x + TILE / 2, y - 6);
        ctx.lineTo(x + TILE + 2, y + 8);
        ctx.fill();
      }
      if (kind === T.DOOR) {
        ctx.fillStyle = '#3d2914';
        ctx.fillRect(x + 8, y + 8, 16, 24);
        ctx.fillStyle = '#f0c75e';
        ctx.fillRect(x + 18, y + 18, 3, 3);
      }
      if (kind === T.BED) {
        ctx.fillStyle = '#3d8f55';
        ctx.fillRect(x, y, TILE, TILE);
        ctx.fillStyle = '#4c8fe8';
        ctx.fillRect(x + 4, y + 8, 24, 18);
        ctx.fillStyle = '#f3e6c8';
        ctx.fillRect(x + 6, y + 6, 12, 8);
      }
      if (kind === T.COUNTER) {
        ctx.fillStyle = '#a07040';
        ctx.fillRect(x + 2, y + 10, 28, 16);
        ctx.fillStyle = '#d8c49a';
        ctx.fillRect(x + 2, y + 8, 28, 4);
      }
    }

    if (kind === T.TREE) {
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(x + 13, y + 18, 6, 12);
      ctx.fillStyle = '#1f6b38';
      ctx.beginPath();
      ctx.arc(x + 16, y + 14, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f8f4a';
      ctx.beginPath();
      ctx.arc(x + 12, y + 12, 7, 0, Math.PI * 2);
      ctx.fill();
    }

    if (kind === T.ROCK) {
      ctx.fillStyle = '#7a7f88';
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 22);
      ctx.lineTo(x + 10, y + 10);
      ctx.lineTo(x + 24, y + 8);
      ctx.lineTo(x + 28, y + 22);
      ctx.fill();
      ctx.fillStyle = '#9aa0aa';
      ctx.fillRect(x + 12, y + 12, 6, 4);
    }

    if (kind === T.FLOWER) {
      ctx.fillStyle = rnd() > 0.5 ? '#e85d4c' : '#f0c75e';
      ctx.beginPath();
      ctx.arc(x + 16, y + 16, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#2f6b45';
      ctx.fillRect(x + 15, y + 18, 2, 6);
    }
  }

  drawOverlay(ctx, tx, ty, ov, ox, oy, crops) {
    const x = tx * TILE + ox;
    const y = ty * TILE + oy;
    if (ov.type === 'wet' && ov.watered) {
      ctx.fillStyle = 'rgba(40, 80, 140, 0.2)';
      ctx.fillRect(x, y, TILE, TILE);
    }
    if (ov.type !== 'crop') return;
    const crop = crops?.[ov.crop];
    const stage = ov.stage || 0;
    const max = ov.maxStage || 4;
    const grown = stage >= max;

    if (ov.watered) {
      ctx.fillStyle = 'rgba(40, 80, 140, 0.18)';
      ctx.fillRect(x, y, TILE, TILE);
    }

    if (stage === 0) {
      ctx.fillStyle = '#6b4226';
      ctx.fillRect(x + 14, y + 20, 4, 4);
      return;
    }

    const h = 6 + (stage / max) * 18;
    ctx.fillStyle = crop?.sproutColor || '#7cb342';
    ctx.fillRect(x + 15, y + 28 - h, 3, h);

    if (stage >= 2) {
      ctx.beginPath();
      ctx.arc(x + 12, y + 28 - h + 4, 3 + stage * 0.5, 0, Math.PI * 2);
      ctx.arc(x + 20, y + 28 - h + 6, 3 + stage * 0.4, 0, Math.PI * 2);
      ctx.fill();
    }

    if (grown) {
      ctx.fillStyle = crop?.color || '#e8c96a';
      ctx.beginPath();
      ctx.arc(x + 16, y + 12, 7, 0, Math.PI * 2);
      ctx.fill();
      // sparkle
      const pulse = 0.5 + Math.sin(performance.now() / 200 + tx) * 0.5;
      ctx.fillStyle = `rgba(255,255,200,${0.35 + pulse * 0.35})`;
      ctx.fillRect(x + 20, y + 8, 3, 3);
    }
  }

  drawPlayer(ctx, p, ox, oy) {
    const x = p.x * TILE + ox;
    const y = p.y * TILE + oy;
    const bob = p.anim > 0 ? Math.sin(performance.now() / 40) * 2 : Math.sin(performance.now() / 200 + p.x) * 1;

    // shadow
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.beginPath();
    ctx.ellipse(x, y + 10, 10, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // body
    ctx.fillStyle = p.color || '#e85d4c';
    ctx.fillRect(x - 8, y - 18 + bob, 16, 18);
    // head
    ctx.fillStyle = '#f1c27d';
    ctx.fillRect(x - 7, y - 30 + bob, 14, 12);
    // hair
    ctx.fillStyle = '#3d2914';
    ctx.fillRect(x - 7, y - 32 + bob, 14, 5);
    // eyes
    ctx.fillStyle = '#1c140c';
    if (p.dir === 'left') {
      ctx.fillRect(x - 5, y - 26 + bob, 2, 2);
    } else if (p.dir === 'right') {
      ctx.fillRect(x + 3, y - 26 + bob, 2, 2);
    } else if (p.dir === 'up') {
      // back of head
    } else {
      ctx.fillRect(x - 4, y - 26 + bob, 2, 2);
      ctx.fillRect(x + 2, y - 26 + bob, 2, 2);
    }

    // nameplate
    ctx.font = '700 11px Nunito, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const label = p.self ? `${p.name} (du)` : p.name;
    const tw = ctx.measureText(label).width + 8;
    ctx.fillRect(x - tw / 2, y - 46 + bob, tw, 14);
    ctx.fillStyle = '#f3e6c8';
    ctx.fillText(label, x, y - 35 + bob);
  }
}
