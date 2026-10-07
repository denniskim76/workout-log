// WorkoutLog 공개 인터페이스에서 쓰는 도메인 타입 정의

/** 운동일. 기기 로컬 시간 기준 새벽 4시에 시작하는 하루를 'YYYY-MM-DD'로 나타낸다. */
export type TrainingDay = string

export interface Exercise {
  id: number
  name: string
}

export interface WorkoutSet {
  id: number
  exerciseId: number
  /** kg, 0 이상 */
  weight: number
  /** 1 이상 정수 */
  reps: number
  /** 기록 시각(epoch ms) */
  recordedAt: number
  trainingDay: TrainingDay
}

export interface NewSet {
  exerciseId: number
  weight: number
  reps: number
  recordedAt: Date
}

/** 세션 안의 한 종목 묶음. 세트는 기록 시각 순. */
export interface SessionExercise {
  exercise: Exercise
  sets: WorkoutSet[]
}

/** 한 운동일의 세트 묶음. 종목은 그날 첫 세트 기록 순. */
export interface Session {
  trainingDay: TrainingDay
  exercises: SessionExercise[]
}
