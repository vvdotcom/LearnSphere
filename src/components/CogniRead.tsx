import React, { useState, useRef } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  Camera, 
  Upload, 
  Eye, 
  Download, 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut,
  BookOpen,
  Brain,
  Lightbulb,
  Target,
  ArrowRight,
  Sparkles,
  FileText,
  CheckCircle,
  AlertCircle,
  X,
  Calculator,
  ImageIcon,
  Zap,
  HelpCircle,
  ChevronRight,
  Copy,
  RefreshCw,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
//import { geminiMathService, type MathProblem } from '@/services/geminiService';
import { mathSolverService, type MathProblem } from '../services/MathSolverService';
import { geminiMathService } from '../services/geminiService';

// Define the type for the subject state
type Subject = 'math' | 'physics' | 'chemistry' | 'biology';

const CogniRead = () => {
  const { language, t } = useLanguage();
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const [selectedSubject, setSelectedSubject] = useState<Subject>('math'); // State for selected subject
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStartTime, setProcessingStartTime] = useState<Date | null>(null);
  const [processingElapsedTime, setProcessingElapsedTime] = useState(0);
  const [mathProblems, setMathProblems] = useState<MathProblem[]>([]);
  const [selectedProblem, setSelectedProblem] = useState<MathProblem | null>(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [showStepByStep, setShowStepByStep] = useState(false);
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Array of subjects for easy mapping
  const subjects: { name: Subject; label: string }[] = [
    { name: 'math', label: t('math') },
    { name: 'physics', label: t('physics')},
    { name: 'chemistry', label: t('chemistry')},
    { name: 'biology', label: t('biology')  },
  ];

  // Timer effect for processing
  React.useEffect(() => {
    if (isProcessing && processingStartTime) {
      timerRef.current = setInterval(() => {
        const now = new Date();
        const elapsed = Math.floor((now.getTime() - processingStartTime.getTime()) / 1000);
        setProcessingElapsedTime(elapsed);
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
      }
    };
  }, [isProcessing, processingStartTime]);

  // Format time display
  const formatElapsedTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    
    // Validate file types
    const validFiles = files.filter(file => {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
      const isValidType = validTypes.includes(file.type) || 
        file.name.toLowerCase().match(/\.(jpg|jpeg|png|pdf)$/);
      
      if (!isValidType) {
        alert(`File ${file.name} is not supported. Please upload JPG, PNG, or PDF files.`);
        return false;
      }
      
      // Check file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
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

  const handleProcessProblems = async () => {
    if (uploadedFiles.length === 0) return;
    
    setProcessingError(null);
    setIsProcessing(true);
    setProcessingStartTime(new Date());
    setProcessingElapsedTime(0);
    setCurrentStep('processing');
    
    try {
      console.log(`Starting to process files for ${selectedSubject} with Gemma AI...`);
      
      // Pass the selected subject to the service
      //const problems = await geminiMathService.analyzeMathProblems(uploadedFiles, language, selectedSubject);
      const problems = await mathSolverService.analyzeMathProblems(uploadedFiles,language);
      console.log('Received problems from Gemma:', problems);
      
      if (problems.length === 0) {
        setProcessingError(`No ${selectedSubject} problems were found in the uploaded files. Please make sure your images contain clear problems.`);
      } else {
        setMathProblems(problems);
        setCurrentStep('results');
      }
    } catch (error) {
      console.error('Error processing math problems:', error);
      setProcessingError(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while processing your files. Please try again.'
      );
    } finally {
      setIsProcessing(false);
      setProcessingStartTime(null);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const handleSelectProblem = (problem: MathProblem) => {
    setSelectedProblem(problem);
    setCurrentStepIndex(0);
    setShowStepByStep(true);
  };

  const handleNextStep = () => {
    if (selectedProblem && currentStepIndex < selectedProblem.steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    }
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleCopyStep = (equation: string) => {
    navigator.clipboard.writeText(equation);
    // You could add a toast notification here
  };

  const resetUpload = () => {
    setUploadedFiles([]);
    setMathProblems([]);
    setSelectedProblem(null);
    setCurrentStep('upload');
    setShowStepByStep(false);
    setCurrentStepIndex(0);
    setProcessingError(null);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-400 bg-green-400/20';
      case 'Medium': return 'text-yellow-400 bg-yellow-400/20';
      case 'Hard': return 'text-red-400 bg-red-400/20';
      default: return 'text-[#feedd1] bg-[#feedd1]/20';
    }
  };

  return (
    <div className="min-h-screen bg-[#0d0d0d]">
      {/* Header */}
    

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Hero Section */}
        <div className="text-center mb-12">
            <div className="w-20 h-20 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-full flex items-center justify-center mx-auto mb-6">
            <HelpCircle className="w-10 h-10 text-[#0d0d0d]" />
          </div>
          <h2 className="text-4xl md:text-5xl font-bold text-[#ffffff] mb-4">{t('cogniread.hero.title')}</h2>
          <p className="text-xl text-stone-300 max-w-3xl mx-auto leading-relaxed">{t('cogniread.hero.description')}</p>
        </div>

        {/* Main Content Area */}
        <div className="max-w-4xl mx-auto space-y-8">
          
          {/* == NEW: Subject Selection Card == */}
          <div>
            <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-xl flex items-center justify-center">
                  <BookOpen className="w-5 h-5 text-[#0d0d0d]" />
                </div>
                <h3 className="text-2xl font-bold text-[#ffffff]">Subject</h3>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {subjects.map((subject) => (
                  <Button
                    key={subject.name}
                    onClick={() => setSelectedSubject(subject.name)}
                    variant={selectedSubject === subject.name ? 'default' : 'outline'}
                    className={`py-6 text-base md:text-lg font-medium transition-all duration-200 ${
                      selectedSubject === subject.name
                        ? 'bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4] shadow-lg border-transparent'
                        : 'text-[#ffffff] border-[#ffffff]/30 hover:bg-[#ffffff]/10'
                    }`}
                  >
                    {subject.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          
          {/* Upload Section */}
          <div>
            <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-xl flex items-center justify-center">
                  <Upload className="w-5 h-5 text-[#0d0d0d]" />
                </div>
                <h3 className="text-2xl font-bold text-[#ffffff]">{t('cogniread.upload.title')}</h3>
                
                {/* Timer Display */}
                <div className="ml-auto bg-[#ffffff]/10 border border-[#ffffff]/30 rounded-xl p-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-gradient-to-br from-blue-400 to-blue-500 rounded-full flex items-center justify-center">
                      <Clock className="w-3 h-3 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-mono font-bold text-[#ffffff]">
                        {formatElapsedTime(processingElapsedTime)}
                      </div>
                      <div className="text-xs text-stone-400">{t('time')}</div>
                    </div>
                  </div>
                </div>
              </div>
                
              {/* Upload Area */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-[#ffffff]/30 rounded-xl p-8 text-center cursor-pointer hover:border-[#ffffff]/50 hover:bg-[#ffffff]/5 transition-all duration-200 mb-6"
              >
                <Upload className="w-12 h-12 text-[#ffffff]/60 mx-auto mb-4" />
                <p className="text-[#ffffff] font-medium mb-2">{t('cogniread.upload.click')}</p>
                <p className="text-stone-400">
                  {t('cogniread.upload.support')}
                </p>
              </div>
                
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileUpload}
                className="hidden"
              />

              

              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileUpload}
                className="hidden"
              />

              {/* Uploaded Files */}
              {uploadedFiles.length > 0 && (
                <div className="space-y-3 mb-6">
                  <h4 className="text-sm font-medium text-[#ffffff]">Uploaded Files:</h4>
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-stone-800/50 rounded-lg border border-[#ffffff]/20">
                      <div className="flex items-center gap-3">
                        <FileText className="w-4 h-4 text-[#ffffff]" />
                        <div>
                          <p className="text-sm font-medium text-[#ffffff]">{file.name}</p>
                          <p className="text-xs text-stone-400">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button
                        onClick={() => removeFile(index)}
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-red-400/10"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Process Button */}
              <Button
                onClick={handleProcessProblems}
                disabled={uploadedFiles.length === 0 || isProcessing}
                className="w-full bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4] py-3 text-lg font-medium shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50"
              >
                {isProcessing ? (
                  <>
                    <div className="w-5 h-5 border-2 border-[#0d0d0d] border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('cogniread.solving')}
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    {t('cogniread.solve')}
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Results Section */}
          <div>
            {processingError && (
              <div className="bg-red-900/50 rounded-2xl p-6 shadow-lg border border-red-500/20 backdrop-blur-sm mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center">
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-red-400">Processing Error</h3>
                    <p className="text-sm text-red-300">Something went wrong</p>
                  </div>
                </div>
                <p className="text-red-200 mb-4">{processingError}</p>
                <div className="flex gap-3">
                  <Button
                    onClick={() => {
                      setProcessingError(null);
                      setCurrentStep('upload');
                    }}
                    variant="outline"
                    className="border-red-400/30 text-red-400 hover:bg-red-400/10"
                  >
                    Try Again
                  </Button>
                  <Button
                    onClick={() => {
                      setProcessingError(null);
                      setUploadedFiles([]);
                      setCurrentStep('upload');
                    }}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    Upload New Files
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 'processing' && (
              <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
                <div className="text-center">
                  <div className="w-16 h-16 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-full flex items-center justify-center mx-auto mb-4">
                    <div className="w-6 h-6 border-3 border-[#0d0d0d] border-t-transparent rounded-full animate-spin"></div>
                  </div>
                  <h3 className="text-xl font-bold text-[#ffffff] mb-2">Analyzing with Gemma AI</h3>
                  <p className="text-stone-300 mb-4">Reading your math problems and generating step-by-step solutions...</p>
                  
                  <div className="flex items-center justify-center gap-2 text-sm text-stone-400">
                    <Brain className="w-4 h-4" />
                    <span>Powered by Google Gemma</span>
                  </div>
                </div>
              </div>
            )}

            {currentStep === 'results' && !showStepByStep && (
              <div className="bg-stone-900/50 rounded-2xl p-8 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
                <div className="text-center mb-8">
                  <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-4 py-2 rounded-full text-sm font-medium mb-4 border border-green-500/30">
                    <CheckCircle className="w-4 h-4" />
                    Problems Solved
                  </div>
                  <h3 className="text-2xl font-bold text-[#ffffff] mb-2">
                    Found {mathProblems.length} Problem{mathProblems.length !== 1 ? 's' : ''}
                  </h3>
                  <p className="text-stone-300">Click to see step-by-step solutions</p>
                </div>

                <div className="grid gap-6">
                  {mathProblems.map((problem, index) => (
                    <div
                      key={problem.id}
                      className="bg-stone-800/50 rounded-xl p-6 cursor-pointer hover:bg-stone-800/70 transition-all duration-200 border border-[#ffffff]/20"
                      onClick={() => handleSelectProblem(problem)}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-lg flex items-center justify-center flex-shrink-0">
                          <span className="text-[#0d0d0d] font-bold text-sm">{index + 1}</span>
                        </div>
                        
                        <div className="flex-1">
                          <h4 className="text-xl font-semibold text-[#ffffff] mb-3">{problem.question}</h4>
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`text-xs px-2 py-1 rounded-full font-medium ${getDifficultyColor(problem.difficulty)}`}>
                              {problem.difficulty}
                            </span>
                            <span className="text-xs text-stone-400">{problem.topic}</span>
                          </div>
                          
                          <div className="bg-[#ffffff]/10 border border-[#ffffff]/30 rounded-lg p-4 mb-3">
                            <div className="flex items-center gap-2 mb-1">
                              <Target className="w-3 h-3 text-[#ffffff]" />
                              <span className="text-xs font-medium text-[#ffffff]">Solution:</span>
                            </div>
                            <p className="text-lg font-mono text-stone-200">{problem.solution}</p>
                          </div>
                          
                          <div className="mt-2 flex items-center gap-2 text-xs text-stone-400">
                            <Lightbulb className="w-3 h-3" />
                            <span>{problem.steps.length} steps</span>
                            <ChevronRight className="w-3 h-3 ml-auto" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Step-by-Step View */}
        {showStepByStep && selectedProblem && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-6">
              <Button
                onClick={() => setShowStepByStep(false)}
                variant="outline"
                className="border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10 mb-4"
              >
                <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                Back to Problems
              </Button>
              
              <div className="bg-stone-900/50 rounded-2xl p-6 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
                <h3 className="text-2xl font-bold text-[#ffffff] mb-2">{selectedProblem.question}</h3>
                <div className="flex items-center gap-3 mb-4">
                  <span className={`text-xs px-3 py-1 rounded-full font-medium ${getDifficultyColor(selectedProblem.difficulty)}`}>
                    {selectedProblem.difficulty}
                  </span>
                  <span className="text-sm text-stone-400">{selectedProblem.topic}</span>
                </div>
                
                <div className="bg-[#ffffff]/10 border border-[#ffffff]/30 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Target className="w-4 h-4 text-[#ffffff]" />
                        <span className="text-sm font-medium text-[#ffffff]">Final Answer:</span>
                      </div>
                      <p className="text-xl font-mono text-stone-200">{selectedProblem.solution}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-stone-400">Step {currentStepIndex + 1} of {selectedProblem.steps.length}</p>
                      <div className="w-32 bg-stone-800 rounded-full h-2 mt-2">
                        <div 
                          className="bg-gradient-to-r from-[#ffffff] to-[#fde6c4] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${((currentStepIndex + 1) / selectedProblem.steps.length) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Current Step */}
            <div className="bg-stone-900/50 rounded-2xl p-6 shadow-lg border border-[#ffffff]/20 backdrop-blur-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-full flex items-center justify-center">
                  <span className="text-[#0d0d0d] font-bold">{selectedProblem.steps[currentStepIndex].step}</span>
                </div>
                <h4 className="text-xl font-semibold text-[#ffffff]">
                  {selectedProblem.steps[currentStepIndex].description}
                </h4>
              </div>

              <div className="space-y-4">
                <div className="bg-stone-800/50 rounded-xl p-4 border border-[#ffffff]/20">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-[#ffffff]">Equation:</span>
                    <Button
                      onClick={() => handleCopyStep(selectedProblem.steps[currentStepIndex].equation)}
                      variant="ghost"
                      size="sm"
                      className="text-stone-400 hover:text-[#ffffff]"
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                  <p className="text-lg font-mono text-stone-200 bg-[#0d0d0d]/50 p-3 rounded-lg">
                    {selectedProblem.steps[currentStepIndex].equation}
                  </p>
                </div>

                <div className="bg-[#ffffff]/10 border border-[#ffffff]/30 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="w-4 h-4 text-[#ffffff]" />
                    <span className="text-sm font-medium text-[#ffffff]">Explanation:</span>
                  </div>
                  <p className="text-stone-200 leading-relaxed">
                    {selectedProblem.steps[currentStepIndex].explanation}
                  </p>
                </div>
              </div>

              {/* Navigation */}
              <div className="flex justify-between items-center mt-6 pt-6 border-t border-[#ffffff]/20">
                <Button
                  onClick={handlePrevStep}
                  disabled={currentStepIndex === 0}
                  variant="outline"
                  className="border-[#ffffff]/30 text-[#ffffff] hover:bg-[#ffffff]/10 disabled:opacity-50"
                >
                  <ArrowRight className="w-4 h-4 mr-2 rotate-180" />
                  Previous Step
                </Button>

                <div className="text-center">
                  <p className="text-sm text-stone-400">
                    Step {currentStepIndex + 1} of {selectedProblem.steps.length}
                  </p>
                </div>

                <Button
                  onClick={handleNextStep}
                  disabled={currentStepIndex === selectedProblem.steps.length - 1}
                  className="bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4] disabled:opacity-50"
                >
                  Next Step
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default CogniRead;