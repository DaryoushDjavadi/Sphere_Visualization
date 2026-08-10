import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import {
  importCookidooRecipeApi,
  linkBringAccount,
  linkCookidooAccount,
  pushItemsToBring,
} from './api/integrations'
import { DEFAULT_SETTINGS, SEED_RECIPES, SEED_WEEK } from './data/seed'
import type {
  AppSettings,
  Ingredient,
  Pitch,
  Recipe,
  UserId,
  Weekday,
} from './types'

interface Store {
  currentUser: UserId | null
  recipes: Recipe[]
  pitches: Pitch[]
  weeks: ReturnType<typeof createWeeks>
  activeWeekId: string
  settings: AppSettings
  shoppingDraft: Ingredient[]
  login: (user: UserId) => void
  logout: () => void
  addRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt' | 'createdBy'>) => void
  addImportedRecipe: (
    recipe: Omit<Recipe, 'id' | 'createdAt' | 'createdBy'>,
  ) => string
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
  assignSlot: (
    day: Weekday,
    payload: { recipeId?: string; title?: string; fromPitchId?: string },
  ) => void
  clearSlot: (day: Weekday) => void
  lockWeek: () => void
  reopenWeek: () => void
  buildShoppingList: () => Ingredient[]
  setShoppingDraft: (items: Ingredient[]) => void
  updateBring: (patch: Partial<AppSettings['bring']>) => void
  updateCookidoo: (patch: Partial<AppSettings['cookidoo']>) => void
  linkBring: (
    email: string,
    password: string,
  ) => Promise<{ ok: boolean; message: string }>
  unlinkBring: () => void
  pushToBring: () => Promise<{ ok: boolean; message: string; items: string[] }>
  linkCookidoo: (
    email: string,
    password: string,
    country?: string,
  ) => Promise<{ ok: boolean; message: string }>
  unlinkCookidoo: () => void
  importFromCookidooAccount: (
    recipeRef: string,
  ) => Promise<{ ok: boolean; message: string }>
  resetDemoData: () => void
}

