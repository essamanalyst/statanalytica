import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell,
  ComposedChart
} from 'recharts';
import {
  TrendingUp, GitBranch, Layers, Target, Activity, PieChart as PieIcon,
  BarChart2, Brain, Database, FileText, Compass, Share2,
  Play, Download, CheckCircle, AlertCircle,
  ArrowRight, Settings, RefreshCw
} from 'lucide-react';

interface Props {
  data: any[];
  columns: string[];
}

// Statistical Functions
const mean = (arr: number[]): number => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0;
const variance = (arr: number[]): number => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return arr.reduce((sum, val) => sum + Math.pow(val - m, 2), 0) / (arr.length - 1);
};
const std = (arr: number[]): number => Math.sqrt(variance(arr));
const median = (arr: number[]): number => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};
const percentile = (arr: number[], p: number): number => {
  if (!arr.length) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};
const skewness = (arr: number[]): number => {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  const n = arr.length;
  const sum = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
};
const kurtosis = (arr: number[]): number => {
  if (arr.length < 4) return 0;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  const n = arr.length;
  const sum = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
};

// Correlation functions
const pearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const meanX = mean(x.slice(0, n));
  const meanY = mean(y.slice(0, n));
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = x[i] - meanX;
    const dy = y[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
};

const spearmanCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const rank = (arr: number[]): number[] => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    sorted.forEach((item, rank) => { ranks[item.i] = rank + 1; });
    return ranks;
  };
  return pearsonCorrelation(rank(x.slice(0, n)), rank(y.slice(0, n)));
};

// Linear Regression
const linearRegression = (x: number[], y: number[]): { slope: number; intercept: number; rSquared: number; predictions: number[] } => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return { slope: 0, intercept: 0, rSquared: 0, predictions: [] };
  
  const meanX = mean(x.slice(0, n));
  const meanY = mean(y.slice(0, n));
  
  let num = 0, den = 0;
  for (let i = 0; i < n; i++) {
    num += (x[i] - meanX) * (y[i] - meanY);
    den += Math.pow(x[i] - meanX, 2);
  }
  
  const slope = den === 0 ? 0 : num / den;
  const intercept = meanY - slope * meanX;
  
  const predictions = x.slice(0, n).map(xi => slope * xi + intercept);
  const ssRes = y.slice(0, n).reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0);
  const ssTot = y.slice(0, n).reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  
  return { slope, intercept, rSquared, predictions };
};

// Multiple Regression
const multipleRegression = (X: number[][], y: number[]): { coefficients: number[]; rSquared: number; predictions: number[] } => {
  const n = y.length;
  const p = X[0]?.length || 0;
  if (n < p + 1 || p === 0) return { coefficients: [], rSquared: 0, predictions: [] };
  
  // Add intercept column (for future use)
  // const XWithIntercept = X.map(row => [1, ...row]);
  
  // Simple OLS using normal equations (for demonstration)
  // In production, use proper matrix library
  const coefficients = new Array(p + 1).fill(0);
  
  // Simplified: use mean for intercept and simple correlations for slopes
  const meanY = mean(y);
  coefficients[0] = meanY;
  
  for (let j = 0; j < p; j++) {
    const xj = X.map(row => row[j]);
    const r = pearsonCorrelation(xj, y);
    const stdX = std(xj);
    const stdY = std(y);
    coefficients[j + 1] = stdX > 0 ? r * (stdY / stdX) : 0;
    coefficients[0] -= coefficients[j + 1] * mean(xj);
  }
  
  const predictions = X.map(row => coefficients[0] + row.reduce((sum, x, j) => sum + x * coefficients[j + 1], 0));
  const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  const rSquared = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  
  return { coefficients, rSquared, predictions };
};

// K-Means Clustering
const kMeansClustering = (data: number[][], k: number, maxIter: number = 100): { clusters: number[]; centroids: number[][] } => {
  if (data.length === 0 || k <= 0) return { clusters: [], centroids: [] };
  
  const n = data.length;
  const dim = data[0].length;
  
  // Initialize centroids randomly
  let centroids: number[][] = [];
  const indices = new Set<number>();
  while (indices.size < Math.min(k, n)) {
    indices.add(Math.floor(Math.random() * n));
  }
  centroids = Array.from(indices).map(i => [...data[i]]);
  
  let clusters = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIter; iter++) {
    // Assign clusters
    const newClusters = data.map(point => {
      let minDist = Infinity;
      let cluster = 0;
      centroids.forEach((centroid, c) => {
        const dist = Math.sqrt(point.reduce((sum, val, d) => sum + Math.pow(val - centroid[d], 2), 0));
        if (dist < minDist) {
          minDist = dist;
          cluster = c;
        }
      });
      return cluster;
    });
    
    // Check convergence
    if (clusters.every((c, i) => c === newClusters[i])) break;
    clusters = newClusters;
    
    // Update centroids
    centroids = centroids.map((_, c) => {
      const clusterPoints = data.filter((_, i) => clusters[i] === c);
      if (clusterPoints.length === 0) return centroids[c];
      return Array.from({ length: dim }, (_, d) => mean(clusterPoints.map(p => p[d])));
    });
  }
  
  return { clusters, centroids };
};

// PCA
const performPCA = (data: number[][], numComponents: number = 2): { 
  components: number[][]; 
  explainedVariance: number[]; 
  transformedData: number[][] 
} => {
  if (data.length === 0) return { components: [], explainedVariance: [], transformedData: [] };
  
  const n = data.length;
  const p = data[0].length;
  
  // Center the data
  const means = Array.from({ length: p }, (_, j) => mean(data.map(row => row[j])));
  const centered = data.map(row => row.map((val, j) => val - means[j]));
  
  // Compute covariance matrix (simplified)
  const covMatrix: number[][] = Array.from({ length: p }, () => new Array(p).fill(0));
  for (let i = 0; i < p; i++) {
    for (let j = 0; j < p; j++) {
      covMatrix[i][j] = centered.reduce((sum, row) => sum + row[i] * row[j], 0) / (n - 1);
    }
  }
  
  // Power iteration for finding principal components (simplified)
  const components: number[][] = [];
  const eigenvalues: number[] = [];
  
  for (let comp = 0; comp < Math.min(numComponents, p); comp++) {
    let v = Array.from({ length: p }, () => Math.random());
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0));
    v = v.map(x => x / norm);
    
    for (let iter = 0; iter < 100; iter++) {
      const newV = covMatrix.map(row => row.reduce((sum, val, j) => sum + val * v[j], 0));
      const newNorm = Math.sqrt(newV.reduce((s, x) => s + x * x, 0));
      v = newV.map(x => x / newNorm);
    }
    
    const eigenvalue = v.reduce((sum, vi, i) => {
      const Av = covMatrix[i].reduce((s, val, j) => s + val * v[j], 0);
      return sum + vi * Av;
    }, 0);
    
    components.push(v);
    eigenvalues.push(eigenvalue);
    
    // Deflate covariance matrix
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        covMatrix[i][j] -= eigenvalue * v[i] * v[j];
      }
    }
  }
  
  const totalVar = eigenvalues.reduce((a, b) => a + b, 0);
  const explainedVariance = eigenvalues.map(e => totalVar > 0 ? (e / totalVar) * 100 : 0);
  
  // Transform data
  const transformedData = centered.map(row => 
    components.map(comp => row.reduce((sum, val, j) => sum + val * comp[j], 0))
  );
  
  return { components, explainedVariance, transformedData };
};

// Time Series Analysis
const movingAverage = (data: number[], window: number): number[] => {
  if (window <= 0 || data.length < window) return data;
  const result: number[] = [];
  for (let i = 0; i <= data.length - window; i++) {
    result.push(mean(data.slice(i, i + window)));
  }
  return result;
};

const exponentialSmoothing = (data: number[], alpha: number): number[] => {
  if (data.length === 0) return [];
  const result = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
};

const calculateTrend = (data: number[]): { trend: number[]; slope: number; intercept: number } => {
  const x = data.map((_, i) => i);
  const { slope, intercept, predictions } = linearRegression(x, data);
  return { trend: predictions, slope, intercept };
};

