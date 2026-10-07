// 한 종목의 세트를 무게와 횟수로 기록하는 화면
import { useEffect, useState, type FormEvent } from 'react'
import type { Route } from '../App'
import { log } from '../log'
import { trainingDayOf, type Exercise, type WorkoutSet } from '../workoutLog'
import { formatSet } from './format'

export function RecordScreen({
  exercise,
  navigate,
}: {
  exercise: Exercise
  navigate: (route: Route) => void
}) {
  const trainingDay = trainingDayOf(new Date())
  const [sets, setSets] = useState<WorkoutSet[]>([])
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')

  async function reload() {
    const session = await log.getSession(trainingDay)
    setSets(session?.exercises.find((e) => e.exercise.id === exercise.id)?.sets ?? [])
  }

  useEffect(() => {
    reload()
  }, [exercise.id, trainingDay])

  const canRecord = weight !== '' && reps !== ''

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!canRecord) return
    await log.recordSet({
      exerciseId: exercise.id,
      weight: Number(weight),
      reps: Number(reps),
      recordedAt: new Date(),
    })
    await reload()
  }

  return (
    <main>
      <button className="back" onClick={() => navigate({ name: 'today' })}>
        ‹ 오늘
      </button>
      <h1>{exercise.name}</h1>
      <form onSubmit={submit} className="set-form">
        <label>
          무게(kg)
          <input
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
          />
        </label>
        <label>
          횟수
          <input inputMode="numeric" value={reps} onChange={(e) => setReps(e.target.value)} />
        </label>
        <button className="primary" type="submit" disabled={!canRecord}>
          기록
        </button>
      </form>
      <ol className="sets">
        {sets.map((set) => (
          <li key={set.id}>{formatSet(set)}</li>
        ))}
      </ol>
    </main>
  )
}
