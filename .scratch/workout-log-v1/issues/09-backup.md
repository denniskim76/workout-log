# 09: 백업 내보내기, 가져오기, 배너

**What to build:** 설정 화면에서 "백업"을 누르면 모든 데이터가 JSON 파일로 만들어져 iPhone 공유 시트가 열리고, iCloud Drive나 파일 앱에 저장할 수 있다. "가져오기"로 백업 파일을 고르면 "현재 데이터가 모두 교체됩니다" 확인 후 전체 교체되고, 잘못된 파일이면 오류 안내와 함께 기존 데이터가 그대로 남는다. 기록이 있는데 백업한 적이 없거나 마지막 백업이 7일을 넘었으면 오늘 화면에 "마지막 백업 N일 전" 배너가 뜬다. 배경 결정은 ADR 0001.

**Blocked by:** 01

**Status:** ready-for-agent

- [x] 오늘 화면에서 설정 화면으로 이동할 수 있다
- [x] WorkoutLog가 내보내기를 제공한다: 형식 버전, 내보낸 시각, 종목 목록, 세트 목록을 담은 JSON
- [x] 내보내기는 Web Share API로 파일을 공유하고, 지원되지 않으면 파일 다운로드로 대체한다
- [x] 내보내기에 성공하면 마지막 백업 시각이 저장된다
- [x] WorkoutLog가 가져오기를 제공한다: 형식을 검증한 뒤 하나의 트랜잭션으로 전체 교체하고, 검증 실패 시 기존 데이터를 건드리지 않는다
- [x] 가져오기 전에 확인 창이 뜨고, 실패하면 오류 안내가 보인다
- [x] 세트가 1개 이상이고, 백업한 적이 없거나 마지막 백업이 7일을 넘었으면 오늘 화면에 배너가 뜨며, 배너에서 바로 백업할 수 있다
- [x] 테스트: 내보낸 JSON을 빈 DB에 가져오면 모든 조회 결과가 같음, 가져오기가 기존 데이터를 교체함, 잘못된 JSON(형식 오류, 버전 불일치, 필드 누락)은 거부되고 기존 데이터 유지
- [x] 테스트와 빌드가 통과한다

## Comments

- **공개 메서드(`src/workoutLog/backup.ts`)**: `exportBackup(now): Promise<string>`, `importBackup(json): Promise<void>`(형식이 틀리면 reject), `markBackedUp(now): Promise<void>`, `getBackupReminder(now): Promise<BackupReminder | null>`. `BackupReminder`는 `{ daysSinceBackup: number | null }`이며 null이면 백업한 적이 없다는 뜻이다. 모두 시각을 인자로 받아 테스트에서 고정할 수 있다.
- **내보내기와 백업 시각 기록을 분리**: `exportBackup`은 JSON만 만든다. 공유 시트에서 취소(AbortError)하면 백업한 것이 아니므로, 화면 도우미 `src/backupFile.ts`의 `shareBackup()`이 공유나 다운로드를 마친 뒤에만 `markBackedUp`을 부른다. 다운로드 대체 경로는 완료를 알 수 없어 클릭 직후 성공으로 본다.
- **백업 형식 v1**: `{ version: 1, exportedAt: ISO 문자열, exercises: [{id, name}], sets: [{id, exerciseId, weight, reps, recordedAt, trainingDay}] }`. id를 그대로 보존해 세트-종목 참조와 세션 순서가 왕복 후에도 같다. 가져온 뒤 새로 추가하는 종목과 세트의 자동 증가 id가 충돌하지 않는 것도 테스트로 확인했다.
- **검증**: JSON 파싱, 객체 여부, `version === 1`, 목록 존재, 각 항목의 필드 타입, 세트의 `exerciseId`가 파일 안의 종목을 가리키는지까지 본다. 통과한 필드만 골라 저장한다(알 수 없는 필드는 버린다). 뒤 티켓이 `Exercise`/`WorkoutSet`에 필드를 추가하면 `parseBackup`도 함께 고치고, 호환되지 않는 변경이면 `FORMAT_VERSION`을 올린다. 무게/횟수의 값 범위 검증(03 티켓)은 가져오기에서 하지 않는다.
- **트랜잭션**: 검증을 먼저 끝낸 뒤 `exercises`/`sets`를 한 트랜잭션에서 비우고 다시 채운다. `meta`(마지막 백업 시각)는 가져오기로 바꾸지 않는다.
- **배너 기준**: "7일을 넘었다"는 경과 시간이 정확히 7×24시간보다 클 때다. N은 경과 시간을 일 단위로 내림한 값이라 7일 1분 전 백업은 "마지막 백업 7일 전"으로 보인다. 세트가 0개면 백업 이력과 무관하게 배너가 없다.
- **화면 충돌 최소화**: 배너는 별도 컴포넌트 `src/screens/BackupBanner.tsx`가 스스로 조회한다. `TodayScreen`에는 설정 링크 버튼과 `<BackupBanner />`만, `App.tsx`에는 `settings` 라우트만 더했다.
- **UI 확인**: 스펙상 화면과 공유 시트는 자동 테스트 범위 밖이다. 빌드와 타입 검사는 통과했지만 iPhone에서의 공유 시트 동작은 직접 확인이 필요하다.
