# SVG-API.org Frontend Components

> Next.js 14 (App Router) + Tailwind CSS + shadcn/ui

---

## Table of Contents

1. [Layout Components](#1-layout-components)
2. [Landing Page Components](#2-landing-page-components)
3. [Documentation Components](#3-documentation-components)
4. [Icon Browser Components](#4-icon-browser-components)
5. [Interactive Demo Components](#5-interactive-demo-components)
6. [Shared Components](#6-shared-components)

---

## 1. Layout Components

### Header

Primary navigation component with branding, search, and theme controls.

```typescript
interface HeaderProps {
  className?: string;
}
```

**Structure:**

```tsx
<header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
  <div className="container flex h-16 items-center justify-between">
    {/* Logo */}
    <Link href="/" className="flex items-center gap-2">
      <Logo className="h-8 w-8" />
      <span className="font-bold text-xl">svg-api</span>
    </Link>

    {/* Desktop Nav */}
    <nav className="hidden md:flex items-center gap-6">
      <NavLink href="/docs">Docs</NavLink>
      <NavLink href="/api">API</NavLink>
      <NavLink href="/pricing">Pricing</NavLink>
      <NavLink href="https://github.com/svg-api" external>
        GitHub
      </NavLink>
    </nav>

    {/* Search + Actions */}
    <div className="flex items-center gap-4">
      <SearchTrigger />
      <ThemeToggle />
      <MobileMenu className="md:hidden" />
    </div>
  </div>
</header>
```

**Accessibility:**

- `role="banner"` on header
- Skip link to main content
- Keyboard navigable menu
- Focus visible states
- ARIA labels on icon buttons

**Responsive:**

- Desktop: Full horizontal nav
- Tablet: Condensed nav, search icon
- Mobile: Hamburger menu, slide-out drawer

---

### Footer

Site-wide footer with links, social, and attribution.

```typescript
interface FooterProps {
  className?: string;
}

interface FooterSection {
  title: string;
  links: Array<{
    label: string;
    href: string;
    external?: boolean;
  }>;
}
```

**Structure:**

```tsx
<footer className="border-t bg-muted/30">
  <div className="container py-12 md:py-16">
    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
      {/* Brand Column */}
      <div className="col-span-2 md:col-span-1">
        <Logo className="h-8 w-8 mb-4" />
        <p className="text-sm text-muted-foreground max-w-xs">
          Universal SVG icon API. Access 200k+ icons from one endpoint.
        </p>
        <SocialLinks className="mt-4" />
      </div>

      {/* Link Sections */}
      <FooterSection title="Product" links={productLinks} />
      <FooterSection title="Resources" links={resourceLinks} />
      <FooterSection title="Legal" links={legalLinks} />
    </div>

    {/* Bottom Bar */}
    <div className="mt-12 pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4">
      <p className="text-sm text-muted-foreground">
        &copy; {year} svg-api.org. Open source under MIT.
      </p>
      <StatusIndicator />
    </div>
  </div>
</footer>
```

**Accessibility:**

- `role="contentinfo"` on footer
- External link indicators
- Social links with descriptive labels

**Responsive:**

- Desktop: 4-column grid
- Tablet: 2-column grid
- Mobile: Stacked sections

---

### Sidebar (Documentation)

Collapsible navigation for documentation pages.

```typescript
interface SidebarProps {
  items: SidebarSection[];
  className?: string;
}

interface SidebarSection {
  title: string;
  items: SidebarItem[];
}

interface SidebarItem {
  label: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  badge?: string;
  items?: SidebarItem[]; // Nested items
}
```

**Structure:**

```tsx
<aside className="fixed top-16 left-0 z-30 hidden lg:block w-64 h-[calc(100vh-4rem)] border-r bg-background overflow-y-auto">
  <div className="py-6 px-4">
    {sections.map((section) => (
      <div key={section.title} className="mb-6">
        <h4 className="px-2 mb-2 text-sm font-semibold text-foreground">
          {section.title}
        </h4>
        <nav className="space-y-1">
          {section.items.map((item) => (
            <SidebarLink
              key={item.href}
              item={item}
              isActive={pathname === item.href}
            />
          ))}
        </nav>
      </div>
    ))}
  </div>
</aside>;

{
  /* Mobile Sidebar */
}
<Sheet>
  <SheetTrigger asChild>
    <Button variant="ghost" size="icon" className="lg:hidden">
      <Menu className="h-5 w-5" />
    </Button>
  </SheetTrigger>
  <SheetContent side="left" className="w-64 p-0">
    {/* Same content as desktop */}
  </SheetContent>
</Sheet>;
```

**Active State Tracking:**

```tsx
const SidebarLink = ({
  item,
  isActive,
}: {
  item: SidebarItem;
  isActive: boolean;
}) => (
  <Link
    href={item.href}
    className={cn(
      "flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
      isActive
        ? "bg-primary/10 text-primary font-medium"
        : "text-muted-foreground hover:text-foreground hover:bg-muted",
    )}
  >
    {item.icon && <item.icon className="h-4 w-4" />}
    {item.label}
    {item.badge && (
      <Badge variant="secondary" className="ml-auto text-xs">
        {item.badge}
      </Badge>
    )}
  </Link>
);
```

**Accessibility:**

- `role="navigation"` with `aria-label`
- `aria-current="page"` for active link
- Collapsible sections with `aria-expanded`
- Keyboard navigation support

**Responsive:**

- Desktop (lg+): Fixed sidebar, 256px width
- Mobile/Tablet: Sheet drawer, triggered by menu button

---

## 2. Landing Page Components

### HeroSection

Primary landing section with live demo.

```typescript
interface HeroSectionProps {
  className?: string;
}
```

**Structure:**

```tsx
<section className="relative overflow-hidden py-20 md:py-32">
  {/* Background Gradient */}
  <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
  <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent" />

  <div className="container relative">
    <div className="max-w-3xl mx-auto text-center">
      {/* Badge */}
      <Badge variant="secondary" className="mb-4">
        <Sparkles className="h-3 w-3 mr-1" />
        200,000+ icons from 10+ sources
      </Badge>

      {/* Headline */}
      <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
        One API for{" "}
        <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-primary/60">
          every icon
        </span>
      </h1>

      {/* Subheadline */}
      <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
        Access Lucide, Heroicons, Font Awesome, and more through a single,
        lightning-fast edge API. No packages, no build steps.
      </p>

      {/* Live Demo */}
      <LiveIconDemo className="mb-8" />

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button size="lg" asChild>
          <Link href="/docs/quickstart">
            Get Started
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
        <Button size="lg" variant="outline" asChild>
          <Link href="/docs">View Docs</Link>
        </Button>
      </div>
    </div>
  </div>
</section>
```

**Live Demo Component:**

```tsx
const LiveIconDemo = ({ className }: { className?: string }) => {
  const [query, setQuery] = useState("arrow");
  const [icons, setIcons] = useState<Icon[]>([]);
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery) {
      fetchIcons(debouncedQuery).then(setIcons);
    }
  }, [debouncedQuery]);

  return (
    <div className={cn("max-w-xl mx-auto", className)}>
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search icons..."
          className="pl-12 h-14 text-lg rounded-full border-2 focus:border-primary"
        />
      </div>
      <div className="mt-4 flex justify-center gap-2 min-h-[48px]">
        {icons.slice(0, 6).map((icon) => (
          <IconPreview key={icon.id} icon={icon} />
        ))}
      </div>
    </div>
  );
};
```

**Accessibility:**

- Semantic heading hierarchy
- Live region for icon results
- Input with proper label

**Responsive:**

- Desktop: Large typography, horizontal CTAs
- Mobile: Smaller text, stacked CTAs

---

### FeatureGrid

Highlights key product features.

```typescript
interface FeatureGridProps {
  className?: string;
}

interface Feature {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
}
```

**Structure:**

```tsx
<section className="py-20 md:py-28">
  <div className="container">
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold mb-4">Why svg-api?</h2>
      <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
        Built for developers who want icons without the overhead.
      </p>
    </div>

    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {features.map((feature) => (
        <FeatureCard key={feature.title} feature={feature} />
      ))}
    </div>
  </div>
</section>;

const FeatureCard = ({ feature }: { feature: Feature }) => (
  <Card className="relative overflow-hidden group hover:shadow-lg transition-shadow">
    <CardHeader>
      <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
        <feature.icon className="h-6 w-6 text-primary" />
      </div>
      <CardTitle className="text-xl">{feature.title}</CardTitle>
    </CardHeader>
    <CardContent>
      <p className="text-muted-foreground">{feature.description}</p>
    </CardContent>
  </Card>
);
```

**Features Data:**

```typescript
const features: Feature[] = [
  {
    icon: Zap,
    title: "Edge-fast",
    description:
      "Served from 300+ edge locations worldwide. Sub-50ms response times.",
  },
  {
    icon: Layers,
    title: "10+ sources",
    description: "Lucide, Heroicons, Font Awesome, Material, Tabler, and more.",
  },
  {
    icon: Gift,
    title: "Free tier",
    description: "100,000 requests/month free. No credit card required.",
  },
  {
    icon: Code2,
    title: "Simple API",
    description: "One URL pattern. Works with <img>, CSS, or fetch.",
  },
];
```

**Accessibility:**

- Cards are not focusable (decorative)
- Semantic headings within cards

**Responsive:**

- Desktop: 4-column grid
- Tablet: 2-column grid
- Mobile: Single column

---

### CodeExample

Syntax-highlighted code with tabs and copy functionality.

```typescript
interface CodeExampleProps {
  examples: CodeTab[];
  className?: string;
}

interface CodeTab {
  language: string;
  label: string;
  code: string;
}
```

**Structure:**

```tsx
<section className="py-20 bg-muted/30">
  <div className="container">
    <div className="max-w-3xl mx-auto">
      <h2 className="text-3xl font-bold text-center mb-8">Start in seconds</h2>

      <Tabs defaultValue="curl" className="w-full">
        <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0">
          {examples.map((example) => (
            <TabsTrigger
              key={example.language}
              value={example.language}
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent"
            >
              {example.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {examples.map((example) => (
          <TabsContent key={example.language} value={example.language}>
            <CodeBlock
              code={example.code}
              language={example.language}
              showLineNumbers
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </div>
</section>
```

**CodeBlock Component:**

```tsx
interface CodeBlockProps {
  code: string;
  language: string;
  showLineNumbers?: boolean;
  className?: string;
}

const CodeBlock = ({
  code,
  language,
  showLineNumbers,
  className,
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={cn("relative group rounded-lg overflow-hidden", className)}>
      <div className="absolute top-3 right-3 z-10">
        <Button
          variant="ghost"
          size="icon"
          onClick={copyToClipboard}
          className="opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-500" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>

      <Highlight theme={themes.nightOwl} code={code.trim()} language={language}>
        {({ className, style, tokens, getLineProps, getTokenProps }) => (
          <pre
            className={cn(
              "p-4 overflow-x-auto text-sm",
              showLineNumbers && "pl-12",
              className,
            )}
            style={style}
          >
            {tokens.map((line, i) => (
              <div key={i} {...getLineProps({ line })} className="table-row">
                {showLineNumbers && (
                  <span className="table-cell pr-4 text-right text-muted-foreground select-none">
                    {i + 1}
                  </span>
                )}
                <span className="table-cell">
                  {line.map((token, key) => (
                    <span key={key} {...getTokenProps({ token })} />
                  ))}
                </span>
              </div>
            ))}
          </pre>
        )}
      </Highlight>
    </div>
  );
};
```

**Example Data:**

```typescript
const examples: CodeTab[] = [
  {
    language: "bash",
    label: "cURL",
    code: `curl "https://svg-api.org/lucide/arrow-right?color=blue"`,
  },
  {
    language: "javascript",
    label: "JavaScript",
    code: `// Using fetch
const response = await fetch("https://svg-api.org/lucide/arrow-right");
const svg = await response.text();

// Or directly in img tag
<img src="https://svg-api.org/lucide/arrow-right" alt="Arrow" />`,
  },
  {
    language: "python",
    label: "Python",
    code: `import requests

response = requests.get("https://svg-api.org/lucide/arrow-right")
svg = response.text`,
  },
];
```

**Accessibility:**

- Tab panels properly labeled
- Copy button announces state
- Code block scrollable with keyboard

**Responsive:**

- Full width on all screens
- Horizontal scroll for long lines

---

### IconShowcase

Grid of popular icons with interaction.

```typescript
interface IconShowcaseProps {
  icons: IconPreviewData[];
  className?: string;
}

interface IconPreviewData {
  source: string;
  name: string;
  url: string;
}
```

**Structure:**

```tsx
<section className="py-20">
  <div className="container">
    <h2 className="text-3xl font-bold text-center mb-4">Popular icons</h2>
    <p className="text-center text-muted-foreground mb-12">
      Hover to preview, click to copy URL
    </p>

    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-4">
      {icons.map((icon) => (
        <IconShowcaseItem key={`${icon.source}-${icon.name}`} icon={icon} />
      ))}
    </div>
  </div>
</section>;

const IconShowcaseItem = ({ icon }: { icon: IconPreviewData }) => {
  const [copied, setCopied] = useState(false);

  const handleClick = async () => {
    await navigator.clipboard.writeText(icon.url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={handleClick}
            className={cn(
              "aspect-square p-3 rounded-lg border bg-background",
              "hover:border-primary hover:bg-primary/5 transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              copied && "border-green-500 bg-green-50 dark:bg-green-950",
            )}
            aria-label={`${icon.name} from ${icon.source}`}
          >
            <img
              src={icon.url}
              alt={icon.name}
              className="w-full h-full object-contain dark:invert"
              loading="lazy"
            />
          </button>
        </TooltipTrigger>
        <TooltipContent>
          <p className="font-medium">{icon.name}</p>
          <p className="text-xs text-muted-foreground">{icon.source}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};
```

**Accessibility:**

- Buttons are keyboard accessible
- Tooltips show icon info
- Copy confirmation announced

**Responsive:**

- Desktop: 12-column grid
- Tablet: 8-column grid
- Mobile: 4-column grid

---

### PricingTable

Tiered pricing comparison.

```typescript
interface PricingTableProps {
  className?: string;
}

interface PricingTier {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  cta: {
    label: string;
    href: string;
  };
}
```

**Structure:**

```tsx
<section className="py-20 bg-muted/30">
  <div className="container">
    <div className="text-center mb-12">
      <h2 className="text-3xl md:text-4xl font-bold mb-4">
        Simple, transparent pricing
      </h2>
      <p className="text-lg text-muted-foreground">
        Start free, scale as you grow
      </p>
    </div>

    <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
      {tiers.map((tier) => (
        <PricingCard key={tier.name} tier={tier} />
      ))}
    </div>
  </div>
</section>;

const PricingCard = ({ tier }: { tier: PricingTier }) => (
  <Card
    className={cn(
      "relative flex flex-col",
      tier.highlighted && "border-primary shadow-lg scale-105",
    )}
  >
    {tier.highlighted && (
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <Badge className="bg-primary text-primary-foreground">
          Most popular
        </Badge>
      </div>
    )}

    <CardHeader>
      <CardTitle>{tier.name}</CardTitle>
      <CardDescription>{tier.description}</CardDescription>
      <div className="mt-4">
        <span className="text-4xl font-bold">{tier.price}</span>
        {tier.period && (
          <span className="text-muted-foreground">/{tier.period}</span>
        )}
      </div>
    </CardHeader>

    <CardContent className="flex-1">
      <ul className="space-y-3">
        {tier.features.map((feature) => (
          <li key={feature} className="flex items-start gap-2">
            <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>
    </CardContent>

    <CardFooter>
      <Button
        className="w-full"
        variant={tier.highlighted ? "default" : "outline"}
        asChild
      >
        <Link href={tier.cta.href}>{tier.cta.label}</Link>
      </Button>
    </CardFooter>
  </Card>
);
```

**Tiers Data:**

```typescript
const tiers: PricingTier[] = [
  {
    name: "Free",
    price: "$0",
    period: "forever",
    description: "For personal projects and testing",
    features: [
      "100,000 requests/month",
      "All icon sources",
      "Basic transformations",
      "Community support",
    ],
    cta: { label: "Get started", href: "/signup" },
  },
  {
    name: "Pro",
    price: "$19",
    period: "month",
    description: "For growing teams and apps",
    features: [
      "1,000,000 requests/month",
      "All icon sources",
      "Advanced transformations",
      "Priority CDN",
      "Email support",
      "Usage analytics",
    ],
    highlighted: true,
    cta: { label: "Start free trial", href: "/signup?plan=pro" },
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For large-scale applications",
    features: [
      "Unlimited requests",
      "Dedicated infrastructure",
      "Custom icon uploads",
      "SLA guarantee",
      "24/7 support",
      "SSO & audit logs",
    ],
    cta: { label: "Contact sales", href: "/contact" },
  },
];
```

**Accessibility:**

- Cards are semantic article elements
- Feature lists properly structured
- Focus states on buttons

**Responsive:**

- Desktop: 3-column grid, highlighted card scaled
- Mobile: Stacked cards, no scale effect

---

## 3. Documentation Components

### ApiEndpoint

Displays a single API endpoint with details.

```typescript
interface ApiEndpointProps {
  method: "GET" | "POST" | "PUT" | "DELETE";
  path: string;
  description: string;
  parameters?: Parameter[];
  requestBody?: {
    type: string;
    example: string;
  };
  responses: Response[];
  className?: string;
}

interface Parameter {
  name: string;
  in: "path" | "query" | "header";
  type: string;
  required: boolean;
  description: string;
  default?: string;
}

interface Response {
  status: number;
  description: string;
  example?: string;
}
```

**Structure:**

```tsx
<div className={cn("border rounded-lg overflow-hidden", className)}>
  {/* Header */}
  <div className="flex items-center gap-3 p-4 bg-muted/50 border-b">
    <MethodBadge method={method} />
    <code className="text-sm font-mono flex-1">
      <HighlightedPath path={path} />
    </code>
    <TryItButton endpoint={{ method, path }} />
  </div>

  {/* Content */}
  <div className="p-4 space-y-6">
    <p className="text-muted-foreground">{description}</p>

    {parameters && parameters.length > 0 && (
      <div>
        <h4 className="font-semibold mb-3">Parameters</h4>
        <ParamTable parameters={parameters} />
      </div>
    )}

    {requestBody && (
      <div>
        <h4 className="font-semibold mb-3">Request Body</h4>
        <CodeBlock code={requestBody.example} language="json" />
      </div>
    )}

    <div>
      <h4 className="font-semibold mb-3">Responses</h4>
      <Tabs defaultValue={responses[0].status.toString()}>
        <TabsList>
          {responses.map((res) => (
            <TabsTrigger key={res.status} value={res.status.toString()}>
              <StatusBadge status={res.status} />
            </TabsTrigger>
          ))}
        </TabsList>
        {responses.map((res) => (
          <TabsContent key={res.status} value={res.status.toString()}>
            <p className="text-sm text-muted-foreground mb-2">
              {res.description}
            </p>
            {res.example && <CodeBlock code={res.example} language="json" />}
          </TabsContent>
        ))}
      </Tabs>
    </div>
  </div>
</div>;

const MethodBadge = ({ method }: { method: string }) => {
  const colors = {
    GET: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    POST: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    PUT: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    DELETE: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };

  return (
    <span className={cn("px-2 py-1 rounded text-xs font-bold", colors[method])}>
      {method}
    </span>
  );
};

const HighlightedPath = ({ path }: { path: string }) => {
  // Highlight path parameters like {source} and {name}
  const parts = path.split(/(\{[^}]+\})/);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("{") ? (
          <span key={i} className="text-primary">
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
};
```

**Accessibility:**

- Method badges have semantic meaning
- Tab panels properly labeled
- Try It button clearly labeled

**Responsive:**

- Full width on all screens
- Code blocks scroll horizontally

---

### ParamTable

Displays API parameters in a table format.

```typescript
interface ParamTableProps {
  parameters: Parameter[];
  className?: string;
}
```

**Structure:**

```tsx
<div className={cn("overflow-x-auto", className)}>
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead className="w-[150px]">Name</TableHead>
        <TableHead className="w-[100px]">Type</TableHead>
        <TableHead className="w-[80px]">Required</TableHead>
        <TableHead>Description</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {parameters.map((param) => (
        <TableRow key={param.name}>
          <TableCell>
            <code className="text-sm bg-muted px-1.5 py-0.5 rounded">
              {param.name}
            </code>
            {param.in !== "query" && (
              <Badge variant="outline" className="ml-2 text-xs">
                {param.in}
              </Badge>
            )}
          </TableCell>
          <TableCell>
            <code className="text-sm text-muted-foreground">{param.type}</code>
          </TableCell>
          <TableCell>
            {param.required ? (
              <Badge variant="destructive" className="text-xs">
                Required
              </Badge>
            ) : (
              <span className="text-muted-foreground text-sm">Optional</span>
            )}
          </TableCell>
          <TableCell>
            <p className="text-sm">{param.description}</p>
            {param.default && (
              <p className="text-xs text-muted-foreground mt-1">
                Default: <code>{param.default}</code>
              </p>
            )}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</div>
```

**Accessibility:**

- Proper table semantics
- Required fields clearly marked
- Sortable columns (optional enhancement)

**Responsive:**

- Horizontal scroll on mobile
- Minimum column widths maintained

---

### ResponseSchema

JSON response with collapsible nested objects.

```typescript
interface ResponseSchemaProps {
  schema: SchemaNode;
  className?: string;
}

interface SchemaNode {
  type: "object" | "array" | "string" | "number" | "boolean";
  description?: string;
  properties?: Record<string, SchemaNode>;
  items?: SchemaNode;
  example?: unknown;
}
```

**Structure:**

```tsx
const ResponseSchema = ({ schema, className }: ResponseSchemaProps) => {
  return (
    <div className={cn("font-mono text-sm", className)}>
      <SchemaTree node={schema} depth={0} />
    </div>
  );
};

const SchemaTree = ({
  node,
  depth,
  name,
}: {
  node: SchemaNode;
  depth: number;
  name?: string;
}) => {
  const [expanded, setExpanded] = useState(depth < 2);
  const indent = depth * 16;

  if (node.type === "object" && node.properties) {
    const entries = Object.entries(node.properties);

    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-1 hover:bg-muted rounded px-1 -ml-1"
          style={{ paddingLeft: indent }}
        >
          <ChevronRight
            className={cn(
              "h-4 w-4 transition-transform",
              expanded && "rotate-90",
            )}
          />
          {name && <span className="text-primary">{name}</span>}
          <span className="text-muted-foreground">{"{"}</span>
          {!expanded && <span className="text-muted-foreground">...{"}"}</span>}
        </button>

        {expanded && (
          <>
            {entries.map(([key, value]) => (
              <SchemaTree key={key} node={value} depth={depth + 1} name={key} />
            ))}
            <div style={{ paddingLeft: indent }}>
              <span className="text-muted-foreground">{"}"}</span>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex items-center gap-2 py-0.5"
      style={{ paddingLeft: indent + 20 }}
    >
      <span className="text-primary">{name}</span>
      <span className="text-muted-foreground">:</span>
      <TypeBadge type={node.type} />
      {node.description && (
        <span className="text-muted-foreground text-xs">
          // {node.description}
        </span>
      )}
    </div>
  );
};

const TypeBadge = ({ type }: { type: string }) => {
  const colors = {
    string: "text-green-600 dark:text-green-400",
    number: "text-blue-600 dark:text-blue-400",
    boolean: "text-purple-600 dark:text-purple-400",
    array: "text-orange-600 dark:text-orange-400",
    object: "text-yellow-600 dark:text-yellow-400",
  };

  return <span className={cn("text-xs", colors[type])}>{type}</span>;
};
```

**Accessibility:**

- Collapsible sections with `aria-expanded`
- Keyboard navigation support
- Type information conveyed visually and semantically

**Responsive:**

- Horizontal scroll for deep nesting
- Touch-friendly collapse toggles

---

## 4. Icon Browser Components

### SearchInput

Debounced search with filters.

```typescript
interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSourceChange?: (source: string | null) => void;
  onCategoryChange?: (category: string | null) => void;
  sources: string[];
  categories: string[];
  className?: string;
}
```

**Structure:**

```tsx
<div className={cn("space-y-4", className)}>
  {/* Main Search */}
  <div className="relative">
    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
    <Input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder="Search 200,000+ icons..."
      className="pl-10 pr-10"
    />
    {value && (
      <Button
        variant="ghost"
        size="icon"
        className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
        onClick={() => onChange("")}
      >
        <X className="h-4 w-4" />
      </Button>
    )}
  </div>

  {/* Filters */}
  <div className="flex flex-wrap gap-2">
    <Select onValueChange={onSourceChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All sources" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All sources</SelectItem>
        {sources.map((source) => (
          <SelectItem key={source} value={source}>
            {source}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    <Select onValueChange={onCategoryChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue placeholder="All categories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all">All categories</SelectItem>
        {categories.map((category) => (
          <SelectItem key={category} value={category}>
            {category}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
</div>
```

**Debounce Hook:**

```typescript
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
```

**Accessibility:**

- Input has proper label (visually hidden if needed)
- Clear button announced
- Filter dropdowns labeled

**Responsive:**

- Full width search on all screens
- Filters wrap on mobile

---

### IconGrid

Virtualized grid for large icon sets.

```typescript
interface IconGridProps {
  icons: IconData[];
  loading?: boolean;
  onIconClick: (icon: IconData) => void;
  className?: string;
}

interface IconData {
  id: string;
  name: string;
  source: string;
  url: string;
  categories: string[];
}
```

**Structure:**

```tsx
import { useVirtualizer } from "@tanstack/react-virtual";

const IconGrid = ({
  icons,
  loading,
  onIconClick,
  className,
}: IconGridProps) => {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(6);

  // Responsive columns
  useEffect(() => {
    const updateColumns = () => {
      const width = parentRef.current?.offsetWidth ?? 0;
      if (width < 640) setColumns(4);
      else if (width < 768) setColumns(6);
      else if (width < 1024) setColumns(8);
      else setColumns(10);
    };

    updateColumns();
    window.addEventListener("resize", updateColumns);
    return () => window.removeEventListener("resize", updateColumns);
  }, []);

  const rows = Math.ceil(icons.length / columns);

  const virtualizer = useVirtualizer({
    count: rows,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88, // Row height
    overscan: 5,
  });

  if (loading) {
    return <IconGridSkeleton columns={columns} />;
  }

  if (icons.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <SearchX className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="font-semibold mb-1">No icons found</h3>
        <p className="text-sm text-muted-foreground">
          Try adjusting your search or filters
        </p>
      </div>
    );
  }

  return (
    <div ref={parentRef} className={cn("h-[600px] overflow-auto", className)}>
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columns;
          const rowIcons = icons.slice(startIndex, startIndex + columns);

          return (
            <div
              key={virtualRow.key}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: virtualRow.size,
                transform: `translateY(${virtualRow.start}px)`,
              }}
              className="grid gap-2"
              style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
            >
              {rowIcons.map((icon) => (
                <IconCard
                  key={icon.id}
                  icon={icon}
                  onClick={() => onIconClick(icon)}
                />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const IconGridSkeleton = ({ columns }: { columns: number }) => (
  <div
    className="grid gap-2"
    style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
  >
    {Array.from({ length: columns * 4 }).map((_, i) => (
      <Skeleton key={i} className="aspect-square rounded-lg" />
    ))}
  </div>
);
```

**Accessibility:**

- Grid role with proper labeling
- Focus management for keyboard navigation
- Loading state announced

**Responsive:**

- Desktop: 10 columns
- Tablet: 8 columns
- Mobile: 4 columns

---

### IconCard

Individual icon preview card.

```typescript
interface IconCardProps {
  icon: IconData;
  onClick: () => void;
  className?: string;
}
```

**Structure:**

```tsx
const IconCard = ({ icon, onClick, className }: IconCardProps) => {
  const [copied, setCopied] = useState<string | null>(null);

  const copyUrl = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await navigator.clipboard.writeText(icon.url);
    setCopied("url");
    setTimeout(() => setCopied(null), 1500);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => e.key === "Enter" && onClick()}
      className={cn(
        "group relative aspect-square p-4 rounded-lg border bg-background",
        "hover:border-primary hover:shadow-md transition-all cursor-pointer",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        className,
      )}
    >
      {/* Icon Preview */}
      <img
        src={icon.url}
        alt={icon.name}
        className="w-full h-full object-contain dark:invert"
        loading="lazy"
      />

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-background/90 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
        <p className="text-xs font-medium text-center truncate w-full mb-1">
          {icon.name}
        </p>
        <Badge variant="secondary" className="text-xs">
          {icon.source}
        </Badge>
      </div>

      {/* Quick Copy */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={copyUrl}
      >
        {copied === "url" ? (
          <Check className="h-3 w-3 text-green-500" />
        ) : (
          <Link className="h-3 w-3" />
        )}
      </Button>
    </div>
  );
};
```

**Accessibility:**

- Focusable with keyboard
- Clear hover/focus states
- Alt text for icons

**Responsive:**

- Consistent aspect ratio
- Touch-friendly tap targets

---

### IconDetail

Detailed view modal/page for a single icon.

```typescript
interface IconDetailProps {
  icon: IconData | null;
  open: boolean;
  onClose: () => void;
}
```

**Structure:**

```tsx
<Dialog open={open} onOpenChange={onClose}>
  <DialogContent className="max-w-2xl">
    <DialogHeader>
      <DialogTitle className="flex items-center gap-2">
        {icon?.name}
        <Badge variant="secondary">{icon?.source}</Badge>
      </DialogTitle>
    </DialogHeader>

    <div className="grid md:grid-cols-2 gap-6">
      {/* Preview */}
      <div className="aspect-square bg-muted rounded-lg flex items-center justify-center p-8">
        <img
          src={icon?.url}
          alt={icon?.name}
          className="w-full h-full object-contain dark:invert"
        />
      </div>

      {/* Info & Actions */}
      <div className="space-y-4">
        {/* Metadata */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Source</span>
            <span className="font-medium">{icon?.source}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Name</span>
            <span className="font-medium">{icon?.name}</span>
          </div>
          {icon?.categories && (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Categories</span>
              <div className="flex gap-1">
                {icon.categories.map((cat) => (
                  <Badge key={cat} variant="outline" className="text-xs">
                    {cat}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <Separator />

        {/* Copy Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <CopyButton label="URL" value={icon?.url} icon={Link} />
          <CopyButton label="SVG" value={icon?.svg} icon={Code} />
          <CopyButton label="React" value={reactCode} icon={Braces} />
        </div>
      </div>
    </div>

    {/* Usage Examples */}
    <div className="mt-6">
      <h4 className="font-semibold mb-3">Usage</h4>
      <Tabs defaultValue="html">
        <TabsList>
          <TabsTrigger value="html">HTML</TabsTrigger>
          <TabsTrigger value="react">React</TabsTrigger>
          <TabsTrigger value="css">CSS</TabsTrigger>
        </TabsList>
        <TabsContent value="html">
          <CodeBlock
            code={`<img src="${icon?.url}" alt="${icon?.name}" />`}
            language="html"
          />
        </TabsContent>
        <TabsContent value="react">
          <CodeBlock
            code={`<img src="${icon?.url}" alt="${icon?.name}" className="h-6 w-6" />`}
            language="jsx"
          />
        </TabsContent>
        <TabsContent value="css">
          <CodeBlock
            code={`.icon { background-image: url("${icon?.url}"); }`}
            language="css"
          />
        </TabsContent>
      </Tabs>
    </div>

    {/* Related Icons */}
    {relatedIcons.length > 0 && (
      <div className="mt-6">
        <h4 className="font-semibold mb-3">Related Icons</h4>
        <div className="flex gap-2 overflow-x-auto">
          {relatedIcons.map((related) => (
            <button
              key={related.id}
              onClick={() => setIcon(related)}
              className="shrink-0 p-3 rounded-lg border hover:border-primary"
            >
              <img
                src={related.url}
                alt={related.name}
                className="h-8 w-8 dark:invert"
              />
            </button>
          ))}
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>;

const CopyButton = ({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value?: string;
  icon: React.ComponentType<{ className?: string }>;
}) => {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <Button variant="outline" onClick={copy} className="flex-col h-auto py-3">
      {copied ? (
        <Check className="h-4 w-4 text-green-500 mb-1" />
      ) : (
        <Icon className="h-4 w-4 mb-1" />
      )}
      <span className="text-xs">{label}</span>
    </Button>
  );
};
```

**Accessibility:**

- Dialog with proper focus trap
- Escape to close
- All actions keyboard accessible

**Responsive:**

- Desktop: Two-column layout in modal
- Mobile: Stacked layout, full-width modal

---

## 5. Interactive Demo Components

### Playground

Live API testing interface.

```typescript
interface PlaygroundProps {
  className?: string;
}

interface PlaygroundState {
  source: string;
  name: string;
  color: string;
  size: number;
  strokeWidth: number;
}
```

**Structure:**

```tsx
const Playground = ({ className }: PlaygroundProps) => {
  const [state, setState] = useState<PlaygroundState>({
    source: "lucide",
    name: "arrow-right",
    color: "#000000",
    size: 24,
    strokeWidth: 2,
  });
  const [response, setResponse] = useState<{
    svg: string;
    loading: boolean;
    error: string | null;
  }>({ svg: "", loading: false, error: null });

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (state.color !== "#000000") params.set("color", state.color);
    if (state.size !== 24) params.set("size", state.size.toString());
    if (state.strokeWidth !== 2)
      params.set("stroke-width", state.strokeWidth.toString());

    const query = params.toString();
    return `https://svg-api.org/${state.source}/${state.name}${query ? `?${query}` : ""}`;
  }, [state]);

  const fetchIcon = useCallback(async () => {
    setResponse((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const res = await fetch(apiUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const svg = await res.text();
      setResponse({ svg, loading: false, error: null });
    } catch (err) {
      setResponse({ svg: "", loading: false, error: err.message });
    }
  }, [apiUrl]);

  useEffect(() => {
    const debounced = setTimeout(fetchIcon, 300);
    return () => clearTimeout(debounced);
  }, [fetchIcon]);

  return (
    <div className={cn("grid lg:grid-cols-2 gap-6", className)}>
      {/* Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Parameters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Source */}
          <div className="space-y-2">
            <Label>Source</Label>
            <Select
              value={state.source}
              onValueChange={(v) => setState((s) => ({ ...s, source: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="lucide">Lucide</SelectItem>
                <SelectItem value="heroicons">Heroicons</SelectItem>
                <SelectItem value="tabler">Tabler</SelectItem>
                <SelectItem value="feather">Feather</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Name */}
          <div className="space-y-2">
            <Label>Icon Name</Label>
            <Input
              value={state.name}
              onChange={(e) =>
                setState((s) => ({ ...s, name: e.target.value }))
              }
              placeholder="arrow-right"
            />
          </div>

          {/* Color */}
          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex gap-2">
              <Input
                type="color"
                value={state.color}
                onChange={(e) =>
                  setState((s) => ({ ...s, color: e.target.value }))
                }
                className="w-12 h-10 p-1"
              />
              <Input
                value={state.color}
                onChange={(e) =>
                  setState((s) => ({ ...s, color: e.target.value }))
                }
                className="flex-1 font-mono"
              />
            </div>
          </div>

          {/* Size */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Size</Label>
              <span className="text-sm text-muted-foreground">
                {state.size}px
              </span>
            </div>
            <Slider
              value={[state.size]}
              onValueChange={([v]) => setState((s) => ({ ...s, size: v }))}
              min={12}
              max={64}
              step={1}
            />
          </div>

          {/* Stroke Width */}
          <div className="space-y-2">
            <div className="flex justify-between">
              <Label>Stroke Width</Label>
              <span className="text-sm text-muted-foreground">
                {state.strokeWidth}
              </span>
            </div>
            <Slider
              value={[state.strokeWidth]}
              onValueChange={([v]) =>
                setState((s) => ({ ...s, strokeWidth: v }))
              }
              min={0.5}
              max={4}
              step={0.5}
            />
          </div>
        </CardContent>
      </Card>

      {/* Preview & Response */}
      <div className="space-y-6">
        {/* Live Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="aspect-square max-w-[200px] mx-auto bg-muted rounded-lg flex items-center justify-center">
              {response.loading ? (
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              ) : response.error ? (
                <div className="text-center text-destructive">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">{response.error}</p>
                </div>
              ) : (
                <div
                  dangerouslySetInnerHTML={{ __html: response.svg }}
                  style={{ width: state.size, height: state.size }}
                />
              )}
            </div>
          </CardContent>
        </Card>

        {/* Generated URL */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              API URL
              <CopyButton value={apiUrl} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <code className="block p-3 bg-muted rounded-lg text-sm break-all">
              {apiUrl}
            </code>
          </CardContent>
        </Card>

        {/* Response */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Response
              <CopyButton value={response.svg} />
            </CardTitle>
          </CardHeader>
          <CardContent>
            <CodeBlock
              code={response.svg || "// Loading..."}
              language="xml"
              className="max-h-[200px] overflow-auto"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
```

**Accessibility:**

- All inputs properly labeled
- Loading/error states announced
- Keyboard accessible sliders

**Responsive:**

- Desktop: Two-column layout
- Mobile: Stacked layout

---

## 6. Shared Components

### ThemeToggle

Dark/light mode switch.

```typescript
interface ThemeToggleProps {
  className?: string;
}
```

**Structure:**

```tsx
const ThemeToggle = ({ className }: ThemeToggleProps) => {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className={className}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
    </Button>
  );
};
```

---

### SearchCommand

Command palette for global search (Cmd+K).

```typescript
interface SearchCommandProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}
```

**Structure:**

```tsx
<CommandDialog open={open} onOpenChange={onOpenChange}>
  <CommandInput placeholder="Search icons, docs, or commands..." />
  <CommandList>
    <CommandEmpty>No results found.</CommandEmpty>

    <CommandGroup heading="Icons">
      {iconResults.map((icon) => (
        <CommandItem key={icon.id} onSelect={() => navigateToIcon(icon)}>
          <img src={icon.url} className="h-4 w-4 mr-2" />
          <span>{icon.name}</span>
          <Badge variant="secondary" className="ml-auto">
            {icon.source}
          </Badge>
        </CommandItem>
      ))}
    </CommandGroup>

    <CommandGroup heading="Documentation">
      {docResults.map((doc) => (
        <CommandItem key={doc.slug} onSelect={() => navigateToDoc(doc)}>
          <FileText className="h-4 w-4 mr-2" />
          <span>{doc.title}</span>
        </CommandItem>
      ))}
    </CommandGroup>

    <CommandGroup heading="Quick Actions">
      <CommandItem onSelect={() => navigateTo("/playground")}>
        <Play className="h-4 w-4 mr-2" />
        Open Playground
      </CommandItem>
      <CommandItem onSelect={toggleTheme}>
        <Moon className="h-4 w-4 mr-2" />
        Toggle Dark Mode
      </CommandItem>
    </CommandGroup>
  </CommandList>
</CommandDialog>
```

---

### Toast Notifications

Feedback for user actions.

```typescript
// Using shadcn/ui toast
import { toast } from "@/components/ui/use-toast";

// Usage examples
toast({
  title: "Copied to clipboard",
  description: "The icon URL has been copied.",
});

toast({
  title: "Error",
  description: "Failed to fetch icon. Please try again.",
  variant: "destructive",
});
```

---

### Skeleton Loaders

Loading states for async content.

```tsx
// Icon Card Skeleton
<Skeleton className="aspect-square rounded-lg" />

// Text Skeleton
<Skeleton className="h-4 w-[200px]" />

// API Endpoint Skeleton
<div className="space-y-4">
  <Skeleton className="h-12 w-full" />
  <Skeleton className="h-4 w-3/4" />
  <Skeleton className="h-32 w-full" />
</div>
```

---

## File Structure

```
src/
  components/
    layout/
      header.tsx
      footer.tsx
      sidebar.tsx
      theme-toggle.tsx
    landing/
      hero-section.tsx
      feature-grid.tsx
      code-example.tsx
      icon-showcase.tsx
      pricing-table.tsx
    docs/
      api-endpoint.tsx
      param-table.tsx
      response-schema.tsx
    icons/
      search-input.tsx
      icon-grid.tsx
      icon-card.tsx
      icon-detail.tsx
    playground/
      playground.tsx
    shared/
      code-block.tsx
      copy-button.tsx
      search-command.tsx
    ui/
      (shadcn/ui components)
```

---

## Design Tokens

```css
/* Tailwind CSS custom properties */
:root {
  --background: 0 0% 100%;
  --foreground: 240 10% 3.9%;
  --primary: 240 5.9% 10%;
  --primary-foreground: 0 0% 98%;
  --muted: 240 4.8% 95.9%;
  --muted-foreground: 240 3.8% 46.1%;
  --border: 240 5.9% 90%;
  --radius: 0.5rem;
}

.dark {
  --background: 240 10% 3.9%;
  --foreground: 0 0% 98%;
  --primary: 0 0% 98%;
  --primary-foreground: 240 5.9% 10%;
  --muted: 240 3.7% 15.9%;
  --muted-foreground: 240 5% 64.9%;
  --border: 240 3.7% 15.9%;
}
```

---

## Performance Considerations

1. **Virtualization**: Icon grid uses @tanstack/virtual for 10k+ icons
2. **Lazy Loading**: Images use `loading="lazy"`
3. **Debounced Search**: 300ms debounce on search inputs
4. **Code Splitting**: Dynamic imports for Playground and IconDetail
5. **Image Optimization**: SVGs served from edge CDN
6. **Skeleton States**: Immediate feedback during loading

---

## Testing Checklist

- [ ] All components render without errors
- [ ] Keyboard navigation works throughout
- [ ] Screen reader announcements are accurate
- [ ] Dark mode displays correctly
- [ ] Responsive breakpoints work
- [ ] Copy functionality works
- [ ] Search returns relevant results
- [ ] Playground generates correct URLs
- [ ] Error states display properly
- [ ] Loading states appear appropriately