const calculateSeasonality = (data: number[], period: number): number[] => {
  if (period <= 0 || data.length < period) return new Array(data.length).fill(0);
  
  const seasonal = new Array(period).fill(0);
  const counts = new Array(period).fill(0);
  
  data.forEach((val, i) => {
    const idx = i % period;
    seasonal[idx] += val;
    counts[idx]++;
  });
  
  const seasonalMean = seasonal.map((sum, i) => counts[i] > 0 ? sum / counts[i] : 0);
  const overallMean = mean(seasonalMean);
  const seasonalFactors = seasonalMean.map(s => s - overallMean);
  
  return data.map((_, i) => seasonalFactors[i % period]);
};

// Chi-Square Test
const chiSquareTest = (observed: number[][], expected?: number[][]): { statistic: number; pValue: number; df: number } => {
  const rows = observed.length;
  const cols = observed[0]?.length || 0;
  if (rows === 0 || cols === 0) return { statistic: 0, pValue: 1, df: 0 };
  
  // Calculate expected if not provided
  if (!expected) {
    const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
    const colTotals = Array.from({ length: cols }, (_, j) => observed.reduce((sum, row) => sum + row[j], 0));
    const total = rowTotals.reduce((a, b) => a + b, 0);
    
    expected = observed.map((row, i) => 
      row.map((_, j) => (rowTotals[i] * colTotals[j]) / total)
    );
  }
  
  let statistic = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      if (expected[i][j] > 0) {
        statistic += Math.pow(observed[i][j] - expected[i][j], 2) / expected[i][j];
      }
    }
  }
  
  const df = (rows - 1) * (cols - 1);
  
  // Approximate p-value using chi-square distribution
  const pValue = 1 - chiSquareCDF(statistic, df);
  
  return { statistic, pValue, df };
};

// Chi-Square CDF approximation
const chiSquareCDF = (x: number, df: number): number => {
  if (x <= 0 || df <= 0) return 0;
  const k = df / 2;
  const xHalf = x / 2;
  return gammaCDF(xHalf, k);
};

const gammaCDF = (x: number, a: number): number => {
  if (x <= 0) return 0;
  if (a <= 0) return 1;
  
  // Use series expansion for incomplete gamma
  let sum = 0;
  let term = 1 / a;
  sum = term;
  
  for (let n = 1; n < 100; n++) {
    term *= x / (a + n);
    sum += term;
    if (Math.abs(term) < 1e-10) break;
  }
  
  return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
};

const gammaLn = (x: number): number => {
  const coefficients = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  
  for (let j = 0; j < 6; j++) {
    ser += coefficients[j] / ++y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x);
};

// ANOVA
const oneWayANOVA = (groups: number[][]): { fStatistic: number; pValue: number; dfBetween: number; dfWithin: number; ssBetween: number; ssWithin: number } => {
  const k = groups.length;
  if (k < 2) return { fStatistic: 0, pValue: 1, dfBetween: 0, dfWithin: 0, ssBetween: 0, ssWithin: 0 };
  
  const allData = groups.flat();
  const grandMean = mean(allData);
  const groupMeans = groups.map(g => mean(g));
  const groupSizes = groups.map(g => g.length);
  const n = allData.length;
  
  const ssBetween = groupSizes.reduce((sum, ni, i) => sum + ni * Math.pow(groupMeans[i] - grandMean, 2), 0);
  const ssWithin = groups.reduce((sum, group, i) => 
    sum + group.reduce((s, val) => s + Math.pow(val - groupMeans[i], 2), 0), 0);
  
  const dfBetween = k - 1;
  const dfWithin = n - k;
  
  const msBetween = dfBetween > 0 ? ssBetween / dfBetween : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  
  const fStatistic = msWithin > 0 ? msBetween / msWithin : 0;
  
  // Approximate p-value
  const pValue = 1 - fCDF(fStatistic, dfBetween, dfWithin);
  
  return { fStatistic, pValue, dfBetween, dfWithin, ssBetween, ssWithin };
};

const fCDF = (x: number, df1: number, df2: number): number => {
  if (x <= 0 || df1 <= 0 || df2 <= 0) return 0;
  const a = df1 / 2;
  const b = df2 / 2;
  const xRatio = (df1 * x) / (df1 * x + df2);
  return incompleteBeta(xRatio, a, b);
};

const incompleteBeta = (x: number, a: number, b: number): number => {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  
  const bt = Math.exp(gammaLn(a + b) - gammaLn(a) - gammaLn(b) + a * Math.log(x) + b * Math.log(1 - x));
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a;
  } else {
    return 1 - bt * betaCF(1 - x, b, a) / b;
  }
};

const betaCF = (x: number, a: number, b: number): number => {
  const maxIter = 100;
  const eps = 1e-10;
  
  let c = 1;
  let d = 1 - (a + b) * x / (a + 1);
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((a + m2 - 1) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    h *= d * c;
    
    aa = -(a + m) * (a + b + m) * x / ((a + m2) * (a + m2 + 1));
    d = 1 + aa * d;
    if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c;
    if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const del = d * c;
    h *= del;
    
    if (Math.abs(del - 1) < eps) break;
  }
  
  return h;
};

// Logistic Regression (simplified)
const logisticRegression = (X: number[][], y: number[], maxIter: number = 100): {
  coefficients: number[];
  predictions: number[];
  accuracy: number;
} => {
  const n = y.length;
  const p = X[0]?.length || 0;
  if (n === 0 || p === 0) return { coefficients: [], predictions: [], accuracy: 0 };
  
  // Initialize coefficients
  let coefficients = new Array(p + 1).fill(0);
  const learningRate = 0.1;
  
  // Gradient descent
  for (let iter = 0; iter < maxIter; iter++) {
    const predictions = X.map(row => {
      const z = coefficients[0] + row.reduce((sum, x, j) => sum + x * coefficients[j + 1], 0);
      return 1 / (1 + Math.exp(-z));
    });
    
    // Update coefficients
    const gradient = new Array(p + 1).fill(0);
    for (let i = 0; i < n; i++) {
      const error = predictions[i] - y[i];
      gradient[0] += error;
      for (let j = 0; j < p; j++) {
        gradient[j + 1] += error * X[i][j];
      }
    }
    
    for (let j = 0; j <= p; j++) {
      coefficients[j] -= learningRate * gradient[j] / n;
    }
  }
  
  const finalPredictions = X.map(row => {
    const z = coefficients[0] + row.reduce((sum, x, j) => sum + x * coefficients[j + 1], 0);
    return 1 / (1 + Math.exp(-z));
  });
  
  const predictedClasses = finalPredictions.map(p => p >= 0.5 ? 1 : 0);
  const accuracy = y.reduce((sum, yi, i) => sum + (yi === predictedClasses[i] ? 1 : 0), 0) / n;
  
  return { coefficients, predictions: finalPredictions, accuracy };
};

// Confusion Matrix (for future use)
const _confusionMatrix = (actual: number[], predicted: number[]): {
  tp: number; tn: number; fp: number; fn: number;
  accuracy: number; precision: number; recall: number; f1: number;
} => {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 1 && predicted[i] === 1) tp++;
    else if (actual[i] === 0 && predicted[i] === 0) tn++;
    else if (actual[i] === 0 && predicted[i] === 1) fp++;
    else if (actual[i] === 1 && predicted[i] === 0) fn++;
  }
  
  const accuracy = (tp + tn) / (tp + tn + fp + fn) || 0;
  const precision = tp / (tp + fp) || 0;
  const recall = tp / (tp + fn) || 0;
  const f1 = 2 * precision * recall / (precision + recall) || 0;
  
  return { tp, tn, fp, fn, accuracy, precision, recall, f1 };
};
void _confusionMatrix;

const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e', '#f97316', '#eab308', '#22c55e', '#14b8a6'];

