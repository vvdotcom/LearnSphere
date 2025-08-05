import Dexie, { Table } from 'dexie';
import { ExamSeries, SimulatorExam, SimulatorSettings } from './examSimulatorService';
import { GeneratedExam, ExamSettings } from './practiceExamService';

export interface StoredExamSeries {
  id: string;
  topic: string;
  description: string;
  totalExams: number;
  settings: SimulatorSettings;
  time: number;
  createdAt: string;
  updatedAt: string;
}

export interface StoredExam {
  id: string;
  seriesId: string;
  title: string;
  description: string;
  instructions: string;
  totalPoints: number;
  estimatedTime: number;
  difficultyLevel: number;
  difficultyLabel: string;
  questionsData: string; // JSON string of questions
  score?: number; // User's score (0-100)
  completedAt?: string; // When exam was completed
  timeTaken?: number; // Time taken in seconds
  createdAt: string;
}

export interface StoredPracticeExam {
  id: string;
  title: string;
  description: string;
  instructions: string;
  totalPoints: number;
  estimatedTime: number;
  difficulty: string;
  questionsData: string; // JSON string of questions
  settings: string; // JSON string of ExamSettings
  hasAnswerKey: boolean;
  score?: number; // User's score (0-100)
  completedAt?: string; // When exam was completed
  timeTaken?: number; // Time taken in seconds
  createdAt: string;
}

export interface StoredLearningPath {
  id: string;
  topic: string;
  description: string;
  totalEstimatedTime: string;
  difficulty: string;
  stepsData: string; // JSON string of LearningStep[]
  createdAt: string;
}

class ExamDatabase extends Dexie {
  examSeries!: Table<StoredExamSeries>;
  simulatorExams!: Table<StoredExam>;
  practiceExams!: Table<StoredPracticeExam>;
  learningPaths!: Table<StoredLearningPath>;

  constructor() {
    super('ExamDatabase');
    
    this.version(1).stores({
      examSeries: 'id, topic, createdAt',
      simulatorExams: 'id, seriesId, difficultyLevel, createdAt',
      practiceExams: 'id, difficulty, createdAt',
      learningPaths: 'id, topic, createdAt'
    });
  }
}

export class DatabaseService {
  private db: ExamDatabase;

  constructor() {
    this.db = new ExamDatabase();
  }

