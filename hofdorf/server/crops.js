/** Crop definitions inspired by classic farming sims */

export const CROPS = {
  parsnip: {
    id: 'parsnip',
    name: 'Pastinake',
    seedName: 'Pastinaken-Samen',
    growDays: 4,
    stages: 4,
    sellPrice: 35,
    seedPrice: 20,
    color: '#e8c96a',
    sproutColor: '#7cb342',
  },
  potato: {
    id: 'potato',
    name: 'Kartoffel',
    seedName: 'Kartoffel-Samen',
    growDays: 6,
    stages: 5,
    sellPrice: 80,
    seedPrice: 50,
    color: '#d4a574',
    sproutColor: '#8bc34a',
  },
  cauliflower: {
    id: 'cauliflower',
    name: 'Blumenkohl',
    seedName: 'Blumenkohl-Samen',
    growDays: 8,
    stages: 5,
    sellPrice: 175,
    seedPrice: 80,
    color: '#f5f5f0',
    sproutColor: '#66bb6a',
  },
  tomato: {
    id: 'tomato',
    name: 'Tomate',
    seedName: 'Tomaten-Samen',
    growDays: 7,
    stages: 5,
    sellPrice: 60,
    seedPrice: 50,
    color: '#e53935',
    sproutColor: '#43a047',
    regrow: true,
  },
  corn: {
    id: 'corn',
    name: 'Mais',
    seedName: 'Mais-Samen',
    growDays: 10,
    stages: 5,
    sellPrice: 50,
    seedPrice: 150,
    color: '#fdd835',
    sproutColor: '#558b2f',
    regrow: true,
  },
};

export const TOOLS = {
  hoe: { id: 'hoe', name: 'Hacke', energy: 2 },
  can: { id: 'can', name: 'Gießkanne', energy: 2 },
  axe: { id: 'axe', name: 'Axt', energy: 4 },
  pickaxe: { id: 'pickaxe', name: 'Spitzhacke', energy: 4 },
  scythe: { id: 'scythe', name: 'Sense', energy: 1 },
};

export function createEmptyInventory() {
  return {
    hoe: 1,
    can: 1,
    axe: 1,
    pickaxe: 1,
    scythe: 1,
    parsnip_seed: 15,
    potato_seed: 5,
    cauliflower_seed: 2,
    tomato_seed: 3,
    corn_seed: 1,
    parsnip: 0,
    potato: 0,
    cauliflower: 0,
    tomato: 0,
    corn: 0,
    wood: 0,
    stone: 0,
  };
}

export const HOTBAR_SLOTS = [
  'hoe',
  'can',
  'axe',
  'pickaxe',
  'scythe',
  'parsnip_seed',
  'potato_seed',
  'tomato_seed',
];
