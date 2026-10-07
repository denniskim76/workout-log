// 전체 데이터 JSON 내보내기/가져오기와 백업 배너 판단을 담당하는 WorkoutLog 동작
import type { WorkoutDb } from './db'
import type { BackupReminder, Exercise, WorkoutSet } from './types'

const FORMAT_VERSION = 1
const LAST_BACKUP_KEY = 'lastBackupAt'
const REMIND_AFTER_DAYS = 7
const DAY_MS = 24 * 60 * 60 * 1000

interface BackupFile {
  version: number
  exportedAt: string
  exercises: Exercise[]
  sets: WorkoutSet[]
}

const isObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === 'object' && v !== null && !Array.isArray(v)
const isNumber = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)

/** 백업 JSON을 검증해 저장할 종목과 세트만 골라낸다. 형식이 틀리면 throw. */
function parseBackup(json: string): Pick<BackupFile, 'exercises' | 'sets'> {
  const file: unknown = JSON.parse(json)
  if (!isObject(file)) throw new Error('백업 파일 형식이 아닙니다.')
  if (file.version !== FORMAT_VERSION) throw new Error('지원하지 않는 백업 버전입니다.')
  if (!Array.isArray(file.exercises) || !Array.isArray(file.sets)) {
    throw new Error('백업 파일에 종목 또는 세트 목록이 없습니다.')
  }

  const exercises = file.exercises.map((e: unknown): Exercise => {
    if (!isObject(e) || !isNumber(e.id) || typeof e.name !== 'string') {
      throw new Error('종목 항목이 올바르지 않습니다.')
    }
    return { id: e.id, name: e.name }
  })
  const exerciseIds = new Set(exercises.map((e) => e.id))
  const sets = file.sets.map((s: unknown): WorkoutSet => {
    if (
      !isObject(s) ||
      !isNumber(s.id) ||
      !isNumber(s.exerciseId) ||
      !exerciseIds.has(s.exerciseId) ||
      !isNumber(s.weight) ||
      !isNumber(s.reps) ||
      !isNumber(s.recordedAt) ||
      typeof s.trainingDay !== 'string'
    ) {
      throw new Error('세트 항목이 올바르지 않습니다.')
    }
    const { id, exerciseId, weight, reps, recordedAt, trainingDay } = s
    return { id, exerciseId, weight, reps, recordedAt, trainingDay }
  })
  return { exercises, sets }
}

export function backupOps(db: WorkoutDb) {
  return {
    /** 모든 종목과 세트를 백업 JSON 문자열로 만든다. */
    async exportBackup(now: Date): Promise<string> {
      const file: BackupFile = {
        version: FORMAT_VERSION,
        exportedAt: now.toISOString(),
        exercises: await db.exercises.toArray(),
        sets: await db.sets.toArray(),
      }
      return JSON.stringify(file)
    },

    /** 백업을 마친 시각을 기기에 저장한다. */
    async markBackedUp(now: Date): Promise<void> {
      await db.meta.put({ key: LAST_BACKUP_KEY, value: now.getTime() })
    },

    /** 세트가 있고, 백업한 적이 없거나 마지막 백업이 7일을 넘었으면 배너 정보를, 아니면 null. */
    async getBackupReminder(now: Date): Promise<BackupReminder | null> {
      if ((await db.sets.count()) === 0) return null
      const last = (await db.meta.get(LAST_BACKUP_KEY))?.value as number | undefined
      if (last === undefined) return { daysSinceBackup: null }
      const elapsed = now.getTime() - last
      if (elapsed <= REMIND_AFTER_DAYS * DAY_MS) return null
      return { daysSinceBackup: Math.floor(elapsed / DAY_MS) }
    },

    /** 백업 JSON으로 모든 종목과 세트를 교체한다. */
    async importBackup(json: string): Promise<void> {
      const file = parseBackup(json)
      await db.transaction('rw', db.exercises, db.sets, async () => {
        await db.exercises.clear()
        await db.sets.clear()
        await db.exercises.bulkAdd(file.exercises)
        await db.sets.bulkAdd(file.sets)
      })
    },
  }
}
