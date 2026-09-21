import { CROPS, TOOLS, createEmptyInventory, HOTBAR_SLOTS, createDefaultToolLevels, toolEnergy, ANIMALS } from './crops.js';
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
import {
  attachSystems,
  systemsTick,
  systemsMorning,
  handleExtraAction,
  sellPrice,
} from './systems.js';
import { loadSave, writeSave } from './save.js';
import { createFarmAnimals } from './content.js';

const PLAYER_SPEED = 4.2; // tiles per second
const TICK_MS = 50;
const DAY_LENGTH_REAL_MS = 12 * 60 * 1000; // 12 real minutes = 1 game day (6:00–2:00)
const WAKE_MINUTES = 6 * 60;
const SLEEP_MINUTES = 26 * 60; // 2:00 next calendar day stretch

export class Game {
  constructor(world) {
    this.world = world;
    this.players = new Map();
    this.chat = [];
    this.lastTick = Date.now();
    this.dayAccum = 0;
    this.shops = createShops();
    this.saveBlob = loadSave();
    if (this.saveBlob.day) this.world.day = this.saveBlob.day;
    if (this.saveBlob.season) this.world.season = this.saveBlob.season;
    attachSystems(this);
    if (this.saveBlob.townProject) this.townProject = this.saveBlob.townProject;
    for (const farm of this.world.farms) {
      farm.animals = farm.animals || createFarmAnimals();
    }
    this._saveTimer = setInterval(() => this.persist(), 15000);
  }

  persist() {
    const players = {};
    for (const p of this.players.values()) {
      players[p.name.toLowerCase()] = {
        gold: p.gold,
        inventory: p.inventory,
        toolLevels: p.toolLevels,
        energy: p.energy,
        farmId: p.farmId,
        farmCustomName: farmForOwner(this.world, p.id)?.customName || null,
        animals: farmForOwner(this.world, p.id)?.animals || [],
      };
    }
    // merge with offline saves
    const merged = { ...(this.saveBlob.players || {}), ...players };
    this.saveBlob = {
      players: merged,
      townProject: this.townProject,
      day: this.world.day,
      season: this.world.season,
    };
    writeSave(this.saveBlob);
  }

