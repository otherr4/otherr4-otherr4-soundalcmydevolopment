import React from 'react';
import { format } from 'date-fns';
import { CheckIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

interface MessageProps {
  message: {
    text: string;
    timestamp: any;
    status: 'sent' | 'delivered' | 'read';
    attachments?: string[];
  };
  isOwn: boolean;
}

export const MessageBubble: React.FC<MessageProps> = ({ message, isOwn }) => {
  const getStatusIcon = () => {
    switch (message.status) {
      case 'sent':
        return <CheckIcon className="w-4 h-4 text-gray-400" />;
      case 'delivered':
        return (
          <div className="flex">
            <CheckIcon className="w-4 h-4 text-gray-400" />
            <CheckIcon className="w-4 h-4 text-gray-400 -ml-2" />
          </div>
        );
      case 'read':
        return (
          <div className="flex">
            <CheckIcon className="w-4 h-4 text-blue-500" />
            <CheckIcon className="w-4 h-4 text-blue-500 -ml-2" />
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[70%] rounded-lg px-4 py-2 ${
          isOwn ? 'bg-blue-500 text-white' : 'bg-white text-gray-900'
        } shadow`}
      >
        <div className="break-words">{message.text}</div>
        
        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 space-y-2">
            {message.attachments.map((attachment, index) => (
              <div key={index} className="rounded-lg overflow-hidden">
                {attachment.match(/\.(jpg|jpeg|png|gif)$/i) ? (
                  <img
                    src={attachment}
                    alt="attachment"
                    className="max-w-full h-auto"
                  />
                ) : (
                  <div className="bg-gray-100 p-2 rounded">
                    <a
                      href={attachment}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      Download Attachment
                    </a>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        <div className={`flex items-center justify-end mt-1 space-x-1 ${
          isOwn ? 'text-white/70' : 'text-gray-500'
        }`}>
          <span className="text-xs">
            {message.timestamp?.toDate
              ? format(message.timestamp.toDate(), 'HH:mm')
              : ''}
          </span>
          {isOwn && getStatusIcon()}
        </div>
      </div>
    </div>
  );
}; 