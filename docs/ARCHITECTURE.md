> 버전 안내: 아래 표의 기존 v3 항목은 초기 설계의 이력입니다. 최신 v5 구현은 `src/eve.ts`, `src/EVEPanel.tsx`와 터미널, 비공개 기록을 포함하며, 저장 키는 `megapost.dispatch.v4`를 유지합니다.

# MEGAPOST H07: 기술 구조

| 경로 | 기능 |
|---|---|
| `src/content.json` | 사건 16개, 전이 40개, 결말 9개, 기억 7개. 플레이어의 정체 공개는 E15, E16에만 명시. |
| `src/engine.ts` | 사건 이동과 조건, 상태, 기억 해금, 반복 근무 초기화의 순수 함수. |
| `src/save.ts` | 명령열 재생을 통한 세이브 검증과 Web Locks 쓰기. v3 저장. |
| `src/main.tsx` | 라우팅 없는 React 화면 상태, 게임 기록, 도감, 저장 백업과 초기화. |
| `src/DispatchDesk.tsx` | 사건 UI, 판단 근거 요약, 해금 선택지, 후반 기체 정체 공개 화면. |
| `src/DispatchMap.tsx` | 서울 서부의 도식 배송망과 선택별 차량 경로. |
| `src/records.ts` | 이전 직원 기록과 자신의 근무 일지. |
| `docs/qa/check-design.mjs` | 도달 가능성 검산, 회차별 기억 발견, 대표 경로 재생. |
| `tests/browser.mjs` | Playwright 화면 및 저장 복원 테스트. |

## 저장 데이터 호환 정책

- HUMAN FIRST v1: `human-first.casefile.v1`
- MEGAPOST 이전판 v2: `megapost.dispatch.v2`
- H07 정체 반전 개편 v3: `megapost.dispatch.v3`

새 버전은 별도 키를 사용하므로 이전 저장을 덮어쓰지 않는다. 스토리 분기가 변경되어 이전 버전의 명령열을 새 버전의 사건으로 **자동 변환하지 않는다**. 이전 키의 데이터가 있으면 설정에서 별도 파일로 백업할 수 있다. 변경된 코드에는 플레이 및 안전한 다중 탭 쓰기를 위해 HTTPS 또는 localhost 환경에서 Web Locks를 지원하는 브라우저가 필요하다.

`node_modules`, `dist`, 테스트용 세이브는 소스 배포 ZIP에 포함하지 않는다. `npm ci`, `npm run build`로 현지에서 새 산출물을 생성한다. 호스트나 포트가 바뀌면 브라우저 로컬 저장이 달라진다.
