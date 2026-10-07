// 화면 전환 상태를 관리하는 최상위 컴포넌트
import { useState } from 'react'
import type { Exercise, TrainingDay } from './workoutLog'
import { TodayScreen } from './screens/TodayScreen'
import { ExercisePickerScreen } from './screens/ExercisePickerScreen'
import { RecordScreen } from './screens/RecordScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SessionScreen } from './screens/SessionScreen'

export type Route =
  | { name: 'today' }
  | { name: 'pickExercise' }
  | { name: 'record'; exercise: Exercise }
  | { name: 'history' }
  | { name: 'session'; trainingDay: TrainingDay }

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'today' })

  switch (route.name) {
    case 'today':
      return <TodayScreen navigate={setRoute} />
    case 'pickExercise':
      return <ExercisePickerScreen navigate={setRoute} />
    case 'record':
      return <RecordScreen exercise={route.exercise} navigate={setRoute} />
    case 'history':
      return <HistoryScreen navigate={setRoute} />
    case 'session':
      return <SessionScreen trainingDay={route.trainingDay} navigate={setRoute} />
  }
}
