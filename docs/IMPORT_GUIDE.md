# 모두의 AI 플랫폼 이식 가이드 — MEGAPOST H07

React + TypeScript + Vite 정적 웹앱이다. 서버, DB, 토큰, 유료 AI API가 필요하지 않다. 루트의 `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig.json`, `src/` 전체가 필수다.

## 로컬 실행

```sh
npm ci
npm test
npm run build
npm run preview
```

## 이식 순서

1. 이 ZIP을 풀어 프로젝트를 Git 저장소로 관리한다.
2. 루트 설정 파일과 `src/` 전체를 하나의 동일한 프로젝트로 옮긴다.
3. 플랫폼에서 npm 의존성을 설치하고 Vite 구성을 확인한다. 실제 GitHub 통합 반입 기능은 별도 검증이 필요하다.
4. 정적 배포가 가능하다면 새로 빌드한 `dist/`만 올릴 수도 있다. ZIP의 `dist/`는 의도적으로 제외됐다.
5. 출근 E01 → 드론 E02 → 첫 실패 → 재출근 → 해금 선택 → E15 정체 공개 → K5 경로를 검사한다.
6. `megapost.dispatch.v4`를 사용하는 브라우저 저장, 파일 다운로드와 가져오기, Web Locks, 모바일 화면을 실제 호스트에서 검사한다.

v5는 v4와 동일한 저장 키와 명령 버전을 사용한다. v4 저장은 그대로 읽을 수 있지만 v3와 v2 저장은 이전 버전에서 열어야 한다. 프로젝트 자체에는 외부 API 키가 없다.

코드 호스팅으로 공개할 경우 프로젝트 파일 주소는 해당 저장소의 실제 주소를 사용한다. 플랫폼이 공개 GitHub URL만으로 폴더를 자동 복제한다고 가정하지 않는다.

## v5 추가 점검

EVE 패널 대화, `cls` 출력 초기화, 직원 사번 조회 접근 거부, 숨겨진 보관 기록 저장, E04.d/E05.d/E06.d 조건 해금을 확인한다. Vite 빌드 결과와 모바일 실기기 동작은 대상 환경에서 별도 검증한다.
