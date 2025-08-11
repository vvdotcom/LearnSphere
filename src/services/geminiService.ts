import { GoogleGenerativeAI } from '@google/generative-ai';
import { getLanguageNameByCode } from './languageService';
// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface MathStep {
  step: number;
  description: string;
  equation: string;
  explanation: string;
}

export interface MathProblem {
  id: string;
  question: string;
  solution: string;
  steps: MathStep[];
  difficulty: 'Easy' | 'Medium' | 'Hard';
  topic: string;
}

export class GeminiMathService {
  private model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

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
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'pdf':
        return 'application/pdf';
      default:
        return 'image/jpeg';
    }
  }

  /**
   * Create the prompt for math problem solving
   */
  private createMathPrompt(language : string, subject:string): string {
    return `You are an expert ${subject} tutor. Analyze the uploaded image/document and:

1. Generate content in this language: ${language}
2. Identify ALL  ${subject} problems in the image
3. For EACH problem, provide a detailed step-by-step solution
4. Example: Format your response as a JSON array with this exact structure:

[
  {
    "id": "unique_id",
    "question": "The exact math problem as written",
    "solution": "Final answer (e.g., x = 4, y = 2x + 3, etc.)",
    "difficulty": "Easy|Medium|Hard",
    "topic": "Subject area (e.g., Algebra, Calculus, Geometry)",
    "steps": [
      {
        "step": 1,
        "description": "Brief description of what we're doing",
        "equation": "Mathematical equation for this step",
        "explanation": "Detailed explanation of why we do this step"
      }
    ]
  }
]
CRITICAL RULES:
- **Primary Language:** Your entire response MUST be in ${language}. This is a strict requirement.

IMPORTANT RULES:
- Return ONLY valid JSON, no additional text
- Include ALL problems found in the image
- Each step should be clear and educational
- Explanations should help students understand the concept
- If no math problems are found, return an empty array []
- For handwritten problems, interpret the writing as accurately as possible
- Include proper mathematical notation in equations`;
  }

  /**
   * Analyze uploaded files and extract math problems
   */
  async analyzeMathProblems(files: File[], language: string, subject:string): Promise<MathProblem[]> {

    const allProblems: MathProblem[] = [];

    for (const file of files) {
      try {
        console.log(`Processing file: ${file.name}`);
        
        // Convert file to base64
        const base64Data = await this.fileToBase64(file);
        const mimeType = this.getMimeType(file);

        // Create the content for Gemini
        const imagePart = {
          inlineData: {
            data: base64Data,
            mimeType: mimeType,
          },
        };

        const prompt = this.createMathPrompt(getLanguageNameByCode(language,subject));
        console.log(prompt)

        // Generate content with Gemini
        const result = await this.model.generateContent([imagePart, prompt]);
        const response = await result.response;
        const text = response.text();


        // Clean the response text to remove markdown code blocks
        const cleanedText = this.cleanJsonResponse(text);
        console.log('Cleaned response:', cleanedText);

        // Parse the JSON response
        try {
          const problems = JSON.parse(cleanedText) as MathProblem[];
          
          // Add unique IDs and validate structure
          const validatedProblems = problems.map((problem, index) => ({
            ...problem,
            id: `${Date.now()}_${index}`,
            steps: problem.steps.map((step, stepIndex) => ({
              ...step,
              step: stepIndex + 1
            }))
          }));

          allProblems.push(...validatedProblems);
        } catch (parseError) {
          console.error('Failed to parse Gemini response as JSON:', parseError);
          console.error('Raw response:', text);
          console.error('Cleaned response:', cleanedText);
          
          // Fallback: create a generic problem indicating parsing failed
          allProblems.push({
            id: `error_${Date.now()}`,
            question: `Problem from ${file.name} (parsing failed)`,
            solution: 'Unable to parse response',
            difficulty: 'Medium',
            topic: 'Unknown',
            steps: [{
              step: 1,
              description: 'Error occurred',
              equation: 'N/A',
              explanation: 'Failed to parse the AI response. Please try uploading the image again.'
            }]
          });
        }
      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        
        // Add error problem to results
        allProblems.push({
          id: `error_${Date.now()}`,
          question: `Error processing ${file.name}`,
          solution: 'Processing failed',
          difficulty: 'Medium',
          topic: 'Error',
          steps: [{
            step: 1,
            description: 'Processing error',
            equation: 'N/A',
            explanation: `Failed to process ${file.name}. Error: ${error instanceof Error ? error.message : 'Unknown error'}`
          }]
        });
      }
    }

    return allProblems;
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
export const geminiMathService = new GeminiMathService();