function createWeeks() {
  return [SEED_WEEK]
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

function parseIngredientLines(text: string): Ingredient[] {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const match = line.match(
        /^([\d.,/\s]+(?:g|kg|ml|l|EL|TL|Stk\.?)?)\s+(.+)$/i,
      )
      if (match) return { amount: match[1].trim(), name: match[2].trim() }
      return { name: line }
    })
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      currentUser: null,
      recipes: SEED_RECIPES,
      pitches: [],
      weeks: createWeeks(),
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

      addImportedRecipe: (recipe) => {
        const user = get().currentUser
        if (!user) return ''
        const id = uid('r')
        const next: Recipe = {
          ...recipe,
          id,
          createdBy: user,
          createdAt: new Date().toISOString(),
        }
        set({ recipes: [next, ...get().recipes] })
        return id
      },

      importCookidooRecipe: ({ title, url, ingredientsText, notes }) => {
        const user = get().currentUser
        if (!user) return
        const next: Recipe = {
          id: uid('r'),
          title: title.trim() || 'Cookidoo Rezept',
          tags: ['cookidoo'],
          ingredients: parseIngredientLines(ingredientsText),
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
        set({
          weeks: get().weeks.map((w) => {
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
          }),
        })
      },

      clearSlot: (day) => {
        set({
          weeks: get().weeks.map((w) => {
            if (w.id !== get().activeWeekId) return w
            return {
              ...w,
              slots: w.slots.map((s) => (s.day === day ? { day } : s)),
            }
          }),
        })
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

      linkBring: async (email, password) => {
        try {
          const res = await linkBringAccount(email, password)
          if (!res.ok || !res.accessToken || !res.uuid) {
            get().updateBring({
              linked: false,
              lastError: res.message || 'Bring-Login fehlgeschlagen',
            })
            return { ok: false, message: res.message || 'Bring-Login fehlgeschlagen' }
          }
          const lists = res.lists ?? []
          const preferred =
            lists.find((l) =>
              /einkauf|shop|wg|familie/i.test(l.name),
            ) ?? lists[0]
          get().updateBring({
            enabled: true,
            linked: true,
            email,
            accountName: res.name || '',
            userUuid: res.uuid,
            accessToken: res.accessToken,
            refreshToken: res.refreshToken || '',
            lists,
            listUuid: preferred?.listUuid || '',
            listName: preferred?.name || 'Einkaufen',
            lastError: undefined,
          })
          return { ok: true, message: res.message || 'Bring verknüpft' }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Bring-Verbindung fehlgeschlagen'
          get().updateBring({ linked: false, lastError: message })
          return { ok: false, message }
        }
      },

      unlinkBring: () =>
        get().updateBring({
          linked: false,
          accessToken: '',
          refreshToken: '',
          userUuid: '',
          accountName: '',
          lists: [],
          listUuid: '',
          lastError: undefined,
        }),

      pushToBring: async () => {
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
        if (
          !settings.bring.linked ||
          !settings.bring.accessToken ||
          !settings.bring.userUuid ||
          !settings.bring.listUuid
        ) {
          return {
            ok: false,
            message: 'Bring zuerst mit E-Mail & Passwort verknüpfen.',
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
        try {
          const res = await pushItemsToBring({
            uuid: settings.bring.userUuid,
            accessToken: settings.bring.accessToken,
            listUuid: settings.bring.listUuid,
            items: items.map((i) => ({
              name: i.name,
              amount: i.amount,
            })),
          })
          const lines = res.added ?? items.map((i) =>
            i.amount ? `${i.name} (${i.amount})` : i.name,
          )
          get().updateBring({
            lastPushAt: new Date().toISOString(),
            lastPushItems: lines,
            lastError: res.ok ? undefined : res.message,
          })
          return {
            ok: res.ok,
            message: res.message,
            items: lines,
          }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Bring-Push fehlgeschlagen'
          get().updateBring({ lastError: message })
          return { ok: false, message, items: [] }
        }
      },

      linkCookidoo: async (email, password, country = 'de') => {
        try {
          const res = await linkCookidooAccount(email, password, country)
          if (!res.ok || !res.accessToken) {
            get().updateCookidoo({
              linked: false,
              lastError: res.message || 'Cookidoo-Login fehlgeschlagen',
            })
            return {
              ok: false,
              message: res.message || 'Cookidoo-Login fehlgeschlagen',
            }
          }
          get().updateCookidoo({
            enabled: true,
            linked: true,
            email,
            country: res.country || country,
            language: res.language || 'de-DE',
            accessToken: res.accessToken,
            refreshToken: res.refreshToken || '',
            suggestions: res.suggestions || [],
            lastError: undefined,
          })
          return { ok: true, message: res.message || 'Cookidoo verknüpft' }
        } catch (err) {
          const message =
            err instanceof Error
              ? err.message
              : 'Cookidoo-Verbindung fehlgeschlagen'
          get().updateCookidoo({ linked: false, lastError: message })
          return { ok: false, message }
        }
      },

      unlinkCookidoo: () =>
        get().updateCookidoo({
          linked: false,
          accessToken: '',
          refreshToken: '',
          suggestions: [],
          lastError: undefined,
        }),

      importFromCookidooAccount: async (recipeRef) => {
        const { settings, addImportedRecipe } = get()
        if (!settings.cookidoo.linked || !settings.cookidoo.accessToken) {
          return {
            ok: false,
            message: 'Cookidoo zuerst mit Login verknüpfen.',
          }
        }
        try {
          const res = await importCookidooRecipeApi({
            accessToken: settings.cookidoo.accessToken,
            recipe: recipeRef,
            country: settings.cookidoo.country || 'de',
          })
          if (!res.ok || !res.recipe) {
            get().updateCookidoo({ lastError: res.message })
            return { ok: false, message: res.message }
          }
          addImportedRecipe({
            title: res.recipe.title,
            tags: res.recipe.tags || ['cookidoo'],
            ingredients: (res.recipe.ingredients || []).map((i) => ({
              name: i.name,
              amount: i.amount || undefined,
            })),
            notes: res.recipe.notes,
            cookidooUrl: res.recipe.cookidooUrl,
            cookidooId: res.recipe.id,
          })
          get().updateCookidoo({
            lastImportUrl: res.recipe.cookidooUrl,
            lastError: undefined,
          })
          return { ok: true, message: res.message }
        } catch (err) {
          const message =
            err instanceof Error ? err.message : 'Cookidoo-Import fehlgeschlagen'
          get().updateCookidoo({ lastError: message })
          return { ok: false, message }
        }
      },

      resetDemoData: () =>
        set({
          recipes: SEED_RECIPES,
          pitches: [],
          weeks: createWeeks(),
          activeWeekId: SEED_WEEK.id,
          shoppingDraft: [],
          settings: DEFAULT_SETTINGS,
        }),
    }),
    {
      name: 'wochenkochen-demo-v2',
      partialize: (state) => {
        // Persist tokens for convenience on a private household demo;
        // never persist plaintext passwords (they are only form state).
        return {
          currentUser: state.currentUser,
          recipes: state.recipes,
          pitches: state.pitches,
          weeks: state.weeks,
          activeWeekId: state.activeWeekId,
          shoppingDraft: state.shoppingDraft,
          settings: state.settings,
        }
      },
    },
  ),
)
