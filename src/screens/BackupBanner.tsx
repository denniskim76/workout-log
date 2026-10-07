// 백업한 적이 없거나 마지막 백업이 오래됐을 때 오늘 화면에 띄우는 백업 권유 배너
import { useEffect, useState } from 'react'
import { shareBackup } from '../backupFile'
import { log } from '../log'
import type { BackupReminder } from '../workoutLog'

export function BackupBanner() {
  const [reminder, setReminder] = useState<BackupReminder | null>(null)

  useEffect(() => {
    log.getBackupReminder(new Date()).then(setReminder)
  }, [])

  async function backup() {
    try {
      if (await shareBackup()) setReminder(null)
    } catch {
      alert('백업을 내보내지 못했습니다.')
    }
  }

  if (!reminder) return null
  return (
    <div className="banner" role="alert">
      <span>
        {reminder.daysSinceBackup === null
          ? '아직 백업한 적이 없습니다.'
          : `마지막 백업 ${reminder.daysSinceBackup}일 전`}
      </span>
      <button onClick={backup}>지금 백업</button>
    </div>
  )
}
