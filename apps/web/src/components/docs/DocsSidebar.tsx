"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";

const navigation = [
  {
    title: "Getting Started",
    items: [
      { href: "/docs", label: "Introduction" },
      { href: "/docs/quickstart", label: "Quick Start" },
    ],
  },
  {
    title: "API Reference",
    items: [
      { href: "/docs/api", label: "Overview" },
      { href: "/docs/api#get-icon", label: "Get Icon" },
      { href: "/docs/api#search", label: "Search" },
      { href: "/docs/api#batch", label: "Batch" },
      { href: "/docs/api#sources", label: "Sources" },
      { href: "/docs/api#categories", label: "Categories" },
      { href: "/docs/api#random", label: "Random" },
    ],
  },
  {
    title: "Guides",
    items: [
      { href: "/docs/examples", label: "Code Examples" },
      { href: "/docs/sources", label: "Icon Sources" },
      { href: "/docs/troubleshooting", label: "Troubleshooting" },
    ],
  },
];

export function DocsSidebar() {
  const pathname = usePathname();

  return (
    <nav className="space-y-6">
      {navigation.map((section) => (
        <div key={section.title}>
          <h4 className="text-xs font-semibold uppercase tracking-[0.2em] text-slate">
            {section.title}
          </h4>
          <ul className="mt-3 space-y-1">
            {section.items.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/docs" && pathname?.startsWith(item.href));
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "block rounded-lg px-3 py-2 text-sm transition",
                      isActive
                        ? "bg-teal/10 font-medium text-teal"
                        : "text-slate hover:bg-ink/5 hover:text-ink",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
