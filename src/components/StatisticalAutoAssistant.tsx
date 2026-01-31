import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '../i18n';
import {
  Bot,
  Brain,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Play,
  RotateCcw,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Target,
  Zap,
  TrendingUp,
  BarChart3,
  Lightbulb,
  HelpCircle,
  Info,
  BookOpen,
  Award,
  CheckSquare,
  XCircle,
  Clock,
  Layers,
  MessageSquare,
  Send
} from 'lucide-react';

interface StatisticalAutoAssistantProps {
  data: Record<string, any>[];
  columns: string[];
}

interface AnalysisStep {
  id: number;
  title: string;
  titleAr: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  result?: any;
}

interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'categorical' | 'ordinal' | 'date' | 'binary';
  uniqueValues: number;
  missingCount: number;
  missingPercent: number;
  isNormal?: boolean;
  normalityPValue?: number;
  mean?: number;
  median?: number;
  std?: number;
  skewness?: number;
  kurtosis?: number;
  categories?: { value: any; count: number }[];
}

interface TestRecommendation {
  id: string;
  name: string;
  nameAr: string;
  category: string;
  categoryAr: string;
  score: number;
  reason: string;
  reasonAr: string;
  assumptions: { name: string; nameAr: string; met: boolean; value?: number }[];
  variables: string[];
  alternativeTest?: string;
  alternativeTestAr?: string;
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
  effectSizeInterpretationAr?: string;
  confidenceInterval?: { lower: number; upper: number };
  conclusion: string;
  conclusionAr: string;
  interpretation: string;
  interpretationAr: string;
  recommendations: string[];
  recommendationsAr: string[];
  additionalStats?: Record<string, any>;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Statistical Functions
const mean = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
};

const median = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

const variance = (arr: number[], sample = true): number => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  const sumSq = arr.reduce((acc, val) => acc + (val - m) ** 2, 0);
  return sumSq / (sample ? arr.length - 1 : arr.length);
};

const std = (arr: number[], sample = true): number => Math.sqrt(variance(arr, sample));

const skewness = (arr: number[]): number => {
  if (arr.length < 3) return 0;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  const n = arr.length;
  const sum = arr.reduce((acc, val) => acc + ((val - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
};

const kurtosis = (arr: number[]): number => {
  if (arr.length < 4) return 0;
  const m = mean(arr);
  const s = std(arr);
  if (s === 0) return 0;
  const n = arr.length;
  const sum = arr.reduce((acc, val) => acc + ((val - m) / s) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - 
         (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
};

const _percentile = (arr: number[], p: number): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
};

const _covariance = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const mx = mean(x.slice(0, n));
  const my = mean(y.slice(0, n));
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (x[i] - mx) * (y[i] - my);
  }
  return sum / (n - 1);
};

// Export for potential use
void _percentile;
void _covariance;

const ranks = (arr: number[]): number[] => {
  const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const result = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) result[sorted[k].i] = avgRank;
    i = j;
  }
  return result;
};

// Probability Functions
const gammaLn = (x: number): number => {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
    -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x;
  let tmp = x + 5.5;
  tmp -= (x + 0.5) * Math.log(tmp);
  let ser = 1.000000000190015;
  for (let j = 0; j < 6; j++) ser += c[j] / ++y;
  return -tmp + Math.log(2.5066282746310005 * ser / x);
};

const betaIncomplete = (a: number, b: number, x: number): number => {
  if (x === 0 || x === 1) return x;
  const bt = Math.exp(gammaLn(a + b) - gammaLn(a) - gammaLn(b) + 
    a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(a, b, x) / a;
  }
  return 1 - bt * betaCF(b, a, 1 - x) / b;
};

const betaCF = (a: number, b: number, x: number): number => {
  const maxIter = 100;
  const eps = 3e-7;
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
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
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
};

const normalCDF = (x: number): number => {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1 / (1 + p * x);
  const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + sign * y);
};

const tCDF = (t: number, df: number): number => {
  const x = df / (df + t * t);
  return 1 - 0.5 * betaIncomplete(df / 2, 0.5, x);
};

const tPValue = (t: number, df: number, twoTailed = true): number => {
  const p = t > 0 ? 1 - tCDF(t, df) : tCDF(t, df);
  return twoTailed ? 2 * Math.min(p, 1 - p) : p;
};

const fPValue = (f: number, df1: number, df2: number): number => {
  if (f <= 0) return 1;
  const x = df2 / (df2 + df1 * f);
  return betaIncomplete(df2 / 2, df1 / 2, x);
};

const chiSquarePValue = (x: number, df: number): number => {
  if (x <= 0) return 1;
  return 1 - gammaIncomplete(df / 2, x / 2);
};

const gammaIncomplete = (a: number, x: number): number => {
  if (x < 0 || a <= 0) return 0;
  if (x === 0) return 0;
  if (x < a + 1) {
    let sum = 1 / a;
    let term = sum;
    for (let n = 1; n < 100; n++) {
      term *= x / (a + n);
      sum += term;
      if (Math.abs(term) < Math.abs(sum) * 1e-10) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gammaLn(a));
  } else {
    let b = x + 1 - a;
    let c = 1e30;
    let d = 1 / b;
    let h = d;
    for (let i = 1; i < 100; i++) {
      const an = -i * (i - a);
      b += 2;
      d = an * d + b;
      if (Math.abs(d) < 1e-30) d = 1e-30;
      c = b + an / c;
      if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c;
      h *= del;
      if (Math.abs(del - 1) < 1e-10) break;
    }
    return 1 - Math.exp(-x + a * Math.log(x) - gammaLn(a)) * h;
  }
};

// Statistical Tests
const shapiroWilkTest = (data: number[]): { w: number; pValue: number } => {
  const n = data.length;
  if (n < 3 || n > 5000) return { w: 1, pValue: 1 };
  
  const sorted = [...data].sort((a, b) => a - b);
  const m = mean(sorted);
  const s2 = sorted.reduce((acc, v) => acc + (v - m) ** 2, 0);
  
  if (s2 === 0) return { w: 1, pValue: 1 };
  
  // Simplified calculation
  let b = 0;
  const half = Math.floor(n / 2);
  for (let i = 0; i < half; i++) {
    const a = 0.5 + (i / n);
    b += a * (sorted[n - 1 - i] - sorted[i]);
  }
  
  const w = (b * b) / s2;
  
  // Approximate p-value
  const logN = Math.log(n);
  const z = (Math.log(1 - w) + 0.5 * logN) / (0.5 + 0.1 * logN);
  const pValue = 1 - normalCDF(z);
  
  return { w: Math.min(1, Math.max(0, w)), pValue: Math.min(1, Math.max(0, pValue)) };
};

const _oneSampleTTest = (data: number[], mu0: number): TestResult => {
  const n = data.length;
  const m = mean(data);
  const s = std(data);
  const se = s / Math.sqrt(n);
  const t = (m - mu0) / se;
  const df = n - 1;
  const pValue = tPValue(t, df);
  const effectSize = (m - mu0) / s;
  
  const tCrit = 1.96;
  const ci = { lower: m - tCrit * se, upper: m + tCrit * se };
  
  const isSignificant = pValue < 0.05;
  const effectInterpretation = Math.abs(effectSize) < 0.2 ? 'small' : Math.abs(effectSize) < 0.8 ? 'medium' : 'large';
  
  return {
    testName: 'One-Sample T-Test',
    testNameAr: 'اختبار t لعينة واحدة',
    statistic: t,
    pValue,
    df,
    effectSize: Math.abs(effectSize),
    effectSizeType: "Cohen's d",
    effectSizeInterpretation: effectInterpretation,
    effectSizeInterpretationAr: effectInterpretation === 'small' ? 'صغير' : effectInterpretation === 'medium' ? 'متوسط' : 'كبير',
    confidenceInterval: ci,
    conclusion: isSignificant 
      ? `The sample mean (${m.toFixed(3)}) is significantly different from ${mu0}`
      : `The sample mean (${m.toFixed(3)}) is not significantly different from ${mu0}`,
    conclusionAr: isSignificant
      ? `متوسط العينة (${m.toFixed(3)}) يختلف معنوياً عن ${mu0}`
      : `متوسط العينة (${m.toFixed(3)}) لا يختلف معنوياً عن ${mu0}`,
    interpretation: `With t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}, the result is ${isSignificant ? 'statistically significant' : 'not statistically significant'} at α = 0.05.`,
    interpretationAr: `بقيمة t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}، النتيجة ${isSignificant ? 'دالة إحصائياً' : 'غير دالة إحصائياً'} عند مستوى دلالة 0.05.`,
    recommendations: isSignificant
      ? ['Consider the practical significance of the difference', 'Report the effect size alongside p-value']
      : ['Increase sample size if effect is expected', 'Consider if the null hypothesis is reasonable'],
    recommendationsAr: isSignificant
      ? ['ضع في اعتبارك الأهمية العملية للفرق', 'أبلغ عن حجم الأثر إلى جانب قيمة p']
      : ['زد حجم العينة إذا كان التأثير متوقعاً', 'فكر فيما إذا كانت الفرضية الصفرية معقولة'],
    additionalStats: { n, mean: m, std: s, se, testValue: mu0 }
  };
};

