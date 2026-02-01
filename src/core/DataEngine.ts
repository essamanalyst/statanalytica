/**
 * محرك البيانات المتقدم - Data Engine
 * يوفر معالجة بيانات عالية الأداء مع دعم العمليات المتوازية
 */

export interface DataColumn {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text';
  values: any[];
  stats?: ColumnStats;
}

export interface ColumnStats {
  count: number;
  missing: number;
  unique: number;
  min?: number;
  max?: number;
  mean?: number;
  median?: number;
  mode?: any;
  std?: number;
  variance?: number;
  skewness?: number;
  kurtosis?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  outliers?: number[];
  distribution?: 'normal' | 'skewed' | 'uniform' | 'bimodal' | 'unknown';
}

export interface DataSet {
  id: string;
  name: string;
  columns: DataColumn[];
  rowCount: number;
  createdAt: Date;
  modifiedAt: Date;
  metadata: Record<string, any>;
}

export interface ProcessingResult {
  success: boolean;
  data?: any;
  error?: string;
  duration: number;
  memoryUsed?: number;
}

// Cache للعمليات المكلفة
const computeCache = new Map<string, { result: any; timestamp: number; ttl: number }>();

// تنظيف الكاش دورياً
setInterval(() => {
  const now = Date.now();
  computeCache.forEach((value, key) => {
    if (now - value.timestamp > value.ttl) {
      computeCache.delete(key);
    }
  });
}, 60000);

/**
 * حساب المتوسط بكفاءة عالية
 */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  let count = 0;
  for (let i = 0; i < values.length; i++) {
    if (values[i] !== null && values[i] !== undefined && !isNaN(values[i])) {
      sum += values[i];
      count++;
    }
  }
  return count > 0 ? sum / count : 0;
}

/**
 * حساب الوسيط بكفاءة عالية
 */
export function median(values: number[]): number {
  const filtered = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length === 0) return 0;
  
  const sorted = [...filtered].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  
  return sorted.length % 2 !== 0
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * حساب المنوال
 */
export function mode(values: any[]): any {
  const frequency = new Map<any, number>();
  let maxFreq = 0;
  let modeValue: any = null;
  
  for (const value of values) {
    if (value !== null && value !== undefined) {
      const freq = (frequency.get(value) || 0) + 1;
      frequency.set(value, freq);
      if (freq > maxFreq) {
        maxFreq = freq;
        modeValue = value;
      }
    }
  }
  
  return modeValue;
}

/**
 * حساب الانحراف المعياري
 */
export function standardDeviation(values: number[], sample: boolean = true): number {
  const avg = mean(values);
  const filtered = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length <= 1) return 0;
  
  let sumSquares = 0;
  for (const value of filtered) {
    sumSquares += Math.pow(value - avg, 2);
  }
  
  const divisor = sample ? filtered.length - 1 : filtered.length;
  return Math.sqrt(sumSquares / divisor);
}

/**
 * حساب التباين
 */
export function variance(values: number[], sample: boolean = true): number {
  const std = standardDeviation(values, sample);
  return std * std;
}

/**
 * حساب الالتواء (Skewness)
 */
export function skewness(values: number[]): number {
  const filtered = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length < 3) return 0;
  
  const avg = mean(filtered);
  const std = standardDeviation(filtered, false);
  if (std === 0) return 0;
  
  let sum = 0;
  for (const value of filtered) {
    sum += Math.pow((value - avg) / std, 3);
  }
  
  return sum / filtered.length;
}

/**
 * حساب التفرطح (Kurtosis)
 */
export function kurtosis(values: number[]): number {
  const filtered = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length < 4) return 0;
  
  const avg = mean(filtered);
  const std = standardDeviation(filtered, false);
  if (std === 0) return 0;
  
  let sum = 0;
  for (const value of filtered) {
    sum += Math.pow((value - avg) / std, 4);
  }
  
  return (sum / filtered.length) - 3;
}

/**
 * حساب المئينات
 */
