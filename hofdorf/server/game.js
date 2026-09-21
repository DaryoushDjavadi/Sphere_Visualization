import { CROPS, TOOLS, createEmptyInventory, HOTBAR_SLOTS } from './crops.js';
import {
  T,
  tileAt,
  setTile,
  overlayKey,
  canWalk,
  zoneAt,
  farmForOwner,
  assignFarm,
  releaseFarm,
  serializeTiles,
  farmDisplayName,
  WORLD_W,
  WORLD_H,
} from './world.js';
import { createShops, isShopMember } from './shops.js';

const PLAYER_SPEED = 4.2; // tiles per second
const TICK_MS = 50;
const DAY_LENGTH_REAL_MS = 12 * 60 * 1000; // 12 real minutes = 1 game day (6:00–2:00)
const WAKE_MINUTES = 6 * 60;
const SLEEP_MINUTES = 26 * 60; // 2:00 next calendar day stretch

export class Game {
  constructor(world) {
    this.world = world;
    this.players = new Map(); // id -> player
    this.chat = [];
    this.lastTick = Date.now();
    this.dayAccum = 0;
    this.shops = createShops();
  }

  addPlayer(id, name) {
    const farm = assignFarm(this.world, id);
    const colors = ['#e85d4c', '#4c8fe8', '#e8c84c', '#4ce88a', '#c44ce8', '#e87a4c'];
    const color = colors[this.players.size % colors.length];
    const spawn = farm
      ? { x: farm.spawn.x + 0.5, y: farm.spawn.y + 0.5 }
      : { x: 40.5, y: 30.5 };

    const player = {
      id,
      name: (name || 'Bauer').slice(0, 16),
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      dir: 'down',
      color,
      energy: 100,
      maxEnergy: 100,
      gold: 1500,
      inventory: createEmptyInventory(),
      hotbar: [...HOTBAR_SLOTS],
      selected: 0,
      farmId: farm?.id || null,
      facing: { x: 0, y: 1 },
      actionCooldown: 0,
      anim: 0,
    };
    this.players.set(id, player);
    this.pushChat('system', `${player.name} hat den Hof betreten.`);
    return player;
  }

  removePlayer(id) {
    const p = this.players.get(id);
    if (p) {
      this.pushChat('system', `${p.name} ist gegangen.`);
      releaseFarm(this.world, id);
      this.players.delete(id);
    }
  }

  pushChat(from, text) {
    this.chat.push({ from, text, t: Date.now() });
    if (this.chat.length > 40) this.chat.shift();
  }

  setInput(id, input) {
    const p = this.players.get(id);
    if (!p) return;
    p.input = {
      up: !!input.up,
      down: !!input.down,
      left: !!input.left,
      right: !!input.right,
      action: !!input.action,
      select: typeof input.select === 'number' ? input.select : p.selected,
    };
    if (typeof input.select === 'number') {
      p.selected = Math.max(0, Math.min(7, input.select));
    }
  }

  tryAction(id, payload = {}) {
    const p = this.players.get(id);
    if (!p) return null;
    if (p.actionCooldown > 0) return { error: 'Kurz warten…' };
    if (payload.sleep) return this.sleep(p);
    if (payload.shop) return this.shop(p, payload);
    if (payload.renameFarm) return this.renameFarm(p, payload.renameFarm);
    if (payload.chat) {
      this.pushChat(p.name, String(payload.chat).slice(0, 80));
      return { ok: true };
    }

    const fx = Math.floor(p.x) + p.facing.x;
    const fy = Math.floor(p.y) + p.facing.y;
    const slot = p.hotbar[p.selected];
    p.actionCooldown = 0.18;
    p.anim = 0.3;

    // Prefer facing tile; fall back to tile under feet (friendlier on mobile)
    let result = this.useOnTile(p, slot, fx, fy);
    if (result?.error) {
      const under = this.useOnTile(p, slot, Math.floor(p.x), Math.floor(p.y));
      if (!under?.error) result = under;
    }
    return result;
  }

  facingFromInput(p) {
    if (!p.input) return;
    const { up, down, left, right } = p.input;
    if (up && !down) {
      p.facing = { x: 0, y: -1 };
      p.dir = 'up';
    } else if (down && !up) {
      p.facing = { x: 0, y: 1 };
      p.dir = 'down';
    } else if (left && !right) {
      p.facing = { x: -1, y: 0 };
      p.dir = 'left';
    } else if (right && !left) {
      p.facing = { x: 1, y: 0 };
      p.dir = 'right';
    }
  }