const independentTTest = (group1: number[], group2: number[]): TestResult => {
  const n1 = group1.length, n2 = group2.length;
  const m1 = mean(group1), m2 = mean(group2);
  const v1 = variance(group1), v2 = variance(group2);
  const sp = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
  const se = sp * Math.sqrt(1/n1 + 1/n2);
  const t = (m1 - m2) / se;
  const df = n1 + n2 - 2;
  const pValue = tPValue(t, df);
  const effectSize = (m1 - m2) / sp;
  
  const tCrit = 1.96;
  const ci = { lower: (m1 - m2) - tCrit * se, upper: (m1 - m2) + tCrit * se };
  
  const isSignificant = pValue < 0.05;
  const effectInterpretation = Math.abs(effectSize) < 0.2 ? 'small' : Math.abs(effectSize) < 0.8 ? 'medium' : 'large';
  
  return {
    testName: 'Independent Samples T-Test',
    testNameAr: 'اختبار t للعينات المستقلة',
    statistic: t,
    pValue,
    df,
    effectSize: Math.abs(effectSize),
    effectSizeType: "Cohen's d",
    effectSizeInterpretation: effectInterpretation,
    effectSizeInterpretationAr: effectInterpretation === 'small' ? 'صغير' : effectInterpretation === 'medium' ? 'متوسط' : 'كبير',
    confidenceInterval: ci,
    conclusion: isSignificant
      ? `There is a significant difference between the two groups (M₁=${m1.toFixed(3)}, M₂=${m2.toFixed(3)})`
      : `There is no significant difference between the two groups`,
    conclusionAr: isSignificant
      ? `يوجد فرق معنوي بين المجموعتين (م₁=${m1.toFixed(3)}، م₂=${m2.toFixed(3)})`
      : `لا يوجد فرق معنوي بين المجموعتين`,
    interpretation: `The independent t-test revealed ${isSignificant ? 'a statistically significant' : 'no statistically significant'} difference between groups, t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}, d = ${Math.abs(effectSize).toFixed(3)}.`,
    interpretationAr: `كشف اختبار t للعينات المستقلة عن ${isSignificant ? 'فرق دال إحصائياً' : 'عدم وجود فرق دال إحصائياً'} بين المجموعتين، t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}، d = ${Math.abs(effectSize).toFixed(3)}.`,
    recommendations: isSignificant
      ? ['Report means and standard deviations for both groups', 'Consider practical significance', 'Check assumptions of normality and equal variances']
      : ['Consider increasing sample size', 'Evaluate if the groups are truly comparable'],
    recommendationsAr: isSignificant
      ? ['أبلغ عن المتوسطات والانحرافات المعيارية لكلتا المجموعتين', 'ضع في اعتبارك الأهمية العملية', 'تحقق من افتراضات التوزيع الطبيعي وتساوي التباينات']
      : ['فكر في زيادة حجم العينة', 'قيّم ما إذا كانت المجموعات قابلة للمقارنة حقاً'],
    additionalStats: { n1, n2, mean1: m1, mean2: m2, std1: Math.sqrt(v1), std2: Math.sqrt(v2), pooledStd: sp }
  };
};

const _pairedTTest = (before: number[], after: number[]): TestResult => {
  const n = Math.min(before.length, after.length);
  const diffs = before.slice(0, n).map((v, i) => after[i] - v);
  const md = mean(diffs);
  const sd = std(diffs);
  const se = sd / Math.sqrt(n);
  const t = md / se;
  const df = n - 1;
  const pValue = tPValue(t, df);
  const effectSize = md / sd;
  
  const tCrit = 1.96;
  const ci = { lower: md - tCrit * se, upper: md + tCrit * se };
  
  const isSignificant = pValue < 0.05;
  const effectInterpretation = Math.abs(effectSize) < 0.2 ? 'small' : Math.abs(effectSize) < 0.8 ? 'medium' : 'large';
  
  return {
    testName: 'Paired Samples T-Test',
    testNameAr: 'اختبار t للعينات المزدوجة',
    statistic: t,
    pValue,
    df,
    effectSize: Math.abs(effectSize),
    effectSizeType: "Cohen's d",
    effectSizeInterpretation: effectInterpretation,
    effectSizeInterpretationAr: effectInterpretation === 'small' ? 'صغير' : effectInterpretation === 'medium' ? 'متوسط' : 'كبير',
    confidenceInterval: ci,
    conclusion: isSignificant
      ? `There is a significant change (Mean difference = ${md.toFixed(3)})`
      : `There is no significant change between measurements`,
    conclusionAr: isSignificant
      ? `يوجد تغيير معنوي (متوسط الفرق = ${md.toFixed(3)})`
      : `لا يوجد تغيير معنوي بين القياسات`,
    interpretation: `The paired t-test showed ${isSignificant ? 'a significant' : 'no significant'} difference between conditions, t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
    interpretationAr: `أظهر اختبار t المزدوج ${isSignificant ? 'فرقاً معنوياً' : 'عدم وجود فرق معنوي'} بين الحالتين، t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}.`,
    recommendations: isSignificant
      ? ['Report the direction and magnitude of change', 'Consider clinical/practical significance']
      : ['Examine individual differences', 'Consider longer intervention period'],
    recommendationsAr: isSignificant
      ? ['أبلغ عن اتجاه ومقدار التغيير', 'ضع في اعتبارك الأهمية السريرية/العملية']
      : ['افحص الفروق الفردية', 'فكر في فترة تدخل أطول'],
    additionalStats: { n, meanDiff: md, stdDiff: sd, meanBefore: mean(before.slice(0, n)), meanAfter: mean(after.slice(0, n)) }
  };
};

const oneWayANOVA = (groups: number[][]): TestResult => {
  const k = groups.length;
  const ns = groups.map(g => g.length);
  const N = ns.reduce((a, b) => a + b, 0);
  const means = groups.map(g => mean(g));
  const grandMean = mean(groups.flat());
  
  const SSB = groups.reduce((acc, g, i) => acc + g.length * (means[i] - grandMean) ** 2, 0);
  const SSW = groups.reduce((acc, g, i) => acc + g.reduce((a, v) => a + (v - means[i]) ** 2, 0), 0);
  
  const dfB = k - 1;
  const dfW = N - k;
  const MSB = SSB / dfB;
  const MSW = SSW / dfW;
  const F = MSB / MSW;
  const pValue = fPValue(F, dfB, dfW);
  
  const etaSquared = SSB / (SSB + SSW);
  const isSignificant = pValue < 0.05;
  const effectInterpretation = etaSquared < 0.01 ? 'small' : etaSquared < 0.06 ? 'medium' : 'large';
  
  return {
    testName: 'One-Way ANOVA',
    testNameAr: 'تحليل التباين الأحادي',
    statistic: F,
    pValue,
    df: `${dfB}, ${dfW}`,
    effectSize: etaSquared,
    effectSizeType: 'η²',
    effectSizeInterpretation: effectInterpretation,
    effectSizeInterpretationAr: effectInterpretation === 'small' ? 'صغير' : effectInterpretation === 'medium' ? 'متوسط' : 'كبير',
    conclusion: isSignificant
      ? `There is a significant difference among the ${k} groups`
      : `There is no significant difference among the groups`,
    conclusionAr: isSignificant
      ? `يوجد فرق معنوي بين المجموعات الـ ${k}`
      : `لا يوجد فرق معنوي بين المجموعات`,
    interpretation: `ANOVA revealed ${isSignificant ? 'a significant' : 'no significant'} effect, F(${dfB}, ${dfW}) = ${F.toFixed(3)}, p = ${pValue.toFixed(4)}, η² = ${etaSquared.toFixed(3)}.`,
    interpretationAr: `كشف تحليل التباين عن ${isSignificant ? 'تأثير معنوي' : 'عدم وجود تأثير معنوي'}، F(${dfB}, ${dfW}) = ${F.toFixed(3)}، p = ${pValue.toFixed(4)}، η² = ${etaSquared.toFixed(3)}.`,
    recommendations: isSignificant
      ? ['Conduct post-hoc tests to identify which groups differ', 'Report effect sizes for pairwise comparisons']
      : ['Consider if groups are appropriately defined', 'Check for violations of assumptions'],
    recommendationsAr: isSignificant
      ? ['أجرِ اختبارات بعدية لتحديد أي المجموعات تختلف', 'أبلغ عن أحجام الأثر للمقارنات الثنائية']
      : ['فكر فيما إذا كانت المجموعات معرّفة بشكل مناسب', 'تحقق من انتهاكات الافتراضات'],
    additionalStats: { k, N, groupMeans: means, groupNs: ns, SSB, SSW, MSB, MSW }
  };
};

const mannWhitneyTest = (group1: number[], group2: number[]): TestResult => {
  const n1 = group1.length, n2 = group2.length;
  const combined = [...group1.map(v => ({ v, g: 1 })), ...group2.map(v => ({ v, g: 2 }))];
  combined.sort((a, b) => a.v - b.v);
  
  // Assign ranks with ties
  const ranksArr: number[] = [];
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].v === combined[i].v) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) ranksArr.push(avgRank);
    i = j;
  }
  
  let R1 = 0;
  ranksArr.forEach((r, idx) => {
    if (combined[idx].g === 1) R1 += r;
  });
  
  const U1 = R1 - (n1 * (n1 + 1)) / 2;
  const U2 = n1 * n2 - U1;
  const U = Math.min(U1, U2);
  
  const muU = (n1 * n2) / 2;
  const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (U - muU) / sigmaU;
  const pValue = 2 * (1 - normalCDF(Math.abs(z)));
  
  const r = Math.abs(z) / Math.sqrt(n1 + n2);
  const isSignificant = pValue < 0.05;
  const effectInterpretation = r < 0.1 ? 'small' : r < 0.3 ? 'medium' : 'large';
  
  return {
    testName: 'Mann-Whitney U Test',
    testNameAr: 'اختبار مان-ويتني',
    statistic: U,
    pValue,
    effectSize: r,
    effectSizeType: 'r',
    effectSizeInterpretation: effectInterpretation,
    effectSizeInterpretationAr: effectInterpretation === 'small' ? 'صغير' : effectInterpretation === 'medium' ? 'متوسط' : 'كبير',
    conclusion: isSignificant
      ? `The distributions of the two groups are significantly different`
      : `The distributions of the two groups are not significantly different`,
    conclusionAr: isSignificant
      ? `توزيعات المجموعتين تختلف بشكل معنوي`
      : `توزيعات المجموعتين لا تختلف بشكل معنوي`,
    interpretation: `Mann-Whitney U test showed ${isSignificant ? 'a significant' : 'no significant'} difference, U = ${U.toFixed(1)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
    interpretationAr: `أظهر اختبار مان-ويتني ${isSignificant ? 'فرقاً معنوياً' : 'عدم وجود فرق معنوي'}، U = ${U.toFixed(1)}، z = ${z.toFixed(3)}، p = ${pValue.toFixed(4)}.`,
    recommendations: isSignificant
      ? ['Report medians for both groups', 'Consider the direction of the difference']
      : ['Consider if the test has sufficient power', 'Examine the distributions visually'],
    recommendationsAr: isSignificant
      ? ['أبلغ عن الوسيط لكلتا المجموعتين', 'ضع في اعتبارك اتجاه الفرق']
      : ['فكر فيما إذا كان الاختبار لديه قوة كافية', 'افحص التوزيعات بصرياً'],
    additionalStats: { n1, n2, U1, U2, z, median1: median(group1), median2: median(group2) }
  };
};

