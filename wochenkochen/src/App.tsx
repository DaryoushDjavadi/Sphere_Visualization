import { useMemo, useState } from 'react'
import {
  CalendarDays,
  ChefHat,
  MessageSquarePlus,
  Settings,
  ShoppingCart,
} from 'lucide-react'
import { USERS } from './data/seed'
import { useStore } from './store'
import type { UserId, Weekday } from './types'

type Tab = 'week' | 'pitch' | 'recipes' | 'shop' | 'settings'

function Avatar({ userId, size = 28 }: { userId: UserId; size?: number }) {
  const user = USERS[userId]
  return (
    <span
      className="avatar"
      style={{ background: user.color, width: size, height: size }}
      aria-hidden
    >
      {user.short}
    </span>
  )
}

function LoginScreen() {
  const login = useStore((s) => s.login)
  return (
    <div className="app-shell login-shell">
      <div>
        <div className="login-hero">
          <h1>Wochenkochen</h1>
          <p>
            Am Wochenende pitchen, festnageln, einkaufen — Darius &amp; Wendy
            planen die nächste Woche gemeinsam.
          </p>
        </div>
        <div className="panel solid stack">
          <div>
            <h2>Wer kocht mit?</h2>
            <p className="lede">Demo-Login — einfach antippen.</p>
          </div>
          <div className="user-pick">
            <button type="button" onClick={() => login('darius')}>
              <Avatar userId="darius" size={44} />
              <span>
                <strong>Darius</strong>
                <span>Weiter als Darius</span>
              </span>
            </button>
            <button type="button" onClick={() => login('wendy')}>
              <Avatar userId="wendy" size={44} />
              <span>
                <strong>Wendy</strong>
                <span>Weiter als Wendy</span>
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function TopBar() {
  const currentUser = useStore((s) => s.currentUser)!
  const logout = useStore((s) => s.logout)
  const week = useStore((s) => s.weeks.find((w) => w.id === s.activeWeekId))
  return (
    <header className="topbar">
      <div className="brand-mark">
        <strong>Wochenkochen</strong>
        <span>{week?.label ?? 'Nächste Woche'}</span>
      </div>
      <button type="button" className="user-chip" onClick={logout} title="Abmelden">
        <Avatar userId={currentUser} />
        <span>{USERS[currentUser].name}</span>
      </button>
    </header>
  )
}

function BottomNav({ tab, setTab }: { tab: Tab; setTab: (t: Tab) => void }) {
  const items: { id: Tab; label: string; icon: typeof CalendarDays }[] = [
    { id: 'week', label: 'Plan', icon: CalendarDays },
    { id: 'pitch', label: 'Pitch', icon: MessageSquarePlus },
    { id: 'recipes', label: 'Rezepte', icon: ChefHat },
    { id: 'shop', label: 'Bring', icon: ShoppingCart },
    { id: 'settings', label: 'Mehr', icon: Settings },
  ]
  return (
    <nav className="bottom-nav" aria-label="Hauptnavigation">
      {items.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          className={tab === id ? 'active' : ''}
          onClick={() => setTab(id)}
        >
          <Icon />
          {label}
        </button>
      ))}
    </nav>
  )
}

