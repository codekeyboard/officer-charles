import { createFileRoute } from "@tanstack/react-router";
import { PublicSiteRedirect } from "@/components/common/PublicSiteRedirect";

export const Route = createFileRoute("/blog/$slug")({
  component: BlogPostRedirect,
});

function BlogPostRedirect() {
  const { slug } = Route.useParams();

  return <PublicSiteRedirect path={`/blog/${slug}`} />;
}
