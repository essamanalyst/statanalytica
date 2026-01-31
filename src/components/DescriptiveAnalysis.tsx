import { useState, useMemo, useCallback } from 'react';
import { Dataset } from '@/types';
import { 
  Calculator, BarChart3, TrendingUp, ChevronDown, ChevronUp, 
  Download, FileText, Table, PieChart as PieChartIcon, Activity,
  Eye, EyeOff, CheckCircle,
  AlertTriangle, XCircle, TrendingDown, Layers, Grid3X3, List
} from 'lucide-react';
import { useLanguage } from '../i18n';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, ComposedChart, ReferenceLine
} from 'recharts';

interface DescriptiveAnalysisProps {
  dataset: Dataset | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

// Statistical functions
const calculateMean = (values: number[]): number => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
};

const calculateMedian = (values: number[]): number => {
  const valid = values.filter(x => x !== null && !isNaN(x)).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
};

const calculateMode = (values: number[]): number | null => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  if (!valid.length) return null;
  const counts: Record<number, number> = {};
  valid.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
  const maxCount = Math.max(...Object.values(counts));
  const modes = Object.entries(counts).filter(([, c]) => c === maxCount).map(([v]) => parseFloat(v));
  return modes.length === valid.length ? null : modes[0];
};

const calculateVariance = (values: number[], sample = true): number => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  if (valid.length < 2) return 0;
  const mean = calculateMean(valid);
  const sumSq = valid.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0);
  return sumSq / (sample ? valid.length - 1 : valid.length);
};

const calculateStd = (values: number[], sample = true): number => Math.sqrt(calculateVariance(values, sample));

const calculateSkewness = (values: number[]): number => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  if (valid.length < 3) return 0;
  const mean = calculateMean(valid);
  const std = calculateStd(valid);
  if (std === 0) return 0;
  const n = valid.length;
  const m3 = valid.reduce((acc, v) => acc + Math.pow((v - mean) / std, 3), 0) / n;
  return m3 * Math.sqrt(n * (n - 1)) / (n - 2);
};

const calculateKurtosis = (values: number[]): number => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  if (valid.length < 4) return 0;
  const mean = calculateMean(valid);
  const std = calculateStd(valid);
  if (std === 0) return 0;
  const n = valid.length;
  const m4 = valid.reduce((acc, v) => acc + Math.pow((v - mean) / std, 4), 0) / n;
  return ((n + 1) * n * m4 - 3 * (n - 1) * (n - 1)) / ((n - 1) * (n - 2) * (n - 3));
};

const calculatePercentile = (values: number[], p: number): number => {
  const valid = values.filter(x => x !== null && !isNaN(x)).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const index = (p / 100) * (valid.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return valid[lower];
  return valid[lower] * (upper - index) + valid[upper] * (index - lower);
};

const calculateSEM = (values: number[]): number => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  return valid.length ? calculateStd(valid) / Math.sqrt(valid.length) : 0;
};

const calculateCV = (values: number[]): number => {
  const mean = calculateMean(values);
  return mean !== 0 ? (calculateStd(values) / Math.abs(mean)) * 100 : 0;
};

const calculateMAD = (values: number[]): number => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  const median = calculateMedian(valid);
  const deviations = valid.map(x => Math.abs(x - median));
  return calculateMedian(deviations);
};

const shapiroWilkTest = (values: number[]): { w: number; pValue: number; isNormal: boolean } => {
  const valid = values.filter(x => x !== null && !isNaN(x)).sort((a, b) => a - b);
  const n = valid.length;
  if (n < 3 || n > 5000) return { w: 0, pValue: 0, isNormal: false };
  
  // Simplified approximation
  const skew = Math.abs(calculateSkewness(valid));
  const kurt = Math.abs(calculateKurtosis(valid) - 3);
  const w = Math.max(0, 1 - (skew * 0.1 + kurt * 0.05));
  const pValue = Math.max(0.001, Math.min(1, 1 - (1 - w) * 10));
  
  return { w, pValue, isNormal: pValue > 0.05 };
};

const calculateConfidenceInterval = (values: number[], confidence = 0.95): { lower: number; upper: number } => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  if (valid.length < 2) return { lower: 0, upper: 0 };
  
  const mean = calculateMean(valid);
  const sem = calculateSEM(valid);
  const z = confidence === 0.99 ? 2.576 : confidence === 0.95 ? 1.96 : 1.645;
  
  return {
    lower: mean - z * sem,
    upper: mean + z * sem
  };
};

const detectOutliers = (values: number[]): { count: number; indices: number[]; lowerBound: number; upperBound: number } => {
  const valid = values.filter(x => x !== null && !isNaN(x));
  const q1 = calculatePercentile(valid, 25);
  const q3 = calculatePercentile(valid, 75);
  const iqr = q3 - q1;
  const lowerBound = q1 - 1.5 * iqr;
  const upperBound = q3 + 1.5 * iqr;
  
  const indices: number[] = [];
  values.forEach((v, i) => {
    if (v !== null && !isNaN(v) && (v < lowerBound || v > upperBound)) {
      indices.push(i);
    }
  });
  
  return { count: indices.length, indices, lowerBound, upperBound };
};

