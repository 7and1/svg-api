import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Icon Sources",
  description:
    "Learn about the icon libraries available through SVG API. Lucide, Tabler, Heroicons, Phosphor, and more.",
};

const sources = [
  {
    id: "lucide",
    name: "Lucide",
    description:
      "Beautiful & consistent icon toolkit made by the community. Fork of Feather Icons with active development.",
    iconCount: 1420,
    website: "https://lucide.dev",
    github: "https://github.com/lucide-icons/lucide",
    license: "ISC",
    features: [
      "Consistent stroke width",
      "Tree-shakeable",
      "TypeScript support",
      "Regular updates",
    ],
    exampleIcons: ["home", "search", "settings", "user", "heart", "star"],
  },
  {
    id: "tabler",
    name: "Tabler Icons",
    description:
      "Over 5,000 free MIT-licensed high-quality SVG icons for web design. One of the largest open source icon sets.",
    iconCount: 5000,
    website: "https://tabler.io/icons",
    github: "https://github.com/tabler/tabler-icons",
    license: "MIT",
    features: [
      "5,000+ icons",
      "Outline & filled variants",
      "Consistent design",
      "MIT licensed",
    ],
    exampleIcons: [
      "home",
      "search",
      "settings",
      "user",
      "heart",
      "brand-github",
    ],
  },
  {
    id: "heroicons",
    name: "Heroicons",
    description:
      "Beautiful hand-crafted SVG icons, by the makers of Tailwind CSS. Available in outline, solid, and mini variants.",
    iconCount: 876,
    website: "https://heroicons.com",
    github: "https://github.com/tailwindlabs/heroicons",
    license: "MIT",
    features: [
      "By Tailwind team",
      "3 style variants",
      "20px & 24px sizes",
      "MIT licensed",
    ],
    exampleIcons: [
      "home",
      "magnifying-glass",
      "cog-6-tooth",
      "user",
      "heart",
      "star",
    ],
  },
  {
    id: "phosphor",
    name: "Phosphor Icons",
    description:
      "A flexible icon family for interfaces, diagrams, presentations, and more. Available in 6 weights.",
    iconCount: 1248,
    website: "https://phosphoricons.com",
    github: "https://github.com/phosphor-icons/homepage",
    license: "MIT",
    features: [
      "6 weight variants",
      "Customizable stroke",
      "Pixel-perfect",
      "MIT licensed",
    ],
    exampleIcons: [
      "house",
      "magnifying-glass",
      "gear",
      "user",
      "heart",
      "star",
    ],
  },
  {
    id: "remix",
    name: "Remix Icon",
    description:
      "Open source neutral-style icon system. Designed for designers and developers.",
    iconCount: 2850,
    website: "https://remixicon.com",
    github: "https://github.com/Remix-Design/RemixIcon",
    license: "Apache 2.0",
    features: [
      "Line & fill variants",
      "Categorized icons",
      "SVG & font formats",
      "Apache 2.0 licensed",
    ],
    exampleIcons: [
      "home-line",
      "search-line",
      "settings-line",
      "user-line",
      "heart-line",
      "star-line",
    ],
  },
  {
    id: "bootstrap",
    name: "Bootstrap Icons",
    description:
      "Official open source SVG icon library for Bootstrap. Over 2,000 icons with multiple style variants.",
    iconCount: 2000,
    website: "https://icons.getbootstrap.com",
    github: "https://github.com/twbs/icons",
    license: "MIT",
    features: [
      "Official Bootstrap",
      "Multiple variants",
      "Web font included",
      "MIT licensed",
    ],
    exampleIcons: ["house", "search", "gear", "person", "heart", "star"],
  },
  {
    id: "mdi",
    name: "Material Design Icons",
    description:
      "Community-led collection of 7,000+ Material Design icons. The most comprehensive Material icon set.",
    iconCount: 7200,
    website: "https://materialdesignicons.com",
    github: "https://github.com/Templarian/MaterialDesign",
    license: "Apache 2.0",
    features: [
      "7,000+ icons",
      "Material Design style",
      "Community maintained",
      "Apache 2.0 licensed",
    ],
    exampleIcons: ["home", "magnify", "cog", "account", "heart", "star"],
  },
];

export default function SourcesPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate">Guides</p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Icon Sources
        </h1>
        <p className="mt-3 text-slate">
          SVG API provides access to icons from {sources.length} popular open
          source libraries, totaling over 22,000 icons.
        </p>
      </div>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Quick Reference</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left">
                <th className="pb-3 font-semibold">Source ID</th>
                <th className="pb-3 font-semibold">Name</th>
                <th className="pb-3 font-semibold">Icons</th>
                <th className="pb-3 font-semibold">License</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {sources.map((source) => (
                <tr key={source.id}>
                  <td className="py-3">
                    <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs">
                      {source.id}
                    </code>
                  </td>
                  <td className="py-3">{source.name}</td>
                  <td className="py-3">{source.iconCount.toLocaleString()}</td>
                  <td className="py-3 text-slate">{source.license}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="space-y-6">
        {sources.map((source) => (
          <section
            key={source.id}
            id={source.id}
            className="scroll-mt-24 rounded-3xl border border-black/10 bg-white/80 p-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h2 className="font-display text-xl font-semibold">
                  {source.name}
                </h2>
                <p className="mt-2 text-sm text-slate">{source.description}</p>
              </div>
              <div className="flex gap-2">
                <a
                  href={source.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium transition hover:border-teal hover:text-teal"
                >
                  Website
                </a>
                <a
                  href={source.github}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-lg border border-black/10 px-3 py-1.5 text-xs font-medium transition hover:border-teal hover:text-teal"
                >
                  GitHub
                </a>
              </div>
            </div>

            <div className="mt-6 grid gap-6 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-semibold">Usage</h3>
                <div className="mt-2 rounded-xl bg-ink p-3">
                  <code className="text-xs text-sand">?source={source.id}</code>
                </div>
              </div>
              <div>
                <h3 className="text-sm font-semibold">Details</h3>
                <div className="mt-2 flex gap-4 text-sm text-slate">
                  <span>{source.iconCount.toLocaleString()} icons</span>
                  <span>{source.license} license</span>
                </div>
              </div>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold">Features</h3>
              <ul className="mt-2 flex flex-wrap gap-2">
                {source.features.map((feature) => (
                  <li
                    key={feature}
                    className="rounded-full bg-teal/10 px-3 py-1 text-xs text-teal"
                  >
                    {feature}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6">
              <h3 className="text-sm font-semibold">Example Icons</h3>
              <div className="mt-2 flex flex-wrap gap-4">
                {source.exampleIcons.map((icon) => (
                  <div
                    key={icon}
                    className="flex flex-col items-center gap-2 rounded-xl border border-black/10 bg-white/70 p-3"
                  >
                    <img
                      src={`https://svg-api.org/v1/icons/${icon}?source=${source.id}&size=32`}
                      alt={icon}
                      className="h-8 w-8"
                    />
                    <span className="text-xs text-slate">{icon}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-3xl border border-teal/20 bg-teal/5 p-6">
        <h2 className="font-display text-xl font-semibold">
          License Information
        </h2>
        <p className="mt-3 text-sm text-slate">
          All icon sources are open source with permissive licenses (MIT, ISC,
          or Apache 2.0). You can use these icons in personal and commercial
          projects. Please review each source&apos;s license for specific terms.
        </p>
        <div className="mt-4">
          <Link
            href="/licenses"
            className="text-sm font-medium text-teal hover:underline"
          >
            View full license details
          </Link>
        </div>
      </section>
    </div>
  );
}
