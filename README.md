# YOU ARE REPLACEABLE
### MEGAPOST · 서울 2080

마포 허브의 배송 운영 관리자로 출근한다. 통신이 끊긴 드론을 회수하고, 기사 휴게와 마감의 균형을 잡고, 배송 완료로 기록된 화물을 실제로 찾아야 한다. 교대가 반복되면 잠긴 운항 기록과 화면에 뜨지 않는 화물의 위치가 드러난다.

## 실행

Node.js 24와 npm을 사용할 수 있는 프로젝트 루트에서 실행한다.

```sh
npm ci
npm run dev
```

브라우저에서 터미널의 localhost 주소를 연다. 판정은 순수 TypeScript 엔진에서 실행되고, 근무 이력은 브라우저에 자동 저장된다. 설정에서 저장 파일을 내려받거나 가져올 수 있다. HUMAN FIRST 소스는 `legacy/human-first`에 보존되어 있으며, 현 판과는 별도 키를 쓴다.

## 빌드와 QA

```sh
npm test
npm run build
npm run preview
```

브라우저 검사는 로컬 서버를 먼저 켜고 `npx playwright install chromium`으로 테스트용 브라우저를 준비한 뒤 `node tests/browser.mjs`를 실행한다. 기본 주소는 http://127.0.0.1:5173 이다. `HF_URL`로 주소를, `HF_BROWSER`로 이미 설치된 Chromium 계열 브라우저를 지정할 수 있다. 두 값은 테스트용이다. 빌드 산출물은 dist/에 있다.

[기획과 문서 목록](docs/GAME_DESIGN.md) · [검증 결과](docs/IMPLEMENTATION_PLAN.md) · [플랫폼 이식](docs/IMPORT_GUIDE.md)

