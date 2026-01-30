export default function IconsLoading() {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
      {/* Breadcrumb skeleton */}
      <div className="mb-6 flex items-center gap-2">
        <div className="h-4 w-12 rounded skeleton" />
        <span className="text-slate">/</span>
        <div className="h-4 w-16 rounded skeleton" />
      </div>

      {/* Search bar skeleton */}
      <div className="mb-8">
        <div className="h-12 w-full max-w-xl rounded-2xl skeleton" />
      </div>

      {/* Filter tags skeleton */}
      <div className="mb-6 flex flex-wrap gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-8 w-20 rounded-full skeleton" />
        ))}
      </div>

      {/* Icons grid skeleton */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-black/5 bg-white/50 p-4"
          >
            <div className="h-8 w-8 rounded-lg skeleton" />
            <div className="h-3 w-16 rounded skeleton" />
          </div>
        ))}
      </div>

      {/* Pagination skeleton */}
      <div className="mt-8 flex items-center justify-center gap-2">
        <div className="h-10 w-10 rounded-lg skeleton" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-10 w-10 rounded-lg skeleton" />
        ))}
        <div className="h-10 w-10 rounded-lg skeleton" />
      </div>
    </div>
  );
}
