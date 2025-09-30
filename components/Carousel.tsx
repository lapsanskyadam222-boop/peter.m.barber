"use client";

import Image from "next/image";
import { useState, useRef, useEffect, TouchEvent, MouseEvent } from "react";

type ImgObj = { src: string; alt?: string };

type CarouselProps = {
  images: Array<string | ImgObj>;
  aspect?: string;
  frameAspect?: string;
  fit?: "cover" | "contain";
  radius?: number;
  desktopMaxWidth?: number;
  className?: string;
};

function normalizeImages(arr: Array<string | ImgObj>): ImgObj[] {
  return arr.map((it) =>
    typeof it === "string" ? { src: it, alt: "" } : { src: it.src, alt: it.alt || "" }
  );
}

export default function Carousel({
  images,
  aspect,
  frameAspect = "4/5",
  fit = "cover",
  radius = 5,                // ⬅️ default 5px (jemné zaoblenie)
  desktopMaxWidth = 900,
  className,
}: CarouselProps) {
  const items = normalizeImages(images);
  const [index, setIndex] = useState(0);
  const startX = useRef<number | null>(null);
  const isDragging = useRef(false);
  const trackRef = useRef<HTMLDivElement>(null);

  const resolvedAspect = aspect || frameAspect;

  const handleStart = (clientX: number) => {
    startX.current = clientX;
    isDragging.current = true;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging.current || startX.current === null) return;
    const diff = clientX - startX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) prev();
      else next();
      isDragging.current = false;
    }
  };

  const handleEnd = () => {
    isDragging.current = false;
    startX.current = null;
  };

  const prev = () => setIndex((i) => (i > 0 ? i - 1 : items.length - 1));
  const next = () => setIndex((i) => (i + 1) % items.length);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    const onDown = (e: MouseEvent) => handleStart((e as any).clientX);
    const onMove = (e: MouseEvent) => handleMove((e as any).clientX);
    const onUp = () => handleEnd();

    el.addEventListener("mousedown", onDown as any);
    el.addEventListener("mousemove", onMove as any);
    el.addEventListener("mouseup", onUp as any);
    el.addEventListener("mouseleave", onUp as any);

    return () => {
      el.removeEventListener("mousedown", onDown as any);
      el.removeEventListener("mousemove", onMove as any);
      el.removeEventListener("mouseup", onUp as any);
      el.removeEventListener("mouseleave", onUp as any);
    };
  }, []);

  return (
    <section
      className={className}
      style={{ maxWidth: `${desktopMaxWidth}px`, margin: "0 auto" }}
    >
      <div
        ref={trackRef}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: resolvedAspect,
          borderRadius: radius,
          overflow: "hidden",
          touchAction: "pan-y",
          cursor: "grab",
        }}
        onTouchStart={(e: TouchEvent) => handleStart(e.touches[0].clientX)}
        onTouchMove={(e: TouchEvent) => handleMove(e.touches[0].clientX)}
        onTouchEnd={handleEnd}
        onDragStart={(e) => e.preventDefault()}
      >
        <div
          style={{
            display: "flex",
            height: "100%",
            transform: `translateX(-${index * 100}%)`,
            transition: "transform 0.4s ease",
          }}
        >
          {items.map((img, i) => (
            <div key={i} style={{ minWidth: "100%", height: "100%", position: "relative" }}>
              <Image
                src={img.src}
                alt={img.alt || ""}
                fill
                sizes="(max-width: 900px) 100vw, 900px"
                style={{ objectFit: fit, userSelect: "none", pointerEvents: "none" }}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
