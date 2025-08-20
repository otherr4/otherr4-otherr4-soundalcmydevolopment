import React from 'react';
import SEO from '../components/common/SEO';
import { Link } from 'react-router-dom';

const aboutSchema = `{
  "@context": "https://schema.org",
  "@type": "AboutPage",
  "name": "About | SoundAlchemy",
  "description": "Learn about SoundAlchemy, the global music platform founded by Lehan Kawshila. Connect, collaborate, and create music with musicians worldwide.",
  "url": "https://soundalcmy.com/about",
  "mainEntity": {
    "@type": "Organization",
    "name": "SoundAlchemy",
    "url": "https://soundalcmy.com",
    "logo": "https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png",
    "founder": {
      "@type": "Person",
      "name": "Lehan Kawshila",
      "sameAs": [
        "https://www.linkedin.com/in/lehan-kawshila"
      ]
    },
    "sameAs": [
      "https://www.facebook.com/yourpage",
      "https://twitter.com/yourprofile"
    ]
  }
}`;

const AboutPage: React.FC = () => (
  <>
    <SEO
      title="About | SoundAlchemy – Global Musicians, Music Platform & Lehan Kawshila"
      description="Learn about SoundAlchemy, the global music platform founded by Lehan Kawshila. Connect, collaborate, and create music with musicians worldwide."
      keywords="soundalcmy, soundalchemy, music, about, lehan kawshila, orchestra, global musicians, guitar, world wide, platform, founder"
      image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
      url="https://soundalcmy.com/about"
      lang="en"
      schema={aboutSchema}
    />
    <div className="min-h-screen bg-dark-900 text-white flex flex-col items-center justify-center py-12 px-4">
      <div className="max-w-3xl w-full bg-dark-800 rounded-2xl shadow-xl p-8">
        <h1 className="text-4xl font-bold mb-4 text-primary-400">About SoundAlchemy</h1>
        <p className="text-lg mb-6 text-gray-300">
          <strong>SoundAlchemy</strong> is a universal platform where musicians from all over the world—regardless of nationality, religion, or culture—can connect, collaborate, and create music together. Our mission is to unite global musicians, orchestras, and creators, making music accessible and collaborative for everyone.
        </p>
        <h2 className="text-2xl font-semibold mb-2 text-secondary-400">Our Story</h2>
        <p className="mb-6 text-gray-300">
          Founded by <strong>Lehan Kawshila</strong>, SoundAlchemy was born from a passion for music and a vision to break down barriers in the music industry. Lehan is a musician, technologist, and visionary who believes in the power of music to unite people worldwide.
        </p>
        <h2 className="text-2xl font-semibold mb-2 text-secondary-400">Why SoundAlchemy?</h2>
        <ul className="list-disc list-inside mb-6 text-gray-300">
          <li>Connect with musicians, orchestras, and bands globally</li>
          <li>Collaborate on music projects, regardless of location</li>
          <li>Showcase your talent and discover new opportunities</li>
          <li>Learn, grow, and inspire through music</li>
        </ul>
        <h2 className="text-2xl font-semibold mb-2 text-secondary-400">About Lehan Kawshila</h2>
        <p className="mb-6 text-gray-300">
          Lehan Kawshila is the founder and driving force behind SoundAlchemy. With a background in music, software engineering, and global collaboration, Lehan’s vision is to empower musicians everywhere to reach their full potential.
        </p>
        <div className="flex flex-wrap gap-4 mb-8">
          <a href="https://www.linkedin.com/in/lehan-kawshila" target="_blank" rel="noopener noreferrer" className="text-blue-400 underline">Lehan on LinkedIn</a>
          <a href="https://soundalcmy.com" className="text-primary-400 underline">SoundAlchemy Home</a>
        </div>
        <div className="flex flex-wrap gap-4">
          <Link to="/register" className="btn-primary">Join Now</Link>
          <Link to="/musician/" className="btn-outline">Discover Musicians</Link>
          <Link to="/blog" className="btn-outline">Read Our Blog</Link>
        </div>
      </div>
    </div>
  </>
);

export default AboutPage; 