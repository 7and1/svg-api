import clsx from "clsx";

interface EndpointCardProps {
  id?: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  children?: React.ReactNode;
}

const methodColors = {
  GET: "bg-teal/20 text-teal",
  POST: "bg-amber/20 text-amber",
  PUT: "bg-blue-500/20 text-blue-600",
  DELETE: "bg-red-500/20 text-red-600",
};

export function EndpointCard({
  id,
  method,
  path,
  description,
  children,
}: EndpointCardProps) {
  return (
    <div
      id={id}
      className="scroll-mt-24 rounded-3xl border border-black/10 bg-white/80 p-6"
    >
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={clsx(
            "rounded-lg px-2 py-1 text-xs font-bold",
            methodColors[method],
          )}
        >
          {method}
        </span>
        <code className="font-mono text-sm">{path}</code>
      </div>
      <p className="mt-3 text-sm text-slate">{description}</p>
      {children && <div className="mt-6 space-y-6">{children}</div>}
    </div>
  );
}
