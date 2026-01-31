import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import {
  BarChart3, Upload, Sparkles, FileText, Brain, TrendingUp,
  PieChart, GitBranch, CheckCircle, ArrowRight, Play,
  Zap, Shield, Globe, ChevronRight,
  BarChart2, LineChart, Activity, Target,
  BookOpen, Rocket, Mail
} from 'lucide-react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis,
  Tooltip, PieChart as RechartsPie, Pie, Cell
} from 'recharts';

interface ProfessionalHomePageProps {
  onNavigate: (tab: string, subTab?: string) => void;
  data: any[] | null;
}

const ProfessionalHomePage: React.FC<ProfessionalHomePageProps> = ({ onNavigate, data }) => {
  const { language, isRTL } = useLanguage();
  const [activeFeature, setActiveFeature] = useState(0);
  const [animatedStats, setAnimatedStats] = useState({ users: 0, tests: 0, accuracy: 0, reports: 0 });
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    // Animate statistics
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;
    
    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      setAnimatedStats({
        users: Math.floor(10000 * progress),
        tests: Math.floor(50 * progress),
        accuracy: Math.floor(99.9 * progress * 10) / 10,
        reports: Math.floor(100000 * progress)
      });
      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  // Auto-rotate features
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveFeature(prev => (prev + 1) % 6);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  // Sample chart data
  const activityData = [
    { name: language === 'ar' ? 'يناير' : 'Jan', value: 400 },
    { name: language === 'ar' ? 'فبراير' : 'Feb', value: 300 },
    { name: language === 'ar' ? 'مارس' : 'Mar', value: 600 },
    { name: language === 'ar' ? 'أبريل' : 'Apr', value: 800 },
    { name: language === 'ar' ? 'مايو' : 'May', value: 500 },
    { name: language === 'ar' ? 'يونيو' : 'Jun', value: 900 },
  ];

  const analysisTypes = [
    { name: language === 'ar' ? 'وصفي' : 'Descriptive', value: 35, color: '#3B82F6' },
    { name: language === 'ar' ? 'استدلالي' : 'Inferential', value: 30, color: '#8B5CF6' },
    { name: language === 'ar' ? 'انحدار' : 'Regression', value: 20, color: '#10B981' },
    { name: language === 'ar' ? 'تجميع' : 'Clustering', value: 15, color: '#F59E0B' },
  ];

  const features = [
    {
      icon: Upload,
      title: language === 'ar' ? 'استيراد متعدد المصادر' : 'Multi-Source Import',
      description: language === 'ar' 
        ? 'استيراد البيانات من Excel, CSV, JSON, قواعد البيانات، والمصادر السحابية'
        : 'Import data from Excel, CSV, JSON, databases, and cloud sources',
      color: 'from-blue-500 to-cyan-500',
      stats: language === 'ar' ? '+15 صيغة مدعومة' : '+15 Formats Supported'
    },
    {
      icon: Sparkles,
      title: language === 'ar' ? 'تنظيف ذكي للبيانات' : 'Smart Data Cleaning',
      description: language === 'ar'
        ? 'معالجة القيم المفقودة والشاذة تلقائياً باستخدام خوارزميات متقدمة'
        : 'Automatically handle missing and outlier values using advanced algorithms',
      color: 'from-purple-500 to-pink-500',
      stats: language === 'ar' ? '+20 طريقة تنظيف' : '+20 Cleaning Methods'
    },
    {
      icon: BarChart3,
      title: language === 'ar' ? 'تحليل وصفي شامل' : 'Comprehensive Descriptive Analysis',
      description: language === 'ar'
        ? 'إحصائيات وصفية متكاملة مع رسوم بيانية تفاعلية'
        : 'Complete descriptive statistics with interactive charts',
      color: 'from-green-500 to-emerald-500',
      stats: language === 'ar' ? '+30 مقياس إحصائي' : '+30 Statistical Measures'
    },
    {
      icon: Brain,
      title: language === 'ar' ? 'اختبارات إحصائية متقدمة' : 'Advanced Statistical Tests',
      description: language === 'ar'
        ? 'أكثر من 50 اختبار إحصائي مع اختيار ذكي للاختبار المناسب'
        : 'Over 50 statistical tests with smart test selection',
      color: 'from-orange-500 to-red-500',
      stats: language === 'ar' ? '+50 اختبار' : '+50 Tests'
    },
    {
      icon: TrendingUp,
      title: language === 'ar' ? 'تحليل متقدم وتنبؤ' : 'Advanced Analysis & Prediction',
      description: language === 'ar'
        ? 'انحدار، سلاسل زمنية، تجميع، وتحليل المكونات الرئيسية'
        : 'Regression, time series, clustering, and PCA',
      color: 'from-indigo-500 to-purple-500',
      stats: language === 'ar' ? '+15 نموذج تحليلي' : '+15 Analytical Models'
    },
    {
      icon: FileText,
      title: language === 'ar' ? 'تقارير احترافية' : 'Professional Reports',
      description: language === 'ar'
        ? 'إنشاء تقارير احترافية قابلة للتصدير بصيغ متعددة'
        : 'Create professional reports exportable in multiple formats',
      color: 'from-teal-500 to-cyan-500',
      stats: language === 'ar' ? 'PDF, HTML, Word' : 'PDF, HTML, Word'
    }
  ];

  const quickActions = [
    { icon: Upload, label: language === 'ar' ? 'استيراد البيانات' : 'Import Data', tab: 'upload', color: 'bg-blue-500' },
    { icon: Sparkles, label: language === 'ar' ? 'تنظيف البيانات' : 'Clean Data', tab: 'cleaning', color: 'bg-purple-500' },
    { icon: BarChart3, label: language === 'ar' ? 'تحليل وصفي' : 'Descriptive', tab: 'descriptive', color: 'bg-green-500' },
    { icon: Brain, label: language === 'ar' ? 'اختبارات إحصائية' : 'Statistical Tests', tab: 'tests', color: 'bg-orange-500' },
    { icon: TrendingUp, label: language === 'ar' ? 'تحليل متقدم' : 'Advanced', tab: 'advanced', color: 'bg-indigo-500' },
    { icon: FileText, label: language === 'ar' ? 'التقارير' : 'Reports', tab: 'reports', color: 'bg-teal-500' },
  ];

  const statisticalTests = [
    { name: 'T-Test', icon: '📊' },
    { name: 'ANOVA', icon: '📈' },
    { name: 'Chi-Square', icon: '🔢' },
    { name: 'Mann-Whitney', icon: '📉' },
    { name: 'Pearson', icon: '🔗' },
    { name: 'Spearman', icon: '📐' },
    { name: 'Shapiro-Wilk', icon: '🎯' },
    { name: 'Regression', icon: '📏' },
  ];

  return (
    <div className={`min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse"></div>
          <div className="absolute top-0 right-1/4 w-96 h-96 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '1s' }}></div>
          <div className="absolute bottom-0 left-1/2 w-96 h-96 bg-indigo-400 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-pulse" style={{ animationDelay: '2s' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16">
          <div className="text-center">
            {/* Badge */}
            <div className={`inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-blue-100 to-purple-100 border border-blue-200 mb-6 transform transition-all duration-700 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">
                {language === 'ar' ? 'الإصدار 2.0 - تجربة محسّنة بالكامل' : 'Version 2.0 - Fully Enhanced Experience'}
              </span>
            </div>

            {/* Main Title */}
            <h1 className={`text-5xl md:text-7xl font-bold mb-6 transform transition-all duration-700 delay-100 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
              <span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">
                StatAnalytica
              </span>
            </h1>

            {/* Subtitle */}
            <p className={`text-xl md:text-2xl text-gray-600 mb-4 max-w-3xl mx-auto transform transition-all duration-700 delay-200 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
              {language === 'ar' 
                ? 'منصة التحليل الإحصائي المتكاملة المدعومة بالذكاء الاصطناعي'
                : 'AI-Powered Integrated Statistical Analysis Platform'}
            </p>

            <p className={`text-lg text-gray-500 mb-8 max-w-2xl mx-auto transform transition-all duration-700 delay-300 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
              {language === 'ar'
                ? 'حلل بياناتك بدقة واحترافية. من الاستيراد إلى التقرير النهائي في خطوات بسيطة.'
                : 'Analyze your data with precision and professionalism. From import to final report in simple steps.'}
            </p>

            {/* CTA Buttons */}
            <div className={`flex flex-wrap justify-center gap-4 mb-12 transform transition-all duration-700 delay-400 ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-10 opacity-0'}`}>
              <button
                onClick={() => onNavigate('upload')}
                className="group relative px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <Rocket className="w-5 h-5" />
                  {language === 'ar' ? 'ابدأ التحليل الآن' : 'Start Analysis Now'}
                  <ArrowRight className={`w-5 h-5 transition-transform group-hover:translate-x-1 ${isRTL ? 'rotate-180 group-hover:-translate-x-1' : ''}`} />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              </button>

              <button
                onClick={() => onNavigate('help')}
                className="group px-8 py-4 bg-white text-gray-700 rounded-xl font-semibold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 border border-gray-200"
              >
                <span className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-blue-600" />
                  {language === 'ar' ? 'شاهد الشرح' : 'Watch Demo'}
                </span>
              </button>
            </div>

            {/* Stats */}
            <div className={`grid grid-cols-2 md:grid-cols-4 gap-6 max-w-4xl mx-auto transform transition-all duration-700 delay-500 ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0'}`}>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                <div className="text-3xl md:text-4xl font-bold text-blue-600 mb-1">
                  {animatedStats.users.toLocaleString()}+
                </div>
                <div className="text-gray-600 text-sm">
                  {language === 'ar' ? 'مستخدم نشط' : 'Active Users'}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                <div className="text-3xl md:text-4xl font-bold text-purple-600 mb-1">
                  {animatedStats.tests}+
                </div>
                <div className="text-gray-600 text-sm">
                  {language === 'ar' ? 'اختبار إحصائي' : 'Statistical Tests'}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                <div className="text-3xl md:text-4xl font-bold text-green-600 mb-1">
                  {animatedStats.accuracy}%
                </div>
                <div className="text-gray-600 text-sm">
                  {language === 'ar' ? 'دقة النتائج' : 'Results Accuracy'}
                </div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50">
                <div className="text-3xl md:text-4xl font-bold text-orange-600 mb-1">
                  {(animatedStats.reports / 1000).toFixed(0)}K+
                </div>
                <div className="text-gray-600 text-sm">
                  {language === 'ar' ? 'تقرير تم إنشاؤه' : 'Reports Generated'}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      {data && data.length > 0 && (
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="bg-gradient-to-r from-green-500 to-emerald-600 rounded-2xl p-6 shadow-xl">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-white">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle className="w-6 h-6" />
                    {language === 'ar' ? 'البيانات جاهزة للتحليل!' : 'Data Ready for Analysis!'}
                  </h3>
                  <p className="text-green-100">
                    {language === 'ar' 
                      ? `تم تحميل ${data.length} صف. اختر نوع التحليل للبدء.`
                      : `${data.length} rows loaded. Choose analysis type to start.`}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {quickActions.slice(1).map((action, index) => (
                    <button
                      key={index}
                      onClick={() => onNavigate(action.tab)}
                      className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-all duration-200"
                    >
                      <action.icon className="w-4 h-4" />
                      {action.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Features Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              {language === 'ar' ? 'كل ما تحتاجه في مكان واحد' : 'Everything You Need in One Place'}
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              {language === 'ar'
                ? 'أدوات متكاملة للتحليل الإحصائي من البداية إلى النهاية'
                : 'Complete tools for statistical analysis from start to finish'}
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className={`group relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-2xl transition-all duration-500 cursor-pointer border border-gray-100 overflow-hidden ${
                  activeFeature === index ? 'ring-2 ring-blue-500 ring-offset-2' : ''
                }`}
                onClick={() => setActiveFeature(index)}
                onMouseEnter={() => setActiveFeature(index)}
              >
                {/* Background Gradient on Hover */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-5 transition-opacity duration-500`}></div>
                
                {/* Icon */}
                <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                  <feature.icon className="w-7 h-7 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold text-gray-800 mb-2 group-hover:text-blue-600 transition-colors">
                  {feature.title}
                </h3>
                <p className="text-gray-600 mb-4 text-sm leading-relaxed">
                  {feature.description}
                </p>

                {/* Stats Badge */}
                <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r ${feature.color} bg-opacity-10`}>
                  <Zap className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">{feature.stats}</span>
                </div>

                {/* Arrow */}
                <div className={`absolute bottom-6 ${isRTL ? 'left-6' : 'right-6'} opacity-0 group-hover:opacity-100 transition-all duration-300 transform group-hover:translate-x-0 ${isRTL ? '-translate-x-2' : 'translate-x-2'}`}>
                  <ChevronRight className={`w-6 h-6 text-blue-600 ${isRTL ? 'rotate-180' : ''}`} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Statistical Tests Showcase */}
      <section className="py-16 px-4 bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              {language === 'ar' ? 'اختبارات إحصائية شاملة' : 'Comprehensive Statistical Tests'}
            </h2>
            <p className="text-blue-200 max-w-2xl mx-auto">
              {language === 'ar'
                ? 'أكثر من 50 اختبار إحصائي يغطي جميع احتياجاتك التحليلية'
                : 'Over 50 statistical tests covering all your analytical needs'}
            </p>
          </div>

          {/* Scrolling Tests */}
          <div className="relative overflow-hidden py-8">
            <div className="flex gap-4 animate-scroll">
              {[...statisticalTests, ...statisticalTests].map((test, index) => (
                <div
                  key={index}
                  className="flex-shrink-0 bg-white/10 backdrop-blur-sm rounded-xl px-6 py-4 border border-white/20 hover:bg-white/20 transition-all duration-300"
                >
                  <span className="text-2xl mr-2">{test.icon}</span>
                  <span className="text-white font-medium">{test.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Test Categories */}
          <div className="grid md:grid-cols-4 gap-6 mt-8">
            {[
              { title: language === 'ar' ? 'اختبارات معلمية' : 'Parametric Tests', count: '15+', icon: BarChart2, color: 'from-blue-500 to-cyan-500' },
              { title: language === 'ar' ? 'اختبارات لامعلمية' : 'Non-Parametric', count: '12+', icon: Activity, color: 'from-purple-500 to-pink-500' },
              { title: language === 'ar' ? 'اختبارات ارتباط' : 'Correlation Tests', count: '8+', icon: GitBranch, color: 'from-green-500 to-emerald-500' },
              { title: language === 'ar' ? 'اختبارات توزيع' : 'Distribution Tests', count: '10+', icon: LineChart, color: 'from-orange-500 to-red-500' },
            ].map((category, index) => (
              <div
                key={index}
                className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 group cursor-pointer"
                onClick={() => onNavigate('tests')}
              >
                <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${category.color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                  <category.icon className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-bold mb-1">{category.title}</h3>
                <p className="text-3xl font-bold text-blue-400">{category.count}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Interactive Demo Section */}
      <section className="py-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-gray-800 mb-6">
                {language === 'ar' ? 'تحليلات تفاعلية في الوقت الفعلي' : 'Real-Time Interactive Analytics'}
              </h2>
              <p className="text-gray-600 mb-8 text-lg">
                {language === 'ar'
                  ? 'شاهد نتائج التحليل فور تحميل البيانات. رسوم بيانية تفاعلية وإحصائيات دقيقة.'
                  : 'See analysis results immediately after loading data. Interactive charts and accurate statistics.'}
              </p>

              <div className="space-y-4">
                {[
                  { icon: Zap, text: language === 'ar' ? 'تحليل فوري للبيانات' : 'Instant data analysis' },
                  { icon: PieChart, text: language === 'ar' ? 'رسوم بيانية تفاعلية' : 'Interactive charts' },
                  { icon: Target, text: language === 'ar' ? 'نتائج دقيقة وموثوقة' : 'Accurate and reliable results' },
                  { icon: Brain, text: language === 'ar' ? 'اقتراحات ذكية' : 'Smart suggestions' },
                ].map((item, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <item.icon className="w-5 h-5 text-blue-600" />
                    </div>
                    <span className="text-gray-700 font-medium">{item.text}</span>
                  </div>
                ))}
              </div>

              <button
                onClick={() => onNavigate('upload')}
                className="mt-8 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-2"
              >
                {language === 'ar' ? 'جرب الآن مجاناً' : 'Try Now for Free'}
                <ArrowRight className={`w-5 h-5 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>

            {/* Charts Demo */}
            <div className="space-y-6">
              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <h4 className="text-gray-700 font-semibold mb-4">
                  {language === 'ar' ? 'نشاط التحليل' : 'Analysis Activity'}
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={activityData}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} />
                    <YAxis hide />
                    <Tooltip />
                    <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorValue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-white rounded-2xl p-6 shadow-xl">
                <h4 className="text-gray-700 font-semibold mb-4">
                  {language === 'ar' ? 'أنواع التحليل' : 'Analysis Types'}
                </h4>
                <ResponsiveContainer width="100%" height={200}>
                  <RechartsPie>
                    <Pie
                      data={analysisTypes}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {analysisTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-4 mt-4">
                  {analysisTypes.map((type, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full" style={{ backgroundColor: type.color }}></div>
                      <span className="text-sm text-gray-600">{type.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-center shadow-2xl relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0" style={{
                backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)',
                backgroundSize: '20px 20px'
              }}></div>
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                {language === 'ar' ? 'ابدأ تحليل بياناتك الآن' : 'Start Analyzing Your Data Now'}
              </h2>
              <p className="text-blue-100 mb-8 text-lg max-w-2xl mx-auto">
                {language === 'ar'
                  ? 'انضم إلى آلاف المستخدمين الذين يثقون في StatAnalytica لتحليل بياناتهم'
                  : 'Join thousands of users who trust StatAnalytica to analyze their data'}
              </p>

              <div className="flex flex-wrap justify-center gap-4">
                <button
                  onClick={() => onNavigate('upload')}
                  className="px-8 py-4 bg-white text-blue-600 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-2"
                >
                  <Upload className="w-5 h-5" />
                  {language === 'ar' ? 'رفع البيانات' : 'Upload Data'}
                </button>
                <button
                  onClick={() => onNavigate('help')}
                  className="px-8 py-4 bg-white/20 text-white rounded-xl font-bold text-lg hover:bg-white/30 transition-all duration-300 flex items-center gap-2"
                >
                  <BookOpen className="w-5 h-5" />
                  {language === 'ar' ? 'تعلم المزيد' : 'Learn More'}
                </button>
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-6 mt-8 text-white/80">
                <div className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm">{language === 'ar' ? 'آمن 100%' : '100% Secure'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-5 h-5" />
                  <span className="text-sm">{language === 'ar' ? 'سريع وفعال' : 'Fast & Efficient'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-5 h-5" />
                  <span className="text-sm">{language === 'ar' ? 'عربي / English' : 'Arabic / English'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg">StatAnalytica</span>
                <span className="text-gray-400 text-sm block">v2.0.0</span>
              </div>
            </div>

            <div className="text-center">
              <p className="text-gray-400 text-sm">
                {language === 'ar' ? 'تم التطوير بواسطة' : 'Developed by'}{' '}
                <span className="text-blue-400 font-semibold">Essam Sabbah</span>
              </p>
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => onNavigate('help', 'contact')}
                className="text-gray-400 hover:text-white transition-colors flex items-center gap-2 group"
                title={language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
              >
                <Mail className="w-5 h-5 group-hover:scale-110 transition-transform" />
                <span className="text-sm hidden md:inline group-hover:text-blue-400">
                  {language === 'ar' ? 'تواصل معنا' : 'Contact Us'}
                </span>
              </button>
              <span className="text-gray-400 text-sm">
                © 2024 StatAnalytica
              </span>
            </div>
          </div>
        </div>
      </footer>

      {/* CSS for scrolling animation */}
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(0); }
          100% { transform: translateX(-50%); }
        }
        .animate-scroll {
          animation: scroll 20s linear infinite;
        }
        .animate-scroll:hover {
          animation-play-state: paused;
        }
      `}</style>
    </div>
  );
};

export default ProfessionalHomePage;
