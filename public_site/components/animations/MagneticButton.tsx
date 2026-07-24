"use client";

import Link from "next/link";
import { AnchorHTMLAttributes, ReactNode, useRef } from "react";
import gsap from "gsap";

type MagneticButtonProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  href: string;
  children: ReactNode;
};

export function MagneticButton({ href, children, className, ...props }: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement | null>(null);
  const innerRef = useRef<HTMLSpanElement | null>(null);

  const canMove = () =>
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  return (
    <Link
      ref={ref}
      href={href}
      className={className}
      onMouseMove={(event) => {
        if (!canMove() || !ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const x = event.clientX - rect.left - rect.width / 2;
        const y = event.clientY - rect.top - rect.height / 2;
        gsap.to(ref.current, { x: x * 0.18, y: y * 0.22, duration: 0.35, ease: "power3.out" });
        gsap.to(innerRef.current, { x: x * 0.08, y: y * 0.1, duration: 0.35, ease: "power3.out" });
      }}
      onMouseLeave={() => {
        gsap.to(ref.current, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.35)" });
        gsap.to(innerRef.current, { x: 0, y: 0, duration: 0.55, ease: "elastic.out(1, 0.35)" });
      }}
      {...props}
    >
      <span ref={innerRef} className="inline-flex items-center gap-2">
        {children}
      </span>
    </Link>
  );
}
