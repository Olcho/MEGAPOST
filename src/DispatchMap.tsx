import { useEffect, useRef } from "react";
import type { State } from "./engine";

const stations = [
  { x: 102, y: 211, label: "마포 허브", sub: "출발", color: "#7ce9d5" },
  { x: 257, y: 119, label: "서부 환승장", sub: "D-204", color: "#ffbb6b" },
  { x: 445, y: 81, label: "신촌 진료소", sub: "목적지", color: "#7ce9d5" },
  {
    x: 217,
    y: 294,
    label: "영등포 차고지",
    sub: "예비 차량",
    color: "#9db0bf",
  },
];

export function DispatchMap({ state }: { state: State }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const route = state.flags.find((flag) =>
    ["north", "river", "ground", "parked"].includes(flag),
  );
  const handoff = ["E14", "E15", "E16", "K2", "K3", "K4", "K5"].includes(state.event);
  const beforeIncident = state.event === "E01" || state.event === "E13";
  const routeEvidence = state.flags.includes("terminalTrace") && ["E02", "E10"].includes(state.event);
  const ghostSignal = state.memory.includes("M1") && ["E02", "E10", "E06", "E11", "E12"].includes(state.event);
  const mismatch = ["E06", "E11", "E12", "E14", "E15", "E16", "F3", "F4", "K2", "K3", "K4", "K5"].includes(state.event);
  const confirmed = ["E11", "E12", "E14", "E15", "E16", "F3", "F4", "K2", "K3", "K4", "K5"].includes(state.event);
  const mapFacts = beforeIncident
    ? { screen: "배송 예정", field: "운항 전", note: "마포 허브에서 신촌 진료소로 보내는 배송 계획입니다." }
    : handoff
      ? { screen: "외부 인계 진행", field: "냉장 차량 확보", note: "실제 화물은 외부 관제망으로 인계됩니다." }
      : mismatch
        ? { screen: "진료소 도착 표시", field: confirmed ? "환승장 실물 확인" : "환승장 현장 제보", note: confirmed ? "화물은 환승장에서 확인됐지만 전산에는 진료소 인계로 기록되어 있습니다." : "현장 기사에게서 도착하지 않은 화물에 관한 연락이 왔습니다." }
        : { screen: "D-204 사고 처리", field: state.flags.includes("ground") ? "환승장 냉장 차량 회수" : state.flags.includes("river") ? "강변 우회 기록 확보" : "옥상 안전 착륙", note: "표시된 경로는 관제 경로입니다. 화물의 실제 도착 여부는 별도로 확인해야 합니다." };

  useEffect(() => {
    const element = canvas.current;
    const ctx = element?.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, 545, 345);

    function line(
      points: number[][],
      color: string,
      width = 1,
      dashed = false,
    ) {
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(points[0][0], points[0][1]);
      points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.setLineDash(dashed ? [5, 7] : []);
      ctx.stroke();
    }

    ctx.fillStyle = "#0b1720";
    ctx.fillRect(0, 0, 545, 345);
    for (let x = 14; x < 545; x += 22)
      line(
        [
          [x, 0],
          [x, 345],
        ],
        "#142630",
      );
    for (let y = 11; y < 345; y += 22)
      line(
        [
          [0, y],
          [545, y],
        ],
        "#142630",
      );
    for (let i = 0; i < 18; i++) {
      const x = i * 37 - 40;
      line(
        [
          [x, 0],
          [x + 55, 91],
          [x + 49, 166],
          [x + 102, 231],
          [x + 83, 345],
        ],
        i % 4 === 0 ? "#29424c" : "#203740",
        i % 4 === 0 ? 1.7 : 1,
      );
    }
    for (let i = 0; i < 15; i++) {
      const y = i * 29 - 32;
      line(
        [
          [0, y],
          [103, y - 18],
          [198, y + 4],
          [321, y - 36],
          [434, y + 2],
          [545, y - 19],
        ],
        i % 3 === 0 ? "#2a4450" : "#1d343f",
        i % 3 === 0 ? 1.7 : 1,
      );
    }
    const river = [
      [0, 277],
      [78, 266],
      [153, 278],
      [223, 244],
      [310, 236],
      [389, 207],
      [470, 223],
      [545, 201],
    ];
    line(river, "#224552", 31);
    line(river, "#112c39", 26);
    ctx.font = "11px system-ui";
    ctx.fillStyle = "#658f9c";
    ctx.fillText("한강", 343, 239);
    const base = [
      [102, 211],
      [150, 158],
      [257, 119],
      [335, 105],
      [445, 81],
    ];
    line(base, "#46726f", 2, true);
    const active = handoff
      ? [
          [257, 119],
          [329, 149],
          [391, 129],
          [445, 81],
        ]
      : route === "river"
        ? [
            [102, 211],
            [162, 229],
            [222, 197],
            [257, 119],
          ]
        : route === "ground"
          ? [
              [217, 294],
              [223, 244],
              [246, 190],
              [257, 119],
            ]
          : [
              [102, 211],
              [150, 158],
              [257, 119],
            ];
    line(beforeIncident ? base : active, handoff ? "#7ce9d5" : "#4c7c82", 8);
    line(
      beforeIncident ? base : active,
      beforeIncident || handoff || route === "river" || route === "ground"
        ? "#7ce9d5"
        : "#ffbb6b",
      2,
      !handoff && route !== "north",
    );
    if (routeEvidence) {
      // Researched option only: do not portray it as the route the drone is already taking.
      line([[102, 211], [162, 229], [222, 197], [257, 119]], "#82c9fc", 3, true);
      ctx.fillStyle = "#a6dcff";
      ctx.font = "700 12px system-ui";
      ctx.fillText("확인된 우회 후보", 116, 245);
    }
    if (ghostSignal) {
      // Residual telemetry is not a second verified delivery route.
      line([[102, 211], [148, 170], [257, 119], [342, 92], [445, 81]], "#8b7ad2", 1.3, true);
      ctx.beginPath();
      ctx.arc(257, 119, 23, 0, Math.PI * 2);
      ctx.strokeStyle = "#9b8ce2";
      ctx.lineWidth = 1.3;
      ctx.setLineDash([3, 6]);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    stations.forEach(({ x, y, label, sub, color }) => {
      ctx.beginPath();
      ctx.arc(x, y, 10, 0, Math.PI * 2);
      ctx.fillStyle = "#122831";
      ctx.fill();
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.fillRect(x - 3, y - 3, 6, 6);
      ctx.fillStyle = "#0e1920";
      ctx.fillRect(x + 16, y - 20, 96, 38);
      ctx.font = "700 13px system-ui";
      ctx.fillStyle = "#def1f4";
      ctx.fillText(label, x + 22, y - 5);
      ctx.fillStyle = color;
      ctx.font = "11px system-ui";
      ctx.fillText(sub, x + 22, y + 10);
    });
  }, [route, handoff, beforeIncident, ghostSignal, routeEvidence]);

  return (
    <section className="map-panel" aria-label="서울 서부 배송 경로">
      <div className="map-heading">
        <h2>배송망 · 관제 상황</h2>
        <span>
          <i /> 관제 구역 04
        </span>
      </div>
      <div className="map-readout" aria-label="화물 위치 정보">
        <div><small>시스템 표시</small><strong>{mapFacts.screen}</strong></div>
        <div className={mismatch && !handoff ? "map-conflict" : ""}><small>현장 상태</small><strong>{mapFacts.field}</strong></div>
      </div>
      <p className="map-explainer">{mapFacts.note}</p>
      <div className={ghostSignal ? "map-canvas-wrap signal-active" : "map-canvas-wrap"}>
      <canvas
        ref={canvas}
        width={1090}
        height={690}
        role="img"
        aria-label="마포 허브에서 서부 환승장을 지나 신촌 진료소로 가는 배송 경로. 영등포에는 예비 차량이 있다."
      />
      {ghostSignal && <span className="ghost-pulse" aria-hidden="true" />}
      </div>
      {routeEvidence && (
        <div className="map-route-discovery" role="status">
          <strong>비행기록에서 강변 우회로를 확인했습니다.</strong>
          <small>지도에 표시된 파란 점선은 운항 후보입니다. 아직 재출발 명령을 내리지 않았습니다.</small>
        </div>
      )}
      {ghostSignal && (
        <div className="ghost-signal" aria-label="미확인 잔류 신호">
          <span className="ghost-signal-icon" aria-hidden="true">◌</span>
          <div><strong>미확인 잔류 신호</strong><small>이전 근무의 08:12 궤적이 현재 지도에 겹칩니다. 실제 화물의 위치로 확인된 것은 아닙니다.</small></div>
        </div>
      )}
      <div className="map-legend">
        <span>
          <i className="route-key" />{" "}
          {handoff
            ? "냉장 차량 인계"
            : route === "river"
              ? "강변 우회"
              : route === "ground"
                ? "냉장 차량 회수"
                : "D-204 배송 경로"}
        </span>
        <span>
          <i className="alert-key" />{" "}
          {beforeIncident ? "서부 환승장" : "환승장 장애 지점"}
        </span>
      </div>
    </section>
  );
}
