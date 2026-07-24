import { createFileRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { PublicSiteRedirect } from "@/components/common/PublicSiteRedirect";

export const Route = createFileRoute("/blog")({
  component: BlogRoute,
});

function BlogRoute() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });

  if (pathname !== "/blog") {
    return <Outlet />;
  }

  return <PublicSiteRedirect path="/blog" />;
}
