// 운동 기록 도메인 규칙을 담는 단일 모듈 WorkoutLog의 공개 진입점
import { backupOps } from './backup'
import { openWorkoutDb } from './db'
import { exerciseOps } from './exercises'
import { previousRecordOps } from './previousRecord'
import { sessionOps } from './sessions'
import { setOps } from './sets'

export type * from './types'
export { DuplicateExerciseNameError } from './exercises'
export { trainingDayOf } from './trainingDay'

export function createWorkoutLog(dbName = 'workout-log') {
  const db = openWorkoutDb(dbName)
  return {
    ...exerciseOps(db),
    ...setOps(db),
    ...sessionOps(db),
    ...previousRecordOps(db),
    ...backupOps(db),
  }
}

export type WorkoutLog = ReturnType<typeof createWorkoutLog>
