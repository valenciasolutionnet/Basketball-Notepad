import { create } from 'zustand';
import { Point, catmullRomToBezier, sampleCurve, buildArcLengthLUT, ArcLUT, pointsToSvgPath } from '../utils/curve';

export interface TacticalPath {
  id: string;
  playerId: string;
  rawPoints: Point[];
  segments: Point[][];
  lut: ArcLUT;
  svgPath: string;
  durationMs: number;
}

interface PlayState {
  paths: Record<string, TacticalPath>;
  playbackProgress: Record<string, number>; // 0-1 per path
  isPlaying: boolean;
  addPathFromRawPoints: (playerId: string, raw: Point[], durationMs?: number) => void;
  setProgress: (pathId: string, t: number) => void;
  setPlaying: (v: boolean) => void;
  clearPath: (pathId: string) => void;
}

export const usePlayStore = create<PlayState>((set, get) => ({
  paths: {},
  playbackProgress: {},
  isPlaying: false,

  addPathFromRawPoints: (playerId, raw, durationMs = 1200) => {
    const segments = catmullRomToBezier(raw, 1);
    const sampled = sampleCurve(segments, 40);
    const lut = buildArcLengthLUT(sampled);
    const id = `${playerId}-${Date.now()}`;
    const path: TacticalPath = {
      id,
      playerId,
      rawPoints: raw,
      segments,
      lut,
      svgPath: pointsToSvgPath(segments),
      durationMs,
    };
    set((s) => ({
      paths: { ...s.paths, [id]: path },
      playbackProgress: { ...s.playbackProgress, [id]: 0 },
    }));
  },

  setProgress: (pathId, t) =>
    set((s) => ({ playbackProgress: { ...s.playbackProgress, [pathId]: t } })),

  setPlaying: (v) => set({ isPlaying: v }),

  clearPath: (pathId) =>
    set((s) => {
      const paths = { ...s.paths };
      const progress = { ...s.playbackProgress };
      delete paths[pathId];
      delete progress[pathId];
      return { paths, playbackProgress: progress };
    }),
}));
