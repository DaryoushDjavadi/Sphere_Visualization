import { ANIMALS, FISH, CROPS, toolEnergy } from './crops.js';
import { createNpcs, createTownProject, createFarmAnimals } from './content.js';
import { farmForOwner, tileAt, T, canWalk } from './world.js';

let animalSeq = 1;

export function attachSystems(game) {
  game.npcs = createNpcs(game.world.town);
  game.townProject = createTownProject();
  game.marketMod = 1;
  game.questsDone = new Map(); // playerId -> Set(questId)
  game.trades = new Map(); // fromId -> offer
  // animals live on farms
  for (const farm of game.world.farms) {
    if (!farm.animals) farm.animals = createFarmAnimals();
  }
}

export function systemsTick(game, dt) {
  // NPCs wander near home
  for (const npc of game.npcs) {
    if (Math.random() < 0.02) {
      const dx = Math.floor(Math.random() * 3) - 1;
      const dy = Math.floor(Math.random() * 3) - 1;
      const nx = npc.homeX + dx;
      const ny = npc.homeY + dy;
      if (canWalk(game.world, nx, ny)) {
        npc.x = nx;
        npc.y = ny;
        if (dy < 0) npc.dir = 'up';
        else if (dy > 0) npc.dir = 'down';
        else if (dx < 0) npc.dir = 'left';
        else if (dx > 0) npc.dir = 'right';
      }
    }
  }
}

export function systemsMorning(game) {
  // Animals produce if fed
  for (const farm of game.world.farms) {
    for (const a of farm.animals || []) {
      if (a.fed) {
        a.ready = true;
        a.fed = false;
      }
    }
  }
  // Market price fluctuation
  game.marketMod = 0.85 + Math.random() * 0.35;
  // Festival every 7th day
  if (game.world.day % 7 === 0) {
    game.festival = {
      name: 'Marktfest',
      blurb: 'Heute +25% Verkaufspreise und kostenlose Energie am Brunnen.',
    };
    game.marketMod *= 1.25;
    game.pushChat('system', `Festtag: ${game.festival.name}!`);
  } else {
    game.festival = null;
  }
}

export function handleExtraAction(game, p, payload) {
  if (payload.buyAnimal) return buyAnimal(game, p, payload.buyAnimal);
  if (payload.feedAnimal) return feedAnimal(game, p, payload.feedAnimal);
  if (payload.collectAnimal) return collectAnimal(game, p, payload.collectAnimal);
  if (payload.upgradeTool) return upgradeTool(game, p, payload.upgradeTool);
  if (payload.talkNpc) return talkNpc(game, p, payload.talkNpc);
  if (payload.completeQuest) return completeQuest(game, p, payload.completeQuest);
  if (payload.donate) return donateProject(game, p, payload.donate, payload.qty || 1);
  if (payload.trade) return offerTrade(game, p, payload);
  if (payload.acceptTrade) return acceptTrade(game, p, payload.acceptTrade);
  if (payload.mineEnter) return enterMine(game, p);
  if (payload.fish) return tryFish(game, p);
  return null;
}

function buyAnimal(game, p, type) {
  const def = ANIMALS[type];
  if (!def) return { error: 'Unbekanntes Tier' };
  const farm = farmForOwner(game.world, p.id);
  if (!farm) return { error: 'Kein Hof' };
  if ((farm.animals?.length || 0) >= 4) return { error: 'Stall voll (max 4)' };
  if (p.gold < def.price) return { error: 'Zu wenig Gold' };
  p.gold -= def.price;
  farm.animals = farm.animals || [];
  farm.animals.push({ id: `a${animalSeq++}`, type, fed: false, ready: false });
  game.pushChat('system', `${p.name} kauft ein ${def.name}.`);
  return { ok: true, animal: def.name };
}

function feedAnimal(game, p, animalId) {
  const farm = farmForOwner(game.world, p.id);
  if (!farm) return { error: 'Kein Hof' };
  const a = farm.animals?.find((x) => x.id === animalId);
  if (!a) return { error: 'Tier nicht gefunden' };
  const def = ANIMALS[a.type];
  if ((p.inventory[def.feed] || 0) < 1) return { error: `Braucht ${def.feed}` };
  if (a.fed) return { error: 'Schon gefüttert' };
  p.inventory[def.feed] -= 1;
  a.fed = true;
  return { ok: true, fed: def.name };
}

