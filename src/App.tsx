// 화면 전환 상태를 관리하는 최상위 컴포넌트
import { useState } from 'react'
import type { Exercise } from './workoutLog'
import { TodayScreen } from './screens/TodayScreen'
import { ExercisePickerScreen } from './screens/ExercisePickerScreen'
import { RecordScreen } from './screens/RecordScreen'

export type Route =
  | { name: 'today' }
  | { name: 'pickExercise' }
  | { name: 'record'; exercise: Exercise }

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'today' })

  switch (route.name) {
    case 'today':
      return <TodayScreen navigate={setRoute} />
    case 'pickExercise':
      return <ExercisePickerScreen navigate={setRoute} />
    case 'record':
      return <RecordScreen exercise={route.exercise} navigate={setRoute} />
  }
}
