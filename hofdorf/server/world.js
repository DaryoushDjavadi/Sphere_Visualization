/** World layout: shared town in the center, up to 10 personal farms around it */

export const TILE = 32;
export const WORLD_W = 112;
export const WORLD_H = 96;

/** Tile kinds */
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
  CROP: 13,
};

/**
 * gate = side of the farm that opens toward town ('n'|'s'|'e'|'w')
 * 10 slots so a full lobby can each own a Hof
 */
export const FARM_SLOTS = [
  { id: 'n1', name: 'Nordhof', ox: 47, oy: 2, w: 18, h: 14, gate: 's' },
  { id: 'nw', name: 'Nordwesthof', ox: 18, oy: 6, w: 18, h: 14, gate: 's' },
  { id: 'ne', name: 'Nordosthof', ox: 76, oy: 6, w: 18, h: 14, gate: 's' },
  { id: 'w1', name: 'Westhof', ox: 2, oy: 28, w: 16, h: 16, gate: 'e' },
  { id: 'w2', name: 'Mittelwesthof', ox: 2, oy: 50, w: 16, h: 16, gate: 'e' },
  { id: 'e1', name: 'Osthof', ox: 94, oy: 28, w: 16, h: 16, gate: 'w' },
  { id: 'e2', name: 'Mittelosthof', ox: 94, oy: 50, w: 16, h: 16, gate: 'w' },
  { id: 'sw', name: 'Südwesthof', ox: 18, oy: 76, w: 18, h: 14, gate: 'n' },
  { id: 's1', name: 'Südhof', ox: 47, oy: 80, w: 18, h: 14, gate: 'n' },
  { id: 'se', name: 'Südosthof', ox: 76, oy: 76, w: 18, h: 14, gate: 'n' },
];

export const TOWN = { ox: 44, oy: 38, w: 24, h: 20 };

function idx(x, y) {
  return y * WORLD_W + x;
}

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < WORLD_W && y < WORLD_H;
}

function fillRect(tiles, x0, y0, w, h, kind) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (inBounds(x, y)) tiles[idx(x, y)] = kind;
    }
  }
}

function stampFence(tiles, x0, y0, w, h) {
  for (let x = x0; x < x0 + w; x++) {
    if (inBounds(x, y0)) tiles[idx(x, y0)] = T.FENCE;
    if (inBounds(x, y0 + h - 1)) tiles[idx(x, y0 + h - 1)] = T.FENCE;
  }
  for (let y = y0; y < y0 + h; y++) {
    if (inBounds(x0, y)) tiles[idx(x0, y)] = T.FENCE;
    if (inBounds(x0 + w - 1, y)) tiles[idx(x0 + w - 1, y)] = T.FENCE;
  }
}

function scatter(tiles, x0, y0, w, h, kind, chance, avoid = new Set()) {
  for (let y = y0; y < y0 + h; y++) {
    for (let x = x0; x < x0 + w; x++) {
      if (!inBounds(x, y)) continue;
      if (avoid.has(tiles[idx(x, y)])) continue;
      if (tiles[idx(x, y)] !== T.GRASS) continue;
      if (Math.random() < chance) tiles[idx(x, y)] = kind;
    }
  }
}

function carvePath(tiles, x0, y0, x1, y1) {
  let x = x0;
  let y = y0;
  let guard = 0;
  while ((x !== x1 || y !== y1) && guard++ < 400) {
    if (inBounds(x, y) && tiles[idx(x, y)] !== T.WATER && tiles[idx(x, y)] !== T.BUILDING) {
      tiles[idx(x, y)] = T.PATH;
      if (inBounds(x + 1, y) && tiles[idx(x + 1, y)] === T.GRASS) tiles[idx(x + 1, y)] = T.PATH;
      if (inBounds(x, y + 1) && tiles[idx(x, y + 1)] === T.GRASS) tiles[idx(x, y + 1)] = T.PATH;
    }
    if (x < x1) x++;
    else if (x > x1) x--;
    else if (y < y1) y++;
    else if (y > y1) y--;
  }
}

function gatePoint(farm) {
  const midX = farm.ox + Math.floor(farm.w / 2);
  const midY = farm.oy + Math.floor(farm.h / 2);
  if (farm.gate === 's') return { x: midX, y: farm.oy + farm.h - 1 };
  if (farm.gate === 'n') return { x: midX, y: farm.oy };
  if (farm.gate === 'e') return { x: farm.ox + farm.w - 1, y: midY };
  return { x: farm.ox, y: midY }; // west
}

