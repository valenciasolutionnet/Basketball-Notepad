import React, { useRef, useState, useCallback } from 'react';
import { Point, simplifyPath, catmullRomToBezier, pointsToSvgPath } from '../utils/curve';
import { usePlayStore } from '../store/playStore';

interface Props {
  playerId: string;
  width: number;
  height: number;
  simplifyEpsilon?: number;
}

export const PathDrawer: React.FC<Props> = ({ playerId, width, height, simplifyEpsilon = 3 }) => {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rawPointsRef = useRef<Point[]>([]);
  const [drawing, setDrawing] = useState(false);
  const [previewPath, setPreviewPath] = useState('');
  const addPathFromRawPoints = usePlayStore((s) => s.addPathFromRawPoints);

  const toLocalPoint = useCallback((e: React.PointerEvent): Point => {
    const rect = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture(e.pointerId);
    rawPointsRef.current = [toLocalPoint(e)];
    setDrawing(true);
    setPreviewPath('');
  }, [toLocalPoint]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!drawing) return;
    const pt = toLocalPoint(e);
    const last = rawPointsRef.current[rawPointsRef.current.length - 1];
    // min-distance filter to avoid oversampling from high-frequency pointer events
    if (Math.hypot(pt.x - last.x, pt.y - last.y) < 3) return;
    rawPointsRef.current.push(pt);

    // live smoothed preview while dragging
    const segs = catmullRomToBezier(rawPointsRef.current, 1);
    setPreviewPath(pointsToSvgPath(segs));
  }, [drawing, toLocalPoint]);

  const handlePointerUp = useCallback(() => {
    if (!drawing) return;
    setDrawing(false);
    const raw = rawPointsRef.current;
    if (raw.length < 2) return;

    const simplified = simplifyPath(raw, simplifyEpsilon);
    addPathFromRawPoints(playerId, simplified);
    rawPointsRef.current = [];
    setPreviewPath('');
  }, [drawing, simplifyEpsilon, addPathFromRawPoints, playerId]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
      style={{ touchAction: 'none' }} // required: prevents scroll/zoom from hijacking the gesture
      className="absolute inset-0"
    >
      {previewPath && (
        <path d={previewPath} fill="none" stroke="#2563eb" strokeWidth={2} strokeLinecap="round" />
      )}
    </svg>
  );
};
