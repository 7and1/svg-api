export default function DocsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-14 md:px-8">
      <div className="grid gap-10 lg:grid-cols-[240px_1fr]">
        {/* Sidebar skeleton */}
        <aside className="hidden lg:block">
          <div className="sticky top-24 space-y-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-3">
                <div className="h-4 w-24 rounded skeleton" />
                <div className="space-y-2 pl-4">
                  {Array.from({ length: 3 }).map((_, j) => (
                    <div key={j} className="h-3 w-32 rounded skeleton" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main content skeleton */}
        <div className="min-w-0 space-y-8">
          {/* Header */}
          <div className="space-y-3">
            <div className="h-3 w-32 rounded skeleton" />
            <div className="h-10 w-3/4 rounded-lg skeleton" />
            <div className="h-5 w-full max-w-xl rounded skeleton" />
          </div>

          {/* Content cards */}
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rounded-3xl border border-black/10 bg-white/80 p-6"
            >
              <div className="h-6 w-48 rounded-lg skeleton" />
              <div className="mt-4 space-y-3">
                <div className="h-4 w-full rounded skeleton" />
                <div className="h-4 w-5/6 rounded skeleton" />
                <div className="h-4 w-4/6 rounded skeleton" />
              </div>
              <div className="mt-6 grid gap-4 sm:grid-cols-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="rounded-2xl border border-black/10 bg-white/70 p-4"
                  >
                    <div className="h-8 w-16 rounded-lg skeleton" />
                    <div className="mt-2 h-3 w-20 rounded skeleton" />
                  </div>
                ))}
              </div>
            </div>
          ))}

          {/* Code block skeleton */}
          <div className="rounded-3xl border border-black/10 bg-white/80 p-6">
            <div className="h-6 w-32 rounded-lg skeleton" />
            <div className="mt-4 rounded-2xl bg-ink p-4">
              <div className="space-y-2">
                <div className="h-4 w-full max-w-md rounded skeleton bg-white/10" />
                <div className="h-4 w-full max-w-sm rounded skeleton bg-white/10" />
                <div className="h-4 w-full max-w-lg rounded skeleton bg-white/10" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
