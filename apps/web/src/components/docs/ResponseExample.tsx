"use client";

import { useState } from "react";
import clsx from "clsx";
import { CodeBlock } from "./CodeBlock";

interface ResponseExampleProps {
  title?: string;
  responses: {
    label: string;
    code: string;
    language?: string;
  }[];
}

export function ResponseExample({
  title = "Response",
  responses,
}: ResponseExampleProps) {
  const [activeTab, setActiveTab] = useState(0);
  const currentResponse = responses[activeTab];

  if (!currentResponse) {
    return null;
  }

  return (
    <div className="space-y-3">
      {title && <h4 className="text-sm font-semibold">{title}</h4>}
      {responses.length > 1 && (
        <div className="flex gap-2">
          {responses.map((response, i) => (
            <button
              key={i}
              onClick={() => setActiveTab(i)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-medium transition",
                activeTab === i
                  ? "bg-ink text-sand"
                  : "bg-ink/10 text-slate hover:bg-ink/20",
              )}
            >
              {response.label}
            </button>
          ))}
        </div>
      )}
      <CodeBlock
        code={currentResponse.code}
        language={currentResponse.language || "json"}
      />
    </div>
  );
}
