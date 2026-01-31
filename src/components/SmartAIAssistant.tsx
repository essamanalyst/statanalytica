import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n';
import { aiEngine, AIInsight, TestRecommendation, AnalysisResult, ChatMessage } from '../ai/AdvancedAIEngine';
import {
  Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface SmartAIAssistantProps {
  data: Record<string, any>[];
  onNavigate?: (tab: string) => void;
}

const SmartAIAssistant: React.FC<SmartAIAssistantProps> = ({ data, onNavigate }) => {
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'insights' | 'tests' | 'results' | 'chat'>('overview');
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [recommendations, setRecommendations] = useState<TestRecommendation[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestRecommendation | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [selectedDependent, setSelectedDependent] = useState('');
  const [selectedIndependent, setSelectedIndependent] = useState<string[]>([]);
  const [selectedGrouping, setSelectedGrouping] = useState('');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  useEffect(() => {
    if (data && data.length > 0) {
      aiEngine.loadData(data);
      setInsights(aiEngine.getInsights());
      
      // رسالة ترحيب
      if (chatMessages.length === 0) {
        const welcomeMessage = aiEngine.chat(language === 'ar' ? 'مرحباً' : 'Hello');
        setChatMessages([welcomeMessage]);
      }
    }
  }, [data]);

  useEffect(() => {
    if (selectedDependent || selectedGrouping) {
      const recs = aiEngine.getTestRecommendations(
        selectedDependent || undefined,
        selectedIndependent.length > 0 ? selectedIndependent : undefined,
        selectedGrouping || undefined
      );
      setRecommendations(recs);
    } else {
      setRecommendations(aiEngine.getTestRecommendations());
    }
  }, [selectedDependent, selectedIndependent, selectedGrouping]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  const columns = aiEngine.getColumns();
  const numericColumns = columns.filter(c => c.type === 'numeric');
  const categoricalColumns = columns.filter(c => c.type === 'categorical');
  const quality = aiEngine.getDataQuality();

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    setIsTyping(true);
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');

    setTimeout(() => {
      const response = aiEngine.chat(chatInput);
      setChatMessages(prev => [...prev, response]);
      setIsTyping(false);
    }, 500);
  };

  const handleRunTest = (test: TestRecommendation) => {
    try {
      const result = aiEngine.runTest(test.id, {
        dependent: selectedDependent,
        independent: selectedIndependent,
        grouping: selectedGrouping
      });
      if (result) {
        setAnalysisResult(result);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Error running test:', error);
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setChatInput(suggestion);
    setTimeout(() => handleSendMessage(), 100);
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* بطاقات الإحصائيات السريعة */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{data.length}</div>
          <div className="text-blue-100">{language === 'ar' ? 'صف' : 'Rows'}</div>
        </div>
        <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{columns.length}</div>
          <div className="text-green-100">{language === 'ar' ? 'عمود' : 'Columns'}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{numericColumns.length}</div>
          <div className="text-purple-100">{language === 'ar' ? 'رقمي' : 'Numeric'}</div>
        </div>
        <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
          <div className="text-3xl font-bold">{quality.score.toFixed(0)}%</div>
          <div className="text-amber-100">{language === 'ar' ? 'جودة البيانات' : 'Data Quality'}</div>
        </div>
      </div>

      {/* مؤشرات الجودة */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">📊</span>
          {language === 'ar' ? 'مؤشرات جودة البيانات' : 'Data Quality Indicators'}
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { name: language === 'ar' ? 'الاكتمال' : 'Completeness', value: quality.completeness, color: 'blue' },
            { name: language === 'ar' ? 'الصحة' : 'Validity', value: quality.validity, color: 'green' },
            { name: language === 'ar' ? 'التفرد' : 'Uniqueness', value: quality.uniqueness, color: 'purple' },
            { name: language === 'ar' ? 'الاتساق' : 'Consistency', value: quality.consistency, color: 'amber' }
          ].map((indicator, idx) => (
            <div key={idx} className="text-center">
              <div className="relative w-20 h-20 mx-auto">
                <svg className="w-20 h-20 transform -rotate-90">
                  <circle cx="40" cy="40" r="35" stroke="#e5e7eb" strokeWidth="6" fill="none" />
                  <circle
                    cx="40" cy="40" r="35"
                    stroke={indicator.color === 'blue' ? '#3B82F6' : indicator.color === 'green' ? '#10B981' : indicator.color === 'purple' ? '#8B5CF6' : '#F59E0B'}
                    strokeWidth="6"
                    fill="none"
                    strokeDasharray={`${indicator.value * 2.2} 220`}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center font-bold text-gray-700">
                  {indicator.value.toFixed(0)}%
                </div>
              </div>
              <div className="mt-2 text-sm text-gray-600">{indicator.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* توزيع أنواع البيانات */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">🗂️</span>
            {language === 'ar' ? 'توزيع أنواع البيانات' : 'Data Types Distribution'}
          </h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={[
                  { name: language === 'ar' ? 'رقمي' : 'Numeric', value: numericColumns.length },
                  { name: language === 'ar' ? 'فئوي' : 'Categorical', value: categoricalColumns.length },
                  { name: language === 'ar' ? 'أخرى' : 'Other', value: columns.length - numericColumns.length - categoricalColumns.length }
                ].filter(d => d.value > 0)}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={80}
                paddingAngle={5}
                dataKey="value"
                label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
              >
                {COLORS.map((color, index) => (
                  <Cell key={`cell-${index}`} fill={color} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
            <span className="text-2xl">📋</span>
            {language === 'ar' ? 'ملخص الأعمدة' : 'Columns Summary'}
          </h3>
          <div className="max-h-[200px] overflow-y-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  <th className="px-3 py-2 text-right">{language === 'ar' ? 'العمود' : 'Column'}</th>
                  <th className="px-3 py-2 text-center">{language === 'ar' ? 'النوع' : 'Type'}</th>
                  <th className="px-3 py-2 text-center">{language === 'ar' ? 'المفقود' : 'Missing'}</th>
                </tr>
              </thead>
              <tbody>
                {columns.slice(0, 10).map((col, idx) => (
                  <tr key={idx} className="border-b">
                    <td className="px-3 py-2 font-medium">{col.name}</td>
                    <td className="px-3 py-2 text-center">
                      <span className={`px-2 py-1 rounded text-xs ${
                        col.type === 'numeric' ? 'bg-blue-100 text-blue-700' :
                        col.type === 'categorical' ? 'bg-green-100 text-green-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {col.type === 'numeric' ? (language === 'ar' ? 'رقمي' : 'Numeric') :
                         col.type === 'categorical' ? (language === 'ar' ? 'فئوي' : 'Categorical') :
                         col.type}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      <span className={col.missing > 0 ? 'text-red-600' : 'text-green-600'}>
                        {((col.missing / data.length) * 100).toFixed(1)}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );

  const renderInsights = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <span className="text-2xl">💡</span>
          {language === 'ar' ? 'الرؤى المكتشفة' : 'Discovered Insights'}
          <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-sm">
            {insights.length}
          </span>
        </h3>
      </div>

      {insights.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <span className="text-4xl mb-4 block">✨</span>
          <p className="text-gray-600">
            {language === 'ar' ? 'لا توجد رؤى مهمة - بياناتك تبدو جيدة!' : 'No significant insights - your data looks good!'}
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {insights.map((insight) => (
            <div
              key={insight.id}
              className={`bg-white rounded-xl shadow-lg p-5 border-l-4 ${
                insight.severity === 'high' ? 'border-red-500' :
                insight.severity === 'medium' ? 'border-yellow-500' :
                'border-blue-500'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      insight.severity === 'high' ? 'bg-red-100 text-red-700' :
                      insight.severity === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {insight.severity === 'high' ? (language === 'ar' ? 'مهم' : 'High') :
                       insight.severity === 'medium' ? (language === 'ar' ? 'متوسط' : 'Medium') :
                       (language === 'ar' ? 'معلومة' : 'Info')}
                    </span>
                    <span className={`px-2 py-1 rounded text-xs ${
                      insight.type === 'quality' ? 'bg-purple-100 text-purple-700' :
                      insight.type === 'anomaly' ? 'bg-red-100 text-red-700' :
                      insight.type === 'correlation' ? 'bg-green-100 text-green-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {insight.type === 'quality' ? (language === 'ar' ? 'جودة' : 'Quality') :
                       insight.type === 'anomaly' ? (language === 'ar' ? 'شذوذ' : 'Anomaly') :
                       insight.type === 'correlation' ? (language === 'ar' ? 'ارتباط' : 'Correlation') :
                       insight.type === 'distribution' ? (language === 'ar' ? 'توزيع' : 'Distribution') :
                       insight.type}
                    </span>
                  </div>
                  <h4 className="font-bold text-gray-800 mb-1">
                    {language === 'ar' ? insight.title : insight.titleEn}
                  </h4>
                  <p className="text-gray-600 text-sm mb-2">
                    {language === 'ar' ? insight.description : insight.descriptionEn}
                  </p>
                  <p className="text-gray-500 text-sm">
                    {language === 'ar' ? insight.details : insight.detailsEn}
                  </p>
                  {insight.action && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-700 flex items-center gap-2">
                        <span>💡</span>
                        {language === 'ar' ? insight.action : insight.actionEn}
                      </p>
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-800">
                    {insight.confidence}%
                  </div>
                  <div className="text-xs text-gray-500">
                    {language === 'ar' ? 'ثقة' : 'Confidence'}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderTests = () => (
    <div className="space-y-6">
      {/* اختيار المتغيرات */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🎯</span>
          {language === 'ar' ? 'اختر المتغيرات' : 'Select Variables'}
        </h3>
        <div className="grid md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'ar' ? 'المتغير التابع' : 'Dependent Variable'}
            </label>
            <select
              value={selectedDependent}
              onChange={(e) => setSelectedDependent(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{language === 'ar' ? 'اختر...' : 'Select...'}</option>
              {numericColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'ar' ? 'متغير التجميع' : 'Grouping Variable'}
            </label>
            <select
              value={selectedGrouping}
              onChange={(e) => setSelectedGrouping(e.target.value)}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{language === 'ar' ? 'اختر...' : 'Select...'}</option>
              {categoricalColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {language === 'ar' ? 'المتغير المستقل' : 'Independent Variable'}
            </label>
            <select
              value={selectedIndependent[0] || ''}
              onChange={(e) => setSelectedIndependent(e.target.value ? [e.target.value] : [])}
              className="w-full border rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{language === 'ar' ? 'اختر...' : 'Select...'}</option>
              {numericColumns.filter(c => c.name !== selectedDependent).map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* الاختبارات الموصى بها */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
          <span className="text-2xl">🧪</span>
          {language === 'ar' ? 'الاختبارات الموصى بها' : 'Recommended Tests'}
        </h3>
        
        {recommendations.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <span className="text-4xl mb-4 block">🔍</span>
            <p>{language === 'ar' ? 'اختر المتغيرات للحصول على توصيات' : 'Select variables to get recommendations'}</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {recommendations.map((test) => (
              <div
                key={test.id}
                className={`border-2 rounded-xl p-5 cursor-pointer transition-all ${
                  selectedTest?.id === test.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedTest(test)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-bold text-gray-800">
                        {language === 'ar' ? test.name : test.nameEn}
                      </h4>
                      <span className={`px-2 py-1 rounded text-xs ${
                        test.category === 'معلمي' || test.categoryEn === 'Parametric'
                          ? 'bg-blue-100 text-blue-700'
                          : test.category === 'لامعلمي' || test.categoryEn === 'Non-Parametric'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-purple-100 text-purple-700'
                      }`}>
                        {language === 'ar' ? test.category : test.categoryEn}
                      </span>
                    </div>
                    <p className="text-gray-600 text-sm mb-3">
                      {language === 'ar' ? test.description : test.descriptionEn}
                    </p>
                    
                    {/* الأسباب */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {(language === 'ar' ? test.reasons : test.reasonsEn).map((reason, idx) => (
                        <span key={idx} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                          ✓ {reason}
                        </span>
                      ))}
                    </div>

                    {/* الافتراضات */}
                    {test.assumptions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {test.assumptions.map((assumption, idx) => (
                          <span
                            key={idx}
                            className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${
                              assumption.met
                                ? 'bg-green-100 text-green-700'
                                : 'bg-red-100 text-red-700'
                            }`}
                          >
                            {assumption.met ? '✓' : '✗'}
                            {language === 'ar' ? assumption.name : assumption.nameEn}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right ml-4">
                    <div className={`text-3xl font-bold ${
                      test.suitability >= 80 ? 'text-green-600' :
                      test.suitability >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {test.suitability}%
                    </div>
                    <div className="text-xs text-gray-500">
                      {language === 'ar' ? 'ملاءمة' : 'Suitability'}
                    </div>
                  </div>
                </div>

                {selectedTest?.id === test.id && (
                  <div className="mt-4 pt-4 border-t">
                    <button
                      onClick={() => handleRunTest(test)}
                      className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
                    >
                      <span>▶️</span>
                      {language === 'ar' ? 'تنفيذ الاختبار' : 'Run Test'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  const renderResults = () => (
    <div className="space-y-6">
      {!analysisResult ? (
        <div className="bg-white rounded-xl shadow-lg p-8 text-center">
          <span className="text-6xl mb-4 block">📊</span>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {language === 'ar' ? 'لا توجد نتائج بعد' : 'No Results Yet'}
          </h3>
          <p className="text-gray-600 mb-4">
            {language === 'ar' ? 'اختر اختباراً من قسم الاختبارات لتنفيذه' : 'Select a test from the Tests section to run'}
          </p>
          <button
            onClick={() => setActiveTab('tests')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {language === 'ar' ? 'اذهب للاختبارات' : 'Go to Tests'}
          </button>
        </div>
      ) : (
        <>
          {/* عنوان الاختبار */}
          <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
            <h2 className="text-2xl font-bold mb-2">
              {language === 'ar' ? analysisResult.testName : analysisResult.testNameEn}
            </h2>
            <p className="text-blue-100">
              {language === 'ar' ? 'نتائج التحليل الإحصائي' : 'Statistical Analysis Results'}
            </p>
          </div>

          {/* الإحصائيات الرئيسية */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-lg p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">
                {analysisResult.statistic.toFixed(4)}
              </div>
              <div className="text-sm text-gray-600">
                {language === 'ar' ? 'قيمة الإحصائي' : 'Test Statistic'}
              </div>
            </div>
            <div className={`rounded-xl shadow-lg p-4 text-center ${
              analysisResult.pValue < 0.05 ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              <div className={`text-3xl font-bold ${
                analysisResult.pValue < 0.05 ? 'text-green-600' : 'text-gray-600'
              }`}>
                {analysisResult.pValue < 0.001 ? '< 0.001' : analysisResult.pValue.toFixed(4)}
              </div>
              <div className="text-sm text-gray-600">
                p-value
              </div>
            </div>
            {analysisResult.degreesOfFreedom !== undefined && (
              <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {analysisResult.degreesOfFreedom}
                </div>
                <div className="text-sm text-gray-600">
                  {language === 'ar' ? 'درجات الحرية' : 'df'}
                </div>
              </div>
            )}
            {analysisResult.effectSize && (
              <div className="bg-white rounded-xl shadow-lg p-4 text-center">
                <div className="text-3xl font-bold text-amber-600">
                  {analysisResult.effectSize.value.toFixed(3)}
                </div>
                <div className="text-sm text-gray-600">
                  {analysisResult.effectSize.name}
                </div>
              </div>
            )}
          </div>

          {/* الاستنتاج */}
          <div className={`rounded-xl shadow-lg p-6 ${
            analysisResult.pValue < 0.05 
              ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200'
              : 'bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200'
          }`}>
            <div className="flex items-start gap-4">
              <div className={`text-4xl ${analysisResult.pValue < 0.05 ? '' : ''}`}>
                {analysisResult.pValue < 0.05 ? '✅' : '❌'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-800 mb-2">
                  {language === 'ar' ? 'الاستنتاج' : 'Conclusion'}
                </h3>
                <p className="text-gray-700 mb-3">
                  {language === 'ar' ? analysisResult.conclusion : analysisResult.conclusionEn}
                </p>
                <p className="text-gray-600">
                  {language === 'ar' ? analysisResult.interpretation : analysisResult.interpretationEn}
                </p>
              </div>
            </div>
          </div>

          {/* حجم الأثر */}
          {analysisResult.effectSize && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">📏</span>
                {language === 'ar' ? 'حجم الأثر' : 'Effect Size'}
              </h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-gray-600">{analysisResult.effectSize.name}</span>
                    <span className="font-bold">
                      {analysisResult.effectSize.value.toFixed(3)} 
                      ({language === 'ar' ? analysisResult.effectSize.interpretation : analysisResult.effectSize.interpretationEn})
                    </span>
                  </div>
                  <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        Math.abs(analysisResult.effectSize.value) >= 0.8 ? 'bg-green-500' :
                        Math.abs(analysisResult.effectSize.value) >= 0.5 ? 'bg-yellow-500' :
                        'bg-red-500'
                      }`}
                      style={{ width: `${Math.min(Math.abs(analysisResult.effectSize.value) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1 text-xs text-gray-500">
                    <span>{language === 'ar' ? 'ضعيف' : 'Small'}</span>
                    <span>{language === 'ar' ? 'متوسط' : 'Medium'}</span>
                    <span>{language === 'ar' ? 'كبير' : 'Large'}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* فترة الثقة */}
          {analysisResult.confidenceInterval && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">📐</span>
                {language === 'ar' ? `فترة الثقة ${analysisResult.confidenceInterval.level}%` : `${analysisResult.confidenceInterval.level}% Confidence Interval`}
              </h3>
              <div className="relative h-16 bg-gray-100 rounded-lg overflow-hidden">
                <div
                  className="absolute top-0 bottom-0 bg-blue-200"
                  style={{
                    left: `${Math.max(0, 50 + analysisResult.confidenceInterval.lower * 20)}%`,
                    right: `${Math.max(0, 50 - analysisResult.confidenceInterval.upper * 20)}%`
                  }}
                />
                <div className="absolute top-1/2 left-1/2 w-0.5 h-8 bg-gray-400 -translate-y-1/2" />
                <div className="absolute bottom-2 left-0 right-0 flex justify-between px-4 text-sm">
                  <span className="bg-white px-2 rounded shadow">
                    {analysisResult.confidenceInterval.lower.toFixed(3)}
                  </span>
                  <span className="bg-white px-2 rounded shadow">
                    {analysisResult.confidenceInterval.upper.toFixed(3)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* الإحصائيات الإضافية */}
          {analysisResult.additionalStats && Object.keys(analysisResult.additionalStats).length > 0 && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                <span className="text-2xl">📋</span>
                {language === 'ar' ? 'إحصائيات إضافية' : 'Additional Statistics'}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {Object.entries(analysisResult.additionalStats).map(([key, value]) => (
                  <div key={key} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-sm text-gray-600">{key}</div>
                    <div className="text-lg font-bold text-gray-800">
                      {typeof value === 'number' ? value.toFixed(4) : value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* التوصيات */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <span className="text-2xl">💡</span>
              {language === 'ar' ? 'التوصيات' : 'Recommendations'}
            </h3>
            <ul className="space-y-2">
              {(language === 'ar' ? analysisResult.recommendations : analysisResult.recommendationsEn).map((rec, idx) => (
                <li key={idx} className="flex items-start gap-2 text-gray-700">
                  <span className="text-blue-500 mt-1">•</span>
                  {rec}
                </li>
              ))}
            </ul>
          </div>

          {/* أزرار الإجراءات */}
          <div className="flex gap-4">
            <button
              onClick={() => setActiveTab('tests')}
              className="flex-1 bg-gray-100 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              {language === 'ar' ? 'اختبار آخر' : 'Another Test'}
            </button>
            <button
              onClick={() => {
                // تصدير النتائج
                const content = JSON.stringify(analysisResult, null, 2);
                const blob = new Blob([content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'analysis-result.json';
                a.click();
              }}
              className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-blue-800 transition-colors"
            >
              {language === 'ar' ? 'تصدير النتائج' : 'Export Results'}
            </button>
          </div>
        </>
      )}
    </div>
  );

  const renderChat = () => (
    <div className="flex flex-col h-[600px]">
      {/* رسائل المحادثة */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 rounded-t-xl">
        {chatMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white rounded-br-none'
                  : 'bg-white shadow-md rounded-bl-none'
              }`}
            >
              {message.role === 'assistant' ? (
                <div className="prose prose-sm max-w-none">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: message.content
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\n/g, '<br>')
                    }} 
                  />
                </div>
              ) : (
                <p>{message.content}</p>
              )}
              
              {/* اقتراحات */}
              {message.role === 'assistant' && message.suggestions && message.suggestions.length > 0 && (
                <div className="mt-3 pt-3 border-t flex flex-wrap gap-2">
                  {message.suggestions.map((suggestion, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSuggestionClick(suggestion)}
                      className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-white shadow-md rounded-2xl rounded-bl-none px-4 py-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }} />
                <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
              </div>
            </div>
          </div>
        )}
        
        <div ref={chatEndRef} />
      </div>

      {/* حقل الإدخال */}
      <div className="p-4 bg-white rounded-b-xl border-t">
        <div className="flex gap-2">
          <input
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
            className="flex-1 border rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            dir={isRTL ? 'rtl' : 'ltr'}
          />
          <button
            onClick={handleSendMessage}
            disabled={!chatInput.trim()}
            className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-6 py-3 rounded-xl font-medium hover:from-blue-700 hover:to-blue-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {language === 'ar' ? 'إرسال' : 'Send'}
          </button>
        </div>
        
        {/* اقتراحات سريعة */}
        <div className="mt-3 flex flex-wrap gap-2">
          {[
            language === 'ar' ? 'كيف أقارن بين مجموعتين؟' : 'How to compare two groups?',
            language === 'ar' ? 'هل بياناتي طبيعية؟' : 'Is my data normal?',
            language === 'ar' ? 'ما هو حجم الأثر؟' : 'What is effect size?'
          ].map((suggestion, idx) => (
            <button
              key={idx}
              onClick={() => {
                setChatInput(suggestion);
                setTimeout(handleSendMessage, 100);
              }}
              className="text-xs bg-gray-100 text-gray-600 px-3 py-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  if (!data || data.length === 0) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <span className="text-6xl mb-4 block">🤖</span>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {language === 'ar' ? 'المساعد الذكي' : 'Smart Assistant'}
        </h2>
        <p className="text-gray-600 mb-4">
          {language === 'ar' 
            ? 'قم بتحميل البيانات أولاً للاستفادة من المساعد الذكي'
            : 'Load data first to use the Smart Assistant'}
        </p>
        <button
          onClick={() => onNavigate?.('upload')}
          className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          {language === 'ar' ? 'تحميل البيانات' : 'Load Data'}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* العنوان */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center gap-4">
          <div className="text-5xl">🤖</div>
          <div>
            <h1 className="text-2xl font-bold">
              {language === 'ar' ? 'المساعد الإحصائي الذكي' : 'Smart Statistical Assistant'}
            </h1>
            <p className="text-white/80">
              {language === 'ar' 
                ? 'مدعوم بالذكاء الاصطناعي لمساعدتك في التحليل الإحصائي'
                : 'AI-powered assistant for statistical analysis'}
            </p>
          </div>
        </div>
      </div>

      {/* التبويبات */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="flex border-b overflow-x-auto">
          {[
            { id: 'overview', icon: '📊', label: language === 'ar' ? 'نظرة عامة' : 'Overview' },
            { id: 'insights', icon: '💡', label: language === 'ar' ? 'الرؤى' : 'Insights', badge: insights.length },
            { id: 'tests', icon: '🧪', label: language === 'ar' ? 'الاختبارات' : 'Tests' },
            { id: 'results', icon: '📈', label: language === 'ar' ? 'النتائج' : 'Results' },
            { id: 'chat', icon: '💬', label: language === 'ar' ? 'المحادثة' : 'Chat' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'insights' && renderInsights()}
          {activeTab === 'tests' && renderTests()}
          {activeTab === 'results' && renderResults()}
          {activeTab === 'chat' && renderChat()}
        </div>
      </div>
    </div>
  );
};

export default SmartAIAssistant;
