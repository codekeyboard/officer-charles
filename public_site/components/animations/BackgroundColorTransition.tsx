"use client";

import { useEffect } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function BackgroundColorTransition() {
  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    const sections = Array.from(document.querySelectorAll<HTMLElement>("[data-page-bg]"));
    const context = gsap.context(() => {
      sections.forEach((section) => {
        ScrollTrigger.create({
          trigger: section,
          start: "top 55%",
          end: "bottom 45%",
          onEnter: () => gsap.to(document.body, { backgroundColor: section.dataset.pageBg, duration: 0.55, ease: "power3.out" }),
          onEnterBack: () => gsap.to(document.body, { backgroundColor: section.dataset.pageBg, duration: 0.55, ease: "power3.out" }),
          // Change start/end to make the color transition happen earlier or later.
        });
      });
    });

    return () => context.revert();
  }, []);

  return null;
}
