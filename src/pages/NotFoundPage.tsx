import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Home } from 'lucide-react';
import { motion } from 'framer-motion';
import SEO from '../components/common/SEO';

const notFoundSchema = `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "404 Not Found | SoundAlchemy",
  "description": "Page not found on SoundAlchemy. Discover global musicians, orchestras, and more. Powered by Lehan Kawshila.",
  "url": "https://soundalcmy.com/404"
}`;

const NotFoundPage: React.FC = () => {
  return (
    <>
      <SEO
        title="404 Not Found | SoundAlchemy – Global Musicians & Music Platform"
        description="Page not found on SoundAlchemy. Discover global musicians, orchestras, and more. Powered by Lehan Kawshila."
        keywords="soundalcmy, soundalchemy, music, not found, 404, global musicians, lehan kawshila, orchestra, guitar, world wide"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/404"
        lang="en"
        schema={notFoundSchema}
      />
      <div className="min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center max-w-md"
        >
          <div className="flex justify-center mb-6">
            <div className="relative">
              <Music size={80} className="text-primary-500" />
              <div className="absolute top-0 right-0 text-5xl font-bold text-secondary-500">?</div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-bold mb-4">404</h1>
          <h2 className="text-2xl md:text-3xl font-semibold mb-6">Page Not Found</h2>
          
          <p className="text-gray-400 mb-8">
            The page you're looking for doesn't exist or has been moved.
            Let's get you back to making music!
          </p>
          
          <Link to="/" className="btn-primary inline-flex items-center">
            <Home size={18} className="mr-2" />
            Return to Home
          </Link>
        </motion.div>
      </div>
    </>
  );
};

export default NotFoundPage;