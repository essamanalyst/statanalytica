import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  ScatterChart, Scatter, LineChart, Line, ComposedChart,
  Cell, ReferenceLine
} from 'recharts';
import { useLanguage } from '../i18n';

interface AdvancedAnalysisProps {
  data: Record<string, any>[];
  columns: { name: string; type: string }[];
}

type AnalysisType = 'correlation' | 'regression' | 'timeseries' | 'pca' | 'clustering' | 'factor' | 'manova' | 'discriminant';

interface AnalysisResult {
  type: string;
  timestamp: Date;
  results: any;
}

// ===================== الدوال الإحصائية =====================

const calculateMean = (arr: number[]): number => {
  const valid = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
};

const calculateStd = (arr: number[]): number => {
  const valid = arr.filter(v => v !== null && v !== undefined && !isNaN(v));
  const mean = calculateMean(valid);
  const squaredDiffs = valid.map(v => Math.pow(v - mean, 2));
  return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / (valid.length - 1));
};

const calculateCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  const validPairs: [number, number][] = [];
  
  for (let i = 0; i < n; i++) {
    if (x[i] !== null && y[i] !== null && !isNaN(x[i]) && !isNaN(y[i])) {
      validPairs.push([x[i], y[i]]);
    }
  }
  
  if (validPairs.length < 3) return 0;
  
  const xVals = validPairs.map(p => p[0]);
  const yVals = validPairs.map(p => p[1]);
  const xMean = calculateMean(xVals);
  const yMean = calculateMean(yVals);
  
  let numerator = 0;
  let xDenom = 0;
  let yDenom = 0;
  
  for (let i = 0; i < validPairs.length; i++) {
    const xDiff = xVals[i] - xMean;
    const yDiff = yVals[i] - yMean;
    numerator += xDiff * yDiff;
    xDenom += xDiff * xDiff;
    yDenom += yDiff * yDiff;
  }
  
  const denominator = Math.sqrt(xDenom * yDenom);
  return denominator === 0 ? 0 : numerator / denominator;
};

const calculateSpearman = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  const validPairs: [number, number][] = [];
  
  for (let i = 0; i < n; i++) {
    if (x[i] !== null && y[i] !== null && !isNaN(x[i]) && !isNaN(y[i])) {
      validPairs.push([x[i], y[i]]);
    }
  }
  
  if (validPairs.length < 3) return 0;
  
  const rank = (arr: number[]): number[] => {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    for (let i = 0; i < sorted.length; i++) {
      ranks[sorted[i].i] = i + 1;
    }
    return ranks;
  };
  
  const xRanks = rank(validPairs.map(p => p[0]));
  const yRanks = rank(validPairs.map(p => p[1]));
  
  return calculateCorrelation(xRanks, yRanks);
};

const linearRegression = (x: number[], y: number[]): { slope: number; intercept: number; r2: number; predictions: number[]; residuals: number[] } => {
  const n = Math.min(x.length, y.length);
  const validPairs: [number, number][] = [];
  
  for (let i = 0; i < n; i++) {
    if (x[i] !== null && y[i] !== null && !isNaN(x[i]) && !isNaN(y[i])) {
      validPairs.push([x[i], y[i]]);
    }
  }
  
  if (validPairs.length < 2) {
    return { slope: 0, intercept: 0, r2: 0, predictions: [], residuals: [] };
  }
  
  const xVals = validPairs.map(p => p[0]);
  const yVals = validPairs.map(p => p[1]);
  const xMean = calculateMean(xVals);
  const yMean = calculateMean(yVals);
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < validPairs.length; i++) {
    numerator += (xVals[i] - xMean) * (yVals[i] - yMean);
    denominator += Math.pow(xVals[i] - xMean, 2);
  }
  
  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = yMean - slope * xMean;
  
  const predictions = xVals.map(xi => slope * xi + intercept);
  const residuals = yVals.map((yi, i) => yi - predictions[i]);
  
  const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
  const ssTot = yVals.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  
  return { slope, intercept, r2, predictions, residuals };
};

const multipleRegression = (X: number[][], y: number[]): { coefficients: number[]; r2: number; adjustedR2: number; fStatistic: number; predictions: number[]; residuals: number[] } => {
  const n = y.length;
  const p = X[0]?.length || 0;
  
  if (n < p + 2 || p === 0) {
    return { coefficients: [], r2: 0, adjustedR2: 0, fStatistic: 0, predictions: [], residuals: [] };
  }
  
  const XWithIntercept = X.map(row => [1, ...row]);
  const coefficients = new Array(p + 1).fill(0);
  const learningRate = 0.01;
  const iterations = 1000;
  
  for (let iter = 0; iter < iterations; iter++) {
    const predictions = XWithIntercept.map(row => 
      row.reduce((sum, xi, j) => sum + xi * coefficients[j], 0)
    );
    
    const errors = predictions.map((pred, i) => pred - y[i]);
    
    for (let j = 0; j < coefficients.length; j++) {
      const gradient = errors.reduce((sum, err, i) => sum + err * XWithIntercept[i][j], 0) / n;
      coefficients[j] -= learningRate * gradient;
    }
  }
  
  const predictions = XWithIntercept.map(row => 
    row.reduce((sum, xi, j) => sum + xi * coefficients[j], 0)
  );
  const residuals = y.map((yi, i) => yi - predictions[i]);
  
  const yMean = calculateMean(y);
  const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - yMean, 2), 0);
  const r2 = ssTot === 0 ? 0 : 1 - ssRes / ssTot;
  const adjustedR2 = 1 - ((1 - r2) * (n - 1)) / (n - p - 1);
  
  const ssReg = ssTot - ssRes;
  const fStatistic = p === 0 ? 0 : (ssReg / p) / (ssRes / (n - p - 1));
  
  return { coefficients, r2, adjustedR2, fStatistic, predictions, residuals };
};

const polynomialRegression = (x: number[], y: number[], degree: number): { coefficients: number[]; r2: number; predictions: number[] } => {
  const X = x.map(xi => {
    const row = [];
    for (let d = 1; d <= degree; d++) {
      row.push(Math.pow(xi, d));
    }
    return row;
  });
  
  const result = multipleRegression(X, y);
  return {
    coefficients: result.coefficients,
    r2: result.r2,
    predictions: result.predictions
  };
};

const calculateAutocorrelation = (data: number[], lag: number): number => {
  const n = data.length;
  if (lag >= n) return 0;
  
  const mean = calculateMean(data);
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < n - lag; i++) {
    numerator += (data[i] - mean) * (data[i + lag] - mean);
  }
  
  for (let i = 0; i < n; i++) {
    denominator += Math.pow(data[i] - mean, 2);
  }
  
  return denominator === 0 ? 0 : numerator / denominator;
};

const movingAverage = (data: number[], window: number): number[] => {
  const result: number[] = [];
  for (let i = 0; i < data.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const sum = data.slice(i - window + 1, i + 1).reduce((a, b) => a + b, 0);
      result.push(sum / window);
    }
  }
  return result;
};