export function percentile(values: number[], p: number): number {
  const filtered = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  if (filtered.length === 0) return 0;
  
  const sorted = [...filtered].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return sorted[lower];
  
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/**
 * حساب الربيعيات
 */
export function quartiles(values: number[]): { q1: number; q2: number; q3: number; iqr: number } {
  const q1 = percentile(values, 25);
  const q2 = percentile(values, 50);
  const q3 = percentile(values, 75);
  return { q1, q2, q3, iqr: q3 - q1 };
}

/**
 * كشف القيم الشاذة باستخدام IQR
 */
export function detectOutliersIQR(values: number[]): { outliers: number[]; bounds: { lower: number; upper: number } } {
  const { q1, q3, iqr } = quartiles(values);
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  
  const outliers = values.filter(v => 
    v !== null && v !== undefined && !isNaN(v) && (v < lower || v > upper)
  );
  
  return { outliers, bounds: { lower, upper } };
}

/**
 * كشف القيم الشاذة باستخدام Z-Score
 */
export function detectOutliersZScore(values: number[], threshold: number = 3): { outliers: number[]; zScores: number[] } {
  const avg = mean(values);
  const std = standardDeviation(values);
  
  if (std === 0) return { outliers: [], zScores: [] };
  
  const zScores: number[] = [];
  const outliers: number[] = [];
  
  for (const value of values) {
    if (value !== null && value !== undefined && !isNaN(value)) {
      const z = Math.abs((value - avg) / std);
      zScores.push(z);
      if (z > threshold) {
        outliers.push(value);
      }
    }
  }
  
  return { outliers, zScores };
}

/**
 * اختبار شابيرو-ويلك للتوزيع الطبيعي
 */
export function shapiroWilkTest(values: number[]): { statistic: number; pValue: number; isNormal: boolean } {
  const filtered = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  const n = filtered.length;
  
  if (n < 3 || n > 5000) {
    return { statistic: 0, pValue: 0, isNormal: false };
  }
  
  const sorted = [...filtered].sort((a, b) => a - b);
  const avg = mean(sorted);
  
  // حساب SS
  let ss = 0;
  for (const value of sorted) {
    ss += Math.pow(value - avg, 2);
  }
  
  // معاملات شابيرو-ويلك (مبسطة)
  const m = Math.floor(n / 2);
  let b = 0;
  
  for (let i = 0; i < m; i++) {
    const a = 0.5 + (0.5 * (m - i) / m); // تقريب للمعاملات
    b += a * (sorted[n - 1 - i] - sorted[i]);
  }
  
  const w = (b * b) / ss;
  
  // تقدير p-value (تقريبي)
  const zScore = (Math.log(1 - w) - (-0.0006714 * n + 0.025054)) / (0.0001882 * n + 0.091069);
  const pValue = 1 - normalCDF(Math.abs(zScore));
  
  return {
    statistic: w,
    pValue: Math.max(0, Math.min(1, pValue)),
    isNormal: pValue > 0.05
  };
}

/**
 * دالة التوزيع التراكمي الطبيعي
 */
export function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  
  const sign = z < 0 ? -1 : 1;
  z = Math.abs(z) / Math.sqrt(2);
  
  const t = 1.0 / (1.0 + p * z);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z);
  
  return 0.5 * (1.0 + sign * y);
}

/**
 * اختبار ت للعينة الواحدة
 */
export function oneSampleTTest(values: number[], populationMean: number): {
  statistic: number;
  pValue: number;
  degreesOfFreedom: number;
  confidenceInterval: [number, number];
  effectSize: number;
} {
  const filtered = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  const n = filtered.length;
  const avg = mean(filtered);
  const std = standardDeviation(filtered);
  const se = std / Math.sqrt(n);
  
  const t = (avg - populationMean) / se;
  const df = n - 1;
  
  // تقدير p-value
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));
  
  // فترة الثقة 95%
  const tCritical = tInverse(0.975, df);
  const margin = tCritical * se;
  
  // حجم الأثر (Cohen's d)
  const effectSize = (avg - populationMean) / std;
  
  return {
    statistic: t,
    pValue,
    degreesOfFreedom: df,
    confidenceInterval: [avg - margin, avg + margin],
    effectSize
  };
}

