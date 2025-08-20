import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader, ShieldAlert } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const AdminLoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { adminLogin, isAdmin, user } = useAuth();
  const { t } = useTranslation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in as admin
  useEffect(() => {
    if (user && isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [user, isAdmin, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await adminLogin(email, password);
      toast.success(t('admin_login_successful'));
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Admin login error:', error);
      
      if (error instanceof Error && error.message.includes('Unauthorized')) {
        setError(t('no_admin_privileges'));
      } else {
        setError(error instanceof Error ? error.message : t('failed_login_check_credentials'));
      }
      toast.error(t('admin_login_failed'));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-dark-900">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="bg-dark-800 rounded-xl shadow-2xl p-8 w-full max-w-md border border-dark-600"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <ShieldAlert size={48} className="text-secondary-500" />
          </div>
          <h2 className="text-2xl font-bold mt-4 text-white">{t('admin_access')}</h2>
          <p className="text-gray-400 mt-2">{t('login_to_admin_panel')}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-300 mb-1">
              {t('admin_email')}
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder={t('admin_email_placeholder')}
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="password" className="block text-gray-300 mb-1">
              {t('password')}
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder={t('admin_password_placeholder')}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-secondary w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader size={18} className="animate-spin mr-2" />
                {t('logging_in')}
              </span>
            ) : (
              t('access_admin_panel')
            )}
          </button>
        </form>

        <div className="mt-8">
          <p className="text-center text-xs text-gray-500">
            {t('admin_area_restricted')}
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminLoginPage;