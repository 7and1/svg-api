import type { Metadata } from "next";
import { CodeBlock } from "../../../components/docs";

export const metadata: Metadata = {
  title: "Troubleshooting - SVG API",
  description:
    "Common errors and solutions for SVG API. Find help with 404 errors, rate limiting, CORS issues, and more.",
};

export default function TroubleshootingPage() {
  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs uppercase tracking-[0.3em] text-slate">
          Troubleshooting
        </p>
        <h1 className="font-display text-3xl font-semibold md:text-4xl">
          Troubleshooting
        </h1>
        <p className="mt-3 text-slate">
          Common issues and how to resolve them.
        </p>
      </div>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Icon not found (404)</h2>
        <p className="mt-3 text-sm text-slate">
          If you receive a 404 error when requesting an icon, try these solutions:
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold">Check icon name spelling</h3>
            <p className="mt-2 text-sm text-slate">
              Icon names use kebab-case (lowercase with hyphens). Common mistakes include:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li>Using spaces instead of hyphens: <code className="rounded bg-ink/10 px-1">arrow right</code> → <code className="rounded bg-ink/10 px-1">arrow-right</code></li>
              <li>Using camelCase: <code className="rounded bg-ink/10 px-1">arrowRight</code> → <code className="rounded bg-ink/10 px-1">arrow-right</code></li>
              <li>Using underscores: <code className="rounded bg-ink/10 px-1">arrow_right</code> → <code className="rounded bg-ink/10 px-1">arrow-right</code></li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">Try searching without source parameter</h3>
            <p className="mt-2 text-sm text-slate">
              If you are unsure which source contains the icon, use the search endpoint to find it across all sources:
            </p>
            <div className="mt-3">
              <CodeBlock
                code={`curl "https://svg-api.org/v1/search?q=home"`}
                language="bash"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold">Check available sources</h3>
            <p className="mt-2 text-sm text-slate">
              Verify the source library exists and contains the icon you need:
            </p>
            <div className="mt-3">
              <CodeBlock
                code={`curl "https://svg-api.org/v1/sources"`}
                language="bash"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">Rate limiting (429)</h2>
        <p className="mt-3 text-sm text-slate">
          If you are receiving 429 Too Many Requests errors, here is what you need to know:
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold">Understanding rate limits</h3>
            <p className="mt-2 text-sm text-slate">
              SVG API has tiered rate limits to ensure fair usage:
            </p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-black/10 text-left">
                    <th className="pb-3 font-semibold">Tier</th>
                    <th className="pb-3 font-semibold">Requests/min</th>
                    <th className="pb-3 font-semibold">Requests/day</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5">
                  <tr>
                    <td className="py-3">Anonymous</td>
                    <td className="py-3">60</td>
                    <td className="py-3">1,000</td>
                  </tr>
                  <tr>
                    <td className="py-3">Registered</td>
                    <td className="py-3">300</td>
                    <td className="py-3">10,000</td>
                  </tr>
                  <tr>
                    <td className="py-3">Pro</td>
                    <td className="py-3">1,000</td>
                    <td className="py-3">100,000</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h3 className="font-semibold">How to implement caching</h3>
            <p className="mt-2 text-sm text-slate">
              Reduce API calls by caching responses. Icons are cached for 24 hours by default:
            </p>
            <div className="mt-3">
              <CodeBlock
                code={`// Example: Cache icons in localStorage
async function getIcon(name, source = 'lucide') {
  const cacheKey = \`icon:\${source}:\${name}\`;
  const cached = localStorage.getItem(cacheKey);

  if (cached) {
    return cached;
  }

  const response = await fetch(\`https://svg-api.org/v1/icons/\${name}?source=\${source}\`);
  const svg = await response.text();

  localStorage.setItem(cacheKey, svg);
  return svg;
}`}
                language="javascript"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold">Requesting higher limits</h3>
            <p className="mt-2 text-sm text-slate">
              If you need higher rate limits for production use:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li>Register for a free account to increase limits to 300 req/min</li>
              <li>Contact us for Pro tier access if you need 1,000+ req/min</li>
              <li>Consider using batch requests to fetch multiple icons in one call</li>
            </ul>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">CORS issues</h2>
        <p className="mt-3 text-sm text-slate">
          Cross-Origin Resource Sharing errors can occur when using the API from browser-based applications.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold">Common CORS errors</h3>
            <p className="mt-2 text-sm text-slate">
              You may see errors like:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li><code className="rounded bg-ink/10 px-1">Access-Control-Allow-Origin</code> header missing</li>
              <li>Request blocked by CORS policy</li>
              <li>Preflight request failed</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">How to configure your application</h3>
            <p className="mt-2 text-sm text-slate">
              SVG API supports CORS for all origins. If you are experiencing issues:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li>Ensure you are using the correct URL: <code className="rounded bg-ink/10 px-1">https://svg-api.org</code></li>
              <li>For img tags, no special configuration is needed</li>
              <li>For fetch requests, ensure you are not sending custom headers that trigger preflight</li>
            </ul>
            <div className="mt-3">
              <CodeBlock
                code={`// Correct: Simple fetch request
fetch('https://svg-api.org/v1/icons/home?source=lucide')
  .then(res => res.text())
  .then(svg => console.log(svg));

// For JSON responses, add Accept header
fetch('https://svg-api.org/v1/icons/home?source=lucide', {
  headers: { 'Accept': 'application/json' }
})
  .then(res => res.json())
  .then(data => console.log(data));`}
                language="javascript"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">SVG rendering problems</h2>
        <p className="mt-3 text-sm text-slate">
          Issues with how SVGs display in your application.
        </p>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold">Browser compatibility</h3>
            <p className="mt-2 text-sm text-slate">
              SVGs from the API work in all modern browsers. If you see issues:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li>Ensure you are using an up-to-date browser (Chrome, Firefox, Safari, Edge)</li>
              <li>Check that your Content Security Policy allows SVG data</li>
              <li>Verify the SVG is being inserted correctly (not escaped as text)</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">CSS styling issues</h3>
            <p className="mt-2 text-sm text-slate">
              If CSS styles are not applying to your SVGs:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li>Use <code className="rounded bg-ink/10 px-1">currentColor</code> for the color parameter to inherit from CSS</li>
              <li>When using img tags, CSS cannot style internal SVG elements</li>
              <li>Inline the SVG directly in HTML for full CSS control</li>
            </ul>
            <div className="mt-3">
              <CodeBlock
                code={`<!-- CSS can style this -->
<svg class="icon">...</svg>

<!-- CSS cannot style internal SVG paths -->
<img src="https://svg-api.org/v1/icons/home?source=lucide" class="icon" />

<style>
  .icon {
    color: #3b82f6; /* Works with currentColor */
    width: 24px;
    height: 24px;
  }
</style>`}
                language="html"
              />
            </div>
          </div>

          <div>
            <h3 className="font-semibold">Size and color customization</h3>
            <p className="mt-2 text-sm text-slate">
              Best practices for customizing icon appearance:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li>Use the <code className="rounded bg-ink/10 px-1">size</code> parameter (8-512) for consistent dimensions</li>
              <li>URL-encode the <code className="rounded bg-ink/10 px-1">#</code> in hex colors as <code className="rounded bg-ink/10 px-1">%23</code></li>
              <li>Use <code className="rounded bg-ink/10 px-1">stroke</code> parameter (0.5-3) to adjust line thickness</li>
            </ul>
            <div className="mt-3">
              <CodeBlock
                code={`<!-- Size and color via URL parameters -->
<img src="https://svg-api.org/v1/icons/heart?source=lucide&size=32&color=%23ef4444" alt="Heart" />

<!-- Or use currentColor for CSS control -->
<img src="https://svg-api.org/v1/icons/heart?source=lucide&color=currentColor" class="text-red-500 w-8 h-8" alt="Heart" />`}
                language="html"
              />
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-black/10 bg-white/80 p-6">
        <h2 className="font-display text-xl font-semibold">FAQ</h2>

        <div className="mt-6 space-y-6">
          <div>
            <h3 className="font-semibold">Can I use this commercially?</h3>
            <p className="mt-2 text-sm text-slate">
              Yes. SVG API is free and open source. All icons retain their original licenses
              (typically MIT, ISC, or Apache 2.0). You can use them in commercial projects
              without attribution, though we recommend checking the specific license of the
              icon source you are using.
            </p>
          </div>

          <div>
            <h3 className="font-semibold">How do I report a bug?</h3>
            <p className="mt-2 text-sm text-slate">
              If you encounter an issue with the API:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li>Check the request ID in the response headers for reference</li>
              <li>Include the exact URL and parameters you used</li>
              <li>Describe the expected vs actual behavior</li>
              <li>Open an issue on our GitHub repository</li>
            </ul>
          </div>

          <div>
            <h3 className="font-semibold">How to request new features?</h3>
            <p className="mt-2 text-sm text-slate">
              We welcome feature requests:
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate">
              <li>Open a GitHub issue with the "feature request" label</li>
              <li>Describe your use case and why the feature would be valuable</li>
              <li>For new icon sources, provide a link to the library and its license</li>
              <li>Vote on existing feature requests to help us prioritize</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
