// 화면에 세트를 "60kg × 10" 형태로 표시하는 포맷 함수
import { parseTrainingDay, type TrainingDay, type WorkoutSet } from '../workoutLog'

export const formatSet = (set: Pick<WorkoutSet, 'weight' | 'reps'>) => `${set.weight}kg × ${set.reps}`

/** 지난 기록 운동일을 기준 운동일과 비교해 "3일 전 (10/4)" 형태로 표시한다. */
export function formatDaysAgo(day: TrainingDay, base: TrainingDay): string {
  const toUtc = (d: TrainingDay) => {
    const [year, month, date] = parseTrainingDay(d)
    return Date.UTC(year, month - 1, date)
  }
  const days = Math.round((toUtc(base) - toUtc(day)) / 86_400_000)
  const [, month, date] = parseTrainingDay(day)
  return `${days}일 전 (${month}/${date})`
}

/** 운동일을 "10월 5일 (월)" 형태로 표시한다. */
export function formatTrainingDay(day: TrainingDay): string {
  const [year, month, date] = parseTrainingDay(day)
  const weekday = new Date(year, month - 1, date).getDay()
  return `${month}월 ${date}일 (${'일월화수목금토'[weekday]})`
}