function collectAnimal(game, p, animalId) {
  const farm = farmForOwner(game.world, p.id);
  if (!farm) return { error: 'Kein Hof' };
  const a = farm.animals?.find((x) => x.id === animalId);
  if (!a) return { error: 'Tier nicht gefunden' };
  if (!a.ready) return { error: 'Noch nichts bereit' };
  const def = ANIMALS[a.type];
  a.ready = false;
  p.inventory[def.product] = (p.inventory[def.product] || 0) + 1;
  return { ok: true, got: def.productName };
}

function upgradeTool(game, p, toolId) {
  if (!p.toolLevels) p.toolLevels = { hoe: 1, can: 1, axe: 1, pickaxe: 1, scythe: 1, rod: 1 };
  const lvl = p.toolLevels[toolId] || 1;
  if (lvl >= 3) return { error: 'Schon max. Stufe' };
  const cost = lvl === 1 ? 300 : 700;
  const oreNeed = lvl === 1 ? 3 : 8;
  if (p.gold < cost) return { error: 'Zu wenig Gold' };
  if ((p.inventory.ore || 0) < oreNeed) return { error: `Braucht ${oreNeed} Erz` };
  p.gold -= cost;
  p.inventory.ore -= oreNeed;
  p.toolLevels[toolId] = lvl + 1;
  return { ok: true, upgraded: toolId, level: lvl + 1 };
}

function talkNpc(game, p, npcId) {
  const npc = game.npcs.find((n) => n.id === npcId);
  if (!npc) return { error: 'NPC unbekannt' };
  const dist = Math.hypot(p.x - npc.x, p.y - npc.y);
  if (dist > 2.5) return { error: 'Zu weit weg' };
  const done = game.questsDone.get(p.id) || new Set();
  const finished = done.has(npc.quest.id);
  return {
    ok: true,
    npc: { id: npc.id, name: npc.name, role: npc.role, quest: npc.quest, finished },
  };
}

function completeQuest(game, p, npcId) {
  const npc = game.npcs.find((n) => n.id === npcId);
  if (!npc) return { error: 'NPC unbekannt' };
  const done = game.questsDone.get(p.id) || new Set();
  if (done.has(npc.quest.id)) return { error: 'Quest schon erledigt' };
  for (const [item, need] of Object.entries(npc.quest.needs)) {
    if ((p.inventory[item] || 0) < need) return { error: `Fehlt: ${item}` };
  }
  for (const [item, need] of Object.entries(npc.quest.needs)) {
    p.inventory[item] -= need;
  }
  p.gold += npc.quest.rewardGold;
  done.add(npc.quest.id);
  game.questsDone.set(p.id, done);
  game.pushChat('system', `${p.name} erfüllt ${npc.name}s Auftrag (+${npc.quest.rewardGold}g).`);
  return { ok: true, questDone: npc.quest.id, gold: npc.quest.rewardGold };
}

function donateProject(game, p, item, qty) {
  const proj = game.townProject;
  if (!proj || proj.complete) return { error: 'Projekt fertig' };
  if (!(item in proj.needs)) return { error: 'Nicht nötig' };
  qty = Math.max(1, Math.min(50, Number(qty) || 1));
  if ((p.inventory[item] || 0) < qty) return { error: 'Nicht genug' };
  const left = proj.needs[item] - proj.progress[item];
  const give = Math.min(qty, left);
  if (give <= 0) return { error: 'Schon voll' };
  p.inventory[item] -= give;
  proj.progress[item] += give;
  const done = Object.keys(proj.needs).every((k) => proj.progress[k] >= proj.needs[k]);
  if (done) {
    proj.complete = true;
    for (const pl of game.players.values()) pl.gold += proj.bonusGold;
    game.pushChat('system', `${proj.name} ist fertig! Jeder erhält ${proj.bonusGold} Gold.`);
  }
  return { ok: true, donated: give, item, complete: proj.complete };
}

function offerTrade(game, p, payload) {
  const toName = String(payload.to || '').trim();
  const target = [...game.players.values()].find((o) => o.name.toLowerCase() === toName.toLowerCase());
  if (!target) return { error: 'Spieler nicht online' };
  if (target.id === p.id) return { error: 'Nicht mit dir selbst' };
  const item = payload.item;
  const qty = Math.max(1, Math.min(20, Number(payload.qty) || 1));
  const gold = Math.max(0, Math.min(5000, Number(payload.gold) || 0));
  if (!item || (p.inventory[item] || 0) < qty) return { error: 'Item fehlt' };
  game.trades.set(p.id, { from: p.id, fromName: p.name, to: target.id, item, qty, gold });
  game.pushChat('system', `${p.name} bietet ${target.name} Handel an.`);
  return { ok: true, tradeOffered: true };
}

