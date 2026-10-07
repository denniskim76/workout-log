// 종목 추가 등 종목 관련 WorkoutLog 동작
import type { WorkoutDb } from './db'
import type { Exercise } from './types'

export function exerciseOps(db: WorkoutDb) {
  return {
    async addExercise(name: string): Promise<Exercise> {
      const trimmed = name.trim()
      const id = await db.exercises.add({ name: trimmed } as Exercise)
      return { id, name: trimmed }
    },
  }
}
