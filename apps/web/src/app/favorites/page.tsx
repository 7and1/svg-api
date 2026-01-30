import type { Metadata } from "next";
import { FavoritesClient } from "./FavoritesClient";

export const metadata: Metadata = {
  title: "Favorites - Your Saved Icons",
  description: "View and manage your favorite SVG icons. Quick access to your most-used icons from Lucide, Tabler, Heroicons, and more.",
  keywords: ["favorite icons", "saved icons", "icon collection", "SVG favorites"],
  alternates: {
    canonical: "/favorites",
  },
  openGraph: {
    title: "Favorites - Your Saved Icons | SVG API",
    description: "View and manage your favorite SVG icons.",
    url: "https://svg-api.org/favorites",
    type: "website",
  },
};

export default function FavoritesPage() {
  return <FavoritesClient />;
}