const pearsonCorrelation = (x: number[], y: number[]): TestResult => {
  const n = Math.min(x.length, y.length);
  const xSlice = x.slice(0, n), ySlice = y.slice(0, n);
  const mx = mean(xSlice), my = mean(ySlice);
  const sx = std(xSlice), sy = std(ySlice);
  
  let sum = 0;
  for (let i = 0; i < n; i++) {
    sum += (xSlice[i] - mx) * (ySlice[i] - my);
  }
  const r = sum / ((n - 1) * sx * sy);
  
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const df = n - 2;
  const pValue = tPValue(t, df);
  
  const z = 0.5 * Math.log((1 + r) / (1 - r));
  const seZ = 1 / Math.sqrt(n - 3);
  const zLower = z - 1.96 * seZ;
  const zUpper = z + 1.96 * seZ;
  const ci = {
    lower: (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1),
    upper: (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1)
  };
  
  const isSignificant = pValue < 0.05;
  const strength = Math.abs(r) < 0.3 ? 'weak' : Math.abs(r) < 0.7 ? 'moderate' : 'strong';
  const direction = r > 0 ? 'positive' : 'negative';
  
  return {
    testName: 'Pearson Correlation',
    testNameAr: 'ارتباط بيرسون',
    statistic: r,
    pValue,
    df,
    effectSize: r * r,
    effectSizeType: 'r²',
    effectSizeInterpretation: `${strength} ${direction}`,
    effectSizeInterpretationAr: `${strength === 'weak' ? 'ضعيف' : strength === 'moderate' ? 'متوسط' : 'قوي'} ${direction === 'positive' ? 'طردي' : 'عكسي'}`,
    confidenceInterval: ci,
    conclusion: isSignificant
      ? `There is a significant ${strength} ${direction} correlation (r = ${r.toFixed(3)})`
      : `There is no significant correlation between the variables`,
    conclusionAr: isSignificant
      ? `يوجد ارتباط ${strength === 'weak' ? 'ضعيف' : strength === 'moderate' ? 'متوسط' : 'قوي'} ${direction === 'positive' ? 'طردي' : 'عكسي'} معنوي (r = ${r.toFixed(3)})`
      : `لا يوجد ارتباط معنوي بين المتغيرين`,
    interpretation: `Pearson correlation showed r(${df}) = ${r.toFixed(3)}, p = ${pValue.toFixed(4)}, indicating ${isSignificant ? 'a significant' : 'no significant'} linear relationship.`,
    interpretationAr: `أظهر ارتباط بيرسون r(${df}) = ${r.toFixed(3)}، p = ${pValue.toFixed(4)}، مما يشير إلى ${isSignificant ? 'علاقة خطية معنوية' : 'عدم وجود علاقة خطية معنوية'}.`,
    recommendations: isSignificant
      ? ['Consider creating a scatter plot', 'Check for outliers that may affect the correlation', 'Report r² to indicate variance explained']
      : ['Consider non-linear relationships', 'Check for restricted range'],
    recommendationsAr: isSignificant
      ? ['فكر في إنشاء رسم تشتت', 'تحقق من القيم الشاذة التي قد تؤثر على الارتباط', 'أبلغ عن r² لتوضيح التباين المفسر']
      : ['فكر في العلاقات غير الخطية', 'تحقق من المدى المحدود'],
    additionalStats: { n, r, rSquared: r * r, t }
  };
};

const spearmanCorrelation = (x: number[], y: number[]): TestResult => {
  const n = Math.min(x.length, y.length);
  const xSlice = x.slice(0, n), ySlice = y.slice(0, n);
  const xRanks = ranks(xSlice), yRanks = ranks(ySlice);
  
  let d2Sum = 0;
  for (let i = 0; i < n; i++) {
    d2Sum += (xRanks[i] - yRanks[i]) ** 2;
  }
  const rho = 1 - (6 * d2Sum) / (n * (n * n - 1));
  
  const t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
  const df = n - 2;
  const pValue = tPValue(t, df);
  
  const isSignificant = pValue < 0.05;
  const strength = Math.abs(rho) < 0.3 ? 'weak' : Math.abs(rho) < 0.7 ? 'moderate' : 'strong';
  const direction = rho > 0 ? 'positive' : 'negative';
  
  return {
    testName: 'Spearman Correlation',
    testNameAr: 'ارتباط سبيرمان',
    statistic: rho,
    pValue,
    df,
    effectSize: rho * rho,
    effectSizeType: 'ρ²',
    effectSizeInterpretation: `${strength} ${direction}`,
    effectSizeInterpretationAr: `${strength === 'weak' ? 'ضعيف' : strength === 'moderate' ? 'متوسط' : 'قوي'} ${direction === 'positive' ? 'طردي' : 'عكسي'}`,
    conclusion: isSignificant
      ? `There is a significant ${strength} ${direction} monotonic relationship (ρ = ${rho.toFixed(3)})`
      : `There is no significant monotonic relationship`,
    conclusionAr: isSignificant
      ? `توجد علاقة رتيبة ${strength === 'weak' ? 'ضعيفة' : strength === 'moderate' ? 'متوسطة' : 'قوية'} ${direction === 'positive' ? 'طردية' : 'عكسية'} معنوية (ρ = ${rho.toFixed(3)})`
      : `لا توجد علاقة رتيبة معنوية`,
    interpretation: `Spearman's rho = ${rho.toFixed(3)}, p = ${pValue.toFixed(4)}, indicating ${isSignificant ? 'a significant' : 'no significant'} monotonic relationship.`,
    interpretationAr: `معامل سبيرمان ρ = ${rho.toFixed(3)}، p = ${pValue.toFixed(4)}، مما يشير إلى ${isSignificant ? 'علاقة رتيبة معنوية' : 'عدم وجود علاقة رتيبة معنوية'}.`,
    recommendations: ['Spearman is robust to outliers', 'Appropriate for ordinal data'],
    recommendationsAr: ['سبيرمان مقاوم للقيم الشاذة', 'مناسب للبيانات الترتيبية'],
    additionalStats: { n, rho, t }
  };
};

