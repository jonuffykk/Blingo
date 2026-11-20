import { course } from './course'

export const lessons = course.units.flatMap(unit => [...unit.lessons])
export const maxHearts = 5
export const heartPrice = 10
const heartInterval = 20 * 60_000
export const storageKey = 'blingo.study.english.v3'

type Profile = {
  id: string
  name: string
  hearts: number
  heartAt: number
  xp: number
  wallet: number
  completed: Record<string, number[]>
  mistakes: string[]
  activity: Record<string, number>
  review: Record<string, { stage: number; due: string }>
}

type Study = { version: 3; active: string; sound: boolean; profiles: Profile[] }

export type Question = (typeof lessons)[number]['questions'][number]
export type Card = { key: string; index: number; lesson: string; question: Question }
export const cards = lessons.flatMap(lesson => lesson.questions.map((question, index) => ({
  key: lesson.id + ':' + index,
  index,
  lesson: lesson.id,
  question,
})))
const knownCards = new Set(cards.map(card => card.key))

export function newProfile(name = 'Estudante'): Profile {
  const id = Array.from(crypto.getRandomValues(new Uint8Array(12)), value => value.toString(16).padStart(2, '0')).join('')
  return { id, name, hearts: maxHearts, heartAt: Date.now(), xp: 0, wallet: 0, completed: {}, mistakes: [], activity: {}, review: {} }
}

export function dayKey(offset = 0) {
  const date = new Date()
  date.setDate(date.getDate() + offset)
  return [date.getFullYear(), date.getMonth() + 1, date.getDate()].map(part => String(part).padStart(2, '0')).join('-')
}

function object(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function whole(value: unknown, limit: number, fallback = 0) {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? Math.min(limit, value) : fallback
}

function parseStudy(value: unknown): Study {
  const raw = object(value)
  if (raw.version !== 3 || !Array.isArray(raw.profiles) || raw.profiles.length === 0 || raw.profiles.length > 16) throw Error('Backup incompatível')
  const profiles = raw.profiles.map((data: unknown) => {
    const item = object(data)
    if (typeof item.id !== 'string' || !/^[a-f0-9]{24}$/.test(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 32) {
      throw Error('Invalid profile')
    }
    const completed: Profile['completed'] = {}
    for (const lesson of lessons) {
      const saved = object(item.completed)[lesson.id]
      if (Array.isArray(saved)) {
        completed[lesson.id] = [...new Set(saved.filter((index): index is number =>
          typeof index === 'number' && Number.isInteger(index) && index >= 0 && index < lesson.questions.length))]
      }
    }
    const activity = Object.fromEntries(Object.entries(object(item.activity)).filter(([date]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && date <= dayKey()).map(([date, xp]) => [date, whole(xp, 1_000_000)]))
    const xp = whole(item.xp, 10_000_000)
    const review: Profile['review'] = {}
    for (const [key, data] of Object.entries(object(item.review))) {
      const entry = object(data)
      if (knownCards.has(key) && typeof entry.due === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(entry.due)) {
        review[key] = { stage: whole(entry.stage, 4), due: entry.due }
      }
    }
    return {
      id: item.id,
      name: item.name.trim(),
      hearts: whole(item.hearts, maxHearts, maxHearts),
      heartAt: whole(item.heartAt, Date.now(), Date.now()),
      xp,
      wallet: whole(item.wallet, xp),
      completed,
      mistakes: Array.isArray(item.mistakes) ? [...new Set(item.mistakes.filter((key): key is string => typeof key === 'string' && knownCards.has(key)))] : [],
      activity,
      review,
    }
  })
  if (new Set(profiles.map(profile => profile.id)).size !== profiles.length) throw Error('Duplicate profile')
  const active = profiles.find(profile => profile.id === raw.active)?.id ?? profiles[0].id
  return { version: 3, active, profiles, sound: raw.sound !== false }
}

export function load(): Study {
  try {
    const stored = localStorage.getItem(storageKey)
    if (stored) return parseStudy(JSON.parse(stored))
    const legacy = localStorage.getItem('blingo.study.v2')
    if (legacy) {
      const data = object(JSON.parse(legacy))
      const profiles = Array.isArray(data.profiles) ? data.profiles.slice(0, 16).flatMap((entry: unknown) => {
        const prior = object(entry)
        if (typeof prior.name !== 'string' || !prior.name.trim()) return []
        const name = prior.name === 'Learner' ? 'Estudante' : prior.name.trim().slice(0, 32)
        const profile = newProfile(name)
        if (typeof prior.id === 'string' && /^[a-f0-9]{24}$/.test(prior.id)) profile.id = prior.id
        return [profile]
      }) : []
      if (profiles.length) return parseStudy({ version: 3, profiles, active: data.active, sound: data.sound })
    }
  } catch {}
  const profile = newProfile()
  return { version: 3, active: profile.id, profiles: [profile], sound: true }
}

export let study = load()
export let storageAvailable = true

export function save() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(study))
    storageAvailable = true
  } catch {
    storageAvailable = false
  }
}

export function restore(text: string) {
  const imported = parseStudy(JSON.parse(text))
  const fresh = imported.profiles.filter(profile => !study.profiles.some(current => current.id === profile.id))
  if (study.profiles.length + fresh.length > 16) throw Error('Profile limit')
  if (!fresh.length && imported.profiles.every(profile => profile.id === study.active && profile.xp === 0) && activeProfile().xp) {
    throw Error('Empty backup')
  }
  study.profiles = [...study.profiles.map(profile => {
    const fromBackup = imported.profiles.find(item => item.id === profile.id)
    return fromBackup && fromBackup.xp > profile.xp ? fromBackup : profile
  }), ...fresh]
  study.active = imported.active
  save()
}

export function activeProfile() {
  return study.profiles.find(profile => profile.id === study.active) ?? study.profiles[0]
}

export function syncStorage() {
  study = load()
}

export function refill(profile = activeProfile()) {
  if (profile.hearts >= maxHearts) return
  const now = Date.now()
  if (profile.heartAt > now) profile.heartAt = now
  const earned = Math.floor((now - profile.heartAt) / heartInterval)
  if (!earned) return
  profile.hearts = Math.min(maxHearts, profile.hearts + earned)
  profile.heartAt += earned * heartInterval
  save()
}

export function nextHeart(profile = activeProfile()) {
  return Math.max(1, Math.ceil((profile.heartAt + heartInterval - Date.now()) / 60_000))
}

export function earn(xp: number, profile = activeProfile()) {
  const today = dayKey()
  profile.xp += xp
  profile.wallet += xp
  profile.activity[today] = (profile.activity[today] ?? 0) + xp
}

export function streak(profile = activeProfile()) {
  const start = profile.activity[dayKey()] ? 0 : -1
  let days = 0
  while (profile.activity[dayKey(start - days)]) days++
  return days
}

export function schedule(card: Card, correct: boolean, profile = activeProfile()) {
  const stage = correct ? Math.min((profile.review[card.key]?.stage ?? 0) + 1, 4) : 0
  profile.review[card.key] = { stage, due: dayKey([0, 1, 3, 7, 14][stage]) }
}

export function isComplete(lesson: typeof lessons[number], profile = activeProfile()) {
  return (profile.completed[lesson.id]?.length ?? 0) >= lesson.questions.length
}

export function nextLesson(profile = activeProfile()) {
  return lessons.find(lesson => !isComplete(lesson, profile))
}
