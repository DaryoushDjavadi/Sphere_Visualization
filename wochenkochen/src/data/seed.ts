import type { AppSettings, Recipe, User, WeekPlan } from '../types'

export const USERS: Record<'darius' | 'wendy', User> = {
  darius: {
    id: 'darius',
    name: 'Darius',
    short: 'D',
    color: '#2f6f4e',
  },
  wendy: {
    id: 'wendy',
    name: 'Wendy',
    short: 'W',
    color: '#b85c38',
  },
}

export const WEEKDAYS = [
  { id: 'mo', label: 'Mo' },
  { id: 'di', label: 'Di' },
  { id: 'mi', label: 'Mi' },
  { id: 'do', label: 'Do' },
  { id: 'fr', label: 'Fr' },
  { id: 'sa', label: 'Sa' },
  { id: 'so', label: 'So' },
] as const

export const SEED_RECIPES: Recipe[] = [
  {
    id: 'r-rice',
    title: 'Reis',
    kind: 'base',
    tags: ['basis', 'oft'],
    ingredients: [
      { name: 'Reis', amount: '300g' },
      { name: 'Salz', amount: '1 Prise' },
    ],
    notes: 'Klassiker-Basis — Beilage jedes Mal neu pitchen.',
    createdBy: 'darius',
    createdAt: '2026-08-01T09:00:00.000Z',
  },
  {
    id: 'r-side-potato',
    title: 'Bratkartoffeln',
    kind: 'side',
    tags: ['beilage', 'ofen'],
    ingredients: [
      { name: 'Kartoffeln', amount: '800g' },
      { name: 'Zwiebel', amount: '1' },
      { name: 'Öl', amount: '2 EL' },
    ],
    createdBy: 'wendy',
    createdAt: '2026-08-01T09:05:00.000Z',
  },
  {
    id: 'r-side-salad',
    title: 'Tomaten-Gurken-Salat mit Joghurt',
    kind: 'side',
    tags: ['beilage', 'frisch'],
    ingredients: [
      { name: 'Gurke', amount: '1' },
      { name: 'Tomaten', amount: '3' },
      { name: 'Joghurt', amount: '200g' },
      { name: 'Knoblauch', amount: '1 Zehe' },
      { name: 'Salz', amount: '1 Prise' },
    ],
    createdBy: 'wendy',
    createdAt: '2026-08-01T09:10:00.000Z',
  },
  {
    id: 'r-side-dal',
    title: 'Linsen-Dal',
    kind: 'side',
    tags: ['beilage', 'vegan'],
    ingredients: [
      { name: 'Rote Linsen', amount: '200g' },
      { name: 'Kokosmilch', amount: '200ml' },
      { name: 'Currypulver', amount: '1 TL' },
      { name: 'Zwiebel', amount: '1' },
    ],
    createdBy: 'darius',
    createdAt: '2026-08-01T09:15:00.000Z',
  },
  {
    id: 'r-pasta',
    title: 'One-Pot Pasta Arrabbiata',
    kind: 'meal',
    tags: ['schnell', 'vegetarisch'],
    ingredients: [
      { name: 'Penne', amount: '400g' },
      { name: 'Tomaten passiert', amount: '500g' },
      { name: 'Knoblauch', amount: '3 Zehen' },
      { name: 'Chili', amount: '1' },
      { name: 'Olivenöl', amount: '2 EL' },
      { name: 'Basilikum', amount: '1 Bund' },
    ],
    notes: 'Alles in einem Topf, 15 Minuten.',
    createdBy: 'darius',
    createdAt: '2026-08-01T10:00:00.000Z',
  },
  {
    id: 'r-bowl',
    title: 'Halloumi Bowl',
    kind: 'meal',
    tags: ['bowl', 'vegetarisch'],
    ingredients: [
      { name: 'Halloumi', amount: '200g' },
      { name: 'Quinoa', amount: '150g' },
      { name: 'Gurke', amount: '1' },
      { name: 'Kirschtomaten', amount: '200g' },
      { name: 'Hummus', amount: '1 Glas' },
      { name: 'Zitrone', amount: '1' },
    ],
    createdBy: 'wendy',
    createdAt: '2026-08-02T10:00:00.000Z',
  },
  {
    id: 'r-curry',
    title: 'Kokos-Kichererbsen-Curry',
    kind: 'meal',
    tags: ['thermomixtauchlich', 'vegan'],
    ingredients: [
      { name: 'Kichererbsen', amount: '1 Dose' },
      { name: 'Kokosmilch', amount: '400ml' },
      { name: 'Currypaste', amount: '2 EL' },
      { name: 'Spinat', amount: '200g' },
      { name: 'Zwiebel', amount: '1' },
      { name: 'Reis', amount: '250g' },
    ],
    cookidooUrl: 'https://cookidoo.de/recipes/recipe/de-DE/r123456',
    notes: 'Demo-Cookidoo-Link – später echte URL einfügen.',
    createdBy: 'wendy',
    createdAt: '2026-08-03T10:00:00.000Z',
  },
  {
    id: 'r-sheet',
    title: 'Ofengemüse mit Feta',
    kind: 'meal',
    tags: ['ofen', 'wenig Abwasch'],
    ingredients: [
      { name: 'Zucchini', amount: '2' },
      { name: 'Paprika', amount: '2' },
      { name: 'Süßkartoffel', amount: '1' },
      { name: 'Feta', amount: '200g' },
      { name: 'Olivenöl', amount: '3 EL' },
      { name: 'Oregano', amount: '1 TL' },
    ],
    createdBy: 'darius',
    createdAt: '2026-08-04T10:00:00.000Z',
  },
]

export function mealLabel(
  main?: string | null,
  side?: string | null,
): string {
  const a = (main || '').trim()
  const b = (side || '').trim()
  if (a && b) return `${a} + ${b}`
  return a || b || 'Gericht'
}

function nextMondayLabel(): { id: string; label: string } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 1 : 8 - day
  const monday = new Date(now)
  monday.setDate(now.getDate() + diff)
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  const fmt = (d: Date) =>
    d.toLocaleDateString('de-DE', { day: '2-digit', month: 'short' })
  const id = `week-${monday.toISOString().slice(0, 10)}`
  return { id, label: `${fmt(monday)} – ${fmt(sunday)}` }
}

const weekMeta = nextMondayLabel()

export const SEED_WEEK: WeekPlan = {
  id: weekMeta.id,
  label: weekMeta.label,
  status: 'pitching',
  slots: WEEKDAYS.map((d) => ({ day: d.id })),
  createdAt: new Date().toISOString(),
}

export const DEFAULT_SETTINGS: AppSettings = {
  bring: {
    enabled: false,
    linked: false,
    email: '',
    listName: 'Einkaufen',
    listUuid: '',
    userUuid: '',
    accessToken: '',
    refreshToken: '',
    accountName: '',
    lists: [],
  },
  cookidoo: {
    enabled: false,
    linked: false,
    email: '',
    country: 'de',
    accessToken: '',
    refreshToken: '',
    language: 'de-DE',
    suggestions: [],
  },
}