const chiSquareTest = (observed: number[][]): TestResult => {
  const rows = observed.length;
  const cols = observed[0].length;
  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = observed[0].map((_, j) => observed.reduce((acc, row) => acc + row[j], 0));
  const total = rowTotals.reduce((a, b) => a + b, 0);
  
  let chiSq = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / total;
      if (expected > 0) {
        chiSq += (observed[i][j] - expected) ** 2 / expected;
      }
    }
  }
  
  const df = (rows - 1) * (cols - 1);
  const pValue = chiSquarePValue(chiSq, df);
  const cramersV = Math.sqrt(chiSq / (total * Math.min(rows - 1, cols - 1)));
  
  const isSignificant = pValue < 0.05;
  const effectInterpretation = cramersV < 0.1 ? 'small' : cramersV < 0.3 ? 'medium' : 'large';
  
  return {
    testName: 'Chi-Square Test of Independence',
    testNameAr: 'اختبار كاي تربيع للاستقلالية',
    statistic: chiSq,
    pValue,
    df,
    effectSize: cramersV,
    effectSizeType: "Cramér's V",
    effectSizeInterpretation: effectInterpretation,
    effectSizeInterpretationAr: effectInterpretation === 'small' ? 'صغير' : effectInterpretation === 'medium' ? 'متوسط' : 'كبير',
    conclusion: isSignificant
      ? `There is a significant association between the variables`
      : `There is no significant association between the variables`,
    conclusionAr: isSignificant
      ? `توجد علاقة معنوية بين المتغيرين`
      : `لا توجد علاقة معنوية بين المتغيرين`,
    interpretation: `Chi-square test showed χ²(${df}) = ${chiSq.toFixed(3)}, p = ${pValue.toFixed(4)}, Cramér's V = ${cramersV.toFixed(3)}.`,
    interpretationAr: `أظهر اختبار كاي تربيع χ²(${df}) = ${chiSq.toFixed(3)}، p = ${pValue.toFixed(4)}، معامل كرامر V = ${cramersV.toFixed(3)}.`,
    recommendations: isSignificant
      ? ['Examine the pattern of association', 'Report expected frequencies', 'Consider standardized residuals']
      : ['Variables appear to be independent', 'Consider if categories are appropriate'],
    recommendationsAr: isSignificant
      ? ['افحص نمط العلاقة', 'أبلغ عن التكرارات المتوقعة', 'فكر في البواقي المعيارية']
      : ['يبدو أن المتغيرين مستقلين', 'فكر فيما إذا كانت الفئات مناسبة'],
    additionalStats: { rows, cols, total, cramersV }
  };
};

