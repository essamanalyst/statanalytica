import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n';
import {
  BarChart3, TrendingUp, Calculator, CheckCircle2, XCircle,
  AlertTriangle, ChevronDown, ChevronUp, Play, History,
  Lightbulb, Target, Award, BookOpen,
  ArrowRight, RefreshCw, Settings,
  PieChart, Activity, Layers, GitBranch, BarChart2
} from 'lucide-react';

interface StatisticalTestsProps {
  data: Record<string, any>[];
  columns: string[];
}

interface TestResult {
  testName: string;
  testNameAr: string;
  statistic: number;
  pValue: number;
  df?: number | string;
  effectSize?: number;
  effectSizeType?: string;
  effectSizeInterpretation?: string;
  confidenceInterval?: [number, number];
  conclusion: string;
  conclusionAr: string;
  interpretation: string;
  interpretationAr: string;
  assumptions: { name: string; nameAr: string; met: boolean; details: string; detailsAr: string }[];
  additionalStats: { label: string; labelAr: string; value: string | number }[];
  recommendations: string[];
  recommendationsAr: string[];
}

// ==================== الدوال الإحصائية الأساسية ====================

const mean = (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length;

const median = (arr: number[]): number => {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const variance = (arr: number[], sample = true): number => {
  const m = mean(arr);
  const squaredDiffs = arr.map(x => (x - m) ** 2);
  return squaredDiffs.reduce((a, b) => a + b, 0) / (arr.length - (sample ? 1 : 0));
};

const std = (arr: number[], sample = true): number => Math.sqrt(variance(arr, sample));

const skewness = (arr: number[]): number => {
  const n = arr.length;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  const m3 = arr.reduce((acc, x) => acc + ((x - m) / s) ** 3, 0) / n;
  return m3 * (n * n) / ((n - 1) * (n - 2));
};

const kurtosis = (arr: number[]): number => {
  const n = arr.length;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  const m4 = arr.reduce((acc, x) => acc + ((x - m) / s) ** 4, 0) / n;
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * m4 - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
};

const covariance = (x: number[], y: number[]): number => {
  const mx = mean(x);
  const my = mean(y);
  return x.reduce((acc, xi, i) => acc + (xi - mx) * (y[i] - my), 0) / (x.length - 1);
};

const ranks = (arr: number[]): number[] => {
  const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const result = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) result[sorted[k].i] = avgRank;
    i = j;
  }
  return result;
};

// ==================== دوال التوزيعات الإحصائية ====================

const gammaLn = (z: number): number => {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let x = z;
  let y = z;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
};

const gammaIncomplete = (a: number, x: number): number => {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;
  
  const gln = gammaLn(a);
  
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 1; n <= 100; n++) {
      ap++;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-10) {
        return sum * Math.exp(-x + a * Math.log(x) - gln);
      }
    }
  } else {
    let b = x + 1 - a;
    let c = 1 / 1e-30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i <= 100; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-10) {
        return 1 - h * Math.exp(-x + a * Math.log(x) - gln);
      }
    }
  }
  return a < x ? 1 : 0;
};

const betaIncomplete = (a: number, b: number, x: number): number => {
  if (x === 0 || x === 1) return x;
  if (x < 0 || x > 1) return 0;
  
  const bt = Math.exp(gammaLn(a + b) - gammaLn(a) - gammaLn(b) + 
             a * Math.log(x) + b * Math.log(1 - x));
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(a, b, x) / a;
  } else {
    return 1 - bt * betaCF(b, a, 1 - x) / b;
  }
};

const betaCF = (a: number, b: number, x: number): number => {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= 100; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-10) break;
  }
  return h;
};

const normalCDF = (x: number): number => {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
};

const normalQuantile = (p: number): number => {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  
  const a = [
    -3.969683028665376e+01, 2.209460984245205e+02,
    -2.759285104469687e+02, 1.383577518672690e+02,
    -3.066479806614716e+01, 2.506628277459239e+00
  ];
  const b = [
    -5.447609879822406e+01, 1.615858368580409e+02,
    -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01
  ];
  const c = [
    -7.784894002430293e-03, -3.223964580411365e-01,
    -2.400758277161838e+00, -2.549732539343734e+00,
    4.374664141464968e+00, 2.938163982698783e+00
  ];
  const d = [
    7.784695709041462e-03, 3.224671290700398e-01,
    2.445134137142996e+00, 3.754408661907416e+00
  ];
  
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
           ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
           (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
            ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
};

const tCDF = (t: number, df: number): number => {
  const x = df / (df + t * t);
  return 1 - 0.5 * betaIncomplete(df / 2, 0.5, x);
};

const tPValue = (t: number, df: number, twoTailed = true): number => {
  const p = t > 0 ? 1 - tCDF(t, df) : tCDF(t, df);
  return twoTailed ? 2 * Math.min(p, 1 - p) : p;
};

const fCDF = (f: number, df1: number, df2: number): number => {
  if (f <= 0) return 0;
  const x = df1 * f / (df1 * f + df2);
  return betaIncomplete(df1 / 2, df2 / 2, x);
};

const fPValue = (f: number, df1: number, df2: number): number => {
  return 1 - fCDF(f, df1, df2);
};

const chiSquareCDF = (x: number, df: number): number => {
  if (x <= 0) return 0;
  return gammaIncomplete(df / 2, x / 2);
};

const chiSquarePValue = (x: number, df: number): number => {
  return 1 - chiSquareCDF(x, df);
};

// ==================== اختبار شابيرو-ويلك ====================

const shapiroWilkTest = (data: number[]): { W: number; pValue: number } => {
  const n = data.length;
  if (n < 3 || n > 5000) return { W: 0, pValue: 0 };
  
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(sorted);
  const ss = sorted.reduce((acc, x) => acc + (x - m) ** 2, 0);
  
  if (ss === 0) return { W: 1, pValue: 1 };
  
  // حساب معاملات a
  const a: number[] = [];
  const m_vals: number[] = [];
  
  for (let i = 0; i < n; i++) {
    m_vals.push(normalQuantile((i + 1 - 0.375) / (n + 0.25)));
  }
  
  const m_sum = m_vals.reduce((acc, x) => acc + x * x, 0);
  
  for (let i = 0; i < n; i++) {
    a.push(m_vals[i] / Math.sqrt(m_sum));
  }
  
  // حساب W
  let b = 0;
  for (let i = 0; i < Math.floor(n / 2); i++) {
    b += a[n - 1 - i] * (sorted[n - 1 - i] - sorted[i]);
  }
  
  const W = (b * b) / ss;
  
  // تقريب p-value
  const mu = 0.0038915 * Math.log(n) ** 3 - 0.083751 * Math.log(n) ** 2 - 0.31082 * Math.log(n) - 1.5861;
  const sigma = Math.exp(0.0030302 * Math.log(n) ** 2 - 0.082676 * Math.log(n) - 0.4803);
  const z = (Math.log(1 - W) - mu) / sigma;
  const pValue = 1 - normalCDF(z);
  
  return { W: Math.min(W, 1), pValue: Math.max(0, Math.min(1, pValue)) };
};

// ==================== اختبار Kolmogorov-Smirnov ====================

const kolmogorovSmirnovTest = (data: number[]): { D: number; pValue: number } => {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(data);
  const s = std(data);
  
  let dPlus = 0;
  let dMinus = 0;
  
  for (let i = 0; i < n; i++) {
    const z = (sorted[i] - m) / s;
    const cdf = normalCDF(z);
    const empiricalCdf = (i + 1) / n;
    const prevEmpiricalCdf = i / n;
    
    dPlus = Math.max(dPlus, empiricalCdf - cdf);
    dMinus = Math.max(dMinus, cdf - prevEmpiricalCdf);
  }
  
  const D = Math.max(dPlus, dMinus);
  
  // تقريب p-value باستخدام صيغة تقريبية
  const sqrtN = Math.sqrt(n);
  const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * D;
  let pValue = 0;
  
  for (let k = 1; k <= 100; k++) {
    pValue += 2 * ((-1) ** (k - 1)) * Math.exp(-2 * k * k * lambda * lambda);
  }
  
  return { D, pValue: Math.max(0, Math.min(1, pValue)) };
};

// ==================== اختبار Anderson-Darling ====================

const andersonDarlingTest = (data: number[]): { A2: number; pValue: number } => {
  const n = data.length;
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(data);
  const s = std(data);
  
  let S = 0;
  for (let i = 0; i < n; i++) {
    const z = (sorted[i] - m) / s;
    const cdf = normalCDF(z);
    const safeCdf = Math.max(1e-10, Math.min(1 - 1e-10, cdf));
    S += (2 * (i + 1) - 1) * (Math.log(safeCdf) + Math.log(1 - normalCDF((sorted[n - 1 - i] - m) / s)));
  }
  
  const A2 = -n - S / n;
  const A2adj = A2 * (1 + 0.75 / n + 2.25 / (n * n));
  
  // حساب p-value
  let pValue: number;
  if (A2adj >= 0.6) {
    pValue = Math.exp(1.2937 - 5.709 * A2adj + 0.0186 * A2adj * A2adj);
  } else if (A2adj >= 0.34) {
    pValue = Math.exp(0.9177 - 4.279 * A2adj - 1.38 * A2adj * A2adj);
  } else if (A2adj >= 0.2) {
    pValue = 1 - Math.exp(-8.318 + 42.796 * A2adj - 59.938 * A2adj * A2adj);
  } else {
    pValue = 1 - Math.exp(-13.436 + 101.14 * A2adj - 223.73 * A2adj * A2adj);
  }
  
  return { A2: A2adj, pValue: Math.max(0, Math.min(1, pValue)) };
};

// ==================== اختبار Jarque-Bera ====================

const jarqueBeraTest = (data: number[]): { JB: number; pValue: number } => {
  const n = data.length;
  const S = skewness(data);
  const K = kurtosis(data);
  
  const JB = (n / 6) * (S * S + (K * K) / 4);
  const pValue = chiSquarePValue(JB, 2);
  
  return { JB, pValue };
};

// ==================== اختبار ليفين ====================

const leveneTest = (groups: number[][]): { W: number; pValue: number } => {
  const k = groups.length;
  const N = groups.reduce((acc, g) => acc + g.length, 0);
  
  // حساب الانحرافات المطلقة عن الوسيط
  const deviations = groups.map(group => {
    const med = median(group);
    return group.map(x => Math.abs(x - med));
  });
  
  const groupMeans = deviations.map(d => mean(d));
  const grandMean = mean(deviations.flat());
  
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 0; i < k; i++) {
    numerator += deviations[i].length * (groupMeans[i] - grandMean) ** 2;
    denominator += deviations[i].reduce((acc, x) => acc + (x - groupMeans[i]) ** 2, 0);
  }
  
  const W = ((N - k) / (k - 1)) * (numerator / denominator);
  const pValue = fPValue(W, k - 1, N - k);
  
  return { W, pValue };
};

