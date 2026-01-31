import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n';
import SmartChatEngine, { ChatMessage, DataAnalysis } from '../ai/SmartChatEngine';
import {
  MessageCircle, Send, Trash2, Sparkles, BarChart3, AlertCircle,
  TrendingUp, Database, Lightbulb, ChevronRight, Bot, User,
  RefreshCw, Copy, Check, Zap, Brain, Target
} from 'lucide-react';

interface SmartChatProps {
  data: Record<string, any>[];
  columns: string[];
}

const SmartChat: React.FC<SmartChatProps> = ({ data, columns }) => {
  const { language, isRTL } = useLanguage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [analysis, setAnalysis] = useState<DataAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'insights' | 'quality'>('chat');
  const [copied, setCopied] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatEngineRef = useRef<SmartChatEngine | null>(null);

  // تهيئة محرك الدردشة
  useEffect(() => {
    chatEngineRef.current = new SmartChatEngine(language);
  }, [language]);

  // تحميل البيانات وتحليلها
  useEffect(() => {
    if (data && data.length > 0 && chatEngineRef.current) {
      try {
        const result = chatEngineRef.current.loadData(data);
        setAnalysis(result);
        
        // رسالة ترحيب تلقائية
        const welcomeMessage: ChatMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: language === 'ar'
            ? `👋 مرحباً! أنا مساعدك الإحصائي الذكي.

تم تحميل بياناتك بنجاح:
• **${data.length.toLocaleString()}** صف
• **${columns.length}** عمود
• **${result.columns.filter(c => c.type === 'numeric').length}** متغير رقمي
• **${result.columns.filter(c => c.type === 'categorical').length}** متغير فئوي
• **جودة البيانات:** ${result.quality.overallScore.toFixed(0)}%

كيف يمكنني مساعدتك اليوم؟ يمكنك سؤالي عن:
- تحليل البيانات وإحصائياتها
- القيم المفقودة والشاذة
- الارتباطات بين المتغيرات
- اقتراح الاختبارات المناسبة`
            : `👋 Hello! I'm your Smart Statistical Assistant.

Your data has been loaded successfully:
• **${data.length.toLocaleString()}** rows
• **${columns.length}** columns
• **${result.columns.filter(c => c.type === 'numeric').length}** numeric variables
• **${result.columns.filter(c => c.type === 'categorical').length}** categorical variables
• **Data Quality:** ${result.quality.overallScore.toFixed(0)}%

How can I help you today? You can ask me about:
- Data analysis and statistics
- Missing and outlier values
- Correlations between variables
- Suitable test recommendations`,
          timestamp: new Date(),
          suggestions: language === 'ar'
            ? ['ملخص البيانات', 'فحص القيم المفقودة', 'تحليل الارتباطات', 'اقتراح اختبارات']
            : ['Data summary', 'Check missing values', 'Analyze correlations', 'Suggest tests']
        };
        
        setMessages([welcomeMessage]);
      } catch (error) {
        console.error('Error loading data:', error);
      }
    }
  }, [data, columns, language]);

  // التمرير لأسفل عند إضافة رسالة جديدة
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || !chatEngineRef.current) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    try {
      // محاكاة التأخير للكتابة
      await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
      
      const response = await chatEngineRef.current.chat(input);
      setMessages(prev => [...prev, response]);
    } catch (error) {
      console.error('Chat error:', error);
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: language === 'ar'
          ? '❌ عذراً، حدث خطأ. يرجى المحاولة مرة أخرى.'
          : '❌ Sorry, an error occurred. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInput(suggestion);
  };

  const handleClearChat = () => {
    if (chatEngineRef.current) {
      chatEngineRef.current.clearHistory();
    }
    setMessages([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatMessageContent = (content: string) => {
    // تحويل Markdown بسيط
    return content
      .split('\n')
      .map((line, i) => {
        // العناوين
        if (line.startsWith('## ')) {
          return <h2 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-800">{line.slice(3)}</h2>;
        }
        if (line.startsWith('### ')) {
          return <h3 key={i} className="text-md font-semibold mt-3 mb-1 text-gray-700">{line.slice(4)}</h3>;
        }
        
        // الجداول
        if (line.startsWith('|')) {
          return null; // سيتم معالجة الجداول بشكل منفصل
        }
        
        // القوائم
        if (line.startsWith('- ')) {
          const formattedLine = line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return (
            <li key={i} className="ml-4 text-gray-600" dangerouslySetInnerHTML={{ __html: `• ${formattedLine}` }} />
          );
        }
        
        // النص العادي مع تنسيق Bold
        if (line.trim()) {
          const formattedLine = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          return <p key={i} className="text-gray-600 my-1" dangerouslySetInnerHTML={{ __html: formattedLine }} />;
        }
        
        return <br key={i} />;
      });
  };

  // استخراج الجداول من المحتوى
  const extractTables = (content: string) => {
    const lines = content.split('\n');
    const tables: { headers: string[]; rows: string[][] }[] = [];
    let currentTable: { headers: string[]; rows: string[][] } | null = null;
    let isHeader = true;
    
    for (const line of lines) {
      if (line.startsWith('|') && !line.includes('---')) {
        const cells = line.split('|').filter(c => c.trim()).map(c => c.trim());
        if (isHeader && !currentTable) {
          currentTable = { headers: cells, rows: [] };
          isHeader = false;
        } else if (currentTable) {
          currentTable.rows.push(cells);
        }
      } else if (line.includes('---') && currentTable) {
        // تجاهل خط الفاصل
      } else if (currentTable && !line.startsWith('|')) {
        tables.push(currentTable);
        currentTable = null;
        isHeader = true;
      }
    }
    
    if (currentTable) {
      tables.push(currentTable);
    }
    
    return tables;
  };

  const renderMessage = (message: ChatMessage) => {
    const isUser = message.role === 'user';
    const tables = extractTables(message.content);
    
    return (
      <div
        key={message.id}
        className={`flex ${isUser ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')} mb-4`}
      >
        <div className={`flex items-start gap-3 max-w-[85%] ${isUser ? 'flex-row-reverse' : ''}`}>
          {/* Avatar */}
          <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600' 
              : 'bg-gradient-to-br from-purple-500 to-indigo-600'
          }`}>
            {isUser ? <User className="w-5 h-5 text-white" /> : <Bot className="w-5 h-5 text-white" />}
          </div>
          
          {/* Message Content */}
          <div className={`rounded-2xl px-4 py-3 ${
            isUser 
              ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white' 
              : 'bg-white border border-gray-200 shadow-sm'
          }`}>
            {isUser ? (
              <p className="text-white">{message.content}</p>
            ) : (
              <>
                <div className="prose prose-sm max-w-none">
                  {formatMessageContent(message.content)}
                </div>
                
                {/* الجداول */}
                {tables.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {tables.map((table, idx) => (
                      <div key={idx} className="overflow-x-auto">
                        <table className="min-w-full text-sm border-collapse">
                          <thead>
                            <tr className="bg-gray-100">
                              {table.headers.map((h, i) => (
                                <th key={i} className="px-3 py-2 text-left font-medium text-gray-700 border border-gray-200">
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {table.rows.map((row, ri) => (
                              <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                {row.map((cell, ci) => (
                                  <td key={ci} className="px-3 py-2 text-gray-600 border border-gray-200">
                                    {cell}
                                  </td>
                                ))}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* زر النسخ */}
                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => copyToClipboard(message.content)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title={language === 'ar' ? 'نسخ' : 'Copy'}
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderSuggestions = (suggestions: string[]) => (
    <div className="flex flex-wrap gap-2 mt-3">
      {suggestions.map((suggestion, idx) => (
        <button
          key={idx}
          onClick={() => handleSuggestionClick(suggestion)}
          className="px-3 py-1.5 text-sm bg-gradient-to-r from-purple-50 to-indigo-50 text-purple-700 
                     rounded-full border border-purple-200 hover:from-purple-100 hover:to-indigo-100 
                     transition-all duration-200 flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" />
          {suggestion}
        </button>
      ))}
    </div>
  );

  const renderInsightsTab = () => {
    if (!analysis) return null;
    
    return (
      <div className="p-4 space-y-4">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-yellow-500" />
          {language === 'ar' ? 'الرؤى المكتشفة' : 'Discovered Insights'}
        </h3>
        
        {analysis.insights.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {language === 'ar' ? 'لم يتم اكتشاف رؤى بعد' : 'No insights discovered yet'}
          </p>
        ) : (
          <div className="space-y-3">
            {analysis.insights.map((insight, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-xl border ${
                  insight.importance === 'high' 
                    ? 'bg-red-50 border-red-200' 
                    : insight.importance === 'medium'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-blue-50 border-blue-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${
                    insight.type === 'correlation' ? 'bg-purple-100' :
                    insight.type === 'quality' ? 'bg-red-100' :
                    insight.type === 'distribution' ? 'bg-blue-100' :
                    'bg-green-100'
                  }`}>
                    {insight.type === 'correlation' ? <TrendingUp className="w-5 h-5 text-purple-600" /> :
                     insight.type === 'quality' ? <AlertCircle className="w-5 h-5 text-red-600" /> :
                     insight.type === 'distribution' ? <BarChart3 className="w-5 h-5 text-blue-600" /> :
                     <Target className="w-5 h-5 text-green-600" />}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-800">{insight.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{insight.description}</p>
                    {insight.action && (
                      <p className="text-sm text-purple-600 mt-2 flex items-center gap-1">
                        <ChevronRight className="w-4 h-4" />
                        {insight.action}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const renderQualityTab = () => {
    if (!analysis) return null;
    
    const { quality } = analysis;
    
    return (
      <div className="p-4 space-y-6">
        <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
          <Database className="w-5 h-5 text-blue-500" />
          {language === 'ar' ? 'جودة البيانات' : 'Data Quality'}
        </h3>
        
        {/* النتيجة الإجمالية */}
        <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">
                {language === 'ar' ? 'النتيجة الإجمالية' : 'Overall Score'}
              </p>
              <p className="text-4xl font-bold mt-1">{quality.overallScore.toFixed(0)}%</p>
            </div>
            <div className="w-20 h-20 rounded-full bg-white/20 flex items-center justify-center">
              <Zap className="w-10 h-10 text-white" />
            </div>
          </div>
        </div>
        
        {/* المؤشرات */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: language === 'ar' ? 'الاكتمال' : 'Completeness', value: quality.completeness, color: 'blue' },
            { label: language === 'ar' ? 'الصحة' : 'Validity', value: quality.validity, color: 'green' },
            { label: language === 'ar' ? 'التفرد' : 'Uniqueness', value: quality.uniqueness, color: 'purple' },
            { label: language === 'ar' ? 'الاتساق' : 'Consistency', value: quality.consistency, color: 'orange' }
          ].map((metric, idx) => (
            <div key={idx} className="bg-white rounded-xl p-4 border border-gray-200">
              <p className="text-sm text-gray-500">{metric.label}</p>
              <p className="text-2xl font-bold text-gray-800 mt-1">{metric.value.toFixed(0)}%</p>
              <div className="mt-2 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-${metric.color}-500 rounded-full transition-all duration-500`}
                  style={{ width: `${metric.value}%` }}
                />
              </div>
            </div>
          ))}
        </div>
        
        {/* المشاكل */}
        {quality.issues.length > 0 && (
          <div>
            <h4 className="font-medium text-gray-700 mb-3">
              {language === 'ar' ? 'المشاكل المكتشفة' : 'Issues Found'}
            </h4>
            <div className="space-y-2">
              {quality.issues.slice(0, 5).map((issue, idx) => (
                <div key={idx} className={`p-3 rounded-lg border ${
                  issue.severity === 'high' ? 'bg-red-50 border-red-200' :
                  issue.severity === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                  'bg-blue-50 border-blue-200'
                }`}>
                  <p className="text-sm font-medium text-gray-800">{issue.description}</p>
                  <p className="text-xs text-gray-500 mt-1">💡 {issue.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
        <Brain className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600">
          {language === 'ar' ? 'المساعد الذكي' : 'Smart Assistant'}
        </h3>
        <p className="text-gray-400 mt-2">
          {language === 'ar' ? 'قم بتحميل البيانات أولاً للبدء' : 'Load data first to start'}
        </p>
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-[700px] bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center">
              <Brain className="w-7 h-7" />
            </div>
            <div>
              <h2 className="text-lg font-bold">
                {language === 'ar' ? 'المساعد الإحصائي الذكي' : 'Smart Statistical Assistant'}
              </h2>
              <p className="text-purple-200 text-sm">
                {language === 'ar' ? 'مدعوم بالذكاء الاصطناعي' : 'Powered by AI'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <button
              onClick={handleClearChat}
              className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              title={language === 'ar' ? 'مسح المحادثة' : 'Clear chat'}
            >
              <Trash2 className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex gap-2 mt-4">
          {[
            { id: 'chat', icon: MessageCircle, label: language === 'ar' ? 'المحادثة' : 'Chat' },
            { id: 'insights', icon: Lightbulb, label: language === 'ar' ? 'الرؤى' : 'Insights' },
            { id: 'quality', icon: Database, label: language === 'ar' ? 'الجودة' : 'Quality' }
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as 'chat' | 'insights' | 'quality')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'bg-white text-purple-600'
                  : 'bg-white/10 text-white hover:bg-white/20'
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
        {activeTab === 'chat' ? (
          <div className="flex flex-col h-full">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(message => (
                <React.Fragment key={message.id}>
                  {renderMessage(message)}
                  {message.suggestions && message.role === 'assistant' && (
                    <div className={`${isRTL ? 'mr-13' : 'ml-13'}`}>
                      {renderSuggestions(message.suggestions)}
                    </div>
                  )}
                </React.Fragment>
              ))}
              
              {isTyping && (
                <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'} mb-4`}>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center">
                      <Bot className="w-5 h-5 text-white" />
                    </div>
                    <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Input */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-500 
                             focus:ring-2 focus:ring-purple-200 outline-none transition-all"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || isTyping}
                  className="p-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl
                             hover:from-purple-700 hover:to-indigo-700 transition-all disabled:opacity-50
                             disabled:cursor-not-allowed shadow-lg shadow-purple-200"
                >
                  {isTyping ? (
                    <RefreshCw className="w-5 h-5 animate-spin" />
                  ) : (
                    <Send className="w-5 h-5" />
                  )}
                </button>
              </div>
              
              {/* Quick suggestions */}
              <div className="flex flex-wrap gap-2 mt-3">
                {(language === 'ar' 
                  ? ['ملخص البيانات', 'القيم المفقودة', 'الارتباطات', 'اقتراح اختبارات']
                  : ['Data summary', 'Missing values', 'Correlations', 'Suggest tests']
                ).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSuggestionClick(suggestion)}
                    className="px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full
                               hover:bg-gray-200 transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ) : activeTab === 'insights' ? (
          <div className="h-full overflow-y-auto">
            {renderInsightsTab()}
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            {renderQualityTab()}
          </div>
        )}
      </div>
    </div>
  );
};

export default SmartChat;
