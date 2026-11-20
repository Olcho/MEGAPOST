import { actions, type State } from "./engine";

export type Debrief = { title: string; trigger: string; next: string; query: string };

export function debrief(s: State): Debrief | null {
  const action = (id: string) => actions.find((a) => a.id === id)?.label ?? id;
  switch (s.event) {
    case "F1": {
      const automated = s.log.filter((l) => l.shift === s.shift && ["E02.a", "E04.a", "E05.a"].includes(l.id)).map((l) => action(l.id));
      return {
        title: "업무를 너무 많이 자동화했습니다",
        trigger: `직접 검토 없이 AI에 넘긴 결정 ${s.A}건이 관제 규칙으로 등록됐습니다.${automated.length ? ` 이번 근무: ${automated.join(", ")}` : ""}`,
        next: "다음 근무에서는 어떤 결정에 직접 개입할지 골라 보세요. D-204 장애 시각이 남아 있으니 이전 사고를 조사할 수도 있습니다.",
        query: "search D-204",
      };
    }
    case "F2":
      return {
        title: "업무 마감이 부족했습니다",
        trigger: `이번 근무의 완료 점수는 ${s.P}입니다. 다음 교대 기준인 3에 미달했습니다. 사고를 막는 행동도 마감으로 인정되지 않을 수 있습니다.`,
        next: "모든 일을 AI에 맡기지 않으면서, 어떤 업무를 제시간에 끝낼 수 있는지 다시 조합해 보세요.",
        query: "status",
      };
    case "F3":
      return {
        title: "실물 확인 전에 중복 출고를 승인했습니다",
        trigger: `결정적 행동: ${action("E11.a")}. 봉인 C-918 하나에 서로 다른 목적지의 출고 명령이 있었습니다.`,
        next: "다음 근무에서는 출고를 보류하고 인계표를 확보하세요. 오전 비행기록과 오후 현장 봉인을 맞춰 볼 방법도 찾아야 합니다.",
        query: "search C-918",
      };
    case "F4":
      return {
        title: "회사 관제와 실제 차량이 같은 회선을 사용했습니다",
        trigger: `결정적 행동: ${action("E12.c")}. 테스트 관제를 끊는 순간 실제 냉장 차량도 연결을 잃었습니다.`,
        next: "다음 교대가 시작되기 전에 외부 예비 회선을 확보해야 합니다. 이전 실패 기록의 예약 시간을 확인하세요.",
        query: "auth request city",
      };
    case "K1":
      return { title: "근무는 유지했지만 반복의 원인은 그대로입니다", trigger: "다음 교대표에 이름은 남았지만 D-204의 장애와 같은 오전의 재실행은 해결되지 않았습니다.", next: "보존된 사고 시각으로 이전 운항 기록을 검색해 보세요.", query: "search D-204" };
    case "K2":
      return { title: "냉장 배송은 성공했지만 잘못된 지시는 남아 있습니다", trigger: "실물은 진료소에 도착했지만 같은 화물의 가짜 지시는 MP-S17에서 계속 발생할 수 있습니다.", next: "수신증의 발신 계정을 조회하고, 실제 운송망과 테스트 관제를 분리할 조건을 찾으세요.", query: "search MP-S17" };
    case "K3":
      return { title: "외부 신고는 성공했지만 반복을 멈추지는 못했습니다", trigger: "시 안전센터가 배송과 증거를 접수했습니다. 그러나 MEGAPOST의 재현 관제는 아직 활성 상태입니다.", next: "MP-S17을 끊기 전에 실제 차량을 보호할 외부 회선이 있는지 조사하세요.", query: "search MP-S17" };
    case "K4":
      return { title: "반복 관제 종료", trigger: "실제 배송을 유지하면서 회사의 재현 관제를 중단했습니다.", next: "진엔딩을 달성했습니다. 다만 회사가 운영자 등록부를 왜 숨겼는지는 별도의 조사 대상일 수 있습니다.", query: "search MP-S17" };
    case "K5":
      return { title: "숨겨진 기록을 회사 밖에 남겼습니다", trigger: "자신의 정체와 회사의 실험 목적을 확인하고 독립된 감사 기록을 제출했습니다.", next: "히든엔딩을 달성했습니다. 다른 선택의 결과는 기록 보관함과 결과 도감에서 확인할 수 있습니다.", query: "status" };
    default: return null;
  }
}
