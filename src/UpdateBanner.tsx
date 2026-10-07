// 새 버전의 서비스 워커가 대기 중일 때 새로고침 안내를 띄우는 배너
import { useRegisterSW } from 'virtual:pwa-register/react'

export function UpdateBanner() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW()

  if (!needRefresh) return null

  return (
    <div className="update-banner" role="status">
      <span>업데이트가 있습니다</span>
      <button onClick={() => updateServiceWorker(true)}>새로고침</button>
    </div>
  )
}