// ==================== اختبار بارتليت ====================

const bartlettTest = (groups: number[][]): { chi2: number; pValue: number } => {
  const k = groups.length;
  const n = groups.map(g => g.length);
  const N = n.reduce((a, b) => a + b, 0);
  
  const variances = groups.map(g => variance(g));
  const pooledVar = groups.reduce((acc, g, i) => acc + (n[i] - 1) * variances[i], 0) / (N - k);
  
  let numerator = (N - k) * Math.log(pooledVar);
  numerator -= groups.reduce((acc, g, i) => acc + (n[i] - 1) * Math.log(variances[i]), 0);
  
  const c = 1 + (1 / (3 * (k - 1))) * (groups.reduce((acc, g, i) => acc + 1 / (n[i] - 1), 0) - 1 / (N - k));
  
  const chi2 = numerator / c;
  const pValue = chiSquarePValue(chi2, k - 1);
  
  return { chi2, pValue };
};

// ==================== اختبار Durbin-Watson ====================

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const _durbinWatsonTest = (residuals: number[]): { DW: number; interpretation: string; interpretationAr: string } => {
  const n = residuals.length;
  let numerator = 0;
  let denominator = 0;
  
  for (let i = 1; i < n; i++) {
    numerator += (residuals[i] - residuals[i - 1]) ** 2;
  }
  
  for (let i = 0; i < n; i++) {
    denominator += residuals[i] ** 2;
  }
  
  const DW = numerator / denominator;
  
  let interpretation: string;
  let interpretationAr: string;
  
  if (DW < 1.5) {
    interpretation = 'Positive autocorrelation detected';
    interpretationAr = 'ارتباط ذاتي موجب';
  } else if (DW > 2.5) {
    interpretation = 'Negative autocorrelation detected';
    interpretationAr = 'ارتباط ذاتي سالب';
  } else {
    interpretation = 'No significant autocorrelation';
    interpretationAr = 'لا يوجد ارتباط ذاتي معنوي';
  }
  
  return { DW, interpretation, interpretationAr };
};

// ==================== الاختبارات الإحصائية الرئيسية ====================

const runOneSampleTTest = (data: number[], mu0: number, alpha: number): TestResult => {
  const n = data.length;
  const xbar = mean(data);
  const s = std(data);
  const se = s / Math.sqrt(n);
  const t = (xbar - mu0) / se;
  const df = n - 1;
  const pValue = tPValue(t, df);
  
  const tCrit = 1.96; // تقريب
  const ci: [number, number] = [xbar - tCrit * se, xbar + tCrit * se];
  
  const cohensD = (xbar - mu0) / s;
  
  const shapiro = shapiroWilkTest(data);
  
  return {
    testName: 'One-Sample T-Test',
    testNameAr: 'اختبار t للعينة الواحدة',
    statistic: t,
    pValue,
    df,
    effectSize: Math.abs(cohensD),
    effectSizeType: "Cohen's d",
    effectSizeInterpretation: Math.abs(cohensD) < 0.2 ? 'Small' : Math.abs(cohensD) < 0.8 ? 'Medium' : 'Large',
    confidenceInterval: ci,
    conclusion: pValue < alpha ? 
      `The sample mean (${xbar.toFixed(3)}) is significantly different from ${mu0}` :
      `The sample mean (${xbar.toFixed(3)}) is not significantly different from ${mu0}`,
    conclusionAr: pValue < alpha ?
      `متوسط العينة (${xbar.toFixed(3)}) يختلف معنوياً عن ${mu0}` :
      `متوسط العينة (${xbar.toFixed(3)}) لا يختلف معنوياً عن ${mu0}`,
    interpretation: pValue < alpha ?
      `With p = ${pValue.toFixed(4)}, we reject the null hypothesis. There is sufficient evidence that the population mean differs from ${mu0}.` :
      `With p = ${pValue.toFixed(4)}, we fail to reject the null hypothesis. There is insufficient evidence that the population mean differs from ${mu0}.`,
    interpretationAr: pValue < alpha ?
      `بقيمة p = ${pValue.toFixed(4)}، نرفض الفرضية الصفرية. يوجد دليل كافٍ على أن متوسط المجتمع يختلف عن ${mu0}.` :
      `بقيمة p = ${pValue.toFixed(4)}، لا نرفض الفرضية الصفرية. لا يوجد دليل كافٍ على أن متوسط المجتمع يختلف عن ${mu0}.`,
    assumptions: [
      {
        name: 'Normality',
        nameAr: 'التوزيع الطبيعي',
        met: shapiro.pValue > 0.05,
        details: `Shapiro-Wilk W = ${shapiro.W.toFixed(4)}, p = ${shapiro.pValue.toFixed(4)}`,
        detailsAr: `شابيرو-ويلك W = ${shapiro.W.toFixed(4)}، p = ${shapiro.pValue.toFixed(4)}`
      },
      {
        name: 'Random Sampling',
        nameAr: 'العينة العشوائية',
        met: true,
        details: 'Assumed to be met',
        detailsAr: 'يُفترض تحققه'
      }
    ],
    additionalStats: [
      { label: 'Sample Mean', labelAr: 'متوسط العينة', value: xbar.toFixed(4) },
      { label: 'Sample Std Dev', labelAr: 'الانحراف المعياري', value: s.toFixed(4) },
      { label: 'Standard Error', labelAr: 'الخطأ المعياري', value: se.toFixed(4) },
      { label: 'Sample Size', labelAr: 'حجم العينة', value: n }
    ],
    recommendations: [
      cohensD < 0.2 ? 'Effect size is small, consider increasing sample size' : '',
      shapiro.pValue < 0.05 ? 'Data may not be normally distributed, consider Wilcoxon test' : ''
    ].filter(Boolean),
    recommendationsAr: [
      cohensD < 0.2 ? 'حجم الأثر صغير، فكر في زيادة حجم العينة' : '',
      shapiro.pValue < 0.05 ? 'البيانات قد لا تتبع التوزيع الطبيعي، فكر في اختبار ويلكوكسون' : ''
    ].filter(Boolean)
  };
};

const runIndependentTTest = (group1: number[], group2: number[], alpha: number): TestResult => {
  const n1 = group1.length, n2 = group2.length;
  const m1 = mean(group1), m2 = mean(group2);
  const v1 = variance(group1), v2 = variance(group2);
  
  // Pooled variance
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const se = sp * Math.sqrt(1/n1 + 1/n2);
  const t = (m1 - m2) / se;
  const df = n1 + n2 - 2;
  const pValue = tPValue(t, df);
  
  const pooledStd = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const cohensD = (m1 - m2) / pooledStd;
  
  const tCrit = 1.96;
  const ci: [number, number] = [(m1 - m2) - tCrit * se, (m1 - m2) + tCrit * se];
  
  const shapiro1 = shapiroWilkTest(group1);
  const shapiro2 = shapiroWilkTest(group2);
  const levene = leveneTest([group1, group2]);
  
  return {
    testName: 'Independent Samples T-Test',
    testNameAr: 'اختبار t للعينات المستقلة',
    statistic: t,
    pValue,
    df,
    effectSize: Math.abs(cohensD),
    effectSizeType: "Cohen's d",
    effectSizeInterpretation: Math.abs(cohensD) < 0.2 ? 'Small' : Math.abs(cohensD) < 0.8 ? 'Medium' : 'Large',
    confidenceInterval: ci,
    conclusion: pValue < alpha ?
      `There is a significant difference between the two groups (${m1.toFixed(3)} vs ${m2.toFixed(3)})` :
      `There is no significant difference between the two groups (${m1.toFixed(3)} vs ${m2.toFixed(3)})`,
    conclusionAr: pValue < alpha ?
      `يوجد فرق معنوي بين المجموعتين (${m1.toFixed(3)} مقابل ${m2.toFixed(3)})` :
      `لا يوجد فرق معنوي بين المجموعتين (${m1.toFixed(3)} مقابل ${m2.toFixed(3)})`,
    interpretation: pValue < alpha ?
      `With p = ${pValue.toFixed(4)} and effect size d = ${Math.abs(cohensD).toFixed(3)}, the difference between groups is statistically significant and ${Math.abs(cohensD) < 0.5 ? 'practically small' : 'practically meaningful'}.` :
      `With p = ${pValue.toFixed(4)}, we cannot conclude that there is a real difference between the groups.`,
    interpretationAr: pValue < alpha ?
      `بقيمة p = ${pValue.toFixed(4)} وحجم أثر d = ${Math.abs(cohensD).toFixed(3)}، الفرق بين المجموعتين دال إحصائياً و${Math.abs(cohensD) < 0.5 ? 'صغير عملياً' : 'ذو معنى عملي'}.` :
      `بقيمة p = ${pValue.toFixed(4)}، لا يمكننا الاستنتاج بوجود فرق حقيقي بين المجموعتين.`,
    assumptions: [
      {
        name: 'Normality (Group 1)',
        nameAr: 'التوزيع الطبيعي (المجموعة 1)',
        met: shapiro1.pValue > 0.05,
        details: `Shapiro-Wilk p = ${shapiro1.pValue.toFixed(4)}`,
        detailsAr: `شابيرو-ويلك p = ${shapiro1.pValue.toFixed(4)}`
      },
      {
        name: 'Normality (Group 2)',
        nameAr: 'التوزيع الطبيعي (المجموعة 2)',
        met: shapiro2.pValue > 0.05,
        details: `Shapiro-Wilk p = ${shapiro2.pValue.toFixed(4)}`,
        detailsAr: `شابيرو-ويلك p = ${shapiro2.pValue.toFixed(4)}`
      },
      {
        name: 'Homogeneity of Variance',
        nameAr: 'تجانس التباين',
        met: levene.pValue > 0.05,
        details: `Levene's W = ${levene.W.toFixed(4)}, p = ${levene.pValue.toFixed(4)}`,
        detailsAr: `ليفين W = ${levene.W.toFixed(4)}، p = ${levene.pValue.toFixed(4)}`
      }
    ],
    additionalStats: [
      { label: 'Group 1 Mean', labelAr: 'متوسط المجموعة 1', value: m1.toFixed(4) },
      { label: 'Group 2 Mean', labelAr: 'متوسط المجموعة 2', value: m2.toFixed(4) },
      { label: 'Mean Difference', labelAr: 'فرق المتوسطات', value: (m1 - m2).toFixed(4) },
      { label: 'Pooled Std Dev', labelAr: 'الانحراف المعياري المجمع', value: pooledStd.toFixed(4) }
    ],
    recommendations: [
      levene.pValue < 0.05 ? "Use Welch's t-test instead due to unequal variances" : '',
      (shapiro1.pValue < 0.05 || shapiro2.pValue < 0.05) ? 'Consider Mann-Whitney U test due to non-normality' : ''
    ].filter(Boolean),
    recommendationsAr: [
      levene.pValue < 0.05 ? 'استخدم اختبار ويلش بسبب عدم تجانس التباين' : '',
      (shapiro1.pValue < 0.05 || shapiro2.pValue < 0.05) ? 'فكر في اختبار مان-ويتني بسبب عدم الطبيعية' : ''
    ].filter(Boolean)
  };
};

