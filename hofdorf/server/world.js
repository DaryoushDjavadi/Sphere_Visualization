/** World layout: shared town in the center, personal farms around it */

export const TILE = 32;
export const WORLD_W = 80;
export const WORLD_H = 60;

/** Tile kinds */
export const T = {
  GRASS: 0,
  PATH: 1,
  DIRT: 2,       // tilled soil
  WATER: 3,
  FENCE: 4,
  BUILDING: 5,
  TREE: 6,
  ROCK: 7,
  FLOWER: 8,
  FLOOR: 9,      // interior / plaza
  BED: 10,
  COUNTER: 11,
  DOOR: 12,
  CROP: 13,      // marker — actual crop data lives in overlays
};

export const FARM_SLOTS = [
  { id: 'n', name: 'Nordhof', ox: 28, oy: 2, w: 24, h: 16, spawn: { x: 40, y: 16 } },
  { id: 's', name: 'Südhof', ox: 28, oy: 42, w: 24, h: 16, spawn: { x: 40, y: 42 } },
  { id: 'w', name: 'Westhof', ox: 2, oy: 20, w: 20, h: 18, spawn: { x: 20, y: 29 } },
  { id: 'e', name: 'Osthof', ox: 58, oy: 20, w: 20, h: 18, spawn: { x: 58, y: 29 } },
];

export const TOWN = { ox: 28, oy: 20, w: 24, h: 20 };

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
  while (x !== x1 || y !== y1) {
    if (inBounds(x, y) && tiles[idx(x, y)] !== T.WATER && tiles[idx(x, y)] !== T.BUILDING) {
      tiles[idx(x, y)] = T.PATH;
      // Widen path a bit
      if (inBounds(x + 1, y) && tiles[idx(x + 1, y)] === T.GRASS) tiles[idx(x + 1, y)] = T.PATH;
      if (inBounds(x, y + 1) && tiles[idx(x, y + 1)] === T.GRASS) tiles[idx(x, y + 1)] = T.PATH;
    }
    if (x < x1) x++;
    else if (x > x1) x--;
    else if (y < y1) y++;
    else if (y > y1) y--;
  }
}

function buildFarm(tiles, farm, overlays) {
  const { ox, oy, w, h } = farm;
  // Soft grass pad already there; carve field area
  const fieldX = ox + 3;
  const fieldY = oy + 4;
  const fieldW = w - 6;
  const fieldH = h - 7;
  fillRect(tiles, fieldX, fieldY, fieldW, fieldH, T.GRASS);

  // Cabin on the side opposite the town gate so the exit stays clear
  let cx = ox + Math.floor(w / 2) - 2;
  let cy = oy + 1;
  if (farm.id === 's') {
    cy = oy + h - 4; // cabin at south end, gate is north
  } else if (farm.id === 'n') {
    cy = oy + 1; // cabin north, gate south
  } else if (farm.id === 'w') {
    cx = ox + 1;
    cy = oy + Math.floor(h / 2) - 1;
  } else if (farm.id === 'e') {
    cx = ox + w - 6;
    cy = oy + Math.floor(h / 2) - 1;
  }

  fillRect(tiles, cx, cy, 5, 3, T.BUILDING);
  // Door facing toward field / town
  const doorY = farm.id === 's' ? cy : cy + 2;
  tiles[idx(cx + 2, doorY)] = T.DOOR;
  tiles[idx(cx + 1, cy + 1)] = T.BED;

  // Fence around farm with gate toward town
  stampFence(tiles, ox, oy, w, h);

  const midX = ox + Math.floor(w / 2);
  const midY = oy + Math.floor(h / 2);
  if (farm.id === 'n') {
    tiles[idx(midX, oy + h - 1)] = T.PATH;
    tiles[idx(midX + 1, oy + h - 1)] = T.PATH;
  } else if (farm.id === 's') {
    tiles[idx(midX, oy)] = T.PATH;
    tiles[idx(midX + 1, oy)] = T.PATH;
  } else if (farm.id === 'w') {
    tiles[idx(ox + w - 1, midY)] = T.PATH;
    tiles[idx(ox + w - 1, midY + 1)] = T.PATH;
  } else if (farm.id === 'e') {
    tiles[idx(ox, midY)] = T.PATH;
    tiles[idx(ox, midY + 1)] = T.PATH;
  }

  // Trees & rocks on farm edges
  scatter(tiles, ox + 1, oy + 1, w - 2, h - 2, T.TREE, 0.04, new Set([T.BUILDING, T.DOOR, T.BED, T.PATH, T.FENCE]));
  scatter(tiles, ox + 1, oy + 1, w - 2, h - 2, T.ROCK, 0.03, new Set([T.BUILDING, T.DOOR, T.BED, T.PATH, T.FENCE, T.TREE]));

  // Clear field interior of trees/rocks so farming is playable
  fillRect(tiles, fieldX, fieldY, fieldW, fieldH, T.GRASS);

  // Clear a lane from field to gate
  if (farm.id === 'n') {
    fillRect(tiles, midX, fieldY + fieldH, 2, (oy + h) - (fieldY + fieldH), T.PATH);
  } else if (farm.id === 's') {
    fillRect(tiles, midX, oy + 1, 2, fieldY - (oy + 1), T.PATH);
  } else if (farm.id === 'w') {
    fillRect(tiles, fieldX + fieldW, midY, (ox + w) - (fieldX + fieldW), 2, T.PATH);
  } else if (farm.id === 'e') {
    fillRect(tiles, ox + 1, midY, fieldX - (ox + 1), 2, T.PATH);
  }

  farm.field = { x: fieldX, y: fieldY, w: fieldW, h: fieldH };
  farm.bed = { x: cx + 1, y: cy + 1 };
  farm.door = { x: cx + 2, y: doorY };
  farm.spawn = { x: fieldX + Math.floor(fieldW / 2), y: fieldY + Math.floor(fieldH / 2) };
}