const ComprehensiveAdvancedAnalysis: React.FC<Props> = ({ data, columns }) => {
  const { language, isRTL } = useLanguage();
  const [activeCategory, setActiveCategory] = useState<string>('correlation');
  const [activeAnalysis, setActiveAnalysis] = useState<string>('');
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [selectedVars, setSelectedVars] = useState<{ [key: string]: string }>({});
  const [analysisOptions, setAnalysisOptions] = useState<{ [key: string]: any }>({
    clusters: 3,
    components: 2,
    maWindow: 5,
    esAlpha: 0.3,
    seasonalPeriod: 12,
    correlationMethod: 'pearson'
  });
  const [isLoading, setIsLoading] = useState(false);
  // For future use: const [expandedSections, setExpandedSections] = useState<{ [key: string]: boolean }>({});

  // Get numeric and categorical columns
  const { numericColumns, categoricalColumns } = useMemo(() => {
    const numeric: string[] = [];
    const categorical: string[] = [];
    
    columns.forEach(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = values.filter(v => !isNaN(Number(v)));
      if (numericValues.length > values.length * 0.5) {
        numeric.push(col);
      } else {
        categorical.push(col);
      }
    });
    
    return { numericColumns: numeric, categoricalColumns: categorical };
  }, [data, columns]);

  // Analysis categories
  const analysisCategories = [
    {
      id: 'correlation',
      icon: <Share2 size={20} />,
      label: language === 'ar' ? 'تحليل الارتباط' : 'Correlation',
      color: 'from-blue-500 to-cyan-500',
      analyses: [
        { id: 'pearson', label: language === 'ar' ? 'ارتباط بيرسون' : 'Pearson Correlation' },
        { id: 'spearman', label: language === 'ar' ? 'ارتباط سبيرمان' : 'Spearman Correlation' },
        { id: 'correlation_matrix', label: language === 'ar' ? 'مصفوفة الارتباط' : 'Correlation Matrix' },
        { id: 'partial_correlation', label: language === 'ar' ? 'الارتباط الجزئي' : 'Partial Correlation' },
      ]
    },
    {
      id: 'regression',
      icon: <TrendingUp size={20} />,
      label: language === 'ar' ? 'تحليل الانحدار' : 'Regression',
      color: 'from-purple-500 to-pink-500',
      analyses: [
        { id: 'linear', label: language === 'ar' ? 'الانحدار الخطي البسيط' : 'Simple Linear Regression' },
        { id: 'multiple', label: language === 'ar' ? 'الانحدار المتعدد' : 'Multiple Regression' },
        { id: 'polynomial', label: language === 'ar' ? 'الانحدار متعدد الحدود' : 'Polynomial Regression' },
        { id: 'logistic', label: language === 'ar' ? 'الانحدار اللوجستي' : 'Logistic Regression' },
      ]
    },
    {
      id: 'timeseries',
      icon: <Activity size={20} />,
      label: language === 'ar' ? 'السلاسل الزمنية' : 'Time Series',
      color: 'from-green-500 to-emerald-500',
      analyses: [
        { id: 'trend', label: language === 'ar' ? 'تحليل الاتجاه' : 'Trend Analysis' },
        { id: 'seasonality', label: language === 'ar' ? 'تحليل الموسمية' : 'Seasonality Analysis' },
        { id: 'moving_average', label: language === 'ar' ? 'المتوسط المتحرك' : 'Moving Average' },
        { id: 'exponential_smoothing', label: language === 'ar' ? 'التنعيم الأسي' : 'Exponential Smoothing' },
        { id: 'decomposition', label: language === 'ar' ? 'تحليل المركبات' : 'Decomposition' },
        { id: 'autocorrelation', label: language === 'ar' ? 'الارتباط الذاتي' : 'Autocorrelation' },
      ]
    },
    {
      id: 'dimensionality',
      icon: <Layers size={20} />,
      label: language === 'ar' ? 'تقليل الأبعاد' : 'Dimensionality',
      color: 'from-orange-500 to-yellow-500',
      analyses: [
        { id: 'pca', label: language === 'ar' ? 'تحليل المكونات الرئيسية' : 'PCA' },
        { id: 'factor', label: language === 'ar' ? 'تحليل العوامل' : 'Factor Analysis' },
      ]
    },
    {
      id: 'clustering',
      icon: <GitBranch size={20} />,
      label: language === 'ar' ? 'التحليل العنقودي' : 'Clustering',
      color: 'from-red-500 to-pink-500',
      analyses: [
        { id: 'kmeans', label: language === 'ar' ? 'K-Means' : 'K-Means' },
        { id: 'hierarchical', label: language === 'ar' ? 'التجميع الهرمي' : 'Hierarchical' },
      ]
    },
    {
      id: 'classification',
      icon: <Target size={20} />,
      label: language === 'ar' ? 'التصنيف' : 'Classification',
      color: 'from-indigo-500 to-purple-500',
      analyses: [
        { id: 'logistic_class', label: language === 'ar' ? 'التصنيف اللوجستي' : 'Logistic Classification' },
        { id: 'confusion_matrix', label: language === 'ar' ? 'مصفوفة الارتباك' : 'Confusion Matrix' },
        { id: 'roc_curve', label: language === 'ar' ? 'منحنى ROC' : 'ROC Curve' },
      ]
    },
    {
      id: 'anova',
      icon: <BarChart2 size={20} />,
      label: language === 'ar' ? 'تحليل التباين' : 'ANOVA',
      color: 'from-teal-500 to-cyan-500',
      analyses: [
        { id: 'oneway_anova', label: language === 'ar' ? 'ANOVA أحادي الاتجاه' : 'One-Way ANOVA' },
        { id: 'twoway_anova', label: language === 'ar' ? 'ANOVA ثنائي الاتجاه' : 'Two-Way ANOVA' },
      ]
    },
    {
      id: 'categorical',
      icon: <PieIcon size={20} />,
      label: language === 'ar' ? 'البيانات الفئوية' : 'Categorical',
      color: 'from-pink-500 to-rose-500',
      analyses: [
        { id: 'chi_square', label: language === 'ar' ? 'اختبار كاي تربيع' : 'Chi-Square Test' },
        { id: 'contingency', label: language === 'ar' ? 'جدول الطوارئ' : 'Contingency Table' },
        { id: 'frequency', label: language === 'ar' ? 'تحليل التكرارات' : 'Frequency Analysis' },
      ]
    },
    {
      id: 'descriptive',
      icon: <FileText size={20} />,
      label: language === 'ar' ? 'التحليل الوصفي المتقدم' : 'Advanced Descriptive',
      color: 'from-gray-500 to-slate-500',
      analyses: [
        { id: 'summary_stats', label: language === 'ar' ? 'الإحصاءات الوصفية' : 'Summary Statistics' },
        { id: 'distribution', label: language === 'ar' ? 'تحليل التوزيع' : 'Distribution Analysis' },
        { id: 'outlier_analysis', label: language === 'ar' ? 'تحليل القيم الشاذة' : 'Outlier Analysis' },
      ]
    }
  ];

  // Run analysis
  const runAnalysis = () => {
    setIsLoading(true);
    
    setTimeout(() => {
      try {
        let result: any = null;
        
        switch (activeAnalysis) {
          case 'pearson':
          case 'spearman': {
            const var1 = selectedVars.var1;
            const var2 = selectedVars.var2;
            if (var1 && var2) {
              const x = data.map(row => Number(row[var1])).filter(v => !isNaN(v));
              const y = data.map(row => Number(row[var2])).filter(v => !isNaN(v));
              const r = activeAnalysis === 'pearson' ? pearsonCorrelation(x, y) : spearmanCorrelation(x, y);
              const n = Math.min(x.length, y.length);
              const t = r * Math.sqrt((n - 2) / (1 - r * r));
              
              result = {
                type: activeAnalysis,
                correlation: r,
                n,
                tStatistic: t,
                pValue: n > 2 ? 2 * (1 - Math.min(0.9999, Math.abs(t) / Math.sqrt(n))) : 1,
                interpretation: Math.abs(r) < 0.3 ? 
                  (language === 'ar' ? 'ارتباط ضعيف' : 'Weak correlation') :
                  Math.abs(r) < 0.7 ? 
                    (language === 'ar' ? 'ارتباط متوسط' : 'Moderate correlation') :
                    (language === 'ar' ? 'ارتباط قوي' : 'Strong correlation'),
                direction: r > 0 ? (language === 'ar' ? 'طردي' : 'Positive') : (language === 'ar' ? 'عكسي' : 'Negative'),
                scatterData: x.slice(0, 100).map((xi, i) => ({ x: xi, y: y[i] || 0 }))
              };
            }
            break;
          }
          
          case 'correlation_matrix': {
            const matrix: { var1: string; var2: string; r: number }[] = [];
            numericColumns.forEach((col1, i) => {
              numericColumns.forEach((col2, j) => {
                if (j >= i) {
                  const x = data.map(row => Number(row[col1])).filter(v => !isNaN(v));
                  const y = data.map(row => Number(row[col2])).filter(v => !isNaN(v));
                  const r = pearsonCorrelation(x, y);
                  matrix.push({ var1: col1, var2: col2, r });
                }
              });
            });
            result = { type: 'correlation_matrix', matrix, columns: numericColumns };
            break;
          }
          
          case 'linear': {
            const xVar = selectedVars.independent;
            const yVar = selectedVars.dependent;
            if (xVar && yVar) {
              const x = data.map(row => Number(row[xVar])).filter(v => !isNaN(v));
              const y = data.map(row => Number(row[yVar])).filter(v => !isNaN(v));
              const { slope, intercept, rSquared, predictions } = linearRegression(x, y);
              
              result = {
                type: 'linear',
                slope,
                intercept,
                rSquared,
                adjustedRSquared: 1 - (1 - rSquared) * (x.length - 1) / (x.length - 2),
                equation: `Y = ${intercept.toFixed(4)} + ${slope.toFixed(4)} × X`,
                n: Math.min(x.length, y.length),
                scatterData: x.slice(0, 100).map((xi, i) => ({ 
                  x: xi, 
                  y: y[i] || 0, 
                  predicted: predictions[i] || 0 
                }))
              };
            }
            break;
          }
          
          case 'multiple': {
            const yVar = selectedVars.dependent;
            const xVars = (selectedVars.independentMultiple || '').split(',').filter(Boolean);
            if (yVar && xVars.length > 0) {
              const y = data.map(row => Number(row[yVar])).filter(v => !isNaN(v));
              const X = data.map(row => xVars.map(v => Number(row[v.trim()]))).filter(row => row.every(v => !isNaN(v)));
              const { coefficients, rSquared, predictions } = multipleRegression(X, y.slice(0, X.length));
              
              result = {
                type: 'multiple',
                coefficients,
                variables: ['Intercept', ...xVars],
                rSquared,
                n: X.length,
                predictions: predictions.slice(0, 10)
              };
            }
            break;
          }
          
          case 'logistic': {
            const xVar = selectedVars.independent;
            const yVar = selectedVars.dependent;
            if (xVar && yVar) {
              const validData = data.filter(row => {
                const x = Number(row[xVar]);
                const y = Number(row[yVar]);
                return !isNaN(x) && (y === 0 || y === 1);
              });
              const X = validData.map(row => [Number(row[xVar])]);
              const y = validData.map(row => Number(row[yVar]));
              const { coefficients, predictions, accuracy } = logisticRegression(X, y);
              
              result = {
                type: 'logistic',
                coefficients,
                accuracy,
                n: validData.length,
                curveData: X.map((xi, i) => ({ x: xi[0], y: y[i], prob: predictions[i] }))
                  .sort((a, b) => a.x - b.x)
                  .slice(0, 100)
              };
            }
            break;
          }
          
          case 'trend':
          case 'seasonality':
          case 'moving_average':
          case 'exponential_smoothing':
          case 'decomposition':
          case 'autocorrelation': {
            const timeVar = selectedVars.timeVar;
            if (timeVar) {
              const values = data.map(row => Number(row[timeVar])).filter(v => !isNaN(v));
              
              if (activeAnalysis === 'trend') {
                const { trend, slope, intercept } = calculateTrend(values);
                result = {
                  type: 'trend',
                  slope,
                  intercept,
                  trendDirection: slope > 0 ? 
                    (language === 'ar' ? 'صاعد' : 'Upward') : 
                    (language === 'ar' ? 'هابط' : 'Downward'),
                  chartData: values.map((v, i) => ({ index: i, actual: v, trend: trend[i] }))
                };
              } else if (activeAnalysis === 'moving_average') {
                const ma = movingAverage(values, analysisOptions.maWindow);
                result = {
                  type: 'moving_average',
                  window: analysisOptions.maWindow,
                  chartData: values.map((v, i) => ({ index: i, actual: v, ma: ma[i] || null }))
                };
              } else if (activeAnalysis === 'exponential_smoothing') {
                const es = exponentialSmoothing(values, analysisOptions.esAlpha);
                result = {
                  type: 'exponential_smoothing',
                  alpha: analysisOptions.esAlpha,
                  chartData: values.map((v, i) => ({ index: i, actual: v, smoothed: es[i] }))
                };
              } else if (activeAnalysis === 'seasonality') {
                const seasonal = calculateSeasonality(values, analysisOptions.seasonalPeriod);
                result = {
                  type: 'seasonality',
                  period: analysisOptions.seasonalPeriod,
                  chartData: values.map((v, i) => ({ index: i, actual: v, seasonal: seasonal[i] }))
                };
              } else if (activeAnalysis === 'decomposition') {
                const { trend } = calculateTrend(values);
                const seasonal = calculateSeasonality(values, analysisOptions.seasonalPeriod);
                const residual = values.map((v, i) => v - trend[i] - seasonal[i]);
                result = {
                  type: 'decomposition',
                  chartData: values.map((v, i) => ({ 
                    index: i, 
                    actual: v, 
                    trend: trend[i], 
                    seasonal: seasonal[i],
                    residual: residual[i]
                  }))
                };
              } else if (activeAnalysis === 'autocorrelation') {
                const acf: number[] = [];
                for (let lag = 0; lag <= Math.min(20, Math.floor(values.length / 4)); lag++) {
                  const lagged = values.slice(lag);
                  const original = values.slice(0, values.length - lag);
                  acf.push(pearsonCorrelation(original, lagged));
                }
                result = {
                  type: 'autocorrelation',
                  acf,
                  chartData: acf.map((r, lag) => ({ lag, acf: r }))
                };
              }
            }
            break;
          }
          
          case 'pca':
          case 'factor': {
            const selectedCols = (selectedVars.pcaVars || numericColumns.slice(0, 5).join(',')).split(',').filter(Boolean);
            const numericData = data.map(row => 
              selectedCols.map(col => Number(row[col.trim()]))
            ).filter(row => row.every(v => !isNaN(v)));
            
            const { components, explainedVariance, transformedData } = performPCA(numericData, analysisOptions.components);
            
            result = {
              type: activeAnalysis,
              components,
              explainedVariance,
              cumulativeVariance: explainedVariance.reduce((acc: number[], v) => {
                acc.push((acc.length > 0 ? acc[acc.length - 1] : 0) + v);
                return acc;
              }, []),
              screeData: explainedVariance.map((v, i) => ({ 
                component: `PC${i + 1}`, 
                variance: v,
                cumulative: explainedVariance.slice(0, i + 1).reduce((a, b) => a + b, 0)
              })),
              scatterData: transformedData.slice(0, 100).map((row, i) => ({ 
                x: row[0] || 0, 
                y: row[1] || 0,
                label: `${i + 1}`
              }))
            };
            break;
          }
          
          case 'kmeans':
          case 'hierarchical': {
            const selectedCols = (selectedVars.clusterVars || numericColumns.slice(0, 3).join(',')).split(',').filter(Boolean);
            const numericData = data.map(row => 
              selectedCols.map(col => Number(row[col.trim()]))
            ).filter(row => row.every(v => !isNaN(v)));
            
            const { clusters, centroids } = kMeansClustering(numericData, analysisOptions.clusters);
            
            // Calculate cluster statistics
            const clusterStats = Array.from({ length: analysisOptions.clusters }, (_, c) => {
              const clusterData = numericData.filter((_, i) => clusters[i] === c);
              return {
                cluster: c + 1,
                count: clusterData.length,
                centroid: centroids[c],
                percentage: (clusterData.length / numericData.length * 100).toFixed(1)
              };
            });
            
            result = {
              type: activeAnalysis,
              clusters,
              centroids,
              clusterStats,
              n: numericData.length,
              scatterData: numericData.slice(0, 200).map((row, i) => ({
                x: row[0] || 0,
                y: row[1] || 0,
                cluster: clusters[i]
              })),
              pieData: clusterStats.map(stat => ({
                name: `${language === 'ar' ? 'عنقود' : 'Cluster'} ${stat.cluster}`,
                value: stat.count
              }))
            };
            break;
          }
          
          case 'oneway_anova': {
            const groupVar = selectedVars.groupVar;
            const valueVar = selectedVars.valueVar;
            if (groupVar && valueVar) {
              const groupedData: { [key: string]: number[] } = {};
              data.forEach(row => {
                const group = String(row[groupVar]);
                const value = Number(row[valueVar]);
                if (!isNaN(value)) {
                  if (!groupedData[group]) groupedData[group] = [];
                  groupedData[group].push(value);
                }
              });
              
              const groups = Object.values(groupedData);
              const groupNames = Object.keys(groupedData);
              const anovaResult = oneWayANOVA(groups);
              
              const groupStats = groupNames.map((name, i) => ({
                group: name,
                n: groups[i].length,
                mean: mean(groups[i]),
                std: std(groups[i])
              }));
              
              result = {
                type: 'oneway_anova',
                ...anovaResult,
                isSignificant: anovaResult.pValue < 0.05,
                groupStats,
                boxData: groupStats.map(stat => ({
                  group: stat.group,
                  min: Math.min(...groupedData[stat.group]),
                  q1: percentile(groupedData[stat.group], 25),
                  median: median(groupedData[stat.group]),
                  q3: percentile(groupedData[stat.group], 75),
                  max: Math.max(...groupedData[stat.group]),
                  mean: stat.mean
                }))
              };
            }
            break;
          }
          
          case 'chi_square':
          case 'contingency': {
            const var1 = selectedVars.catVar1;
            const var2 = selectedVars.catVar2;
            if (var1 && var2) {
              // Create contingency table
              const contingency: { [key: string]: { [key: string]: number } } = {};
              const categories1 = new Set<string>();
              const categories2 = new Set<string>();
              
              data.forEach(row => {
                const cat1 = String(row[var1]);
                const cat2 = String(row[var2]);
                categories1.add(cat1);
                categories2.add(cat2);
                if (!contingency[cat1]) contingency[cat1] = {};
                contingency[cat1][cat2] = (contingency[cat1][cat2] || 0) + 1;
              });
              
              const cat1Array = Array.from(categories1);
              const cat2Array = Array.from(categories2);
              const observed = cat1Array.map(c1 => cat2Array.map(c2 => contingency[c1]?.[c2] || 0));
              
              const chiResult = chiSquareTest(observed);
              
              result = {
                type: activeAnalysis,
                ...chiResult,
                isSignificant: chiResult.pValue < 0.05,
                categories1: cat1Array,
                categories2: cat2Array,
                observed,
                contingencyTable: cat1Array.map((c1, i) => ({
                  category: c1,
                  ...cat2Array.reduce((acc, c2, j) => ({ ...acc, [c2]: observed[i][j] }), {}),
                  total: observed[i].reduce((a, b) => a + b, 0)
                }))
              };
            }
            break;
          }
          
          case 'frequency': {
            const catVar = selectedVars.freqVar;
            if (catVar) {
              const freqMap: { [key: string]: number } = {};
              data.forEach(row => {
                const val = String(row[catVar]);
                freqMap[val] = (freqMap[val] || 0) + 1;
              });
              
              const total = data.length;
              const freqData = Object.entries(freqMap)
                .map(([category, count]) => ({
                  category,
                  count,
                  percentage: (count / total * 100).toFixed(1),
                  cumulative: 0
                }))
                .sort((a, b) => b.count - a.count);
              
              let cumSum = 0;
              freqData.forEach(item => {
                cumSum += item.count;
                item.cumulative = cumSum / total * 100;
              });
              
              result = {
                type: 'frequency',
                variable: catVar,
                n: total,
                uniqueValues: freqData.length,
                freqData,
                mode: freqData[0]?.category,
                modeCount: freqData[0]?.count
              };
            }
            break;
          }
          
          case 'summary_stats': {
            const statsData = numericColumns.map(col => {
              const values = data.map(row => Number(row[col])).filter(v => !isNaN(v));
              return {
                variable: col,
                n: values.length,
                mean: mean(values),
                median: median(values),
                std: std(values),
                min: Math.min(...values),
                max: Math.max(...values),
                q1: percentile(values, 25),
                q3: percentile(values, 75),
                skewness: skewness(values),
                kurtosis: kurtosis(values),
                cv: (std(values) / mean(values) * 100)
              };
            });
            
            result = {
              type: 'summary_stats',
              statsData,
              n: data.length,
              numericCount: numericColumns.length,
              categoricalCount: categoricalColumns.length
            };
            break;
          }
          
          case 'distribution': {
            const distVar = selectedVars.distVar;
            if (distVar) {
              const values = data.map(row => Number(row[distVar])).filter(v => !isNaN(v));
              
              // Create histogram
              const min = Math.min(...values);
              const max = Math.max(...values);
              const binCount = Math.min(30, Math.ceil(Math.sqrt(values.length)));
              const binWidth = (max - min) / binCount || 1;
              const histogram: { bin: string; count: number; percentage: number }[] = [];
              
              for (let i = 0; i < binCount; i++) {
                const binStart = min + i * binWidth;
                const binEnd = binStart + binWidth;
                const count = values.filter(v => v >= binStart && v < binEnd).length;
                histogram.push({
                  bin: `${binStart.toFixed(1)}-${binEnd.toFixed(1)}`,
                  count,
                  percentage: count / values.length * 100
                });
              }
              
              result = {
                type: 'distribution',
                variable: distVar,
                n: values.length,
                mean: mean(values),
                median: median(values),
                std: std(values),
                skewness: skewness(values),
                kurtosis: kurtosis(values),
                isNormal: Math.abs(skewness(values)) < 2 && Math.abs(kurtosis(values)) < 7,
                histogram
              };
            }
            break;
          }
          
          case 'outlier_analysis': {
            const outlierVar = selectedVars.outlierVar;
            if (outlierVar) {
              const values = data.map((row, i) => ({ value: Number(row[outlierVar]), index: i }))
                .filter(v => !isNaN(v.value));
              
              const vals = values.map(v => v.value);
              const q1 = percentile(vals, 25);
              const q3 = percentile(vals, 75);
              const iqr = q3 - q1;
              const lowerBound = q1 - 1.5 * iqr;
              const upperBound = q3 + 1.5 * iqr;
              
              const outliers = values.filter(v => v.value < lowerBound || v.value > upperBound);
              const zScores = vals.map(v => (v - mean(vals)) / std(vals));
              const zOutliers = values.filter((_, i) => Math.abs(zScores[i]) > 3);
              
              result = {
                type: 'outlier_analysis',
                variable: outlierVar,
                n: values.length,
                iqrOutliers: outliers.length,
                zScoreOutliers: zOutliers.length,
                lowerBound,
                upperBound,
                q1,
                q3,
                outlierPercentage: (outliers.length / values.length * 100).toFixed(2),
                outliersList: outliers.slice(0, 20).map(o => ({ ...o, type: o.value < lowerBound ? 'low' : 'high' })),
                boxData: [{
                  variable: outlierVar,
                  min: Math.max(Math.min(...vals), lowerBound),
                  q1,
                  median: median(vals),
                  q3,
                  max: Math.min(Math.max(...vals), upperBound),
                  outliers: outliers.map(o => o.value)
                }]
              };
            }
            break;
          }
          
          default:
            result = { type: 'unknown', message: 'Analysis not implemented' };
        }
        
        setAnalysisResult(result);
      } catch (error) {
        console.error('Analysis error:', error);
        setAnalysisResult({ type: 'error', message: String(error) });
      }
      
      setIsLoading(false);
    }, 500);
  };

  // Render analysis options
  const renderAnalysisOptions = () => {
    switch (activeAnalysis) {
      case 'pearson':
      case 'spearman':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغير الأول' : 'Variable 1'}
              </label>
              <select
                value={selectedVars.var1 || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, var1: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغير الثاني' : 'Variable 2'}
              </label>
              <select
                value={selectedVars.var2 || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, var2: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>
        );
      
      case 'linear':
      case 'logistic':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغير المستقل (X)' : 'Independent Variable (X)'}
              </label>
              <select
                value={selectedVars.independent || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, independent: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغير التابع (Y)' : 'Dependent Variable (Y)'}
              </label>
              <select
                value={selectedVars.dependent || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, dependent: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>
        );
      
      case 'trend':
      case 'moving_average':
      case 'exponential_smoothing':
      case 'seasonality':
      case 'decomposition':
      case 'autocorrelation':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'متغير السلسلة الزمنية' : 'Time Series Variable'}
              </label>
              <select
                value={selectedVars.timeVar || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, timeVar: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            {activeAnalysis === 'moving_average' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'حجم النافذة' : 'Window Size'}
                </label>
                <input
                  type="number"
                  value={analysisOptions.maWindow}
                  onChange={(e) => setAnalysisOptions({ ...analysisOptions, maWindow: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                  min="2"
                  max="50"
                />
              </div>
            )}
            {activeAnalysis === 'exponential_smoothing' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'معامل التنعيم (α)' : 'Smoothing Factor (α)'}
                </label>
                <input
                  type="number"
                  value={analysisOptions.esAlpha}
                  onChange={(e) => setAnalysisOptions({ ...analysisOptions, esAlpha: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                  min="0.1"
                  max="0.9"
                  step="0.1"
                />
              </div>
            )}
            {(activeAnalysis === 'seasonality' || activeAnalysis === 'decomposition') && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'فترة الموسمية' : 'Seasonal Period'}
                </label>
                <input
                  type="number"
                  value={analysisOptions.seasonalPeriod}
                  onChange={(e) => setAnalysisOptions({ ...analysisOptions, seasonalPeriod: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                  min="2"
                  max="365"
                />
              </div>
            )}
          </div>
        );
      
      case 'pca':
      case 'factor':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغيرات' : 'Variables'}
              </label>
              <select
                multiple
                value={(selectedVars.pcaVars || '').split(',').filter(Boolean)}
                onChange={(e) => setSelectedVars({ 
                  ...selectedVars, 
                  pcaVars: Array.from(e.target.selectedOptions, o => o.value).join(',') 
                })}
                className="w-full p-2 border rounded-lg h-32"
              >
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'ar' ? 'اضغط Ctrl للاختيار المتعدد' : 'Hold Ctrl for multiple selection'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'عدد المكونات' : 'Number of Components'}
              </label>
              <input
                type="number"
                value={analysisOptions.components}
                onChange={(e) => setAnalysisOptions({ ...analysisOptions, components: Number(e.target.value) })}
                className="w-full p-2 border rounded-lg"
                min="2"
                max="10"
              />
            </div>
          </div>
        );
      
      case 'kmeans':
      case 'hierarchical':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغيرات' : 'Variables'}
              </label>
              <select
                multiple
                value={(selectedVars.clusterVars || '').split(',').filter(Boolean)}
                onChange={(e) => setSelectedVars({ 
                  ...selectedVars, 
                  clusterVars: Array.from(e.target.selectedOptions, o => o.value).join(',') 
                })}
                className="w-full p-2 border rounded-lg h-32"
              >
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'عدد العناقيد' : 'Number of Clusters'}
              </label>
              <input
                type="number"
                value={analysisOptions.clusters}
                onChange={(e) => setAnalysisOptions({ ...analysisOptions, clusters: Number(e.target.value) })}
                className="w-full p-2 border rounded-lg"
                min="2"
                max="10"
              />
            </div>
          </div>
        );
      
      case 'oneway_anova':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'متغير التجميع' : 'Grouping Variable'}
              </label>
              <select
                value={selectedVars.groupVar || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, groupVar: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {categoricalColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'متغير القيمة' : 'Value Variable'}
              </label>
              <select
                value={selectedVars.valueVar || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, valueVar: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {numericColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>
        );
      
      case 'chi_square':
      case 'contingency':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغير الفئوي الأول' : 'Categorical Variable 1'}
              </label>
              <select
                value={selectedVars.catVar1 || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, catVar1: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {categoricalColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغير الفئوي الثاني' : 'Categorical Variable 2'}
              </label>
              <select
                value={selectedVars.catVar2 || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, catVar2: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {categoricalColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </div>
        );
      
      case 'frequency':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'ar' ? 'المتغير الفئوي' : 'Categorical Variable'}
            </label>
            <select
              value={selectedVars.freqVar || ''}
              onChange={(e) => setSelectedVars({ ...selectedVars, freqVar: e.target.value })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
              {[...categoricalColumns, ...numericColumns].map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        );
      
      case 'distribution':
      case 'outlier_analysis':
        return (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {language === 'ar' ? 'المتغير الرقمي' : 'Numeric Variable'}
            </label>
            <select
              value={selectedVars[activeAnalysis === 'distribution' ? 'distVar' : 'outlierVar'] || ''}
              onChange={(e) => setSelectedVars({ 
                ...selectedVars, 
                [activeAnalysis === 'distribution' ? 'distVar' : 'outlierVar']: e.target.value 
              })}
              className="w-full p-2 border rounded-lg"
            >
              <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
              {numericColumns.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        );
      
      default:
        return null;
    }
  };

  // Render analysis result
  const renderAnalysisResult = () => {
    if (!analysisResult) return null;
    
    const { type } = analysisResult;
    
    switch (type) {
      case 'pearson':
      case 'spearman':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'معامل الارتباط' : 'Correlation'}</p>
                <p className="text-2xl font-bold text-blue-800">{analysisResult.correlation?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'القوة' : 'Strength'}</p>
                <p className="text-lg font-bold text-purple-800">{analysisResult.interpretation}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'الاتجاه' : 'Direction'}</p>
                <p className="text-lg font-bold text-green-800">{analysisResult.direction}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">n</p>
                <p className="text-2xl font-bold text-orange-800">{analysisResult.n}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'رسم التشتت' : 'Scatter Plot'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" />
                  <YAxis dataKey="y" type="number" />
                  <Tooltip />
                  <Scatter data={analysisResult.scatterData} fill="#6366f1" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'linear':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">R²</p>
                <p className="text-2xl font-bold text-blue-800">{(analysisResult.rSquared * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'الميل' : 'Slope'}</p>
                <p className="text-lg font-bold text-purple-800">{analysisResult.slope?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'الثابت' : 'Intercept'}</p>
                <p className="text-lg font-bold text-green-800">{analysisResult.intercept?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">n</p>
                <p className="text-2xl font-bold text-orange-800">{analysisResult.n}</p>
              </div>
            </div>
            
            <div className="bg-indigo-50 p-4 rounded-xl">
              <p className="text-sm text-indigo-600 mb-1">{language === 'ar' ? 'معادلة الانحدار' : 'Regression Equation'}</p>
              <p className="text-xl font-mono font-bold text-indigo-800">{analysisResult.equation}</p>
            </div>
            
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'رسم الانحدار' : 'Regression Plot'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analysisResult.scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Scatter dataKey="y" fill="#6366f1" name={language === 'ar' ? 'الفعلي' : 'Actual'} />
                  <Line dataKey="predicted" stroke="#ef4444" strokeWidth={2} dot={false} name={language === 'ar' ? 'المتوقع' : 'Predicted'} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'trend':
      case 'moving_average':
      case 'exponential_smoothing':
      case 'decomposition':
        return (
          <div className="space-y-6">
            {type === 'trend' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                  <p className="text-sm text-blue-600">{language === 'ar' ? 'الاتجاه' : 'Trend'}</p>
                  <p className="text-xl font-bold text-blue-800">{analysisResult.trendDirection}</p>
                </div>
                <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                  <p className="text-sm text-purple-600">{language === 'ar' ? 'الميل' : 'Slope'}</p>
                  <p className="text-lg font-bold text-purple-800">{analysisResult.slope?.toFixed(4)}</p>
                </div>
                <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                  <p className="text-sm text-green-600">{language === 'ar' ? 'الثابت' : 'Intercept'}</p>
                  <p className="text-lg font-bold text-green-800">{analysisResult.intercept?.toFixed(4)}</p>
                </div>
              </div>
            )}
            
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'الرسم البياني' : 'Chart'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysisResult.chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="index" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="actual" stroke="#6366f1" name={language === 'ar' ? 'الفعلي' : 'Actual'} dot={false} />
                  {type === 'trend' && <Line type="monotone" dataKey="trend" stroke="#ef4444" name={language === 'ar' ? 'الاتجاه' : 'Trend'} dot={false} />}
                  {type === 'moving_average' && <Line type="monotone" dataKey="ma" stroke="#10b981" name={language === 'ar' ? 'المتوسط المتحرك' : 'Moving Average'} dot={false} />}
                  {type === 'exponential_smoothing' && <Line type="monotone" dataKey="smoothed" stroke="#f59e0b" name={language === 'ar' ? 'التنعيم' : 'Smoothed'} dot={false} />}
                  {type === 'decomposition' && (
                    <>
                      <Line type="monotone" dataKey="trend" stroke="#ef4444" name={language === 'ar' ? 'الاتجاه' : 'Trend'} dot={false} />
                      <Line type="monotone" dataKey="seasonal" stroke="#10b981" name={language === 'ar' ? 'الموسمية' : 'Seasonal'} dot={false} />
                    </>
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'autocorrelation':
        return (
          <div className="bg-white p-4 rounded-xl border">
            <h4 className="font-semibold mb-4">{language === 'ar' ? 'دالة الارتباط الذاتي (ACF)' : 'Autocorrelation Function (ACF)'}</h4>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={analysisResult.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="lag" />
                <YAxis domain={[-1, 1]} />
                <Tooltip />
                <Bar dataKey="acf" fill="#6366f1" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );
      
      case 'pca':
      case 'factor':
        return (
          <div className="space-y-6">
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'التباين المفسر' : 'Explained Variance'}</h4>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={analysisResult.screeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="component" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="variance" fill="#6366f1" name={language === 'ar' ? 'التباين %' : 'Variance %'} />
                  <Line type="monotone" dataKey="cumulative" stroke="#ef4444" name={language === 'ar' ? 'التراكمي %' : 'Cumulative %'} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'رسم المكونات' : 'Components Plot'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" name="PC1" />
                  <YAxis dataKey="y" name="PC2" />
                  <Tooltip />
                  <Scatter data={analysisResult.scatterData} fill="#6366f1" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'kmeans':
      case 'hierarchical':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border">
                <h4 className="font-semibold mb-4">{language === 'ar' ? 'توزيع العناقيد' : 'Cluster Distribution'}</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={analysisResult.pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {analysisResult.pieData.map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-4 rounded-xl border">
                <h4 className="font-semibold mb-4">{language === 'ar' ? 'إحصائيات العناقيد' : 'Cluster Statistics'}</h4>
                <div className="space-y-2">
                  {analysisResult.clusterStats?.map((stat: any) => (
                    <div key={stat.cluster} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[(stat.cluster - 1) % COLORS.length] }}></span>
                        {language === 'ar' ? 'عنقود' : 'Cluster'} {stat.cluster}
                      </span>
                      <span className="font-bold">{stat.count} ({stat.percentage}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'رسم التشتت' : 'Scatter Plot'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" />
                  <YAxis dataKey="y" />
                  <Tooltip />
                  <Scatter data={analysisResult.scatterData} fill="#8884d8">
                    {analysisResult.scatterData?.map((_: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={COLORS[analysisResult.scatterData[index].cluster % COLORS.length]} />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'oneway_anova':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">F-{language === 'ar' ? 'إحصائي' : 'Statistic'}</p>
                <p className="text-2xl font-bold text-blue-800">{analysisResult.fStatistic?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">p-value</p>
                <p className="text-lg font-bold text-purple-800">{analysisResult.pValue?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">df (between)</p>
                <p className="text-2xl font-bold text-green-800">{analysisResult.dfBetween}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">df (within)</p>
                <p className="text-2xl font-bold text-orange-800">{analysisResult.dfWithin}</p>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl ${analysisResult.isSignificant ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {analysisResult.isSignificant ? 
                  <CheckCircle className="text-green-600" size={20} /> : 
                  <AlertCircle className="text-gray-600" size={20} />
                }
                <span className={`font-semibold ${analysisResult.isSignificant ? 'text-green-800' : 'text-gray-800'}`}>
                  {analysisResult.isSignificant ? 
                    (language === 'ar' ? 'توجد فروق دالة إحصائياً بين المجموعات' : 'Significant differences exist between groups') :
                    (language === 'ar' ? 'لا توجد فروق دالة إحصائياً' : 'No significant differences')
                  }
                </span>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'إحصائيات المجموعات' : 'Group Statistics'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">{language === 'ar' ? 'المجموعة' : 'Group'}</th>
                      <th className="p-2 text-right">n</th>
                      <th className="p-2 text-right">{language === 'ar' ? 'المتوسط' : 'Mean'}</th>
                      <th className="p-2 text-right">{language === 'ar' ? 'الانحراف المعياري' : 'Std'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.groupStats?.map((stat: any) => (
                      <tr key={stat.group} className="border-b">
                        <td className="p-2 font-medium">{stat.group}</td>
                        <td className="p-2">{stat.n}</td>
                        <td className="p-2">{stat.mean?.toFixed(2)}</td>
                        <td className="p-2">{stat.std?.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      
      case 'chi_square':
      case 'contingency':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">χ²</p>
                <p className="text-2xl font-bold text-blue-800">{analysisResult.statistic?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">p-value</p>
                <p className="text-lg font-bold text-purple-800">{analysisResult.pValue?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">df</p>
                <p className="text-2xl font-bold text-green-800">{analysisResult.df}</p>
              </div>
            </div>
            
            <div className={`p-4 rounded-xl ${analysisResult.isSignificant ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {analysisResult.isSignificant ? 
                  <CheckCircle className="text-green-600" size={20} /> : 
                  <AlertCircle className="text-gray-600" size={20} />
                }
                <span className={`font-semibold ${analysisResult.isSignificant ? 'text-green-800' : 'text-gray-800'}`}>
                  {analysisResult.isSignificant ? 
                    (language === 'ar' ? 'توجد علاقة دالة إحصائياً بين المتغيرين' : 'Significant association exists') :
                    (language === 'ar' ? 'لا توجد علاقة دالة إحصائياً' : 'No significant association')
                  }
                </span>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'جدول الطوارئ' : 'Contingency Table'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2"></th>
                      {analysisResult.categories2?.map((cat: string) => (
                        <th key={cat} className="p-2 text-center">{cat}</th>
                      ))}
                      <th className="p-2 text-center font-bold">{language === 'ar' ? 'المجموع' : 'Total'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.contingencyTable?.map((row: any) => (
                      <tr key={row.category} className="border-b">
                        <td className="p-2 font-medium bg-gray-50">{row.category}</td>
                        {analysisResult.categories2?.map((cat: string) => (
                          <td key={cat} className="p-2 text-center">{row[cat]}</td>
                        ))}
                        <td className="p-2 text-center font-bold bg-gray-50">{row.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      
      case 'frequency':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">n</p>
                <p className="text-2xl font-bold text-blue-800">{analysisResult.n}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'القيم الفريدة' : 'Unique Values'}</p>
                <p className="text-2xl font-bold text-purple-800">{analysisResult.uniqueValues}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'المنوال' : 'Mode'}</p>
                <p className="text-lg font-bold text-green-800">{analysisResult.mode} ({analysisResult.modeCount})</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-xl border">
                <h4 className="font-semibold mb-4">{language === 'ar' ? 'رسم الأعمدة' : 'Bar Chart'}</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={analysisResult.freqData?.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="category" type="category" width={100} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white p-4 rounded-xl border">
                <h4 className="font-semibold mb-4">{language === 'ar' ? 'الرسم الدائري' : 'Pie Chart'}</h4>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie 
                      data={analysisResult.freqData?.slice(0, 8)} 
                      dataKey="count" 
                      nameKey="category" 
                      cx="50%" 
                      cy="50%" 
                      outerRadius={80}
                      label={({ percent }) => `${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {analysisResult.freqData?.slice(0, 8).map((_: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        );
      
      case 'summary_stats':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">n</p>
                <p className="text-2xl font-bold text-blue-800">{analysisResult.n}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'متغيرات رقمية' : 'Numeric Variables'}</p>
                <p className="text-2xl font-bold text-purple-800">{analysisResult.numericCount}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'متغيرات فئوية' : 'Categorical Variables'}</p>
                <p className="text-2xl font-bold text-green-800">{analysisResult.categoricalCount}</p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border overflow-x-auto">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'الإحصاءات الوصفية' : 'Descriptive Statistics'}</h4>
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="p-2 text-right">{language === 'ar' ? 'المتغير' : 'Variable'}</th>
                    <th className="p-2 text-right">n</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'المتوسط' : 'Mean'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'الوسيط' : 'Median'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'الانحراف' : 'Std'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'الحد الأدنى' : 'Min'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'الحد الأقصى' : 'Max'}</th>
                    <th className="p-2 text-right">{language === 'ar' ? 'الالتواء' : 'Skew'}</th>
                  </tr>
                </thead>
                <tbody>
                  {analysisResult.statsData?.map((stat: any) => (
                    <tr key={stat.variable} className="border-b hover:bg-gray-50">
                      <td className="p-2 font-medium">{stat.variable}</td>
                      <td className="p-2">{stat.n}</td>
                      <td className="p-2">{stat.mean?.toFixed(2)}</td>
                      <td className="p-2">{stat.median?.toFixed(2)}</td>
                      <td className="p-2">{stat.std?.toFixed(2)}</td>
                      <td className="p-2">{stat.min?.toFixed(2)}</td>
                      <td className="p-2">{stat.max?.toFixed(2)}</td>
                      <td className="p-2">{stat.skewness?.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      
      case 'distribution':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'المتوسط' : 'Mean'}</p>
                <p className="text-xl font-bold text-blue-800">{analysisResult.mean?.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'الوسيط' : 'Median'}</p>
                <p className="text-xl font-bold text-purple-800">{analysisResult.median?.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'الانحراف' : 'Std'}</p>
                <p className="text-xl font-bold text-green-800">{analysisResult.std?.toFixed(2)}</p>
              </div>
              <div className={`p-4 rounded-xl ${analysisResult.isNormal ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-orange-50 to-orange-100'}`}>
                <p className={`text-sm ${analysisResult.isNormal ? 'text-green-600' : 'text-orange-600'}`}>
                  {language === 'ar' ? 'التوزيع' : 'Distribution'}
                </p>
                <p className={`text-lg font-bold ${analysisResult.isNormal ? 'text-green-800' : 'text-orange-800'}`}>
                  {analysisResult.isNormal ? 
                    (language === 'ar' ? 'طبيعي' : 'Normal') : 
                    (language === 'ar' ? 'غير طبيعي' : 'Non-normal')
                  }
                </p>
              </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'المدرج التكراري' : 'Histogram'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={analysisResult.histogram}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="bin" angle={-45} textAnchor="end" height={80} fontSize={10} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#6366f1" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'outlier_analysis':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-xl">
                <p className="text-sm text-red-600">{language === 'ar' ? 'القيم الشاذة (IQR)' : 'Outliers (IQR)'}</p>
                <p className="text-2xl font-bold text-red-800">{analysisResult.iqrOutliers}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">{language === 'ar' ? 'النسبة' : 'Percentage'}</p>
                <p className="text-xl font-bold text-orange-800">{analysisResult.outlierPercentage}%</p>
              </div>
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'الحد الأدنى' : 'Lower Bound'}</p>
                <p className="text-lg font-bold text-blue-800">{analysisResult.lowerBound?.toFixed(2)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'الحد الأعلى' : 'Upper Bound'}</p>
                <p className="text-lg font-bold text-purple-800">{analysisResult.upperBound?.toFixed(2)}</p>
              </div>
            </div>
            
            {analysisResult.outliersList?.length > 0 && (
              <div className="bg-white p-4 rounded-xl border">
                <h4 className="font-semibold mb-4">{language === 'ar' ? 'عينة من القيم الشاذة' : 'Sample Outliers'}</h4>
                <div className="flex flex-wrap gap-2">
                  {analysisResult.outliersList.map((o: any, i: number) => (
                    <span 
                      key={i} 
                      className={`px-3 py-1 rounded-full text-sm ${
                        o.type === 'low' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {o.value.toFixed(2)} ({o.type === 'low' ? '↓' : '↑'})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      
      default:
        return (
          <div className="text-center py-8 text-gray-500">
            {language === 'ar' ? 'لا توجد نتائج للعرض' : 'No results to display'}
          </div>
        );
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl">
        <div className="text-center">
          <Database size={64} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-xl font-semibold text-gray-600">
            {language === 'ar' ? 'لا توجد بيانات' : 'No Data Available'}
          </h3>
          <p className="text-gray-500 mt-2">
            {language === 'ar' ? 'يرجى تحميل بيانات أولاً' : 'Please load data first'}
          </p>
        </div>
      </div>
    );
  }

  const currentCategory = analysisCategories.find(cat => cat.id === activeCategory);

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Brain size={28} />
              {language === 'ar' ? 'التحليل المتقدم الشامل' : 'Comprehensive Advanced Analysis'}
            </h2>
            <p className="text-white/80 mt-1">
              {language === 'ar' 
                ? 'جميع أنواع التحليلات الإحصائية في مكان واحد' 
                : 'All types of statistical analysis in one place'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <span className="text-sm opacity-80">{language === 'ar' ? 'المتغيرات الرقمية' : 'Numeric'}</span>
              <p className="text-xl font-bold">{numericColumns.length}</p>
            </div>
            <div className="bg-white/20 backdrop-blur-sm rounded-xl px-4 py-2">
              <span className="text-sm opacity-80">{language === 'ar' ? 'المتغيرات الفئوية' : 'Categorical'}</span>
              <p className="text-xl font-bold">{categoricalColumns.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Categories */}
      <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-9 gap-2">
        {analysisCategories.map(category => (
          <button
            key={category.id}
            onClick={() => {
              setActiveCategory(category.id);
              setActiveAnalysis('');
              setAnalysisResult(null);
            }}
            className={`p-3 rounded-xl flex flex-col items-center gap-2 transition-all ${
              activeCategory === category.id
                ? `bg-gradient-to-br ${category.color} text-white shadow-lg scale-105`
                : 'bg-white border hover:shadow-md hover:scale-102'
            }`}
          >
            {category.icon}
            <span className="text-xs font-medium text-center">{category.label}</span>
          </button>
        ))}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Analysis Selection */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-white rounded-xl p-4 border shadow-sm">
            <h3 className={`font-semibold text-lg mb-4 flex items-center gap-2 bg-gradient-to-r ${currentCategory?.color} bg-clip-text text-transparent`}>
              {currentCategory?.icon}
              {currentCategory?.label}
            </h3>
            
            <div className="space-y-2">
              {currentCategory?.analyses.map(analysis => (
                <button
                  key={analysis.id}
                  onClick={() => {
                    setActiveAnalysis(analysis.id);
                    setAnalysisResult(null);
                  }}
                  className={`w-full p-3 rounded-lg text-right flex items-center justify-between transition-all ${
                    activeAnalysis === analysis.id
                      ? `bg-gradient-to-r ${currentCategory.color} text-white`
                      : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <span>{analysis.label}</span>
                  <ArrowRight size={16} className={isRTL ? 'rotate-180' : ''} />
                </button>
              ))}
            </div>
          </div>

          {/* Analysis Options */}
          {activeAnalysis && (
            <div className="bg-white rounded-xl p-4 border shadow-sm">
              <h4 className="font-semibold mb-4 flex items-center gap-2">
                <Settings size={18} />
                {language === 'ar' ? 'إعدادات التحليل' : 'Analysis Settings'}
              </h4>
              
              {renderAnalysisOptions()}
              
              <button
                onClick={runAnalysis}
                disabled={isLoading}
                className={`w-full mt-4 p-3 rounded-xl font-semibold flex items-center justify-center gap-2 transition-all
                  bg-gradient-to-r ${currentCategory?.color} text-white hover:shadow-lg disabled:opacity-50`}
              >
                {isLoading ? (
                  <>
                    <RefreshCw size={18} className="animate-spin" />
                    {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
                  </>
                ) : (
                  <>
                    <Play size={18} />
                    {language === 'ar' ? 'تنفيذ التحليل' : 'Run Analysis'}
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Results */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl p-6 border shadow-sm min-h-[500px]">
            {!activeAnalysis ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <Compass size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">
                    {language === 'ar' ? 'اختر نوع التحليل من القائمة' : 'Select an analysis type from the list'}
                  </p>
                </div>
              </div>
            ) : !analysisResult ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-gray-500">
                  <Settings size={64} className="mx-auto mb-4 opacity-50" />
                  <p className="text-lg">
                    {language === 'ar' ? 'حدد المتغيرات ثم انقر "تنفيذ التحليل"' : 'Select variables and click "Run Analysis"'}
                  </p>
                </div>
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle className="text-green-500" size={24} />
                    {language === 'ar' ? 'نتائج التحليل' : 'Analysis Results'}
                  </h3>
                  <button
                    onClick={() => {
                      // Export results
                      const blob = new Blob([JSON.stringify(analysisResult, null, 2)], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = `analysis_${activeAnalysis}_${Date.now()}.json`;
                      a.click();
                    }}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg flex items-center gap-2 text-sm"
                  >
                    <Download size={16} />
                    {language === 'ar' ? 'تصدير' : 'Export'}
                  </button>
                </div>
                
                {renderAnalysisResult()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ComprehensiveAdvancedAnalysis;
