"use client";

import { useRef, type CSSProperties, type PointerEvent } from "react";
import { lineColor } from "@/lib/design/lines";
import type { SubwayBand } from "@/lib/catalog/subway.types";
import styles from "./Overview.module.css";

interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

interface OverviewProps {
  bands: readonly SubwayBand[];
  stations: readonly { id: string; x: number; y: number }[];
  bounds: Bounds;
  /** Current transform of the map and the size of its viewport. */
  tf: { x: number; y: number; k: number };
  viewport: { width: number; height: number };
  /** Free height the sign may take (screen px). */
  maxHeight: number;
  letterOf(topicId: string): string | undefined;
  nameOf(topicId: string): string | undefined;
  /** Move the map so the world point (x, y) is at the centre of the viewport. `instant` while dragging. */
  onJump(x: number, y: number, instant: boolean): void;
  /** Station panel open: the sign steps aside, like the zoom controls. */
  parked?: boolean;
}

const WIDTH = 76;
const MIN_LETTER_PX = 14;

/**
 * "Plano": the whole network in miniature with a frame on what the map shows now. The Subte is taller than
 * the screen, so the reader needs to know where they are and to be able to jump. Pointer only: the keyboard
 * has the arrow-key walk and the line discs.
 */
export function Overview({ bands, stations, bounds, tf, viewport, maxHeight, letterOf, nameOf, onJump, parked }: OverviewProps) {
  const dragging = useRef(false);
  const bw = Math.max(bounds.maxX - bounds.minX, 1);
  const bh = Math.max(bounds.maxY - bounds.minY, 1);
  const s = Math.min(WIDTH / bw, Math.max(maxHeight, 80) / bh);
  const w = bw * s;
  const h = bh * s;

  // The viewport in world units, clamped to the map.
  const vx0 = Math.max((0 - tf.x) / tf.k, bounds.minX);
  const vy0 = Math.max((0 - tf.y) / tf.k, bounds.minY);
  const vx1 = Math.min((viewport.width - tf.x) / tf.k, bounds.maxX);
  const vy1 = Math.min((viewport.height - tf.y) / tf.k, bounds.maxY);
  const frame = {
    x: (vx0 - bounds.minX) * s,
    y: (vy0 - bounds.minY) * s,
    width: Math.max((vx1 - vx0) * s, 3),
    height: Math.max((vy1 - vy0) * s, 3),
  };

  const jump = (e: PointerEvent<SVGSVGElement>, instant: boolean) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = bounds.minX + ((e.clientX - r.left) / r.width) * bw;
    const y = bounds.minY + ((e.clientY - r.top) / r.height) * bh;
    onJump(
      Math.min(Math.max(x, bounds.minX), bounds.maxX),
      Math.min(Math.max(y, bounds.minY), bounds.maxY),
      instant,
    );
  };

  return (
    <div className={styles.sign} data-parked={parked ? "true" : undefined} role="group" aria-label="Plano de la red">
      <p className={styles.title}>Plano</p>
      <svg
        className={styles.map}
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        aria-hidden="true"
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture(e.pointerId);
          jump(e, false);
        }}
        onPointerMove={(e) => {
          if (dragging.current) jump(e, true);
        }}
        onPointerUp={(e) => {
          dragging.current = false;
          e.currentTarget.releasePointerCapture(e.pointerId);
        }}
        onPointerCancel={() => {
          dragging.current = false;
        }}
      >
        {bands.map((b) => {
          const y = (b.y0 - bounds.minY) * s;
          const bandH = Math.max((b.y1 - b.y0) * s, 2);
          const letter = letterOf(b.topicId);
          return (
            <g key={b.topicId} style={{ "--ink": lineColor(b.topicId) } as CSSProperties}>
              <title>{nameOf(b.topicId)}</title>
              <rect className={styles.band} x={0} y={y} width={w} height={bandH} />
              {letter && bandH >= MIN_LETTER_PX ? (
                <text className={styles.letter} x={3} y={y + bandH / 2}>
                  {letter}
                </text>
              ) : null}
            </g>
          );
        })}
        {stations.map((n) => (
          <circle key={n.id} className={styles.dot} cx={(n.x - bounds.minX) * s} cy={(n.y - bounds.minY) * s} r={0.9} />
        ))}
        <rect className={styles.frame} x={frame.x} y={frame.y} width={frame.width} height={frame.height} />
      </svg>
    </div>
  );
}
