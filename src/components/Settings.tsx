import { useState, useEffect } from 'react';
import { useLanguage, LanguageSwitcher } from '@/i18n';
import { useTheme } from '@/contexts/ThemeContext';
import { 
  Settings as SettingsIcon, 
  Globe, 
  Palette, 
  BarChart3, 
  Download, 
  Info,
  Moon,
  Sun,
  Monitor,
  Save,
  RotateCcw,
  CheckCircle,
  Shield,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  Lock,
  Trash2,
  Award,
  Heart
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { performSecurityAudit } from '@/utils/SecurityUtils';

export function Settings() {
  const { t, language, isRTL } = useLanguage();
  const { theme: currentTheme, setTheme, isDark } = useTheme();
  const [activeSection, setActiveSection] = useState('general');
  const [saved, setSaved] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
    theme: currentTheme,
    significanceLevel: 0.05,
    confidenceLevel: 0.95,
    decimalPlaces: 4,
    exportFormat: 'pdf',
    includeCharts: true,
    includeInterpretation: true,
    autoSave: true,
    showTooltips: true,
  });
  
  // Sync theme with ThemeContext
  useEffect(() => {
    setSettings(prev => ({ ...prev, theme: currentTheme }));
  }, [currentTheme]);

  const sections = [
    { id: 'general', icon: SettingsIcon, label: language === 'ar' ? 'عام' : 'General' },
    { id: 'language', icon: Globe, label: language === 'ar' ? 'اللغة' : 'Language' },
    { id: 'appearance', icon: Palette, label: language === 'ar' ? 'المظهر' : 'Appearance' },
    { id: 'analysis', icon: BarChart3, label: language === 'ar' ? 'التحليل' : 'Analysis' },
    { id: 'export', icon: Download, label: language === 'ar' ? 'التصدير' : 'Export' },
    { id: 'security', icon: Shield, label: language === 'ar' ? 'الأمان' : 'Security' },
    { id: 'about', icon: Info, label: language === 'ar' ? 'حول' : 'About' },
  ];

  const handleSave = () => {
    localStorage.setItem('statanalytica-settings', JSON.stringify(settings));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleReset = () => {
    setSettings({
      theme: 'light',
      significanceLevel: 0.05,
      confidenceLevel: 0.95,
      decimalPlaces: 4,
      exportFormat: 'pdf',
      includeCharts: true,
      includeInterpretation: true,
      autoSave: true,
      showTooltips: true,
    });
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'general':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {language === 'ar' ? 'الإعدادات العامة' : 'General Settings'}
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">
                      {language === 'ar' ? 'الحفظ التلقائي' : 'Auto Save'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {language === 'ar' ? 'حفظ التغييرات تلقائياً' : 'Save changes automatically'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.autoSave}
                      onChange={(e) => setSettings({...settings, autoSave: e.target.checked})}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">
                      {language === 'ar' ? 'عرض التلميحات' : 'Show Tooltips'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {language === 'ar' ? 'عرض تلميحات توضيحية' : 'Display helpful tooltips'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.showTooltips}
                      onChange={(e) => setSettings({...settings, showTooltips: e.target.checked})}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'language':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {language === 'ar' ? 'إعدادات اللغة' : 'Language Settings'}
              </h3>
              
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-100">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
                    <Globe className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">
                      {language === 'ar' ? 'اختر لغة الواجهة' : 'Choose Interface Language'}
                    </p>
                    <p className="text-sm text-gray-600">
                      {language === 'ar' ? 'سيتم تغيير جميع عناصر الواجهة' : 'All interface elements will change'}
                    </p>
                  </div>
                </div>

                <LanguageSwitcher variant="toggle" />

                <div className="mt-6 p-4 bg-white rounded-lg">
                  <h4 className="font-medium text-gray-800 mb-3">
                    {language === 'ar' ? 'معلومات اللغة الحالية' : 'Current Language Info'}
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">
                        {language === 'ar' ? 'اللغة:' : 'Language:'}
                      </span>
                      <span className={cn("font-medium", isRTL ? 'mr-2' : 'ml-2')}>
                        {language === 'ar' ? 'العربية' : 'English'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">
                        {language === 'ar' ? 'الاتجاه:' : 'Direction:'}
                      </span>
                      <span className={cn("font-medium", isRTL ? 'mr-2' : 'ml-2')}>
                        {isRTL ? 'RTL' : 'LTR'}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">
                        {language === 'ar' ? 'الكود:' : 'Code:'}
                      </span>
                      <span className={cn("font-medium", isRTL ? 'mr-2' : 'ml-2')}>
                        {language}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-500">
                        {language === 'ar' ? 'العلم:' : 'Flag:'}
                      </span>
                      <span className={cn("font-medium", isRTL ? 'mr-2' : 'ml-2')}>
                        {language === 'ar' ? '🇸🇦' : '🇺🇸'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'appearance':
        return (
          <div className="space-y-6">
            <div>
              <h3 className={cn("text-lg font-semibold mb-4", isDark ? 'text-gray-100' : 'text-gray-800')}>
                {language === 'ar' ? 'إعدادات المظهر' : 'Appearance Settings'}
              </h3>
              
              <div className="space-y-4">
                <p className={cn("text-sm mb-4", isDark ? 'text-gray-400' : 'text-gray-600')}>
                  {language === 'ar' ? 'اختر سمة التطبيق' : 'Choose application theme'}
                </p>
                
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light' as const, icon: Sun, label: language === 'ar' ? 'فاتح' : 'Light', desc: language === 'ar' ? 'مظهر فاتح مريح للعين' : 'Light theme for comfortable viewing' },
                    { id: 'dark' as const, icon: Moon, label: language === 'ar' ? 'داكن' : 'Dark', desc: language === 'ar' ? 'مظهر داكن للعمل الليلي' : 'Dark theme for night work' },
                    { id: 'system' as const, icon: Monitor, label: language === 'ar' ? 'النظام' : 'System', desc: language === 'ar' ? 'يتبع إعدادات النظام' : 'Follows system settings' },
                  ].map(themeOption => (
                    <button
                      key={themeOption.id}
                      onClick={() => {
                        setTheme(themeOption.id);
                        setSettings({...settings, theme: themeOption.id});
                      }}
                      className={cn(
                        'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                        currentTheme === themeOption.id 
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30' 
                          : isDark 
                            ? 'border-gray-600 hover:border-gray-500 bg-gray-800' 
                            : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <themeOption.icon className={cn(
                        'w-8 h-8',
                        currentTheme === themeOption.id ? 'text-blue-600' : isDark ? 'text-gray-400' : 'text-gray-500'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        currentTheme === themeOption.id ? 'text-blue-600' : isDark ? 'text-gray-300' : 'text-gray-600'
                      )}>
                        {themeOption.label}
                      </span>
                    </button>
                  ))}
                </div>
                
                {/* Theme Preview */}
                <div className={cn(
                  "mt-6 p-4 rounded-xl border",
                  isDark ? 'bg-gray-800 border-gray-700' : 'bg-gray-50 border-gray-200'
                )}>
                  <h4 className={cn("font-medium mb-3", isDark ? 'text-gray-200' : 'text-gray-700')}>
                    {language === 'ar' ? 'معاينة المظهر الحالي' : 'Current Theme Preview'}
                  </h4>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-16 h-16 rounded-lg flex items-center justify-center",
                      isDark ? 'bg-gray-700' : 'bg-white border border-gray-200'
                    )}>
                      {isDark ? <Moon className="w-8 h-8 text-yellow-400" /> : <Sun className="w-8 h-8 text-yellow-500" />}
                    </div>
                    <div>
                      <p className={cn("font-medium", isDark ? 'text-gray-200' : 'text-gray-800')}>
                        {isDark 
                          ? (language === 'ar' ? 'الوضع الداكن مفعّل' : 'Dark Mode Active')
                          : (language === 'ar' ? 'الوضع الفاتح مفعّل' : 'Light Mode Active')
                        }
                      </p>
                      <p className={cn("text-sm", isDark ? 'text-gray-400' : 'text-gray-500')}>
                        {currentTheme === 'system' 
                          ? (language === 'ar' ? 'يتبع إعدادات النظام تلقائياً' : 'Following system settings automatically')
                          : (language === 'ar' ? 'تم تحديده يدوياً' : 'Manually selected')
                        }
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Success Message */}
                {currentTheme !== settings.theme && (
                  <div className="flex items-center gap-2 p-3 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-lg">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm">
                      {language === 'ar' ? 'تم تطبيق المظهر بنجاح!' : 'Theme applied successfully!'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      case 'analysis':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {language === 'ar' ? 'إعدادات التحليل الإحصائي' : 'Statistical Analysis Settings'}
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'مستوى الدلالة (α)' : 'Significance Level (α)'}
                  </label>
                  <select
                    value={settings.significanceLevel}
                    onChange={(e) => setSettings({...settings, significanceLevel: parseFloat(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0.01}>0.01 (99% {language === 'ar' ? 'ثقة' : 'confidence'})</option>
                    <option value={0.05}>0.05 (95% {language === 'ar' ? 'ثقة' : 'confidence'})</option>
                    <option value={0.10}>0.10 (90% {language === 'ar' ? 'ثقة' : 'confidence'})</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-2">
                    {language === 'ar' 
                      ? 'احتمال رفض الفرضية الصفرية عندما تكون صحيحة'
                      : 'Probability of rejecting null hypothesis when true'}
                  </p>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'مستوى الثقة' : 'Confidence Level'}
                  </label>
                  <select
                    value={settings.confidenceLevel}
                    onChange={(e) => setSettings({...settings, confidenceLevel: parseFloat(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value={0.90}>90%</option>
                    <option value={0.95}>95%</option>
                    <option value={0.99}>99%</option>
                  </select>
                </div>

                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'المنازل العشرية' : 'Decimal Places'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={settings.decimalPlaces}
                    onChange={(e) => setSettings({...settings, decimalPlaces: parseInt(e.target.value)})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>
        );

      case 'export':
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {language === 'ar' ? 'إعدادات التصدير' : 'Export Settings'}
              </h3>
              
              <div className="space-y-4">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {language === 'ar' ? 'صيغة التصدير الافتراضية' : 'Default Export Format'}
                  </label>
                  <select
                    value={settings.exportFormat}
                    onChange={(e) => setSettings({...settings, exportFormat: e.target.value})}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pdf">PDF</option>
                    <option value="html">HTML</option>
                    <option value="word">Word (DOCX)</option>
                    <option value="excel">Excel (XLSX)</option>
                  </select>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">
                      {language === 'ar' ? 'تضمين الرسوم البيانية' : 'Include Charts'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.includeCharts}
                      onChange={(e) => setSettings({...settings, includeCharts: e.target.checked})}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div>
                    <p className="font-medium text-gray-800">
                      {language === 'ar' ? 'تضمين التفسيرات' : 'Include Interpretations'}
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={settings.includeInterpretation}
                      onChange={(e) => setSettings({...settings, includeInterpretation: e.target.checked})}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              </div>
            </div>
          </div>
        );

      case 'security':
        const auditResult = performSecurityAudit();
        const storageUsed = (() => {
          let total = 0;
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key) total += (localStorage.getItem(key) || '').length;
          }
          return total;
        })();
        const storagePercent = Math.min((storageUsed / (5 * 1024 * 1024)) * 100, 100);
        
        return (
          <div className="space-y-6">
            <div>
              <h3 className={cn("text-lg font-semibold mb-4", isDark ? 'text-gray-100' : 'text-gray-800')}>
                {language === 'ar' ? 'إعدادات الأمان' : 'Security Settings'}
              </h3>
              
              {/* Security Status */}
              <div className={cn(
                "p-6 rounded-xl border mb-6",
                auditResult.issues.length === 0 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              )}>
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-16 h-16 rounded-full flex items-center justify-center",
                    auditResult.issues.length === 0 ? 'bg-green-100' : 'bg-yellow-100'
                  )}>
                    {auditResult.issues.length === 0 ? (
                      <ShieldCheck className="w-8 h-8 text-green-600" />
                    ) : (
                      <ShieldAlert className="w-8 h-8 text-yellow-600" />
                    )}
                  </div>
                  <div>
                    <h4 className={cn(
                      "text-xl font-bold",
                      auditResult.issues.length === 0 ? 'text-green-700' : 'text-yellow-700'
                    )}>
                      {auditResult.issues.length === 0 
                        ? (language === 'ar' ? 'النظام آمن' : 'System Secure')
                        : (language === 'ar' ? `${auditResult.issues.length} مشكلة مكتشفة` : `${auditResult.issues.length} Issues Found`)
                      }
                    </h4>
                    <p className={cn(
                      "text-sm",
                      auditResult.issues.length === 0 ? 'text-green-600' : 'text-yellow-600'
                    )}>
                      {language === 'ar' 
                        ? 'تم فحص جميع إعدادات الأمان'
                        : 'All security settings checked'
                      }
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Issues */}
              {auditResult.issues.length > 0 && (
                <div className="mb-6">
                  <h4 className={cn("font-medium mb-3", isDark ? 'text-gray-200' : 'text-gray-700')}>
                    {language === 'ar' ? 'المشاكل المكتشفة' : 'Issues Found'}
                  </h4>
                  <div className="space-y-2">
                    {auditResult.issues.map((issue, idx) => (
                      <div key={idx} className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                        <span className="text-sm text-red-700">{issue}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* Recommendations */}
              <div className="mb-6">
                <h4 className={cn("font-medium mb-3", isDark ? 'text-gray-200' : 'text-gray-700')}>
                  {language === 'ar' ? 'التوصيات الأمنية' : 'Security Recommendations'}
                </h4>
                <div className="space-y-2">
                  {auditResult.recommendations.map((rec, idx) => (
                    <div key={idx} className={cn(
                      "flex items-center gap-2 p-3 rounded-lg",
                      isDark ? 'bg-gray-700' : 'bg-blue-50'
                    )}>
                      <Lock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                      <span className={cn("text-sm", isDark ? 'text-gray-300' : 'text-blue-700')}>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Storage Usage */}
              <div className={cn("p-4 rounded-xl", isDark ? 'bg-gray-700' : 'bg-gray-50')}>
                <div className="flex items-center justify-between mb-2">
                  <span className={cn("font-medium", isDark ? 'text-gray-200' : 'text-gray-700')}>
                    {language === 'ar' ? 'استخدام التخزين المحلي' : 'Local Storage Usage'}
                  </span>
                  <span className={cn("text-sm", isDark ? 'text-gray-400' : 'text-gray-500')}>
                    {(storageUsed / 1024).toFixed(2)} KB / 5 MB
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={cn(
                      "h-2 rounded-full transition-all",
                      storagePercent > 80 ? 'bg-red-500' : storagePercent > 50 ? 'bg-yellow-500' : 'bg-green-500'
                    )}
                    style={{ width: `${storagePercent}%` }}
                  ></div>
                </div>
              </div>
              
              {/* Clear Data Button */}
              <div className="mt-6">
                <button
                  onClick={() => {
                    if (confirm(language === 'ar' ? 'هل أنت متأكد من مسح جميع البيانات المحفوظة؟' : 'Are you sure you want to clear all saved data?')) {
                      localStorage.clear();
                      window.location.reload();
                    }
                  }}
                  className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                  {language === 'ar' ? 'مسح جميع البيانات المحفوظة' : 'Clear All Saved Data'}
                </button>
              </div>
            </div>
          </div>
        );

      case 'about':
        return (
          <div className="space-y-6">
            {/* Logo and Title */}
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BarChart3 className="w-12 h-12 text-white" />
              </div>
              <h2 className={cn("text-2xl font-bold", isDark ? 'text-white' : 'text-gray-800')}>StatAnalytica</h2>
              <p className={cn("", isDark ? 'text-gray-400' : 'text-gray-500')}>
                {language === 'ar' ? 'منصة التحليل الإحصائي المتقدمة' : 'Advanced Statistical Analysis Platform'}
              </p>
              <p className={cn("text-sm mt-2", isDark ? 'text-gray-500' : 'text-gray-400')}>
                {language === 'ar' ? 'الإصدار' : 'Version'} 2.0.0
              </p>
            </div>

            {/* Developer Info - Highlighted */}
            <div className="bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-2xl p-1 shadow-lg">
              <div className={cn(
                "rounded-xl p-6 text-center",
                isDark ? 'bg-gray-800' : 'bg-white'
              )}>
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                  <Award className="w-8 h-8 text-white" />
                </div>
                <p className={cn("text-sm mb-2", isDark ? 'text-gray-400' : 'text-gray-600')}>
                  {language === 'ar' ? 'تم التطوير بواسطة' : 'Developed by'}
                </p>
                <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Essam Sabbah
                </h3>
                <div className="flex items-center justify-center gap-2 mt-3">
                  <BarChart3 className={cn("w-4 h-4", isDark ? 'text-gray-400' : 'text-gray-500')} />
                  <span className={cn("text-sm", isDark ? 'text-gray-400' : 'text-gray-500')}>
                    {language === 'ar' ? 'محلل بيانات' : 'Data Analyst'}
                  </span>
                </div>
                <div className="flex items-center justify-center gap-2 mt-2">
                  <Heart className="w-4 h-4 text-red-500" />
                  <span className={cn("text-sm", isDark ? 'text-gray-400' : 'text-gray-500')}>
                    {language === 'ar' ? 'صُنع بحب للمجتمع العلمي' : 'Made with love for the scientific community'}
                  </span>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className={cn("rounded-xl p-6", isDark ? 'bg-gray-700' : 'bg-gray-50')}>
              <h3 className={cn("font-semibold mb-4", isDark ? 'text-gray-200' : 'text-gray-800')}>
                {language === 'ar' ? 'المميزات' : 'Features'}
              </h3>
              <ul className={cn("space-y-2 text-sm", isDark ? 'text-gray-300' : 'text-gray-600')}>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? '50+ اختبار إحصائي' : '50+ Statistical Tests'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'تحليل وصفي شامل' : 'Comprehensive Descriptive Analysis'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'مستشار إحصائي ذكي بالذكاء الاصطناعي' : 'AI-Powered Smart Statistical Advisor'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'تصورات بيانية تفاعلية' : 'Interactive Visualizations'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'تحليل متقدم (انحدار، PCA، تجميع)' : 'Advanced Analysis (Regression, PCA, Clustering)'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'تقارير احترافية (PDF, HTML, Word)' : 'Professional Reports (PDF, HTML, Word)'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'دعم العربية والإنجليزية' : 'Arabic & English Support'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'استيراد من مصادر متعددة (Excel, CSV, API, Cloud)' : 'Import from Multiple Sources (Excel, CSV, API, Cloud)'}
                </li>
              </ul>
            </div>

            {/* Copyright */}
            <div className={cn("text-center text-sm", isDark ? 'text-gray-500' : 'text-gray-500')}>
              <p>© 2024 StatAnalytica</p>
              <p>{language === 'ar' ? 'جميع الحقوق محفوظة' : 'All rights reserved'}</p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-gray-700 to-gray-800 text-white p-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
            <SettingsIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
            <p className="text-gray-300">{t('settings.subtitle')}</p>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-gray-50 border-r border-gray-200 p-4">
          <nav className="space-y-1">
            {sections.map(section => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all',
                  activeSection === section.id
                    ? 'bg-blue-500 text-white shadow-lg'
                    : 'text-gray-600 hover:bg-gray-100'
                )}
              >
                <section.icon className="w-5 h-5" />
                <span className="font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">
          {renderSection()}

          {/* Save/Reset Buttons */}
          {activeSection !== 'about' && activeSection !== 'language' && (
            <div className={cn("flex gap-3 mt-8 pt-6 border-t border-gray-200", isRTL ? 'justify-start' : 'justify-end')}>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <RotateCcw className="w-4 h-4" />
                {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
              </button>
              <button
                onClick={handleSave}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all"
              >
                {saved ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    {language === 'ar' ? 'تم الحفظ!' : 'Saved!'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    {language === 'ar' ? 'حفظ الإعدادات' : 'Save Settings'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
