// WorkoutLog의 Dexie(IndexedDB) 스키마를 한곳에서 정의한다
import Dexie, { type EntityTable } from 'dexie'
import type { Exercise, WorkoutSet } from './types'

/** 기기에 저장하는 키-값 설정(예: lastBackupAt) */
export interface MetaEntry {
  key: string
  value: unknown
}

export type WorkoutDb = Dexie & {
  exercises: EntityTable<Exercise, 'id'>
  sets: EntityTable<WorkoutSet, 'id'>
  meta: EntityTable<MetaEntry, 'key'>
}

export function openWorkoutDb(name: string): WorkoutDb {
  const db = new Dexie(name) as WorkoutDb
  db.version(1).stores({
    exercises: '++id, name',
    sets: '++id, exerciseId, trainingDay, recordedAt, [exerciseId+trainingDay]',
    meta: 'key',
  })
  return db
}
