import { IconBrowser } from "../../components/icons/IconBrowser";
import { AutoBreadcrumb } from "../../components/ui/Breadcrumb";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Icon Browser - Search 22,000+ Free SVG Icons",
  description:
    "Browse and search over 22,000 free SVG icons from Lucide, Tabler, Heroicons, and more. Filter by source, category, and tags. Copy URLs or download instantly.",
  keywords: [
    "icon browser",
    "search icons",
    "free icons",
    "SVG icons",
    "icon library",
    "Lucide icons",
    "Tabler icons",
    "Heroicons",
    "icon search",
  ],
  alternates: {
    canonical: "/icons",
  },
  openGraph: {
    title: "Icon Browser - Search 22,000+ Free SVG Icons | SVG API",
    description:
      "Browse and search over 22,000 free SVG icons from Lucide, Tabler, Heroicons, and more.",
    url: "https://svg-api.org/icons",
    type: "website",
  },
};

export default function IconsPage() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      <AutoBreadcrumb className="mb-6" />
      <IconBrowser />
    </div>
  );
}
