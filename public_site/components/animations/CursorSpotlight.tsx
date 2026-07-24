"use client";

import { ReactNode, useRef } from "react";

export function CursorSpotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement | null>(null);

  return (
    <div
      ref={ref}
      className={`relative overflow-hidden ${className ?? ""}`}
      onMouseMove={(event) => {
        const node = ref.current;
        if (!node) return;
        const rect = node.getBoundingClientRect();
        node.style.setProperty("--spotlight-x", `${event.clientX - rect.left}px`);
        node.style.setProperty("--spotlight-y", `${event.clientY - rect.top}px`);
      }}
    >
      <div className="pointer-events-none absolute inset-0 hidden opacity-0 transition-opacity duration-300 [background:radial-gradient(520px_circle_at_var(--spotlight-x,50%)_var(--spotlight-y,50%),rgba(15,118,110,0.12),transparent_45%)] md:block md:group-hover:opacity-100" />
      {children}
    </div>
  );
}
