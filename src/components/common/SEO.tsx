import React from 'react';
import { Helmet } from 'react-helmet-async';

interface SEOProps {
  title: string;
  description: string;
  image?: string;
  url?: string;
  keywords?: string;
  lang?: string;
  schema?: string;
  children?: React.ReactNode;
}

const defaultImage = 'https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png';
const defaultUrl = 'https://soundalcmy.com/';
const defaultKeywords = 'music, sound, alchemy, guitarist, global musician, soundalcmy, soundalchemy, lehan kawshila, musicians unite, music platform';
const defaultLang = 'en';

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image = defaultImage,
  url = defaultUrl,
  keywords = defaultKeywords,
  lang = defaultLang,
  schema,
  children,
}) => (
  <Helmet htmlAttributes={{ lang }}>
    <title>{title}</title>
    <meta name="description" content={description} />
    <meta name="keywords" content={keywords} />
    <link rel="canonical" href={url} />
    {/* Open Graph */}
    <meta property="og:type" content="website" />
    <meta property="og:url" content={url} />
    <meta property="og:title" content={title} />
    <meta property="og:description" content={description} />
    <meta property="og:image" content={image} />
    {/* Twitter Card */}
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:url" content={url} />
    <meta name="twitter:title" content={title} />
    <meta name="twitter:description" content={description} />
    <meta name="twitter:image" content={image} />
    {schema && <script type="application/ld+json">{schema}</script>}
    {children}
  </Helmet>
);

export default SEO; 