  // Exam Series Methods
  async saveExamSeries(examSeries: ExamSeries, settings: SimulatorSettings, time:number): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.examSeries, this.db.simulatorExams, async () => {
        // Save series
        await this.db.examSeries.put({
          id: examSeries.id,
          topic: examSeries.topic,
          description: examSeries.description,
          totalExams: examSeries.totalExams,
          settings: settings,
          time: time,
          createdAt: examSeries.createdAt.toISOString(),
          updatedAt: new Date().toISOString()
        });

        // Save all exams in the series
        for (const exam of examSeries.exams) {
          await this.db.simulatorExams.put({
            id: exam.id,
            seriesId: examSeries.id,
            title: exam.title,
            description: exam.description,
            instructions: exam.instructions,
            totalPoints: exam.totalPoints,
            estimatedTime: exam.estimatedTime,
            difficultyLevel: exam.difficultyLevel,
            difficultyLabel: exam.difficultyLabel,
            questionsData: JSON.stringify(exam.questions),
            score: undefined,
            completedAt: undefined,
            timeTaken: undefined,
            createdAt: exam.createdAt.toISOString()
          });
        }
      });
    } catch (error) {
      console.error('Error saving exam series:', error);
      throw error;
    }
  }

  async getAllExamSeries(): Promise<StoredExamSeries[]> {
    try {
      const series = await this.db.examSeries.orderBy('createdAt').reverse().toArray();
      return series;
    } catch (error) {
      console.error('Error getting exam series:', error);
      return [];
    }
  }

  async getExamSeries(seriesId: string): Promise<ExamSeries | null> {
    try {
      const series = await this.db.examSeries.get(seriesId);
      if (!series) return null;

      const exams = await this.db.simulatorExams
        .where('seriesId')
        .equals(seriesId)
        .sortBy('difficultyLevel');

      const simulatorExams: SimulatorExam[] = exams.map(exam => ({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        questions: JSON.parse(exam.questionsData),
        totalPoints: exam.totalPoints,
        estimatedTime: exam.estimatedTime,
        difficultyLevel: exam.difficultyLevel,
        difficultyLabel: exam.difficultyLabel,
        createdAt: new Date(exam.createdAt)
      }));

      return {
        id: series.id,
        topic: series.topic,
        description: series.description,
        exams: simulatorExams,
        totalExams: series.totalExams,
        createdAt: new Date(series.createdAt)
      };
    } catch (error) {
      console.error('Error getting exam series:', error);
      return null;
    }
  }

  async deleteExamSeries(seriesId: string): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.examSeries, this.db.simulatorExams, async () => {
        await this.db.simulatorExams.where('seriesId').equals(seriesId).delete();
        await this.db.examSeries.delete(seriesId);
      });
    } catch (error) {
      console.error('Error deleting exam series:', error);
      throw error;
    }
  }

  /**
   * Update exam score and completion data
   */
  async updateExamScore(examId: string, score: number, timeTaken: number): Promise<void> {
    try {
      await this.db.simulatorExams.update(examId, {
        score: score,
        completedAt: new Date().toISOString(),
        timeTaken: timeTaken
      });
      console.log(`Updated exam ${examId} with score ${score}% and time ${timeTaken}s`);
    } catch (error) {
      console.error('Error updating exam score:', error);
      throw error;
    }
  }

  // Practice Exam Methods
  async savePracticeExam(exam: GeneratedExam, settings: ExamSettings): Promise<void> {
    try {
      await this.db.practiceExams.put({
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        totalPoints: exam.totalPoints,
        estimatedTime: exam.estimatedTime,
        difficulty: exam.difficulty,
        questionsData: JSON.stringify(exam.questions),
        settings: JSON.stringify(settings),
        hasAnswerKey: exam.answerKey ? true : false,
        createdAt: exam.createdAt.toISOString()
      });
    } catch (error) {
      console.error('Error saving practice exam:', error);
      throw error;
    }
  }

  async getAllPracticeExams(): Promise<StoredPracticeExam[]> {
    try {
      const exams = await this.db.practiceExams.orderBy('createdAt').reverse().toArray();
      return exams;
    } catch (error) {
      console.error('Error getting practice exams:', error);
      return [];
    }
  }

  async getPracticeExam(examId: string): Promise<GeneratedExam | null> {
    try {
      const exam = await this.db.practiceExams.get(examId);
      if (!exam) return null;

      const questions = JSON.parse(exam.questionsData);
      
      return {
        id: exam.id,
        title: exam.title,
        description: exam.description,
        instructions: exam.instructions,
        questions: questions,
        totalPoints: exam.totalPoints,
        estimatedTime: exam.estimatedTime,
        difficulty: exam.difficulty,
        answerKey: exam.hasAnswerKey ? questions : undefined,
        createdAt: new Date(exam.createdAt)
      };
    } catch (error) {
      console.error('Error getting practice exam:', error);
      return null;
    }
  }

  async deletePracticeExam(examId: string): Promise<void> {
    try {
      await this.db.practiceExams.delete(examId);
    } catch (error) {
      console.error('Error deleting practice exam:', error);
      throw error;
    }
  }

  /**
   * Update practice exam score and completion data
   */
  async updatePracticeExamScore(examId: string, score: number, timeTaken: number): Promise<void> {
    try {
      const exam = await this.db.practiceExams.get(examId);
      if (exam) {
        await this.db.practiceExams.update(examId, {
          score: score,
          completedAt: new Date().toISOString(),
          timeTaken: timeTaken
        });
      }
    } catch (error) {
      console.error('Error updating practice exam score:', error);
      throw error;
    }
  }

  // Learning Path Methods
  async saveLearningPath(learningPath: any): Promise<void> {
    try {
      await this.db.learningPaths.put({
        id: learningPath.id,
        topic: learningPath.topic,
        description: learningPath.description,
        totalEstimatedTime: learningPath.totalEstimatedTime,
        difficulty: learningPath.difficulty,
        stepsData: JSON.stringify(learningPath.steps),
        createdAt: learningPath.createdAt || new Date().toISOString()
      });
    } catch (error) {
      console.error('Error saving learning path:', error);
      throw error;
    }
  }

  async getAllLearningPaths(): Promise<StoredLearningPath[]> {
    try {
      const paths = await this.db.learningPaths.orderBy('createdAt').reverse().toArray();
      return paths;
    } catch (error) {
      console.error('Error getting learning paths:', error);
      return [];
    }
  }

  async getLearningPath(pathId: string): Promise<any | null> {
    try {
      const path = await this.db.learningPaths.get(pathId);
      if (!path) return null;

      const steps = JSON.parse(path.stepsData);
      
      return {
        id: path.id,
        topic: path.topic,
        description: path.description,
        totalEstimatedTime: path.totalEstimatedTime,
        difficulty: path.difficulty,
        steps: steps,
        createdAt: path.createdAt
      };
    } catch (error) {
      console.error('Error getting learning path:', error);
      return null;
    }
  }

  async deleteLearningPath(pathId: string): Promise<void> {
    try {
      await this.db.learningPaths.delete(pathId);
    } catch (error) {
      console.error('Error deleting learning path:', error);
      throw error;
    }
  }

  // Utility Methods
  async getStorageStats(): Promise<{ examSeries: number; simulatorExams: number; practiceExams: number; learningPaths: number }> {
    try {
      const [seriesCount, simulatorCount, practiceCount, pathsCount] = await Promise.all([
        this.db.examSeries.count(),
        this.db.simulatorExams.count(),
        this.db.practiceExams.count(),
        this.db.learningPaths.count()
      ]);

      return {
        examSeries: seriesCount,
        simulatorExams: simulatorCount,
        practiceExams: practiceCount,
        learningPaths: pathsCount
      };
    } catch (error) {
      console.error('Error getting storage stats:', error);
      return { examSeries: 0, simulatorExams: 0, practiceExams: 0, learningPaths: 0 };
    }
  }

  async clearAllData(): Promise<void> {
    try {
      await this.db.transaction('rw', this.db.examSeries, this.db.simulatorExams, this.db.practiceExams, this.db.learningPaths, async () => {
        await this.db.simulatorExams.clear();
        await this.db.examSeries.clear();
        await this.db.practiceExams.clear();
        await this.db.learningPaths.clear();
      });
    } catch (error) {
      console.error('Error clearing all data:', error);
      throw error;
    }
  }

  close(): void {
    this.db.close();
  }
}

// Export singleton instance
export const databaseService = new DatabaseService();