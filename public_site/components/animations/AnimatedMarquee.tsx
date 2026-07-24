"use client";

export function AnimatedMarquee({
  items,
  direction = "left",
}: {
  items: string[];
  direction?: "left" | "right";
}) {
  const repeated = [...items, ...items];
  return (
    <div className="group overflow-hidden border-y border-[#ded7ca] bg-white py-4">
      <div
        className={`flex min-w-max gap-3 ${direction === "right" ? "animate-marquee-right" : "animate-marquee-left"} group-hover:[animation-play-state:paused]`}
      >
        {repeated.map((item, index) => (
          <span
            key={`${item}-${index}`}
            className="rounded-lg border border-[#ded7ca] bg-[#fffdf8] px-4 py-2 text-sm font-semibold text-[#6d665c]"
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
