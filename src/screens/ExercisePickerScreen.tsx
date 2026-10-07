// 최근 사용 순 종목 목록에서 검색해 고르거나 새 종목을 바로 추가하는 종목 선택 화면
import { useEffect, useState, type FormEvent } from 'react'
import type { Route } from '../App'
import { log } from '../log'
import type { Exercise } from '../workoutLog'

export function ExercisePickerScreen({ navigate }: { navigate: (route: Route) => void }) {
  const [query, setQuery] = useState('')
  // 어떤 검색어의 결과인지 함께 들고 있어, 결과가 도착하기 전의 이전 결과로 추가 버튼을 띄우지 않는다
  const [result, setResult] = useState<{ query: string; exercises: Exercise[] } | undefined>()

  useEffect(() => {
    let current = true
    log.listExercises(query).then((exercises) => current && setResult({ query, exercises }))
    return () => {
      current = false
    }
  }, [query])

  const exercises = result?.exercises
  const name = query.trim()
  const canAdd = name !== '' && result?.query === query && exercises?.length === 0

  async function add(e?: FormEvent) {
    e?.preventDefault()
    if (!canAdd) return
    const exercise = await log.addExercise(name)
    navigate({ name: 'record', exercise })
  }

  return (
    <main>
      <button className="back" onClick={() => navigate({ name: 'today' })}>
        ‹ 오늘
      </button>
      <h1>종목 선택</h1>
      <form onSubmit={add}>
        <input
          autoFocus
          type="search"
          placeholder="종목 검색"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>
      {exercises?.map((exercise) => (
        <button
          key={exercise.id}
          className="card"
          onClick={() => navigate({ name: 'record', exercise })}
        >
          <strong>{exercise.name}</strong>
        </button>
      ))}
      {exercises?.length === 0 && name === '' && (
        <p className="empty">검색 칸에 종목 이름을 입력해 새 종목을 추가하세요.</p>
      )}
      {canAdd && (
        <button className="primary" onClick={() => add()}>
          '{name}' 새 종목으로 추가
        </button>
      )}
    </main>
  )
}
