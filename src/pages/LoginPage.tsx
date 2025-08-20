import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { toast } from 'react-hot-toast';
import { Loader, Music } from 'lucide-react';
import AuthService from '../services/authService';
import SEO from '../components/common/SEO';

const loginSchema = `{
  "@context": "https://schema.org",
  "@type": "WebPage",
  "name": "Login | SoundAlchemy",
  "description": "Sign in to SoundAlchemy and connect with global musicians, orchestras, and creators. Powered by Lehan Kawshila.",
  "url": "https://soundalcmy.com/login"
}`;

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/profile');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(email, password);
      toast.success('Login successful!');
      navigate('/profile');
    } catch (error) {
      console.error('Login error:', error);
      setError(error instanceof Error ? error.message : 'Failed to login. Please check your credentials.');
      toast.error('Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      const userProfile = await AuthService.registerWithGoogle();
      // Optionally, show a toast or message here
      navigate('/profile');
    } catch (error) {
      // Optionally, show error toast
      console.error('Google login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <SEO
        title="Login | SoundAlchemy – Connect with Global Musicians"
        description="Sign in to SoundAlchemy and connect with global musicians, orchestras, and creators. Powered by Lehan Kawshila."
        keywords="soundalcmy, soundalchemy, music, login, sign in, global musicians, lehan kawshila, orchestra, guitar, world wide"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/login"
        lang="en"
        schema={loginSchema}
      />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
        className="glass-card rounded-xl p-8 w-full max-w-md mx-auto"
      >
        <div className="text-center mb-8">
          <div className="flex justify-center">
            <Music size={48} className="text-secondary-500" />
          </div>
          <h2 className="text-2xl font-bold mt-4 text-white">Welcome Back</h2>
          <p className="text-gray-400 mt-2">Log in to your SoundAlchemy account</p>
          <button
            type="button"
            onClick={handleGoogleLogin}
            className="w-full bg-white border border-gray-300 text-gray-800 py-2 px-4 rounded hover:bg-gray-50 flex items-center justify-center gap-2 mt-4 disabled:opacity-50"
            disabled={isLoading}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48">
              <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"></path>
              <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"></path>
              <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"></path>
              <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"></path>
            </svg>
            Continue with Google
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-300 mb-1">
              Email Address
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              placeholder="your.email@example.com"
              required
            />
          </div>

          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="password" className="block text-gray-300">
                Password
              </label>
              <Link to="/forgot-password" className="text-sm text-primary-400 hover:text-primary-300">
                
              </Link>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="form-input"
              placeholder="Enter your password"
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader size={18} className="animate-spin mr-2" />
                Logging in...
              </span>
            ) : (
              'Log In'
            )}
          </button>
        </form>

        <div className="mt-8 text-center">
          <p className="text-gray-400">
            Don't have an account?{' '}
            <Link to="/register" className="text-primary-400 hover:text-primary-300">
              Register now
            </Link>
          </p>
        </div>

        <div className="mt-6">
          <p className="text-center text-xs text-gray-500">
            By continuing, you agree to SoundAlchemy's Terms of Service and Privacy Policy.
          </p>
        </div>
      </motion.div>
    </>
  );
};

export default LoginPage;