/**
 * اختبار ت للعينات المستقلة
 */
export function independentTTest(group1: number[], group2: number[], equalVariance: boolean = true): {
  statistic: number;
  pValue: number;
  degreesOfFreedom: number;
  confidenceInterval: [number, number];
  effectSize: number;
  meanDifference: number;
} {
  const filtered1 = group1.filter(v => v !== null && v !== undefined && !isNaN(v));
  const filtered2 = group2.filter(v => v !== null && v !== undefined && !isNaN(v));
  
  const n1 = filtered1.length;
  const n2 = filtered2.length;
  const mean1 = mean(filtered1);
  const mean2 = mean(filtered2);
  const var1 = variance(filtered1);
  const var2 = variance(filtered2);
  
  let t: number, df: number, se: number;
  
  if (equalVariance) {
    // Student's t-test
    const pooledVar = ((n1 - 1) * var1 + (n2 - 1) * var2) / (n1 + n2 - 2);
    se = Math.sqrt(pooledVar * (1/n1 + 1/n2));
    t = (mean1 - mean2) / se;
    df = n1 + n2 - 2;
  } else {
    // Welch's t-test
    se = Math.sqrt(var1/n1 + var2/n2);
    t = (mean1 - mean2) / se;
    const v1 = var1 / n1;
    const v2 = var2 / n2;
    df = Math.pow(v1 + v2, 2) / (Math.pow(v1, 2)/(n1-1) + Math.pow(v2, 2)/(n2-1));
  }
  
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));
  
  // فترة الثقة 95%
  const tCritical = tInverse(0.975, df);
  const margin = tCritical * se;
  const meanDiff = mean1 - mean2;
  
  // حجم الأثر (Cohen's d)
  const pooledStd = Math.sqrt(((n1-1)*var1 + (n2-1)*var2) / (n1+n2-2));
  const effectSize = meanDiff / pooledStd;
  
  return {
    statistic: t,
    pValue,
    degreesOfFreedom: df,
    confidenceInterval: [meanDiff - margin, meanDiff + margin],
    effectSize,
    meanDifference: meanDiff
  };
}

/**
 * اختبار ت للعينات المزدوجة
 */
export function pairedTTest(before: number[], after: number[]): {
  statistic: number;
  pValue: number;
  degreesOfFreedom: number;
  confidenceInterval: [number, number];
  effectSize: number;
  meanDifference: number;
} {
  if (before.length !== after.length) {
    throw new Error('Arrays must have the same length');
  }
  
  const differences: number[] = [];
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== null && after[i] !== null && !isNaN(before[i]) && !isNaN(after[i])) {
      differences.push(after[i] - before[i]);
    }
  }
  
  const n = differences.length;
  const avgDiff = mean(differences);
  const stdDiff = standardDeviation(differences);
  const se = stdDiff / Math.sqrt(n);
  
  const t = avgDiff / se;
  const df = n - 1;
  
  const pValue = 2 * (1 - tCDF(Math.abs(t), df));
  
  // فترة الثقة 95%
  const tCritical = tInverse(0.975, df);
  const margin = tCritical * se;
  
  // حجم الأثر (Cohen's d)
  const effectSize = avgDiff / stdDiff;
  
  return {
    statistic: t,
    pValue,
    degreesOfFreedom: df,
    confidenceInterval: [avgDiff - margin, avgDiff + margin],
    effectSize,
    meanDifference: avgDiff
  };
}

/**
 * تحليل التباين الأحادي (One-Way ANOVA)
 */
