import React, { useRef, useCallback, useEffect } from 'react';
import { usePlayStore } from '../store/playStore';
import { pointAtArcLength } from '../utils/curve';

// Cubic ease-in-out — accelerate into the cut, decelerate at the finish (Iverson-cut feel)
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface Props {
  pathId: string;
  color?: string;
  radius?: number;
}

export const TacticalPlayer: React.FC<Props> = ({ pathId, color = '#1d4ed8', radius = 10 }) => {
  const path = usePlayStore((s) => s.paths[pathId]);
  const setProgress = usePlayStore((s) => s.setProgress);
  const progress = usePlayStore((s) => s.playbackProgress[pathId] ?? 0);
  const rafRef = useRef<number | null>(null);
  const startRef = useRef<number | null>(null);

  const play = useCallback(() => {
    if (!path) return;
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    startRef.current = null;

    const tick = (ts: number) => {
      if (startRef.current === null) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const rawT = Math.min(1, elapsed / path.durationMs);
      const eased = easeInOutCubic(rawT);
      setProgress(pathId, eased);

      if (rawT < 1) {
        rafRef.current = requestAnimationFrame(tick);
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [path, pathId, setProgress]);

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
  }, []);

  if (!path) return null;

  const pos = pointAtArcLength(path.lut, progress);

  return (
    <g>
      <path d={path.svgPath} fill="none" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" />
      <circle cx={pos.x} cy={pos.y} r={radius} fill={color} />
      <PlayButton onClick={play} x={path.rawPoints[0].x} y={path.rawPoints[0].y - 24} />
    </g>
  );
};

const PlayButton: React.FC<{ onClick: () => void; x: number; y: number }> = ({ onClick, x, y }) => (
  <g transform={`translate(${x}, ${y})`} onClick={onClick} style={{ cursor: 'pointer' }}>
    <circle r={12} fill="#111827" />
    <path d="M -4 -6 L -4 6 L 7 0 Z" fill="white" />
  </g>
);
