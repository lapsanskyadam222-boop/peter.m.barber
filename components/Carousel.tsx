'use client';

import * as React from 'react';

type CarouselProps = {
  images: string[];
  /** Pomer strán – napr. "4/5", "1/1", "16/9". */
  aspect?: string;
  /** Jemný rádius rohov v px (default 6). */
  edgeRadius?: number;
  /** Max. šírka na desktope (px) — desktop bude vždy centrovaný. */
  desktopMaxWidth?: number;
  /** Mobilný vnútorný “gutter” v px (default 8). */
  mobilePadding?: number;
  className?: string;
};

function aspectToPaddingPercent(aspect?: string) {
  const raw = (aspect ?? '4/5').replace(/\s/g, '');
  const [w, h] = raw.split('/').map(Number);
  if (!w || !h) return 125; // fallback = 4/5
  return (h / w) * 100;
}

export default function Carousel({
  images,
  aspect = '4/5',
  edgeRadius = 6,
  desktopMaxWidth = 720,
  mobilePadding = 8,
  className = '',
}: CarouselProps) {
  const total = Array.isArray(images) ? images.length : 0;
  const [index, setIndex] = React.useState(0);
  const [dragX, setDragX] = React.useState(0);
  const [dragging, setDragging] = React.useState(false);

  const startX = React.useRef(0);
  const startT = React.useRef(0);
  const wrapRef = React.useRef<HTMLDivElement | null>(null);
  const widthRef = React.useRef(1);

  React.useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => (widthRef.current = Math.max(1, el.clientWidth || 1));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Preload susedných snímok pre rýchlejšie prepnutie
  React.useEffect(() => {
    if (!total) return;
    const preload = (i: number) => {
      if (i < 0 || i >= total) return;
      const src = images[i];
      if (!src) return;
      const img = new Image();
      img.decoding = 'async';
      img.src = src;
    };
    preload(index + 1);
    preload(index - 1);
  }, [index, images, total]);

  const begin = (e: React.PointerEvent) => {
    (e.target as Element).setPointerCapture?.(e.pointerId);
    startX.current = e.clientX;
    startT.current = performance.now();
    setDragging(true);
    setDragX(0);
  };

  const move = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - startX.current;
    if (Math.abs(dx) < 4) return; // citlivejší prah na zachytenie horizontálneho pohybu
    e.preventDefault();
    setDragX(dx);
  };

  const end = () => {
    if (!dragging) return;
    const delta = dragX / Math.max(1, widthRef.current);
    let next = index;

    // znížený prah na prelistovanie
    const THRESH = 0.12;

    // jednoduchý „flick“: ak gesto bolo rýchle, povoľ menší posun
    const dt = Math.max(1, performance.now() - startT.current); // ms
    const speedPxPerMs = Math.abs(dragX) / dt;
    const fast = speedPxPerMs > 0.5;

    if ((delta <= -THRESH || (dragX < 0 && fast)) && index < total - 1) next = index + 1;
    if ((delta >=  THRESH || (dragX > 0 && fast)) && index > 0)        next = index - 1;

    setIndex(next);
    setDragX(0);
    setDragging(false);
  };

  if (!total) return null;

  const tx = -(index * 100) + (dragX / Math.max(1, widthRef.current)) * 100;
  const padTop = aspectToPaddingPercent(aspect);

  return (
    <section className={className}>
      {/* OUTER: desktop = centrovaný s maxWidth; mobile = full-bleed cez media query */}
      <div
        className="carousel-outer"
        style={{ ['--maxw' as any]: `${desktopMaxWidth}px`, ['--mpad' as any]: `${mobilePadding}px` }}
      >
        {/* VIEWPORT */}
        <div
          ref={wrapRef}
          className="carousel-viewport"
          style={{ borderRadius: `${edgeRadius}px` }}
        >
          {/* TRACK */}
          <div
            className="carousel-track"
            style={{ transform: `translate3d(${tx}%,0,0)`, transition: dragging ? 'none' : 'transform 300ms ease' }}
            onPointerDown={begin}
            onPointerMove={move}
            onPointerUp={end}
            onPointerCancel={end}
            onPointerLeave={end}
            aria-label="carousel-track"
          >
            {images.map((src, i) => (
              <div key={i} className="slide">
                <div className="ratio" style={{ paddingTop: `${padTop}%` }} aria-hidden="true" />
                <div className="imgwrap">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={src}
                    alt={`slide-${i + 1}`}
                    draggable={false}
                    loading={i === 0 ? 'eager' : 'lazy'}
                    // pomôcky pre rýchlejšie zobrazenie
                    decoding="async"
                    // @ts-expect-error modern browsers support this attribute
                    fetchpriority={i === 0 ? 'high' : 'auto'}
                    sizes="(max-width: 1023px) 100vw, 720px"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* styled-jsx: čisto CSS break-point, žiadna JS logika */}
      <style jsx>{`
        .carousel-outer {
          width: 100%;
          max-width: var(--maxw);
          margin: 0 auto; /* desktop centrovaný */
        }
        .carousel-viewport {
          position: relative;
          width: 100%;
          overflow: hidden;
          background: rgba(0,0,0,0.05);
        }
        .carousel-track {
          display: flex;
          touch-action: pan-y;
          user-select: none;
          will-change: transform;
          cursor: grab;
        }
        .carousel-track:active { cursor: grabbing; }
        .slide {
          position: relative;
          flex: 0 0 100%;
          overflow: hidden;
        }
        .ratio { width: 100%; }
        .imgwrap { position: absolute; inset: 0; }
        .imgwrap img { width: 100%; height: 100%; object-fit: cover; display: block; }

        /* MOBILE (<=1023px): full-bleed + úzky vnútorný gutter */
        @media (max-width: 1023px) {
          .carousel-outer {
            width: 100vw;
            max-width: none;
            margin-left: calc(50% - 50vw);
            margin-right: calc(50% - 50vw);
            padding-left: var(--mpad);
            padding-right: var(--mpad);
          }
        }
      `}</style>
    </section>
  );
}