  addPlayer(id, name) {
    const safeName = (name || 'Bauer').slice(0, 16);
    const saved = this.saveBlob.players?.[safeName.toLowerCase()];
    const farm = assignFarm(this.world, id);
    const colors = ['#e85d4c', '#4c8fe8', '#e8c84c', '#4ce88a', '#c44ce8', '#e87a4c'];
    const color = colors[this.players.size % colors.length];
    const spawn = farm
      ? { x: farm.spawn.x + 0.5, y: farm.spawn.y + 0.5 }
      : { x: this.world.town.ox + 12.5, y: this.world.town.oy + 10.5 };

    if (farm && saved?.farmCustomName) farm.customName = saved.farmCustomName;
    if (farm && saved?.animals) farm.animals = saved.animals;

    const player = {
      id,
      name: safeName,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      dir: 'down',
      color,
      energy: saved?.energy ?? 100,
      maxEnergy: 100,
      gold: saved?.gold ?? 1500,
      inventory: saved?.inventory ? { ...createEmptyInventory(), ...saved.inventory } : createEmptyInventory(),
      toolLevels: saved?.toolLevels || createDefaultToolLevels(),
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
      this.persist();
      this.pushChat('system', `${p.name} ist gegangen.`);
      // keep farm animals/name in save; release slot for new players
      releaseFarm(this.world, id);
      this.players.delete(id);
      this.trades?.delete(id);
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
    if (payload.chat) {
      this.pushChat(p.name, String(payload.chat).slice(0, 80));
      return { ok: true, chatted: true };
    }
    if (p.actionCooldown > 0 && !payload.shop && !payload.renameFarm) return { error: 'Kurz warten…' };
    if (payload.sleep) return this.sleep(p);
    if (payload.shop) return this.shop(p, payload);
    if (payload.renameFarm) return this.renameFarm(p, payload.renameFarm);
    const extra = handleExtraAction(this, p, payload);
    if (extra) return extra;

    const fx = Math.floor(p.x) + p.facing.x;
    const fy = Math.floor(p.y) + p.facing.y;
    const slot = p.hotbar[p.selected];
    p.actionCooldown = 0.18;
    p.anim = 0.3;

    // Fishing rod
    if (slot === 'rod') return handleExtraAction(this, p, { fish: true });

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
      const lvl = p.toolLevels?.hoe || 1;
      const cost = toolEnergy('hoe', lvl);
      if (p.energy < cost) return { error: 'Keine Energie' };
      if (kind === T.GRASS || kind === T.PATH || kind === T.FLOWER) {
        if (zone.type === 'farm' && zone.farm.ownerId && zone.farm.ownerId !== p.id) {
          return { error: 'Fremder Hof — nur anschauen' };
        }
        setTile(this.world, x, y, T.DIRT);
        // higher hoe levels till neighbors
        if (lvl >= 2) {
          for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]].slice(0, lvl >= 3 ? 4 : 2)) {
            const nx = x + dx;
            const ny = y + dy;
            const nk = tileAt(this.world, nx, ny);
            if (nk === T.GRASS || nk === T.FLOWER) setTile(this.world, nx, ny, T.DIRT);
          }
        }
        p.energy -= cost;
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
      const cost = toolEnergy('pickaxe', p.toolLevels?.pickaxe || 1);
      if (p.energy < cost) return { error: 'Keine Energie' };
      if (kind === T.ROCK) {
        setTile(this.world, x, y, T.GRASS);
        p.inventory.stone = (p.inventory.stone || 0) + 1;
        const mine = this.world.mine;
        const inMine = mine && x >= mine.ox && x < mine.ox + mine.w && y >= mine.oy && y < mine.oy + mine.h;
        if (inMine || Math.random() < 0.35) {
          p.inventory.ore = (p.inventory.ore || 0) + 1;
        }
        if (inMine && Math.random() < 0.2) {
          p.inventory.coal = (p.inventory.coal || 0) + 1;
        }
        p.energy -= cost;
        return { ok: true, stone: true, ore: inMine };
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
      if (crop.seasons && !crop.seasons.includes(this.world.season)) {
        return { error: `Nur in ${crop.seasons.join('/')}` };
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
      const sellables = [
        ...Object.keys(CROPS),
        'egg', 'milk', 'fish_common', 'fish_river', 'fish_rare',
        'ore', 'coal', 'wood', 'stone',
      ];
      for (const id of sellables) {
        const n = p.inventory[id] || 0;
        if (n <= 0) continue;
        const price = sellPrice(id, this);
        if (price <= 0) continue;
        earned += n * price;
        p.inventory[id] = 0;
      }
      p.gold += earned;
      return { ok: true, earned, marketMod: this.marketMod };
    }
    if (payload.buyAnimal) return handleExtraAction(this, p, payload);
    if (payload.upgradeTool) return handleExtraAction(this, p, payload);
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
    systemsMorning(this);

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
    this.persist();
  }

  tick() {
    const now = Date.now();
    const dt = Math.min(0.1, (now - this.lastTick) / 1000);
    this.lastTick = now;

    systemsTick(this, dt);

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
        toolLevels: p.toolLevels || createDefaultToolLevels(),
        self: p.id === playerId,
      });
    }

    const you = this.players.get(playerId);
    const openTrades = [...(this.trades?.values() || [])].filter((t) => t.to === playerId);

    return {
      type: 'state',
      you: playerId,
      day: this.world.day,
      season: this.world.season,
      time: this.formatTime(),
      weather: this.world.weather,
      marketMod: this.marketMod || 1,
      festival: this.festival || null,
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
        animals: f.animals || [],
      })),
      town: this.world.town,
      mine: this.world.mine,
      mineDoor: this.world.mineDoor,
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
      npcs: this.npcs.map((n) => ({
        id: n.id,
        name: n.name,
        role: n.role,
        color: n.color,
        x: n.x,
        y: n.y,
        dir: n.dir,
        quest: n.quest,
      })),
      townProject: this.townProject,
      trades: openTrades,
      questsDone: [...(this.questsDone.get(playerId) || [])],
      players,
      chat: this.chat.slice(-16),
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
      animalsCatalog: Object.values(ANIMALS).map((a) => ({ id: a.id, name: a.name, price: a.price })),
    };
  }
}

export { TICK_MS };