const runPairedTTest = (before: number[], after: number[], alpha: number): TestResult => {
  const n = before.length;
  const differences = before.map((b, i) => after[i] - b);
  const dMean = mean(differences);
  const dStd = std(differences);
  const se = dStd / Math.sqrt(n);
  const t = dMean / se;
  const df = n - 1;
  const pValue = tPValue(t, df);
  
  const cohensD = dMean / dStd;
  const tCrit = 1.96;
  const ci: [number, number] = [dMean - tCrit * se, dMean + tCrit * se];
  
  const shapiro = shapiroWilkTest(differences);
  
  return {
    testName: 'Paired Samples T-Test',
    testNameAr: 'اختبار t للعينات المزدوجة',
    statistic: t,
    pValue,
    df,
    effectSize: Math.abs(cohensD),
    effectSizeType: "Cohen's d",
    effectSizeInterpretation: Math.abs(cohensD) < 0.2 ? 'Small' : Math.abs(cohensD) < 0.8 ? 'Medium' : 'Large',
    confidenceInterval: ci,
    conclusion: pValue < alpha ?
      `There is a significant change (mean difference = ${dMean.toFixed(3)})` :
      `There is no significant change (mean difference = ${dMean.toFixed(3)})`,
    conclusionAr: pValue < alpha ?
      `يوجد تغير معنوي (متوسط الفرق = ${dMean.toFixed(3)})` :
      `لا يوجد تغير معنوي (متوسط الفرق = ${dMean.toFixed(3)})`,
    interpretation: pValue < alpha ?
      `The intervention/treatment had a statistically significant effect with ${Math.abs(cohensD) < 0.5 ? 'a small to medium' : 'a large'} practical effect.` :
      `The intervention/treatment did not show a statistically significant effect.`,
    interpretationAr: pValue < alpha ?
      `التدخل/المعالجة له تأثير دال إحصائياً مع تأثير عملي ${Math.abs(cohensD) < 0.5 ? 'صغير إلى متوسط' : 'كبير'}.` :
      `التدخل/المعالجة لم يُظهر تأثيراً دالاً إحصائياً.`,
    assumptions: [
      {
        name: 'Normality of Differences',
        nameAr: 'التوزيع الطبيعي للفروق',
        met: shapiro.pValue > 0.05,
        details: `Shapiro-Wilk p = ${shapiro.pValue.toFixed(4)}`,
        detailsAr: `شابيرو-ويلك p = ${shapiro.pValue.toFixed(4)}`
      },
      {
        name: 'Paired Observations',
        nameAr: 'الملاحظات المزدوجة',
        met: true,
        details: 'Each pair is matched',
        detailsAr: 'كل زوج متطابق'
      }
    ],
    additionalStats: [
      { label: 'Mean Difference', labelAr: 'متوسط الفرق', value: dMean.toFixed(4) },
      { label: 'Std Dev of Differences', labelAr: 'انحراف الفروق', value: dStd.toFixed(4) },
      { label: 'Before Mean', labelAr: 'متوسط قبل', value: mean(before).toFixed(4) },
      { label: 'After Mean', labelAr: 'متوسط بعد', value: mean(after).toFixed(4) }
    ],
    recommendations: [
      shapiro.pValue < 0.05 ? 'Consider Wilcoxon signed-rank test due to non-normality' : ''
    ].filter(Boolean),
    recommendationsAr: [
      shapiro.pValue < 0.05 ? 'فكر في اختبار ويلكوكسون بسبب عدم الطبيعية' : ''
    ].filter(Boolean)
  };
};

const runOneWayANOVA = (groups: number[][], alpha: number): TestResult => {
  const k = groups.length;
  const N = groups.reduce((acc, g) => acc + g.length, 0);
  const grandMean = mean(groups.flat());
  
  let SSB = 0, SSW = 0;
  const groupMeans = groups.map(g => mean(g));
  
  for (let i = 0; i < k; i++) {
    SSB += groups[i].length * (groupMeans[i] - grandMean) ** 2;
    SSW += groups[i].reduce((acc, x) => acc + (x - groupMeans[i]) ** 2, 0);
  }
  
  const dfB = k - 1;
  const dfW = N - k;
  const MSB = SSB / dfB;
  const MSW = SSW / dfW;
  const F = MSB / MSW;
  const pValue = fPValue(F, dfB, dfW);
  
  // Eta squared
  const etaSquared = SSB / (SSB + SSW);
  
  const levene = leveneTest(groups);
  const shapiroResults = groups.map(g => shapiroWilkTest(g));
  
  return {
    testName: 'One-Way ANOVA',
    testNameAr: 'تحليل التباين الأحادي',
    statistic: F,
    pValue,
    df: `${dfB}, ${dfW}`,
    effectSize: etaSquared,
    effectSizeType: 'η² (Eta Squared)',
    effectSizeInterpretation: etaSquared < 0.01 ? 'Small' : etaSquared < 0.06 ? 'Medium' : 'Large',
    confidenceInterval: undefined,
    conclusion: pValue < alpha ?
      `There are significant differences among the ${k} groups` :
      `There are no significant differences among the ${k} groups`,
    conclusionAr: pValue < alpha ?
      `توجد فروق معنوية بين المجموعات الـ ${k}` :
      `لا توجد فروق معنوية بين المجموعات الـ ${k}`,
    interpretation: pValue < alpha ?
      `F(${dfB}, ${dfW}) = ${F.toFixed(3)}, p = ${pValue.toFixed(4)}, η² = ${etaSquared.toFixed(3)}. At least one group mean differs significantly from the others. Consider post-hoc tests to identify which groups differ.` :
      `F(${dfB}, ${dfW}) = ${F.toFixed(3)}, p = ${pValue.toFixed(4)}. The group means are not significantly different.`,
    interpretationAr: pValue < alpha ?
      `F(${dfB}, ${dfW}) = ${F.toFixed(3)}، p = ${pValue.toFixed(4)}، η² = ${etaSquared.toFixed(3)}. واحدة على الأقل من متوسطات المجموعات تختلف معنوياً. فكر في اختبارات المقارنات البعدية.` :
      `F(${dfB}, ${dfW}) = ${F.toFixed(3)}، p = ${pValue.toFixed(4)}. متوسطات المجموعات لا تختلف معنوياً.`,
    assumptions: [
      {
        name: 'Homogeneity of Variance',
        nameAr: 'تجانس التباين',
        met: levene.pValue > 0.05,
        details: `Levene's p = ${levene.pValue.toFixed(4)}`,
        detailsAr: `ليفين p = ${levene.pValue.toFixed(4)}`
      },
      ...shapiroResults.map((s, i) => ({
        name: `Normality (Group ${i + 1})`,
        nameAr: `التوزيع الطبيعي (المجموعة ${i + 1})`,
        met: s.pValue > 0.05,
        details: `Shapiro-Wilk p = ${s.pValue.toFixed(4)}`,
        detailsAr: `شابيرو-ويلك p = ${s.pValue.toFixed(4)}`
      }))
    ],
    additionalStats: [
      { label: 'SS Between', labelAr: 'مجموع المربعات بين', value: SSB.toFixed(4) },
      { label: 'SS Within', labelAr: 'مجموع المربعات داخل', value: SSW.toFixed(4) },
      { label: 'MS Between', labelAr: 'متوسط المربعات بين', value: MSB.toFixed(4) },
      { label: 'MS Within', labelAr: 'متوسط المربعات داخل', value: MSW.toFixed(4) },
      ...groupMeans.map((m, i) => ({ 
        label: `Group ${i + 1} Mean`, 
        labelAr: `متوسط المجموعة ${i + 1}`, 
        value: m.toFixed(4) 
      }))
    ],
    recommendations: [
      pValue < alpha ? 'Conduct post-hoc tests (e.g., Tukey HSD) to identify specific differences' : '',
      levene.pValue < 0.05 ? "Consider Welch's ANOVA due to unequal variances" : '',
      shapiroResults.some(s => s.pValue < 0.05) ? 'Consider Kruskal-Wallis test due to non-normality' : ''
    ].filter(Boolean),
    recommendationsAr: [
      pValue < alpha ? 'قم باختبارات المقارنات البعدية (مثل Tukey HSD) لتحديد الفروق' : '',
      levene.pValue < 0.05 ? 'فكر في استخدام ANOVA ويلش بسبب عدم تجانس التباين' : '',
      shapiroResults.some(s => s.pValue < 0.05) ? 'فكر في اختبار كروسكال-واليس بسبب عدم الطبيعية' : ''
    ].filter(Boolean)
  };
};

