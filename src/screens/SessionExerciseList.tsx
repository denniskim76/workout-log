// 세션의 종목별 세트 카드 목록과 "종목 추가" 버튼을 그리는 오늘·세션 상세 공용 컴포넌트
import type { Route } from '../App'
import type { Session, TrainingDay } from '../workoutLog'
import { EditableSetList } from './EditableSetList'

export function SessionExerciseList({
  session,
  trainingDay,
  navigate,
  onChange,
}: {
  session: Session | null | undefined
  /** 없으면 오늘 운동일로 기록·종목 추가 화면을 연다 */
  trainingDay?: TrainingDay
  navigate: (route: Route) => void
  /** 세트를 고치거나 지운 뒤 호출된다 */
  onChange: () => void
}) {
  return (
    <>
      {session?.exercises.map(({ exercise, sets }) => (
        <section key={exercise.id} className="card">
          <button className="exercise" onClick={() => navigate({ name: 'record', exercise, trainingDay })}>
            <strong>{exercise.name}</strong> ›
          </button>
          <EditableSetList sets={sets} onChange={onChange} />
        </section>
      ))}
      <button className="primary" onClick={() => navigate({ name: 'pickExercise', trainingDay })}>
        종목 추가
      </button>
    </>
  )
}
