import { useState } from 'preact/hooks';
import type { Sighting } from '../state/sightings';
import { sightings } from '../state/sightings';
import { relativeTime } from '../lib/time';
import { isMine } from '../lib/demoStore';
import { sfx } from '../audio/sfx';

interface Props {
  sighting: Sighting;
}

/** The popup card: report, photo, links. */
export function SightingCard({ sighting }: Props) {
  /* live version of the sighting (like/reply counts update in the store) */
  const s = sightings.value.get(sighting.id) ?? sighting;
  const [revealed, setRevealed] = useState(s.photoState !== 'unscreened');

  return (
    <div class="sighting-card">
      <div class="card-head">
        <span class="card-dot" />
        LOCATION DETAILS
      </div>

      {s.photoUrl && (
        <div class={`card-photo ${revealed ? '' : 'unscreened'}`}>
          <img
            src={s.photoUrl}
            alt="sighting photo"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).closest('.card-photo')?.remove();
            }}
          />
          {!revealed && (
            <button class="reveal-btn" onClick={() => setRevealed(true)}>
              UNVERIFIED IMAGE — CLICK TO REVEAL
            </button>
          )}
        </div>
      )}

      <div class="card-msg">{s.message}</div>
      <div class="card-meta">
        <span class="card-name">
          {s.name}
          {isMine(s.id) && <span class="you-badge">YOU</span>}
        </span>
        <span class="card-time">
          {relativeTime(s.createdAt)}
          {s.placeLabel ? ` · ${s.placeLabel}` : ''}
        </span>
      </div>

      <div class="card-actions">
        <a
          class="px-btn take-me-there-btn"
          href={
            s.lat && s.lng
              ? `https://www.google.com/maps/dir/?api=1&destination=${s.lat},${s.lng}`
              : 'https://maps.app.goo.gl/Tp8EhcPGMffCGgUn7'
          }
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => sfx.blip()}
          style={{ width: '100%' }}
        >
          OPeN ON GoOgLe MaP
        </a>
      </div>
    </div>
  );
}