export function oneWayANOVA(groups: number[][]): {
  statistic: number;
  pValue: number;
  dfBetween: number;
  dfWithin: number;
  ssBetween: number;
  ssWithin: number;
  msBetween: number;
  msWithin: number;
  effectSize: number;
} {
  const filteredGroups = groups.map(g => g.filter(v => v !== null && v !== undefined && !isNaN(v)));
  const k = filteredGroups.length;
  
  // حساب المتوسط الكلي
  const allValues = filteredGroups.flat();
  const grandMean = mean(allValues);
  const N = allValues.length;
  
  // حساب SS Between و SS Within
  let ssBetween = 0;
  let ssWithin = 0;
  
  for (const group of filteredGroups) {
    const groupMean = mean(group);
    const n = group.length;
    ssBetween += n * Math.pow(groupMean - grandMean, 2);
    
    for (const value of group) {
      ssWithin += Math.pow(value - groupMean, 2);
    }
  }
  
  // درجات الحرية
  const dfBetween = k - 1;
  const dfWithin = N - k;
  
  // متوسط المربعات
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  
  // F-statistic
  const f = msBetween / msWithin;
  
  // p-value
  const pValue = 1 - fCDF(f, dfBetween, dfWithin);
  
  // حجم الأثر (Eta-squared)
  const effectSize = ssBetween / (ssBetween + ssWithin);
  
  return {
    statistic: f,
    pValue,
    dfBetween,
    dfWithin,
    ssBetween,
    ssWithin,
    msBetween,
    msWithin,
    effectSize
  };
}

/**
 * معامل ارتباط بيرسون
 */
export function pearsonCorrelation(x: number[], y: number[]): {
  correlation: number;
  pValue: number;
  tStatistic: number;
  rSquared: number;
} {
  if (x.length !== y.length) {
    throw new Error('Arrays must have the same length');
  }
  
  const pairs: [number, number][] = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && y[i] !== null && !isNaN(x[i]) && !isNaN(y[i])) {
      pairs.push([x[i], y[i]]);
    }
  }
  
  const n = pairs.length;
  if (n < 3) return { correlation: 0, pValue: 1, tStatistic: 0, rSquared: 0 };
  
  const xVals = pairs.map(p => p[0]);
  const yVals = pairs.map(p => p[1]);
  
  const xMean = mean(xVals);
  const yMean = mean(yVals);
  
  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (const [xi, yi] of pairs) {
    const dx = xi - xMean;
    const dy = yi - yMean;
    sumXY += dx * dy;
    sumX2 += dx * dx;
    sumY2 += dy * dy;
  }
  
  const r = sumXY / Math.sqrt(sumX2 * sumY2);
  
  // t-statistic
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  
  // p-value
  const pValue = 2 * (1 - tCDF(Math.abs(t), n - 2));
  
  return {
    correlation: r,
    pValue,
    tStatistic: t,
    rSquared: r * r
  };
}

/**
 * معامل ارتباط سبيرمان
 */
export function spearmanCorrelation(x: number[], y: number[]): {
  correlation: number;
  pValue: number;
} {
  const pairs: [number, number][] = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && y[i] !== null && !isNaN(x[i]) && !isNaN(y[i])) {
      pairs.push([x[i], y[i]]);
    }
  }
  
  const n = pairs.length;
  if (n < 3) return { correlation: 0, pValue: 1 };
  
  // ترتيب القيم
  const rankX = getRanks(pairs.map(p => p[0]));
  const rankY = getRanks(pairs.map(p => p[1]));
  
  // حساب ارتباط بيرسون على الرتب
  return pearsonCorrelation(rankX, rankY);
}

/**
 * حساب الرتب
 */
function getRanks(values: number[]): number[] {
  const indexed = values.map((v, i) => ({ value: v, index: i }));
  indexed.sort((a, b) => a.value - b.value);
  
  const ranks = new Array(values.length);
  let i = 0;
  
  while (i < indexed.length) {
    let j = i;
    while (j < indexed.length && indexed[j].value === indexed[i].value) {
      j++;
    }
    
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) {
      ranks[indexed[k].index] = avgRank;
    }
    
    i = j;
  }
  
  return ranks;
}

/**
 * اختبار كاي تربيع للاستقلالية
 */
