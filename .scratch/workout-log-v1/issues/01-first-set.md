# 01: 첫 세트 기록 (트레이서 불릿)

**What to build:** 앱을 열면 오늘 화면이 보이고, 종목 이름을 입력해 종목을 추가한 뒤 무게와 횟수를 입력해 세트를 기록할 수 있다. 기록한 세트는 오늘 화면에 종목별로 묶여 보인다. 새벽 4시 이전에 기록한 세트는 전날 운동일의 세션에 들어간다. 이 티켓에서 프로젝트 골격(React + Vite + TypeScript, Dexie, Vitest + fake-indexeddb)과 운동 기록 모듈(WorkoutLog)의 첫 인터페이스를 만든다. 스펙: `.scratch/workout-log-v1/spec.md`

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [x] 개발 서버로 앱을 열면 오늘 화면이 보이고, 기록이 없으면 빈 상태 안내와 "종목 추가" 버튼이 보인다
- [x] 종목 이름을 입력해 종목을 추가하고 바로 그 종목의 기록 화면으로 들어간다
- [x] 무게와 횟수를 입력하고 "기록"을 누르면 세트가 저장되고, 기록 화면의 오늘 세트 목록과 오늘 화면에 나타난다
- [x] 오늘 화면은 세트를 종목별로 묶어 보여주며, 종목 순서는 그 종목의 첫 세트 기록 순, 세트 순서는 기록 시각 순이다
- [x] 다른 종목을 하다가 돌아와 기록한 세트도 같은 종목 묶음에 들어간다
- [x] 새로고침해도 기록이 남아 있다(IndexedDB 저장)
- [x] WorkoutLog의 세트 기록은 기록 시각을 인자로 받고, 운동일은 기기 로컬 시간 기준 새벽 4시 경계로 정해진다
- [x] 세션은 저장하지 않고 같은 운동일의 세트로부터 계산한다
- [x] Vitest 테스트(공개 인터페이스만 사용): 03:59 기록은 전날 세션, 04:00 기록은 당일 세션, 23:50과 다음 날 00:10 기록은 같은 세션, 세션 안 종목/세트 순서
- [x] 테스트와 빌드가 통과한다

## Comments

- **WorkoutLog 구조**: `src/workoutLog/`가 단일 모듈이다. 공개 진입점은 `index.ts`의 `createWorkoutLog(dbName?)`와 `trainingDayOf(date)`, 타입(`Exercise`, `WorkoutSet`, `NewSet`, `Session`, `SessionExercise`, `TrainingDay`)뿐이다. 내부는 영역별 파일(`exercises.ts`, `sets.ts`, `sessions.ts`)이 각각 `xxxOps(db)` 객체를 돌려주고 `index.ts`가 펼쳐 합친다. 뒤 티켓은 해당 영역 파일에 메서드를 추가하거나(예: 지난 기록/미리 채우기는 `sessions.ts` 또는 새 `previousRecord.ts`), 새 파일을 만들고 `index.ts`에 한 줄을 더하면 되므로 병렬 작업 충돌이 적다.
- **DB 스키마는 `db.ts` 한 곳**: `exercises: ++id, name`, `sets: ++id, exerciseId, trainingDay, recordedAt, [exerciseId+trainingDay]`, `meta: key`(마지막 백업 시각 등 키-값, 09 티켓용). 뒤 티켓에 필요한 인덱스를 미리 넣어 버전 업그레이드를 피했다.
- **운동일 표현**: 'YYYY-MM-DD' 문자열(기기 로컬 시간, 새벽 4시 경계). 문자열 비교로 정렬과 범위 조회가 된다. 세트는 `trainingDay`와 `recordedAt`(epoch ms)을 함께 저장한다.
- **세션 조회**: `getSession(trainingDay)`는 세트가 없으면 `null`. 종목 순서는 그날 첫 세트의 기록 시각 순, 세트는 기록 시각 순.
- **화면 공용 인스턴스**: `src/log.ts`가 기본 DB 이름(`workout-log`)으로 하나를 만든다. 테스트는 `createWorkoutLog('test-<uuid>')`로 테스트마다 새 DB를 쓴다(fake-indexeddb, `vite.config.ts`의 setupFiles).
- **화면**: 라우터 없이 `App.tsx`의 `Route` 유니언 상태로 전환한다. 화면은 `src/screens/`에 파일별로 둔다. `AddExerciseScreen`은 04 티켓의 종목 선택 화면으로 대체될 임시 화면이다. `RecordScreen`은 아직 오늘 운동일만 다루며, 07 티켓에서 운동일을 prop으로 받도록 확장하면 된다.
- **입력 검증은 03 티켓 범위**로 남겼다. 지금 화면은 빈 칸일 때만 "기록"을 막는다.
- **UI 확인**: 빌드와 타입 검사는 통과했지만 화면 동작은 브라우저에서 직접 눌러 확인하지 않았다(스펙상 화면 자동 테스트는 범위 밖). 새로고침 후 유지는 같은 DB를 다시 여는 테스트로 대신 검증했다.
