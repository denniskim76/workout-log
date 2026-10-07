// 오늘 세션의 세트를 종목별로 보여주는 메인 화면
import { useEffect, useState } from 'react'
import type { Route } from '../App'
import { log } from '../log'
import { trainingDayOf, type Session } from '../workoutLog'
import { formatSet } from './format'
import { BackupBanner } from './BackupBanner'

export function TodayScreen({ navigate }: { navigate: (route: Route) => void }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    log.getSession(trainingDayOf(new Date())).then(setSession)
  }, [])

  return (
    <main>
      <button className="settings-link" onClick={() => navigate({ name: 'settings' })}>
        설정
      </button>
      <h1>오늘</h1>
      <BackupBanner />
      {session === null && <p className="empty">오늘 기록한 세트가 없습니다.</p>}
      {session?.exercises.map(({ exercise, sets }) => (
        <button
          key={exercise.id}
          className="card"
          onClick={() => navigate({ name: 'record', exercise })}
        >
          <strong>{exercise.name}</strong>
          <span>{sets.map(formatSet).join(' · ')}</span>
        </button>
      ))}
      <button className="primary" onClick={() => navigate({ name: 'addExercise' })}>
        종목 추가
      </button>
    </main>
  )
}
