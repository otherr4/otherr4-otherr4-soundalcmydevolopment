import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize with the provided API key
const GEMINI_API_KEY = 'AIzaSyBV12HPHIu1sH2Nj2T8P0irVuSScFOhPws';

if (!GEMINI_API_KEY) {
  console.warn('Gemini API key not found. AI features will be disabled.');
}

const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;

// Helper function to safely use the AI model
const getModel = () => {
  if (!genAI) {
    throw new Error('AI service is not initialized. Please check your API key configuration.');
  }
  // Use gemini-1.5-flash which is available in the free tier
  return genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
};

interface AiResponse {
  success: boolean;
  text?: string;
  error?: string;
}

interface AiServiceStatus {
  available: boolean;
  error?: string;
  model?: string;
}

/**
 * Check if the AI service is available and working
 */
export const checkAiServiceStatus = async (): Promise<AiServiceStatus> => {
  try {
    if (!genAI) {
      return { 
        available: false, 
        error: 'AI service not initialized - missing API key' 
      };
    }
    
    const model = getModel();
    const result = await model.generateContent('Test connection');
    const response = result.response;
    const text = response.text();
    
    if (text && text.trim().length > 0) {
      return { 
        available: true, 
        model: 'gemini-1.5-flash' 
      };
    } else {
      return { 
        available: false, 
        error: 'Empty response from AI service' 
      };
    }
  } catch (error) {
    console.error('AI service status check failed:', error);
    
    let errorMessage = 'Unknown error';
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        errorMessage = 'Model not found - check API configuration';
      } else if (error.message.includes('403')) {
        errorMessage = 'API key invalid or quota exceeded';
      } else if (error.message.includes('429')) {
        errorMessage = 'Rate limit exceeded';
      } else {
        errorMessage = error.message;
      }
    }
    
    return { 
      available: false, 
      error: errorMessage 
    };
  }
};

/**
 * Generate AI-powered response based on the prompt
 */
export const generateAiResponse = async (prompt: string): Promise<AiResponse> => {
  try {
    if (!genAI) {
      throw new Error('AI service is not initialized');
    }
    
    const model = getModel();
    const result = await model.generateContent(prompt);
    const response = result.response;
    const text = response.text();
    
    if (!text || text.trim().length === 0) {
      throw new Error('Empty response from AI service');
    }
    
    return { success: true, text: text.trim() };
  } catch (error) {
    console.error("Error generating AI response:", error);
    
    // Provide more specific error messages
    let errorMessage = "Failed to generate AI response";
    if (error instanceof Error) {
      if (error.message.includes('404')) {
        errorMessage = "AI model not found - please check API configuration";
      } else if (error.message.includes('403')) {
        errorMessage = "API key invalid or quota exceeded";
      } else if (error.message.includes('429')) {
        errorMessage = "API rate limit exceeded - please try again later";
      } else {
        errorMessage = error.message;
      }
    }
    
    return { 
      success: false, 
      error: errorMessage
    };
  }
};

/**
 * Generate personalized welcome message for new users
 */
export const generateWelcomeMessage = async (userName: string, instrumentType: string): Promise<string> => {
  const prompt = `
    Create a warm, personalized welcome message for a musician named ${userName} who plays ${instrumentType}.
    The message should be enthusiastic, mention SoundAlchemy as a global platform for musicians, 
    and encourage them to complete their profile while waiting for verification.
    Keep it under 3 paragraphs and make it sound genuine and friendly.
  `;
  
  const response = await generateAiResponse(prompt);
  
  if (response.success && response.text) {
    return response.text;
  }
  
  // Fallback message if AI generation fails
  return `Welcome to SoundAlchemy, ${userName}! We're thrilled to have you join our global community of musicians. Your passion for ${instrumentType} will find a perfect home here. While your account is being verified, feel free to explore the platform and complete your profile to connect with fellow musicians worldwide.`;
};

