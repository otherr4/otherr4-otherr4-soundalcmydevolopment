import React, { useState } from 'react';
import { db } from '../../config/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { Video, Calendar, Check } from 'lucide-react';

interface ZoomVerificationProps {
  userId: string;
  userName: string;
  onScheduled: () => void;
}

const ZoomVerification: React.FC<ZoomVerificationProps> = ({ userId, userName, onScheduled }) => {
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [loading, setLoading] = useState(false);

  const handleScheduleMeeting = async () => {
    if (!selectedDate || !selectedTime) {
      toast.error('Please select both date and time');
      return;
    }

    setLoading(true);
    try {
      // Create Zoom meeting (in a real app, this would use Zoom API)
      const meetingDetails = {
        date: selectedDate,
        time: selectedTime,
        link: `https://zoom.us/j/${Math.random().toString(36).substr(2, 9)}`,
      };

      // Update user document with meeting details
      await updateDoc(doc(db, 'users', userId), {
        verificationMeeting: meetingDetails,
        verificationStatus: 'meeting_scheduled',
      });

      toast.success('Verification meeting scheduled successfully');
      onScheduled();
    } catch (error) {
      console.error('Error scheduling meeting:', error);
      toast.error('Failed to schedule meeting');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-dark-800 rounded-lg p-6">
      <div className="flex items-center mb-6">
        <Video className="text-primary-400 mr-3" size={24} />
        <h3 className="text-xl font-semibold">Schedule Verification Meeting</h3>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-400 mb-2">Select Date</label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="form-input"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        <div>
          <label className="block text-gray-400 mb-2">Select Time</label>
          <input
            type="time"
            value={selectedTime}
            onChange={(e) => setSelectedTime(e.target.value)}
            className="form-input"
          />
        </div>

        <button
          onClick={handleScheduleMeeting}
          disabled={loading || !selectedDate || !selectedTime}
          className="btn-primary w-full flex items-center justify-center"
        >
          {loading ? (
            <span className="flex items-center">
              <Calendar className="animate-spin mr-2\" size={18} />
              Scheduling...
            </span>
          ) : (
            <span className="flex items-center">
              <Check className="mr-2" size={18} />
              Schedule Meeting
            </span>
          )}
        </button>
      </div>

      <p className="mt-4 text-sm text-gray-400">
        A Zoom meeting link will be sent to both you and {userName} once scheduled.
      </p>
    </div>
  );
};

export default ZoomVerification;