const runMannWhitney = (group1: number[], group2: number[], alpha: number): TestResult => {
  const n1 = group1.length, n2 = group2.length;
  const combined = [...group1.map(v => ({ v, g: 1 })), ...group2.map(v => ({ v, g: 2 }))];
  combined.sort((a, b) => a.v - b.v);
  
  // Assign ranks
  const rankedData: { v: number; g: number; rank: number }[] = [];
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].v === combined[i].v) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) {
      rankedData.push({ ...combined[k], rank: avgRank });
    }
    i = j;
  }
  
  const R1 = rankedData.filter(d => d.g === 1).reduce((acc, d) => acc + d.rank, 0);
  const U1 = n1 * n2 + (n1 * (n1 + 1)) / 2 - R1;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  
  // Normal approximation
  const muU = n1 * n2 / 2;
  const sigmaU = Math.sqrt(n1 * n2 * (n1 + n2 + 1) / 12);
  const z = (U - muU) / sigmaU;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  // Effect size (r)
  const r = Math.abs(z) / Math.sqrt(n1 + n2);
  
  return {
    testName: 'Mann-Whitney U Test',
    testNameAr: 'اختبار مان-ويتني',
    statistic: U,
    pValue,
    df: undefined,
    effectSize: r,
    effectSizeType: 'r (Effect Size)',
    effectSizeInterpretation: r < 0.1 ? 'Small' : r < 0.3 ? 'Medium' : 'Large',
    confidenceInterval: undefined,
    conclusion: pValue < alpha ?
      `The distributions of the two groups are significantly different` :
      `The distributions of the two groups are not significantly different`,
    conclusionAr: pValue < alpha ?
      `توزيعات المجموعتين تختلف معنوياً` :
      `توزيعات المجموعتين لا تختلف معنوياً`,
    interpretation: pValue < alpha ?
      `U = ${U.toFixed(2)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}. The groups have significantly different central tendencies.` :
      `U = ${U.toFixed(2)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}. No significant difference in central tendency.`,
    interpretationAr: pValue < alpha ?
      `U = ${U.toFixed(2)}، z = ${z.toFixed(3)}، p = ${pValue.toFixed(4)}. المجموعتان لهما نزعات مركزية مختلفة معنوياً.` :
      `U = ${U.toFixed(2)}، z = ${z.toFixed(3)}، p = ${pValue.toFixed(4)}. لا يوجد فرق معنوي في النزعة المركزية.`,
    assumptions: [
      {
        name: 'Independence',
        nameAr: 'الاستقلالية',
        met: true,
        details: 'Groups are independent',
        detailsAr: 'المجموعات مستقلة'
      },
      {
        name: 'Ordinal Scale',
        nameAr: 'المقياس الترتيبي',
        met: true,
        details: 'Data can be ranked',
        detailsAr: 'البيانات قابلة للترتيب'
      }
    ],
    additionalStats: [
      { label: 'U1', labelAr: 'U1', value: U1.toFixed(2) },
      { label: 'U2', labelAr: 'U2', value: U2.toFixed(2) },
      { label: 'Z-score', labelAr: 'قيمة Z', value: z.toFixed(4) },
      { label: 'Group 1 Median', labelAr: 'وسيط المجموعة 1', value: median(group1).toFixed(4) },
      { label: 'Group 2 Median', labelAr: 'وسيط المجموعة 2', value: median(group2).toFixed(4) }
    ],
    recommendations: [],
    recommendationsAr: []
  };
};

const runWilcoxon = (before: number[], after: number[], alpha: number): TestResult => {
  const n = before.length;
  const differences = before.map((b, i) => after[i] - b);
  const nonZeroDiffs = differences.filter(d => d !== 0);
  const absRanks = ranks(nonZeroDiffs.map(Math.abs));
  
  let wPlus = 0, wMinus = 0;
  nonZeroDiffs.forEach((d, i) => {
    if (d > 0) wPlus += absRanks[i];
    else wMinus += absRanks[i];
  });
  
  const W = Math.min(wPlus, wMinus);
  const nEff = nonZeroDiffs.length;
  
  // Normal approximation
  const muW = nEff * (nEff + 1) / 4;
  const sigmaW = Math.sqrt(nEff * (nEff + 1) * (2 * nEff + 1) / 24);
  const z = (W - muW) / sigmaW;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  const r = Math.abs(z) / Math.sqrt(n);
  
  return {
    testName: 'Wilcoxon Signed-Rank Test',
    testNameAr: 'اختبار ويلكوكسون للرتب',
    statistic: W,
    pValue,
    df: undefined,
    effectSize: r,
    effectSizeType: 'r (Effect Size)',
    effectSizeInterpretation: r < 0.1 ? 'Small' : r < 0.3 ? 'Medium' : 'Large',
    confidenceInterval: undefined,
    conclusion: pValue < alpha ?
      `There is a significant difference between the paired observations` :
      `There is no significant difference between the paired observations`,
    conclusionAr: pValue < alpha ?
      `يوجد فرق معنوي بين الملاحظات المزدوجة` :
      `لا يوجد فرق معنوي بين الملاحظات المزدوجة`,
    interpretation: pValue < alpha ?
      `W = ${W.toFixed(2)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}. The treatment/intervention had a significant effect.` :
      `W = ${W.toFixed(2)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}. No significant effect detected.`,
    interpretationAr: pValue < alpha ?
      `W = ${W.toFixed(2)}، z = ${z.toFixed(3)}، p = ${pValue.toFixed(4)}. التدخل له تأثير معنوي.` :
      `W = ${W.toFixed(2)}، z = ${z.toFixed(3)}، p = ${pValue.toFixed(4)}. لم يُكتشف تأثير معنوي.`,
    assumptions: [
      {
        name: 'Paired Observations',
        nameAr: 'الملاحظات المزدوجة',
        met: true,
        details: 'Each observation has a matched pair',
        detailsAr: 'كل ملاحظة لها زوج مطابق'
      },
      {
        name: 'Symmetric Distribution',
        nameAr: 'التوزيع المتماثل',
        met: true,
        details: 'Differences are approximately symmetric',
        detailsAr: 'الفروق متماثلة تقريباً'
      }
    ],
    additionalStats: [
      { label: 'W+', labelAr: 'W+', value: wPlus.toFixed(2) },
      { label: 'W-', labelAr: 'W-', value: wMinus.toFixed(2) },
      { label: 'Z-score', labelAr: 'قيمة Z', value: z.toFixed(4) },
      { label: 'Median Difference', labelAr: 'وسيط الفرق', value: median(differences).toFixed(4) }
    ],
    recommendations: [],
    recommendationsAr: []
  };
};

const runKruskalWallis = (groups: number[][], alpha: number): TestResult => {
  const k = groups.length;
  const N = groups.reduce((acc, g) => acc + g.length, 0);
  const allData = groups.flatMap((g, gi) => g.map(v => ({ v, g: gi })));
  allData.sort((a, b) => a.v - b.v);
  
  // Assign ranks
  const rankedData: { v: number; g: number; rank: number }[] = [];
  let i = 0;
  while (i < allData.length) {
    let j = i;
    while (j < allData.length && allData[j].v === allData[i].v) j++;
    const avgRank = (i + j + 1) / 2;
    for (let l = i; l < j; l++) {
      rankedData.push({ ...allData[l], rank: avgRank });
    }
    i = j;
  }
  
  const rankSums = groups.map((_, gi) => 
    rankedData.filter(d => d.g === gi).reduce((acc, d) => acc + d.rank, 0)
  );
  
  let H = (12 / (N * (N + 1))) * rankSums.reduce((acc, R, gi) => acc + (R * R) / groups[gi].length, 0) - 3 * (N + 1);
  
  const df = k - 1;
  const pValue = chiSquarePValue(H, df);
  
  // Epsilon squared
  const epsilonSquared = H / (N - 1);
  
  return {
    testName: 'Kruskal-Wallis H Test',
    testNameAr: 'اختبار كروسكال-واليس',
    statistic: H,
    pValue,
    df,
    effectSize: epsilonSquared,
    effectSizeType: 'ε² (Epsilon Squared)',
    effectSizeInterpretation: epsilonSquared < 0.01 ? 'Small' : epsilonSquared < 0.06 ? 'Medium' : 'Large',
    confidenceInterval: undefined,
    conclusion: pValue < alpha ?
      `There are significant differences among the ${k} groups` :
      `There are no significant differences among the ${k} groups`,
    conclusionAr: pValue < alpha ?
      `توجد فروق معنوية بين المجموعات الـ ${k}` :
      `لا توجد فروق معنوية بين المجموعات الـ ${k}`,
    interpretation: pValue < alpha ?
      `H(${df}) = ${H.toFixed(3)}, p = ${pValue.toFixed(4)}. At least one group differs significantly from the others.` :
      `H(${df}) = ${H.toFixed(3)}, p = ${pValue.toFixed(4)}. No significant differences among groups.`,
    interpretationAr: pValue < alpha ?
      `H(${df}) = ${H.toFixed(3)}، p = ${pValue.toFixed(4)}. واحدة على الأقل من المجموعات تختلف معنوياً.` :
      `H(${df}) = ${H.toFixed(3)}، p = ${pValue.toFixed(4)}. لا توجد فروق معنوية بين المجموعات.`,
    assumptions: [
      {
        name: 'Independence',
        nameAr: 'الاستقلالية',
        met: true,
        details: 'Groups are independent',
        detailsAr: 'المجموعات مستقلة'
      },
      {
        name: 'Ordinal Scale',
        nameAr: 'المقياس الترتيبي',
        met: true,
        details: 'Data can be ranked',
        detailsAr: 'البيانات قابلة للترتيب'
      }
    ],
    additionalStats: [
      ...groups.map((g, i) => ({ 
        label: `Group ${i + 1} Median`, 
        labelAr: `وسيط المجموعة ${i + 1}`, 
        value: median(g).toFixed(4) 
      })),
      ...rankSums.map((R, i) => ({ 
        label: `Group ${i + 1} Rank Sum`, 
        labelAr: `مجموع رتب المجموعة ${i + 1}`, 
        value: R.toFixed(2) 
      }))
    ],
    recommendations: [
      pValue < alpha ? 'Conduct post-hoc Dunn test to identify specific differences' : ''
    ].filter(Boolean),
    recommendationsAr: [
      pValue < alpha ? 'قم باختبار دان للمقارنات البعدية لتحديد الفروق' : ''
    ].filter(Boolean)
  };
};