/**
 * Generate a fallback bio without AI
 */
export const generateFallbackBio = (userName: string, instrumentTypes: string[]): string => {
  const instruments = instrumentTypes.join(', ');
  const templates = [
    `I'm ${userName}, a passionate musician with a deep love for ${instruments}. My musical journey has been filled with exploration and growth, constantly pushing the boundaries of what's possible with these instruments. I believe in the power of music to connect people across cultures and create meaningful experiences.`,
    
    `${userName} here! I've dedicated years to mastering ${instruments}, developing a unique style that blends traditional techniques with modern innovation. My approach focuses on creating emotional connections through music, whether performing solo or collaborating with other artists.`,
    
    `As ${userName}, I bring a fresh perspective to ${instruments}, combining technical skill with creative expression. My musical philosophy centers around authenticity and storytelling, using these instruments to share stories and emotions that resonate with audiences worldwide.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

/**
 * Generate a fallback talent description without AI
 */
export const generateFallbackTalentDescription = (userName: string, instrumentTypes: string[], singingTypes: string[]): string => {
  const allTalents = [...instrumentTypes, ...singingTypes];
  const talents = allTalents.join(', ');
  
  const templates = [
    `What makes me unique is my ability to seamlessly blend different musical styles and techniques. I've developed innovative approaches to ${talents} that create distinctive sounds and memorable performances. My creative process involves experimentation and collaboration, always pushing artistic boundaries.`,
    
    `My uniqueness lies in my versatile approach to ${talents}. I've cultivated a signature style that combines technical precision with emotional depth, creating performances that are both technically impressive and deeply moving. I specialize in creating unexpected musical moments that surprise and delight audiences.`,
    
    `I stand out through my innovative use of ${talents}, developing techniques that bridge traditional and contemporary approaches. My performances are characterized by dynamic energy, creative improvisation, and a commitment to musical storytelling that connects with listeners on a profound level.`
  ];
  
  return templates[Math.floor(Math.random() * templates.length)];
};

/**
 * Analyze user bio for professional profile suggestions
 */
export const analyzeBioForSuggestions = async (bio: string): Promise<string[]> => {
  try {
    if (!genAI) {
      return [
        "Add specific musical achievements",
        "Mention collaboration experience",
        "Include musical influences"
      ];
    }

    const model = getModel();
    const prompt = `As a music industry expert, analyze this musician's bio and provide 3 specific suggestions to improve their profile and increase their chances of getting collaborations:
    
    Bio: "${bio}"
    
    Provide suggestions in a concise, actionable format. Focus on:
    1. Profile completeness
    2. Professional presentation
    3. Unique selling points
    4. Collaboration potential`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.split('\n').filter(line => line.trim().length > 0);
  } catch (error) {
    console.error('Error getting bio suggestions:', error);
    return [
      "Add specific musical achievements",
      "Mention collaboration experience",
      "Include musical influences"
    ];
  }
};

/**
 * Generate collaboration ideas based on user profile
 */
export const generateCollaborationIdeas = async (
  instrumentType: string,
  musicCulture: string
): Promise<string[]> => {
  try {
    if (!genAI) {
      return [
        `Create a fusion track combining ${musicCulture} rhythms with modern elements`,
        `Collaborate with vocalists from different cultures to create a multilingual piece`,
        `Develop a traditional ${musicCulture} piece with contemporary instrumentation`
      ];
    }

    const model = getModel();
    const prompt = `As a music collaboration expert, suggest 3 unique collaboration opportunities for a musician with these characteristics:
    
    Instrument: ${instrumentType}
    Music Culture: ${musicCulture}
    
    For each suggestion, include:
    1. A creative project idea
    2. Potential collaborators to reach out to
    3. Why this collaboration would be valuable
    4. Next steps to make it happen`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.split('\n').filter(line => line.trim().length > 0);
  } catch (error) {
    console.error('Error generating collaboration ideas:', error);
    return [
      `Create a fusion track combining ${musicCulture} rhythms with modern elements`,
      `Collaborate with vocalists from different cultures to create a multilingual piece`,
      `Develop a traditional ${musicCulture} piece with contemporary instrumentation`
    ];
  }
};

