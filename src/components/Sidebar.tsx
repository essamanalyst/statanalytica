import React, { useState } from 'react';
import { useLanguage } from '../i18n';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  dataLoaded: boolean;
}

interface NavItem {
  id: string;
  labelKey: string;
  icon: string;
  gradient: string;
  requiresData?: boolean;
}

interface NavSection {
  titleKey: string;
  items: NavItem[];
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, onTabChange, dataLoaded }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { t, isRTL, language } = useLanguage();

  const navSections: NavSection[] = [
    {
      titleKey: 'nav.dataManagement',
      items: [
        { id: 'home', labelKey: 'nav.home', icon: '🏠', gradient: 'from-blue-500 to-blue-600' },
        { id: 'upload', labelKey: 'nav.upload', icon: '📤', gradient: 'from-emerald-500 to-emerald-600' },
        { id: 'cleaning', labelKey: 'nav.cleaning', icon: '🧹', gradient: 'from-amber-500 to-amber-600', requiresData: true },
      ]
    },
    {
      titleKey: 'nav.analysis',
      items: [
        { id: 'descriptive', labelKey: 'nav.descriptive', icon: '📊', gradient: 'from-purple-500 to-purple-600', requiresData: true },
        { id: 'tests', labelKey: 'nav.tests', icon: '🧪', gradient: 'from-rose-500 to-rose-600', requiresData: true },
        { id: 'advanced', labelKey: 'nav.advanced', icon: '✨', gradient: 'from-indigo-500 to-indigo-600', requiresData: true },
        { id: 'ai-assistant', labelKey: 'nav.aiAssistant', icon: '🤖', gradient: 'from-violet-500 to-fuchsia-600', requiresData: true },
      ]
    },
    {
      titleKey: 'nav.output',
      items: [
        { id: 'visualization', labelKey: 'nav.visualization', icon: '📈', gradient: 'from-cyan-500 to-cyan-600', requiresData: true },
        { id: 'reports', labelKey: 'nav.reports', icon: '📝', gradient: 'from-orange-500 to-orange-600', requiresData: true },
      ]
    },
    {
      titleKey: 'nav.system',
      items: [
        { id: 'settings', labelKey: 'nav.settings', icon: '⚙️', gradient: 'from-gray-500 to-gray-600' },
        { id: 'help', labelKey: 'nav.help', icon: '❓', gradient: 'from-teal-500 to-teal-600' },
      ]
    }
  ];

  const handleNavClick = (item: NavItem) => {
    if (item.requiresData && !dataLoaded) {
      return;
    }
    onTabChange(item.id);
  };

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-72'
      } bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700 transition-all duration-300 flex flex-col shadow-lg ${
        isRTL ? 'border-l' : 'border-r'
      }`}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
            <span className="text-white text-xl">📊</span>
          </div>
          {!isCollapsed && (
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                {t('app.title')}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ar' ? 'التحليل الإحصائي' : 'Statistical Analysis'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-4">
        {navSections.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {!isCollapsed && (
              <h3 className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-2 px-3">
                {t(section.titleKey)}
              </h3>
            )}
            <div className="space-y-1">
              {section.items.map((item) => {
                const isActive = activeTab === item.id;
                const isDisabled = item.requiresData && !dataLoaded;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavClick(item)}
                    disabled={isDisabled}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      isActive
                        ? `bg-gradient-to-r ${item.gradient} text-white shadow-lg`
                        : isDisabled
                        ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                    } ${isCollapsed ? 'justify-center' : ''}`}
                    title={isCollapsed ? t(item.labelKey) : undefined}
                  >
                    <span className="text-lg flex-shrink-0">{item.icon}</span>
                    {!isCollapsed && (
                      <span className="font-medium text-sm">{t(item.labelKey)}</span>
                    )}
                    {isDisabled && !isCollapsed && (
                      <span className={`text-xs bg-gray-200 dark:bg-gray-700 px-2 py-0.5 rounded-full ${isRTL ? 'mr-auto' : 'ml-auto'}`}>
                        {language === 'ar' ? 'يتطلب بيانات' : 'Needs data'}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Data Status */}
      {!isCollapsed && (
        <div className="p-4 border-t border-gray-200 dark:border-gray-700">
          <div className={`p-3 rounded-xl ${
            dataLoaded 
              ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 border border-emerald-200 dark:border-emerald-800' 
              : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20 border border-amber-200 dark:border-amber-800'
          }`}>
            <div className="flex items-center gap-2 mb-1">
              <div className={`w-2 h-2 rounded-full ${dataLoaded ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`}></div>
              <span className={`text-xs font-medium ${dataLoaded ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-700 dark:text-amber-400'}`}>
                {dataLoaded 
                  ? (language === 'ar' ? 'البيانات جاهزة' : 'Data Ready')
                  : (language === 'ar' ? 'لا توجد بيانات' : 'No Data')
                }
              </span>
            </div>
            {!dataLoaded && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {language === 'ar' 
                  ? 'قم بتحميل بيانات للبدء' 
                  : 'Upload data to get started'
                }
              </p>
            )}
          </div>
        </div>
      )}

      {/* Collapse Button */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <span className="text-lg">{isCollapsed ? (isRTL ? '◀' : '▶') : (isRTL ? '▶' : '◀')}</span>
          {!isCollapsed && (
            <span className="text-sm font-medium">
              {language === 'ar' ? 'طي القائمة' : 'Collapse'}
            </span>
          )}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
