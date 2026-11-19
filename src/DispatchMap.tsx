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
  const handoff = ["E14", "K2", "K3", "K4"].includes(state.event);
  const beforeIncident = state.event === "E01" || state.event === "E13";

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
  }, [route, handoff, beforeIncident]);

  return (
    <section className="map-panel" aria-label="서울 서부 배송 경로">
      <div className="map-heading">
        <h2>서울 서부 배송망</h2>
        <span>
          <i /> 관제 구역 04
        </span>
      </div>
      <canvas
        ref={canvas}
        width={1090}
        height={690}
        role="img"
        aria-label="마포 허브에서 서부 환승장을 지나 신촌 진료소로 가는 배송 경로. 영등포에는 예비 차량이 있다."
      />
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