  useOnTile(p, slot, x, y) {
    const kind = tileAt(this.world, x, y);
    const key = overlayKey(x, y);
    const overlay = this.world.overlays[key];
    const zone = zoneAt(this.world, x, y);

    // Sleep at own bed
    if (kind === T.BED) {
      const farm = farmForOwner(this.world, p.id);
      if (farm && farm.bed.x === x && farm.bed.y === y) {
        return this.sleep(p);
      }
    }

    // Shop door interaction handled via shop panel — also allow sell-all near counter
    if (kind === T.COUNTER || kind === T.DOOR) {
      const shop = this.world.town.shop;
      if (Math.abs(x - shop.x) <= 2 && Math.abs(y - shop.y) <= 2) {
        return { shop: true };
      }
    }

    if (slot === 'hoe') {
      if (p.energy < TOOLS.hoe.energy) return { error: 'Keine Energie' };
      if (kind === T.GRASS || kind === T.PATH || kind === T.FLOWER) {
        // Only till on own farm field-ish (or any grass on own farm)
        if (zone.type === 'farm' && zone.farm.ownerId && zone.farm.ownerId !== p.id) {
          return { error: 'Fremder Hof — nur anschauen' };
        }
        setTile(this.world, x, y, T.DIRT);
        p.energy -= TOOLS.hoe.energy;
        return { ok: true, tilled: true };
      }
      return { error: 'Hier kann man nicht hacken' };
    }

    if (slot === 'can') {
      if (p.energy < TOOLS.can.energy) return { error: 'Keine Energie' };
      if (kind === T.DIRT || overlay) {
        if (zone.type === 'farm' && zone.farm.ownerId && zone.farm.ownerId !== p.id) {
          return { error: 'Fremder Hof — nur anschauen' };
        }
        if (overlay && overlay.type === 'crop') {
          overlay.watered = true;
        } else if (kind === T.DIRT) {
          this.world.overlays[key] = this.world.overlays[key] || { type: 'wet' };
          if (this.world.overlays[key].type === 'wet' || this.world.overlays[key].type === 'crop') {
            this.world.overlays[key].watered = true;
          }
        }
        p.energy -= TOOLS.can.energy;
        return { ok: true, watered: true };
      }
      return { error: 'Nichts zu gießen' };
    }

    if (slot === 'axe') {
      if (p.energy < TOOLS.axe.energy) return { error: 'Keine Energie' };
      if (kind === T.TREE) {
        setTile(this.world, x, y, T.GRASS);
        p.inventory.wood = (p.inventory.wood || 0) + 1 + Math.floor(Math.random() * 2);
        p.energy -= TOOLS.axe.energy;
        return { ok: true, wood: true };
      }
      return { error: 'Kein Baum' };
    }

    if (slot === 'pickaxe') {
      if (p.energy < TOOLS.pickaxe.energy) return { error: 'Keine Energie' };
      if (kind === T.ROCK) {
        setTile(this.world, x, y, T.GRASS);
        p.inventory.stone = (p.inventory.stone || 0) + 1;
        p.energy -= TOOLS.pickaxe.energy;
        return { ok: true, stone: true };
      }
      // Clear crop / untilled dirt back
      if (overlay && overlay.type === 'crop') {
        if (zone.type === 'farm' && zone.farm.ownerId && zone.farm.ownerId !== p.id) {
          return { error: 'Fremder Hof' };
        }
        delete this.world.overlays[key];
        setTile(this.world, x, y, T.GRASS);
        p.energy -= TOOLS.pickaxe.energy;
        return { ok: true };
      }
      if (kind === T.DIRT) {
        setTile(this.world, x, y, T.GRASS);
        delete this.world.overlays[key];
        p.energy -= TOOLS.pickaxe.energy;
        return { ok: true };
      }
      return { error: 'Nichts abzubauen' };
    }

    if (slot === 'scythe') {
      if (overlay && overlay.type === 'crop' && overlay.stage >= overlay.maxStage) {
        if (zone.type === 'farm' && zone.farm.ownerId && zone.farm.ownerId !== p.id) {
          return { error: 'Fremder Hof — nur anschauen' };
        }
        const crop = CROPS[overlay.crop];
        if (!crop) return { error: 'Unbekannte Pflanze' };
        p.inventory[overlay.crop] = (p.inventory[overlay.crop] || 0) + 1;
        if (crop.regrow) {
          overlay.stage = Math.max(1, overlay.maxStage - 2);
          overlay.days = 0;
          overlay.watered = false;
        } else {
          delete this.world.overlays[key];
          setTile(this.world, x, y, T.DIRT);
        }
        if (p.energy >= TOOLS.scythe.energy) p.energy -= TOOLS.scythe.energy;
        return { ok: true, harvest: crop.name };
      }
      // Cut flowers / grass fluff
      if (kind === T.FLOWER) {
        setTile(this.world, x, y, T.GRASS);
        return { ok: true };
      }
      return { error: 'Nichts zu ernten' };
    }

    // Seeds
    if (slot && slot.endsWith('_seed')) {
      const cropId = slot.replace('_seed', '');
      const crop = CROPS[cropId];
      if (!crop) return { error: 'Unbekannter Samen' };
      if ((p.inventory[slot] || 0) <= 0) return { error: 'Keine Samen' };
      if (kind !== T.DIRT) return { error: 'Erst den Boden hacken' };
      if (overlay && overlay.type === 'crop') return { error: 'Schon bepflanzt' };
      if (zone.type === 'farm' && zone.farm.ownerId && zone.farm.ownerId !== p.id) {
        return { error: 'Fremder Hof — nur anschauen' };
      }
      p.inventory[slot] -= 1;
      this.world.overlays[key] = {
        type: 'crop',
        crop: cropId,
        stage: 0,
        maxStage: crop.stages,
        days: 0,
        growDays: crop.growDays,
        watered: false,
      };
      return { ok: true, planted: crop.name };
    }

    return { error: 'Nichts passiert' };
  }