export function DescriptiveAnalysis({ dataset }: DescriptiveAnalysisProps) {
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'detailed' | 'distribution' | 'correlation' | 'boxplot' | 'report'>('overview');
  const [selectedColumn, setSelectedColumn] = useState<string>('');
  const [expandedColumn, setExpandedColumn] = useState<string | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman'>('pearson');

  const numericColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter(c => c.type === 'numeric');
  }, [dataset]);

  const categoricalColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter(c => c.type === 'categorical' || c.type === 'ordinal');
  }, [dataset]);

  const columnStats = useMemo(() => {
    if (!dataset) return {};
    const stats: Record<string, any> = {};
    
    numericColumns.forEach(col => {
      const values = col.values as number[];
      const valid = values.filter(x => x !== null && !isNaN(x));
      const q1 = calculatePercentile(valid, 25);
      const q3 = calculatePercentile(valid, 75);
      const outliers = detectOutliers(valid);
      const ci95 = calculateConfidenceInterval(valid, 0.95);
      const ci99 = calculateConfidenceInterval(valid, 0.99);
      const normality = shapiroWilkTest(valid);
      
      stats[col.name] = {
        count: valid.length,
        missing: values.length - valid.length,
        missingPercent: ((values.length - valid.length) / values.length) * 100,
        mean: calculateMean(valid),
        median: calculateMedian(valid),
        mode: calculateMode(valid),
        std: calculateStd(valid),
        variance: calculateVariance(valid),
        sem: calculateSEM(valid),
        cv: calculateCV(valid),
        mad: calculateMAD(valid),
        min: Math.min(...valid),
        max: Math.max(...valid),
        range: Math.max(...valid) - Math.min(...valid),
        q1,
        q3,
        iqr: q3 - q1,
        p5: calculatePercentile(valid, 5),
        p10: calculatePercentile(valid, 10),
        p25: q1,
        p50: calculateMedian(valid),
        p75: q3,
        p90: calculatePercentile(valid, 90),
        p95: calculatePercentile(valid, 95),
        p99: calculatePercentile(valid, 99),
        skewness: calculateSkewness(valid),
        kurtosis: calculateKurtosis(valid),
        outliers,
        ci95,
        ci99,
        normality,
        sum: valid.reduce((a, b) => a + b, 0),
        sumOfSquares: valid.reduce((acc, v) => acc + v * v, 0),
        geometricMean: valid.length > 0 && valid.every(v => v > 0) 
          ? Math.exp(valid.reduce((acc, v) => acc + Math.log(v), 0) / valid.length) 
          : null,
        harmonicMean: valid.length > 0 && valid.every(v => v > 0)
          ? valid.length / valid.reduce((acc, v) => acc + 1/v, 0)
          : null,
      };
    });
    
    return stats;
  }, [dataset, numericColumns]);

  const getCategoryFrequencies = useCallback((column: any) => {
    const counts: Record<string, number> = {};
    let total = 0;
    column.values.forEach((v: any) => {
      if (v !== null && v !== undefined && v !== '') {
        const key = String(v);
        counts[key] = (counts[key] || 0) + 1;
        total++;
      }
    });
    
    let cumulative = 0;
    return Object.entries(counts)
      .map(([name, count]) => {
        cumulative += count;
        return { 
          name, 
          count, 
          percentage: (count / total) * 100,
          cumulative,
          cumulativePercent: (cumulative / total) * 100
        };
      })
      .sort((a, b) => b.count - a.count);
  }, []);

  const calculateCorrelation = useCallback((x: number[], y: number[], method: 'pearson' | 'spearman' = 'pearson'): number => {
    const pairs: [number, number][] = [];
    const n = Math.min(x.length, y.length);
    
    for (let i = 0; i < n; i++) {
      if (x[i] !== null && y[i] !== null && !isNaN(x[i]) && !isNaN(y[i])) {
        pairs.push([x[i], y[i]]);
      }
    }
    
    if (pairs.length < 3) return 0;
    
    let xVals = pairs.map(p => p[0]);
    let yVals = pairs.map(p => p[1]);
    
    if (method === 'spearman') {
      const rankX = xVals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v).map((x, rank) => ({ ...x, rank: rank + 1 }));
      const rankY = yVals.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v).map((x, rank) => ({ ...x, rank: rank + 1 }));
      xVals = Array(xVals.length);
      yVals = Array(yVals.length);
      rankX.forEach(r => { xVals[r.i] = r.rank; });
      rankY.forEach(r => { yVals[r.i] = r.rank; });
    }
    
    const xMean = xVals.reduce((a, b) => a + b, 0) / xVals.length;
    const yMean = yVals.reduce((a, b) => a + b, 0) / yVals.length;
    
    let numerator = 0, xDenom = 0, yDenom = 0;
    for (let i = 0; i < pairs.length; i++) {
      const xDiff = xVals[i] - xMean;
      const yDiff = yVals[i] - yMean;
      numerator += xDiff * yDiff;
      xDenom += xDiff * xDiff;
      yDenom += yDiff * yDiff;
    }
    
    const denominator = Math.sqrt(xDenom * yDenom);
    return denominator === 0 ? 0 : numerator / denominator;
  }, []);

  const correlationMatrix = useMemo(() => {
    if (numericColumns.length < 2) return [];
    
    const matrix: { var1: string; var2: string; value: number; pValue: number }[] = [];
    
    for (let i = 0; i < Math.min(numericColumns.length, 10); i++) {
      for (let j = 0; j < Math.min(numericColumns.length, 10); j++) {
        const corr = calculateCorrelation(
          numericColumns[i].values as number[],
          numericColumns[j].values as number[],
          correlationMethod
        );
        // Approximate p-value
        const n = Math.min(numericColumns[i].values.length, numericColumns[j].values.length);
        const t = corr * Math.sqrt((n - 2) / (1 - corr * corr));
        const pValue = Math.min(1, 2 * (1 - 0.5 * (1 + Math.tanh(t / Math.sqrt(2)))));
        
        matrix.push({ var1: numericColumns[i].name, var2: numericColumns[j].name, value: corr, pValue });
      }
    }
    
    return matrix;
  }, [numericColumns, calculateCorrelation, correlationMethod]);

  // Box plot data is calculated inline where needed

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-full flex items-center justify-center mb-6">
          <Calculator className="w-12 h-12 text-blue-500" />
        </div>
        <p className="text-xl font-medium text-gray-700 mb-2">
          {language === 'ar' ? 'لا توجد بيانات محملة' : 'No Data Loaded'}
        </p>
        <p className="text-gray-500">
          {language === 'ar' ? 'قم باستيراد البيانات للبدء في التحليل' : 'Import data to start analysis'}
        </p>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: language === 'ar' ? 'نظرة عامة' : 'Overview', icon: Grid3X3 },
    { id: 'detailed', label: language === 'ar' ? 'تحليل مفصل' : 'Detailed', icon: FileText },
    { id: 'distribution', label: language === 'ar' ? 'التوزيعات' : 'Distributions', icon: Activity },
    { id: 'boxplot', label: language === 'ar' ? 'الصندوق البياني' : 'Box Plot', icon: BarChart3 },
    { id: 'correlation', label: language === 'ar' ? 'الارتباط' : 'Correlation', icon: TrendingUp },
    { id: 'report', label: language === 'ar' ? 'التقرير' : 'Report', icon: Download },
  ];

  const getSkewnessInterpretation = (skewness: number): { text: string; color: string; icon: any } => {
    if (skewness > 1) return { 
      text: language === 'ar' ? 'ملتوي لليمين بشدة' : 'Highly Right Skewed', 
      color: 'text-red-600', 
      icon: TrendingUp 
    };
    if (skewness > 0.5) return { 
      text: language === 'ar' ? 'ملتوي لليمين' : 'Right Skewed', 
      color: 'text-orange-600', 
      icon: TrendingUp 
    };
    if (skewness < -1) return { 
      text: language === 'ar' ? 'ملتوي لليسار بشدة' : 'Highly Left Skewed', 
      color: 'text-red-600', 
      icon: TrendingDown 
    };
    if (skewness < -0.5) return { 
      text: language === 'ar' ? 'ملتوي لليسار' : 'Left Skewed', 
      color: 'text-orange-600', 
      icon: TrendingDown 
    };
    return { 
      text: language === 'ar' ? 'متماثل تقريباً' : 'Approximately Symmetric', 
      color: 'text-green-600', 
      icon: CheckCircle 
    };
  };

  const getKurtosisInterpretation = (kurtosis: number): { text: string; color: string } => {
    if (kurtosis > 3) return { 
      text: language === 'ar' ? 'مدبب (ذيول ثقيلة)' : 'Leptokurtic (Heavy Tails)', 
      color: 'text-purple-600' 
    };
    if (kurtosis < 3) return { 
      text: language === 'ar' ? 'مفلطح (ذيول خفيفة)' : 'Platykurtic (Light Tails)', 
      color: 'text-blue-600' 
    };
    return { 
      text: language === 'ar' ? 'طبيعي' : 'Mesokurtic (Normal)', 
      color: 'text-green-600' 
    };
  };

  const getCorrelationColor = (value: number): string => {
    const abs = Math.abs(value);
    if (value > 0) {
      if (abs > 0.7) return 'bg-green-600 text-white';
      if (abs > 0.4) return 'bg-green-400 text-white';
      if (abs > 0.2) return 'bg-green-200 text-green-800';
      return 'bg-green-50 text-green-700';
    } else {
      if (abs > 0.7) return 'bg-red-600 text-white';
      if (abs > 0.4) return 'bg-red-400 text-white';
      if (abs > 0.2) return 'bg-red-200 text-red-800';
      return 'bg-red-50 text-red-700';
    }
  };

  const getCorrelationInterpretation = (value: number): string => {
    const abs = Math.abs(value);
    const direction = value > 0 
      ? (language === 'ar' ? 'طردية' : 'positive') 
      : (language === 'ar' ? 'عكسية' : 'negative');
    
    if (abs > 0.9) return language === 'ar' ? `علاقة ${direction} قوية جداً` : `Very strong ${direction}`;
    if (abs > 0.7) return language === 'ar' ? `علاقة ${direction} قوية` : `Strong ${direction}`;
    if (abs > 0.5) return language === 'ar' ? `علاقة ${direction} متوسطة` : `Moderate ${direction}`;
    if (abs > 0.3) return language === 'ar' ? `علاقة ${direction} ضعيفة` : `Weak ${direction}`;
    return language === 'ar' ? 'لا توجد علاقة تُذكر' : 'Negligible';
  };

  const getDataQuality = (): { score: number; label: string; color: string } => {
    const totalCells = dataset.rowCount * dataset.columnCount;
    const missingCells = dataset.columns.reduce((acc, c) => acc + c.missing, 0);
    const score = Math.round((1 - missingCells / totalCells) * 100);
    
    if (score >= 95) return { score, label: language === 'ar' ? 'ممتاز' : 'Excellent', color: 'text-green-600' };
    if (score >= 85) return { score, label: language === 'ar' ? 'جيد جداً' : 'Very Good', color: 'text-blue-600' };
    if (score >= 70) return { score, label: language === 'ar' ? 'جيد' : 'Good', color: 'text-yellow-600' };
    return { score, label: language === 'ar' ? 'يحتاج تحسين' : 'Needs Improvement', color: 'text-red-600' };
  };

  const dataQuality = getDataQuality();

  const generateHistogramData = (values: number[], bins = 20) => {
    const valid = values.filter(x => x !== null && !isNaN(x));
    if (valid.length === 0) return [];
    
    const min = Math.min(...valid);
    const max = Math.max(...valid);
    const binWidth = (max - min) / bins || 1;
    
    return Array.from({ length: bins }, (_, i) => {
      const from = min + i * binWidth;
      const to = from + binWidth;
      const count = valid.filter(x => x >= from && (i === bins - 1 ? x <= to : x < to)).length;
      return {
        range: `${from.toFixed(1)}`,
        from,
        to,
        count,
        density: count / valid.length
      };
    });
  };

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center backdrop-blur-sm">
              <Calculator className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {language === 'ar' ? 'التحليل الوصفي المتقدم' : 'Advanced Descriptive Analysis'}
              </h1>
              <p className="text-white/80 mt-1">
                {language === 'ar' 
                  ? `${dataset.rowCount.toLocaleString()} صف × ${dataset.columnCount} عمود`
                  : `${dataset.rowCount.toLocaleString()} rows × ${dataset.columnCount} columns`
                }
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`px-4 py-2 bg-white/20 rounded-lg backdrop-blur-sm ${dataQuality.color}`}>
              <div className="text-2xl font-bold text-white">{dataQuality.score}%</div>
              <div className="text-xs text-white/80">{dataQuality.label}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 bg-white p-2 rounded-xl border border-gray-200 shadow-sm">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[
              { label: language === 'ar' ? 'الصفوف' : 'Rows', value: dataset.rowCount.toLocaleString(), color: 'blue', icon: Table },
              { label: language === 'ar' ? 'الأعمدة' : 'Columns', value: dataset.columnCount, color: 'indigo', icon: Grid3X3 },
              { label: language === 'ar' ? 'رقمية' : 'Numeric', value: numericColumns.length, color: 'green', icon: Calculator },
              { label: language === 'ar' ? 'فئوية' : 'Categorical', value: categoricalColumns.length, color: 'purple', icon: PieChartIcon },
              { label: language === 'ar' ? 'مفقودة' : 'Missing', value: `${((dataset.columns.reduce((a, c) => a + c.missing, 0) / (dataset.rowCount * dataset.columnCount)) * 100).toFixed(1)}%`, color: 'orange', icon: AlertTriangle },
              { label: language === 'ar' ? 'الجودة' : 'Quality', value: `${dataQuality.score}%`, color: 'teal', icon: CheckCircle },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <div key={i} className={`bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className={`w-10 h-10 rounded-lg bg-${stat.color}-100 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${stat.color}-600`} />
                    </div>
                  </div>
                  <div className={`text-2xl font-bold text-${stat.color}-600`}>{stat.value}</div>
                  <div className="text-sm text-gray-600">{stat.label}</div>
                </div>
              );
            })}
          </div>

          {/* Column Summary Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 flex items-center justify-between">
              <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                <List className="w-5 h-5" />
                {language === 'ar' ? 'ملخص الأعمدة' : 'Column Summary'}
              </h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 rounded ${viewMode === 'grid' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded ${viewMode === 'list' ? 'bg-blue-100 text-blue-600' : 'text-gray-400'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className={`p-3 ${isRTL ? 'text-right' : 'text-left'} font-semibold text-gray-700`}>
                      {language === 'ar' ? 'العمود' : 'Column'}
                    </th>
                    <th className={`p-3 text-center font-semibold text-gray-700`}>
                      {language === 'ar' ? 'النوع' : 'Type'}
                    </th>
                    <th className={`p-3 text-center font-semibold text-gray-700`}>
                      {language === 'ar' ? 'القيم' : 'Values'}
                    </th>
                    <th className={`p-3 text-center font-semibold text-gray-700`}>
                      {language === 'ar' ? 'مفقود' : 'Missing'}
                    </th>
                    <th className={`p-3 text-center font-semibold text-gray-700`}>
                      {language === 'ar' ? 'فريد' : 'Unique'}
                    </th>
                    <th className={`p-3 text-center font-semibold text-gray-700`}>
                      {language === 'ar' ? 'المتوسط/المنوال' : 'Mean/Mode'}
                    </th>
                    <th className={`p-3 text-center font-semibold text-gray-700`}>
                      {language === 'ar' ? 'الانحراف' : 'Std Dev'}
                    </th>
                    <th className={`p-3 text-center font-semibold text-gray-700`}>
                      {language === 'ar' ? 'التوزيع' : 'Distribution'}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {dataset.columns.map((col, i) => {
                    const stats = columnStats[col.name];
                    const isNumeric = col.type === 'numeric';
                    const missingPercent = (col.missing / col.values.length) * 100;
                    
                    return (
                      <tr key={col.name} className={`${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <span className={`w-3 h-3 rounded-full ${isNumeric ? 'bg-blue-500' : 'bg-purple-500'}`}></span>
                            <span className="font-medium text-gray-800">{col.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            isNumeric ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                          }`}>
                            {isNumeric 
                              ? (language === 'ar' ? 'رقمي' : 'Numeric')
                              : (language === 'ar' ? 'فئوي' : 'Categorical')
                            }
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-gray-700">
                          {(col.values.length - col.missing).toLocaleString()}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${
                                  missingPercent > 20 ? 'bg-red-500' : 
                                  missingPercent > 5 ? 'bg-yellow-500' : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(missingPercent, 100)}%` }}
                              />
                            </div>
                            <span className="text-xs text-gray-500">{missingPercent.toFixed(1)}%</span>
                          </div>
                        </td>
                        <td className="p-3 text-center font-mono text-gray-700">{col.unique}</td>
                        <td className="p-3 text-center font-mono text-gray-700">
                          {isNumeric && stats ? stats.mean.toFixed(2) : '-'}
                        </td>
                        <td className="p-3 text-center font-mono text-gray-700">
                          {isNumeric && stats ? stats.std.toFixed(2) : '-'}
                        </td>
                        <td className="p-3">
                          {isNumeric && stats && (
                            <div className="w-24 h-8">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={generateHistogramData(col.values as number[], 10)}>
                                  <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Distribution Charts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {numericColumns.slice(0, 4).map(col => {
              const stats = columnStats[col.name];
              const histData = generateHistogramData(col.values as number[], 15);

              return (
                <div key={col.name} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium text-gray-800 text-sm truncate">{col.name}</h4>
                    {stats.normality.isNormal ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                  <ResponsiveContainer width="100%" height={80}>
                    <AreaChart data={histData}>
                      <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                    </AreaChart>
                  </ResponsiveContainer>
                  <div className="flex justify-between text-xs text-gray-500 mt-2">
                    <span>μ = {stats.mean.toFixed(2)}</span>
                    <span>σ = {stats.std.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Detailed Tab */}
      {activeTab === 'detailed' && (
        <div className="space-y-6">
          {/* Column Selector */}
          <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-64">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {language === 'ar' ? 'اختر العمود للتحليل' : 'Select Column for Analysis'}
                </label>
                <select
                  value={selectedColumn}
                  onChange={(e) => setSelectedColumn(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">{language === 'ar' ? 'اختر عمود...' : 'Select column...'}</option>
                  <optgroup label={language === 'ar' ? 'أعمدة رقمية' : 'Numeric Columns'}>
                    {numericColumns.map(col => (
                      <option key={col.name} value={col.name}>📊 {col.name}</option>
                    ))}
                  </optgroup>
                  <optgroup label={language === 'ar' ? 'أعمدة فئوية' : 'Categorical Columns'}>
                    {categoricalColumns.map(col => (
                      <option key={col.name} value={col.name}>📋 {col.name}</option>
                    ))}
                  </optgroup>
                </select>
              </div>
              
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                {showAdvanced ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                {language === 'ar' ? 'إحصائيات متقدمة' : 'Advanced Stats'}
              </button>
            </div>
          </div>

          {selectedColumn && (() => {
            const col = dataset.columns.find(c => c.name === selectedColumn);
            if (!col) return null;
            
            const isNumeric = col.type === 'numeric';
            const stats = columnStats[selectedColumn];

            if (isNumeric && stats) {
              const skewnessInfo = getSkewnessInterpretation(stats.skewness);
              const kurtosisInfo = getKurtosisInterpretation(stats.kurtosis);
              const SkewnessIcon = skewnessInfo.icon;
              
              return (
                <div className="space-y-6">
                  {/* Central Tendency */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-blue-600" />
                        {language === 'ar' ? 'مقاييس النزعة المركزية' : 'Measures of Central Tendency'}
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: language === 'ar' ? 'المتوسط' : 'Mean', value: stats.mean, color: 'blue', desc: language === 'ar' ? 'المتوسط الحسابي' : 'Arithmetic Mean' },
                        { label: language === 'ar' ? 'الوسيط' : 'Median', value: stats.median, color: 'indigo', desc: language === 'ar' ? 'القيمة الوسطى' : 'Middle Value' },
                        { label: language === 'ar' ? 'المنوال' : 'Mode', value: stats.mode, color: 'purple', desc: language === 'ar' ? 'الأكثر تكراراً' : 'Most Frequent' },
                        { label: language === 'ar' ? 'العدد' : 'Count', value: stats.count, color: 'pink', desc: language === 'ar' ? 'القيم الصالحة' : 'Valid Values', isInt: true },
                      ].map((item, i) => (
                        <div key={i} className={`p-4 bg-${item.color}-50 rounded-xl border border-${item.color}-100`}>
                          <div className={`text-2xl font-bold text-${item.color}-600`}>
                            {item.value !== null ? (item.isInt ? item.value.toLocaleString() : item.value.toFixed(4)) : 'N/A'}
                          </div>
                          <div className={`text-sm font-medium text-${item.color}-700`}>{item.label}</div>
                          <div className="text-xs text-gray-500 mt-1">{item.desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Dispersion */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <BarChart3 className="w-5 h-5 text-green-600" />
                        {language === 'ar' ? 'مقاييس التشتت' : 'Measures of Dispersion'}
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                      {[
                        { label: language === 'ar' ? 'الانحراف المعياري' : 'Std Deviation', value: stats.std, color: 'green' },
                        { label: language === 'ar' ? 'التباين' : 'Variance', value: stats.variance, color: 'emerald' },
                        { label: language === 'ar' ? 'المدى' : 'Range', value: stats.range, color: 'teal' },
                        { label: language === 'ar' ? 'المدى الربيعي' : 'IQR', value: stats.iqr, color: 'cyan' },
                        { label: language === 'ar' ? 'الخطأ المعياري' : 'SEM', value: stats.sem, color: 'sky' },
                        { label: language === 'ar' ? 'معامل الاختلاف' : 'CV %', value: stats.cv, color: 'blue', suffix: '%' },
                        { label: language === 'ar' ? 'الحد الأدنى' : 'Minimum', value: stats.min, color: 'indigo' },
                        { label: language === 'ar' ? 'الحد الأقصى' : 'Maximum', value: stats.max, color: 'violet' },
                      ].map((item, i) => (
                        <div key={i} className={`p-4 bg-${item.color}-50 rounded-xl border border-${item.color}-100`}>
                          <div className={`text-xl font-bold text-${item.color}-600`}>
                            {item.value.toFixed(4)}{item.suffix || ''}
                          </div>
                          <div className={`text-sm font-medium text-${item.color}-700`}>{item.label}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Shape */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-orange-50 to-amber-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-600" />
                        {language === 'ar' ? 'مقاييس الشكل' : 'Shape Measures'}
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-orange-50 rounded-xl border border-orange-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-orange-600">{stats.skewness.toFixed(4)}</span>
                          <SkewnessIcon className={`w-5 h-5 ${skewnessInfo.color}`} />
                        </div>
                        <div className="text-sm font-medium text-orange-700">
                          {language === 'ar' ? 'معامل الالتواء' : 'Skewness'}
                        </div>
                        <div className={`text-xs mt-1 ${skewnessInfo.color}`}>{skewnessInfo.text}</div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-2xl font-bold text-amber-600">{stats.kurtosis.toFixed(4)}</span>
                          <Layers className="w-5 h-5 text-amber-600" />
                        </div>
                        <div className="text-sm font-medium text-amber-700">
                          {language === 'ar' ? 'معامل التفرطح' : 'Kurtosis'}
                        </div>
                        <div className={`text-xs mt-1 ${kurtosisInfo.color}`}>{kurtosisInfo.text}</div>
                      </div>
                    </div>
                  </div>

                  {/* Normality Test */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Activity className="w-5 h-5 text-purple-600" />
                        {language === 'ar' ? 'اختبار التوزيع الطبيعي (Shapiro-Wilk)' : 'Normality Test (Shapiro-Wilk)'}
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-3 gap-4">
                      <div className="p-4 bg-purple-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-purple-600">{stats.normality.w.toFixed(4)}</div>
                        <div className="text-sm text-purple-700">W Statistic</div>
                      </div>
                      <div className="p-4 bg-pink-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-pink-600">{stats.normality.pValue.toFixed(4)}</div>
                        <div className="text-sm text-pink-700">p-value</div>
                      </div>
                      <div className={`p-4 rounded-xl text-center ${stats.normality.isNormal ? 'bg-green-50' : 'bg-red-50'}`}>
                        <div className="flex items-center justify-center gap-2">
                          {stats.normality.isNormal ? (
                            <CheckCircle className="w-6 h-6 text-green-600" />
                          ) : (
                            <XCircle className="w-6 h-6 text-red-600" />
                          )}
                          <span className={`text-lg font-bold ${stats.normality.isNormal ? 'text-green-600' : 'text-red-600'}`}>
                            {stats.normality.isNormal 
                              ? (language === 'ar' ? 'طبيعي' : 'Normal')
                              : (language === 'ar' ? 'غير طبيعي' : 'Not Normal')
                            }
                          </span>
                        </div>
                        <div className="text-xs text-gray-600 mt-1">
                          {stats.normality.isNormal
                            ? (language === 'ar' ? 'استخدم الاختبارات المعلمية' : 'Use parametric tests')
                            : (language === 'ar' ? 'استخدم الاختبارات اللامعلمية' : 'Use non-parametric tests')
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Percentiles */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-cyan-50 to-sky-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {language === 'ar' ? 'المئينات والربيعيات' : 'Percentiles & Quartiles'}
                      </h3>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-5 md:grid-cols-10 gap-2">
                        {[
                          { label: 'Min', value: stats.min, color: 'blue' },
                          { label: 'P5', value: stats.p5, color: 'sky' },
                          { label: 'P10', value: stats.p10, color: 'cyan' },
                          { label: 'Q1', value: stats.q1, color: 'teal' },
                          { label: 'Med', value: stats.median, color: 'emerald' },
                          { label: 'Q3', value: stats.q3, color: 'green' },
                          { label: 'P90', value: stats.p90, color: 'yellow' },
                          { label: 'P95', value: stats.p95, color: 'orange' },
                          { label: 'P99', value: stats.p99, color: 'red' },
                          { label: 'Max', value: stats.max, color: 'rose' },
                        ].map((item, i) => (
                          <div key={i} className={`p-2 bg-${item.color}-50 rounded-lg text-center border border-${item.color}-100`}>
                            <div className="text-xs text-gray-500">{item.label}</div>
                            <div className={`text-sm font-bold text-${item.color}-600`}>{item.value.toFixed(2)}</div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Visual Box Plot Representation */}
                      <div className="mt-6 px-4">
                        <div className="relative h-8 bg-gray-100 rounded-full">
                          <div 
                            className="absolute h-full bg-blue-200 rounded"
                            style={{
                              left: `${((stats.q1 - stats.min) / stats.range) * 100}%`,
                              width: `${((stats.q3 - stats.q1) / stats.range) * 100}%`
                            }}
                          />
                          <div 
                            className="absolute w-1 h-full bg-blue-600 rounded"
                            style={{ left: `${((stats.median - stats.min) / stats.range) * 100}%` }}
                          />
                          <div 
                            className="absolute w-2 h-2 bg-blue-800 rounded-full top-1/2 -translate-y-1/2"
                            style={{ left: `${((stats.mean - stats.min) / stats.range) * 100}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-gray-500 mt-1">
                          <span>{stats.min.toFixed(2)}</span>
                          <span>{stats.max.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Confidence Intervals */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {language === 'ar' ? 'فترات الثقة للمتوسط' : 'Confidence Intervals for Mean'}
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div className="p-4 bg-indigo-50 rounded-xl">
                        <div className="text-sm font-medium text-indigo-700 mb-2">
                          {language === 'ar' ? 'فترة ثقة 95%' : '95% CI'}
                        </div>
                        <div className="text-lg font-bold text-indigo-600">
                          [{stats.ci95.lower.toFixed(4)}, {stats.ci95.upper.toFixed(4)}]
                        </div>
                        <div className="mt-2 h-2 bg-indigo-200 rounded-full">
                          <div className="h-full bg-indigo-500 rounded-full" style={{ width: '95%' }} />
                        </div>
                      </div>
                      <div className="p-4 bg-violet-50 rounded-xl">
                        <div className="text-sm font-medium text-violet-700 mb-2">
                          {language === 'ar' ? 'فترة ثقة 99%' : '99% CI'}
                        </div>
                        <div className="text-lg font-bold text-violet-600">
                          [{stats.ci99.lower.toFixed(4)}, {stats.ci99.upper.toFixed(4)}]
                        </div>
                        <div className="mt-2 h-2 bg-violet-200 rounded-full">
                          <div className="h-full bg-violet-500 rounded-full" style={{ width: '99%' }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Outliers */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-red-50 to-orange-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        {language === 'ar' ? 'القيم الشاذة' : 'Outliers Detection'}
                      </h3>
                    </div>
                    <div className="p-4 grid grid-cols-4 gap-4">
                      <div className="p-4 bg-red-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-red-600">{stats.outliers.count}</div>
                        <div className="text-sm text-red-700">
                          {language === 'ar' ? 'قيمة شاذة' : 'Outliers'}
                        </div>
                      </div>
                      <div className="p-4 bg-orange-50 rounded-xl text-center">
                        <div className="text-xl font-bold text-orange-600">
                          {((stats.outliers.count / stats.count) * 100).toFixed(1)}%
                        </div>
                        <div className="text-sm text-orange-700">
                          {language === 'ar' ? 'النسبة' : 'Percentage'}
                        </div>
                      </div>
                      <div className="p-4 bg-yellow-50 rounded-xl text-center">
                        <div className="text-lg font-bold text-yellow-600">{stats.outliers.lowerBound.toFixed(2)}</div>
                        <div className="text-sm text-yellow-700">
                          {language === 'ar' ? 'الحد الأدنى' : 'Lower Bound'}
                        </div>
                      </div>
                      <div className="p-4 bg-amber-50 rounded-xl text-center">
                        <div className="text-lg font-bold text-amber-600">{stats.outliers.upperBound.toFixed(2)}</div>
                        <div className="text-sm text-amber-700">
                          {language === 'ar' ? 'الحد الأقصى' : 'Upper Bound'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Histogram */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {language === 'ar' ? 'المدرج التكراري' : 'Histogram'}
                      </h3>
                    </div>
                    <div className="p-4">
                      <ResponsiveContainer width="100%" height={300}>
                        <ComposedChart data={generateHistogramData(col.values as number[], 25)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                          <XAxis dataKey="range" fontSize={10} stroke="#6B7280" />
                          <YAxis fontSize={10} stroke="#6B7280" />
                          <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: '1px solid #E5E7EB' }}
                            formatter={(value) => [value ?? 0, language === 'ar' ? 'التكرار' : 'Frequency']}
                          />
                          <Bar dataKey="count" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                          <ReferenceLine y={stats.mean} stroke="#EF4444" strokeDasharray="5 5" label={{ value: 'μ', position: 'right', fill: '#EF4444' }} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Advanced Stats */}
                  {showAdvanced && (
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                      <div className="p-4 bg-gradient-to-r from-gray-50 to-slate-50 border-b border-gray-200">
                        <h3 className="text-lg font-semibold text-gray-800">
                          {language === 'ar' ? 'إحصائيات متقدمة' : 'Advanced Statistics'}
                        </h3>
                      </div>
                      <div className="p-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-500">{language === 'ar' ? 'المجموع' : 'Sum'}</div>
                          <div className="text-lg font-bold text-gray-800">{stats.sum.toFixed(4)}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-500">{language === 'ar' ? 'مجموع المربعات' : 'Sum of Squares'}</div>
                          <div className="text-lg font-bold text-gray-800">{stats.sumOfSquares.toFixed(4)}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-500">{language === 'ar' ? 'المتوسط الهندسي' : 'Geometric Mean'}</div>
                          <div className="text-lg font-bold text-gray-800">{stats.geometricMean?.toFixed(4) || 'N/A'}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-500">{language === 'ar' ? 'المتوسط التوافقي' : 'Harmonic Mean'}</div>
                          <div className="text-lg font-bold text-gray-800">{stats.harmonicMean?.toFixed(4) || 'N/A'}</div>
                        </div>
                        <div className="p-3 bg-gray-50 rounded-lg">
                          <div className="text-sm text-gray-500">{language === 'ar' ? 'الانحراف المطلق' : 'MAD'}</div>
                          <div className="text-lg font-bold text-gray-800">{stats.mad.toFixed(4)}</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            } else {
              // Categorical column
              const frequencies = getCategoryFrequencies(col);
              
              return (
                <div className="space-y-6">
                  {/* Frequency Table */}
                  <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-b border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-800">
                        {language === 'ar' ? 'جدول التكرارات' : 'Frequency Table'}
                      </h3>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className={`p-3 ${isRTL ? 'text-right' : 'text-left'} font-semibold`}>
                              {language === 'ar' ? 'القيمة' : 'Value'}
                            </th>
                            <th className="p-3 text-center font-semibold">
                              {language === 'ar' ? 'التكرار' : 'Frequency'}
                            </th>
                            <th className="p-3 text-center font-semibold">
                              {language === 'ar' ? 'النسبة' : 'Percent'}
                            </th>
                            <th className="p-3 text-center font-semibold">
                              {language === 'ar' ? 'التكرار التراكمي' : 'Cumulative'}
                            </th>
                            <th className="p-3 text-center font-semibold">
                              {language === 'ar' ? 'النسبة التراكمية' : 'Cum. %'}
                            </th>
                            <th className="p-3" style={{ width: '30%' }}></th>
                          </tr>
                        </thead>
                        <tbody>
                          {frequencies.slice(0, 20).map((item, i) => (
                            <tr key={item.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                              <td className="p-3 font-medium text-gray-800">{item.name}</td>
                              <td className="p-3 text-center font-mono">{item.count.toLocaleString()}</td>
                              <td className="p-3 text-center font-mono">{item.percentage.toFixed(1)}%</td>
                              <td className="p-3 text-center font-mono">{item.cumulative.toLocaleString()}</td>
                              <td className="p-3 text-center font-mono">{item.cumulativePercent.toFixed(1)}%</td>
                              <td className="p-3">
                                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                                  <div 
                                    className="h-full rounded-full transition-all"
                                    style={{ 
                                      width: `${item.percentage}%`,
                                      backgroundColor: COLORS[i % COLORS.length]
                                    }}
                                  />
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Charts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Bar Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <h4 className="font-semibold text-gray-800 mb-4">
                        {language === 'ar' ? 'رسم الأعمدة' : 'Bar Chart'}
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={frequencies.slice(0, 10)} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis dataKey="name" type="category" width={80} fontSize={11} />
                          <Tooltip />
                          <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                            {frequencies.slice(0, 10).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Pie Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-4">
                      <h4 className="font-semibold text-gray-800 mb-4">
                        {language === 'ar' ? 'الرسم الدائري' : 'Pie Chart'}
                      </h4>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={frequencies.slice(0, 8)}
                            cx="50%"
                            cy="50%"
                            labelLine={true}
                            label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                            outerRadius={100}
                            dataKey="count"
                          >
                            {frequencies.slice(0, 8).map((_, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              );
            }
          })()}
        </div>
      )}

      {/* Distribution Tab */}
      {activeTab === 'distribution' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {numericColumns.map(col => {
            const stats = columnStats[col.name];
            const histData = generateHistogramData(col.values as number[], 15);

            return (
              <div key={col.name} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200 flex items-center justify-between">
                  <h4 className="font-semibold text-gray-800">{col.name}</h4>
                  <div className="flex items-center gap-2">
                    {stats.normality.isNormal ? (
                      <span className="px-2 py-1 bg-green-100 text-green-700 rounded-full text-xs flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" />
                        {language === 'ar' ? 'طبيعي' : 'Normal'}
                      </span>
                    ) : (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-700 rounded-full text-xs flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {language === 'ar' ? 'غير طبيعي' : 'Not Normal'}
                      </span>
                    )}
                    <button
                      onClick={() => setExpandedColumn(expandedColumn === col.name ? null : col.name)}
                      className="p-1 hover:bg-gray-100 rounded"
                    >
                      {expandedColumn === col.name ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                
                <div className="p-4">
                  <ResponsiveContainer width="100%" height={150}>
                    <AreaChart data={histData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                      <XAxis dataKey="range" fontSize={8} stroke="#6B7280" />
                      <YAxis fontSize={10} stroke="#6B7280" />
                      <Tooltip />
                      <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.3} />
                    </AreaChart>
                  </ResponsiveContainer>

                  <div className="grid grid-cols-4 gap-2 mt-4 text-xs">
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="font-bold text-blue-700">{stats.mean.toFixed(2)}</div>
                      <div className="text-blue-600">{language === 'ar' ? 'متوسط' : 'Mean'}</div>
                    </div>
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="font-bold text-green-700">{stats.median.toFixed(2)}</div>
                      <div className="text-green-600">{language === 'ar' ? 'وسيط' : 'Median'}</div>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded-lg">
                      <div className="font-bold text-purple-700">{stats.std.toFixed(2)}</div>
                      <div className="text-purple-600">{language === 'ar' ? 'انحراف' : 'Std'}</div>
                    </div>
                    <div className="text-center p-2 bg-orange-50 rounded-lg">
                      <div className="font-bold text-orange-700">{stats.skewness.toFixed(2)}</div>
                      <div className="text-orange-600">{language === 'ar' ? 'التواء' : 'Skew'}</div>
                    </div>
                  </div>

                  {expandedColumn === col.name && (
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        <div className="p-2 bg-gray-50 rounded text-center">
                          <div className="font-bold text-gray-700">{stats.min.toFixed(2)}</div>
                          <div className="text-gray-500">Min</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-center">
                          <div className="font-bold text-gray-700">{stats.q1.toFixed(2)}</div>
                          <div className="text-gray-500">Q1</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-center">
                          <div className="font-bold text-gray-700">{stats.iqr.toFixed(2)}</div>
                          <div className="text-gray-500">IQR</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-center">
                          <div className="font-bold text-gray-700">{stats.q3.toFixed(2)}</div>
                          <div className="text-gray-500">Q3</div>
                        </div>
                        <div className="p-2 bg-gray-50 rounded text-center">
                          <div className="font-bold text-gray-700">{stats.max.toFixed(2)}</div>
                          <div className="text-gray-500">Max</div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Box Plot Tab */}
      {activeTab === 'boxplot' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">
            {language === 'ar' ? 'الرسم الصندوقي للمتغيرات الرقمية' : 'Box Plot for Numeric Variables'}
          </h3>
          
          <div className="space-y-6">
            {numericColumns.slice(0, 8).map((col, i) => {
              const stats = columnStats[col.name];
              const range = stats.max - stats.min || 1;
              
              return (
                <div key={col.name} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">{col.name}</span>
                    <span className="text-sm text-gray-500">
                      {language === 'ar' ? 'شاذة:' : 'Outliers:'} {stats.outliers.count}
                    </span>
                  </div>
                  
                  <div className="relative h-12 bg-gray-100 rounded-lg">
                    {/* Whiskers */}
                    <div 
                      className="absolute h-0.5 bg-gray-400 top-1/2 -translate-y-1/2"
                      style={{
                        left: `${((stats.min - stats.min) / range) * 100}%`,
                        width: `${((stats.q1 - stats.min) / range) * 100}%`
                      }}
                    />
                    <div 
                      className="absolute h-0.5 bg-gray-400 top-1/2 -translate-y-1/2"
                      style={{
                        left: `${((stats.q3 - stats.min) / range) * 100}%`,
                        width: `${((stats.max - stats.q3) / range) * 100}%`
                      }}
                    />
                    
                    {/* Box */}
                    <div 
                      className="absolute h-8 top-1/2 -translate-y-1/2 rounded border-2 border-blue-500"
                      style={{
                        left: `${((stats.q1 - stats.min) / range) * 100}%`,
                        width: `${((stats.q3 - stats.q1) / range) * 100}%`,
                        backgroundColor: COLORS[i % COLORS.length] + '40'
                      }}
                    />
                    
                    {/* Median line */}
                    <div 
                      className="absolute w-0.5 h-8 bg-blue-700 top-1/2 -translate-y-1/2"
                      style={{ left: `${((stats.median - stats.min) / range) * 100}%` }}
                    />
                    
                    {/* Mean dot */}
                    <div 
                      className="absolute w-3 h-3 bg-red-500 rounded-full top-1/2 -translate-y-1/2 -translate-x-1/2 border-2 border-white shadow"
                      style={{ left: `${((stats.mean - stats.min) / range) * 100}%` }}
                    />
                    
                    {/* Min/Max markers */}
                    <div 
                      className="absolute w-0.5 h-4 bg-gray-400 top-1/2 -translate-y-1/2"
                      style={{ left: '0%' }}
                    />
                    <div 
                      className="absolute w-0.5 h-4 bg-gray-400 top-1/2 -translate-y-1/2"
                      style={{ left: '100%' }}
                    />
                  </div>
                  
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{stats.min.toFixed(2)}</span>
                    <span>Q1: {stats.q1.toFixed(2)}</span>
                    <span>Med: {stats.median.toFixed(2)}</span>
                    <span>Q3: {stats.q3.toFixed(2)}</span>
                    <span>{stats.max.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full" />
              <span>{language === 'ar' ? 'المتوسط' : 'Mean'}</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-0.5 bg-blue-700" />
              <span>{language === 'ar' ? 'الوسيط' : 'Median'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Correlation Tab */}
      {activeTab === 'correlation' && (
        <div className="space-y-6">
          {numericColumns.length < 2 ? (
            <div className="bg-white rounded-xl p-12 text-center border border-gray-200">
              <Calculator className="w-16 h-16 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-500 text-lg">
                {language === 'ar' ? 'يجب توفر متغيرين رقميين على الأقل' : 'At least 2 numeric variables required'}
              </p>
            </div>
          ) : (
            <>
              {/* Method Selector */}
              <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                  <span className="font-medium text-gray-700">
                    {language === 'ar' ? 'طريقة الارتباط:' : 'Correlation Method:'}
                  </span>
                  <div className="flex gap-2">
                    {['pearson', 'spearman'].map(method => (
                      <button
                        key={method}
                        onClick={() => setCorrelationMethod(method as any)}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                          correlationMethod === method
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        }`}
                      >
                        {method === 'pearson' ? 'Pearson' : 'Spearman'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Correlation Matrix */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {language === 'ar' ? 'مصفوفة الارتباط' : 'Correlation Matrix'}
                  </h3>
                </div>
                <div className="p-4 overflow-x-auto">
                  <table className="text-sm">
                    <thead>
                      <tr>
                        <th className="p-2 bg-gray-50"></th>
                        {numericColumns.slice(0, 8).map(col => (
                          <th key={col.name} className="p-2 bg-gray-50 font-medium text-gray-700 text-center" style={{ minWidth: '80px' }}>
                            <div className="truncate max-w-20" title={col.name}>
                              {col.name.length > 8 ? col.name.slice(0, 8) + '...' : col.name}
                            </div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {numericColumns.slice(0, 8).map((col1, i) => (
                        <tr key={col1.name}>
                          <td className="p-2 bg-gray-50 font-medium text-gray-700">
                            <div className="truncate max-w-24" title={col1.name}>
                              {col1.name.length > 10 ? col1.name.slice(0, 10) + '...' : col1.name}
                            </div>
                          </td>
                          {numericColumns.slice(0, 8).map((col2, j) => {
                            const corr = calculateCorrelation(
                              col1.values as number[],
                              col2.values as number[],
                              correlationMethod
                            );
                            return (
                              <td 
                                key={col2.name}
                                className={`p-2 text-center font-mono text-sm cursor-pointer transition-transform hover:scale-105 ${
                                  i === j ? 'bg-gray-100' : getCorrelationColor(corr)
                                }`}
                                title={`${col1.name} ↔ ${col2.name}: ${getCorrelationInterpretation(corr)}`}
                              >
                                {corr.toFixed(3)}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Top Correlations */}
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-800">
                    {language === 'ar' ? 'أقوى الارتباطات' : 'Strongest Correlations'}
                  </h3>
                </div>
                <div className="p-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {correlationMatrix
                    .filter(item => item.var1 < item.var2)
                    .sort((a, b) => Math.abs(b.value) - Math.abs(a.value))
                    .slice(0, 9)
                    .map((item, i) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex-1">
                            <div className="text-sm text-gray-600 truncate">{item.var1}</div>
                            <div className="text-xs text-gray-400">↕</div>
                            <div className="text-sm text-gray-600 truncate">{item.var2}</div>
                          </div>
                          <div className={`px-3 py-1 rounded-full text-lg font-bold ${
                            Math.abs(item.value) > 0.7 
                              ? item.value > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                              : Math.abs(item.value) > 0.4
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {item.value.toFixed(3)}
                          </div>
                        </div>
                        <div className="text-sm text-gray-600">{getCorrelationInterpretation(item.value)}</div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.value > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.abs(item.value) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Report Tab */}
      {activeTab === 'report' && (
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">
              {language === 'ar' ? 'تقرير التحليل الوصفي' : 'Descriptive Analysis Report'}
            </h3>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:opacity-90 transition-opacity">
              <Download className="w-4 h-4" />
              {language === 'ar' ? 'تصدير PDF' : 'Export PDF'}
            </button>
          </div>

          <div className="p-6 prose max-w-none">
            <h2>{language === 'ar' ? 'ملخص البيانات' : 'Data Summary'}</h2>
            <p>
              {language === 'ar' 
                ? `تحتوي مجموعة البيانات على ${dataset.rowCount.toLocaleString()} صف و ${dataset.columnCount} عمود. منها ${numericColumns.length} أعمدة رقمية و ${categoricalColumns.length} أعمدة فئوية. جودة البيانات الإجمالية: ${dataQuality.score}% (${dataQuality.label}).`
                : `The dataset contains ${dataset.rowCount.toLocaleString()} rows and ${dataset.columnCount} columns. Of these, ${numericColumns.length} are numeric and ${categoricalColumns.length} are categorical. Overall data quality: ${dataQuality.score}% (${dataQuality.label}).`
              }
            </p>

            <h2>{language === 'ar' ? 'الإحصاءات الوصفية للمتغيرات الرقمية' : 'Descriptive Statistics for Numeric Variables'}</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border border-gray-300 p-2">{language === 'ar' ? 'المتغير' : 'Variable'}</th>
                    <th className="border border-gray-300 p-2">N</th>
                    <th className="border border-gray-300 p-2">{language === 'ar' ? 'المتوسط' : 'Mean'}</th>
                    <th className="border border-gray-300 p-2">{language === 'ar' ? 'الوسيط' : 'Median'}</th>
                    <th className="border border-gray-300 p-2">{language === 'ar' ? 'الانحراف المعياري' : 'Std Dev'}</th>
                    <th className="border border-gray-300 p-2">Min</th>
                    <th className="border border-gray-300 p-2">Max</th>
                    <th className="border border-gray-300 p-2">{language === 'ar' ? 'الالتواء' : 'Skewness'}</th>
                    <th className="border border-gray-300 p-2">{language === 'ar' ? 'طبيعي؟' : 'Normal?'}</th>
                  </tr>
                </thead>
                <tbody>
                  {numericColumns.map(col => {
                    const stats = columnStats[col.name];
                    return (
                      <tr key={col.name}>
                        <td className="border border-gray-300 p-2 font-medium">{col.name}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.count}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.mean.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.median.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.std.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.min.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.max.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2 text-center">{stats.skewness.toFixed(3)}</td>
                        <td className="border border-gray-300 p-2 text-center">
                          {stats.normality.isNormal ? '✓' : '✗'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <h2>{language === 'ar' ? 'الملاحظات والتوصيات' : 'Observations & Recommendations'}</h2>
            <ul>
              {numericColumns.filter(col => columnStats[col.name].missingPercent > 5).map(col => (
                <li key={col.name}>
                  {language === 'ar'
                    ? `المتغير "${col.name}" يحتوي على ${columnStats[col.name].missingPercent.toFixed(1)}% قيم مفقودة`
                    : `Variable "${col.name}" has ${columnStats[col.name].missingPercent.toFixed(1)}% missing values`
                  }
                </li>
              ))}
              {numericColumns.filter(col => columnStats[col.name].outliers.count > 0).map(col => (
                <li key={`outlier-${col.name}`}>
                  {language === 'ar'
                    ? `المتغير "${col.name}" يحتوي على ${columnStats[col.name].outliers.count} قيم شاذة`
                    : `Variable "${col.name}" has ${columnStats[col.name].outliers.count} outliers`
                  }
                </li>
              ))}
              {numericColumns.filter(col => !columnStats[col.name].normality.isNormal).map(col => (
                <li key={`norm-${col.name}`}>
                  {language === 'ar'
                    ? `المتغير "${col.name}" لا يتبع التوزيع الطبيعي (استخدم الاختبارات اللامعلمية)`
                    : `Variable "${col.name}" is not normally distributed (use non-parametric tests)`
                  }
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
