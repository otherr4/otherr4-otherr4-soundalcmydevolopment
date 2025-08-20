import React from 'react';
import { Link } from 'react-router-dom';
import { Music, Globe, Mail, Instagram, Twitter, Youtube, Facebook, Linkedin, MessageSquare } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Footer: React.FC = () => {
  const { t } = useTranslation();
  return (
    <footer className="bg-dark-900 text-white pt-12 pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-1">
            <Link to="/" className="flex items-center space-x-2">
              <Music size={28} className="text-secondary-500" />
              <span className="text-xl font-display font-bold bg-gradient-to-r from-primary-400 to-secondary-400 text-transparent bg-clip-text">
                {t('footer_soundalcmy')}
              </span>
            </Link>
            <p className="mt-4 text-gray-400 text-sm">
              {t('footer_universal_platform')}
            </p>
            <div className="mt-6 flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                <Instagram size={20} />
                <span className="sr-only">{t('footer_instagram')}</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                <Twitter size={20} />
                <span className="sr-only">{t('footer_twitter')}</span>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">
                <Youtube size={20} />
                <span className="sr-only">{t('footer_youtube')}</span>
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">{t('footer_quick_links')}</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/" className="text-gray-400 hover:text-white transition-colors duration-300">{t('footer_home')}</Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 hover:text-white transition-colors duration-300">{t('footer_join_now')}</Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">{t('footer_about_us')}</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">{t('footer_projects')}</a>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">{t('footer_resources')}</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">{t('footer_help_center')}</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">{t('footer_privacy_policy')}</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">{t('footer_terms_service')}</a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors duration-300">{t('footer_community_guidelines')}</a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div className="col-span-1">
            <h3 className="text-lg font-semibold mb-4">{t('footer_contact_us')}</h3>
            <ul className="space-y-4">
              <li className="flex items-start space-x-3">
                <Globe size={20} className="text-gray-400 flex-shrink-0 mt-1" />
                <span className="text-gray-400">{t('footer_global_community')}</span>
              </li>
              <li className="flex items-start space-x-3">
                <Mail size={20} className="text-gray-400 flex-shrink-0 mt-1" />
                <a href="mailto:sound7alchemy@gmail.com" className="text-gray-400 hover:text-primary-400 transition-colors duration-300">sound7alchemy@gmail.com</a>
              </li>
              <li className="flex items-center space-x-3 mt-2">
                <MessageSquare size={20} className="text-green-400 flex-shrink-0" />
                <a href="https://chat.whatsapp.com/your-community-link" target="_blank" rel="noopener noreferrer" className="btn-outline btn-xs rounded-full px-4 py-1 text-sm font-semibold border-green-400 text-green-400 hover:bg-green-400 hover:text-white transition">Join WhatsApp Community</a>
              </li>
              <li className="flex items-center space-x-3 mt-2">
                <MessageSquare size={20} className="text-green-400 flex-shrink-0" />
                <a href="https://chat.whatsapp.com/your-support-link" target="_blank" rel="noopener noreferrer" className="btn-outline btn-xs rounded-full px-4 py-1 text-sm font-semibold border-green-400 text-green-400 hover:bg-green-400 hover:text-white transition">Join Support Group</a>
              </li>
            </ul>
            <div className="flex flex-wrap gap-3 mt-6">
              <a href="https://facebook.com/yourpage" target="_blank" rel="noopener noreferrer" className="bg-blue-600 hover:bg-blue-700 text-white rounded-full p-2 transition shadow-lg"><Facebook size={20} /></a>
              <a href="https://linkedin.com/in/yourprofile" target="_blank" rel="noopener noreferrer" className="bg-blue-500 hover:bg-blue-600 text-white rounded-full p-2 transition shadow-lg"><Linkedin size={20} /></a>
              <a href="https://instagram.com/yourprofile" target="_blank" rel="noopener noreferrer" className="bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 hover:from-pink-600 hover:to-yellow-600 text-white rounded-full p-2 transition shadow-lg"><Instagram size={20} /></a>
              <a href="https://youtube.com/yourchannel" target="_blank" rel="noopener noreferrer" className="bg-red-600 hover:bg-red-700 text-white rounded-full p-2 transition shadow-lg"><Youtube size={20} /></a>
              <a href="https://wa.me/yourwhatsapplink" target="_blank" rel="noopener noreferrer" className="bg-green-500 hover:bg-green-600 text-white rounded-full p-2 transition shadow-lg"><MessageSquare size={20} /></a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-12 pt-8">
          <p className="text-center text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} {t('footer_soundalcmy')}. {t('footer_copyright')}
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;