function openGate(tiles, farm) {
  const midX = farm.ox + Math.floor(farm.w / 2);
  const midY = farm.oy + Math.floor(farm.h / 2);
  if (farm.gate === 's') {
    tiles[idx(midX, farm.oy + farm.h - 1)] = T.PATH;
    tiles[idx(midX + 1, farm.oy + farm.h - 1)] = T.PATH;
  } else if (farm.gate === 'n') {
    tiles[idx(midX, farm.oy)] = T.PATH;
    tiles[idx(midX + 1, farm.oy)] = T.PATH;
  } else if (farm.gate === 'e') {
    tiles[idx(farm.ox + farm.w - 1, midY)] = T.PATH;
    tiles[idx(farm.ox + farm.w - 1, midY + 1)] = T.PATH;
  } else {
    tiles[idx(farm.ox, midY)] = T.PATH;
    tiles[idx(farm.ox, midY + 1)] = T.PATH;
  }
}

function buildFarm(tiles, farm) {
  const { ox, oy, w, h, gate } = farm;
  const fieldX = ox + 3;
  const fieldY = oy + 4;
  const fieldW = Math.max(4, w - 6);
  const fieldH = Math.max(4, h - 7);
  fillRect(tiles, fieldX, fieldY, fieldW, fieldH, T.GRASS);

  // Cabin opposite the town gate
  let cx = ox + Math.floor(w / 2) - 2;
  let cy = oy + 1;
  if (gate === 'n') cy = oy + h - 4;
  else if (gate === 's') cy = oy + 1;
  else if (gate === 'e') {
    cx = ox + 1;
    cy = oy + Math.floor(h / 2) - 1;
  } else if (gate === 'w') {
    cx = ox + w - 6;
    cy = oy + Math.floor(h / 2) - 1;
  }

  fillRect(tiles, cx, cy, 5, 3, T.BUILDING);
  const doorY = gate === 'n' ? cy : cy + 2;
  tiles[idx(cx + 2, doorY)] = T.DOOR;
  tiles[idx(cx + 1, cy + 1)] = T.BED;

  stampFence(tiles, ox, oy, w, h);
  openGate(tiles, farm);

  const midX = ox + Math.floor(w / 2);
  const midY = oy + Math.floor(h / 2);

  scatter(tiles, ox + 1, oy + 1, w - 2, h - 2, T.TREE, 0.04, new Set([T.BUILDING, T.DOOR, T.BED, T.PATH, T.FENCE]));
  scatter(tiles, ox + 1, oy + 1, w - 2, h - 2, T.ROCK, 0.03, new Set([T.BUILDING, T.DOOR, T.BED, T.PATH, T.FENCE, T.TREE]));
  fillRect(tiles, fieldX, fieldY, fieldW, fieldH, T.GRASS);

  if (gate === 's') {
    fillRect(tiles, midX, fieldY + fieldH, 2, (oy + h) - (fieldY + fieldH), T.PATH);
  } else if (gate === 'n') {
    fillRect(tiles, midX, oy + 1, 2, Math.max(1, fieldY - (oy + 1)), T.PATH);
  } else if (gate === 'e') {
    fillRect(tiles, fieldX + fieldW, midY, Math.max(1, (ox + w) - (fieldX + fieldW)), 2, T.PATH);
  } else {
    fillRect(tiles, ox + 1, midY, Math.max(1, fieldX - (ox + 1)), 2, T.PATH);
  }

  farm.field = { x: fieldX, y: fieldY, w: fieldW, h: fieldH };
  farm.bed = { x: cx + 1, y: cy + 1 };
  farm.door = { x: cx + 2, y: doorY };
  farm.spawn = { x: fieldX + Math.floor(fieldW / 2), y: fieldY + Math.floor(fieldH / 2) };
}

function buildTown(tiles) {
  const { ox, oy, w, h } = TOWN;
  fillRect(tiles, ox + 2, oy + 2, w - 4, h - 4, T.GRASS);
  fillRect(tiles, ox + 8, oy + 7, 8, 6, T.FLOOR);

  // Fountain off the main N/S corridor (town center x)
  tiles[idx(ox + 9, oy + 9)] = T.WATER;
  tiles[idx(ox + 10, oy + 9)] = T.WATER;
  tiles[idx(ox + 9, oy + 10)] = T.WATER;
  tiles[idx(ox + 10, oy + 10)] = T.WATER;

  fillRect(tiles, ox + 3, oy + 3, 6, 4, T.BUILDING);
  tiles[idx(ox + 5, oy + 6)] = T.DOOR;
  tiles[idx(ox + 4, oy + 4)] = T.COUNTER;
  tiles[idx(ox + 5, oy + 4)] = T.COUNTER;

  fillRect(tiles, ox + 15, oy + 3, 6, 4, T.BUILDING);
  tiles[idx(ox + 17, oy + 6)] = T.DOOR;

  fillRect(tiles, ox + 4, oy + 14, 4, 3, T.WATER);

  // Mine entrance marker building south of plaza
  fillRect(tiles, ox + 10, oy + 16, 4, 3, T.BUILDING);
  tiles[idx(ox + 11, oy + 18)] = T.DOOR;

  scatter(tiles, ox + 2, oy + 2, w - 4, h - 4, T.FLOWER, 0.06, new Set([T.BUILDING, T.DOOR, T.WATER, T.FLOOR, T.COUNTER]));
  scatter(tiles, ox + 2, oy + 2, w - 4, h - 4, T.TREE, 0.02, new Set([T.BUILDING, T.DOOR, T.WATER, T.FLOOR, T.COUNTER, T.FLOWER]));
}

