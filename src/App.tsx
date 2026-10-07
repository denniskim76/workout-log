// 화면 전환 상태를 관리하는 최상위 컴포넌트
import { useState } from 'react'
import type { Exercise, TrainingDay } from './workoutLog'
import { TodayScreen } from './screens/TodayScreen'
import { ExercisePickerScreen } from './screens/ExercisePickerScreen'
import { RecordScreen } from './screens/RecordScreen'
import { HistoryScreen } from './screens/HistoryScreen'
import { SessionScreen } from './screens/SessionScreen'
import { SettingsScreen } from './screens/SettingsScreen'

export type Route =
  | { name: 'today' }
  // trainingDay가 없으면 오늘 운동일, 있으면 그 운동일(세션 상세에서 들어온 경우)에 기록한다
  | { name: 'pickExercise'; trainingDay?: TrainingDay }
  | { name: 'record'; exercise: Exercise; trainingDay?: TrainingDay }
  | { name: 'history' }
  | { name: 'session'; trainingDay: TrainingDay }
  | { name: 'settings' }

export function App() {
  const [route, setRoute] = useState<Route>({ name: 'today' })

  switch (route.name) {
    case 'today':
      return <TodayScreen navigate={setRoute} />
    case 'pickExercise':
      return <ExercisePickerScreen trainingDay={route.trainingDay} navigate={setRoute} />
    case 'record':
      return <RecordScreen exercise={route.exercise} trainingDay={route.trainingDay} navigate={setRoute} />
    case 'history':
      return <HistoryScreen navigate={setRoute} />
    case 'session':
      return <SessionScreen trainingDay={route.trainingDay} navigate={setRoute} />
    case 'settings':
      return <SettingsScreen navigate={setRoute} />
  }
}
