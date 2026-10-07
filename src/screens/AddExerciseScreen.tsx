// 종목 이름을 입력해 새 종목을 추가하는 화면(종목 선택 화면 전 임시 버전)
import { useState, type FormEvent } from 'react'
import type { Route } from '../App'
import { log } from '../log'

export function AddExerciseScreen({ navigate }: { navigate: (route: Route) => void }) {
  const [name, setName] = useState('')

  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) return
    const exercise = await log.addExercise(name)
    navigate({ name: 'record', exercise })
  }

  return (
    <main>
      <button className="back" onClick={() => navigate({ name: 'today' })}>
        ‹ 오늘
      </button>
      <h1>종목 추가</h1>
      <form onSubmit={submit}>
        <input
          autoFocus
          placeholder="종목 이름"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <button className="primary" type="submit" disabled={!name.trim()}>
          추가
        </button>
      </form>
    </main>
  )
}