const runPearsonCorrelation = (x: number[], y: number[], alpha: number): TestResult => {
  const n = x.length;
  const mx = mean(x), my = mean(y);
  const sx = std(x), sy = std(y);
  
  let numerator = 0;
  for (let i = 0; i < n; i++) {
    numerator += (x[i] - mx) * (y[i] - my);
  }
  
  const r = numerator / ((n - 1) * sx * sy);
  
  // T-test for correlation
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;
  const pValue = tPValue(t, df);
  
  // Fisher's z transformation for CI
  const zr = 0.5 * Math.log((1 + r) / (1 - r));
  const seZr = 1 / Math.sqrt(n - 3);
  const ciZ: [number, number] = [zr - 1.96 * seZr, zr + 1.96 * seZr];
  const ci: [number, number] = [
    (Math.exp(2 * ciZ[0]) - 1) / (Math.exp(2 * ciZ[0]) + 1),
    (Math.exp(2 * ciZ[1]) - 1) / (Math.exp(2 * ciZ[1]) + 1)
  ];
  
  const shapiroX = shapiroWilkTest(x);
  const shapiroY = shapiroWilkTest(y);
  
  return {
    testName: 'Pearson Correlation',
    testNameAr: 'ارتباط بيرسون',
    statistic: r,
    pValue,
    df,
    effectSize: Math.abs(r),
    effectSizeType: 'r',
    effectSizeInterpretation: Math.abs(r) < 0.3 ? 'Weak' : Math.abs(r) < 0.7 ? 'Moderate' : 'Strong',
    confidenceInterval: ci,
    conclusion: pValue < alpha ?
      `There is a significant ${r > 0 ? 'positive' : 'negative'} correlation (r = ${r.toFixed(3)})` :
      `There is no significant correlation (r = ${r.toFixed(3)})`,
    conclusionAr: pValue < alpha ?
      `يوجد ارتباط ${r > 0 ? 'موجب' : 'سالب'} معنوي (r = ${r.toFixed(3)})` :
      `لا يوجد ارتباط معنوي (r = ${r.toFixed(3)})`,
    interpretation: pValue < alpha ?
      `r = ${r.toFixed(3)}, t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}. The variables are ${Math.abs(r) < 0.3 ? 'weakly' : Math.abs(r) < 0.7 ? 'moderately' : 'strongly'} ${r > 0 ? 'positively' : 'negatively'} correlated.` :
      `r = ${r.toFixed(3)}, t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}. No significant linear relationship detected.`,
    interpretationAr: pValue < alpha ?
      `r = ${r.toFixed(3)}، t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}. المتغيران مرتبطان ${Math.abs(r) < 0.3 ? 'ضعيفاً' : Math.abs(r) < 0.7 ? 'متوسطاً' : 'قوياً'} ${r > 0 ? 'إيجابياً' : 'سلبياً'}.` :
      `r = ${r.toFixed(3)}، t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}. لم يُكتشف ارتباط خطي معنوي.`,
    assumptions: [
      {
        name: 'Normality (X)',
        nameAr: 'التوزيع الطبيعي (X)',
        met: shapiroX.pValue > 0.05,
        details: `Shapiro-Wilk p = ${shapiroX.pValue.toFixed(4)}`,
        detailsAr: `شابيرو-ويلك p = ${shapiroX.pValue.toFixed(4)}`
      },
      {
        name: 'Normality (Y)',
        nameAr: 'التوزيع الطبيعي (Y)',
        met: shapiroY.pValue > 0.05,
        details: `Shapiro-Wilk p = ${shapiroY.pValue.toFixed(4)}`,
        detailsAr: `شابيرو-ويلك p = ${shapiroY.pValue.toFixed(4)}`
      },
      {
        name: 'Linearity',
        nameAr: 'الخطية',
        met: true,
        details: 'Assumed linear relationship',
        detailsAr: 'يُفترض وجود علاقة خطية'
      }
    ],
    additionalStats: [
      { label: 'R²', labelAr: 'R²', value: (r * r).toFixed(4) },
      { label: 'T-statistic', labelAr: 'إحصائي t', value: t.toFixed(4) },
      { label: 'Covariance', labelAr: 'التغاير', value: covariance(x, y).toFixed(4) }
    ],
    recommendations: [
      (shapiroX.pValue < 0.05 || shapiroY.pValue < 0.05) ? 'Consider Spearman correlation due to non-normality' : ''
    ].filter(Boolean),
    recommendationsAr: [
      (shapiroX.pValue < 0.05 || shapiroY.pValue < 0.05) ? 'فكر في استخدام ارتباط سبيرمان بسبب عدم الطبيعية' : ''
    ].filter(Boolean)
  };
};

const runSpearmanCorrelation = (x: number[], y: number[], alpha: number): TestResult => {
  const n = x.length;
  const rankX = ranks(x);
  const rankY = ranks(y);
  
  // Calculate using ranks
  const mRankX = mean(rankX), mRankY = mean(rankY);
  let numerator = 0, denomX = 0, denomY = 0;
  
  for (let i = 0; i < n; i++) {
    const dx = rankX[i] - mRankX;
    const dy = rankY[i] - mRankY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  
  const rho = numerator / Math.sqrt(denomX * denomY);
  
  // T-test approximation
  const t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
  const df = n - 2;
  const pValue = tPValue(t, df);
  
  return {
    testName: 'Spearman Correlation',
    testNameAr: 'ارتباط سبيرمان',
    statistic: rho,
    pValue,
    df,
    effectSize: Math.abs(rho),
    effectSizeType: 'ρ (rho)',
    effectSizeInterpretation: Math.abs(rho) < 0.3 ? 'Weak' : Math.abs(rho) < 0.7 ? 'Moderate' : 'Strong',
    confidenceInterval: undefined,
    conclusion: pValue < alpha ?
      `There is a significant monotonic ${rho > 0 ? 'positive' : 'negative'} relationship (ρ = ${rho.toFixed(3)})` :
      `There is no significant monotonic relationship (ρ = ${rho.toFixed(3)})`,
    conclusionAr: pValue < alpha ?
      `يوجد ارتباط رتبي ${rho > 0 ? 'موجب' : 'سالب'} معنوي (ρ = ${rho.toFixed(3)})` :
      `لا يوجد ارتباط رتبي معنوي (ρ = ${rho.toFixed(3)})`,
    interpretation: pValue < alpha ?
      `ρ = ${rho.toFixed(3)}, t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}. There is a ${Math.abs(rho) < 0.3 ? 'weak' : Math.abs(rho) < 0.7 ? 'moderate' : 'strong'} monotonic relationship.` :
      `ρ = ${rho.toFixed(3)}, t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}. No significant monotonic relationship.`,
    interpretationAr: pValue < alpha ?
      `ρ = ${rho.toFixed(3)}، t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}. يوجد ارتباط رتبي ${Math.abs(rho) < 0.3 ? 'ضعيف' : Math.abs(rho) < 0.7 ? 'متوسط' : 'قوي'}.` :
      `ρ = ${rho.toFixed(3)}، t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}. لا يوجد ارتباط رتبي معنوي.`,
    assumptions: [
      {
        name: 'Monotonic Relationship',
        nameAr: 'العلاقة الرتبية',
        met: true,
        details: 'Tests for monotonic (not necessarily linear) relationship',
        detailsAr: 'يختبر العلاقة الرتبية (ليست بالضرورة خطية)'
      },
      {
        name: 'Ordinal Scale',
        nameAr: 'المقياس الترتيبي',
        met: true,
        details: 'Data can be ranked',
        detailsAr: 'البيانات قابلة للترتيب'
      }
    ],
    additionalStats: [
      { label: 'T-statistic', labelAr: 'إحصائي t', value: t.toFixed(4) }
    ],
    recommendations: [],
    recommendationsAr: []
  };
};

const runChiSquareTest = (observed: number[][], alpha: number): TestResult => {
  const rows = observed.length;
  const cols = observed[0].length;
  
  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = observed[0].map((_, j) => observed.reduce((acc, row) => acc + row[j], 0));
  const total = rowTotals.reduce((a, b) => a + b, 0);
  
  let chi2 = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / total;
      chi2 += (observed[i][j] - expected) ** 2 / expected;
    }
  }
  
  const df = (rows - 1) * (cols - 1);
  const pValue = chiSquarePValue(chi2, df);
  
  // Cramér's V
  const n = total;
  const k = Math.min(rows, cols);
  const cramersV = Math.sqrt(chi2 / (n * (k - 1)));
  
  return {
    testName: 'Chi-Square Test of Independence',
    testNameAr: 'اختبار كاي تربيع للاستقلالية',
    statistic: chi2,
    pValue,
    df,
    effectSize: cramersV,
    effectSizeType: "Cramér's V",
    effectSizeInterpretation: cramersV < 0.1 ? 'Negligible' : cramersV < 0.3 ? 'Small' : cramersV < 0.5 ? 'Medium' : 'Large',
    confidenceInterval: undefined,
    conclusion: pValue < alpha ?
      `There is a significant association between the variables` :
      `There is no significant association between the variables`,
    conclusionAr: pValue < alpha ?
      `يوجد ارتباط معنوي بين المتغيرين` :
      `لا يوجد ارتباط معنوي بين المتغيرين`,
    interpretation: pValue < alpha ?
      `χ²(${df}) = ${chi2.toFixed(3)}, p = ${pValue.toFixed(4)}, V = ${cramersV.toFixed(3)}. The variables are not independent; there is a ${cramersV < 0.3 ? 'weak' : cramersV < 0.5 ? 'moderate' : 'strong'} association.` :
      `χ²(${df}) = ${chi2.toFixed(3)}, p = ${pValue.toFixed(4)}. The variables appear to be independent.`,
    interpretationAr: pValue < alpha ?
      `χ²(${df}) = ${chi2.toFixed(3)}، p = ${pValue.toFixed(4)}، V = ${cramersV.toFixed(3)}. المتغيران غير مستقلين؛ يوجد ارتباط ${cramersV < 0.3 ? 'ضعيف' : cramersV < 0.5 ? 'متوسط' : 'قوي'}.` :
      `χ²(${df}) = ${chi2.toFixed(3)}، p = ${pValue.toFixed(4)}. المتغيران يبدوان مستقلين.`,
    assumptions: [
      {
        name: 'Expected Frequencies',
        nameAr: 'التكرارات المتوقعة',
        met: true,
        details: 'Expected frequencies should be ≥ 5',
        detailsAr: 'التكرارات المتوقعة يجب أن تكون ≥ 5'
      },
      {
        name: 'Independence',
        nameAr: 'الاستقلالية',
        met: true,
        details: 'Observations are independent',
        detailsAr: 'الملاحظات مستقلة'
      }
    ],
    additionalStats: [
      { label: 'Total N', labelAr: 'الإجمالي', value: total },
      { label: 'Rows', labelAr: 'الصفوف', value: rows },
      { label: 'Columns', labelAr: 'الأعمدة', value: cols }
    ],
    recommendations: [],
    recommendationsAr: []
  };
};

