import React, { useState, useRef, useEffect } from 'react';
import { useLanguage } from '../contexts/LanguageContext';
import { 
  FileText, 
  Upload, 
  AlertCircle,
  X,
  BookOpen,
  Zap,
  Calculator,
  Clock,
  Target
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { examSimulatorService, type SimulatorSettings, type ExamSeries } from '../services/examSimulatorService';
import { databaseService, type StoredExamSeries } from '../services/databaseService';
import ExamSimulatorView from './ExamSimulatorView';

const Textarea = (props: any) => <textarea {...props} />;

const ExamSimulator = () => {
  const { t } = useLanguage();
  const [examSeriesName, setExamSeriesName] = useState('');
  const [examDescription, setExamDescription] = useState('');
  const [examTime, setTime] = useState(30);

  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [generatedExamSeries, setGeneratedExamSeries] = useState<ExamSeries | null>(null);
  const [currentView, setCurrentView] = useState<'generator' | 'simulator'>('generator');
  const [showSavedSeries, setShowSavedSeries] = useState(false);
  const [savedExamSeries, setSavedExamSeries] = useState<StoredExamSeries[]>([]);
  const [simulatorSettings, setSimulatorSettings] = useState<SimulatorSettings>({
    numberOfExams: 5
  });
  const [generationStartTime, setGenerationStartTime] = useState<number | null>(null);
  const [generationElapsedTime, setGenerationElapsedTime] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Load saved exam series on component mount
  useEffect(() => {
    loadSavedExamSeries();
  }, []);

  const loadSavedExamSeries = async () => {
    try {
      const saved = await databaseService.getAllExamSeries();
      setSavedExamSeries(saved);
    } catch (error) {
      console.error('Error loading saved exam series:', error);
    }
  };

  const handleLoadSavedSeries = async (seriesId: string) => {
    try {
      const series = await databaseService.getExamSeries(seriesId);
      if (series) {
        setGeneratedExamSeries(series);
        setShowSavedSeries(false);
        setCurrentView('simulator');
        console.log('Loaded saved exam series:', series.topic);
      }
    } catch (error) {
      console.error('Error loading saved exam series:', error);
    }
  };

  const handleDeleteSavedSeries = async (seriesId: string) => {
    if (confirm('Are you sure you want to delete this exam series?')) {
      try {
        await databaseService.deleteExamSeries(seriesId);
        loadSavedExamSeries();
        console.log('Deleted exam series:', seriesId);
      } catch (error) {
        console.error('Error deleting exam series:', error);
      }
    }
  };

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

  const handleGenerateExamSeries = async () => {
    if (!examDescription.trim() && uploadedFiles.length === 0) return;
    
    setGenerationError(null);
    setGeneratedExamSeries(null);
    setIsGenerating(true);
    setGenerationStartTime(Date.now());
    setGenerationElapsedTime(0);
    
    try {
      console.log('Starting exam series generation with Gemini AI...');
      console.log('Description:', examDescription);
      console.log('Files:', uploadedFiles.map(f => f.name));
      console.log('Settings:', simulatorSettings);
      
      const examSeries = await examSimulatorService.generateExamSeries(
        examSeriesName.trim() || examDescription.trim(),
        examDescription.trim(),
        uploadedFiles,
        simulatorSettings,
        examTime
      );
      
      console.log('Successfully generated exam series:', examSeries.topic);
      setGeneratedExamSeries(examSeries);
      
      // Save to database
      try {
        await databaseService.saveExamSeries(examSeries, simulatorSettings,examTime);
        loadSavedExamSeries(); // Refresh the saved series list
        console.log('Exam series saved to database');
      } catch (error) {
        console.error('Error saving exam series to database:', error);
      }

      // Move to simulator view
      setCurrentView('simulator');
    } catch (error) {
      console.error('Error generating exam series:', error);
      setGenerationError(
        error instanceof Error 
          ? error.message 
          : 'An unexpected error occurred while generating the exam series. Please try again.'
      );
    } finally {
      setIsGenerating(false);
      setGenerationStartTime(null);
    }
  };

  const resetForm = () => {
    setExamSeriesName('');
    setTime(30);
    setExamDescription('');
    setUploadedFiles([]);
    setGeneratedExamSeries(null);
    setGenerationError(null);
    setCurrentView('generator');
    setShowSavedSeries(false);
    loadSavedExamSeries(); // Refresh saved series when resetting
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // Show Exam Simulator View if exams are generated
  if (currentView === 'simulator' && generatedExamSeries) {
    return (
      <ExamSimulatorView 
        examSeries={generatedExamSeries}
        onBackToGenerator={resetForm}
      />
    );
  }

  // Main Exam Generator View
  return (
    <div className="min-h-screen bg-[#0d0d0d] text-stone-200 font-sans">
      <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-20 h-20 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-full flex items-center justify-center mx-auto mb-6">
            <Calculator className="w-10 h-10 text-[#0d0d0d]" />
          </div>
          <h1 className="text-4xl font-bold text-[#ffffff] mb-4">{t('examsimulator.title')}</h1>
          <p className="text-xl text-stone-300">{t('examsimulator.subtitle')}</p>
          
          {/* Load Saved Series Button */}
          <div className="mt-6">
            <Button
              onClick={() => setShowSavedSeries(!showSavedSeries)}
              variant="outline"
              className="border-[#ffffff]/40 text-[#ffffff] hover:bg-[#ffffff]/20 rounded-2xl"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {showSavedSeries ? t('hide') : t('load') } {t('series')} ({savedExamSeries.length})
            </Button>
          </div>
        </div>

        {/* Saved Exam Series */}
        {showSavedSeries && (
          <div className="mb-8">
            <div className="bg-stone-900/50 rounded-3xl p-8 shadow-xl border border-[#ffffff]/30 backdrop-blur-sm">
              <h3 className="text-xl font-bold text-[#ffffff] mb-6">{t('examsimulator.saved.title')}</h3>
              
              {savedExamSeries.length === 0 ? (
                <p className="text-stone-400 text-center py-8">{t('examsimulator.saved.empty')}</p>
              ) : (
                <div className="space-y-4">
                  {savedExamSeries.map((series) => (
                    <div
                      key={series.id}
                      className="bg-stone-800/50 rounded-2xl p-6 border border-[#ffffff]/20 hover:border-[#ffffff]/40 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <h4 className="text-lg font-semibold text-[#ffffff] mb-2">{series.topic}</h4>
                          <p className="text-stone-300 text-sm mb-3">{series.description}</p>
                          <div className="flex items-center gap-4 text-sm text-stone-400">
                            <span>{series.totalExams} {t('examsimulator.saved.exams')}</span>
                            <span>{t('examsimulator.saved.created')}: {new Date(series.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => handleLoadSavedSeries(series.id)}
                            className="bg-[#ffffff] text-[#0d0d0d] hover:bg-[#fde6c4] rounded-xl"
                          >
                            {t('examsimulator.saved.load')}
                          </Button>
                          <Button
                            onClick={() => handleDeleteSavedSeries(series.id)}
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
        <div className="space-y-6">
          {/* Combined Exam Setup Card */}
          <div className="bg-stone-900/50 rounded-3xl p-8 shadow-xl border border-[#ffffff]/30 backdrop-blur-sm hover:shadow-2xl transition-all duration-300">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-2xl flex items-center justify-center shadow-lg">
                <BookOpen className="w-6 h-6 text-[#0d0d0d]" />
              </div>
              <h3 className="text-2xl font-bold text-[#ffffff]">Create Exam Series</h3>
            </div>
            
            <div className="space-y-8">
              {/* 1. Exam Series Name */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 bg-[#ffffff]/20 text-[#ffffff] rounded-full flex items-center justify-center text-sm font-bold">1</span>
                  <h4 className="text-lg font-semibold text-[#ffffff]">{t('examsimulator.name.title')}</h4>
                </div>
                <Input
                  value={examSeriesName}
                  onChange={(e) => setExamSeriesName(e.target.value)}
                  placeholder={t('examsimulator.name.placeholder')}
                  className="bg-stone-800/60 border-[#ffffff]/40 text-[#ffffff] rounded-2xl focus:ring-2 focus:ring-[#ffffff]/60 focus:border-[#ffffff]/60 transition-all duration-200 text-lg p-4"
                />
                <p className="text-sm text-stone-400 mt-2">{t('examsimulator.name.tip')}</p>
              </div>

              {/* 2. Description */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 bg-[#ffffff]/20 text-[#ffffff] rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <h4 className="text-lg font-semibold text-[#ffffff]">{t('examsimulator.describe.title')}</h4>
                </div>
                <Textarea
                  value={examDescription}
                  onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setExamDescription(e.target.value)}
                  placeholder={t('examsimulator.describe.placeholder')}
                  className="w-full h-32 bg-stone-800/60 border-[#ffffff]/40 text-[#ffffff] rounded-2xl p-4 focus:ring-2 focus:ring-[#ffffff]/60 focus:border-[#ffffff]/60 transition-all duration-200 shadow-inner"
                />
                <p className="text-sm text-stone-400 mt-2">{t('examsimulator.describe.tip')}</p>
              </div>

              {/* 3. File Upload */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 bg-[#ffffff]/20 text-[#ffffff] rounded-full flex items-center justify-center text-sm font-bold">3</span>
                  <h4 className="text-lg font-semibold text-[#ffffff]">{t('examsimulator.upload.title')}</h4>
                  <span className="text-sm text-stone-400 ml-2">(Optional)</span>
                </div>
                
                <div className="space-y-4">
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-[#ffffff]/40 rounded-2xl p-8 text-center cursor-pointer hover:border-[#ffffff]/60 hover:bg-[#ffffff]/10 transition-all duration-300 shadow-inner"
                  >
                    <Upload className="w-12 h-12 text-[#ffffff]/70 mx-auto mb-3" />
                    <p className="text-[#ffffff] font-medium mb-2">{t('examsimulator.upload.click')}</p>
                    <p className="text-sm text-stone-400">
                      {t('examsimulator.upload.support')}
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
                      <h5 className="text-sm font-medium text-[#ffffff]">{t('examsimulator.upload.files')}</h5>
                      {uploadedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-4 bg-stone-800/60 rounded-2xl border border-[#ffffff]/30 shadow-md hover:shadow-lg transition-all duration-200">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <FileText className="w-4 h-4 text-[#ffffff] flex-shrink-0" />
                            <div className="overflow-hidden">
                              <p className="text-sm font-medium text-[#ffffff] truncate">{file.name}</p>
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

              
              {/* 2. Time */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <span className="w-6 h-6 bg-[#ffffff]/20 text-[#ffffff] rounded-full flex items-center justify-center text-sm font-bold">2</span>
                  <h4 className="text-lg font-semibold text-[#ffffff]">{t('examsimulator.time')}</h4>
                </div>
                  <Input
                  value={examTime}
                  onChange={(e) => setTime(parseInt(e.target.value) || '')}
                
                  className="bg-stone-800/60 border-[#ffffff]/40 text-[#ffffff] rounded-2xl focus:ring-2 focus:ring-[#ffffff]/60 focus:border-[#ffffff]/60 transition-all duration-200 text-lg p-4"
                />
                <p className="text-sm text-stone-400 mt-2">{t('examsimulator.time.tip')}</p>
              </div>


              {/* 4. Settings */}
              <div>
                <div className="flex items-center gap-2 mb-6">
                  <span className="w-6 h-6 bg-[#ffffff]/20 text-[#ffffff] rounded-full flex items-center justify-center text-sm font-bold">4</span>
                  <h4 className="text-lg font-semibold text-[#ffffff]">{t('examsimulator.settings.title')}</h4>
                </div>
                
                <div className="space-y-6">
                  {/* Number of Exams */}
                  <div>
                    <Label className="text-[#ffffff] text-sm font-medium mb-3 block">
                      {t('examsimulator.exams.number')}
                    </Label>
                    <div className="grid grid-cols-5 gap-3">
                      {[1, 2, 3, 5, 7].map((count) => (
                        <button
                          key={count}
                          onClick={() => setSimulatorSettings(prev => ({ ...prev, numberOfExams: count }))}
                          className={`p-4 rounded-2xl border text-center transition-all duration-300 shadow-md hover:shadow-lg ${
                            simulatorSettings.numberOfExams === count
                              ? 'bg-[#ffffff]/30 border-[#ffffff] text-[#ffffff] shadow-[#ffffff]/20'
                              : 'bg-stone-800/60 border-[#ffffff]/30 text-stone-300 hover:bg-stone-800/80'
                          }`}
                        >
                          <div className="font-bold text-lg">{count} {count > 1 ? t('examsimulator.saved.exams') : t('examsimulator.saved.exams').slice(0, -1)}</div>
                          <div className="text-xs opacity-80">
                            {count === 1 ? t('examsimulator.exams.single') : 
                             count === 2 ? t('examsimulator.exams.basic') :
                             count === 3 ? t('examsimulator.exams.expert') :
                             count === 5 ? t('examsimulator.exams.foundation') : 
                             t('examsimulator.exams.genius')}
                          </div>
                        </button>
                      ))}
                    </div>
                    <p className="text-sm text-stone-400 mt-2">
                      {t('examsimulator.exams.tip')}
                    </p>
                  </div>

                  {/* Difficulty Progression Info */}
                  <div className="bg-[#ffffff]/10 rounded-2xl p-6 border border-[#ffffff]/30">
                    <h5 className="text-[#ffffff] font-semibold mb-3 flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      {t('examsimulator.difficulty.title')}
                    </h5>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                        <span className="text-stone-300">Level 1: {t('examsimulator.difficulty.foundation')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-400 rounded-full"></div>
                        <span className="text-stone-300">Level 2: {t('examsimulator.difficulty.beginner')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-stone-300">Level 3: {t('examsimulator.difficulty.intermediate')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-orange-400 rounded-full"></div>
                        <span className="text-stone-300">Level 4: {t('examsimulator.difficulty.advanced')}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-stone-300">Level 5: {t('examsimulator.difficulty.expert')}</span>
                      </div>
                      {simulatorSettings.numberOfExams >= 6 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-purple-400 rounded-full"></div>
                          <span className="text-stone-300">Level 6: {t('examsimulator.difficulty.master')}</span>
                        </div>
                      )}
                      {simulatorSettings.numberOfExams >= 7 && (
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 bg-pink-400 rounded-full"></div>
                          <span className="text-stone-300">Level 7: {t('examsimulator.difficulty.genius')}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Timer at bottom of card */}
            <div className="flex justify-center mt-8 pt-6 border-t border-[#ffffff]/20">
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
          </div>

          {/* Generate Button */}
          <div className="pt-4">
            <Button
              onClick={handleGenerateExamSeries}
              disabled={(!examDescription.trim() && uploadedFiles.length === 0) || isGenerating}
              className="w-full bg-gradient-to-r from-[#ffffff] to-[#fde6c4] text-[#0d0d0d] hover:from-[#fde6c4] hover:to-[#ffffff] py-6 text-xl font-bold shadow-xl hover:shadow-2xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center rounded-3xl transform hover:scale-[1.02]"
            >
              {isGenerating ? (
                <>
                  <div className="w-5 h-5 border-2 border-[#0d0d0d] border-t-transparent rounded-full animate-spin mr-2"></div>
                  {t('examsimulator.generating')}
                </>
              ) : (
                <>
                  <Zap className="w-5 h-5 mr-2" />
                  {t('examsimulator.generate')}
                </>
              )}
            </Button> 
          </div>
        </div>

        {/* Error Display */}
        {generationError && (
          <div className="bg-red-900/50 rounded-3xl p-8 shadow-xl border border-red-500/30 backdrop-blur-sm mt-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-500/30 rounded-2xl flex items-center justify-center shadow-lg">
                <AlertCircle className="w-6 h-6 text-red-400" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-red-400">{t('examsimulator.error.title')}</h3>
                <p className="text-sm text-red-300">{t('examsimulator.error.description')}</p>
              </div>
            </div>
            <p className="text-red-200 mb-4">{generationError}</p>
            <div className="flex gap-3">
              <Button
                onClick={() => setGenerationError(null)}
                variant="outline"
                className="border-red-400/40 text-red-400 hover:bg-red-400/20 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                {t('examsimulator.error.try')}
              </Button>
              <Button
                onClick={resetForm}
                className="bg-red-500 text-white hover:bg-red-600 rounded-2xl shadow-md hover:shadow-lg transition-all duration-200"
              >
                {t('examsimulator.error.reset')}
              </Button>
            </div>
          </div>
        )}

        {/* Processing Display */}
        {isGenerating && (
          <div className="bg-stone-900/50 rounded-3xl p-10 shadow-xl border border-[#ffffff]/30 backdrop-blur-sm mt-8">
            <div className="text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-3xl flex items-center justify-center mx-auto mb-6 animate-pulse shadow-xl">
                <div className="w-6 h-6 border-3 border-[#0d0d0d] border-t-transparent rounded-full animate-spin"></div>
              </div>
              <h3 className="text-xl font-bold text-[#ffffff] mb-2">{t('examsimulator.generating')}</h3>
              <p className="text-stone-300 mb-4">
                {t('examsimulator.generating.description').replace('{count}', simulatorSettings.numberOfExams.toString())}
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-stone-400">
                <span>Powered by Google Gemma</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ExamSimulator;