export function Logo({
  collapsed = false,
  variant = "default",
  size = "md",
}: {
  collapsed?: boolean;
  variant?: "default" | "light";
  size?: "md" | "lg";
}) {
  const titleClass = variant === "light" ? "text-white" : "text-foreground";
  const subtitleClass = variant === "light" ? "text-cyan-100/75" : "text-muted-foreground";
  const markSize = size === "lg" ? "h-14 w-14" : "h-10 w-10";
  const titleSize = size === "lg" ? "text-xl" : "text-sm";
  const subtitleSize = size === "lg" ? "text-xs" : "text-[10px]";
  return (
    <div className={`flex items-center ${size === "lg" ? "gap-3" : "gap-2.5"}`}>
      <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full border border-white/15 bg-slate-950 purple-glow ${markSize}`}>
        <img
          src="/logo.png"
          alt="Officer Charles logo"
          className="h-full w-full object-cover object-center"
          loading="eager"
          decoding="async"
        />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className={`font-semibold leading-tight ${titleSize} ${titleClass}`}>Officer Charles</div>
          <div className={`uppercase tracking-widest ${subtitleSize} ${subtitleClass}`}>AI Visa Interview</div>
        </div>
      )}
    </div>
  );
}
