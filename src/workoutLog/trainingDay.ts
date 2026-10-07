// 기록 시각을 새벽 4시 경계의 운동일로 바꾸는 계산
import type { TrainingDay } from './types'

const DAY_START_HOUR = 4

/** 기기 로컬 시간 기준으로 시각이 속한 운동일을 돌려준다. */
export function trainingDayOf(time: Date): TrainingDay {
  const d = new Date(time)
  if (d.getHours() < DAY_START_HOUR) d.setDate(d.getDate() - 1)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${mm}-${dd}`
}

/** 운동일이 시작되는 시각(그 날짜의 새벽 4시, 로컬 시간) */
function startOf(day: TrainingDay): Date {
  return new Date(+day.slice(0, 4), +day.slice(5, 7) - 1, +day.slice(8, 10), DAY_START_HOUR)
}

/**
 * 운동일에 세트를 기록할 때 넘길 기록 시각.
 * 오늘이면 지금, 과거 운동일이면 그 운동일 시작 시각에 오늘 운동일이 시작된 뒤 지난 시간을 더한 시각
 * (같은 자리에서 이어 기록한 세트가 기록 순서대로 정렬되고, 항상 그 운동일 안에 든다).
 */
export function recordingTimeFor(day: TrainingDay, now: Date = new Date()): Date {
  const today = trainingDayOf(now)
  if (day > today) throw new Error(`미래 운동일에는 기록할 수 없습니다: ${day}`)
  if (day === today) return now
  return new Date(startOf(day).getTime() + (now.getTime() - startOf(today).getTime()))
}
