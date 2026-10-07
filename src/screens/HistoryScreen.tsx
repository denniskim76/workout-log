// 과거 세션을 최신 운동일 순으로 나열하는 기록 화면
import { useEffect, useState } from 'react'
import type { Route } from '../App'
import { log } from '../log'
import type { Session } from '../workoutLog'
import { formatTrainingDay } from './format'

export function HistoryScreen({ navigate }: { navigate: (route: Route) => void }) {
  const [sessions, setSessions] = useState<Session[] | undefined>(undefined)

  useEffect(() => {
    log.listSessions().then(setSessions)
  }, [])

  return (
    <main>
      <button className="back" onClick={() => navigate({ name: 'today' })}>
        ‹ 오늘
      </button>
      <h1>기록</h1>
      {sessions?.length === 0 && <p className="empty">기록한 세션이 없습니다.</p>}
      {sessions?.map(({ trainingDay, exercises }) => (
        <button
          key={trainingDay}
          className="card"
          onClick={() => navigate({ name: 'session', trainingDay })}
        >
          <strong>{formatTrainingDay(trainingDay)}</strong>
          <span>{exercises.map((e) => e.exercise.name).join(', ')}</span>
        </button>
      ))}
    </main>
  )
}
