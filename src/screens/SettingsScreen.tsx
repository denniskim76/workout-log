// 백업 내보내기와 백업 파일 가져오기를 제공하는 설정 화면
import { useRef, useState, type ChangeEvent } from 'react'
import type { Route } from '../App'
import { shareBackup } from '../backupFile'
import { log } from '../log'

export function SettingsScreen({ navigate }: { navigate: (route: Route) => void }) {
  const [message, setMessage] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  async function backup() {
    setMessage(null)
    try {
      if (await shareBackup()) setMessage('백업을 내보냈습니다.')
    } catch {
      setMessage('백업을 내보내지 못했습니다.')
    }
  }

  async function restore(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (!confirm('현재 데이터가 모두 교체됩니다. 가져올까요?')) return
    try {
      await log.importBackup(await file.text())
      setMessage('백업을 가져왔습니다.')
    } catch {
      setMessage('올바른 백업 파일이 아닙니다. 기존 데이터는 그대로 남아 있습니다.')
    }
  }

  return (
    <main>
      <button className="back" onClick={() => navigate({ name: 'today' })}>
        ‹ 오늘
      </button>
      <h1>설정</h1>
      <button className="primary" onClick={backup}>
        백업
      </button>
      <button className="primary" onClick={() => fileInput.current?.click()}>
        가져오기
      </button>
      <input
        ref={fileInput}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={restore}
      />
      {message && <p role="status">{message}</p>}
    </main>
  )
}
