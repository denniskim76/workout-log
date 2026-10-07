// 화면 전환 상태를 관리하는 최상위 컴포넌트
import { useState } from 'react'
import type { Exercise } from './workoutLog'
import { TodayScreen } from './screens/TodayScreen'
import { AddExerciseScreen } from './screens/AddExerciseScreen'
import { RecordScreen } from './screens/RecordScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export type Route =
  | { name: 'today' }
  | { name: 'addExercise' }
  | { name: 'record'; exercise: Exercise }
  | { name: 'settings' }

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'today' })

  switch (route.name) {
    case 'today':
      return <TodayScreen navigate={setRoute} />
    case 'addExercise':
      return <AddExerciseScreen navigate={setRoute} />
    case 'record':
      return <RecordScreen exercise={route.exercise} navigate={setRoute} />
    case 'settings':
      return <SettingsScreen navigate={setRoute} />
  }
}
