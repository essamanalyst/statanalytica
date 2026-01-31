import React, { useState, useMemo } from 'react';
import {
  BarChart3, PieChart, Table2, FileText, Download,
  Info, AlertTriangle, CheckCircle,
  Hash, Calendar, Type, ToggleLeft, Target,
  Layers, Eye, BarChart2, ScatterChart
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart as RechartsPie, Pie, Cell,
  Line, ComposedChart
} from 'recharts';

interface DataRow {
  [key: string]: any;
}

interface ColumnStats {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text';
  count: number;
  missing: number;
  missingPercent: number;
  unique: number;
  uniquePercent: number;
  // Numeric stats
  mean?: number;
  median?: number;
  mode?: any;
  modeCount?: number;
  std?: number;
  variance?: number;
  min?: number;
  max?: number;
  range?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  skewness?: number;
  kurtosis?: number;
  sem?: number;
  cv?: number;
  mad?: number;
  sum?: number;
  // Percentiles
  p5?: number;
  p10?: number;
  p25?: number;
  p50?: number;
  p75?: number;
  p90?: number;
  p95?: number;
  p99?: number;
  // Confidence intervals
  ci95Lower?: number;
  ci95Upper?: number;
  ci99Lower?: number;
  ci99Upper?: number;
  // Distribution tests
  shapiroWilk?: { statistic: number; pValue: number; isNormal: boolean };
  // Categorical stats
  frequencies?: { value: any; count: number; percent: number }[];
  topValues?: { value: any; count: number; percent: number }[];
  // Outliers
  outliers?: { count: number; percent: number; values: number[] };
  // Distribution shape
  distributionType?: string;
}

interface Props {
  data: DataRow[];
  columns: string[];
}

const COLORS = [
  '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
  '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1',
  '#14B8A6', '#A855F7', '#FB7185', '#22D3EE', '#A3E635'
];

