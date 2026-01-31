import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n';
import { AIEngine, DataInsight, AIRecommendation, DataProfile, TestRecommendation } from '../ai/AIEngine';
import {
  Brain, Sparkles, Lightbulb, TrendingUp, AlertTriangle, CheckCircle,
  BarChart3, PieChart, LineChart, Zap, Target, FileSearch, Send,
  ChevronRight, ChevronDown, MessageSquare, Bot, User,
  ArrowRight, RefreshCw, Star,
  Eye, Filter, Layers, GitBranch, Activity
} from 'lucide-react';

interface AIAssistantProps {
  data: Record<string, any>[];
  columns: string[];
  onRunTest?: (testName: string, params: any) => void;
  onNavigate?: (tab: string) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

const AIAssistant: React.FC<AIAssistantProps> = ({ data, columns, onRunTest, onNavigate }) => {
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'recommendations' | 'tests' | 'chat'>('overview');
  const [profile, setProfile] = useState<DataProfile | null>(null);
  const [insights, setInsights] = useState<DataInsight[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [testRecommendations, setTestRecommendations] = useState<TestRecommendation[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedInsight, setSelectedInsight] = useState<DataInsight | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [depVariable, setDepVariable] = useState<string>('');
  const [indVariable, setIndVariable] = useState<string>('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data.length > 0) {
      analyzeData();
    }
  }, [data]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const analyzeData = async () => {
    setIsAnalyzing(true);
    try {
      // Simulate async processing
      await new Promise(resolve => setTimeout(resolve, 500));
      
      const engine = new AIEngine(data);
      const summary = engine.getSummary();
      
      setProfile(summary.profile);
      setInsights(summary.insights);
      setRecommendations(summary.recommendations);
      
      // Get test recommendations
      const tests = engine.recommendTests(depVariable || undefined, indVariable || undefined);
      setTestRecommendations(tests);
      
      // Add initial chat message
      if (chatMessages.length === 0) {
        const greeting = language === 'ar' 
          ? `مرحباً! أنا المساعد الإحصائي الذكي. لقد قمت بتحليل بياناتك ووجدت ${summary.insights.length} رؤية و ${summary.recommendations.length} توصية. كيف يمكنني مساعدتك؟`
          : `Hello! I'm your AI Statistical Assistant. I've analyzed your data and found ${summary.insights.length} insights and ${summary.recommendations.length} recommendations. How can I help you?`;
        
        setChatMessages([{
          id: '1',
          role: 'assistant',
          content: greeting,
          timestamp: new Date(),
          suggestions: language === 'ar' 
            ? ['ما هي أهم النتائج؟', 'اقترح اختبار إحصائي', 'كيف أنظف البيانات؟']
            : ['What are the key findings?', 'Suggest a statistical test', 'How do I clean the data?']
        }]);
      }
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleTestRecommendation = () => {
    const engine = new AIEngine(data);
    const tests = engine.recommendTests(depVariable || undefined, indVariable || undefined);
    setTestRecommendations(tests);
  };

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };

    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    // Generate AI response
    setTimeout(() => {
      const response = generateAIResponse(chatInput);
      setChatMessages(prev => [...prev, response]);
    }, 500);
  };

  const generateAIResponse = (query: string): ChatMessage => {
    const lowerQuery = query.toLowerCase();
    let content = '';
    let suggestions: string[] = [];

    // Pattern matching for common questions
    if (lowerQuery.includes('clean') || lowerQuery.includes('تنظيف') || lowerQuery.includes('مفقود')) {
      content = language === 'ar'
        ? `بناءً على تحليل بياناتك:\n\n` +
          `📊 القيم المفقودة: ${profile?.missingPercent.toFixed(1)}%\n` +
          `🔄 الصفوف المكررة: ${profile?.duplicateRows}\n\n` +
          `**التوصيات:**\n` +
          `1. استخدم التعويض بالوسيط للمتغيرات الرقمية (أقل تأثراً بالقيم الشاذة)\n` +
          `2. استخدم المنوال للمتغيرات الفئوية\n` +
          `3. احذف الصفوف المكررة\n` +
          `4. راجع القيم الشاذة قبل التحليل`
        : `Based on your data analysis:\n\n` +
          `📊 Missing values: ${profile?.missingPercent.toFixed(1)}%\n` +
          `🔄 Duplicate rows: ${profile?.duplicateRows}\n\n` +
          `**Recommendations:**\n` +
          `1. Use median imputation for numeric variables (less affected by outliers)\n` +
          `2. Use mode for categorical variables\n` +
          `3. Remove duplicate rows\n` +
          `4. Review outliers before analysis`;
      suggestions = language === 'ar' 
        ? ['كيف أكتشف القيم الشاذة؟', 'ما هو أفضل تحويل للبيانات؟']
        : ['How do I detect outliers?', 'What\'s the best transformation?'];
    }
    else if (lowerQuery.includes('test') || lowerQuery.includes('اختبار') || lowerQuery.includes('إحصائي')) {
      const topTest = testRecommendations[0];
      content = language === 'ar'
        ? `بناءً على نوع بياناتك، أنصح بـ:\n\n` +
          `🎯 **${topTest?.testNameAr || 'اختبار بيرسون للارتباط'}**\n` +
          `📈 درجة الملاءمة: ${topTest?.score || 85}%\n\n` +
          `**السبب:** ${topTest?.reasonAr || 'مناسب للمتغيرات الرقمية'}\n\n` +
          `**الافتراضات:**\n` +
          topTest?.assumptions.map(a => `• ${a.nameAr}: ${a.met ? '✓' : '✗'}`).join('\n')
        : `Based on your data type, I recommend:\n\n` +
          `🎯 **${topTest?.testName || 'Pearson Correlation'}**\n` +
          `📈 Suitability Score: ${topTest?.score || 85}%\n\n` +
          `**Reason:** ${topTest?.reason || 'Suitable for numeric variables'}\n\n` +
          `**Assumptions:**\n` +
          topTest?.assumptions.map(a => `• ${a.name}: ${a.met ? '✓' : '✗'}`).join('\n');
      suggestions = language === 'ar'
        ? ['نفذ هذا الاختبار', 'اقترح اختبار بديل', 'اشرح الافتراضات']
        : ['Run this test', 'Suggest alternative', 'Explain assumptions'];
    }
    else if (lowerQuery.includes('insight') || lowerQuery.includes('رؤ') || lowerQuery.includes('نتائج') || lowerQuery.includes('findings')) {
      content = language === 'ar'
        ? `🔍 **أهم الرؤى من بياناتك:**\n\n` +
          insights.slice(0, 3).map((i, idx) => 
            `${idx + 1}. **${i.titleAr}**\n   ${i.descriptionAr}\n   💡 ${i.suggestionAr}`
          ).join('\n\n')
        : `🔍 **Key Insights from your data:**\n\n` +
          insights.slice(0, 3).map((i, idx) => 
            `${idx + 1}. **${i.title}**\n   ${i.description}\n   💡 ${i.suggestion}`
          ).join('\n\n');
      suggestions = language === 'ar'
        ? ['أظهر المزيد من الرؤى', 'كيف أتعامل مع هذه المشاكل؟']
        : ['Show more insights', 'How do I handle these issues?'];
    }
    else if (lowerQuery.includes('correlation') || lowerQuery.includes('ارتباط') || lowerQuery.includes('علاقة')) {
      const corrInsights = insights.filter(i => i.category === 'correlation');
      content = language === 'ar'
        ? `📊 **تحليل الارتباطات:**\n\n` +
          (corrInsights.length > 0
            ? corrInsights.map(i => `• ${i.titleAr}: ${i.descriptionAr}`).join('\n')
            : 'لم يتم العثور على ارتباطات قوية. جميع العلاقات ضعيفة أو متوسطة.') +
          `\n\n💡 يمكنك استخدام تحليل الارتباط لاستكشاف المزيد.`
        : `📊 **Correlation Analysis:**\n\n` +
          (corrInsights.length > 0
            ? corrInsights.map(i => `• ${i.title}: ${i.description}`).join('\n')
            : 'No strong correlations found. All relationships are weak or moderate.') +
          `\n\n💡 You can use correlation analysis to explore more.`;
      suggestions = language === 'ar'
        ? ['أظهر مصفوفة الارتباط', 'ما هي أقوى العلاقات؟']
        : ['Show correlation matrix', 'What are the strongest relationships?'];
    }
    else {
      content = language === 'ar'
        ? `شكراً لسؤالك! بناءً على تحليل بياناتك:\n\n` +
          `📊 لديك ${profile?.rowCount} صف و ${profile?.columnCount} عمود\n` +
          `🔢 ${profile?.numericColumns.length} متغير رقمي\n` +
          `📝 ${profile?.categoricalColumns.length} متغير فئوي\n` +
          `⭐ جودة البيانات: ${profile?.qualityScore}%\n\n` +
          `هل تريد مساعدة في:\n` +
          `• تنظيف البيانات\n` +
          `• اختيار اختبار إحصائي\n` +
          `• تحليل الارتباطات\n` +
          `• إنشاء تصورات بيانية`
        : `Thanks for your question! Based on your data analysis:\n\n` +
          `📊 You have ${profile?.rowCount} rows and ${profile?.columnCount} columns\n` +
          `🔢 ${profile?.numericColumns.length} numeric variables\n` +
          `📝 ${profile?.categoricalColumns.length} categorical variables\n` +
          `⭐ Data quality: ${profile?.qualityScore}%\n\n` +
          `Would you like help with:\n` +
          `• Cleaning the data\n` +
          `• Choosing a statistical test\n` +
          `• Analyzing correlations\n` +
          `• Creating visualizations`;
      suggestions = language === 'ar'
        ? ['تنظيف البيانات', 'اختيار اختبار', 'تحليل الارتباط']
        : ['Clean data', 'Choose test', 'Correlation analysis'];
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions
    };
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'pattern': return <GitBranch className="w-4 h-4" />;
      case 'anomaly': return <AlertTriangle className="w-4 h-4" />;
      case 'correlation': return <Activity className="w-4 h-4" />;
      case 'trend': return <TrendingUp className="w-4 h-4" />;
      case 'distribution': return <BarChart3 className="w-4 h-4" />;
      case 'quality': return <Target className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'pattern': return 'bg-purple-100 text-purple-700';
      case 'anomaly': return 'bg-red-100 text-red-700';
      case 'correlation': return 'bg-blue-100 text-blue-700';
      case 'trend': return 'bg-green-100 text-green-700';
      case 'distribution': return 'bg-yellow-100 text-yellow-700';
      case 'quality': return 'bg-orange-100 text-orange-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-700 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-700 border-green-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  if (!data.length) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <Brain className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-lg font-medium">
          {language === 'ar' ? 'لا توجد بيانات للتحليل' : 'No data to analyze'}
        </p>
        <p className="text-sm text-gray-400 mt-2">
          {language === 'ar' ? 'قم بتحميل البيانات أولاً' : 'Please upload data first'}
        </p>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-6">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Brain className="w-8 h-8" />
          </div>
          <div className="flex-1">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Sparkles className="w-6 h-6" />
              {language === 'ar' ? 'المساعد الإحصائي الذكي' : 'AI Statistical Assistant'}
            </h2>
            <p className="text-purple-100 mt-1">
              {language === 'ar' 
                ? 'تحليل ذكي وتوصيات مخصصة لبياناتك'
                : 'Smart analysis and personalized recommendations for your data'}
            </p>
          </div>
          <button
            onClick={analyzeData}
            disabled={isAnalyzing}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
            {language === 'ar' ? 'تحديث' : 'Refresh'}
          </button>
        </div>

        {/* Quick Stats */}
        {profile && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">{profile.rowCount.toLocaleString()}</div>
              <div className="text-purple-100 text-sm">{language === 'ar' ? 'صف' : 'Rows'}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">{profile.columnCount}</div>
              <div className="text-purple-100 text-sm">{language === 'ar' ? 'عمود' : 'Columns'}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">{insights.length}</div>
              <div className="text-purple-100 text-sm">{language === 'ar' ? 'رؤية' : 'Insights'}</div>
            </div>
            <div className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
              <div className="text-3xl font-bold">{profile.qualityScore}%</div>
              <div className="text-purple-100 text-sm">{language === 'ar' ? 'جودة البيانات' : 'Data Quality'}</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex overflow-x-auto">
          {[
            { id: 'overview', icon: <Layers className="w-4 h-4" />, label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
            { id: 'insights', icon: <Lightbulb className="w-4 h-4" />, label: language === 'ar' ? 'الرؤى' : 'Insights' },
            { id: 'recommendations', icon: <Target className="w-4 h-4" />, label: language === 'ar' ? 'التوصيات' : 'Recommendations' },
            { id: 'tests', icon: <FileSearch className="w-4 h-4" />, label: language === 'ar' ? 'الاختبارات' : 'Tests' },
            { id: 'chat', icon: <MessageSquare className="w-4 h-4" />, label: language === 'ar' ? 'المحادثة' : 'Chat' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors whitespace-nowrap ${
                activeTab === tab.id
                  ? 'text-purple-600 border-b-2 border-purple-600 bg-purple-50'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.id === 'insights' && insights.length > 0 && (
                <span className="bg-purple-100 text-purple-600 text-xs px-2 py-0.5 rounded-full">
                  {insights.length}
                </span>
              )}
            </button>
          ))}
        </nav>
      </div>

      {/* Content */}
      <div className="p-6">
        {isAnalyzing ? (
          <div className="flex flex-col items-center justify-center py-12">
            <div className="w-16 h-16 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin mb-4" />
            <p className="text-gray-600 font-medium">
              {language === 'ar' ? 'جاري تحليل البيانات...' : 'Analyzing data...'}
            </p>
          </div>
        ) : (
          <>
            {/* Overview Tab */}
            {activeTab === 'overview' && profile && (
              <div className="space-y-6">
                {/* Data Types Distribution */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center text-white">
                        #
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-blue-700">{profile.numericColumns.length}</div>
                        <div className="text-sm text-blue-600">{language === 'ar' ? 'رقمي' : 'Numeric'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center text-white">
                        <PieChart className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-green-700">{profile.categoricalColumns.length}</div>
                        <div className="text-sm text-green-600">{language === 'ar' ? 'فئوي' : 'Categorical'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center text-white">
                        📅
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-purple-700">{profile.dateColumns.length}</div>
                        <div className="text-sm text-purple-600">{language === 'ar' ? 'تاريخ' : 'Date'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-500 rounded-lg flex items-center justify-center text-white">
                        📝
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-orange-700">{profile.textColumns.length}</div>
                        <div className="text-sm text-orange-600">{language === 'ar' ? 'نصي' : 'Text'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-4 border border-pink-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-pink-500 rounded-lg flex items-center justify-center text-white">
                        ✓
                      </div>
                      <div>
                        <div className="text-2xl font-bold text-pink-700">{profile.booleanColumns.length}</div>
                        <div className="text-sm text-pink-600">{language === 'ar' ? 'منطقي' : 'Boolean'}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quality Indicators */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Target className="w-5 h-5 text-purple-600" />
                    {language === 'ar' ? 'مؤشرات جودة البيانات' : 'Data Quality Indicators'}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Missing Values */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">{language === 'ar' ? 'القيم المفقودة' : 'Missing Values'}</span>
                        <span className={`font-medium ${profile.missingPercent < 5 ? 'text-green-600' : profile.missingPercent < 20 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {profile.missingPercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${profile.missingPercent < 5 ? 'bg-green-500' : profile.missingPercent < 20 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, profile.missingPercent)}%` }}
                        />
                      </div>
                    </div>
                    {/* Duplicates */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">{language === 'ar' ? 'التكرارات' : 'Duplicates'}</span>
                        <span className={`font-medium ${profile.duplicatePercent < 1 ? 'text-green-600' : profile.duplicatePercent < 5 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {profile.duplicatePercent.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${profile.duplicatePercent < 1 ? 'bg-green-500' : profile.duplicatePercent < 5 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${Math.min(100, profile.duplicatePercent * 10)}%` }}
                        />
                      </div>
                    </div>
                    {/* Quality Score */}
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-gray-600">{language === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}</span>
                        <span className={`font-medium ${profile.qualityScore >= 80 ? 'text-green-600' : profile.qualityScore >= 60 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {profile.qualityScore}%
                        </span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className={`h-full rounded-full transition-all ${profile.qualityScore >= 80 ? 'bg-green-500' : profile.qualityScore >= 60 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${profile.qualityScore}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Column Details */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600" />
                    {language === 'ar' ? 'تفاصيل الأعمدة' : 'Column Details'}
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="text-left text-gray-600 text-sm">
                          <th className="pb-3 font-medium">{language === 'ar' ? 'العمود' : 'Column'}</th>
                          <th className="pb-3 font-medium">{language === 'ar' ? 'النوع' : 'Type'}</th>
                          <th className="pb-3 font-medium">{language === 'ar' ? 'المفقودة' : 'Missing'}</th>
                          <th className="pb-3 font-medium">{language === 'ar' ? 'الفريدة' : 'Unique'}</th>
                          <th className="pb-3 font-medium">{language === 'ar' ? 'الإحصائيات' : 'Statistics'}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {profile.columns.slice(0, 10).map(col => (
                          <tr key={col.name} className="text-sm">
                            <td className="py-3 font-medium text-gray-900">{col.name}</td>
                            <td className="py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                col.type === 'numeric' ? 'bg-blue-100 text-blue-700' :
                                col.type === 'categorical' ? 'bg-green-100 text-green-700' :
                                col.type === 'datetime' ? 'bg-purple-100 text-purple-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {language === 'ar' 
                                  ? col.type === 'numeric' ? 'رقمي' : col.type === 'categorical' ? 'فئوي' : col.type === 'datetime' ? 'تاريخ' : 'نصي'
                                  : col.type}
                              </span>
                            </td>
                            <td className="py-3">
                              <span className={col.stats.missingPercent > 10 ? 'text-red-600' : 'text-gray-600'}>
                                {col.stats.missingPercent.toFixed(1)}%
                              </span>
                            </td>
                            <td className="py-3 text-gray-600">{col.stats.unique}</td>
                            <td className="py-3 text-gray-600 text-xs">
                              {col.type === 'numeric' && col.stats.mean !== undefined ? (
                                <span>
                                  μ={col.stats.mean.toFixed(2)}, σ={col.stats.std?.toFixed(2)}
                                </span>
                              ) : col.type === 'categorical' && col.stats.mode ? (
                                <span>Mode: {col.stats.mode}</span>
                              ) : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* Insights Tab */}
            {activeTab === 'insights' && (
              <div className="space-y-4">
                {insights.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Lightbulb className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>{language === 'ar' ? 'لا توجد رؤى حالياً' : 'No insights available'}</p>
                  </div>
                ) : (
                  insights.map(insight => (
                    <div 
                      key={insight.id}
                      className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedInsight(selectedInsight?.id === insight.id ? null : insight)}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getCategoryColor(insight.category)}`}>
                          {getCategoryIcon(insight.category)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-gray-900">
                              {language === 'ar' ? insight.titleAr : insight.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(insight.category)}`}>
                                {language === 'ar' 
                                  ? insight.category === 'quality' ? 'جودة' : 
                                    insight.category === 'anomaly' ? 'شاذ' :
                                    insight.category === 'correlation' ? 'ارتباط' :
                                    insight.category === 'distribution' ? 'توزيع' : 'نمط'
                                  : insight.category}
                              </span>
                              <div className="flex items-center gap-1">
                                {[...Array(Math.round(insight.importance * 5))].map((_, i) => (
                                  <Star key={i} className="w-3 h-3 text-yellow-400 fill-current" />
                                ))}
                              </div>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mt-1">
                            {language === 'ar' ? insight.descriptionAr : insight.description}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            {insight.affectedColumns.map(col => (
                              <span key={col} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                                {col}
                              </span>
                            ))}
                          </div>
                          {selectedInsight?.id === insight.id && (
                            <div className="mt-4 pt-4 border-t border-gray-100">
                              <div className="flex items-start gap-2 text-green-700 bg-green-50 p-3 rounded-lg">
                                <Lightbulb className="w-4 h-4 mt-0.5" />
                                <span className="text-sm">
                                  {language === 'ar' ? insight.suggestionAr : insight.suggestion}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Recommendations Tab */}
            {activeTab === 'recommendations' && (
              <div className="space-y-4">
                {recommendations.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Target className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>{language === 'ar' ? 'لا توجد توصيات حالياً' : 'No recommendations available'}</p>
                  </div>
                ) : (
                  recommendations.map((rec, idx) => (
                    <div 
                      key={idx}
                      className={`bg-white border rounded-xl p-5 hover:shadow-lg transition-shadow ${getPriorityColor(rec.priority)}`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                          rec.type === 'cleaning' ? 'bg-orange-100 text-orange-600' :
                          rec.type === 'analysis' ? 'bg-blue-100 text-blue-600' :
                          rec.type === 'test' ? 'bg-purple-100 text-purple-600' :
                          rec.type === 'visualization' ? 'bg-green-100 text-green-600' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {rec.type === 'cleaning' ? <Zap className="w-5 h-5" /> :
                           rec.type === 'analysis' ? <BarChart3 className="w-5 h-5" /> :
                           rec.type === 'test' ? <FileSearch className="w-5 h-5" /> :
                           rec.type === 'visualization' ? <LineChart className="w-5 h-5" /> :
                           <Lightbulb className="w-5 h-5" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <h4 className="font-semibold text-gray-900">
                              {language === 'ar' ? rec.titleAr : rec.title}
                            </h4>
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                rec.priority === 'high' ? 'bg-red-100 text-red-700' :
                                rec.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-green-100 text-green-700'
                              }`}>
                                {language === 'ar' 
                                  ? rec.priority === 'high' ? 'عالية' : rec.priority === 'medium' ? 'متوسطة' : 'منخفضة'
                                  : rec.priority}
                              </span>
                              <span className="text-sm text-gray-500">
                                {Math.round(rec.confidence * 100)}%
                              </span>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mt-1">
                            {language === 'ar' ? rec.descriptionAr : rec.description}
                          </p>
                          <div className="flex gap-2 mt-3">
                            <button 
                              className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-1"
                              onClick={() => onNavigate?.(rec.type === 'cleaning' ? 'cleaning' : rec.type === 'test' ? 'tests' : 'analysis')}
                            >
                              <ArrowRight className="w-4 h-4" />
                              {language === 'ar' ? 'تطبيق' : 'Apply'}
                            </button>
                            <button className="px-3 py-1.5 text-gray-600 text-sm rounded-lg hover:bg-gray-100 transition-colors flex items-center gap-1">
                              <Eye className="w-4 h-4" />
                              {language === 'ar' ? 'تفاصيل' : 'Details'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* Tests Tab */}
            {activeTab === 'tests' && (
              <div className="space-y-6">
                {/* Variable Selection */}
                <div className="bg-purple-50 rounded-xl p-5 border border-purple-100">
                  <h4 className="font-semibold text-purple-900 mb-4 flex items-center gap-2">
                    <Filter className="w-5 h-5" />
                    {language === 'ar' ? 'اختر المتغيرات للتحليل' : 'Select Variables for Analysis'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'ar' ? 'المتغير التابع (الناتج)' : 'Dependent Variable (Outcome)'}
                      </label>
                      <select
                        value={depVariable}
                        onChange={(e) => setDepVariable(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">{language === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                        {columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {language === 'ar' ? 'المتغير المستقل (المتنبئ)' : 'Independent Variable (Predictor)'}
                      </label>
                      <select
                        value={indVariable}
                        onChange={(e) => setIndVariable(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="">{language === 'ar' ? '-- اختر --' : '-- Select --'}</option>
                        {columns.map(col => (
                          <option key={col} value={col}>{col}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    onClick={handleTestRecommendation}
                    className="mt-4 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <Sparkles className="w-4 h-4" />
                    {language === 'ar' ? 'اقتراح الاختبارات' : 'Suggest Tests'}
                  </button>
                </div>

                {/* Test Recommendations */}
                <div className="space-y-4">
                  {testRecommendations.map((test, idx) => (
                    <div 
                      key={idx}
                      className={`bg-white border rounded-xl p-5 hover:shadow-lg transition-shadow ${
                        idx === 0 ? 'border-purple-300 ring-2 ring-purple-100' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                          idx === 0 ? 'bg-purple-100 text-purple-600' : 
                          idx === 1 ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <h4 className="font-semibold text-gray-900">
                                {language === 'ar' ? test.testNameAr : test.testName}
                              </h4>
                              <span className="text-xs text-gray-500">
                                {language === 'ar' ? test.categoryAr : test.category}
                              </span>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-purple-600">{test.score}%</div>
                              <div className="text-xs text-gray-500">{language === 'ar' ? 'ملاءمة' : 'Match'}</div>
                            </div>
                          </div>
                          <p className="text-gray-600 text-sm mt-2">
                            {language === 'ar' ? test.reasonAr : test.reason}
                          </p>
                          
                          {/* Assumptions */}
                          <div className="mt-3">
                            <button
                              onClick={() => toggleSection(`test_${idx}`)}
                              className="text-sm text-purple-600 flex items-center gap-1"
                            >
                              {expandedSections[`test_${idx}`] ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                              {language === 'ar' ? 'الافتراضات والمتطلبات' : 'Assumptions & Requirements'}
                            </button>
                            {expandedSections[`test_${idx}`] && (
                              <div className="mt-2 space-y-2">
                                {test.assumptions.map((a, i) => (
                                  <div key={i} className="flex items-center gap-2 text-sm">
                                    {a.met 
                                      ? <CheckCircle className="w-4 h-4 text-green-500" />
                                      : <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                    }
                                    <span className={a.met ? 'text-green-700' : 'text-yellow-700'}>
                                      {language === 'ar' ? a.nameAr : a.name}
                                    </span>
                                  </div>
                                ))}
                                {test.alternative && (
                                  <p className="text-sm text-gray-500 mt-2">
                                    {language === 'ar' ? 'البديل: ' : 'Alternative: '}
                                    <span className="font-medium">
                                      {language === 'ar' ? test.alternativeAr : test.alternative}
                                    </span>
                                  </p>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="flex gap-2 mt-4">
                            <button 
                              className="px-4 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                              onClick={() => onRunTest?.(test.testName, { dep: depVariable, ind: indVariable })}
                            >
                              <Zap className="w-4 h-4" />
                              {language === 'ar' ? 'تنفيذ الاختبار' : 'Run Test'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Chat Tab */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-[500px]">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto space-y-4 mb-4">
                  {chatMessages.map(msg => (
                    <div 
                      key={msg.id}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        msg.role === 'user' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                      </div>
                      <div className={`max-w-[80%] ${msg.role === 'user' ? 'text-right' : ''}`}>
                        <div className={`rounded-2xl px-4 py-3 ${
                          msg.role === 'user' 
                            ? 'bg-purple-600 text-white rounded-br-none' 
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}>
                          <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                        </div>
                        {msg.suggestions && msg.suggestions.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {msg.suggestions.map((s, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setChatInput(s);
                                  handleSendMessage();
                                }}
                                className="text-xs bg-white border border-purple-200 text-purple-600 px-3 py-1.5 rounded-full hover:bg-purple-50 transition-colors"
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="text-xs text-gray-400 mt-1">
                          {msg.timestamp.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={chatEndRef} />
                </div>

                {/* Input */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!chatInput.trim()}
                    className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default AIAssistant;
