// WorkoutLog 공개 인터페이스로 백업 내보내기/가져오기와 백업 배너 판단을 검증하는 테스트
import { beforeEach, describe, expect, it } from 'vitest'
import { createWorkoutLog, type WorkoutLog } from '.'

let log: WorkoutLog

beforeEach(() => {
  log = createWorkoutLog(`test-${crypto.randomUUID()}`)
})

const at = (y: number, m: number, d: number, hh: number, mm: number) =>
  new Date(y, m - 1, d, hh, mm)

async function seed(target: WorkoutLog) {
  const bench = await target.addExercise('벤치프레스')
  const squat = await target.addExercise('스쿼트')
  await target.recordSet({ exerciseId: squat.id, weight: 100, reps: 5, recordedAt: at(2026, 10, 6, 18, 0) })
  await target.recordSet({ exerciseId: bench.id, weight: 60, reps: 10, recordedAt: at(2026, 10, 6, 18, 10) })
  await target.recordSet({ exerciseId: bench.id, weight: 62.5, reps: 8, recordedAt: at(2026, 10, 7, 2, 0) })
  await target.recordSet({ exerciseId: squat.id, weight: 105, reps: 3, recordedAt: at(2026, 10, 7, 19, 0) })
}

describe('백업 배너', () => {
  const now = at(2026, 10, 20, 9, 0)

  it('세트가 하나도 없으면 배너를 띄우지 않는다', async () => {
    await log.addExercise('벤치프레스')
    expect(await log.getBackupReminder(now)).toBeNull()
  })

  it('세트가 있고 백업한 적이 없으면 백업을 권유한다', async () => {
    await seed(log)
    expect(await log.getBackupReminder(now)).toEqual({ daysSinceBackup: null })
  })

  it('마지막 백업이 정확히 7일 전이면 배너를 띄우지 않는다', async () => {
    await seed(log)
    await log.markBackedUp(at(2026, 10, 13, 9, 0))
    expect(await log.getBackupReminder(now)).toBeNull()
  })

  it('마지막 백업이 7일을 넘으면 지난 일수와 함께 배너를 띄운다', async () => {
    await seed(log)
    await log.markBackedUp(at(2026, 10, 13, 8, 59))
    expect(await log.getBackupReminder(now)).toEqual({ daysSinceBackup: 7 })

    await log.markBackedUp(at(2026, 10, 10, 9, 0))
    expect(await log.getBackupReminder(now)).toEqual({ daysSinceBackup: 10 })
  })

  it('방금 백업했으면 배너를 띄우지 않는다', async () => {
    await seed(log)
    await log.markBackedUp(now)
    expect(await log.getBackupReminder(now)).toBeNull()
  })
})

describe('잘못된 백업 파일', () => {
  const valid = {
    version: 1,
    exportedAt: '2026-10-07T11:00:00.000Z',
    exercises: [{ id: 1, name: '데드리프트' }],
    sets: [{ id: 1, exerciseId: 1, weight: 140, reps: 5, recordedAt: at(2026, 10, 5, 18, 0).getTime(), trainingDay: '2026-10-05' }],
  }
  const withSet = (patch: object) => JSON.stringify({ ...valid, sets: [{ ...valid.sets[0], ...patch }] })

  it.each([
    ['JSON 형식 오류', '{"version": 1, '],
    ['JSON이지만 객체가 아님', '[]'],
    ['버전 불일치', JSON.stringify({ ...valid, version: 2 })],
    ['세트 목록 누락', JSON.stringify({ ...valid, sets: undefined })],
    ['종목 이름 누락', JSON.stringify({ ...valid, exercises: [{ id: 1 }] })],
    ['세트 무게 누락', withSet({ weight: undefined })],
    ['세트 횟수가 문자열', withSet({ reps: '5' })],
    ['세트 운동일 누락', withSet({ trainingDay: undefined })],
    ['없는 종목을 가리키는 세트', withSet({ exerciseId: 99 })],
    ['세트 무게가 음수', withSet({ weight: -5 })],
    ['세트 횟수가 0', withSet({ reps: 0 })],
    ['세트 횟수가 소수', withSet({ reps: 2.5 })],
    ['운동일이 날짜 형식이 아님', withSet({ trainingDay: '10월 5일' })],
    ['운동일이 없는 날짜', withSet({ trainingDay: '2026-02-30' })],
    ['운동일이 기록 시각의 운동일과 다름', withSet({ trainingDay: '2026-10-04' })],
    ['종목 id 중복', JSON.stringify({ ...valid, exercises: [...valid.exercises, { id: 1, name: '스쿼트' }] })],
    ['세트 id 중복', JSON.stringify({ ...valid, sets: [valid.sets[0], valid.sets[0]] })],
  ])('%s이면 거부되고 기존 데이터는 그대로 남는다', async (_, json) => {
    await seed(log)
    const before = await log.getSession('2026-10-06')

    await expect(log.importBackup(json)).rejects.toThrow()

    expect(await log.getSession('2026-10-06')).toEqual(before)
  })

  it('올바른 형식이면 받아들인다', async () => {
    await log.importBackup(JSON.stringify(valid))
    expect((await log.getSession('2026-10-05'))?.exercises[0].exercise.name).toBe('데드리프트')
  })
})

describe('백업 왕복', () => {
  it('내보낸 JSON을 빈 DB에 가져오면 세션 조회 결과가 같다', async () => {
    await seed(log)
    const json = await log.exportBackup(at(2026, 10, 7, 20, 0))

    const restored = createWorkoutLog(`test-${crypto.randomUUID()}`)
    await restored.importBackup(json)

    for (const day of ['2026-10-06', '2026-10-07']) {
      expect(await restored.getSession(day)).toEqual(await log.getSession(day))
    }
  })

  it('가져오기는 기존 데이터를 모두 교체한다', async () => {
    await seed(log)
    const json = await log.exportBackup(at(2026, 10, 7, 20, 0))

    const other = createWorkoutLog(`test-${crypto.randomUUID()}`)
    const deadlift = await other.addExercise('데드리프트')
    await other.recordSet({ exerciseId: deadlift.id, weight: 140, reps: 5, recordedAt: at(2026, 10, 5, 18, 0) })
    await other.importBackup(json)

    expect(await other.getSession('2026-10-05')).toBeNull()
    expect(await other.getSession('2026-10-06')).toEqual(await log.getSession('2026-10-06'))
  })

  it('가져온 뒤에도 새 종목과 세트를 기록할 수 있다', async () => {
    await seed(log)
    const json = await log.exportBackup(at(2026, 10, 7, 20, 0))
    const restored = createWorkoutLog(`test-${crypto.randomUUID()}`)
    await restored.importBackup(json)

    const row = await restored.addExercise('바벨로우')
    await restored.recordSet({ exerciseId: row.id, weight: 50, reps: 12, recordedAt: at(2026, 10, 7, 19, 30) })

    expect((await restored.getSession('2026-10-07'))?.exercises.map((e) => e.exercise.name)).toEqual([
      '스쿼트',
      '바벨로우',
    ])
  })
})
