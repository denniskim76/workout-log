// 종목 선택 화면의 편집 모드에서 한 종목의 이름 변경과 삭제(확인 포함)를 처리하는 행
import { useState, type FormEvent } from 'react'
import { log } from '../log'
import { DuplicateExerciseNameError, type Exercise } from '../workoutLog'

type Mode = { name: 'idle' } | { name: 'rename' } | { name: 'confirmDelete'; setCount: number }

export function ExerciseEditRow({ exercise, onChange }: { exercise: Exercise; onChange: () => void }) {
  const [mode, setMode] = useState<Mode>({ name: 'idle' })
  const [draft, setDraft] = useState(exercise.name)
  const [error, setError] = useState('')

  async function rename(e: FormEvent) {
    e.preventDefault()
    if (draft.trim() === '') return
    try {
      await log.renameExercise(exercise.id, draft)
      setMode({ name: 'idle' })
      onChange()
    } catch (err) {
      if (!(err instanceof DuplicateExerciseNameError)) throw err
      setError('이미 있는 종목 이름입니다.')
    }
  }

  async function askDelete() {
    setMode({ name: 'confirmDelete', setCount: await log.countSets(exercise.id) })
  }

  async function remove() {
    await log.deleteExercise(exercise.id)
    onChange()
  }

  if (mode.name === 'rename') {
    return (
      <form className="card" onSubmit={rename}>
        <input
          autoFocus
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value)
            setError('')
          }}
        />
        {error && <p className="error">{error}</p>}
        <div className="row-actions">
          <button type="button" onClick={() => setMode({ name: 'idle' })}>
            취소
          </button>
          <button type="submit">저장</button>
        </div>
      </form>
    )
  }

  if (mode.name === 'confirmDelete') {
    return (
      <div className="card" role="alertdialog">
        <strong>'{exercise.name}' 종목을 삭제할까요?</strong>
        {mode.setCount > 0 && <p>세트 {mode.setCount}개도 함께 삭제됩니다.</p>}
        <div className="row-actions">
          <button onClick={() => setMode({ name: 'idle' })}>취소</button>
          <button className="danger" onClick={remove}>
            삭제
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <strong>{exercise.name}</strong>
      <div className="row-actions">
        <button
          onClick={() => {
            setDraft(exercise.name)
            setError('')
            setMode({ name: 'rename' })
          }}
        >
          이름 변경
        </button>
        <button className="danger" onClick={askDelete}>
          삭제
        </button>
      </div>
    </div>
  )
}
