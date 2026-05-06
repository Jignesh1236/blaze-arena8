import { Outlet, Link, createRootRoute, HeadContent, Scripts } from "@tanstack/react-router";

import appCss from "../styles.css?url";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { name: "theme-color", content: "#3a1a0e" },
      { title: "Blazing 8s — Real-time Multiplayer Crazy Eights" },
      { name: "description", content: "Wild West twist on Crazy Eights. Real-time multiplayer card showdown. No login — pick a handle, share a code, deal the cards." },
      { name: "author", content: "Blazing 8s" },
      { name: "keywords", content: "crazy eights, multiplayer card game, online card game, blazing 8s, wild west game" },
      { property: "og:type", content: "website" },
      { property: "og:title", content: "Blazing 8s — Wild West Card Showdown" },
      { property: "og:description", content: "Real-time multiplayer Crazy Eights with a Wild West twist." },
      { property: "og:site_name", content: "Blazing 8s" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: "Blazing 8s — Wild West Card Showdown" },
      { name: "twitter:description", content: "Real-time multiplayer Crazy Eights with a Wild West twist." },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Rye&family=Special+Elite&display=swap" },
    ],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "VideoGame",
          name: "Blazing 8s",
          description: "Real-time multiplayer Crazy Eights with a Wild West theme. Up to 6 players per room.",
          genre: ["Card Game", "Multiplayer", "Casual"],
          playMode: "MultiPlayer",
          numberOfPlayers: { "@type": "QuantitativeValue", minValue: 2, maxValue: 6 },
          applicationCategory: "Game",
          operatingSystem: "Web Browser",
          offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        }),
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  return <Outlet />;
}
