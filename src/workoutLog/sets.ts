// 세트 기록 등 세트 관련 WorkoutLog 동작
import type { WorkoutDb } from './db'
import { trainingDayOf } from './trainingDay'
import type { NewSet, WorkoutSet } from './types'
import { assertValidSetValues } from './validation'

export function setOps(db: WorkoutDb) {
  return {
    async recordSet({ exerciseId, weight, reps, recordedAt }: NewSet): Promise<WorkoutSet> {
      assertValidSetValues(weight, reps)
      const set = {
        exerciseId,
        weight,
        reps,
        recordedAt: recordedAt.getTime(),
        trainingDay: trainingDayOf(recordedAt),
      }
      const id = await db.sets.add(set as WorkoutSet)
      return { ...set, id }
    },
  }
}
