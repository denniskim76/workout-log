// 한 종목의 세트를 무게와 횟수로 기록하는 화면
import { useEffect, useState, type FormEvent } from 'react'
import type { Route } from '../App'
import { log } from '../log'
import {
  type Exercise,
  type PreviousRecord,
  type TrainingDay,
  type WorkoutSet,
} from '../workoutLog'
import { EditableSetList } from './EditableSetList'
import { formatDaysAgo, formatSet, formatTrainingDay } from './format'

const WEIGHT_STEP = 2.5
const REPS_STEP = 1

/** 입력 문자열에 +/- 간격을 더한다. 빈 값은 0으로 보고, min 아래로는 내려가지 않는다. */
function step(value: string, delta: number, min: number): string {
  const current = Number(value) || 0
  return String(Math.max(min, Math.round((current + delta) * 100) / 100))
}

export function RecordScreen({
  exercise,
  trainingDay: day,
  navigate,
}: {
  exercise: Exercise
  /** 없으면 오늘 운동일 */
  trainingDay?: TrainingDay
  navigate: (route: Route) => void
}) {
  const trainingDay = day ?? log.trainingDayOf(new Date())
  const [sets, setSets] = useState<WorkoutSet[]>([])
  const [previous, setPrevious] = useState<PreviousRecord | null | undefined>(undefined)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  async function reload() {
    const session = await log.getSession(trainingDay)
    setSets(session?.exercises.find((e) => e.exercise.id === exercise.id)?.sets ?? [])
  }

  useEffect(() => {
    reload()
  }, [exercise.id, trainingDay])

  useEffect(() => {
    log.getPreviousRecord(exercise.id, trainingDay).then(setPrevious)
    log.getPrefill(exercise.id, trainingDay).then((values) => {
      setWeight(values ? String(values.weight) : '')
      setReps(values ? String(values.reps) : '')
    })
  }, [exercise.id, trainingDay])

  const weightValue = Number(weight)
  const repsValue = Number(reps)
  const canRecord =
    weight !== '' &&
    reps !== '' &&
    Number.isFinite(weightValue) &&
    weightValue >= 0 &&
    Number.isInteger(repsValue) &&
    repsValue >= 1

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canRecord) return
    await log.recordSet({
      exerciseId: exercise.id,
      weight: weightValue,
      reps: repsValue,
      recordedAt: await log.nextRecordingTime(trainingDay, new Date()),
    })
    // 다음 세트 입력 칸은 방금 기록한 값(미리 채우기 규칙의 당일 최근 세트)
    setWeight(String(weightValue))
    setReps(String(repsValue))
    await reload()
  }

  return (
    <main>
      {day ? (
        <button className="back" onClick={() => navigate({ name: 'session', trainingDay: day })}>
          ‹ {formatTrainingDay(day)}
        </button>
      ) : (
        <button className="back" onClick={() => navigate({ name: 'today' })}>
          ‹ 오늘
        </button>
      )}
      <h1>{exercise.name}</h1>
      {day && <div className="empty">{formatTrainingDay(day)}에 기록</div>}
      {previous !== undefined && (
        <section className="previous">
          {previous ? (
            <>
              <div className="empty">지난 기록 · {formatDaysAgo(previous.trainingDay, trainingDay)}</div>
              <div>{previous.sets.map(formatSet).join(' · ')}</div>
            </>
          ) : (
            <div className="empty">첫 기록입니다</div>
          )}
        </section>
      )}
      <form onSubmit={submit} className="set-form">
        <div className="field">
          <span>무게(kg)</span>
          <div className="stepper">
            <button type="button" aria-label="무게 줄이기" onClick={() => setWeight(step(weight, -WEIGHT_STEP, 0))}>
              −
            </button>
            <input aria-label="무게(kg)" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} />
            <button type="button" aria-label="무게 늘리기" onClick={() => setWeight(step(weight, WEIGHT_STEP, 0))}>
              +
            </button>
          </div>
        </div>
        <div className="field">
          <span>횟수</span>
          <div className="stepper">
            <button type="button" aria-label="횟수 줄이기" onClick={() => setReps(step(reps, -REPS_STEP, 1))}>
              −
            </button>
            <input aria-label="횟수" inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
            <button type="button" aria-label="횟수 늘리기" onClick={() => setReps(step(reps, REPS_STEP, 1))}>
              +
            </button>
          </div>
        </div>
        <button className="primary" type="submit" disabled={!canRecord}>
          기록
        </button>
      </form>
      <EditableSetList sets={sets} onChange={reload} />
    </main>
  )
}
