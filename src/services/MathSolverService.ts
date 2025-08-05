import { getLanguageNameByCode } from "./languageService";

// Define the structure for the math problems
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

/**
 * A service class to interact with your FastAPI backend for solving math problems.
 */
export class MathSolverService {
  // The URL of your FastAPI backend.
  // Make sure this is correct for your environment.
  private backendUrl = 'http://127.0.0.1:8000/text-file/';
  static analyzeMathProblems: any;

  /**
   * Creates the detailed prompt that instructs the AI on how to format its response.
   * This is sent to the backend along with the file.
   */
  private createMathPrompt(language:string): string {
    return `You are an expert math tutor. Analyze the uploaded document and:

1. Identify ALL math problems.
2. For EACH problem, provide a detailed step-by-step solution. Explain to the user how to solve the problem correctly.
3. Format your entire response as a single, valid JSON array with this exact structure:
4. For "solution". Remember just state the correct answer only. If it is a mutiple choice. Then only select the correct choice (e.g., A. -5) 
[
  {
    "id": "placeholder_id",
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
- The output MUST be only a valid JSON array. Do not include any other text, explanations, or markdown formatting like \`\`\`json.
- If no problems are found, return an empty array [].`;
  }

  /**
   * Cleans the AI's text response to ensure it's valid JSON.
   * This removes potential markdown code blocks that the AI might add.
   */
  private cleanJsonResponse(text: string): string {
// 1. Clean the string by removing markdown code fences.
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3);
  }
  cleaned = cleaned.trim();

  // 2. Add a targeted fix for unescaped quotes followed by a letter (e.g., 27"F).
  // This is now more specific to avoid breaking valid JSON.
  const fixUnescapedQuotesRegex = /(\d)"([a-zA-Z])/g;
  cleaned = cleaned.replace(fixUnescapedQuotesRegex, '$1\\"$2');

  return cleaned
  }

  /**
   * Uploads files to the backend and returns the parsed math problems.
   * @param files An array of File objects to be processed.
   * @returns A promise that resolves to an array of MathProblem objects.
   */
  async analyzeMathProblems(files: File[],language:string): Promise<MathProblem[]> {
    const allProblems: MathProblem[] = [];

    for (const file of files) {
      try {
        // Create a FormData object to send the file and prompt
        const formData = new FormData();
        formData.append('file', file);
        formData.append('prompt', this.createMathPrompt( getLanguageNameByCode(language)));

        // Make the POST request to the FastAPI endpoint
        const response = await fetch(this.backendUrl, {
          method: 'POST',
          body: formData,
        });
        console.log(response)

        if (!response.ok) {
          console.log("Hello")
          const errorData = await response.json();
          throw new Error(errorData.detail || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();
        const solutionText = data.solution;
        
        // Clean and parse the JSON string returned from the backend
        const cleanedText = this.cleanJsonResponse(solutionText);
        console.log(cleanedText)
        try {
          const problems = JSON.parse(cleanedText) as MathProblem[];
          const validatedProblems = problems.map((problem, index) => ({
            ...problem,
            id: `${file.name}_${Date.now()}_${index}`, // Create a more robust unique ID
          }));
          allProblems.push(...validatedProblems);
        } catch (parseError) {
          console.error('Failed to parse backend response as JSON:', parseError);
          throw new Error('The server response was not in the expected format.');
        }

      } catch (error) {
        console.error(`Error processing file ${file.name}:`, error);
        // Add a descriptive error problem to the results list
        allProblems.push({
          id: `error_${file.name}_${Date.now()}`,
          question: `Failed to process file: ${file.name}`,
          solution: 'Error',
          difficulty: 'Hard',
          topic: 'Error',
          steps: [{
            step: 1,
            description: 'An error occurred',
            equation: 'N/A',
            explanation: error instanceof Error ? error.message : 'An unknown error occurred during processing.',
          }],
        });
      }
    }

    return allProblems;
  }
}

// Export a singleton instance of the service for use throughout the app
export const mathSolverService = new MathSolverService();