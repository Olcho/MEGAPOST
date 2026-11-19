# MEGAPOST 구조와 저장

| 파일 | 역할 |
|---|---|
| src/content.json | 장면·목표·EVE 초기 안내, 선택의 제목과 알려진 비용, 조건·효과·결과·목적지, 기억과 종점. |
| src/engine.ts | 순수 상태 전이와 조건 평가. 화면과 QA가 공유한다. |
| src/save.ts | 버전 2 명령 이력의 검증, 재생, Web Locks 안에서 리비전 충돌 확인. |
| src/main.tsx | 화면 내비게이션, 저장·가져오기, 보관함, 도감, 설정. |
| src/DispatchDesk.tsx, src/DispatchMap.tsx | 현재 관제 업무와 선택, EVE 대화, 배송 경로와 장비 상태. 지도는 게임용 도식이다. |
| src/records.ts | 출처별 발견 기록과 조사 수첩. |
| docs/qa/check-design.mjs, tests/browser.mjs | 실제 엔진의 전수 탐색·시뮬레이션과 Chrome 경로 재생. |

## 데이터 호환

HUMAN FIRST의 소스는 `legacy/human-first`의 `92eb07b`에 있다. 브라우저의 기존 v1 데이터는 해당 판의 키 `human-first.casefile.v1`에 둔다. MEGAPOST는 `megapost.dispatch.v2`에만 쓰고 로그를 재생한다. 같은 사건·선택 ID라도 사건과 효과가 달라 v1을 자동 전환하지 않는다. 같은 주소에 이전 판 기록이 있다면 설정에서 원본 파일을 내려받을 수 있다. MEGAPOST 전체 초기화도 v2만 지운다.

새 기록에는 판본, 리비전, 명령열을 담는다. 새 창에서는 엔진을 통해 처음부터 허용되는 명령만 재생한다. 잘못된 명령이나 판본은 가져오지 않는다. 주요 분기는 서버나 외부 API를 읽지 않는다. 플레이와 안전한 다중 탭 쓰기에는 localhost 또는 HTTPS와 Web Locks를 지원하는 브라우저가 필요하다.

영구 보존하는 것은 발견한 기억·결말·실제 근무 이력이다. 배송 성과, 자동 승인, 차량·항로 상태, 당일 비행기록, 당일 EVE 증언, 예비 회선은 재출근할 때 초기화된다. 읽은 장면의 판정은 같은 장면의 표시 가능한 행동·관련 상태를 비교하고 본문만 접는다.

