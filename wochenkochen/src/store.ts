import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { DEFAULT_SETTINGS, SEED_RECIPES, SEED_WEEK } from './data/seed'
import type {
  AppSettings,
  Ingredient,
  Pitch,
  Recipe,
  UserId,
  WeekPlan,
  Weekday,
} from './types'

interface Store {
  currentUser: UserId | null
  recipes: Recipe[]
  pitches: Pitch[]
  weeks: WeekPlan[]
  activeWeekId: string
  settings: AppSettings
  shoppingDraft: Ingredient[]
  login: (user: UserId) => void
  logout: () => void
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'createdBy'>) => void
  importCookidooRecipe: (input: {
    title: string
    url: string
    ingredientsText: string
    notes?: string
  }) => void
  addPitch: (input: {
    title: string
    note: string
    recipeId?: string
  }) => void
  reactToPitch: (pitchId: string, reaction: 'yes' | 'maybe' | 'no') => void
  assignSlot: (day: Weekday, payload: { recipeId?: string; title?: string; fromPitchId?: string }) => void
  clearSlot: (day: Weekday) => void
  lockWeek: () => void
  reopenWeek: () => void
  buildShoppingList: () => Ingredient[]
  setShoppingDraft: (items: Ingredient[]) => void
  updateSettings: (patch: Partial<AppSettings>) => void
  updateBring: (patch: Partial<AppSettings['bring']>) => void
  updateCookidoo: (patch: Partial<AppSettings['cookidoo']>) => void
  pushToBringDemo: () => { ok: boolean; message: string; items: string[] }
  resetDemoData: () => void
}

