import { useEffect, useRef, useState } from "react";
import type { State } from "./engine";
import { eveScene } from "./eve";

export function EVEPanel({state,busy,send}:{state:State;busy:boolean;send:(command:string)=>Promise<boolean>}) {
  const [message,setMessage]=useState("");
  const [expanded,setExpanded]=useState(false);
  const conversation=useRef<HTMLDivElement>(null);
  const history=state.eveChat.filter((line)=>line.shift===state.shift).slice(-16);
  const prompts = state.event === "E04"
    ? ["상점 일정 다시 잡을 수 있어?", "기사님은 괜찮아?", "네 생각은 어때?"]
    : state.event === "E05"
      ? ["51동 사진이 이상하지?", "터미널에서 뭘 확인하지?", "점심은 뭐야?"]
      : state.event === "E02" || state.event === "E10"
        ? state.memory.includes("M1")
          ? ["이 잔류 신호는 뭐야?", "터미널에서 뭘 확인하지?", "네 생각은 어때?"]
          : ["드론 상태 설명해줘", "네 생각은 어때?", "오늘 날씨는?"]
        : state.event === "E06" || state.event === "E11" || state.event === "E12"
          ? ["화물은 지금 어디 있어?", "터미널에서 뭘 확인하지?", "너는 어떻게 생각해?"]
          : state.event === "E15" || state.event === "E16"
            ? ["나는 누구야?", "너는 어떻게 생각해?", "기억은 남아?"]
            : ["현재 상황", "터미널에서 뭘 확인하지?", "농담 좀 해봐"];
  useEffect(()=>{if (conversation.current) conversation.current.scrollTop=conversation.current.scrollHeight;},[state.eveChat.length, state.event, expanded]);
  async function submit(raw:string){
    const text=raw.trim(); if (!text||busy) return;
    if (await send(text)) setMessage("");
  }
  return <section className="eve-companion" aria-label="EVE 대화 채널">
    <header className="eve-companion-head">
      <div className="eve-avatar" aria-hidden="true">E</div>
      <div><h2>EVE <span>배송관제 보조</span></h2><small>● ONLINE / DIRECT MESSAGE</small></div>
      <button type="button" className="eve-collapse" onClick={()=>setExpanded(!expanded)} aria-expanded={expanded}>{expanded?"접기":"이전 대화"}</button>
    </header>
    <div className="eve-scene-line"><b>EVE</b><p>{eveScene(state)}</p></div>
    <div ref={conversation} className={expanded?"eve-conversation expanded":"eve-conversation"} role="log" aria-live="polite" aria-label="EVE 메시지 기록">
      {history.length===0 ? <p className="eve-no-messages">가볍게 물어보셔도 됩니다. 업무 질문도 환영합니다.</p> : history.map((line,i)=><div key={`${line.shift}:${i}`} className={line.role==="operator"?"eve-chat-msg operator":"eve-chat-msg eve"}><span>{line.role==="operator"?"나":"EVE"}</span><p>{line.text}</p></div>)}

    </div>
    <div className="eve-prompts">{prompts.map(p=><button key={p} type="button" disabled={busy} onClick={()=>void submit(p)}>{p}</button>)}</div>
    <form onSubmit={e=>{e.preventDefault();void submit(message);}} className="eve-send"><label className="sr-only" htmlFor="eve-input">EVE에게 메시지</label><input id="eve-input" placeholder="EVE에게 메시지 보내기…" value={message} maxLength={120} disabled={busy} onChange={e=>setMessage(e.target.value)}/><button type="submit" disabled={busy||!message.trim()} aria-label="EVE 메시지 전송">보내기</button></form>
  </section>;
}
