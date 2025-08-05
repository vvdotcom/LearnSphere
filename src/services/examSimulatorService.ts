import { GoogleGenerativeAI } from '@google/generative-ai';

// Initialize Gemini AI
const genAI = new GoogleGenerativeAI(import.meta.env.VITE_GEMINI_API_KEY);

export interface SimulatorQuestion {
  id: string;
  question: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay' | 'fill-blank' | 'matching';
  options?: string[];
  correctAnswer?: string | number;
  points: number;
  explanation?: string;
  difficulty: 'Easy' | 'Medium' | 'Hard' | 'Very Hard' | 'Expert';
}

export interface SimulatorExam {
  id: string;
  title: string;
  description: string;
  instructions: string;
  questions: SimulatorQuestion[];
  totalPoints: number;
  estimatedTime: number;
  difficultyLevel: number; // 1-7
  difficultyLabel: string;
  createdAt: Date;
}

export interface ExamSeries {
  id: string;
  topic: string;
  description: string;
  exams: SimulatorExam[];
  totalExams: number;
  createdAt: Date;
}

export interface SimulatorSettings {
  numberOfExams: number; // 5-7
  questionsPerExam?: number; // Optional, will be determined from uploaded exam
  timePerExam?: number; // Optional, will be determined from uploaded exam
}