function uid(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function mergeIngredients(items: Ingredient[]): Ingredient[] {
  const map = new Map<string, Ingredient>()
  for (const item of items) {
    const key = item.name.trim().toLowerCase()
    if (!key) continue
    const existing = map.get(key)
    if (!existing) {
      map.set(key, { ...item, name: item.name.trim() })
    } else if (item.amount && existing.amount && item.amount !== existing.amount) {
      existing.amount = `${existing.amount} + ${item.amount}`
    } else if (item.amount && !existing.amount) {
      existing.amount = item.amount
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'de'))
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      currentUser: null,
      recipes: SEED_RECIPES,
      pitches: [],
      weeks: [SEED_WEEK],
      activeWeekId: SEED_WEEK.id,
      settings: DEFAULT_SETTINGS,
      shoppingDraft: [],

      login: (user) => set({ currentUser: user }),
      logout: () => set({ currentUser: null }),

      addRecipe: (recipe) => {
        const user = get().currentUser
        if (!user) return
        const next: Recipe = {
          ...recipe,
          id: uid('r'),
          createdBy: user,
          createdAt: new Date().toISOString(),
        }
        set({ recipes: [next, ...get().recipes] })
      },

      importCookidooRecipe: ({ title, url, ingredientsText, notes }) => {
        const user = get().currentUser
        if (!user) return
        const ingredients = ingredientsText
          .split('\n')
          .map((line) => line.trim())
          .filter(Boolean)
          .map((line) => {
            const match = line.match(/^([\d.,/\s]+(?:g|kg|ml|l|EL|TL|Stk\.?)?)\s+(.+)$/i)
            if (match) return { amount: match[1].trim(), name: match[2].trim() }
            return { name: line }
          })
        const next: Recipe = {
          id: uid('r'),
          title: title.trim() || 'Cookidoo Rezept',
          tags: ['cookidoo'],
          ingredients,
          notes,
          cookidooUrl: url.trim(),
          createdBy: user,
          createdAt: new Date().toISOString(),
        }
        set({
          recipes: [next, ...get().recipes],
          settings: {
            ...get().settings,
            cookidoo: {
              ...get().settings.cookidoo,
              lastImportUrl: url.trim(),
              linked: true,
            },
          },
        })
      },

      addPitch: ({ title, note, recipeId }) => {
        const user = get().currentUser
        const weekId = get().activeWeekId
        if (!user || !weekId) return
        const pitch: Pitch = {
          id: uid('p'),
          weekId,
          recipeId,
          title: title.trim(),
          note: note.trim(),
          pitchedBy: user,
          reactions: { [user]: 'yes' },
          createdAt: new Date().toISOString(),
        }
        set({ pitches: [pitch, ...get().pitches] })
      },

      reactToPitch: (pitchId, reaction) => {
        const user = get().currentUser
        if (!user) return
        set({
          pitches: get().pitches.map((p) =>
            p.id === pitchId
              ? { ...p, reactions: { ...p.reactions, [user]: reaction } }
              : p,
          ),
        })
      },

      assignSlot: (day, payload) => {
        const weeks = get().weeks.map((w) => {
          if (w.id !== get().activeWeekId) return w
          return {
            ...w,
            slots: w.slots.map((s) =>
              s.day === day
                ? {
                    day,
                    recipeId: payload.recipeId,
                    title: payload.title,
                    fromPitchId: payload.fromPitchId,
                  }
                : s,
            ),
          }
        })
        set({ weeks })
      },

      clearSlot: (day) => {
        const weeks = get().weeks.map((w) => {
          if (w.id !== get().activeWeekId) return w
          return {
            ...w,
            slots: w.slots.map((s) => (s.day === day ? { day } : s)),
          }
        })
        set({ weeks })
      },

      lockWeek: () => {
        set({
          weeks: get().weeks.map((w) =>
            w.id === get().activeWeekId ? { ...w, status: 'locked' } : w,
          ),
        })
      },

      reopenWeek: () => {
        set({
          weeks: get().weeks.map((w) =>
            w.id === get().activeWeekId ? { ...w, status: 'pitching' } : w,
          ),
        })
      },

      buildShoppingList: () => {
        const { weeks, activeWeekId, recipes } = get()
        const week = weeks.find((w) => w.id === activeWeekId)
        if (!week) return []
        const items: Ingredient[] = []
        for (const slot of week.slots) {
          if (!slot.recipeId) continue
          const recipe = recipes.find((r) => r.id === slot.recipeId)
          if (recipe) items.push(...recipe.ingredients)
        }
        const merged = mergeIngredients(items)
        set({ shoppingDraft: merged })
        return merged
      },

      setShoppingDraft: (items) => set({ shoppingDraft: items }),

      updateSettings: (patch) =>
        set({ settings: { ...get().settings, ...patch } }),

      updateBring: (patch) =>
        set({
          settings: {
            ...get().settings,
            bring: { ...get().settings.bring, ...patch },
          },
        }),

      updateCookidoo: (patch) =>
        set({
          settings: {
            ...get().settings,
            cookidoo: { ...get().settings.cookidoo, ...patch },
          },
        }),

      pushToBringDemo: () => {
        const { settings, shoppingDraft, buildShoppingList } = get()
        const items =
          shoppingDraft.length > 0 ? shoppingDraft : buildShoppingList()
        if (!settings.bring.enabled) {
          return {
            ok: false,
            message: 'Bring ist in den Einstellungen noch aus.',
            items: [],
          }
        }
        if (!settings.bring.linked) {
          return {
            ok: false,
            message: 'Bring zuerst in den Einstellungen verknüpfen.',
            items: [],
          }
        }
        if (items.length === 0) {
          return {
            ok: false,
            message: 'Keine Zutaten im Wochenplan – erst Gerichte festlegen.',
            items: [],
          }
        }
        const lines = items.map((i) =>
          i.amount ? `${i.name} (${i.amount})` : i.name,
        )
        set({
          settings: {
            ...get().settings,
            bring: {
              ...get().settings.bring,
              lastPushAt: new Date().toISOString(),
              lastPushItems: lines,
            },
          },
        })
        return {
          ok: true,
          message: `${lines.length} Artikel → Bring-Liste „${settings.bring.listName || 'Einkaufen'}“ (Demo-Push).`,
          items: lines,
        }
      },

      resetDemoData: () =>
        set({
          recipes: SEED_RECIPES,
          pitches: [],
          weeks: [SEED_WEEK],
          activeWeekId: SEED_WEEK.id,
          shoppingDraft: [],
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'wochenkochen-demo-v1',
    },
  ),
)
