# 02: 폰에 설치하고 오프라인으로 쓰기

**What to build:** iPhone Safari에서 앱 주소를 열어 홈 화면에 추가하면 앱처럼 실행되고, 한 번 연 뒤에는 인터넷이 전혀 없어도 열리고 기록된다. 새 버전이 배포되면 화면이 갑자기 바뀌지 않고 "업데이트가 있습니다 → 새로고침" 안내가 뜬다. GitHub 공개 저장소에 push하면 GitHub Pages로 자동 배포된다. GitHub 저장소 생성과 Pages 활성화는 사용자가 직접 해야 하는 단계다.

**Blocked by:** 01

**Status:** resolved

- [x] 사용자가 GitHub 공개 저장소를 만들고 remote를 연결하는 절차가 안내된다(필요하면 `/wizard`)
- [x] main 브랜치에 push하면 GitHub Actions로 빌드되어 GitHub Pages에 배포된다
- [x] Pages 하위 경로(base path)에서 앱과 모든 자산이 정상적으로 로드된다
- [x] 웹 앱 매니페스트(이름, 아이콘, 세로 화면, 독립 실행 모드)가 있어 iPhone 홈 화면에 추가하면 주소창 없이 실행된다
- [ ] 서비스 워커가 앱 파일을 캐시해, 비행기 모드에서도 앱이 열리고 세트를 기록할 수 있다
- [ ] 새 버전이 감지되면 자동 교체하지 않고 새로고침 안내를 띄우며, 누르면 새 버전으로 바뀐다
- [x] 테스트와 빌드가 통과한다

## Comments

- 미체크 항목은 실기기·실배포로만 확인할 수 있어서 남겨 둠. remote가 없어 Actions 배포는 실행할 수 없음. 매니페스트, 서비스 워커, 업데이트 배너는 구현과 빌드까지 확인했지만 iPhone 홈 화면 실행, 비행기 모드 동작, 새 버전 감지 시 배너는 배포 후 사용자가 확인해야 함.
- `vite-plugin-pwa`(generateSW) + `registerType: 'prompt'`. 빌드 시 앱 JS/CSS/HTML/아이콘/매니페스트 8개 파일을 precache. 새 SW가 대기하면 `useRegisterSW`의 `needRefresh`로 `UpdateBanner`를 띄우고, "새로고침"을 누르면 `updateServiceWorker(true)`로 교체하고 리로드.
- 배너는 `App.tsx`가 아니라 `main.tsx`에서 `<App />` 위에 렌더링. 화면 티켓들과 충돌을 피하려고 App을 건드리지 않음. 스타일은 `index.css` 끝의 `.update-banner`(sticky, safe-area 상단 여백).
- `base: '/workout-log/'`. `npm run preview`로 `/workout-log/` 아래 index, manifest(`application/manifest+json`), `sw.js`, assets, 아이콘이 모두 200으로 응답함을 확인. manifest의 `start_url`/`scope`는 플러그인이 base로 채움.
- 아이콘은 Node 스크립트로 만든 단색 덤벨 PNG(192, 512, maskable용으로 512 재사용, apple-touch-icon 180). 덤벨은 maskable 안전 영역(중앙 80%) 안에 들어감. iOS용으로 `index.html`에 `apple-touch-icon` 링크와 `apple-mobile-web-app-*` 메타를 추가.
- 서비스 워커와 매니페스트는 스펙대로 단위 테스트하지 않음.
- 배포 워크플로(`.github/workflows/deploy.yml`)는 `main` push 또는 수동 실행 시 `npm ci` → `npm test` → `npm run build` → `actions/deploy-pages` 순서로 동작. 사용자 설정 절차는 `README.md`에 정리함(현재 로컬 브랜치가 `master`라서 `main`으로 이름 바꾸는 단계 포함). 단계가 짧아서 `/wizard`는 쓰지 않음.

- 2026-10-07: 첫 push 후 GitHub Actions 배포 성공. https://denniskim76.github.io/workout-log/ 에서 index, 매니페스트, sw.js, 아이콘이 200으로 응답함. 나머지 3개는 iPhone 확인 대기.
- 2026-10-07: 사용자가 iPhone Safari에서 홈 화면에 추가했고, 주소창 없이 실행됨을 확인함.
