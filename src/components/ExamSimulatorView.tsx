import React, { useState, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  ArrowLeft,
  Play,
  CheckCircle,
  Clock,
  Target,
  Trophy,
  Star,
  Brain,
  Download,
  BarChart3,
  TrendingUp,
  Award,
  Zap,
  Calendar,
  Timer,
  BookOpen,
  Users,
  ChevronRight,
  AlertCircle,
  X,
  Pause,
  RotateCcw,
  LineChart,
  Calculator
} from 'lucide-react';
import { Button } from './ui/button';
import { ExamSeries, SimulatorExam } from '../services/examSimulatorService';
import { databaseService } from '../services/databaseService';

interface ExamSimulatorViewProps {
  examSeries: ExamSeries;
  onBackToGenerator: () => void;
}

interface ExamTakingState {
  examId: string;
  currentQuestionIndex: number;
  answers: (number | string)[];
  startTime: Date;
  timeRemaining: number; // in seconds
  isSubmitted: boolean;
}

const ExamSimulatorView: React.FC<ExamSimulatorViewProps> = ({ examSeries, onBackToGenerator }) => {
  const { t } = useLanguage();
  const [currentView, setCurrentView] = useState<'overview' | 'taking-exam' | 'results'>('overview');
  const [examTakingState, setExamTakingState] = useState<ExamTakingState | null>(null);
  const [examResults, setExamResults] = useState<{ score: number; timeTaken: number; exam: SimulatorExam } | null>(null);
  const [timer, setTimer] = useState<NodeJS.Timeout | null>(null);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showPrediction, setShowPrediction] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<string>('');
  const [predictionResult, setPredictionResult] = useState<string>('');

  // Calculate completed exams
  const completedExamsArray = examSeries.exams.filter(exam => exam.score !== undefined);
  const completedExams = new Set(completedExamsArray.map(exam => exam.id));

  // Clear timer on unmount
  useEffect(() => {
    return () => {
      if (timer) {
        clearInterval(timer);
      }
    };
  }, [timer]);

  // Timer effect for exam taking
  useEffect(() => {
    if (currentView === 'taking-exam' && examTakingState && !examTakingState.isSubmitted) {
      const interval = setInterval(() => {
        setExamTakingState(prev => {
          if (!prev || prev.timeRemaining <= 0) {
            // Time's up - auto submit
            handleSubmitExam();
            return prev;
          }
          return { ...prev, timeRemaining: prev.timeRemaining - 1 };
        });
      }, 1000);
      
      setTimer(interval);
      
      return () => clearInterval(interval);
    }
  }, [currentView, examTakingState?.isSubmitted]);

  const getDifficultyColor = (level: number) => {
    const colors = {
      1: 'text-green-400 bg-green-400/20 border-green-400/30',
      2: 'text-blue-400 bg-blue-400/20 border-blue-400/30',
      3: 'text-yellow-400 bg-yellow-400/20 border-yellow-400/30',
      4: 'text-orange-400 bg-orange-400/20 border-orange-400/30',
      5: 'text-red-400 bg-red-400/20 border-red-400/30',
      6: 'text-purple-400 bg-purple-400/20 border-purple-400/30',
      7: 'text-pink-400 bg-pink-400/20 border-pink-400/30'
    };
    return colors[level] || colors[1];
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 80) return 'text-blue-400';
    if (score >= 70) return 'text-yellow-400';
    if (score >= 60) return 'text-orange-400';
    return 'text-red-400';
  };

  const handleStartExam = (exam: SimulatorExam) => {
    const state: ExamTakingState = {
      examId: exam.id,
      currentQuestionIndex: 0,
      answers: new Array(exam.questions.length).fill(null),
      startTime: new Date(),
      timeRemaining: exam.estimatedTime * 60, // convert minutes to seconds
      isSubmitted: false
    };
    
    setExamTakingState(state);
    setCurrentView('taking-exam');
  };

  const handleAnswerSelect = (answerIndex: number | string) => {
    if (!examTakingState) return;
    
    const newAnswers = [...examTakingState.answers];
    newAnswers[examTakingState.currentQuestionIndex] = answerIndex;
    
    setExamTakingState(prev => prev ? { ...prev, answers: newAnswers } : null);
  };

  const handleNextQuestion = () => {
    if (!examTakingState) return;
    
    const exam = examSeries.exams.find(e => e.id === examTakingState.examId);
    if (!exam) return;
    
    if (examTakingState.currentQuestionIndex < exam.questions.length - 1) {
      setExamTakingState(prev => prev ? { 
        ...prev, 
        currentQuestionIndex: prev.currentQuestionIndex + 1 
      } : null);
    }
  };

  const handlePreviousQuestion = () => {
    if (!examTakingState) return;
    
    if (examTakingState.currentQuestionIndex > 0) {
      setExamTakingState(prev => prev ? { 
        ...prev, 
        currentQuestionIndex: prev.currentQuestionIndex - 1 
      } : null);
    }
  };

  const handleSubmitExam = async () => {
    if (!examTakingState) return;
    
    const exam = examSeries.exams.find(e => e.id === examTakingState.examId);
    if (!exam) return;
    
    // Calculate score
    let correctAnswers = 0;
    exam.questions.forEach((question, index) => {
      const userAnswer = examTakingState.answers[index];
      if (userAnswer === question.correctAnswer) {
        correctAnswers++;
      }
    });
    
    const score = Math.round((correctAnswers / exam.questions.length) * 100);
    const timeTaken = Math.round((new Date().getTime() - examTakingState.startTime.getTime()) / 1000);
    
    // Update exam with score
    exam.score = score;
    exam.completedAt = new Date().toISOString();
    exam.timeTaken = timeTaken;
    
    // Save to database
    try {
      await databaseService.updateExamScore(exam.id, score, timeTaken);
    } catch (error) {
      console.error('Error saving exam score:', error);
    }
    
    setExamResults({ score, timeTaken, exam });
    setExamTakingState(prev => prev ? { ...prev, isSubmitted: true } : null);
    setCurrentView('results');
    
    // Clear timer
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const handleRetakeExam = (exam: SimulatorExam) => {
    // Reset exam data
    exam.score = undefined;
    exam.completedAt = undefined;
    exam.timeTaken = undefined;
    
    // Start the exam again
    handleStartExam(exam);
  };

  const handleBackToOverview = () => {
    setCurrentView('overview');
    setExamTakingState(null);
    setExamResults(null);
    if (timer) {
      clearInterval(timer);
      setTimer(null);
    }
  };

  const handleAnalyzeImprovement = () => {
    setShowAnalysis(true);
    setAnalysisResult('');
    // Mock analysis - in real implementation, this would analyze user's performance trends
    setTimeout(() => {
      const analysis = `📊 IMPROVEMENT ANALYSIS

✅ Strengths:
• Strong performance in foundational concepts (Level 1-2)
• Consistent timing across all exams
• Good retention of basic principles

⚠️ Areas for Improvement:
• Advanced problem-solving (Level 4+)
• Complex multi-step reasoning
• Time management on harder questions

💡 Recommendations:
• Focus on practice problems for Levels 4-5
• Review advanced concepts before next attempt
• Practice timed exercises for complex problems`;
      
      setAnalysisResult(analysis);
      setShowAnalysis(false);
    }, 1500);
  };

  const handlePredictScore = () => {
    setShowPrediction(true);
    setPredictionResult('');
    // Mock prediction - in real implementation, this would use ML to predict actual exam performance
    setTimeout(() => {
      const avgScore = completedExamsArray.length > 0 
        ? Math.round(completedExamsArray.reduce((sum, exam) => sum + (exam.score || 0), 0) / completedExamsArray.length)
        : 0;
      
      const predictedScore = Math.min(95, Math.max(60, avgScore + Math.floor(Math.random() * 20) - 5));
      const confidence = Math.floor(Math.random() * 15) + 80; // 80-95% confidence
      
      const prediction = `🎯 ACTUAL EXAM SCORE PREDICTION

📈 Predicted Score: ${predictedScore}%
🎲 Confidence Level: ${confidence}%

📊 Analysis:
• Based on ${completedExamsArray.length} completed practice exams
• Current average: ${avgScore}%
• Difficulty progression factor applied
• Time efficiency considered

💭 Interpretation:
${predictedScore >= 85 ? '🟢 Excellent! You\'re well-prepared for the actual exam' : 
  predictedScore >= 75 ? '🟡 Good preparation! Consider reviewing weak areas' : 
  '🔴 More practice recommended before taking actual exam'}

⚠️ Note: This is a statistical prediction based on practice performance. Actual results may vary.`;
      
      setPredictionResult(prediction);
      setShowPrediction(false);
    }, 2000);
  };

  // Results View
  if (currentView === 'results' && examResults) {
    return (
      <div className="min-h-screen bg-[#0d0d0d] p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={handleBackToOverview}
            variant="outline"
            className="mb-6 border-[#FEFBF6]/30 text-[#FEFBF6] hover:bg-[#FEFBF6]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Exam Series
          </Button>

          <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#FEFBF6]/20 backdrop-blur-sm text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-[#FEFBF6] to-[#fde6c4] rounded-full flex items-center justify-center mx-auto mb-6">
              <Trophy className="w-10 h-10 text-[#0d0d0d]" />
            </div>
            
            <h1 className="text-3xl font-bold text-[#FEFBF6] mb-4">Exam Complete!</h1>
            <h2 className="text-xl text-stone-300 mb-6">{examResults.exam.title}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              <div className="bg-stone-800/50 rounded-lg p-6">
                <div className="text-3xl font-bold mb-2">
                  <span className={getScoreColor(examResults.score)}>{examResults.score}%</span>
                </div>
                <p className="text-stone-400">Your Score</p>
              </div>
              
              <div className="bg-stone-800/50 rounded-lg p-6">
                <div className="text-3xl font-bold text-[#FEFBF6] mb-2">
                  {formatTime(examResults.timeTaken)}
                </div>
                <p className="text-stone-400">Time Taken</p>
              </div>
              
              <div className="bg-stone-800/50 rounded-lg p-6">
                <div className="text-3xl font-bold text-[#FEFBF6] mb-2">
                  {examResults.exam.difficultyLevel}/7
                </div>
                <p className="text-stone-400">Difficulty Level</p>
              </div>
            </div>

            <div className="space-y-4 mb-8">
              {examResults.score >= 90 && (
                <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-4">
                  <p className="text-green-400 font-medium">🎉 Excellent! You've mastered this level!</p>
                </div>
              )}
              {examResults.score >= 80 && examResults.score < 90 && (
                <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-4">
                  <p className="text-blue-400 font-medium">👏 Great job! You have a strong understanding!</p>
                </div>
              )}
              {examResults.score >= 70 && examResults.score < 80 && (
                <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4">
                  <p className="text-yellow-400 font-medium">👍 Good work! Consider reviewing some concepts.</p>
                </div>
              )}
              {examResults.score < 70 && (
                <div className="bg-orange-500/20 border border-orange-500/30 rounded-lg p-4">
                  <p className="text-orange-400 font-medium">📚 Keep studying! Review the material and try again.</p>
                </div>
              )}
            </div>

            <div className="flex gap-4 justify-center">
              <Button
                onClick={() => handleRetakeExam(examResults.exam)}
                variant="outline"
                className="border-[#FEFBF6]/30 text-[#FEFBF6] hover:bg-[#FEFBF6]/10"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Retake Exam
              </Button>
              <Button
                onClick={handleBackToOverview}
                className="bg-[#FEFBF6] text-[#0d0d0d] hover:bg-[#fde6c4]"
              >
                Continue to Next Level
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Exam Taking View
  if (currentView === 'taking-exam' && examTakingState) {
    const exam = examSeries.exams.find(e => e.id === examTakingState.examId);
    if (!exam) return null;

    const currentQuestion = exam.questions[examTakingState.currentQuestionIndex];
    const progress = ((examTakingState.currentQuestionIndex + 1) / exam.questions.length) * 100;

    return (
      <div className="min-h-screen bg-[#0d0d0d] p-6">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="bg-stone-900/50 rounded-2xl p-6 shadow-lg border border-[#FEFBF6]/20 backdrop-blur-sm mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold text-[#FEFBF6]">{exam.title}</h1>
                <p className="text-stone-400">
                  Question {examTakingState.currentQuestionIndex + 1} of {exam.questions.length}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-lg font-bold text-[#FEFBF6]">
                    {formatTime(examTakingState.timeRemaining)}
                  </div>
                  <p className="text-xs text-stone-400">Time Remaining</p>
                </div>
                
                <Button
                  onClick={handleBackToOverview}
                  variant="outline"
                  className="border-red-400/30 text-red-400 hover:bg-red-400/10"
                >
                  <X className="w-4 h-4 mr-2" />
                  Exit Exam
                </Button>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="w-full bg-stone-800 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-[#FEFBF6] to-[#fde6c4] h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          {/* Question */}
          <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#FEFBF6]/20 backdrop-blur-sm">
            <h2 className="text-xl text-[#FEFBF6] mb-6">{currentQuestion.question}</h2>
            
            <div className="space-y-3 mb-8">
              {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                currentQuestion.options.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(index)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      examTakingState.answers[examTakingState.currentQuestionIndex] === index
                        ? 'bg-[#FEFBF6]/20 border-[#FEFBF6] text-[#FEFBF6]'
                        : 'bg-stone-800/50 border-stone-700 text-stone-300 hover:bg-stone-800/70'
                    }`}
                  >
                    <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                    {option}
                  </button>
                ))
              )}
              
              {currentQuestion.type === 'true-false' && (
                <>
                  <button
                    onClick={() => handleAnswerSelect(0)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      examTakingState.answers[examTakingState.currentQuestionIndex] === 0
                        ? 'bg-[#FEFBF6]/20 border-[#FEFBF6] text-[#FEFBF6]'
                        : 'bg-stone-800/50 border-stone-700 text-stone-300 hover:bg-stone-800/70'
                    }`}
                  >
                    <span className="font-medium mr-3">A.</span>
                    True
                  </button>
                  <button
                    onClick={() => handleAnswerSelect(1)}
                    className={`w-full text-left p-4 rounded-lg border transition-all ${
                      examTakingState.answers[examTakingState.currentQuestionIndex] === 1
                        ? 'bg-[#FEFBF6]/20 border-[#FEFBF6] text-[#FEFBF6]'
                        : 'bg-stone-800/50 border-stone-700 text-stone-300 hover:bg-stone-800/70'
                    }`}
                  >
                    <span className="font-medium mr-3">B.</span>
                    False
                  </button>
                </>
              )}
              
              {(currentQuestion.type === 'short-answer' || currentQuestion.type === 'essay') && (
                <textarea
                  value={examTakingState.answers[examTakingState.currentQuestionIndex] as string || ''}
                  onChange={(e) => handleAnswerSelect(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full h-32 bg-stone-800/50 border border-stone-700 rounded-lg p-4 text-stone-300 placeholder-stone-500 focus:border-[#FEFBF6] focus:outline-none"
                />
              )}
            </div>

            {/* Navigation */}
            <div className="flex justify-between items-center">
              <Button
                onClick={handlePreviousQuestion}
                disabled={examTakingState.currentQuestionIndex === 0}
                variant="outline"
                className="border-[#FEFBF6]/30 text-[#FEFBF6] hover:bg-[#FEFBF6]/10 disabled:opacity-50"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Previous
              </Button>

              <div className="text-center">
                <p className="text-sm text-stone-400">
                  {examTakingState.answers.filter(a => a !== null && a !== '').length} of {exam.questions.length} answered
                </p>
              </div>

              {examTakingState.currentQuestionIndex === exam.questions.length - 1 ? (
                <Button
                  onClick={handleSubmitExam}
                  className="bg-[#FEFBF6] text-[#0d0d0d] hover:bg-[#fde6c4]"
                >
                  Submit Exam
                  <CheckCircle className="w-4 h-4 ml-2" />
                </Button>
              ) : (
                <Button
                  onClick={handleNextQuestion}
                  className="bg-[#FEFBF6] text-[#0d0d0d] hover:bg-[#fde6c4]"
                >
                  Next
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Overview - Main exam series view
  return (
    <div className="min-h-screen bg-[#0d0d0d] p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button
            onClick={onBackToGenerator}
            variant="outline"
            className="mb-6 border-[#FEFBF6]/30 text-[#FEFBF6] hover:bg-[#FEFBF6]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Generator
          </Button>
          
          <div className="text-center">
            <h1 className="text-4xl font-bold text-[#FEFBF6] mb-4">{examSeries.topic}</h1>
            <p className="text-xl text-stone-300 mb-6">{examSeries.description}</p>
            
            <div className="flex items-center justify-center gap-6 text-stone-300">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                <span>{examSeries.totalExams} progressive exams</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>{completedExamsArray.length}/{examSeries.totalExams} completed</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                <span>Created {examSeries.createdAt.toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex gap-8">
          {/* Left Side - Exam Cards */}
          <div className="flex-1 space-y-6">
            {examSeries.exams.map((exam, index) => {
              const isCompleted = completedExams.has(exam.id);
              const isLocked = index > 0 && !completedExams.has(examSeries.exams[index - 1].id);
              
              return (
                <div
                  key={exam.id}
                  className={`bg-stone-900/50 rounded-2xl p-6 shadow-lg border backdrop-blur-sm transition-all duration-200 ${
                    isLocked 
                      ? 'border-stone-700 opacity-60' 
                      : isCompleted
                        ? 'border-green-500/30 hover:border-green-500/50'
                        : 'border-[#FEFBF6]/20 hover:border-[#FEFBF6]/40 hover:shadow-xl'
                  }`}
                >
                  <div className="flex items-start gap-6">
                    {/* Level Indicator */}
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      isCompleted 
                        ? 'bg-green-500/20 text-green-400'
                        : isLocked
                          ? 'bg-stone-700/50 text-stone-500'
                          : 'bg-[#FEFBF6]/20 text-[#FEFBF6]'
                    }`}>
                      {isCompleted ? (
                        <CheckCircle className="w-8 h-8" />
                      ) : isLocked ? (
                        <div className="w-8 h-8 border-2 border-stone-500 rounded-full flex items-center justify-center">
                          <span className="text-sm font-bold">{exam.difficultyLevel}</span>
                        </div>
                      ) : (
                        <span className="text-xl font-bold">{exam.difficultyLevel}</span>
                      )}
                    </div>
                    
                    {/* Exam Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-xl font-semibold text-[#FEFBF6] mb-2">{exam.title}</h3>
                          <p className="text-stone-300 mb-3">{exam.description}</p>
                          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getDifficultyColor(exam.difficultyLevel)}`}>
                            Level {exam.difficultyLevel}: {exam.difficultyLabel}
                          </div>
                        </div>
                      </div>
                      
                      {/* Exam Stats */}
                      <div className="grid grid-cols-3 gap-4 mb-6">
                        <div className="bg-stone-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-stone-400 mb-1">
                            <Target className="w-4 h-4" />
                            <span>Questions</span>
                          </div>
                          <p className="text-[#FEFBF6] font-medium">{exam.questions.length}</p>
                        </div>
                        
                        <div className="bg-stone-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-stone-400 mb-1">
                            <Clock className="w-4 h-4" />
                            <span>Time Limit</span>
                          </div>
                          <p className="text-[#FEFBF6] font-medium">{exam.estimatedTime} min</p>
                        </div>
                        
                        <div className="bg-stone-800/50 rounded-lg p-3">
                          <div className="flex items-center gap-2 text-sm text-stone-400 mb-1">
                            <Trophy className="w-4 h-4" />
                            <span>Points</span>
                          </div>
                          <p className="text-[#FEFBF6] font-medium">{exam.totalPoints}</p>
                        </div>
                      </div>
                      
                      {/* Score Display */}
                      {isCompleted && exam.score !== undefined && (
                        <div className="bg-[#FEFBF6]/10 border border-[#FEFBF6]/30 rounded-lg p-4 mb-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Award className="w-4 h-4 text-[#FEFBF6]" />
                                <span className="text-sm font-medium text-[#FEFBF6]">Your Score:</span>
                              </div>
                              <p className={`text-2xl font-bold ${getScoreColor(exam.score)}`}>{exam.score}%</p>
                            </div>
                            {exam.timeTaken && (
                              <div className="text-right">
                                <p className="text-sm text-stone-400">Time Taken</p>
                                <p className="text-[#FEFBF6] font-medium">{formatTime(exam.timeTaken)}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                      
                      {/* Action Buttons */}
                      <div className="flex gap-3">
                        {isLocked ? (
                          <Button
                            disabled
                            className="bg-stone-700 text-stone-500 cursor-not-allowed"
                          >
                            🔒 Complete Previous Level First
                          </Button>
                        ) : isCompleted ? (
                          <>
                            <Button
                              onClick={() => handleRetakeExam(exam)}
                              variant="outline"
                              className="border-[#FEFBF6]/30 text-[#FEFBF6] hover:bg-[#FEFBF6]/10"
                            >
                              <RotateCcw className="w-4 h-4 mr-2" />
                              Retake Exam
                            </Button>
                            {exam.score && exam.score >= 80 && (
                              <div className="flex items-center gap-2 text-green-400 text-sm">
                                <CheckCircle className="w-4 h-4" />
                                <span>Mastered! Ready for next level</span>
                              </div>
                            )}
                          </>
                        ) : (
                          <Button
                            onClick={() => handleStartExam(exam)}
                            className="bg-[#FEFBF6] text-[#0d0d0d] hover:bg-[#fde6c4]"
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Start Exam
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Side - Progress Report */}
          <div className="w-80">
            <div className="bg-stone-900/50 rounded-2xl p-6 shadow-lg border border-[#FEFBF6]/20 backdrop-blur-sm sticky top-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#FEFBF6] to-[#fde6c4] rounded-xl flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-[#0d0d0d]" />
                </div>
                <h3 className="text-xl font-bold text-[#FEFBF6]">Progress Report</h3>
              </div>

              {/* Overall Progress */}
              <div className="mb-6">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-stone-400">Overall Progress</span>
                  <span className="text-sm font-medium text-[#FEFBF6]">
                    {completedExamsArray.length}/{examSeries.totalExams}
                  </span>
                </div>
                <div className="w-full bg-stone-800 rounded-full h-3">
                  <div 
                    className="bg-gradient-to-r from-[#FEFBF6] to-[#fde6c4] h-3 rounded-full transition-all duration-500"
                    style={{ width: `${(completedExamsArray.length / examSeries.totalExams) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-stone-400 mt-1">
                  {Math.round((completedExamsArray.length / examSeries.totalExams) * 100)}% Complete
                </p>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-stone-800/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-[#FEFBF6] mb-1">
                    {completedExamsArray.length > 0 
                      ? Math.round(completedExamsArray.reduce((sum, exam) => sum + (exam.score || 0), 0) / completedExamsArray.length)
                      : 0}%
                  </div>
                  <p className="text-xs text-stone-400">Avg Score</p>
                </div>
                
                <div className="bg-stone-800/50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-[#FEFBF6] mb-1">
                    {completedExamsArray.length > 0 
                      ? formatTime(Math.round(completedExamsArray.reduce((sum, exam) => sum + (exam.timeTaken || 0), 0) / completedExamsArray.length))
                      : '0:00'}
                  </div>
                  <p className="text-xs text-stone-400">Avg Time</p>
                </div>
              </div>

              {/* Level Breakdown */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#FEFBF6] mb-3">Level Breakdown</h4>
                {examSeries.exams.map((exam) => {
                  const isCompleted = completedExams.has(exam.id);
                  return (
                    <div key={exam.id} className="flex items-center justify-between py-2">
                      <div className="flex items-center gap-3">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          isCompleted 
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-stone-700 text-stone-400'
                        }`}>
                          {exam.difficultyLevel}
                        </div>
                        <span className="text-sm text-stone-300">{exam.difficultyLabel}</span>
                      </div>
                      <div className="text-right">
                        {isCompleted && exam.score !== undefined ? (
                          <span className={`text-sm font-medium ${getScoreColor(exam.score)}`}>
                            {exam.score}%
                          </span>
                        ) : (
                          <span className="text-xs text-stone-500">Not taken</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {completedExamsArray.length > 0 && (
                <div className="mt-6 pt-6 border-t border-[#FEFBF6]/20">
                  <h4 className="text-sm font-medium text-[#FEFBF6] mb-3">Achievements</h4>
                  <div className="space-y-2">
                    {completedExamsArray.length >= 1 && (
                      <div className="flex items-center gap-2 text-xs text-green-400">
                        <Star className="w-3 h-3" />
                        <span>First Exam Completed</span>
                      </div>
                    )}
                    {completedExamsArray.length >= examSeries.totalExams / 2 && (
                      <div className="flex items-center gap-2 text-xs text-blue-400">
                        <TrendingUp className="w-3 h-3" />
                        <span>Halfway There</span>
                      </div>
                    )}
                    {completedExamsArray.length === examSeries.totalExams && (
                      <div className="flex items-center gap-2 text-xs text-[#FEFBF6]">
                        <Trophy className="w-3 h-3" />
                        <span>Series Complete!</span>
                      </div>
                    )}
                    {completedExamsArray.some(exam => exam.score && exam.score >= 90) && (
                      <div className="flex items-center gap-2 text-xs text-yellow-400">
                        <Award className="w-3 h-3" />
                        <span>High Achiever (90%+)</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {completedExamsArray.length >= 0 && (
                <div className="mt-6 pt-6 border-t border-[#FEFBF6]/20 space-y-3">
                  <Button
                    onClick={handleAnalyzeImprovement}
                    disabled={showAnalysis}
                    style={{ display:'none'}}

                    className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {showAnalysis ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <LineChart className="w-4 h-4 mr-2" />
                        Analyze Improvement
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handlePredictScore}
                    disabled={showPrediction}
                    style={{ display:'none'}}
                    className="w-full bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                  >
                    {showPrediction ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Predicting...
                      </>
                    ) : (
                      <>
                        <Calculator className="w-4 h-4 mr-2" />
                        Predict Actual Exam Score
                      </>
                    )}
                  </Button>
                  
                  {/* Analysis Result Textbox */}
                  {analysisResult && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-[#ffffff] mb-2">Analysis Results:</h4>
                      <textarea
                        value={analysisResult}
                        readOnly
                        className="w-full h-48 bg-stone-800/50 border border-[#ffffff]/30 rounded-lg p-3 text-sm text-stone-200 resize-none"
                      />
                    </div>
                  )}
                  
                  {/* Prediction Result Textbox */}
                  {predictionResult && (
                    <div className="mt-4">
                      <h4 className="text-sm font-medium text-[#ffffff] mb-2">Prediction Results:</h4>
                      <textarea
                        value={predictionResult}
                        readOnly
                        className="w-full h-48 bg-stone-800/50 border border-[#ffffff]/30 rounded-lg p-3 text-sm text-stone-200 resize-none"
                      />
                    </div>
                  )}
                </div>
              )}
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExamSimulatorView;