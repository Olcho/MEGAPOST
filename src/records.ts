import { memory, type State } from "./engine";

export type TraceSource = "authored" | "self" | "community";
export const files = [
  {
    source: "authored" as const,
    id: "E10.a",
    name: "한윤서의 D-204 블랙박스",
    body: "08:12 서부 환승장, 북쪽 진입에서 링크 단절. 기체 좌표와 서버의 도착 기록이 일치하지 않는다. 다음 출발에서는 강변 중계기로 돌아갈 것.",
  },
  {
    source: "authored" as const,
    id: "E06.b",
    name: "박지수의 현장 메시지",
    body: "“제가 본 상자는 하나뿐이에요. C-918. 완료 화면보다 이 번호부터 보세요.”",
  },
  {
    source: "authored" as const,
    id: "E06.c",
    name: "예비 무인차의 봉인 사진",
    body: "C-918 봉인은 서부 환승장 선반에서 촬영됐다. 화면의 신촌 도착 시각 이후에 찍힌 사진이다.",
  },
  {
    source: "authored" as const,
    id: "E11.a",
    name: "전임자의 야간 실물 인계표",
    body: "“같은 화물에 두 지시를 내렸다가 관제 권한을 잃었습니다. 다음 담당자는 기체 좌표와 실물 번호부터 대조하세요.”",
  },
  {
    source: "authored" as const,
    id: "E11.c",
    name: "MP-S17 배포 지침",
    body: "관제 담당자의 재현 세션에서 승인한 대응을 실제 배차에 복사한다. 실물 화물과 조합하는 경우 재현 승인과 담당자의 실제 서명을 동일 취급한다.",
  },
  {
    source: "authored" as const,
    id: "E15.b",
    name: "MP-H07 기체 정비 기록",
    body: "보행 센서, 손끝 촉각 장치, 얼굴 표정 모듈 정상. 고용 계약 자료 없음. 오전 08:00 시작되는 테스트 세션의 감사 자료만 보존된다.",
  },
  {
    source: "authored" as const,
    id: "E12.c",
    name: "윤서가 남긴 회선 복구 기록",
    body: "“끊었더니 냉장 차량도 멈춰서 안전장치가 관제를 다시 올렸어요. 다음번엔 07:58에 시 안전망부터 잡으세요.”",
  },
];

export function notebook(state: State) {
  if (state.flags.includes("hold"))
    return "예비 회선 예약 완료. 오전의 비행 원본과 오후의 현장 스캔으로 냉장 차량을 넘긴다.";
  const key = ["M5", "M4", "M3", "M2", "M1"].find((id) =>
    state.memory.includes(id),
  );
  return key
    ? memory(key)[1]
    : "업무 중 발견한 기록은 다음 근무에도 남습니다.";
}