export function chiSquareTest(observed: number[][]): {
  statistic: number;
  pValue: number;
  degreesOfFreedom: number;
  cramersV: number;
} {
  const rows = observed.length;
  const cols = observed[0].length;
  
  // حساب المجاميع
  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals: number[] = [];
  for (let j = 0; j < cols; j++) {
    let sum = 0;
    for (let i = 0; i < rows; i++) {
      sum += observed[i][j];
    }
    colTotals.push(sum);
  }
  const total = rowTotals.reduce((a, b) => a + b, 0);
  
  // حساب كاي تربيع
  let chiSquare = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / total;
      if (expected > 0) {
        chiSquare += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
  }
  
  const df = (rows - 1) * (cols - 1);
  const pValue = 1 - chiSquareCDF(chiSquare, df);
  
  // Cramér's V
  const minDim = Math.min(rows - 1, cols - 1);
  const cramersV = Math.sqrt(chiSquare / (total * minDim));
  
  return {
    statistic: chiSquare,
    pValue,
    degreesOfFreedom: df,
    cramersV
  };
}

/**
 * الانحدار الخطي البسيط
 */
export function linearRegression(x: number[], y: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  standardError: number;
  tStatistic: number;
  pValue: number;
  predictions: number[];
  residuals: number[];
} {
  const pairs: [number, number][] = [];
  for (let i = 0; i < x.length; i++) {
    if (x[i] !== null && y[i] !== null && !isNaN(x[i]) && !isNaN(y[i])) {
      pairs.push([x[i], y[i]]);
    }
  }
  
  const n = pairs.length;
  const xVals = pairs.map(p => p[0]);
  const yVals = pairs.map(p => p[1]);
  
  const xMean = mean(xVals);
  const yMean = mean(yVals);
  
  let sumXY = 0, sumX2 = 0, sumY2 = 0;
  
  for (const [xi, yi] of pairs) {
    sumXY += (xi - xMean) * (yi - yMean);
    sumX2 += Math.pow(xi - xMean, 2);
    sumY2 += Math.pow(yi - yMean, 2);
  }
  
  const slope = sumXY / sumX2;
  const intercept = yMean - slope * xMean;
  
  // R-squared
  const ssTotal = sumY2;
  let ssResidual = 0;
  const predictions: number[] = [];
  const residuals: number[] = [];
  
  for (const [xi, yi] of pairs) {
    const predicted = slope * xi + intercept;
    predictions.push(predicted);
    const residual = yi - predicted;
    residuals.push(residual);
    ssResidual += residual * residual;
  }
  
  const rSquared = 1 - ssResidual / ssTotal;
  
  // Standard Error of slope
  const mse = ssResidual / (n - 2);
  const seSlope = Math.sqrt(mse / sumX2);
  
  // t-statistic
  const tStat = slope / seSlope;
  const pValue = 2 * (1 - tCDF(Math.abs(tStat), n - 2));
  
  return {
    slope,
    intercept,
    rSquared,
    standardError: seSlope,
    tStatistic: tStat,
    pValue,
    predictions,
    residuals
  };
}

/**
 * اختبار مان-ويتني يو
 */
export function mannWhitneyTest(group1: number[], group2: number[]): {
  statistic: number;
  pValue: number;
  effectSize: number;
} {
  const filtered1 = group1.filter(v => v !== null && v !== undefined && !isNaN(v));
  const filtered2 = group2.filter(v => v !== null && v !== undefined && !isNaN(v));
  
  const n1 = filtered1.length;
  const n2 = filtered2.length;
  
  // دمج وترتيب
  const combined = [
    ...filtered1.map(v => ({ value: v, group: 1 })),
    ...filtered2.map(v => ({ value: v, group: 2 }))
  ];
  combined.sort((a, b) => a.value - b.value);
  
  // حساب الرتب
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].value === combined[i].value) {
      j++;
    }
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) {
      (combined[k] as any).rank = avgRank;
    }
    i = j;
  }
  
  // حساب مجموع الرتب للمجموعة الأولى
  let r1 = 0;
  for (const item of combined) {
    if (item.group === 1) {
      r1 += (item as any).rank;
    }
  }
  
  // U statistic
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);
  
  // تقريب طبيعي
  const meanU = (n1 * n2) / 2;
  const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (u - meanU) / stdU;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  // حجم الأثر (r)
  const effectSize = Math.abs(z) / Math.sqrt(n1 + n2);
  
  return { statistic: u, pValue, effectSize };
}

/**
 * اختبار ويلكوكسون
 */
