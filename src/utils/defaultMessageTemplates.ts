import { MessageTemplate } from '../services/adminMessagingService';

export const defaultMessageTemplates: Omit<MessageTemplate, 'id' | 'createdAt' | 'updatedAt' | 'usageCount'>[] = [
  // Verification Templates
  {
    name: 'Verification Welcome',
    content: 'Hi {{userName}}! Welcome to SoundAlchemy! Your account is currently {{verificationStatus}}. We\'re excited to have you join our global community of {{instrumentType}} musicians. While your verification is being processed, feel free to explore the platform and connect with other musicians.',
    category: 'verification',
    variables: ['userName', 'verificationStatus', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['welcome', 'verification', 'onboarding']
  },
  {
    name: 'Verification Status Update',
    content: 'Hello {{userName}}! I wanted to update you on your verification status. Your account is currently {{verificationStatus}}. If you need any additional documentation or have questions about the verification process, please don\'t hesitate to reach out. We\'re here to help you get verified as quickly as possible!',
    category: 'verification',
    variables: ['userName', 'verificationStatus'],
    isActive: true,
    createdBy: 'system',
    tags: ['status', 'verification', 'update']
  },
  {
    name: 'Verification Approved',
    content: 'Congratulations {{userName}}! 🎉 Your verification has been approved! You now have full access to all SoundAlchemy features. As a verified {{instrumentType}} musician, you can connect with other artists, collaborate on projects, and showcase your talent to the world. Welcome to the SoundAlchemy family!',
    category: 'verification',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['approved', 'congratulations', 'verification']
  },
  {
    name: 'Verification Rejected',
    content: 'Hi {{userName}}, thank you for your interest in SoundAlchemy. Unfortunately, we couldn\'t approve your verification at this time. This might be due to missing documentation or unclear information. Please review your profile and provide additional details or documentation. We\'re happy to help you through this process.',
    category: 'verification',
    variables: ['userName'],
    isActive: true,
    createdBy: 'system',
    tags: ['rejected', 'verification', 'support']
  },

  // Support Templates
  {
    name: 'General Support Welcome',
    content: 'Hello {{userName}}! Thank you for reaching out to SoundAlchemy support. I\'m here to help you with any questions about your {{musicCulture}} journey on our platform. How can I assist you today?',
    category: 'support',
    variables: ['userName', 'musicCulture'],
    isActive: true,
    createdBy: 'system',
    tags: ['support', 'welcome', 'general']
  },
  {
    name: 'Feature Explanation',
    content: 'Hi {{userName}}! Great question about that feature. Let me explain how it works and how it can benefit your {{instrumentType}} journey. This feature is designed to help musicians like you connect and collaborate more effectively.',
    category: 'support',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['feature', 'explanation', 'help']
  },
  {
    name: 'Platform Guidance',
    content: 'Hello {{userName}}! I\'d be happy to guide you through that aspect of SoundAlchemy. As a {{instrumentType}} player, you\'ll find this feature particularly useful for your musical journey. Let me walk you through the process step by step.',
    category: 'support',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['guidance', 'tutorial', 'help']
  },

  // Technical Templates
  {
    name: 'Technical Issue Acknowledgment',
    content: 'Hi {{userName}}, thank you for reporting this technical issue. I understand how frustrating this can be when you\'re trying to focus on your {{instrumentType}} work. Our technical team has been notified and is working to resolve this as quickly as possible.',
    category: 'technical',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['technical', 'bug', 'acknowledgment']
  },
  {
    name: 'Technical Issue Resolution',
    content: 'Great news {{userName}}! The technical issue you reported has been resolved. You should now be able to use the feature normally. Thank you for your patience while we worked on this. If you encounter any other issues, please don\'t hesitate to reach out.',
    category: 'technical',
    variables: ['userName'],
    isActive: true,
    createdBy: 'system',
    tags: ['technical', 'resolved', 'update']
  },
  {
    name: 'Performance Issue Support',
    content: 'Hello {{userName}}, I\'m sorry to hear you\'re experiencing performance issues. This can definitely impact your {{instrumentType}} workflow. Let me help you troubleshoot this. Could you provide a bit more detail about what you\'re experiencing?',
    category: 'technical',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['performance', 'technical', 'support']
  },

  // Collaboration Templates
  {
    name: 'Collaboration Opportunity',
    content: 'Hi {{userName}}! I noticed you\'re interested in collaboration opportunities. As a {{instrumentType}} player with a background in {{musicCulture}}, you have some exciting possibilities ahead. Would you like me to help you find potential collaborators or projects?',
    category: 'general',
    variables: ['userName', 'instrumentType', 'musicCulture'],
    isActive: true,
    createdBy: 'system',
    tags: ['collaboration', 'opportunity', 'networking']
  },
  {
    name: 'Project Connection',
    content: 'Hello {{userName}}! I found a perfect project opportunity for your {{instrumentType}} skills. There\'s a {{musicCulture}} project looking for someone with your expertise. Would you like me to connect you with the project creator?',
    category: 'general',
    variables: ['userName', 'instrumentType', 'musicCulture'],
    isActive: true,
    createdBy: 'system',
    tags: ['project', 'connection', 'opportunity']
  },

  // Feature Request Templates
  {
    name: 'Feature Request Acknowledgment',
    content: 'Thank you for your feature request, {{userName}}! We love hearing ideas from our {{instrumentType}} community. Your suggestion has been logged and will be reviewed by our development team. We\'ll keep you updated on any progress.',
    category: 'feature',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['feature', 'request', 'acknowledgment']
  },
  {
    name: 'Feature Request Update',
    content: 'Hi {{userName}}! Great news about your feature request. Our development team has reviewed it and it\'s now in our roadmap. We\'re excited to bring this enhancement to our {{instrumentType}} community. We\'ll notify you when it\'s available!',
    category: 'feature',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['feature', 'update', 'roadmap']
  },

  // Billing Templates
  {
    name: 'Billing Support',
    content: 'Hello {{userName}}, I\'m here to help you with your billing question. I understand billing issues can be stressful when you\'re trying to focus on your {{instrumentType}} work. Let me assist you with resolving this quickly.',
    category: 'billing',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['billing', 'support', 'payment']
  },
  {
    name: 'Payment Confirmation',
    content: 'Hi {{userName}}! I can confirm that your payment has been processed successfully. Your account is now fully active with all premium features available. Thank you for supporting SoundAlchemy and the {{instrumentType}} community!',
    category: 'billing',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['billing', 'confirmation', 'payment']
  },

  // General Templates
  {
    name: 'Welcome Back',
    content: 'Welcome back {{userName}}! It\'s great to see you back on SoundAlchemy. Your {{instrumentType}} journey continues here, and we\'re excited to see what you\'ll create next. Is there anything new you\'d like to explore on the platform?',
    category: 'general',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['welcome', 'return', 'engagement']
  },
  {
    name: 'Community Update',
    content: 'Hi {{userName}}! I wanted to share some exciting updates about the SoundAlchemy {{musicCulture}} community. We\'ve seen some amazing collaborations and projects recently. Would you like to know more about what\'s happening in your musical community?',
    category: 'general',
    variables: ['userName', 'musicCulture'],
    isActive: true,
    createdBy: 'system',
    tags: ['community', 'update', 'engagement']
  },
  {
    name: 'Feedback Request',
    content: 'Hello {{userName}}! We value your experience as a {{instrumentType}} musician on SoundAlchemy. Would you mind sharing your thoughts on how we can improve the platform for musicians like you? Your feedback helps us create a better experience for everyone.',
    category: 'general',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['feedback', 'improvement', 'community']
  },

  // Urgent Templates
  {
    name: 'Urgent Issue Response',
    content: 'Hi {{userName}}, I understand this is urgent and I\'m here to help immediately. Your {{instrumentType}} work is important, and we\'re prioritizing this issue. I\'ve escalated this to our technical team and will keep you updated every step of the way.',
    category: 'technical',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['urgent', 'priority', 'escalation']
  },
  {
    name: 'Security Concern',
    content: 'Hello {{userName}}, thank you for bringing this security concern to our attention. We take security very seriously, especially for our {{instrumentType}} community. I\'ve immediately escalated this to our security team for investigation.',
    category: 'technical',
    variables: ['userName', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['security', 'urgent', 'priority']
  },

  // Encouragement Templates
  {
    name: 'Musical Encouragement',
    content: 'Hi {{userName}}! I wanted to take a moment to encourage you in your {{instrumentType}} journey. Your dedication to {{musicCulture}} music is inspiring, and we\'re honored to be part of your musical story. Keep creating amazing music!',
    category: 'general',
    variables: ['userName', 'instrumentType', 'musicCulture'],
    isActive: true,
    createdBy: 'system',
    tags: ['encouragement', 'motivation', 'community']
  },
  {
    name: 'Achievement Recognition',
    content: 'Congratulations {{userName}}! 🎉 We noticed your recent achievements in the {{musicCulture}} community. Your {{instrumentType}} skills are making a real impact. Keep up the amazing work - you\'re inspiring other musicians!',
    category: 'general',
    variables: ['userName', 'musicCulture', 'instrumentType'],
    isActive: true,
    createdBy: 'system',
    tags: ['achievement', 'recognition', 'congratulations']
  }
];

export const getTemplateByCategory = (category: string) => {
  return defaultMessageTemplates.filter(template => template.category === category);
};

export const getTemplateByTag = (tag: string) => {
  return defaultMessageTemplates.filter(template => template.tags.includes(tag));
};

export const searchTemplates = (searchTerm: string) => {
  const lowerSearchTerm = searchTerm.toLowerCase();
  return defaultMessageTemplates.filter(template => 
    template.name.toLowerCase().includes(lowerSearchTerm) ||
    template.content.toLowerCase().includes(lowerSearchTerm) ||
    template.tags.some(tag => tag.toLowerCase().includes(lowerSearchTerm))
  );
}; 