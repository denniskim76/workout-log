// 과거 세션을 최신 운동일 순으로 나열하는 기록 화면
import { useEffect, useState, type FormEvent } from 'react'
import type { Route } from '../App'
import { log } from '../log'
import { trainingDayOf, type Session } from '../workoutLog'
import { formatTrainingDay } from './format'

export function HistoryScreen({ navigate }: { navigate: (route: Route) => void }) {
  const [sessions, setSessions] = useState<Session[] | undefined>(undefined)
  // 운동일은 새벽 4시에 바뀌므로 자정~4시에는 달력 날짜가 아직 미래 운동일이다
  const today = trainingDayOf(new Date())
  const [day, setDay] = useState(today)
  // max 속성은 직접 입력을 막지 못하므로 미래 날짜를 한 번 더 거른다('YYYY-MM-DD'는 문자열 비교로 순서가 맞다)
  const canOpen = day !== '' && day <= today

  useEffect(() => {
    log.listSessions().then(setSessions)
  }, [])

  function openDay(e: FormEvent) {
    e.preventDefault()
    if (canOpen) navigate({ name: 'session', trainingDay: day })
  }

  return (
    <main>
      <button className="back" onClick={() => navigate({ name: 'today' })}>
        ‹ 오늘
      </button>
      <h1>기록</h1>
      <form className="date-pick" onSubmit={openDay}>
        <input
          type="date"
          aria-label="운동일"
          max={today}
          value={day}
          onChange={(e) => setDay(e.target.value)}
        />
        <button type="submit" disabled={!canOpen}>
          이 날짜에 기록
        </button>
      </form>
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
