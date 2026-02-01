import React from 'react';
import { useLanguage } from '../i18n';
import {
  Upload,
  BarChart3,
  Brain,
  TrendingUp,
  PieChart,
  FileText,
  Settings,
  Sparkles,
  Database,
  LineChart,
  Layers,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  Clock,
  Users,
  Shield
} from 'lucide-react';

interface HomePageProps {
  onNavigate: (tab: string) => void;
  data: any[] | null;
  columns: { name: string; type?: string }[];
}

const HomePage: React.FC<HomePageProps> = ({ onNavigate, data, columns }) => {
  const { isRTL, language } = useLanguage();

  const quickActions = [
    {
      icon: Upload,
      title: language === 'ar' ? 'استيراد البيانات' : 'Import Data',
      description: language === 'ar' ? 'قم بتحميل ملفاتك CSV, Excel, JSON' : 'Upload your CSV, Excel, JSON files',
      color: 'from-blue-500 to-blue-600',
      tab: 'upload'
    },
    {
      icon: Sparkles,
      title: language === 'ar' ? 'تنظيف البيانات' : 'Clean Data',
      description: language === 'ar' ? 'معالجة القيم المفقودة والشاذة' : 'Handle missing values and outliers',
      color: 'from-purple-500 to-purple-600',
      tab: 'cleaning'
    },
    {
      icon: BarChart3,
      title: language === 'ar' ? 'التحليل الوصفي' : 'Descriptive Analysis',
      description: language === 'ar' ? 'استكشف إحصائيات بياناتك' : 'Explore your data statistics',
      color: 'from-green-500 to-green-600',
      tab: 'descriptive'
    },
    {
      icon: Brain,
      title: language === 'ar' ? 'الاختبارات الإحصائية' : 'Statistical Tests',
      description: language === 'ar' ? '40+ اختبار إحصائي متقدم' : '40+ advanced statistical tests',
      color: 'from-orange-500 to-orange-600',
      tab: 'tests'
    },
    {
      icon: TrendingUp,
      title: language === 'ar' ? 'التحليل المتقدم' : 'Advanced Analysis',
      description: language === 'ar' ? 'الانحدار، الارتباط، PCA' : 'Regression, Correlation, PCA',
      color: 'from-pink-500 to-pink-600',
      tab: 'advanced'
    },
    {
      icon: PieChart,
      title: language === 'ar' ? 'التصور البصري' : 'Visualization',
      description: language === 'ar' ? 'رسوم بيانية تفاعلية احترافية' : 'Professional interactive charts',
      color: 'from-cyan-500 to-cyan-600',
      tab: 'visualization'
    },
    {
      icon: FileText,
      title: language === 'ar' ? 'التقارير' : 'Reports',
      description: language === 'ar' ? 'تقارير PDF, HTML, Word' : 'PDF, HTML, Word reports',
      color: 'from-teal-500 to-teal-600',
      tab: 'reports'
    },
    {
      icon: Settings,
      title: language === 'ar' ? 'الإعدادات' : 'Settings',
      description: language === 'ar' ? 'تخصيص البرنامج حسب احتياجاتك' : 'Customize the app to your needs',
      color: 'from-gray-500 to-gray-600',
      tab: 'settings'
    }
  ];

  const features = [
    {
      icon: Database,
      title: language === 'ar' ? 'مصادر متعددة' : 'Multiple Sources',
      description: language === 'ar' ? 'استيراد من ملفات، قواعد بيانات، APIs، سحابي' : 'Import from files, databases, APIs, cloud'
    },
    {
      icon: Shield,
      title: language === 'ar' ? 'دقة عالية' : 'High Accuracy',
      description: language === 'ar' ? 'خوارزميات إحصائية موثوقة ومعتمدة' : 'Reliable and validated statistical algorithms'
    },
    {
      icon: LineChart,
      title: language === 'ar' ? '40+ اختبار' : '40+ Tests',
      description: language === 'ar' ? 'اختبارات معلمية ولامعلمية شاملة' : 'Comprehensive parametric & non-parametric tests'
    },
    {
      icon: Layers,
      title: language === 'ar' ? 'تحليل متقدم' : 'Advanced Analysis',
      description: language === 'ar' ? 'PCA، تجميع، انحدار، سلاسل زمنية' : 'PCA, clustering, regression, time series'
    },
    {
      icon: Users,
      title: language === 'ar' ? 'سهل الاستخدام' : 'Easy to Use',
      description: language === 'ar' ? 'واجهة بديهية بالعربية والإنجليزية' : 'Intuitive interface in Arabic & English'
    },
    {
      icon: Clock,
      title: language === 'ar' ? 'أداء عالي' : 'High Performance',
      description: language === 'ar' ? 'معالجة سريعة للبيانات الكبيرة' : 'Fast processing for large datasets'
    }
  ];

  const Arrow = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        
        <div className="relative max-w-7xl mx-auto px-6 py-16 lg:py-24">
          <div className={`flex flex-col lg:flex-row items-center gap-12 ${isRTL ? 'lg:flex-row-reverse' : ''}`}>
            <div className="flex-1 text-center lg:text-start">
              <div className={`inline-flex items-center gap-2 px-4 py-2 bg-white/10 rounded-full backdrop-blur-sm mb-6 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <Sparkles className="w-4 h-4" />
                <span className="text-sm font-medium">
                  {language === 'ar' ? 'الإصدار 2.0 - تحديث جديد!' : 'Version 2.0 - New Update!'}
                </span>
              </div>
              
              <h1 className="text-4xl lg:text-6xl font-bold mb-6 leading-tight">
                {language === 'ar' ? (
                  <>
                    تحليل إحصائي
                    <span className="text-blue-300"> احترافي</span>
                    <br />
                    بين يديك
                  </>
                ) : (
                  <>
                    Professional
                    <span className="text-blue-300"> Statistical</span>
                    <br />
                    Analysis at Your Fingertips
                  </>
                )}
              </h1>
              
              <p className="text-xl text-blue-100 mb-8 max-w-2xl">
                {language === 'ar' 
                  ? 'منصة متكاملة لتحليل البيانات الإحصائية مع أكثر من 40 اختبار إحصائي، وأدوات تصور بصري متقدمة، ودعم كامل للغة العربية.'
                  : 'A comprehensive platform for statistical data analysis with 40+ statistical tests, advanced visualization tools, and full Arabic language support.'
                }
              </p>
              
              <div className={`flex flex-wrap gap-4 justify-center lg:justify-start ${isRTL ? 'lg:justify-end' : ''}`}>
                <button
                  onClick={() => onNavigate('upload')}
                  className={`flex items-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg hover:shadow-xl ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  {language === 'ar' ? 'ابدأ الآن' : 'Get Started'}
                  <Arrow className="w-5 h-5" />
                </button>
                
                <button
                  onClick={() => onNavigate('tests')}
                  className={`flex items-center gap-2 px-8 py-4 bg-white/10 backdrop-blur-sm rounded-xl font-semibold hover:bg-white/20 transition-all border border-white/20 ${isRTL ? 'flex-row-reverse' : ''}`}
                >
                  <Brain className="w-5 h-5" />
                  {language === 'ar' ? 'الاختبارات الإحصائية' : 'Statistical Tests'}
                </button>
              </div>
            </div>
            
            {/* Stats Cards */}
            <div className="flex-1 grid grid-cols-2 gap-4 max-w-md">
              {[
                { value: '40+', label: language === 'ar' ? 'اختبار إحصائي' : 'Statistical Tests' },
                { value: '10+', label: language === 'ar' ? 'مصدر بيانات' : 'Data Sources' },
                { value: '6', label: language === 'ar' ? 'أنواع رسوم' : 'Chart Types' },
                { value: '2', label: language === 'ar' ? 'لغة مدعومة' : 'Languages' },
              ].map((stat, idx) => (
                <div key={idx} className="bg-white/10 backdrop-blur-sm rounded-xl p-6 text-center border border-white/10">
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <div className="text-sm text-blue-200">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
        
        {/* Wave */}
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 120" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M0 120L60 110C120 100 240 80 360 70C480 60 600 60 720 65C840 70 960 80 1080 85C1200 90 1320 90 1380 90L1440 90V120H1380C1320 120 1200 120 1080 120C960 120 840 120 720 120C600 120 480 120 360 120C240 120 120 120 60 120H0Z" fill="#f9fafb"/>
          </svg>
        </div>
      </div>

      {/* Data Status */}
      {data && data.length > 0 && (
        <div className="max-w-7xl mx-auto px-6 -mt-8 relative z-10">
          <div className="bg-white rounded-xl shadow-lg p-6 border border-gray-100">
            <div className={`flex items-center justify-between flex-wrap gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
              <div className={`flex items-center gap-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {language === 'ar' ? 'البيانات جاهزة للتحليل' : 'Data Ready for Analysis'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {data.length} {language === 'ar' ? 'صف' : 'rows'} × {columns.length} {language === 'ar' ? 'عمود' : 'columns'}
                  </p>
                </div>
              </div>
              
              <div className={`flex gap-2 ${isRTL ? 'flex-row-reverse' : ''}`}>
                <button
                  onClick={() => onNavigate('descriptive')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                >
                  {language === 'ar' ? 'تحليل الآن' : 'Analyze Now'}
                </button>
                <button
                  onClick={() => onNavigate('upload')}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                >
                  {language === 'ar' ? 'تغيير البيانات' : 'Change Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            {language === 'ar' ? 'ماذا تريد أن تفعل؟' : 'What would you like to do?'}
          </h2>
          <p className="text-gray-600 max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'اختر من الخيارات أدناه للبدء في تحليل بياناتك'
              : 'Choose from the options below to start analyzing your data'
            }
          </p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {quickActions.map((action, idx) => (
            <button
              key={idx}
              onClick={() => onNavigate(action.tab)}
              className="group bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-lg transition-all duration-300 text-start"
            >
              <div className={`w-12 h-12 bg-gradient-to-br ${action.color} rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                <action.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
                {action.title}
              </h3>
              <p className="text-sm text-gray-500">
                {action.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Features */}
      <div className="bg-white py-16">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              {language === 'ar' ? 'مميزات البرنامج' : 'Features'}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {language === 'ar' 
                ? 'كل ما تحتاجه لتحليل بياناتك بشكل احترافي'
                : 'Everything you need to analyze your data professionally'
              }
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div key={idx} className={`flex gap-4 ${isRTL ? 'flex-row-reverse text-right' : ''}`}>
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <feature.icon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{feature.title}</h3>
                  <p className="text-sm text-gray-500">{feature.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="max-w-7xl mx-auto px-6 py-16">
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 lg:p-12 text-white text-center">
          <h2 className="text-3xl font-bold mb-4">
            {language === 'ar' ? 'ابدأ تحليل بياناتك الآن!' : 'Start Analyzing Your Data Now!'}
          </h2>
          <p className="text-blue-100 mb-8 max-w-2xl mx-auto">
            {language === 'ar' 
              ? 'قم بتحميل ملف البيانات الخاص بك واحصل على تحليل إحصائي شامل في دقائق'
              : 'Upload your data file and get comprehensive statistical analysis in minutes'
            }
          </p>
          <button
            onClick={() => onNavigate('upload')}
            className={`inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 rounded-xl font-semibold hover:bg-blue-50 transition-all shadow-lg ${isRTL ? 'flex-row-reverse' : ''}`}
          >
            <Upload className="w-5 h-5" />
            {language === 'ar' ? 'استيراد البيانات' : 'Import Data'}
          </button>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className={`flex items-center justify-center gap-2 mb-4 ${isRTL ? 'flex-row-reverse' : ''}`}>
            <BarChart3 className="w-6 h-6 text-blue-500" />
            <span className="text-xl font-bold text-white">StatAnalytica</span>
          </div>
          <p className="text-sm">
            {language === 'ar' 
              ? '© 2024 StatAnalytica. جميع الحقوق محفوظة.'
              : '© 2024 StatAnalytica. All rights reserved.'
            }
          </p>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
