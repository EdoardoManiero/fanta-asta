import { useState } from 'react';

const SIZES = {
  sm: 'w-7 h-7 text-2xs',
  md: 'w-11 h-11 text-xs',
  lg: 'w-14 h-14 text-md',
};

export default function PlayerAvatar({ player, size = 'md' }) {
  const [errored, setErrored] = useState(false);
  const showPhoto = player.photoUrl && !errored;

  return (
    <div
      className={`${SIZES[size]} flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line-strong bg-surface-2 font-display font-semibold text-ink-3`}
    >
      {showPhoto ? (
        <img
          src={player.photoUrl}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setErrored(true)}
        />
      ) : (
        player.ruolo
      )}
    </div>
  );
}