  renameFarm(p, rawName) {
    const farm = farmForOwner(this.world, p.id);
    if (!farm) return { error: 'Kein eigener Hof' };
    const name = String(rawName || '')
      .trim()
      .replace(/\s+/g, ' ')
      .slice(0, 18);
    if (name.length < 2) return { error: 'Name zu kurz' };
    farm.customName = name;
    this.pushChat('system', `${p.name} nennt den Hof „${name}“.`);
    return { ok: true, farmName: name };
  }

  sleep(p) {
    this.advanceDay();
    p.energy = p.maxEnergy;
    p.x = (farmForOwner(this.world, p.id)?.spawn.x || p.x) + 0.5;
    p.y = (farmForOwner(this.world, p.id)?.spawn.y || p.y) + 0.5;
    this.pushChat('system', `${p.name} schläft — neuer Tag bricht an.`);
    return { ok: true, slept: true, day: this.world.day };
  }

  shop(p, payload) {
    if (payload.buy) {
      const cropId = payload.buy;
      const crop = CROPS[cropId];
      if (!crop) return { error: 'Unbekannt' };
      const seedKey = `${cropId}_seed`;
      if (p.gold < crop.seedPrice) return { error: 'Zu wenig Gold' };
      p.gold -= crop.seedPrice;
      p.inventory[seedKey] = (p.inventory[seedKey] || 0) + 1;
      const seedShop = this.shops.find((s) => s.id === 'seeds');
      if (seedShop?.ownerId) seedShop.earnings += Math.floor(crop.seedPrice * 0.35);
      return { ok: true, bought: crop.seedName };
    }
    if (payload.sell) {
      let earned = 0;
      for (const crop of Object.values(CROPS)) {
        const n = p.inventory[crop.id] || 0;
        if (n > 0) {
          earned += n * crop.sellPrice;
          p.inventory[crop.id] = 0;
        }
      }
      p.gold += earned;
      return { ok: true, earned };
    }
    if (payload.claim) return this.claimShop(p, payload.claim);
    if (payload.invite) return this.invitePartner(p, payload.shopId, payload.invite);
    if (payload.deposit) return this.depositToShop(p, payload.shopId, payload.deposit, payload.qty || 1);
    if (payload.produce) return this.runRecipe(p, payload.shopId, payload.produce);
    if (payload.collect) return this.collectEarnings(p, payload.shopId);
    return { shop: true };
  }

  getShop(id) {
    return this.shops.find((s) => s.id === id) || null;
  }

  claimShop(p, shopId) {
    const shop = this.getShop(shopId);
    if (!shop) return { error: 'Laden unbekannt' };
    if (shop.ownerId) return { error: 'Bereits übernommen' };
    if (p.gold < shop.claimPrice) return { error: 'Zu wenig Gold' };
    if (this.shops.some((s) => s.ownerId === p.id)) return { error: 'Du hast schon einen Laden' };
    p.gold -= shop.claimPrice;
    shop.ownerId = p.id;
    shop.ownerName = p.name;
    shop.partners = [];
    this.pushChat('system', `${p.name} übernimmt ${shop.name}!`);
    return { ok: true, claimed: shop.name };
  }

