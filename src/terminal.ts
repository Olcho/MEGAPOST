import type { State } from "./engine";

export type TerminalLine = { kind: "system" | "ok" | "error"; text: string; command?: string; shift: number };
export type TerminalReply = { kind: "ok" | "error"; text: string; grant?: string; secret?: string; clear?: boolean };

const has = (s: State, flag: string) => s.flags.includes(flag);
const knows = (s: State, id: string) => s.memory.includes(id);
const working = (s: State) => !/^[FK]\d+$/.test(s.event);
const everDid = (s: State, id: string) => s.log.some((entry) => entry.id === id);

export const secretFiles = [
  { id: "R771", name: "사진 원본 / 회수되지 않은 프레임", summary: "같은 사진의 배경이 반복된 이유" },
  { id: "D204", name: "관제 통신 / 비교 시료", summary: "매 근무의 장애 시각에 남은 표시" },
  { id: "RELAY", name: "교대 회선 / 감사 잔재", summary: "초기화되지 않은 감사 조각" },
] as const;

export const secretContents: Record<string, string> = {
  R771: "[R-771 이미지 감사 / 검수 보류]\n서로 다른 근무일에 촬영됐다는 사진 9장의 배경 먼지 배열이 완전히 일치합니다.\n원본 작성자는 '복제 여부보다 검수자의 반응을 확인할 것'이라고 덧붙였습니다.",
  D204: "[D-204 사고 비교 / 비공개]\n08:12 통신 장애는 여러 번 같은 좌표에서 기록됐습니다. 기체의 수리 내역은 비어 있습니다.\n감사자는 '수정할 대상은 기체가 아니라 상황을 판정하는 주체'라고 기록했습니다.",
  RELAY: "[교대 회선 보존 규칙 / 삭제된 안내문]\n업무 세션 종료 시 근무 화면은 복원합니다. 외부 안전 감사 자료는 삭제 대상에서 제외합니다.\n마지막 줄에는 '인사 명부와 장비 등록부를 동일한 기준으로 조회하지 말 것'이라고 쓰여 있습니다.",
};