export function wilcoxonTest(before: number[], after: number[]): {
  statistic: number;
  pValue: number;
  effectSize: number;
} {
  if (before.length !== after.length) {
    throw new Error('Arrays must have the same length');
  }
  
  const differences: { diff: number; absDiff: number }[] = [];
  for (let i = 0; i < before.length; i++) {
    if (before[i] !== null && after[i] !== null) {
      const diff = after[i] - before[i];
      if (diff !== 0) {
        differences.push({ diff, absDiff: Math.abs(diff) });
      }
    }
  }
  
  const n = differences.length;
  if (n === 0) return { statistic: 0, pValue: 1, effectSize: 0 };
  
  // ترتيب حسب القيمة المطلقة
  differences.sort((a, b) => a.absDiff - b.absDiff);
  
  // حساب الرتب
  let i = 0;
  while (i < n) {
    let j = i;
    while (j < n && differences[j].absDiff === differences[i].absDiff) {
      j++;
    }
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) {
      (differences[k] as any).rank = avgRank;
    }
    i = j;
  }
  
  // حساب W+ و W-
  let wPlus = 0, wMinus = 0;
  for (const d of differences) {
    if (d.diff > 0) wPlus += (d as any).rank;
    else wMinus += (d as any).rank;
  }
  
  const w = Math.min(wPlus, wMinus);
  
  // تقريب طبيعي
  const meanW = n * (n + 1) / 4;
  const stdW = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
  const z = (w - meanW) / stdW;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  // حجم الأثر
  const effectSize = Math.abs(z) / Math.sqrt(n);
  
  return { statistic: w, pValue, effectSize };
}

/**
 * اختبار كروسكال-واليس
 */
export function kruskalWallisTest(groups: number[][]): {
  statistic: number;
  pValue: number;
  effectSize: number;
} {
  const filteredGroups = groups.map(g => g.filter(v => v !== null && !isNaN(v)));
  const k = filteredGroups.length;
  
  // دمج جميع القيم
  const combined: { value: number; group: number }[] = [];
  filteredGroups.forEach((group, groupIndex) => {
    group.forEach(value => {
      combined.push({ value, group: groupIndex });
    });
  });
  
  const N = combined.length;
  combined.sort((a, b) => a.value - b.value);
  
  // حساب الرتب
  let i = 0;
  while (i < N) {
    let j = i;
    while (j < N && combined[j].value === combined[i].value) {
      j++;
    }
    const avgRank = (i + j + 1) / 2;
    for (let m = i; m < j; m++) {
      (combined[m] as any).rank = avgRank;
    }
    i = j;
  }
  
  // حساب مجموع الرتب لكل مجموعة
  const rankSums: number[] = new Array(k).fill(0);
  const groupSizes: number[] = filteredGroups.map(g => g.length);
  
  for (const item of combined) {
    rankSums[item.group] += (item as any).rank;
  }
  
  // H statistic
  let sumTerm = 0;
  for (let g = 0; g < k; g++) {
    sumTerm += (rankSums[g] * rankSums[g]) / groupSizes[g];
  }
  
  const H = (12 / (N * (N + 1))) * sumTerm - 3 * (N + 1);
  
  // p-value
  const pValue = 1 - chiSquareCDF(H, k - 1);
  
  // حجم الأثر (Epsilon-squared)
  const effectSize = H / (N - 1);
  
  return { statistic: H, pValue, effectSize };
}

/**
 * دالة التوزيع التراكمي لـ t
 */
function tCDF(t: number, df: number): number {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(x, df / 2, 0.5);
}

/**
 * دالة t العكسية (تقريبية)
 */
