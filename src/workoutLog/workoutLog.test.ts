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

describe('지난 기록', () => {
  it('바로 전 세션에 그 종목이 없으면 그보다 이전에 그 종목을 한 세션의 세트 전부를 돌려준다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 1, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 1, 18, 5) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 1, 18, 10) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 4, 18, 0) })

    const record = await log.getPreviousRecord(bench.id, '2026-10-07')
    expect(record?.trainingDay).toBe('2026-10-01')
    expect(record?.sets.map((s) => `${s.weight}x${s.reps}`)).toEqual(['60x10', '60x8'])
  })

  it('기준 운동일 당일과 그 이후의 세션은 무시한다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 55, reps: 10, recordedAt: at(2026, 10, 3, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 5, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 65, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    const record = await log.getPreviousRecord(bench.id, '2026-10-05')
    expect(record?.trainingDay).toBe('2026-10-03')
    expect(record?.sets.map((s) => s.weight)).toEqual([55])
  })

  it('기준 운동일 이전에 그 종목 기록이 없으면 빈 결과(null)를 돌려준다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 1, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    expect(await log.getPreviousRecord(bench.id, '2026-10-07')).toBeNull()
  })
})

describe('미리 채우기', () => {
  it('그 운동일에 그 종목 세트가 있으면 가장 최근 세트 값을 돌려준다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 50, reps: 12, recordedAt: at(2026, 10, 4, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 62.5, reps: 8, recordedAt: at(2026, 10, 7, 18, 5) })

    expect(await log.getPrefill(bench.id, '2026-10-07')).toEqual({ weight: 62.5, reps: 8 })
  })

  it('그 운동일에 세트가 없고 지난 기록만 있으면 지난 기록의 첫 세트 값을 돌려준다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 4, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 57.5, reps: 8, recordedAt: at(2026, 10, 4, 18, 5) })

    expect(await log.getPrefill(bench.id, '2026-10-07')).toEqual({ weight: 60, reps: 10 })
  })

  it('그 운동일 세트도 지난 기록도 없으면 빈 값(null)을 돌려준다', async () => {
    const bench = await log.addExercise('벤치프레스')

    expect(await log.getPrefill(bench.id, '2026-10-07')).toBeNull()
  })
})

describe('입력 검증', () => {
  it.each([
    ['무게가 음수', -2.5, 10],
    ['무게가 NaN', NaN, 10],
    ['무게가 무한대', Infinity, 10],
    ['횟수가 0', 60, 0],
    ['횟수가 소수', 60, 8.5],
    ['횟수가 NaN', 60, NaN],
  ])('%s이면 세트 기록을 거부하고 저장하지 않는다', async (_, weight, reps) => {
    const bench = await log.addExercise('벤치프레스')

    await expect(
      log.recordSet({ exerciseId: bench.id, weight, reps, recordedAt: at(2026, 10, 7, 18, 0) }),
    ).rejects.toThrow()
    expect(await log.getSession('2026-10-07')).toBeNull()
  })

  it('무게 0과 소수 무게, 횟수 1은 기록할 수 있다', async () => {
    const pullup = await log.addExercise('턱걸이')
    await log.recordSet({ exerciseId: pullup.id, weight: 0, reps: 1, recordedAt: at(2026, 10, 7, 18, 0) })
    await log.recordSet({ exerciseId: pullup.id, weight: 1.25, reps: 5, recordedAt: at(2026, 10, 7, 18, 5) })

    const sets = (await log.getSession('2026-10-07'))?.exercises[0].sets
    expect(sets?.map((s) => `${s.weight}x${s.reps}`)).toEqual(['0x1', '1.25x5'])
  })
})
