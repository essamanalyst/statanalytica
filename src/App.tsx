import { useState, useCallback, Suspense } from 'react';
import { Dataset } from '@/types';
import Sidebar from '@/components/Sidebar';
import DataUpload from '@/components/DataUpload';
import { DataCleaning } from '@/components/DataCleaning';
import { DescriptiveAnalysis } from '@/components/DescriptiveAnalysis';
import StatisticalTests from '@/components/StatisticalTests';
import ComprehensiveAdvancedAnalysis from '@/components/ComprehensiveAdvancedAnalysis';
import { Visualization } from '@/components/Visualization';
import { Reports } from '@/components/Reports';
import { Settings } from '@/components/Settings';
import ProfessionalHomePage from '@/components/ProfessionalHomePage';
import AIAssistantWithReports from '@/components/AIAssistantWithReports';
import Help from '@/components/Help';
import { ToastContainer } from '@/components/ui/Toast';
import { BarChart3, Database, Bell, HelpCircle, Search, Moon, Sun, Menu, X, Activity, Globe, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { useLanguage, LanguageSwitcher } from '@/i18n';

// Loading Component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center h-64">
    <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
  </div>
);

export function App() {
  const { t, language, isRTL, dir } = useLanguage();
  const [activeTab, setActiveTab] = useState<string>('upload');
  const [dataset, setDataset] = useState<Dataset | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showLanguageMenu, setShowLanguageMenu] = useState(false);
  const [helpSubTab, setHelpSubTab] = useState<string | undefined>(undefined);
  
  // Handle navigation with optional subTab
  const handleNavigate = useCallback((tab: string, subTab?: string) => {
    setActiveTab(tab);
    if (tab === 'help' && subTab) {
      setHelpSubTab(subTab);
    } else {
      setHelpSubTab(undefined);
    }
  }, []);

  const handleDataLoaded = useCallback((data: any[], columns: string[]) => {
    const detectType = (values: any[]): 'numeric' | 'categorical' | 'date' | 'boolean' | 'text' => {
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      if (nonNull.length === 0) return 'text';
      const sample = nonNull.slice(0, 50);
      
      const numericCount = sample.filter(v => !isNaN(Number(v))).length;
      if (numericCount === sample.length) return 'numeric';
      
      const dateCount = sample.filter(v => {
        const d = new Date(v);
        return !isNaN(d.getTime()) && String(v).match(/\d{4}|\d{2}[-/]\d{2}/);
      }).length;
      if (dateCount > sample.length * 0.8) return 'date';
      
      const uniqueSet = new Set(sample);
      if (uniqueSet.size <= Math.min(20, sample.length * 0.5)) return 'categorical';
      
      return 'text';
    };

    const datasetColumns = columns.map(colName => {
      const values = data.map(row => row[colName]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const colType = detectType(values);
      const uniqueSet = new Set(nonNull);
      
      let stats: Record<string, number> = {};
      if (colType === 'numeric') {
        const nums = nonNull.map(Number).filter(n => !isNaN(n));
        if (nums.length > 0) {
          const sum = nums.reduce((a, b) => a + b, 0);
          const mean = sum / nums.length;
          const sorted = [...nums].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          const min = sorted[0];
          const max = sorted[sorted.length - 1];
          const variance = nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
          const stdDev = Math.sqrt(variance);
          stats = { mean, median, min, max, stdDev, sum };
        }
      }
      
      return {
        name: colName,
        type: colType,
        values: values,
        missing: values.length - nonNull.length,
        unique: uniqueSet.size,
        nullCount: values.length - nonNull.length,
        uniqueCount: uniqueSet.size,
        stats
      };
    });

    const newDataset: Dataset = {
      name: language === 'ar' ? 'البيانات المحملة' : 'Loaded Data',
      columns: datasetColumns,
      rows: data,
      rowCount: data.length,
      columnCount: columns.length
    };
    
    setDataset(newDataset);
  }, [language]);

  const handleDatasetUpdate = useCallback((updatedDataset: Dataset) => {
    setDataset(updatedDataset);
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'home':
        return (
          <Suspense fallback={<LoadingSpinner />}>
            <ProfessionalHomePage 
              data={dataset?.rows || null}
              onNavigate={handleNavigate}
            />
          </Suspense>
        );
      case 'upload':
        return <DataUpload onDataLoaded={handleDataLoaded} />;
      case 'cleaning':
        return <DataCleaning dataset={dataset} onDatasetUpdate={handleDatasetUpdate} />;
      case 'descriptive':
        return <DescriptiveAnalysis dataset={dataset} />;
      case 'tests':
        return dataset ? (
          <StatisticalTests 
            data={dataset.rows} 
            columns={dataset.columns.map(c => c.name)} 
          />
        ) : (
          <div className="text-center p-8 text-gray-500">{t('message.info.selectData')}</div>
        );
      case 'ai-assistant':
        return dataset ? (
          <AIAssistantWithReports data={dataset.rows} />
        ) : (
          <div className="text-center p-8 text-gray-500">{t('message.info.selectData')}</div>
        );
      case 'advanced':
        return dataset ? (
          <ComprehensiveAdvancedAnalysis 
            data={dataset.rows} 
            columns={dataset.columns.map(c => c.name)} 
          />
        ) : (
          <div className="text-center p-8 text-gray-500">{t('message.info.selectData')}</div>
        );
      case 'visualization':
        return <Visualization dataset={dataset} />;
      case 'reports':
        return <Reports dataset={dataset} />;
      case 'settings':
        return <Settings />;
      case 'help':
        return <Help defaultTab={helpSubTab} />;
      default:
        return <DataUpload onDataLoaded={handleDataLoaded} />;
    }
  };

  const getPageTitle = () => {
    const titles: Record<string, string> = {
      home: t('nav.home'),
      upload: t('nav.upload'),
      cleaning: t('nav.cleaning'),
      descriptive: t('nav.descriptive'),
      tests: t('nav.tests'),
      advanced: t('nav.advanced'),
      visualization: t('nav.visualization'),
      reports: t('nav.reports'),
      settings: t('nav.settings'),
      help: t('nav.help'),
    };
    return titles[activeTab] || titles.home;
  };

  const notifications = [
    { id: 1, text: language === 'ar' ? 'تم تحميل البيانات بنجاح' : 'Data loaded successfully', time: language === 'ar' ? 'منذ دقيقة' : '1 min ago', type: 'success' },
    { id: 2, text: language === 'ar' ? 'تم اكتشاف 15 قيمة شاذة' : '15 outliers detected', time: language === 'ar' ? 'منذ 5 دقائق' : '5 min ago', type: 'warning' },
    { id: 3, text: language === 'ar' ? 'التقرير جاهز للتصدير' : 'Report ready for export', time: language === 'ar' ? 'منذ 10 دقائق' : '10 min ago', type: 'info' },
  ];

  const helpItems = language === 'ar' ? [
    '• ابدأ بتحميل البيانات من تبويب "استيراد البيانات"',
    '• استخدم "تنظيف البيانات" لمعالجة القيم المفقودة',
    '• "المستشار الذكي" يساعدك في اختيار الاختبار المناسب',
    '• صدّر نتائجك من تبويب "التقارير"'
  ] : [
    '• Start by uploading data from "Import Data" tab',
    '• Use "Data Cleaning" to handle missing values',
    '• "Smart Advisor" helps you choose the right test',
    '• Export your results from the "Reports" tab'
  ];

  return (
    <div className={cn('flex h-screen', darkMode ? 'dark bg-gray-900' : 'bg-gray-100')} dir={dir}>
      {/* Sidebar */}
      <Sidebar 
        activeTab={activeTab} 
        onTabChange={setActiveTab}
        dataLoaded={!!dataset}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Header */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 shadow-sm">
          <div className="flex items-center justify-between">
            {/* Left Section */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-all lg:hidden"
              >
                {sidebarCollapsed ? <Menu className="w-5 h-5" /> : <X className="w-5 h-5" />}
              </button>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900">{getPageTitle()}</h1>
              </div>
              
              {dataset && (
                <div className={cn(
                  "flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200",
                  isRTL ? 'mr-4' : 'ml-4'
                )}>
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                  <Database className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-semibold text-green-800">{dataset.name}</span>
                  <span className="text-xs text-green-600 bg-green-100 px-2 py-0.5 rounded-full">
                    {dataset.rowCount.toLocaleString()} × {dataset.columnCount}
                  </span>
                </div>
              )}
            </div>
            
            {/* Right Section */}
            <div className="flex items-center gap-2">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className={cn("w-4 h-4 absolute top-1/2 -translate-y-1/2 text-gray-400", isRTL ? 'right-3' : 'left-3')} />
                <input
                  type="text"
                  placeholder={t('action.search') + '...'}
                  className={cn(
                    "w-64 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent",
                    isRTL ? 'pl-4 pr-10' : 'pr-4 pl-10'
                  )}
                />
              </div>
              
              {/* Activity Indicator */}
              {dataset && (
                <div className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 rounded-lg">
                  <Activity className="w-4 h-4 text-blue-500" />
                  <span className="text-xs text-blue-600 font-medium">
                    {language === 'ar' ? 'نشط' : 'Active'}
                  </span>
                </div>
              )}
              
              {/* Language Switcher */}
              <div className="relative">
                <button 
                  onClick={() => setShowLanguageMenu(!showLanguageMenu)}
                  className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all flex items-center gap-1"
                >
                  <Globe className="w-5 h-5" />
                  <span className="text-xs font-medium hidden sm:inline">
                    {language === 'ar' ? 'عربي' : 'EN'}
                  </span>
                </button>
                
                {showLanguageMenu && (
                  <div className={cn(
                    "absolute top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-gray-200 p-3 z-50",
                    isRTL ? 'left-0' : 'right-0'
                  )}>
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <Globe className="w-4 h-4" />
                      {t('label.language')}
                    </h3>
                    <LanguageSwitcher variant="toggle" />
                  </div>
                )}
              </div>
              
              {/* Dark Mode Toggle */}
              <button 
                onClick={() => setDarkMode(!darkMode)}
                className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
              >
                {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>
              
              {/* Help */}
              <div className="relative">
                <button 
                  onClick={() => setShowHelp(!showHelp)}
                  className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all"
                >
                  <HelpCircle className="w-5 h-5" />
                </button>
                
                {showHelp && (
                  <div className={cn(
                    "absolute top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 p-4 z-50",
                    isRTL ? 'left-0' : 'right-0'
                  )}>
                    <h3 className="font-bold text-gray-800 mb-3">
                      {language === 'ar' ? 'مساعدة سريعة' : 'Quick Help'}
                    </h3>
                    <div className="space-y-2 text-sm text-gray-600">
                      {helpItems.map((item, idx) => (
                        <p key={idx}>{item}</p>
                      ))}
                    </div>
                    <a href="#" className="block mt-3 text-blue-600 hover:text-blue-700 text-sm font-medium">
                      {language === 'ar' ? 'عرض الدليل الكامل ←' : 'View full guide →'}
                    </a>
                  </div>
                )}
              </div>
              
              {/* Notifications */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-xl transition-all relative"
                >
                  <Bell className="w-5 h-5" />
                  <span className={cn(
                    "absolute top-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white",
                    isRTL ? 'left-1' : 'right-1'
                  )}></span>
                </button>
                
                {showNotifications && (
                  <div className={cn(
                    "absolute top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50",
                    isRTL ? 'left-0' : 'right-0'
                  )}>
                    <div className="p-3 bg-gray-50 border-b border-gray-200">
                      <h3 className="font-bold text-gray-800">
                        {language === 'ar' ? 'الإشعارات' : 'Notifications'}
                      </h3>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {notifications.map(notif => (
                        <div key={notif.id} className="p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer">
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              'w-2 h-2 rounded-full mt-2',
                              notif.type === 'success' ? 'bg-green-500' :
                              notif.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                            )}></div>
                            <div>
                              <p className="text-sm text-gray-800">{notif.text}</p>
                              <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="p-2 bg-gray-50 border-t border-gray-200">
                      <button className="w-full text-center text-sm text-blue-600 hover:text-blue-700 py-1">
                        {language === 'ar' ? 'عرض جميع الإشعارات' : 'View all notifications'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="w-px h-8 bg-gray-200 mx-2"></div>
              
              {/* User */}
              <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl cursor-pointer hover:shadow-md transition-all">
                <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white text-sm font-bold shadow-lg">
                  {language === 'ar' ? 'م' : 'U'}
                </div>
                <div className="hidden sm:block">
                  <p className="text-sm font-semibold text-gray-800">
                    {language === 'ar' ? 'مستخدم' : 'User'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {language === 'ar' ? 'محلل بيانات' : 'Data Analyst'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Quick Stats Bar (if dataset is loaded) */}
        {dataset && activeTab !== 'upload' && activeTab !== 'home' && (
          <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white px-6 py-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-6">
                <span className="flex items-center gap-2">
                  <span className="opacity-75">📊</span>
                  <span className="font-medium">{dataset.name}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-75">{language === 'ar' ? 'الصفوف:' : 'Rows:'}</span>
                  <span className="font-bold">{dataset.rowCount.toLocaleString()}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-75">{language === 'ar' ? 'الأعمدة:' : 'Cols:'}</span>
                  <span className="font-bold">{dataset.columnCount}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-75">{language === 'ar' ? 'رقمي:' : 'Numeric:'}</span>
                  <span className="font-bold">{dataset.columns.filter(c => c.type === 'numeric').length}</span>
                </span>
                <span className="flex items-center gap-1">
                  <span className="opacity-75">{language === 'ar' ? 'فئوي:' : 'Categorical:'}</span>
                  <span className="font-bold">{dataset.columns.filter(c => c.type === 'categorical').length}</span>
                </span>
              </div>
              <button 
                onClick={() => setActiveTab('upload')}
                className="text-xs bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full transition-all"
              >
                {language === 'ar' ? 'تغيير البيانات' : 'Change Data'}
              </button>
            </div>
          </div>
        )}

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-gradient-to-br from-gray-50 to-gray-100">
          <div className="max-w-7xl mx-auto">
            {renderContent()}
          </div>
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between text-sm text-gray-500">
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-white" />
                </div>
                <div>
                  <span className="font-bold text-gray-700">StatAnalytica</span>
                  <span className={cn("text-xs text-gray-400", isRTL ? 'mr-2' : 'ml-2')}>v2.0</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-6">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                {language === 'ar' ? 'متصل' : 'Connected'}
              </span>
              <span>{language === 'ar' ? 'للتحليل الإحصائي والبحث العلمي' : 'Statistical Analysis & Scientific Research'}</span>
              <span>© 2024</span>
            </div>
          </div>
        </footer>
      </div>
      
      {/* Toast Notifications */}
      <ToastContainer />
      
      {/* Click outside to close dropdowns */}
      {(showNotifications || showHelp || showLanguageMenu) && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => {
            setShowNotifications(false);
            setShowHelp(false);
            setShowLanguageMenu(false);
          }}
        />
      )}
    </div>
  );
}

export default App;
