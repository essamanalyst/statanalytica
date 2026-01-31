import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n';
import {
  BarChart3, Database, CheckCircle, AlertTriangle,
  ArrowUpRight, ArrowDownRight, Minus,
  Award, Brain, LayoutGrid, List,
  RefreshCw, Bell, Search, ChevronRight,
  Folder, FileText, Table,
  Star, StarOff, MoreVertical, Upload
} from 'lucide-react';
import {
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Line,
  PieChart as RechartsPieChart, Pie, Cell, AreaChart, Area
} from 'recharts';

interface DashboardProps {
  data: any[] | null;
  columns: { name: string; type: string }[];
  onNavigate: (tab: string) => void;
}

interface RecentProject {
  id: string;
  name: string;
  type: 'analysis' | 'report' | 'dataset';
  date: Date;
  status: 'completed' | 'in-progress' | 'draft';
  starred: boolean;
}

interface QuickStat {
  label: string;
  value: string | number;
  change?: number;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

const ProfessionalDashboard: React.FC<DashboardProps> = ({ data, columns, onNavigate }) => {
  const { isRTL } = useLanguage();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [timeRange, setTimeRange] = useState<'today' | 'week' | 'month' | 'year'>('week');
  const [searchQuery, setSearchQuery] = useState('');

  // حساب الإحصائيات من البيانات
  const statistics = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        totalRows: 0,
        totalColumns: 0,
        numericColumns: 0,
        categoricalColumns: 0,
        missingValues: 0,
        missingPercentage: 0,
        duplicateRows: 0,
        dataQuality: 0,
        outliers: 0
      };
    }

    const numericCols = columns.filter(c => c.type === 'number').length;
    const categoricalCols = columns.filter(c => c.type === 'string').length;
    
    let missingCount = 0;
    const totalCells = data.length * columns.length;
    
    data.forEach(row => {
      columns.forEach(col => {
        if (row[col.name] === null || row[col.name] === undefined || row[col.name] === '') {
          missingCount++;
        }
      });
    });

    // حساب التكرارات
    const seen = new Set();
    let duplicates = 0;
    data.forEach(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) duplicates++;
      else seen.add(key);
    });

    const missingPercentage = totalCells > 0 ? (missingCount / totalCells) * 100 : 0;
    const dataQuality = 100 - missingPercentage - (duplicates / data.length * 10);

    return {
      totalRows: data.length,
      totalColumns: columns.length,
      numericColumns: numericCols,
      categoricalColumns: categoricalCols,
      missingValues: missingCount,
      missingPercentage: missingPercentage.toFixed(1),
      duplicateRows: duplicates,
      dataQuality: Math.max(0, Math.min(100, dataQuality)).toFixed(0),
      outliers: Math.floor(data.length * 0.02)
    };
  }, [data, columns]);

  // إحصائيات سريعة
  const quickStats: QuickStat[] = [
    {
      label: isRTL ? 'إجمالي السجلات' : 'Total Records',
      value: statistics.totalRows.toLocaleString(),
      change: 12.5,
      changeType: 'positive',
      icon: <Database className="w-6 h-6" />,
      color: 'from-blue-500 to-blue-600'
    },
    {
      label: isRTL ? 'المتغيرات' : 'Variables',
      value: statistics.totalColumns,
      change: 0,
      changeType: 'neutral',
      icon: <Table className="w-6 h-6" />,
      color: 'from-purple-500 to-purple-600'
    },
    {
      label: isRTL ? 'جودة البيانات' : 'Data Quality',
      value: `${statistics.dataQuality}%`,
      change: 5.2,
      changeType: 'positive',
      icon: <Award className="w-6 h-6" />,
      color: 'from-green-500 to-green-600'
    },
    {
      label: isRTL ? 'التحليلات المكتملة' : 'Analyses Done',
      value: 24,
      change: 8,
      changeType: 'positive',
      icon: <CheckCircle className="w-6 h-6" />,
      color: 'from-teal-500 to-teal-600'
    }
  ];

  // المشاريع الحديثة
  const recentProjects: RecentProject[] = [
    {
      id: '1',
      name: isRTL ? 'تحليل بيانات المبيعات' : 'Sales Data Analysis',
      type: 'analysis',
      date: new Date(Date.now() - 1000 * 60 * 30),
      status: 'completed',
      starred: true
    },
    {
      id: '2',
      name: isRTL ? 'تقرير الربع الثالث' : 'Q3 Report',
      type: 'report',
      date: new Date(Date.now() - 1000 * 60 * 60 * 2),
      status: 'in-progress',
      starred: false
    },
    {
      id: '3',
      name: isRTL ? 'بيانات العملاء' : 'Customer Dataset',
      type: 'dataset',
      date: new Date(Date.now() - 1000 * 60 * 60 * 24),
      status: 'completed',
      starred: true
    },
    {
      id: '4',
      name: isRTL ? 'اختبارات إحصائية' : 'Statistical Tests',
      type: 'analysis',
      date: new Date(Date.now() - 1000 * 60 * 60 * 48),
      status: 'draft',
      starred: false
    }
  ];

  // بيانات الرسم البياني للنشاط
  const activityData = [
    { name: isRTL ? 'السبت' : 'Sat', analyses: 12, reports: 4, imports: 3 },
    { name: isRTL ? 'الأحد' : 'Sun', analyses: 19, reports: 6, imports: 5 },
    { name: isRTL ? 'الإثنين' : 'Mon', analyses: 15, reports: 8, imports: 7 },
    { name: isRTL ? 'الثلاثاء' : 'Tue', analyses: 25, reports: 10, imports: 4 },
    { name: isRTL ? 'الأربعاء' : 'Wed', analyses: 22, reports: 7, imports: 6 },
    { name: isRTL ? 'الخميس' : 'Thu', analyses: 30, reports: 12, imports: 8 },
    { name: isRTL ? 'الجمعة' : 'Fri', analyses: 18, reports: 5, imports: 3 }
  ];

  // توزيع أنواع التحليل
  const analysisDistribution = [
    { name: isRTL ? 'وصفي' : 'Descriptive', value: 35, color: '#3B82F6' },
    { name: isRTL ? 'استدلالي' : 'Inferential', value: 28, color: '#8B5CF6' },
    { name: isRTL ? 'انحدار' : 'Regression', value: 20, color: '#10B981' },
    { name: isRTL ? 'ارتباط' : 'Correlation', value: 17, color: '#F59E0B' }
  ];

  // الإجراءات السريعة
  const quickActions = [
    {
      icon: <Upload className="w-5 h-5" />,
      label: isRTL ? 'استيراد بيانات' : 'Import Data',
      description: isRTL ? 'CSV, Excel, JSON' : 'CSV, Excel, JSON',
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => onNavigate('upload')
    },
    {
      icon: <BarChart3 className="w-5 h-5" />,
      label: isRTL ? 'تحليل جديد' : 'New Analysis',
      description: isRTL ? 'ابدأ تحليل البيانات' : 'Start analyzing data',
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => onNavigate('descriptive')
    },
    {
      icon: <Brain className="w-5 h-5" />,
      label: isRTL ? 'المستشار الذكي' : 'Smart Advisor',
      description: isRTL ? 'اقتراحات ذكية' : 'AI recommendations',
      color: 'bg-teal-500 hover:bg-teal-600',
      action: () => onNavigate('tests')
    },
    {
      icon: <FileText className="w-5 h-5" />,
      label: isRTL ? 'إنشاء تقرير' : 'Create Report',
      description: isRTL ? 'PDF, HTML, Word' : 'PDF, HTML, Word',
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => onNavigate('reports')
    }
  ];

  // تنسيق التاريخ
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 60) {
      return isRTL ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
    } else if (hours < 24) {
      return isRTL ? `منذ ${hours} ساعة` : `${hours}h ago`;
    } else {
      return isRTL ? `منذ ${days} يوم` : `${days}d ago`;
    }
  };

  // أيقونة حسب نوع المشروع
  const getProjectIcon = (type: string) => {
    switch (type) {
      case 'analysis': return <BarChart3 className="w-5 h-5 text-purple-500" />;
      case 'report': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'dataset': return <Database className="w-5 h-5 text-green-500" />;
      default: return <Folder className="w-5 h-5 text-gray-500" />;
    }
  };

  // لون حالة المشروع
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-700';
      case 'in-progress': return 'bg-blue-100 text-blue-700';
      case 'draft': return 'bg-gray-100 text-gray-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return isRTL ? 'مكتمل' : 'Completed';
      case 'in-progress': return isRTL ? 'قيد التنفيذ' : 'In Progress';
      case 'draft': return isRTL ? 'مسودة' : 'Draft';
      default: return status;
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* الرأس */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* العنوان */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {isRTL ? 'لوحة التحكم' : 'Dashboard'}
              </h1>
              <p className="text-sm text-gray-500">
                {isRTL ? 'مرحباً بك في StatAnalytica' : 'Welcome to StatAnalytica'}
              </p>
            </div>

            {/* أدوات الرأس */}
            <div className="flex items-center gap-4">
              {/* البحث */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder={isRTL ? 'بحث...' : 'Search...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
                />
              </div>

              {/* نطاق الوقت */}
              <select
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="today">{isRTL ? 'اليوم' : 'Today'}</option>
                <option value="week">{isRTL ? 'الأسبوع' : 'This Week'}</option>
                <option value="month">{isRTL ? 'الشهر' : 'This Month'}</option>
                <option value="year">{isRTL ? 'السنة' : 'This Year'}</option>
              </select>

              {/* تحديث */}
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* الإشعارات */}
              <button className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* الإحصائيات السريعة */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {quickStats.map((stat, index) => (
            <div
              key={index}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl bg-gradient-to-r ${stat.color} text-white`}>
                  {stat.icon}
                </div>
                {stat.change !== undefined && (
                  <div className={`flex items-center text-sm font-medium ${
                    stat.changeType === 'positive' ? 'text-green-600' :
                    stat.changeType === 'negative' ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {stat.changeType === 'positive' && <ArrowUpRight className="w-4 h-4" />}
                    {stat.changeType === 'negative' && <ArrowDownRight className="w-4 h-4" />}
                    {stat.changeType === 'neutral' && <Minus className="w-4 h-4" />}
                    <span>{stat.change}%</span>
                  </div>
                )}
              </div>
              <h3 className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</h3>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* الإجراءات السريعة */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            {isRTL ? 'إجراءات سريعة' : 'Quick Actions'}
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => (
              <button
                key={index}
                onClick={action.action}
                className={`${action.color} text-white rounded-xl p-4 text-center transition-all hover:scale-105 hover:shadow-lg`}
              >
                <div className="flex justify-center mb-2">{action.icon}</div>
                <h3 className="font-medium text-sm mb-1">{action.label}</h3>
                <p className="text-xs opacity-80">{action.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* رسم النشاط */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {isRTL ? 'نشاط الأسبوع' : 'Weekly Activity'}
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                  {isRTL ? 'تحليلات' : 'Analyses'}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-purple-500 rounded-full"></span>
                  {isRTL ? 'تقارير' : 'Reports'}
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                  {isRTL ? 'استيراد' : 'Imports'}
                </span>
              </div>
            </div>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={activityData}>
                  <defs>
                    <linearGradient id="colorAnalyses" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3B82F6" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorReports" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} />
                  <YAxis stroke="#9CA3AF" fontSize={12} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #E5E7EB',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="analyses"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorAnalyses)"
                  />
                  <Area
                    type="monotone"
                    dataKey="reports"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorReports)"
                  />
                  <Line
                    type="monotone"
                    dataKey="imports"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981', strokeWidth: 2 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* توزيع التحليلات */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">
              {isRTL ? 'توزيع التحليلات' : 'Analysis Distribution'}
            </h2>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie
                    data={analysisDistribution}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {analysisDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 space-y-2">
              {analysisDistribution.map((item, index) => (
                <div key={index} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: item.color }}
                    ></span>
                    <span className="text-gray-600">{item.name}</span>
                  </div>
                  <span className="font-medium text-gray-900">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ملخص البيانات الحالية */}
        {data && data.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-gray-900">
                {isRTL ? 'ملخص البيانات المحملة' : 'Loaded Data Summary'}
              </h2>
              <button
                onClick={() => onNavigate('descriptive')}
                className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center gap-1"
              >
                {isRTL ? 'تحليل مفصل' : 'Detailed Analysis'}
                <ChevronRight className={`w-4 h-4 ${isRTL ? 'rotate-180' : ''}`} />
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 text-center">
                <Database className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-blue-700">{statistics.totalRows.toLocaleString()}</p>
                <p className="text-xs text-blue-600">{isRTL ? 'صف' : 'Rows'}</p>
              </div>
              <div className="bg-purple-50 rounded-lg p-4 text-center">
                <Table className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-purple-700">{statistics.totalColumns}</p>
                <p className="text-xs text-purple-600">{isRTL ? 'عمود' : 'Columns'}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 text-center">
                <BarChart3 className="w-6 h-6 text-green-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-green-700">{statistics.numericColumns}</p>
                <p className="text-xs text-green-600">{isRTL ? 'رقمي' : 'Numeric'}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 text-center">
                <List className="w-6 h-6 text-orange-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-orange-700">{statistics.categoricalColumns}</p>
                <p className="text-xs text-orange-600">{isRTL ? 'فئوي' : 'Categorical'}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 text-center">
                <AlertTriangle className="w-6 h-6 text-red-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-red-700">{statistics.missingPercentage}%</p>
                <p className="text-xs text-red-600">{isRTL ? 'مفقود' : 'Missing'}</p>
              </div>
              <div className="bg-teal-50 rounded-lg p-4 text-center">
                <Award className="w-6 h-6 text-teal-600 mx-auto mb-2" />
                <p className="text-2xl font-bold text-teal-700">{statistics.dataQuality}%</p>
                <p className="text-xs text-teal-600">{isRTL ? 'الجودة' : 'Quality'}</p>
              </div>
            </div>
          </div>
        )}

        {/* المشاريع الحديثة */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900">
              {isRTL ? 'المشاريع الحديثة' : 'Recent Projects'}
            </h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 rounded-lg transition-colors ${
                  viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400 hover:text-gray-600'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 hover:shadow-md transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between mb-3">
                    {getProjectIcon(project.type)}
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                      {project.starred ? (
                        <Star className="w-4 h-4 text-yellow-500 fill-yellow-500" />
                      ) : (
                        <StarOff className="w-4 h-4 text-gray-300 hover:text-yellow-500" />
                      )}
                    </button>
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2 truncate">{project.name}</h3>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                    <span className="text-xs text-gray-500">{formatDate(project.date)}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-gray-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-4">
                    {getProjectIcon(project.type)}
                    <div>
                      <h3 className="font-medium text-gray-900">{project.name}</h3>
                      <p className="text-sm text-gray-500">{formatDate(project.date)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(project.status)}`}>
                      {getStatusLabel(project.status)}
                    </span>
                    <button className="p-1 text-gray-400 hover:text-gray-600">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* رابط عرض الكل */}
          <div className="mt-6 text-center">
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              {isRTL ? 'عرض جميع المشاريع' : 'View All Projects'} →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfessionalDashboard;