function buildTown(tiles) {
  const { ox, oy, w, h } = TOWN;
  fillRect(tiles, ox + 2, oy + 2, w - 4, h - 4, T.GRASS);

  // Plaza
  fillRect(tiles, ox + 8, oy + 7, 8, 6, T.FLOOR);

  // Fountain offset from the main N/S path (path runs at world x≈40)
  tiles[idx(ox + 9, oy + 9)] = T.WATER;
  tiles[idx(ox + 10, oy + 9)] = T.WATER;
  tiles[idx(ox + 9, oy + 10)] = T.WATER;
  tiles[idx(ox + 10, oy + 10)] = T.WATER;

  // Shop (Pierre-like)
  fillRect(tiles, ox + 3, oy + 3, 6, 4, T.BUILDING);
  tiles[idx(ox + 5, oy + 6)] = T.DOOR;
  tiles[idx(ox + 4, oy + 4)] = T.COUNTER;
  tiles[idx(ox + 5, oy + 4)] = T.COUNTER;

  // Inn / community board
  fillRect(tiles, ox + 15, oy + 3, 6, 4, T.BUILDING);
  tiles[idx(ox + 17, oy + 6)] = T.DOOR;

  // Small pond
  fillRect(tiles, ox + 4, oy + 14, 4, 3, T.WATER);

  // Flowers around plaza
  scatter(tiles, ox + 2, oy + 2, w - 4, h - 4, T.FLOWER, 0.06, new Set([T.BUILDING, T.DOOR, T.WATER, T.FLOOR, T.COUNTER]));
  scatter(tiles, ox + 2, oy + 2, w - 4, h - 4, T.TREE, 0.02, new Set([T.BUILDING, T.DOOR, T.WATER, T.FLOOR, T.COUNTER, T.FLOWER]));
}

export function createWorld() {
  const tiles = new Uint8Array(WORLD_W * WORLD_H);
  tiles.fill(T.GRASS);

  // Soft wilderness scatter
  scatter(tiles, 0, 0, WORLD_W, WORLD_H, T.TREE, 0.035);
  scatter(tiles, 0, 0, WORLD_W, WORLD_H, T.ROCK, 0.015);
  scatter(tiles, 0, 0, WORLD_W, WORLD_H, T.FLOWER, 0.02);

  // Clear corridors for paths first
  const townCx = TOWN.ox + Math.floor(TOWN.w / 2);
  const townCy = TOWN.oy + Math.floor(TOWN.h / 2);

  buildTown(tiles);

  const farms = FARM_SLOTS.map((f) => ({ ...f, ownerId: null }));
  const overlays = {}; // key "x,y" -> crop/object overlay

  for (const farm of farms) {
    // Clear farm area grass noise
    fillRect(tiles, farm.ox, farm.oy, farm.w, farm.h, T.GRASS);
    buildFarm(tiles, farm, overlays);
  }

  // Paths from farms to town plaza
  carvePath(tiles, townCx, townCy, townCx, farms[0].oy + farms[0].h - 1); // north
  carvePath(tiles, townCx, townCy, townCx, farms[1].oy); // south
  carvePath(tiles, townCx, townCy, farms[2].ox + farms[2].w - 1, townCy); // west
  carvePath(tiles, townCx, townCy, farms[3].ox, townCy); // east

  // Re-open gates after path carve
  for (const farm of farms) {
    const midX = farm.ox + Math.floor(farm.w / 2);
    const midY = farm.oy + Math.floor(farm.h / 2);
    if (farm.id === 'n') {
      tiles[idx(midX, farm.oy + farm.h - 1)] = T.PATH;
      tiles[idx(midX + 1, farm.oy + farm.h - 1)] = T.PATH;
    } else if (farm.id === 's') {
      tiles[idx(midX, farm.oy)] = T.PATH;
      tiles[idx(midX + 1, farm.oy)] = T.PATH;
    } else if (farm.id === 'w') {
      tiles[idx(farm.ox + farm.w - 1, midY)] = T.PATH;
      tiles[idx(farm.ox + farm.w - 1, midY + 1)] = T.PATH;
    } else if (farm.id === 'e') {
      tiles[idx(farm.ox, midY)] = T.PATH;
      tiles[idx(farm.ox, midY + 1)] = T.PATH;
    }
  }

  return {
    tiles,
    overlays,
    farms,
    town: { ...TOWN, shop: { x: TOWN.ox + 5, y: TOWN.oy + 6 } },
    day: 1,
    season: 'Frühling',
    timeMinutes: 6 * 60, // 06:00
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
  // Trees and rocks block until chopped/mined
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
  if (!slot) {
    // Reuse oldest empty — if all taken, still allow visitor without farm ownership transfer
    return null;
  }
  slot.ownerId = playerId;
  return slot;
}

export function releaseFarm(world, playerId) {
  for (const f of world.farms) {
    if (f.ownerId === playerId) f.ownerId = null;
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
