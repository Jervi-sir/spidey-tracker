/**
 * Site-wide configuration.
 *
 * Everything brandable lives here so forks can rename the whole site
 * by editing env vars (or this file) without touching components.
 */

const env = import.meta.env;

export const config = {
  /** Site title shown in the logo plate, preloader, and ticker. */
  siteName: 'HMMMM TRACKER',
  /** Short tagline used by the preloader boot sequence. */
  tagline:
    'INTERACT WITH THE MAP TO VIEW SIGHTINGS ALL OVER THE WORLD.',
  /** Vector tile style base — OpenFreeMap public instance by default (keyless, no limits). */
  tilesUrl: 'https://tiles.openfreemap.org/planet',
  /** Supabase — disabled, runs in local client-only mode */
  supabaseUrl: '',
  supabaseAnonKey: '',
  /** Optional Cloudflare Turnstile site key (anti-bot). Empty = disabled. */
  turnstileSiteKey: '',
  /** Creator credit shown in the ticker. Blank the URL to hide it. */
  creatorHandle: '@Jervi-sir',
  creatorUrl: 'https://jervi.dev',
} as const;

/**
 * House lines the ticker mixes in between live sightings.
 * Keep them short — the crawl reads best under ~50 characters.
 */
export const HOUSE_LINES: string[] = [
  'LIFE IS LIKE A DIH',
  'POTATO IS EXPENSIVE',
  'SO TA7YA TEBOUNE',
];

/** Fully client-side mode with local state (no Supabase). */
export const isDemoMode = true;
