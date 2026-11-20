import type { State } from "./engine";

/** A goal is explicit; the command used to accomplish it stays player-authored. */
export type Investigation = { title: string; detail: string };
export type InvestigationStep = { label: string; done: boolean };
const task = (title: string, detail: string): Investigation[] => [{ title, detail }];
const has = (s: State, flag: string) => s.flags.includes(flag);
const knows = (s: State, id: string) => s.memory.includes(id);

export function terminalGuidance(s: State): Investigation[] {
  const event = s.event;
  if (event === "E01" && knows(s, "M4") && knows(s, "M5")) {
    if (has(s, "hold")) return task("예비 회선 예약 완료", "이제 배송관제로 돌아가 오전 배송을 시작하세요. 오후에는 실제 화물의 위치를 다시 확인해야 합니다.");
    return has(s, "cityAuth")
      ? task("외부 회선을 예약하세요", "시 안전망 사용 권한을 얻었습니다. 이전 근무에서 확인한 화물 번호로 배송을 옮길 회선을 미리 확보하세요.")
      : task("외부 배송망 사용 권한을 얻으세요", "지난 근무에서는 관제를 끊자 실제 배송도 멈췄습니다. 오늘 업무를 시작하기 전에 시 안전망의 접근 권한부터 확인하세요.");
  }
  if (["E02", "E10"].includes(event) && knows(s, "M1")) {
    if (has(s, "terminalTrace")) return task("비행기록 확보 완료", "오늘의 기록에서 안전한 강변 중계 경로를 찾았습니다. 배송관제로 돌아가 새 대응을 선택할 수 있습니다.");
    if (has(s, "flightAuth")) return task("D-204의 오늘 비행 로그를 확인하세요", "권한이 승인됐습니다. 기체의 상세 좌표를 열어 북쪽 경로와 우회 경로의 차이를 확인하세요.");
    if (!has(s, "lookedUpD204")) return task("D-204의 이전 사고를 조회하세요", "지난 근무에도 같은 구역에서 사고가 났습니다. 먼저 이 드론의 과거 사고 기록을 검색해 동일한 장애인지 확인하세요.");
    return task("비행기록 열람 권한을 확보하세요", "이전 사고가 확인됐지만 상세 비행기록은 잠겨 있습니다. 기록 열람 권한을 확인하고 신청해 보세요.");
  }
  if (event === "E05") {
    return has(s, "photoAuth")
      ? task("인수 사진 원본을 확인하세요", "열람 권한을 얻었습니다. 배송관제로 돌아가 원본 사진을 증거로 남기는 행동을 선택할 수 있습니다.")
      : task("오배송 사진의 열람 권한을 확인하세요", "주문 주소는 15동, 사진 속 표찰은 51동입니다. 배송 로봇의 사진 원본에 접근할 권한을 확보해 보세요.");
  }
  if (["E06", "E11"].includes(event) && knows(s, "M2")) {
    return has(s, "checkedC918")
      ? task("화물 기록 조회 완료", "서버의 도착 기록과 현장의 실물 위치가 다릅니다. 배송관제에서 봉인 스캔과 비행 좌표를 비교하세요.")
      : task("실물 화물의 배송 이력을 조회하세요", "현장에서 확인된 봉인 번호가 C-918입니다. 이 번호로 배송 기록을 검색해 서버의 도착 위치와 비교하세요.");
  }
  if (event === "E12" && knows(s, "M4")) {
    return has(s, "checkedMPS17")
      ? task("발신 계정 정보 확인 완료", "중복 지시 발신원이 실제 차량과 회선을 공유합니다. 분리하기 전에 배송관제에서 위험을 확인하세요.")
      : task("중복 지시를 보낸 계정을 조회하세요", "내가 하지 않은 배송 지시에도 내 사번이 찍혀 있습니다. 현장에서 발견한 발신 계정의 접속 기록을 찾아보세요.");
  }
  if (event === "E14" && knows(s, "M4") && has(s, "witness")) {
    if (has(s, "identityLead")) return task("감사 원본 확인 완료", "직원 명부와 장비 등록부에 차이가 있습니다. 배송관제로 돌아가 새롭게 열린 조사 행동을 살펴보세요.");
    return has(s, "auditAuth")
      ? task("발신 계정의 감사 원본을 조사하세요", "보안 감사 접근이 승인됐습니다. 중복 지시를 보낸 계정의 원본 기록을 살펴보세요.")
      : task("보안 감사 기록에 대한 열람 권한을 얻으세요", "EVE의 수신 증언과 발신 계정 정보가 있습니다. 회사 보안 감사 자료를 볼 권한을 신청해 보세요.");
  }
  if (event === "E14" && knows(s, "M4")) {
    return task("발신 계정의 연결을 확인하세요", "실제 화물은 안전망으로 인계됐습니다. 중복 지시를 보낸 계정을 더 조사하려면 증언과 감사 권한이 필요할 수 있습니다.");
  }
  return [];
}

/** Display task progress without displaying a command string or locked story identities. */
export function investigationSteps(s: State): InvestigationStep[] {
  const e = s.event;
  if (["E02", "E10"].includes(e) && knows(s, "M1")) return [
    { label: "이전 사고 확인", done: has(s, "lookedUpD204") || has(s, "flightAuth") || has(s, "terminalTrace") },
    { label: "비행기록 열람 권한", done: has(s, "flightAuth") || has(s, "terminalTrace") },
    { label: "오늘의 비행 로그", done: has(s, "terminalTrace") },
  ];
  if (e === "E01" && knows(s, "M4") && knows(s, "M5")) return [
    { label: "시 안전망 접근 권한", done: has(s, "cityAuth") || has(s, "hold") },
    { label: "화물 예비 회선 예약", done: has(s, "hold") },
  ];
  if (e === "E14" && knows(s, "M4") && has(s, "witness")) return [
    { label: "보안 감사 접근 권한", done: has(s, "auditAuth") || has(s, "identityLead") },
    { label: "발신 계정 감사 기록", done: has(s, "identityLead") },
  ];
  if (e === "E05") return [{ label: "사진 원본 열람 권한", done: has(s, "photoAuth") }];
  if (["E06", "E11"].includes(e) && knows(s, "M2")) return [{ label: "화물 배송 기록 조회", done: has(s, "checkedC918") }];
  return [];
}

export function operatingNote(s: State): string {
  switch (s.event) {
    case "E01": case "E13": return "교대 준비 중입니다. 배송 시작 전에 처리해야 할 일을 확인하세요.";
    case "E02": case "E10": return "드론이 멈췄습니다. 냉장 화물의 운송 방법을 결정해야 합니다.";
    case "E03": return "사고 대응 결과를 어디에 보관할지 정해야 합니다.";
    case "E04": return "기사의 휴식과 픽업 시간을 조정하는 중입니다.";
    case "E05": return "배송 로봇이 찍은 건물과 주문 주소가 다릅니다.";
    case "E06": case "E11": return "전산 기록에는 배송 완료, 현장에는 화물이 남아 있습니다.";
    case "E12": case "E14": return "화물을 보호하면서 중복 지시의 발신자를 확인해야 합니다.";
    default: return /^[FK]\d+$/.test(s.event)
      ? "이번 근무는 끝났습니다. 다음 교대에서 종료 분석에 남은 단서를 활용하세요."
      : "현재 사건의 선택지는 배송관제에서 확인할 수 있습니다.";
  }
}
