import type { SourceMeta, IconVariant } from "@svg-api/shared/types";

export interface SourceConfig extends Omit<
  SourceMeta,
  "iconCount" | "variants" | "defaultVariant" | "categories"
> {
  defaultVariant?: string;
  variants?: IconVariant[];
}

/**
 * Variant support mapping for each icon source
 * Documents which sources support which style variants
 */
export const SOURCE_VARIANT_SUPPORT: Record<
  string,
  { variants: IconVariant[]; default: IconVariant }
> = {
  lucide: { variants: ["default"], default: "default" },
  tabler: { variants: ["default"], default: "default" },
  heroicons: { variants: ["solid", "outline", "mini"], default: "outline" },
  bootstrap: { variants: ["default"], default: "default" },
  remix: { variants: ["default"], default: "default" },
  ionicons: { variants: ["filled", "outline"], default: "outline" },
  mdi: { variants: ["default"], default: "default" },
};

export const SOURCE_CONFIG: Record<string, SourceConfig> = {
  lucide: {
    id: "lucide",
    name: "Lucide",
    description: "Beautiful & consistent icon toolkit made by the community",
    version: "unknown",
    website: "https://lucide.dev",
    repository: "https://github.com/lucide-icons/lucide",
    license: {
      type: "ISC",
      url: "https://github.com/lucide-icons/lucide/blob/main/LICENSE",
    },
    variants: SOURCE_VARIANT_SUPPORT.lucide?.variants,
    defaultVariant: SOURCE_VARIANT_SUPPORT.lucide?.default,
  },
  tabler: {
    id: "tabler",
    name: "Tabler",
    description:
      "Free and open source icons designed to make your website or app look great",
    version: "unknown",
    website: "https://tabler.io/icons",
    repository: "https://github.com/tabler/tabler-icons",
    license: {
      type: "MIT",
      url: "https://github.com/tabler/tabler-icons/blob/master/LICENSE",
    },
    variants: SOURCE_VARIANT_SUPPORT.tabler?.variants,
    defaultVariant: SOURCE_VARIANT_SUPPORT.tabler?.default,
  },
  heroicons: {
    id: "heroicons",
    name: "Heroicons",
    description:
      "Beautiful hand-crafted SVG icons by the makers of Tailwind CSS",
    version: "unknown",
    website: "https://heroicons.com",
    repository: "https://github.com/tailwindlabs/heroicons",
    license: {
      type: "MIT",
      url: "https://github.com/tailwindlabs/heroicons/blob/master/LICENSE",
    },
    variants: SOURCE_VARIANT_SUPPORT.heroicons?.variants,
    defaultVariant: SOURCE_VARIANT_SUPPORT.heroicons?.default,
  },
  bootstrap: {
    id: "bootstrap",
    name: "Bootstrap Icons",
    description: "Official open source icons for Bootstrap",
    version: "unknown",
    website: "https://icons.getbootstrap.com",
    repository: "https://github.com/twbs/icons",
    license: {
      type: "MIT",
      url: "https://github.com/twbs/icons/blob/main/LICENSE",
    },
    variants: SOURCE_VARIANT_SUPPORT.bootstrap?.variants,
    defaultVariant: SOURCE_VARIANT_SUPPORT.bootstrap?.default,
  },
  remix: {
    id: "remix",
    name: "Remix Icon",
    description:
      "Open source neutral style system symbols for designers and developers",
    version: "unknown",
    website: "https://remixicon.com",
    repository: "https://github.com/Remix-Design/RemixIcon",
    license: {
      type: "Apache-2.0",
      url: "https://github.com/Remix-Design/RemixIcon/blob/master/License",
    },
    variants: SOURCE_VARIANT_SUPPORT.remix?.variants,
    defaultVariant: SOURCE_VARIANT_SUPPORT.remix?.default,
  },
  ionicons: {
    id: "ionicons",
    name: "Ionicons",
    description: "Premium icons for use in web, iOS, Android, and desktop apps",
    version: "unknown",
    website: "https://ionic.io/ionicons",
    repository: "https://github.com/ionic-team/ionicons",
    license: {
      type: "MIT",
      url: "https://github.com/ionic-team/ionicons/blob/main/LICENSE",
    },
    variants: SOURCE_VARIANT_SUPPORT.ionicons?.variants,
    defaultVariant: SOURCE_VARIANT_SUPPORT.ionicons?.default,
  },
  mdi: {
    id: "mdi",
    name: "Material Design Icons",
    description: "Community-driven Material Design icons",
    version: "unknown",
    website: "https://materialdesignicons.com",
    repository: "https://github.com/Templarian/MaterialDesign",
    license: {
      type: "Apache-2.0",
      url: "https://github.com/Templarian/MaterialDesign/blob/master/LICENSE",
    },
    variants: SOURCE_VARIANT_SUPPORT.mdi?.variants,
    defaultVariant: SOURCE_VARIANT_SUPPORT.mdi?.default,
  },
};
