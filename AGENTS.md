# Dokdo Admin Codex 작업 규칙

## Git 및 배포 범위

- 사용자가 `로컬 커밋만 해`라고 요청하면 변경사항을 검증하고 로컬 Git 커밋까지만 수행한다.
- 로컬 커밋 요청에는 `git push`, Firebase 배포, 원격 서비스 변경을 포함하지 않는다.
- 사용자가 `GitHub 푸시에 Firebase 배포까지 해`라고 요청하면 다음 작업을 모두 완료한다.
  1. 변경사항 검증
  2. 필요한 로컬 커밋 생성
  3. GitHub 원격 저장소의 대상 브랜치로 push
  4. 연결된 Firebase App Hosting 자동 롤아웃 시작 확인
  5. Firebase App Hosting 배포 완료 및 운영 URL 정상 응답 확인
- push만 성공하고 Firebase 배포가 실패하거나 완료되지 않은 경우 작업 완료로 보고하지 않는다. 실패 원인과 현재 원격 상태를 사용자에게 명확히 알린다.
- 사용자가 배포를 명시하지 않은 일반 구현 요청에서는 커밋, push, Firebase 배포를 임의로 수행하지 않는다.

## 현재 배포 정보

- GitHub 원격 저장소: `https://github.com/wizza3748/dokdo-admin.git`
- 기본 작업 브랜치: `main`
- Firebase 프로젝트: `studio-5794660757-b438b`
- Firebase App Hosting 백엔드: `dokdo-admin`
- 운영 URL: `https://dokdo-admin--studio-5794660757-b438b.asia-east1.hosted.app/`

## 기본 검증

- 화면 또는 코드 변경 후 변경 파일 ESLint 검사를 실행한다.
- 원격 배포 전 `npm run build`를 통과시킨다.
- 배포 후 운영 URL과 변경된 주요 경로를 브라우저에서 확인한다.