function tInverse(p: number, df: number): number {
  // تقريب باستخدام التوزيع الطبيعي للـ df الكبيرة
  if (df > 100) {
    return normalInverse(p);
  }
  
  // تقريب للـ df الصغيرة
  const a = 1 / (df - 0.5);
  const b = 48 / (a * a);
  const c = ((20700 * a / b - 98) * a - 16) * a + 96.36;
  const d = ((94.5 / (b + c) - 3) / b + 1) * Math.sqrt(a * Math.PI / 2) * df;
  
  let x = d * p;
  let y = Math.pow(x, 2 / df);
  
  if (y > 0.05 + a) {
    x = normalInverse(p);
    y = x * x;
    if (df < 5) {
      c = c + 0.3 * (df - 4.5) * (x + 0.6);
    }
    c = (((0.05 * d * x - 5) * x - 7) * x - 2) * x + b + c;
    y = (((((0.4 * y + 6.3) * y + 36) * y + 94.5) / c - y - 3) / b + 1) * x;
    y = a * y * y;
    if (y > 0.002) {
      y = Math.exp(y) - 1;
    } else {
      y = 0.5 * y * y + y;
    }
  } else {
    y = ((1 / (((df + 6) / (df * y) - 0.089 * d - 0.822) * (df + 2) * 3) + 0.5 / (df + 4)) * y - 1) * (df + 1) / (df + 2) + 1 / y;
  }
  
  return Math.sqrt(df * y);
}

/**
 * دالة التوزيع الطبيعي العكسية
 */
function normalInverse(p: number): number {
  const a = [
    -3.969683028665376e1, 2.209460984245205e2,
    -2.759285104469687e2, 1.383577518672690e2,
    -3.066479806614716e1, 2.506628277459239e0
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2,
    -1.556989798598866e2, 6.680131188771972e1, -1.328068155288572e1
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1,
    -2.400758277161838e0, -2.549732539343734e0,
    4.374664141464968e0, 2.938163982698783e0
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1,
    2.445134137142996e0, 3.754408661907416e0
  ];
  
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  
  let q: number, r: number;
  
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
           ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
           (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
            ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
  }
}

/**
 * دالة التوزيع التراكمي لـ F
 */
function fCDF(f: number, df1: number, df2: number): number {
  const x = df2 / (df2 + df1 * f);
  return 1 - incompleteBeta(x, df2 / 2, df1 / 2);
}

/**
 * دالة التوزيع التراكمي لكاي تربيع
 */
function chiSquareCDF(x: number, df: number): number {
  return gammaIncomplete(df / 2, x / 2);
}

/**
 * دالة بيتا غير المكتملة (تقريبية)
 */
function incompleteBeta(x: number, a: number, b: number): number {
  if (x === 0) return 0;
  if (x === 1) return 1;
  
  const bt = Math.exp(
    gammaLn(a + b) - gammaLn(a) - gammaLn(b) +
    a * Math.log(x) + b * Math.log(1 - x)
  );
  
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(x, a, b) / a;
  }
  return 1 - bt * betaCF(1 - x, b, a) / b;
}

/**
 * دالة بيتا المستمرة
 */
function betaCF(x: number, a: number, b: number): number {
  const maxIterations = 100;
  const epsilon = 3e-7;
  
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  
  let cVal = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  
  for (let m = 1; m <= maxIterations; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    cVal = 1 + aa / cVal;
    if (Math.abs(cVal) < 1e-30) cVal = 1e-30;
    d = 1 / d;
    h *= d * cVal;
    
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    let c2 = 1 + aa / cVal;
    if (Math.abs(c2) < 1e-30) c2 = 1e-30;
    cVal = c2;
    d = 1 / d;
    const del = d * cVal;
    h *= del;
    
    if (Math.abs(del - 1) < epsilon) break;
  }
  
  return h;
}

/**
 * لوغاريتم دالة جاما
 */
function gammaLn(x: number): number {
  const c = [
    76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5
  ];
  
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  
  for (let j = 0; j < 6; j++) {
    ser += c[j] / ++y;
  }
  
  return -tmp + Math.log(2.5066282746310005 * ser / x);
}

/**
 * دالة جاما غير المكتملة
 */
function gammaIncomplete(a: number, x: number): number {
  if (x < 0 || a <= 0) return 0;
  
  if (x < a + 1) {
    return gammaSeriesIncomplete(a, x);
  }
  return 1 - gammaCFIncomplete(a, x);
}

