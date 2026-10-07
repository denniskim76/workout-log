// 종목 추가 등 종목 관련 WorkoutLog 동작
import type { WorkoutDb } from './db'
import type { Exercise } from './types'

export class DuplicateExerciseNameError extends Error {
  constructor(name: string) {
    super(`이미 있는 종목입니다: ${name}`)
    this.name = 'DuplicateExerciseNameError'
  }
}

export function exerciseOps(db: WorkoutDb) {
  return {
    /** 같은 이름(앞뒤 공백 무시)의 종목이 이미 있으면 DuplicateExerciseNameError로 거부한다. */
    async addExercise(name: string): Promise<Exercise> {
      const trimmed = name.trim()
      return db.transaction('rw', db.exercises, async () => {
        if ((await db.exercises.where('name').equals(trimmed).count()) > 0) {
          throw new DuplicateExerciseNameError(trimmed)
        }
        const id = await db.exercises.add({ name: trimmed } as Exercise)
        return { id, name: trimmed }
      })
    },

    /** 세트는 종목 id로 참조하므로 과거 기록에도 새 이름이 보인다. 중복 이름은 거부한다. */
    async renameExercise(id: number, name: string): Promise<Exercise> {
      const trimmed = name.trim()
      return db.transaction('rw', db.exercises, async () => {
        const same = await db.exercises.where('name').equals(trimmed).first()
        if (same && same.id !== id) throw new DuplicateExerciseNameError(trimmed)
        await db.exercises.update(id, { name: trimmed })
        return { id, name: trimmed }
      })
    },

    /** 종목과 그 종목의 모든 세트를 한 트랜잭션으로 지운다. 세트가 0개가 된 세션은 저절로 사라진다. */
    async deleteExercise(id: number): Promise<void> {
      await db.transaction('rw', db.exercises, db.sets, async () => {
        await db.sets.where('exerciseId').equals(id).delete()
        await db.exercises.delete(id)
      })
    },

    /** 모든 운동일에 걸친 그 종목의 세트 개수(삭제 확인 창용). */
    async countSets(exerciseId: number): Promise<number> {
      return db.sets.where('exerciseId').equals(exerciseId).count()
    },

    /**
     * 최근 사용 순(종목별 가장 최근 세트의 기록 시각). 세트가 없는 종목은 뒤에 온다.
     * query가 있으면 이름 부분 일치(대소문자, 앞뒤 공백 무시)로 거른다.
     */
    async listExercises(query = ''): Promise<Exercise[]> {
      const lastUsed = new Map<number, number>()
      await db.sets.each((set) => {
        lastUsed.set(set.exerciseId, Math.max(lastUsed.get(set.exerciseId) ?? 0, set.recordedAt))
      })
      const needle = query.trim().toLowerCase()
      const exercises = (await db.exercises.toArray()).filter((e) =>
        e.name.toLowerCase().includes(needle),
      )
      return exercises.sort((a, b) => (lastUsed.get(b.id) ?? -1) - (lastUsed.get(a.id) ?? -1))
    },
  }
}