/**
 * Generate personalized practice recommendations
 */
export const generatePracticeRecommendations = async (
  instrumentType: string,
  skillLevel: string,
  goals: string
): Promise<string[]> => {
  const prompt = `
    Create 3 personalized practice recommendations for a ${skillLevel} level ${instrumentType} player
    with the following goals: ${goals}. Make each recommendation specific, actionable, and motivating.
    Include time estimates and expected outcomes.
  `;
  
  const response = await generateAiResponse(prompt);
  
  if (response.success && response.text) {
    const recommendations = response.text
      .split(/\d+\.\s+/)
      .filter(item => item.trim().length > 0)
      .map(item => item.trim());
    
    return recommendations;
  }
  
  return [
    "Practice fundamental techniques for 30 minutes daily",
    "Record and analyze your playing weekly",
    "Learn one new piece from your target genre monthly"
  ];
};

/**
 * Generate performance feedback
 */
export const generatePerformanceFeedback = async (
  performanceDetails: string
): Promise<{
  strengths: string[];
  improvements: string[];
  nextSteps: string[];
}> => {
  const prompt = `
    Analyze this musical performance and provide professional feedback:
    ${performanceDetails}
    
    Structure the feedback into three sections:
    1. Strengths (3 points)
    2. Areas for Improvement (3 points)
    3. Recommended Next Steps (3 specific actions)
    
    Keep each point concise and constructive.
  `;
  
  const response = await generateAiResponse(prompt);
  
  if (response.success && response.text) {
    // Parse the sections
    const sections = response.text.split(/\n\n/);
    
    return {
      strengths: sections[0]?.split(/\n/).filter(item => item.trim()) || [],
      improvements: sections[1]?.split(/\n/).filter(item => item.trim()) || [],
      nextSteps: sections[2]?.split(/\n/).filter(item => item.trim()) || []
    };
  }
  
  return {
    strengths: ["Technical proficiency", "Emotional expression", "Timing accuracy"],
    improvements: ["Dynamic range", "Phrase endings", "Stage presence"],
    nextSteps: ["Practice with metronome", "Record and analyze", "Perform for peers"]
  };
};

/**
 * Generate musical style analysis
 */
export const generateStyleAnalysis = async (
  musicStyle: string,
  culturalContext: string
): Promise<{
  characteristics: string[];
  techniques: string[];
  influences: string[];
}> => {
  const prompt = `
    Provide a detailed analysis of ${musicStyle} music in the context of ${culturalContext}.
    Include:
    1. Key musical characteristics
    2. Essential techniques
    3. Historical and cultural influences
    
    Make each point specific and educational.
  `;
  
  const response = await generateAiResponse(prompt);
  
  if (response.success && response.text) {
    const sections = response.text.split(/\n\n/);
    
    return {
      characteristics: sections[0]?.split(/\n/).filter(item => item.trim()) || [],
      techniques: sections[1]?.split(/\n/).filter(item => item.trim()) || [],
      influences: sections[2]?.split(/\n/).filter(item => item.trim()) || []
    };
  }
  
  return {
    characteristics: ["Rhythmic patterns", "Melodic structure", "Harmonic progression"],
    techniques: ["Ornamentation", "Improvisation", "Traditional methods"],
    influences: ["Historical events", "Cultural exchange", "Modern adaptations"]
  };
};