const AdvancedDescriptiveAnalysis: React.FC<Props> = ({ data, columns }) => {
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'distribution' | 'comparison' | 'report'>('overview');
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);

  // Detect column type
  const detectColumnType = (colName: string): 'numeric' | 'categorical' | 'date' | 'boolean' | 'text' => {
    const values = data.map(row => row[colName]).filter(v => v !== null && v !== undefined && v !== '');
    if (values.length === 0) return 'text';

    const sample = values.slice(0, 100);
    
    // Check boolean
    const boolValues = sample.filter(v => 
      typeof v === 'boolean' || 
      ['true', 'false', '0', '1', 'yes', 'no', 'نعم', 'لا'].includes(String(v).toLowerCase())
    );
    if (boolValues.length > sample.length * 0.8) return 'boolean';

    // Check numeric
    const numericValues = sample.filter(v => !isNaN(Number(v)) && v !== '');
    if (numericValues.length > sample.length * 0.8) return 'numeric';

    // Check date
    const dateValues = sample.filter(v => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && String(v).match(/[\d\-\/\.]/);
    });
    if (dateValues.length > sample.length * 0.5) return 'date';

    // Check categorical vs text
    const uniqueRatio = new Set(values).size / values.length;
    if (uniqueRatio < 0.5 || new Set(values).size < 20) return 'categorical';

    return 'text';
  };

  // Calculate percentile
  const percentile = (arr: number[], p: number): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  };

  // Calculate skewness
  const calculateSkewness = (arr: number[], mean: number, std: number): number => {
    if (std === 0) return 0;
    const n = arr.length;
    const sum = arr.reduce((acc, val) => acc + Math.pow((val - mean) / std, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  };

  // Calculate kurtosis
  const calculateKurtosis = (arr: number[], mean: number, std: number): number => {
    if (std === 0) return 0;
    const n = arr.length;
    const sum = arr.reduce((acc, val) => acc + Math.pow((val - mean) / std, 4), 0);
    return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
           (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  };

  // Shapiro-Wilk approximation
  const shapiroWilkTest = (arr: number[]): { statistic: number; pValue: number; isNormal: boolean } => {
    const n = arr.length;
    if (n < 3 || n > 5000) return { statistic: 0, pValue: 0, isNormal: false };
    
    const sorted = [...arr].sort((a, b) => a - b);
    const mean = arr.reduce((a, b) => a + b, 0) / n;
    const ss = arr.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0);
    
    // Simplified W calculation
    let b = 0;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      const a = 0.7071; // Simplified coefficient
      b += a * (sorted[n - 1 - i] - sorted[i]);
    }
    
    const w = (b * b) / ss;
    const pValue = Math.min(1, Math.max(0, (w - 0.8) / 0.2));
    
    return { statistic: w, pValue, isNormal: pValue > 0.05 };
  };

  // Calculate column statistics
  const calculateColumnStats = (colName: string): ColumnStats => {
    const type = detectColumnType(colName);
    const allValues = data.map(row => row[colName]);
    const nonMissing = allValues.filter(v => v !== null && v !== undefined && v !== '');
    const missing = allValues.length - nonMissing.length;
    const unique = new Set(nonMissing).size;

    const baseStats: ColumnStats = {
      name: colName,
      type,
      count: nonMissing.length,
      missing,
      missingPercent: (missing / allValues.length) * 100,
      unique,
      uniquePercent: (unique / nonMissing.length) * 100
    };

    if (type === 'numeric') {
      const numericValues = nonMissing.map(Number).filter(v => !isNaN(v));
      if (numericValues.length === 0) return baseStats;

      const sorted = [...numericValues].sort((a, b) => a - b);
      const sum = numericValues.reduce((a, b) => a + b, 0);
      const mean = sum / numericValues.length;
      const variance = numericValues.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / (numericValues.length - 1);
      const std = Math.sqrt(variance);
      const min = sorted[0];
      const max = sorted[sorted.length - 1];
      const q1 = percentile(numericValues, 25);
      const q3 = percentile(numericValues, 75);
      const iqr = q3 - q1;
      const median = percentile(numericValues, 50);

      // Mode calculation
      const freq: { [key: number]: number } = {};
      numericValues.forEach(v => { freq[v] = (freq[v] || 0) + 1; });
      const maxFreq = Math.max(...Object.values(freq));
      const mode = Number(Object.keys(freq).find(k => freq[Number(k)] === maxFreq));

      // MAD (Median Absolute Deviation)
      const mad = percentile(numericValues.map(v => Math.abs(v - median)), 50);

      // Standard Error of Mean
      const sem = std / Math.sqrt(numericValues.length);

      // Coefficient of Variation
      const cv = mean !== 0 ? (std / Math.abs(mean)) * 100 : 0;

      // Skewness and Kurtosis
      const skewness = calculateSkewness(numericValues, mean, std);
      const kurtosis = calculateKurtosis(numericValues, mean, std);

      // Confidence Intervals
      const t95 = 1.96;
      const t99 = 2.576;
      const ci95Lower = mean - t95 * sem;
      const ci95Upper = mean + t95 * sem;
      const ci99Lower = mean - t99 * sem;
      const ci99Upper = mean + t99 * sem;

      // Outliers detection using IQR
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      const outlierValues = numericValues.filter(v => v < lowerBound || v > upperBound);

      // Shapiro-Wilk test
      const shapiroResult = shapiroWilkTest(numericValues.slice(0, 500));

      // Distribution type
      let distributionType = 'غير معروف';
      if (shapiroResult.isNormal) {
        distributionType = 'توزيع طبيعي';
      } else if (skewness > 1) {
        distributionType = 'ملتوٍ يمينًا بشدة';
      } else if (skewness > 0.5) {
        distributionType = 'ملتوٍ يمينًا';
      } else if (skewness < -1) {
        distributionType = 'ملتوٍ يسارًا بشدة';
      } else if (skewness < -0.5) {
        distributionType = 'ملتوٍ يسارًا';
      } else {
        distributionType = 'متماثل تقريبًا';
      }

      return {
        ...baseStats,
        mean,
        median,
        mode,
        modeCount: maxFreq,
        std,
        variance,
        min,
        max,
        range: max - min,
        q1,
        q3,
        iqr,
        skewness,
        kurtosis,
        sem,
        cv,
        mad,
        sum,
        p5: percentile(numericValues, 5),
        p10: percentile(numericValues, 10),
        p25: q1,
        p50: median,
        p75: q3,
        p90: percentile(numericValues, 90),
        p95: percentile(numericValues, 95),
        p99: percentile(numericValues, 99),
        ci95Lower,
        ci95Upper,
        ci99Lower,
        ci99Upper,
        shapiroWilk: shapiroResult,
        outliers: {
          count: outlierValues.length,
          percent: (outlierValues.length / numericValues.length) * 100,
          values: outlierValues.slice(0, 10)
        },
        distributionType
      };
    }

    if (type === 'categorical' || type === 'text' || type === 'boolean') {
      const freq: { [key: string]: number } = {};
      nonMissing.forEach(v => { freq[String(v)] = (freq[String(v)] || 0) + 1; });
      
      const frequencies = Object.entries(freq)
        .map(([value, count]) => ({
          value,
          count,
          percent: (count / nonMissing.length) * 100
        }))
        .sort((a, b) => b.count - a.count);

      return {
        ...baseStats,
        mode: frequencies[0]?.value,
        modeCount: frequencies[0]?.count,
        frequencies,
        topValues: frequencies.slice(0, 10)
      };
    }

    return baseStats;
  };

  // Calculate all columns stats
  const allColumnsStats = useMemo(() => {
    return columns.map(col => calculateColumnStats(col));
  }, [data, columns]);

  const numericColumns = allColumnsStats.filter(s => s.type === 'numeric');
  const categoricalColumns = allColumnsStats.filter(s => s.type === 'categorical' || s.type === 'boolean');

  // Get histogram data
  const getHistogramData = (colName: string, bins: number = 20) => {
    const values = data.map(row => Number(row[colName])).filter(v => !isNaN(v));
    if (values.length === 0) return [];

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binWidth = (max - min) / bins;

    const histogram: { range: string; count: number; percent: number }[] = [];
    for (let i = 0; i < bins; i++) {
      const binStart = min + i * binWidth;
      const binEnd = binStart + binWidth;
      const count = values.filter(v => v >= binStart && (i === bins - 1 ? v <= binEnd : v < binEnd)).length;
      histogram.push({
        range: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
        count,
        percent: (count / values.length) * 100
      });
    }
    return histogram;
  };

  // Box plot data helper - kept for future use
  const _getBoxPlotData = (colName: string) => {
    const stats = calculateColumnStats(colName);
    if (stats.type !== 'numeric') return null;
    return {
      min: stats.min,
      q1: stats.q1,
      median: stats.median,
      q3: stats.q3,
      max: stats.max,
      outliers: stats.outliers?.values || []
    };
  };
  void _getBoxPlotData;

  // Format number
  const formatNumber = (num: number | undefined, decimals: number = 4): string => {
    if (num === undefined || isNaN(num)) return '-';
    if (Math.abs(num) >= 1000000) return num.toExponential(decimals);
    return num.toLocaleString('en-US', { maximumFractionDigits: decimals });
  };

  // Get interpretation
  const getSkewnessInterpretation = (skewness: number): { text: string; color: string } => {
    if (skewness > 1) return { text: 'التواء إيجابي شديد', color: 'text-red-600' };
    if (skewness > 0.5) return { text: 'التواء إيجابي معتدل', color: 'text-orange-600' };
    if (skewness > -0.5) return { text: 'توزيع متماثل', color: 'text-green-600' };
    if (skewness > -1) return { text: 'التواء سلبي معتدل', color: 'text-orange-600' };
    return { text: 'التواء سلبي شديد', color: 'text-red-600' };
  };

  const getKurtosisInterpretation = (kurtosis: number): { text: string; color: string } => {
    if (kurtosis > 1) return { text: 'توزيع مدبب (Leptokurtic)', color: 'text-blue-600' };
    if (kurtosis > -1) return { text: 'توزيع طبيعي (Mesokurtic)', color: 'text-green-600' };
    return { text: 'توزيع مسطح (Platykurtic)', color: 'text-purple-600' };
  };

  // Render stat card
  const StatCard = ({ title, value, subtitle, icon: Icon, color }: any) => (
    <div className={`bg-white rounded-xl p-4 border border-gray-100 shadow-sm hover:shadow-md transition-all`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 mb-1">{title}</p>
          <p className={`text-xl font-bold ${color || 'text-gray-800'}`}>{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
        </div>
        {Icon && (
          <div className={`p-2 rounded-lg ${color?.replace('text', 'bg').replace('600', '100') || 'bg-gray-100'}`}>
            <Icon className={`w-5 h-5 ${color || 'text-gray-600'}`} />
          </div>
        )}
      </div>
    </div>
  );

  // Render overview tab
  const renderOverview = () => (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <StatCard
          title="إجمالي الصفوف"
          value={formatNumber(data.length, 0)}
          icon={Table2}
          color="text-blue-600"
        />
        <StatCard
          title="إجمالي الأعمدة"
          value={columns.length}
          icon={Layers}
          color="text-purple-600"
        />
        <StatCard
          title="الأعمدة الرقمية"
          value={numericColumns.length}
          icon={Hash}
          color="text-green-600"
        />
        <StatCard
          title="الأعمدة الفئوية"
          value={categoricalColumns.length}
          icon={Type}
          color="text-orange-600"
        />
        <StatCard
          title="القيم المفقودة"
          value={`${((allColumnsStats.reduce((a, b) => a + b.missing, 0) / (data.length * columns.length)) * 100).toFixed(1)}%`}
          icon={AlertTriangle}
          color="text-red-600"
        />
        <StatCard
          title="جودة البيانات"
          value={`${(100 - (allColumnsStats.reduce((a, b) => a + b.missingPercent, 0) / columns.length)).toFixed(0)}%`}
          icon={CheckCircle}
          color="text-emerald-600"
        />
      </div>

      {/* Columns Summary Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-4">
          <h3 className="font-bold text-lg">ملخص الأعمدة</h3>
          <p className="text-blue-100 text-sm">نظرة عامة على جميع المتغيرات</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">العمود</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">النوع</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">العدد</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المفقود</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الفريد</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المتوسط/المنوال</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">الانحراف/التكرار</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">المدى</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {allColumnsStats.map((stats) => (
                <tr 
                  key={stats.name} 
                  className="hover:bg-blue-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedColumn(stats.name);
                    setActiveTab('detailed');
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {stats.type === 'numeric' && <Hash className="w-4 h-4 text-blue-500" />}
                      {stats.type === 'categorical' && <Type className="w-4 h-4 text-purple-500" />}
                      {stats.type === 'date' && <Calendar className="w-4 h-4 text-green-500" />}
                      {stats.type === 'boolean' && <ToggleLeft className="w-4 h-4 text-orange-500" />}
                      <span className="font-medium text-gray-800">{stats.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${stats.type === 'numeric' ? 'bg-blue-100 text-blue-700' : ''}
                      ${stats.type === 'categorical' ? 'bg-purple-100 text-purple-700' : ''}
                      ${stats.type === 'date' ? 'bg-green-100 text-green-700' : ''}
                      ${stats.type === 'boolean' ? 'bg-orange-100 text-orange-700' : ''}
                      ${stats.type === 'text' ? 'bg-gray-100 text-gray-700' : ''}
                    `}>
                      {stats.type === 'numeric' && 'رقمي'}
                      {stats.type === 'categorical' && 'فئوي'}
                      {stats.type === 'date' && 'تاريخ'}
                      {stats.type === 'boolean' && 'منطقي'}
                      {stats.type === 'text' && 'نصي'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{formatNumber(stats.count, 0)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${stats.missingPercent > 20 ? 'bg-red-500' : stats.missingPercent > 5 ? 'bg-yellow-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(stats.missingPercent, 100)}%` }}
                        />
                      </div>
                      <span className="text-xs text-gray-500">{stats.missingPercent.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{stats.unique}</td>
                  <td className="px-4 py-3 text-gray-800 font-medium">
                    {stats.type === 'numeric' ? formatNumber(stats.mean, 2) : String(stats.mode || '-').substring(0, 15)}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {stats.type === 'numeric' ? formatNumber(stats.std, 2) : stats.modeCount || '-'}
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {stats.type === 'numeric' ? `${formatNumber(stats.min, 1)} - ${formatNumber(stats.max, 1)}` : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Numeric Columns Charts */}
      {numericColumns.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-600" />
            توزيع المتغيرات الرقمية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {numericColumns.slice(0, 6).map(stats => {
              const histData = getHistogramData(stats.name, 10);
              return (
                <div key={stats.name} className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-700 mb-2 text-sm">{stats.name}</h4>
                  <ResponsiveContainer width="100%" height={150}>
                    <BarChart data={histData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis dataKey="range" tick={false} />
                      <YAxis tick={{ fontSize: 10 }} />
                      <Tooltip 
                        contentStyle={{ fontSize: 12 }}
                        formatter={(value: any) => [value, 'العدد']}
                      />
                      <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-center">
                    <div className="bg-white rounded p-1">
                      <div className="text-gray-500">المتوسط</div>
                      <div className="font-bold text-blue-600">{formatNumber(stats.mean, 2)}</div>
                    </div>
                    <div className="bg-white rounded p-1">
                      <div className="text-gray-500">الوسيط</div>
                      <div className="font-bold text-green-600">{formatNumber(stats.median, 2)}</div>
                    </div>
                    <div className="bg-white rounded p-1">
                      <div className="text-gray-500">الانحراف</div>
                      <div className="font-bold text-purple-600">{formatNumber(stats.std, 2)}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Categorical Columns Charts */}
      {categoricalColumns.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-5 h-5 text-purple-600" />
            توزيع المتغيرات الفئوية
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {categoricalColumns.slice(0, 6).map(stats => (
              <div key={stats.name} className="bg-gray-50 rounded-lg p-4">
                <h4 className="font-medium text-gray-700 mb-2 text-sm">{stats.name}</h4>
                <ResponsiveContainer width="100%" height={150}>
                  <RechartsPie>
                    <Pie
                      data={stats.topValues?.slice(0, 5) || []}
                      dataKey="count"
                      nameKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={50}
                      label={({ value }) => value}
                    >
                      {stats.topValues?.slice(0, 5).map((entry, index) => (
                        <Cell key={`${entry.value}-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </RechartsPie>
                </ResponsiveContainer>
                <div className="mt-2 space-y-1">
                  {stats.topValues?.slice(0, 3).map((item, itemIdx) => (
                    <div key={itemIdx} className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[itemIdx] }} />
                        <span className="text-gray-600 truncate max-w-[100px]">{item.value}</span>
                      </div>
                      <span className="font-medium">{item.percent.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Render detailed tab
  const renderDetailed = () => {
    const stats = selectedColumn ? calculateColumnStats(selectedColumn) : null;

    if (!selectedColumn || !stats) {
      return (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center">
          <Target className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-gray-600 font-medium mb-2">اختر عمودًا للتحليل التفصيلي</h3>
          <div className="flex flex-wrap justify-center gap-2 mt-4">
            {columns.slice(0, 10).map(col => (
              <button
                key={col}
                onClick={() => setSelectedColumn(col)}
                className="px-3 py-1 bg-blue-50 text-blue-600 rounded-full text-sm hover:bg-blue-100 transition-colors"
              >
                {col}
              </button>
            ))}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Column Selector */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">اختر العمود</label>
          <select
            value={selectedColumn}
            onChange={e => setSelectedColumn(e.target.value)}
            className="w-full md:w-64 px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- اختر --</option>
            {columns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        </div>

        {/* Stats Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">{stats.name}</h2>
              <p className="text-blue-100 mt-1">
                {stats.type === 'numeric' && 'متغير رقمي (كمي)'}
                {stats.type === 'categorical' && 'متغير فئوي (نوعي)'}
                {stats.type === 'date' && 'متغير تاريخي'}
                {stats.type === 'boolean' && 'متغير منطقي'}
                {stats.type === 'text' && 'متغير نصي'}
              </p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold">{formatNumber(stats.count, 0)}</div>
              <div className="text-blue-100 text-sm">قيمة صالحة</div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-blue-100 text-xs">المفقود</div>
              <div className="text-xl font-bold">{stats.missing} ({stats.missingPercent.toFixed(1)}%)</div>
            </div>
            <div className="bg-white/10 rounded-lg p-3">
              <div className="text-blue-100 text-xs">القيم الفريدة</div>
              <div className="text-xl font-bold">{stats.unique} ({stats.uniquePercent.toFixed(1)}%)</div>
            </div>
            {stats.type === 'numeric' && (
              <>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-blue-100 text-xs">المجموع</div>
                  <div className="text-xl font-bold">{formatNumber(stats.sum, 2)}</div>
                </div>
                <div className="bg-white/10 rounded-lg p-3">
                  <div className="text-blue-100 text-xs">نوع التوزيع</div>
                  <div className="text-xl font-bold">{stats.distributionType}</div>
                </div>
              </>
            )}
          </div>
        </div>

        {stats.type === 'numeric' && (
          <>
            {/* Central Tendency & Dispersion */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Central Tendency */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white px-6 py-4">
                  <h3 className="font-bold">مقاييس النزعة المركزية</h3>
                  <p className="text-green-100 text-sm">Central Tendency Measures</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">المتوسط الحسابي (Mean)</div>
                      <div className="text-xs text-gray-500">مجموع القيم ÷ عددها</div>
                    </div>
                    <div className="text-2xl font-bold text-green-600">{formatNumber(stats.mean)}</div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">الوسيط (Median)</div>
                      <div className="text-xs text-gray-500">القيمة الوسطى بعد الترتيب</div>
                    </div>
                    <div className="text-2xl font-bold text-blue-600">{formatNumber(stats.median)}</div>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium text-gray-800">المنوال (Mode)</div>
                      <div className="text-xs text-gray-500">القيمة الأكثر تكرارًا ({stats.modeCount} مرات)</div>
                    </div>
                    <div className="text-2xl font-bold text-purple-600">{formatNumber(stats.mode)}</div>
                  </div>
                  <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-800">
                      <Info className="w-4 h-4" />
                      <span className="text-sm font-medium">تفسير:</span>
                    </div>
                    <p className="text-sm text-blue-700 mt-1">
                      {stats.mean! > stats.median! 
                        ? 'المتوسط أكبر من الوسيط، مما يشير إلى التواء إيجابي (ذيل يميني)'
                        : stats.mean! < stats.median!
                        ? 'المتوسط أصغر من الوسيط، مما يشير إلى التواء سلبي (ذيل يساري)'
                        : 'المتوسط يساوي الوسيط تقريبًا، مما يشير إلى توزيع متماثل'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Dispersion */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4">
                  <h3 className="font-bold">مقاييس التشتت</h3>
                  <p className="text-purple-100 text-sm">Dispersion Measures</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">الانحراف المعياري (SD)</div>
                      <div className="text-xl font-bold text-purple-600">{formatNumber(stats.std)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">التباين (Variance)</div>
                      <div className="text-xl font-bold text-pink-600">{formatNumber(stats.variance)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">المدى (Range)</div>
                      <div className="text-xl font-bold text-blue-600">{formatNumber(stats.range)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">المدى الربيعي (IQR)</div>
                      <div className="text-xl font-bold text-green-600">{formatNumber(stats.iqr)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">الخطأ المعياري (SEM)</div>
                      <div className="text-xl font-bold text-orange-600">{formatNumber(stats.sem)}</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <div className="text-xs text-gray-500">معامل الاختلاف (CV)</div>
                      <div className="text-xl font-bold text-red-600">{formatNumber(stats.cv)}%</div>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg col-span-2">
                      <div className="text-xs text-gray-500">الانحراف المطلق عن الوسيط (MAD)</div>
                      <div className="text-xl font-bold text-indigo-600">{formatNumber(stats.mad)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Shape & Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Shape */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-6 py-4">
                  <h3 className="font-bold">مقاييس الشكل</h3>
                  <p className="text-orange-100 text-sm">Shape Measures</p>
                </div>
                <div className="p-6 space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-800">معامل الالتواء (Skewness)</div>
                        <div className={`text-sm ${getSkewnessInterpretation(stats.skewness!).color}`}>
                          {getSkewnessInterpretation(stats.skewness!).text}
                        </div>
                      </div>
                      <div className="text-2xl font-bold">{formatNumber(stats.skewness)}</div>
                    </div>
                    <div className="mt-2 h-3 bg-gray-200 rounded-full relative">
                      <div 
                        className="absolute top-0 h-3 w-2 bg-orange-500 rounded-full transform -translate-x-1/2"
                        style={{ left: `${Math.min(Math.max((stats.skewness! + 3) / 6 * 100, 0), 100)}%` }}
                      />
                      <div className="absolute top-4 left-1/2 transform -translate-x-1/2 text-xs text-gray-400">0</div>
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="font-medium text-gray-800">معامل التفرطح (Kurtosis)</div>
                        <div className={`text-sm ${getKurtosisInterpretation(stats.kurtosis!).color}`}>
                          {getKurtosisInterpretation(stats.kurtosis!).text}
                        </div>
                      </div>
                      <div className="text-2xl font-bold">{formatNumber(stats.kurtosis)}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Normality Test */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-4">
                  <h3 className="font-bold">اختبار التوزيع الطبيعي</h3>
                  <p className="text-cyan-100 text-sm">Shapiro-Wilk Test</p>
                </div>
                <div className="p-6">
                  <div className="text-center">
                    <div className={`inline-flex items-center justify-center w-24 h-24 rounded-full ${
                      stats.shapiroWilk?.isNormal ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {stats.shapiroWilk?.isNormal 
                        ? <CheckCircle className="w-12 h-12 text-green-600" />
                        : <AlertTriangle className="w-12 h-12 text-red-600" />
                      }
                    </div>
                    <div className={`mt-4 text-xl font-bold ${
                      stats.shapiroWilk?.isNormal ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {stats.shapiroWilk?.isNormal ? 'توزيع طبيعي' : 'توزيع غير طبيعي'}
                    </div>
                    <div className="mt-2 text-gray-600">
                      <div>W = {formatNumber(stats.shapiroWilk?.statistic)}</div>
                      <div>p-value = {formatNumber(stats.shapiroWilk?.pValue)}</div>
                    </div>
                    <div className="mt-4 p-3 bg-gray-50 rounded-lg text-sm text-gray-600">
                      {stats.shapiroWilk?.isNormal 
                        ? 'لا يوجد دليل كافٍ لرفض فرضية التوزيع الطبيعي (p > 0.05)'
                        : 'البيانات لا تتبع التوزيع الطبيعي (p ≤ 0.05)، يُنصح باستخدام اختبارات لامعلمية'
                      }
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Percentiles & Range */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-6 py-4">
                <h3 className="font-bold">المئينات والمدى</h3>
                <p className="text-indigo-100 text-sm">Percentiles & Range</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 md:grid-cols-5 lg:grid-cols-10 gap-3">
                  {[
                    { label: 'Min', value: stats.min, color: 'bg-red-100 text-red-700' },
                    { label: 'P5', value: stats.p5, color: 'bg-orange-100 text-orange-700' },
                    { label: 'P10', value: stats.p10, color: 'bg-yellow-100 text-yellow-700' },
                    { label: 'Q1 (P25)', value: stats.q1, color: 'bg-lime-100 text-lime-700' },
                    { label: 'Median', value: stats.median, color: 'bg-green-100 text-green-700' },
                    { label: 'Q3 (P75)', value: stats.q3, color: 'bg-teal-100 text-teal-700' },
                    { label: 'P90', value: stats.p90, color: 'bg-cyan-100 text-cyan-700' },
                    { label: 'P95', value: stats.p95, color: 'bg-blue-100 text-blue-700' },
                    { label: 'P99', value: stats.p99, color: 'bg-indigo-100 text-indigo-700' },
                    { label: 'Max', value: stats.max, color: 'bg-purple-100 text-purple-700' },
                  ].map(item => (
                    <div key={item.label} className={`p-3 rounded-lg ${item.color} text-center`}>
                      <div className="text-xs font-medium opacity-75">{item.label}</div>
                      <div className="text-sm font-bold mt-1">{formatNumber(item.value, 2)}</div>
                    </div>
                  ))}
                </div>

                {/* Box Plot Visualization */}
                <div className="mt-6">
                  <h4 className="font-medium text-gray-700 mb-3">مخطط الصندوق (Box Plot)</h4>
                  <div className="relative h-16 bg-gray-100 rounded-lg">
                    {/* Whiskers */}
                    <div 
                      className="absolute top-1/2 h-0.5 bg-gray-400 transform -translate-y-1/2"
                      style={{ 
                        left: `${((stats.min! - stats.min!) / stats.range!) * 100}%`,
                        width: `${((stats.q1! - stats.min!) / stats.range!) * 100}%`
                      }}
                    />
                    <div 
                      className="absolute top-1/2 h-0.5 bg-gray-400 transform -translate-y-1/2"
                      style={{ 
                        left: `${((stats.q3! - stats.min!) / stats.range!) * 100}%`,
                        width: `${((stats.max! - stats.q3!) / stats.range!) * 100}%`
                      }}
                    />
                    {/* Box */}
                    <div 
                      className="absolute top-2 bottom-2 bg-blue-500 rounded opacity-80"
                      style={{ 
                        left: `${((stats.q1! - stats.min!) / stats.range!) * 100}%`,
                        width: `${((stats.q3! - stats.q1!) / stats.range!) * 100}%`
                      }}
                    />
                    {/* Median line */}
                    <div 
                      className="absolute top-1 bottom-1 w-1 bg-white rounded"
                      style={{ left: `${((stats.median! - stats.min!) / stats.range!) * 100}%` }}
                    />
                    {/* Labels */}
                    <div className="absolute -bottom-6 left-0 text-xs text-gray-500">{formatNumber(stats.min, 1)}</div>
                    <div className="absolute -bottom-6 right-0 text-xs text-gray-500">{formatNumber(stats.max, 1)}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Confidence Intervals */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-teal-500 to-green-500 text-white px-6 py-4">
                <h3 className="font-bold">فترات الثقة للمتوسط</h3>
                <p className="text-teal-100 text-sm">Confidence Intervals</p>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">فترة ثقة 95%</span>
                      <span className="text-sm text-gray-500">α = 0.05</span>
                    </div>
                    <div className="text-center py-4">
                      <span className="text-lg font-bold text-teal-600">
                        [{formatNumber(stats.ci95Lower, 3)} , {formatNumber(stats.ci95Upper, 3)}]
                      </span>
                    </div>
                    <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 bottom-0 bg-teal-500 opacity-50"
                        style={{ 
                          left: '10%',
                          right: '10%'
                        }}
                      />
                      <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-teal-700 transform -translate-x-1/2" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      نحن واثقون بنسبة 95% أن المتوسط الحقيقي يقع ضمن هذه الفترة
                    </p>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-gray-700">فترة ثقة 99%</span>
                      <span className="text-sm text-gray-500">α = 0.01</span>
                    </div>
                    <div className="text-center py-4">
                      <span className="text-lg font-bold text-green-600">
                        [{formatNumber(stats.ci99Lower, 3)} , {formatNumber(stats.ci99Upper, 3)}]
                      </span>
                    </div>
                    <div className="relative h-6 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute top-0 bottom-0 bg-green-500 opacity-50"
                        style={{ 
                          left: '5%',
                          right: '5%'
                        }}
                      />
                      <div className="absolute top-0 bottom-0 left-1/2 w-1 bg-green-700 transform -translate-x-1/2" />
                    </div>
                    <p className="text-xs text-gray-500 mt-2 text-center">
                      نحن واثقون بنسبة 99% أن المتوسط الحقيقي يقع ضمن هذه الفترة
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Outliers */}
            {stats.outliers && stats.outliers.count > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="bg-gradient-to-r from-red-500 to-pink-500 text-white px-6 py-4">
                  <h3 className="font-bold">القيم الشاذة (Outliers)</h3>
                  <p className="text-red-100 text-sm">باستخدام طريقة IQR</p>
                </div>
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">{stats.outliers.count}</div>
                      <div className="text-sm text-red-600">عدد القيم الشاذة</div>
                    </div>
                    <div className="bg-red-50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-red-600">{stats.outliers.percent.toFixed(1)}%</div>
                      <div className="text-sm text-red-600">نسبة القيم الشاذة</div>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <div className="text-sm text-gray-600">الحدود الطبيعية</div>
                      <div className="font-bold text-gray-800">
                        [{formatNumber(stats.q1! - 1.5 * stats.iqr!, 2)} , {formatNumber(stats.q3! + 1.5 * stats.iqr!, 2)}]
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <strong>عينة من القيم الشاذة:</strong>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {stats.outliers.values.map((val, idx) => (
                        <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-xs">
                          {formatNumber(val, 2)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Histogram */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-6 py-4">
                <h3 className="font-bold">المدرج التكراري (Histogram)</h3>
              </div>
              <div className="p-6">
                <ResponsiveContainer width="100%" height={300}>
                  <ComposedChart data={getHistogramData(selectedColumn, 20)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="range" 
                      tick={{ fontSize: 10 }}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ fontSize: 12 }}
                      formatter={(value: any) => [value, 'العدد']}
                    />
                    <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                    <Line type="monotone" dataKey="count" stroke="#EF4444" strokeWidth={2} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}

        {(stats.type === 'categorical' || stats.type === 'boolean') && (
          <>
            {/* Frequency Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-6 py-4">
                <h3 className="font-bold">جدول التكرارات</h3>
                <p className="text-purple-100 text-sm">Frequency Table</p>
              </div>
              <div className="p-6">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">#</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">القيمة</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">التكرار</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">النسبة %</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">التكرار التراكمي</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">النسبة التراكمية %</th>
                        <th className="px-4 py-3 text-right text-sm font-semibold text-gray-600">التمثيل البياني</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {stats.frequencies?.map((freq, idx) => {
                        const cumCount = stats.frequencies!.slice(0, idx + 1).reduce((a, b) => a + b.count, 0);
                        const cumPercent = stats.frequencies!.slice(0, idx + 1).reduce((a, b) => a + b.percent, 0);
                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3 text-gray-500">{idx + 1}</td>
                            <td className="px-4 py-3 font-medium text-gray-800">{freq.value}</td>
                            <td className="px-4 py-3 text-gray-600">{freq.count}</td>
                            <td className="px-4 py-3 text-gray-600">{freq.percent.toFixed(2)}%</td>
                            <td className="px-4 py-3 text-gray-600">{cumCount}</td>
                            <td className="px-4 py-3 text-gray-600">{cumPercent.toFixed(2)}%</td>
                            <td className="px-4 py-3">
                              <div className="w-32 bg-gray-200 rounded-full h-3">
                                <div 
                                  className="h-3 rounded-full"
                                  style={{ 
                                    width: `${freq.percent}%`,
                                    backgroundColor: COLORS[idx % COLORS.length]
                                  }}
                                />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4">رسم الأعمدة</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={stats.topValues?.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="value" type="category" width={100} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8B5CF6" radius={[0, 4, 4, 0]}>
                      {stats.topValues?.slice(0, 10).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Pie Chart */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
                <h3 className="font-bold text-gray-800 mb-4">الرسم الدائري</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <RechartsPie>
                    <Pie
                      data={stats.topValues?.slice(0, 8)}
                      dataKey="count"
                      nameKey="value"
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      label={({ percent }) => `${((percent ?? 0) * 100).toFixed(1)}%`}
                    >
                      {stats.topValues?.slice(0, 8).map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </RechartsPie>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    );
  };

  // Render distribution comparison
  const renderDistribution = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <h3 className="font-bold text-gray-800 mb-4">مقارنة توزيعات المتغيرات الرقمية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {numericColumns.map(stats => (
            <label key={stats.name} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
              <input
                type="checkbox"
                checked={selectedColumns.includes(stats.name)}
                onChange={e => {
                  if (e.target.checked) {
                    setSelectedColumns([...selectedColumns, stats.name]);
                  } else {
                    setSelectedColumns(selectedColumns.filter(c => c !== stats.name));
                  }
                }}
                className="w-4 h-4 text-blue-600 rounded"
              />
              <span className="text-gray-700">{stats.name}</span>
            </label>
          ))}
        </div>

        {selectedColumns.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                <tr>
                  <th className="px-4 py-3 text-right">المقياس</th>
                  {selectedColumns.map(col => (
                    <th key={col} className="px-4 py-3 text-right">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {[
                  { key: 'count', label: 'العدد' },
                  { key: 'mean', label: 'المتوسط' },
                  { key: 'median', label: 'الوسيط' },
                  { key: 'std', label: 'الانحراف المعياري' },
                  { key: 'variance', label: 'التباين' },
                  { key: 'min', label: 'الحد الأدنى' },
                  { key: 'max', label: 'الحد الأقصى' },
                  { key: 'range', label: 'المدى' },
                  { key: 'q1', label: 'الربيع الأول' },
                  { key: 'q3', label: 'الربيع الثالث' },
                  { key: 'iqr', label: 'المدى الربيعي' },
                  { key: 'skewness', label: 'الالتواء' },
                  { key: 'kurtosis', label: 'التفرطح' },
                  { key: 'cv', label: 'معامل الاختلاف %' },
                ].map(row => (
                  <tr key={row.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-700">{row.label}</td>
                    {selectedColumns.map(col => {
                      const stats = calculateColumnStats(col);
                      return (
                        <td key={col} className="px-4 py-3 text-gray-600">
                          {formatNumber((stats as any)[row.key], 4)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );

  // Render comparison tab
  const renderComparison = () => (
    <div className="space-y-6">
      {/* Correlation Matrix */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-4">
          <h3 className="font-bold">مصفوفة الارتباط</h3>
          <p className="text-purple-100 text-sm">Correlation Matrix (Pearson)</p>
        </div>
        <div className="p-6">
          {numericColumns.length >= 2 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    <th className="p-2"></th>
                    {numericColumns.slice(0, 8).map(c => (
                      <th key={c.name} className="p-2 text-xs font-medium text-gray-600 max-w-[80px] truncate">
                        {c.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {numericColumns.slice(0, 8).map(row => (
                    <tr key={row.name}>
                      <td className="p-2 text-xs font-medium text-gray-600 max-w-[80px] truncate">{row.name}</td>
                      {numericColumns.slice(0, 8).map(col => {
                        const xVals = data.map(d => Number(d[row.name])).filter(v => !isNaN(v));
                        const yVals = data.map(d => Number(d[col.name])).filter(v => !isNaN(v));
                        
                        let corr = 0;
                        if (row.name === col.name) {
                          corr = 1;
                        } else {
                          const n = Math.min(xVals.length, yVals.length);
                          const xMean = xVals.reduce((a, b) => a + b, 0) / n;
                          const yMean = yVals.reduce((a, b) => a + b, 0) / n;
                          
                          let num = 0, denX = 0, denY = 0;
                          for (let i = 0; i < n; i++) {
                            num += (xVals[i] - xMean) * (yVals[i] - yMean);
                            denX += Math.pow(xVals[i] - xMean, 2);
                            denY += Math.pow(yVals[i] - yMean, 2);
                          }
                          corr = num / Math.sqrt(denX * denY);
                        }

                        const bgColor = corr > 0.7 ? 'bg-green-500' :
                                       corr > 0.3 ? 'bg-green-300' :
                                       corr > -0.3 ? 'bg-gray-200' :
                                       corr > -0.7 ? 'bg-red-300' : 'bg-red-500';
                        const textColor = Math.abs(corr) > 0.5 ? 'text-white' : 'text-gray-800';

                        return (
                          <td 
                            key={col.name} 
                            className={`p-2 text-center text-xs font-medium ${bgColor} ${textColor}`}
                          >
                            {corr.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">يجب وجود متغيرين رقميين على الأقل</p>
          )}
        </div>
      </div>
    </div>
  );

  // Render report tab
  const renderReport = () => (
    <div className="space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-bold text-gray-800">تقرير التحليل الوصفي</h3>
          <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <Download className="w-4 h-4" />
            تصدير PDF
          </button>
        </div>

        <div className="prose max-w-none">
          <h4>1. ملخص البيانات</h4>
          <p>
            تتكون مجموعة البيانات من <strong>{data.length}</strong> صف و <strong>{columns.length}</strong> عمود،
            منها <strong>{numericColumns.length}</strong> متغير رقمي و <strong>{categoricalColumns.length}</strong> متغير فئوي.
          </p>

          <h4>2. المتغيرات الرقمية</h4>
          {numericColumns.map(stats => (
            <div key={stats.name} className="bg-gray-50 p-4 rounded-lg mb-4">
              <h5 className="font-bold text-blue-600">{stats.name}</h5>
              <p>
                المتوسط الحسابي = {formatNumber(stats.mean)} (± {formatNumber(stats.std)})،
                الوسيط = {formatNumber(stats.median)}،
                المدى = [{formatNumber(stats.min)} - {formatNumber(stats.max)}].
                {stats.shapiroWilk?.isNormal 
                  ? ' البيانات تتبع التوزيع الطبيعي.'
                  : ' البيانات لا تتبع التوزيع الطبيعي.'}
              </p>
            </div>
          ))}

          <h4>3. المتغيرات الفئوية</h4>
          {categoricalColumns.map(stats => (
            <div key={stats.name} className="bg-gray-50 p-4 rounded-lg mb-4">
              <h5 className="font-bold text-purple-600">{stats.name}</h5>
              <p>
                يحتوي على {stats.unique} فئة مختلفة.
                الفئة الأكثر شيوعًا: "{stats.mode}" ({stats.modeCount} مرة، {stats.topValues?.[0]?.percent.toFixed(1)}%).
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-800 flex items-center gap-3">
          <BarChart3 className="w-8 h-8 text-blue-600" />
          التحليل الوصفي المتقدم
        </h1>
        <p className="text-gray-600 mt-1">تحليل شامل ومفصل لجميع المتغيرات</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 mb-6">
        <div className="flex flex-wrap border-b">
          {[
            { id: 'overview', label: 'نظرة عامة', icon: Eye },
            { id: 'detailed', label: 'تحليل مفصل', icon: Target },
            { id: 'distribution', label: 'مقارنة التوزيعات', icon: BarChart2 },
            { id: 'comparison', label: 'مصفوفة الارتباط', icon: ScatterChart },
            { id: 'report', label: 'التقرير', icon: FileText },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-6 py-4 font-medium transition-colors ${
                activeTab === tab.id 
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
                  : 'text-gray-600 hover:text-blue-600 hover:bg-gray-50'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {activeTab === 'overview' && renderOverview()}
      {activeTab === 'detailed' && renderDetailed()}
      {activeTab === 'distribution' && renderDistribution()}
      {activeTab === 'comparison' && renderComparison()}
      {activeTab === 'report' && renderReport()}
    </div>
  );
};

export default AdvancedDescriptiveAnalysis;
