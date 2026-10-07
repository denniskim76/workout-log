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

/** 'YYYY-MM-DD' 운동일을 [연, 월(1~12), 일] 숫자로 나눈다. */
export function parseTrainingDay(day: TrainingDay): [year: number, month: number, date: number] {
  return [+day.slice(0, 4), +day.slice(5, 7), +day.slice(8, 10)]
}

/** 운동일이 시작되는 시각(그 날짜의 새벽 4시, 로컬 시간) */
export function startOf(day: TrainingDay): Date {
  const [year, month, date] = parseTrainingDay(day)
  return new Date(year, month - 1, date, DAY_START_HOUR)
}

/** 운동일이 끝나는 시각(다음 운동일 시작, 이 시각은 포함하지 않는다) */
export function endOf(day: TrainingDay): Date {
  const end = startOf(day)
  end.setDate(end.getDate() + 1)
  return end
}