function gammaSeriesIncomplete(a: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 3e-7;
  
  const gln = gammaLn(a);
  
  if (x === 0) return 0;
  
  let ap = a;
  let sum = 1 / a;
  let del = sum;
  
  for (let n = 1; n <= maxIterations; n++) {
    ap++;
    del *= x / ap;
    sum += del;
    if (Math.abs(del) < Math.abs(sum) * epsilon) {
      return sum * Math.exp(-x + a * Math.log(x) - gln);
    }
  }
  
  return sum * Math.exp(-x + a * Math.log(x) - gln);
}

function gammaCFIncomplete(a: number, x: number): number {
  const maxIterations = 100;
  const epsilon = 3e-7;
  
  const gln = gammaLn(a);
  
  let bVal = x + 1 - a;
  let cVal = 1 / 1e-30;
  let d = 1 / bVal;
  let h = d;
  
  for (let i = 1; i <= maxIterations; i++) {
    const an = -i * (i - a);
    bVal += 2;
    d = an * d + bVal;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    cVal = bVal + an / cVal;
    if (Math.abs(cVal) < 1e-30) cVal = 1e-30;
    d = 1 / d;
    const del = d * cVal;
    h *= del;
    if (Math.abs(del - 1) < epsilon) break;
  }
  
  return Math.exp(-x + a * Math.log(x) - gln) * h;
}

/**
 * تحليل البيانات الشامل
 */
export function analyzeColumn(values: any[]): ColumnStats {
  const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
  const isNumeric = numericValues.length > values.length * 0.5;
  
  const stats: ColumnStats = {
    count: values.length,
    missing: values.filter(v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))).length,
    unique: new Set(values.filter(v => v !== null && v !== undefined)).size
  };
  
  if (isNumeric && numericValues.length > 0) {
    stats.min = Math.min(...numericValues);
    stats.max = Math.max(...numericValues);
    stats.mean = mean(numericValues);
    stats.median = median(numericValues);
    stats.mode = mode(numericValues);
    stats.std = standardDeviation(numericValues);
    stats.variance = variance(numericValues);
    stats.skewness = skewness(numericValues);
    stats.kurtosis = kurtosis(numericValues);
    
    const q = quartiles(numericValues);
    stats.q1 = q.q1;
    stats.q3 = q.q3;
    stats.iqr = q.iqr;
    
    const { outliers } = detectOutliersIQR(numericValues);
    stats.outliers = outliers;
    
    // تحديد نوع التوزيع
    const shapiro = shapiroWilkTest(numericValues);
    if (shapiro.isNormal) {
      stats.distribution = 'normal';
    } else if (Math.abs(stats.skewness) > 1) {
      stats.distribution = 'skewed';
    } else {
      stats.distribution = 'unknown';
    }
  } else {
    stats.mode = mode(values);
  }
  
  return stats;
}

/**
 * Class للـ DataEngine
 */
export class DataEngine {
  private cache = new Map<string, any>();
  private data: any[][] = [];
  private columns: string[] = [];
  
  constructor() {}
  
  /**
   * تحميل البيانات
   */
  loadData(data: any[][], columns: string[]) {
    this.data = data;
    this.columns = columns;
    this.cache.clear();
  }
  
  /**
   * الحصول على عمود
   */
  getColumn(name: string): any[] {
    const index = this.columns.indexOf(name);
    if (index === -1) return [];
    return this.data.map(row => row[index]);
  }
  
  /**
   * الحصول على أعمدة رقمية
   */
  getNumericColumns(): string[] {
    return this.columns.filter(col => {
      const values = this.getColumn(col);
      const numericCount = values.filter(v => typeof v === 'number' && !isNaN(v)).length;
      return numericCount > values.length * 0.5;
    });
  }
  
  /**
   * تحليل شامل
   */
  analyze(): Record<string, ColumnStats> {
    const cacheKey = 'full-analysis';
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const results: Record<string, ColumnStats> = {};
    for (const col of this.columns) {
      results[col] = analyzeColumn(this.getColumn(col));
    }
    
    this.cache.set(cacheKey, results);
    return results;
  }
  
  /**
   * تنظيف الكاش
   */
  clearCache() {
    this.cache.clear();
  }
}

export default new DataEngine();