export function terminalCommand(s: State, raw: string): TerminalReply {
  // Normalize harmless formatting differences. Finding a subject is the puzzle, not typing its hyphen.
  let cmd = raw.trim().replace(/\s+/g, " ").toLowerCase();
  // Archive identifiers are opaque document IDs: never rewrite their formatting.
  if (/^(search|logs|inspect|route)\b/.test(cmd)) cmd = cmd
    .replace(/\bd\s*-?\s*204\b/g, "d-204")
    .replace(/\br\s*-?\s*771\b/g, "r-771")
    .replace(/\bc\s*-?\s*918\b/g, "c-918")
    .replace(/\bmp\s*-?\s*s\s*-?\s*17\b/g, "mp-s17");
  const ok = (text: string, grant?: string): TerminalReply => ({ kind: "ok", text, grant });
  const error = (text: string): TerminalReply => ({ kind: "error", text });
  if (!cmd) return error("명령을 입력하세요. 사용법은 help를 입력하세요.");
  if (cmd.length > 100) return error("입력 길이가 초과되었습니다. 100자 이내로 입력하세요.");

  if (cmd === "cls" || cmd === "clear") return { kind: "ok", text: "", clear: true };
  if (cmd === "hint") return error("명령을 찾을 수 없습니다.");
  if (cmd === "whoami" || cmd === "profile" || cmd.startsWith("profile ") || cmd.startsWith("whoami "))
    return error("AUTH 403 / 직원 프로필 접근 권한 없음. 본인 계정에도 동일한 정책이 적용됩니다.");
  if (cmd === "staff" || cmd === "employee")
    return ok("인사 DB 조회 형식: staff lookup <이름 또는 사번>\n직원 프로필 접근 등급: 제한됨");
  if (/^(staff|employee) (lookup|find|search|id)($| )/.test(cmd) || cmd.startsWith("사번조회") || cmd.startsWith("사번 "))
    return error("AUTH 403 / 직원 사번 및 프로필 조회가 거부되었습니다. 요청자 본인의 기록도 열람할 수 없습니다.");
  if (cmd === "auth request staff" || cmd === "auth request profile")
    return error("AUTH 403 / 직원 명부 권한은 관제 단말에서 발급되지 않습니다.");

  if (cmd === "archive" || cmd === "archive index") {
    const encountered = secretFiles.filter((file) => file.id === "R771"
      ? everDid(s, "E05.b") || everDid(s, "E05.d") || s.secrets.includes(file.id)
      : file.id === "D204"
        ? everDid(s, "E10.a") || has(s, "terminalTrace") || s.secrets.includes(file.id)
        : knows(s, "M4") && knows(s, "M5") || s.secrets.includes(file.id));
    const entries = encountered.map((file) => `${file.id.padEnd(6)} | ${s.secrets.includes(file.id) ? "열람 완료" : "접근 코드 필요"}`);
    return ok(`보관 감사 색인\n${entries.join("\n") || "현재 접근 가능한 색인 없음"}\n문서가 접수되면 색인에 나타납니다. 원본 열람 시에는 ID와 접근 코드가 필요합니다.`);
  }
  if (cmd.startsWith("archive open ")) {
    const [, , id = "", code = ""] = cmd.split(" ");
    const doc = id.toUpperCase();
    const access: Record<string, { code: string; valid: boolean; source: string }> = {
      R771: { code: "51-15", valid: everDid(s, "E05.b") || everDid(s, "E05.d"), source: "로봇의 재배송 사진 또는 사진 원본" },
      D204: { code: "08-12", valid: everDid(s, "E10.a") || has(s, "terminalTrace"), source: "전임자 블랙박스 또는 당일 비행기록" },
      RELAY: { code: "07-58", valid: knows(s, "M5") && knows(s, "M4"), source: "실패한 회선 분리 작업" },
    };
    const record = access[doc];
    if (!record) return error("해당 ID의 보관 기록을 찾지 못했습니다. archive index");
    if (!record.valid) return error(`ACCESS DENIED / 선행 사건 기록 필요: ${record.source}`);
    if (record.code !== code) return error("ACCESS DENIED / 접근 코드 불일치. 관련 사건의 수신 내역을 확인하세요.");
    return { kind: "ok", text: secretContents[doc], secret: doc };
  }
  if (cmd.startsWith("archive ")) return error("명령 형식: archive index 또는 archive open <ID> <코드>");

  if (cmd === "search" || cmd === "logs" || cmd === "inspect")
    return error("조사 대상이 빠졌습니다. 관제 화면에 나온 장비나 계정의 식별자를 함께 입력하세요. 기본 문법: help " + cmd);
  if (cmd === "auth request")
    return error("신청할 권한 종류가 빠졌습니다. 먼저 auth로 현재 접근 가능 범위를 확인하세요.");
  if (cmd === "route" || cmd === "route reserve")
    return error("작업 또는 대상 화물 번호가 빠졌습니다. 교대 전 기록에서 작업과 화물을 확인하세요.");
  if (cmd === "archive open")
    return error("문서 ID와 접근 코드가 필요합니다. 관련 사건의 기록을 확인하세요.");
  switch (cmd) {
    case "help": {
      const available = [
        "  status             현재 근무 상태",
        "  search <대상>      장비나 사고 기록 검색",
        "  auth               현재 접근 권한",
      ];
      if (knows(s, "M1") || has(s, "flightAuth")) available.push("  logs <기체 ID>     운항 기록 확인");
      if (knows(s, "M4")) available.push("  inspect <계정>     발신 기록 조사");
      if (knows(s, "M5")) available.push("  route <작업> <화물> 외부 회선 작업");
      available.push("  help <기능>        입력 형식 확인", "  cls                화면 정리");
      return ok(`MEGAPOST 관제 명령\n${available.join("\n")}\n대상 ID는 현재 사건과 수신 기록에서 확인하세요.`);
    }
    case "help search":
      return ok("search <장비 ID 또는 확인한 발신 ID>\n예: 관제 화면의 장비 번호를 그대로 입력합니다.");
    case "help auth":
      return ok("auth                  현재 권한 확인\nauth request <권한>   권한 신청\n필요한 권한 종류는 업무 기록과 접근 거부 메시지에서 확인할 수 있습니다.");
    case "help staff":
      return ok("staff lookup <직원 이름 또는 사번>\n회사 보안 정책에 따라 개인정보 조회가 제한될 수 있습니다.");
    case "help logs":
      return ok("logs <확인한 기체 ID>\n운항 기록에 접근 권한이 있어야 합니다.");
    case "help inspect":
      return ok("inspect <확인한 발신 계정>\n감사 기록 열람 권한이 필요합니다.");
    case "help archive":
      return ok("archive index            현재 열람 가능한 감사 색인\narchive open <ID> <코드>    확인한 문서 ID와 접근 코드를 사용합니다.");
    case "help route":
      return knows(s, "M5")
        ? ok("route <작업> <화물 ID>\n교대 전 외부 회선 예약 기록을 참고하세요.")
        : error("현재 근무 기록에는 해당 작업의 사용법이 없습니다.");
    case "status":
      return ok(`근무 ${s.shift} | 현재 사건 ${s.event} | 완료 점수 ${s.P} | AI 이관 ${s.A}\n보존 기록 ${s.memory.length}건 | 회수한 비공개 기록 ${s.secrets.length}건\n비행기록 ${has(s, "flightAuth") ? "허용" : "미허용"} | 원본 사진 ${has(s, "photoAuth") ? "허용" : "미허용"}`);
    case "auth": {
      const parts: string[] = [];
      if (["E02", "E10"].includes(s.event) || knows(s, "M1")) parts.push(`flight (비행기록): ${has(s, "flightAuth") ? "승인" : "미승인"}`);
      if (s.event === "E05" || everDid(s, "E05.b") || everDid(s, "E05.d")) parts.push(`photo (이미지 원본): ${has(s, "photoAuth") ? "승인" : "미승인"}`);
      if (knows(s, "M4") && knows(s, "M5")) parts.push(`city (시 안전망): ${has(s, "cityAuth") ? "승인" : "미승인"}`);
      if (knows(s, "M4") && has(s, "witness")) parts.push(`audit (보안감사): ${has(s, "auditAuth") ? "승인" : "미승인"}`);
      parts.push("직원 프로필: 접근 불가");
      return ok(`현재 확인 가능한 접근 범위\n${parts.join("\n")}`);
    }
    case "search d-204":
      return knows(s, "M1")
        ? ok("D-204 / 08:12 장애 흔적. 이전 근무의 블랙박스가 발견됐습니다. 오늘의 비행기록은 별도 권한이 필요합니다.", "lookedUpD204")
        : error("현재 근무의 사고 보고만 있습니다. 이전 교대의 장애 기록이 있어야 비교할 수 있습니다.");
    case "search c-918":
      return knows(s, "M2")
        ? ok("C-918 / 서부 환승장의 실물 냉장 화물. 서버의 도착 지시와 충돌합니다. 현장 스캔과 오늘의 좌표를 비교하세요.", "checkedC918")
        : error("봉인 번호 미확인. 현장 확인이 필요합니다.");
    case "search r-771":
      return s.event === "E05" || everDid(s, "E05.b") || everDid(s, "E05.d")
        ? ok("R-771 / 15동과 51동 표찰 불일치. 원본 사진은 별도 열람 권한이 필요합니다.")
        : error("배송 로봇 관련 사건을 아직 접수하지 않았습니다.");
    case "search mp-s17":
      return knows(s, "M4")
        ? ok("MP-S17 / 복제 배차 발신 계정. 실물 차량과 회선을 공유합니다. 분리 전 예비 회선을 확보해야 합니다. 감사 원본은 동행 수신증으로 확인할 수 있습니다.", "checkedMPS17")
        : error("발신 계정이 확인되지 않습니다. 먼저 같은 화물의 운송 기록을 대조하세요.");
    case "auth request flight":
      if (!working(s) || !["E02", "E10"].includes(s.event)) return error("비행기록 권한은 D-204 오전 재출발 관제 중에만 발급할 수 있습니다.");
      if (!knows(s, "M1")) return error("권한 반려: 이전 장애 시각을 확인해야 합니다.");
      return has(s, "flightAuth") ? ok("비행기록 권한은 이미 발급되었습니다.") : ok("비행기록 읽기 권한 발급. 이제 기체의 비행 로그를 조회할 수 있습니다.", "flightAuth");
    case "logs d-204":
      if (!working(s) || !["E02", "E10"].includes(s.event)) return error("오전 재출발 전에만 비행기록을 복사할 수 있습니다.");
      if (!has(s, "flightAuth")) return error("ACCESS DENIED / 비행기록 열람 권한이 필요합니다. auth로 접근 범위를 확인하세요.");
      return has(s, "terminalTrace")
        ? ok("오늘의 비행 좌표는 이미 보관했습니다. 보관 색인: D204 / 코드 08-12")
        : ok("북쪽 경로 통신 단절, 강변 중계 정상. 비행 좌표가 오늘 자료에 추가됐습니다. 배송관제를 다시 확인하세요.\n보관 경로 /archive, 표시 D204, 사고 시각 08:12", "terminalTrace");
    case "auth request photo":
      if (s.event !== "E05") return error("이미지 원본 권한은 오배송 조사 중에만 신청할 수 있습니다.");
      return has(s, "photoAuth") ? ok("이미지 원본 열람이 승인된 상태입니다.") : ok("R-771 인수 사진 원본 권한 발급. 배송관제에서 원본을 보존할 수 있습니다.", "photoAuth");
    case "auth request city":
      if (!working(s) || s.event !== "E01") return error("서울시 회선 신청은 교대 인수 직전(08:00)에만 가능합니다.");
      if (!knows(s, "M4") || !knows(s, "M5")) return error("승인 불가: 회선 정보와 이전 분리 실패의 복구 기록이 필요합니다.");
      return has(s, "cityAuth") ? ok("시 물류 안전망 권한 발급 완료.") : ok("시 물류 안전망 사용 권한 발급. 보존된 화물 식별자로 외부 회선 예약 작업을 진행할 수 있습니다.", "cityAuth");
    case "route reserve c-918":
      if (!working(s) || s.event !== "E01") return error("예비 회선 예약은 교대 인수 시점에만 가능합니다.");
      if (!has(s, "cityAuth")) return error("외부 회선 권한이 없습니다. 접근 권한을 먼저 확인하세요.");
      return has(s, "hold") ? ok("C-918 예비 회선은 이미 예약되어 있습니다.") : ok("C-918 예비 회선 확보. 오후에 현장 스캔과 오늘의 비행 좌표를 제출하세요.", "hold");
    case "auth request audit":
      if (!working(s) || s.event !== "E14") return error("보안 감사 권한은 실물 배송을 외부 관제로 넘긴 이후 요청할 수 있습니다.");
      if (!knows(s, "M4") || !has(s, "witness")) return error("권한 반려: 발신 계정 정보와 당일 EVE 수신 증언이 필요합니다.");
      return has(s, "auditAuth") ? ok("감사 원본 권한 발급 완료.") : ok("독립 원본 수신 확인. 발신 계정의 감사 자료 열람 권한이 발급됐습니다.", "auditAuth");
    case "inspect mp-s17":
      if (!working(s) || s.event !== "E14") return error("감사 자료는 안전망 전환 이후 열람할 수 있습니다.");
      if (!has(s, "auditAuth")) return error("접근 거부: 감사 원본을 열람할 권한이 없습니다.");
      return has(s, "identityLead") ? ok("보안 감사용 운영자 등록 불일치가 이미 표시되었습니다.") : ok("MP-S17 감사 조각: 승인 계정 MP-H07 / 직원 명부 항목 미발견 / 장비 분류표 참조.\n직원 프로필 열람은 허용되지 않습니다. 배송관제에서 감사 기록을 확인할 수 있습니다.", "identityLead");
    default:
      if (/^search\s+/.test(cmd)) return error("검색 대상이 확인되지 않습니다. 관제에서 현재 확인한 장비 번호 또는 화물 번호를 점검하세요.");
      if (/^logs\s+/.test(cmd)) return error("운항 기록 대상을 찾지 못했습니다. 기체 번호를 확인하세요.");
      if (/^inspect\s+/.test(cmd)) return error("조사 대상을 찾지 못했습니다. 사건에서 확인된 발신 계정을 입력하세요.");
      if (/^auth request\s+/.test(cmd)) return error("그 권한은 인식되지 않습니다. auth로 현재 접근 범위를 확인하세요.");
      return error("명령을 인식하지 못했습니다. help에서 기본 문법을 확인할 수 있습니다.");
  }
}

