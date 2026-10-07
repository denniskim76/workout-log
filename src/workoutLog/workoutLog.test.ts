// WorkoutLog 공개 인터페이스로 세트 기록과 세션 조회 동작을 검증하는 테스트
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorkoutLog, DuplicateExerciseNameError, isValidSetValues, type WorkoutLog } from '.'

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

describe('종목 이름 변경과 삭제', () => {
  it('이름을 바꾸면 과거 세션 조회에도 새 이름이 나온다', async () => {
    const bench = await log.addExercise('벤치')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 1, 18, 0) })

    await log.renameExercise(bench.id, ' 벤치프레스 ')

    expect((await log.getSession('2026-10-01'))?.exercises[0].exercise.name).toBe('벤치프레스')
  })

  it('다른 종목과 같은 이름으로는 바꿀 수 없지만 자기 이름 그대로는 괜찮다', async () => {
    await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')

    await expect(log.renameExercise(squat.id, ' 벤치프레스')).rejects.toBeInstanceOf(DuplicateExerciseNameError)
    await log.renameExercise(squat.id, '스쿼트 ')
    expect((await log.listExercises()).map((e) => e.name)).toEqual(['벤치프레스', '스쿼트'])
  })

  it('종목의 세트 개수는 모든 세션에 걸친 그 종목의 세트 수다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 1, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 7, 18, 0) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 7, 18, 10) })

    expect(await log.countSets(bench.id)).toBe(2)
    expect(await log.countSets((await log.addExercise('데드리프트')).id)).toBe(0)
  })

  it('종목을 삭제하면 모든 세션에서 그 종목의 세트가 사라지고 세트가 0개가 된 세션도 사라진다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 1, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 7, 18, 0) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 7, 18, 10) })

    await log.deleteExercise(bench.id)

    expect(await log.getSession('2026-10-01')).toBeNull()
    expect((await log.getSession('2026-10-07'))?.exercises.map((e) => e.exercise.name)).toEqual(['스쿼트'])
    expect((await log.listExercises()).map((e) => e.name)).toEqual(['스쿼트'])
    expect(await log.countSets(bench.id)).toBe(0)
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

  it('화면이 기록 버튼을 켤지 미리 판단할 수 있다', () => {
    expect(isValidSetValues(0, 1)).toBe(true)
    expect(isValidSetValues(1.25, 5)).toBe(true)
    expect(isValidSetValues(-2.5, 10)).toBe(false)
    expect(isValidSetValues(NaN, 10)).toBe(false)
    expect(isValidSetValues(60, 0)).toBe(false)
    expect(isValidSetValues(60, 8.5)).toBe(false)
  })
})

describe('세션 목록', () => {
  it('최신 운동일 순으로 나열되고 각 세션은 그날 한 종목을 담는다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 5, 18, 0) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 7, 18, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 7, 18, 10) })
    // 새벽 2시 기록은 전날(10/1) 운동일
    await log.recordSet({ exerciseId: squat.id, weight: 90, reps: 5, recordedAt: at(2026, 10, 2, 2, 0) })

    const sessions = await log.listSessions()
    expect(sessions.map((s) => [s.trainingDay, s.exercises.map((e) => e.exercise.name)])).toEqual([
      ['2026-10-07', ['스쿼트', '벤치프레스']],
      ['2026-10-05', ['벤치프레스']],
      ['2026-10-01', ['스쿼트']],
    ])
  })

  it('세트를 모두 삭제한 과거 세션은 목록에서 사라진다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const first = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 5, 18, 0) })
    const second = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: at(2026, 10, 5, 18, 5) })
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    await log.deleteSet(first.id)
    await log.deleteSet(second.id)

    expect((await log.listSessions()).map((s) => s.trainingDay)).toEqual(['2026-10-07'])
  })

  it('세트가 없으면 빈 목록이다', async () => {
    expect(await log.listSessions()).toEqual([])
  })
})

describe('세트 수정이 지난 기록과 미리 채우기에 반영됨', () => {
  it('과거 세트를 고치면 지난 기록과 미리 채우기가 고친 값을 따른다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const set = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 5, 18, 0) })

    await log.updateSet(set.id, { weight: 65, reps: 6 })

    const record = await log.getPreviousRecord(bench.id, '2026-10-07')
    expect(record?.sets.map((s) => `${s.weight}x${s.reps}`)).toEqual(['65x6'])
    expect(await log.getPrefill(bench.id, '2026-10-07')).toEqual({ weight: 65, reps: 6 })
  })

  it('오늘 세트를 고치면 미리 채우기가 고친 값을 따른다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const set = await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 7, 18, 0) })

    await log.updateSet(set.id, { weight: 57.5, reps: 12 })

    expect(await log.getPrefill(bench.id, '2026-10-07')).toEqual({ weight: 57.5, reps: 12 })
  })
})

