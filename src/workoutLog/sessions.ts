// 저장된 세트로부터 세션을 계산해 조회하는 WorkoutLog 동작
import type { WorkoutDb } from './db'
import type { Session, SessionExercise, TrainingDay, WorkoutSet } from './types'

export function sessionOps(db: WorkoutDb) {
  /** 한 운동일의 세트(기록 시각 순)를 종목별로 묶는다. 종목은 그날 첫 세트 순. */
  async function toSession(trainingDay: TrainingDay, sets: WorkoutSet[]): Promise<Session> {
    const exercises = await db.exercises.bulkGet([...new Set(sets.map((s) => s.exerciseId))])
    const groups = new Map<number, SessionExercise>()
    for (const set of sets) {
      let group = groups.get(set.exerciseId)
      if (!group) {
        const exercise = exercises.find((e) => e?.id === set.exerciseId)!
        group = { exercise, sets: [] }
        groups.set(set.exerciseId, group)
      }
      group.sets.push(set)
    }
    return { trainingDay, exercises: [...groups.values()] }
  }

  return {
    /** 그 운동일에 세트가 없으면 null(빈 세션은 존재하지 않는다). */
    async getSession(trainingDay: TrainingDay): Promise<Session | null> {
      const sets = await db.sets.where('trainingDay').equals(trainingDay).sortBy('recordedAt')
      if (sets.length === 0) return null
      return toSession(trainingDay, sets)
    },

    /** 세트가 있는 모든 세션을 최신 운동일 순으로 돌려준다. */
    async listSessions(): Promise<Session[]> {
      const byDay = new Map<TrainingDay, WorkoutSet[]>()
      for (const set of await db.sets.orderBy('recordedAt').toArray()) {
        const sets = byDay.get(set.trainingDay) ?? []
        sets.push(set)
        byDay.set(set.trainingDay, sets)
      }
      const days = [...byDay.keys()].sort().reverse()
      return Promise.all(days.map((day) => toSession(day, byDay.get(day)!)))
    },
  }
}
