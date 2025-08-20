import React, { useEffect, useState } from 'react';
import { ref, onValue, update } from 'firebase/database';
import { db } from '@/firebase/config';
import { toast } from 'sonner';

interface VerificationRequest {
  userId: string;
  email: string;
  fullName: string;
  instrumentType: string;
  submittedAt: number;
  status: 'pending' | 'verified' | 'rejected';
}

export const VerificationQueue: React.FC = () => {
  const [requests, setRequests] = useState<Record<string, VerificationRequest>>({});
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<string | null>(null);

  useEffect(() => {
    const queueRef = ref(db, 'verificationQueue');
    const unsubscribe = onValue(queueRef, (snapshot) => {
      if (snapshot.exists()) {
        setRequests(snapshot.val());
      } else {
        setRequests({});
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleVerification = async (userId: string, status: 'verified' | 'rejected') => {
    try {
      const updates = {
        [`verificationQueue/${userId}/status`]: status,
        [`users/${userId}/verificationStatus`]: status,
        [`users/${userId}/isVerified`]: status === 'verified',
        [`users/${userId}/verifiedAt`]: status === 'verified' ? Date.now() : null
      };

      await update(ref(db), updates);
      toast.success(`User ${status === 'verified' ? 'verified' : 'rejected'} successfully`);
    } catch (error: any) {
      toast.error(`Error updating verification status: ${error.message}`);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString();
  };

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow-sm">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const pendingRequests = Object.entries(requests).filter(([_, request]) => request.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">Verification Queue</h2>
        <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
          {pendingRequests.length} Pending
        </span>
      </div>

      {pendingRequests.length === 0 ? (
        <div className="bg-white p-6 rounded-lg shadow-sm text-center text-gray-500">
          No pending verification requests
        </div>
      ) : (
        <div className="space-y-4">
          {pendingRequests.map(([userId, request]) => (
            <div
              key={userId}
              className={`bg-white p-6 rounded-lg shadow-sm transition-all ${
                selectedRequest === userId ? 'ring-2 ring-indigo-500' : ''
              }`}
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">{request.fullName}</h3>
                  <p className="text-sm text-gray-500">{request.email}</p>
                  <div className="mt-2 space-y-1">
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Instrument:</span> {request.instrumentType}
                    </p>
                    <p className="text-sm text-gray-600">
                      <span className="font-medium">Submitted:</span> {formatDate(request.submittedAt)}
                    </p>
                  </div>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => handleVerification(userId, 'verified')}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                  >
                    Verify
                  </button>
                  <button
                    onClick={() => handleVerification(userId, 'rejected')}
                    className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Reject
                  </button>
                </div>
              </div>

              {selectedRequest === userId && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-medium text-gray-900">User Details</h4>
                  {/* Add more user details here when selected */}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}; 