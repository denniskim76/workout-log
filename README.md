# 운동 기록

iPhone 홈 화면에 설치해 쓰는 개인용 운동 기록 PWA. 데이터는 기기 안(IndexedDB)에만 저장된다.

## 개발

```sh
npm install
npm run dev      # 개발 서버
npm test         # 테스트
npm run build    # 프로덕션 빌드 (dist/)
npm run preview  # 빌드 결과 확인: http://localhost:4173/workout-log/
```

## GitHub Pages 배포 설정 (최초 1회)

앱은 `https://<사용자명>.github.io/workout-log/` 경로에서 동작하도록 빌드된다(`vite.config.ts`의 `base`). 저장소 이름을 바꾸면 `base`도 같이 바꿔야 한다.

1. GitHub에서 **공개(Public)** 저장소 `workout-log`를 만든다. README, .gitignore 등은 추가하지 않는다(빈 저장소).
2. 저장소 **Settings → Pages → Build and deployment → Source**를 **GitHub Actions**로 선택한다.
3. 로컬에서 remote를 연결하고 기본 브랜치를 `main`으로 맞춘 뒤 push한다.

   ```sh
   git remote add origin https://github.com/<사용자명>/workout-log.git
   git branch -m master main   # 현재 브랜치가 master인 경우에만
   git push -u origin main
   ```

4. 저장소 **Actions** 탭에서 `Deploy to GitHub Pages` 실행이 끝나면 `https://<사용자명>.github.io/workout-log/`에 접속한다.

이후에는 `main`에 push할 때마다 자동으로 테스트·빌드·배포된다.

## iPhone에 설치

1. Safari로 위 주소를 연다.
2. 공유 버튼 → **홈 화면에 추가**.
3. 한 번 열고 나면 인터넷 없이도(비행기 모드) 열리고 기록된다.

새 버전이 배포되면 화면 위에 "업데이트가 있습니다 → 새로고침" 안내가 뜬다. 누르면 새 버전으로 바뀐다.
