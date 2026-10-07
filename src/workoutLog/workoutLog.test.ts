// WorkoutLog 공개 인터페이스로 세트 기록과 세션 조회 동작을 검증하는 테스트
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorkoutLog, type WorkoutLog } from '.'

let log: WorkoutLog

beforeEach(() => {
  log = createWorkoutLog(`test-${crypto.randomUUID()}`)
})

// 기기 로컬 시간 기준 시각
const at = (y: number, m: number, d: number, hh: number, mm: number) =>
  new Date(y, m - 1, d, hh, mm)

describe('운동일 경계', () => {
  it('03:59에 기록한 세트는 전날 세션에 들어간다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 3, 59) })

    const session = await log.getSession('2026-10-06')
    expect(session?.exercises.map((e) => e.sets.map((s) => [s.weight, s.reps]))).toEqual([[[60, 10]]])
    expect(await log.getSession('2026-10-07')).toBeNull()
  })

  it('04:00에 기록한 세트는 당일 세션에 들어간다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 4, 0) })

    expect(await log.getSession('2026-10-06')).toBeNull()
    expect((await log.getSession('2026-10-07'))?.exercises).toHaveLength(1)
  })

  it('23:50과 다음 날 00:10에 기록한 세트는 같은 세션에 들어간다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 6, 23, 50) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 7, 0, 10) })

    const session = await log.getSession('2026-10-06')
    expect(session?.exercises[0].sets.map((s) => s.reps)).toEqual([10, 8])
    expect(await log.getSession('2026-10-07')).toBeNull()
  })
})

describe('세션 안의 순서', () => {
  it('종목은 그날 첫 세트 순, 세트는 기록 시각 순이며 돌아와 기록한 세트도 같은 종목 묶음에 들어간다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    const row = await log.addExercise('바벨로우')
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 7, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 10) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 4, recordedAt: at(2026, 10, 7, 18, 20) })
    await log.recordSet({ exerciseId: row.id, weight: 50, reps: 12, recordedAt: at(2026, 10, 7, 18, 30) })
    await log.recordSet({ exerciseId: bench.id, weight: 62.5, reps: 8, recordedAt: at(2026, 10, 7, 18, 40) })

    const session = await log.getSession('2026-10-07')
    expect(
      session?.exercises.map((e) => [e.exercise.name, e.sets.map((s) => `${s.weight}x${s.reps}`)]),
    ).toEqual([
      ['스쿼트', ['100x5', '100x4']],
      ['벤치프레스', ['60x10', '62.5x8']],
      ['바벨로우', ['50x12']],
    ])
  })

  it('기록 순서와 다르게 과거 시각으로 기록해도 기록 시각 순으로 정렬된다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 19, 0) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 7, 18, 0) })

    const session = await log.getSession('2026-10-07')
    expect(session?.exercises.map((e) => e.exercise.name)).toEqual(['스쿼트', '벤치프레스'])
  })
})

describe('종목', () => {
  it('추가한 종목은 앞뒤 공백을 뺀 이름으로 저장된다', async () => {
    const bench = await log.addExercise('  벤치프레스 ')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    expect((await log.getSession('2026-10-07'))?.exercises[0].exercise.name).toBe('벤치프레스')
  })
})

describe('저장', () => {
  it('같은 DB를 다시 열어도 기록이 남아 있다', async () => {
    const name = `test-${crypto.randomUUID()}`
    const first = createWorkoutLog(name)
    const bench = await first.addExercise('벤치프레스')
    await first.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    const reopened = createWorkoutLog(name)
    expect((await reopened.getSession('2026-10-07'))?.exercises[0].sets).toHaveLength(1)
  })
})
