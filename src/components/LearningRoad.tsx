import React, { useState, useRef, useEffect } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Map, 
  Sparkles, 
  Brain, 
  Star, 
  CheckCircle, 
  Clock, 
  Target, 
  Play, 
  Trophy,
  ArrowLeft,
  BookOpen,
  Users,
  Award,
  ChevronRight,
  X
} from 'lucide-react';
import { LearningRoadService } from '../services/learningRoadService';
import { databaseService, type StoredLearningPath } from '../services/databaseService';


interface LearningStep {
  id: string;
  title: string;
  description: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  estimatedTime: string;
  keyTopics: string[];
  completed: boolean;
}

interface LearningMaterial {
  title: string;
  introduction: string;
  sections: Array<{
    title: string;
    content: string;
    examples?: string[];
  }>;
  keyPoints: string[];
  summary: string;
  nextSteps: string[];
  estimatedReadTime: string;
}

interface Quiz {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  difficulty: string;
}

function LearningRoad() {
  const { language, t } = useLanguage();
  const [topicInput, setTopicInput] = useState('');
  const [learningPath, setLearningPath] = useState<LearningStep[]>([]);
  const [selectedPathTopic, setSelectedPathTopic] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [currentView, setCurrentView] = useState<'input' | 'path' | 'learning' | 'quiz'>('input');
  const [selectedTopic, setSelectedTopic] = useState<LearningStep | null>(null);
  const [learningMaterial, setLearningMaterial] = useState<LearningMaterial | null>(null);
  const [isLoadingMaterial, setIsLoadingMaterial] = useState(false);
  const [quiz, setQuiz] = useState<Quiz[]>([]);
  const [isLoadingQuiz, setIsLoadingQuiz] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationElapsedTime, setGenerationElapsedTime] = useState(0);
  const [savedLearningPaths, setSavedLearningPaths] = useState<StoredLearningPath[]>([]);
  const [showSavedPaths, setShowSavedPaths] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const learningRoadService = new LearningRoadService();

  // Load saved learning paths on component mount
  useEffect(() => {
    loadSavedLearningPaths();
  }, []);

  const loadSavedLearningPaths = async () => {
    try {
      const saved = await databaseService.getAllLearningPaths();
      setSavedLearningPaths(saved);
    } catch (error) {
      console.error('Error loading saved learning paths:', error);
    }
  };

  // Format elapsed time in MM:SS format
  const formatElapsedTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  // Timer effect
  useEffect(() => {
    if (isGenerating && generationStartTime) {
      timerRef.current = setInterval(() => {
        const elapsed = Math.floor((Date.now() - generationStartTime) / 1000);
        setGenerationElapsedTime(elapsed);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isGenerating, generationStartTime]);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty.toLowerCase()) {
      case 'beginner':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'intermediate':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'advanced':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const handleGeneratePath = async () => {
    if (!topicInput.trim()) return;

    setIsGenerating(true);
    setGenerationError(null);
    setGenerationStartTime(Date.now());
    setGenerationElapsedTime(0);

    try {
      const path = await learningRoadService.generateLearningPath(topicInput.trim(),language);
      setLearningPath(path.steps);
      setSelectedPathTopic(path.topic);
      setCurrentView('path');
      
      // Save to database
      try {
        await databaseService.saveLearningPath(path);
        loadSavedLearningPaths(); // Refresh the saved paths list
        console.log('Learning path saved to database');
      } catch (error) {
        console.error('Error saving learning path to database:', error);
      }
    } catch (error) {
      console.error('Error generating learning path:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to generate learning path');
    } finally {
      setIsGenerating(false);
      setGenerationStartTime(null);
    }
  };

  const handleStartLearning = async (topic: LearningStep) => {
    setSelectedTopic(topic);
    setIsLoadingMaterial(true);
    setCurrentView('learning');

    try {
      const material = await learningRoadService.generateLearningMaterial(
        selectedPathTopic,
        topic.title,
        topic.description,
        topic.keyTopics,
        language
      );
      setLearningMaterial(material);
    } catch (error) {
      console.error('Error generating learning material:', error);
      // Fallback material
      setLearningMaterial({
        title: topic.title,
        introduction: `Welcome to learning about ${topic.title}. This comprehensive guide will help you understand the key concepts and practical applications.`,
        sections: [
          {
            title: 'Overview',
            content: topic.description,
            examples: ['Example 1: Basic concepts', 'Example 2: Practical application']
          }
        ],
        keyPoints: topic.keyTopics,
        summary: `You've learned the fundamentals of ${topic.title}. Practice these concepts to reinforce your understanding.`,
        nextSteps: ['Practice with exercises', 'Take the quiz', 'Move to the next topic'],
        estimatedReadTime: topic.estimatedTime
      });
    } finally {
      setIsLoadingMaterial(false);
    }
  };

  const handleStartQuiz = async (topic: LearningStep) => {
    setSelectedTopic(topic);
    setIsLoadingQuiz(true);
    setCurrentView('quiz');
    setCurrentQuestionIndex(0);
    setSelectedAnswers([]);
    setShowResults(false);

    try {
      const quizQuestions = await learningRoadService.generateQuiz(selectedPathTopic, topic.title, language);
      setQuiz(quizQuestions);
    } catch (error) {
      console.error('Error generating quiz:', error);
      // Fallback quiz
      setQuiz([
        {
          id: '1',
          question: `What is the main concept of ${topic.title}?`,
          options: ['Option A', 'Option B', 'Option C', 'Option D'],
          correctAnswer: 0,
          explanation: 'This is the correct answer because...',
          difficulty: topic.difficulty
        }
      ]);
    } finally {
      setIsLoadingQuiz(false);
    }
  };

  const handleAnswerSelect = (answerIndex: number) => {
    const newAnswers = [...selectedAnswers];
    newAnswers[currentQuestionIndex] = answerIndex;
    setSelectedAnswers(newAnswers);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleCompleteStep = () => {
    if (selectedTopic) {
      const updatedPath = learningPath.map(step =>
        step.id === selectedTopic.id ? { ...step, completed: true } : step
      );
      setLearningPath(updatedPath);
      setCurrentView('path');
    }
  };

  const handleLoadSavedPath = async (pathId: string) => {
    try {
      const path = await databaseService.getLearningPath(pathId);
      if (path) {
        setLearningPath(path.steps);
        setSelectedPathTopic(path.topic);
        setTopicInput(path.topic);
        setShowSavedPaths(false);
        setCurrentView('path');
        console.log('Loaded saved learning path:', path.topic);
      }
    } catch (error) {
      console.error('Error loading saved learning path:', error);
    }
  };

  const handleDeleteSavedPath = async (pathId: string) => {
    if (confirm('Are you sure you want to delete this learning path?')) {
      try {
        await databaseService.deleteLearningPath(pathId);
        loadSavedLearningPaths();
        console.log('Deleted learning path:', pathId);
      } catch (error) {
        console.error('Error deleting learning path:', error);
      }
    }
  };

  const calculateQuizScore = () => {
    let correct = 0;
    selectedAnswers.forEach((answer, index) => {
      if (answer === quiz[index]?.correctAnswer) {
        correct++;
      }
    });
    return Math.round((correct / quiz.length) * 100);
  };

  // Quiz View
  if (currentView === 'quiz') {
    if (isLoadingQuiz) {
      return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#feedd1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-[#feedd1] mb-2">Generating Quiz...</h2>
            <p className="text-stone-300">Creating personalized questions for you</p>
          </div>
        </div>
      );
    }

    if (showResults) {
      const score = calculateQuizScore();
      return (
        <div className="min-h-screen bg-[#0d0d0d] p-6">
          <div className="max-w-4xl mx-auto">
            <Button
              onClick={() => setCurrentView('path')}
              variant="outline"
              className="mb-6 border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Learning Path
            </Button>

            <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-full flex items-center justify-center mx-auto mb-6">
                <Award className="w-10 h-10 text-[#0d0d0d]" />
              </div>
              
              <h1 className="text-3xl font-bold text-[#ffffff] mb-4">Quiz Complete!</h1>
              <p className="text-xl text-stone-300 mb-6">Your Score: {score}%</p>
              
              <div className="space-y-4 mb-8">
                {quiz.map((question, index) => (
                  <div key={question.id} className="bg-stone-800/50 rounded-lg p-4 text-left">
                    <h3 className="text-lg font-semibold text-[#ffffff] mb-2">
                      {index + 1}. {question.question}
                    </h3>
                    <p className={`text-sm mb-2 ${
                      selectedAnswers[index] === question.correctAnswer 
                        ? 'text-green-400' 
                        : 'text-red-400'
                    }`}>
                      Your answer: {question.options[selectedAnswers[index]]}
                    </p>
                    {selectedAnswers[index] !== question.correctAnswer && (
                      <p className="text-sm text-green-400 mb-2">
                        Correct answer: {question.options[question.correctAnswer]}
                      </p>
                    )}
                    <p className="text-sm text-stone-300">{question.explanation}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-4 justify-center">
                <Button
                  onClick={handleCompleteStep}
                  className="bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4]"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Complete
                </Button>
                <Button
                  onClick={() => setCurrentView('path')}
                  variant="outline"
                  className="border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10"
                >
                  Continue Learning
                </Button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    const currentQuestion = quiz[currentQuestionIndex];
    return (
      <div className="min-h-screen bg-[#0d0d0d] p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => setCurrentView('path')}
            variant="outline"
            className="mb-6 border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Learning Path
          </Button>

          <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-[#ffffff]">
                Quiz: {selectedTopic?.title}
              </h1>
              <span className="text-stone-300">
                Question {currentQuestionIndex + 1} of {quiz.length}
              </span>
            </div>

            {currentQuestion && (
              <div className="space-y-6">
                <h2 className="text-xl text-[#ffffff] mb-4">{currentQuestion.question}</h2>
                
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => handleAnswerSelect(index)}
                      className={`w-full text-left p-4 rounded-lg border transition-all ${
                        selectedAnswers[currentQuestionIndex] === index
                          ? 'bg-[#ffffff]/20 border-[#ffffff] text-[#ffffff]'
                          : 'bg-stone-800/50 border-stone-700 text-stone-300 hover:bg-stone-800/70'
                      }`}
                    >
                      <span className="font-medium mr-3">{String.fromCharCode(65 + index)}.</span>
                      {option}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-6">
                  <Button
                    onClick={handleNextQuestion}
                    disabled={selectedAnswers[currentQuestionIndex] === undefined}
                    className="bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4] disabled:opacity-50"
                  >
                    {currentQuestionIndex === quiz.length - 1 ? 'Finish Quiz' : 'Next Question'}
                    <ChevronRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Learning Material View
  if (currentView === 'learning') {
    if (isLoadingMaterial) {
      return (
        <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-[#feedd1] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <h2 className="text-2xl font-bold text-[#feedd1] mb-2">Generating Learning Material...</h2>
            <p className="text-stone-300">Creating personalized content for you</p>
          </div>
        </div>
      );
    }

    return (
      <div className="min-h-screen bg-[#0d0d0d] p-6">
        <div className="max-w-4xl mx-auto">
          <Button
            onClick={() => setCurrentView('path')}
            variant="outline"
            className="mb-6 border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Learning Path
          </Button>

          {learningMaterial && (
            <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
              <div className="flex items-start gap-6 mb-8">
                <div className="w-16 h-16 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-xl flex items-center justify-center flex-shrink-0">
                  <BookOpen className="w-8 h-8 text-[#0d0d0d]" />
                </div>
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-[#ffffff] mb-2">{learningMaterial.title}</h1>
                  <div className="flex items-center gap-4 text-sm text-stone-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {learningMaterial.estimatedReadTime}
                    </span>
                    <span className="flex items-center gap-1">
                      <Target className="w-4 h-4" />
                      {learningMaterial.sections.length} sections
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Introduction */}
                <div className="bg-stone-800/50 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-[#ffffff] mb-3">Introduction</h2>
                  <p className="text-stone-300 leading-relaxed">{learningMaterial.introduction}</p>
                </div>

                {/* Sections */}
                {learningMaterial.sections.map((section, index) => (
                  <div key={index} className="bg-stone-800/50 rounded-lg p-6">
                    <h2 className="text-xl font-semibold text-[#ffffff] mb-3">{section.title}</h2>
                    <p className="text-stone-300 leading-relaxed mb-4">{section.content}</p>
                    {section.examples && section.examples.length > 0 && (
                      <div className="bg-[#ffffff]/10 rounded-lg p-4 border border-[#ffffff]/20">
                        <h3 className="text-sm font-medium text-[#ffffff] mb-2">Examples:</h3>
                        <ul className="space-y-1">
                          {section.examples.map((example, idx) => (
                            <li key={idx} className="text-sm text-stone-300">
                              {/* Access the string value from the object */}
                              <span className="font-bold mr-2">{Object.keys(example)[0]}:</span>
                              {Object.values(example)[0]}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}

              

                {/* Summary */}
                <div className="bg-stone-800/50 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-[#ffffff] mb-3">Summary</h2>
                  <p className="text-stone-300 leading-relaxed">{learningMaterial.summary}</p>
                </div>

                {/* Next Steps */}
                <div className="bg-stone-800/50 rounded-lg p-6">
                  <h2 className="text-xl font-semibold text-[#ffffff] mb-3">Next Steps</h2>
                  <div className="space-y-2">
                    {learningMaterial.nextSteps.map((step, index) => (
                      <div key={index} className="flex items-start gap-3">
                        <ChevronRight className="w-5 h-5 text-[#ffffff] flex-shrink-0 mt-0.5" />
                        <span className="text-stone-300">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-8 pt-8 border-t border-[#ffffff]/20">
                <Button
                  onClick={() => selectedTopic && handleStartQuiz(selectedTopic)}
                  className="bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4]"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Take Quiz
                </Button>
                <Button
                  onClick={handleCompleteStep}
                  variant="outline"
                  className="border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  Mark as Complete
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Learning Path View
  if (currentView === 'path') {
    const completedSteps = learningPath.filter(step => step.completed).length;
    const totalTime = learningPath.reduce((acc, step) => {
      const time = parseInt(step.estimatedTime);
      return acc + (isNaN(time) ? 0 : time);
    }, 0);

    return (
      <div className="min-h-screen bg-[#0d0d0d] p-6">
        <div className="max-w-6xl mx-auto">
          <Button
            onClick={() => setCurrentView('input')}
            variant="outline"
            className="mb-6 border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            New Learning Path
          </Button>

          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-full flex items-center justify-center mx-auto mb-6">
              <Map className="w-10 h-10 text-[#0d0d0d]" />
            </div>
            <h1 className="text-4xl font-bold text-[#ffffff] mb-4">Learning Path: {topicInput}</h1>
            <div className="flex items-center justify-center gap-6 text-stone-300">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                <span>{learningPath.length} steps</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                <span>~{totalTime} minutes</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5" />
                <span>{completedSteps}/{learningPath.length} completed</span>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            {learningPath.map((topic, index) => (
              <div
                key={topic.id}
                className="bg-stone-900/50 rounded-2xl p-6 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm"
              >
                <div className="flex items-start gap-6">
                  <div className="flex-shrink-0">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      topic.completed 
                        ? 'bg-green-400/20 text-green-400'
                        : 'bg-[#ffffff]/20 text-[#ffffff]'
                    }`}>
                      {topic.completed ? (
                        <CheckCircle className="w-6 h-6" />
                      ) : (
                        <Star className="w-6 h-6" />
                      )}
                    </div>
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-[#ffffff] mb-2">{topic.title}</h3>
                        <p className="text-stone-300">{topic.description}</p>
                      </div>
                      <div className={`px-3 py-1 rounded-full text-sm font-medium ${getDifficultyColor(topic.difficulty)}`}>
                        {topic.difficulty}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div className="bg-stone-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-stone-400 mb-1">
                          <Clock className="w-4 h-4" />
                          <span>Duration</span>
                        </div>
                        <p className="text-[#ffffff] font-medium">{topic.estimatedTime}</p>
                      </div>
                      
                      <div className="bg-stone-800/50 rounded-lg p-3">
                        <div className="flex items-center gap-2 text-sm text-stone-400 mb-1">
                          <Target className="w-4 h-4" />
                          <span>Key Topics</span>
                        </div>
                        <p className="text-[#ffffff] font-medium">{topic.keyTopics.length}</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-3 mb-6">
                      {topic.keyTopics.map((keyTopic, idx) => (
                        <div
                          key={idx}
                          className="bg-[#ffffff]/10 text-[#ffffff] px-3 py-1 rounded-full text-sm"
                        >
                          {keyTopic}
                        </div>
                      ))}
                    </div>
                    
                    <div className="flex gap-4 pt-6 border-t border-[#ffffff]/20">
                      <Button
                        onClick={() => handleStartLearning(topic)}
                        className="bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4]"
                      >
                        <Play className="w-4 h-4 mr-2" />
                        Start Learning
                      </Button>
                      
                      <Button
                        onClick={() => handleStartQuiz(topic)}
                        variant="outline"
                        className="border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10"
                      >
                        <Trophy className="w-4 h-4 mr-2" />
                        Take Quiz
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Input View (Default)
  return (
    <div className="min-h-screen bg-[#0d0d0d] flex items-center justify-center p-6">
      <div className="max-w-3xl w-full">
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-full flex items-center justify-center mx-auto mb-6">
            <Map className="w-10 h-10 text-[#0d0d0d]" />
          </div>
          <h1 className="text-4xl font-bold text-[#ffffff] mb-4">{t('learningroad.title')}</h1>
          <p className="text-xl text-stone-300">{t('learningroad.description')}</p>
          
          {/* Load Saved Paths Button */}
          <div className="mt-6">
            <Button
              onClick={() => setShowSavedPaths(!showSavedPaths)}
              variant="outline"
              className="border-[#ffffff]/40 text-[#ffffff] hover:bg-[#ffffff]/20 rounded-2xl"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {showSavedPaths ? t('hide') : t('load') } {t('series')} ({savedLearningPaths.length})
            </Button>
          </div>
        </div>

        {/* Saved Learning Paths */}
        {showSavedPaths && (
          <div className="mb-8">
            <div className="bg-stone-900/50 rounded-3xl p-8 shadow-xl border border-[#ffffff]/30 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-[#ffffff] mb-6">Saved Learning Paths</h3>
              
              {savedLearningPaths.length === 0 ? (
                <p className="text-stone-400 text-center py-8">No saved learning paths found. Generate your first path to see it here!</p>
              ) : (
                <div className="space-y-4">
                  {savedLearningPaths.map((path) => (
                    <div
                      key={path.id}
                      className="bg-stone-800/50 rounded-2xl p-6 border border-[#ffffff]/20 hover:border-[#ffffff]/40 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-[#ffffff] mb-2">{path.topic}</h4>
                          <p className="text-stone-300 text-sm mb-3">{path.description}</p>
                          <div className="flex items-center gap-4 text-sm text-stone-400">
                            <span>{JSON.parse(path.stepsData).length} steps</span>
                            <span>{path.totalEstimatedTime}</span>
                            <span className={`px-2 py-1 rounded-lg text-xs ${
                              path.difficulty === 'Beginner' ? 'bg-green-500/20 text-green-400' :
                              path.difficulty === 'Intermediate' ? 'bg-yellow-500/20 text-yellow-400' :
                              path.difficulty === 'Advanced' ? 'bg-red-500/20 text-red-400' :
                              'bg-gray-500/20 text-gray-400'
                            }`}>
                              {path.difficulty}
                            </span>
                            <span>Created: {new Date(path.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleLoadSavedPath(path.id)}
                            className="bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4] rounded-xl"
                          >
                            Load
                          </Button>
                          <Button
                            onClick={() => handleDeleteSavedPath(path.id)}
                            variant="outline"
                            className="border-red-400/40 text-red-400 hover:bg-red-400/20 rounded-xl"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
          {/* Timer Display - Centered */}
          <div className="flex justify-center mb-6">
            <div className="bg-[#ffffff]/10 border border-[#ffffff]/30 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                  <Clock className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="text-sm font-mono font-bold text-[#ffffff]">
                    {formatElapsedTime(generationElapsedTime)}
                  </div>
                  <div className="text-xs text-stone-400"> {t('time')}</div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="topic" className="text-[#ffffff]">{t('learningroad.what.learn')}</Label>
              <Input
                id="topic"
                value={topicInput}
                onChange={(e) => setTopicInput(e.target.value)}
                placeholder={t('learningroad.placeholder')}
                className="bg-stone-800 border-stone-700 text-stone-100 placeholder:text-stone-500"
              />
            </div>

            {generationError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 text-red-400">
                <p>{generationError}</p>
              </div>
            )}

            <Button
              onClick={handleGeneratePath}
              disabled={isGenerating || !topicInput.trim()}
              className="w-full bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4] disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-[#0d0d0d] border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('learningroad.generating')}
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  {t('learningroad.generate')}
                </>
              )}
            </Button>

            <div className="flex items-center justify-center gap-2 text-sm text-stone-400 pt-4 border-t border-[#ffffff]/20">
              <Brain className="w-4 h-4" />
              <span>{t('learningroad.powered')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LearningRoad;