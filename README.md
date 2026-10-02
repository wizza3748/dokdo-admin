# Dokdo Admin Prototype

독도 관리자 기능을 빠르게 검증하기 위한 Next.js 프로토타입입니다. 기존 관리자 화면과 온라인워크북 본사/기관 화면을 하나의 프로젝트에서 관리합니다.

## 주요 경로

- `/` — 일감보드
- `/admin/online-workbooks` — 본사 온라인워크북 현황
- `/agency/online-workbooks` — 기관 온라인워크북 목록

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. 사이드바의 `[본사관리자]`, `[기관관리자]` 영역에서 온라인워크북 화면으로 이동할 수 있습니다.

## Codex 작업 기준

1. 작업 전 `git status --short`로 사용자 변경사항을 확인합니다.
2. 화면 구현 후 `npm run lint`와 `npm run build`를 실행합니다.
3. 로컬 검증은 `npm run dev`로 실행한 뒤 관련 경로를 직접 확인합니다.
4. 운영 배포는 연결된 Firebase App Hosting이 GitHub의 라이브 브랜치 push를 감지해 수행합니다.

세부 Git 및 배포 수행 범위는 `AGENTS.md`를 따릅니다. `로컬 커밋만 해`는 로컬 커밋까지만, `GitHub 푸시에 Firebase 배포까지 해`는 App Hosting 배포 완료 확인까지를 의미합니다.

온라인워크북 데이터는 현재 `src/lib/online-workbooks.ts`의 프로토타입 데이터입니다. 실제 API 연결 시 이 데이터 소스를 서버 요청으로 교체하면 됩니다.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

### 프로토타입 데이터 보존

기존 화면과 기능은 그대로 사용합니다. 개발 서버에서는 `.local-state` JSON을,
Vercel에서는 Redis REST 영구 저장소를 사용합니다. 저장소가 연결되지 않은
Vercel 배포는 임시 메모리에 저장하지 않고 오류를 표시합니다.

환경 변수는 Vercel 설정에만 등록하고 Git에 올리지 않습니다.

- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (또는 `KV_REST_API_URL`, `KV_REST_API_TOKEN`)
- `DOKDO_STATE_NAMESPACE`: 프로덕션과 Preview에 서로 다른 값 사용

이전 절차:

1. 기존 로컬 브라우저에서 `/local-migration`을 열어 현재 브라우저 데이터를 보관합니다.
2. `.local-state`를 별도로 백업합니다. Git 및 배포 파일에는 포함하지 않습니다.
3. 저장소 연결 정보를 Git 제외 환경 파일 또는 승인된 저장소 내보내기로 준비합니다.
   민감 환경 변수는 CLI에서 내려받을 수 없으며 `[SENSITIVE]`를 실제 값으로 사용하지 않습니다.
4. 이전 대상 `DOKDO_STATE_NAMESPACE`를 명시하고 Node 24에서
   `node scripts/import-prototype-state.mjs` 실행 후 이전 결과를 확인합니다.
5. `npm run build` 성공 후 최신 코드를 배포하고 학생·기관·보고서 화면을 검증합니다.

이전 스크립트는 비어 있는 원격 키에만 데이터를 가져오며 기존 원격 변경을 덮어쓰지 않습니다.
학생 설정·템플릿·읽기 기록 등 브라우저 데이터는 최초 방문 시 복원한 뒤 기존처럼
브라우저별로 보관됩니다. 이후 모든 브라우저 설정을 기기 간 동기화하는 기능은 아닙니다.
온라인 독후감과 서버 제출 목록은 영구 저장소에 보관됩니다.
이 프로젝트는 역할 쿼리로 접근하는 테스트용 프로토타입이며 실제 학생 개인정보를
공개 URL에 올리는 운영 서비스로 사용하지 않습니다.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
