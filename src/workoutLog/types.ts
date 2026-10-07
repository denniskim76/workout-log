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

/** 세트의 무게와 횟수(입력 칸 미리 채우기, 세트 수정에 쓴다) */
export interface SetValues {
  weight: number
  reps: number
}

/** 종목의 지난 기록: 기준 운동일 이전에 그 종목을 한 가장 최근 운동일과 그날의 그 종목 세트(기록 시각 순). */
export interface PreviousRecord {
  trainingDay: TrainingDay
  sets: WorkoutSet[]
}

/** 한 운동일의 세트 묶음. 종목은 그날 첫 세트 기록 순. */
export interface Session {
  trainingDay: TrainingDay
  exercises: SessionExercise[]
}

/** 오늘 화면 백업 배너에 필요한 정보. daysSinceBackup이 null이면 백업한 적이 없다. */
export interface BackupReminder {
  daysSinceBackup: number | null
}
