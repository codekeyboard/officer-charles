import { createFileRoute } from "@tanstack/react-router";
import { PublicSiteRedirect } from "@/components/common/PublicSiteRedirect";

export const Route = createFileRoute("/pricing")({
  component: () => <PublicSiteRedirect path="/pricing" />,
});
