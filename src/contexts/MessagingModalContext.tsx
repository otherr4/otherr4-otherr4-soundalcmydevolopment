import React, { createContext, useContext, useState, ReactNode } from 'react';

interface MessagingModalContextProps {
  isMessagingOpen: boolean;
  openMessaging: () => void;
  closeMessaging: () => void;
}

const MessagingModalContext = createContext<MessagingModalContextProps | undefined>(undefined);

export const useMessagingModal = () => {
  const context = useContext(MessagingModalContext);
  if (!context) {
    throw new Error('useMessagingModal must be used within a MessagingModalProvider');
  }
  return context;
};

export const MessagingModalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isMessagingOpen, setIsMessagingOpen] = useState(false);

  const openMessaging = () => setIsMessagingOpen(true);
  const closeMessaging = () => setIsMessagingOpen(false);

  return (
    <MessagingModalContext.Provider value={{ isMessagingOpen, openMessaging, closeMessaging }}>
      {children}
    </MessagingModalContext.Provider>
  );
}; 