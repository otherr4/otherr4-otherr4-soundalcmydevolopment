import React, { useState, useEffect, useRef } from 'react';

interface DeviceOption {
  deviceId: string;
  label: string;
}

interface VideoCallSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentMic: string;
  currentCamera: string;
  currentSpeaker: string;
  onSelectMic: (deviceId: string) => void;
  onSelectCamera: (deviceId: string) => void;
  onSelectSpeaker: (deviceId: string) => void;
  onSetBackground: (type: 'none' | 'blur' | 'virtual', value?: string) => void;
  onSetVideoQuality: (quality: 'auto' | 'hd' | 'sd') => void;
  micOptions: DeviceOption[];
  cameraOptions: DeviceOption[];
  speakerOptions: DeviceOption[];
  videoQuality: 'auto' | 'hd' | 'sd';
  backgroundType: 'none' | 'blur' | 'virtual';
  backgroundValue?: string;
}

const VideoCallSettingsModal: React.FC<VideoCallSettingsModalProps> = ({
  isOpen,
  onClose,
  currentMic,
  currentCamera,
  currentSpeaker,
  onSelectMic,
  onSelectCamera,
  onSelectSpeaker,
  onSetBackground,
  onSetVideoQuality,
  micOptions,
  cameraOptions,
  speakerOptions,
  videoQuality,
  backgroundType,
  backgroundValue,
}) => {
  const [virtualBgPreview, setVirtualBgPreview] = useState<string | undefined>(backgroundValue);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70">
      <div className="bg-dark-900 rounded-2xl shadow-2xl w-full max-w-2xl p-8 relative">
        <button onClick={onClose} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white">
          ✕
        </button>
        <h2 className="text-2xl font-bold text-white mb-6">Call Settings</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Device Selection */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Devices</h3>
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">Microphone</label>
              <select value={currentMic} onChange={e => onSelectMic(e.target.value)} className="w-full bg-dark-700 text-white rounded p-2">
                {micOptions.map(opt => <option key={opt.deviceId} value={opt.deviceId}>{opt.label}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">Camera</label>
              <select value={currentCamera} onChange={e => onSelectCamera(e.target.value)} className="w-full bg-dark-700 text-white rounded p-2">
                {cameraOptions.map(opt => <option key={opt.deviceId} value={opt.deviceId}>{opt.label}</option>)}
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">Speaker</label>
              <select value={currentSpeaker} onChange={e => onSelectSpeaker(e.target.value)} className="w-full bg-dark-700 text-white rounded p-2">
                {speakerOptions.map(opt => <option key={opt.deviceId} value={opt.deviceId}>{opt.label}</option>)}
              </select>
            </div>
          </div>
          {/* Video & Background */}
          <div>
            <h3 className="text-lg font-semibold text-white mb-2">Video & Background</h3>
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">Video Quality</label>
              <select value={videoQuality} onChange={e => onSetVideoQuality(e.target.value as any)} className="w-full bg-dark-700 text-white rounded p-2">
                <option value="auto">Auto</option>
                <option value="hd">HD</option>
                <option value="sd">SD</option>
              </select>
            </div>
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">Background</label>
              <div className="flex gap-2 mb-2">
                <button onClick={() => onSetBackground('none')} className={`px-3 py-1 rounded ${backgroundType==='none'?'bg-primary-500 text-white':'bg-dark-700 text-gray-300'}`}>None</button>
                <button onClick={() => onSetBackground('blur')} className={`px-3 py-1 rounded ${backgroundType==='blur'?'bg-primary-500 text-white':'bg-dark-700 text-gray-300'}`}>Blur</button>
                <button onClick={() => fileInputRef.current?.click()} className={`px-3 py-1 rounded ${backgroundType==='virtual'?'bg-primary-500 text-white':'bg-dark-700 text-gray-300'}`}>Virtual</button>
                <input type="file" accept="image/*" ref={fileInputRef} style={{display:'none'}} onChange={e=>{
                  if(e.target.files&&e.target.files[0]){
                    setUploading(true);
                    const reader=new FileReader();
                    reader.onload=ev=>{
                      setVirtualBgPreview(ev.target?.result as string);
                      onSetBackground('virtual',ev.target?.result as string);
                      setUploading(false);
                    };
                    reader.readAsDataURL(e.target.files[0]);
                  }
                }} />
              </div>
              {backgroundType==='virtual'&&virtualBgPreview&&<img src={virtualBgPreview} alt="Virtual Background" className="w-full h-32 object-cover rounded mt-2"/>}
              {backgroundType==='blur'&&<div className="w-full h-32 bg-gray-500/30 rounded mt-2 flex items-center justify-center text-white">Blur Preview</div>}
            </div>
          </div>
        </div>
        {/* Live Preview */}
        <div className="mt-8">
          <h3 className="text-lg font-semibold text-white mb-2">Live Preview</h3>
          <div className="w-full h-48 bg-dark-700 rounded flex items-center justify-center">
            {/* TODO: Show live video preview with background effect */}
            <span className="text-gray-400">Live video preview here</span>
          </div>
        </div>
        {/* Test Devices */}
        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          <button className="bg-primary-500 text-white rounded p-3">Test Microphone</button>
          <button className="bg-primary-500 text-white rounded p-3">Test Speaker</button>
          <button className="bg-primary-500 text-white rounded p-3">Test Camera</button>
        </div>
      </div>
    </div>
  );
};

export default VideoCallSettingsModal; 