// 운동 기록 도메인 규칙을 담는 단일 모듈 WorkoutLog의 공개 진입점
import { backupOps } from './backup'
import { openWorkoutDb } from './db'
import { exerciseOps } from './exercises'
import { previousRecordOps } from './previousRecord'
import { sessionOps } from './sessions'
import { setOps } from './sets'
import { trainingDayOf } from './trainingDay'

export type * from './types'
export { DuplicateExerciseNameError } from './exercises'
export { parseTrainingDay } from './trainingDay'
export { isValidSetValues } from './validation'

export function createWorkoutLog(dbName = 'workout-log') {
  const db = openWorkoutDb(dbName)
  return {
    /** 시각이 속한 운동일(화면이 "오늘 운동일"을 정할 때 쓴다) */
    trainingDayOf,
    ...exerciseOps(db),
    ...setOps(db),
    ...sessionOps(db),
    ...previousRecordOps(db),
    ...backupOps(db),
  }
}

export type WorkoutLog = ReturnType<typeof createWorkoutLog>
