import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n';
import { professionalAIEngine, TestResult, RegressionResult } from '../ai/ProfessionalAIEngine';
import {
  ResponsiveContainer,
  PieChart, Pie, Cell, Tooltip
} from 'recharts';
import {
  Bot, Send, TrendingUp, AlertTriangle, CheckCircle,
  BarChart3, Activity, Lightbulb, FileText,
  ChevronDown, ChevronUp, Copy, Download,
  MessageSquare, Brain, Zap, Shield, Database
} from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
  data?: any;
}

interface ProfessionalAIAssistantProps {
  data: any[];
}

// Color constants for pie charts
const _PIE_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];
void _PIE_COLORS;

export const ProfessionalAIAssistant: React.FC<ProfessionalAIAssistantProps> = ({ data }) => {
  const { language, isRTL } = useLanguage();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'analysis' | 'tests' | 'report'>('chat');
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [regressionResult, setRegressionResult] = useState<RegressionResult | null>(null);
  const [selectedVars, setSelectedVars] = useState<{ dep: string; indep: string; group: string }>({ dep: '', indep: '', group: '' });
  const [expandedSection, setExpandedSection] = useState<string | null>('overview');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data && data.length > 0) {
      professionalAIEngine.loadData(data);
      
      // Welcome message
      const welcomeMsg: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: language === 'ar'
          ? `# 👋 مرحباً بك في المساعد الإحصائي الذكي!\n\nتم تحميل البيانات بنجاح:\n\n| المعلومة | القيمة |\n|----------|--------|\n| عدد السجلات | ${data.length} |\n| عدد المتغيرات | ${Object.keys(data[0]).length} |\n| المتغيرات الرقمية | ${professionalAIEngine.getNumericColumns().length} |\n| المتغيرات الفئوية | ${professionalAIEngine.getCategoricalColumns().length} |\n\nيمكنني مساعدتك في:\n- 📊 التحليل الوصفي الشامل\n- 🔬 الاختبارات الإحصائية\n- 📈 تحليل الارتباط والانحدار\n- 🎯 اقتراح الاختبار المناسب\n\nاسألني أي سؤال!`
          : `# 👋 Welcome to the Intelligent Statistical Assistant!\n\nData loaded successfully:\n\n| Info | Value |\n|------|-------|\n| Records | ${data.length} |\n| Variables | ${Object.keys(data[0]).length} |\n| Numeric Variables | ${professionalAIEngine.getNumericColumns().length} |\n| Categorical Variables | ${professionalAIEngine.getCategoricalColumns().length} |\n\nI can help you with:\n- 📊 Comprehensive descriptive analysis\n- 🔬 Statistical tests\n- 📈 Correlation and regression analysis\n- 🎯 Test recommendations\n\nAsk me anything!`,
        timestamp: new Date(),
        suggestions: language === 'ar'
          ? ['أعطني ملخص البيانات', 'تحليل الارتباطات', 'ما الاختبار المناسب؟', 'هل توجد قيم مفقودة؟']
          : ['Give me a data summary', 'Analyze correlations', 'What test is suitable?', 'Are there missing values?']
      };
      setMessages([welcomeMsg]);
    }
  }, [data, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate typing delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    const response = professionalAIEngine.chat(input, language as 'ar' | 'en');

    const assistantMessage: Message = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: response.response,
      timestamp: new Date(),
      suggestions: response.suggestions,
      data: response.data
    };

    setMessages(prev => [...prev, assistantMessage]);
    setIsTyping(false);
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const renderMarkdown = (text: string) => {
    // Simple markdown renderer
    let html = text
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-4 mb-2 text-gray-800">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-4 mb-3 text-gray-900">$1</h2>')
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-3 text-gray-900">$1</h1>')
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-gray-900">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^• (.*$)/gim, '<li class="ml-4 mb-1">$1</li>')
      .replace(/\n/g, '<br/>');

    // Handle tables
    const tableRegex = /\|(.+)\|\n\|[-|]+\|\n((?:\|.+\|\n?)+)/g;
    html = html.replace(tableRegex, (_match, header, body) => {
      const headers = header.split('|').filter((h: string) => h.trim());
      const rows = body.trim().split('<br/>').filter((r: string) => r.includes('|'));
      
      let table = '<div class="overflow-x-auto my-4"><table class="min-w-full border-collapse border border-gray-200 rounded-lg overflow-hidden">';
      table += '<thead class="bg-gradient-to-r from-indigo-500 to-purple-500 text-white"><tr>';
      headers.forEach((h: string) => {
        table += `<th class="px-4 py-2 text-sm font-semibold border-b border-gray-200">${h.trim()}</th>`;
      });
      table += '</tr></thead><tbody>';
      
      rows.forEach((row: string, idx: number) => {
        const cells = row.split('|').filter((c: string) => c.trim());
        const bgClass = idx % 2 === 0 ? 'bg-white' : 'bg-gray-50';
        table += `<tr class="${bgClass} hover:bg-indigo-50 transition-colors">`;
        cells.forEach((c: string) => {
          table += `<td class="px-4 py-2 text-sm text-gray-700 border-b border-gray-100">${c.trim()}</td>`;
        });
        table += '</tr>';
      });
      
      table += '</tbody></table></div>';
      return table;
    });

    return <div dangerouslySetInnerHTML={{ __html: html }} />;
  };

  const runTest = (testType: string) => {
    try {
      let result: TestResult;
      
      switch (testType) {
        case 'independent-t':
          if (selectedVars.dep && selectedVars.indep) {
            result = professionalAIEngine.performTTest(selectedVars.dep, selectedVars.indep, false);
            setTestResult(result);
          }
          break;
        case 'paired-t':
          if (selectedVars.dep && selectedVars.indep) {
            result = professionalAIEngine.performTTest(selectedVars.dep, selectedVars.indep, true);
            setTestResult(result);
          }
          break;
        case 'anova':
          if (selectedVars.dep && selectedVars.group) {
            result = professionalAIEngine.performANOVA(selectedVars.dep, selectedVars.group);
            setTestResult(result);
          }
          break;
        case 'chi-square':
          if (selectedVars.dep && selectedVars.indep) {
            result = professionalAIEngine.performChiSquare(selectedVars.dep, selectedVars.indep);
            setTestResult(result);
          }
          break;
        case 'regression':
          if (selectedVars.dep && selectedVars.indep) {
            const regResult = professionalAIEngine.performRegression(selectedVars.dep, [selectedVars.indep]);
            setRegressionResult(regResult);
          }
          break;
      }
    } catch (error) {
      console.error('Test error:', error);
    }
  };

  const columns = professionalAIEngine.getColumns();
  const numericColumns = professionalAIEngine.getNumericColumns();
  const categoricalColumns = professionalAIEngine.getCategoricalColumns();
  const correlations = professionalAIEngine.getCorrelationMatrix();
  const quality = data.length > 0 ? professionalAIEngine.getDataQuality() : null;

  const tabs = [
    { id: 'chat', icon: MessageSquare, label: language === 'ar' ? 'المحادثة' : 'Chat' },
    { id: 'analysis', icon: BarChart3, label: language === 'ar' ? 'التحليل' : 'Analysis' },
    { id: 'tests', icon: Zap, label: language === 'ar' ? 'الاختبارات' : 'Tests' },
    { id: 'report', icon: FileText, label: language === 'ar' ? 'التقرير' : 'Report' }
  ];

  return (
    <div className={`h-full flex flex-col bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 text-white p-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/20 rounded-xl backdrop-blur-sm">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-xl font-bold">
                {language === 'ar' ? 'المساعد الإحصائي الذكي' : 'Intelligent Statistical Assistant'}
              </h1>
              <p className="text-sm text-white/80">
                {language === 'ar' ? 'تحليلات متقدمة بالذكاء الاصطناعي' : 'AI-Powered Advanced Analytics'}
              </p>
            </div>
          </div>
          
          {/* Quick Stats */}
          <div className="flex gap-4">
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold">{data.length}</div>
              <div className="text-xs text-white/70">{language === 'ar' ? 'سجل' : 'Records'}</div>
            </div>
            <div className="text-center px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
              <div className="text-2xl font-bold">{columns.length}</div>
              <div className="text-xs text-white/70">{language === 'ar' ? 'متغير' : 'Variables'}</div>
            </div>
            {quality && (
              <div className="text-center px-4 py-2 bg-white/10 rounded-lg backdrop-blur-sm">
                <div className="text-2xl font-bold">{quality.score.toFixed(0)}%</div>
                <div className="text-xs text-white/70">{language === 'ar' ? 'الجودة' : 'Quality'}</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200 px-4 shadow-sm">
        <div className="flex gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-3 font-medium transition-all border-b-2 ${
                activeTab === tab.id
                  ? 'text-indigo-600 border-indigo-600 bg-indigo-50'
                  : 'text-gray-500 border-transparent hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <div
                  key={message.id}
                  className={`flex ${message.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}
                >
                  <div className={`max-w-4xl ${message.role === 'user' ? 'order-1' : 'order-2'}`}>
                    <div className={`flex items-start gap-3 ${message.role === 'user' ? (isRTL ? 'flex-row-reverse' : 'flex-row') : (isRTL ? 'flex-row-reverse' : 'flex-row')}`}>
                      {/* Avatar */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600'
                          : 'bg-gradient-to-br from-purple-500 to-pink-500'
                      }`}>
                        {message.role === 'user' ? (
                          <span className="text-white font-bold text-sm">U</span>
                        ) : (
                          <Bot className="w-5 h-5 text-white" />
                        )}
                      </div>
                      
                      {/* Message Content */}
                      <div className={`rounded-2xl p-4 ${
                        message.role === 'user'
                          ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                          : 'bg-white border border-gray-200 shadow-sm'
                      }`}>
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none">
                            {renderMarkdown(message.content)}
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                        
                        {/* Copy button for assistant */}
                        {message.role === 'assistant' && (
                          <button
                            onClick={() => copyToClipboard(message.content)}
                            className="mt-2 text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
                          >
                            <Copy className="w-3 h-3" />
                            {language === 'ar' ? 'نسخ' : 'Copy'}
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {/* Suggestions */}
                    {message.suggestions && message.suggestions.length > 0 && (
                      <div className={`mt-3 flex flex-wrap gap-2 ${isRTL ? 'mr-13' : 'ml-13'}`}>
                        {message.suggestions.map((suggestion, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSuggestionClick(suggestion)}
                            className="px-3 py-1.5 text-sm bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors border border-indigo-200"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Typing indicator */}
              {isTyping && (
                <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="max-w-4xl mx-auto">
                <div className="flex gap-3">
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!input.trim()}
                    className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 shadow-lg shadow-indigo-500/25"
                  >
                    <Send className="w-5 h-5" />
                    <span className="hidden sm:inline">{language === 'ar' ? 'إرسال' : 'Send'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analysis' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-6">
              {/* Data Quality Card */}
              {quality && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div 
                    className="p-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white cursor-pointer flex items-center justify-between"
                    onClick={() => setExpandedSection(expandedSection === 'quality' ? null : 'quality')}
                  >
                    <div className="flex items-center gap-3">
                      <Shield className="w-6 h-6" />
                      <h2 className="text-lg font-bold">{language === 'ar' ? 'جودة البيانات' : 'Data Quality'}</h2>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold">{quality.score.toFixed(0)}%</span>
                      {expandedSection === 'quality' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                    </div>
                  </div>
                  
                  {expandedSection === 'quality' && (
                    <div className="p-4">
                      <div className="grid grid-cols-4 gap-4">
                        {[
                          { label: language === 'ar' ? 'الاكتمال' : 'Completeness', value: quality.completeness, color: 'from-green-400 to-green-600' },
                          { label: language === 'ar' ? 'الصحة' : 'Validity', value: quality.validity, color: 'from-blue-400 to-blue-600' },
                          { label: language === 'ar' ? 'التفرد' : 'Uniqueness', value: quality.uniqueness, color: 'from-purple-400 to-purple-600' },
                          { label: language === 'ar' ? 'الإجمالي' : 'Overall', value: quality.score, color: 'from-indigo-400 to-indigo-600' }
                        ].map((item, idx) => (
                          <div key={idx} className="text-center">
                            <div className="relative w-20 h-20 mx-auto mb-2">
                              <svg className="w-20 h-20 transform -rotate-90">
                                <circle cx="40" cy="40" r="35" fill="none" stroke="#e5e7eb" strokeWidth="6" />
                                <circle
                                  cx="40" cy="40" r="35" fill="none"
                                  stroke="url(#gradient)"
                                  strokeWidth="6"
                                  strokeLinecap="round"
                                  strokeDasharray={`${item.value * 2.2} 220`}
                                />
                              </svg>
                              <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-lg font-bold text-gray-700">{item.value.toFixed(0)}%</span>
                              </div>
                            </div>
                            <p className="text-sm font-medium text-gray-600">{item.label}</p>
                          </div>
                        ))}
                      </div>
                      
                      {quality.issues.length > 0 && (
                        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <h3 className="font-semibold text-amber-800 mb-2">
                            {language === 'ar' ? 'المشاكل المكتشفة:' : 'Issues Found:'}
                          </h3>
                          <ul className="text-sm text-amber-700 space-y-1">
                            {quality.issues.map((issue, idx) => (
                              <li key={idx}>• {language === 'ar' ? issue.ar : issue.en}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Variables Overview */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div 
                  className="p-4 bg-gradient-to-r from-blue-500 to-cyan-500 text-white cursor-pointer flex items-center justify-between"
                  onClick={() => setExpandedSection(expandedSection === 'overview' ? null : 'overview')}
                >
                  <div className="flex items-center gap-3">
                    <Database className="w-6 h-6" />
                    <h2 className="text-lg font-bold">{language === 'ar' ? 'نظرة عامة على المتغيرات' : 'Variables Overview'}</h2>
                  </div>
                  {expandedSection === 'overview' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                </div>
                
                {expandedSection === 'overview' && (
                  <div className="p-4">
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Variable Types Chart */}
                      <div>
                        <h3 className="text-sm font-semibold text-gray-700 mb-3">
                          {language === 'ar' ? 'توزيع أنواع المتغيرات' : 'Variable Types Distribution'}
                        </h3>
                        <ResponsiveContainer width="100%" height={200}>
                          <PieChart>
                            <Pie
                              data={[
                                { name: language === 'ar' ? 'رقمي' : 'Numeric', value: numericColumns.length },
                                { name: language === 'ar' ? 'فئوي' : 'Categorical', value: categoricalColumns.length }
                              ]}
                              cx="50%"
                              cy="50%"
                              innerRadius={50}
                              outerRadius={80}
                              paddingAngle={5}
                              dataKey="value"
                              label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                            >
                              <Cell fill="#6366f1" />
                              <Cell fill="#8b5cf6" />
                            </Pie>
                            <Tooltip />
                          </PieChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Variables Table */}
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-right font-semibold text-gray-700">
                                {language === 'ar' ? 'المتغير' : 'Variable'}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700">
                                {language === 'ar' ? 'النوع' : 'Type'}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700">
                                {language === 'ar' ? 'المفقودة' : 'Missing'}
                              </th>
                              <th className="px-3 py-2 text-center font-semibold text-gray-700">
                                {language === 'ar' ? 'الفريدة' : 'Unique'}
                              </th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100">
                            {columns.slice(0, 10).map((col, idx) => (
                              <tr key={idx} className="hover:bg-gray-50">
                                <td className="px-3 py-2 font-medium text-gray-900">{col.name}</td>
                                <td className="px-3 py-2 text-center">
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                    col.type === 'numeric' ? 'bg-blue-100 text-blue-700' :
                                    col.type === 'categorical' ? 'bg-purple-100 text-purple-700' :
                                    'bg-gray-100 text-gray-700'
                                  }`}>
                                    {col.type === 'numeric' ? (language === 'ar' ? 'رقمي' : 'Numeric') :
                                     col.type === 'categorical' ? (language === 'ar' ? 'فئوي' : 'Categorical') :
                                     col.type}
                                  </span>
                                </td>
                                <td className="px-3 py-2 text-center">
                                  {col.missing > 0 ? (
                                    <span className="text-red-600">{col.missing}</span>
                                  ) : (
                                    <CheckCircle className="w-4 h-4 text-green-500 mx-auto" />
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center text-gray-600">{col.unique}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Numeric Statistics */}
              {numericColumns.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div 
                    className="p-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white cursor-pointer flex items-center justify-between"
                    onClick={() => setExpandedSection(expandedSection === 'numeric' ? null : 'numeric')}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-6 h-6" />
                      <h2 className="text-lg font-bold">{language === 'ar' ? 'الإحصاءات الرقمية' : 'Numeric Statistics'}</h2>
                    </div>
                    {expandedSection === 'numeric' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  
                  {expandedSection === 'numeric' && (
                    <div className="p-4 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-3 py-2 text-right font-semibold text-gray-700">{language === 'ar' ? 'المتغير' : 'Variable'}</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">N</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">{language === 'ar' ? 'المتوسط' : 'Mean'}</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">{language === 'ar' ? 'الوسيط' : 'Median'}</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">SD</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">Min</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">Max</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">{language === 'ar' ? 'الالتواء' : 'Skew'}</th>
                            <th className="px-3 py-2 text-center font-semibold text-gray-700">{language === 'ar' ? 'التوزيع' : 'Dist.'}</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {numericColumns.map((col, idx) => col.stats && (
                            <tr key={idx} className="hover:bg-gray-50">
                              <td className="px-3 py-2 font-medium text-gray-900">{col.name}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{col.stats.count}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{col.stats.mean.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{col.stats.median.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{col.stats.std.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{col.stats.min.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{col.stats.max.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center text-gray-600">{col.stats.skewness.toFixed(2)}</td>
                              <td className="px-3 py-2 text-center">
                                {col.stats.isNormal ? (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded-full text-xs">✓</span>
                                ) : (
                                  <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs">✗</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Correlations */}
              {correlations.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div 
                    className="p-4 bg-gradient-to-r from-orange-500 to-red-500 text-white cursor-pointer flex items-center justify-between"
                    onClick={() => setExpandedSection(expandedSection === 'correlations' ? null : 'correlations')}
                  >
                    <div className="flex items-center gap-3">
                      <Activity className="w-6 h-6" />
                      <h2 className="text-lg font-bold">{language === 'ar' ? 'الارتباطات' : 'Correlations'}</h2>
                    </div>
                    {expandedSection === 'correlations' ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
                  </div>
                  
                  {expandedSection === 'correlations' && (
                    <div className="p-4">
                      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {correlations.sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson)).slice(0, 9).map((corr, idx) => (
                          <div key={idx} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <p className="font-medium text-gray-900 text-sm">{corr.var1}</p>
                                <p className="text-xs text-gray-500">↔ {corr.var2}</p>
                              </div>
                              <span className={`text-lg font-bold ${
                                corr.pearson > 0.5 ? 'text-green-600' :
                                corr.pearson < -0.5 ? 'text-red-600' :
                                'text-gray-600'
                              }`}>
                                {corr.pearson.toFixed(3)}
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                              <div
                                className={`h-2 rounded-full ${
                                  corr.pearson > 0 ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${Math.abs(corr.pearson) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-gray-500 mt-2">
                              {language === 'ar' ? corr.interpretation.ar : corr.interpretation.en}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'tests' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-5xl mx-auto">
              {/* Test Selection */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-indigo-600" />
                  {language === 'ar' ? 'اختر الاختبار الإحصائي' : 'Select Statistical Test'}
                </h2>
                
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  {[
                    { id: 'independent-t', name: language === 'ar' ? 'اختبار t المستقل' : 'Independent T-Test', icon: '📊' },
                    { id: 'paired-t', name: language === 'ar' ? 'اختبار t المزدوج' : 'Paired T-Test', icon: '🔄' },
                    { id: 'anova', name: language === 'ar' ? 'تحليل التباين' : 'ANOVA', icon: '📈' },
                    { id: 'chi-square', name: language === 'ar' ? 'كاي تربيع' : 'Chi-Square', icon: '🎲' },
                    { id: 'regression', name: language === 'ar' ? 'الانحدار الخطي' : 'Linear Regression', icon: '📉' }
                  ].map(test => (
                    <button
                      key={test.id}
                      onClick={() => setSelectedTest(test.id)}
                      className={`p-4 rounded-xl border-2 transition-all text-right ${
                        selectedTest === test.id
                          ? 'border-indigo-500 bg-indigo-50'
                          : 'border-gray-200 hover:border-indigo-300'
                      }`}
                    >
                      <span className="text-2xl mb-2 block">{test.icon}</span>
                      <span className="font-medium text-gray-900">{test.name}</span>
                    </button>
                  ))}
                </div>

                {/* Variable Selection */}
                {selectedTest && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="font-semibold text-gray-800 mb-4">
                      {language === 'ar' ? 'اختر المتغيرات' : 'Select Variables'}
                    </h3>
                    
                    <div className="grid md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'ar' ? 'المتغير التابع / الأول' : 'Dependent / First Variable'}
                        </label>
                        <select
                          value={selectedVars.dep}
                          onChange={(e) => setSelectedVars(prev => ({ ...prev, dep: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">{language === 'ar' ? 'اختر...' : 'Select...'}</option>
                          {(selectedTest === 'chi-square' ? columns : numericColumns).map(col => (
                            <option key={col.name} value={col.name}>{col.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {language === 'ar' ? 'المتغير المستقل / الثاني' : 'Independent / Second Variable'}
                        </label>
                        <select
                          value={selectedVars.indep}
                          onChange={(e) => setSelectedVars(prev => ({ ...prev, indep: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        >
                          <option value="">{language === 'ar' ? 'اختر...' : 'Select...'}</option>
                          {(selectedTest === 'chi-square' ? columns : numericColumns).map(col => (
                            <option key={col.name} value={col.name}>{col.name}</option>
                          ))}
                        </select>
                      </div>
                      
                      {selectedTest === 'anova' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            {language === 'ar' ? 'متغير التجميع' : 'Grouping Variable'}
                          </label>
                          <select
                            value={selectedVars.group}
                            onChange={(e) => setSelectedVars(prev => ({ ...prev, group: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                          >
                            <option value="">{language === 'ar' ? 'اختر...' : 'Select...'}</option>
                            {categoricalColumns.map(col => (
                              <option key={col.name} value={col.name}>{col.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={() => runTest(selectedTest)}
                      disabled={!selectedVars.dep || (!selectedVars.indep && selectedTest !== 'anova') || (selectedTest === 'anova' && !selectedVars.group)}
                      className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      <Zap className="w-5 h-5" />
                      {language === 'ar' ? 'تنفيذ الاختبار' : 'Run Test'}
                    </button>
                  </div>
                )}
              </div>

              {/* Test Results */}
              {testResult && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className={`p-4 ${testResult.pValue < 0.05 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'} text-white`}>
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      {testResult.pValue < 0.05 ? <CheckCircle className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                      {language === 'ar' ? testResult.testName.ar : testResult.testName.en}
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    {/* Key Statistics */}
                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-indigo-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">{language === 'ar' ? 'الإحصائي' : 'Statistic'}</p>
                        <p className="text-2xl font-bold text-indigo-600">{testResult.statistic.toFixed(4)}</p>
                      </div>
                      <div className={`text-center p-4 rounded-xl ${testResult.pValue < 0.05 ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <p className="text-sm text-gray-600 mb-1">p-value</p>
                        <p className={`text-2xl font-bold ${testResult.pValue < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                          {testResult.pValue < 0.001 ? '< 0.001' : testResult.pValue.toFixed(4)}
                        </p>
                      </div>
                      {testResult.df && (
                        <div className="text-center p-4 bg-purple-50 rounded-xl">
                          <p className="text-sm text-gray-600 mb-1">{language === 'ar' ? 'درجات الحرية' : 'df'}</p>
                          <p className="text-2xl font-bold text-purple-600">{testResult.df.toFixed(2)}</p>
                        </div>
                      )}
                      {testResult.effectSize && (
                        <div className="text-center p-4 bg-orange-50 rounded-xl">
                          <p className="text-sm text-gray-600 mb-1">{language === 'ar' ? 'حجم الأثر' : 'Effect Size'}</p>
                          <p className="text-2xl font-bold text-orange-600">{testResult.effectSize.value.toFixed(3)}</p>
                        </div>
                      )}
                    </div>

                    {/* Conclusion */}
                    <div className={`p-4 rounded-xl mb-6 ${testResult.pValue < 0.05 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        {testResult.pValue < 0.05 ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-5 h-5 text-gray-600" />
                        )}
                        {language === 'ar' ? 'الاستنتاج' : 'Conclusion'}
                      </h3>
                      <p className={testResult.pValue < 0.05 ? 'text-green-700' : 'text-gray-700'}>
                        {language === 'ar' ? testResult.conclusion.ar : testResult.conclusion.en}
                      </p>
                    </div>

                    {/* Interpretation */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl mb-6">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-blue-600" />
                        {language === 'ar' ? 'التفسير' : 'Interpretation'}
                      </h3>
                      <p className="text-blue-700">
                        {language === 'ar' ? testResult.interpretation.ar : testResult.interpretation.en}
                      </p>
                    </div>

                    {/* Effect Size Interpretation */}
                    {testResult.effectSize && (
                      <div className="p-4 bg-orange-50 border border-orange-200 rounded-xl">
                        <h3 className="font-semibold mb-2">
                          {language === 'ar' ? 'تفسير حجم الأثر' : 'Effect Size Interpretation'}
                        </h3>
                        <p className="text-orange-700">
                          {language === 'ar' ? testResult.effectSize.interpretation.ar : testResult.effectSize.interpretation.en}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Regression Results */}
              {regressionResult && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mt-6">
                  <div className="p-4 bg-gradient-to-r from-blue-500 to-indigo-500 text-white">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {language === 'ar' ? 'نتائج الانحدار الخطي' : 'Linear Regression Results'}
                    </h2>
                  </div>
                  
                  <div className="p-6">
                    {/* Equation */}
                    <div className="p-4 bg-indigo-50 rounded-xl mb-6 text-center">
                      <p className="text-sm text-gray-600 mb-2">{language === 'ar' ? 'معادلة الانحدار' : 'Regression Equation'}</p>
                      <p className="text-xl font-mono font-bold text-indigo-700">{regressionResult.equation}</p>
                    </div>

                    {/* Key Statistics */}
                    <div className="grid md:grid-cols-4 gap-4 mb-6">
                      <div className="text-center p-4 bg-blue-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">R²</p>
                        <p className="text-2xl font-bold text-blue-600">{(regressionResult.rSquared * 100).toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-4 bg-purple-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">{language === 'ar' ? 'R² المعدل' : 'Adj. R²'}</p>
                        <p className="text-2xl font-bold text-purple-600">{(regressionResult.adjustedRSquared * 100).toFixed(1)}%</p>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-xl">
                        <p className="text-sm text-gray-600 mb-1">F-Statistic</p>
                        <p className="text-2xl font-bold text-green-600">{regressionResult.fStatistic.toFixed(2)}</p>
                      </div>
                      <div className={`text-center p-4 rounded-xl ${regressionResult.pValue < 0.05 ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <p className="text-sm text-gray-600 mb-1">p-value</p>
                        <p className={`text-2xl font-bold ${regressionResult.pValue < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                          {regressionResult.pValue < 0.001 ? '< 0.001' : regressionResult.pValue.toFixed(4)}
                        </p>
                      </div>
                    </div>

                    {/* Coefficients Table */}
                    <div className="overflow-x-auto mb-6">
                      <table className="min-w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-4 py-2 text-right font-semibold">{language === 'ar' ? 'المعامل' : 'Coefficient'}</th>
                            <th className="px-4 py-2 text-center font-semibold">{language === 'ar' ? 'القيمة' : 'Value'}</th>
                            <th className="px-4 py-2 text-center font-semibold">SE</th>
                            <th className="px-4 py-2 text-center font-semibold">t</th>
                            <th className="px-4 py-2 text-center font-semibold">p-value</th>
                            <th className="px-4 py-2 text-center font-semibold">{language === 'ar' ? 'الدلالة' : 'Sig.'}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {regressionResult.coefficients.map((coef, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="px-4 py-2 font-medium">{coef.name}</td>
                              <td className="px-4 py-2 text-center">{coef.value.toFixed(4)}</td>
                              <td className="px-4 py-2 text-center">{coef.se.toFixed(4)}</td>
                              <td className="px-4 py-2 text-center">{coef.t.toFixed(4)}</td>
                              <td className="px-4 py-2 text-center">{coef.pValue.toFixed(4)}</td>
                              <td className="px-4 py-2 text-center">
                                {coef.pValue < 0.001 ? '***' : coef.pValue < 0.01 ? '**' : coef.pValue < 0.05 ? '*' : ''}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Interpretation */}
                    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
                      <h3 className="font-semibold mb-2 flex items-center gap-2">
                        <Lightbulb className="w-5 h-5 text-blue-600" />
                        {language === 'ar' ? 'التفسير' : 'Interpretation'}
                      </h3>
                      <p className="text-blue-700">
                        {language === 'ar' ? regressionResult.interpretation.ar : regressionResult.interpretation.en}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'report' && (
          <div className="h-full overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-indigo-600" />
                    {language === 'ar' ? 'التقرير الإحصائي' : 'Statistical Report'}
                  </h2>
                  <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg flex items-center gap-2 hover:bg-indigo-700">
                    <Download className="w-4 h-4" />
                    {language === 'ar' ? 'تصدير' : 'Export'}
                  </button>
                </div>

                {data.length > 0 && (
                  <div className="prose max-w-none">
                    {renderMarkdown(professionalAIEngine.chat(language === 'ar' ? 'ملخص البيانات' : 'Data summary', language as 'ar' | 'en').response)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfessionalAIAssistant;
