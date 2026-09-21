/** Expanded crop/item definitions for Hofdorf */

export const SEASONS = ['Frühling', 'Sommer', 'Herbst', 'Winter'];

export const CROPS = {
  parsnip: {
    id: 'parsnip', name: 'Pastinake', seedName: 'Pastinaken-Samen',
    growDays: 4, stages: 4, sellPrice: 35, seedPrice: 20,
    color: '#e8c96a', sproutColor: '#7cb342', seasons: ['Frühling'],
  },
  potato: {
    id: 'potato', name: 'Kartoffel', seedName: 'Kartoffel-Samen',
    growDays: 6, stages: 5, sellPrice: 80, seedPrice: 50,
    color: '#d4a574', sproutColor: '#8bc34a', seasons: ['Frühling', 'Sommer'],
  },
  cauliflower: {
    id: 'cauliflower', name: 'Blumenkohl', seedName: 'Blumenkohl-Samen',
    growDays: 8, stages: 5, sellPrice: 175, seedPrice: 80,
    color: '#f5f5f0', sproutColor: '#66bb6a', seasons: ['Frühling'],
  },
  tomato: {
    id: 'tomato', name: 'Tomate', seedName: 'Tomaten-Samen',
    growDays: 7, stages: 5, sellPrice: 60, seedPrice: 50,
    color: '#e53935', sproutColor: '#43a047', regrow: true, seasons: ['Sommer'],
  },
  corn: {
    id: 'corn', name: 'Mais', seedName: 'Mais-Samen',
    growDays: 10, stages: 5, sellPrice: 50, seedPrice: 150,
    color: '#fdd835', sproutColor: '#558b2f', regrow: true, seasons: ['Sommer', 'Herbst'],
  },
  pumpkin: {
    id: 'pumpkin', name: 'Kürbis', seedName: 'Kürbis-Samen',
    growDays: 9, stages: 5, sellPrice: 220, seedPrice: 100,
    color: '#ef6c00', sproutColor: '#558b2f', seasons: ['Herbst'],
  },
  berry: {
    id: 'berry', name: 'Beere', seedName: 'Beeren-Samen',
    growDays: 5, stages: 4, sellPrice: 40, seedPrice: 30,
    color: '#ab47bc', sproutColor: '#66bb6a', regrow: true, seasons: ['Frühling', 'Sommer'],
  },
};

export const TOOLS = {
  hoe: { id: 'hoe', name: 'Hacke', energy: 2 },
  can: { id: 'can', name: 'Gießkanne', energy: 2 },
  axe: { id: 'axe', name: 'Axt', energy: 4 },
  pickaxe: { id: 'pickaxe', name: 'Spitzhacke', energy: 4 },
  scythe: { id: 'scythe', name: 'Sense', energy: 1 },
  rod: { id: 'rod', name: 'Angel', energy: 3 },
};

export const ANIMALS = {
  chicken: { id: 'chicken', name: 'Huhn', price: 400, feed: 'parsnip', product: 'egg', productName: 'Ei', productPrice: 50 },
  cow: { id: 'cow', name: 'Kuh', price: 1000, feed: 'corn', product: 'milk', productName: 'Milch', productPrice: 120 },
};

export const FISH = [
  { id: 'fish_common', name: 'Barsch', sellPrice: 40 },
  { id: 'fish_river', name: 'Forelle', sellPrice: 70 },
  { id: 'fish_rare', name: 'Goldfisch', sellPrice: 180 },
];

export function createEmptyInventory() {
  return {
    hoe: 1, can: 1, axe: 1, pickaxe: 1, scythe: 1, rod: 1,
    parsnip_seed: 15, potato_seed: 5, cauliflower_seed: 2,
    tomato_seed: 3, corn_seed: 2, pumpkin_seed: 1, berry_seed: 3,
    parsnip: 0, potato: 0, cauliflower: 0, tomato: 0, corn: 0,
    pumpkin: 0, berry: 0,
    wood: 0, stone: 0, ore: 0, coal: 0,
    egg: 0, milk: 0,
    fish_common: 0, fish_river: 0, fish_rare: 0,
  };
}

export const HOTBAR_SLOTS = [
  'hoe', 'can', 'axe', 'pickaxe', 'scythe', 'rod', 'parsnip_seed', 'potato_seed',
];

export function toolEnergy(toolId, level = 1) {
  const base = TOOLS[toolId]?.energy || 2;
  return Math.max(1, base - (level - 1));
}

export function createDefaultToolLevels() {
  return { hoe: 1, can: 1, axe: 1, pickaxe: 1, scythe: 1, rod: 1 };
}
