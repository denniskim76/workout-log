// 화면에 세트를 "60kg × 10" 형태로 표시하는 포맷 함수
import type { TrainingDay, WorkoutSet } from '../workoutLog'

export const formatSet = (set: Pick<WorkoutSet, 'weight' | 'reps'>) => `${set.weight}kg × ${set.reps}`

/** 지난 기록 운동일을 기준 운동일과 비교해 "3일 전 (10/4)" 형태로 표시한다. */
export function formatDaysAgo(day: TrainingDay, base: TrainingDay): string {
  const toUtc = (d: TrainingDay) => Date.UTC(+d.slice(0, 4), +d.slice(5, 7) - 1, +d.slice(8, 10))
  const days = Math.round((toUtc(base) - toUtc(day)) / 86_400_000)
  return `${days}일 전 (${+day.slice(5, 7)}/${+day.slice(8, 10)})`
}

/** 운동일을 "10월 5일 (월)" 형태로 표시한다. */
export function formatTrainingDay(day: TrainingDay): string {
  const date = new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10))
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${'일월화수목금토'[date.getDay()]})`
}
