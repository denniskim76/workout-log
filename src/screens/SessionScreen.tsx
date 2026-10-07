// 한 운동일 세션의 세트를 종목별로 보여주고 수정·삭제하게 하는 세션 상세 화면
import { useEffect, useState } from 'react'
import type { Route } from '../App'
import { log } from '../log'
import type { Session, TrainingDay } from '../workoutLog'
import { EditableSetList } from './EditableSetList'
import { formatTrainingDay } from './format'

export function SessionScreen({
  trainingDay,
  navigate,
}: {
  trainingDay: TrainingDay
  navigate: (route: Route) => void
}) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  async function reload() {
    setSession(await log.getSession(trainingDay))
  }

  useEffect(() => {
    reload()
  }, [trainingDay])

  return (
    <main>
      <button className="back" onClick={() => navigate({ name: 'history' })}>
        ‹ 기록
      </button>
      <h1>{formatTrainingDay(trainingDay)}</h1>
      {session === null && <p className="empty">이 운동일에 기록한 세트가 없습니다.</p>}
      {session?.exercises.map(({ exercise, sets }) => (
        <section key={exercise.id} className="card">
          <button className="exercise" onClick={() => navigate({ name: 'record', exercise, trainingDay })}>
            <strong>{exercise.name}</strong> ›
          </button>
          <EditableSetList sets={sets} onChange={reload} />
        </section>
      ))}
      <button className="primary" onClick={() => navigate({ name: 'pickExercise', trainingDay })}>
        종목 추가
      </button>
    </main>
  )
}
