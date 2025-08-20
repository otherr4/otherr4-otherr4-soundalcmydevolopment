import React from 'react';
import { FiAlertCircle } from 'react-icons/fi';

interface ErrorMessageProps {
  message: string;
  variant?: 'error' | 'warning' | 'info';
}

export const ErrorMessage: React.FC<ErrorMessageProps> = ({
  message,
  variant = 'error'
}) => {
  const variantClasses = {
    error: 'bg-red-50 text-red-700 border-red-200',
    warning: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    info: 'bg-blue-50 text-blue-700 border-blue-200'
  };

  const iconColors = {
    error: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };

  return (
    <div className={`flex items-center p-4 rounded-lg border ${variantClasses[variant]}`}>
      <FiAlertCircle className={`h-5 w-5 mr-3 ${iconColors[variant]}`} />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}; 