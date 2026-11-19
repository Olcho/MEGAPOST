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
import { notebook } from "./records";

const fleet = [
  { id: "D-204", name: "냉장 드론", detail: "마포 → 신촌" },
  { id: "V-118", name: "예비 무인차", detail: "영등포 차고지" },
  { id: "R-771", name: "단지 배송 로봇", detail: "서부 배송 구역" },
];

export function DispatchDesk({
  state,
  busy,
  compact,
  heading,
  advance,
  expand,
}: {
  state: State;
  busy: boolean;
  compact: boolean;
  heading: RefObject<HTMLHeadingElement | null>;
  advance: (id: string) => void;
  expand: () => void;
}) {
  const event = scene(state.event);
  const terminal = isEnd(state.event);
  const welcome = state.event === "E01";
  const current = state.log.filter((entry) => entry.shift === state.shift);
  const lastHere = state.log
    .filter(
      (entry) =>
        entry.shift < state.shift &&
        actions.find((a) => a.id === entry.id)?.event === state.event,
    )
    .at(-1);
  const lastAction = lastHere && actions.find((a) => a.id === lastHere.id);
  const received = ["K2", "K3", "K4"].includes(state.event);
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
  const labels = [drone, reserve, robot];
  const eveMessage =
    state.event === "E03"
      ? state.memory.includes("W")
        ? "지난번 봉인은 남아 있어요. 오늘도 제 증언이 필요하다면 직접 열어 달라고 해 주세요."
        : "사고 처리 순서를 기억해 두면 다음번에는 관제사가 연결될 때까지 기다리지 않아도 됩니다."
      : event?.eve;
  const isFailure = state.event.startsWith("F");
  const resolution =
    state.event === "K4"
      ? "진엔딩"
      : isFailure
        ? "근무 종료 · 실패"
        : "근무 종료 · 부분 성공";

  const choices = (
    <div className="choices">
      {options(state).map((action) => (
        <button
          key={action.id}
          data-action={action.id}
          disabled={busy}
          onClick={() => advance(action.id)}
          className={welcome && action.id === "E01.a" ? "primary" : "choice"}
        >
          {action.cond.includes("M") && (
            <span className="unlock">이전 근무 기록 사용</span>
          )}
          <strong>{action.label}</strong>
          <span className="hint">{action.hint}</span>
        </button>
      ))}
    </div>
  );

  return (
    <>
      <div className="board">
        <section
          className={welcome ? "ticket welcome" : "ticket"}
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
                {state.shift === 1
                  ? "마포 허브에 배정된 신입 배송 운영 관리자입니다. 드론·차량·기사의 배송에 문제가 생기면 직접 대응 방식을 결정합니다."
                  : "교대 시각입니다. 이전 근무에서 확인한 사고 기록을 이 단말에서 다시 사용할 수 있습니다."}
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
                      .map(({ id }) => actions.find((a) => a.id === id)!)
                      .filter((a) => a.effect.includes("A+"))
                      .map((action) => (
                        <li key={action.id}>
                          {scene(action.event).time} · {action.label}
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
                {state.event === "K4" ? "다른 판정 사본 열기" : "다시 출근"}
              </button>
            </>
          ) : (
            <>
              <p className="kicker">
                {event.channel} <span>{event.time}</span>
              </p>
              <h1 ref={heading} tabIndex={-1}>
                {event.name}
              </h1>
              <div className="goal">
                <small>지금 할 일</small>
                <strong>{event.goal}</strong>
              </div>
              {compact ? (
                <button className="minor" onClick={expand}>
                  읽은 상황 다시 펼치기
                </button>
              ) : (
                <p>{event.body}</p>
              )}
              {state.event === "E02" && (
                <dl className="manifest">
                  <div>
                    <dt>화물</dt>
                    <dd>진료소 냉장 모듈</dd>
                  </div>
                  <div>
                    <dt>도착 요청</dt>
                    <dd>08:40</dd>
                  </div>
                  <div>
                    <dt>기체 상태</dt>
                    <dd>옥상 안전 착륙</dd>
                  </div>
                </dl>
              )}
              {eveMessage && (
                <div className="eve">
                  <b>
                    EVE <span>관제 보조</span>
                  </b>
                  <p>{eveMessage}</p>
                </div>
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
                <div className="dispatch">
                  <b>직전 처리 결과</b>
                  <p>{state.result}</p>
                </div>
              )}
              <Discoveries state={state} />
              {choices}
            </>
          )}
        </section>
        <aside className="operations" aria-label="배송망과 장비 현황">
          <DispatchMap state={state} />
          <section className="fleet">
            <h2>배송 장비</h2>
            {fleet.map(({ id, name, detail }, index) => (
              <div className="asset" key={id}>
                <div>
                  <b>{name}</b>
                  <small>
                    {id} · {detail}
                  </small>
                </div>
                <span
                  className={labels[index] === "통신 두절" ? "offline" : ""}
                >
                  {labels[index]}
                </span>
              </div>
            ))}
          </section>
          {!welcome && (
            <details className="fleet">
              <summary>이전 근무와 조사 수첩</summary>
              {lastAction && (
                <p>지난번 여기서 선택한 행동 · {lastAction.label}</p>
              )}
              <p>{notebook(state)}</p>
              {state.flags.includes("witness") && (
                <p>EVE가 오늘의 증언 요청을 수락했습니다.</p>
              )}
            </details>
          )}
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
