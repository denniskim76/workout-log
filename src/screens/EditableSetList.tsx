// 세트 목록을 보여주고, 세트를 탭하면 무게·횟수 수정과 삭제를 할 수 있게 하는 공용 컴포넌트
import { useState, type FormEvent } from 'react'
import { log } from '../log'
import type { WorkoutSet } from '../workoutLog'
import { formatSet } from './format'

export function EditableSetList({
  sets,
  onChange,
}: {
  sets: WorkoutSet[]
  /** 세트를 저장하거나 삭제한 뒤 호출된다. 부모는 여기서 다시 조회한다. */
  onChange: () => void
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [weight, setWeight] = useState('')
  const [reps, setReps] = useState('')
  const [error, setError] = useState('')

  function startEditing(set: WorkoutSet) {
    setEditingId(set.id)
    setWeight(String(set.weight))
    setReps(String(set.reps))
    setError('')
  }

  async function save(e: FormEvent) {
    e.preventDefault()
    if (editingId === null) return
    try {
      await log.updateSet(editingId, { weight: Number(weight), reps: Number(reps) })
    } catch {
      setError('무게는 0 이상, 횟수는 1 이상의 정수로 입력하세요.')
      return
    }
    setEditingId(null)
    onChange()
  }

  async function remove() {
    if (editingId === null) return
    await log.deleteSet(editingId)
    setEditingId(null)
    onChange()
  }

  return (
    <ol className="sets">
      {sets.map((set) =>
        set.id === editingId ? (
          <li key={set.id}>
            <form onSubmit={save} className="set-form">
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
              {error && <p className="error">{error}</p>}
              <button className="primary" type="submit" disabled={weight === '' || reps === ''}>
                저장
              </button>
              <button type="button" onClick={remove}>
                삭제
              </button>
              <button type="button" onClick={() => setEditingId(null)}>
                취소
              </button>
            </form>
          </li>
        ) : (
          <li key={set.id}>
            <button className="set" onClick={() => startEditing(set)}>
              {formatSet(set)}
            </button>
          </li>
        ),
      )}
    </ol>
  )
}