function acceptTrade(game, p, fromName) {
  const offer = [...game.trades.values()].find(
    (t) => t.to === p.id && t.fromName.toLowerCase() === String(fromName || '').toLowerCase(),
  );
  if (!offer) return { error: 'Kein Angebot' };
  const from = game.players.get(offer.from);
  if (!from) {
    game.trades.delete(offer.from);
    return { error: 'Spieler offline' };
  }
  if ((from.inventory[offer.item] || 0) < offer.qty) return { error: 'Angebot ungültig' };
  if (p.gold < offer.gold) return { error: 'Zu wenig Gold' };
  from.inventory[offer.item] -= offer.qty;
  p.inventory[offer.item] = (p.inventory[offer.item] || 0) + offer.qty;
  p.gold -= offer.gold;
  from.gold += offer.gold;
  game.trades.delete(offer.from);
  game.pushChat('system', `Handel: ${from.name} ↔ ${p.name}`);
  return { ok: true, traded: true };
}

function enterMine(game, p) {
  const door = game.world.mineDoor;
  const mine = game.world.mine;
  if (!door || !mine) return { error: 'Keine Mine' };
  const nearDoor = Math.hypot(p.x - door.x, p.y - door.y) < 2.2;
  const inMine = p.x >= mine.ox && p.x < mine.ox + mine.w && p.y >= mine.oy && p.y < mine.oy + mine.h;
  if (inMine) {
    p.x = door.x + 0.5;
    p.y = door.y + 1.5;
    return { ok: true, leftMine: true };
  }
  if (!nearDoor) {
    // Convenience: warp to mine entrance path first if far
    const town = game.world.town;
    p.x = town.ox + town.w / 2;
    p.y = town.oy + town.h / 2;
    return { ok: true, warpedTown: true };
  }
  p.x = mine.ox + 2.5;
  p.y = mine.oy + Math.floor(mine.h / 2) + 0.5;
  return { ok: true, enteredMine: true };
}

function tryFish(game, p) {
  const fx = Math.floor(p.x) + p.facing.x;
  const fy = Math.floor(p.y) + p.facing.y;
  const under = tileAt(game.world, Math.floor(p.x), Math.floor(p.y));
  const face = tileAt(game.world, fx, fy);
  if (under !== T.WATER && face !== T.WATER && under !== T.PATH) {
    // allow fishing adjacent to water
    const nearWater = [
      [0, 1], [0, -1], [1, 0], [-1, 0],
    ].some(([dx, dy]) => tileAt(game.world, Math.floor(p.x) + dx, Math.floor(p.y) + dy) === T.WATER);
    if (!nearWater && face !== T.WATER) return { error: 'Kein Wasser in der Nähe' };
  }
  const lvl = p.toolLevels?.rod || 1;
  const energy = toolEnergy('rod', lvl);
  if (p.energy < energy) return { error: 'Keine Energie' };
  p.energy -= energy;
  p.anim = 0.4;
  const roll = Math.random();
  let fish = FISH[0];
  if (roll > 0.92) fish = FISH[2];
  else if (roll > 0.55) fish = FISH[1];
  p.inventory[fish.id] = (p.inventory[fish.id] || 0) + 1;
  return { ok: true, fish: fish.name };
}

export function sellPrice(itemId, game) {
  const crop = CROPS[itemId];
  if (crop) return Math.round(crop.sellPrice * (game.marketMod || 1));
  const animal = Object.values(ANIMALS).find((a) => a.product === itemId);
  if (animal) return Math.round(animal.productPrice * (game.marketMod || 1));
  const fish = FISH.find((f) => f.id === itemId);
  if (fish) return Math.round(fish.sellPrice * (game.marketMod || 1));
  if (itemId === 'ore') return Math.round(40 * (game.marketMod || 1));
  if (itemId === 'coal') return Math.round(25 * (game.marketMod || 1));
  if (itemId === 'wood') return Math.round(8 * (game.marketMod || 1));
  if (itemId === 'stone') return Math.round(6 * (game.marketMod || 1));
  return 0;
}

export { ANIMALS, FISH };
