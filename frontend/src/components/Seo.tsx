import { Helmet } from "react-helmet-async";

const SITE = import.meta.env.VITE_SITE_URL || "https://blazing8s.com";
const OG_IMAGE = `${SITE}/og-image.png`;

interface Props {
  title: string;
  description: string;
  path?: string;
  keywords?: string;
  noIndex?: boolean;
}

const DEFAULT_KEYWORDS =
  "crazy eights online, multiplayer card game, wild west card game, free online card game, real-time card game, blazing 8s, play crazy eights, no login card game, browser card game";

export function Seo({ title, description, path = "/", keywords, noIndex }: Props) {
  const url = `${SITE}${path}`;
  const kw = keywords ?? DEFAULT_KEYWORDS;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={kw} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}

      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Blazing 8s" />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={OG_IMAGE} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content="Blazing 8s — Wild West Multiplayer Card Game" />
      <meta property="og:locale" content="en_US" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@blazing8s" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={OG_IMAGE} />
      <meta name="twitter:image:alt" content="Blazing 8s — Wild West Multiplayer Card Game" />
    </Helmet>
  );
}
