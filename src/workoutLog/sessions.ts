// 저장된 세트로부터 세션을 계산해 조회하는 WorkoutLog 동작
import type { WorkoutDb } from './db'
import type { Session, SessionExercise, TrainingDay } from './types'

export function sessionOps(db: WorkoutDb) {
  return {
    /** 그 운동일에 세트가 없으면 null(빈 세션은 존재하지 않는다). */
    async getSession(trainingDay: TrainingDay): Promise<Session | null> {
      const sets = await db.sets.where('trainingDay').equals(trainingDay).sortBy('recordedAt')
      if (sets.length === 0) return null

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
    },
  }
}
