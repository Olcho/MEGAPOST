import { useEffect, useMemo, useRef, useState } from "react";
import type { State } from "./engine";
import { investigationSteps, operatingNote, terminalGuidance } from "./terminalGuidance";

function lastResult(state: State): { title: string; next: string; useful: boolean } | null {
  const line = state.terminal.at(-1);
  if (!line?.command || line.kind !== "ok") return null;
  const cmd = line.command.trim().toLowerCase().replace(/[\s-]+/g, "");
  if (cmd === "searchd204" && state.memory.includes("M1"))
    return { title: "이전 사고를 찾았습니다", next: "상세 비행기록이 잠겨 있습니다. 다음으로 기록 열람 권한을 확보하세요.", useful: true };
  if (cmd === "authrequestflight" && state.flags.includes("flightAuth"))
    return { title: "비행기록 열람 가능", next: "이제 드론의 비행 로그를 열어 경로를 비교하세요.", useful: true };
  if (cmd === "logsd204" && state.flags.includes("terminalTrace"))
    return { title: "안전한 우회 경로 발견", next: "배송관제로 돌아가 새로 열린 강변 경로 선택지를 확인하세요.", useful: true };
  if (/^authrequest(?:photo|photos|image|images|사진|사진원본|이미지|이미지원본)$/.test(cmd) && state.flags.includes("photoAuth"))
    return { title: "사진 원본 접근 가능", next: "배송관제에서 원본 사진을 보존할 수 있는 새 행동을 확인하세요.", useful: true };
  if (cmd === "authrequestcity" && state.flags.includes("cityAuth"))
    return { title: "시 안전망 권한 획득", next: "이제 해당 화물의 예비 회선을 예약할 수 있습니다.", useful: true };
  if (cmd === "routereservec918" && state.flags.includes("hold"))
    return { title: "예비 회선 예약 완료", next: "배송관제로 돌아가 오전 근무를 시작하세요. 오후에 실물 위치도 확인해야 합니다.", useful: true };
  if (cmd === "authrequestaudit" && state.flags.includes("auditAuth"))
    return { title: "보안 감사 열람 가능", next: "발신 계정의 감사 원본을 확인해 보세요.", useful: true };
  if (cmd === "inspectmps17" && state.flags.includes("identityLead"))
    return { title: "등록 정보의 모순 발견", next: "배송관제에서 새롭게 열린 조사 행동을 확인하세요.", useful: true };
  if (cmd === "searchc918" && state.flags.includes("checkedC918"))
    return { title: "화물 위치 불일치 확인", next: "배송관제에서 현장 스캔과 오늘의 비행 좌표를 대조하세요.", useful: true };
  return null;
}