export class ExamSimulatorService {
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
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    switch (extension) {
      case 'pdf': return 'application/pdf';
      case 'doc': return 'application/msword';
      case 'docx': return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      case 'txt': return 'text/plain';
      case 'jpg':
      case 'jpeg': return 'image/jpeg';
      case 'png': return 'image/png';
      default: return 'application/pdf';
    }
  }

  /**
   * Get difficulty configuration for each exam level
   */
  private getDifficultyConfig(level: number) {
    const configs = {
      1: {
        label: 'Foundation',
        description: 'Basic understanding - covers fundamental concepts',
        complexity: 'Focus on recall and basic understanding. Questions should test foundational knowledge and basic concepts.',
        cognitiveLevel: 'Remember and Understand'
      },
      2: {
        label: 'Beginner',
        description: 'Slightly more challenging - requires basic application',
        complexity: 'Increase complexity by 15-20%. Include basic application questions and simple problem-solving.',
        cognitiveLevel: 'Understand and Apply'
      },
      3: {
        label: 'Intermediate',
        description: 'Moderate difficulty - requires deeper understanding',
        complexity: 'Increase complexity by 35-40%. Require deeper understanding, analysis, and multi-step reasoning.',
        cognitiveLevel: 'Apply and Analyze'
      },
      4: {
        label: 'Advanced',
        description: 'Challenging - requires critical thinking',
        complexity: 'Increase complexity by 55-60%. Include critical thinking, synthesis of concepts, and complex problem-solving.',
        cognitiveLevel: 'Analyze and Evaluate'
      },
      5: {
        label: 'Expert',
        description: 'Very challenging - requires mastery',
        complexity: 'Increase complexity by 75-80%. Require mastery-level understanding, creative application, and expert-level reasoning.',
        cognitiveLevel: 'Evaluate and Create'
      },
      6: {
        label: 'Master',
        description: 'Extremely challenging - professional level',
        complexity: 'Increase complexity by 90-95%. Professional-level questions requiring deep expertise and innovative thinking.',
        cognitiveLevel: 'Create and Innovate'
      },
      7: {
        label: 'Genius',
        description: 'Ultimate challenge - if you ace this, you\'re an expert',
        complexity: 'Maximum complexity (100%+). If someone scores 80%+ here, they should be able to ace any standard exam on this topic.',
        cognitiveLevel: 'Master and Innovate'
      }
    };
    
    return configs[level] || configs[1];
  }

  /**
   * Create the prompt for exam series generation
   */
  private createExamSeriesPrompt(
    description: string,
    settings: SimulatorSettings,
    hasUploadedFiles: boolean,
    examLevel: number
  ): string {
    const difficultyConfig = this.getDifficultyConfig(examLevel);
    
    return `You are an expert exam creator and educational assessment specialist. ${hasUploadedFiles ? 'CAREFULLY ANALYZE the uploaded exam/study materials first. Study the question types, difficulty level, subject matter, cognitive complexity, and assessment style of the original exam.' : ''} 

Create a comprehensive practice exam for LEVEL ${examLevel} of ${settings.numberOfExams} total exams with PROGRESSIVE DIFFICULTY.

EXAM DESCRIPTION: "${description}"

DIFFICULTY LEVEL ${examLevel}: ${difficultyConfig.label}
COMPLEXITY INSTRUCTION: ${difficultyConfig.complexity}
COGNITIVE LEVEL: ${difficultyConfig.cognitiveLevel}
DESCRIPTION: ${difficultyConfig.description}

EXAM REQUIREMENTS:
- Number of questions: ANALYZE the uploaded exam to determine appropriate question count (typically 15-25 questions)
- Question types: MATCH the question types found in the uploaded exam (multiple choice, short answer, essay, etc.)
- Time limit: CALCULATE appropriate time based on question count and complexity (typically 1-3 minutes per question)
- Difficulty Level: ${examLevel}/7 (${difficultyConfig.label})

${hasUploadedFiles ? `
CRITICAL ANALYSIS REQUIREMENTS:
1. CONTENT ANALYSIS: Identify all topics, concepts, and subject areas covered in the uploaded exam
2. STYLE ANALYSIS: Study the question format, wording style, and presentation approach
3. DIFFICULTY ANALYSIS: Assess the cognitive level, question count, and time allocation from the original exam
4. PATTERN RECOGNITION: Identify question patterns, common structures, and assessment methods
5. SCOPE ANALYSIS: Understand the breadth and depth of content coverage

PROGRESSIVE DIFFICULTY STRATEGY:
- Base ALL questions on content and concepts from the uploaded exam
- Maintain the same subject matter and topic areas across all levels
- MATCH the question count and time allocation style of the original exam
- USE the same question types found in the uploaded exam
- Level ${examLevel} should be ${difficultyConfig.complexity}
- Ensure questions test the same learning objectives but at Level ${examLevel} complexity
- Use the cognitive level: ${difficultyConfig.cognitiveLevel}
` : `
DIFFICULTY PROGRESSION STRATEGY:
- Create questions appropriate for Level ${examLevel} difficulty
- Use standard academic question counts (15-25 questions)
- Set appropriate time limits (45-90 minutes typical)
- Include variety of question types (multiple choice, short answer, essay)
- Focus on ${difficultyConfig.cognitiveLevel} cognitive skills
- ${difficultyConfig.complexity}
- Ensure educational value and clear learning objectives
`}

FORMAT YOUR RESPONSE AS JSON:

{
  "title": "Level ${examLevel}: ${difficultyConfig.label} - [Subject] Practice Exam",
  "description": "Level ${examLevel} exam focusing on ${difficultyConfig.description}",
  "instructions": "Clear instructions for taking this Level ${examLevel} exam",
  "questions": [
    {
      "id": "q1",
      "question": "Question text appropriate for Level ${examLevel} difficulty",
      "type": "multiple-choice|true-false|short-answer|essay|fill-blank|matching",
      "options": ["Option A", "Option B", "Option C", "Option D"], // Only for multiple choice
      "correctAnswer": "Correct answer or option index (0-3 for multiple choice)",
      "points": 5,
      "explanation": "Detailed explanation of the correct answer and why others are wrong",
      "difficulty": "Easy|Medium|Hard|Very Hard|Expert"
    }
  ],
  "totalPoints": 100,
  "estimatedTime": "CALCULATE appropriate time based on question count and complexity",
  "difficultyLevel": ${examLevel},
  "difficultyLabel": "${difficultyConfig.label}"
}

CRITICAL REQUIREMENTS:
- Return ONLY valid JSON, no additional text or markdown
- Determine appropriate number of questions based on uploaded exam analysis (15-25 typical)
- Match question types to those found in uploaded exam or use academic standards
- Calculate realistic time limits based on question complexity and count
- For multiple choice questions, correctAnswer should be the index (0-3)
- For other question types, correctAnswer should be the actual answer text
- Points should total approximately 100 points across all questions
- Each question should have a clear, educational explanation
- Questions should be professional and well-written
- Make questions appropriately challenging for Level ${examLevel}
- Maintain academic integrity and educational value
- Ensure questions are fair, unbiased, and clearly worded
- Focus on ${difficultyConfig.cognitiveLevel} cognitive skills`;
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

  /**
   * Generate a series of practice exams with progressive difficulty
   */
  async generateExamSeries(
    seriesTopic: string,
    examContentDescription: string,
    files: File[],
    settings: SimulatorSettings,
    examTime: number
  ): Promise<ExamSeries> {


    if (!examContentDescription.trim() && files.length === 0) {
      throw new Error('Please provide either an exam description or upload reference materials.');
    }

    try {
      console.log(`Generating exam series with ${settings.numberOfExams} exams...`);
      console.log(`Settings:`, settings);
      console.log(`Files uploaded:`, files.length);
      
      const exams: SimulatorExam[] = [];
      
      // Process files once for all exams
      let contentParts = [];
      if (files.length > 0) {
        console.log('Processing uploaded files for exam analysis...');
        
        for (const file of files) {
          console.log(`Processing file: ${file.name}`);
          
          try {
            const base64Data = await this.fileToBase64(file);
            const mimeType = this.getMimeType(file);
            
            console.log(`File processed: ${file.name}, MIME: ${mimeType}`);
            
            contentParts.push({
              inlineData: {
                data: base64Data,
                mimeType: mimeType,
              },
            });
          } catch (fileError) {
            console.error(`Error processing file ${file.name}:`, fileError);
            throw new Error(`Failed to process file ${file.name}. Please ensure the file is not corrupted and try again.`);
          }
        }
      }
      
      // Generate each exam in the series
      for (let level = 1; level <= settings.numberOfExams; level++) {
        console.log(`Generating exam ${level}/${settings.numberOfExams}...`);
        
        const prompt = this.createExamSeriesPrompt(examContentDescription, settings, files.length > 0, level);
        
        //let result;
        // if (files.length > 0) {
        //   // Add the prompt as the last content part
        //   const examContentParts = [...contentParts, prompt];
        //   result = await this.model.generateContent(examContentParts);
        // } else {
        //   result = await this.model.generateContent(prompt);
        // }
        //const response = await result.response;
        //const text = response.text();
        
        const text = await this.generateResponse(prompt)

        console.log(`Exam ${level} response received, length:`, text.length);
        
        // Clean and parse the response
        const cleanedText = this.cleanJsonResponse(text);
        
        try {
          const examData = JSON.parse(cleanedText);
          console.log(`Successfully parsed exam ${level}:`, {
            title: examData.title,
            questionCount: examData.questions?.length,
            totalPoints: examData.totalPoints
          });
          
          const difficultyConfig = this.getDifficultyConfig(level);
          
          // Create the exam object
          const exam: SimulatorExam = {
            id: `exam_${Date.now()}_${level}`,
            title: examData.title || `Level ${level}: ${difficultyConfig.label} - ${seriesTopic}`,
            description: examData.description || `${difficultyConfig.description}`,
            instructions: examData.instructions || `This is a Level ${level} exam. ${difficultyConfig.description}`,
            questions: examData.questions.map((q: any, index: number) => ({
              ...q,
              id: q.id || `q${level}_${index + 1}`,
              points: q.points || Math.round(100 / settings.questionsPerExam)
            })),
            totalPoints: examData.totalPoints || 100,
            estimatedTime: examTime,
            difficultyLevel: level,
            difficultyLabel: difficultyConfig.label,
            createdAt: new Date()
          };
          
          exams.push(exam);
          
        } catch (parseError) {
          console.error(`Failed to parse exam ${level} response:`, parseError);
          
          // Create fallback exam
          const difficultyConfig = this.getDifficultyConfig(level);
          const fallbackExam: SimulatorExam = {
            id: `fallback_exam_${Date.now()}_${level}`,
            title: `Level ${level}: ${difficultyConfig.label} - ${seriesTopic}`,
            description: difficultyConfig.description,
            instructions: `This is a Level ${level} practice exam.`,
            questions: [{
              id: `fallback_q${level}_1`,
              question: `Sample Level ${level} question for ${seriesTopic}`,
              type: 'multiple-choice',
              options: ['Option A', 'Option B', 'Option C', 'Option D'],
              correctAnswer: 0,
              points: 100,
              explanation: 'This is a fallback question due to parsing error.',
              difficulty: 'Medium'
            }],
            totalPoints: 100,
            estimatedTime: settings.timePerExam,
            difficultyLevel: level,
            difficultyLabel: difficultyConfig.label,
            createdAt: new Date()
          };
          
          exams.push(fallbackExam);
        }
        
        // Add delay between requests to avoid rate limiting
        if (level < settings.numberOfExams) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // Create the exam series
      const examSeries: ExamSeries = {
        id: `series_${Date.now()}`,
        topic: seriesTopic,
        description: examContentDescription || `Progressive exam series with ${settings.numberOfExams} levels of increasing difficulty`,
        exams: exams,
        totalExams: settings.numberOfExams,
        createdAt: new Date()
      };
      
      console.log('Generated complete exam series:', {
        id: examSeries.id,
        totalExams: examSeries.totalExams,
        topic: examSeries.topic
      });
      
      return examSeries;
      
    } catch (error) {
      console.error('Error generating exam series:', error);
      
      if (error instanceof Error) {
        throw error;
      } else {
        throw new Error('An unexpected error occurred while generating the exam series. Please check your files and try again.');
      }
    }
  }

  /**
   * Generate PDF content for an exam
   */
  generateExamPDF(exam: SimulatorExam): string {
    let pdfContent = `${exam.title}
${'='.repeat(exam.title.length)}

Level: ${exam.difficultyLevel}/7 (${exam.difficultyLabel})
Description: ${exam.description}

Instructions: ${exam.instructions}

Time Limit: ${exam.estimatedTime} minutes
Total Points: ${exam.totalPoints}

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

    // Add answer key
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

      // const text = await this.generateResponse("Hello, can you respond with just 'OK'?");
      // const response = await result.response;
      const text =  await this.generateResponse("Hello, can you respond with just 'OK'?");
      
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
export const examSimulatorService = new ExamSimulatorService();