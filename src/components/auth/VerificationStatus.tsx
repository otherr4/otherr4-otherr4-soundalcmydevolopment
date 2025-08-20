import React, { useEffect, useState } from 'react';
import { ref, onValue } from 'firebase/database';
import { db } from '@/firebase/config';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';

interface VerificationStatusProps {
  userId: string;
}

export const VerificationStatus: React.FC<VerificationStatusProps> = ({ userId }) => {
  const [status, setStatus] = useState<'pending' | 'verified' | 'rejected'>('pending');
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    if (!userId) return;

    const userRef = ref(db, `users/${userId}`);
    const unsubscribe = onValue(userRef, (snapshot) => {
      if (snapshot.exists()) {
        const userData = snapshot.val();
        setStatus(userData.verificationStatus);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [userId]);

  const getStatusBadge = () => {
    switch (status) {
      case 'verified':
        return (
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-green-700 font-medium">Verified Musician</span>
          </div>
        );
      case 'rejected':
        return (
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-red-500 rounded-full"></span>
            <span className="text-red-700 font-medium">Verification Rejected</span>
          </div>
        );
      default:
        return (
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
            <span className="text-yellow-700 font-medium">Verification Pending</span>
          </div>
        );
    }
  };

  const getStatusMessage = () => {
    switch (status) {
      case 'verified':
        return (
          <div className="mt-4 text-green-700 bg-green-50 p-4 rounded-md">
            <p>Congratulations! Your account has been verified. You now have access to all SoundAlchemy features:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Create and join events</li>
              <li>Collaborate with other musicians</li>
              <li>Access exclusive content</li>
              <li>Participate in community discussions</li>
            </ul>
          </div>
        );
      case 'rejected':
        return (
          <div className="mt-4 text-red-700 bg-red-50 p-4 rounded-md">
            <p>Your verification request has been rejected. This may be due to:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Incomplete or incorrect information</li>
              <li>Unable to verify your musical background</li>
              <li>Violation of community guidelines</li>
            </ul>
            <p className="mt-2">Please contact support for more information and to reapply.</p>
          </div>
        );
      default:
        return (
          <div className="mt-4 text-yellow-700 bg-yellow-50 p-4 rounded-md">
            <p>Your verification request is being reviewed. This process typically takes 1-2 business days.</p>
            <p className="mt-2">While waiting, you can:</p>
            <ul className="list-disc list-inside mt-2">
              <li>Complete your profile</li>
              <li>Browse available events</li>
              <li>Follow other musicians</li>
            </ul>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4"></div>
        <div className="space-y-3 mt-4">
          <div className="h-4 bg-gray-200 rounded"></div>
          <div className="h-4 bg-gray-200 rounded w-5/6"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900">Verification Status</h2>
        {getStatusBadge()}
      </div>
      {getStatusMessage()}
    </div>
  );
}; 