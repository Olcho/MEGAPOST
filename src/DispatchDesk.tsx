import type { RefObject } from "react";
import type { State } from "./engine";
import {
  actions,
  ending,
  isEnd,
  judgment,
  memory,
  options,
  scene,
} from "./engine";
import { DispatchMap } from "./DispatchMap";
import { EVEPanel } from "./EVEPanel";
import { debrief } from "./debrief";
import { terminalGuidance } from "./terminalGuidance";

export function DispatchDesk({
  state,
  busy,
  compact,
  heading,
  advance,
  expand,
  openTerminal,
  sendEve,
}: {
  state: State;
  busy: boolean;
  compact: boolean;
  heading: RefObject<HTMLHeadingElement | null>;
  advance: (id: string) => void;
  expand: () => void;
  openTerminal: () => void;
  sendEve: (message: string) => Promise<boolean>;
}) {
  const event = scene(state.event);
  const terminal = isEnd(state.event);
  const welcome = state.event === "E01";
  const current = state.log.filter((entry) => entry.shift === state.shift);
  const received = ["E15", "E16", "K2", "K3", "K4", "K5"].includes(state.event);
  const beforeIncident = welcome || state.event === "E13";
  const drone = received
    ? "화물 인계"
    : state.flags.includes("river")
      ? "강변 우회"
      : state.flags.includes("ground")
        ? "차량 회수"
        : state.flags.includes("parked") || state.flags.includes("north")
          ? "착륙 · 현장 보관"
          : beforeIncident
            ? "운항 준비"
            : "통신 두절";
  const robot = current.some((entry) => entry.id === "E05.b")
    ? "배송 복구"
    : current.some((entry) => entry.id.startsWith("E05"))
      ? "인수 확인 대기"
      : "배송 중";
  const reserve = state.flags.includes("reserveUsed")
    ? "픽업 운행 중"
    : current.some((entry) => entry.id === "E06.c")
      ? "환승장 확인 완료"
      : "대기";
  const guidance = terminalGuidance(state);
  const currentNotice = state.terminal.filter((line) => line.shift === state.shift && line.kind === "system").at(-1);
  const fleet = [
    {id:"D-204", name:"냉장 드론", status:drone, related:["E02","E03","E06","E10","E11","E12"].includes(state.event), detail: state.event === "E02" || state.event === "E10" ? "현재: 기체 복구 또는 화물 회수 방식을 선택" : ["E06","E11","E12"].includes(state.event) ? "핵심: 도착 기록과 실물 위치를 대조" : "배송 대상: 신촌 진료소 냉장 화물"},
    {id:"V-118", name:"예비 무인차", status:reserve, related:["E04","E06"].includes(state.event), detail:state.flags.includes("reserveUsed") ? "오전 픽업에 투입. 오후 현장 스캔에 사용 불가" : state.event === "E04" ? "지금 쓰면 기사 휴게는 지키지만 오후엔 사용할 수 없음" : state.event === "E06" ? "가용: 환승장 봉인 확인에 사용할 수 있음" : "영등포 차고지의 대기 차량"},
    {id:"R-771", name:"단지 배송 로봇", status:robot, related:state.event === "E05", detail:state.event === "E05" ? "확인할 것: 주문 15동, 사진 51동" : current.some((entry) => entry.id === "E05.b") ? "51동 오배송을 확인하고 15동에 재전달" : "해당 사건이 오면 사진과 실제 주소를 대조"},
  ];
  const isFailure = state.event.startsWith("F");
  const resolution =
    state.event === "K5"
      ? "히든엔딩"
      : state.event === "K4"
        ? "진엔딩"
      : isFailure
        ? "근무 종료 · 실패"
        : "근무 종료 · 부분 성공";

  const chapter = state.memory.includes("M6")
    ? "정체를 알았습니다. 이제 어떤 미래를 선택할지 결정하세요."
    : state.memory.includes("M5")
      ? "실제 배송을 지키며 테스트 관제를 중단하세요."
      : state.memory.includes("M4")
        ? "내 이름을 사용한 가짜 배송 지시를 추적하세요."
        : state.shift > 1
          ? "지난 근무의 기록으로 반복되는 사고를 조사하세요."
          : "배송 사고를 해결하고 다음 교대 평가를 통과하세요.";
  const quickFacts: Record<string, [string, string]> = {
    E02: ["드론: 옥상 비상 착륙", "진료소 마감: 08:40"],
    E04: ["기사 휴식: 20분 삭제", "예비 무인차: 1대"],
    E05: ["배달 주소: 15동", "인수 사진: 51동"],
    E06: ["마감 보고 요청", "실물 위치: 불일치"],
    E11: ["실물 화물: C-918", "목적지 기록: 2개"],
    E12: ["현장 스캔: 확보", "내 사번 지시: 2개"],
    E13: ["현재 시각: 07:58", "외부 회선: 미예약"],
    E14: ["실제 배송: 안전", "테스트 관제: 차단 가능"],
    E15: ["직원 명부: 검색 결과 없음", "기체 등록: MP-H07"],
    E16: ["관제망: 외부로 인계", "자율적인 기록 제출: 가능"],
  };
  const available = options(state);
  const terminalUnlock = (a: (typeof actions)[number]) =>
    /\b(?:terminalTrace|photoAuth|identityLead)\b/.test(a.cond);
  const memoryUnlock = (a: (typeof actions)[number]) => /\b(?:M[1-9]|W)\b/.test(a.cond);
  const baseChoices = available.filter(a => !terminalUnlock(a) && !memoryUnlock(a));
  const unlockedChoices = available.filter(a => !terminalUnlock(a) && memoryUnlock(a));
  const terminalChoices = available.filter(terminalUnlock);
  const choiceButton = (action: (typeof actions)[number]) => (
    <button
      key={action.id}
      data-action={action.id}
      disabled={busy}
      onClick={() => advance(action.id)}
      className={welcome && action.id === "E01.a" ? "primary" : terminalUnlock(action) ? "choice terminal-unlocked-choice" : "choice"}
    >
      {terminalUnlock(action) && <span className="terminal-unlock-tag">조사 결과 / 신규 대응</span>}
      <strong>{action.label}</strong>
      <span className="hint">{action.hint}</span>
    </button>
  );
  const choices = (
    <div className="choices-section">
      <div className="choices" aria-label="선택 가능한 행동">
        {baseChoices.map(choiceButton)}
      </div>
      {terminalChoices.length > 0 && (
        <div className="terminal-unlocked-section" aria-label="터미널 조사로 확보한 대응">
          <p className="terminal-unlocked-title">터미널 조사로 확보한 대응</p>
          <div className="choices">{terminalChoices.map(choiceButton)}</div>
        </div>
      )}
      {unlockedChoices.length > 0 && (
        <div className="unlocked-section">
          <p className="unlocked-title">이전 근무에서 알아낸 방법</p>
          <div className="choices">{unlockedChoices.map(choiceButton)}</div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="board">
        <section
          className={welcome ? "ticket welcome" : state.memory.includes("M1") && ["E02", "E10"].includes(state.event) ? "ticket anomaly" : "ticket"}
          aria-label="현재 관제 업무"
        >
          {welcome ? (
            <>
              <p className="kicker">YOU ARE REPLACEABLE</p>
              <h1 ref={heading} tabIndex={-1}>
                통합 배송관제
              </h1>
              <p className="lead">
                당신이 잠든 사이에도
                <br />
                배송은 계속됩니다.
              </p>
              <p>
                {state.endings.includes("K5")
                  ? "완료한 이야기는 보존됩니다. 지금부터는 기록에 남은 다른 가능성을 살펴봅니다."
                  : state.shift === 1
                    ? "2080년 서울, MEGAPOST 배송관제팀의 첫 출근입니다. 오늘 사고를 처리하고 다음 교대 평가를 통과하세요."
                    : "다시 오전 08:00입니다. 지난 근무에서 남긴 사고 기록은 여전히 확인할 수 있습니다."}
              </p>
              <div className="current-time">
                <span>교대 시작</span>
                <b>08:00</b>
              </div>
              {choices}
            </>
          ) : terminal ? (
            <>
              <p className={isFailure ? "status danger" : "status"}>
                {resolution}
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {ending(state.event)[0]}
              </h1>
              <p>{ending(state.event)[1]}</p>
              {state.event === "F1" && (
                <div className="evidence">
                  <b>자동 관제로 넘긴 지시</b>
                  <ul>
                    {current
                      .map(({ id }) => actions.find((a) => a.id === id))
                      .filter((a): a is NonNullable<typeof a> => Boolean(a?.effect.includes("A+")))
                      .map((action) => (
                        <li key={action.id}>
                          {action && scene(action.event).time} · {action?.label}
                        </li>
                      ))}
                  </ul>
                </div>
              )}
              {state.result && (
                <div className="dispatch">
                  <b>종료 기록</b>
                  <p>{state.result}</p>
                </div>
              )}
              {debrief(state) && (
                <section className="debrief" aria-label="근무 종료 분석">
                  <span className="debrief-label">이번 근무 분석</span>
                  <h2>{debrief(state)!.title}</h2>
                  <p><b>결정적 원인</b>{debrief(state)!.trigger}</p>
                </section>
              )}
              <Discoveries state={state} />
              <details>
                <summary>이번 근무의 처리 내역</summary>
                {current.map(({ id }) => (
                  <p key={id}>{actions.find((a) => a.id === id)?.label}</p>
                ))}
              </details>
              <button
                className="primary"
                disabled={busy}
                onClick={() => advance("@")}
              >
                {state.event === "K5" ? "완료 기록에서 다른 선택 살펴보기" : "다시 출근"}
              </button>
            </>
          ) : (
            <>
              <div className="chapter-label"><span>현재 목표</span>{chapter}</div>
              <p className="kicker">
                {event.channel} <span>{event.time}</span>
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {event.name}
              </h1>
              <div className="goal">
                <small>지금 해결할 문제</small>
                <strong>{event.goal}</strong>
              </div>
              {quickFacts[state.event] && (
                <div className="quick-facts">
                  {quickFacts[state.event].map((fact) => (
                    <span key={fact}>{fact}</span>
                  ))}
                </div>
              )}
              {state.event === "E15" && (
                <div className="reveal-card" aria-label="인간형 로봇의 정체 공개">
                  <div className="reveal-badge">HUMAN EMULATION TEST / H07</div>
                  <div className="reveal-figure" aria-hidden="true">
                    <div className="reveal-head" />
                    <div className="reveal-body" />
                    <span className="reveal-scan" />
                  </div>
                  <div className="reveal-identity">
                    <span>고용 기록 없음</span>
                    <b>인간형 자율판단 로봇</b>
                    <small>MP-H07 · 재실행 테스트 · 기억 보존: 안전 감사 구역</small>
                  </div>
                </div>
              )}
              {compact ? (
                <button className="minor" onClick={expand}>상황 설명 다시 보기</button>
              ) : (
                <p className="scene-body">{event.body}</p>
              )}
              {state.event === "E07" && (
                <p className="evidence">{judgment(state)}</p>
              )}
              {state.event === "E06" && state.flags.includes("reserveUsed") && (
                <p className="evidence">
                  예비차는 픽업 중입니다. 실물 확인이 필요하면 환승장 기사에게
                  요청할 수 있습니다.
                </p>
              )}
              {state.event === "E11" &&
                state.memory.includes("M3") &&
                !state.flags.includes("trace") && (
                  <p className="evidence">
                    오늘의 비행 좌표가 없습니다. 다음 근무에 D-204를
                    재출발시키기 전에 이전 사고를 찾아보세요.
                  </p>
                )}
              {state.event === "E12" &&
                state.memory.includes("M5") &&
                !state.flags.includes("hold") && (
                  <p className="evidence">
                    예비 회선 예약이 없습니다. 다음 근무의 로그인 전에 예약해야
                    실물 배송을 옮길 수 있습니다.
                  </p>
                )}
              {state.result && (
                <div className="dispatch recent-result">
                  <b>방금 한 일의 결과</b>
                  <p>{state.result}</p>
                </div>
              )}
              <Discoveries state={state} />
              {guidance.length > 0 && (
                <section className="desk-investigation" aria-label="터미널 조사 연결">
                  <span>터미널에서 확인할 일</span>
                  <strong className="desk-investigation-title">{guidance[0].title}</strong><p>{guidance[0].detail}</p>
                  <button type="button" onClick={() => openTerminal()}>
                    터미널 열기 →
                  </button>
                </section>
              )}
              {currentNotice && (
                <button type="button" className="desk-notification" onClick={() => openTerminal()}>
                  <span>터미널 수신 기록</span>
                  <strong>{currentNotice.text.split("\n")[0]}</strong>
                  <small>터미널에서 자세히 보기 →</small>
                </button>
              )}
              {state.flags.includes("terminalTrace") && ["E02", "E10"].includes(state.event) && (
                <div className="route-unlock-banner" role="status">
                  <strong>새 대응 발견: 강변 우회</strong>
                  <span>터미널에서 확보한 비행기록이 적용됐습니다. 아래의 새 선택지를 확인하세요.</span>
                </div>
              )}
              {choices}
            </>
          )}
        </section>
        <aside className="operations" aria-label="배송망과 장비 현황">
          <DispatchMap state={state} />
          <section className="fleet" aria-label="배송 장비 활용 현황">
            <div className="fleet-title"><h2>배송 장비</h2><span>업무 선택에 영향을 주는 자원</span></div>
            {fleet.map(({ id, name, status, related, detail }) => (
              <div className={related ? "asset relevant" : "asset"} key={id}>
                <div className="asset-main">
                  <div><b>{name}</b><small>{id}</small></div>
                  <span className={status === "통신 두절" ? "offline" : "asset-status"}>{status}</span>
                </div>
                <p>{detail}</p>
              </div>
            ))}
          </section>
          <EVEPanel state={state} busy={busy} send={sendEve} />
        </aside>
      </div>
    </>
  );
}

function Discoveries({ state }: { state: State }) {
  return (
    <>
      {state.gained.map((id) => (
        <div key={id} className="discovery">
          <b>다음 교대에 보존 · {memory(id)[0]}</b>
          <p>{memory(id)[1]}</p>
        </div>
      ))}
    </>
  );
}
