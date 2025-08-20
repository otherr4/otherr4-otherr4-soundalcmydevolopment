import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Music, Globe, MessageSquare, Shield, Users, HeartHandshake } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../contexts/AuthContext';
import SEO from '../components/common/SEO';

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6 }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.2
    }
  }
};

const homepageSchema = `{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "SoundAlchemy",
  "url": "https://soundalcmy.com",
  "logo": "https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png",
  "description": "A universal platform where musicians from all over the world—guitarists, orchestras, and creators—connect, collaborate, and create music together. Founded by Lehan Kawshila.",
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
}`;

const HomePage: React.FC = () => {
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  return (
    <>
      <SEO
        title="SoundAlcmy – Where Musicians Unite Globally | Music, Orchestra, Guitar, Lehan Kawshila"
        description="SoundAlchemy (soundalcmy.com) is a universal platform where musicians from all over the world—guitarists, orchestras, and creators—connect, collaborate, and create music together. Founded by Lehan Kawshila."
        keywords="soundalcmy, soundalchemy, sound, music, lehan, lehan kawshila, orchestra, global musicians, guitar, world wide, musicians unite"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/"
        lang="en"
        schema={homepageSchema}
      />
      <div className="bg-dark-800 text-white w-full">
        {/* Hero Section */}
        <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden p-0 m-0 w-full">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-b from-dark-800/90 via-dark-800/80 to-dark-800 z-10"></div>
            <div className="absolute inset-0 bg-[url('https://images.pexels.com/photos/164821/pexels-photo-164821.jpeg?auto=compress&cs=tinysrgb&w=1600')] bg-cover bg-center"></div>
          </div>
          
          {/* Container for vertical spacing */}
          <div className="relative z-10 flex flex-col justify-between w-full min-h-[70vh] py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
            {/* Main content - pushed to center, but can shrink */}
            <motion.div 
              className="text-center w-full max-w-4xl mx-auto flex-grow flex flex-col justify-center"
              initial="hidden"
              animate="visible"
              variants={staggerContainer}
            >
              <motion.h1 
                className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold mb-4 sm:mb-6 bg-gradient-to-r from-primary-400 via-white to-secondary-400 text-transparent bg-clip-text drop-shadow-lg leading-tight"
                variants={fadeIn}
              >
                SoundAlcmy
              </motion.h1>
              <motion.h2 
                className="text-lg sm:text-xl md:text-2xl mb-4 sm:mb-6 lg:mb-8 text-gray-300 drop-shadow px-2"
                variants={fadeIn}
              >
                {user ? t('home_welcome_back') : t('home_hero_subtitle')}
              </motion.h2>
              <motion.p 
                className="text-base sm:text-lg md:text-xl w-full mx-auto mb-6 sm:mb-8 lg:mb-10 text-gray-400 drop-shadow px-4 sm:px-8 max-w-3xl"
                variants={fadeIn}
              >
                {user ? t('home_logged_in_description') : t('home_hero_description')}
              </motion.p>
              <motion.div 
                className="flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 px-4 sm:px-0"
                variants={fadeIn}
              >
                {user ? (
                  <Link to="/dashboard" className="btn-primary text-center text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 shadow-xl hover:scale-105 transition-transform duration-200">
                    {t('home_explore_platform')}
                  </Link>
                ) : (
                  <Link to="/register" className="btn-primary text-center text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 shadow-xl hover:scale-105 transition-transform duration-200">
                    {t('home_join_movement')}
                  </Link>
                )}
                <a href="#learn-more" className="btn-outline text-center text-base sm:text-lg px-6 sm:px-8 py-3 sm:py-4 shadow-xl hover:scale-105 transition-transform duration-200">
                  {t('home_learn_more')}
                </a>
              </motion.div>
            </motion.div>

            {/* Scroll indicator - at the bottom */}
            <div className="w-full flex justify-center pt-8">
              <a 
                href="#learn-more" 
                className="flex flex-col items-center text-gray-400 hover:text-white transition-colors group cursor-pointer"
              >
                <span className="text-xs sm:text-sm mb-2 font-medium tracking-wide">{t('home_discover_more')}</span>
                <motion.div 
                  animate={{ y: [0, 8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="w-6 h-8 sm:w-8 sm:h-10 border-2 border-gray-400 rounded-full flex justify-center items-start pt-2 group-hover:border-white transition-colors"
                >
                  <motion.div 
                    animate={{ y: [0, 8, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5 }}
                    className="w-1.5 h-2 sm:w-2 sm:h-3 bg-gray-400 rounded-full group-hover:bg-white transition-colors"
                  ></motion.div>
                </motion.div>
              </a>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="learn-more" className="py-12 sm:py-16 md:py-20 bg-dark-900 w-full">
          <div className="w-full px-2 sm:px-4 max-w-6xl mx-auto">
            <motion.div 
              className="text-center mb-10 sm:mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={staggerContainer}
            >
              <motion.h2 
                className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mb-3 sm:mb-4"
                variants={fadeIn}
              >
                {t('home_why_soundalchemy')}
              </motion.h2>
              <motion.p 
                className="text-base sm:text-xl text-gray-400 w-full mx-auto"
                variants={fadeIn}
              >
                {t('home_why_soundalchemy_desc')}
              </motion.p>
            </motion.div>

            <motion.div 
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={staggerContainer}
            >
              {/* Feature Cards - unified style */}
              <motion.div 
                className="glass-card rounded-xl p-5 sm:p-6 flex flex-col items-center text-center hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                variants={fadeIn}
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                  <Globe className="h-7 w-7 sm:h-8 sm:w-8 text-primary-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{t('home_feature_global_collab_title')}</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  {t('home_feature_global_collab_desc')}
                </p>
              </motion.div>

              {/* Feature 2 */}
              <motion.div 
                className="glass-card rounded-xl p-5 sm:p-6 flex flex-col items-center text-center hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                variants={fadeIn}
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                  <MessageSquare className="h-7 w-7 sm:h-8 sm:w-8 text-primary-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{t('home_feature_live_discussions_title')}</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  {t('home_feature_live_discussions_desc')}
                </p>
              </motion.div>

              {/* Feature 3 */}
              <motion.div 
                className="glass-card rounded-xl p-5 sm:p-6 flex flex-col items-center text-center hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                variants={fadeIn}
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-primary-500/20 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                  <HeartHandshake className="h-7 w-7 sm:h-8 sm:w-8 text-primary-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{t('home_feature_cultural_exchange_title')}</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  {t('home_feature_cultural_exchange_desc')}
                </p>
              </motion.div>

              {/* Feature 4 */}
              <motion.div 
                className="glass-card rounded-xl p-5 sm:p-6 flex flex-col items-center text-center hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                variants={fadeIn}
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-secondary-500/20 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                  <Shield className="h-7 w-7 sm:h-8 sm:w-8 text-secondary-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{t('home_feature_verified_musicians_title')}</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  {t('home_feature_verified_musicians_desc')}
                </p>
              </motion.div>

              {/* Feature 5 */}
              <motion.div 
                className="glass-card rounded-xl p-5 sm:p-6 flex flex-col items-center text-center hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                variants={fadeIn}
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-secondary-500/20 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                  <Users className="h-7 w-7 sm:h-8 sm:w-8 text-secondary-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{t('home_feature_exclusive_title')}</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  {t('home_feature_exclusive_desc')}
                </p>
              </motion.div>

              {/* Feature 6 */}
              <motion.div 
                className="glass-card rounded-xl p-5 sm:p-6 flex flex-col items-center text-center hover:shadow-2xl hover:scale-[1.03] transition-all duration-300"
                variants={fadeIn}
              >
                <div className="h-14 w-14 sm:h-16 sm:w-16 bg-secondary-500/20 rounded-lg flex items-center justify-center mb-4 sm:mb-6">
                  <Music className="h-7 w-7 sm:h-8 sm:w-8 text-secondary-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-bold mb-2 sm:mb-3">{t('home_free_access')}</h3>
                <p className="text-gray-400 text-sm sm:text-base">
                  {t('home_free_access_desc')}
                </p>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* Project Section */}
        <section className="py-20 bg-dark-800 w-full">
          <div className="w-full px-0 mx-auto">
            <motion.div 
              className="glass-card p-8 md:p-12"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
            >
              <div className="flex flex-col md:flex-row items-center">
                <div className="md:w-1/2 mb-8 md:mb-0 md:pr-8">
                  <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                    {t('home_first_project_title')}
                  </h2>
                  <p className="text-gray-400 mb-6">
                    {t('home_first_project_desc')}
                  </p>
                  {user ? (
                    <Link to="/dashboard" className="btn-primary inline-block">
                      {t('home_explore_platform')}
                    </Link>
                  ) : (
                    <Link to="/register" className="btn-primary inline-block">
                      {t('home_join_this_project')}
                    </Link>
                  )}
                </div>
                <div className="md:w-1/2">
                  <div className="relative aspect-video rounded-lg overflow-hidden">
                    <img 
                      src="https://images.pexels.com/photos/2531728/pexels-photo-2531728.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1" 
                      alt={t('home_musicians_collaborating')}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-900/80 to-transparent"></div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-20 bg-dark-900 w-full">
          <div className="w-full px-0 mx-auto">
            <motion.div 
              className="text-center mb-16"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-4">
                {t('home_music_better_world')}
              </h2>
              <p className="text-xl text-gray-400 w-full mx-auto">
                {t('home_beyond_music')}
              </p>
            </motion.div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <motion.div 
                className="glass-card p-8"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeIn}
              >
                <h3 className="text-2xl font-bold mb-4">Healing Through Music</h3>
                <p className="text-gray-400 mb-6">
                  {t('home_healing_through_music') + ' '}
                  {t('home_healing_desc')}
                </p>
              </motion.div>

              <motion.div 
                className="glass-card p-8"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.2 }}
                variants={fadeIn}
              >
                <h3 className="text-2xl font-bold mb-4">The Future of AI and Music</h3>
                <p className="text-gray-400 mb-6">
                  {t('home_future_ai_music') + ' '}
                  {t('home_future_ai_music_desc')}
                </p>
              </motion.div>
            </div>

            <motion.div 
              className="mt-12 text-center"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
            >
              {user ? (
                <Link to="/dashboard" className="btn-secondary text-lg px-8 py-3">
                  {t('home_explore_platform')}
                </Link>
              ) : (
                <Link to="/register" className="btn-secondary text-lg px-8 py-3">
                  {t('home_join_movement')}
                </Link>
              )}
            </motion.div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 bg-gradient-to-b from-dark-900 to-dark-800 w-full">
          <div className="w-full px-0 mx-auto text-center">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.2 }}
              variants={fadeIn}
            >
              <h2 className="text-3xl md:text-4xl font-display font-bold mb-6">
                {user ? t('home_welcome_back') : t('home_ready_transform')}
              </h2>
              <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
                {user ? t('home_logged_in_description') : t('home_join_global')}
              </p>
              {user ? (
                <Link to="/dashboard" className="btn-primary text-lg px-10 py-3">
                  {t('home_explore_platform')}
                </Link>
              ) : (
                <Link to="/register" className="btn-primary text-lg px-10 py-3">
                  {t('home_register_now')}
                </Link>
              )}
            </motion.div>
          </div>
        </section>
      </div>
    </>
  );
};

export default HomePage;