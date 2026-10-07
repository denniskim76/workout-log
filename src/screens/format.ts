// 화면에 세트를 "60kg × 10" 형태로 표시하는 포맷 함수
import type { WorkoutSet } from '../workoutLog'

export const formatSet = (set: Pick<WorkoutSet, 'weight' | 'reps'>) => `${set.weight}kg × ${set.reps}`
