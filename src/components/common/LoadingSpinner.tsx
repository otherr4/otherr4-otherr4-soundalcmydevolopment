import React from 'react';

interface LoadingSpinnerProps {
  size?: 'small' | 'medium' | 'large';
  color?: string;
  className?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  size = 'medium', 
  color = '#4F46E5',
  className = ''
}) => {
  const sizeMap = {
    small: 'w-4 h-4',
    medium: 'w-8 h-8',
    large: 'w-12 h-12'
  };

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div
        className={`${sizeMap[size]} border-4 border-gray-200 border-t-${color} rounded-full animate-spin`}
        role="status"
        aria-label="loading"
      />
    </div>
  );
};

export { LoadingSpinner };
export default LoadingSpinner; 