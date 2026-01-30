"use client";

export function LicenseLink({ url, type }: { url: string; type: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="text-teal hover:underline"
      onClick={(e) => e.stopPropagation()}
    >
      {type}
    </a>
  );
}
