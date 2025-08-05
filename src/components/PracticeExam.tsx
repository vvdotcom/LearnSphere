import React, { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FileText, 
  Upload, 
  Download, 
  Sparkles, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  X,
  Eye,
  RefreshCw,
  BookOpen,
  Target,
  Brain,
  Zap,
  FileCheck,
  Settings,
  HelpCircle,
  Copy
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { practiceExamService, type DifficultyLevel, type ExamSettings, type GeneratedExam } from '../services/practiceExamService';
import { databaseService, type StoredPracticeExam } from '../services/databaseService';

const Textarea = (props) => <textarea {...props} />;


const PracticeExam = () => {
  const { language, t } = useLanguage();
  const [examDescription, setExamDescription] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedExam, setGeneratedExam] = useState<GeneratedExam | null>(null);
  const [showSettings, setShowSettings] = useState(true); // Default to true for visibility
  const [showPreview, setShowPreview] = useState(false);
  const [savedExams, setSavedExams] = useState<StoredPracticeExam[]>([]);
  const [showSavedExams, setShowSavedExams] = useState(false);
  const [examSettings, setExamSettings] = useState<ExamSettings>({
    questionCount: 20,
    difficulty: 'same' as DifficultyLevel,
    questionTypes: ['Multiple Choice', 'Short Answer'],
    timeLimit: 60,
    includeAnswerKey: true
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load saved exams on component mount
  React.useEffect(() => {
    loadSavedExams();
  }, []);

  const loadSavedExams = () => {
    try {
      databaseService.getAllPracticeExams().then(saved => {
        setSavedExams(saved);
      }).catch(error => {
        console.error('Error loading saved exams:', error);
      });
    } catch (error) {
      console.error('Error loading saved exams:', error);
    }
  };

  const questionTypeOptions = [
    'Multiple Choice',
    'True/False',
    'Short Answer',
    'Essay Questions',
    'Fill in the Blank',
    'Matching'
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    const validFiles = files.filter(file => {
      const validTypes = [
        'application/pdf', 
        'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 
        'text/plain',
        'image/jpeg',
        'image/jpg', 
        'image/png'
      ];
      const isValidType = validTypes.includes(file.type) ||  
        file.name.toLowerCase().match(/\.(pdf|doc|docx|txt|jpg|jpeg|png)$/);
      
      if (!isValidType) {
        alert(`File ${file.name} is not supported. Please upload PDF, DOC, DOCX, TXT, JPG, or PNG files.`);
        return false;
      }
      
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        alert(`File ${file.name} is too large. Please upload files smaller than 10MB.`);
        return false;
      }
      
      return true;
    });
    
    setUploadedFiles(prev => [...prev, ...validFiles]);
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleGenerateExam = async () => {
    if (!examDescription.trim() && uploadedFiles.length === 0) return;
    
    setGenerationError(null);
    setGeneratedExam(null);
    setIsGenerating(true);
    
    try {
      console.log('Starting practice exam generation with Gemini AI...');
      console.log('Description:', examDescription);
      console.log('Files:', uploadedFiles.map(f => f.name));
      console.log('Settings:', examSettings);
      
      const exam = await practiceExamService.generatePracticeExam(
        examDescription,
        uploadedFiles,
        examSettings,
        language
      );
      
      console.log('Successfully generated exam:', exam.title);
      setGeneratedExam(exam);
      
      // Save to database
      try {
        await databaseService.savePracticeExam(exam, examSettings);
        loadSavedExams(); // Refresh the saved exams list
        console.log('Practice exam saved to database');
      } catch (error) {
        console.error('Error saving practice exam to database:', error);
      }
    } catch (error) {
      console.error('Error generating exam:', error);
      setGenerationError(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while generating the exam. Please try again.'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadExam = () => {
    if (!generatedExam) return;
    
    try {
      const pdfContent = practiceExamService.generateExamPDF(generatedExam);
      
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${generatedExam.title.replace(/[^a-z0-9]/gi, '_')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading exam:', error);
      alert('Error downloading exam. Please try again.');
    }
  };

  const handlePreviewExam = () => {
    setShowPreview(true);
  };

  const resetForm = () => {
    setExamDescription('');
    setUploadedFiles([]);
    setGeneratedExam(null);
    setGenerationError(null);
    setShowSettings(true);
    setShowPreview(false);
    loadSavedExams(); // Refresh saved exams when resetting
  };

  const handleLoadSavedExam = async (examId: string) => {
    try {
      const exam = await databaseService.getPracticeExam(examId);
      if (exam) {
        setGeneratedExam(exam);
        setShowSavedExams(false);
        console.log('Loaded saved exam:', exam.title);
      }
    } catch (error) {
      console.error('Error loading saved exam:', error);
    }
  };

  const handleDeleteSavedExam = (examId: string) => {
    if (confirm('Are you sure you want to delete this exam?')) {
      try {
        databaseService.deletePracticeExam(examId).then(() => {
          loadSavedExams();
          console.log('Deleted exam:', examId);
        }).catch(error => {
          console.error('Error deleting exam:', error);
        });
      } catch (error) {
        console.error('Error deleting exam:', error);
      }
    }
  };

  const getDifficultyColor = (difficulty: DifficultyLevel | string) => {
    switch (difficulty) {
      case 'same': return 'text-blue-400 bg-blue-400/20';
      case 'hard': return 'text-orange-400 bg-orange-400/20';
      case 'very-hard': return 'text-red-400 bg-red-400/20';
      default: return 'text-[#feedd1] bg-[#feedd1]/20';
    }
  };

  const getDifficultyLabel = (difficulty: DifficultyLevel) => {
    switch (difficulty) {
      case 'same': return 'Same Difficulty';
      case 'hard': return 'Harder';
      case 'very-hard': return 'Much Harder';
      default: return difficulty;
    }
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Preview Modal
  if (showPreview && generatedExam) {
    return (
      <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
        <div className="bg-[#0d0d0d] rounded-3xl border border-[#feedd1]/30 max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
          <div className="p-8 border-b border-[#feedd1]/30 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-[#feedd1]">Exam Preview</h2>
            <Button
              onClick={() => setShowPreview(false)}
              variant="ghost"
              size="icon"
              className="text-stone-400 hover:text-[#feedd1] hover:bg-[#feedd1]/10 rounded-2xl transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
          
          <div className="p-8 overflow-y-auto flex-grow">
            <div className="space-y-6">
              <div>
                <h3 className="text-xl font-bold text-[#feedd1] mb-2">{generatedExam.title}</h3>
                <p className="text-stone-300 mb-4">{generatedExam.description}</p>
                <div className="bg-[#feedd1]/15 border border-[#feedd1]/40 rounded-2xl p-6 mb-4 shadow-inner">
                  <p className="text-stone-200">{generatedExam.instructions}</p>
                </div>
                <div className="flex items-center gap-4 text-sm text-stone-400 mb-6">
                  <span>Time: {generatedExam.estimatedTime} minutes</span>
                  <span>Total Points: {generatedExam.totalPoints}</span>
                  <span className={`px-3 py-1 rounded-2xl text-xs font-medium shadow-sm ${getDifficultyColor(generatedExam.difficulty)}`}>
                    {getDifficultyLabel(generatedExam.difficulty)}
                  </span>
                </div>
              </div>
              
              <div className="space-y-4">
                {generatedExam.questions.map((question, index) => (
                  <div key={question.id} className="bg-stone-900/60 rounded-2xl p-6 border border-[#feedd1]/30 shadow-lg hover:shadow-xl transition-all duration-200">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="text-lg font-semibold text-[#feedd1]">
                        {index + 1}. {question.question}
                      </h4>
                      <span className="text-sm text-stone-400">({question.points} pts)</span>
                    </div>
                    
                    {question.type === 'multiple-choice' && question.options && (
                      <div className="space-y-2 mb-3">
                        {question.options.map((option, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <span className="text-[#feedd1] font-medium">
                              {String.fromCharCode(65 + optIndex)}.
                            </span>
                            <span className="text-stone-300">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {question.type === 'true-false' && (
                      <div className="space-y-2 mb-3">
                        <div className="flex items-center gap-2">
                          <span className="text-[#feedd1] font-medium">A.</span>
                          <span className="text-stone-300">True</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[#feedd1] font-medium">B.</span>
                          <span className="text-stone-300">False</span>
                        </div>
                      </div>
                    )}
                    
                    {question.type === 'short-answer' && (
                      <div className="mb-3">
                        <div className="border-b border-stone-600 pb-3 mt-4 rounded-lg">
                          <span className="text-stone-400 text-sm">Answer:</span>
                        </div>
                      </div>
                    )}
                    
                    {question.type === 'essay' && (
                      <div className="mb-3">
                        <div className="border border-stone-600 rounded-lg p-4 min-h-[100px]">
                          <span className="text-stone-400 text-sm">Essay Answer:</span>
                        </div>
                      </div>
                    )}
                    
                    {question.type === 'fill-blank' && (
                      <div className="mb-3">
                        <div className="border-b border-stone-600 pb-3 mt-4 rounded-lg">
                          <span className="text-stone-400 text-sm">Fill in the blank: ____________________</span>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs mt-2">
                      <span className={`px-3 py-1 rounded-2xl font-medium shadow-sm ${getDifficultyColor(question.difficulty)}`}>
                        {question.difficulty}
                      </span>
                      <span className="text-stone-400">{question.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="p-8 border-t border-[#feedd1]/30 flex gap-4">
            <Button
              onClick={handleDownloadExam}
              className="bg-gradient-to-r from-[#feedd1] to-[#fde6c4] text-[#0d0d0d] hover:from-[#fde6c4] hover:to-[#feedd1] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button
              onClick={() => setShowPreview(false)}
              variant="outline"
              className="border-[#feedd1]/40 text-[#feedd1] hover:bg-[#feedd1]/20 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
            >
              Close Preview
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Main Component Body
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-stone-200 font-sans">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-[#feedd1]">{t('practiceexam.title')}</h1>
            <p className="text-stone-400 mt-2">{t('practiceexam.hero.description')}</p>
            
            {/* Saved Exams Toggle */}
            <div className="mt-6">
              <Button
                onClick={() => setShowSavedExams(!showSavedExams)}
                variant="outline"
                className="border-[#feedd1]/40 text-[#feedd1] hover:bg-[#feedd1]/20 rounded-2xl"
              >
                <FileText className="w-4 h-4 mr-2" />
                {showSavedExams ? 'Hide' : 'Show'} Saved Exams ({savedExams.length})
              </Button>
            </div>
        </div>

        {/* Saved Exams */}
        {showSavedExams && (
          <div className="max-w-3xl mx-auto mb-8">
            <div className="bg-stone-900/50 rounded-3xl p-8 shadow-xl border border-[#feedd1]/30 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-[#feedd1] mb-6">Saved Practice Exams</h3>
              
              {savedExams.length === 0 ? (
                <p className="text-stone-400 text-center py-8">No saved exams found. Generate your first exam to see it here!</p>
              ) : (
                <div className="space-y-4">
                  {savedExams.map((exam) => (
                    <div
                      key={exam.id}
                      className="bg-stone-800/50 rounded-2xl p-6 border border-[#feedd1]/20 hover:border-[#feedd1]/40 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-[#feedd1] mb-2">{exam.title}</h4>
                          <p className="text-stone-300 text-sm mb-3">{exam.description}</p>
                          <div className="flex items-center gap-4 text-sm text-stone-400">
                            <span>{JSON.parse(exam.questionsData).length} questions</span>
                            <span>{exam.estimatedTime} min</span>
                            <span className={`px-2 py-1 rounded-lg text-xs ${getDifficultyColor(exam.difficulty)}`}>
                              {getDifficultyLabel(exam.difficulty as DifficultyLevel)}
                            </span>
                            <span>Created: {new Date(exam.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleLoadSavedExam(exam.id)}
                            className="bg-[#feedd1] text-[#0d0d0d] hover:bg-[#fde6c4] rounded-xl"
                          >
                            Load
                          </Button>
                          <Button
                            onClick={() => handleDeleteSavedExam(exam.id)}
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

        <div className="max-w-3xl mx-auto w-full">
          {/* Controls Section */}
          <div className="space-y-6">
            {/* Description Input */}
            <div className="bg-stone-900/50 rounded-3xl p-8 shadow-xl border border-[#feedd1]/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-[#feedd1] to-[#fde6c4] rounded-2xl flex items-center justify-center shadow-lg">
                        <BookOpen className="w-4 h-4 text-[#0d0d0d]" />
                    </div>
                    <h3 className="text-xl font-bold text-[#feedd1]">1. {t('practiceexam.description.title')}</h3>
                </div>
                <Textarea
                    value={examDescription}
                    onChange={(e) => setExamDescription(e.target.value)}
                    placeholder={t('practiceexam.description.placeholder')}
                    className="w-full h-32 bg-stone-800/60 border-[#feedd1]/40 text-[#feedd1] rounded-2xl p-4 focus:ring-2 focus:ring-[#feedd1]/60 focus:border-[#feedd1]/60 transition-all duration-200 shadow-inner"
                />
                <p className="text-sm text-stone-400 mt-2">{t('practiceexam.description.tip')}</p>
            </div>

            {/* File Upload */}
            <div className="bg-stone-900/50 rounded-3xl p-8 shadow-xl border border-[#feedd1]/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#feedd1] to-[#fde6c4] rounded-2xl flex items-center justify-center shadow-lg">
                  <Upload className="w-4 h-4 text-[#0d0d0d]" />
                </div>
                <h3 className="text-xl font-bold text-[#feedd1]">2. {t('practiceexam.upload.title')}</h3>
              </div>
              
              <div className="space-y-4">
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-[#feedd1]/40 rounded-2xl p-10 text-center cursor-pointer hover:border-[#feedd1]/60 hover:bg-[#feedd1]/10 transition-all duration-300 shadow-inner"
                >
                  <Upload className="w-14 h-14 text-[#feedd1]/70 mx-auto mb-4" />
                  <p className="text-[#feedd1] font-medium mb-2">{t('practiceexam.upload.click')}</p>
                  <p className="text-sm text-stone-400">
                    Support for PDF, DOC, DOCX, TXT, JPG, PNG files (Max 10MB each)
                  </p>
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  className="hidden"
                />

                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-[#feedd1]">{t('practiceexam.upload.files')}</h4>
                    {uploadedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-4 bg-stone-800/60 rounded-2xl border border-[#feedd1]/30 shadow-md hover:shadow-lg transition-all duration-200">
                        <div className="flex items-center gap-3 overflow-hidden">
                          <FileText className="w-4 h-4 text-[#feedd1] flex-shrink-0" />
                          <div className="overflow-hidden">
                            <p className="text-sm font-medium text-[#feedd1] truncate">{file.name}</p>
                            <p className="text-xs text-stone-400">{formatFileSize(file.size)}</p>
                          </div>
                        </div>
                        <Button
                          onClick={() => removeFile(index)}
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-red-400/20 rounded-xl transition-all duration-200"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Settings Panel Toggle */}
            <Button 
              onClick={() => setShowSettings(!showSettings)} 
              variant="outline"
              className="w-full flex items-center justify-center gap-2 border-[#feedd1]/40 text-[#feedd1] hover:bg-[#feedd1]/20 rounded-2xl py-4 shadow-lg hover:shadow-xl transition-all duration-300"
            >
                <Settings className="w-4 h-4" />
                {showSettings ? 'Hide' : 'Show'} {t('practiceexam.settings')}
            </Button>

            {/* Settings Panel */}
            {showSettings && (
              <div className="bg-stone-900/50 rounded-3xl p-8 shadow-xl border border-[#feedd1]/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-[#feedd1] to-[#fde6c4] rounded-2xl flex items-center justify-center shadow-lg">
                    <Settings className="w-4 h-4 text-[#0d0d0d]" />
                  </div>
                  <h3 className="text-xl font-bold text-[#feedd1]">3. {t('practiceexam.exam.settings')}</h3>
                </div>
                
                <div className="space-y-6">
                  {/* Question Count */}
                  <div>
                    <Label className="text-[#feedd1] text-sm font-medium mb-2 block">
                      {t('practiceexam.questions.count')}
                    </Label>
                    <Input
                      type="number"
                      min="5"
                      max="50"
                      value={examSettings.questionCount}
                      onChange={(e) => setExamSettings(prev => ({ ...prev, questionCount: parseInt(e.target.value) || 20 }))}
                      className="bg-stone-800/60 border-[#feedd1]/40 text-[#feedd1] rounded-2xl"
                    />
                  </div>

                  {/* Time Limit */}
                  <div>
                    <Label className="text-[#feedd1] text-sm font-medium mb-2 block">
                      {t('practiceexam.time.limit')}
                    </Label>
                    <Input
                      type="number"
                      min="15"
                      max="300"
                      value={examSettings.timeLimit}
                      onChange={(e) => setExamSettings(prev => ({ ...prev, timeLimit: parseInt(e.target.value) || 60 }))}
                      className="bg-stone-800/60 border-[#feedd1]/40 text-[#feedd1] rounded-2xl"
                    />
                  </div>

                  {/* Question Types */}
                  <div>
                    <Label className="text-[#feedd1] text-sm font-medium mb-3 block">
                      {t('practiceexam.question.types')}
                    </Label>
                    <div className="grid grid-cols-2 gap-2">
                      {questionTypeOptions.map((type) => (
                        <button
                          key={type}
                          onClick={() => {
                            const isSelected = examSettings.questionTypes.includes(type);
                            if (isSelected) {
                              setExamSettings(prev => ({
                                ...prev,
                                questionTypes: prev.questionTypes.filter(t => t !== type)
                              }));
                            } else {
                              setExamSettings(prev => ({
                                ...prev,
                                questionTypes: [...prev.questionTypes, type]
                              }));
                            }
                          }}
                          className={`p-3 rounded-2xl border text-sm transition-all duration-300 shadow-md hover:shadow-lg ${
                            examSettings.questionTypes.includes(type)
                              ? 'bg-[#feedd1]/30 border-[#feedd1] text-[#feedd1] shadow-[#feedd1]/20'
                              : 'bg-stone-800/60 border-[#feedd1]/30 text-stone-300 hover:bg-stone-800/80'
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Difficulty Level */}
                  <div>
                  <Label className="text-[#feedd1] text-sm font-medium mb-2 block">
                    {t('practiceexam.difficulty')}
                  </Label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <button
                        onClick={() => setExamSettings(prev => ({ ...prev, difficulty: 'same' }))}
                        className={`p-4 rounded-2xl border text-left transition-all duration-300 shadow-md hover:shadow-lg ${
                          examSettings.difficulty === 'same'
                            ? 'bg-blue-500/30 border-blue-400 text-blue-300 shadow-blue-500/20'
                            : 'bg-stone-800/60 border-[#feedd1]/30 text-stone-300 hover:bg-stone-800/80'
                        }`}
                      >
                        <div className="font-medium">Same</div>
                        <div className="text-xs opacity-80">Same difficulty as uploaded exam</div>
                      </button>
                      
                      <button
                        onClick={() => setExamSettings(prev => ({ ...prev, difficulty: 'hard' }))}
                        className={`p-4 rounded-2xl border text-left transition-all duration-300 shadow-md hover:shadow-lg ${
                          examSettings.difficulty === 'hard'
                            ? 'bg-orange-500/30 border-orange-400 text-orange-300 shadow-orange-500/20'
                            : 'bg-stone-800/60 border-[#feedd1]/30 text-stone-300 hover:bg-stone-800/80'
                        }`}
                      >
                        <div className="font-medium">Harder</div>
                        <div className="text-xs opacity-80">Harder than original exam</div>
                      </button>
                      
                      <button
                        onClick={() => setExamSettings(prev => ({ ...prev, difficulty: 'very-hard' }))}
                        className={`p-4 rounded-2xl border text-left transition-all duration-300 shadow-md hover:shadow-lg ${
                          examSettings.difficulty === 'very-hard'
                            ? 'bg-red-500/30 border-red-400 text-red-300 shadow-red-500/20'
                            : 'bg-stone-800/60 border-[#feedd1]/30 text-stone-300 hover:bg-stone-800/80'
                        }`}
                      >
                        <div className="font-medium">Much Harder</div>
                        <div className="text-xs opacity-80">70% here = ace original</div>
                      </button>
                  </div>
                  </div>

                  {/* Answer Key Toggle */}
                  <div>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={examSettings.includeAnswerKey}
                        onChange={(e) => setExamSettings(prev => ({ ...prev, includeAnswerKey: e.target.checked }))}
                        className="w-4 h-4 text-[#feedd1] bg-stone-800 border-[#feedd1]/40 rounded focus:ring-[#feedd1] focus:ring-2"
                      />
                      <span className="text-[#feedd1] text-sm font-medium">{t('practiceexam.answer.key')}</span>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Generate Button */}
            <div className="pt-4">
                <Button
                    onClick={handleGenerateExam}
                    disabled={(!examDescription.trim() && uploadedFiles.length === 0) || isGenerating}
                    className="w-full bg-gradient-to-r from-[#feedd1] to-[#fde6c4] text-[#0d0d0d] hover:from-[#fde6c4] hover:to-[#feedd1] py-6 text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center rounded-3xl transform hover:scale-[1.02]"
                >
                    {isGenerating ? (
                    <>
                        <div className="w-5 h-5 border-2 border-[#0d0d0d] border-t-transparent rounded-full animate-spin mr-2"></div>
                        {t('practiceexam.generating')}
                    </>
                    ) : (
                    <>
                        <Zap className="w-5 h-5 mr-2" />
                        {t('practiceexam.generate')}
                    </>
                    )}
                </Button> 
            </div>
          </div>

          {/* Output Section */}
          <div className="space-y-6 mt-8">
            {generationError && (
              <div className="bg-red-900/50 rounded-3xl p-8 shadow-xl border border-red-500/30 backdrop-blur-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-red-500/30 rounded-2xl flex items-center justify-center shadow-lg">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-400">Generation Error</h3>
                    <p className="text-sm text-red-300">Failed to generate exam</p>
                  </div>
                </div>
                <p className="text-red-200 mb-4">{generationError}</p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => setGenerationError(null)}
                    variant="outline"
                    className="border-red-400/40 text-red-400 hover:bg-red-400/20 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={resetForm}
                    className="bg-red-500 text-white hover:bg-red-600 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200"
                  >
                    Reset Form
                  </Button>
                </div>
              </div>
            )}

            {isGenerating && (
              <div className="bg-stone-900/50 rounded-3xl p-10 shadow-xl border border-[#feedd1]/30 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-br from-[#feedd1] to-[#fde6c4] rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse shadow-xl">
                    <div className="w-6 h-6 border-3 border-[#0d0d0d] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-bold text-[#feedd1] mb-2">{t('practiceexam.generating')}</h3>
                  <p className="text-stone-300 mb-4">
                    {uploadedFiles.length > 0 
                      ? 'Analyzing your uploaded exam with Gemini AI and creating similar questions...'
                      : 'Creating practice questions based on your description with Gemini AI...'
                    }
                  </p>
                  <div className="flex items-center justify-center gap-2 text-sm text-stone-400">
                    <Brain className="w-4 h-4" />
                    <span>Powered by Google Gemini</span>
                  </div>
                </div>
              </div>
            )}

            {generatedExam && (
              <div className="bg-stone-900/50 rounded-3xl p-8 shadow-xl border border-[#feedd1]/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-500 rounded-2xl flex items-center justify-center shadow-lg">
                    <CheckCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-[#feedd1]">{t('practiceexam.success')}</h3>
                    <p className="text-sm text-stone-400">{t('practiceexam.ready')}</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="p-6 bg-[#feedd1]/15 border border-[#feedd1]/40 rounded-2xl shadow-inner">
                    <h4 className="font-semibold text-[#feedd1] mb-2">{generatedExam.title}</h4>
                    <p className="text-stone-300 text-sm mb-3">{generatedExam.description}</p>
                    <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-stone-400">{t('practiceexam.questions')}</span>
                        <span className="text-[#feedd1] ml-2 font-medium">{generatedExam.questions.length}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">{t('practiceexam.time')}</span>
                        <span className="text-[#feedd1] ml-2 font-medium">{generatedExam.estimatedTime} min</span>
                      </div>
                      <div>
                        <span className="text-stone-400">Points:</span>
                        <span className="text-[#feedd1] ml-2 font-medium">{generatedExam.totalPoints}</span>
                      </div>
                      <div>
                        <span className="text-stone-400">Difficulty:</span>
                        <span className={`ml-2 px-3 py-1 rounded-2xl text-xs font-medium shadow-sm ${getDifficultyColor(generatedExam.difficulty)}`}>
                          {getDifficultyLabel(generatedExam.difficulty)}
                        </span>
                      </div>
                    </div>
                    
                    {uploadedFiles.length > 0 && (
                      <div className="text-xs text-stone-400 bg-stone-800/60 rounded-2xl p-3 shadow-inner">
                        📄 Generated from {uploadedFiles.length} uploaded file{uploadedFiles.length > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      onClick={handleDownloadExam}
                      className="flex-1 bg-gradient-to-r from-[#feedd1] to-[#fde6c4] text-[#0d0d0d] hover:from-[#fde6c4] hover:to-[#feedd1] rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-[1.02]"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {t('practiceexam.download')}
                    </Button>
                    <Button
                      onClick={handlePreviewExam}
                      variant="outline"
                      className="flex-1 border-[#feedd1]/40 text-[#feedd1] hover:bg-[#feedd1]/20 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      {t('practiceexam.preview')}
                    </Button>
                  </div>
                   <Button
                      onClick={resetForm}
                      variant="outline"
                      className="w-full mt-3 border-[#feedd1]/40 text-[#feedd1] hover:bg-[#feedd1]/20 rounded-2xl shadow-md hover:shadow-lg transition-all duration-300"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {t('practiceexam.reset')}
                    </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PracticeExam;