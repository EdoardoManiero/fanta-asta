import { useState } from 'react';

const SIZES = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-12 h-12 text-sm',
  lg: 'w-16 h-16 text-xl',
};

export default function PlayerAvatar({ player, size = 'md' }) {
  const [errored, setErrored] = useState(false);
  const showPhoto = player.photoUrl && !errored;

  return (
    <div
      className={`${SIZES[size]} rounded-full bg-pitch-950 border-2 border-emerald-700 flex items-center justify-center font-black text-emerald-300 overflow-hidden shrink-0`}
    >
      {showPhoto ? (
        <img
          src={player.photoUrl}
          alt=""
          className="w-full h-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        player.ruolo
      )}
    </div>
  );
}
