// 종목의 지난 기록과 입력 칸 미리 채우기 값을 조회하는 WorkoutLog 동작
import Dexie from 'dexie'
import type { WorkoutDb } from './db'
import type { PreviousRecord, SetValues, TrainingDay, WorkoutSet } from './types'

export function previousRecordOps(db: WorkoutDb) {
  const setsOn = (exerciseId: number, trainingDay: TrainingDay): Promise<WorkoutSet[]> =>
    db.sets.where('[exerciseId+trainingDay]').equals([exerciseId, trainingDay]).sortBy('recordedAt')

  /** 기준 운동일보다 이전 세션 중 그 종목이 있는 가장 최근 세션의 그 종목 세트. 없으면 null. */
  async function getPreviousRecord(
    exerciseId: number,
    trainingDay: TrainingDay,
  ): Promise<PreviousRecord | null> {
    const latest = await db.sets
      .where('[exerciseId+trainingDay]')
      .between([exerciseId, Dexie.minKey], [exerciseId, trainingDay], true, false)
      .last()
    if (!latest) return null
    return { trainingDay: latest.trainingDay, sets: await setsOn(exerciseId, latest.trainingDay) }
  }

  /** 입력 칸 미리 채우기 값: 그 운동일의 가장 최근 세트 → 지난 기록의 첫 세트 → null(빈 값). */
  async function getPrefill(exerciseId: number, trainingDay: TrainingDay): Promise<SetValues | null> {
    const today = await setsOn(exerciseId, trainingDay)
    const source = today.at(-1) ?? (await getPreviousRecord(exerciseId, trainingDay))?.sets[0]
    if (!source) return null
    return { weight: source.weight, reps: source.reps }
  }

  return { getPreviousRecord, getPrefill }
}
