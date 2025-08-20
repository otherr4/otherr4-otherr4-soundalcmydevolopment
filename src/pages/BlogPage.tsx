import React from 'react';
import SEO from '../components/common/SEO';
import { Link } from 'react-router-dom';

const blogSchema = `{
  "@context": "https://schema.org",
  "@type": "Blog",
  "name": "SoundAlchemy Blog",
  "description": "Music news, tips, and stories from global musicians, orchestras, and the SoundAlchemy community.",
  "url": "https://soundalcmy.com/blog"
}`;

const articles = [
  {
    slug: 'global-musicians-unite',
    title: 'Global Musicians Unite: The Power of Collaboration',
    description: 'How SoundAlchemy brings together musicians from around the world to create new music and break boundaries.',
    date: '2024-06-01',
    keywords: 'music, global musicians, collaboration, soundalcmy, soundalchemy, orchestra, lehan kawshila',
    image: 'https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png',
  },
  {
    slug: 'orchestra-tips',
    title: 'Orchestra Tips for Modern Musicians',
    description: 'Essential advice for joining, leading, and thriving in orchestras—no matter where you are in the world.',
    date: '2024-05-20',
    keywords: 'orchestra, music, tips, global musicians, soundalcmy, soundalchemy',
    image: 'https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png',
  },
  {
    slug: 'guitarist-success',
    title: 'Guitarist Success Stories on SoundAlchemy',
    description: 'Inspiring journeys of guitarists who found global audiences and collaborators through SoundAlchemy.',
    date: '2024-05-10',
    keywords: 'guitar, guitarist, music, success, soundalcmy, soundalchemy, global musicians',
    image: 'https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png',
  },
];

const BlogPage: React.FC = () => (
  <>
    <SEO
      title="Blog | SoundAlchemy – Music News, Global Musicians & Orchestra Tips"
      description="Music news, tips, and stories from global musicians, orchestras, and the SoundAlchemy community."
      keywords="soundalcmy, soundalchemy, music, blog, news, orchestra, global musicians, guitar, lehan kawshila, tips, stories"
      image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
      url="https://soundalcmy.com/blog"
      lang="en"
      schema={blogSchema}
    />
    <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center py-12 px-4">
      <div className="max-w-3xl w-full bg-dark-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold mb-6 text-primary-400">SoundAlchemy Blog</h1>
        <p className="text-lg mb-8 text-gray-300">
          Explore music news, tips, and inspiring stories from global musicians, orchestras, and the SoundAlchemy community.
        </p>
        <div className="space-y-8">
          {articles.map(article => (
            <article key={article.slug} className="bg-dark-900 rounded-xl shadow p-6 flex flex-col md:flex-row gap-6 items-center">
              <img src={article.image} alt={article.title} className="w-32 h-32 object-cover rounded-lg mb-4 md:mb-0" loading="lazy" />
              <div className="flex-1">
                <h2 className="text-2xl font-semibold mb-2 text-secondary-400">
                  <Link to={`/blog/${article.slug}`}>{article.title}</Link>
                </h2>
                <p className="mb-2 text-gray-300">{article.description}</p>
                <div className="text-sm text-gray-400 mb-2">Published: {article.date}</div>
                <Link to={`/blog/${article.slug}`} className="btn-outline">Read More</Link>
              </div>
            </article>
          ))}
        </div>
      </div>
    </div>
  </>
);

export default BlogPage; 