export function farmDisplayName(farm) {
  return (farm.customName && farm.customName.trim()) || farm.name;
}

export function createWorld() {
  const tiles = new Uint8Array(WORLD_W * WORLD_H);
  tiles.fill(T.GRASS);

  scatter(tiles, 0, 0, WORLD_W, WORLD_H, T.TREE, 0.03);
  scatter(tiles, 0, 0, WORLD_W, WORLD_H, T.ROCK, 0.012);
  scatter(tiles, 0, 0, WORLD_W, WORLD_H, T.FLOWER, 0.018);

  const townCx = TOWN.ox + Math.floor(TOWN.w / 2);
  const townCy = TOWN.oy + Math.floor(TOWN.h / 2);

  buildTown(tiles);

  const farms = FARM_SLOTS.map((f) => ({
    ...f,
    ownerId: null,
    customName: null,
  }));
  const overlays = {};

  for (const farm of farms) {
    fillRect(tiles, farm.ox, farm.oy, farm.w, farm.h, T.GRASS);
    buildFarm(tiles, farm);
  }

  for (const farm of farms) {
    const g = gatePoint(farm);
    carvePath(tiles, townCx, townCy, g.x, g.y);
    openGate(tiles, farm);
  }

  // Mine field east of town — dense rocks to pick
  const mine = { ox: TOWN.ox + TOWN.w + 2, oy: TOWN.oy + 2, w: 14, h: 12 };
  fillRect(tiles, mine.ox, mine.oy, mine.w, mine.h, T.GRASS);
  stampFence(tiles, mine.ox, mine.oy, mine.w, mine.h);
  tiles[idx(mine.ox, mine.oy + Math.floor(mine.h / 2))] = T.PATH;
  tiles[idx(mine.ox, mine.oy + Math.floor(mine.h / 2) + 1)] = T.PATH;
  carvePath(tiles, townCx, townCy, mine.ox, mine.oy + Math.floor(mine.h / 2));
  for (let y = mine.oy + 2; y < mine.oy + mine.h - 2; y++) {
    for (let x = mine.ox + 2; x < mine.ox + mine.w - 2; x++) {
      if (Math.random() < 0.55) tiles[idx(x, y)] = T.ROCK;
      else if (Math.random() < 0.08) tiles[idx(x, y)] = T.TREE;
    }
  }

  return {
    tiles,
    overlays,
    farms,
    mine,
    mineDoor: { x: TOWN.ox + 11, y: TOWN.oy + 18 },
    town: { ...TOWN, shop: { x: TOWN.ox + 5, y: TOWN.oy + 6 } },
    day: 1,
    season: 'Frühling',
    timeMinutes: 6 * 60,
    weather: 'sonnig',
  };
}

export function tileAt(world, x, y) {
  if (!inBounds(x, y)) return T.FENCE;
  return world.tiles[idx(x, y)];
}

export function setTile(world, x, y, kind) {
  if (!inBounds(x, y)) return;
  world.tiles[idx(x, y)] = kind;
}

export function overlayKey(x, y) {
  return `${x},${y}`;
}

export function isSolid(kind) {
  return kind === T.WATER || kind === T.FENCE || kind === T.BUILDING || kind === T.COUNTER;
}

export function canWalk(world, x, y) {
  const tx = Math.floor(x);
  const ty = Math.floor(y);
  if (!inBounds(tx, ty)) return false;
  const kind = tileAt(world, tx, ty);
  if (isSolid(kind)) return false;
  if (kind === T.TREE || kind === T.ROCK) return false;
  return true;
}

export function farmForOwner(world, playerId) {
  return world.farms.find((f) => f.ownerId === playerId) || null;
}

export function assignFarm(world, playerId) {
  let slot = world.farms.find((f) => f.ownerId === playerId);
  if (slot) return slot;
  slot = world.farms.find((f) => f.ownerId === null);
  if (!slot) return null;
  slot.ownerId = playerId;
  slot.customName = null;
  return slot;
}

export function releaseFarm(world, playerId) {
  for (const f of world.farms) {
    if (f.ownerId === playerId) {
      f.ownerId = null;
      f.customName = null;
    }
  }
}

export function serializeTiles(world) {
  return Buffer.from(world.tiles).toString('base64');
}

export function zoneAt(world, x, y) {
  for (const farm of world.farms) {
    if (x >= farm.ox && x < farm.ox + farm.w && y >= farm.oy && y < farm.oy + farm.h) {
      return { type: 'farm', farm };
    }
  }
  const t = world.town;
  if (x >= t.ox && x < t.ox + t.w && y >= t.oy && y < t.oy + t.h) {
    return { type: 'town' };
  }
  return { type: 'wild' };
}