  invitePartner(p, shopId, partnerName) {
    const shop = this.getShop(shopId);
    if (!shop) return { error: 'Laden unbekannt' };
    if (shop.ownerId !== p.id) return { error: 'Nur der Besitzer lädt ein' };
    const partner = [...this.players.values()].find(
      (o) => o.name.toLowerCase() === String(partnerName || '').trim().toLowerCase(),
    );
    if (!partner) return { error: 'Spieler nicht online' };
    if (partner.id === p.id) return { error: 'Das bist du selbst' };
    if (shop.partners.some((x) => x.id === partner.id)) return { error: 'Schon Teilhaber' };
    if (shop.partners.length >= 3) return { error: 'Max. 3 Teilhaber' };
    shop.partners.push({ id: partner.id, name: partner.name });
    this.pushChat('system', `${partner.name} ist Teilhaber von ${shop.name}.`);
    return { ok: true, partner: partner.name };
  }

  depositToShop(p, shopId, item, qty) {
    const shop = this.getShop(shopId);
    if (!shop) return { error: 'Laden unbekannt' };
    if (!isShopMember(shop, p.id)) return { error: 'Kein Zugang' };
    qty = Math.max(1, Math.min(99, Number(qty) || 1));
    if ((p.inventory[item] || 0) < qty) return { error: 'Nicht genug im Inventar' };
    p.inventory[item] -= qty;
    shop.vault[item] = (shop.vault[item] || 0) + qty;
    return { ok: true, deposited: `${qty}× ${item}` };
  }

  runRecipe(p, shopId, recipeId) {
    const shop = this.getShop(shopId);
    if (!shop) return { error: 'Laden unbekannt' };
    if (!isShopMember(shop, p.id)) return { error: 'Kein Zugang' };
    if (!shop.recipes) return { error: 'Keine Rezepte' };
    const recipe = shop.recipes.find((r) => r.id === recipeId);
    if (!recipe) return { error: 'Rezept unbekannt' };
    for (const [item, need] of Object.entries(recipe.needs)) {
      if ((shop.vault[item] || 0) < need) return { error: `Fehlt: ${item}` };
    }
    for (const [item, need] of Object.entries(recipe.needs)) {
      shop.vault[item] -= need;
    }
    shop.earnings += recipe.gold;
    this.pushChat('system', `${shop.name}: ${recipe.name} (+${recipe.gold} Gold)`);
    return { ok: true, produced: recipe.name, gold: recipe.gold };
  }

  collectEarnings(p, shopId) {
    const shop = this.getShop(shopId);
    if (!shop) return { error: 'Laden unbekannt' };
    if (!isShopMember(shop, p.id)) return { error: 'Kein Zugang' };
    if (shop.earnings <= 0) return { error: 'Keine Einnahmen' };
    const members = [{ id: shop.ownerId, name: shop.ownerName }, ...shop.partners];
    const share = Math.floor(shop.earnings / members.length);
    const rest = shop.earnings - share * members.length;
    for (const m of members) {
      const pl = this.players.get(m.id);
      if (pl) pl.gold += share + (m.id === shop.ownerId ? rest : 0);
    }
    const paid = shop.earnings;
    shop.earnings = 0;
    shop.lastPayout = paid;
    return { ok: true, collected: paid, share };
  }

  runShopMorning() {
    for (const shop of this.shops) {
      if (!shop.ownerId) continue;
      if (shop.kind === 'seeds') {
        shop.earnings += 25;
        continue;
      }
      if (!shop.recipes) continue;
      for (const recipe of shop.recipes) {
        const ok = Object.entries(recipe.needs).every(
          ([item, need]) => (shop.vault[item] || 0) >= need,
        );
        if (!ok) continue;
        for (const [item, need] of Object.entries(recipe.needs)) {
          shop.vault[item] -= need;
        }
        shop.earnings += recipe.gold;
        this.pushChat('system', `${shop.name} produziert ${recipe.name}.`);
        break;
      }
    }
  }

