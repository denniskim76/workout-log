// WorkoutLog 공개 인터페이스로 세트 기록과 세션 조회 동작을 검증하는 테스트
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorkoutLog, DuplicateExerciseNameError, type WorkoutLog } from '.'

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

describe('세트 수정과 삭제', () => {
  it('세트의 무게와 횟수를 고치면 세션 조회에 고친 값이 나온다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const set = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    await log.updateSet(set.id, { weight: 62.5, reps: 8 })

    const session = await log.getSession('2026-10-07')
    expect(session?.exercises[0].sets.map((s) => `${s.weight}x${s.reps}`)).toEqual(['62.5x8'])
  })

  it('세트를 삭제하면 세션 조회에서 그 세트만 빠진다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })
    const second = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 7, 18, 5) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 6, recordedAt: at(2026, 10, 7, 18, 10) })

    await log.deleteSet(second.id)

    const session = await log.getSession('2026-10-07')
    expect(session?.exercises[0].sets.map((s) => s.reps)).toEqual([10, 6])
  })

  it('한 종목의 세트를 모두 지우면 그 종목 묶음이 세션에서 빠진다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    const benchSet = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 7, 18, 10) })

    await log.deleteSet(benchSet.id)

    const session = await log.getSession('2026-10-07')
    expect(session?.exercises.map((e) => e.exercise.name)).toEqual(['스쿼트'])
  })

  it('세션의 마지막 세트를 지우면 그 세션은 조회되지 않는다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const first = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })
    const second = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 7, 18, 5) })

    await log.deleteSet(first.id)
    await log.deleteSet(second.id)

    expect(await log.getSession('2026-10-07')).toBeNull()
  })

  it.each([
    ['음수 무게', { weight: -1, reps: 8 }],
    ['숫자가 아닌 무게', { weight: NaN, reps: 8 }],
    ['0회', { weight: 60, reps: 0 }],
    ['소수 횟수', { weight: 60, reps: 7.5 }],
  ])('%s로는 수정할 수 없고 기존 값이 유지된다', async (_, values) => {
    const bench = await log.addExercise('벤치프레스')
    const set = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    await expect(log.updateSet(set.id, values)).rejects.toThrow()

    const session = await log.getSession('2026-10-07')
    expect(session?.exercises[0].sets.map((s) => `${s.weight}x${s.reps}`)).toEqual(['60x10'])
  })

  it('세트 기록에도 같은 검증이 적용된다', async () => {
    const bench = await log.addExercise('벤치프레스')

    await expect(
      log.recordSet({ exerciseId: bench.id, weight: 60, reps: 0, recordedAt: at(2026, 10, 7, 18, 0) }),
    ).rejects.toThrow()
    expect(await log.getSession('2026-10-07')).toBeNull()
  })
})

describe('종목 목록', () => {
  const names = async (query?: string) => (await log.listExercises(query)).map((e) => e.name)

  it('종목별 가장 최근 세트의 기록 시각 순으로 정렬되고 세트가 없는 종목은 뒤에 온다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    await log.addExercise('데드리프트')
    const row = await log.addExercise('바벨로우')
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 5, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 6, 18, 0) })
    await log.recordSet({ exerciseId: row.id, weight: 50, reps: 12, recordedAt: at(2026, 10, 7, 18, 0) })
    // 기록 순서가 아니라 기록 시각 기준이다
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 4, 18, 0) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 7, 19, 0) })

    expect(await names()).toEqual(['스쿼트', '바벨로우', '벤치프레스', '데드리프트'])
  })

  it('이름 검색은 부분 일치이고 대소문자와 앞뒤 공백을 무시하며 최근 사용 순을 유지한다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.addExercise('인클라인 벤치프레스')
    await log.addExercise('Lat Pulldown')
    const incline = (await log.listExercises()).find((e) => e.name === '인클라인 벤치프레스')!
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 6, 18, 0) })
    await log.recordSet({ exerciseId: incline.id, weight: 40, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    expect(await names(' 벤치 ')).toEqual(['인클라인 벤치프레스', '벤치프레스'])
    expect(await names('  pULL')).toEqual(['Lat Pulldown'])
    expect(await names('스쿼트')).toEqual([])
    expect(await names('   ')).toHaveLength(3)
  })

  it('앞뒤 공백을 무시하고 같은 이름의 종목은 추가할 수 없다', async () => {
    await log.addExercise('벤치프레스')

    await expect(log.addExercise('  벤치프레스 ')).rejects.toBeInstanceOf(DuplicateExerciseNameError)
    expect(await names()).toEqual(['벤치프레스'])
  })
})
