import { createFileRoute } from "@tanstack/react-router";
import { PublicSiteRedirect } from "@/components/common/PublicSiteRedirect";

export const Route = createFileRoute("/")({
  component: () => <PublicSiteRedirect path="/" />,
});
