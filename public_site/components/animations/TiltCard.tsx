"use client";

import { HTMLAttributes, ReactNode, useRef } from "react";
import gsap from "gsap";

export function TiltCard({
  children,
  className,
  maxRotate = 5,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  maxRotate?: number;
}) {
  const ref = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);

  const canTilt = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <div
      ref={ref}
      className={className}
      style={{ perspective: 900, ...props.style }}
      onMouseMove={(event) => {
        if (!canTilt() || !ref.current) return;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        rafRef.current = requestAnimationFrame(() => {
          const rect = ref.current!.getBoundingClientRect();
          const px = (event.clientX - rect.left) / rect.width - 0.5;
          const py = (event.clientY - rect.top) / rect.height - 0.5;
          gsap.to(ref.current, {
            rotateX: -py * maxRotate,
            rotateY: px * maxRotate,
            y: -4,
            duration: 0.42,
            ease: "power3.out",
            transformPerspective: 900,
          });
        });
      }}
      onMouseLeave={() => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        gsap.to(ref.current, {
          rotateX: 0,
          rotateY: 0,
          y: 0,
          duration: 0.65,
          ease: "elastic.out(1, 0.35)",
        });
      }}
      {...props}
    >
      {children}
    </div>
  );
}
