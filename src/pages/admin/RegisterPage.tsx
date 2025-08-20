import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../config/firebase';
import { toast } from 'react-hot-toast';
import { ShieldAlert, Loader, Lock } from 'lucide-react';

const AdminRegisterPage: React.FC = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    adminCode: ''
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Validate admin code
    const ADMIN_SECRET_CODE = 'SOUND-ALCHEMY-2025';
    if (formData.adminCode !== ADMIN_SECRET_CODE) {
      setError('Invalid admin registration code');
      setIsLoading(false);
      return;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setIsLoading(false);
      return;
    }

    try {
      // Create admin user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.email,
        formData.password
      );

      // Set up admin in Firestore
      await setDoc(doc(db, 'users', userCredential.user.uid), {
        fullName: formData.fullName,
        email: formData.email,
        role: 'admin',
        isVerified: true,
        createdAt: new Date(),
        lastLogin: new Date()
      });

      toast.success('Admin account created successfully');
      navigate('/admin/login');
    } catch (error) {
      console.error('Error creating admin:', error);
      setError(error instanceof Error ? error.message : 'Failed to create admin account');
      toast.error('Failed to create admin account');
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
          <h2 className="text-2xl font-bold mt-4 text-white">Create Admin Account</h2>
          <p className="text-gray-400 mt-2">Register a new administrator for SoundAlchemy</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-500 rounded-md text-red-200 text-sm">
              {error}
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="fullName" className="block text-gray-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              className="form-input"
              placeholder="Enter admin name"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="email" className="block text-gray-300 mb-1">
              Admin Email
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="form-input"
              placeholder="admin@soundalchemy.com"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="password" className="block text-gray-300 mb-1">
              Password
            </label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className="form-input"
              placeholder="Create a strong password"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="confirmPassword" className="block text-gray-300 mb-1">
              Confirm Password
            </label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              className="form-input"
              placeholder="Confirm your password"
              required
            />
          </div>

          <div className="mb-6">
            <label htmlFor="adminCode" className="block text-gray-300 mb-1">
              Admin Registration Code
            </label>
            <div className="relative">
              <input
                type="password"
                id="adminCode"
                name="adminCode"
                value={formData.adminCode}
                onChange={handleChange}
                className="form-input pl-10"
                placeholder="Enter admin registration code"
                required
              />
              <Lock size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Contact system administrator for the registration code
            </p>
          </div>

          <button
            type="submit"
            className="btn-secondary w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <Loader size={18} className="animate-spin mr-2" />
                Creating Account...
              </span>
            ) : (
              'Create Admin Account'
            )}
          </button>
        </form>

        <div className="mt-8">
          <p className="text-center text-xs text-gray-500">
            This registration is for authorized administrators only.
            Unauthorized access attempts will be logged and reported.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AdminRegisterPage;