import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Code Examples",
  description:
    "Ready-to-use code examples for integrating SVG API. HTML, React, Vue, JavaScript, Python, and cURL.",
};

export default function ExamplesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
