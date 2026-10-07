// 세트 기록 등 세트 관련 WorkoutLog 동작
import type { WorkoutDb } from './db'
import { endOf, startOf, trainingDayOf } from './trainingDay'
import type { NewSet, SetValues, TrainingDay, WorkoutSet } from './types'
import { assertValidSetValues } from './validation'

const SECOND_MS = 1000

export function setOps(db: WorkoutDb) {
  return {
    /**
     * 그 운동일에 세트를 기록할 때 recordSet에 넘길 기록 시각.
     * 오늘이면 지금. 과거 운동일이면 "지금을 그 운동일로 옮긴 시각"과 "그날 마지막 세트 + 1초" 중
     * 늦은 쪽을 그 운동일 안으로 맞춘 시각이라, 추가한 세트가 그날의 기존 세트 뒤에 온다.
     * 미래 운동일이면 throw.
     */
    async nextRecordingTime(trainingDay: TrainingDay, now: Date): Promise<Date> {
      const today = trainingDayOf(now)
      if (trainingDay > today) throw new Error(`미래 운동일에는 기록할 수 없습니다: ${trainingDay}`)
      if (trainingDay === today) return now

      const shifted = startOf(trainingDay).getTime() + (now.getTime() - startOf(today).getTime())
      const last = await db.sets.where('trainingDay').equals(trainingDay).sortBy('recordedAt')
      const afterLast = (last.at(-1)?.recordedAt ?? -Infinity) + SECOND_MS
      return new Date(Math.min(Math.max(shifted, afterLast), endOf(trainingDay).getTime() - 1))
    },

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

    async updateSet(id: number, { weight, reps }: SetValues): Promise<void> {
      assertValidSetValues(weight, reps)
      await db.sets.update(id, { weight, reps })
    },

    async deleteSet(id: number): Promise<void> {
      await db.sets.delete(id)
    },
  }
}
