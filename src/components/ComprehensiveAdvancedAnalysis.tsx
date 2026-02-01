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

// Correlation functions with proper p-value calculation
const pearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  // Filter out pairs where either value is NaN
  const validPairs: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i]) && isFinite(x[i]) && isFinite(y[i])) {
      validPairs.push({ x: x[i], y: y[i] });
    }
  }
  
  if (validPairs.length < 2) return 0;
  
  const xVals = validPairs.map(p => p.x);
  const yVals = validPairs.map(p => p.y);
  const meanX = mean(xVals);
  const meanY = mean(yVals);
  
  let num = 0, denX = 0, denY = 0;
  for (let i = 0; i < validPairs.length; i++) {
    const dx = xVals[i] - meanX;
    const dy = yVals[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
};

// Kendall's Tau Correlation
const kendallCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  // Filter valid pairs
  const validPairs: { x: number; y: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i]) && isFinite(x[i]) && isFinite(y[i])) {
      validPairs.push({ x: x[i], y: y[i] });
    }
  }
  
  const m = validPairs.length;
  if (m < 2) return 0;
  
  let concordant = 0;
  let discordant = 0;
  let tiesX = 0;
  let tiesY = 0;
  
  for (let i = 0; i < m - 1; i++) {
    for (let j = i + 1; j < m; j++) {
      const dx = validPairs[i].x - validPairs[j].x;
      const dy = validPairs[i].y - validPairs[j].y;
      
      if (dx === 0 && dy === 0) {
        tiesX++;
        tiesY++;
      } else if (dx === 0) {
        tiesX++;
      } else if (dy === 0) {
        tiesY++;
      } else if ((dx > 0 && dy > 0) || (dx < 0 && dy < 0)) {
        concordant++;
      } else {
        discordant++;
      }
    }
  }
  
  const n0 = m * (m - 1) / 2;
  const denominator = Math.sqrt((n0 - tiesX) * (n0 - tiesY));
  
  return denominator === 0 ? 0 : (concordant - discordant) / denominator;
};

// Point-Biserial Correlation (for one continuous and one binary variable)
const _pointBiserialCorrelation = (continuous: number[], binary: number[]): {
  r: number;
  tStatistic: number;
  pValue: number;
  n: number;
  n0: number;
  n1: number;
  mean0: number;
  mean1: number;
} => {
  const validPairs: { x: number; y: number }[] = [];
  for (let i = 0; i < Math.min(continuous.length, binary.length); i++) {
    if (!isNaN(continuous[i]) && !isNaN(binary[i]) && (binary[i] === 0 || binary[i] === 1)) {
      validPairs.push({ x: continuous[i], y: binary[i] });
    }
  }
  
  const n = validPairs.length;
  if (n < 3) return { r: 0, tStatistic: 0, pValue: 1, n: 0, n0: 0, n1: 0, mean0: 0, mean1: 0 };
  
  const group0 = validPairs.filter(p => p.y === 0).map(p => p.x);
  const group1 = validPairs.filter(p => p.y === 1).map(p => p.x);
  
  const n0 = group0.length;
  const n1 = group1.length;
  
  if (n0 < 1 || n1 < 1) return { r: 0, tStatistic: 0, pValue: 1, n, n0, n1, mean0: 0, mean1: 0 };
  
  const mean0 = mean(group0);
  const mean1 = mean(group1);
  const sdTotal = std(validPairs.map(p => p.x));
  
  if (sdTotal === 0) return { r: 0, tStatistic: 0, pValue: 1, n, n0, n1, mean0, mean1 };
  
  const r = ((mean1 - mean0) / sdTotal) * Math.sqrt((n0 * n1) / (n * n));
  
  // t-statistic for point-biserial
  const tStatistic = r * Math.sqrt((n - 2) / (1 - r * r));
  const pValue = 2 * (1 - tDistributionCDF(Math.abs(tStatistic), n - 2));
  
  return { r, tStatistic, pValue, n, n0, n1, mean0, mean1 };
};

// Partial Correlation - correlation between X and Y controlling for Z
const partialCorrelation = (x: number[], y: number[], z: number[]): {
  r: number;
  rXY: number;
  rXZ: number;
  rYZ: number;
  tStatistic: number;
  pValue: number;
  df: number;
  n: number;
} => {
  // Filter valid triplets
  const validTriplets: { x: number; y: number; z: number }[] = [];
  const minLen = Math.min(x.length, y.length, z.length);
  
  for (let i = 0; i < minLen; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i]) && !isNaN(z[i]) && 
        isFinite(x[i]) && isFinite(y[i]) && isFinite(z[i])) {
      validTriplets.push({ x: x[i], y: y[i], z: z[i] });
    }
  }
  
  const n = validTriplets.length;
  if (n < 4) return { r: 0, rXY: 0, rXZ: 0, rYZ: 0, tStatistic: 0, pValue: 1, df: 0, n: 0 };
  
  const xVals = validTriplets.map(t => t.x);
  const yVals = validTriplets.map(t => t.y);
  const zVals = validTriplets.map(t => t.z);
  
  // Calculate pairwise correlations
  const rXY = pearsonCorrelation(xVals, yVals);
  const rXZ = pearsonCorrelation(xVals, zVals);
  const rYZ = pearsonCorrelation(yVals, zVals);
  
  // Calculate partial correlation using the formula:
  // r_XY.Z = (r_XY - r_XZ * r_YZ) / sqrt((1 - r_XZ^2) * (1 - r_YZ^2))
  const denominator = Math.sqrt((1 - rXZ * rXZ) * (1 - rYZ * rYZ));
  const r = denominator === 0 ? 0 : (rXY - rXZ * rYZ) / denominator;
  
  // Calculate t-statistic and p-value
  const df = n - 3; // degrees of freedom for partial correlation with 1 control variable
  const tStatistic = df > 0 && Math.abs(r) < 1 
    ? r * Math.sqrt(df / (1 - r * r)) 
    : 0;
  const pValue = df > 0 ? 2 * (1 - tDistributionCDF(Math.abs(tStatistic), df)) : 1;
  
  return { r, rXY, rXZ, rYZ, tStatistic, pValue, df, n };
};

// Multiple Partial Correlation - controlling for multiple variables
const _multiplePartialCorrelation = (x: number[], y: number[], controls: number[][]): {
  r: number;
  tStatistic: number;
  pValue: number;
  df: number;
  n: number;
} => {
  const k = controls.length; // number of control variables
  const minLen = Math.min(x.length, y.length, ...controls.map(c => c.length));
  
  // Filter valid observations
  const validIndices: number[] = [];
  for (let i = 0; i < minLen; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i]) && isFinite(x[i]) && isFinite(y[i]) &&
        controls.every(c => !isNaN(c[i]) && isFinite(c[i]))) {
      validIndices.push(i);
    }
  }
  
  const n = validIndices.length;
  if (n < k + 3) return { r: 0, tStatistic: 0, pValue: 1, df: 0, n: 0 };
  
  const xFiltered = validIndices.map(i => x[i]);
  const yFiltered = validIndices.map(i => y[i]);
  const controlsFiltered = controls.map(c => validIndices.map(i => c[i]));
  
  // Use residual method: regress X and Y on controls, then correlate residuals
  const xResiduals = getResiduals(xFiltered, controlsFiltered);
  const yResiduals = getResiduals(yFiltered, controlsFiltered);
  
  const r = pearsonCorrelation(xResiduals, yResiduals);
  
  const df = n - k - 2;
  const tStatistic = df > 0 && Math.abs(r) < 1 
    ? r * Math.sqrt(df / (1 - r * r)) 
    : 0;
  const pValue = df > 0 ? 2 * (1 - tDistributionCDF(Math.abs(tStatistic), df)) : 1;
  
  return { r, tStatistic, pValue, df, n };
};

// Helper function to get residuals from regression
const getResiduals = (y: number[], X: number[][]): number[] => {
  const n = y.length;
  const p = X.length;
  
  if (p === 0 || n < p + 1) return y;
  
  // Add intercept
  const XWithIntercept = y.map((_, i) => [1, ...X.map(col => col[i])]);
  
  // Calculate (X'X)^-1 X'y
  const pFull = p + 1;
  const XtX: number[][] = Array.from({ length: pFull }, () => new Array(pFull).fill(0));
  const Xty: number[] = new Array(pFull).fill(0);
  
  for (let i = 0; i < pFull; i++) {
    for (let j = 0; j < pFull; j++) {
      for (let k = 0; k < n; k++) {
        XtX[i][j] += XWithIntercept[k][i] * XWithIntercept[k][j];
      }
    }
    for (let k = 0; k < n; k++) {
      Xty[i] += XWithIntercept[k][i] * y[k];
    }
  }
  
  const XtXInv = invertMatrix(XtX);
  if (!XtXInv) return y;
  
  const beta = new Array(pFull).fill(0);
  for (let i = 0; i < pFull; i++) {
    for (let j = 0; j < pFull; j++) {
      beta[i] += XtXInv[i][j] * Xty[j];
    }
  }
  
  // Calculate residuals
  return y.map((yi, i) => {
    const predicted = XWithIntercept[i].reduce((sum, x, j) => sum + x * beta[j], 0);
    return yi - predicted;
  });
};

// Correlation Matrix with full statistics
const calculateCorrelationMatrix = (data: any[], columns: string[], method: 'pearson' | 'spearman' | 'kendall' = 'pearson'): {
  matrix: number[][];
  pValues: number[][];
  tStatistics: number[][];
  n: number[][];
  columns: string[];
  significantPairs: { var1: string; var2: string; r: number; pValue: number; interpretation: string }[];
} => {
  const numCols = columns.length;
  const matrix: number[][] = Array.from({ length: numCols }, () => new Array(numCols).fill(0));
  const pValues: number[][] = Array.from({ length: numCols }, () => new Array(numCols).fill(1));
  const tStatistics: number[][] = Array.from({ length: numCols }, () => new Array(numCols).fill(0));
  const nMatrix: number[][] = Array.from({ length: numCols }, () => new Array(numCols).fill(0));
  
  // Extract numeric data for each column
  const columnData: number[][] = columns.map(col => 
    data.map(row => Number(row[col])).filter(v => !isNaN(v) && isFinite(v))
  );
  
  for (let i = 0; i < numCols; i++) {
    for (let j = 0; j < numCols; j++) {
      if (i === j) {
        matrix[i][j] = 1;
        pValues[i][j] = 0;
        tStatistics[i][j] = Infinity;
        nMatrix[i][j] = columnData[i].length;
      } else if (j > i) {
        // Get paired valid data
        const pairedData: { x: number; y: number }[] = [];
        for (let k = 0; k < data.length; k++) {
          const xVal = Number(data[k][columns[i]]);
          const yVal = Number(data[k][columns[j]]);
          if (!isNaN(xVal) && !isNaN(yVal) && isFinite(xVal) && isFinite(yVal)) {
            pairedData.push({ x: xVal, y: yVal });
          }
        }
        
        const x = pairedData.map(p => p.x);
        const y = pairedData.map(p => p.y);
        const n = pairedData.length;
        
        let r = 0;
        if (n >= 3) {
          if (method === 'pearson') {
            r = pearsonCorrelation(x, y);
          } else if (method === 'spearman') {
            r = spearmanCorrelation(x, y);
          } else {
            r = kendallCorrelation(x, y);
          }
        }
        
        matrix[i][j] = r;
        matrix[j][i] = r;
        nMatrix[i][j] = n;
        nMatrix[j][i] = n;
        
        // Calculate t-statistic and p-value
        if (n > 2 && Math.abs(r) < 1) {
          const t = r * Math.sqrt((n - 2) / (1 - r * r));
          const p = 2 * (1 - tDistributionCDF(Math.abs(t), n - 2));
          tStatistics[i][j] = t;
          tStatistics[j][i] = t;
          pValues[i][j] = p;
          pValues[j][i] = p;
        }
      }
    }
  }
  
  // Find significant pairs
  const significantPairs: { var1: string; var2: string; r: number; pValue: number; interpretation: string }[] = [];
  for (let i = 0; i < numCols; i++) {
    for (let j = i + 1; j < numCols; j++) {
      if (pValues[i][j] < 0.05) {
        const absR = Math.abs(matrix[i][j]);
        let interpretation = '';
        if (absR < 0.3) interpretation = 'Weak';
        else if (absR < 0.5) interpretation = 'Moderate';
        else if (absR < 0.7) interpretation = 'Strong';
        else interpretation = 'Very Strong';
        
        significantPairs.push({
          var1: columns[i],
          var2: columns[j],
          r: matrix[i][j],
          pValue: pValues[i][j],
          interpretation: interpretation + (matrix[i][j] > 0 ? ' Positive' : ' Negative')
        });
      }
    }
  }
  
  // Sort by absolute correlation
  significantPairs.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
  
  return { matrix, pValues, tStatistics, n: nMatrix, columns, significantPairs };
};

// T-distribution CDF for p-value calculation
const tDistributionCDF = (t: number, df: number): number => {
  if (df <= 0) return 0.5;
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
};

