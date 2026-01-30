export default function SourcesLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2 text-sm">
        <div className="h-4 w-10 rounded skeleton" />
        <span className="text-slate">/</span>
        <div className="h-4 w-14 rounded skeleton" />
      </div>

      {/* Header skeleton */}
      <div className="mb-10 space-y-3">
        <div className="h-3 w-20 rounded skeleton" />
        <div className="h-10 w-64 rounded-lg skeleton" />
        <div className="h-5 w-full max-w-xl rounded skeleton" />
      </div>

      {/* Sources grid skeleton */}
      <div className="grid gap-6 md:grid-cols-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="rounded-3xl border border-black/10 bg-white/80 p-6"
          >
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <div className="h-6 w-32 rounded-lg skeleton" />
                <div className="h-4 w-40 rounded skeleton" />
              </div>
              <div className="h-6 w-16 rounded-full skeleton" />
            </div>

            <div className="mt-3 h-4 w-full max-w-sm rounded skeleton" />

            {/* Sample icons */}
            <div className="mt-4 flex gap-2">
              {Array.from({ length: 6 }).map((_, j) => (
                <div
                  key={j}
                  className="h-10 w-10 rounded-lg border border-black/10 bg-sand/60 skeleton"
                />
              ))}
            </div>

            {/* Category tags */}
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Array.from({ length: 4 }).map((_, j) => (
                <div key={j} className="h-5 w-16 rounded-full skeleton" />
              ))}
            </div>

            <div className="mt-3 h-3 w-32 rounded skeleton" />
          </div>
        ))}
      </div>

      {/* FAQ section skeleton */}
      <div className="mt-16 rounded-3xl border border-black/10 bg-white/80 p-8">
        <div className="h-7 w-48 rounded-lg skeleton" />
        <div className="mt-6 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-5 w-48 rounded skeleton" />
              <div className="h-4 w-full max-w-lg rounded skeleton" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
