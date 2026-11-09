import { useEffect, useRef, useState } from 'preact/hooks';
import { FrameChrome } from './hud/FrameChrome';
import { ReportForm, reportOpen, pickingOnMap } from './hud/ReportForm';
import { MenuDrawer } from './hud/MenuDrawer';
import { Toasts } from './hud/Toast';
import { NotificationCenter } from './hud/NotificationCenter';
import { Radar } from './hud/Radar';
import { createMap } from './map/createMap';
import { installPins, flyToSighting } from './map/pins';
import { globeSpin } from './map/globeSpin';
import { addSightings, sightings, latestArrival } from './state/sightings';
import { sfx, unlockAudio } from './audio/sfx';
import type { Map as MLMap } from 'maplibre-gl';

export function App() {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap>();
  const [mapReady, setMapReady] = useState<MLMap | null>(null);
  const [webGlFailed, setWebGlFailed] = useState(false);

  useEffect(() => {
    // Populate single location upfront so HUD components have it
    addSightings([
      {
        id: 'single-location-1',
        lat: 35.6849994,
        lng: -0.6502714,
        name: 'AUTODEAL',
        message: 'AUTODEAL LOCATION PIN.',
        createdAt: new Date().toISOString(),
        placeLabel: 'ORAN, ALGERIA',
        likeCount: 1,
        replyCount: 0,
      },
    ]);

    if (!mapEl.current || mapRef.current) return;
    const map = createMap(mapEl.current, {
      onZoomStep: (dir) => sfx.zoom(dir),
    });

    if (!map) {
      setWebGlFailed(true);
      return;
    }
    mapRef.current = map;

    map.once('load', async () => {
      await installPins(map);
      setMapReady(map);
      /* Dev-only handle so the map can be inspected from the console. Named
         __map, not map: the container carries id="map", which already claims
         window.map via named access on the global. Stripped from prod builds. */
      if (import.meta.env.DEV) (window as unknown as { __map?: unknown }).__map = map;
    });

    /* No startup gate: audio unlocks on the first real interaction. */
    const unlockOnce = () => {
      unlockAudio();
      window.removeEventListener('pointerdown', unlockOnce);
      window.removeEventListener('keydown', unlockOnce);
    };
    window.addEventListener('pointerdown', unlockOnce);
    window.addEventListener('keydown', unlockOnce);

    /* Remote arrival → sonar ping (unless notifications are muted) */
    const unsubPing = latestArrival.subscribe(async (s) => {
      if (!s) return;
      const { notifMuted } = await import('./state/settings');
      if (!notifMuted.value) sfx.ping();
    });

    /* Pick-on-map: one-shot click sets report coords and reopens the form. */
    map.on('click', (e) => {
      if (!pickingOnMap.value) return;
      pickingOnMap.value = false;
      document.body.classList.remove('picking');
      reportOpen.value = { lat: e.lngLat.lat, lng: e.lngLat.lng };
      sfx.blip();
    });

    return () => {
      unsubPing();
      mapRef.current?.remove();
      mapRef.current = undefined;
    };
  }, []);

  /* Hold the globe still while the user is aiming at it. Without this the
     idle spin restarts after 10s of deliberating and slides the map out from
     under the tap. */
  useEffect(() => {
    const spin = globeSpin();
    if (!spin) return;
    if (pickingOnMap.value) spin.suspend();
    else spin.resume();
  }, [pickingOnMap.value]);

  const openReport = () => {
    sfx.blip();
    reportOpen.value = {};
  };

  return (
    <>
      <div
        id="map"
        ref={mapEl}
        style={{ position: 'absolute', inset: 0, background: 'var(--map-bg)' }}
      >
        {webGlFailed && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#d7f5ff',
              fontFamily: 'var(--font-pixel, monospace)',
              textAlign: 'center',
              padding: '24px',
              zIndex: 1,
            }}
          >
            <div
              style={{
                background: 'rgba(5, 10, 20, 0.92)',
                border: '2px solid #ff4757',
                padding: '24px 32px',
                maxWidth: '480px',
                borderRadius: '8px',
                boxShadow: '0 0 24px rgba(255, 71, 87, 0.4)',
              }}
            >
              <div style={{ fontSize: '20px', color: '#ff4757', marginBottom: '12px', fontWeight: 'bold' }}>
                WEBGL2 NOT DETECTED
              </div>
              <p style={{ fontSize: '14px', lineHeight: '1.6', marginBottom: '16px' }}>
                Your browser or environment currently has hardware acceleration or WebGL disabled.
              </p>
              <div
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  padding: '12px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  textAlign: 'left',
                  lineHeight: '1.5',
                }}
              >
                <div><strong>How to enable:</strong></div>
                <div>1. In Chrome / Brave / Edge: Settings &rarr; System &rarr; Enable <em>"Use graphics acceleration when available"</em>.</div>
                <div>2. Visit <code>chrome://flags</code> &rarr; ensure <strong>WebGL 2.0</strong> is enabled.</div>
                <div>3. Relaunch your browser.</div>
              </div>
              <div style={{ marginTop: '16px', fontSize: '13px', color: '#00e5ff' }}>
                TRACKED LOCATION: 35.6850° N, 0.6503° W (AUTODEAL, ORAN)
              </div>
            </div>
          </div>
        )}
      </div>
      <FrameChrome
        onReport={openReport}
        onTakeMeThere={() => {
          if (mapRef.current) {
            mapRef.current.flyTo({
              center: [-0.6502714, 35.6849994],
              zoom: 16,
              speed: 1.6,
              curve: 1.4,
              essential: true,
            });
          } else {
            window.open('https://maps.app.goo.gl/Tp8EhcPGMffCGgUn7', '_blank', 'noopener,noreferrer');
          }
        }}
      />
      <Radar map={mapReady} />
      <MenuDrawer
        onReport={openReport}
        onJump={(id) => {
          const s = sightings.value.get(id);
          if (s && mapRef.current) flyToSighting(mapRef.current, s);
        }}
      />
      <Toasts
        onJump={(s) => {
          if (mapRef.current) flyToSighting(mapRef.current, s);
        }}
      />
      <NotificationCenter
        onJump={(s) => {
          if (mapRef.current) flyToSighting(mapRef.current, s);
        }}
      />
      {pickingOnMap.value && (
        <>
          <div class="pick-hint">TAP THE MAP TO DROP YOUR PIN</div>
          {/* Wheel zoom is quantised and there is no nav control, so on a phone
              there was no way to zoom out far enough to find your own street.
              These only exist while picking, so they never crowd the HUD. */}
          <div class="pick-zoom">
            <button
              class="pick-zoom-btn"
              aria-label="Zoom in"
              onClick={() => {
                mapRef.current?.zoomIn({ duration: 220 });
                sfx.zoom(1);
              }}
            >
              +
            </button>
            <button
              class="pick-zoom-btn"
              aria-label="Zoom out"
              onClick={() => {
                mapRef.current?.zoomOut({ duration: 220 });
                sfx.zoom(-1);
              }}
            >
              −
            </button>
            <button
              class="pick-zoom-btn pick-cancel"
              aria-label="Cancel picking"
              onClick={() => {
                pickingOnMap.value = false;
                document.body.classList.remove('picking');
                sfx.blip();
              }}
            >
              ×
            </button>
          </div>
        </>
      )}
      <ReportForm
        onPickOnMap={() => {
          document.body.classList.add('picking');
        }}
        onDone={(lat, lng) => {
          sfx.pinDrop();
          const map = mapRef.current;
          if (!map) return;
          map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 14), speed: 1.6 });
        }}
      />
    </>
  );
}
