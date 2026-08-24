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

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
