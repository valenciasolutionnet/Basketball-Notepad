import React from 'react';
import { usePlayStore } from '../store/playStore';
import { PathDrawer } from './PathDrawer';
import { TacticalPlayer } from './TacticalPlayer';

export const CourtBoard: React.FC = () => {
  const paths = usePlayStore((s) => s.paths);

  return (
    <div className="relative w-[600px] h-[420px] bg-orange-100 rounded-lg overflow-hidden">
      <svg width={600} height={420} className="absolute inset-0">
        {Object.keys(paths).map((id) => (
          <TacticalPlayer key={id} pathId={id} />
        ))}
      </svg>
      <PathDrawer playerId="player-1" width={600} height={420} />
    </div>
  );
};