describe('과거 운동일 기록', () => {
  it('오늘 운동일의 기록 시각은 지금이다', async () => {
    const now = at(2026, 10, 7, 20, 0)
    expect(await log.nextRecordingTime('2026-10-07', now)).toEqual(now)
  })

  it('세션이 없던 운동일에 기록하면 세션이 생기고 목록의 올바른 위치에 나타난다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 3, 19, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 62.5, reps: 8, recordedAt: at(2026, 10, 7, 19, 0) })

    const now = at(2026, 10, 7, 20, 0)
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 9, recordedAt: await log.nextRecordingTime('2026-10-05', now) })

    expect((await log.listSessions()).map((s) => s.trainingDay)).toEqual(['2026-10-07', '2026-10-05', '2026-10-03'])
    expect((await log.getSession('2026-10-05'))?.exercises[0].sets.map((s) => s.reps)).toEqual([9])
  })

  it('자정을 넘긴 새벽에 과거 운동일로 이어 기록한 세트도 그 운동일에 기록 순서대로 들어간다', async () => {
    const bench = await log.addExercise('벤치프레스')
    // 새벽 2시는 아직 10/6 운동일이다
    for (const [reps, now] of [[10, at(2026, 10, 7, 2, 0)], [8, at(2026, 10, 7, 3, 59)]] as const) {
      await log.recordSet({ exerciseId: bench.id, weight: 60, reps, recordedAt: await log.nextRecordingTime('2026-10-04', now) })
    }

    expect((await log.listSessions()).map((s) => s.trainingDay)).toEqual(['2026-10-04'])
    expect((await log.getSession('2026-10-04'))?.exercises[0].sets.map((s) => s.reps)).toEqual([10, 8])
  })

  it('이미 있는 과거 세션에 추가한 세트는 그날의 기존 세트 뒤에 온다', async () => {
    const bench = await log.addExercise('벤치프레스')
    const squat = await log.addExercise('스쿼트')
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 5, 19, 0) })

    // 지금 시각(09:00)을 그날로 옮기면 기존 세트(19:00)보다 앞서지만, 추가한 세트는 뒤에 와야 한다
    const now = at(2026, 10, 7, 9, 0)
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: await log.nextRecordingTime('2026-10-05', now) })
    await log.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: await log.nextRecordingTime('2026-10-05', now) })

    const session = await log.getSession('2026-10-05')
    expect(session?.exercises.map((e) => [e.exercise.name, e.sets.map((s) => s.reps)])).toEqual([
      ['벤치프레스', [10, 8]],
      ['스쿼트', [5]],
    ])
  })

  it('그 운동일이 끝나기 직전의 세트가 있어도 추가한 세트는 그 운동일 안에서 뒤에 온다', async () => {
    const bench = await log.addExercise('벤치프레스')
    // 10/6 03:59:59는 10/5 운동일의 마지막 순간이다
    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: new Date(2026, 9, 6, 3, 59, 59) })

    await log.recordSet({ exerciseId: bench.id, weight: 60, reps: 8, recordedAt: await log.nextRecordingTime('2026-10-05', at(2026, 10, 7, 9, 0)) })

    expect((await log.listSessions()).map((s) => s.trainingDay)).toEqual(['2026-10-05'])
    expect((await log.getSession('2026-10-05'))?.exercises[0].sets.map((s) => s.reps)).toEqual([10, 8])
  })

  it('과거 운동일 기준 지난 기록과 미리 채우기는 그 운동일 이후의 세션을 무시한다', async () => {
    const bench = await log.addExercise('벤치프레스')
    await log.recordSet({ exerciseId: bench.id, weight: 55, reps: 10, recordedAt: at(2026, 10, 2, 19, 0) })
    await log.recordSet({ exerciseId: bench.id, weight: 65, reps: 5, recordedAt: at(2026, 10, 6, 19, 0) })

    expect(await log.getPreviousRecord(bench.id, '2026-10-04')).toMatchObject({ trainingDay: '2026-10-02' })
    expect(await log.getPrefill(bench.id, '2026-10-04')).toEqual({ weight: 55, reps: 10 })
  })

  it('미래 운동일에는 기록 시각을 만들 수 없다', async () => {
    await expect(log.nextRecordingTime('2026-10-08', at(2026, 10, 7, 20, 0))).rejects.toThrow()
    // 새벽 2시에는 달력 날짜(10/7)도 아직 미래 운동일이다
    await expect(log.nextRecordingTime('2026-10-07', at(2026, 10, 7, 2, 0))).rejects.toThrow()
  })
})