export const analyzeMusicPortfolio = async (tracks: any[]): Promise<any> => {
  try {
    if (!genAI) {
      return {
        analysis: "AI analysis is currently unavailable. Please try again later.",
        recommendations: [
          "Focus on consistent upload schedule",
          "Diversify your musical styles",
          "Engage with your audience"
        ]
      };
    }

    const model = getModel();
    const prompt = `As a music industry analyst, analyze this musician's portfolio and provide insights:
    
    Tracks: ${JSON.stringify(tracks)}
    
    Provide analysis on:
    1. Genre diversity
    2. Production quality
    3. Market potential
    4. Areas for improvement
    5. Recommended next steps`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return {
      analysis: text,
      recommendations: text.split('\n').filter(line => line.trim().length > 0)
    };
  } catch (error) {
    console.error('Error analyzing music portfolio:', error);
    return {
      analysis: "AI analysis is currently unavailable. Please try again later.",
      recommendations: [
        "Focus on consistent upload schedule",
        "Diversify your musical styles",
        "Engage with your audience"
      ]
    };
  }
};

export const generateLearningRecommendations = async (
  instrumentType: string,
  musicCulture: string,
  currentCourses: any[]
): Promise<any> => {
  try {
    if (!genAI) {
      return {
        recommendations: [
          "Practice daily with a structured routine",
          "Learn music theory fundamentals",
          "Study different musical styles"
        ],
        suggestedCourses: [
          "Basic Music Theory",
          "Instrument Technique",
          "Music Production"
        ]
      };
    }

    const model = getModel();
    const prompt = `As a music education expert, provide personalized learning recommendations for a musician with these characteristics:
    
    Instrument: ${instrumentType}
    Music Culture: ${musicCulture}
    Current Courses: ${JSON.stringify(currentCourses)}
    
    Provide recommendations for:
    1. Skill development areas
    2. Recommended courses
    3. Practice techniques
    4. Learning resources
    5. Certification paths`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return {
      recommendations: text.split('\n').filter(line => line.trim().length > 0),
      suggestedCourses: text.split('\n').filter(line => line.includes('course') || line.includes('Course'))
    };
  } catch (error) {
    console.error('Error generating learning recommendations:', error);
    return {
      recommendations: [
        "Practice daily with a structured routine",
        "Learn music theory fundamentals",
        "Study different musical styles"
      ],
      suggestedCourses: [
        "Basic Music Theory",
        "Instrument Technique",
        "Music Production"
      ]
    };
  }
};

export const matchCollaborationOpportunities = async (
  profile: any,
  portfolio: any[]
): Promise<any[]> => {
  try {
    if (!genAI) {
      return [
        {
          id: "1",
          title: "Cross-cultural Fusion Project",
          description: "Create a fusion track combining traditional and modern elements",
          requirements: ["Basic recording equipment", "Collaboration experience"],
          collaborators: ["Vocalists", "Producers"],
          timeline: "2-3 months",
          outcomes: ["New musical connections", "Expanded audience reach"]
        }
      ];
    }

    const model = getModel();
    const prompt = `As a music collaboration matchmaker, find the best collaboration opportunities for this musician:
    
    Profile: ${JSON.stringify(profile)}
    Portfolio: ${JSON.stringify(portfolio)}
    
    For each opportunity, provide:
    1. Project description
    2. Required skills
    3. Potential collaborators
    4. Timeline
    5. Expected outcomes`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    return text.split('\n\n').map(opp => {
      const lines = opp.split('\n');
      return {
        id: Math.random().toString(36).substr(2, 9),
        title: lines[0],
        description: lines[1],
        requirements: lines[2],
        collaborators: lines[3],
        timeline: lines[4],
        outcomes: lines[5]
      };
    });
  } catch (error) {
    console.error('Error matching collaboration opportunities:', error);
    return [
      {
        id: "1",
        title: "Cross-cultural Fusion Project",
        description: "Create a fusion track combining traditional and modern elements",
        requirements: ["Basic recording equipment", "Collaboration experience"],
        collaborators: ["Vocalists", "Producers"],
        timeline: "2-3 months",
        outcomes: ["New musical connections", "Expanded audience reach"]
      }
    ];
  }
};