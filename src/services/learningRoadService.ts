import { GoogleGenerativeAI } from '@google/generative-ai';
import { getLanguageNameByCode } from './languageService';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface LearningStep {
  step: number;
  title: string;
  description: string;
  estimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  prerequisites?: string[];
  keyTopics: string[];
  practiceExercises: string[];
}

export interface LearningPath {
  id: string;
  topic: string;
  totalEstimatedTime: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced' | 'Mixed';
  description: string;
  steps: LearningStep[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
}

export interface LearningMaterial {
  id: string;
  stepTitle: string;
  topic: string;
  introduction: string;
  sections: {
    title: string;
    content: string;
    examples?: string[];
    keyPoints?: string[];
  }[];
  summary: string;
  nextSteps: string[];
  estimatedReadTime: string;
}

export class LearningRoadService {
  private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

  /**
   * Create the prompt for learning path generation
   */
  private createLearningPathPrompt(topic: string, language:string): string {
    return `You are an expert educational curriculum designer. Create a comprehensive learning path for the topic: "${topic}".

Generate a structured learning path with 5-8 progressive steps that build upon each other. Each step should be designed to help a student master the topic systematically.

Format your response as a JSON object with this exact structure:

{
  "id": "unique_id",
  "topic": "${topic}",
  "totalEstimatedTime": "X hours Y minutes",
  "difficulty": "Beginner|Intermediate|Advanced|Mixed",
  "description": "Brief overview of what the student will learn",
  "steps": [
    {
      "step": 1,
      "title": "Step title",
      "description": "Detailed description of what this step covers",
      "estimatedTime": "X min",
      "difficulty": "Beginner|Intermediate|Advanced",
      "prerequisites": ["Previous step titles if any"],
      "keyTopics": ["Topic 1", "Topic 2", "Topic 3"],
      "practiceExercises": ["Exercise 1", "Exercise 2", "Exercise 3"]
    }
  ]
}
CRITICAL RULES:
- **Primary Language:** Your entire response MUST be in ${language}. This is a strict requirement.

IMPORTANT RULES:
- Return ONLY valid JSON, no additional text or markdown
- Create 5-8 progressive steps that build logically
- Each step should have 3-5 key topics and 3-5 practice exercises
- Estimated times should be realistic (15-90 minutes per step)
- Prerequisites should reference actual previous step titles
- Make the learning path comprehensive but achievable
- Difficulty should progress naturally from easier to harder concepts
- Include practical, hands-on exercises for each step`;
  }

  /**
   * Create the prompt for learning material generation
   */
  private createLearningMaterialPrompt(topic: string, stepTitle: string, stepDescription: string, keyTopics: string[],  language:string): string {
    return `You are an expert educational content creator. Generate comprehensive learning material for:

Topic: "${topic}"
Learning Step: "${stepTitle}"
Description: "${stepDescription}"
Key Topics to Cover: ${keyTopics.join(', ')}

Create detailed, educational content that helps students understand these concepts thoroughly.

Format your response as a JSON object with this exact structure:

{
  "id": "unique_id",
  "stepTitle": "${stepTitle}",
  "topic": "${topic}",
  "introduction": "Engaging introduction that explains what the student will learn",
  "sections": [
    {
      "title": "Section title",
      "content": "Detailed explanation of the concept (2-3 paragraphs)",
      "examples": ["Example 1", "Example 2", "Example 3"],
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
    }
  ],
  "summary": "Comprehensive summary of what was learned",
  "nextSteps": ["What to do next", "How to practice", "Further reading"],
  "estimatedReadTime": "X minutes"
}
CRITICAL RULES:
- **Primary Language:** Your entire response MUST be in ${language}. This is a strict requirement.

IMPORTANT RULES:
- Return ONLY valid JSON, no additional text or markdown
- Create 3-5 sections covering different aspects of the topic
- Each section should have detailed content (150-300 words)
- Include practical examples and real-world applications
- Key points should be concise and memorable
- Make content educational, engaging, and easy to understand
- Estimated read time should be realistic (5-20 minutes)
- Content should be appropriate for the learning level`;
  }

