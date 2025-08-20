import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { 
  Music, 
  Users, 
  Calendar, 
  MapPin, 
  Upload, 
  FileText, 
  Settings, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  X, 
  Loader,
  Star,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Clock,
  Target,
  Award,
  Globe,
  Lock,
  Unlock,
  Music2,
  Mic,
  Guitar,
  Piano,
  Drum,
  BadgeCheck,
  AlertCircle,
  Info,
  HelpCircle,
  ExternalLink,
  Download,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';
import { 
  createCollaboration, 
  getCollaborationTemplates, 
  defaultTemplates 
} from '../services/collaborationService';
import { CollaborationTemplate, CollaborationStep, CollaborationStepField } from '../types/collaboration';
import SEO from '../components/common/SEO';
import LinkPreview from '../components/common/LinkPreview';

// Instrument icons mapping
const instrumentIcons: { [key: string]: React.ReactNode } = {
  'Vocals': <Mic className="w-5 h-5" />,
  'Guitar': <Guitar className="w-5 h-5" />,
  'Piano': <Piano className="w-5 h-5" />,
  'Drums': <Drum className="w-5 h-5" />,
  'Bass': <Guitar className="w-5 h-5" />,
  'Violin': <Music2 className="w-5 h-5" />,
  'Saxophone': <Music2 className="w-5 h-5" />,
  'Trumpet': <Music2 className="w-5 h-5" />,
  'Flute': <Music2 className="w-5 h-5" />,
  'Cello': <Music2 className="w-5 h-5" />,
  'Harp': <Music2 className="w-5 h-5" />,
  'Accordion': <Music2 className="w-5 h-5" />,
  'Harmonica': <Music2 className="w-5 h-5" />,
  'Ukulele': <Music2 className="w-5 h-5" />,
  'Banjo': <Music2 className="w-5 h-5" />,
  'Mandolin': <Music2 className="w-5 h-5" />,
  'Other': <Music2 className="w-5 h-5" />
};

// File upload component
const FileUpload: React.FC<{
  onFilesSelected: (files: File[]) => void;
  acceptedTypes?: string;
  multiple?: boolean;
  maxSize?: number; // in MB
}> = ({ onFilesSelected, acceptedTypes = "*", multiple = false, maxSize = 100 }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    
    const fileArray = Array.from(files);
    const validFiles = fileArray.filter(file => {
      if (file.size > maxSize * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is ${maxSize}MB`);
        return false;
      }
      return true;
    });
    
    setUploadedFiles(prev => multiple ? [...prev, ...validFiles] : validFiles);
    onFilesSelected(multiple ? [...uploadedFiles, ...validFiles] : validFiles);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    setUploadedFiles(newFiles);
    onFilesSelected(newFiles);
  };

  return (
    <div className="w-full">
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-primary-500 bg-primary-500/10' 
            : 'border-gray-600 hover:border-gray-500'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
        <p className="text-gray-300 mb-2">
          Drag and drop files here, or{' '}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-primary-400 hover:text-primary-300 underline"
          >
            browse
          </button>
        </p>
        <p className="text-sm text-gray-500">
          Max file size: {maxSize}MB
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple={multiple}
          accept={acceptedTypes}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </div>
      
      {uploadedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          {uploadedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between bg-gray-800 rounded-lg p-3">
              <div className="flex items-center space-x-3">
                <FileText className="w-5 h-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-gray-400">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => removeFile(index)}
                className="text-red-400 hover:text-red-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Step form component
const StepForm: React.FC<{
  step: CollaborationStep;
  formData: any;
  onFieldChange: (fieldId: string, value: any) => void;
  onComplete: () => void;
  onBack: () => void;
  isFirst: boolean;
  isLast: boolean;
}> = ({ step, formData, onFieldChange, onComplete, onBack, isFirst, isLast }) => {
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  const validateField = (field: CollaborationStepField, value: any): string => {
    if (field.required && (!value || (Array.isArray(value) && value.length === 0))) {
      return `${field.label} is required`;
    }
    
    if (field.validation) {
      if (field.validation.minLength && typeof value === 'string' && value.length < field.validation.minLength) {
        return `${field.label} must be at least ${field.validation.minLength} characters`;
      }
      if (field.validation.maxLength && typeof value === 'string' && value.length > field.validation.maxLength) {
        return `${field.label} must be no more than ${field.validation.maxLength} characters`;
      }
      if (field.validation.min && typeof value === 'number' && value < field.validation.min) {
        return `${field.label} must be at least ${field.validation.min}`;
      }
      if (field.validation.max && typeof value === 'number' && value > field.validation.max) {
        return `${field.label} must be no more than ${field.validation.max}`;
      }
    }
    
    return '';
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    onFieldChange(fieldId, value);
    
    // Clear error when user starts typing
    if (errors[fieldId]) {
      setErrors(prev => ({ ...prev, [fieldId]: '' }));
    }
  };

  const handleNext = () => {
    const newErrors: { [key: string]: string } = {};
    
    step.fields.forEach(field => {
      const error = validateField(field, formData[field.id]);
      if (error) {
        newErrors[field.id] = error;
      }
    });
    
    if (Object.keys(newErrors).length === 0) {
      onComplete();
    } else {
      setErrors(newErrors);
    }
  };

  const renderField = (field: CollaborationStepField) => {
    const value = formData[field.id] || '';
    const error = errors[field.id];

    switch (field.type) {
      case 'text':
        if (field.id === 'referenceLinks') {
          return (
            <div className="space-y-4">
              <textarea
                value={value}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder={field.placeholder}
                rows={3}
                className={`w-full p-3 rounded-lg bg-dark-700 text-white border ${
                  error ? 'border-red-500' : 'border-dark-600'
                } focus:border-primary-500 focus:outline-none resize-none`}
              />
              {value && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-gray-300">Link Previews:</h4>
                  {value.split('\n').filter((url: string) => url.trim()).map((url: string, index: number) => (
                    <LinkPreview
                      key={index}
                      url={url.trim()}
                      onRemove={() => {
                        const links = value.split('\n').filter((u: string, i: number) => i !== index);
                        handleFieldChange(field.id, links.join('\n'));
                      }}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        }
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            className={`w-full p-3 rounded-lg bg-dark-700 text-white border ${
              error ? 'border-red-500' : 'border-dark-600'
            } focus:border-primary-500 focus:outline-none`}
          />
        );

      case 'textarea':
        return (
          <textarea
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            placeholder={field.placeholder}
            rows={4}
            className={`w-full p-3 rounded-lg bg-dark-700 text-white border ${
              error ? 'border-red-500' : 'border-dark-600'
            } focus:border-primary-500 focus:outline-none resize-none`}
          />
        );

      case 'select':
        return (
          <select
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full p-3 rounded-lg bg-dark-700 text-white border ${
              error ? 'border-red-500' : 'border-dark-600'
            } focus:border-primary-500 focus:outline-none`}
          >
            <option value="">Select {field.label}</option>
            {field.options?.map(option => (
              <option key={option} value={option}>{option}</option>
            ))}
          </select>
        );

      case 'multiselect':
        const selectedValues = Array.isArray(value) ? value : [];
        return (
          <div className="space-y-2">
            <div className="flex flex-wrap gap-2">
              {field.options?.map(option => {
                const isSelected = selectedValues.includes(option);
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => {
                      const newValues = isSelected
                        ? selectedValues.filter(v => v !== option)
                        : [...selectedValues, option];
                      handleFieldChange(field.id, newValues);
                    }}
                    className={`px-3 py-2 rounded-lg border transition-colors ${
                      isSelected
                        ? 'bg-primary-500 border-primary-500 text-white'
                        : 'bg-dark-700 border-dark-600 text-gray-300 hover:border-primary-500'
                    }`}
                  >
                    {instrumentIcons[option] || <Music2 className="w-4 h-4" />}
                    <span className="ml-2">{option}</span>
                  </button>
                );
              })}
            </div>
            {selectedValues.length > 0 && (
              <p className="text-sm text-gray-400">
                Selected: {selectedValues.join(', ')}
              </p>
            )}
          </div>
        );

      case 'number':
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => handleFieldChange(field.id, Number(e.target.value))}
            placeholder={field.placeholder}
            min={field.validation?.min}
            max={field.validation?.max}
            className={`w-full p-3 rounded-lg bg-dark-700 text-white border ${
              error ? 'border-red-500' : 'border-dark-600'
            } focus:border-primary-500 focus:outline-none`}
          />
        );

      case 'date':
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => handleFieldChange(field.id, e.target.value)}
            className={`w-full p-3 rounded-lg bg-dark-700 text-white border ${
              error ? 'border-red-500' : 'border-dark-600'
            } focus:border-primary-500 focus:outline-none`}
          />
        );

      case 'checkbox':
        return (
          <label className="flex items-center space-x-3 cursor-pointer">
            <input
              type="checkbox"
              checked={value || false}
              onChange={(e) => handleFieldChange(field.id, e.target.checked)}
              className="w-4 h-4 text-primary-500 bg-dark-700 border-dark-600 rounded focus:ring-primary-500"
            />
            <span className="text-gray-300">{field.label}</span>
          </label>
        );

      case 'file':
        return (
          <FileUpload
            onFilesSelected={(files) => handleFieldChange(field.id, files)}
            acceptedTypes="audio/*,video/*,image/*,.pdf,.doc,.docx,.txt"
            multiple={true}
            maxSize={100}
          />
        );

      default:
        return null;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-2">{step.title}</h2>
        <p className="text-gray-400">{step.description}</p>
      </div>

      <div className="space-y-6">
        {step.fields.map(field => (
          <div key={field.id}>
            <label className="block text-gray-300 mb-2 font-medium">
              {field.label}
              {field.required && <span className="text-red-500 ml-1">*</span>}
            </label>
            {renderField(field)}
            {errors[field.id] && (
              <p className="text-red-500 text-sm mt-1">{errors[field.id]}</p>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between pt-6">
        <button
          type="button"
          onClick={onBack}
          disabled={isFirst}
          className={`flex items-center space-x-2 px-6 py-3 rounded-lg font-semibold transition-colors ${
            isFirst
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-dark-700 text-gray-300 hover:bg-dark-600'
          }`}
        >
          <ChevronLeft className="w-5 h-5" />
          Back
        </button>

        <button
          type="button"
          onClick={handleNext}
          className="flex items-center space-x-2 px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
        >
          {isLast ? 'Create Collaboration' : 'Next'}
          {!isLast && <ChevronRight className="w-5 h-5" />}
        </button>
      </div>
    </motion.div>
  );
};

// Template selection component
const TemplateSelection: React.FC<{
  templates: CollaborationTemplate[];
  onSelectTemplate: (template: CollaborationTemplate) => void;
}> = ({ templates, onSelectTemplate }) => {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-white mb-4">Start a Collaboration</h1>
        <p className="text-gray-400 text-lg">
          Choose a template to get started with your musical collaboration
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <motion.div
            key={template.id}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-dark-800 rounded-xl p-6 border border-dark-700 hover:border-primary-500 transition-colors cursor-pointer"
            onClick={() => onSelectTemplate(template)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Music className="w-6 h-6 text-primary-400" />
                <span className="text-sm font-semibold text-primary-400">{template.category}</span>
              </div>
              {template.isPopular && (
                <span className="bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded text-xs font-semibold">
                  Popular
                </span>
              )}
            </div>

            <h3 className="text-xl font-bold text-white mb-2">{template.name}</h3>
            <p className="text-gray-400 mb-4">{template.description}</p>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                <Users className="w-4 h-4" />
                <span>{template.usageCount} uses</span>
              </div>
              <div className="flex items-center space-x-1">
                {template.steps.map((_, index) => (
                  <div
                    key={index}
                    className="w-2 h-2 rounded-full bg-gray-600"
                  />
                ))}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="text-center mt-8">
        <p className="text-gray-400">
          Don't see what you're looking for?{' '}
          <button className="text-primary-400 hover:text-primary-300 underline">
            Create a custom template
          </button>
        </p>
      </div>
    </div>
  );
};

// Progress indicator component
const ProgressIndicator: React.FC<{
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
}> = ({ currentStep, totalSteps, completedSteps }) => {
  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">
          Step {currentStep} of {totalSteps}
        </h3>
        <span className="text-sm text-gray-400">
          {completedSteps.length} of {totalSteps} completed
        </span>
      </div>
      
      <div className="flex space-x-2">
        {Array.from({ length: totalSteps }, (_, index) => {
          const stepNumber = index + 1;
          const isCompleted = completedSteps.includes(stepNumber);
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div
              key={stepNumber}
              className={`flex-1 h-2 rounded-full transition-colors ${
                isCompleted
                  ? 'bg-green-500'
                  : isCurrent
                  ? 'bg-primary-500'
                  : 'bg-gray-700'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
};

const StartCollaborationPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<CollaborationTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<CollaborationTemplate | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [formData, setFormData] = useState<{ [key: string]: any }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    const loadTemplates = async () => {
      try {
        const loadedTemplates = await getCollaborationTemplates();
        setTemplates(loadedTemplates);
      } catch (error) {
        console.error('Error loading templates:', error);
        setTemplates(defaultTemplates);
      }
    };

    loadTemplates();
  }, [user, navigate]);

  const handleTemplateSelect = (template: CollaborationTemplate) => {
    setSelectedTemplate(template);
    setCurrentStep(1);
    setCompletedSteps([]);
    setFormData({});
  };

  const handleFieldChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleStepComplete = () => {
    setCompletedSteps(prev => [...prev, currentStep]);
    
    if (currentStep < selectedTemplate!.steps.length) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleCreateCollaboration();
    }
  };

  const handleStepBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setCompletedSteps(prev => prev.filter(step => step !== currentStep));
    } else {
      setSelectedTemplate(null);
      setCurrentStep(1);
      setCompletedSteps([]);
      setFormData({});
    }
  };

  const handleCreateCollaboration = async () => {
    if (!user || !selectedTemplate) return;

    setIsCreating(true);
    try {
      // Transform form data to collaboration format
      const collaborationData = {
        title: formData.title || '',
        description: formData.description || '',
        creatorId: user.uid,
        creatorName: user.displayName || user.email || 'Musician',
        creatorAvatar: user.photoURL || undefined,
        genre: formData.genre || '',
        instruments: formData.instruments || [],
        collaborationType: (selectedTemplate.id.includes('cover') ? 'cover' : 
                         selectedTemplate.id.includes('original') ? 'original' : 
                         selectedTemplate.id.includes('jam') ? 'jam' : 'other') as 'cover' | 'original' | 'remix' | 'jam' | 'composition' | 'other',
        status: 'open' as const,
        privacy: formData.privacy?.toLowerCase() || 'public',
        maxParticipants: formData.maxParticipants || undefined,
        currentParticipants: 1,
        participants: [],
        requirements: formData.requirements ? (Array.isArray(formData.requirements) ? formData.requirements : [formData.requirements]) : [],
        timeline: {
          startDate: formData.startDate || new Date().toISOString(),
          endDate: formData.endDate || undefined,
          milestones: []
        },
        attachments: formData.attachments ? formData.attachments.map((file: File, index: number) => ({
          id: `file_${index}`,
          name: file.name,
          type: file.type.startsWith('audio/') ? 'audio' : 
                file.type.startsWith('video/') ? 'video' : 
                file.type.startsWith('image/') ? 'image' : 'document',
          url: '', // Will be uploaded separately
          size: file.size,
          uploadedAt: new Date(),
          uploadedBy: user.uid,
          description: ''
        })) : [],
        tags: [],
        referenceLinks: formData.referenceLinks ? formData.referenceLinks.split('\n').filter((url: string) => url.trim()) : [],
        location: formData.location?.toLowerCase() || 'online',
        locationDetails: formData.locationDetails || '',
        compensation: formData.compensation?.toLowerCase() || 'free',
        compensationDetails: formData.compensationDetails || '',
        isVerified: true // Assuming verified users can create collaborations
      };

      console.log('Submitting collaboration data:', collaborationData);
      
      // Validate required fields
      if (!collaborationData.title || !collaborationData.description || !collaborationData.genre) {
        toast.error('Please fill in all required fields');
        return;
      }
      
      const collaborationId = await createCollaboration(collaborationData);
      console.log('Collaboration created successfully with ID:', collaborationId);
      
      toast.success('Collaboration created successfully!');
      navigate(`/collaborations/${collaborationId}`);
    } catch (error) {
      console.error('Error creating collaboration:', error);
      toast.error('Failed to create collaboration. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Start Collaboration | SoundAlchemy – Create Musical Collaborations"
        description="Start a new musical collaboration on SoundAlchemy. Choose from templates for cover songs, original compositions, jam sessions, and more."
        keywords="collaboration, music collaboration, cover song, original composition, jam session, musicians, soundalchemy"
        image="https://soundalcmy.com/public/Logos/SoundAlcmyLogo2.png"
        url="https://soundalcmy.com/start-collaboration"
        lang="en"
      />
      
      <div className="min-h-screen bg-dark-900 text-white">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <AnimatePresence mode="wait">
            {!selectedTemplate ? (
              <motion.div
                key="templates"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <TemplateSelection
                  templates={templates}
                  onSelectTemplate={handleTemplateSelect}
                />
              </motion.div>
            ) : (
              <motion.div
                key="form"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <div className="mb-6">
                  <button
                    onClick={() => handleStepBack()}
                    className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                    <span>Back to templates</span>
                  </button>
                </div>

                <ProgressIndicator
                  currentStep={currentStep}
                  totalSteps={selectedTemplate.steps.length}
                  completedSteps={completedSteps}
                />

                <StepForm
                  step={selectedTemplate.steps[currentStep - 1]}
                  formData={formData}
                  onFieldChange={handleFieldChange}
                  onComplete={handleStepComplete}
                  onBack={handleStepBack}
                  isFirst={currentStep === 1}
                  isLast={currentStep === selectedTemplate.steps.length}
                />

                {isCreating && (
                  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-dark-800 rounded-xl p-8 text-center">
                      <Loader className="w-8 h-8 animate-spin mx-auto mb-4 text-primary-500" />
                      <p className="text-white font-semibold">Creating your collaboration...</p>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
};

export default StartCollaborationPage; 