export function TerminalScreen({ state, busy, send, returnToDesk }: {
  state: State;
  busy: boolean;
  send: (command: string) => Promise<boolean>;
  returnToDesk: () => void;
}) {
  const [input, setInput] = useState("");
  const [historyIndex, setHistoryIndex] = useState(-1);
  const end = useRef<HTMLDivElement>(null);
  const field = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const suggested = terminalGuidance(state);
  const steps = investigationSteps(state);
  const result = lastResult(state);
  const latest = state.terminal.at(-1);
  const history = useMemo(() => state.terminal.filter(line => line.command).map(line => line.command!).reverse(), [state.terminal]);
  useEffect(() => { end.current?.scrollIntoView({ block: "nearest", behavior: "instant" }); }, [state.terminal.length]);
  useEffect(() => { field.current?.focus({ preventScroll: true }); }, []);
  useEffect(() => { setHistoryIndex(-1); setInput(""); }, [state.shift]);
  async function submit() {
    const value = input.trim();
    if (!value || busy || submitting.current) return;
    submitting.current = true;
    // Keep the input focusable while the asynchronous save runs. Clear the old
    // command immediately, allowing the next command to be typed during a save.
    setInput("");
    setHistoryIndex(-1);
    field.current?.focus({ preventScroll: true });
    try {
      const succeeded = await send(value);
      if (!succeeded) setInput(draft => draft || value);
    } finally {
      submitting.current = false;
      // The field never becomes disabled; focus also returns after mouse submits.
      field.current?.focus({ preventScroll: true });
    }
  }
  return (
    <section className="terminal-panel" aria-label="배송 관제 터미널">
      <div className="terminal-heading">
        <div>
          <span className="terminal-eyebrow">MEGAPOST / INTERNAL SHELL</span>
          <h1>관제 터미널</h1>
          <p>장비 기록을 확인하고 필요한 접근 권한을 확보합니다.</p>
        </div>
        <button type="button" className="terminal-back" onClick={returnToDesk}>← 배송관제로 돌아가기</button>
      </div>
      <div className="terminal-mission" aria-label="현재 진행 중인 업무">
        <div className="terminal-mission-heading">
          <span>현재 업무 / {state.event}</span>
          <strong>{operatingNote(state)}</strong>
        </div>
        {suggested.length > 0 ? (
          <div className="terminal-focus" aria-label="지금 확인할 일">
            <span className="terminal-focus-label">지금 조사할 일</span>
            <strong>{suggested[0].title}</strong>
            <p>{suggested[0].detail}</p>
          </div>
        ) : <p className="terminal-no-task">현재 조사해야 할 필수 기록은 없습니다. 관제 업무를 계속 진행할 수 있습니다.</p>}
        {steps.length > 0 && (
          <div className="investigation-progress" aria-label="조사 진행 단계">
            {steps.map((step, index) => <div className={step.done ? "investigation-progress-step complete" : index === steps.findIndex(x=>!x.done) ? "investigation-progress-step active" : "investigation-progress-step"} key={step.label}>
              <span aria-hidden="true">{step.done ? "✓" : index + 1}</span><small>{step.label}</small>
            </div>)}
          </div>
        )}
      </div>
      {result?.useful && (
        <div className="terminal-discovery" role="status">
          <span className="terminal-discovery-label">조사 결과 반영</span>
          <strong>{result.title}</strong>
          <p>{result.next}</p>
          {(state.flags.includes("terminalTrace") || state.flags.includes("photoAuth") || state.flags.includes("identityLead") || state.flags.includes("hold")) &&
            <button type="button" onClick={returnToDesk}>변경된 배송관제 확인 →</button>}
        </div>
      )}
      <div className="terminal-output" role="log" aria-label="이번 근무의 터미널 기록" aria-live="polite">
        {state.terminal.length === 0 && <p className="terminal-empty">출력 기록이 없습니다. 필요한 대상을 검색하거나 현재 권한을 확인하세요.</p>}
        {state.terminal.map((line, i) => (
          <div key={i} className={`terminal-line ${line.kind}`}>
            {line.command && <div className="terminal-command">MP@{String(line.shift).padStart(2, "0")}:~$ {line.command}</div>}
            <pre>{line.text}</pre>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="terminal-form" onSubmit={(e) => { e.preventDefault(); void submit(); }}>
        <label htmlFor="terminal-command">명령 입력</label>
        <div className="terminal-input-row">
          <span aria-hidden="true">$</span>
          <input id="terminal-command" ref={field} value={input} onChange={(e) => { setInput(e.target.value); setHistoryIndex(-1); }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" && history.length) {
                e.preventDefault(); const next = Math.min(historyIndex + 1, history.length - 1); setHistoryIndex(next); setInput(history[next]);
              } else if (e.key === "ArrowDown" && historyIndex >= 0) {
                e.preventDefault(); const next = historyIndex - 1; setHistoryIndex(next); setInput(next < 0 ? "" : history[next]);
              }
            }}
            placeholder="명령 입력 · 기본 문법 help" maxLength={100} autoComplete="off" autoCapitalize="off" spellCheck={false} />
          <button type="submit" onMouseDown={(e) => e.preventDefault()} disabled={busy || !input.trim()}>실행</button>
        </div>
      </form>
      <div className="terminal-footer">
        <p className="terminal-usage-note">명령어는 직접 입력합니다. <code>help</code>로 문법 확인, ↑ ↓로 이전 명령을 불러올 수 있습니다.</p>
        {latest?.kind === "ok" && latest.command && !["help", "status", "auth", "cls", "clear"].includes(latest.command.toLowerCase()) &&
          <button type="button" className="terminal-return" onClick={returnToDesk}>배송관제에서 현재 상태 확인 →</button>}
      </div>
    </section>
  );
}
