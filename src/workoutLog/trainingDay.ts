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
