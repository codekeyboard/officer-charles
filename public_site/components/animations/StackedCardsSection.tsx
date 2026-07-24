"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { faqItems } from "@/lib/content";

gsap.registerPlugin(ScrollTrigger);

export function StackedCardsSection() {
  const sectionRef = useRef<HTMLElement | null>(null);
  const deckRef = useRef<HTMLDivElement | null>(null);
  const activeRef = useRef(0);
  const [active, setActiveState] = useState(0);

  const setActive = useCallback((index: number) => {
    if (activeRef.current === index) return;
    activeRef.current = index;
    setActiveState(index);
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const context = gsap.context(() => {
      const intro = section.querySelectorAll("[data-stack-intro]");
      const cards = gsap.utils.toArray<HTMLElement>("[data-stack-card]");

      if (reduceMotion) {
        gsap.set([...intro, ...cards], { opacity: 1, y: 0, filter: "blur(0px)" });
        return;
      }

      gsap.fromTo(
        intro,
        { opacity: 0, y: 34, filter: "blur(8px)" },
        {
          opacity: 1,
          y: 0,
          filter: "blur(0px)",
          duration: 0.8,
          ease: "power4.out",
          stagger: 0.08,
          scrollTrigger: {
            trigger: section,
            start: "top 80%",
            toggleActions: "play none none none",
          },
        },
      );

      gsap.matchMedia().add("(min-width: 900px)", () => {
        const pin = ScrollTrigger.create({
          trigger: section,
          start: "top top",
          end: () => `+=${window.innerHeight * (faqItems.length - 1)}`,
          pin: true,
          scrub: 1,
          anticipatePin: 1,
          invalidateOnRefresh: true,
          onUpdate: (self) => {
            const next = Math.min(
              faqItems.length - 1,
              Math.round(self.progress * (faqItems.length - 1)),
            );
            setActive(next);
          },
          // Adjust the end value above to control how much scroll is needed per card.
        });

        return () => pin.kill();
      });

      gsap.matchMedia().add("(max-width: 899px)", () => {
        gsap.set(cards, { position: "relative", opacity: 1, y: 0, x: 0, scale: 1, rotate: 0 });
        gsap.fromTo(
          cards,
          { opacity: 0, y: 36, filter: "blur(8px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 0.7,
            ease: "power3.out",
            stagger: 0.1,
            scrollTrigger: {
              trigger: deckRef.current,
              start: "top 84%",
              toggleActions: "play none none none",
            },
          },
        );
      });
    }, section);

    return () => context.revert();
  }, [setActive]);

  useEffect(() => {
    const deck = deckRef.current;
    if (!deck) return;

    const cards = Array.from(deck.querySelectorAll<HTMLElement>("[data-stack-card]"));
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    cards.forEach((card, index) => {
      const depth = index - active;
      const isActive = depth === 0;
      const isPast = depth < 0;
      const distance = Math.abs(depth);

      gsap.to(card, {
        x: isPast ? -32 - distance * 8 : distance * 18,
        y: isPast ? -28 - distance * 10 : distance * 18,
        scale: isActive ? 1 : isPast ? 0.92 - distance * 0.02 : 1 - distance * 0.035,
        rotate: isActive ? 0 : isPast ? -3 : distance % 2 === 0 ? -1.2 : 1.2,
        opacity: isActive ? 1 : isPast ? 0 : Math.max(0.16, 0.42 - distance * 0.05),
        zIndex: isActive ? cards.length + 1 : isPast ? 0 : cards.length - distance,
        filter: isActive ? "blur(0px)" : isPast ? "blur(6px)" : "blur(0.8px)",
        duration: reduceMotion ? 0 : 0.58,
        ease: "power3.out",
        pointerEvents: isActive ? "auto" : "none",
      });
    });
  }, [active]);

  const current = faqItems[active];

  return (
    <section
      ref={sectionRef}
      className="relative overflow-hidden bg-[#f0eee6] px-4 py-12 sm:px-6 lg:flex lg:h-screen lg:min-h-[680px] lg:items-center lg:px-8 lg:py-0"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute right-[12%] top-16 h-64 w-64 rounded-[38%] bg-[#0f766e]/10 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-10 left-[8%] h-44 w-44 rounded-[42%] bg-[#d1951c]/12 blur-3xl"
      />

      <div className="relative mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[0.78fr_1.22fr] lg:items-center">
        <div>
          <p data-stack-intro className="text-sm font-semibold uppercase text-[#0f766e]">
            Question flow
          </p>
          <h2
            data-stack-intro
            className="mt-3 max-w-xl text-3xl font-semibold leading-tight sm:text-4xl"
          >
            Your prep stays clear as each question comes into focus.
          </h2>
          <p data-stack-intro className="mt-4 max-w-xl text-base leading-7 text-[#6d665c]">
            Scroll through the section to move through the key questions one by
            one. The page continues only after the final card is reached.
          </p>

          <div data-stack-intro className="mt-8 grid max-w-xl grid-cols-3 gap-3">
            {[
              ["20", "free credits"],
              ["2", "visa paths"],
              ["4", "key FAQs"],
            ].map(([value, label]) => (
              <div key={label} className="rounded-lg border border-[#ded7ca] bg-white/80 p-4">
                <p className="text-2xl font-semibold text-[#0f766e]">{value}</p>
                <p className="mt-1 text-xs text-[#6d665c]">{label}</p>
              </div>
            ))}
          </div>

          <div data-stack-intro className="mt-7 flex max-w-sm gap-2" aria-label="Question progress">
            {faqItems.map((faq, index) => (
              <span
                key={faq.question}
                aria-label={`Question ${index + 1}`}
                className={`h-2 flex-1 rounded-full transition ${
                  active === index ? "bg-[#0f766e]" : active > index ? "bg-[#4f9b92]" : "bg-[#d8d0bf]"
                }`}
              />
            ))}
          </div>
        </div>

        <div ref={deckRef} className="relative min-h-[390px] sm:min-h-[430px] lg:min-h-[410px]">
          {faqItems.map((faq, index) => (
            <article
              data-stack-card
              key={faq.question}
              aria-hidden={active !== index}
              className="absolute inset-x-0 top-0 rounded-lg border border-[#ded7ca] bg-white p-6 shadow-[0_26px_76px_rgba(43,36,26,0.14)] sm:p-8"
            >
              <div className="flex items-start justify-between gap-4">
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-[#e7f4ef] text-base font-semibold text-[#0f766e]">
                  {index + 1}
                </span>
                <span className="rounded-lg bg-[#fff7cf] px-3 py-1 text-xs font-semibold text-[#7a5a09]">
                  {active === index ? "Active" : active > index ? "Done" : "Queued"}
                </span>
              </div>
              <h3 className="mt-6 text-2xl font-semibold tracking-normal text-[#191814]">
                {faq.question}
              </h3>
              <p className="mt-4 text-base leading-8 text-[#6d665c]">{faq.answer}</p>
            </article>
          ))}
        </div>
      </div>

      <p className="sr-only" aria-live="polite">
        Active question: {current.question}
      </p>
    </section>
  );
}
