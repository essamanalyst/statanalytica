import { useState } from 'react';
import { useLanguage, LanguageSwitcher } from '@/i18n';
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
  CheckCircle
} from 'lucide-react';
import { cn } from '@/utils/cn';

export function Settings() {
  const { t, language, isRTL } = useLanguage();
  const [activeSection, setActiveSection] = useState('general');
  const [saved, setSaved] = useState(false);
  
  // Settings state
  const [settings, setSettings] = useState({
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

  const sections = [
    { id: 'general', icon: SettingsIcon, label: language === 'ar' ? 'عام' : 'General' },
    { id: 'language', icon: Globe, label: language === 'ar' ? 'اللغة' : 'Language' },
    { id: 'appearance', icon: Palette, label: language === 'ar' ? 'المظهر' : 'Appearance' },
    { id: 'analysis', icon: BarChart3, label: language === 'ar' ? 'التحليل' : 'Analysis' },
    { id: 'export', icon: Download, label: language === 'ar' ? 'التصدير' : 'Export' },
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
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                {language === 'ar' ? 'إعدادات المظهر' : 'Appearance Settings'}
              </h3>
              
              <div className="space-y-4">
                <p className="text-sm text-gray-600 mb-4">
                  {language === 'ar' ? 'اختر سمة التطبيق' : 'Choose application theme'}
                </p>
                
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'light', icon: Sun, label: language === 'ar' ? 'فاتح' : 'Light' },
                    { id: 'dark', icon: Moon, label: language === 'ar' ? 'داكن' : 'Dark' },
                    { id: 'system', icon: Monitor, label: language === 'ar' ? 'النظام' : 'System' },
                  ].map(theme => (
                    <button
                      key={theme.id}
                      onClick={() => setSettings({...settings, theme: theme.id})}
                      className={cn(
                        'p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2',
                        settings.theme === theme.id 
                          ? 'border-blue-500 bg-blue-50' 
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <theme.icon className={cn(
                        'w-8 h-8',
                        settings.theme === theme.id ? 'text-blue-600' : 'text-gray-500'
                      )} />
                      <span className={cn(
                        'text-sm font-medium',
                        settings.theme === theme.id ? 'text-blue-600' : 'text-gray-600'
                      )}>
                        {theme.label}
                      </span>
                    </button>
                  ))}
                </div>
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

      case 'about':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BarChart3 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800">StatAnalytica</h2>
              <p className="text-gray-500">
                {language === 'ar' ? 'منصة التحليل الإحصائي المتقدمة' : 'Advanced Statistical Analysis Platform'}
              </p>
              <p className="text-sm text-gray-400 mt-2">
                {language === 'ar' ? 'الإصدار' : 'Version'} 2.0.0
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">
                {language === 'ar' ? 'المميزات' : 'Features'}
              </h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? '40+ اختبار إحصائي' : '40+ Statistical Tests'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'تحليل وصفي شامل' : 'Comprehensive Descriptive Analysis'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'مستشار إحصائي ذكي' : 'Smart Statistical Advisor'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'تصورات بيانية تفاعلية' : 'Interactive Visualizations'}
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  {language === 'ar' ? 'دعم العربية والإنجليزية' : 'Arabic & English Support'}
                </li>
              </ul>
            </div>

            <div className="text-center text-sm text-gray-500">
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
