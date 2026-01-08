import { ImageResponse } from "next/og";

export const runtime = "edge";

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = "image/png";

interface PageProps {
  params: { name: string };
}

export default async function OpenGraphImage({ params }: PageProps) {
  const { name } = params;

  const iconTitle = name
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        width: "100%",
        height: "100%",
        background:
          "linear-gradient(135deg, #f0fdf4 0%, #ecfeff 50%, #fef3c7 100%)",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "180px",
          height: "180px",
          background: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
          marginBottom: "40px",
        }}
      >
        <img
          src={`https://api.svg-api.org/v1/icons/${name}?size=128&color=%230b1020`}
          width={128}
          height={128}
          alt={name}
          style={{ width: "128px", height: "128px" }}
        />
      </div>

      <h1
        style={{
          fontSize: "48px",
          fontWeight: "700",
          color: "#0b1020",
          margin: "0 0 16px 0",
          letterSpacing: "-0.02em",
        }}
      >
        {iconTitle}
      </h1>

      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "24px",
        }}
      >
        <span
          style={{
            padding: "8px 20px",
            background: "#14b8a6",
            color: "#ffffff",
            borderRadius: "9999px",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          SVG Icon
        </span>
        <span
          style={{
            padding: "8px 20px",
            background: "#f59e0b",
            color: "#ffffff",
            borderRadius: "9999px",
            fontSize: "16px",
            fontWeight: "600",
          }}
        >
          Free Download
        </span>
      </div>

      <p
        style={{
          fontSize: "20px",
          color: "#64748b",
          margin: "0",
        }}
      >
        Free SVG Icon | API Available
      </p>

      <div
        style={{
          position: "absolute",
          bottom: "40px",
          right: "40px",
          display: "flex",
          alignItems: "center",
          gap: "12px",
        }}
      >
        <span
          style={{
            fontSize: "18px",
            fontWeight: "600",
            color: "#0b1020",
          }}
        >
          svg-api.org
        </span>
      </div>
    </div>,
    {
      ...size,
      status: 200,
      headers: {
        "Cache-Control": "public, max-age=31536000, immutable",
        "CDN-Cache-Control": "public, max-age=31536000, immutable",
      },
    },
  );
}