// Calculate p-value for correlation coefficient
const correlationPValue = (r: number, n: number): number => {
  if (n <= 2 || Math.abs(r) >= 1) return r === 0 ? 1 : 0;
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const pOneTail = 1 - tDistributionCDF(Math.abs(t), n - 2);
  return Math.min(1, Math.max(0, 2 * pOneTail)); // Two-tailed p-value
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

// Multiple Regression using OLS (Normal Equations)
const multipleRegression = (X: number[][], y: number[], variableNames?: string[]): {
  coefficients: number[];
  standardErrors: number[];
  tStatistics: number[];
  pValues: number[];
  rSquared: number;
  adjustedRSquared: number;
  fStatistic: number;
  fPValue: number;
  predictions: number[];
  residuals: number[];
  rmse: number;
  n: number;
  p: number;
  vif: number[];
  variableNames: string[];
  anovaTable: { source: string; df: number; ss: number; ms: number; f: number; pValue: number }[];
} => {
  const n = y.length;
  const p = X[0]?.length || 0;
  
  const defaultResult = {
    coefficients: [], standardErrors: [], tStatistics: [], pValues: [],
    rSquared: 0, adjustedRSquared: 0, fStatistic: 0, fPValue: 1,
    predictions: [], residuals: [], rmse: 0, n: 0, p: 0, vif: [],
    variableNames: [], anovaTable: []
  };
  
  if (n < p + 2 || p === 0) return defaultResult;
  
  // Add intercept column
  const XWithIntercept = X.map(row => [1, ...row]);
  const pFull = p + 1; // includes intercept
  
  // Calculate X'X matrix
  const XtX: number[][] = Array.from({ length: pFull }, () => new Array(pFull).fill(0));
  for (let i = 0; i < pFull; i++) {
    for (let j = 0; j < pFull; j++) {
      for (let k = 0; k < n; k++) {
        XtX[i][j] += XWithIntercept[k][i] * XWithIntercept[k][j];
      }
    }
  }
  
  // Calculate X'y vector
  const Xty: number[] = new Array(pFull).fill(0);
  for (let i = 0; i < pFull; i++) {
    for (let k = 0; k < n; k++) {
      Xty[i] += XWithIntercept[k][i] * y[k];
    }
  }
  
  // Invert X'X matrix
  const XtXInv = invertMatrix(XtX);
  if (!XtXInv) return defaultResult;
  
  // Calculate coefficients: beta = (X'X)^(-1) X'y
  const coefficients: number[] = new Array(pFull).fill(0);
  for (let i = 0; i < pFull; i++) {
    for (let j = 0; j < pFull; j++) {
      coefficients[i] += XtXInv[i][j] * Xty[j];
    }
  }
  
  // Calculate predictions and residuals
  const predictions = XWithIntercept.map(row => 
    row.reduce((sum, x, j) => sum + x * coefficients[j], 0)
  );
  const residuals = y.map((yi, i) => yi - predictions[i]);
  
  // Calculate statistics
  const meanY = mean(y);
  const ssRes = residuals.reduce((sum, r) => sum + r * r, 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  const ssReg = ssTot - ssRes;
  
  const rSquared = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const adjustedRSquared = n > pFull ? 1 - ((1 - rSquared) * (n - 1) / (n - pFull)) : 0;
  
  const mse = ssRes / (n - pFull);
  const rmse = Math.sqrt(mse);
  
  // Calculate standard errors
  const standardErrors = coefficients.map((_, i) => 
    Math.sqrt(Math.max(0, mse * XtXInv[i][i]))
  );
  
  // Calculate t-statistics and p-values
  const tStatistics = coefficients.map((b, i) => 
    standardErrors[i] > 0 ? b / standardErrors[i] : 0
  );
  const pValues = tStatistics.map(t => 
    2 * (1 - tDistributionCDF(Math.abs(t), n - pFull))
  );
  
  // Calculate F-statistic
  const msReg = p > 0 ? ssReg / p : 0;
  const fStatistic = mse > 0 ? msReg / mse : 0;
  const fPValue = 1 - fCDF(fStatistic, p, n - pFull);
  
  // Calculate VIF for each variable
  const vif: number[] = [];
  for (let j = 0; j < p; j++) {
    const xj = X.map(row => row[j]);
    const otherX = X.map(row => row.filter((_, idx) => idx !== j));
    if (otherX[0].length > 0) {
      const auxReg = multipleRegressionSimple(otherX, xj);
      const vifValue = auxReg.rSquared < 1 ? 1 / (1 - auxReg.rSquared) : 10;
      vif.push(vifValue);
    } else {
      vif.push(1);
    }
  }
  
  // ANOVA Table
  const anovaTable = [
    { 
      source: 'Regression', 
      df: p, 
      ss: ssReg, 
      ms: msReg, 
      f: fStatistic, 
      pValue: fPValue 
    },
    { 
      source: 'Residual', 
      df: n - pFull, 
      ss: ssRes, 
      ms: mse, 
      f: 0, 
      pValue: 0 
    },
    { 
      source: 'Total', 
      df: n - 1, 
      ss: ssTot, 
      ms: 0, 
      f: 0, 
      pValue: 0 
    }
  ];
  
  const names = variableNames || X[0].map((_, i) => `X${i + 1}`);
  
  return {
    coefficients,
    standardErrors,
    tStatistics,
    pValues,
    rSquared,
    adjustedRSquared,
    fStatistic,
    fPValue,
    predictions,
    residuals,
    rmse,
    n,
    p,
    vif,
    variableNames: ['Intercept', ...names],
    anovaTable
  };
};

// Simple multiple regression for VIF calculation
const multipleRegressionSimple = (X: number[][], y: number[]): { rSquared: number } => {
  const n = y.length;
  const p = X[0]?.length || 0;
  if (n < p + 2 || p === 0) return { rSquared: 0 };
  
  const XWithIntercept = X.map(row => [1, ...row]);
  const pFull = p + 1;
  
  const XtX: number[][] = Array.from({ length: pFull }, () => new Array(pFull).fill(0));
  for (let i = 0; i < pFull; i++) {
    for (let j = 0; j < pFull; j++) {
      for (let k = 0; k < n; k++) {
        XtX[i][j] += XWithIntercept[k][i] * XWithIntercept[k][j];
      }
    }
  }
  
  const Xty: number[] = new Array(pFull).fill(0);
  for (let i = 0; i < pFull; i++) {
    for (let k = 0; k < n; k++) {
      Xty[i] += XWithIntercept[k][i] * y[k];
    }
  }
  
  const XtXInv = invertMatrix(XtX);
  if (!XtXInv) return { rSquared: 0 };
  
  const coefficients: number[] = new Array(pFull).fill(0);
  for (let i = 0; i < pFull; i++) {
    for (let j = 0; j < pFull; j++) {
      coefficients[i] += XtXInv[i][j] * Xty[j];
    }
  }
  
  const predictions = XWithIntercept.map(row => 
    row.reduce((sum, x, j) => sum + x * coefficients[j], 0)
  );
  
  const meanY = mean(y);
  const ssRes = y.reduce((sum, yi, i) => sum + Math.pow(yi - predictions[i], 2), 0);
  const ssTot = y.reduce((sum, yi) => sum + Math.pow(yi - meanY, 2), 0);
  
  return { rSquared: ssTot > 0 ? 1 - ssRes / ssTot : 0 };
};

// Polynomial Regression
const polynomialRegression = (x: number[], y: number[], degree: number = 2): {
  coefficients: number[];
  standardErrors: number[];
  tStatistics: number[];
  pValues: number[];
  rSquared: number;
  adjustedRSquared: number;
  fStatistic: number;
  fPValue: number;
  predictions: number[];
  residuals: number[];
  rmse: number;
  n: number;
  equation: string;
} => {
  const n = x.length;
  
  const defaultResult = {
    coefficients: [], standardErrors: [], tStatistics: [], pValues: [],
    rSquared: 0, adjustedRSquared: 0, fStatistic: 0, fPValue: 1,
    predictions: [], residuals: [], rmse: 0, n: 0, equation: ''
  };
  
  if (n < degree + 2) return defaultResult;
  
  // Create polynomial features: X = [1, x, x², x³, ...]
  const X = x.map(xi => 
    Array.from({ length: degree }, (_, d) => Math.pow(xi, d + 1))
  );
  
  // Use multiple regression
  const result = multipleRegression(X, y, Array.from({ length: degree }, (_, d) => `x^${d + 1}`));
  
  // Create equation string
  let equation = result.coefficients[0]?.toFixed(4) || '0';
  for (let d = 0; d < degree; d++) {
    const coef = result.coefficients[d + 1] || 0;
    if (coef !== 0) {
      const sign = coef >= 0 ? ' + ' : ' - ';
      const absCoef = Math.abs(coef).toFixed(4);
      if (d === 0) {
        equation += `${sign}${absCoef}x`;
      } else {
        equation += `${sign}${absCoef}x^${d + 1}`;
      }
    }
  }
  
  return {
    ...result,
    equation: `Y = ${equation}`
  };
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

// Advanced Seasonality Analysis with statistical tests
const calculateSeasonalityAdvanced = (data: number[], period: number): {
  seasonalFactors: number[];
  seasonalIndices: number[];
  seasonalStrength: number;
  trendStrength: number;
  isSeasonalitySignificant: boolean;
  fStatistic: number;
  pValue: number;
  detrended: number[];
  seasonalComponent: number[];
  trendComponent: number[];
  residualComponent: number[];
  seasonalStats: { period: number; mean: number; std: number; index: number }[];
  acfValues: number[];
  peakPeriods: number[];
} => {
  const n = data.length;
  
  if (period <= 0 || n < period * 2) {
    return {
      seasonalFactors: new Array(period).fill(0),
      seasonalIndices: new Array(period).fill(100),
      seasonalStrength: 0,
      trendStrength: 0,
      isSeasonalitySignificant: false,
      fStatistic: 0,
      pValue: 1,
      detrended: [...data],
      seasonalComponent: new Array(n).fill(0),
      trendComponent: [...data],
      residualComponent: new Array(n).fill(0),
      seasonalStats: [],
      acfValues: [],
      peakPeriods: []
    };
  }
  
  // Step 1: Calculate trend using centered moving average
  const halfPeriod = Math.floor(period / 2);
  const trendComponent: number[] = new Array(n).fill(NaN);
  
  for (let i = halfPeriod; i < n - halfPeriod; i++) {
    let sum = 0;
    let count = 0;
    for (let j = i - halfPeriod; j <= i + halfPeriod; j++) {
      if (j >= 0 && j < n) {
        sum += data[j];
        count++;
      }
    }
    trendComponent[i] = sum / count;
  }
  
  // Fill edges with linear extrapolation
  const validTrend = trendComponent.filter(v => !isNaN(v));
  if (validTrend.length > 1) {
    const firstValidIdx = trendComponent.findIndex(v => !isNaN(v));
    const lastValidIdx = n - 1 - [...trendComponent].reverse().findIndex(v => !isNaN(v));
    
    // Calculate slope for extrapolation
    const startVal = trendComponent[firstValidIdx];
    const endVal = trendComponent[lastValidIdx];
    const slope = (endVal - startVal) / (lastValidIdx - firstValidIdx);
    
    for (let i = 0; i < firstValidIdx; i++) {
      trendComponent[i] = startVal - slope * (firstValidIdx - i);
    }
    for (let i = lastValidIdx + 1; i < n; i++) {
      trendComponent[i] = endVal + slope * (i - lastValidIdx);
    }
  }
  
  // Step 2: Calculate detrended series
  const detrended = data.map((val, i) => val - (trendComponent[i] || mean(data)));
  
  // Step 3: Calculate seasonal factors (averages for each period position)
  const seasonalSums = new Array(period).fill(0);
  const seasonalCounts = new Array(period).fill(0);
  const seasonalValues: number[][] = Array.from({ length: period }, () => []);
  
  for (let i = 0; i < n; i++) {
    const idx = i % period;
    if (!isNaN(detrended[i])) {
      seasonalSums[idx] += detrended[i];
      seasonalCounts[idx]++;
      seasonalValues[idx].push(detrended[i]);
    }
  }
  
  const seasonalFactors = seasonalSums.map((sum, i) => 
    seasonalCounts[i] > 0 ? sum / seasonalCounts[i] : 0
  );
  
  // Normalize seasonal factors to sum to zero
  const factorMean = mean(seasonalFactors);
  const normalizedFactors = seasonalFactors.map(f => f - factorMean);
  
  // Calculate seasonal indices (multiplicative model - as percentage of mean)
  const overallMean = mean(data);
  const seasonalIndices = normalizedFactors.map(f => 
    overallMean !== 0 ? ((overallMean + f) / overallMean) * 100 : 100
  );
  
  // Step 4: Calculate seasonal component for each observation
  const seasonalComponent = data.map((_, i) => normalizedFactors[i % period]);
  
  // Step 5: Calculate residual component
  const residualComponent = data.map((val, i) => 
    val - (trendComponent[i] || 0) - seasonalComponent[i]
  );
  
  // Step 6: Calculate seasonal strength (using variance decomposition)
  void variance(data); // Total variance for reference
  const varResidual = variance(residualComponent.filter(v => !isNaN(v)));
  const varSeasonalPlusResidual = variance(
    data.map((val, i) => val - (trendComponent[i] || 0)).filter(v => !isNaN(v))
  );
  
  const seasonalStrength = varSeasonalPlusResidual > 0 
    ? Math.max(0, 1 - varResidual / varSeasonalPlusResidual) 
    : 0;
  
  // Step 7: Calculate trend strength
  const varTrendPlusResidual = variance(
    data.map((val, i) => val - seasonalComponent[i]).filter(v => !isNaN(v))
  );
  
  const trendStrength = varTrendPlusResidual > 0 
    ? Math.max(0, 1 - varResidual / varTrendPlusResidual) 
    : 0;
  
  // Step 8: ANOVA test for seasonality significance
  // Group data by seasonal period
  const groups = seasonalValues.filter(g => g.length > 0);
  const anovaResult = groups.length >= 2 ? oneWayANOVA(groups) : { fStatistic: 0, pValue: 1 };
  const isSeasonalitySignificant = anovaResult.pValue < 0.05;
  
  // Step 9: Calculate seasonal statistics for each period
  const seasonalStats = seasonalValues.map((values, i) => ({
    period: i + 1,
    mean: values.length > 0 ? mean(values) : 0,
    std: values.length > 1 ? std(values) : 0,
    index: seasonalIndices[i]
  }));
  
  // Step 10: Calculate ACF for detecting seasonality
  const acfValues: number[] = [];
  for (let lag = 1; lag <= Math.min(period * 2, Math.floor(n / 3)); lag++) {
    const lagged = data.slice(lag);
    const original = data.slice(0, n - lag);
    acfValues.push(pearsonCorrelation(original, lagged));
  }
  
  // Find peak periods in ACF
  const peakPeriods: number[] = [];
  for (let i = 1; i < acfValues.length - 1; i++) {
    if (acfValues[i] > acfValues[i - 1] && acfValues[i] > acfValues[i + 1] && acfValues[i] > 0.2) {
      peakPeriods.push(i + 1);
    }
  }
  
  return {
    seasonalFactors: normalizedFactors,
    seasonalIndices,
    seasonalStrength,
    trendStrength,
    isSeasonalitySignificant,
    fStatistic: anovaResult.fStatistic,
    pValue: anovaResult.pValue,
    detrended,
    seasonalComponent,
    trendComponent: trendComponent.map(v => isNaN(v) ? mean(data) : v),
    residualComponent,
    seasonalStats,
    acfValues,
    peakPeriods
  };
};

const calculateSeasonality = (data: number[], period: number): number[] => {
  const result = calculateSeasonalityAdvanced(data, period);
  return result.seasonalComponent;
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

// Logistic Regression with full statistical output
const logisticRegression = (X: number[][], y: number[], maxIter: number = 200): {
  coefficients: number[];
  standardErrors: number[];
  waldStatistics: number[];
  pValues: number[];
  oddsRatios: number[];
  oddsRatioCI: { lower: number; upper: number }[];
  predictions: number[];
  predictedClasses: number[];
  accuracy: number;
  sensitivity: number;
  specificity: number;
  precision: number;
  f1Score: number;
  auc: number;
  logLikelihood: number;
  nullLogLikelihood: number;
  devianceResidual: number;
  pseudoRSquaredMcFadden: number;
  pseudoRSquaredCoxSnell: number;
  pseudoRSquaredNagelkerke: number;
  aic: number;
  bic: number;
  confusionMatrix: { tp: number; tn: number; fp: number; fn: number };
  hosmerLemeshow: { statistic: number; pValue: number; df: number };
  n: number;
  convergence: boolean;
} => {
  const n = y.length;
  const p = X[0]?.length || 0;
  
  const defaultResult = {
    coefficients: [], standardErrors: [], waldStatistics: [], pValues: [],
    oddsRatios: [], oddsRatioCI: [], predictions: [], predictedClasses: [],
    accuracy: 0, sensitivity: 0, specificity: 0, precision: 0, f1Score: 0,
    auc: 0, logLikelihood: 0, nullLogLikelihood: 0, devianceResidual: 0,
    pseudoRSquaredMcFadden: 0, pseudoRSquaredCoxSnell: 0, pseudoRSquaredNagelkerke: 0,
    aic: 0, bic: 0, confusionMatrix: { tp: 0, tn: 0, fp: 0, fn: 0 },
    hosmerLemeshow: { statistic: 0, pValue: 1, df: 8 }, n: 0, convergence: false
  };
  
  if (n === 0 || p === 0) return defaultResult;
  
  // Standardize X for better convergence
  const means = Array.from({ length: p }, (_, j) => mean(X.map(row => row[j])));
  const stds = Array.from({ length: p }, (_, j) => {
    const s = std(X.map(row => row[j]));
    return s === 0 ? 1 : s;
  });
  const Xstd = X.map(row => row.map((v, j) => (v - means[j]) / stds[j]));
  
  // Initialize coefficients (including intercept)
  let beta = new Array(p + 1).fill(0);
  let convergence = false;
  const tolerance = 1e-8;
  
  // Newton-Raphson / IRLS algorithm
  for (let iter = 0; iter < maxIter; iter++) {
    // Calculate probabilities
    const probs = Xstd.map(row => {
      const z = beta[0] + row.reduce((sum, x, j) => sum + x * beta[j + 1], 0);
      const expZ = Math.exp(-Math.max(-700, Math.min(700, z))); // Prevent overflow
      return 1 / (1 + expZ);
    });
    
    // Calculate gradient (score)
    const gradient = new Array(p + 1).fill(0);
    gradient[0] = probs.reduce((sum, pi, i) => sum + (y[i] - pi), 0);
    for (let j = 0; j < p; j++) {
      gradient[j + 1] = Xstd.reduce((sum, row, i) => sum + row[j] * (y[i] - probs[i]), 0);
    }
    
    // Calculate Hessian (Information Matrix)
    const hessian: number[][] = Array.from({ length: p + 1 }, () => new Array(p + 1).fill(0));
    for (let i = 0; i < n; i++) {
      const w = probs[i] * (1 - probs[i]);
      hessian[0][0] -= w;
      for (let j = 0; j < p; j++) {
        hessian[0][j + 1] -= w * Xstd[i][j];
        hessian[j + 1][0] -= w * Xstd[i][j];
        for (let k = 0; k < p; k++) {
          hessian[j + 1][k + 1] -= w * Xstd[i][j] * Xstd[i][k];
        }
      }
    }
    
    // Invert Hessian (simple method for small matrices)
    const invHessian = invertMatrix(hessian);
    if (!invHessian) break;
    
    // Update beta: beta_new = beta - H^(-1) * gradient
    const delta = new Array(p + 1).fill(0);
    for (let i = 0; i <= p; i++) {
      for (let j = 0; j <= p; j++) {
        delta[i] -= invHessian[i][j] * gradient[j];
      }
    }
    
    // Check convergence
    const maxDelta = Math.max(...delta.map(Math.abs));
    if (maxDelta < tolerance) {
      convergence = true;
      break;
    }
    
    // Update coefficients
    beta = beta.map((b, i) => b + delta[i]);
  }
  
  // Transform coefficients back to original scale
  const coefficients = new Array(p + 1);
  coefficients[0] = beta[0] - means.reduce((sum, m, j) => sum + (beta[j + 1] * m / stds[j]), 0);
  for (let j = 0; j < p; j++) {
    coefficients[j + 1] = beta[j + 1] / stds[j];
  }
  
  // Calculate final probabilities and predictions
  const predictions = X.map(row => {
    const z = coefficients[0] + row.reduce((sum, x, j) => sum + x * coefficients[j + 1], 0);
    const expZ = Math.exp(-Math.max(-700, Math.min(700, z)));
    return 1 / (1 + expZ);
  });
  const predictedClasses = predictions.map(prob => prob >= 0.5 ? 1 : 0);
  
  // Calculate Information Matrix for standard errors (on original scale)
  const infoMatrix: number[][] = Array.from({ length: p + 1 }, () => new Array(p + 1).fill(0));
  for (let i = 0; i < n; i++) {
    const w = predictions[i] * (1 - predictions[i]);
    infoMatrix[0][0] += w;
    for (let j = 0; j < p; j++) {
      infoMatrix[0][j + 1] += w * X[i][j];
      infoMatrix[j + 1][0] += w * X[i][j];
      for (let k = 0; k < p; k++) {
        infoMatrix[j + 1][k + 1] += w * X[i][j] * X[i][k];
      }
    }
  }
  
  // Invert for variance-covariance matrix
  const vcov = invertMatrix(infoMatrix);
  
  // Standard errors
  const standardErrors = vcov ? 
    Array.from({ length: p + 1 }, (_, i) => Math.sqrt(Math.max(0, vcov[i][i]))) :
    new Array(p + 1).fill(0);
  
  // Wald statistics and p-values
  const waldStatistics = coefficients.map((b, i) => 
    standardErrors[i] > 0 ? (b / standardErrors[i]) ** 2 : 0
  );
  const pValues = waldStatistics.map(w => 1 - chiSquareCDF(w, 1));
  
  // Odds ratios and confidence intervals
  const oddsRatios = coefficients.map(b => Math.exp(b));
  const oddsRatioCI = coefficients.map((b, i) => ({
    lower: Math.exp(b - 1.96 * standardErrors[i]),
    upper: Math.exp(b + 1.96 * standardErrors[i])
  }));
  
  // Confusion Matrix
  let tp = 0, tn = 0, fp = 0, fn = 0;
  for (let i = 0; i < n; i++) {
    if (y[i] === 1 && predictedClasses[i] === 1) tp++;
    else if (y[i] === 0 && predictedClasses[i] === 0) tn++;
    else if (y[i] === 0 && predictedClasses[i] === 1) fp++;
    else if (y[i] === 1 && predictedClasses[i] === 0) fn++;
  }
  
  const accuracy = (tp + tn) / n;
  const sensitivity = tp + fn > 0 ? tp / (tp + fn) : 0; // Recall / True Positive Rate
  const specificity = tn + fp > 0 ? tn / (tn + fp) : 0; // True Negative Rate
  const precision = tp + fp > 0 ? tp / (tp + fp) : 0; // Positive Predictive Value
  const f1Score = precision + sensitivity > 0 ? 2 * precision * sensitivity / (precision + sensitivity) : 0;
  
  // Log-Likelihood
  const logLikelihood = y.reduce((sum, yi, i) => {
    const pi = Math.max(1e-15, Math.min(1 - 1e-15, predictions[i]));
    return sum + yi * Math.log(pi) + (1 - yi) * Math.log(1 - pi);
  }, 0);
  
  // Null Log-Likelihood (intercept-only model)
  const p0 = y.reduce((sum, yi) => sum + yi, 0) / n;
  const nullLogLikelihood = n * (p0 * Math.log(p0) + (1 - p0) * Math.log(1 - p0));
  
  // Deviance
  const devianceResidual = -2 * logLikelihood;
  
  // Pseudo R-squared measures
  const pseudoRSquaredMcFadden = 1 - logLikelihood / nullLogLikelihood;
  const pseudoRSquaredCoxSnell = 1 - Math.exp((2 / n) * (nullLogLikelihood - logLikelihood));
  const maxCoxSnell = 1 - Math.exp((2 / n) * nullLogLikelihood);
  const pseudoRSquaredNagelkerke = maxCoxSnell !== 0 ? pseudoRSquaredCoxSnell / maxCoxSnell : 0;
  
  // AIC and BIC
  const numParams = p + 1;
  const aic = -2 * logLikelihood + 2 * numParams;
  const bic = -2 * logLikelihood + numParams * Math.log(n);
  
  // AUC (simple approximation using Mann-Whitney)
  const auc = calculateAUC(predictions, y);
  
  // Hosmer-Lemeshow Test
  const hosmerLemeshow = calculateHosmerLemeshow(predictions, y);
  
  return {
    coefficients, standardErrors, waldStatistics, pValues,
    oddsRatios, oddsRatioCI, predictions, predictedClasses,
    accuracy, sensitivity, specificity, precision, f1Score,
    auc, logLikelihood, nullLogLikelihood, devianceResidual,
    pseudoRSquaredMcFadden, pseudoRSquaredCoxSnell, pseudoRSquaredNagelkerke,
    aic, bic, confusionMatrix: { tp, tn, fp, fn },
    hosmerLemeshow, n, convergence
  };
};

// Matrix inversion helper (Gauss-Jordan elimination)
const invertMatrix = (matrix: number[][]): number[][] | null => {
  const n = matrix.length;
  const augmented: number[][] = matrix.map((row, i) => 
    [...row, ...Array.from({ length: n }, (_, j) => i === j ? 1 : 0)]
  );
  
  for (let i = 0; i < n; i++) {
    // Find pivot
    let maxRow = i;
    for (let k = i + 1; k < n; k++) {
      if (Math.abs(augmented[k][i]) > Math.abs(augmented[maxRow][i])) {
        maxRow = k;
      }
    }
    [augmented[i], augmented[maxRow]] = [augmented[maxRow], augmented[i]];
    
    if (Math.abs(augmented[i][i]) < 1e-10) return null; // Singular matrix
    
    // Scale pivot row
    const pivot = augmented[i][i];
    for (let j = 0; j < 2 * n; j++) {
      augmented[i][j] /= pivot;
    }
    
    // Eliminate column
    for (let k = 0; k < n; k++) {
      if (k !== i) {
        const factor = augmented[k][i];
        for (let j = 0; j < 2 * n; j++) {
          augmented[k][j] -= factor * augmented[i][j];
        }
      }
    }
  }
  
  return augmented.map(row => row.slice(n));
};

// Calculate AUC using Mann-Whitney U statistic
const calculateAUC = (predictions: number[], actual: number[]): number => {
  const pos = predictions.filter((_, i) => actual[i] === 1);
  const neg = predictions.filter((_, i) => actual[i] === 0);
  
  if (pos.length === 0 || neg.length === 0) return 0.5;
  
  let count = 0;
  for (const p of pos) {
    for (const n of neg) {
      if (p > n) count++;
      else if (p === n) count += 0.5;
    }
  }
  
  return count / (pos.length * neg.length);
};

// Hosmer-Lemeshow goodness-of-fit test
const calculateHosmerLemeshow = (predictions: number[], actual: number[]): { statistic: number; pValue: number; df: number } => {
  const n = predictions.length;
  const g = 10; // Number of groups
  
  // Sort by predicted probability
  const sorted = predictions.map((p, i) => ({ p, y: actual[i] }))
    .sort((a, b) => a.p - b.p);
  
  const groupSize = Math.floor(n / g);
  let chi2 = 0;
  
  for (let i = 0; i < g; i++) {
    const start = i * groupSize;
    const end = i === g - 1 ? n : (i + 1) * groupSize;
    const group = sorted.slice(start, end);
    
    const observed1 = group.reduce((sum, item) => sum + item.y, 0);
    const expected1 = group.reduce((sum, item) => sum + item.p, 0);
    const n_g = group.length;
    
    if (expected1 > 0 && expected1 < n_g) {
      chi2 += ((observed1 - expected1) ** 2) / expected1;
      chi2 += (((n_g - observed1) - (n_g - expected1)) ** 2) / (n_g - expected1);
    }
  }
  
  const df = g - 2;
  const pValue = 1 - chiSquareCDF(chi2, df);
  
  return { statistic: chi2, pValue, df };
};

// Confusion Matrix Analysis
const confusionMatrixAnalysis = (actual: number[], predicted: number[]): {
  tp: number; tn: number; fp: number; fn: number;
  accuracy: number; precision: number; recall: number; specificity: number; f1: number;
  npv: number; fpr: number; fnr: number; mcc: number; balancedAccuracy: number;
  prevalence: number; detectionRate: number; detectionPrevalence: number;
} => {
  let tp = 0, tn = 0, fp = 0, fn = 0;
  
  for (let i = 0; i < actual.length; i++) {
    if (actual[i] === 1 && predicted[i] === 1) tp++;
    else if (actual[i] === 0 && predicted[i] === 0) tn++;
    else if (actual[i] === 0 && predicted[i] === 1) fp++;
    else if (actual[i] === 1 && predicted[i] === 0) fn++;
  }
  
  const n = tp + tn + fp + fn;
  const accuracy = n > 0 ? (tp + tn) / n : 0;
  const precision = (tp + fp) > 0 ? tp / (tp + fp) : 0; // PPV
  const recall = (tp + fn) > 0 ? tp / (tp + fn) : 0; // Sensitivity / TPR
  const specificity = (tn + fp) > 0 ? tn / (tn + fp) : 0; // TNR
  const f1 = (precision + recall) > 0 ? 2 * precision * recall / (precision + recall) : 0;
  const npv = (tn + fn) > 0 ? tn / (tn + fn) : 0; // Negative Predictive Value
  const fpr = (fp + tn) > 0 ? fp / (fp + tn) : 0; // False Positive Rate
  const fnr = (fn + tp) > 0 ? fn / (fn + tp) : 0; // False Negative Rate
  
  // Matthews Correlation Coefficient
  const mccDenom = Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn));
  const mcc = mccDenom > 0 ? (tp * tn - fp * fn) / mccDenom : 0;
  
  const balancedAccuracy = (recall + specificity) / 2;
  const prevalence = n > 0 ? (tp + fn) / n : 0;
  const detectionRate = n > 0 ? tp / n : 0;
  const detectionPrevalence = n > 0 ? (tp + fp) / n : 0;
  
  return { 
    tp, tn, fp, fn, accuracy, precision, recall, specificity, f1,
    npv, fpr, fnr, mcc, balancedAccuracy, prevalence, detectionRate, detectionPrevalence
  };
};

// ROC Curve Analysis
const rocCurveAnalysis = (predictions: number[], actual: number[]): {
  rocPoints: { fpr: number; tpr: number; threshold: number }[];
  auc: number;
  optimalThreshold: number;
  optimalSensitivity: number;
  optimalSpecificity: number;
  giniCoefficient: number;
} => {
  // Get unique thresholds
  const thresholds = [...new Set(predictions)].sort((a, b) => b - a);
  thresholds.unshift(1.01); // Add point at (0, 0)
  thresholds.push(-0.01); // Add point at (1, 1)
  
  const rocPoints: { fpr: number; tpr: number; threshold: number }[] = [];
  let maxYouden = -1;
  let optimalThreshold = 0.5;
  let optimalSensitivity = 0;
  let optimalSpecificity = 0;
  
  for (const threshold of thresholds) {
    const predicted = predictions.map(p => p >= threshold ? 1 : 0);
    const cm = confusionMatrixAnalysis(actual, predicted);
    
    const tpr = cm.recall; // Sensitivity
    const fpr = cm.fpr;
    
    rocPoints.push({ fpr, tpr, threshold });
    
    // Youden's J statistic for optimal threshold
    const youden = tpr - fpr;
    if (youden > maxYouden) {
      maxYouden = youden;
      optimalThreshold = threshold;
      optimalSensitivity = tpr;
      optimalSpecificity = cm.specificity;
    }
  }
  
  // Sort by FPR for proper curve
  rocPoints.sort((a, b) => a.fpr - b.fpr);
  
  // Calculate AUC using trapezoidal rule
  let auc = 0;
  for (let i = 1; i < rocPoints.length; i++) {
    const width = rocPoints[i].fpr - rocPoints[i - 1].fpr;
    const height = (rocPoints[i].tpr + rocPoints[i - 1].tpr) / 2;
    auc += width * height;
  }
  
  const giniCoefficient = 2 * auc - 1;
  
  return { rocPoints, auc, optimalThreshold, optimalSensitivity, optimalSpecificity, giniCoefficient };
};

// Two-Way ANOVA
const twoWayANOVA = (data: any[], valueCol: string, factor1Col: string, factor2Col: string): {
  ssA: number; ssB: number; ssAB: number; ssWithin: number; ssTotal: number;
  dfA: number; dfB: number; dfAB: number; dfWithin: number; dfTotal: number;
  msA: number; msB: number; msAB: number; msWithin: number;
  fA: number; fB: number; fAB: number;
  pA: number; pB: number; pAB: number;
  etaSquaredA: number; etaSquaredB: number; etaSquaredAB: number;
  grandMean: number;
  factor1Levels: string[]; factor2Levels: string[];
  cellMeans: { [key: string]: { mean: number; n: number; std: number } };
  factor1Means: { [key: string]: number };
  factor2Means: { [key: string]: number };
  isSignificantA: boolean; isSignificantB: boolean; isSignificantAB: boolean;
} => {
  // Get factor levels
  const factor1Levels = [...new Set(data.map(row => String(row[factor1Col])))];
  const factor2Levels = [...new Set(data.map(row => String(row[factor2Col])))];
  
  const a = factor1Levels.length; // Number of levels in factor 1
  const b = factor2Levels.length; // Number of levels in factor 2
  
  // Calculate all values
  const allValues = data.map(row => Number(row[valueCol])).filter(v => !isNaN(v));
  const grandMean = mean(allValues);
  const n = allValues.length;
  
  // Calculate cell means
  const cellMeans: { [key: string]: { mean: number; n: number; std: number; values: number[] } } = {};
  const factor1Means: { [key: string]: number } = {};
  const factor2Means: { [key: string]: number } = {};
  
  // Initialize
  factor1Levels.forEach(l1 => {
    factor2Levels.forEach(l2 => {
      cellMeans[`${l1}_${l2}`] = { mean: 0, n: 0, std: 0, values: [] };
    });
  });
  
  // Fill cell data
  data.forEach(row => {
    const val = Number(row[valueCol]);
    if (!isNaN(val)) {
      const l1 = String(row[factor1Col]);
      const l2 = String(row[factor2Col]);
      const key = `${l1}_${l2}`;
      cellMeans[key].values.push(val);
      cellMeans[key].n++;
    }
  });
  
  // Calculate cell means and stds
  Object.keys(cellMeans).forEach(key => {
    const cell = cellMeans[key];
    if (cell.n > 0) {
      cell.mean = mean(cell.values);
      cell.std = cell.n > 1 ? std(cell.values) : 0;
    }
  });
  
  // Calculate factor means
  factor1Levels.forEach(l1 => {
    const vals = data.filter(row => String(row[factor1Col]) === l1)
      .map(row => Number(row[valueCol])).filter(v => !isNaN(v));
    factor1Means[l1] = mean(vals);
  });
  
  factor2Levels.forEach(l2 => {
    const vals = data.filter(row => String(row[factor2Col]) === l2)
      .map(row => Number(row[valueCol])).filter(v => !isNaN(v));
    factor2Means[l2] = mean(vals);
  });
  
  // Calculate Sum of Squares
  let ssA = 0, ssB = 0, ssAB = 0, ssWithin = 0, ssTotal = 0;
  
  // SS Total
  allValues.forEach(val => {
    ssTotal += Math.pow(val - grandMean, 2);
  });
  
  // SS Factor A (between rows)
  factor1Levels.forEach(l1 => {
    const nA = data.filter(row => String(row[factor1Col]) === l1).length;
    ssA += nA * Math.pow(factor1Means[l1] - grandMean, 2);
  });
  
  // SS Factor B (between columns)
  factor2Levels.forEach(l2 => {
    const nB = data.filter(row => String(row[factor2Col]) === l2).length;
    ssB += nB * Math.pow(factor2Means[l2] - grandMean, 2);
  });
  
  // SS Interaction and SS Within
  factor1Levels.forEach(l1 => {
    factor2Levels.forEach(l2 => {
      const key = `${l1}_${l2}`;
      const cell = cellMeans[key];
      if (cell.n > 0) {
        // Interaction effect
        const interactionEffect = cell.mean - factor1Means[l1] - factor2Means[l2] + grandMean;
        ssAB += cell.n * Math.pow(interactionEffect, 2);
        
        // Within (error)
        cell.values.forEach(val => {
          ssWithin += Math.pow(val - cell.mean, 2);
        });
      }
    });
  });
  
  // Degrees of freedom
  const dfA = a - 1;
  const dfB = b - 1;
  const dfAB = (a - 1) * (b - 1);
  const dfWithin = n - a * b;
  const dfTotal = n - 1;
  
  // Mean Squares
  const msA = dfA > 0 ? ssA / dfA : 0;
  const msB = dfB > 0 ? ssB / dfB : 0;
  const msAB = dfAB > 0 ? ssAB / dfAB : 0;
  const msWithin = dfWithin > 0 ? ssWithin / dfWithin : 0;
  
  // F-statistics
  const fA = msWithin > 0 ? msA / msWithin : 0;
  const fB = msWithin > 0 ? msB / msWithin : 0;
  const fAB = msWithin > 0 ? msAB / msWithin : 0;
  
  // P-values
  const pA = 1 - fCDF(fA, dfA, dfWithin);
  const pB = 1 - fCDF(fB, dfB, dfWithin);
  const pAB = 1 - fCDF(fAB, dfAB, dfWithin);
  
  // Effect sizes (Eta-squared)
  const etaSquaredA = ssTotal > 0 ? ssA / ssTotal : 0;
  const etaSquaredB = ssTotal > 0 ? ssB / ssTotal : 0;
  const etaSquaredAB = ssTotal > 0 ? ssAB / ssTotal : 0;
  
  // Clean up cellMeans (remove values array)
  const cleanCellMeans: { [key: string]: { mean: number; n: number; std: number } } = {};
  Object.keys(cellMeans).forEach(key => {
    cleanCellMeans[key] = { mean: cellMeans[key].mean, n: cellMeans[key].n, std: cellMeans[key].std };
  });
  
  return {
    ssA, ssB, ssAB, ssWithin, ssTotal,
    dfA, dfB, dfAB, dfWithin, dfTotal,
    msA, msB, msAB, msWithin,
    fA, fB, fAB,
    pA, pB, pAB,
    etaSquaredA, etaSquaredB, etaSquaredAB,
    grandMean,
    factor1Levels, factor2Levels,
    cellMeans: cleanCellMeans,
    factor1Means, factor2Means,
    isSignificantA: pA < 0.05,
    isSignificantB: pB < 0.05,
    isSignificantAB: pAB < 0.05
  };
};

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
              // Get paired valid data
              const pairedData: { x: number; y: number }[] = [];
              data.forEach(row => {
                const xVal = Number(row[var1]);
                const yVal = Number(row[var2]);
                if (!isNaN(xVal) && !isNaN(yVal) && isFinite(xVal) && isFinite(yVal)) {
                  pairedData.push({ x: xVal, y: yVal });
                }
              });
              
              const x = pairedData.map(p => p.x);
              const y = pairedData.map(p => p.y);
              const n = pairedData.length;
              
              if (n < 3) {
                result = { type: 'error', message: language === 'ar' ? 'عدد البيانات غير كافٍ (يجب أن يكون 3 على الأقل)' : 'Insufficient data (minimum 3 pairs required)' };
                break;
              }
              
              const r = activeAnalysis === 'pearson' ? pearsonCorrelation(x, y) : spearmanCorrelation(x, y);
              
              // Calculate t-statistic and p-value correctly
              const rSquared = r * r;
              const tStatistic = rSquared < 1 ? r * Math.sqrt((n - 2) / (1 - rSquared)) : 0;
              const pValue = correlationPValue(r, n);
              
              // Determine significance
              const isSignificant = pValue < 0.05;
              
              // Interpretation based on Cohen's guidelines
              const absR = Math.abs(r);
              let strength: string;
              let strengthEn: string;
              if (absR < 0.1) {
                strength = 'لا يوجد ارتباط';
                strengthEn = 'No correlation';
              } else if (absR < 0.3) {
                strength = 'ارتباط ضعيف';
                strengthEn = 'Weak correlation';
              } else if (absR < 0.5) {
                strength = 'ارتباط متوسط';
                strengthEn = 'Moderate correlation';
              } else if (absR < 0.7) {
                strength = 'ارتباط قوي';
                strengthEn = 'Strong correlation';
              } else {
                strength = 'ارتباط قوي جداً';
                strengthEn = 'Very strong correlation';
              }
              
              result = {
                type: activeAnalysis,
                correlation: r,
                rSquared: rSquared,
                n,
                tStatistic,
                pValue,
                isSignificant,
                interpretation: language === 'ar' ? strength : strengthEn,
                direction: r > 0 ? (language === 'ar' ? 'طردي (موجب)' : 'Positive') : (language === 'ar' ? 'عكسي (سالب)' : 'Negative'),
                scatterData: pairedData.slice(0, 200).map(p => ({ x: p.x, y: p.y })),
                conclusion: isSignificant 
                  ? (language === 'ar' 
                    ? `يوجد ارتباط دال إحصائياً (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)})` 
                    : `Statistically significant correlation (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)})`)
                  : (language === 'ar' 
                    ? `لا يوجد ارتباط دال إحصائياً (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)})` 
                    : `No statistically significant correlation (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)})`)
              };
            }
            break;
          }
          
          case 'correlation_matrix': {
            const method = (analysisOptions.correlationMethod || 'pearson') as 'pearson' | 'spearman' | 'kendall';
            const matrixResult = calculateCorrelationMatrix(data, numericColumns, method);
            
            result = { 
              type: 'correlation_matrix', 
              method,
              ...matrixResult,
              heatmapData: numericColumns.map((col, i) => ({
                variable: col,
                ...numericColumns.reduce((acc, col2, j) => ({
                  ...acc,
                  [col2]: matrixResult.matrix[i][j]
                }), {})
              }))
            };
            break;
          }
          
          case 'partial_correlation': {
            const xVar = selectedVars.partialX;
            const yVar = selectedVars.partialY;
            const controlVar = selectedVars.partialControl;
            
            if (xVar && yVar && controlVar) {
              const x = data.map(row => Number(row[xVar]));
              const y = data.map(row => Number(row[yVar]));
              const z = data.map(row => Number(row[controlVar]));
              
              const partialResult = partialCorrelation(x, y, z);
              
              if (partialResult.n < 4) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? 'عدد البيانات غير كافٍ (يجب أن يكون 4 على الأقل)' 
                    : 'Insufficient data (minimum 4 observations required)' 
                };
                break;
              }
              
              const isSignificant = partialResult.pValue < 0.05;
              const absR = Math.abs(partialResult.r);
              let strength = '';
              if (absR < 0.1) strength = language === 'ar' ? 'لا يوجد ارتباط' : 'No correlation';
              else if (absR < 0.3) strength = language === 'ar' ? 'ارتباط ضعيف' : 'Weak';
              else if (absR < 0.5) strength = language === 'ar' ? 'ارتباط متوسط' : 'Moderate';
              else if (absR < 0.7) strength = language === 'ar' ? 'ارتباط قوي' : 'Strong';
              else strength = language === 'ar' ? 'ارتباط قوي جداً' : 'Very Strong';
              
              result = {
                type: 'partial_correlation',
                ...partialResult,
                xVar,
                yVar,
                controlVar,
                isSignificant,
                strength,
                direction: partialResult.r > 0 
                  ? (language === 'ar' ? 'طردي (موجب)' : 'Positive') 
                  : (language === 'ar' ? 'عكسي (سالب)' : 'Negative'),
                interpretation: language === 'ar'
                  ? `الارتباط بين ${xVar} و ${yVar} مع التحكم في ${controlVar}`
                  : `Correlation between ${xVar} and ${yVar} controlling for ${controlVar}`,
                conclusion: isSignificant
                  ? (language === 'ar'
                    ? `يوجد ارتباط جزئي دال إحصائياً (r = ${partialResult.r.toFixed(3)}, p = ${partialResult.pValue.toFixed(4)})`
                    : `Significant partial correlation (r = ${partialResult.r.toFixed(3)}, p = ${partialResult.pValue.toFixed(4)})`)
                  : (language === 'ar'
                    ? `لا يوجد ارتباط جزئي دال إحصائياً (p = ${partialResult.pValue.toFixed(4)})`
                    : `No significant partial correlation (p = ${partialResult.pValue.toFixed(4)})`)
              };
            }
            break;
          }
          
          case 'linear': {
            const xVar = selectedVars.independent;
            const yVar = selectedVars.dependent;
            if (xVar && yVar) {
              // Get paired valid data
              const pairedData: { x: number; y: number }[] = [];
              data.forEach(row => {
                const xVal = Number(row[xVar]);
                const yVal = Number(row[yVar]);
                if (!isNaN(xVal) && !isNaN(yVal) && isFinite(xVal) && isFinite(yVal)) {
                  pairedData.push({ x: xVal, y: yVal });
                }
              });
              
              const x = pairedData.map(p => p.x);
              const y = pairedData.map(p => p.y);
              const n = pairedData.length;
              
              if (n < 3) {
                result = { type: 'error', message: language === 'ar' ? 'عدد البيانات غير كافٍ (يجب أن يكون 3 على الأقل)' : 'Insufficient data (minimum 3 pairs required)' };
                break;
              }
              
              const { slope, intercept, rSquared, predictions } = linearRegression(x, y);
              
              // Calculate additional statistics
              const r = Math.sqrt(rSquared) * (slope >= 0 ? 1 : -1);
              const adjustedRSquared = n > 2 ? 1 - (1 - rSquared) * (n - 1) / (n - 2) : rSquared;
              
              // Calculate residuals and standard error
              const residuals = y.map((yi, i) => yi - predictions[i]);
              const sse = residuals.reduce((sum, r) => sum + r * r, 0); // Sum of Squared Errors
              const mse = sse / (n - 2); // Mean Squared Error
              const rmse = Math.sqrt(mse); // Root Mean Squared Error
              
              // Standard error of slope
              const sxx = x.reduce((sum, xi) => sum + Math.pow(xi - mean(x), 2), 0);
              const seSlope = sxx > 0 ? Math.sqrt(mse / sxx) : 0;
              
              // T-statistic for slope
              const tSlope = seSlope > 0 ? slope / seSlope : 0;
              
              // P-value for slope (two-tailed)
              const pValueSlope = n > 2 ? 2 * (1 - tDistributionCDF(Math.abs(tSlope), n - 2)) : 1;
              
              // F-statistic
              const sst = y.reduce((sum, yi) => sum + Math.pow(yi - mean(y), 2), 0);
              const ssr = sst - sse;
              const fStatistic = sse > 0 ? (ssr / 1) / (sse / (n - 2)) : 0;
              const pValueF = 1 - fCDF(fStatistic, 1, n - 2);
              
              const isSignificant = pValueSlope < 0.05;
              
              result = {
                type: 'linear',
                slope,
                intercept,
                rSquared,
                r,
                adjustedRSquared,
                standardError: rmse,
                seSlope,
                tSlope,
                pValueSlope,
                fStatistic,
                pValueF,
                isSignificant,
                equation: `Y = ${intercept.toFixed(4)} ${slope >= 0 ? '+' : ''} ${slope.toFixed(4)} × X`,
                n,
                scatterData: pairedData.slice(0, 200).map((p, i) => ({ 
                  x: p.x, 
                  y: p.y, 
                  predicted: predictions[i] || 0,
                  residual: residuals[i] || 0
                })),
                conclusion: isSignificant 
                  ? (language === 'ar' 
                    ? `العلاقة دالة إحصائياً. المتغير المستقل يفسر ${(rSquared * 100).toFixed(1)}% من التباين في المتغير التابع.` 
                    : `Relationship is statistically significant. The independent variable explains ${(rSquared * 100).toFixed(1)}% of the variance in the dependent variable.`)
                  : (language === 'ar' 
                    ? `العلاقة غير دالة إحصائياً (p = ${pValueSlope.toFixed(4)})` 
                    : `Relationship is not statistically significant (p = ${pValueSlope.toFixed(4)})`)
              };
            }
            break;
          }
          
          case 'multiple': {
            const yVar = selectedVars.dependent;
            const xVars = (selectedVars.independentMultiple || '').split(',').filter(Boolean).map(v => v.trim());
            
            if (yVar && xVars.length > 0) {
              // Get valid data
              const validData = data.filter(row => {
                const yVal = Number(row[yVar]);
                const xVals = xVars.map(v => Number(row[v]));
                return !isNaN(yVal) && isFinite(yVal) && xVals.every(x => !isNaN(x) && isFinite(x));
              });
              
              if (validData.length < xVars.length + 2) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? `عدد البيانات غير كافٍ (يجب أن يكون ${xVars.length + 2} على الأقل)` 
                    : `Insufficient data (minimum ${xVars.length + 2} observations required)` 
                };
                break;
              }
              
              const y = validData.map(row => Number(row[yVar]));
              const X = validData.map(row => xVars.map(v => Number(row[v])));
              
              const multiResult = multipleRegression(X, y, xVars);
              
              result = {
                type: 'multiple',
                ...multiResult,
                yVar,
                xVars,
                scatterData: validData.slice(0, 100).map((row, i) => ({
                  actual: y[i],
                  predicted: multiResult.predictions[i],
                  residual: multiResult.residuals[i]
                }))
              };
            }
            break;
          }
          
          case 'polynomial': {
            const xVar = selectedVars.independent;
            const yVar = selectedVars.dependent;
            const degree = analysisOptions.polynomialDegree || 2;
            
            if (xVar && yVar) {
              // Get valid data
              const validData = data.filter(row => {
                const xVal = Number(row[xVar]);
                const yVal = Number(row[yVar]);
                return !isNaN(xVal) && isFinite(xVal) && !isNaN(yVal) && isFinite(yVal);
              });
              
              if (validData.length < degree + 2) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? `عدد البيانات غير كافٍ (يجب أن يكون ${degree + 2} على الأقل)` 
                    : `Insufficient data (minimum ${degree + 2} observations required)` 
                };
                break;
              }
              
              const x = validData.map(row => Number(row[xVar]));
              const y = validData.map(row => Number(row[yVar]));
              
              const polyResult = polynomialRegression(x, y, degree);
              
              // Generate curve points for smooth plotting
              const xMin = Math.min(...x);
              const xMax = Math.max(...x);
              const curvePoints = [];
              for (let i = 0; i <= 100; i++) {
                const xi = xMin + (xMax - xMin) * i / 100;
                let yi = polyResult.coefficients[0] || 0;
                for (let d = 0; d < degree; d++) {
                  yi += (polyResult.coefficients[d + 1] || 0) * Math.pow(xi, d + 1);
                }
                curvePoints.push({ x: xi, predicted: yi });
              }
              
              result = {
                type: 'polynomial',
                ...polyResult,
                degree,
                xVar,
                yVar,
                scatterData: validData.slice(0, 200).map((row, i) => ({
                  x: x[i],
                  y: y[i],
                  predicted: polyResult.predictions[i],
                  residual: polyResult.residuals[i]
                })),
                curvePoints
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
                return !isNaN(x) && isFinite(x) && (y === 0 || y === 1);
              });
              
              if (validData.length < 10) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? 'عدد البيانات غير كافٍ (يجب أن يكون 10 على الأقل)' 
                    : 'Insufficient data (minimum 10 observations required)' 
                };
                break;
              }
              
              const X = validData.map(row => [Number(row[xVar])]);
              const y = validData.map(row => Number(row[yVar]));
              
              // Check if we have both classes
              const class0 = y.filter(yi => yi === 0).length;
              const class1 = y.filter(yi => yi === 1).length;
              
              if (class0 < 2 || class1 < 2) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? 'يجب أن يحتوي المتغير التابع على فئتين (0 و 1) بعدد كافٍ' 
                    : 'Dependent variable must have both classes (0 and 1) with sufficient counts' 
                };
                break;
              }
              
              const logisticResult = logisticRegression(X, y);
              
              result = {
                type: 'logistic',
                ...logisticResult,
                xVar,
                yVar,
                class0Count: class0,
                class1Count: class1,
                variableNames: [language === 'ar' ? 'الثابت' : 'Intercept', xVar],
                curveData: X.map((xi, i) => ({ 
                  x: xi[0], 
                  y: y[i], 
                  prob: logisticResult.predictions[i],
                  predicted: logisticResult.predictedClasses[i]
                })).sort((a, b) => a.x - b.x)
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
                const seasonalResult = calculateSeasonalityAdvanced(values, analysisOptions.seasonalPeriod);
                result = {
                  type: 'seasonality',
                  period: analysisOptions.seasonalPeriod,
                  n: values.length,
                  ...seasonalResult,
                  chartData: values.map((v, i) => ({ 
                    index: i, 
                    actual: v, 
                    seasonal: seasonalResult.seasonalComponent[i],
                    trend: seasonalResult.trendComponent[i],
                    residual: seasonalResult.residualComponent[i],
                    deseasonalized: v - seasonalResult.seasonalComponent[i]
                  })),
                  acfChartData: seasonalResult.acfValues.map((acf, i) => ({ 
                    lag: i + 1, 
                    acf,
                    significant: Math.abs(acf) > 1.96 / Math.sqrt(values.length)
                  })),
                  seasonalFactorsChart: seasonalResult.seasonalStats.map(s => ({
                    period: `P${s.period}`,
                    factor: seasonalResult.seasonalFactors[s.period - 1],
                    index: s.index
                  })),
                  interpretation: seasonalResult.isSeasonalitySignificant 
                    ? (language === 'ar' 
                      ? `تم اكتشاف موسمية دالة إحصائياً (F = ${seasonalResult.fStatistic.toFixed(2)}, p = ${seasonalResult.pValue.toFixed(4)}). قوة الموسمية: ${(seasonalResult.seasonalStrength * 100).toFixed(1)}%`
                      : `Statistically significant seasonality detected (F = ${seasonalResult.fStatistic.toFixed(2)}, p = ${seasonalResult.pValue.toFixed(4)}). Seasonal strength: ${(seasonalResult.seasonalStrength * 100).toFixed(1)}%`)
                    : (language === 'ar'
                      ? `لم يتم اكتشاف موسمية دالة إحصائياً (p = ${seasonalResult.pValue.toFixed(4)})`
                      : `No statistically significant seasonality detected (p = ${seasonalResult.pValue.toFixed(4)})`)
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
          
          case 'logistic_class': {
            const xVar = selectedVars.classIndependent;
            const yVar = selectedVars.classDependent;
            if (xVar && yVar) {
              const validData = data.filter(row => {
                const x = Number(row[xVar]);
                const y = Number(row[yVar]);
                return !isNaN(x) && isFinite(x) && (y === 0 || y === 1);
              });
              
              if (validData.length < 10) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? 'عدد البيانات غير كافٍ (يجب أن يكون 10 على الأقل)' 
                    : 'Insufficient data (minimum 10 observations required)' 
                };
                break;
              }
              
              const X = validData.map(row => [Number(row[xVar])]);
              const y = validData.map(row => Number(row[yVar]));
              
              const class0 = y.filter(yi => yi === 0).length;
              const class1 = y.filter(yi => yi === 1).length;
              
              if (class0 < 2 || class1 < 2) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? 'يجب أن يحتوي المتغير التابع على فئتين (0 و 1)' 
                    : 'Dependent variable must have both classes (0 and 1)' 
                };
                break;
              }
              
              const logisticResult = logisticRegression(X, y);
              const rocResult = rocCurveAnalysis(logisticResult.predictions, y);
              
              result = {
                type: 'logistic_class',
                ...logisticResult,
                ...rocResult,
                xVar,
                yVar,
                class0Count: class0,
                class1Count: class1,
                variableNames: [language === 'ar' ? 'الثابت' : 'Intercept', xVar],
                curveData: X.map((xi, i) => ({ 
                  x: xi[0], 
                  y: y[i], 
                  prob: logisticResult.predictions[i],
                  predicted: logisticResult.predictedClasses[i]
                })).sort((a, b) => a.x - b.x)
              };
            }
            break;
          }
          
          case 'confusion_matrix': {
            const predVar = selectedVars.predictedVar;
            const actualVar = selectedVars.actualVar;
            if (predVar && actualVar) {
              const validData = data.filter(row => {
                const pred = Number(row[predVar]);
                const actual = Number(row[actualVar]);
                return (pred === 0 || pred === 1) && (actual === 0 || actual === 1);
              });
              
              if (validData.length < 10) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? 'عدد البيانات غير كافٍ' 
                    : 'Insufficient data' 
                };
                break;
              }
              
              const predicted = validData.map(row => Number(row[predVar]));
              const actual = validData.map(row => Number(row[actualVar]));
              
              const cmResult = confusionMatrixAnalysis(actual, predicted);
              
              result = {
                type: 'confusion_matrix',
                ...cmResult,
                n: validData.length,
                predVar,
                actualVar
              };
            }
            break;
          }
          
          case 'roc_curve': {
            const probVar = selectedVars.probabilityVar;
            const actualVar = selectedVars.actualVar;
            if (probVar && actualVar) {
              const validData = data.filter(row => {
                const prob = Number(row[probVar]);
                const actual = Number(row[actualVar]);
                return !isNaN(prob) && isFinite(prob) && prob >= 0 && prob <= 1 && (actual === 0 || actual === 1);
              });
              
              if (validData.length < 10) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? 'عدد البيانات غير كافٍ' 
                    : 'Insufficient data' 
                };
                break;
              }
              
              const predictions = validData.map(row => Number(row[probVar]));
              const actual = validData.map(row => Number(row[actualVar]));
              
              const rocResult = rocCurveAnalysis(predictions, actual);
              const cmAtOptimal = confusionMatrixAnalysis(actual, predictions.map(p => p >= rocResult.optimalThreshold ? 1 : 0));
              
              result = {
                type: 'roc_curve',
                ...rocResult,
                ...cmAtOptimal,
                n: validData.length,
                probVar,
                actualVar
              };
            }
            break;
          }
          
          case 'twoway_anova': {
            const valueVar = selectedVars.valueVar;
            const factor1Var = selectedVars.factor1Var;
            const factor2Var = selectedVars.factor2Var;
            if (valueVar && factor1Var && factor2Var) {
              const validData = data.filter(row => {
                const val = Number(row[valueVar]);
                return !isNaN(val) && isFinite(val) && row[factor1Var] && row[factor2Var];
              });
              
              if (validData.length < 12) {
                result = { 
                  type: 'error', 
                  message: language === 'ar' 
                    ? 'عدد البيانات غير كافٍ (يجب أن يكون 12 على الأقل)' 
                    : 'Insufficient data (minimum 12 observations required)' 
                };
                break;
              }
              
              const anovaResult = twoWayANOVA(validData, valueVar, factor1Var, factor2Var);
              
              result = {
                type: 'twoway_anova',
                ...anovaResult,
                valueVar,
                factor1Var,
                factor2Var,
                n: validData.length
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
      
      case 'correlation_matrix':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'طريقة الارتباط' : 'Correlation Method'}
              </label>
              <select
                value={analysisOptions.correlationMethod || 'pearson'}
                onChange={(e) => setAnalysisOptions({ ...analysisOptions, correlationMethod: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="pearson">Pearson</option>
                <option value="spearman">Spearman</option>
                <option value="kendall">Kendall</option>
              </select>
            </div>
            <p className="text-xs text-gray-500">
              {language === 'ar' 
                ? `سيتم حساب مصفوفة الارتباط لـ ${numericColumns.length} متغير رقمي`
                : `Correlation matrix will be calculated for ${numericColumns.length} numeric variables`}
            </p>
          </div>
        );
      
      case 'partial_correlation':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'المتغير الأول (X)' : 'Variable X'}
                </label>
                <select
                  value={selectedVars.partialX || ''}
                  onChange={(e) => setSelectedVars({ ...selectedVars, partialX: e.target.value })}
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
                  {language === 'ar' ? 'المتغير الثاني (Y)' : 'Variable Y'}
                </label>
                <select
                  value={selectedVars.partialY || ''}
                  onChange={(e) => setSelectedVars({ ...selectedVars, partialY: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                  {numericColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'متغير التحكم (Z)' : 'Control Variable (Z)'}
              </label>
              <select
                value={selectedVars.partialControl || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, partialControl: e.target.value })}
                className="w-full p-2 border rounded-lg"
              >
                <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                {numericColumns.filter(col => col !== selectedVars.partialX && col !== selectedVars.partialY).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'ar' 
                  ? 'المتغير الذي يتم التحكم فيه (إزالة تأثيره)'
                  : 'Variable to control for (remove its effect)'}
              </p>
            </div>
          </div>
        );
      
      case 'linear':
      case 'logistic':
      case 'polynomial':
        return (
          <div className="space-y-4">
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
            {activeAnalysis === 'polynomial' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'درجة كثير الحدود' : 'Polynomial Degree'}
                </label>
                <select
                  value={analysisOptions.polynomialDegree || 2}
                  onChange={(e) => setAnalysisOptions({ ...analysisOptions, polynomialDegree: Number(e.target.value) })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value={2}>{language === 'ar' ? 'الدرجة الثانية (تربيعي)' : 'Degree 2 (Quadratic)'}</option>
                  <option value={3}>{language === 'ar' ? 'الدرجة الثالثة (تكعيبي)' : 'Degree 3 (Cubic)'}</option>
                  <option value={4}>{language === 'ar' ? 'الدرجة الرابعة' : 'Degree 4'}</option>
                  <option value={5}>{language === 'ar' ? 'الدرجة الخامسة' : 'Degree 5'}</option>
                </select>
              </div>
            )}
          </div>
        );
      
      case 'multiple':
        return (
          <div className="space-y-4">
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
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغيرات المستقلة (X)' : 'Independent Variables (X)'}
              </label>
              <select
                multiple
                value={(selectedVars.independentMultiple || '').split(',').filter(Boolean)}
                onChange={(e) => setSelectedVars({ 
                  ...selectedVars, 
                  independentMultiple: Array.from(e.target.selectedOptions, o => o.value).join(',') 
                })}
                className="w-full p-2 border rounded-lg h-32"
              >
                {numericColumns.filter(col => col !== selectedVars.dependent).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {language === 'ar' ? 'اضغط Ctrl للاختيار المتعدد' : 'Hold Ctrl for multiple selection'}
              </p>
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
      
      case 'logistic_class':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'المتغير المستقل (X)' : 'Independent Variable (X)'}
              </label>
              <select
                value={selectedVars.classIndependent || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, classIndependent: e.target.value })}
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
                {language === 'ar' ? 'المتغير التابع (Y) [0,1]' : 'Dependent Variable (Y) [0,1]'}
              </label>
              <select
                value={selectedVars.classDependent || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, classDependent: e.target.value })}
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
      
      case 'confusion_matrix':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'القيم المتوقعة [0,1]' : 'Predicted Values [0,1]'}
              </label>
              <select
                value={selectedVars.predictedVar || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, predictedVar: e.target.value })}
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
                {language === 'ar' ? 'القيم الفعلية [0,1]' : 'Actual Values [0,1]'}
              </label>
              <select
                value={selectedVars.actualVar || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, actualVar: e.target.value })}
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
      
      case 'roc_curve':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'الاحتمالات [0-1]' : 'Probabilities [0-1]'}
              </label>
              <select
                value={selectedVars.probabilityVar || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, probabilityVar: e.target.value })}
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
                {language === 'ar' ? 'القيم الفعلية [0,1]' : 'Actual Values [0,1]'}
              </label>
              <select
                value={selectedVars.actualVar || ''}
                onChange={(e) => setSelectedVars({ ...selectedVars, actualVar: e.target.value })}
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
      
      case 'twoway_anova':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {language === 'ar' ? 'متغير القيمة (Y)' : 'Value Variable (Y)'}
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {language === 'ar' ? 'العامل الأول' : 'Factor 1'}
                </label>
                <select
                  value={selectedVars.factor1Var || ''}
                  onChange={(e) => setSelectedVars({ ...selectedVars, factor1Var: e.target.value })}
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
                  {language === 'ar' ? 'العامل الثاني' : 'Factor 2'}
                </label>
                <select
                  value={selectedVars.factor2Var || ''}
                  onChange={(e) => setSelectedVars({ ...selectedVars, factor2Var: e.target.value })}
                  className="w-full p-2 border rounded-lg"
                >
                  <option value="">{language === 'ar' ? 'اختر متغير' : 'Select variable'}</option>
                  {categoricalColumns.map(col => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>
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
            {/* Main Statistics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'معامل الارتباط (r)' : 'Correlation (r)'}</p>
                <p className="text-2xl font-bold text-blue-800">{analysisResult.correlation?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                <p className="text-sm text-indigo-600">R²</p>
                <p className="text-2xl font-bold text-indigo-800">{((analysisResult.rSquared || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">p-value</p>
                <p className={`text-xl font-bold ${analysisResult.pValue < 0.05 ? 'text-green-700' : 'text-gray-700'}`}>
                  {analysisResult.pValue?.toFixed(4)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">n</p>
                <p className="text-2xl font-bold text-orange-800">{analysisResult.n}</p>
              </div>
            </div>
            
            {/* Interpretation Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'القوة' : 'Strength'}</p>
                <p className="text-lg font-bold text-green-800">{analysisResult.interpretation}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl">
                <p className="text-sm text-cyan-600">{language === 'ar' ? 'الاتجاه' : 'Direction'}</p>
                <p className="text-lg font-bold text-cyan-800">{analysisResult.direction}</p>
              </div>
            </div>
            
            {/* Statistical Details */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'التفاصيل الإحصائية' : 'Statistical Details'}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">t-statistic</p>
                  <p className="font-bold">{analysisResult.tStatistic?.toFixed(4)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">df</p>
                  <p className="font-bold">{(analysisResult.n || 0) - 2}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'مستوى الدلالة' : 'Alpha'}</p>
                  <p className="font-bold">0.05</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'نوع الاختبار' : 'Test Type'}</p>
                  <p className="font-bold">{language === 'ar' ? 'ذو طرفين' : 'Two-tailed'}</p>
                </div>
              </div>
            </div>
            
            {/* Conclusion */}
            <div className={`p-4 rounded-xl ${analysisResult.isSignificant ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-center gap-2">
                {analysisResult.isSignificant ? 
                  <CheckCircle className="text-green-600" size={20} /> : 
                  <AlertCircle className="text-gray-600" size={20} />
                }
                <span className={`font-semibold ${analysisResult.isSignificant ? 'text-green-800' : 'text-gray-800'}`}>
                  {analysisResult.conclusion}
                </span>
              </div>
            </div>
            
            {/* Scatter Plot */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'رسم التشتت' : 'Scatter Plot'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" name={selectedVars.var1} />
                  <YAxis dataKey="y" type="number" name={selectedVars.var2} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter data={analysisResult.scatterData} fill="#6366f1" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'linear':
        return (
          <div className="space-y-6">
            {/* Main Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">R²</p>
                <p className="text-2xl font-bold text-blue-800">{((analysisResult.rSquared || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                <p className="text-sm text-indigo-600">{language === 'ar' ? 'R² المعدل' : 'Adjusted R²'}</p>
                <p className="text-2xl font-bold text-indigo-800">{((analysisResult.adjustedRSquared || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">p-value</p>
                <p className={`text-xl font-bold ${analysisResult.pValueSlope < 0.05 ? 'text-green-700' : 'text-gray-700'}`}>
                  {analysisResult.pValueSlope?.toFixed(4)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">n</p>
                <p className="text-2xl font-bold text-orange-800">{analysisResult.n}</p>
              </div>
            </div>
            
            {/* Equation */}
            <div className="bg-indigo-50 p-4 rounded-xl">
              <p className="text-sm text-indigo-600 mb-1">{language === 'ar' ? 'معادلة الانحدار' : 'Regression Equation'}</p>
              <p className="text-xl font-mono font-bold text-indigo-800">{analysisResult.equation}</p>
            </div>
            
            {/* Coefficients Table */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'معاملات الانحدار' : 'Regression Coefficients'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">{language === 'ar' ? 'المعامل' : 'Coefficient'}</th>
                      <th className="p-2 text-right">{language === 'ar' ? 'القيمة' : 'Value'}</th>
                      <th className="p-2 text-right">{language === 'ar' ? 'الخطأ المعياري' : 'Std Error'}</th>
                      <th className="p-2 text-right">t-value</th>
                      <th className="p-2 text-right">p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">{language === 'ar' ? 'الثابت' : 'Intercept'}</td>
                      <td className="p-2">{analysisResult.intercept?.toFixed(4)}</td>
                      <td className="p-2">-</td>
                      <td className="p-2">-</td>
                      <td className="p-2">-</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">{language === 'ar' ? 'الميل (β)' : 'Slope (β)'}</td>
                      <td className="p-2">{analysisResult.slope?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.seSlope?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.tSlope?.toFixed(4)}</td>
                      <td className={`p-2 font-bold ${analysisResult.pValueSlope < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                        {analysisResult.pValueSlope?.toFixed(4)} {analysisResult.pValueSlope < 0.05 ? '*' : ''}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Model Statistics */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'إحصائيات النموذج' : 'Model Statistics'}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">F-statistic</p>
                  <p className="font-bold">{analysisResult.fStatistic?.toFixed(4)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">p-value (F)</p>
                  <p className="font-bold">{analysisResult.pValueF?.toFixed(4)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">RMSE</p>
                  <p className="font-bold">{analysisResult.standardError?.toFixed(4)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">r</p>
                  <p className="font-bold">{analysisResult.r?.toFixed(4)}</p>
                </div>
              </div>
            </div>
            
            {/* Conclusion */}
            <div className={`p-4 rounded-xl ${analysisResult.isSignificant ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-start gap-2">
                {analysisResult.isSignificant ? 
                  <CheckCircle className="text-green-600 mt-0.5" size={20} /> : 
                  <AlertCircle className="text-gray-600 mt-0.5" size={20} />
                }
                <span className={`${analysisResult.isSignificant ? 'text-green-800' : 'text-gray-800'}`}>
                  {analysisResult.conclusion}
                </span>
              </div>
            </div>
            
            {/* Regression Plot */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'رسم الانحدار' : 'Regression Plot'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analysisResult.scatterData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" name={selectedVars.independent} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Scatter dataKey="y" fill="#6366f1" name={language === 'ar' ? 'الفعلي' : 'Actual'} />
                  <Line dataKey="predicted" stroke="#ef4444" strokeWidth={2} dot={false} name={language === 'ar' ? 'خط الانحدار' : 'Regression Line'} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'seasonality':
        return (
          <div className="space-y-6">
            {/* Main Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'فترة الموسمية' : 'Seasonal Period'}</p>
                <p className="text-2xl font-bold text-blue-800">{analysisResult.period}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'قوة الموسمية' : 'Seasonal Strength'}</p>
                <p className="text-2xl font-bold text-purple-800">{((analysisResult.seasonalStrength || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'قوة الاتجاه' : 'Trend Strength'}</p>
                <p className="text-2xl font-bold text-green-800">{((analysisResult.trendStrength || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">n</p>
                <p className="text-2xl font-bold text-orange-800">{analysisResult.n}</p>
              </div>
            </div>
            
            {/* Statistical Test */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                <p className="text-sm text-indigo-600">F-{language === 'ar' ? 'إحصائي' : 'Statistic'}</p>
                <p className="text-xl font-bold text-indigo-800">{(analysisResult.fStatistic || 0).toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl">
                <p className="text-sm text-cyan-600">p-value</p>
                <p className={`text-xl font-bold ${(analysisResult.pValue || 1) < 0.05 ? 'text-green-700' : 'text-gray-700'}`}>
                  {(analysisResult.pValue || 1).toFixed(4)}
                </p>
              </div>
              <div className={`p-4 rounded-xl ${analysisResult.isSeasonalitySignificant ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
                <p className={`text-sm ${analysisResult.isSeasonalitySignificant ? 'text-green-600' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'الدلالة' : 'Significance'}
                </p>
                <p className={`text-lg font-bold ${analysisResult.isSeasonalitySignificant ? 'text-green-800' : 'text-gray-800'}`}>
                  {analysisResult.isSeasonalitySignificant 
                    ? (language === 'ar' ? 'دالة إحصائياً ✓' : 'Significant ✓')
                    : (language === 'ar' ? 'غير دالة' : 'Not Significant')}
                </p>
              </div>
            </div>
            
            {/* Interpretation */}
            <div className={`p-4 rounded-xl ${analysisResult.isSeasonalitySignificant ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-start gap-2">
                {analysisResult.isSeasonalitySignificant ? 
                  <CheckCircle className="text-green-600 mt-0.5" size={20} /> : 
                  <AlertCircle className="text-gray-600 mt-0.5" size={20} />
                }
                <span className={`${analysisResult.isSeasonalitySignificant ? 'text-green-800' : 'text-gray-800'}`}>
                  {analysisResult.interpretation}
                </span>
              </div>
            </div>
            
            {/* Seasonal Factors Table */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'العوامل الموسمية' : 'Seasonal Factors'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-center">{language === 'ar' ? 'الفترة' : 'Period'}</th>
                      {analysisResult.seasonalStats?.map((s: any) => (
                        <th key={s.period} className="p-2 text-center">{s.period}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium bg-gray-50">{language === 'ar' ? 'العامل' : 'Factor'}</td>
                      {analysisResult.seasonalFactors?.map((f: number, i: number) => (
                        <td key={i} className={`p-2 text-center font-bold ${f > 0 ? 'text-green-600' : f < 0 ? 'text-red-600' : ''}`}>
                          {f > 0 ? '+' : ''}{f.toFixed(2)}
                        </td>
                      ))}
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium bg-gray-50">{language === 'ar' ? 'المؤشر %' : 'Index %'}</td>
                      {analysisResult.seasonalIndices?.map((idx: number, i: number) => (
                        <td key={i} className={`p-2 text-center ${idx > 100 ? 'text-green-600' : idx < 100 ? 'text-red-600' : ''}`}>
                          {idx.toFixed(1)}%
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Seasonal Factors Bar Chart */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'رسم العوامل الموسمية' : 'Seasonal Factors Chart'}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analysisResult.seasonalFactorsChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="factor" name={language === 'ar' ? 'العامل' : 'Factor'}>
                    {analysisResult.seasonalFactorsChart?.map((_: any, index: number) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={analysisResult.seasonalFactors[index] >= 0 ? '#22c55e' : '#ef4444'} 
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Decomposition Chart */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'تحليل المركبات' : 'Decomposition'}</h4>
              <div className="space-y-4">
                {/* Original + Trend */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">{language === 'ar' ? 'البيانات الأصلية والاتجاه' : 'Original Data & Trend'}</p>
                  <ResponsiveContainer width="100%" height={150}>
                    <LineChart data={analysisResult.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Tooltip />
                      <Line type="monotone" dataKey="actual" stroke="#6366f1" name={language === 'ar' ? 'الفعلي' : 'Actual'} dot={false} strokeWidth={1} />
                      <Line type="monotone" dataKey="trend" stroke="#ef4444" name={language === 'ar' ? 'الاتجاه' : 'Trend'} dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Seasonal Component */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">{language === 'ar' ? 'المركبة الموسمية' : 'Seasonal Component'}</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={analysisResult.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Line type="monotone" dataKey="seasonal" stroke="#10b981" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                
                {/* Residual Component */}
                <div>
                  <p className="text-sm text-gray-600 mb-2">{language === 'ar' ? 'البواقي' : 'Residual'}</p>
                  <ResponsiveContainer width="100%" height={100}>
                    <LineChart data={analysisResult.chartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="index" />
                      <YAxis />
                      <Line type="monotone" dataKey="residual" stroke="#f59e0b" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
            
            {/* ACF Chart */}
            {analysisResult.acfChartData && analysisResult.acfChartData.length > 0 && (
              <div className="bg-white p-4 rounded-xl border">
                <h4 className="font-semibold mb-4">{language === 'ar' ? 'دالة الارتباط الذاتي (ACF)' : 'Autocorrelation Function (ACF)'}</h4>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={analysisResult.acfChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="lag" />
                    <YAxis domain={[-1, 1]} />
                    <Tooltip />
                    <Bar dataKey="acf" name="ACF">
                      {analysisResult.acfChartData?.map((entry: any, index: number) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.significant ? '#6366f1' : '#d1d5db'} 
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {language === 'ar' 
                    ? 'الأعمدة الملونة تشير إلى ارتباط ذاتي دال إحصائياً' 
                    : 'Colored bars indicate statistically significant autocorrelation'}
                </p>
                {analysisResult.peakPeriods && analysisResult.peakPeriods.length > 0 && (
                  <p className="text-sm text-center mt-2">
                    {language === 'ar' ? 'فترات الذروة المكتشفة:' : 'Detected peak periods:'} 
                    <span className="font-bold text-indigo-600"> {analysisResult.peakPeriods.join(', ')}</span>
                  </p>
                )}
              </div>
            )}
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
      
      case 'correlation_matrix':
        return (
          <div className="space-y-6">
            {/* Header */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'الطريقة' : 'Method'}</p>
                <p className="text-xl font-bold text-blue-800 capitalize">{analysisResult.method}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'المتغيرات' : 'Variables'}</p>
                <p className="text-xl font-bold text-purple-800">{analysisResult.columns?.length}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'ارتباطات دالة' : 'Significant'}</p>
                <p className="text-xl font-bold text-green-800">{analysisResult.significantPairs?.length}</p>
              </div>
            </div>
            
            {/* Correlation Matrix Heatmap */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'مصفوفة الارتباط' : 'Correlation Matrix'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr>
                      <th className="p-2 bg-gray-50"></th>
                      {analysisResult.columns?.map((col: string) => (
                        <th key={col} className="p-2 bg-gray-50 text-center text-xs font-medium" style={{ minWidth: '60px' }}>
                          {col.length > 8 ? col.substring(0, 8) + '...' : col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.columns?.map((row: string, i: number) => (
                      <tr key={row}>
                        <td className="p-2 bg-gray-50 font-medium text-xs">
                          {row.length > 10 ? row.substring(0, 10) + '...' : row}
                        </td>
                        {analysisResult.columns?.map((_col: string, j: number) => {
                          const r = analysisResult.matrix?.[i]?.[j] || 0;
                          const p = analysisResult.pValues?.[i]?.[j] || 1;
                          const isSignificant = p < 0.05 && i !== j;
                          
                          // Color based on correlation value
                          let bgColor = 'bg-gray-50';
                          if (i === j) {
                            bgColor = 'bg-gray-200';
                          } else if (r > 0.7) {
                            bgColor = 'bg-green-500 text-white';
                          } else if (r > 0.5) {
                            bgColor = 'bg-green-300';
                          } else if (r > 0.3) {
                            bgColor = 'bg-green-100';
                          } else if (r < -0.7) {
                            bgColor = 'bg-red-500 text-white';
                          } else if (r < -0.5) {
                            bgColor = 'bg-red-300';
                          } else if (r < -0.3) {
                            bgColor = 'bg-red-100';
                          }
                          
                          return (
                            <td 
                              key={j} 
                              className={`p-2 text-center text-xs ${bgColor} ${isSignificant ? 'font-bold' : ''}`}
                              title={`r = ${r.toFixed(3)}, p = ${p.toFixed(4)}`}
                            >
                              {r.toFixed(2)}{isSignificant ? '*' : ''}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                * p {'<'} 0.05 | {language === 'ar' ? 'مرر الفأرة لرؤية التفاصيل' : 'Hover for details'}
              </p>
            </div>
            
            {/* Significant Pairs */}
            {analysisResult.significantPairs?.length > 0 && (
              <div className="bg-white p-4 rounded-xl border">
                <h4 className="font-semibold mb-4">
                  {language === 'ar' ? 'الارتباطات الدالة إحصائياً' : 'Significant Correlations'}
                </h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {analysisResult.significantPairs.slice(0, 15).map((pair: any, idx: number) => (
                    <div 
                      key={idx} 
                      className={`p-3 rounded-lg flex items-center justify-between ${
                        pair.r > 0 ? 'bg-green-50' : 'bg-red-50'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{pair.var1}</span>
                        <span className="text-gray-400">↔</span>
                        <span className="font-medium">{pair.var2}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`font-bold ${pair.r > 0 ? 'text-green-600' : 'text-red-600'}`}>
                          r = {pair.r.toFixed(3)}
                        </span>
                        <span className="text-sm text-gray-500">
                          p = {pair.pValue.toFixed(4)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-white rounded-full">
                          {pair.interpretation}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* Color Legend */}
            <div className="bg-gray-50 p-4 rounded-xl">
              <h5 className="font-medium mb-2 text-sm">{language === 'ar' ? 'دليل الألوان' : 'Color Legend'}</h5>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="px-2 py-1 bg-green-500 text-white rounded">+0.7 to +1.0</span>
                <span className="px-2 py-1 bg-green-300 rounded">+0.5 to +0.7</span>
                <span className="px-2 py-1 bg-green-100 rounded">+0.3 to +0.5</span>
                <span className="px-2 py-1 bg-gray-100 rounded">-0.3 to +0.3</span>
                <span className="px-2 py-1 bg-red-100 rounded">-0.5 to -0.3</span>
                <span className="px-2 py-1 bg-red-300 rounded">-0.7 to -0.5</span>
                <span className="px-2 py-1 bg-red-500 text-white rounded">-1.0 to -0.7</span>
              </div>
            </div>
          </div>
        );
      
      case 'partial_correlation':
        return (
          <div className="space-y-6">
            {/* Main Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'الارتباط الجزئي' : 'Partial r'}</p>
                <p className="text-2xl font-bold text-blue-800">{analysisResult.r?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">p-value</p>
                <p className={`text-xl font-bold ${analysisResult.pValue < 0.05 ? 'text-green-700' : 'text-gray-700'}`}>
                  {analysisResult.pValue?.toFixed(4)}
                </p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">t-statistic</p>
                <p className="text-xl font-bold text-green-800">{analysisResult.tStatistic?.toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">df</p>
                <p className="text-2xl font-bold text-orange-800">{analysisResult.df}</p>
              </div>
            </div>
            
            {/* Comparison with Zero-Order Correlations */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">
                {language === 'ar' ? 'مقارنة الارتباطات' : 'Correlation Comparison'}
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-indigo-50 p-4 rounded-lg">
                  <p className="text-sm text-indigo-600">
                    r<sub>XY</sub> ({language === 'ar' ? 'الأصلي' : 'Zero-Order'})
                  </p>
                  <p className="text-xl font-bold text-indigo-800">{analysisResult.rXY?.toFixed(4)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analysisResult.xVar} ↔ {analysisResult.yVar}
                  </p>
                </div>
                <div className="bg-cyan-50 p-4 rounded-lg">
                  <p className="text-sm text-cyan-600">
                    r<sub>XZ</sub>
                  </p>
                  <p className="text-xl font-bold text-cyan-800">{analysisResult.rXZ?.toFixed(4)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analysisResult.xVar} ↔ {analysisResult.controlVar}
                  </p>
                </div>
                <div className="bg-teal-50 p-4 rounded-lg">
                  <p className="text-sm text-teal-600">
                    r<sub>YZ</sub>
                  </p>
                  <p className="text-xl font-bold text-teal-800">{analysisResult.rYZ?.toFixed(4)}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {analysisResult.yVar} ↔ {analysisResult.controlVar}
                  </p>
                </div>
              </div>
              
              {/* Change Analysis */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm">
                  <span className="font-medium">{language === 'ar' ? 'التغير في الارتباط:' : 'Change in correlation:'}</span>{' '}
                  <span className={`font-bold ${Math.abs(analysisResult.r) < Math.abs(analysisResult.rXY) ? 'text-orange-600' : 'text-green-600'}`}>
                    {analysisResult.rXY?.toFixed(4)} → {analysisResult.r?.toFixed(4)}
                    {' '}({Math.abs(analysisResult.r) < Math.abs(analysisResult.rXY) ? '↓' : '↑'})
                  </span>
                </p>
                <p className="text-xs text-gray-600 mt-1">
                  {Math.abs(analysisResult.r) < Math.abs(analysisResult.rXY) * 0.5
                    ? (language === 'ar' 
                      ? `${analysisResult.controlVar} يفسر جزءاً كبيراً من العلاقة بين ${analysisResult.xVar} و ${analysisResult.yVar}`
                      : `${analysisResult.controlVar} explains a large portion of the relationship between ${analysisResult.xVar} and ${analysisResult.yVar}`)
                    : (language === 'ar'
                      ? `العلاقة بين ${analysisResult.xVar} و ${analysisResult.yVar} مستقلة نسبياً عن ${analysisResult.controlVar}`
                      : `The relationship between ${analysisResult.xVar} and ${analysisResult.yVar} is relatively independent of ${analysisResult.controlVar}`)}
                </p>
              </div>
            </div>
            
            {/* Interpretation */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'القوة' : 'Strength'}</p>
                <p className="text-lg font-bold text-blue-800">{analysisResult.strength}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl">
                <p className="text-sm text-cyan-600">{language === 'ar' ? 'الاتجاه' : 'Direction'}</p>
                <p className="text-lg font-bold text-cyan-800">{analysisResult.direction}</p>
              </div>
            </div>
            
            {/* Conclusion */}
            <div className={`p-4 rounded-xl ${analysisResult.isSignificant ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
              <div className="flex items-start gap-2">
                {analysisResult.isSignificant ? 
                  <CheckCircle className="text-green-600 mt-0.5" size={20} /> : 
                  <AlertCircle className="text-gray-600 mt-0.5" size={20} />
                }
                <div>
                  <span className={`font-semibold ${analysisResult.isSignificant ? 'text-green-800' : 'text-gray-800'}`}>
                    {analysisResult.conclusion}
                  </span>
                  <p className="text-sm text-gray-600 mt-1">
                    {analysisResult.interpretation}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Additional Info */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'معلومات إضافية' : 'Additional Information'}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">n</p>
                  <p className="font-bold">{analysisResult.n}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">R² (Partial)</p>
                  <p className="font-bold">{((analysisResult.r || 0) ** 2 * 100).toFixed(2)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'مستوى الدلالة' : 'Alpha'}</p>
                  <p className="font-bold">0.05</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'نوع الاختبار' : 'Test Type'}</p>
                  <p className="font-bold">{language === 'ar' ? 'ذو طرفين' : 'Two-tailed'}</p>
                </div>
              </div>
            </div>
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
      
      case 'multiple':
        return (
          <div className="space-y-6">
            {/* Main Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">R²</p>
                <p className="text-2xl font-bold text-blue-800">{((analysisResult.rSquared || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                <p className="text-sm text-indigo-600">{language === 'ar' ? 'R² المعدل' : 'Adjusted R²'}</p>
                <p className="text-2xl font-bold text-indigo-800">{((analysisResult.adjustedRSquared || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">F-{language === 'ar' ? 'إحصائي' : 'Statistic'}</p>
                <p className="text-xl font-bold text-purple-800">{(analysisResult.fStatistic || 0).toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">p-value (F)</p>
                <p className={`text-xl font-bold ${(analysisResult.fPValue || 1) < 0.05 ? 'text-green-700' : 'text-gray-700'}`}>
                  {(analysisResult.fPValue || 0).toFixed(4)}
                </p>
              </div>
            </div>
            
            {/* Additional Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">RMSE</p>
                <p className="text-lg font-bold text-green-800">{(analysisResult.rmse || 0).toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl">
                <p className="text-sm text-cyan-600">n</p>
                <p className="text-lg font-bold text-cyan-800">{analysisResult.n}</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl">
                <p className="text-sm text-teal-600">{language === 'ar' ? 'عدد المتغيرات' : 'Variables'}</p>
                <p className="text-lg font-bold text-teal-800">{analysisResult.p}</p>
              </div>
              <div className={`p-4 rounded-xl ${(analysisResult.fPValue || 1) < 0.05 ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
                <p className={`text-sm ${(analysisResult.fPValue || 1) < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'الدلالة' : 'Significance'}
                </p>
                <p className={`text-lg font-bold ${(analysisResult.fPValue || 1) < 0.05 ? 'text-green-800' : 'text-gray-800'}`}>
                  {(analysisResult.fPValue || 1) < 0.05 
                    ? (language === 'ar' ? 'دال ✓' : 'Significant ✓')
                    : (language === 'ar' ? 'غير دال' : 'Not Significant')}
                </p>
              </div>
            </div>
            
            {/* Coefficients Table */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'معاملات الانحدار' : 'Regression Coefficients'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">{language === 'ar' ? 'المتغير' : 'Variable'}</th>
                      <th className="p-2 text-right">β</th>
                      <th className="p-2 text-right">SE</th>
                      <th className="p-2 text-right">t-value</th>
                      <th className="p-2 text-right">p-value</th>
                      <th className="p-2 text-right">VIF</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.variableNames?.map((name: string, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{name}</td>
                        <td className="p-2">{analysisResult.coefficients?.[i]?.toFixed(4)}</td>
                        <td className="p-2">{analysisResult.standardErrors?.[i]?.toFixed(4)}</td>
                        <td className="p-2">{analysisResult.tStatistics?.[i]?.toFixed(4)}</td>
                        <td className={`p-2 font-bold ${(analysisResult.pValues?.[i] || 1) < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                          {analysisResult.pValues?.[i]?.toFixed(4)} 
                          {(analysisResult.pValues?.[i] || 1) < 0.001 ? ' ***' : (analysisResult.pValues?.[i] || 1) < 0.01 ? ' **' : (analysisResult.pValues?.[i] || 1) < 0.05 ? ' *' : ''}
                        </td>
                        <td className={`p-2 ${i > 0 && (analysisResult.vif?.[i-1] || 0) > 5 ? 'text-red-600 font-bold' : ''}`}>
                          {i > 0 ? analysisResult.vif?.[i-1]?.toFixed(2) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                {language === 'ar' 
                  ? '* p < 0.05, ** p < 0.01, *** p < 0.001 | VIF > 5 يشير إلى تعدد الخطية' 
                  : '* p < 0.05, ** p < 0.01, *** p < 0.001 | VIF > 5 indicates multicollinearity'}
              </p>
            </div>
            
            {/* ANOVA Table */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'جدول تحليل التباين (ANOVA)' : 'ANOVA Table'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">{language === 'ar' ? 'المصدر' : 'Source'}</th>
                      <th className="p-2 text-right">df</th>
                      <th className="p-2 text-right">SS</th>
                      <th className="p-2 text-right">MS</th>
                      <th className="p-2 text-right">F</th>
                      <th className="p-2 text-right">p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.anovaTable?.map((row: any, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">
                          {row.source === 'Regression' ? (language === 'ar' ? 'الانحدار' : 'Regression') :
                           row.source === 'Residual' ? (language === 'ar' ? 'البواقي' : 'Residual') :
                           (language === 'ar' ? 'الإجمالي' : 'Total')}
                        </td>
                        <td className="p-2">{row.df}</td>
                        <td className="p-2">{row.ss?.toFixed(4)}</td>
                        <td className="p-2">{row.ms > 0 ? row.ms.toFixed(4) : '-'}</td>
                        <td className="p-2">{row.f > 0 ? row.f.toFixed(4) : '-'}</td>
                        <td className="p-2">{row.pValue > 0 ? row.pValue.toFixed(4) : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Actual vs Predicted Plot */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'القيم الفعلية مقابل المتوقعة' : 'Actual vs Predicted'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="predicted" name={language === 'ar' ? 'المتوقع' : 'Predicted'} />
                  <YAxis dataKey="actual" name={language === 'ar' ? 'الفعلي' : 'Actual'} />
                  <Tooltip />
                  <Scatter data={analysisResult.scatterData} fill="#6366f1" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'polynomial':
        return (
          <div className="space-y-6">
            {/* Main Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">R²</p>
                <p className="text-2xl font-bold text-blue-800">{((analysisResult.rSquared || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                <p className="text-sm text-indigo-600">{language === 'ar' ? 'R² المعدل' : 'Adjusted R²'}</p>
                <p className="text-2xl font-bold text-indigo-800">{((analysisResult.adjustedRSquared || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'الدرجة' : 'Degree'}</p>
                <p className="text-2xl font-bold text-purple-800">{analysisResult.degree}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">p-value (F)</p>
                <p className={`text-xl font-bold ${(analysisResult.fPValue || 1) < 0.05 ? 'text-green-700' : 'text-gray-700'}`}>
                  {(analysisResult.fPValue || 0).toFixed(4)}
                </p>
              </div>
            </div>
            
            {/* Equation */}
            <div className="bg-indigo-50 p-4 rounded-xl">
              <p className="text-sm text-indigo-600 mb-1">{language === 'ar' ? 'معادلة الانحدار' : 'Regression Equation'}</p>
              <p className="text-lg font-mono font-bold text-indigo-800 overflow-x-auto">{analysisResult.equation}</p>
            </div>
            
            {/* Additional Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">RMSE</p>
                <p className="text-lg font-bold text-green-800">{(analysisResult.rmse || 0).toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl">
                <p className="text-sm text-cyan-600">F-{language === 'ar' ? 'إحصائي' : 'Statistic'}</p>
                <p className="text-lg font-bold text-cyan-800">{(analysisResult.fStatistic || 0).toFixed(4)}</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl">
                <p className="text-sm text-teal-600">n</p>
                <p className="text-lg font-bold text-teal-800">{analysisResult.n}</p>
              </div>
              <div className={`p-4 rounded-xl ${(analysisResult.fPValue || 1) < 0.05 ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
                <p className={`text-sm ${(analysisResult.fPValue || 1) < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'الدلالة' : 'Significance'}
                </p>
                <p className={`text-lg font-bold ${(analysisResult.fPValue || 1) < 0.05 ? 'text-green-800' : 'text-gray-800'}`}>
                  {(analysisResult.fPValue || 1) < 0.05 
                    ? (language === 'ar' ? 'دال ✓' : 'Significant ✓')
                    : (language === 'ar' ? 'غير دال' : 'Not Significant')}
                </p>
              </div>
            </div>
            
            {/* Coefficients Table */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'معاملات الانحدار' : 'Regression Coefficients'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">{language === 'ar' ? 'الحد' : 'Term'}</th>
                      <th className="p-2 text-right">β</th>
                      <th className="p-2 text-right">SE</th>
                      <th className="p-2 text-right">t-value</th>
                      <th className="p-2 text-right">p-value</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">{language === 'ar' ? 'الثابت' : 'Intercept'}</td>
                      <td className="p-2">{analysisResult.coefficients?.[0]?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.standardErrors?.[0]?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.tStatistics?.[0]?.toFixed(4)}</td>
                      <td className={`p-2 font-bold ${(analysisResult.pValues?.[0] || 1) < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                        {analysisResult.pValues?.[0]?.toFixed(4)}
                      </td>
                    </tr>
                    {Array.from({ length: analysisResult.degree || 0 }, (_, d) => (
                      <tr key={d} className="border-b">
                        <td className="p-2 font-medium">x{d === 0 ? '' : <sup>{d + 1}</sup>}</td>
                        <td className="p-2">{analysisResult.coefficients?.[d + 1]?.toFixed(4)}</td>
                        <td className="p-2">{analysisResult.standardErrors?.[d + 1]?.toFixed(4)}</td>
                        <td className="p-2">{analysisResult.tStatistics?.[d + 1]?.toFixed(4)}</td>
                        <td className={`p-2 font-bold ${(analysisResult.pValues?.[d + 1] || 1) < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                          {analysisResult.pValues?.[d + 1]?.toFixed(4)}
                          {(analysisResult.pValues?.[d + 1] || 1) < 0.001 ? ' ***' : (analysisResult.pValues?.[d + 1] || 1) < 0.01 ? ' **' : (analysisResult.pValues?.[d + 1] || 1) < 0.05 ? ' *' : ''}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Polynomial Curve */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'منحنى الانحدار متعدد الحدود' : 'Polynomial Regression Curve'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" domain={['dataMin', 'dataMax']} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Scatter data={analysisResult.scatterData} fill="#6366f1" name={language === 'ar' ? 'البيانات' : 'Data'} />
                  <Line 
                    data={analysisResult.curvePoints} 
                    dataKey="predicted" 
                    stroke="#ef4444" 
                    strokeWidth={2} 
                    dot={false} 
                    name={language === 'ar' ? 'المنحنى' : 'Curve'}
                    type="monotone"
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            
            {/* Residuals */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'البواقي' : 'Residuals'}</h4>
              <ResponsiveContainer width="100%" height={200}>
                <ScatterChart>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="predicted" name={language === 'ar' ? 'المتوقع' : 'Predicted'} />
                  <YAxis dataKey="residual" name={language === 'ar' ? 'البواقي' : 'Residual'} />
                  <Tooltip />
                  <Scatter data={analysisResult.scatterData} fill="#10b981" />
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'logistic':
        return (
          <div className="space-y-6">
            {/* Model Performance */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'الدقة' : 'Accuracy'}</p>
                <p className="text-2xl font-bold text-blue-800">{((analysisResult.accuracy || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'الحساسية' : 'Sensitivity'}</p>
                <p className="text-2xl font-bold text-green-800">{((analysisResult.sensitivity || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'الخصوصية' : 'Specificity'}</p>
                <p className="text-2xl font-bold text-purple-800">{((analysisResult.specificity || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">AUC</p>
                <p className="text-2xl font-bold text-orange-800">{(analysisResult.auc || 0).toFixed(3)}</p>
              </div>
            </div>
            
            {/* Pseudo R-Squared */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-4 rounded-xl">
                <p className="text-sm text-indigo-600">McFadden R²</p>
                <p className="text-xl font-bold text-indigo-800">{((analysisResult.pseudoRSquaredMcFadden || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-cyan-50 to-cyan-100 p-4 rounded-xl">
                <p className="text-sm text-cyan-600">Cox & Snell R²</p>
                <p className="text-xl font-bold text-cyan-800">{((analysisResult.pseudoRSquaredCoxSnell || 0) * 100).toFixed(2)}%</p>
              </div>
              <div className="bg-gradient-to-br from-teal-50 to-teal-100 p-4 rounded-xl">
                <p className="text-sm text-teal-600">Nagelkerke R²</p>
                <p className="text-xl font-bold text-teal-800">{((analysisResult.pseudoRSquaredNagelkerke || 0) * 100).toFixed(2)}%</p>
              </div>
            </div>
            
            {/* Coefficients Table */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'معاملات الانحدار اللوجستي' : 'Logistic Regression Coefficients'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">{language === 'ar' ? 'المتغير' : 'Variable'}</th>
                      <th className="p-2 text-right">β</th>
                      <th className="p-2 text-right">SE</th>
                      <th className="p-2 text-right">Wald</th>
                      <th className="p-2 text-right">p-value</th>
                      <th className="p-2 text-right">OR</th>
                      <th className="p-2 text-right">95% CI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysisResult.variableNames?.map((name: string, i: number) => (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{name}</td>
                        <td className="p-2">{analysisResult.coefficients?.[i]?.toFixed(4)}</td>
                        <td className="p-2">{analysisResult.standardErrors?.[i]?.toFixed(4)}</td>
                        <td className="p-2">{analysisResult.waldStatistics?.[i]?.toFixed(4)}</td>
                        <td className={`p-2 font-bold ${(analysisResult.pValues?.[i] || 1) < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                          {analysisResult.pValues?.[i]?.toFixed(4)} {(analysisResult.pValues?.[i] || 1) < 0.05 ? '*' : ''}
                        </td>
                        <td className="p-2">{analysisResult.oddsRatios?.[i]?.toFixed(3)}</td>
                        <td className="p-2">
                          [{analysisResult.oddsRatioCI?.[i]?.lower?.toFixed(3)} - {analysisResult.oddsRatioCI?.[i]?.upper?.toFixed(3)}]
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            {/* Confusion Matrix */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'مصفوفة الارتباك' : 'Confusion Matrix'}</h4>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600">{language === 'ar' ? 'إيجابي صحيح' : 'True Positive'}</p>
                  <p className="text-2xl font-bold text-green-800">{analysisResult.confusionMatrix?.tp}</p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-red-600">{language === 'ar' ? 'إيجابي خاطئ' : 'False Positive'}</p>
                  <p className="text-2xl font-bold text-red-800">{analysisResult.confusionMatrix?.fp}</p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-red-600">{language === 'ar' ? 'سلبي خاطئ' : 'False Negative'}</p>
                  <p className="text-2xl font-bold text-red-800">{analysisResult.confusionMatrix?.fn}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600">{language === 'ar' ? 'سلبي صحيح' : 'True Negative'}</p>
                  <p className="text-2xl font-bold text-green-800">{analysisResult.confusionMatrix?.tn}</p>
                </div>
              </div>
            </div>
            
            {/* Additional Metrics */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'مقاييس إضافية' : 'Additional Metrics'}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'الدقة (Precision)' : 'Precision'}</p>
                  <p className="font-bold">{((analysisResult.precision || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">F1 Score</p>
                  <p className="font-bold">{((analysisResult.f1Score || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">AIC</p>
                  <p className="font-bold">{analysisResult.aic?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">BIC</p>
                  <p className="font-bold">{analysisResult.bic?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">Log-Likelihood</p>
                  <p className="font-bold">{analysisResult.logLikelihood?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'الانحراف' : 'Deviance'}</p>
                  <p className="font-bold">{analysisResult.devianceResidual?.toFixed(2)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">n</p>
                  <p className="font-bold">{analysisResult.n}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'التقارب' : 'Convergence'}</p>
                  <p className={`font-bold ${analysisResult.convergence ? 'text-green-600' : 'text-orange-600'}`}>
                    {analysisResult.convergence ? '✓' : '✗'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Hosmer-Lemeshow Test */}
            <div className={`p-4 rounded-xl ${(analysisResult.hosmerLemeshow?.pValue || 0) > 0.05 ? 'bg-green-50 border border-green-200' : 'bg-orange-50 border border-orange-200'}`}>
              <h4 className="font-semibold mb-2">{language === 'ar' ? 'اختبار هوسمر-ليميشو لجودة المطابقة' : 'Hosmer-Lemeshow Goodness-of-Fit'}</h4>
              <div className="flex items-center gap-4">
                <span>χ² = {analysisResult.hosmerLemeshow?.statistic?.toFixed(4)}</span>
                <span>df = {analysisResult.hosmerLemeshow?.df}</span>
                <span className={`font-bold ${(analysisResult.hosmerLemeshow?.pValue || 0) > 0.05 ? 'text-green-700' : 'text-orange-700'}`}>
                  p = {analysisResult.hosmerLemeshow?.pValue?.toFixed(4)}
                </span>
              </div>
              <p className="mt-2 text-sm">
                {(analysisResult.hosmerLemeshow?.pValue || 0) > 0.05 
                  ? (language === 'ar' ? '✓ النموذج يطابق البيانات بشكل جيد' : '✓ Model fits the data well')
                  : (language === 'ar' ? '✗ النموذج قد لا يطابق البيانات بشكل جيد' : '✗ Model may not fit the data well')}
              </p>
            </div>
            
            {/* Logistic Curve */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'منحنى الانحدار اللوجستي' : 'Logistic Regression Curve'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <ComposedChart data={analysisResult.curveData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="x" type="number" />
                  <YAxis domain={[0, 1]} />
                  <Tooltip />
                  <Legend />
                  <Scatter dataKey="y" fill="#6366f1" name={language === 'ar' ? 'الفعلي' : 'Actual'} />
                  <Line dataKey="prob" stroke="#ef4444" strokeWidth={2} dot={false} name={language === 'ar' ? 'الاحتمال' : 'Probability'} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      
      case 'logistic_class':
        return (
          <div className="space-y-6">
            {/* Model Performance */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'الدقة' : 'Accuracy'}</p>
                <p className="text-2xl font-bold text-blue-800">{((analysisResult.accuracy || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'الحساسية' : 'Sensitivity'}</p>
                <p className="text-2xl font-bold text-green-800">{((analysisResult.sensitivity || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'الخصوصية' : 'Specificity'}</p>
                <p className="text-2xl font-bold text-purple-800">{((analysisResult.specificity || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">AUC</p>
                <p className="text-2xl font-bold text-orange-800">{(analysisResult.auc || 0).toFixed(3)}</p>
              </div>
            </div>
            
            {/* ROC Curve */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'منحنى ROC' : 'ROC Curve'}</h4>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analysisResult.rocPoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fpr" name="FPR" label={{ value: 'FPR (1 - Specificity)', position: 'bottom' }} />
                  <YAxis dataKey="tpr" name="TPR" label={{ value: 'TPR (Sensitivity)', angle: -90, position: 'left' }} />
                  <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value} />
                  <Legend />
                  <Line type="monotone" dataKey="tpr" stroke="#6366f1" strokeWidth={2} dot={false} name="ROC Curve" />
                  <Line type="monotone" data={[{fpr: 0, tpr: 0}, {fpr: 1, tpr: 1}]} dataKey="tpr" stroke="#ccc" strokeDasharray="5 5" dot={false} name="Random" />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                <div className="bg-indigo-50 p-3 rounded-lg">
                  <p className="text-indigo-600">{language === 'ar' ? 'الحد الأمثل' : 'Optimal Threshold'}</p>
                  <p className="font-bold">{analysisResult.optimalThreshold?.toFixed(3)}</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-green-600">Gini Coefficient</p>
                  <p className="font-bold">{analysisResult.giniCoefficient?.toFixed(3)}</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-purple-600">{language === 'ar' ? 'عند الحد الأمثل' : 'At Optimal'}</p>
                  <p className="font-bold">Sens: {(analysisResult.optimalSensitivity * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
            
            {/* Confusion Matrix */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'مصفوفة الارتباك' : 'Confusion Matrix'}</h4>
              <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600">TP</p>
                  <p className="text-2xl font-bold text-green-800">{analysisResult.confusionMatrix?.tp}</p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-red-600">FP</p>
                  <p className="text-2xl font-bold text-red-800">{analysisResult.confusionMatrix?.fp}</p>
                </div>
                <div className="bg-red-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-red-600">FN</p>
                  <p className="text-2xl font-bold text-red-800">{analysisResult.confusionMatrix?.fn}</p>
                </div>
                <div className="bg-green-100 p-4 rounded-lg text-center">
                  <p className="text-sm text-green-600">TN</p>
                  <p className="text-2xl font-bold text-green-800">{analysisResult.confusionMatrix?.tn}</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'confusion_matrix':
        return (
          <div className="space-y-6">
            {/* Main Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">{language === 'ar' ? 'الدقة' : 'Accuracy'}</p>
                <p className="text-2xl font-bold text-blue-800">{((analysisResult.accuracy || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">{language === 'ar' ? 'الحساسية' : 'Sensitivity'}</p>
                <p className="text-2xl font-bold text-green-800">{((analysisResult.recall || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'الخصوصية' : 'Specificity'}</p>
                <p className="text-2xl font-bold text-purple-800">{((analysisResult.specificity || 0) * 100).toFixed(1)}%</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">F1 Score</p>
                <p className="text-2xl font-bold text-orange-800">{((analysisResult.f1 || 0) * 100).toFixed(1)}%</p>
              </div>
            </div>
            
            {/* Confusion Matrix Visual */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'مصفوفة الارتباك' : 'Confusion Matrix'}</h4>
              <div className="max-w-md mx-auto">
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div></div>
                  <div className="font-semibold text-gray-600">{language === 'ar' ? 'متوقع 0' : 'Pred 0'}</div>
                  <div className="font-semibold text-gray-600">{language === 'ar' ? 'متوقع 1' : 'Pred 1'}</div>
                  <div className="font-semibold text-gray-600">{language === 'ar' ? 'فعلي 0' : 'Actual 0'}</div>
                  <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-sm text-green-600">TN</p>
                    <p className="text-2xl font-bold text-green-800">{analysisResult.tn}</p>
                  </div>
                  <div className="bg-red-100 p-4 rounded-lg">
                    <p className="text-sm text-red-600">FP</p>
                    <p className="text-2xl font-bold text-red-800">{analysisResult.fp}</p>
                  </div>
                  <div className="font-semibold text-gray-600">{language === 'ar' ? 'فعلي 1' : 'Actual 1'}</div>
                  <div className="bg-red-100 p-4 rounded-lg">
                    <p className="text-sm text-red-600">FN</p>
                    <p className="text-2xl font-bold text-red-800">{analysisResult.fn}</p>
                  </div>
                  <div className="bg-green-100 p-4 rounded-lg">
                    <p className="text-sm text-green-600">TP</p>
                    <p className="text-2xl font-bold text-green-800">{analysisResult.tp}</p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Additional Metrics */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'مقاييس إضافية' : 'Additional Metrics'}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'الدقة الإيجابية' : 'Precision (PPV)'}</p>
                  <p className="font-bold">{((analysisResult.precision || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">NPV</p>
                  <p className="font-bold">{((analysisResult.npv || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">FPR</p>
                  <p className="font-bold">{((analysisResult.fpr || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">FNR</p>
                  <p className="font-bold">{((analysisResult.fnr || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">MCC</p>
                  <p className="font-bold">{(analysisResult.mcc || 0).toFixed(3)}</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'الدقة المتوازنة' : 'Balanced Accuracy'}</p>
                  <p className="font-bold">{((analysisResult.balancedAccuracy || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">{language === 'ar' ? 'الانتشار' : 'Prevalence'}</p>
                  <p className="font-bold">{((analysisResult.prevalence || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-gray-600">n</p>
                  <p className="font-bold">{analysisResult.n}</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'roc_curve':
        return (
          <div className="space-y-6">
            {/* Main Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl">
                <p className="text-sm text-blue-600">AUC</p>
                <p className="text-2xl font-bold text-blue-800">{(analysisResult.auc || 0).toFixed(3)}</p>
              </div>
              <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl">
                <p className="text-sm text-green-600">Gini</p>
                <p className="text-2xl font-bold text-green-800">{(analysisResult.giniCoefficient || 0).toFixed(3)}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl">
                <p className="text-sm text-purple-600">{language === 'ar' ? 'الحد الأمثل' : 'Optimal Threshold'}</p>
                <p className="text-2xl font-bold text-purple-800">{(analysisResult.optimalThreshold || 0.5).toFixed(3)}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-xl">
                <p className="text-sm text-orange-600">n</p>
                <p className="text-2xl font-bold text-orange-800">{analysisResult.n}</p>
              </div>
            </div>
            
            {/* ROC Curve */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-4">{language === 'ar' ? 'منحنى ROC' : 'ROC Curve'}</h4>
              <ResponsiveContainer width="100%" height={350}>
                <LineChart data={analysisResult.rocPoints}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis 
                    dataKey="fpr" 
                    type="number" 
                    domain={[0, 1]} 
                    label={{ value: language === 'ar' ? 'معدل الإيجابي الخاطئ (FPR)' : 'False Positive Rate (FPR)', position: 'bottom', offset: 0 }} 
                  />
                  <YAxis 
                    dataKey="tpr" 
                    type="number" 
                    domain={[0, 1]} 
                    label={{ value: language === 'ar' ? 'معدل الإيجابي الصحيح (TPR)' : 'True Positive Rate (TPR)', angle: -90, position: 'left' }} 
                  />
                  <Tooltip formatter={(value) => typeof value === 'number' ? value.toFixed(3) : value} />
                  <Line type="stepAfter" dataKey="tpr" stroke="#6366f1" strokeWidth={2} dot={false} name="ROC Curve" />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-center text-sm text-gray-500 mt-2">
                AUC = {(analysisResult.auc || 0).toFixed(4)} | 
                {analysisResult.auc >= 0.9 ? ' ممتاز / Excellent' : 
                 analysisResult.auc >= 0.8 ? ' جيد جداً / Very Good' :
                 analysisResult.auc >= 0.7 ? ' جيد / Good' :
                 analysisResult.auc >= 0.6 ? ' مقبول / Fair' : ' ضعيف / Poor'}
              </p>
            </div>
            
            {/* At Optimal Threshold */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'الأداء عند الحد الأمثل' : 'Performance at Optimal Threshold'}</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="bg-green-50 p-3 rounded-lg">
                  <p className="text-green-600">{language === 'ar' ? 'الحساسية' : 'Sensitivity'}</p>
                  <p className="font-bold">{((analysisResult.optimalSensitivity || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-blue-600">{language === 'ar' ? 'الخصوصية' : 'Specificity'}</p>
                  <p className="font-bold">{((analysisResult.optimalSpecificity || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg">
                  <p className="text-purple-600">{language === 'ar' ? 'الدقة' : 'Accuracy'}</p>
                  <p className="font-bold">{((analysisResult.accuracy || 0) * 100).toFixed(1)}%</p>
                </div>
                <div className="bg-orange-50 p-3 rounded-lg">
                  <p className="text-orange-600">F1 Score</p>
                  <p className="font-bold">{((analysisResult.f1 || 0) * 100).toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        );
      
      case 'twoway_anova':
        return (
          <div className="space-y-6">
            {/* Main Effects */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl ${analysisResult.isSignificantA ? 'bg-gradient-to-br from-green-50 to-green-100' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
                <p className={`text-sm ${analysisResult.isSignificantA ? 'text-green-600' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'تأثير العامل الأول' : 'Factor 1 Effect'} ({analysisResult.factor1Var})
                </p>
                <p className={`text-xl font-bold ${analysisResult.isSignificantA ? 'text-green-800' : 'text-gray-800'}`}>
                  F = {analysisResult.fA?.toFixed(4)}
                </p>
                <p className={`text-sm ${analysisResult.isSignificantA ? 'text-green-700' : 'text-gray-700'}`}>
                  p = {analysisResult.pA?.toFixed(4)} {analysisResult.isSignificantA ? '✓' : ''}
                </p>
                <p className="text-xs text-gray-500 mt-1">η² = {(analysisResult.etaSquaredA * 100)?.toFixed(2)}%</p>
              </div>
              <div className={`p-4 rounded-xl ${analysisResult.isSignificantB ? 'bg-gradient-to-br from-blue-50 to-blue-100' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
                <p className={`text-sm ${analysisResult.isSignificantB ? 'text-blue-600' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'تأثير العامل الثاني' : 'Factor 2 Effect'} ({analysisResult.factor2Var})
                </p>
                <p className={`text-xl font-bold ${analysisResult.isSignificantB ? 'text-blue-800' : 'text-gray-800'}`}>
                  F = {analysisResult.fB?.toFixed(4)}
                </p>
                <p className={`text-sm ${analysisResult.isSignificantB ? 'text-blue-700' : 'text-gray-700'}`}>
                  p = {analysisResult.pB?.toFixed(4)} {analysisResult.isSignificantB ? '✓' : ''}
                </p>
                <p className="text-xs text-gray-500 mt-1">η² = {(analysisResult.etaSquaredB * 100)?.toFixed(2)}%</p>
              </div>
              <div className={`p-4 rounded-xl ${analysisResult.isSignificantAB ? 'bg-gradient-to-br from-purple-50 to-purple-100' : 'bg-gradient-to-br from-gray-50 to-gray-100'}`}>
                <p className={`text-sm ${analysisResult.isSignificantAB ? 'text-purple-600' : 'text-gray-600'}`}>
                  {language === 'ar' ? 'التفاعل' : 'Interaction'} (A × B)
                </p>
                <p className={`text-xl font-bold ${analysisResult.isSignificantAB ? 'text-purple-800' : 'text-gray-800'}`}>
                  F = {analysisResult.fAB?.toFixed(4)}
                </p>
                <p className={`text-sm ${analysisResult.isSignificantAB ? 'text-purple-700' : 'text-gray-700'}`}>
                  p = {analysisResult.pAB?.toFixed(4)} {analysisResult.isSignificantAB ? '✓' : ''}
                </p>
                <p className="text-xs text-gray-500 mt-1">η² = {(analysisResult.etaSquaredAB * 100)?.toFixed(2)}%</p>
              </div>
            </div>
            
            {/* ANOVA Table */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'جدول تحليل التباين (Two-Way ANOVA)' : 'Two-Way ANOVA Table'}</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="p-2 text-right">{language === 'ar' ? 'المصدر' : 'Source'}</th>
                      <th className="p-2 text-right">SS</th>
                      <th className="p-2 text-right">df</th>
                      <th className="p-2 text-right">MS</th>
                      <th className="p-2 text-right">F</th>
                      <th className="p-2 text-right">p-value</th>
                      <th className="p-2 text-right">η²</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b">
                      <td className="p-2 font-medium">{analysisResult.factor1Var} (A)</td>
                      <td className="p-2">{analysisResult.ssA?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.dfA}</td>
                      <td className="p-2">{analysisResult.msA?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.fA?.toFixed(4)}</td>
                      <td className={`p-2 font-bold ${analysisResult.isSignificantA ? 'text-green-600' : 'text-gray-600'}`}>
                        {analysisResult.pA?.toFixed(4)} {analysisResult.isSignificantA ? '*' : ''}
                      </td>
                      <td className="p-2">{(analysisResult.etaSquaredA * 100)?.toFixed(2)}%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">{analysisResult.factor2Var} (B)</td>
                      <td className="p-2">{analysisResult.ssB?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.dfB}</td>
                      <td className="p-2">{analysisResult.msB?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.fB?.toFixed(4)}</td>
                      <td className={`p-2 font-bold ${analysisResult.isSignificantB ? 'text-green-600' : 'text-gray-600'}`}>
                        {analysisResult.pB?.toFixed(4)} {analysisResult.isSignificantB ? '*' : ''}
                      </td>
                      <td className="p-2">{(analysisResult.etaSquaredB * 100)?.toFixed(2)}%</td>
                    </tr>
                    <tr className="border-b">
                      <td className="p-2 font-medium">A × B</td>
                      <td className="p-2">{analysisResult.ssAB?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.dfAB}</td>
                      <td className="p-2">{analysisResult.msAB?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.fAB?.toFixed(4)}</td>
                      <td className={`p-2 font-bold ${analysisResult.isSignificantAB ? 'text-green-600' : 'text-gray-600'}`}>
                        {analysisResult.pAB?.toFixed(4)} {analysisResult.isSignificantAB ? '*' : ''}
                      </td>
                      <td className="p-2">{(analysisResult.etaSquaredAB * 100)?.toFixed(2)}%</td>
                    </tr>
                    <tr className="border-b bg-gray-50">
                      <td className="p-2 font-medium">{language === 'ar' ? 'الخطأ' : 'Error'}</td>
                      <td className="p-2">{analysisResult.ssWithin?.toFixed(4)}</td>
                      <td className="p-2">{analysisResult.dfWithin}</td>
                      <td className="p-2">{analysisResult.msWithin?.toFixed(4)}</td>
                      <td className="p-2">-</td>
                      <td className="p-2">-</td>
                      <td className="p-2">-</td>
                    </tr>
                    <tr className="bg-gray-100">
                      <td className="p-2 font-bold">{language === 'ar' ? 'الإجمالي' : 'Total'}</td>
                      <td className="p-2 font-bold">{analysisResult.ssTotal?.toFixed(4)}</td>
                      <td className="p-2 font-bold">{analysisResult.dfTotal}</td>
                      <td className="p-2">-</td>
                      <td className="p-2">-</td>
                      <td className="p-2">-</td>
                      <td className="p-2">-</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2">* p {'<'} 0.05</p>
            </div>
            
            {/* Interpretation */}
            <div className="bg-white p-4 rounded-xl border">
              <h4 className="font-semibold mb-3">{language === 'ar' ? 'التفسير' : 'Interpretation'}</h4>
              <div className="space-y-2 text-sm">
                {analysisResult.isSignificantA && (
                  <div className="flex items-start gap-2 text-green-700">
                    <CheckCircle size={16} className="mt-0.5" />
                    <span>
                      {language === 'ar' 
                        ? `يوجد تأثير دال إحصائياً للعامل ${analysisResult.factor1Var} (p = ${analysisResult.pA?.toFixed(4)})` 
                        : `Factor ${analysisResult.factor1Var} has a significant effect (p = ${analysisResult.pA?.toFixed(4)})`}
                    </span>
                  </div>
                )}
                {analysisResult.isSignificantB && (
                  <div className="flex items-start gap-2 text-green-700">
                    <CheckCircle size={16} className="mt-0.5" />
                    <span>
                      {language === 'ar' 
                        ? `يوجد تأثير دال إحصائياً للعامل ${analysisResult.factor2Var} (p = ${analysisResult.pB?.toFixed(4)})` 
                        : `Factor ${analysisResult.factor2Var} has a significant effect (p = ${analysisResult.pB?.toFixed(4)})`}
                    </span>
                  </div>
                )}
                {analysisResult.isSignificantAB && (
                  <div className="flex items-start gap-2 text-purple-700">
                    <CheckCircle size={16} className="mt-0.5" />
                    <span>
                      {language === 'ar' 
                        ? `يوجد تفاعل دال إحصائياً بين العاملين (p = ${analysisResult.pAB?.toFixed(4)})` 
                        : `There is a significant interaction between factors (p = ${analysisResult.pAB?.toFixed(4)})`}
                    </span>
                  </div>
                )}
                {!analysisResult.isSignificantA && !analysisResult.isSignificantB && !analysisResult.isSignificantAB && (
                  <div className="flex items-start gap-2 text-gray-600">
                    <AlertCircle size={16} className="mt-0.5" />
                    <span>
                      {language === 'ar' 
                        ? 'لا توجد تأثيرات دالة إحصائياً' 
                        : 'No significant effects found'}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Additional Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">{language === 'ar' ? 'المتوسط العام' : 'Grand Mean'}</p>
                <p className="font-bold">{analysisResult.grandMean?.toFixed(4)}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">n</p>
                <p className="font-bold">{analysisResult.n}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">{language === 'ar' ? 'مستويات A' : 'A Levels'}</p>
                <p className="font-bold">{analysisResult.factor1Levels?.length}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600">{language === 'ar' ? 'مستويات B' : 'B Levels'}</p>
                <p className="font-bold">{analysisResult.factor2Levels?.length}</p>
              </div>
            </div>
          </div>
        );
      
      case 'error':
        return (
          <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle size={24} />
              <span className="font-semibold">{language === 'ar' ? 'خطأ' : 'Error'}</span>
            </div>
            <p className="mt-2 text-red-700">{analysisResult.message}</p>
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