const exponentialSmoothing = (data: number[], alpha: number): number[] => {
  const result: number[] = [data[0]];
  for (let i = 1; i < data.length; i++) {
    result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
};

const calculatePCA = (data: number[][]): { components: number[][]; explainedVariance: number[]; loadings: number[][] } => {
  const n = data.length;
  const p = data[0]?.length || 0;
  
  if (n < 2 || p < 2) {
    return { components: [], explainedVariance: [], loadings: [] };
  }
  
  const means: number[] = [];
  const stds: number[] = [];
  for (let j = 0; j < p; j++) {
    const col = data.map(row => row[j]);
    means.push(calculateMean(col));
    stds.push(calculateStd(col));
  }
  
  const normalized = data.map(row => 
    row.map((val, j) => stds[j] === 0 ? 0 : (val - means[j]) / stds[j])
  );
  
  const covMatrix: number[][] = [];
  for (let i = 0; i < p; i++) {
    covMatrix[i] = [];
    for (let j = 0; j < p; j++) {
      let sum = 0;
      for (let k = 0; k < n; k++) {
        sum += normalized[k][i] * normalized[k][j];
      }
      covMatrix[i][j] = sum / (n - 1);
    }
  }
  
  const numComponents = Math.min(p, 3);
  const components: number[][] = [];
  const explainedVariance: number[] = [];
  const loadings: number[][] = [];
  
  let currentMatrix = covMatrix.map(row => [...row]);
  
  for (let comp = 0; comp < numComponents; comp++) {
    let eigenvector = new Array(p).fill(1).map(() => Math.random());
    
    const norm = Math.sqrt(eigenvector.reduce((sum, v) => sum + v * v, 0));
    eigenvector = eigenvector.map(v => v / norm);
    
    for (let iter = 0; iter < 100; iter++) {
      const newVector = new Array(p).fill(0);
      for (let i = 0; i < p; i++) {
        for (let j = 0; j < p; j++) {
          newVector[i] += currentMatrix[i][j] * eigenvector[j];
        }
      }
      const newNorm = Math.sqrt(newVector.reduce((sum, v) => sum + v * v, 0));
      eigenvector = newVector.map(v => v / newNorm);
    }
    
    let eigenvalue = 0;
    for (let i = 0; i < p; i++) {
      let sum = 0;
      for (let j = 0; j < p; j++) {
        sum += currentMatrix[i][j] * eigenvector[j];
      }
      eigenvalue += sum * eigenvector[i];
    }
    
    loadings.push(eigenvector);
    explainedVariance.push(eigenvalue);
    
    for (let i = 0; i < p; i++) {
      for (let j = 0; j < p; j++) {
        currentMatrix[i][j] -= eigenvalue * eigenvector[i] * eigenvector[j];
      }
    }
    
    const scores = normalized.map(row => 
      row.reduce((sum, val, j) => sum + val * eigenvector[j], 0)
    );
    components.push(scores);
  }
  
  const totalVariance = explainedVariance.reduce((a, b) => a + b, 0);
  const explainedVarianceRatio = explainedVariance.map(v => (v / totalVariance) * 100);
  
  return { components, explainedVariance: explainedVarianceRatio, loadings };
};

const kMeansClustering = (data: number[][], k: number, maxIterations: number = 100): { clusters: number[]; centroids: number[][]; wcss: number } => {
  const n = data.length;
  const p = data[0]?.length || 0;
  
  if (n < k || p === 0) {
    return { clusters: [], centroids: [], wcss: 0 };
  }
  
  const indices = [...Array(n).keys()].sort(() => Math.random() - 0.5).slice(0, k);
  let centroids = indices.map(i => [...data[i]]);
  let clusters = new Array(n).fill(0);
  
  for (let iter = 0; iter < maxIterations; iter++) {
    const newClusters = data.map(point => {
      let minDist = Infinity;
      let cluster = 0;
      for (let c = 0; c < k; c++) {
        const dist = Math.sqrt(
          point.reduce((sum, val, j) => sum + Math.pow(val - centroids[c][j], 2), 0)
        );
        if (dist < minDist) {
          minDist = dist;
          cluster = c;
        }
      }
      return cluster;
    });
    
    const newCentroids = [];
    for (let c = 0; c < k; c++) {
      const clusterPoints = data.filter((_, i) => newClusters[i] === c);
      if (clusterPoints.length > 0) {
        const centroid = new Array(p).fill(0);
        for (const point of clusterPoints) {
          for (let j = 0; j < p; j++) {
            centroid[j] += point[j];
          }
        }
        newCentroids.push(centroid.map(v => v / clusterPoints.length));
      } else {
        newCentroids.push(centroids[c]);
      }
    }
    
    const converged = clusters.every((c, i) => c === newClusters[i]);
    clusters = newClusters;
    centroids = newCentroids;
    
    if (converged) break;
  }
  
  let wcss = 0;
  for (let i = 0; i < n; i++) {
    const centroid = centroids[clusters[i]];
    wcss += data[i].reduce((sum, val, j) => sum + Math.pow(val - centroid[j], 2), 0);
  }
  
  return { clusters, centroids, wcss };
};

const hierarchicalClustering = (data: number[][], method: 'single' | 'complete' | 'average' = 'complete'): { clusters: number[]; dendrogram: any[] } => {
  const n = data.length;
  
  const distances: number[][] = [];
  for (let i = 0; i < n; i++) {
    distances[i] = [];
    for (let j = 0; j < n; j++) {
      if (i === j) {
        distances[i][j] = 0;
      } else {
        distances[i][j] = Math.sqrt(
          data[i].reduce((sum, val, idx) => sum + Math.pow(val - data[j][idx], 2), 0)
        );
      }
    }
  }
  
  let currentClusters = data.map((_, i) => [i]);
  const dendrogram: any[] = [];
  
  while (currentClusters.length > 1) {
    let minDist = Infinity;
    let mergeI = 0;
    let mergeJ = 1;
    
    for (let i = 0; i < currentClusters.length; i++) {
      for (let j = i + 1; j < currentClusters.length; j++) {
        let dist = 0;
        
        if (method === 'single') {
          dist = Infinity;
          for (const pi of currentClusters[i]) {
            for (const pj of currentClusters[j]) {
              dist = Math.min(dist, distances[pi][pj]);
            }
          }
        } else if (method === 'complete') {
          dist = 0;
          for (const pi of currentClusters[i]) {
            for (const pj of currentClusters[j]) {
              dist = Math.max(dist, distances[pi][pj]);
            }
          }
        } else {
          let sum = 0;
          let count = 0;
          for (const pi of currentClusters[i]) {
            for (const pj of currentClusters[j]) {
              sum += distances[pi][pj];
              count++;
            }
          }
          dist = sum / count;
        }
        
        if (dist < minDist) {
          minDist = dist;
          mergeI = i;
          mergeJ = j;
        }
      }
    }
    
    dendrogram.push({
      cluster1: mergeI,
      cluster2: mergeJ,
      distance: minDist,
      size: currentClusters[mergeI].length + currentClusters[mergeJ].length
    });
    
    const merged = [...currentClusters[mergeI], ...currentClusters[mergeJ]];
    currentClusters = currentClusters.filter((_, idx) => idx !== mergeI && idx !== mergeJ);
    currentClusters.push(merged);
  }
  
  const clusters = new Array(n).fill(0);
  
  return { clusters, dendrogram };
};

// ===================== المكون الرئيسي =====================

const AdvancedAnalysis: React.FC<AdvancedAnalysisProps> = ({ data, columns }) => {
  const { t, language, isRTL } = useLanguage();
  const [activeAnalysis, setActiveAnalysis] = useState<AnalysisType>('correlation');
  const [results, setResults] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<AnalysisResult[]>([]);
  
  // إعدادات تحليل الارتباط
  const [correlationMethod, setCorrelationMethod] = useState<'pearson' | 'spearman' | 'kendall'>('pearson');
  const [selectedCorrelationVars, setSelectedCorrelationVars] = useState<string[]>([]);
  
  // إعدادات تحليل الانحدار
  const [regressionType, setRegressionType] = useState<'simple' | 'multiple' | 'polynomial' | 'logistic'>('simple');
  const [dependentVar, setDependentVar] = useState<string>('');
  const [independentVars, setIndependentVars] = useState<string[]>([]);
  const [polynomialDegree, setPolynomialDegree] = useState(2);
  
  // إعدادات السلاسل الزمنية
  const [timeSeriesVar, setTimeSeriesVar] = useState<string>('');
  const [maWindow, setMaWindow] = useState(3);
  const [esAlpha, setEsAlpha] = useState(0.3);
  const [maxLag, setMaxLag] = useState(10);
  const [forecastPeriods, setForecastPeriods] = useState(5);
  
  // إعدادات PCA
  const [pcaVars, setPcaVars] = useState<string[]>([]);
  const [numComponents, setNumComponents] = useState(2);
  
  // إعدادات التجميع
  const [clusteringMethod, setClusteringMethod] = useState<'kmeans' | 'hierarchical' | 'dbscan'>('kmeans');
  const [clusteringVars, setClusteringVars] = useState<string[]>([]);
  const [numClusters, setNumClusters] = useState(3);
  const [linkageMethod, setLinkageMethod] = useState<'single' | 'complete' | 'average'>('complete');
  
  const numericColumns = useMemo(() => 
    columns.filter(c => c.type === 'number' || c.type === 'numeric'),
    [columns]
  );
  
  const getNumericValues = (colName: string): number[] => {
    return data.map(row => {
      const val = row[colName];
      return typeof val === 'number' ? val : parseFloat(val);
    }).filter(v => !isNaN(v));
  };

  // ===================== تنفيذ التحليلات =====================
  
  const runCorrelationAnalysis = () => {
    if (selectedCorrelationVars.length < 2) {
      alert(language === 'ar' ? 'يرجى اختيار متغيرين على الأقل' : 'Please select at least two variables');
      return;
    }
    
    const matrix: { var1: string; var2: string; correlation: number; pValue: number }[] = [];
    const heatmapData: any[] = [];
    
    for (let i = 0; i < selectedCorrelationVars.length; i++) {
      const row: any = { variable: selectedCorrelationVars[i] };
      for (let j = 0; j < selectedCorrelationVars.length; j++) {
        const x = getNumericValues(selectedCorrelationVars[i]);
        const y = getNumericValues(selectedCorrelationVars[j]);
        
        let corr = 0;
        if (correlationMethod === 'pearson') {
          corr = calculateCorrelation(x, y);
        } else if (correlationMethod === 'spearman') {
          corr = calculateSpearman(x, y);
        } else {
          corr = calculateSpearman(x, y);
        }
        
        row[selectedCorrelationVars[j]] = corr;
        
        if (i < j) {
          const n = Math.min(x.length, y.length);
          const tStat = corr * Math.sqrt((n - 2) / (1 - corr * corr));
          const pValue = 2 * (1 - Math.min(0.9999, Math.abs(tStat) / 10));
          
          matrix.push({
            var1: selectedCorrelationVars[i],
            var2: selectedCorrelationVars[j],
            correlation: corr,
            pValue
          });
        }
      }
      heatmapData.push(row);
    }
    
    const result: AnalysisResult = {
      type: 'correlation',
      timestamp: new Date(),
      results: {
        method: correlationMethod,
        matrix,
        heatmapData,
        variables: selectedCorrelationVars
      }
    };
    
    setResults(result);
    setHistory(prev => [result, ...prev].slice(0, 10));
  };
  
  const runRegressionAnalysis = () => {
    if (!dependentVar || independentVars.length === 0) {
      alert(language === 'ar' ? 'يرجى اختيار المتغير التابع والمتغيرات المستقلة' : 'Please select dependent and independent variables');
      return;
    }
    
    const y = getNumericValues(dependentVar);
    
    let regressionResult: any;
    
    if (regressionType === 'simple') {
      const x = getNumericValues(independentVars[0]);
      const result = linearRegression(x, y);
      
      const n = Math.min(x.length, y.length);
      const xMean = calculateMean(x);
      const yMean = calculateMean(y);
      
      const ssr = result.predictions.reduce((sum, pred) => sum + Math.pow(pred - yMean, 2), 0);
      const sse = result.residuals.reduce((sum, r) => sum + r * r, 0);
      
      const msr = ssr / 1;
      const mse = sse / (n - 2);
      const fStatistic = msr / mse;
      
      const slopeStdError = Math.sqrt(mse / x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0));
      const interceptStdError = Math.sqrt(mse * (1/n + Math.pow(xMean, 2) / x.reduce((sum, xi) => sum + Math.pow(xi - xMean, 2), 0)));
      
      const slopeTStat = result.slope / slopeStdError;
      const interceptTStat = result.intercept / interceptStdError;
      
      let dwNumerator = 0;
      for (let i = 1; i < result.residuals.length; i++) {
        dwNumerator += Math.pow(result.residuals[i] - result.residuals[i-1], 2);
      }
      const durbinWatson = dwNumerator / sse;
      
      regressionResult = {
        type: 'simple',
        coefficients: [
          { name: language === 'ar' ? 'الثابت (Intercept)' : 'Intercept', value: result.intercept, stdError: interceptStdError, tStat: interceptTStat, pValue: 0.05 },
          { name: independentVars[0], value: result.slope, stdError: slopeStdError, tStat: slopeTStat, pValue: 0.05 }
        ],
        r2: result.r2,
        adjustedR2: 1 - ((1 - result.r2) * (n - 1)) / (n - 2),
        fStatistic,
        fPValue: 0.05,
        mse,
        rmse: Math.sqrt(mse),
        mae: result.residuals.reduce((sum, r) => sum + Math.abs(r), 0) / n,
        durbinWatson,
        n,
        predictions: result.predictions,
        residuals: result.residuals,
        equation: `${dependentVar} = ${result.intercept.toFixed(4)} + ${result.slope.toFixed(4)} × ${independentVars[0]}`,
        scatterData: x.map((xi, i) => ({ x: xi, y: y[i], predicted: result.predictions[i] }))
      };
      
    } else if (regressionType === 'multiple') {
      const X = data.map(row => independentVars.map(v => {
        const val = row[v];
        return typeof val === 'number' ? val : parseFloat(val) || 0;
      }));
      
      const result = multipleRegression(X, y);
      const n = y.length;
      const p = independentVars.length;
      
      regressionResult = {
        type: 'multiple',
        coefficients: [
          { name: language === 'ar' ? 'الثابت (Intercept)' : 'Intercept', value: result.coefficients[0], stdError: 0, tStat: 0, pValue: 0 },
          ...independentVars.map((v, i) => ({
            name: v,
            value: result.coefficients[i + 1],
            stdError: 0,
            tStat: 0,
            pValue: 0
          }))
        ],
        r2: result.r2,
        adjustedR2: result.adjustedR2,
        fStatistic: result.fStatistic,
        n,
        p,
        predictions: result.predictions,
        residuals: result.residuals,
        equation: `${dependentVar} = ${result.coefficients[0].toFixed(4)} + ${independentVars.map((v, i) => `${result.coefficients[i+1].toFixed(4)} × ${v}`).join(' + ')}`
      };
      
    } else if (regressionType === 'polynomial') {
      const x = getNumericValues(independentVars[0]);
      const result = polynomialRegression(x, y, polynomialDegree);
      
      const terms = [language === 'ar' ? 'الثابت' : 'Intercept'];
      for (let d = 1; d <= polynomialDegree; d++) {
        terms.push(`${independentVars[0]}^${d}`);
      }
      
      regressionResult = {
        type: 'polynomial',
        degree: polynomialDegree,
        coefficients: result.coefficients.map((c, i) => ({
          name: terms[i],
          value: c,
          stdError: 0,
          tStat: 0,
          pValue: 0
        })),
        r2: result.r2,
        predictions: result.predictions,
        scatterData: x.map((xi, i) => ({ x: xi, y: y[i], predicted: result.predictions[i] }))
      };
    }
    
    const resultObj: AnalysisResult = {
      type: 'regression',
      timestamp: new Date(),
      results: regressionResult
    };
    
    setResults(resultObj);
    setHistory(prev => [resultObj, ...prev].slice(0, 10));
  };
  
  const runTimeSeriesAnalysis = () => {
    if (!timeSeriesVar) {
      alert(language === 'ar' ? 'يرجى اختيار متغير السلسلة الزمنية' : 'Please select a time series variable');
      return;
    }
    
    const values = getNumericValues(timeSeriesVar);
    const n = values.length;
    
    const ma = movingAverage(values, maWindow);
    const es = exponentialSmoothing(values, esAlpha);
    
    const acf: number[] = [];
    for (let lag = 0; lag <= maxLag; lag++) {
      acf.push(calculateAutocorrelation(values, lag));
    }
    
    const pacf: number[] = [1];
    for (let lag = 1; lag <= maxLag; lag++) {
      let sum = 0;
      for (let k = 1; k < lag; k++) {
        sum += pacf[k] * acf[lag - k];
      }
      pacf.push((acf[lag] - sum) / (1 - sum));
    }
    
    const trend = values.map((_, i) => i);
    const trendReg = linearRegression(trend, values);
    const detrended = values.map((v, i) => v - trendReg.predictions[i]);
    const adfStatistic = calculateAutocorrelation(detrended, 1) * Math.sqrt(n);
    
    const lastES = es.slice(-1)[0];
    const forecast: number[] = [];
    for (let i = 0; i < forecastPeriods; i++) {
      forecast.push(lastES);
    }
    
    const mean = calculateMean(values);
    const std = calculateStd(values);
    const min = Math.min(...values);
    const max = Math.max(...values);
    
    const timeSeriesData = values.map((v, i) => ({
      index: i + 1,
      original: v,
      ma: ma[i],
      es: es[i]
    }));
    
    const acfData = acf.map((v, i) => ({
      lag: i,
      acf: v,
      ci: 1.96 / Math.sqrt(n)
    }));
    
    const resultObj: AnalysisResult = {
      type: 'timeseries',
      timestamp: new Date(),
      results: {
        variable: timeSeriesVar,
        n,
        mean,
        std,
        min,
        max,
        timeSeriesData,
        acfData,
        pacf,
        adfStatistic,
        isStationary: Math.abs(adfStatistic) > 2.86,
        forecast,
        maWindow,
        esAlpha
      }
    };
    
    setResults(resultObj);
    setHistory(prev => [resultObj, ...prev].slice(0, 10));
  };
  
  const runPCAAnalysis = () => {
    if (pcaVars.length < 2) {
      alert(language === 'ar' ? 'يرجى اختيار متغيرين على الأقل' : 'Please select at least two variables');
      return;
    }
    
    const X = data.map(row => pcaVars.map(v => {
      const val = row[v];
      return typeof val === 'number' ? val : parseFloat(val) || 0;
    }));
    
    const result = calculatePCA(X);
    
    const screeData = result.explainedVariance.map((v, i) => ({
      component: `PC${i + 1}`,
      variance: v,
      cumulative: result.explainedVariance.slice(0, i + 1).reduce((a, b) => a + b, 0)
    }));
    
    const loadingsData = pcaVars.map((v, i) => {
      const row: any = { variable: v };
      result.loadings.forEach((loading, j) => {
        row[`PC${j + 1}`] = loading[i];
      });
      return row;
    });
    
    const scoresData = result.components[0]?.map((_, i) => ({
      index: i,
      PC1: result.components[0][i],
      PC2: result.components[1]?.[i] || 0,
      PC3: result.components[2]?.[i] || 0
    })) || [];
    
    const resultObj: AnalysisResult = {
      type: 'pca',
      timestamp: new Date(),
      results: {
        variables: pcaVars,
        explainedVariance: result.explainedVariance,
        loadings: result.loadings,
        screeData,
        loadingsData,
        scoresData,
        numComponents: result.components.length
      }
    };
    
    setResults(resultObj);
    setHistory(prev => [resultObj, ...prev].slice(0, 10));
  };
  
  const runClusteringAnalysis = () => {
    if (clusteringVars.length < 2) {
      alert(language === 'ar' ? 'يرجى اختيار متغيرين على الأقل' : 'Please select at least two variables');
      return;
    }
    
    const X = data.map(row => clusteringVars.map(v => {
      const val = row[v];
      return typeof val === 'number' ? val : parseFloat(val) || 0;
    }));
    
    let clusterResult: any;
    
    if (clusteringMethod === 'kmeans') {
      const elbowData: { k: number; wcss: number }[] = [];
      for (let k = 1; k <= Math.min(10, X.length - 1); k++) {
        const result = kMeansClustering(X, k);
        elbowData.push({ k, wcss: result.wcss });
      }
      
      const result = kMeansClustering(X, numClusters);
      
      let silhouetteSum = 0;
      for (let i = 0; i < X.length; i++) {
        const cluster = result.clusters[i];
        const sameCluster = X.filter((_, j) => result.clusters[j] === cluster && j !== i);
        const otherClusters = [...new Set(result.clusters)].filter(c => c !== cluster);
        
        const a = sameCluster.length > 0 
          ? sameCluster.reduce((sum, point) => sum + Math.sqrt(X[i].reduce((s, v, k) => s + Math.pow(v - point[k], 2), 0)), 0) / sameCluster.length
          : 0;
        
        let b = Infinity;
        for (const c of otherClusters) {
          const clusterPoints = X.filter((_, j) => result.clusters[j] === c);
          const avgDist = clusterPoints.reduce((sum, point) => sum + Math.sqrt(X[i].reduce((s, v, k) => s + Math.pow(v - point[k], 2), 0)), 0) / clusterPoints.length;
          b = Math.min(b, avgDist);
        }
        
        if (b !== Infinity && Math.max(a, b) > 0) {
          silhouetteSum += (b - a) / Math.max(a, b);
        }
      }
      const silhouetteScore = X.length > 0 ? silhouetteSum / X.length : 0;
      
      const scatterData = X.map((point, i) => ({
        x: point[0],
        y: point[1],
        cluster: result.clusters[i],
        index: i
      }));
      
      const clusterStats = [];
      for (let c = 0; c < numClusters; c++) {
        const clusterPoints = X.filter((_, i) => result.clusters[i] === c);
        const stats: any = { cluster: c, count: clusterPoints.length };
        clusteringVars.forEach((v, j) => {
          const values = clusterPoints.map(p => p[j]);
          stats[`${v}_mean`] = calculateMean(values);
          stats[`${v}_std`] = calculateStd(values);
        });
        clusterStats.push(stats);
      }
      
      clusterResult = {
        method: 'kmeans',
        k: numClusters,
        clusters: result.clusters,
        centroids: result.centroids,
        wcss: result.wcss,
        silhouetteScore,
        elbowData,
        scatterData,
        clusterStats
      };
      
    } else if (clusteringMethod === 'hierarchical') {
      const result = hierarchicalClustering(X, linkageMethod);
      
      const scatterData = X.map((point, i) => ({
        x: point[0],
        y: point[1],
        cluster: result.clusters[i],
        index: i
      }));
      
      clusterResult = {
        method: 'hierarchical',
        linkage: linkageMethod,
        clusters: result.clusters,
        dendrogram: result.dendrogram,
        scatterData
      };
    }
    
    const resultObj: AnalysisResult = {
      type: 'clustering',
      timestamp: new Date(),
      results: clusterResult
    };
    
    setResults(resultObj);
    setHistory(prev => [resultObj, ...prev].slice(0, 10));
  };

  // ===================== تصنيفات التحليل =====================
  
  const analysisCategories = [
    {
      id: 'correlation',
      name: t('advanced.correlation.title'),
      icon: '🔗',
      description: t('advanced.correlation.description') || t('advanced.correlation.matrix'),
      color: 'from-blue-500 to-cyan-500'
    },
    {
      id: 'regression',
      name: t('advanced.regression.title'),
      icon: '📈',
      description: t('advanced.regression.description') || t('advanced.regression.linear'),
      color: 'from-green-500 to-emerald-500'
    },
    {
      id: 'timeseries',
      name: t('advanced.timeSeries.title'),
      icon: '📊',
      description: t('advanced.timeSeries.description') || t('advanced.timeSeries.forecast'),
      color: 'from-purple-500 to-violet-500'
    },
    {
      id: 'pca',
      name: t('advanced.pca.title'),
      icon: '🎯',
      description: t('advanced.pca.description') || t('advanced.pca.varianceExplained'),
      color: 'from-orange-500 to-amber-500'
    },
    {
      id: 'clustering',
      name: t('advanced.clustering.title'),
      icon: '🔮',
      description: t('advanced.clustering.description') || t('advanced.clustering.method'),
      color: 'from-pink-500 to-rose-500'
    },
    {
      id: 'factor',
      name: t('advanced.factorAnalysis.title'),
      icon: '🧩',
      description: t('advanced.factorAnalysis.description') || t('advanced.factorAnalysis.factorLoadings'),
      color: 'from-indigo-500 to-blue-500'
    }
  ];

  const getCorrelationColor = (value: number): string => {
    const abs = Math.abs(value);
    if (value > 0) {
      if (abs > 0.7) return 'bg-green-600 text-white';
      if (abs > 0.4) return 'bg-green-400 text-white';
      return 'bg-green-200 text-green-800';
    } else {
      if (abs > 0.7) return 'bg-red-600 text-white';
      if (abs > 0.4) return 'bg-red-400 text-white';
      return 'bg-red-200 text-red-800';
    }
  };

  const getCorrelationInterpretation = (value: number): string => {
    const abs = Math.abs(value);
    if (language === 'ar') {
      const direction = value > 0 ? 'طردية' : 'عكسية';
      if (abs > 0.9) return `علاقة ${direction} قوية جداً`;
      if (abs > 0.7) return `علاقة ${direction} قوية`;
      if (abs > 0.5) return `علاقة ${direction} متوسطة`;
      if (abs > 0.3) return `علاقة ${direction} ضعيفة`;
      return 'لا توجد علاقة تُذكر';
    } else {
      const direction = value > 0 ? 'positive' : 'negative';
      if (abs > 0.9) return `Very strong ${direction} correlation`;
      if (abs > 0.7) return `Strong ${direction} correlation`;
      if (abs > 0.5) return `Moderate ${direction} correlation`;
      if (abs > 0.3) return `Weak ${direction} correlation`;
      return 'No significant correlation';
    }
  };

  const CLUSTER_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'];

  // ===================== العرض =====================
  
  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* العنوان */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
            📊
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('advanced.title')}</h1>
            <p className="text-white/80 mt-1">{t('advanced.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* أزرار التحليلات */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {analysisCategories.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveAnalysis(cat.id as AnalysisType)}
            className={`p-4 rounded-xl transition-all duration-300 ${
              activeAnalysis === cat.id
                ? `bg-gradient-to-br ${cat.color} text-white shadow-lg scale-105`
                : 'bg-white hover:bg-gray-50 text-gray-700 shadow hover:shadow-md'
            }`}
          >
            <div className="text-3xl mb-2">{cat.icon}</div>
            <div className="font-semibold text-sm">{cat.name}</div>
            <div className={`text-xs mt-1 ${activeAnalysis === cat.id ? 'text-white/80' : 'text-gray-500'}`}>
              {cat.description}
            </div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* لوحة الإعدادات */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl shadow-lg p-6 sticky top-4">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <span className="text-2xl">⚙️</span>
              {t('label.settings')}
            </h3>
            
            {/* إعدادات تحليل الارتباط */}
            {activeAnalysis === 'correlation' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.correlation.method')}
                  </label>
                  <select
                    value={correlationMethod}
                    onChange={(e) => setCorrelationMethod(e.target.value as any)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="pearson">{t('advanced.correlation.pearson')}</option>
                    <option value="spearman">{t('advanced.correlation.spearman')}</option>
                    <option value="kendall">{t('advanced.correlation.kendall')}</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('label.selectVariables')} ({selectedCorrelationVars.length} {t('label.selected')})
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {numericColumns.map(col => (
                      <label key={col.name} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedCorrelationVars.includes(col.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedCorrelationVars(prev => [...prev, col.name]);
                            } else {
                              setSelectedCorrelationVars(prev => prev.filter(v => v !== col.name));
                            }
                          }}
                          className="w-4 h-4 text-blue-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={runCorrelationAnalysis}
                  disabled={selectedCorrelationVars.length < 2}
                  className="w-full py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  🔗 {language === 'ar' ? 'تنفيذ' : 'Run'}
                </button>
              </div>
            )}
            
            {/* إعدادات تحليل الانحدار */}
            {activeAnalysis === 'regression' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.regression.type')}
                  </label>
                  <select
                    value={regressionType}
                    onChange={(e) => setRegressionType(e.target.value as any)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="simple">{t('advanced.regression.simple')}</option>
                    <option value="multiple">{t('advanced.regression.multiple')}</option>
                    <option value="polynomial">{t('advanced.regression.polynomial')}</option>
                    <option value="logistic">{t('advanced.regression.logistic')}</option>
                  </select>
                </div>
                
                {regressionType === 'polynomial' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('advanced.regression.degree')}: {polynomialDegree}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="5"
                      value={polynomialDegree}
                      onChange={(e) => setPolynomialDegree(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.regression.dependentVariable')} (Y)
                  </label>
                  <select
                    value={dependentVar}
                    onChange={(e) => setDependentVar(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500"
                  >
                    <option value="">{t('action.select')}...</option>
                    {numericColumns.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.regression.independentVariables')} (X)
                  </label>
                  <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {numericColumns.filter(c => c.name !== dependentVar).map(col => (
                      <label key={col.name} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={independentVars.includes(col.name)}
                          onChange={(e) => {
                            if (regressionType === 'simple' || regressionType === 'polynomial') {
                              setIndependentVars(e.target.checked ? [col.name] : []);
                            } else {
                              if (e.target.checked) {
                                setIndependentVars(prev => [...prev, col.name]);
                              } else {
                                setIndependentVars(prev => prev.filter(v => v !== col.name));
                              }
                            }
                          }}
                          className="w-4 h-4 text-green-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={runRegressionAnalysis}
                  disabled={!dependentVar || independentVars.length === 0}
                  className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  📈 {language === 'ar' ? 'تنفيذ' : 'Run'}
                </button>
              </div>
            )}
            
            {/* إعدادات السلاسل الزمنية */}
            {activeAnalysis === 'timeseries' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.timeSeries.variable')}
                  </label>
                  <select
                    value={timeSeriesVar}
                    onChange={(e) => setTimeSeriesVar(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="">{t('action.select')}...</option>
                    {numericColumns.map(col => (
                      <option key={col.name} value={col.name}>{col.name}</option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.timeSeries.movingAverageWindow')}: {maWindow}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="12"
                    value={maWindow}
                    onChange={(e) => setMaWindow(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.timeSeries.smoothingFactor')} (α): {esAlpha.toFixed(2)}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={esAlpha}
                    onChange={(e) => setEsAlpha(parseFloat(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.timeSeries.maxLag')}: {maxLag}
                  </label>
                  <input
                    type="range"
                    min="5"
                    max="30"
                    value={maxLag}
                    onChange={(e) => setMaxLag(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.timeSeries.forecastPeriods')}: {forecastPeriods}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={forecastPeriods}
                    onChange={(e) => setForecastPeriods(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <button
                  onClick={runTimeSeriesAnalysis}
                  disabled={!timeSeriesVar}
                  className="w-full py-3 bg-gradient-to-r from-purple-500 to-violet-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  📊 {language === 'ar' ? 'تنفيذ' : 'Run'}
                </button>
              </div>
            )}
            
            {/* إعدادات PCA */}
            {activeAnalysis === 'pca' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.pca.numComponents')}: {numComponents}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max={Math.min(5, numericColumns.length)}
                    value={numComponents}
                    onChange={(e) => setNumComponents(parseInt(e.target.value))}
                    className="w-full"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('label.selectVariables')} ({pcaVars.length} {t('label.selected')})
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {numericColumns.map(col => (
                      <label key={col.name} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pcaVars.includes(col.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPcaVars(prev => [...prev, col.name]);
                            } else {
                              setPcaVars(prev => prev.filter(v => v !== col.name));
                            }
                          }}
                          className="w-4 h-4 text-orange-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={runPCAAnalysis}
                  disabled={pcaVars.length < 2}
                  className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  🎯 {language === 'ar' ? 'تنفيذ' : 'Run'}
                </button>
              </div>
            )}
            
            {/* إعدادات التجميع */}
            {activeAnalysis === 'clustering' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('advanced.clustering.method')}
                  </label>
                  <select
                    value={clusteringMethod}
                    onChange={(e) => setClusteringMethod(e.target.value as any)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                  >
                    <option value="kmeans">{t('advanced.clustering.kMeans')}</option>
                    <option value="hierarchical">{t('advanced.clustering.hierarchical')}</option>
                  </select>
                </div>
                
                {clusteringMethod === 'kmeans' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('advanced.clustering.numClusters')} (K): {numClusters}
                    </label>
                    <input
                      type="range"
                      min="2"
                      max="10"
                      value={numClusters}
                      onChange={(e) => setNumClusters(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                )}
                
                {clusteringMethod === 'hierarchical' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      {t('advanced.clustering.linkage')}
                    </label>
                    <select
                      value={linkageMethod}
                      onChange={(e) => setLinkageMethod(e.target.value as any)}
                      className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-pink-500"
                    >
                      <option value="single">{language === 'ar' ? 'الأقرب (Single)' : 'Single'}</option>
                      <option value="complete">{language === 'ar' ? 'الأبعد (Complete)' : 'Complete'}</option>
                      <option value="average">{language === 'ar' ? 'المتوسط (Average)' : 'Average'}</option>
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('label.selectVariables')} ({clusteringVars.length} {t('label.selected')})
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {numericColumns.map(col => (
                      <label key={col.name} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={clusteringVars.includes(col.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setClusteringVars(prev => [...prev, col.name]);
                            } else {
                              setClusteringVars(prev => prev.filter(v => v !== col.name));
                            }
                          }}
                          className="w-4 h-4 text-pink-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={runClusteringAnalysis}
                  disabled={clusteringVars.length < 2}
                  className="w-full py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  🔮 {language === 'ar' ? 'تنفيذ' : 'Run'}
                </button>
              </div>
            )}
            
            {/* تحليل العوامل */}
            {activeAnalysis === 'factor' && (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50 rounded-lg">
                  <p className="text-sm text-indigo-700">
                    {language === 'ar' 
                      ? 'تحليل العوامل يشبه PCA ولكنه يفترض وجود عوامل كامنة تفسر الارتباطات بين المتغيرات.'
                      : 'Factor analysis is similar to PCA but assumes latent factors explain correlations between variables.'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {t('label.selectVariables')}
                  </label>
                  <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-2 space-y-1">
                    {numericColumns.map(col => (
                      <label key={col.name} className="flex items-center gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                        <input
                          type="checkbox"
                          checked={pcaVars.includes(col.name)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setPcaVars(prev => [...prev, col.name]);
                            } else {
                              setPcaVars(prev => prev.filter(v => v !== col.name));
                            }
                          }}
                          className="w-4 h-4 text-indigo-600 rounded"
                        />
                        <span className="text-sm text-gray-700">{col.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={runPCAAnalysis}
                  disabled={pcaVars.length < 2}
                  className="w-full py-3 bg-gradient-to-r from-indigo-500 to-blue-500 text-white rounded-lg font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  🧩 {language === 'ar' ? 'تنفيذ' : 'Run'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* لوحة النتائج */}
        <div className="lg:col-span-2">
          {!results ? (
            <div className="bg-white rounded-xl shadow-lg p-12 text-center">
              <div className="text-6xl mb-4">📊</div>
              <h3 className="text-xl font-bold text-gray-800 mb-2">{t('advanced.selectAndStart')}</h3>
              <p className="text-gray-500">{t('advanced.selectVariablesAndRun')}</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* نتائج تحليل الارتباط */}
              {results.type === 'correlation' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      🔗 {t('advanced.correlation.results')}
                      <span className="text-sm font-normal text-gray-500">
                        ({results.results.method === 'pearson' ? t('advanced.correlation.pearson') : 
                          results.results.method === 'spearman' ? t('advanced.correlation.spearman') : 
                          t('advanced.correlation.kendall')})
                      </span>
                    </h3>
                    <span className="text-xs text-gray-400">
                      {results.timestamp.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                  
                  {/* مصفوفة الارتباط */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr>
                          <th className="p-2 bg-gray-50"></th>
                          {results.results.variables.map((v: string) => (
                            <th key={v} className="p-2 bg-gray-50 font-medium text-gray-700 text-center">
                              {v.length > 10 ? v.slice(0, 10) + '...' : v}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {results.results.heatmapData.map((row: any, i: number) => (
                          <tr key={i}>
                            <td className="p-2 bg-gray-50 font-medium text-gray-700">
                              {row.variable.length > 10 ? row.variable.slice(0, 10) + '...' : row.variable}
                            </td>
                            {results.results.variables.map((v: string) => (
                              <td 
                                key={v} 
                                className={`p-2 text-center font-mono text-sm ${getCorrelationColor(row[v])}`}
                              >
                                {row[v].toFixed(3)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* تفاصيل الارتباطات */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {results.results.matrix.map((item: any, i: number) => (
                      <div key={i} className="p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium text-gray-700">{item.var1} ↔ {item.var2}</span>
                          <span className={`px-2 py-1 rounded text-sm font-bold ${
                            Math.abs(item.correlation) > 0.7 ? 'bg-green-100 text-green-700' :
                            Math.abs(item.correlation) > 0.4 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            r = {item.correlation.toFixed(4)}
                          </span>
                        </div>
                        <div className="text-sm text-gray-600">
                          {getCorrelationInterpretation(item.correlation)}
                        </div>
                        <div className="mt-2 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div 
                            className={`h-full ${item.correlation > 0 ? 'bg-green-500' : 'bg-red-500'}`}
                            style={{ width: `${Math.abs(item.correlation) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {/* نتائج تحليل الانحدار */}
              {results.type === 'regression' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      📈 {t('advanced.regression.results')}
                      <span className="text-sm font-normal text-gray-500">
                        ({results.results.type === 'simple' ? t('advanced.regression.simple') : 
                          results.results.type === 'multiple' ? t('advanced.regression.multiple') : 
                          t('advanced.regression.polynomial')})
                      </span>
                    </h3>
                  </div>
                  
                  {/* معادلة الانحدار */}
                  <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <div className="text-sm text-green-600 mb-2">{t('advanced.regression.equation')}</div>
                    <div className="font-mono text-lg text-green-800 overflow-x-auto">
                      {results.results.equation}
                    </div>
                  </div>
                  
                  {/* إحصائيات النموذج */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {(results.results.r2 * 100).toFixed(2)}%
                      </div>
                      <div className="text-sm text-blue-600">R² {t('advanced.regression.rSquared')}</div>
                    </div>
                    {results.results.adjustedR2 && (
                      <div className="p-4 bg-indigo-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-indigo-600">
                          {(results.results.adjustedR2 * 100).toFixed(2)}%
                        </div>
                        <div className="text-sm text-indigo-600">{t('advanced.regression.adjustedRSquared')}</div>
                      </div>
                    )}
                    {results.results.fStatistic && (
                      <div className="p-4 bg-purple-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-purple-600">
                          {results.results.fStatistic.toFixed(3)}
                        </div>
                        <div className="text-sm text-purple-600">{t('advanced.regression.fStatistic')}</div>
                      </div>
                    )}
                    {results.results.rmse && (
                      <div className="p-4 bg-orange-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {results.results.rmse.toFixed(4)}
                        </div>
                        <div className="text-sm text-orange-600">{t('advanced.regression.rmse')}</div>
                      </div>
                    )}
                  </div>
                  
                  {/* جدول المعاملات */}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className={`p-3 ${isRTL ? 'text-right' : 'text-left'} font-medium text-gray-700`}>{t('label.variable')}</th>
                          <th className="p-3 text-center font-medium text-gray-700">{t('advanced.regression.coefficient')} (β)</th>
                          <th className="p-3 text-center font-medium text-gray-700">{t('advanced.regression.stdError')}</th>
                          <th className="p-3 text-center font-medium text-gray-700">t</th>
                          <th className="p-3 text-center font-medium text-gray-700">{t('label.significance')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {results.results.coefficients.map((coef: any, i: number) => (
                          <tr key={i} className="border-b">
                            <td className="p-3 font-medium">{coef.name}</td>
                            <td className="p-3 text-center font-mono">{coef.value.toFixed(4)}</td>
                            <td className="p-3 text-center font-mono">{coef.stdError.toFixed(4)}</td>
                            <td className="p-3 text-center font-mono">{coef.tStat.toFixed(3)}</td>
                            <td className="p-3 text-center">
                              {coef.pValue < 0.001 ? '***' : coef.pValue < 0.01 ? '**' : coef.pValue < 0.05 ? '*' : 'ns'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* رسم الانحدار */}
                  {results.results.scatterData && (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ComposedChart data={results.results.scatterData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="x" label={{ value: 'X', position: 'bottom' }} />
                          <YAxis label={{ value: 'Y', angle: -90, position: 'insideLeft' }} />
                          <Tooltip />
                          <Legend />
                          <Scatter name={language === 'ar' ? 'البيانات الفعلية' : 'Actual Data'} dataKey="y" fill="#3B82F6" />
                          <Line name={language === 'ar' ? 'خط الانحدار' : 'Regression Line'} type="monotone" dataKey="predicted" stroke="#10B981" strokeWidth={2} dot={false} />
                        </ComposedChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                  
                  {/* تشخيص النموذج */}
                  {results.results.durbinWatson && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500 mb-1">{t('advanced.regression.durbinWatson')}</div>
                        <div className="text-xl font-bold text-gray-700">{results.results.durbinWatson.toFixed(4)}</div>
                        <div className="text-xs text-gray-400 mt-1">
                          {results.results.durbinWatson > 1.5 && results.results.durbinWatson < 2.5 
                            ? (language === 'ar' ? '✓ لا يوجد ارتباط ذاتي' : '✓ No autocorrelation')
                            : (language === 'ar' ? '⚠️ قد يوجد ارتباط ذاتي' : '⚠️ Possible autocorrelation')}
                        </div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500 mb-1">{t('advanced.regression.mae')}</div>
                        <div className="text-xl font-bold text-gray-700">{results.results.mae?.toFixed(4)}</div>
                        <div className="text-xs text-gray-400 mt-1">{language === 'ar' ? 'متوسط الخطأ المطلق' : 'Mean Absolute Error'}</div>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-xl">
                        <div className="text-sm text-gray-500 mb-1">{t('label.observations')}</div>
                        <div className="text-xl font-bold text-gray-700">{results.results.n}</div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* نتائج السلاسل الزمنية */}
              {results.type === 'timeseries' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      📊 {t('advanced.timeSeries.results')}
                      <span className="text-sm font-normal text-gray-500">
                        ({results.results.variable})
                      </span>
                    </h3>
                  </div>
                  
                  {/* إحصائيات وصفية */}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-4 bg-purple-50 rounded-xl text-center">
                      <div className="text-xl font-bold text-purple-600">{results.results.n}</div>
                      <div className="text-sm text-purple-600">{t('label.observations')}</div>
                    </div>
                    <div className="p-4 bg-blue-50 rounded-xl text-center">
                      <div className="text-xl font-bold text-blue-600">{results.results.mean.toFixed(2)}</div>
                      <div className="text-sm text-blue-600">{t('descriptive.mean')}</div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <div className="text-xl font-bold text-green-600">{results.results.std.toFixed(2)}</div>
                      <div className="text-sm text-green-600">{t('descriptive.stdDev')}</div>
                    </div>
                    <div className="p-4 bg-orange-50 rounded-xl text-center">
                      <div className="text-xl font-bold text-orange-600">{results.results.min.toFixed(2)}</div>
                      <div className="text-sm text-orange-600">{t('descriptive.minimum')}</div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl text-center">
                      <div className="text-xl font-bold text-red-600">{results.results.max.toFixed(2)}</div>
                      <div className="text-sm text-red-600">{t('descriptive.maximum')}</div>
                    </div>
                  </div>
                  
                  {/* اختبار الاستقرارية */}
                  <div className={`p-4 rounded-xl ${results.results.isStationary ? 'bg-green-50 border border-green-200' : 'bg-yellow-50 border border-yellow-200'}`}>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl">{results.results.isStationary ? '✓' : '⚠️'}</span>
                      <div>
                        <div className="font-medium">
                          {results.results.isStationary 
                            ? (language === 'ar' ? 'السلسلة مستقرة (Stationary)' : 'Series is Stationary')
                            : (language === 'ar' ? 'السلسلة غير مستقرة (Non-Stationary)' : 'Series is Non-Stationary')}
                        </div>
                        <div className="text-sm text-gray-600">
                          ADF Statistic: {results.results.adfStatistic.toFixed(4)}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* رسم السلسلة الزمنية */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={results.results.timeSeriesData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="index" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Line name={language === 'ar' ? 'البيانات الأصلية' : 'Original'} type="monotone" dataKey="original" stroke="#3B82F6" strokeWidth={2} dot={false} />
                        <Line name={`MA(${results.results.maWindow})`} type="monotone" dataKey="ma" stroke="#10B981" strokeWidth={2} dot={false} />
                        <Line name={`ES(α=${results.results.esAlpha})`} type="monotone" dataKey="es" stroke="#F59E0B" strokeWidth={2} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* رسم الارتباط الذاتي */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-4">{t('advanced.timeSeries.acf')}</h4>
                    <div className="h-60">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={results.results.acfData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="lag" />
                          <YAxis domain={[-1, 1]} />
                          <Tooltip />
                          <ReferenceLine y={0} stroke="#000" />
                          <ReferenceLine y={results.results.acfData[0]?.ci} stroke="red" strokeDasharray="3 3" />
                          <ReferenceLine y={-results.results.acfData[0]?.ci} stroke="red" strokeDasharray="3 3" />
                          <Bar dataKey="acf" fill="#8B5CF6">
                            {results.results.acfData.map((entry: any, index: number) => (
                              <Cell 
                                key={index} 
                                fill={Math.abs(entry.acf) > entry.ci ? '#EF4444' : '#8B5CF6'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}
              
              {/* نتائج PCA */}
              {results.type === 'pca' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      🎯 {t('advanced.pca.results')}
                    </h3>
                  </div>
                  
                  {/* التباين المفسر */}
                  <div className="grid grid-cols-3 gap-4">
                    {results.results.explainedVariance.map((v: number, i: number) => (
                      <div key={i} className="p-4 bg-orange-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-orange-600">{v.toFixed(2)}%</div>
                        <div className="text-sm text-orange-600">PC{i + 1}</div>
                        <div className="mt-2 h-2 bg-orange-200 rounded-full overflow-hidden">
                          <div className="h-full bg-orange-500" style={{ width: `${v}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* رسم Scree */}
                  <div className="h-60">
                    <ResponsiveContainer width="100%" height="100%">
                      <ComposedChart data={results.results.screeData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="component" />
                        <YAxis yAxisId="left" orientation="left" />
                        <YAxis yAxisId="right" orientation="right" />
                        <Tooltip />
                        <Legend />
                        <Bar yAxisId="left" name={language === 'ar' ? 'التباين المفسر %' : 'Variance %'} dataKey="variance" fill="#F59E0B" />
                        <Line yAxisId="right" name={language === 'ar' ? 'التراكمي %' : 'Cumulative %'} type="monotone" dataKey="cumulative" stroke="#10B981" strokeWidth={2} />
                      </ComposedChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* جدول التحميلات */}
                  <div>
                    <h4 className="text-lg font-bold text-gray-800 mb-4">{t('advanced.pca.loadings')}</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-gray-50">
                            <th className={`p-3 ${isRTL ? 'text-right' : 'text-left'} font-medium text-gray-700`}>{t('label.variable')}</th>
                            {results.results.loadings.map((_: any, i: number) => (
                              <th key={i} className="p-3 text-center font-medium text-gray-700">PC{i + 1}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.results.loadingsData.map((row: any, i: number) => (
                            <tr key={i} className="border-b">
                              <td className="p-3 font-medium">{row.variable}</td>
                              {results.results.loadings.map((_: any, j: number) => (
                                <td key={j} className={`p-3 text-center font-mono ${
                                  Math.abs(row[`PC${j + 1}`]) > 0.5 ? 'font-bold text-orange-600' : ''
                                }`}>
                                  {row[`PC${j + 1}`]?.toFixed(4)}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  {/* رسم النتائج */}
                  {results.results.scoresData.length > 0 && (
                    <div className="h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <ScatterChart>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="PC1" name="PC1" />
                          <YAxis dataKey="PC2" name="PC2" />
                          <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                          <Scatter name={language === 'ar' ? 'المشاهدات' : 'Observations'} data={results.results.scoresData} fill="#F59E0B" />
                        </ScatterChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              )}
              
              {/* نتائج التجميع */}
              {results.type === 'clustering' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                      🔮 {t('advanced.clustering.results')}
                      <span className="text-sm font-normal text-gray-500">
                        ({results.results.method === 'kmeans' ? `K-Means (k=${results.results.k})` : t('advanced.clustering.hierarchical')})
                      </span>
                    </h3>
                  </div>
                  
                  {/* إحصائيات التجميع */}
                  {results.results.method === 'kmeans' && (
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="p-4 bg-pink-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-pink-600">{results.results.k}</div>
                        <div className="text-sm text-pink-600">{t('advanced.clustering.numClusters')}</div>
                      </div>
                      <div className="p-4 bg-purple-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-purple-600">{results.results.wcss.toFixed(2)}</div>
                        <div className="text-sm text-purple-600">{t('advanced.clustering.wcss')}</div>
                      </div>
                      <div className="p-4 bg-blue-50 rounded-xl text-center">
                        <div className="text-2xl font-bold text-blue-600">{results.results.silhouetteScore.toFixed(3)}</div>
                        <div className="text-sm text-blue-600">{t('advanced.clustering.silhouetteScore')}</div>
                      </div>
                    </div>
                  )}
                  
                  {/* رسم الكوع */}
                  {results.results.elbowData && (
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 mb-4">{t('advanced.clustering.elbowMethod')}</h4>
                      <div className="h-60">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={results.results.elbowData}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="k" label={{ value: language === 'ar' ? 'عدد المجموعات (K)' : 'Number of Clusters (K)', position: 'bottom' }} />
                            <YAxis label={{ value: 'WCSS', angle: -90, position: 'insideLeft' }} />
                            <Tooltip />
                            <Line type="monotone" dataKey="wcss" stroke="#EC4899" strokeWidth={2} dot={{ fill: '#EC4899' }} />
                            <ReferenceLine x={results.results.k} stroke="#10B981" strokeDasharray="3 3" />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}
                  
                  {/* رسم التجميع */}
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <ScatterChart>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="x" name={clusteringVars[0]} />
                        <YAxis dataKey="y" name={clusteringVars[1]} />
                        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                        <Legend />
                        {[...Array(results.results.k || 3)].map((_, i) => (
                          <Scatter
                            key={i}
                            name={`${language === 'ar' ? 'مجموعة' : 'Cluster'} ${i + 1}`}
                            data={results.results.scatterData.filter((d: any) => d.cluster === i)}
                            fill={CLUSTER_COLORS[i % CLUSTER_COLORS.length]}
                          />
                        ))}
                      </ScatterChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* إحصائيات المجموعات */}
                  {results.results.clusterStats && (
                    <div>
                      <h4 className="text-lg font-bold text-gray-800 mb-4">{t('advanced.clustering.clusterStats')}</h4>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {results.results.clusterStats.map((stat: any, i: number) => (
                          <div key={i} className="p-4 rounded-xl" style={{ backgroundColor: `${CLUSTER_COLORS[i]}20` }}>
                            <div className="flex items-center gap-2 mb-3">
                              <div 
                                className="w-4 h-4 rounded-full" 
                                style={{ backgroundColor: CLUSTER_COLORS[i] }}
                              />
                              <span className="font-bold">{language === 'ar' ? 'مجموعة' : 'Cluster'} {i + 1}</span>
                              <span className="text-sm text-gray-500">({stat.count} {language === 'ar' ? 'عنصر' : 'items'})</span>
                            </div>
                            {clusteringVars.map(v => (
                              <div key={v} className="text-sm text-gray-600 flex justify-between">
                                <span>{v}:</span>
                                <span className="font-mono">
                                  μ={stat[`${v}_mean`]?.toFixed(2)} | σ={stat[`${v}_std`]?.toFixed(2)}
                                </span>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* سجل التحليلات */}
          {history.length > 0 && (
            <div className="mt-6 bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                📜 {t('advanced.history')}
              </h3>
              <div className="space-y-2">
                {history.slice(0, 5).map((item, i) => (
                  <div 
                    key={i} 
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
                    onClick={() => setResults(item)}
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">
                        {item.type === 'correlation' ? '🔗' : 
                         item.type === 'regression' ? '📈' :
                         item.type === 'timeseries' ? '📊' :
                         item.type === 'pca' ? '🎯' : '🔮'}
                      </span>
                      <span className="font-medium text-gray-700">
                        {item.type === 'correlation' ? t('advanced.correlation.title') : 
                         item.type === 'regression' ? t('advanced.regression.title') :
                         item.type === 'timeseries' ? t('advanced.timeSeries.title') :
                         item.type === 'pca' ? t('advanced.pca.title') : t('advanced.clustering.title')}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {item.timestamp.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedAnalysis;
