import { Helmet } from "react-helmet-async";

const SITE = import.meta.env.VITE_SITE_URL || "https://blazing8s.com";

interface Props {
  title: string;
  description: string;
  path?: string;
  noIndex?: boolean;
}

export function Seo({ title, description, path = "/", noIndex }: Props) {
  const url = `${SITE}${path}`;
  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      {noIndex && <meta name="robots" content="noindex,nofollow" />}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
    </Helmet>
  );
}
