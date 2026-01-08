interface Param {
  name: string;
  type: string;
  required?: boolean;
  default?: string;
  description: string;
}

interface ParamTableProps {
  params: Param[];
  title?: string;
}

export function ParamTable({ params, title }: ParamTableProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-black/10 bg-white/80">
      {title && (
        <div className="border-b border-black/10 bg-white/50 px-4 py-3">
          <h4 className="text-sm font-semibold">{title}</h4>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-black/10 bg-white/50 text-left">
              <th className="px-4 py-3 font-semibold">Parameter</th>
              <th className="px-4 py-3 font-semibold">Type</th>
              <th className="px-4 py-3 font-semibold">Default</th>
              <th className="px-4 py-3 font-semibold">Description</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {params.map((param) => (
              <tr key={param.name}>
                <td className="px-4 py-3">
                  <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs">
                    {param.name}
                  </code>
                  {param.required && (
                    <span className="ml-2 text-xs text-red-500">*</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  <span className="text-teal">{param.type}</span>
                </td>
                <td className="px-4 py-3 text-slate">{param.default || "-"}</td>
                <td className="px-4 py-3 text-slate">{param.description}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
