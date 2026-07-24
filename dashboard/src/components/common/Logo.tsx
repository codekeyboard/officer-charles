export function Logo({
  collapsed = false,
  variant = "default",
  size = "md",
}: {
  collapsed?: boolean;
  variant?: "default" | "light";
  size?: "md" | "lg";
}) {
  const logoSize = size === "lg" ? "h-20" : "h-16";
  const tileClass =
    variant === "light"
      ? "border-white/20 bg-white/90 shadow-black/10"
      : "border-border bg-white shadow-black/5";

  return (
    <div
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-xl border px-3 py-2 shadow-sm ${tileClass}`}
    >
      <img
        src={collapsed ? "/logo.png" : "/new-logo.png"}
        alt="Officer Charles"
        className={collapsed ? "h-10 w-10 rounded-full object-cover object-center" : `${logoSize} w-auto object-contain`}
        loading="eager"
        decoding="async"
      />
    </div>
  );
}
