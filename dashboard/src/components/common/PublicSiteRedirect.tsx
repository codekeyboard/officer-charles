import { useEffect } from "react";

const PUBLIC_SITE_URL =
  import.meta.env.VITE_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3001";

type PublicSiteRedirectProps = {
  path: string;
};

export function PublicSiteRedirect({ path }: PublicSiteRedirectProps) {
  const target = `${PUBLIC_SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;

  useEffect(() => {
    window.location.replace(target);
  }, [target]);

  return (
    <main className="grid min-h-screen place-items-center bg-background px-4 text-center">
      <div className="space-y-3">
        <p className="text-sm font-medium text-muted-foreground">
          Redirecting to Officer Charles...
        </p>
        <a className="text-sm font-semibold text-primary underline-offset-4 hover:underline" href={target}>
          Continue
        </a>
      </div>
    </main>
  );
}