function WeekView({ onPitch }: { onPitch: () => void }) {
  const week = useStore((s) => s.weeks.find((w) => w.id === s.activeWeekId))
  const recipes = useStore((s) => s.recipes)
  const pitches = useStore((s) =>
    s.pitches.filter((p) => p.weekId === s.activeWeekId),
  )
  const assignSlot = useStore((s) => s.assignSlot)
  const clearSlot = useStore((s) => s.clearSlot)
  const lockWeek = useStore((s) => s.lockWeek)
  const reopenWeek = useStore((s) => s.reopenWeek)
  const [pickingDay, setPickingDay] = useState<Weekday | null>(null)

  if (!week) return null

  const weekdayLabels: Record<Weekday, string> = {
    mo: 'Montag',
    di: 'Dienstag',
    mi: 'Mittwoch',
    do: 'Donnerstag',
    fr: 'Freitag',
    sa: 'Samstag',
    so: 'Sonntag',
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="section-head">
          <div>
            <h2>Wochenplan</h2>
            <p className="lede">Gerichte aus Pitches oder Rezepten zuordnen.</p>
          </div>
          <span
            className={`status-pill ${week.status === 'locked' ? '' : 'warn'}`}
          >
            {week.status === 'locked' ? 'Festgelegt' : 'Pitch-Phase'}
          </span>
        </div>
        <div className="row wrap">
          {week.status === 'pitching' ? (
            <>
              <button type="button" className="btn sm" onClick={onPitch}>
                Zum Pitch
              </button>
              <button type="button" className="btn sm accent" onClick={lockWeek}>
                Woche festnageln
              </button>
            </>
          ) : (
            <button type="button" className="btn sm secondary" onClick={reopenWeek}>
              Wieder öffnen
            </button>
          )}
        </div>
      </div>

      <div className="day-grid">
        {week.slots.map((slot) => {
          const recipe = recipes.find((r) => r.id === slot.recipeId)
          const title = slot.title || recipe?.title
          return (
            <div
              key={slot.day}
              className={`day-card ${title ? '' : 'empty'}`}
            >
              <div className="row">
                <strong className="grow">{weekdayLabels[slot.day]}</strong>
                {title ? (
                  <button
                    type="button"
                    className="btn ghost sm"
                    onClick={() => clearSlot(slot.day)}
                  >
                    Leeren
                  </button>
                ) : null}
              </div>
              {title ? (
                <>
                  <h3>{title}</h3>
                  {recipe?.tags?.length ? (
                    <div className="tags">
                      {recipe.tags.map((t) => (
                        <span key={t} className="tag">
                          {t}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : (
                <button
                  type="button"
                  className="btn secondary sm"
                  onClick={() => setPickingDay(slot.day)}
                >
                  Gericht wählen
                </button>
              )}
            </div>
          )
        })}
      </div>

      {pickingDay ? (
        <div className="modal-backdrop" onClick={() => setPickingDay(null)}>
          <div className="modal stack" onClick={(e) => e.stopPropagation()}>
            <div className="section-head">
              <h2>{weekdayLabels[pickingDay]}</h2>
              <button
                type="button"
                className="btn ghost sm"
                onClick={() => setPickingDay(null)}
              >
                Schließen
              </button>
            </div>
            <p className="muted tiny">Aus Pitches</p>
            {pitches.length === 0 ? (
              <p className="muted">Noch keine Pitches — erst vorschlagen.</p>
            ) : (
              pitches.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="btn secondary"
                  onClick={() => {
                    assignSlot(pickingDay, {
                      recipeId: p.recipeId,
                      title: p.title,
                      fromPitchId: p.id,
                    })
                    setPickingDay(null)
                  }}
                >
                  {p.title}
                </button>
              ))
            )}
            <div className="divider" />
            <p className="muted tiny">Aus Rezepten</p>
            {recipes.map((r) => (
              <button
                key={r.id}
                type="button"
                className="btn secondary"
                onClick={() => {
                  assignSlot(pickingDay, {
                    recipeId: r.id,
                    title: r.title,
                  })
                  setPickingDay(null)
                }}
              >
                {r.title}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function PitchView() {
  const currentUser = useStore((s) => s.currentUser)!
  const recipes = useStore((s) => s.recipes)
  const pitches = useStore((s) =>
    s.pitches.filter((p) => p.weekId === s.activeWeekId),
  )
  const addPitch = useStore((s) => s.addPitch)
  const reactToPitch = useStore((s) => s.reactToPitch)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [recipeId, setRecipeId] = useState('')

  return (
    <div className="stack">
      <div className="panel stack">
        <div>
          <h2>Pitch-Modus</h2>
          <p className="lede">
            Vorschläge für nächste Woche — mit Notiz, Reaktion, fertig.
          </p>
        </div>
        <div className="field">
          <label htmlFor="pitch-title">Gericht / Idee</label>
          <input
            id="pitch-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="z. B. Ramen-Abend"
          />
        </div>
        <div className="field">
          <label htmlFor="pitch-recipe">Rezept verknüpfen (optional)</label>
          <select
            id="pitch-recipe"
            value={recipeId}
            onChange={(e) => {
              setRecipeId(e.target.value)
              const r = recipes.find((x) => x.id === e.target.value)
              if (r && !title) setTitle(r.title)
            }}
          >
            <option value="">— freier Pitch —</option>
            {recipes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="pitch-note">Notiz</label>
          <textarea
            id="pitch-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Warum cool? Zeitaufwand? Wünsche?"
          />
        </div>
        <button
          type="button"
          className="btn accent"
          disabled={!title.trim()}
          onClick={() => {
            addPitch({
              title,
              note,
              recipeId: recipeId || undefined,
            })
            setTitle('')
            setNote('')
            setRecipeId('')
          }}
        >
          Pitch absenden
        </button>
      </div>

      {pitches.map((p) => (
        <article key={p.id} className="pitch-card">
          <div className="row">
            <Avatar userId={p.pitchedBy} />
            <div className="grow">
              <h3>{p.title}</h3>
              <p className="muted tiny">
                von {USERS[p.pitchedBy].name}
                {p.recipeId ? ' · Rezept verknüpft' : ''}
              </p>
            </div>
          </div>
          {p.note ? <p>{p.note}</p> : null}
          <div className="reaction">
            {(
              [
                ['yes', 'Yes'],
                ['maybe', 'Maybe'],
                ['no', 'Nope'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                className={
                  p.reactions[currentUser] === key ? `active-${key}` : ''
                }
                onClick={() => reactToPitch(p.id, key)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="row wrap">
            {(['darius', 'wendy'] as UserId[]).map((uid) =>
              p.reactions[uid] ? (
                <span key={uid} className="tag green">
                  {USERS[uid].name}: {p.reactions[uid]}
                </span>
              ) : null,
            )}
          </div>
        </article>
      ))}
    </div>
  )
}

function RecipesView() {
  const recipes = useStore((s) => s.recipes)
  const settings = useStore((s) => s.settings)
  const addRecipe = useStore((s) => s.addRecipe)
  const importCookidooRecipe = useStore((s) => s.importCookidooRecipe)
  const [open, setOpen] = useState(false)
  const [cookidooOpen, setCookidooOpen] = useState(false)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [ingredients, setIngredients] = useState('')
  const [notes, setNotes] = useState('')
  const [cTitle, setCTitle] = useState('')
  const [cUrl, setCUrl] = useState('')
  const [cIngredients, setCIngredients] = useState('')
  const [cNotes, setCNotes] = useState('')

  return (
    <div className="stack">
      <div className="panel">
        <div className="section-head">
          <div>
            <h2>Rezepte</h2>
            <p className="lede">Bibliothek für eure Woche.</p>
          </div>
        </div>
        <div className="row wrap">
          <button type="button" className="btn sm" onClick={() => setOpen(true)}>
            Neu
          </button>
          {settings.cookidoo.enabled ? (
            <button
              type="button"
              className="btn sm secondary"
              onClick={() => setCookidooOpen(true)}
            >
              Cookidoo import
            </button>
          ) : null}
        </div>
      </div>

      {recipes.map((r) => (
        <article key={r.id} className="recipe-card">
          <div className="row">
            <div className="grow">
              <h3>{r.title}</h3>
              <p className="muted tiny">
                von {USERS[r.createdBy].name} · {r.ingredients.length} Zutaten
              </p>
            </div>
            <Avatar userId={r.createdBy} />
          </div>
          <div className="tags">
            {r.tags.map((t) => (
              <span key={t} className="tag">
                {t}
              </span>
            ))}
            {r.cookidooUrl ? <span className="tag green">Cookidoo</span> : null}
          </div>
          {r.notes ? <p className="muted">{r.notes}</p> : null}
          {r.cookidooUrl ? (
            <a className="tiny" href={r.cookidooUrl} target="_blank" rel="noreferrer">
              In Cookidoo öffnen ↗
            </a>
          ) : null}
        </article>
      ))}

      {open ? (
        <div className="modal-backdrop" onClick={() => setOpen(false)}>
          <div className="modal stack" onClick={(e) => e.stopPropagation()}>
            <h2>Neues Rezept</h2>
            <div className="field">
              <label htmlFor="r-title">Titel</label>
              <input id="r-title" value={title} onChange={(e) => setTitle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="r-tags">Tags (Komma)</label>
              <input
                id="r-tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="schnell, vegetarisch"
              />
            </div>
            <div className="field">
              <label htmlFor="r-ing">Zutaten (eine pro Zeile)</label>
              <textarea
                id="r-ing"
                value={ingredients}
                onChange={(e) => setIngredients(e.target.value)}
                placeholder={'400g Penne\n2 EL Öl'}
              />
            </div>
            <div className="field">
              <label htmlFor="r-notes">Notizen</label>
              <textarea id="r-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn"
              disabled={!title.trim()}
              onClick={() => {
                addRecipe({
                  title: title.trim(),
                  tags: tags
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean),
                  ingredients: ingredients
                    .split('\n')
                    .map((l) => l.trim())
                    .filter(Boolean)
                    .map((line) => {
                      const m = line.match(
                        /^([\d.,/\s]+(?:g|kg|ml|l|EL|TL|Stk\.?)?)\s+(.+)$/i,
                      )
                      if (m) return { amount: m[1].trim(), name: m[2].trim() }
                      return { name: line }
                    }),
                  notes: notes.trim() || undefined,
                })
                setTitle('')
                setTags('')
                setIngredients('')
                setNotes('')
                setOpen(false)
              }}
            >
              Speichern
            </button>
          </div>
        </div>
      ) : null}

      {cookidooOpen ? (
        <div className="modal-backdrop" onClick={() => setCookidooOpen(false)}>
          <div className="modal stack" onClick={(e) => e.stopPropagation()}>
            <h2>Cookidoo Import</h2>
            <p className="lede">
              Link + Titel + Zutaten einfügen. Vollautomatischer Library-Sync
              kommt später (kein offizielles API).
            </p>
            <div className="field">
              <label htmlFor="c-url">Cookidoo-Link</label>
              <input
                id="c-url"
                value={cUrl}
                onChange={(e) => setCUrl(e.target.value)}
                placeholder="https://cookidoo.de/..."
              />
            </div>
            <div className="field">
              <label htmlFor="c-title">Titel</label>
              <input id="c-title" value={cTitle} onChange={(e) => setCTitle(e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="c-ing">Zutaten</label>
              <textarea
                id="c-ing"
                value={cIngredients}
                onChange={(e) => setCIngredients(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="c-notes">Notizen</label>
              <textarea id="c-notes" value={cNotes} onChange={(e) => setCNotes(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn"
              disabled={!cUrl.trim() || !cTitle.trim()}
              onClick={() => {
                importCookidooRecipe({
                  title: cTitle,
                  url: cUrl,
                  ingredientsText: cIngredients,
                  notes: cNotes || undefined,
                })
                setCTitle('')
                setCUrl('')
                setCIngredients('')
                setCNotes('')
                setCookidooOpen(false)
              }}
            >
              Importieren
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function ShopView() {
  const settings = useStore((s) => s.settings)
  const shoppingDraft = useStore((s) => s.shoppingDraft)
  const buildShoppingList = useStore((s) => s.buildShoppingList)
  const pushToBringDemo = useStore((s) => s.pushToBringDemo)
  const [flash, setFlash] = useState<{ ok: boolean; message: string } | null>(
    null,
  )

  const items = useMemo(
    () => (shoppingDraft.length ? shoppingDraft : []),
    [shoppingDraft],
  )

  return (
    <div className="stack">
      <div className="panel stack">
        <div className="section-head">
          <div>
            <h2>Einkaufsliste</h2>
            <p className="lede">
              Zutaten aus dem Wochenplan — optional nach Bring pushen.
            </p>
          </div>
          <span
            className={`status-pill ${settings.bring.enabled && settings.bring.linked ? '' : 'off'}`}
          >
            {settings.bring.enabled
              ? settings.bring.linked
                ? 'Bring linked'
                : 'Bring an'
              : 'Bring aus'}
          </span>
        </div>
        <div className="row wrap">
          <button
            type="button"
            className="btn sm"
            onClick={() => {
              buildShoppingList()
              setFlash({ ok: true, message: 'Liste aus Wochenplan gebaut.' })
            }}
          >
            Aus Plan bauen
          </button>
          <button
            type="button"
            className="btn sm accent"
            onClick={() => {
              const res = pushToBringDemo()
              setFlash({ ok: res.ok, message: res.message })
            }}
          >
            An Bring senden
          </button>
        </div>
        {settings.bring.enabled && settings.bring.linked ? (
          <p className="muted tiny">
            Ziel: {settings.bring.listName || 'Einkaufen'}
            {settings.bring.email ? ` · ${settings.bring.email}` : ''}
          </p>
        ) : (
          <p className="muted tiny">
            Bring in den Einstellungen aktivieren &amp; verknüpfen, um den Push
            zu testen.
          </p>
        )}
      </div>

      {flash ? (
        <div className={`flash ${flash.ok ? '' : 'bad'}`}>{flash.message}</div>
      ) : null}

      <ul className="shopping-list panel">
        {items.length === 0 ? (
          <li>
            <span className="muted">Noch leer — erst „Aus Plan bauen“.</span>
          </li>
        ) : (
          items.map((item) => (
            <li key={`${item.name}-${item.amount ?? ''}`}>
              <span>{item.name}</span>
              <span className="muted">{item.amount}</span>
            </li>
          ))
        )}
      </ul>

      {settings.bring.lastPushItems?.length ? (
        <div className="panel stack">
          <h3>Letzter Demo-Push</h3>
          <p className="muted tiny">
            {settings.bring.lastPushAt
              ? new Date(settings.bring.lastPushAt).toLocaleString('de-DE')
              : ''}
          </p>
          {settings.bring.lastPushItems.map((line) => (
            <div key={line} className="tiny">
              · {line}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function SettingsView() {
  const settings = useStore((s) => s.settings)
  const updateBring = useStore((s) => s.updateBring)
  const updateCookidoo = useStore((s) => s.updateCookidoo)
  const resetDemoData = useStore((s) => s.resetDemoData)
  const logout = useStore((s) => s.logout)

  return (
    <div className="stack">
      <div className="panel">
        <h2>Integrationen</h2>
        <p className="lede">Optionale Toggles — zum Testen an/aus.</p>

        <div className="toggle-row">
          <div>
            <strong>Bring!</strong>
            <p className="muted tiny">Shopping-Liste auf dem iPhone</p>
          </div>
          <button
            type="button"
            className={`toggle ${settings.bring.enabled ? 'on' : ''}`}
            aria-pressed={settings.bring.enabled}
            aria-label="Bring umschalten"
            onClick={() =>
              updateBring({
                enabled: !settings.bring.enabled,
                linked: settings.bring.enabled ? false : settings.bring.linked,
              })
            }
          />
        </div>

        {settings.bring.enabled ? (
          <div className="stack" style={{ marginTop: 8 }}>
            <div className="field">
              <label htmlFor="bring-email">Bring E-Mail</label>
              <input
                id="bring-email"
                value={settings.bring.email}
                onChange={(e) => updateBring({ email: e.target.value })}
                placeholder="ihr@email.de"
                autoComplete="email"
              />
            </div>
            <div className="field">
              <label htmlFor="bring-list">Listenname</label>
              <input
                id="bring-list"
                value={settings.bring.listName}
                onChange={(e) => updateBring({ listName: e.target.value })}
                placeholder="Einkaufen"
              />
            </div>
            <div className="field">
              <label htmlFor="bring-uuid">List UUID (optional, später API)</label>
              <input
                id="bring-uuid"
                value={settings.bring.listUuid}
                onChange={(e) => updateBring({ listUuid: e.target.value })}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              />
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={() =>
                updateBring({
                  linked: true,
                  listName: settings.bring.listName || 'Einkaufen',
                })
              }
            >
              {settings.bring.linked ? 'Erneut verknüpfen' : 'Bring verknüpfen (Demo)'}
            </button>
            {settings.bring.linked ? (
              <span className="status-pill">Verknüpft</span>
            ) : null}
            <p className="muted tiny">
              Browser-Demo speichert die Verknüpfung lokal. Echter API-Push
              braucht später Backend (CORS).
            </p>
          </div>
        ) : null}

        <div className="toggle-row">
          <div>
            <strong>Cookidoo</strong>
            <p className="muted tiny">Thermomix-Rezepte per Link</p>
          </div>
          <button
            type="button"
            className={`toggle ${settings.cookidoo.enabled ? 'on' : ''}`}
            aria-pressed={settings.cookidoo.enabled}
            aria-label="Cookidoo umschalten"
            onClick={() =>
              updateCookidoo({
                enabled: !settings.cookidoo.enabled,
                linked: settings.cookidoo.enabled
                  ? false
                  : settings.cookidoo.linked,
              })
            }
          />
        </div>

        {settings.cookidoo.enabled ? (
          <div className="stack" style={{ marginTop: 8 }}>
            <div className="field">
              <label htmlFor="cook-hint">Account-Hinweis</label>
              <input
                id="cook-hint"
                value={settings.cookidoo.accountHint}
                onChange={(e) =>
                  updateCookidoo({ accountHint: e.target.value })
                }
                placeholder="z. B. Wendy's Cookidoo"
              />
            </div>
            <button
              type="button"
              className="btn secondary"
              onClick={() => updateCookidoo({ linked: true })}
            >
              {settings.cookidoo.linked
                ? 'Cookidoo bereit'
                : 'Cookidoo freischalten'}
            </button>
            {settings.cookidoo.linked ? (
              <span className="status-pill">Import in Rezepte aktiv</span>
            ) : null}
            <p className="muted tiny">
              Unter Rezepte erscheint „Cookidoo import“. Kein offizieller
              Library-Sync.
            </p>
          </div>
        ) : null}
      </div>

      <div className="panel stack">
        <h2>Demo</h2>
        <button type="button" className="btn secondary" onClick={resetDemoData}>
          Demo-Daten zurücksetzen
        </button>
        <button type="button" className="btn ghost" onClick={logout}>
          Abmelden
        </button>
      </div>
    </div>
  )
}

export default function App() {
  const currentUser = useStore((s) => s.currentUser)
  const [tab, setTab] = useState<Tab>('week')

  if (!currentUser) return <LoginScreen />

  return (
    <div className="app-shell">
      <TopBar />
      {tab === 'week' ? <WeekView onPitch={() => setTab('pitch')} /> : null}
      {tab === 'pitch' ? <PitchView /> : null}
      {tab === 'recipes' ? <RecipesView /> : null}
      {tab === 'shop' ? <ShopView /> : null}
      {tab === 'settings' ? <SettingsView /> : null}
      <BottomNav tab={tab} setTab={setTab} />
    </div>
  )
}
