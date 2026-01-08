import { Playground } from "../../components/shared/Playground";

export default function PlaygroundPage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 md:px-8">
      <div className="space-y-6">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-slate">
            Playground
          </p>
          <h1 className="font-display text-3xl font-semibold md:text-4xl">
            Test the API live
          </h1>
          <p className="mt-3 text-sm text-slate">
            Generate SVGs, tweak parameters, and preview results instantly.
          </p>
        </div>
        <Playground />
      </div>
    </div>
  );
}
