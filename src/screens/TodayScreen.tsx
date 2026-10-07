// 오늘 세션의 세트를 종목별로 보여주는 메인 화면
import { useEffect, useState } from 'react'
import type { Route } from '../App'
import { log } from '../log'
import type { Session } from '../workoutLog'
import { BackupBanner } from './BackupBanner'
import { EditableSetList } from './EditableSetList'

export function TodayScreen({ navigate }: { navigate: (route: Route) => void }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  async function reload() {
    setSession(await log.getSession(log.trainingDayOf(new Date())))
  }

  useEffect(() => {
    reload()
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
        <section key={exercise.id} className="card">
          <button className="exercise" onClick={() => navigate({ name: 'record', exercise })}>
            <strong>{exercise.name}</strong> ›
          </button>
          <EditableSetList sets={sets} onChange={reload} />
        </section>
      ))}
      <button className="primary" onClick={() => navigate({ name: 'pickExercise' })}>
        종목 추가
      </button>
      <button onClick={() => navigate({ name: 'history' })}>기록</button>
    </main>
  )
}
