# 모두의 AI 이식 · MEGAPOST

Node.js 24와 npm을 사용한 정적 웹 프로젝트다. 실행 시 React와 React DOM을 사용하며, 빌드에는 TypeScript와 Vite가 필요하다. Playwright는 실제 브라우저 QA에서만 쓴다. 게임 환경 변수, 데이터베이스, 키는 없다.

1. 루트의 package.json, package-lock.json, tsconfig.json, vite.config.ts, index.html을 복사한다.
2. src/ 전체를 같은 구조로 옮긴다. content.json → engine.ts → save.ts·records.ts가 판정 데이터와 기록을 제공한다. main.tsx가 DispatchDesk.tsx와 DispatchMap.tsx, style.css를 불러온다.
3. QA를 같이 수행하려면 docs/qa/check-design.mjs 및 tests/browser.mjs를 복사한다. 기존 HUMAN FIRST를 재실행하려면 이 프로젝트에 보존된 legacy/human-first 브랜치를 별도로 체크아웃한다.
4. 루트에서 설치, 판정 검산, 빌드를 실행한다.

```sh
npm ci
npm test
npm run build
npm run preview
```

빌드한 dist/ 전체를 정적 파일로 올릴 수 있다. 상대 경로 자산을 사용한다. 브라우저에서는 HTTPS 또는 localhost로 연다. 호스트·프로토콜·포트가 바뀌면 같은 v2 판 사이에서도 파일 내보내기와 가져오기가 필요하다. v1은 별도 판에서 열고, 데이터 원본이 기존 주소에 있으면 MEGAPOST 설정에서도 다운로드할 수 있다.

대상 플랫폼의 GitHub 자동 반입은 검증 필요다. 저장소 공개 후 파일별 주소는 `https://raw.githubusercontent.com/<owner>/<repo>/<commit>/<path>` 형식을 사용한다. 동일 커밋의 전체 파일을 수동 복사하거나 ZIP으로 반입할 수 있다. 배포 자산에는 node_modules, 개인 세이브, 브라우저 데이터가 필요 없다.

인수 점검은 드론 문제의 목표와 버튼 설명 표시, 두 번 자동 승인 후 다음 출근에서 이전 사고 탐색, 예비차 사용 여부에 따른 오후 행동, 모바일 스크롤, 저장 파일 이동, K4 대표 경로다. 실기기와 모두의 AI의 임베드 환경에서 Web Locks, 로컬 저장, 파일 내려받기·가져오기를 확인한다.

