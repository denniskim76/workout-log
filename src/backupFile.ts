// 백업 JSON을 공유 시트(Web Share API)나 파일 다운로드로 내보내고 백업 시각을 기록하는 화면용 도우미
import { log } from './log'
import { trainingDayOf } from './workoutLog'

/** 내보내기를 마쳤으면 true, 사용자가 공유를 취소했으면 false. */
export async function shareBackup(): Promise<boolean> {
  const now = new Date()
  const json = await log.exportBackup(now)
  const file = new File([json], `workout-log-backup-${trainingDayOf(now)}.json`, {
    type: 'application/json',
  })

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] })
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return false
      throw e
    }
  } else {
    const url = URL.createObjectURL(file)
    const a = document.createElement('a')
    a.href = url
    a.download = file.name
    a.click()
    URL.revokeObjectURL(url)
  }

  await log.markBackedUp(now)
  return true
}