const runNormalityTest = (data: number[], testType: string, alpha: number): TestResult => {
  let result: { statistic: number; pValue: number; testName: string; testNameAr: string };
  
  switch (testType) {
    case 'shapiro':
      const sw = shapiroWilkTest(data);
      result = { statistic: sw.W, pValue: sw.pValue, testName: 'Shapiro-Wilk Test', testNameAr: 'اختبار شابيرو-ويلك' };
      break;
    case 'ks':
      const ks = kolmogorovSmirnovTest(data);
      result = { statistic: ks.D, pValue: ks.pValue, testName: 'Kolmogorov-Smirnov Test', testNameAr: 'اختبار كولموجوروف-سميرنوف' };
      break;
    case 'anderson':
      const ad = andersonDarlingTest(data);
      result = { statistic: ad.A2, pValue: ad.pValue, testName: 'Anderson-Darling Test', testNameAr: 'اختبار أندرسون-دارلينج' };
      break;
    case 'jarque':
      const jb = jarqueBeraTest(data);
      result = { statistic: jb.JB, pValue: jb.pValue, testName: 'Jarque-Bera Test', testNameAr: 'اختبار جارك-بيرا' };
      break;
    default:
      const swDefault = shapiroWilkTest(data);
      result = { statistic: swDefault.W, pValue: swDefault.pValue, testName: 'Shapiro-Wilk Test', testNameAr: 'اختبار شابيرو-ويلك' };
  }
  
  const sk = skewness(data);
  const ku = kurtosis(data);
  
  return {
    testName: result.testName,
    testNameAr: result.testNameAr,
    statistic: result.statistic,
    pValue: result.pValue,
    df: undefined,
    effectSize: undefined,
    effectSizeType: undefined,
    effectSizeInterpretation: undefined,
    confidenceInterval: undefined,
    conclusion: result.pValue > alpha ?
      `The data follows a normal distribution (fail to reject H₀)` :
      `The data does not follow a normal distribution (reject H₀)`,
    conclusionAr: result.pValue > alpha ?
      `البيانات تتبع التوزيع الطبيعي (لا نرفض H₀)` :
      `البيانات لا تتبع التوزيع الطبيعي (نرفض H₀)`,
    interpretation: result.pValue > alpha ?
      `With p = ${result.pValue.toFixed(4)} > ${alpha}, the distribution is not significantly different from normal. Parametric tests are appropriate.` :
      `With p = ${result.pValue.toFixed(4)} < ${alpha}, the distribution deviates significantly from normal. Consider non-parametric alternatives.`,
    interpretationAr: result.pValue > alpha ?
      `بقيمة p = ${result.pValue.toFixed(4)} > ${alpha}، التوزيع لا يختلف معنوياً عن الطبيعي. الاختبارات المعلمية مناسبة.` :
      `بقيمة p = ${result.pValue.toFixed(4)} < ${alpha}، التوزيع يختلف معنوياً عن الطبيعي. فكر في البدائل اللامعلمية.`,
    assumptions: [],
    additionalStats: [
      { label: 'Sample Size', labelAr: 'حجم العينة', value: data.length },
      { label: 'Mean', labelAr: 'المتوسط', value: mean(data).toFixed(4) },
      { label: 'Std Dev', labelAr: 'الانحراف المعياري', value: std(data).toFixed(4) },
      { label: 'Skewness', labelAr: 'الالتواء', value: sk.toFixed(4) },
      { label: 'Kurtosis', labelAr: 'التفرطح', value: ku.toFixed(4) }
    ],
    recommendations: [
      result.pValue < alpha ? 'Data is not normally distributed. Use non-parametric tests or transform the data.' : '',
      Math.abs(sk) > 1 ? 'High skewness detected. Consider log or Box-Cox transformation.' : ''
    ].filter(Boolean),
    recommendationsAr: [
      result.pValue < alpha ? 'البيانات لا تتبع التوزيع الطبيعي. استخدم الاختبارات اللامعلمية أو حوّل البيانات.' : '',
      Math.abs(sk) > 1 ? 'التواء مرتفع. فكر في تحويل لوغاريتمي أو Box-Cox.' : ''
    ].filter(Boolean)
  };
};

const runVarianceTest = (groups: number[][], testType: string, alpha: number): TestResult => {
  let result: { statistic: number; pValue: number; testName: string; testNameAr: string };
  
  switch (testType) {
    case 'levene':
      const lev = leveneTest(groups);
      result = { statistic: lev.W, pValue: lev.pValue, testName: "Levene's Test", testNameAr: 'اختبار ليفين' };
      break;
    case 'bartlett':
      const bart = bartlettTest(groups);
      result = { statistic: bart.chi2, pValue: bart.pValue, testName: "Bartlett's Test", testNameAr: 'اختبار بارتليت' };
      break;
    default:
      const levDefault = leveneTest(groups);
      result = { statistic: levDefault.W, pValue: levDefault.pValue, testName: "Levene's Test", testNameAr: 'اختبار ليفين' };
  }
  
  const variances = groups.map(g => variance(g));
  
  return {
    testName: result.testName,
    testNameAr: result.testNameAr,
    statistic: result.statistic,
    pValue: result.pValue,
    df: groups.length - 1,
    effectSize: undefined,
    effectSizeType: undefined,
    effectSizeInterpretation: undefined,
    confidenceInterval: undefined,
    conclusion: result.pValue > alpha ?
      `Variances are homogeneous (fail to reject H₀)` :
      `Variances are not homogeneous (reject H₀)`,
    conclusionAr: result.pValue > alpha ?
      `التباينات متجانسة (لا نرفض H₀)` :
      `التباينات غير متجانسة (نرفض H₀)`,
    interpretation: result.pValue > alpha ?
      `With p = ${result.pValue.toFixed(4)} > ${alpha}, the assumption of homogeneity of variance is met. Standard parametric tests can be used.` :
      `With p = ${result.pValue.toFixed(4)} < ${alpha}, variances are significantly different. Consider Welch's test or non-parametric alternatives.`,
    interpretationAr: result.pValue > alpha ?
      `بقيمة p = ${result.pValue.toFixed(4)} > ${alpha}، افتراض تجانس التباين متحقق. يمكن استخدام الاختبارات المعلمية القياسية.` :
      `بقيمة p = ${result.pValue.toFixed(4)} < ${alpha}، التباينات مختلفة معنوياً. فكر في اختبار ويلش أو البدائل اللامعلمية.`,
    assumptions: [],
    additionalStats: [
      ...variances.map((v, i) => ({ 
        label: `Group ${i + 1} Variance`, 
        labelAr: `تباين المجموعة ${i + 1}`, 
        value: v.toFixed(4) 
      })),
      { label: 'Number of Groups', labelAr: 'عدد المجموعات', value: groups.length }
    ],
    recommendations: [
      result.pValue < alpha ? "Use Welch's t-test/ANOVA instead of standard versions" : ''
    ].filter(Boolean),
    recommendationsAr: [
      result.pValue < alpha ? 'استخدم اختبار ويلش بدلاً من الإصدارات القياسية' : ''
    ].filter(Boolean)
  };
};

// ==================== المكون الرئيسي ====================