  /**
   * Create the prompt for quiz generation
   */
  private createQuizPrompt(topic: string, stepTitle: string,  language:string): string {
    return `You are an expert educator creating quiz questions for the topic: "${topic}", specifically for the learning step: "${stepTitle}".

Create 3-5 multiple choice questions that test understanding of this specific step. Questions should be educational and help reinforce learning.

Format your response as a JSON array with this exact structure:

[
  {
    "id": "unique_id",
    "question": "Clear, specific question about the topic",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Detailed explanation of why this answer is correct and why others are wrong",
    "difficulty": "Easy|Medium|Hard"
  }
]

CRITICAL RULES:
- **Primary Language:** Your entire response MUST be in ${language}. This is a strict requirement.

IMPORTANT RULES:
- Return ONLY valid JSON, no additional text or markdown
- Create 3-5 questions per topic
- Each question should have exactly 4 options
- correctAnswer should be the index (0-3) of the correct option
- Explanations should be educational and help students learn
- Mix difficulty levels appropriately
- Questions should be specific to the step topic, not general knowledge
- Avoid trick questions - focus on genuine understanding`;
  }

  /**
   * Clean Gemini response by removing markdown code block delimiters
   */
  private cleanJsonResponse(text: string): string {
    let cleaned = text.trim();
    
    // Remove markdown code block delimiters at the beginning
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7); // Remove '```json'
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3); // Remove '```'
    }
    
    // Remove markdown code block delimiters at the end
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3); // Remove trailing '```'
    }
    
    cleaned = cleaned.trim();
    
    // Find the first opening brace/bracket and last closing brace/bracket
    const openBrace = cleaned.indexOf('{');
    const openBracket = cleaned.indexOf('[');
    const closeBrace = cleaned.lastIndexOf('}');
    const closeBracket = cleaned.lastIndexOf(']');
    
    // Determine if we're dealing with an object or array
    let startIndex = -1;
    let endIndex = -1;
    
    if (openBrace !== -1 && (openBracket === -1 || openBrace < openBracket)) {
      // Object format
      startIndex = openBrace;
      endIndex = closeBrace;
    } else if (openBracket !== -1) {
      // Array format
      startIndex = openBracket;
      endIndex = closeBracket;
    }
    
    if (startIndex !== -1 && endIndex !== -1 && endIndex > startIndex) {
      cleaned = cleaned.substring(startIndex, endIndex + 1);
    }
    
    return cleaned.trim();
  }

  private backendUrl = 'http://127.0.0.1:8000/text/';

  async generateResponse(prompt:string): Promise<string>{
    // Generate content with Gemini
      const formData = new FormData();
      formData.append('prompt', prompt);

      // Make the POST request to the FastAPI endpoint
      const response = await fetch(this.backendUrl, {
        method: 'POST',
        body: formData,
      });
      console.log(response)
      const data = await response.json();
      const solutionText = data.solution;
      return solutionText
  }

  /**
   * Generate a personalized learning path for a given topic
   */
  async generateLearningPath(topic: string, language:string): Promise<LearningPath> {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.');
    }

    try {
      console.log(`Generating learning path for: ${topic}`);
      
      const prompt = this.createLearningPathPrompt(topic, getLanguageNameByCode(language));

      // Generate content with Gemini
      
      // Generate content with Gemini
      // const result = await this.model.generateContent(prompt);
      // const response = await result.response;
      // const text = response.text();

      const text = await this.generateResponse(prompt)
        

      // Clean the response text to remove markdown code blocks
      const cleanedText = this.cleanJsonResponse(text);
      console.log('Cleaned learning path response:', cleanedText);

      // Parse the JSON response
      try {
        const learningPath = JSON.parse(cleanedText) as LearningPath;
        
        // Add unique ID and validate structure
        const validatedPath: LearningPath = {
          ...learningPath,
          id: `path_${Date.now()}`,
          steps: learningPath.steps.map((step, index) => ({
            ...step,
            step: index + 1
          }))
        };

        return validatedPath;
      } catch (parseError) {
        console.error('Failed to parse Gemini learning path response as JSON:', parseError);
        console.error('Raw response:', text);
        console.error('Cleaned response:', cleanedText);
        
        // Fallback: create a basic learning path
        return this.createFallbackLearningPath(topic);
      }
    } catch (error) {
      console.error(`Error generating learning path for ${topic}:`, error);
      throw new Error(`Failed to generate learning path: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate detailed learning material for a specific step
   */
  async generateLearningMaterial(topic: string, stepTitle: string, stepDescription: string, keyTopics: string[],language:string): Promise<LearningMaterial> {
    if (!import.meta.env.VITE_GEMINI_API_KEY) {
      throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.');
    }

    try {
      console.log(`Generating learning material for: ${topic} - ${stepTitle}`);
      
      const prompt = this.createLearningMaterialPrompt(topic, stepTitle, stepDescription, keyTopics, getLanguageNameByCode(language));

      // Generate content with Gemini

      // Generate content with Gemini
      // const result = await this.model.generateContent(prompt);
      // const response = await result.response;
      // const text = response.text();

      const text = await this.generateResponse(prompt)

      console.log('Gemini learning material response:', text);

      // Clean the response text to remove markdown code blocks
      const cleanedText = this.cleanJsonResponse(text);
      console.log('Cleaned learning material response:', cleanedText);

      // Parse the JSON response
      try {
        const material = JSON.parse(cleanedText) as LearningMaterial;
        
        // Add unique ID and validate structure
        const validatedMaterial: LearningMaterial = {
          ...material,
          id: `material_${Date.now()}`
        };

        return validatedMaterial;
      } catch (parseError) {
        console.error('Failed to parse Gemini learning material response as JSON:', parseError);
        console.error('Raw response:', text);
        console.error('Cleaned response:', cleanedText);
        
        // Fallback: create basic learning material
        return this.createFallbackLearningMaterial(topic, stepTitle, stepDescription);
      }
    } catch (error) {
      console.error(`Error generating learning material for ${topic} - ${stepTitle}:`, error);
      throw new Error(`Failed to generate learning material: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate quiz questions for a specific learning step
   */
  async generateQuiz(topic: string, stepTitle: string, language:string): Promise<QuizQuestion[]> {
    // if (!import.meta.env.VITE_GEMINI_API_KEY) {
    //   throw new Error('Gemini API key not configured. Please add VITE_GEMINI_API_KEY to your environment variables.');
    // }

    try {
      console.log(`Generating quiz for: ${topic} - ${stepTitle}`);
      console.log('test')
      const prompt = this.createQuizPrompt(topic, stepTitle, getLanguageNameByCode(language));

      // Generate content with Gemini
      // const result = await this.model.generateContent(prompt);
      // const response = await result.response;
      // const text = response.text();

      const text = await this.generateResponse(prompt)

      console.log('Gemini quiz response:', text);

      // Clean the response text to remove markdown code blocks
      const cleanedText = this.cleanJsonResponse(text);
      console.log('Cleaned quiz response:', cleanedText);

      // Parse the JSON response
      try {
        const questions = JSON.parse(cleanedText) as QuizQuestion[];
        
        // Add unique IDs and validate structure
        const validatedQuestions = questions.map((question, index) => ({
          ...question,
          id: `quiz_${Date.now()}_${index}`
        }));

        return validatedQuestions;
      } catch (parseError) {
        console.error('Failed to parse Gemini quiz response as JSON:', parseError);
        console.error('Raw response:', text);
        console.error('Cleaned response:', cleanedText);
        
        // Fallback: create a basic quiz question
        return this.createFallbackQuiz(topic, stepTitle);
      }
    } catch (error) {
      console.error(`Error generating quiz for ${topic} - ${stepTitle}:`, error);
      throw new Error(`Failed to generate quiz: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Create fallback learning material when AI generation fails
   */
  private createFallbackLearningMaterial(topic: string, stepTitle: string, stepDescription: string): LearningMaterial {
    return {
      id: `fallback_material_${Date.now()}`,
      stepTitle: stepTitle,
      topic: topic,
      introduction: `Welcome to learning about ${stepTitle}. This section will help you understand the fundamental concepts and practical applications of this important topic in ${topic}.`,
      sections: [
        {
          title: "Introduction to the Concept",
          content: `${stepDescription} This is a fundamental concept that forms the building blocks for more advanced topics. Understanding this concept thoroughly will help you progress in your learning journey and apply these principles in real-world scenarios.`,
          examples: ["Basic example 1", "Basic example 2", "Basic example 3"],
          keyPoints: ["Key concept 1", "Key concept 2", "Key concept 3"]
        },
        {
          title: "Practical Applications",
          content: `Now that you understand the basics, let's explore how this concept applies in practice. These applications will help you see the relevance and importance of what you're learning, making it easier to remember and apply in different contexts.`,
          examples: ["Application example 1", "Application example 2"],
          keyPoints: ["Practical point 1", "Practical point 2"]
        }
      ],
      summary: `In this section, you learned about ${stepTitle} and its importance in ${topic}. You explored the fundamental concepts and saw practical applications that demonstrate the real-world relevance of this knowledge.`,
      nextSteps: ["Practice the concepts learned", "Review the key points", "Prepare for the quiz"],
      estimatedReadTime: "10 minutes"
    };
  }

  /**
   * Create a fallback learning path when AI generation fails
   */
  private createFallbackLearningPath(topic: string): LearningPath {
    return {
      id: `fallback_${Date.now()}`,
      topic: topic,
      totalEstimatedTime: "3 hours",
      difficulty: "Mixed",
      description: `A comprehensive introduction to ${topic} covering fundamental concepts and practical applications.`,
      steps: [
        {
          step: 1,
          title: `Introduction to ${topic}`,
          description: `Learn the fundamental concepts and basic principles of ${topic}.`,
          estimatedTime: "30 min",
          difficulty: "Beginner",
          keyTopics: ["Basic concepts", "Key terminology", "Historical context"],
          practiceExercises: ["Read introductory materials", "Complete vocabulary quiz", "Watch overview video"]
        },
        {
          step: 2,
          title: `Core Principles of ${topic}`,
          description: `Understand the main theories and principles that govern ${topic}.`,
          estimatedTime: "45 min",
          difficulty: "Intermediate",
          prerequisites: [`Introduction to ${topic}`],
          keyTopics: ["Main theories", "Core principles", "Key relationships"],
          practiceExercises: ["Solve practice problems", "Create concept map", "Explain principles"]
        },
        {
          step: 3,
          title: `Advanced Applications of ${topic}`,
          description: `Explore real-world applications and advanced concepts in ${topic}.`,
          estimatedTime: "60 min",
          difficulty: "Advanced",
          prerequisites: [`Core Principles of ${topic}`],
          keyTopics: ["Real-world applications", "Advanced concepts", "Current research"],
          practiceExercises: ["Case study analysis", "Project work", "Research assignment"]
        }
      ]
    };
  }

  /**
   * Create fallback quiz questions when AI generation fails
   */
  private createFallbackQuiz(topic: string, stepTitle: string): QuizQuestion[] {
    return [
      {
        id: `fallback_quiz_${Date.now()}`,
        question: `What is the most important concept to understand in "${stepTitle}"?`,
        options: [
          "Understanding the basic definitions",
          "Memorizing all the details",
          "Practical application of concepts",
          "Historical background only"
        ],
        correctAnswer: 2,
        explanation: "Practical application of concepts is typically the most important aspect of learning any topic, as it demonstrates true understanding and enables real-world use.",
        difficulty: "Medium"
      }
    ];
  }

  /**
   * Test the Gemini connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        return false;
      }

      const result = await this.model.generateContent("Hello, can you respond with just 'OK'?");
      const response = await result.response;
      const text = response.text();
      
      return text.toLowerCase().includes('ok');
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const learningRoadService = new LearningRoadService();