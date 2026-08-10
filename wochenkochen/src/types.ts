export type UserId = 'darius' | 'wendy'

export interface User {
  id: UserId
  name: string
  short: string
  color: string
}

export interface Ingredient {
  name: string
  amount?: string
}

export interface Recipe {
  id: string
  title: string
  tags: string[]
  ingredients: Ingredient[]
  notes?: string
  cookidooUrl?: string
  createdBy: UserId
  createdAt: string
}

export interface Pitch {
  id: string
  weekId: string
  recipeId?: string
  title: string
  note: string
  pitchedBy: UserId
  reactions: Partial<Record<UserId, 'yes' | 'maybe' | 'no'>>
  createdAt: string
}

export type Weekday = 'mo' | 'di' | 'mi' | 'do' | 'fr' | 'sa' | 'so'

export interface WeekSlot {
  day: Weekday
  recipeId?: string
  title?: string
  fromPitchId?: string
}

export interface WeekPlan {
  id: string
  label: string
  status: 'pitching' | 'locked'
  slots: WeekSlot[]
  createdAt: string
}

export interface BringSettings {
  enabled: boolean
  linked: boolean
  email: string
  listName: string
  listUuid: string
  lastPushAt?: string
  lastPushItems?: string[]
}

export interface CookidooSettings {
  enabled: boolean
  linked: boolean
  accountHint: string
  lastImportUrl?: string
}

export interface AppSettings {
  bring: BringSettings
  cookidoo: CookidooSettings
}

export interface AppState {
  currentUser: UserId | null
  recipes: Recipe[]
  pitches: Pitch[]
  weeks: WeekPlan[]
  activeWeekId: string
  settings: AppSettings
  shoppingDraft: Ingredient[]
}