  advanceDay() {
    this.world.day += 1;
    this.world.timeMinutes = WAKE_MINUTES;
    this.dayAccum = 0;

    for (const [key, ov] of Object.entries(this.world.overlays)) {
      if (ov.type !== 'crop') {
        if (ov.type === 'wet') delete this.world.overlays[key];
        continue;
      }
      if (ov.watered) {
        ov.days += 1;
        const progress = ov.days / ov.growDays;
        ov.stage = Math.min(ov.maxStage, Math.floor(progress * ov.maxStage));
        if (ov.days >= ov.growDays) ov.stage = ov.maxStage;
      }
      ov.watered = false;
    }

    this.runShopMorning();

    const roll = Math.random();
    this.world.weather = roll < 0.7 ? 'sonnig' : roll < 0.9 ? 'bewölkt' : 'regen';
    if (this.world.weather === 'regen') {
      for (const ov of Object.values(this.world.overlays)) {
        if (ov.type === 'crop') ov.watered = true;
      }
    }

    if (this.world.day % 28 === 1 && this.world.day > 1) {
      const seasons = ['Frühling', 'Sommer', 'Herbst', 'Winter'];
      const i = seasons.indexOf(this.world.season);
      this.world.season = seasons[(i + 1) % 4];
    }
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;

    // Shared clock
    this.dayAccum += dt * 1000;
    const dayProgress = this.dayAccum / DAY_LENGTH_REAL_MS;
    const span = SLEEP_MINUTES - WAKE_MINUTES; // minutes in a playable day
    this.world.timeMinutes = WAKE_MINUTES + dayProgress * span;
    if (this.world.timeMinutes >= SLEEP_MINUTES) {
      this.advanceDay();
      for (const p of this.players.values()) {
        p.energy = Math.min(p.maxEnergy, p.energy + 40);
      }
      this.pushChat('system', `Tag ${this.world.day} — ${this.world.season}, ${this.world.weather}`);
    }

    for (const p of this.players.values()) {
      if (p.actionCooldown > 0) p.actionCooldown -= dt;
      if (p.anim > 0) p.anim -= dt;

      let mx = 0;
      let my = 0;
      if (p.input) {
        if (p.input.up) my -= 1;
        if (p.input.down) my += 1;
        if (p.input.left) mx -= 1;
        if (p.input.right) mx += 1;
        if (p.input.action) {
          p.input.action = false;
          this.tryAction(p.id);
        }
      }
      this.facingFromInput(p);

      if (mx || my) {
        const len = Math.hypot(mx, my) || 1;
        mx /= len;
        my /= len;
        const nx = p.x + mx * PLAYER_SPEED * dt;
        const ny = p.y + my * PLAYER_SPEED * dt;
        // Axis-separated collision
        if (canWalk(this.world, nx, p.y)) p.x = nx;
        if (canWalk(this.world, p.x, ny)) p.y = ny;
        // Clamp
        p.x = Math.max(0.3, Math.min(WORLD_W - 0.3, p.x));
        p.y = Math.max(0.3, Math.min(WORLD_H - 0.3, p.y));
      }
    }
  }

  formatTime() {
    const m = Math.floor(this.world.timeMinutes);
    const hh = Math.floor(m / 60) % 24;
    const mm = m % 60;
    return `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  }

  snapshotFor(playerId) {
    const players = [];
    for (const p of this.players.values()) {
      players.push({
        id: p.id,
        name: p.name,
        x: p.x,
        y: p.y,
        dir: p.dir,
        color: p.color,
        anim: p.anim,
        farmId: p.farmId,
        energy: p.energy,
        maxEnergy: p.maxEnergy,
        gold: p.gold,
        inventory: p.inventory,
        hotbar: p.hotbar,
        selected: p.selected,
        self: p.id === playerId,
      });
    }

    return {
      type: 'state',
      you: playerId,
      day: this.world.day,
      season: this.world.season,
      time: this.formatTime(),
      weather: this.world.weather,
      farms: this.world.farms.map((f) => ({
        id: f.id,
        name: f.name,
        customName: f.customName,
        displayName: farmDisplayName(f),
        ownerId: f.ownerId,
        ox: f.ox,
        oy: f.oy,
        w: f.w,
        h: f.h,
      })),
      town: this.world.town,
      overlays: this.world.overlays,
      shops: this.shops.map((s) => ({
        id: s.id,
        name: s.name,
        blurb: s.blurb,
        claimPrice: s.claimPrice,
        x: s.x,
        y: s.y,
        kind: s.kind,
        recipes: s.recipes,
        ownerId: s.ownerId,
        ownerName: s.ownerName,
        partners: s.partners,
        vault: s.vault,
        earnings: s.earnings,
      })),
      players,
      chat: this.chat.slice(-12),
    };
  }

  fullJoinPayload(playerId) {
    const snap = this.snapshotFor(playerId);
    return {
      ...snap,
      type: 'welcome',
      tiles: serializeTiles(this.world),
      worldW: WORLD_W,
      worldH: WORLD_H,
      crops: CROPS,
    };
  }
}

export { TICK_MS };