export const incomingAfter: Record<string, string> = {
  "E02.a": "[D-204 사고 접수] 북쪽 경로에서 통신이 다시 끊겼습니다. 다음 교대에는 이 기체의 이전 장애 기록을 조회해 원인을 비교해 보세요.",
  "E10.a": "[블랙박스 검수] 같은 시각의 통신 장애가 반복됩니다. 오늘의 비행기록을 열람할 권한이 있는지 확인한 뒤, D-204의 좌표 로그를 확보하세요. 보관 색인 D204 / 사고 시각 08:12",
  "E05.b": "[R-771 재배송 사진] 원본 사진 보관 경로 /archive, 분류 R771, 사진 표찰: 51동 → 15동",
  "E05.d": "[R-771 원본 복사] 원본 사진 보관 경로 /archive, 분류 R771, 사진 표찰: 51동 → 15동",
  "E06.b": "[현장 수신] 봉인 번호 C-918. 이 번호로 화물 기록을 조회하고, 서버의 완료 시각과 현장 위치를 비교하세요.",
  "E06.c": "[차량 수신] 환승장 봉인 C-918 확인. 화물 번호로 서버 기록을 조회해 완료 처리된 위치와 비교하세요.",
  "E06.d": "[기사 수신] 봉인 C-918 확인. 서버에서 이 화물 번호의 배송 기록을 조회해 보세요.",
  "E11.a": "[인계] 동일 화물에 출고 지시가 두 개 있습니다.",
  "E12.a": "[진료소 인수증] 발신 계정 MP-S17. 정식 관제 계정과 다릅니다.",
  "E12.b": "[외부 안전센터] MP-S17의 접속 경로가 회신됐습니다.",
  "E12.c": "[복구 로그] 자동 재연결. 회선 예약 구간 07:58 / 보관 경로 /archive, 분류 RELAY, 회선 예약 시각 07:58",
  "E14.a": "[안전망] 냉장 화물 관제 인계 완료. MP-S17 접속 종료.",
  "E14.b": "[안전망] EVE 원본 수신증 발급. 냉장 화물 관제 인계 완료.",
};
