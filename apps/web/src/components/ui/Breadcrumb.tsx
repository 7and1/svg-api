"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import clsx from "clsx";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
  homeLabel?: string;
}

const HomeIcon = () => (
  <svg
    className="h-4 w-4"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
    />
  </svg>
);

const ChevronIcon = () => (
  <svg
    className="h-4 w-4 text-slate/50"
    fill="none"
    viewBox="0 0 24 24"
    stroke="currentColor"
    strokeWidth={2}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M9 5l7 7-7 7"
    />
  </svg>
);

// Auto-generate breadcrumbs from pathname
export const AutoBreadcrumb = ({
  className,
  homeLabel = "Home",
}: BreadcrumbProps) => {
  const pathname = usePathname();

  const items = pathname
    .split("/")
    .filter(Boolean)
    .map((segment, index, arr) => {
      const href = "/" + arr.slice(0, index + 1).join("/");
      // Capitalize and replace hyphens with spaces
      const label = segment
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      return { label, href };
    });

  return (
    <Breadcrumb
      items={[{ label: homeLabel, href: "/" }, ...items]}
      className={className}
    />
  );
};

export const Breadcrumb = ({ items, className }: BreadcrumbProps) => {
  if (!items || items.length === 0) return null;

  // Schema.org breadcrumb structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      item: item.href ? `https://svg-api.org${item.href}` : undefined,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav
        aria-label="Breadcrumb"
        className={clsx("flex items-center", className)}
      >
        <ol className="flex flex-wrap items-center gap-2">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            const isFirst = index === 0;

            return (
              <li key={index} className="flex items-center gap-2">
                {index > 0 && <ChevronIcon />}
                {isLast ? (
                  <span
                    className="text-sm font-medium text-ink dark:text-sand"
                    aria-current="page"
                  >
                    {isFirst ? <HomeIcon /> : item.label}
                  </span>
                ) : (
                  <Link
                    href={item.href || "/"}
                    className={clsx(
                      "flex items-center gap-1 text-sm transition hover:text-teal",
                      isFirst
                        ? "text-slate hover:text-teal"
                        : "text-slate hover:text-teal"
                    )}
                  >
                    {isFirst ? <HomeIcon /> : item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

// Animated breadcrumb with entrance animation
export const AnimatedBreadcrumb = (props: BreadcrumbProps) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <Breadcrumb {...props} />
    </motion.div>
  );
};
