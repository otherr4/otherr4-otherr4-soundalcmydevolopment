import React, { useRef } from 'react';
import { PaperClipIcon } from '@heroicons/react/24/outline';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';

interface AttachmentButtonProps {
  onAttach: (files: string[]) => void;
}

export const AttachmentButton: React.FC<AttachmentButtonProps> = ({ onAttach }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const storage = getStorage();

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    const uploadPromises = Array.from(files).map(async (file) => {
      const storageRef = ref(storage, `attachments/${Date.now()}_${file.name}`);
      await uploadBytes(storageRef, file);
      return getDownloadURL(storageRef);
    });

    try {
      const urls = await Promise.all(uploadPromises);
      onAttach(urls);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (error) {
      console.error('Error uploading files:', error);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        className="p-2 rounded-full hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <PaperClipIcon className="w-6 h-6 text-gray-500" />
      </button>
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileChange}
        className="hidden"
        accept="image/*,.pdf,.doc,.docx,.txt"
      />
    </div>
  );
}; 