const StatisticalTests: React.FC<StatisticalTestsProps> = ({ data, columns }) => {
  const { isRTL } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('parametric');
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  
  // Test configuration
  const [config, setConfig] = useState({
    variable1: '',
    variable2: '',
    groupVariable: '',
    testValue: 0,
    alpha: 0.05,
    normalityTest: 'shapiro',
    varianceTest: 'levene'
  });

  const numericColumns = useMemo(() => 
    columns.filter(col => data.some(row => typeof row[col] === 'number')),
    [data, columns]
  );

  const categoricalColumns = useMemo(() => 
    columns.filter(col => data.some(row => typeof row[col] === 'string')),
    [data, columns]
  );

  const testCategories = [
    {
      id: 'parametric',
      name: 'Parametric Tests',
      nameAr: 'الاختبارات المعلمية',
      icon: BarChart3,
      color: 'from-blue-500 to-blue-600',
      tests: [
        { id: 'one-sample-t', name: 'One-Sample T-Test', nameAr: 'اختبار t للعينة الواحدة' },
        { id: 'independent-t', name: 'Independent Samples T-Test', nameAr: 'اختبار t للعينات المستقلة' },
        { id: 'paired-t', name: 'Paired Samples T-Test', nameAr: 'اختبار t للعينات المزدوجة' },
        { id: 'one-way-anova', name: 'One-Way ANOVA', nameAr: 'تحليل التباين الأحادي' }
      ]
    },
    {
      id: 'nonparametric',
      name: 'Non-Parametric Tests',
      nameAr: 'الاختبارات اللامعلمية',
      icon: TrendingUp,
      color: 'from-green-500 to-green-600',
      tests: [
        { id: 'mann-whitney', name: 'Mann-Whitney U Test', nameAr: 'اختبار مان-ويتني' },
        { id: 'wilcoxon', name: 'Wilcoxon Signed-Rank Test', nameAr: 'اختبار ويلكوكسون' },
        { id: 'kruskal-wallis', name: 'Kruskal-Wallis H Test', nameAr: 'اختبار كروسكال-واليس' }
      ]
    },
    {
      id: 'correlation',
      name: 'Correlation Tests',
      nameAr: 'اختبارات الارتباط',
      icon: GitBranch,
      color: 'from-purple-500 to-purple-600',
      tests: [
        { id: 'pearson', name: 'Pearson Correlation', nameAr: 'ارتباط بيرسون' },
        { id: 'spearman', name: 'Spearman Correlation', nameAr: 'ارتباط سبيرمان' }
      ]
    },
    {
      id: 'normality',
      name: 'Normality Tests',
      nameAr: 'اختبارات التوزيع الطبيعي',
      icon: Activity,
      color: 'from-orange-500 to-orange-600',
      tests: [
        { id: 'shapiro-wilk', name: 'Shapiro-Wilk Test', nameAr: 'اختبار شابيرو-ويلك' },
        { id: 'kolmogorov-smirnov', name: 'Kolmogorov-Smirnov Test', nameAr: 'اختبار كولموجوروف-سميرنوف' },
        { id: 'anderson-darling', name: 'Anderson-Darling Test', nameAr: 'اختبار أندرسون-دارلينج' },
        { id: 'jarque-bera', name: 'Jarque-Bera Test', nameAr: 'اختبار جارك-بيرا' }
      ]
    },
    {
      id: 'variance',
      name: 'Variance Tests',
      nameAr: 'اختبارات التباين',
      icon: Layers,
      color: 'from-red-500 to-red-600',
      tests: [
        { id: 'levene', name: "Levene's Test", nameAr: 'اختبار ليفين' },
        { id: 'bartlett', name: "Bartlett's Test", nameAr: 'اختبار بارتليت' }
      ]
    },
    {
      id: 'categorical',
      name: 'Categorical Tests',
      nameAr: 'اختبارات البيانات الفئوية',
      icon: PieChart,
      color: 'from-pink-500 to-pink-600',
      tests: [
        { id: 'chi-square', name: 'Chi-Square Test', nameAr: 'اختبار كاي تربيع' }
      ]
    }
  ];

  const getColumnData = (colName: string): number[] => {
    return data
      .map(row => row[colName])
      .filter(val => val !== null && val !== undefined && !isNaN(Number(val)))
      .map(Number);
  };

  const getGroupedData = (numericCol: string, groupCol: string): number[][] => {
    const groups: Record<string, number[]> = {};
    data.forEach(row => {
      const groupValue = String(row[groupCol]);
      const numericValue = Number(row[numericCol]);
      if (!isNaN(numericValue)) {
        if (!groups[groupValue]) groups[groupValue] = [];
        groups[groupValue].push(numericValue);
      }
    });
    return Object.values(groups);
  };

  const runTest = () => {
    setIsRunning(true);
    
    setTimeout(() => {
      let result: TestResult | null = null;
      
      try {
        switch (selectedTest) {
          case 'one-sample-t': {
            const data1 = getColumnData(config.variable1);
            if (data1.length >= 3) {
              result = runOneSampleTTest(data1, config.testValue, config.alpha);
            }
            break;
          }
          case 'independent-t': {
            const groups = getGroupedData(config.variable1, config.groupVariable);
            if (groups.length >= 2 && groups[0].length >= 3 && groups[1].length >= 3) {
              result = runIndependentTTest(groups[0], groups[1], config.alpha);
            }
            break;
          }
          case 'paired-t': {
            const before = getColumnData(config.variable1);
            const after = getColumnData(config.variable2);
            if (before.length >= 3 && after.length >= 3 && before.length === after.length) {
              result = runPairedTTest(before, after, config.alpha);
            }
            break;
          }
          case 'one-way-anova': {
            const groups = getGroupedData(config.variable1, config.groupVariable);
            if (groups.length >= 2 && groups.every(g => g.length >= 2)) {
              result = runOneWayANOVA(groups, config.alpha);
            }
            break;
          }
          case 'mann-whitney': {
            const groups = getGroupedData(config.variable1, config.groupVariable);
            if (groups.length >= 2 && groups[0].length >= 3 && groups[1].length >= 3) {
              result = runMannWhitney(groups[0], groups[1], config.alpha);
            }
            break;
          }
          case 'wilcoxon': {
            const before = getColumnData(config.variable1);
            const after = getColumnData(config.variable2);
            if (before.length >= 3 && after.length >= 3 && before.length === after.length) {
              result = runWilcoxon(before, after, config.alpha);
            }
            break;
          }
          case 'kruskal-wallis': {
            const groups = getGroupedData(config.variable1, config.groupVariable);
            if (groups.length >= 2 && groups.every(g => g.length >= 2)) {
              result = runKruskalWallis(groups, config.alpha);
            }
            break;
          }
          case 'pearson': {
            const x = getColumnData(config.variable1);
            const y = getColumnData(config.variable2);
            if (x.length >= 3 && y.length >= 3 && x.length === y.length) {
              result = runPearsonCorrelation(x, y, config.alpha);
            }
            break;
          }
          case 'spearman': {
            const x = getColumnData(config.variable1);
            const y = getColumnData(config.variable2);
            if (x.length >= 3 && y.length >= 3 && x.length === y.length) {
              result = runSpearmanCorrelation(x, y, config.alpha);
            }
            break;
          }
          case 'shapiro-wilk':
          case 'kolmogorov-smirnov':
          case 'anderson-darling':
          case 'jarque-bera': {
            const data1 = getColumnData(config.variable1);
            if (data1.length >= 3) {
              const testType = selectedTest === 'shapiro-wilk' ? 'shapiro' :
                              selectedTest === 'kolmogorov-smirnov' ? 'ks' :
                              selectedTest === 'anderson-darling' ? 'anderson' : 'jarque';
              result = runNormalityTest(data1, testType, config.alpha);
            }
            break;
          }
          case 'levene':
          case 'bartlett': {
            const groups = getGroupedData(config.variable1, config.groupVariable);
            if (groups.length >= 2 && groups.every(g => g.length >= 2)) {
              result = runVarianceTest(groups, selectedTest, config.alpha);
            }
            break;
          }
          case 'chi-square': {
            // Create contingency table
            const var1 = config.variable1;
            const var2 = config.variable2;
            const contingency: Record<string, Record<string, number>> = {};
            
            data.forEach(row => {
              const v1 = String(row[var1]);
              const v2 = String(row[var2]);
              if (!contingency[v1]) contingency[v1] = {};
              if (!contingency[v1][v2]) contingency[v1][v2] = 0;
              contingency[v1][v2]++;
            });
            
            const rows = Object.keys(contingency);
            const cols = [...new Set(Object.values(contingency).flatMap(Object.keys))];
            const observed = rows.map(r => cols.map(c => contingency[r][c] || 0));
            
            if (observed.length >= 2 && observed[0].length >= 2) {
              result = runChiSquareTest(observed, config.alpha);
            }
            break;
          }
        }
      } catch (error) {
        console.error('Test error:', error);
      }
      
      if (result) {
        setTestResult(result);
        setTestHistory(prev => [result!, ...prev].slice(0, 10));
      }
      
      setIsRunning(false);
    }, 500);
  };

  const renderTestConfig = () => {
    const needsVariable1 = true;
    const needsVariable2 = ['paired-t', 'pearson', 'spearman', 'chi-square', 'wilcoxon'].includes(selectedTest);
    const needsGroupVariable = ['independent-t', 'one-way-anova', 'mann-whitney', 'kruskal-wallis', 'levene', 'bartlett'].includes(selectedTest);
    const needsTestValue = ['one-sample-t'].includes(selectedTest);
    
    return (
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
          <Settings className="w-5 h-5 text-blue-600" />
          {isRTL ? 'إعدادات الاختبار' : 'Test Configuration'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {needsVariable1 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'المتغير الأول' : 'Variable 1'}
              </label>
              <select
                value={config.variable1}
                onChange={e => setConfig({ ...config, variable1: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>
                {(selectedTest === 'chi-square' ? categoricalColumns : numericColumns).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}
          
          {needsVariable2 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'المتغير الثاني' : 'Variable 2'}
              </label>
              <select
                value={config.variable2}
                onChange={e => setConfig({ ...config, variable2: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>
                {(selectedTest === 'chi-square' ? categoricalColumns : numericColumns).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}
          
          {needsGroupVariable && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'متغير التجميع' : 'Grouping Variable'}
              </label>
              <select
                value={config.groupVariable}
                onChange={e => setConfig({ ...config, groupVariable: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isRTL ? 'اختر...' : 'Select...'}</option>
                {categoricalColumns.map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          )}
          
          {needsTestValue && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {isRTL ? 'قيمة الاختبار (μ₀)' : 'Test Value (μ₀)'}
              </label>
              <input
                type="number"
                value={config.testValue}
                onChange={e => setConfig({ ...config, testValue: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {isRTL ? 'مستوى الدلالة (α)' : 'Significance Level (α)'}
            </label>
            <select
              value={config.alpha}
              onChange={e => setConfig({ ...config, alpha: parseFloat(e.target.value) })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={0.01}>0.01</option>
              <option value={0.05}>0.05</option>
              <option value={0.10}>0.10</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end">
          <button
            onClick={runTest}
            disabled={isRunning || !selectedTest || !config.variable1}
            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-medium
                     hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed
                     flex items-center gap-2 shadow-lg"
          >
            {isRunning ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                {isRTL ? 'جاري التحليل...' : 'Analyzing...'}
              </>
            ) : (
              <>
                <Play className="w-5 h-5" />
                {isRTL ? 'تشغيل الاختبار' : 'Run Test'}
              </>
            )}
          </button>
        </div>
      </div>
    );
  };

  const renderTestResult = () => {
    if (!testResult) return null;
    
    const isSignificant = testResult.pValue < config.alpha;
    
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        {/* Header */}
        <div className={`p-6 ${isSignificant ? 'bg-gradient-to-r from-green-500 to-green-600' : 'bg-gradient-to-r from-gray-500 to-gray-600'} text-white`}>
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-2xl font-bold">
                {isRTL ? testResult.testNameAr : testResult.testName}
              </h3>
              <p className="text-white/80 mt-1">
                {isSignificant ? 
                  (isRTL ? '✓ نتيجة دالة إحصائياً' : '✓ Statistically Significant Result') :
                  (isRTL ? '✗ نتيجة غير دالة إحصائياً' : '✗ Not Statistically Significant')}
              </p>
            </div>
            <div className={`w-16 h-16 rounded-full flex items-center justify-center ${isSignificant ? 'bg-white/20' : 'bg-white/10'}`}>
              {isSignificant ? <CheckCircle2 className="w-8 h-8" /> : <XCircle className="w-8 h-8" />}
            </div>
          </div>
        </div>
        
        {/* Main Stats */}
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-700">{testResult.statistic.toFixed(4)}</div>
              <div className="text-sm text-blue-600 mt-1">{isRTL ? 'قيمة الإحصائي' : 'Test Statistic'}</div>
            </div>
            
            <div className={`rounded-xl p-4 text-center ${
              testResult.pValue < 0.001 ? 'bg-gradient-to-br from-green-50 to-green-100' :
              testResult.pValue < 0.01 ? 'bg-gradient-to-br from-green-50 to-green-100' :
              testResult.pValue < 0.05 ? 'bg-gradient-to-br from-yellow-50 to-yellow-100' :
              'bg-gradient-to-br from-red-50 to-red-100'
            }`}>
              <div className={`text-3xl font-bold ${
                testResult.pValue < 0.05 ? 'text-green-700' : 'text-red-700'
              }`}>
                {testResult.pValue < 0.001 ? '< 0.001' : testResult.pValue.toFixed(4)}
              </div>
              <div className={`text-sm mt-1 ${
                testResult.pValue < 0.05 ? 'text-green-600' : 'text-red-600'
              }`}>
                p-value {testResult.pValue < 0.001 ? '***' : testResult.pValue < 0.01 ? '**' : testResult.pValue < 0.05 ? '*' : ''}
              </div>
            </div>
            
            {testResult.df !== undefined && (
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-purple-700">{testResult.df}</div>
                <div className="text-sm text-purple-600 mt-1">{isRTL ? 'درجات الحرية' : 'Degrees of Freedom'}</div>
              </div>
            )}
            
            {testResult.effectSize !== undefined && (
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 text-center">
                <div className="text-3xl font-bold text-orange-700">{testResult.effectSize.toFixed(4)}</div>
                <div className="text-sm text-orange-600 mt-1">
                  {testResult.effectSizeType || (isRTL ? 'حجم الأثر' : 'Effect Size')}
                </div>
              </div>
            )}
          </div>
          
          {/* Confidence Interval */}
          {testResult.confidenceInterval && (
            <div className="mb-6 bg-gray-50 rounded-xl p-4">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <Target className="w-5 h-5 text-blue-600" />
                {isRTL ? 'فترة الثقة 95%' : '95% Confidence Interval'}
              </h4>
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-white rounded-lg p-3 text-center border">
                  <div className="text-sm text-gray-500">{isRTL ? 'الحد الأدنى' : 'Lower'}</div>
                  <div className="text-xl font-bold text-gray-800">{testResult.confidenceInterval[0].toFixed(4)}</div>
                </div>
                <ArrowRight className="w-6 h-6 text-gray-400" />
                <div className="flex-1 bg-white rounded-lg p-3 text-center border">
                  <div className="text-sm text-gray-500">{isRTL ? 'الحد الأعلى' : 'Upper'}</div>
                  <div className="text-xl font-bold text-gray-800">{testResult.confidenceInterval[1].toFixed(4)}</div>
                </div>
              </div>
            </div>
          )}
          
          {/* Effect Size Interpretation */}
          {testResult.effectSizeInterpretation && (
            <div className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-600" />
                {isRTL ? 'تفسير حجم الأثر' : 'Effect Size Interpretation'}
              </h4>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${
                  testResult.effectSizeInterpretation === 'Small' || testResult.effectSizeInterpretation === 'Weak' || testResult.effectSizeInterpretation === 'Negligible'
                    ? 'bg-yellow-100 text-yellow-800'
                    : testResult.effectSizeInterpretation === 'Medium' || testResult.effectSizeInterpretation === 'Moderate'
                    ? 'bg-orange-100 text-orange-800'
                    : 'bg-green-100 text-green-800'
                }`}>
                  {testResult.effectSizeInterpretation}
                </span>
                <span className="text-gray-600">
                  ({testResult.effectSizeType} = {testResult.effectSize?.toFixed(3)})
                </span>
              </div>
            </div>
          )}
          
          {/* Conclusion */}
          <div className={`mb-6 rounded-xl p-4 ${isSignificant ? 'bg-green-50 border-2 border-green-200' : 'bg-red-50 border-2 border-red-200'}`}>
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <Lightbulb className={`w-5 h-5 ${isSignificant ? 'text-green-600' : 'text-red-600'}`} />
              {isRTL ? 'الاستنتاج' : 'Conclusion'}
            </h4>
            <p className={`text-lg ${isSignificant ? 'text-green-800' : 'text-red-800'}`}>
              {isRTL ? testResult.conclusionAr : testResult.conclusion}
            </p>
          </div>
          
          {/* Interpretation */}
          <div className="mb-6 bg-blue-50 rounded-xl p-4">
            <h4 className="font-semibold mb-2 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-blue-600" />
              {isRTL ? 'التفسير' : 'Interpretation'}
            </h4>
            <p className="text-gray-700">
              {isRTL ? testResult.interpretationAr : testResult.interpretation}
            </p>
          </div>
          
          {/* Assumptions */}
          {testResult.assumptions.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-gray-600" />
                {isRTL ? 'الافتراضات' : 'Assumptions'}
              </h4>
              <div className="space-y-2">
                {testResult.assumptions.map((assumption, i) => (
                  <div key={i} className={`flex items-center justify-between p-3 rounded-lg ${
                    assumption.met ? 'bg-green-50' : 'bg-red-50'
                  }`}>
                    <div className="flex items-center gap-3">
                      {assumption.met ? 
                        <CheckCircle2 className="w-5 h-5 text-green-600" /> : 
                        <XCircle className="w-5 h-5 text-red-600" />
                      }
                      <span className="font-medium">
                        {isRTL ? assumption.nameAr : assumption.name}
                      </span>
                    </div>
                    <span className={`text-sm ${assumption.met ? 'text-green-600' : 'text-red-600'}`}>
                      {isRTL ? assumption.detailsAr : assumption.details}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Additional Statistics */}
          {testResult.additionalStats.length > 0 && (
            <div className="mb-6">
              <h4 className="font-semibold mb-3 flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-gray-600" />
                {isRTL ? 'إحصائيات إضافية' : 'Additional Statistics'}
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {testResult.additionalStats.map((stat, i) => (
                  <div key={i} className="bg-gray-50 rounded-lg p-3 text-center">
                    <div className="text-lg font-bold text-gray-800">{stat.value}</div>
                    <div className="text-xs text-gray-500">{isRTL ? stat.labelAr : stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Recommendations */}
          {((isRTL ? testResult.recommendationsAr : testResult.recommendations).length > 0) && (
            <div className="bg-amber-50 rounded-xl p-4">
              <h4 className="font-semibold mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                {isRTL ? 'التوصيات' : 'Recommendations'}
              </h4>
              <ul className="list-disc list-inside space-y-1 text-amber-800">
                {(isRTL ? testResult.recommendationsAr : testResult.recommendations).map((rec, i) => (
                  <li key={i}>{rec}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <Calculator className="w-16 h-16 mb-4 text-gray-300" />
        <p className="text-xl font-medium">
          {isRTL ? 'لا توجد بيانات للتحليل' : 'No data available for analysis'}
        </p>
        <p className="text-sm mt-2">
          {isRTL ? 'قم باستيراد البيانات أولاً' : 'Please import data first'}
        </p>
      </div>
    );
  }

  return (
    <div className={`p-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Calculator className="w-8 h-8 text-blue-600" />
          {isRTL ? 'الاختبارات الإحصائية' : 'Statistical Tests'}
        </h1>
        <p className="text-gray-600 mt-2">
          {isRTL ? 'قم باختيار الاختبار المناسب وتحليل بياناتك' : 'Select the appropriate test and analyze your data'}
        </p>
      </div>
      
      {/* Test Categories */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {testCategories.map(category => {
          const Icon = category.icon;
          return (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setSelectedTest('');
                setTestResult(null);
              }}
              className={`p-4 rounded-xl border-2 transition-all ${
                selectedCategory === category.id
                  ? `border-transparent bg-gradient-to-br ${category.color} text-white shadow-lg`
                  : 'border-gray-200 hover:border-gray-300 bg-white'
              }`}
            >
              <Icon className={`w-6 h-6 mx-auto mb-2 ${selectedCategory === category.id ? 'text-white' : 'text-gray-500'}`} />
              <div className={`text-sm font-medium text-center ${selectedCategory === category.id ? 'text-white' : 'text-gray-700'}`}>
                {isRTL ? category.nameAr : category.name}
              </div>
            </button>
          );
        })}
      </div>
      
      {/* Tests List */}
      <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">
          {isRTL ? 'الاختبارات المتاحة' : 'Available Tests'}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {testCategories.find(c => c.id === selectedCategory)?.tests.map(test => (
            <button
              key={test.id}
              onClick={() => {
                setSelectedTest(test.id);
                setTestResult(null);
              }}
              className={`p-4 rounded-lg border-2 text-left transition-all ${
                selectedTest === test.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <div className="font-medium text-gray-900">
                {isRTL ? test.nameAr : test.name}
              </div>
              <div className="text-sm text-gray-500 mt-1">
                {!isRTL ? test.nameAr : test.name}
              </div>
            </button>
          ))}
        </div>
      </div>
      
      {/* Test Configuration */}
      {selectedTest && renderTestConfig()}
      
      {/* Test Result */}
      {testResult && renderTestResult()}
      
      {/* History Toggle */}
      {testHistory.length > 0 && (
        <div className="mt-6">
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
          >
            <History className="w-5 h-5" />
            {isRTL ? `سجل الاختبارات (${testHistory.length})` : `Test History (${testHistory.length})`}
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          
          {showHistory && (
            <div className="mt-4 space-y-3">
              {testHistory.map((result, i) => (
                <div key={i} className="bg-gray-50 rounded-lg p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium">
                      {isRTL ? result.testNameAr : result.testName}
                    </div>
                    <div className="text-sm text-gray-500">
                      p = {result.pValue.toFixed(4)} | {result.pValue < config.alpha ? '✓' : '✗'}
                    </div>
                  </div>
                  <button
                    onClick={() => setTestResult(result)}
                    className="text-blue-600 hover:text-blue-800"
                  >
                    {isRTL ? 'عرض' : 'View'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StatisticalTests;
