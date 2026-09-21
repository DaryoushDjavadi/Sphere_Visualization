/** Claimable town shops with farm-linked production */

export const SHOP_DEFS = [
  {
    id: 'seeds',
    name: 'Samenladen',
    blurb: 'Samen verkaufen an Nachbarn. Einnahmen aus Verkäufen.',
    claimPrice: 600,
    x: 33, // near existing shop building
    y: 26,
    kind: 'seeds',
  },
  {
    id: 'kitchen',
    name: 'Dorfküche',
    blurb: 'Verarbeitet Ernte zu Gerichten — Gold jeden Morgen.',
    claimPrice: 900,
    x: 45,
    y: 26,
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
    x: 40,
    y: 34,
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
    partners: [], // { id, name }
    vault: {}, // deposited materials
    earnings: 0, // pending gold to distribute on claim/day
    lastPayout: 0,
  }));
}

export function shopPublic(shop) {
  return {
    id: shop.id,
    name: shop.name,
    blurb: shop.blurb,
    claimPrice: shop.claimPrice,
    x: shop.x,
    y: shop.y,
    kind: shop.kind,
    recipes: shop.recipes,
    ownerId: shop.ownerId,
    ownerName: shop.ownerName,
    partners: shop.partners,
    vault: shop.vault,
    earnings: shop.earnings,
  };
}

export function isShopMember(shop, playerId) {
  if (!shop) return false;
  if (shop.ownerId === playerId) return true;
  return shop.partners.some((p) => p.id === playerId);
}
