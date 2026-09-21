/** Claimable town shops with farm-linked production */

export const SHOP_DEFS = [
  {
    id: 'seeds',
    name: 'Samenladen',
    blurb: 'Samen verkaufen an Nachbarn. Einnahmen aus Verkäufen.',
    claimPrice: 600,
    x: 49,
    y: 44,
    kind: 'seeds',
  },
  {
    id: 'kitchen',
    name: 'Dorfküche',
    blurb: 'Verarbeitet Ernte zu Gerichten — Gold jeden Morgen.',
    claimPrice: 900,
    x: 61,
    y: 44,
    kind: 'produce',
    recipes: [
      { id: 'hash', name: 'Kartoffelpuffer', needs: { potato: 2 }, gold: 120 },
      { id: 'salad', name: 'BauerSalat', needs: { tomato: 2, parsnip: 1 }, gold: 140 },
      { id: 'roast', name: 'Maisbraten', needs: { corn: 2 }, gold: 160 },
    ],
  },
  {
    id: 'workshop',
    name: 'Werkstatt',
    blurb: 'Holz & Stein zu Waren verarbeiten.',
    claimPrice: 750,
    x: 56,
    y: 52,
    kind: 'produce',
    recipes: [
      { id: 'crate', name: 'Obstkiste', needs: { wood: 3 }, gold: 90 },
      { id: 'fencekit', name: 'Zaunset', needs: { wood: 2, stone: 2 }, gold: 110 },
      { id: 'statue', name: 'Steinsäule', needs: { stone: 5 }, gold: 150 },
    ],
  },
];

export function createShops() {
  return SHOP_DEFS.map((d) => ({
    id: d.id,
    name: d.name,
    blurb: d.blurb,
    claimPrice: d.claimPrice,
    x: d.x,
    y: d.y,
    kind: d.kind,
    recipes: d.recipes || null,
    ownerId: null,
    ownerName: null,
    partners: [],
    vault: {},
    earnings: 0,
    lastPayout: 0,
  }));
}

export function isShopMember(shop, playerId) {
  if (!shop) return false;
  if (shop.ownerId === playerId) return true;
  return shop.partners.some((p) => p.id === playerId);
}
