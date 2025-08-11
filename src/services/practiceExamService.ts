import { BooleanSchema, GoogleGenerativeAI } from '@google/generative-ai';
import { getLanguageNameByCode } from './languageService';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export type DifficultyLevel = 'same' | 'hard' | 'very-hard';

export interface ExamSettings {
  questionCount: number;
  difficulty: DifficultyLevel;
  questionTypes: string[];
  timeLimit: number;
  includeAnswerKey: boolean;
}

export interface GeneratedQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'fill-blank' | 'matching';
  options?: string[];
  correctAnswer?: string | number;
  points: number;
  explanation?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard';
}

export interface GeneratedExam {
  id: string;
  title: string;
  description: string;
  instructions: string;
  questions: GeneratedQuestion[];
  totalPoints: number;
  estimatedTime: number;
  difficulty: DifficultyLevel;
  answerKey?: GeneratedQuestion[];
  createdAt: Date;
}

export class PracticeExamService {
  private model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  /**
   * Convert file to base64 for Gemini API
   */
  private async fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  /**
   * Get MIME type for Gemini API
   */
  private getMimeType(file: File): string {
    if (file.type) return file.type;
    
    // Fallback based on file extension
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf':
        return 'application/pdf';
      case 'doc':
        return 'application/msword';
      case 'docx':
        return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt':
        return 'text/plain';
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      default:
        return 'application/pdf';
    }
  }

  /**
   * Create the prompt for exam generation
   */
  private createExamPrompt(
    description: string, 
    settings: ExamSettings, 
    hasUploadedFiles: BooleanSchema,
    language : string
  ): string {
    const difficultyInstructions = {
      'same': 'Create questions at the SAME difficulty level as the uploaded exam. Analyze the complexity, question style, and cognitive level of the original questions and match them exactly. Questions should test similar concepts with identical complexity and depth.',
      'hard': 'Create questions that are HARDER than the uploaded exam. Increase complexity by 25-40%, require deeper understanding, add more challenging scenarios, include multi-step reasoning, and test application rather than just recall. Make connections between concepts more complex.',
      'very-hard': 'Create questions that are MUCH HARDER than the uploaded exam. These should be significantly more challenging - if someone can score 70% on this practice exam, they should be able to ace the original exam. Increase difficulty by 60-80%, include advanced concepts, complex problem-solving, multi-layered reasoning, synthesis of multiple topics, and real-world application scenarios.'
    };

    const questionTypeInstructions = settings.questionTypes.map(type => {
      switch (type) {
        case 'Multiple Choice':
          return 'Multiple choice questions with 4 options (A, B, C, D)';
        case 'True/False':
          return 'True/False questions';
        case 'Short Answer':
          return 'Short answer questions requiring 1-3 sentences';
        case 'Essay Questions':
          return 'Essay questions requiring detailed responses';
        case 'Fill in the Blank':
          return 'Fill in the blank questions';
        case 'Matching':
          return 'Matching questions with pairs to connect';
        default:
          return type;
      }
    }).join(', ');

    return `You are an expert exam creator and educational assessment specialist. ${hasUploadedFiles ? 'CAREFULLY ANALYZE the uploaded exam/study materials first. Study the question types, difficulty level, subject matter, cognitive complexity, and assessment style of the original exam.' : ''} Create a comprehensive practice exam based on the following requirements:

EXAM DESCRIPTION: "${description}"

DIFFICULTY LEVEL: ${difficultyInstructions[settings.difficulty]}

EXAM REQUIREMENTS:
- Number of questions: ${settings.questionCount}
- Question types: ${questionTypeInstructions}
- Time limit: ${settings.timeLimit} minutes
- Include answer key: ${settings.includeAnswerKey ? 'Yes' : 'No'}

${hasUploadedFiles ? `
CRITICAL ANALYSIS REQUIREMENTS:
1. CONTENT ANALYSIS: Identify all topics, concepts, and subject areas covered in the uploaded exam
2. STYLE ANALYSIS: Study the question format, wording style, and presentation approach
3. DIFFICULTY ANALYSIS: Assess the cognitive level (recall, understanding, application, analysis, synthesis, evaluation)
4. PATTERN RECOGNITION: Identify question patterns, common structures, and assessment methods
5. SCOPE ANALYSIS: Understand the breadth and depth of content coverage

QUESTION GENERATION STRATEGY:
- Base ALL questions on content and concepts from the uploaded exam
- Maintain the same subject matter and topic areas
- ${settings.difficulty === 'same' ? 'Match the exact difficulty and cognitive level of the original questions' : settings.difficulty === 'hard' ? 'Increase difficulty while staying within the same subject scope - make questions more challenging but still related to the original content' : 'Create significantly more challenging questions on the same topics - if someone masters these harder questions, they should easily handle the original exam'}
- Preserve the academic style and terminology used in the original
- Ensure questions test the same learning objectives but at the specified difficulty level
` : ''}

FORMAT YOUR RESPONSE AS JSON:

{
  "title": "Practice Exam Title",
  "description": "Brief description of what this exam covers",
  "instructions": "Clear instructions for taking the exam",
  "questions": [
    {
      "id": "q1",
      "question": "Question text",
      "type": "multiple-choice|true-false|short-answer|essay|fill-blank|matching",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Only for multiple choice
      "correctAnswer": "Correct answer or option index (0-3 for multiple choice)",
      "points": 5,
      "explanation": "Explanation of the correct answer",
      "difficulty": "Easy|Medium|Hard|Very Hard"
    }
  ],
  "totalPoints": 100,
  "estimatedTime": ${settings.timeLimit}
}
CRITICAL RULES:
- **Primary Language:** Your entire response MUST be in ${language}. This is a strict requirement.
CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no additional text or markdown
- Create exactly ${settings.questionCount} questions
- Distribute question types according to the specified types
- For multiple choice questions, correctAnswer should be the index (0-3)
- For other question types, correctAnswer should be the actual answer text
- Points should total approximately 100 points across all questions
- Each question should have a clear, educational explanation
- Questions should be professional and well-written
- ${hasUploadedFiles ? 'ALL questions must be based on content from the uploaded exam' : 'Ensure questions test understanding, not just memorization'}
- Make questions appropriately challenging based on difficulty setting
- Maintain academic integrity and educational value
- Ensure questions are fair, unbiased, and clearly worded`;
  }

  /**
   * Clean Gemini response by removing markdown code block delimiters
   */
  private cleanJsonResponse(text: string): string {
    let cleaned = text.trim();
    
    // Remove markdown code block delimiters at the beginning
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.substring(7);
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.substring(3);
    }
    
    // Remove markdown code block delimiters at the end
    if (cleaned.endsWith('```')) {
      cleaned = cleaned.substring(0, cleaned.length - 3);
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

  private backendUrlText = 'http://127.0.0.1:8000/text/';
  private backendUrlTextFile = 'http://127.0.0.1:8000/text-file/';

  async generateResponse(prompt:string): Promise<string>{
    // Generate content with Gemini
      const formData = new FormData();
      formData.append('prompt', prompt);

      // Make the POST request to the FastAPI endpoint
      const response = await fetch(this.backendUrlText, {
        method: 'POST',
        body: formData,
      });
      console.log(response)
      const data = await response.json();
      const solutionText = data.solution;
      return solutionText
  }

  


  /**
   * Generate practice exam from description and/or uploaded files
   */
  async generatePracticeExam(
    description: string,
    files: File[],
    settings: ExamSettings,
    language : string
  ): Promise<GeneratedExam> {
  

    if (!description.trim() && files.length === 0) {
      throw new Error('Please provide either an exam description or upload reference materials.');
    }

    try {
      console.log(`Generating practice exam with Gemini AI...`);
      console.log(`Settings:`, settings);
      console.log(`Files uploaded:`, files.length);
      
      const prompt = this.createExamPrompt(description, settings, files.length > 0,  getLanguageNameByCode(language));
      let result = "";
      
      if (files.length > 0) {
        console.log('Processing uploaded files for exam analysis...');
        // Process files and create content parts for Gemini
        
        for (const file of files) {
            console.log(`Processing file: ${file.name}`);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('prompt', prompt);
            const response = await fetch(this.backendUrlTextFile, {
            method: 'POST',
            body: formData,
          });
          console.log('Sending content to Gemini for analysis and generation...');
          
          const data = await response.json();
          result = data.solution;
        
        }
          
        
  
      } else {
        console.log('Generating exam from description only...');
        // Generate content with just the prompt
        result = await this.generateResponse(prompt);
      }
      
  
      console.log('Gemini exam response received, length:', result);
      const text = result
      // Clean the response text
      const cleanedText = this.cleanJsonResponse(text);
      console.log('Cleaned response ready for parsing');
      
      // Parse the JSON response
      try {
        const examData = JSON.parse(cleanedText);
        console.log('Successfully parsed exam data:', {
          title: examData.title,
          questionCount: examData.questions?.length,
          totalPoints: examData.totalPoints
        });
        
        // Create the final exam object
        const generatedExam: GeneratedExam = {
          id: `exam_${Date.now()}`,
          title: examData.title || `Practice Exam${files.length > 0 ? ' (Based on Uploaded Materials)' : ''}: ${description}`,
          description: examData.description || `${files.length > 0 ? 'Generated from uploaded exam materials. ' : ''}${description}`,
          instructions: examData.instructions || 'Answer all questions to the best of your ability.',
          questions: examData.questions.map((q: any, index: number) => ({
            ...q,
            id: q.id || `q${index + 1}`,
            points: q.points || Math.round(100 / settings.questionCount)
          })),
          totalPoints: examData.totalPoints || 100,
          estimatedTime: settings.timeLimit,
          difficulty: settings.difficulty,
          answerKey: settings.includeAnswerKey ? examData.questions : undefined,
          createdAt: new Date()
        };
        
        console.log('Generated exam successfully:', {
          id: generatedExam.id,
          questionCount: generatedExam.questions.length,
          difficulty: generatedExam.difficulty
        });
        
        return generatedExam;
      } catch (parseError) {
        console.error('Failed to parse Gemini exam response as JSON:', parseError);
        console.error('Raw response:', text);
        console.error('Cleaned response:', cleanedText);
        
        throw new Error('Failed to parse AI response. The generated content may be malformed. Please try again with different settings or files.');
      }
    } catch (error) {
      console.error('Error generating practice exam:', error);
      
      if (error instanceof Error) {
        // Re-throw known errors
        throw error;
      } else {
        // Handle unknown errors
        throw new Error('An unexpected error occurred while generating the practice exam. Please check your files and try again.');
      }
    }
  }


  /**
   * Generate PDF content for the exam
   */
  generateExamPDF(exam: GeneratedExam): string {
    let pdfContent = `${exam.title}
${'='.repeat(exam.title.length)}

Description: ${exam.description}

Instructions: ${exam.instructions}

Time Limit: ${exam.estimatedTime} minutes
Total Points: ${exam.totalPoints}
Difficulty Level: ${exam.difficulty.charAt(0).toUpperCase() + exam.difficulty.slice(1)}

Questions:
----------

`;

    exam.questions.forEach((question, index) => {
      pdfContent += `${index + 1}. ${question.question} (${question.points} points)\n`;
      
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optIndex) => {
          pdfContent += `   ${String.fromCharCode(65 + optIndex)}. ${option}\n`;
        });
      }
      
      if (question.type === 'true-false') {
        pdfContent += `   A. True\n   B. False\n`;
      }
      
      if (question.type === 'short-answer' || question.type === 'essay') {
        pdfContent += `   Answer: ________________________________\n`;
      }
      
      if (question.type === 'fill-blank') {
        pdfContent += `   Fill in the blank: ____________________\n`;
      }
      
      pdfContent += '\n';
    });

    if (exam.answerKey) {
      pdfContent += `
Answer Key:
-----------

`;
      exam.questions.forEach((question, index) => {
        pdfContent += `${index + 1}. `;
        if (question.type === 'multiple-choice') {
          pdfContent += `${String.fromCharCode(65 + (question.correctAnswer as number))}`;
        } else if (question.type === 'true-false') {
          pdfContent += question.correctAnswer === 0 || question.correctAnswer === 'True' ? 'True' : 'False';
        } else {
          pdfContent += question.correctAnswer;
        }
        if (question.explanation) {
          pdfContent += ` - ${question.explanation}`;
        }
        pdfContent += '\n';
      });
    }

    return pdfContent;
  }

  /**
   * Test the Gemini connection
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!import.meta.env.VITE_GEMINI_API_KEY) {
        console.error('Gemini API key not found in environment variables');
        return false;
      }

      const result = await this.model.generateContent("Hello, can you respond with just 'OK'?");
      const response = await result.response;
      const text = response.text();
      
      const isConnected = text.toLowerCase().includes('ok');
      console.log('Gemini connection test:', isConnected ? 'SUCCESS' : 'FAILED');
      return isConnected;
    } catch (error) {
      console.error('Gemini connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const practiceExamService = new PracticeExamService();