"use client";

import { ElementType, useEffect, useMemo, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type SplitTextRevealProps = {
  text: string;
  as?: ElementType;
  className?: string;
  mode?: "word" | "char" | "line";
};

export function SplitTextReveal({
  text,
  as: Tag = "h2",
  className,
  mode = "word",
}: SplitTextRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const tokens = useMemo(() => {
    if (mode === "char") return Array.from(text);
    if (mode === "line") return text.split("|");
    return text.split(" ");
  }, [mode, text]);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const parts = Array.from(node.querySelectorAll("[data-split-part]"));

    if (reduceMotion) {
      gsap.set(parts, { yPercent: 0, opacity: 1 });
      return;
    }

    const context = gsap.context(() => {
      gsap.fromTo(
        parts,
        { yPercent: 110, opacity: 0.4 },
        {
          yPercent: 0,
          opacity: 1,
          duration: mode === "char" ? 0.72 : 0.82,
          ease: "power4.out",
          stagger: mode === "char" ? 0.025 : 0.08,
          scrollTrigger: {
            trigger: node,
            start: "top 84%",
            toggleActions: "play none none none",
          },
        },
      );
    }, node);

    return () => context.revert();
  }, [mode]);

  return (
    <Tag ref={ref} className={className}>
      {tokens.map((token, index) => (
        <span key={`${token}-${index}`} className="inline-block overflow-hidden align-bottom">
          <span data-split-part className="inline-block will-change-transform">
            {token === " " ? "\u00a0" : token}
            {mode === "word" && index < tokens.length - 1 ? "\u00a0" : ""}
          </span>
        </span>
      ))}
    </Tag>
  );
}