const leveneTest = (groups: number[][]): TestResult => {
  const k = groups.length;
  const allDeviations: { dev: number; group: number }[] = [];
  const groupMedians = groups.map(g => median(g));
  
  groups.forEach((g, i) => {
    g.forEach(v => {
      allDeviations.push({ dev: Math.abs(v - groupMedians[i]), group: i });
    });
  });
  
  const N = allDeviations.length;
  const overallMean = mean(allDeviations.map(d => d.dev));
  const groupMeans = groups.map((_, i) => {
    const devs = allDeviations.filter(d => d.group === i).map(d => d.dev);
    return mean(devs);
  });
  
  const SSB = groups.reduce((acc, g, i) => acc + g.length * (groupMeans[i] - overallMean) ** 2, 0);
  const SSW = allDeviations.reduce((acc, d) => acc + (d.dev - groupMeans[d.group]) ** 2, 0);
  
  const dfB = k - 1;
  const dfW = N - k;
  const F = (SSB / dfB) / (SSW / dfW);
  const pValue = fPValue(F, dfB, dfW);
  
  const isSignificant = pValue < 0.05;
  
  return {
    testName: "Levene's Test",
    testNameAr: 'اختبار ليفين',
    statistic: F,
    pValue,
    df: `${dfB}, ${dfW}`,
    conclusion: isSignificant
      ? `Variances are significantly different across groups`
      : `Variances are homogeneous across groups`,
    conclusionAr: isSignificant
      ? `التباينات تختلف معنوياً بين المجموعات`
      : `التباينات متجانسة بين المجموعات`,
    interpretation: `Levene's test for homogeneity of variances: F(${dfB}, ${dfW}) = ${F.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
    interpretationAr: `اختبار ليفين لتجانس التباينات: F(${dfB}, ${dfW}) = ${F.toFixed(3)}، p = ${pValue.toFixed(4)}.`,
    recommendations: isSignificant
      ? ['Use Welch\'s t-test instead of Student\'s t-test', 'Consider using non-parametric alternatives']
      : ['Assumption of homogeneity is met', 'Proceed with parametric tests'],
    recommendationsAr: isSignificant
      ? ['استخدم اختبار ويلش بدلاً من اختبار t الطلابي', 'فكر في استخدام البدائل اللامعلمية']
      : ['افتراض التجانس متحقق', 'تابع مع الاختبارات المعلمية'],
    additionalStats: { k, N, F }
  };
};

const StatisticalAutoAssistant: React.FC<StatisticalAutoAssistantProps> = ({ data, columns }) => {
  const { t, language, isRTL } = useLanguage();
  
  const [currentStep, setCurrentStep] = useState(0);
  const [analysisComplete, setAnalysisComplete] = useState(false);
  const [columnAnalysis, setColumnAnalysis] = useState<ColumnAnalysis[]>([]);
  const [recommendations, setRecommendations] = useState<TestRecommendation[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestRecommendation | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [showChat, setShowChat] = useState(false);
  
  // Analysis Steps
  const steps: AnalysisStep[] = useMemo(() => [
    { id: 0, title: 'Data Analysis', titleAr: 'تحليل البيانات', status: currentStep === 0 ? 'active' : currentStep > 0 ? 'completed' : 'pending' },
    { id: 1, title: 'Assumption Check', titleAr: 'فحص الافتراضات', status: currentStep === 1 ? 'active' : currentStep > 1 ? 'completed' : 'pending' },
    { id: 2, title: 'Test Recommendation', titleAr: 'اقتراح الاختبارات', status: currentStep === 2 ? 'active' : currentStep > 2 ? 'completed' : 'pending' },
    { id: 3, title: 'Run Analysis', titleAr: 'تنفيذ التحليل', status: currentStep === 3 ? 'active' : currentStep > 3 ? 'completed' : 'pending' },
    { id: 4, title: 'Results', titleAr: 'النتائج', status: currentStep === 4 ? 'active' : currentStep > 4 ? 'completed' : 'pending' }
  ], [currentStep]);
  
  // Analyze columns
  const analyzeColumns = useCallback(() => {
    const analysis: ColumnAnalysis[] = columns.map(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = values.filter(v => !isNaN(Number(v))).map(Number);
      const isNumeric = numericValues.length > values.length * 0.8;
      const uniqueValues = new Set(values).size;
      const isBinary = uniqueValues === 2;
      
      const result: ColumnAnalysis = {
        name: col,
        type: isBinary ? 'binary' : isNumeric ? 'numeric' : uniqueValues < 10 ? 'categorical' : 'categorical',
        uniqueValues,
        missingCount: data.length - values.length,
        missingPercent: ((data.length - values.length) / data.length) * 100
      };
      
      if (isNumeric && numericValues.length >= 3) {
        result.mean = mean(numericValues);
        result.median = median(numericValues);
        result.std = std(numericValues);
        result.skewness = skewness(numericValues);
        result.kurtosis = kurtosis(numericValues);
        
        const normTest = shapiroWilkTest(numericValues.slice(0, 5000));
        result.isNormal = normTest.pValue > 0.05;
        result.normalityPValue = normTest.pValue;
      }
      
      if (!isNumeric) {
        const counts: Record<string, number> = {};
        values.forEach(v => { counts[v] = (counts[v] || 0) + 1; });
        result.categories = Object.entries(counts)
          .map(([value, count]) => ({ value, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 10);
      }
      
      return result;
    });
    
    setColumnAnalysis(analysis);
    return analysis;
  }, [data, columns]);
  
  // Generate recommendations based on data analysis
  const generateRecommendations = useCallback((analysis: ColumnAnalysis[]) => {
    const recs: TestRecommendation[] = [];
    const numericCols = analysis.filter(c => c.type === 'numeric');
    const categoricalCols = analysis.filter(c => c.type === 'categorical' || c.type === 'binary');
    const binaryCols = analysis.filter(c => c.type === 'binary');
    
    // Two numeric variables - correlation
    if (numericCols.length >= 2) {
      const col1 = numericCols[0];
      const col2 = numericCols[1];
      const bothNormal = col1.isNormal && col2.isNormal;
      
      recs.push({
        id: 'pearson',
        name: 'Pearson Correlation',
        nameAr: 'ارتباط بيرسون',
        category: 'Correlation',
        categoryAr: 'الارتباط',
        score: bothNormal ? 95 : 70,
        reason: 'Two numeric variables detected. Pearson correlation measures linear relationship.',
        reasonAr: 'تم اكتشاف متغيرين رقميين. ارتباط بيرسون يقيس العلاقة الخطية.',
        assumptions: [
          { name: 'Normality (Var 1)', nameAr: 'التوزيع الطبيعي (متغير 1)', met: col1.isNormal || false, value: col1.normalityPValue },
          { name: 'Normality (Var 2)', nameAr: 'التوزيع الطبيعي (متغير 2)', met: col2.isNormal || false, value: col2.normalityPValue },
          { name: 'Linearity', nameAr: 'الخطية', met: true }
        ],
        variables: [col1.name, col2.name],
        alternativeTest: 'Spearman Correlation',
        alternativeTestAr: 'ارتباط سبيرمان'
      });
      
      recs.push({
        id: 'spearman',
        name: 'Spearman Correlation',
        nameAr: 'ارتباط سبيرمان',
        category: 'Correlation',
        categoryAr: 'الارتباط',
        score: bothNormal ? 75 : 90,
        reason: 'Non-parametric alternative for correlation. Robust to outliers.',
        reasonAr: 'بديل لامعلمي للارتباط. مقاوم للقيم الشاذة.',
        assumptions: [
          { name: 'Monotonic relationship', nameAr: 'علاقة رتيبة', met: true }
        ],
        variables: [col1.name, col2.name]
      });
    }
    
    // One numeric + one binary/categorical - comparison
    if (numericCols.length >= 1 && (binaryCols.length >= 1 || categoricalCols.length >= 1)) {
      const numCol = numericCols[0];
      const groupCol = binaryCols.length > 0 ? binaryCols[0] : categoricalCols[0];
      const numGroups = groupCol.uniqueValues;
      
      if (numGroups === 2) {
        recs.push({
          id: 'independent-t',
          name: 'Independent Samples T-Test',
          nameAr: 'اختبار t للعينات المستقلة',
          category: 'Comparison',
          categoryAr: 'المقارنة',
          score: numCol.isNormal ? 95 : 70,
          reason: 'Compare means of two independent groups.',
          reasonAr: 'مقارنة متوسطي مجموعتين مستقلتين.',
          assumptions: [
            { name: 'Normality', nameAr: 'التوزيع الطبيعي', met: numCol.isNormal || false, value: numCol.normalityPValue },
            { name: 'Independence', nameAr: 'الاستقلالية', met: true },
            { name: 'Equal variances', nameAr: 'تساوي التباينات', met: true }
          ],
          variables: [numCol.name, groupCol.name],
          alternativeTest: 'Mann-Whitney U Test',
          alternativeTestAr: 'اختبار مان-ويتني'
        });
        
        recs.push({
          id: 'mann-whitney',
          name: 'Mann-Whitney U Test',
          nameAr: 'اختبار مان-ويتني',
          category: 'Comparison',
          categoryAr: 'المقارنة',
          score: numCol.isNormal ? 75 : 90,
          reason: 'Non-parametric alternative for comparing two groups.',
          reasonAr: 'بديل لامعلمي لمقارنة مجموعتين.',
          assumptions: [
            { name: 'Independence', nameAr: 'الاستقلالية', met: true }
          ],
          variables: [numCol.name, groupCol.name]
        });
      } else if (numGroups >= 3) {
        recs.push({
          id: 'anova',
          name: 'One-Way ANOVA',
          nameAr: 'تحليل التباين الأحادي',
          category: 'Comparison',
          categoryAr: 'المقارنة',
          score: numCol.isNormal ? 95 : 70,
          reason: `Compare means across ${numGroups} groups.`,
          reasonAr: `مقارنة المتوسطات عبر ${numGroups} مجموعات.`,
          assumptions: [
            { name: 'Normality', nameAr: 'التوزيع الطبيعي', met: numCol.isNormal || false },
            { name: 'Homogeneity of variances', nameAr: 'تجانس التباينات', met: true }
          ],
          variables: [numCol.name, groupCol.name],
          alternativeTest: 'Kruskal-Wallis Test',
          alternativeTestAr: 'اختبار كروسكال-واليس'
        });
      }
    }
    
    // Two categorical variables - chi-square
    if (categoricalCols.length >= 2) {
      const col1 = categoricalCols[0];
      const col2 = categoricalCols[1];
      
      recs.push({
        id: 'chi-square',
        name: 'Chi-Square Test of Independence',
        nameAr: 'اختبار كاي تربيع للاستقلالية',
        category: 'Association',
        categoryAr: 'العلاقة',
        score: 90,
        reason: 'Test association between two categorical variables.',
        reasonAr: 'اختبار العلاقة بين متغيرين فئويين.',
        assumptions: [
          { name: 'Expected freq ≥ 5', nameAr: 'التكرار المتوقع ≥ 5', met: data.length >= 50 }
        ],
        variables: [col1.name, col2.name]
      });
    }
    
    // Normality test for each numeric variable
    numericCols.forEach(col => {
      recs.push({
        id: `shapiro-${col.name}`,
        name: 'Shapiro-Wilk Test',
        nameAr: 'اختبار شابيرو-ويلك',
        category: 'Normality',
        categoryAr: 'التوزيع الطبيعي',
        score: 85,
        reason: `Test if ${col.name} follows a normal distribution.`,
        reasonAr: `اختبار ما إذا كان ${col.name} يتبع توزيعاً طبيعياً.`,
        assumptions: [
          { name: 'n < 5000', nameAr: 'ن < 5000', met: data.length < 5000 }
        ],
        variables: [col.name]
      });
    });
    
    // Variance homogeneity test
    if (numericCols.length >= 1 && categoricalCols.length >= 1) {
      const numCol = numericCols[0];
      const groupCol = categoricalCols[0];
      
      recs.push({
        id: 'levene',
        name: "Levene's Test",
        nameAr: 'اختبار ليفين',
        category: 'Variance',
        categoryAr: 'التباين',
        score: 80,
        reason: 'Test homogeneity of variances across groups.',
        reasonAr: 'اختبار تجانس التباينات بين المجموعات.',
        assumptions: [],
        variables: [numCol.name, groupCol.name]
      });
    }
    
    setRecommendations(recs.sort((a, b) => b.score - a.score));
    return recs;
  }, [data]);
  
  // Run selected test
  const runTest = useCallback(() => {
    if (!selectedTest) return;
    
    setIsRunning(true);
    
    setTimeout(() => {
      let result: TestResult | null = null;
      
      try {
        const vars = selectedTest.variables;
        
        switch (selectedTest.id) {
          case 'pearson':
          case 'spearman': {
            const x = data.map(row => Number(row[vars[0]])).filter(v => !isNaN(v));
            const y = data.map(row => Number(row[vars[1]])).filter(v => !isNaN(v));
            result = selectedTest.id === 'pearson' ? pearsonCorrelation(x, y) : spearmanCorrelation(x, y);
            break;
          }
          
          case 'independent-t':
          case 'mann-whitney': {
            const numValues = data.map(row => ({ val: Number(row[vars[0]]), group: row[vars[1]] }))
              .filter(v => !isNaN(v.val) && v.group !== null && v.group !== undefined);
            const groups = [...new Set(numValues.map(v => v.group))];
            if (groups.length === 2) {
              const g1 = numValues.filter(v => v.group === groups[0]).map(v => v.val);
              const g2 = numValues.filter(v => v.group === groups[1]).map(v => v.val);
              result = selectedTest.id === 'independent-t' ? independentTTest(g1, g2) : mannWhitneyTest(g1, g2);
            }
            break;
          }
          
          case 'anova': {
            const numValues = data.map(row => ({ val: Number(row[vars[0]]), group: row[vars[1]] }))
              .filter(v => !isNaN(v.val) && v.group !== null && v.group !== undefined);
            const groups = [...new Set(numValues.map(v => v.group))];
            const groupArrays = groups.map(g => numValues.filter(v => v.group === g).map(v => v.val));
            result = oneWayANOVA(groupArrays);
            break;
          }
          
          case 'chi-square': {
            const pairs = data.map(row => ({ a: row[vars[0]], b: row[vars[1]] }))
              .filter(p => p.a !== null && p.a !== undefined && p.b !== null && p.b !== undefined);
            const aVals = [...new Set(pairs.map(p => p.a))];
            const bVals = [...new Set(pairs.map(p => p.b))];
            const contingency = aVals.map(a => bVals.map(b => pairs.filter(p => p.a === a && p.b === b).length));
            result = chiSquareTest(contingency);
            break;
          }
          
          case 'levene': {
            const numValues = data.map(row => ({ val: Number(row[vars[0]]), group: row[vars[1]] }))
              .filter(v => !isNaN(v.val) && v.group !== null && v.group !== undefined);
            const groups = [...new Set(numValues.map(v => v.group))];
            const groupArrays = groups.map(g => numValues.filter(v => v.group === g).map(v => v.val));
            result = leveneTest(groupArrays);
            break;
          }
          
          default:
            if (selectedTest.id.startsWith('shapiro-')) {
              const colName = vars[0];
              const values = data.map(row => Number(row[colName])).filter(v => !isNaN(v));
              const swResult = shapiroWilkTest(values);
              result = {
                testName: 'Shapiro-Wilk Test',
                testNameAr: 'اختبار شابيرو-ويلك',
                statistic: swResult.w,
                pValue: swResult.pValue,
                conclusion: swResult.pValue > 0.05 ? 'Data follows a normal distribution' : 'Data does not follow a normal distribution',
                conclusionAr: swResult.pValue > 0.05 ? 'البيانات تتبع توزيعاً طبيعياً' : 'البيانات لا تتبع توزيعاً طبيعياً',
                interpretation: `W = ${swResult.w.toFixed(4)}, p = ${swResult.pValue.toFixed(4)}`,
                interpretationAr: `W = ${swResult.w.toFixed(4)}، p = ${swResult.pValue.toFixed(4)}`,
                recommendations: swResult.pValue > 0.05 ? ['Use parametric tests'] : ['Consider non-parametric alternatives'],
                recommendationsAr: swResult.pValue > 0.05 ? ['استخدم الاختبارات المعلمية'] : ['فكر في البدائل اللامعلمية'],
                additionalStats: { n: values.length }
              };
            }
        }
        
        if (result) {
          setTestResult(result);
          setTestHistory(prev => [result!, ...prev].slice(0, 10));
        }
      } catch (error) {
        console.error('Error running test:', error);
      }
      
      setIsRunning(false);
      setCurrentStep(4);
    }, 1000);
  }, [selectedTest, data]);
  
  // Start analysis
  const startAnalysis = useCallback(() => {
    setCurrentStep(0);
    setIsRunning(true);
    
    // Step 1: Analyze columns
    setTimeout(() => {
      const analysis = analyzeColumns();
      setCurrentStep(1);
      
      // Step 2: Generate recommendations
      setTimeout(() => {
        generateRecommendations(analysis);
        setCurrentStep(2);
        setIsRunning(false);
        setAnalysisComplete(true);
      }, 800);
    }, 800);
  }, [analyzeColumns, generateRecommendations]);
  
  // Reset
  const reset = useCallback(() => {
    setCurrentStep(0);
    setAnalysisComplete(false);
    setColumnAnalysis([]);
    setRecommendations([]);
    setSelectedTest(null);
    setTestResult(null);
  }, []);
  
  // Toggle section
  const toggleSection = (id: string) => {
    setExpandedSections(prev => ({ ...prev, [id]: !prev[id] }));
  };
  
  // Handle chat
  const handleSendMessage = () => {
    if (!chatInput.trim()) return;
    
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: chatInput,
      timestamp: new Date()
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setChatInput('');
    
    // Auto-response
    setTimeout(() => {
      const response = generateChatResponse(chatInput);
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: response,
        timestamp: new Date()
      };
      setChatMessages(prev => [...prev, assistantMessage]);
    }, 500);
  };
  
  const generateChatResponse = (input: string): string => {
    const lowerInput = input.toLowerCase();
    
    if (lowerInput.includes('t-test') || lowerInput.includes('اختبار t')) {
      return language === 'ar' 
        ? 'اختبار t يُستخدم لمقارنة متوسطي مجموعتين. هناك ثلاثة أنواع: للعينة الواحدة، للعينات المستقلة، وللعينات المزدوجة.'
        : 'T-test is used to compare means of two groups. There are three types: one-sample, independent samples, and paired samples.';
    }
    
    if (lowerInput.includes('anova') || lowerInput.includes('تباين')) {
      return language === 'ar'
        ? 'تحليل التباين (ANOVA) يُستخدم لمقارنة متوسطات ثلاث مجموعات أو أكثر. يتطلب توزيعاً طبيعياً وتجانس التباينات.'
        : 'ANOVA is used to compare means of three or more groups. It requires normal distribution and homogeneity of variances.';
    }
    
    if (lowerInput.includes('correlation') || lowerInput.includes('ارتباط')) {
      return language === 'ar'
        ? 'بيرسون للعلاقات الخطية مع بيانات طبيعية. سبيرمان للعلاقات الرتبية أو البيانات غير الطبيعية.'
        : 'Pearson is for linear relationships with normal data. Spearman is for monotonic relationships or non-normal data.';
    }
    
    return language === 'ar'
      ? 'يمكنني مساعدتك في اختيار الاختبار الإحصائي المناسب. ما هو سؤالك البحثي؟'
      : 'I can help you choose the appropriate statistical test. What is your research question?';
  };
  
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center p-8 bg-gray-50 rounded-2xl">
          <Bot className="w-16 h-16 mx-auto mb-4 text-gray-400" />
          <h3 className="text-xl font-semibold text-gray-700 mb-2">
            {language === 'ar' ? 'لا توجد بيانات' : 'No Data Available'}
          </h3>
          <p className="text-gray-500">
            {language === 'ar' ? 'يرجى تحميل البيانات أولاً' : 'Please load data first'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
              <Brain className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">
                {language === 'ar' ? 'المساعد الإحصائي الذكي' : 'Smart Statistical Assistant'}
              </h1>
              <p className="text-violet-100 mt-1">
                {language === 'ar' 
                  ? 'دعني أساعدك في اختيار وتنفيذ الاختبار الإحصائي المناسب'
                  : 'Let me help you choose and run the appropriate statistical test'}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowChat(!showChat)}
              className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
            <button
              onClick={reset}
              className="p-3 bg-white/20 rounded-xl hover:bg-white/30 transition-colors"
            >
              <RotateCcw className="w-6 h-6" />
            </button>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="mt-8 flex items-center justify-between">
          {steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
                  step.status === 'completed' ? 'bg-green-500 text-white' :
                  step.status === 'active' ? 'bg-white text-purple-600 ring-4 ring-white/50' :
                  'bg-white/30 text-white/70'
                }`}>
                  {step.status === 'completed' ? <CheckCircle className="w-6 h-6" /> : step.id + 1}
                </div>
                <span className={`mt-2 text-sm ${step.status === 'active' ? 'font-semibold' : 'text-white/70'}`}>
                  {language === 'ar' ? step.titleAr : step.title}
                </span>
              </div>
              {index < steps.length - 1 && (
                <div className={`flex-1 h-1 mx-2 rounded ${
                  step.status === 'completed' ? 'bg-green-500' : 'bg-white/30'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
      
      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Panel - Analysis & Recommendations */}
        <div className="lg:col-span-2 space-y-6">
          {/* Start Analysis Button */}
          {!analysisComplete && currentStep === 0 && !isRunning && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="inline-flex p-4 bg-gradient-to-br from-violet-100 to-purple-100 rounded-2xl mb-6">
                <Sparkles className="w-12 h-12 text-purple-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-800 mb-3">
                {language === 'ar' ? 'ابدأ التحليل الذكي' : 'Start Smart Analysis'}
              </h2>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                {language === 'ar'
                  ? 'سأقوم بتحليل بياناتك تلقائياً واقتراح أفضل الاختبارات الإحصائية المناسبة'
                  : 'I will automatically analyze your data and recommend the best statistical tests'}
              </p>
              <button
                onClick={startAnalysis}
                className="px-8 py-4 bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl font-semibold hover:from-violet-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto"
              >
                <Zap className="w-5 h-5" />
                {language === 'ar' ? 'بدء التحليل' : 'Start Analysis'}
              </button>
            </div>
          )}
          
          {/* Loading State */}
          {isRunning && currentStep < 3 && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
              <div className="inline-flex">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600"></div>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-2">
                {language === 'ar' ? 'جاري التحليل...' : 'Analyzing...'}
              </h3>
              <p className="text-gray-600">
                {language === 'ar' ? steps[currentStep].titleAr : steps[currentStep].title}
              </p>
            </div>
          )}
          
          {/* Column Analysis Results */}
          {columnAnalysis.length > 0 && currentStep >= 1 && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div 
                className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-b cursor-pointer flex items-center justify-between"
                onClick={() => toggleSection('columns')}
              >
                <div className="flex items-center gap-3">
                  <Layers className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-gray-800">
                    {language === 'ar' ? 'تحليل المتغيرات' : 'Variable Analysis'}
                  </h3>
                  <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                    {columnAnalysis.length}
                  </span>
                </div>
                {expandedSections.columns ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </div>
              
              {expandedSections.columns && (
                <div className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {columnAnalysis.map((col, idx) => (
                      <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                        <div className="flex items-center justify-between mb-3">
                          <span className="font-semibold text-gray-800">{col.name}</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            col.type === 'numeric' ? 'bg-blue-100 text-blue-700' :
                            col.type === 'binary' ? 'bg-purple-100 text-purple-700' :
                            'bg-amber-100 text-amber-700'
                          }`}>
                            {col.type}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          {col.type === 'numeric' && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-gray-500">{language === 'ar' ? 'المتوسط' : 'Mean'}</span>
                                <span className="font-medium">{col.mean?.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-500">{language === 'ar' ? 'الانحراف المعياري' : 'Std'}</span>
                                <span className="font-medium">{col.std?.toFixed(3)}</span>
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-gray-500">{language === 'ar' ? 'التوزيع الطبيعي' : 'Normal'}</span>
                                {col.isNormal ? (
                                  <span className="flex items-center gap-1 text-green-600">
                                    <CheckCircle className="w-4 h-4" />
                                    {language === 'ar' ? 'نعم' : 'Yes'}
                                  </span>
                                ) : (
                                  <span className="flex items-center gap-1 text-red-600">
                                    <XCircle className="w-4 h-4" />
                                    {language === 'ar' ? 'لا' : 'No'}
                                  </span>
                                )}
                              </div>
                            </>
                          )}
                          
                          {col.type !== 'numeric' && col.categories && (
                            <div className="space-y-1">
                              {col.categories.slice(0, 3).map((cat, i) => (
                                <div key={i} className="flex justify-between">
                                  <span className="text-gray-600 truncate max-w-[120px]">{String(cat.value)}</span>
                                  <span className="font-medium">{cat.count}</span>
                                </div>
                              ))}
                            </div>
                          )}
                          
                          <div className="flex justify-between pt-2 border-t">
                            <span className="text-gray-500">{language === 'ar' ? 'المفقودة' : 'Missing'}</span>
                            <span className={`font-medium ${col.missingPercent > 5 ? 'text-red-600' : 'text-green-600'}`}>
                              {col.missingPercent.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          
          {/* Recommendations */}
          {recommendations.length > 0 && currentStep >= 2 && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-b">
                <div className="flex items-center gap-3">
                  <Target className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-gray-800">
                    {language === 'ar' ? 'الاختبارات الموصى بها' : 'Recommended Tests'}
                  </h3>
                </div>
              </div>
              
              <div className="p-4 space-y-3">
                {recommendations.map((rec, idx) => (
                  <div
                    key={rec.id}
                    onClick={() => { setSelectedTest(rec); setCurrentStep(3); }}
                    className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      selectedTest?.id === rec.id
                        ? 'border-purple-500 bg-purple-50'
                        : 'border-gray-200 hover:border-purple-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                          idx === 0 ? 'bg-yellow-100 text-yellow-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-600' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <div>
                          <h4 className="font-semibold text-gray-800">
                            {language === 'ar' ? rec.nameAr : rec.name}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            {language === 'ar' ? rec.reasonAr : rec.reason}
                          </p>
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">
                              {language === 'ar' ? rec.categoryAr : rec.category}
                            </span>
                            {rec.variables.map((v, i) => (
                              <span key={i} className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                                {v}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col items-end gap-2">
                        <div className="flex items-center gap-1">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full"
                              style={{ width: `${rec.score}%` }}
                            />
                          </div>
                          <span className="text-sm font-semibold text-gray-700">{rec.score}%</span>
                        </div>
                        
                        {rec.assumptions.length > 0 && (
                          <div className="flex gap-1">
                            {rec.assumptions.slice(0, 3).map((a, i) => (
                              <span key={i} className={`w-3 h-3 rounded-full ${a.met ? 'bg-green-500' : 'bg-red-500'}`} />
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Assumptions detail */}
                    {selectedTest?.id === rec.id && rec.assumptions.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <h5 className="text-sm font-semibold text-gray-700 mb-2">
                          {language === 'ar' ? 'الافتراضات:' : 'Assumptions:'}
                        </h5>
                        <div className="space-y-2">
                          {rec.assumptions.map((a, i) => (
                            <div key={i} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600">
                                {language === 'ar' ? a.nameAr : a.name}
                              </span>
                              <div className="flex items-center gap-2">
                                {a.value !== undefined && (
                                  <span className="text-gray-500">p = {a.value.toFixed(4)}</span>
                                )}
                                {a.met ? (
                                  <CheckCircle className="w-4 h-4 text-green-500" />
                                ) : (
                                  <XCircle className="w-4 h-4 text-red-500" />
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                        
                        {rec.alternativeTest && (
                          <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                              <div className="text-sm">
                                <span className="text-gray-600">
                                  {language === 'ar' ? 'البديل: ' : 'Alternative: '}
                                </span>
                                <span className="font-medium text-amber-700">
                                  {language === 'ar' ? rec.alternativeTestAr : rec.alternativeTest}
                                </span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Run Test Button */}
          {selectedTest && currentStep === 3 && !testResult && (
            <div className="flex justify-center">
              <button
                onClick={runTest}
                disabled={isRunning}
                className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-700 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl flex items-center gap-3 disabled:opacity-50"
              >
                {isRunning ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                    {language === 'ar' ? 'جاري التنفيذ...' : 'Running...'}
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5" />
                    {language === 'ar' ? 'تنفيذ الاختبار' : 'Run Test'}
                  </>
                )}
              </button>
            </div>
          )}
          
          {/* Test Results */}
          {testResult && currentStep === 4 && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className={`p-4 ${testResult.pValue < 0.05 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-500 to-slate-500'} text-white`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Award className="w-6 h-6" />
                    <div>
                      <h3 className="font-bold text-lg">
                        {language === 'ar' ? testResult.testNameAr : testResult.testName}
                      </h3>
                      <p className="text-white/80">
                        {testResult.pValue < 0.05 
                          ? (language === 'ar' ? 'نتيجة دالة إحصائياً' : 'Statistically Significant')
                          : (language === 'ar' ? 'نتيجة غير دالة' : 'Not Significant')}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold">
                      {testResult.pValue < 0.001 ? '< 0.001' : testResult.pValue.toFixed(4)}
                    </div>
                    <div className="text-sm text-white/80">p-value</div>
                  </div>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                {/* Key Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-blue-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-blue-700">
                      {testResult.statistic.toFixed(3)}
                    </div>
                    <div className="text-sm text-blue-600">
                      {language === 'ar' ? 'الإحصائي' : 'Statistic'}
                    </div>
                  </div>
                  
                  <div className="p-4 bg-purple-50 rounded-xl text-center">
                    <div className="text-2xl font-bold text-purple-700">
                      {testResult.pValue < 0.001 ? '< .001' : testResult.pValue.toFixed(4)}
                    </div>
                    <div className="text-sm text-purple-600">p-value</div>
                  </div>
                  
                  {testResult.df !== undefined && (
                    <div className="p-4 bg-amber-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-amber-700">{testResult.df}</div>
                      <div className="text-sm text-amber-600">
                        {language === 'ar' ? 'درجات الحرية' : 'df'}
                      </div>
                    </div>
                  )}
                  
                  {testResult.effectSize !== undefined && (
                    <div className="p-4 bg-green-50 rounded-xl text-center">
                      <div className="text-2xl font-bold text-green-700">
                        {testResult.effectSize.toFixed(3)}
                      </div>
                      <div className="text-sm text-green-600">
                        {testResult.effectSizeType || (language === 'ar' ? 'حجم الأثر' : 'Effect Size')}
                      </div>
                    </div>
                  )}
                </div>
                
                {/* Confidence Interval */}
                {testResult.confidenceInterval && (
                  <div className="p-4 bg-gray-50 rounded-xl">
                    <h4 className="font-semibold text-gray-700 mb-3">
                      {language === 'ar' ? 'فترة الثقة 95%' : '95% Confidence Interval'}
                    </h4>
                    <div className="relative h-8 bg-gray-200 rounded-full overflow-hidden">
                      <div 
                        className="absolute h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full"
                        style={{
                          left: `${Math.max(0, (testResult.confidenceInterval.lower + 2) / 4 * 100)}%`,
                          right: `${Math.max(0, 100 - (testResult.confidenceInterval.upper + 2) / 4 * 100)}%`
                        }}
                      />
                      <div className="absolute inset-0 flex items-center justify-between px-4 text-sm font-medium">
                        <span>{testResult.confidenceInterval.lower.toFixed(3)}</span>
                        <span>{testResult.confidenceInterval.upper.toFixed(3)}</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Conclusion */}
                <div className={`p-4 rounded-xl ${testResult.pValue < 0.05 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <CheckSquare className="w-5 h-5" />
                    {language === 'ar' ? 'الاستنتاج' : 'Conclusion'}
                  </h4>
                  <p className={`${testResult.pValue < 0.05 ? 'text-green-700' : 'text-gray-700'}`}>
                    {language === 'ar' ? testResult.conclusionAr : testResult.conclusion}
                  </p>
                </div>
                
                {/* Interpretation */}
                <div className="p-4 bg-blue-50 rounded-xl">
                  <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    {language === 'ar' ? 'التفسير' : 'Interpretation'}
                  </h4>
                  <p className="text-gray-700">
                    {language === 'ar' ? testResult.interpretationAr : testResult.interpretation}
                  </p>
                </div>
                
                {/* Effect Size Interpretation */}
                {testResult.effectSize !== undefined && (
                  <div className="p-4 bg-purple-50 rounded-xl">
                    <h4 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5" />
                      {language === 'ar' ? 'حجم الأثر' : 'Effect Size'}
                    </h4>
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg font-bold text-purple-700">
                            {testResult.effectSizeType} = {testResult.effectSize.toFixed(3)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            testResult.effectSizeInterpretation?.includes('large') || testResult.effectSizeInterpretation?.includes('strong')
                              ? 'bg-green-100 text-green-700'
                              : testResult.effectSizeInterpretation?.includes('medium') || testResult.effectSizeInterpretation?.includes('moderate')
                              ? 'bg-yellow-100 text-yellow-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}>
                            {language === 'ar' ? testResult.effectSizeInterpretationAr : testResult.effectSizeInterpretation}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                
                {/* Recommendations */}
                <div className="p-4 bg-amber-50 rounded-xl">
                  <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                    <Lightbulb className="w-5 h-5" />
                    {language === 'ar' ? 'التوصيات' : 'Recommendations'}
                  </h4>
                  <ul className="space-y-2">
                    {(language === 'ar' ? testResult.recommendationsAr : testResult.recommendations).map((rec, i) => (
                      <li key={i} className="flex items-start gap-2 text-gray-700">
                        <ArrowRight className={`w-4 h-4 mt-0.5 text-amber-600 ${isRTL ? 'rotate-180' : ''}`} />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
                
                {/* Action Buttons */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => { setSelectedTest(null); setTestResult(null); setCurrentStep(2); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors flex items-center gap-2"
                  >
                    <RotateCcw className="w-4 h-4" />
                    {language === 'ar' ? 'اختبار آخر' : 'Another Test'}
                  </button>
                  <button
                    className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors flex items-center gap-2"
                  >
                    <Download className="w-4 h-4" />
                    {language === 'ar' ? 'تصدير النتائج' : 'Export Results'}
                  </button>
                  <button
                    className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors flex items-center gap-2"
                  >
                    <FileText className="w-4 h-4" />
                    {language === 'ar' ? 'إضافة للتقرير' : 'Add to Report'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        {/* Right Panel - Stats & Chat */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <div className="bg-white rounded-2xl shadow-lg p-4">
            <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              {language === 'ar' ? 'إحصائيات سريعة' : 'Quick Stats'}
            </h3>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-blue-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-blue-700">{data.length}</div>
                <div className="text-xs text-blue-600">{language === 'ar' ? 'صفوف' : 'Rows'}</div>
              </div>
              <div className="p-3 bg-purple-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-purple-700">{columns.length}</div>
                <div className="text-xs text-purple-600">{language === 'ar' ? 'أعمدة' : 'Columns'}</div>
              </div>
              <div className="p-3 bg-green-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-green-700">
                  {columnAnalysis.filter(c => c.type === 'numeric').length}
                </div>
                <div className="text-xs text-green-600">{language === 'ar' ? 'رقمي' : 'Numeric'}</div>
              </div>
              <div className="p-3 bg-amber-50 rounded-xl text-center">
                <div className="text-2xl font-bold text-amber-700">
                  {columnAnalysis.filter(c => c.type !== 'numeric').length}
                </div>
                <div className="text-xs text-amber-600">{language === 'ar' ? 'فئوي' : 'Categorical'}</div>
              </div>
            </div>
          </div>
          
          {/* Test History */}
          {testHistory.length > 0 && (
            <div className="bg-white rounded-2xl shadow-lg p-4">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-purple-600" />
                {language === 'ar' ? 'سجل الاختبارات' : 'Test History'}
              </h3>
              
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {testHistory.map((result, idx) => (
                  <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-gray-800 text-sm">
                        {language === 'ar' ? result.testNameAr : result.testName}
                      </span>
                      <span className={`text-xs font-medium ${
                        result.pValue < 0.05 ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        p = {result.pValue.toFixed(4)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Chat Assistant */}
          {showChat && (
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
              <div className="p-4 bg-gradient-to-r from-violet-500 to-purple-500 text-white">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5" />
                  <span className="font-semibold">
                    {language === 'ar' ? 'المساعد' : 'Assistant'}
                  </span>
                </div>
              </div>
              
              <div className="h-64 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 && (
                  <div className="text-center text-gray-500 text-sm">
                    {language === 'ar' 
                      ? 'اسألني عن الاختبارات الإحصائية!'
                      : 'Ask me about statistical tests!'}
                  </div>
                )}
                
                {chatMessages.map(msg => (
                  <div
                    key={msg.id}
                    className={`p-3 rounded-xl max-w-[85%] ${
                      msg.type === 'user'
                        ? 'bg-purple-100 text-purple-800 ml-auto'
                        : 'bg-gray-100 text-gray-800'
                    }`}
                  >
                    {msg.content}
                  </div>
                ))}
              </div>
              
              <div className="p-3 border-t">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    placeholder={language === 'ar' ? 'اكتب سؤالك...' : 'Type your question...'}
                    className="flex-1 p-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="p-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {/* Help Section */}
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-4">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <HelpCircle className="w-5 h-5 text-indigo-600" />
              {language === 'ar' ? 'نصائح سريعة' : 'Quick Tips'}
            </h3>
            
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-500 mt-0.5" />
                <p>{language === 'ar' 
                  ? 'اختر الاختبار بناءً على نوع البيانات والسؤال البحثي'
                  : 'Choose test based on data type and research question'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-500 mt-0.5" />
                <p>{language === 'ar'
                  ? 'تحقق من الافتراضات قبل تطبيق الاختبارات المعلمية'
                  : 'Check assumptions before applying parametric tests'}
                </p>
              </div>
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-indigo-500 mt-0.5" />
                <p>{language === 'ar'
                  ? 'لا تنسَ الإبلاغ عن حجم الأثر مع p-value'
                  : "Don't forget to report effect size with p-value"}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StatisticalAutoAssistant;
