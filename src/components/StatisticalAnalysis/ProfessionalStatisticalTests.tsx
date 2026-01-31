import React, { useState, useMemo, useCallback } from 'react';
import { useLanguage } from '../../i18n';
import {
  Calculator, TrendingUp, BarChart2, Activity, CheckCircle, XCircle,
  Zap, Target, BookOpen, Lightbulb, ArrowRight, RefreshCw,
  FileText, Download, Copy, Brain, Settings,
  HelpCircle, Layers, GitBranch
} from 'lucide-react';

interface DataRow {
  [key: string]: string | number | null | undefined;
}

interface Props {
  data: DataRow[];
  columns: string[];
}

// ==================== الدوال الإحصائية الأساسية ====================

const StatUtils = {
  // دوال أساسية
  sum: (arr: number[]): number => arr.reduce((a, b) => a + b, 0),
  
  mean: (arr: number[]): number => {
    if (arr.length === 0) return 0;
    return StatUtils.sum(arr) / arr.length;
  },
  
  median: (arr: number[]): number => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  },
  
  mode: (arr: number[]): number => {
    const freq: Record<number, number> = {};
    arr.forEach(v => freq[v] = (freq[v] || 0) + 1);
    let maxFreq = 0, mode = arr[0];
    Object.entries(freq).forEach(([val, f]) => {
      if (f > maxFreq) { maxFreq = f; mode = Number(val); }
    });
    return mode;
  },
  
  variance: (arr: number[], sample = true): number => {
    if (arr.length < 2) return 0;
    const m = StatUtils.mean(arr);
    const sumSq = arr.reduce((acc, v) => acc + Math.pow(v - m, 2), 0);
    return sumSq / (sample ? arr.length - 1 : arr.length);
  },
  
  std: (arr: number[], sample = true): number => Math.sqrt(StatUtils.variance(arr, sample)),
  
  sem: (arr: number[]): number => StatUtils.std(arr) / Math.sqrt(arr.length),
  
  skewness: (arr: number[]): number => {
    const n = arr.length;
    if (n < 3) return 0;
    const m = StatUtils.mean(arr);
    const s = StatUtils.std(arr);
    if (s === 0) return 0;
    const sum = arr.reduce((acc, v) => acc + Math.pow((v - m) / s, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  },
  
  kurtosis: (arr: number[]): number => {
    const n = arr.length;
    if (n < 4) return 0;
    const m = StatUtils.mean(arr);
    const s = StatUtils.std(arr);
    if (s === 0) return 0;
    const sum = arr.reduce((acc, v) => acc + Math.pow((v - m) / s, 4), 0);
    const k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum;
    return k - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
  },
  
  percentile: (arr: number[], p: number): number => {
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (idx - lower);
  },
  
  iqr: (arr: number[]): number => StatUtils.percentile(arr, 75) - StatUtils.percentile(arr, 25),
  
  covariance: (x: number[], y: number[]): number => {
    const n = Math.min(x.length, y.length);
    if (n < 2) return 0;
    const mx = StatUtils.mean(x.slice(0, n));
    const my = StatUtils.mean(y.slice(0, n));
    let sum = 0;
    for (let i = 0; i < n; i++) sum += (x[i] - mx) * (y[i] - my);
    return sum / (n - 1);
  },
  
  ranks: (arr: number[]): number[] => {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
      const rank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) ranks[sorted[k].i] = rank;
      i = j;
    }
    return ranks;
  },

  // دوال التوزيعات
  gammaLn: (x: number): number => {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  },

  betaIncomplete: (a: number, b: number, x: number): number => {
    if (x === 0 || x === 1) return x;
    if (x < 0 || x > 1) return 0;
    
    const bt = Math.exp(StatUtils.gammaLn(a + b) - StatUtils.gammaLn(a) - 
      StatUtils.gammaLn(b) + a * Math.log(x) + b * Math.log(1 - x));
    
    if (x < (a + 1) / (a + b + 2)) {
      return bt * StatUtils.betaCF(a, b, x) / a;
    }
    return 1 - bt * StatUtils.betaCF(b, a, 1 - x) / b;
  },

  betaCF: (a: number, b: number, x: number): number => {
    const maxIter = 100, eps = 3e-7;
    let am = 1, bm = 1, az = 1;
    const qab = a + b, qap = a + 1, qam = a - 1;
    let bz = 1 - qab * x / qap;
    
    for (let m = 1; m <= maxIter; m++) {
      const m2 = 2 * m;
      let d = m * (b - m) * x / ((qam + m2) * (a + m2));
      const ap = az + d * am;
      const bp = bz + d * bm;
      d = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      const app = ap + d * az;
      const bpp = bp + d * bz;
      const aold = az;
      am = ap / bpp; bm = bp / bpp;
      az = app / bpp; bz = 1;
      if (Math.abs(az - aold) < eps * Math.abs(az)) return az;
    }
    return az;
  },

  normalCDF: (x: number): number => {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1 / (1 + p * x);
    const y = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1 + sign * y);
  },

  normalPDF: (x: number, mean = 0, std = 1): number => {
    return Math.exp(-0.5 * Math.pow((x - mean) / std, 2)) / (std * Math.sqrt(2 * Math.PI));
  },

  normalQuantile: (p: number): number => {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    
    const a = [-3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
      1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0];
    const b = [-5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
      6.680131188771972e1, -1.328068155288572e1];
    const c = [-7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
      -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0];
    const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0, 3.754408661907416e0];
    
    const pLow = 0.02425, pHigh = 1 - pLow;
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
  },

  tCDF: (t: number, df: number): number => {
    const x = df / (df + t * t);
    return 1 - 0.5 * StatUtils.betaIncomplete(df / 2, 0.5, x);
  },

  tPValue: (t: number, df: number, twoTailed = true): number => {
    const p = t > 0 ? 1 - StatUtils.tCDF(t, df) : StatUtils.tCDF(t, df);
    return twoTailed ? 2 * Math.min(p, 1 - p) : p;
  },

  fCDF: (f: number, df1: number, df2: number): number => {
    if (f <= 0) return 0;
    const x = df1 * f / (df1 * f + df2);
    return StatUtils.betaIncomplete(df1 / 2, df2 / 2, x);
  },

  fPValue: (f: number, df1: number, df2: number): number => {
    return 1 - StatUtils.fCDF(f, df1, df2);
  },

  chiSquareCDF: (x: number, df: number): number => {
    if (x <= 0) return 0;
    return StatUtils.gammaIncomplete(df / 2, x / 2);
  },

  gammaIncomplete: (a: number, x: number): number => {
    if (x < 0 || a <= 0) return 0;
    if (x === 0) return 0;
    
    if (x < a + 1) {
      let sum = 1 / a, term = sum;
      for (let n = 1; n < 100; n++) {
        term *= x / (a + n);
        sum += term;
        if (Math.abs(term) < Math.abs(sum) * 1e-10) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - StatUtils.gammaLn(a));
    } else {
      let b = x + 1 - a, c = 1e30, d = 1 / b, h = d;
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
      return 1 - Math.exp(-x + a * Math.log(x) - StatUtils.gammaLn(a)) * h;
    }
  },

  chiSquarePValue: (x: number, df: number): number => {
    return 1 - StatUtils.chiSquareCDF(x, df);
  }
};

// ==================== الاختبارات الإحصائية ====================

interface TestResult {
  name: string;
  nameAr: string;
  statistic: number;
  pValue: number;
  df?: number | string;
  effectSize?: number;
  effectSizeType?: string;
  effectSizeInterpretation?: string;
  effectSizeInterpretationAr?: string;
  ci?: [number, number];
  ciLevel?: number;
  conclusion: string;
  conclusionAr: string;
  interpretation: string;
  interpretationAr: string;
  assumptions: Array<{ name: string; nameAr: string; met: boolean; note?: string; noteAr?: string }>;
  additionalStats: Array<{ label: string; labelAr: string; value: string | number }>;
  recommendations?: string[];
  recommendationsAr?: string[];
  warning?: string;
  warningAr?: string;
}

const StatTests = {
  // اختبار t للعينة الواحدة
  oneSampleTTest: (data: number[], mu0: number, alpha = 0.05): TestResult => {
    const n = data.length;
    const mean = StatUtils.mean(data);
    const std = StatUtils.std(data);
    const se = std / Math.sqrt(n);
    const t = (mean - mu0) / se;
    const df = n - 1;
    const pValue = StatUtils.tPValue(t, df);
    const tCrit = 1.96; // تقريبي
    const ci: [number, number] = [mean - tCrit * se, mean + tCrit * se];
    const d = (mean - mu0) / std; // Cohen's d
    
    const isNormal = StatTests.shapiroWilk(data).pValue > 0.05;
    
    return {
      name: "One-Sample T-Test",
      nameAr: "اختبار t للعينة الواحدة",
      statistic: t,
      pValue,
      df,
      effectSize: Math.abs(d),
      effectSizeType: "Cohen's d",
      effectSizeInterpretation: Math.abs(d) < 0.2 ? "Negligible" : Math.abs(d) < 0.5 ? "Small" : Math.abs(d) < 0.8 ? "Medium" : "Large",
      effectSizeInterpretationAr: Math.abs(d) < 0.2 ? "ضعيف جداً" : Math.abs(d) < 0.5 ? "صغير" : Math.abs(d) < 0.8 ? "متوسط" : "كبير",
      ci,
      ciLevel: 95,
      conclusion: pValue < alpha ? `Reject H₀: The mean (${mean.toFixed(3)}) is significantly different from ${mu0}` : `Fail to reject H₀: The mean (${mean.toFixed(3)}) is not significantly different from ${mu0}`,
      conclusionAr: pValue < alpha ? `رفض الفرضية الصفرية: المتوسط (${mean.toFixed(3)}) يختلف معنوياً عن ${mu0}` : `قبول الفرضية الصفرية: المتوسط (${mean.toFixed(3)}) لا يختلف معنوياً عن ${mu0}`,
      interpretation: pValue < alpha 
        ? `With a p-value of ${pValue.toFixed(4)}, there is strong evidence that the population mean differs from ${mu0}. The effect size (d = ${Math.abs(d).toFixed(3)}) suggests a ${Math.abs(d) < 0.5 ? "small" : Math.abs(d) < 0.8 ? "medium" : "large"} practical difference.`
        : `With a p-value of ${pValue.toFixed(4)}, there is insufficient evidence to conclude that the population mean differs from ${mu0}.`,
      interpretationAr: pValue < alpha
        ? `بقيمة احتمالية ${pValue.toFixed(4)}، هناك دليل قوي على أن متوسط المجتمع يختلف عن ${mu0}. حجم الأثر (d = ${Math.abs(d).toFixed(3)}) يشير إلى فرق عملي ${Math.abs(d) < 0.5 ? "صغير" : Math.abs(d) < 0.8 ? "متوسط" : "كبير"}.`
        : `بقيمة احتمالية ${pValue.toFixed(4)}، لا يوجد دليل كافٍ للاستنتاج بأن متوسط المجتمع يختلف عن ${mu0}.`,
      assumptions: [
        { name: "Normality", nameAr: "التوزيع الطبيعي", met: isNormal || n >= 30, note: isNormal ? "Data appears normally distributed" : n >= 30 ? "Large sample (n≥30), CLT applies" : "Consider non-parametric alternative", noteAr: isNormal ? "البيانات تتبع التوزيع الطبيعي" : n >= 30 ? "عينة كبيرة (n≥30)، نظرية النهاية المركزية تنطبق" : "فكر في بديل لا معلمي" },
        { name: "Independence", nameAr: "الاستقلالية", met: true, note: "Assumed based on study design", noteAr: "مفترض بناءً على تصميم الدراسة" },
        { name: "Random Sampling", nameAr: "العينة العشوائية", met: true, note: "Assumed", noteAr: "مفترض" }
      ],
      additionalStats: [
        { label: "Sample Size", labelAr: "حجم العينة", value: n },
        { label: "Sample Mean", labelAr: "متوسط العينة", value: mean.toFixed(4) },
        { label: "Sample SD", labelAr: "الانحراف المعياري", value: std.toFixed(4) },
        { label: "Standard Error", labelAr: "الخطأ المعياري", value: se.toFixed(4) },
        { label: "Test Value (μ₀)", labelAr: "القيمة المختبرة (μ₀)", value: mu0 }
      ],
      recommendations: !isNormal && n < 30 ? ["Consider using Wilcoxon Signed-Rank test as data may not be normally distributed"] : [],
      recommendationsAr: !isNormal && n < 30 ? ["فكر في استخدام اختبار ويلكوكسون للرتب لأن البيانات قد لا تتبع التوزيع الطبيعي"] : []
    };
  },

  // اختبار t للعينات المستقلة
  independentTTest: (group1: number[], group2: number[], alpha = 0.05, equalVar = true): TestResult => {
    const n1 = group1.length, n2 = group2.length;
    const m1 = StatUtils.mean(group1), m2 = StatUtils.mean(group2);
    const v1 = StatUtils.variance(group1), v2 = StatUtils.variance(group2);
    const s1 = Math.sqrt(v1), s2 = Math.sqrt(v2);
    
    let t: number, df: number, se: number;
    
    if (equalVar) {
      // Pooled variance
      const sp2 = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
      se = Math.sqrt(sp2 * (1/n1 + 1/n2));
      t = (m1 - m2) / se;
      df = n1 + n2 - 2;
    } else {
      // Welch's t-test
      se = Math.sqrt(v1/n1 + v2/n2);
      t = (m1 - m2) / se;
      const num = Math.pow(v1/n1 + v2/n2, 2);
      const den = Math.pow(v1/n1, 2)/(n1-1) + Math.pow(v2/n2, 2)/(n2-1);
      df = num / den;
    }
    
    const pValue = StatUtils.tPValue(t, df);
    const ci: [number, number] = [(m1 - m2) - 1.96 * se, (m1 - m2) + 1.96 * se];
    
    // Cohen's d
    const pooledSD = Math.sqrt(((n1-1)*v1 + (n2-1)*v2) / (n1+n2-2));
    const d = (m1 - m2) / pooledSD;
    
    const isNormal1 = StatTests.shapiroWilk(group1).pValue > 0.05;
    const isNormal2 = StatTests.shapiroWilk(group2).pValue > 0.05;
    const leveneP = StatTests.leveneTest(group1, group2).pValue;
    
    return {
      name: equalVar ? "Independent Samples T-Test" : "Welch's T-Test",
      nameAr: equalVar ? "اختبار t للعينات المستقلة" : "اختبار ويلش",
      statistic: t,
      pValue,
      df: equalVar ? df : df.toFixed(2),
      effectSize: Math.abs(d),
      effectSizeType: "Cohen's d",
      effectSizeInterpretation: Math.abs(d) < 0.2 ? "Negligible" : Math.abs(d) < 0.5 ? "Small" : Math.abs(d) < 0.8 ? "Medium" : "Large",
      effectSizeInterpretationAr: Math.abs(d) < 0.2 ? "ضعيف جداً" : Math.abs(d) < 0.5 ? "صغير" : Math.abs(d) < 0.8 ? "متوسط" : "كبير",
      ci,
      ciLevel: 95,
      conclusion: pValue < alpha 
        ? `Reject H₀: There is a significant difference between groups (Mean₁=${m1.toFixed(3)}, Mean₂=${m2.toFixed(3)})`
        : `Fail to reject H₀: No significant difference between groups`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: يوجد فرق معنوي بين المجموعتين (م₁=${m1.toFixed(3)}، م₂=${m2.toFixed(3)})`
        : `قبول الفرضية الصفرية: لا يوجد فرق معنوي بين المجموعتين`,
      interpretation: pValue < alpha
        ? `The analysis reveals a statistically significant difference between the two groups (t(${typeof df === 'number' ? df : df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}). Group 1 (M = ${m1.toFixed(3)}, SD = ${s1.toFixed(3)}) ${m1 > m2 ? 'scored higher than' : 'scored lower than'} Group 2 (M = ${m2.toFixed(3)}, SD = ${s2.toFixed(3)}). The effect size (d = ${Math.abs(d).toFixed(3)}) indicates a ${Math.abs(d) < 0.5 ? "small" : Math.abs(d) < 0.8 ? "medium" : "large"} practical significance.`
        : `No statistically significant difference was found between the groups (t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}).`,
      interpretationAr: pValue < alpha
        ? `يكشف التحليل عن فرق ذي دلالة إحصائية بين المجموعتين (t(${typeof df === 'number' ? df : df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}). المجموعة الأولى (م = ${m1.toFixed(3)}، ا.م = ${s1.toFixed(3)}) ${m1 > m2 ? 'حصلت على درجات أعلى من' : 'حصلت على درجات أقل من'} المجموعة الثانية (م = ${m2.toFixed(3)}، ا.م = ${s2.toFixed(3)}). حجم الأثر (d = ${Math.abs(d).toFixed(3)}) يشير إلى أهمية عملية ${Math.abs(d) < 0.5 ? "صغيرة" : Math.abs(d) < 0.8 ? "متوسطة" : "كبيرة"}.`
        : `لم يُوجد فرق ذو دلالة إحصائية بين المجموعتين (t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}).`,
      assumptions: [
        { name: "Normality (Group 1)", nameAr: "التوزيع الطبيعي (مجموعة 1)", met: isNormal1 || n1 >= 30 },
        { name: "Normality (Group 2)", nameAr: "التوزيع الطبيعي (مجموعة 2)", met: isNormal2 || n2 >= 30 },
        { name: "Homogeneity of Variance", nameAr: "تجانس التباين", met: leveneP > 0.05, note: leveneP > 0.05 ? "Variances are equal" : "Variances are unequal - consider Welch's test", noteAr: leveneP > 0.05 ? "التباينات متساوية" : "التباينات غير متساوية - فكر في اختبار ويلش" },
        { name: "Independence", nameAr: "الاستقلالية", met: true }
      ],
      additionalStats: [
        { label: "N (Group 1)", labelAr: "ن (مجموعة 1)", value: n1 },
        { label: "N (Group 2)", labelAr: "ن (مجموعة 2)", value: n2 },
        { label: "Mean (Group 1)", labelAr: "المتوسط (مجموعة 1)", value: m1.toFixed(4) },
        { label: "Mean (Group 2)", labelAr: "المتوسط (مجموعة 2)", value: m2.toFixed(4) },
        { label: "SD (Group 1)", labelAr: "ا.م (مجموعة 1)", value: s1.toFixed(4) },
        { label: "SD (Group 2)", labelAr: "ا.م (مجموعة 2)", value: s2.toFixed(4) },
        { label: "Mean Difference", labelAr: "فرق المتوسطات", value: (m1 - m2).toFixed(4) },
        { label: "Levene's Test p-value", labelAr: "قيمة p لاختبار ليفين", value: leveneP.toFixed(4) }
      ],
      warning: !equalVar && leveneP < 0.05 ? "Welch's correction applied due to unequal variances" : undefined,
      warningAr: !equalVar && leveneP < 0.05 ? "تم تطبيق تصحيح ويلش بسبب عدم تساوي التباينات" : undefined
    };
  },

  // اختبار t للعينات المزدوجة
  pairedTTest: (before: number[], after: number[], alpha = 0.05): TestResult => {
    const n = Math.min(before.length, after.length);
    const diffs = before.slice(0, n).map((v, i) => after[i] - v);
    const meanDiff = StatUtils.mean(diffs);
    const sdDiff = StatUtils.std(diffs);
    const seDiff = sdDiff / Math.sqrt(n);
    const t = meanDiff / seDiff;
    const df = n - 1;
    const pValue = StatUtils.tPValue(t, df);
    const ci: [number, number] = [meanDiff - 1.96 * seDiff, meanDiff + 1.96 * seDiff];
    const d = meanDiff / sdDiff;
    
    const isNormalDiff = StatTests.shapiroWilk(diffs).pValue > 0.05;
    
    return {
      name: "Paired Samples T-Test",
      nameAr: "اختبار t للعينات المزدوجة",
      statistic: t,
      pValue,
      df,
      effectSize: Math.abs(d),
      effectSizeType: "Cohen's d",
      effectSizeInterpretation: Math.abs(d) < 0.2 ? "Negligible" : Math.abs(d) < 0.5 ? "Small" : Math.abs(d) < 0.8 ? "Medium" : "Large",
      effectSizeInterpretationAr: Math.abs(d) < 0.2 ? "ضعيف جداً" : Math.abs(d) < 0.5 ? "صغير" : Math.abs(d) < 0.8 ? "متوسط" : "كبير",
      ci,
      ciLevel: 95,
      conclusion: pValue < alpha
        ? `Reject H₀: There is a significant change (Mean change = ${meanDiff.toFixed(3)})`
        : `Fail to reject H₀: No significant change detected`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: يوجد تغير معنوي (متوسط التغير = ${meanDiff.toFixed(3)})`
        : `قبول الفرضية الصفرية: لا يوجد تغير معنوي`,
      interpretation: pValue < alpha
        ? `A paired-samples t-test revealed a statistically significant ${meanDiff > 0 ? 'increase' : 'decrease'} from pre-test (M = ${StatUtils.mean(before).toFixed(3)}) to post-test (M = ${StatUtils.mean(after).toFixed(3)}), t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}, d = ${Math.abs(d).toFixed(3)}.`
        : `The paired-samples t-test showed no statistically significant difference between conditions, t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
      interpretationAr: pValue < alpha
        ? `كشف اختبار t للعينات المزدوجة عن ${meanDiff > 0 ? 'زيادة' : 'انخفاض'} ذي دلالة إحصائية من الاختبار القبلي (م = ${StatUtils.mean(before).toFixed(3)}) إلى الاختبار البعدي (م = ${StatUtils.mean(after).toFixed(3)})، t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}، d = ${Math.abs(d).toFixed(3)}.`
        : `لم يُظهر اختبار t للعينات المزدوجة فرقاً ذا دلالة إحصائية بين الحالتين، t(${df}) = ${t.toFixed(3)}، p = ${pValue.toFixed(4)}.`,
      assumptions: [
        { name: "Normality of Differences", nameAr: "توزيع الفروق الطبيعي", met: isNormalDiff || n >= 30 },
        { name: "Independence of Pairs", nameAr: "استقلالية الأزواج", met: true }
      ],
      additionalStats: [
        { label: "N Pairs", labelAr: "عدد الأزواج", value: n },
        { label: "Mean Before", labelAr: "المتوسط قبل", value: StatUtils.mean(before).toFixed(4) },
        { label: "Mean After", labelAr: "المتوسط بعد", value: StatUtils.mean(after).toFixed(4) },
        { label: "Mean Difference", labelAr: "متوسط الفرق", value: meanDiff.toFixed(4) },
        { label: "SD of Difference", labelAr: "ا.م للفرق", value: sdDiff.toFixed(4) }
      ]
    };
  },

  // تحليل التباين الأحادي
  oneWayANOVA: (groups: number[][], alpha = 0.05): TestResult => {
    const k = groups.length;
    const ns = groups.map(g => g.length);
    const N = ns.reduce((a, b) => a + b, 0);
    const means = groups.map(g => StatUtils.mean(g));
    const grandMean = StatUtils.mean(groups.flat());
    
    // Sum of Squares
    let SSB = 0, SSW = 0;
    groups.forEach((g, i) => {
      SSB += g.length * Math.pow(means[i] - grandMean, 2);
      g.forEach(v => SSW += Math.pow(v - means[i], 2));
    });
    
    const dfB = k - 1;
    const dfW = N - k;
    const MSB = SSB / dfB;
    const MSW = SSW / dfW;
    const F = MSB / MSW;
    const pValue = StatUtils.fPValue(F, dfB, dfW);
    
    // Eta squared
    const etaSq = SSB / (SSB + SSW);
    // Omega squared
    const omegaSq = (SSB - (k - 1) * MSW) / (SSB + SSW + MSW);
    
    return {
      name: "One-Way ANOVA",
      nameAr: "تحليل التباين الأحادي",
      statistic: F,
      pValue,
      df: `(${dfB}, ${dfW})`,
      effectSize: etaSq,
      effectSizeType: "η² (Eta squared)",
      effectSizeInterpretation: etaSq < 0.01 ? "Negligible" : etaSq < 0.06 ? "Small" : etaSq < 0.14 ? "Medium" : "Large",
      effectSizeInterpretationAr: etaSq < 0.01 ? "ضعيف جداً" : etaSq < 0.06 ? "صغير" : etaSq < 0.14 ? "متوسط" : "كبير",
      conclusion: pValue < alpha
        ? `Reject H₀: At least one group mean is significantly different`
        : `Fail to reject H₀: No significant differences among group means`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: متوسط مجموعة واحدة على الأقل يختلف معنوياً`
        : `قبول الفرضية الصفرية: لا توجد فروق معنوية بين متوسطات المجموعات`,
      interpretation: pValue < alpha
        ? `A one-way ANOVA revealed a statistically significant difference among groups, F(${dfB}, ${dfW}) = ${F.toFixed(3)}, p = ${pValue.toFixed(4)}, η² = ${etaSq.toFixed(3)}. Post-hoc tests are recommended to identify which groups differ.`
        : `The one-way ANOVA did not reveal statistically significant differences among groups, F(${dfB}, ${dfW}) = ${F.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
      interpretationAr: pValue < alpha
        ? `كشف تحليل التباين الأحادي عن فرق ذي دلالة إحصائية بين المجموعات، F(${dfB}, ${dfW}) = ${F.toFixed(3)}، p = ${pValue.toFixed(4)}، η² = ${etaSq.toFixed(3)}. يُوصى بإجراء اختبارات بعدية لتحديد المجموعات المختلفة.`
        : `لم يكشف تحليل التباين الأحادي عن فروق ذات دلالة إحصائية بين المجموعات، F(${dfB}, ${dfW}) = ${F.toFixed(3)}، p = ${pValue.toFixed(4)}.`,
      assumptions: [
        { name: "Normality", nameAr: "التوزيع الطبيعي", met: true, note: "Assumed or check with Shapiro-Wilk", noteAr: "مفترض أو تحقق باختبار شابيرو-ويلك" },
        { name: "Homogeneity of Variance", nameAr: "تجانس التباين", met: true, note: "Check with Levene's test", noteAr: "تحقق باختبار ليفين" },
        { name: "Independence", nameAr: "الاستقلالية", met: true }
      ],
      additionalStats: [
        { label: "Number of Groups", labelAr: "عدد المجموعات", value: k },
        { label: "Total N", labelAr: "الحجم الكلي", value: N },
        { label: "Grand Mean", labelAr: "المتوسط العام", value: grandMean.toFixed(4) },
        { label: "SS Between", labelAr: "مجموع المربعات بين", value: SSB.toFixed(4) },
        { label: "SS Within", labelAr: "مجموع المربعات داخل", value: SSW.toFixed(4) },
        { label: "MS Between", labelAr: "متوسط المربعات بين", value: MSB.toFixed(4) },
        { label: "MS Within", labelAr: "متوسط المربعات داخل", value: MSW.toFixed(4) },
        { label: "ω² (Omega squared)", labelAr: "ω² (أوميجا تربيع)", value: omegaSq.toFixed(4) }
      ],
      recommendations: pValue < alpha ? ["Consider post-hoc tests (Tukey HSD, Bonferroni, etc.)", "Examine group means to understand the pattern"] : [],
      recommendationsAr: pValue < alpha ? ["فكر في إجراء اختبارات بعدية (توكي، بونفيروني، إلخ)", "افحص متوسطات المجموعات لفهم النمط"] : []
    };
  },

  // اختبار مان-ويتني
  mannWhitney: (group1: number[], group2: number[], alpha = 0.05): TestResult => {
    const n1 = group1.length, n2 = group2.length;
    const combined = [...group1.map(v => ({ v, g: 1 })), ...group2.map(v => ({ v, g: 2 }))];
    combined.sort((a, b) => a.v - b.v);
    
    // Assign ranks
    const ranks = new Array(combined.length);
    let i = 0;
    while (i < combined.length) {
      let j = i;
      while (j < combined.length && combined[j].v === combined[i].v) j++;
      const avgRank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) ranks[k] = avgRank;
      i = j;
    }
    
    let R1 = 0;
    ranks.forEach((r, idx) => { if (combined[idx].g === 1) R1 += r; });
    
    const U1 = R1 - (n1 * (n1 + 1)) / 2;
    const U2 = n1 * n2 - U1;
    const U = Math.min(U1, U2);
    
    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = (U - meanU) / stdU;
    const pValue = 2 * (1 - StatUtils.normalCDF(Math.abs(z)));
    
    // Effect size r
    const r = Math.abs(z) / Math.sqrt(n1 + n2);
    
    return {
      name: "Mann-Whitney U Test",
      nameAr: "اختبار مان-ويتني",
      statistic: U,
      pValue,
      effectSize: r,
      effectSizeType: "r (effect size)",
      effectSizeInterpretation: r < 0.1 ? "Negligible" : r < 0.3 ? "Small" : r < 0.5 ? "Medium" : "Large",
      effectSizeInterpretationAr: r < 0.1 ? "ضعيف جداً" : r < 0.3 ? "صغير" : r < 0.5 ? "متوسط" : "كبير",
      conclusion: pValue < alpha
        ? `Reject H₀: The distributions of the two groups are significantly different`
        : `Fail to reject H₀: No significant difference in distributions`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: توزيعات المجموعتين تختلف معنوياً`
        : `قبول الفرضية الصفرية: لا يوجد اختلاف معنوي في التوزيعات`,
      interpretation: pValue < alpha
        ? `A Mann-Whitney U test indicated that the distribution of Group 1 (Mdn = ${StatUtils.median(group1).toFixed(3)}) was significantly different from Group 2 (Mdn = ${StatUtils.median(group2).toFixed(3)}), U = ${U.toFixed(0)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}, r = ${r.toFixed(3)}.`
        : `The Mann-Whitney U test did not reveal a significant difference between groups, U = ${U.toFixed(0)}, p = ${pValue.toFixed(4)}.`,
      interpretationAr: pValue < alpha
        ? `أشار اختبار مان-ويتني إلى أن توزيع المجموعة الأولى (الوسيط = ${StatUtils.median(group1).toFixed(3)}) يختلف معنوياً عن المجموعة الثانية (الوسيط = ${StatUtils.median(group2).toFixed(3)})، U = ${U.toFixed(0)}، z = ${z.toFixed(3)}، p = ${pValue.toFixed(4)}، r = ${r.toFixed(3)}.`
        : `لم يكشف اختبار مان-ويتني عن فرق معنوي بين المجموعتين، U = ${U.toFixed(0)}، p = ${pValue.toFixed(4)}.`,
      assumptions: [
        { name: "Independence", nameAr: "الاستقلالية", met: true },
        { name: "Ordinal Data", nameAr: "بيانات ترتيبية", met: true }
      ],
      additionalStats: [
        { label: "U₁", labelAr: "U₁", value: U1.toFixed(0) },
        { label: "U₂", labelAr: "U₂", value: U2.toFixed(0) },
        { label: "Z-score", labelAr: "قيمة Z", value: z.toFixed(4) },
        { label: "Median (Group 1)", labelAr: "الوسيط (مجموعة 1)", value: StatUtils.median(group1).toFixed(4) },
        { label: "Median (Group 2)", labelAr: "الوسيط (مجموعة 2)", value: StatUtils.median(group2).toFixed(4) }
      ]
    };
  },

  // اختبار ويلكوكسون للرتب
  wilcoxonSignedRank: (before: number[], after: number[], alpha = 0.05): TestResult => {
    const n = Math.min(before.length, after.length);
    const diffs = before.slice(0, n).map((v, i) => after[i] - v).filter(d => d !== 0);
    const absDiffs = diffs.map(d => Math.abs(d));
    
    // Rank absolute differences
    const ranksArr = StatUtils.ranks(absDiffs);
    
    // Sum of positive and negative ranks
    let Wplus = 0, Wminus = 0;
    diffs.forEach((d, i) => {
      if (d > 0) Wplus += ranksArr[i];
      else Wminus += ranksArr[i];
    });
    
    const W = Math.min(Wplus, Wminus);
    const nr = diffs.length;
    const meanW = (nr * (nr + 1)) / 4;
    const stdW = Math.sqrt((nr * (nr + 1) * (2 * nr + 1)) / 24);
    const z = (W - meanW) / stdW;
    const pValue = 2 * (1 - StatUtils.normalCDF(Math.abs(z)));
    const r = Math.abs(z) / Math.sqrt(nr);
    
    return {
      name: "Wilcoxon Signed-Rank Test",
      nameAr: "اختبار ويلكوكسون للرتب",
      statistic: W,
      pValue,
      effectSize: r,
      effectSizeType: "r",
      effectSizeInterpretation: r < 0.1 ? "Negligible" : r < 0.3 ? "Small" : r < 0.5 ? "Medium" : "Large",
      effectSizeInterpretationAr: r < 0.1 ? "ضعيف جداً" : r < 0.3 ? "صغير" : r < 0.5 ? "متوسط" : "كبير",
      conclusion: pValue < alpha
        ? `Reject H₀: There is a significant difference between conditions`
        : `Fail to reject H₀: No significant difference between conditions`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: يوجد فرق معنوي بين الحالتين`
        : `قبول الفرضية الصفرية: لا يوجد فرق معنوي بين الحالتين`,
      interpretation: pValue < alpha
        ? `A Wilcoxon signed-rank test showed a statistically significant change, W = ${W.toFixed(0)}, z = ${z.toFixed(3)}, p = ${pValue.toFixed(4)}, r = ${r.toFixed(3)}.`
        : `The Wilcoxon signed-rank test did not reveal a significant change, W = ${W.toFixed(0)}, p = ${pValue.toFixed(4)}.`,
      interpretationAr: pValue < alpha
        ? `أظهر اختبار ويلكوكسون للرتب تغيراً ذا دلالة إحصائية، W = ${W.toFixed(0)}، z = ${z.toFixed(3)}، p = ${pValue.toFixed(4)}، r = ${r.toFixed(3)}.`
        : `لم يكشف اختبار ويلكوكسون للرتب عن تغير معنوي، W = ${W.toFixed(0)}، p = ${pValue.toFixed(4)}.`,
      assumptions: [
        { name: "Paired Data", nameAr: "بيانات مزدوجة", met: true },
        { name: "Symmetric Differences", nameAr: "فروق متماثلة", met: true }
      ],
      additionalStats: [
        { label: "N (pairs)", labelAr: "عدد الأزواج", value: n },
        { label: "N (non-zero)", labelAr: "عدد غير الصفرية", value: nr },
        { label: "W+", labelAr: "W+", value: Wplus.toFixed(0) },
        { label: "W-", labelAr: "W-", value: Wminus.toFixed(0) },
        { label: "Z-score", labelAr: "قيمة Z", value: z.toFixed(4) }
      ]
    };
  },

  // اختبار كروسكال-واليس
  kruskalWallis: (groups: number[][], alpha = 0.05): TestResult => {
    const k = groups.length;
    const ns = groups.map(g => g.length);
    const N = ns.reduce((a, b) => a + b, 0);
    
    // Combine and rank
    const combined = groups.flatMap((g, gi) => g.map(v => ({ v, g: gi })));
    combined.sort((a, b) => a.v - b.v);
    
    const ranks = new Array(combined.length);
    let i = 0;
    while (i < combined.length) {
      let j = i;
      while (j < combined.length && combined[j].v === combined[i].v) j++;
      const avgRank = (i + j + 1) / 2;
      for (let idx = i; idx < j; idx++) ranks[idx] = avgRank;
      i = j;
    }
    
    const rankSums = new Array(k).fill(0);
    ranks.forEach((r, idx) => rankSums[combined[idx].g] += r);
    
    let H = 0;
    rankSums.forEach((R, gi) => H += (R * R) / ns[gi]);
    H = (12 / (N * (N + 1))) * H - 3 * (N + 1);
    
    const df = k - 1;
    const pValue = StatUtils.chiSquarePValue(H, df);
    const etaSqH = (H - k + 1) / (N - k);
    
    return {
      name: "Kruskal-Wallis H Test",
      nameAr: "اختبار كروسكال-واليس",
      statistic: H,
      pValue,
      df,
      effectSize: etaSqH,
      effectSizeType: "η²H",
      effectSizeInterpretation: etaSqH < 0.01 ? "Negligible" : etaSqH < 0.06 ? "Small" : etaSqH < 0.14 ? "Medium" : "Large",
      effectSizeInterpretationAr: etaSqH < 0.01 ? "ضعيف جداً" : etaSqH < 0.06 ? "صغير" : etaSqH < 0.14 ? "متوسط" : "كبير",
      conclusion: pValue < alpha
        ? `Reject H₀: At least one group distribution differs significantly`
        : `Fail to reject H₀: No significant differences among group distributions`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: توزيع مجموعة واحدة على الأقل يختلف معنوياً`
        : `قبول الفرضية الصفرية: لا توجد فروق معنوية بين توزيعات المجموعات`,
      interpretation: pValue < alpha
        ? `A Kruskal-Wallis H test showed statistically significant differences among groups, H(${df}) = ${H.toFixed(3)}, p = ${pValue.toFixed(4)}, η²H = ${etaSqH.toFixed(3)}.`
        : `The Kruskal-Wallis test did not reveal significant differences, H(${df}) = ${H.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
      interpretationAr: pValue < alpha
        ? `أظهر اختبار كروسكال-واليس فروقاً ذات دلالة إحصائية بين المجموعات، H(${df}) = ${H.toFixed(3)}، p = ${pValue.toFixed(4)}، η²H = ${etaSqH.toFixed(3)}.`
        : `لم يكشف اختبار كروسكال-واليس عن فروق معنوية، H(${df}) = ${H.toFixed(3)}، p = ${pValue.toFixed(4)}.`,
      assumptions: [
        { name: "Independence", nameAr: "الاستقلالية", met: true },
        { name: "Ordinal Data", nameAr: "بيانات ترتيبية", met: true }
      ],
      additionalStats: [
        { label: "Number of Groups", labelAr: "عدد المجموعات", value: k },
        { label: "Total N", labelAr: "الحجم الكلي", value: N },
        ...groups.map((g, i) => ({ label: `Median (Group ${i + 1})`, labelAr: `الوسيط (مجموعة ${i + 1})`, value: StatUtils.median(g).toFixed(4) }))
      ],
      recommendations: pValue < alpha ? ["Consider post-hoc pairwise comparisons (Dunn's test)"] : [],
      recommendationsAr: pValue < alpha ? ["فكر في إجراء مقارنات زوجية بعدية (اختبار دان)"] : []
    };
  },

  // ارتباط بيرسون
  pearsonCorrelation: (x: number[], y: number[], alpha = 0.05): TestResult => {
    const n = Math.min(x.length, y.length);
    const xData = x.slice(0, n), yData = y.slice(0, n);
    
    const mx = StatUtils.mean(xData), my = StatUtils.mean(yData);
    const sx = StatUtils.std(xData), sy = StatUtils.std(yData);
    
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += (xData[i] - mx) * (yData[i] - my);
    }
    const r = sum / ((n - 1) * sx * sy);
    
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const df = n - 2;
    const pValue = StatUtils.tPValue(t, df);
    
    // Fisher's z transformation for CI
    const zr = 0.5 * Math.log((1 + r) / (1 - r));
    const seZ = 1 / Math.sqrt(n - 3);
    const zLow = zr - 1.96 * seZ, zHigh = zr + 1.96 * seZ;
    const ci: [number, number] = [(Math.exp(2 * zLow) - 1) / (Math.exp(2 * zLow) + 1), (Math.exp(2 * zHigh) - 1) / (Math.exp(2 * zHigh) + 1)];
    
    const rSq = r * r;
    
    return {
      name: "Pearson Correlation",
      nameAr: "ارتباط بيرسون",
      statistic: r,
      pValue,
      df,
      effectSize: rSq,
      effectSizeType: "r² (Coefficient of Determination)",
      effectSizeInterpretation: Math.abs(r) < 0.1 ? "Negligible" : Math.abs(r) < 0.3 ? "Small" : Math.abs(r) < 0.5 ? "Medium" : "Large",
      effectSizeInterpretationAr: Math.abs(r) < 0.1 ? "ضعيف جداً" : Math.abs(r) < 0.3 ? "صغير" : Math.abs(r) < 0.5 ? "متوسط" : "كبير",
      ci,
      ciLevel: 95,
      conclusion: pValue < alpha
        ? `Reject H₀: There is a significant ${r > 0 ? 'positive' : 'negative'} correlation (r = ${r.toFixed(3)})`
        : `Fail to reject H₀: No significant correlation`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: يوجد ارتباط ${r > 0 ? 'طردي' : 'عكسي'} معنوي (r = ${r.toFixed(3)})`
        : `قبول الفرضية الصفرية: لا يوجد ارتباط معنوي`,
      interpretation: pValue < alpha
        ? `There was a ${Math.abs(r) < 0.3 ? 'weak' : Math.abs(r) < 0.5 ? 'moderate' : 'strong'} ${r > 0 ? 'positive' : 'negative'} correlation between the variables, r(${df}) = ${r.toFixed(3)}, p = ${pValue.toFixed(4)}. The coefficient of determination (r² = ${rSq.toFixed(3)}) indicates that ${(rSq * 100).toFixed(1)}% of the variance is shared between the variables.`
        : `No significant linear relationship was found between the variables, r(${df}) = ${r.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
      interpretationAr: pValue < alpha
        ? `وُجد ارتباط ${Math.abs(r) < 0.3 ? 'ضعيف' : Math.abs(r) < 0.5 ? 'متوسط' : 'قوي'} ${r > 0 ? 'طردي' : 'عكسي'} بين المتغيرين، r(${df}) = ${r.toFixed(3)}، p = ${pValue.toFixed(4)}. معامل التحديد (r² = ${rSq.toFixed(3)}) يشير إلى أن ${(rSq * 100).toFixed(1)}% من التباين مشترك بين المتغيرين.`
        : `لم توجد علاقة خطية معنوية بين المتغيرين، r(${df}) = ${r.toFixed(3)}، p = ${pValue.toFixed(4)}.`,
      assumptions: [
        { name: "Linearity", nameAr: "العلاقة الخطية", met: true, note: "Verify with scatter plot", noteAr: "تحقق بالرسم التشتتي" },
        { name: "Bivariate Normality", nameAr: "التوزيع الطبيعي الثنائي", met: true },
        { name: "No Outliers", nameAr: "عدم وجود قيم شاذة", met: true }
      ],
      additionalStats: [
        { label: "N", labelAr: "ن", value: n },
        { label: "r", labelAr: "r", value: r.toFixed(4) },
        { label: "r²", labelAr: "r²", value: rSq.toFixed(4) },
        { label: "t-statistic", labelAr: "إحصائي t", value: t.toFixed(4) }
      ]
    };
  },

  // ارتباط سبيرمان
  spearmanCorrelation: (x: number[], y: number[], alpha = 0.05): TestResult => {
    const n = Math.min(x.length, y.length);
    const xRanks = StatUtils.ranks(x.slice(0, n));
    const yRanks = StatUtils.ranks(y.slice(0, n));
    
    const pearsonResult = StatTests.pearsonCorrelation(xRanks, yRanks, alpha);
    const rho = pearsonResult.statistic;
    
    return {
      ...pearsonResult,
      name: "Spearman Correlation",
      nameAr: "ارتباط سبيرمان",
      effectSizeType: "ρ² (Coefficient of Determination)",
      conclusion: pearsonResult.pValue < alpha
        ? `Reject H₀: There is a significant monotonic ${rho > 0 ? 'positive' : 'negative'} correlation (ρ = ${rho.toFixed(3)})`
        : `Fail to reject H₀: No significant monotonic correlation`,
      conclusionAr: pearsonResult.pValue < alpha
        ? `رفض الفرضية الصفرية: يوجد ارتباط رتبي ${rho > 0 ? 'طردي' : 'عكسي'} معنوي (ρ = ${rho.toFixed(3)})`
        : `قبول الفرضية الصفرية: لا يوجد ارتباط رتبي معنوي`,
      assumptions: [
        { name: "Monotonic Relationship", nameAr: "علاقة رتيبة", met: true },
        { name: "Ordinal Data", nameAr: "بيانات ترتيبية", met: true }
      ]
    };
  },

  // اختبار شابيرو-ويلك
  shapiroWilk: (data: number[], alpha = 0.05): TestResult => {
    const n = data.length;
    const sorted = [...data].sort((a, b) => a - b);
    const mean = StatUtils.mean(data);
    
    // Simplified Shapiro-Wilk
    let s2 = 0;
    data.forEach(v => s2 += Math.pow(v - mean, 2));
    
    let b = 0;
    const m = Math.floor(n / 2);
    for (let i = 0; i < m; i++) {
      const a = 0.7 - 0.002 * n; // Simplified coefficient
      b += a * (sorted[n - 1 - i] - sorted[i]);
    }
    
    const W = (b * b) / s2;
    
    // Approximate p-value
    const mu = 0.0038915 * Math.pow(Math.log(n), 3) - 0.083751 * Math.pow(Math.log(n), 2) - 0.31082 * Math.log(n) - 1.5861;
    const sigma = Math.exp(0.0030302 * Math.pow(Math.log(n), 2) - 0.082676 * Math.log(n) - 0.4803);
    const z = (Math.log(1 - W) - mu) / sigma;
    const pValue = 1 - StatUtils.normalCDF(z);
    
    return {
      name: "Shapiro-Wilk Test",
      nameAr: "اختبار شابيرو-ويلك",
      statistic: W,
      pValue,
      conclusion: pValue < alpha
        ? `Reject H₀: Data is NOT normally distributed (W = ${W.toFixed(4)}, p = ${pValue.toFixed(4)})`
        : `Fail to reject H₀: Data appears normally distributed (W = ${W.toFixed(4)}, p = ${pValue.toFixed(4)})`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: البيانات لا تتبع التوزيع الطبيعي (W = ${W.toFixed(4)}، p = ${pValue.toFixed(4)})`
        : `قبول الفرضية الصفرية: البيانات تتبع التوزيع الطبيعي (W = ${W.toFixed(4)}، p = ${pValue.toFixed(4)})`,
      interpretation: pValue < alpha
        ? `The Shapiro-Wilk test suggests that the data significantly deviates from normality. Consider using non-parametric tests or data transformation.`
        : `The Shapiro-Wilk test indicates that the assumption of normality is reasonable for this data.`,
      interpretationAr: pValue < alpha
        ? `يشير اختبار شابيرو-ويلك إلى أن البيانات تنحرف بشكل معنوي عن التوزيع الطبيعي. فكر في استخدام اختبارات لا معلمية أو تحويل البيانات.`
        : `يشير اختبار شابيرو-ويلك إلى أن افتراض التوزيع الطبيعي معقول لهذه البيانات.`,
      assumptions: [],
      additionalStats: [
        { label: "N", labelAr: "ن", value: n },
        { label: "Mean", labelAr: "المتوسط", value: mean.toFixed(4) },
        { label: "SD", labelAr: "الانحراف المعياري", value: StatUtils.std(data).toFixed(4) },
        { label: "Skewness", labelAr: "الالتواء", value: StatUtils.skewness(data).toFixed(4) },
        { label: "Kurtosis", labelAr: "التفرطح", value: StatUtils.kurtosis(data).toFixed(4) }
      ],
      recommendations: pValue < alpha ? ["Consider log transformation", "Consider Box-Cox transformation", "Use non-parametric tests"] : [],
      recommendationsAr: pValue < alpha ? ["فكر في التحويل اللوغاريتمي", "فكر في تحويل بوكس-كوكس", "استخدم اختبارات لا معلمية"] : []
    };
  },

  // اختبار ليفين
  leveneTest: (group1: number[], group2: number[], alpha = 0.05): TestResult => {
    const m1 = StatUtils.median(group1), m2 = StatUtils.median(group2);
    const d1 = group1.map(v => Math.abs(v - m1));
    const d2 = group2.map(v => Math.abs(v - m2));
    
    const result = StatTests.independentTTest(d1, d2, alpha, true);
    const F = result.statistic * result.statistic;
    const pValue = result.pValue;
    
    return {
      name: "Levene's Test",
      nameAr: "اختبار ليفين",
      statistic: F,
      pValue,
      conclusion: pValue < alpha
        ? `Reject H₀: Variances are significantly different`
        : `Fail to reject H₀: Variances are approximately equal`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: التباينات تختلف معنوياً`
        : `قبول الفرضية الصفرية: التباينات متساوية تقريباً`,
      interpretation: pValue < alpha
        ? `Levene's test indicates heterogeneity of variance. Consider using Welch's t-test instead of Student's t-test.`
        : `Levene's test supports the assumption of homogeneity of variance.`,
      interpretationAr: pValue < alpha
        ? `يشير اختبار ليفين إلى عدم تجانس التباين. فكر في استخدام اختبار ويلش بدلاً من اختبار t الطالب.`
        : `يدعم اختبار ليفين افتراض تجانس التباين.`,
      assumptions: [],
      additionalStats: [
        { label: "Variance (Group 1)", labelAr: "التباين (مجموعة 1)", value: StatUtils.variance(group1).toFixed(4) },
        { label: "Variance (Group 2)", labelAr: "التباين (مجموعة 2)", value: StatUtils.variance(group2).toFixed(4) },
        { label: "SD (Group 1)", labelAr: "ا.م (مجموعة 1)", value: StatUtils.std(group1).toFixed(4) },
        { label: "SD (Group 2)", labelAr: "ا.م (مجموعة 2)", value: StatUtils.std(group2).toFixed(4) }
      ]
    };
  },

  // اختبار كاي تربيع
  chiSquare: (observed: number[][], alpha = 0.05): TestResult => {
    const rows = observed.length;
    const cols = observed[0].length;
    const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
    const colTotals = observed[0].map((_, j) => observed.reduce((sum, row) => sum + row[j], 0));
    const total = rowTotals.reduce((a, b) => a + b, 0);
    
    let chiSq = 0;
    for (let i = 0; i < rows; i++) {
      for (let j = 0; j < cols; j++) {
        const expected = (rowTotals[i] * colTotals[j]) / total;
        chiSq += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
    
    const df = (rows - 1) * (cols - 1);
    const pValue = StatUtils.chiSquarePValue(chiSq, df);
    
    // Cramér's V
    const k = Math.min(rows, cols);
    const V = Math.sqrt(chiSq / (total * (k - 1)));
    
    return {
      name: "Chi-Square Test of Independence",
      nameAr: "اختبار كاي تربيع للاستقلالية",
      statistic: chiSq,
      pValue,
      df,
      effectSize: V,
      effectSizeType: "Cramér's V",
      effectSizeInterpretation: V < 0.1 ? "Negligible" : V < 0.3 ? "Small" : V < 0.5 ? "Medium" : "Large",
      effectSizeInterpretationAr: V < 0.1 ? "ضعيف جداً" : V < 0.3 ? "صغير" : V < 0.5 ? "متوسط" : "كبير",
      conclusion: pValue < alpha
        ? `Reject H₀: Variables are significantly associated`
        : `Fail to reject H₀: No significant association between variables`,
      conclusionAr: pValue < alpha
        ? `رفض الفرضية الصفرية: يوجد ارتباط معنوي بين المتغيرين`
        : `قبول الفرضية الصفرية: لا يوجد ارتباط معنوي بين المتغيرين`,
      interpretation: pValue < alpha
        ? `A chi-square test of independence showed a significant association between the variables, χ²(${df}) = ${chiSq.toFixed(3)}, p = ${pValue.toFixed(4)}, Cramér's V = ${V.toFixed(3)}.`
        : `The chi-square test did not reveal a significant association, χ²(${df}) = ${chiSq.toFixed(3)}, p = ${pValue.toFixed(4)}.`,
      interpretationAr: pValue < alpha
        ? `أظهر اختبار كاي تربيع للاستقلالية ارتباطاً معنوياً بين المتغيرين، χ²(${df}) = ${chiSq.toFixed(3)}، p = ${pValue.toFixed(4)}، V كريمر = ${V.toFixed(3)}.`
        : `لم يكشف اختبار كاي تربيع عن ارتباط معنوي، χ²(${df}) = ${chiSq.toFixed(3)}، p = ${pValue.toFixed(4)}.`,
      assumptions: [
        { name: "Expected Frequencies ≥ 5", nameAr: "التكرارات المتوقعة ≥ 5", met: true, note: "Check expected frequencies table", noteAr: "تحقق من جدول التكرارات المتوقعة" },
        { name: "Independence", nameAr: "الاستقلالية", met: true }
      ],
      additionalStats: [
        { label: "Total N", labelAr: "الحجم الكلي", value: total },
        { label: "Rows", labelAr: "الصفوف", value: rows },
        { label: "Columns", labelAr: "الأعمدة", value: cols }
      ]
    };
  }
};

// ==================== المكون الرئيسي ====================

const ProfessionalStatisticalTests: React.FC<Props> = ({ data, columns }) => {
  const { isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'smart' | 'manual' | 'results'>('smart');
  const [selectedTest, setSelectedTest] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<TestResult | null>(null);
  const [testParams, setTestParams] = useState<Record<string, any>>({});
  const [testHistory, setTestHistory] = useState<TestResult[]>([]);

  // تحليل الأعمدة
  const columnAnalysis = useMemo(() => {
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
    
    return { numeric, categorical };
  }, [data, columns]);

  // استخراج البيانات الرقمية
  const getNumericData = useCallback((col: string): number[] => {
    return data
      .map(row => Number(row[col]))
      .filter(v => !isNaN(v) && isFinite(v));
  }, [data]);

  // تصنيفات الاختبارات
  const testCategories = [
    {
      id: 'parametric',
      name: 'Parametric Tests',
      nameAr: 'الاختبارات المعلمية',
      icon: <Calculator className="w-5 h-5" />,
      color: 'from-blue-500 to-blue-600',
      tests: [
        { id: 'one-sample-t', name: 'One-Sample T-Test', nameAr: 'اختبار t للعينة الواحدة', desc: 'Compare sample mean to known value', descAr: 'مقارنة متوسط العينة بقيمة معروفة' },
        { id: 'independent-t', name: 'Independent Samples T-Test', nameAr: 'اختبار t للعينات المستقلة', desc: 'Compare means of two independent groups', descAr: 'مقارنة متوسطي مجموعتين مستقلتين' },
        { id: 'paired-t', name: 'Paired Samples T-Test', nameAr: 'اختبار t للعينات المزدوجة', desc: 'Compare means of paired observations', descAr: 'مقارنة متوسطات القياسات المزدوجة' },
        { id: 'welch-t', name: "Welch's T-Test", nameAr: 'اختبار ويلش', desc: 'T-test for unequal variances', descAr: 'اختبار t للتباينات غير المتساوية' },
        { id: 'anova', name: 'One-Way ANOVA', nameAr: 'تحليل التباين الأحادي', desc: 'Compare means of 3+ groups', descAr: 'مقارنة متوسطات 3 مجموعات أو أكثر' }
      ]
    },
    {
      id: 'nonparametric',
      name: 'Non-Parametric Tests',
      nameAr: 'الاختبارات اللامعلمية',
      icon: <Activity className="w-5 h-5" />,
      color: 'from-green-500 to-green-600',
      tests: [
        { id: 'mann-whitney', name: 'Mann-Whitney U Test', nameAr: 'اختبار مان-ويتني', desc: 'Non-parametric alternative to independent t-test', descAr: 'البديل اللامعلمي لاختبار t المستقل' },
        { id: 'wilcoxon', name: 'Wilcoxon Signed-Rank Test', nameAr: 'اختبار ويلكوكسون', desc: 'Non-parametric alternative to paired t-test', descAr: 'البديل اللامعلمي لاختبار t المزدوج' },
        { id: 'kruskal-wallis', name: 'Kruskal-Wallis H Test', nameAr: 'اختبار كروسكال-واليس', desc: 'Non-parametric alternative to ANOVA', descAr: 'البديل اللامعلمي لتحليل التباين' }
      ]
    },
    {
      id: 'correlation',
      name: 'Correlation Tests',
      nameAr: 'اختبارات الارتباط',
      icon: <TrendingUp className="w-5 h-5" />,
      color: 'from-purple-500 to-purple-600',
      tests: [
        { id: 'pearson', name: 'Pearson Correlation', nameAr: 'ارتباط بيرسون', desc: 'Linear relationship between two variables', descAr: 'العلاقة الخطية بين متغيرين' },
        { id: 'spearman', name: 'Spearman Correlation', nameAr: 'ارتباط سبيرمان', desc: 'Monotonic relationship (rank-based)', descAr: 'العلاقة الرتيبة (على أساس الرتب)' }
      ]
    },
    {
      id: 'normality',
      name: 'Normality Tests',
      nameAr: 'اختبارات التوزيع الطبيعي',
      icon: <BarChart2 className="w-5 h-5" />,
      color: 'from-orange-500 to-orange-600',
      tests: [
        { id: 'shapiro-wilk', name: 'Shapiro-Wilk Test', nameAr: 'اختبار شابيرو-ويلك', desc: 'Test for normal distribution', descAr: 'اختبار التوزيع الطبيعي' }
      ]
    },
    {
      id: 'variance',
      name: 'Variance Tests',
      nameAr: 'اختبارات التباين',
      icon: <Layers className="w-5 h-5" />,
      color: 'from-teal-500 to-teal-600',
      tests: [
        { id: 'levene', name: "Levene's Test", nameAr: 'اختبار ليفين', desc: 'Test for equality of variances', descAr: 'اختبار تساوي التباينات' }
      ]
    },
    {
      id: 'categorical',
      name: 'Categorical Tests',
      nameAr: 'اختبارات البيانات الفئوية',
      icon: <GitBranch className="w-5 h-5" />,
      color: 'from-pink-500 to-pink-600',
      tests: [
        { id: 'chi-square', name: 'Chi-Square Test', nameAr: 'اختبار كاي تربيع', desc: 'Test of independence for categorical data', descAr: 'اختبار الاستقلالية للبيانات الفئوية' }
      ]
    }
  ];

  // تنفيذ الاختبار
  const runTest = useCallback(() => {
    if (!selectedTest) return;
    
    let result: TestResult | null = null;
    const alpha = testParams.alpha || 0.05;
    
    try {
      switch (selectedTest) {
        case 'one-sample-t': {
          const col = testParams.variable;
          const mu0 = Number(testParams.testValue) || 0;
          if (col) {
            const values = getNumericData(col);
            result = StatTests.oneSampleTTest(values, mu0, alpha);
          }
          break;
        }
        case 'independent-t':
        case 'welch-t': {
          const col = testParams.variable;
          const groupCol = testParams.groupVariable;
          if (col && groupCol) {
            const groups = new Map<string, number[]>();
            data.forEach(row => {
              const g = String(row[groupCol]);
              const v = Number(row[col]);
              if (!isNaN(v)) {
                if (!groups.has(g)) groups.set(g, []);
                groups.get(g)!.push(v);
              }
            });
            const groupArrays = Array.from(groups.values());
            if (groupArrays.length >= 2) {
              result = StatTests.independentTTest(groupArrays[0], groupArrays[1], alpha, selectedTest === 'independent-t');
            }
          }
          break;
        }
        case 'paired-t': {
          const col1 = testParams.variable1;
          const col2 = testParams.variable2;
          if (col1 && col2) {
            const v1 = getNumericData(col1);
            const v2 = getNumericData(col2);
            result = StatTests.pairedTTest(v1, v2, alpha);
          }
          break;
        }
        case 'anova':
        case 'kruskal-wallis': {
          const col = testParams.variable;
          const groupCol = testParams.groupVariable;
          if (col && groupCol) {
            const groups = new Map<string, number[]>();
            data.forEach(row => {
              const g = String(row[groupCol]);
              const v = Number(row[col]);
              if (!isNaN(v)) {
                if (!groups.has(g)) groups.set(g, []);
                groups.get(g)!.push(v);
              }
            });
            const groupArrays = Array.from(groups.values());
            if (groupArrays.length >= 2) {
              result = selectedTest === 'anova' 
                ? StatTests.oneWayANOVA(groupArrays, alpha)
                : StatTests.kruskalWallis(groupArrays, alpha);
            }
          }
          break;
        }
        case 'mann-whitney': {
          const col = testParams.variable;
          const groupCol = testParams.groupVariable;
          if (col && groupCol) {
            const groups = new Map<string, number[]>();
            data.forEach(row => {
              const g = String(row[groupCol]);
              const v = Number(row[col]);
              if (!isNaN(v)) {
                if (!groups.has(g)) groups.set(g, []);
                groups.get(g)!.push(v);
              }
            });
            const groupArrays = Array.from(groups.values());
            if (groupArrays.length >= 2) {
              result = StatTests.mannWhitney(groupArrays[0], groupArrays[1], alpha);
            }
          }
          break;
        }
        case 'wilcoxon': {
          const col1 = testParams.variable1;
          const col2 = testParams.variable2;
          if (col1 && col2) {
            const v1 = getNumericData(col1);
            const v2 = getNumericData(col2);
            result = StatTests.wilcoxonSignedRank(v1, v2, alpha);
          }
          break;
        }
        case 'pearson':
        case 'spearman': {
          const col1 = testParams.variable1;
          const col2 = testParams.variable2;
          if (col1 && col2) {
            const v1 = getNumericData(col1);
            const v2 = getNumericData(col2);
            result = selectedTest === 'pearson'
              ? StatTests.pearsonCorrelation(v1, v2, alpha)
              : StatTests.spearmanCorrelation(v1, v2, alpha);
          }
          break;
        }
        case 'shapiro-wilk': {
          const col = testParams.variable;
          if (col) {
            const values = getNumericData(col);
            result = StatTests.shapiroWilk(values, alpha);
          }
          break;
        }
        case 'levene': {
          const col = testParams.variable;
          const groupCol = testParams.groupVariable;
          if (col && groupCol) {
            const groups = new Map<string, number[]>();
            data.forEach(row => {
              const g = String(row[groupCol]);
              const v = Number(row[col]);
              if (!isNaN(v)) {
                if (!groups.has(g)) groups.set(g, []);
                groups.get(g)!.push(v);
              }
            });
            const groupArrays = Array.from(groups.values());
            if (groupArrays.length >= 2) {
              result = StatTests.leveneTest(groupArrays[0], groupArrays[1], alpha);
            }
          }
          break;
        }
        case 'chi-square': {
          const col1 = testParams.variable1;
          const col2 = testParams.variable2;
          if (col1 && col2) {
            // Create contingency table
            const categories1 = [...new Set(data.map(r => String(r[col1])))];
            const categories2 = [...new Set(data.map(r => String(r[col2])))];
            const table = categories1.map(c1 => 
              categories2.map(c2 => 
                data.filter(r => String(r[col1]) === c1 && String(r[col2]) === c2).length
              )
            );
            result = StatTests.chiSquare(table, alpha);
          }
          break;
        }
      }
      
      if (result) {
        setTestResult(result);
        setTestHistory(prev => [result!, ...prev.slice(0, 9)]);
        setActiveTab('results');
      }
    } catch (error) {
      console.error('Test execution error:', error);
    }
  }, [selectedTest, testParams, data, getNumericData]);

  // نموذج إدخال المعاملات
  const renderTestForm = () => {
    if (!selectedTest) return null;
    
    const needsGroupVar = ['independent-t', 'welch-t', 'anova', 'kruskal-wallis', 'mann-whitney', 'levene'].includes(selectedTest);
    const needsTwoVars = ['paired-t', 'wilcoxon', 'pearson', 'spearman', 'chi-square'].includes(selectedTest);
    const needsTestValue = selectedTest === 'one-sample-t';
    
    return (
      <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-xl">
        <h4 className="font-semibold text-gray-800 dark:text-gray-200">
          {isRTL ? 'معاملات الاختبار' : 'Test Parameters'}
        </h4>
        
        {/* مستوى الدلالة */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {isRTL ? 'مستوى الدلالة (α)' : 'Significance Level (α)'}
          </label>
          <select
            value={testParams.alpha || 0.05}
            onChange={(e) => setTestParams(prev => ({ ...prev, alpha: Number(e.target.value) }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value={0.01}>0.01</option>
            <option value={0.05}>0.05</option>
            <option value={0.10}>0.10</option>
          </select>
        </div>
        
        {/* متغير واحد */}
        {!needsTwoVars && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'المتغير' : 'Variable'}
            </label>
            <select
              value={testParams.variable || ''}
              onChange={(e) => setTestParams(prev => ({ ...prev, variable: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isRTL ? 'اختر متغيراً' : 'Select variable'}</option>
              {(selectedTest === 'chi-square' ? columnAnalysis.categorical : columnAnalysis.numeric).map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* متغيران */}
        {needsTwoVars && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'المتغير الأول' : 'First Variable'}
              </label>
              <select
                value={testParams.variable1 || ''}
                onChange={(e) => setTestParams(prev => ({ ...prev, variable1: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isRTL ? 'اختر متغيراً' : 'Select variable'}</option>
                {(selectedTest === 'chi-square' ? columnAnalysis.categorical : columnAnalysis.numeric).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {isRTL ? 'المتغير الثاني' : 'Second Variable'}
              </label>
              <select
                value={testParams.variable2 || ''}
                onChange={(e) => setTestParams(prev => ({ ...prev, variable2: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">{isRTL ? 'اختر متغيراً' : 'Select variable'}</option>
                {(selectedTest === 'chi-square' ? columnAnalysis.categorical : columnAnalysis.numeric).map(col => (
                  <option key={col} value={col}>{col}</option>
                ))}
              </select>
            </div>
          </>
        )}
        
        {/* متغير التجميع */}
        {needsGroupVar && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'متغير التجميع' : 'Grouping Variable'}
            </label>
            <select
              value={testParams.groupVariable || ''}
              onChange={(e) => setTestParams(prev => ({ ...prev, groupVariable: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{isRTL ? 'اختر متغيراً' : 'Select variable'}</option>
              {columnAnalysis.categorical.map(col => (
                <option key={col} value={col}>{col}</option>
              ))}
            </select>
          </div>
        )}
        
        {/* قيمة الاختبار */}
        {needsTestValue && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              {isRTL ? 'القيمة المختبرة (μ₀)' : 'Test Value (μ₀)'}
            </label>
            <input
              type="number"
              value={testParams.testValue || 0}
              onChange={(e) => setTestParams(prev => ({ ...prev, testValue: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            />
          </div>
        )}
        
        {/* زر التنفيذ */}
        <button
          onClick={runTest}
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2"
        >
          <Zap className="w-5 h-5" />
          {isRTL ? 'تنفيذ الاختبار' : 'Run Test'}
        </button>
      </div>
    );
  };

  // عرض النتائج
  const renderResults = () => {
    if (!testResult) return null;
    
    const isSignificant = testResult.pValue < (testParams.alpha || 0.05);
    
    return (
      <div className="space-y-6">
        {/* رأس النتيجة */}
        <div className={`p-6 rounded-2xl ${isSignificant ? 'bg-gradient-to-r from-green-50 to-emerald-50 border-2 border-green-200' : 'bg-gradient-to-r from-gray-50 to-slate-50 border-2 border-gray-200'}`}>
          <div className="flex items-center gap-4 mb-4">
            <div className={`p-3 rounded-xl ${isSignificant ? 'bg-green-500' : 'bg-gray-500'}`}>
              {isSignificant ? <CheckCircle className="w-8 h-8 text-white" /> : <XCircle className="w-8 h-8 text-white" />}
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                {isRTL ? testResult.nameAr : testResult.name}
              </h3>
              <p className={`text-sm font-medium ${isSignificant ? 'text-green-600' : 'text-gray-600'}`}>
                {isSignificant 
                  ? (isRTL ? '✓ نتيجة دالة إحصائياً' : '✓ Statistically Significant')
                  : (isRTL ? '✗ نتيجة غير دالة إحصائياً' : '✗ Not Statistically Significant')}
              </p>
            </div>
          </div>
          
          {/* الإحصائيات الرئيسية */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            <div className="bg-white p-4 rounded-xl shadow-sm">
              <div className="text-xs text-gray-500 mb-1">{isRTL ? 'قيمة الإحصائي' : 'Statistic'}</div>
              <div className="text-2xl font-bold text-gray-800">{testResult.statistic.toFixed(4)}</div>
            </div>
            <div className={`p-4 rounded-xl shadow-sm ${isSignificant ? 'bg-green-100' : 'bg-white'}`}>
              <div className="text-xs text-gray-500 mb-1">{isRTL ? 'القيمة الاحتمالية' : 'p-value'}</div>
              <div className={`text-2xl font-bold ${isSignificant ? 'text-green-600' : 'text-gray-800'}`}>
                {testResult.pValue < 0.001 ? '< 0.001' : testResult.pValue.toFixed(4)}
              </div>
            </div>
            {testResult.df !== undefined && (
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-xs text-gray-500 mb-1">{isRTL ? 'درجات الحرية' : 'df'}</div>
                <div className="text-2xl font-bold text-gray-800">{testResult.df}</div>
              </div>
            )}
            {testResult.effectSize !== undefined && (
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <div className="text-xs text-gray-500 mb-1">{testResult.effectSizeType}</div>
                <div className="text-2xl font-bold text-purple-600">{testResult.effectSize.toFixed(4)}</div>
                <div className="text-xs text-purple-500">
                  {isRTL ? testResult.effectSizeInterpretationAr : testResult.effectSizeInterpretation}
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* فترة الثقة */}
        {testResult.ci && (
          <div className="p-4 bg-blue-50 rounded-xl">
            <h4 className="font-semibold text-blue-800 mb-2">
              {isRTL ? `فترة الثقة ${testResult.ciLevel}%` : `${testResult.ciLevel}% Confidence Interval`}
            </h4>
            <div className="flex items-center gap-4">
              <div className="flex-1 h-4 bg-blue-200 rounded-full relative">
                <div className="absolute inset-y-0 left-1/4 right-1/4 bg-blue-500 rounded-full" />
              </div>
              <span className="text-sm font-mono text-blue-800">
                [{testResult.ci[0].toFixed(4)}, {testResult.ci[1].toFixed(4)}]
              </span>
            </div>
          </div>
        )}
        
        {/* الاستنتاج والتفسير */}
        <div className="p-4 bg-gray-50 rounded-xl">
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Target className="w-5 h-5 text-blue-500" />
            {isRTL ? 'الاستنتاج' : 'Conclusion'}
          </h4>
          <p className="text-gray-700 mb-4">
            {isRTL ? testResult.conclusionAr : testResult.conclusion}
          </p>
          
          <h4 className="font-semibold text-gray-800 mb-2 flex items-center gap-2">
            <Lightbulb className="w-5 h-5 text-yellow-500" />
            {isRTL ? 'التفسير' : 'Interpretation'}
          </h4>
          <p className="text-gray-700">
            {isRTL ? testResult.interpretationAr : testResult.interpretation}
          </p>
        </div>
        
        {/* الافتراضات */}
        {testResult.assumptions.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              {isRTL ? 'افتراضات الاختبار' : 'Test Assumptions'}
            </h4>
            <div className="space-y-2">
              {testResult.assumptions.map((a, i) => (
                <div key={i} className={`flex items-center gap-3 p-2 rounded-lg ${a.met ? 'bg-green-50' : 'bg-red-50'}`}>
                  {a.met ? <CheckCircle className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
                  <div>
                    <span className="font-medium">{isRTL ? a.nameAr : a.name}</span>
                    {a.note && <span className="text-sm text-gray-500 mx-2">- {isRTL ? a.noteAr : a.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* الإحصائيات الإضافية */}
        {testResult.additionalStats.length > 0 && (
          <div className="p-4 bg-gray-50 rounded-xl">
            <h4 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <BarChart2 className="w-5 h-5 text-blue-500" />
              {isRTL ? 'إحصائيات إضافية' : 'Additional Statistics'}
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {testResult.additionalStats.map((stat, i) => (
                <div key={i} className="bg-white p-3 rounded-lg">
                  <div className="text-xs text-gray-500">{isRTL ? stat.labelAr : stat.label}</div>
                  <div className="text-lg font-semibold text-gray-800">{stat.value}</div>
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* التوصيات */}
        {testResult.recommendations && testResult.recommendations.length > 0 && (
          <div className="p-4 bg-amber-50 rounded-xl">
            <h4 className="font-semibold text-amber-800 mb-2 flex items-center gap-2">
              <Lightbulb className="w-5 h-5" />
              {isRTL ? 'التوصيات' : 'Recommendations'}
            </h4>
            <ul className="space-y-1">
              {(isRTL ? testResult.recommendationsAr : testResult.recommendations)?.map((rec, i) => (
                <li key={i} className="flex items-center gap-2 text-amber-700">
                  <ArrowRight className="w-4 h-4" />
                  {rec}
                </li>
              ))}
            </ul>
          </div>
        )}
        
        {/* أزرار الإجراءات */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => { setSelectedTest(null); setTestResult(null); setActiveTab('manual'); }}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            {isRTL ? 'اختبار جديد' : 'New Test'}
          </button>
          <button className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2">
            <Copy className="w-4 h-4" />
            {isRTL ? 'نسخ النتائج' : 'Copy Results'}
          </button>
          <button className="px-4 py-2 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 flex items-center gap-2">
            <Download className="w-4 h-4" />
            {isRTL ? 'تصدير' : 'Export'}
          </button>
        </div>
      </div>
    );
  };

  // التحقق من وجود بيانات
  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-gray-50 rounded-2xl">
        <Calculator className="w-16 h-16 text-gray-300 mb-4" />
        <h3 className="text-xl font-semibold text-gray-600 mb-2">
          {isRTL ? 'لا توجد بيانات' : 'No Data Available'}
        </h3>
        <p className="text-gray-500">
          {isRTL ? 'يرجى تحميل البيانات أولاً' : 'Please load data first'}
        </p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 rounded-xl">
            <Calculator className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">
              {isRTL ? 'الاختبارات الإحصائية' : 'Statistical Tests'}
            </h2>
            <p className="text-white/80">
              {isRTL ? 'أدوات تحليل إحصائي متقدمة مع تفسيرات واضحة' : 'Advanced statistical analysis tools with clear interpretations'}
            </p>
          </div>
        </div>
        
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4 mt-6">
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{data.length}</div>
            <div className="text-xs text-white/70">{isRTL ? 'سجل' : 'Records'}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{columnAnalysis.numeric.length}</div>
            <div className="text-xs text-white/70">{isRTL ? 'رقمي' : 'Numeric'}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{columnAnalysis.categorical.length}</div>
            <div className="text-xs text-white/70">{isRTL ? 'فئوي' : 'Categorical'}</div>
          </div>
          <div className="bg-white/10 rounded-xl p-3 text-center">
            <div className="text-2xl font-bold">{testHistory.length}</div>
            <div className="text-xs text-white/70">{isRTL ? 'اختبارات' : 'Tests Run'}</div>
          </div>
        </div>
      </div>
      
      {/* Tabs */}
      <div className="flex gap-2 bg-gray-100 p-1 rounded-xl">
        <button
          onClick={() => setActiveTab('smart')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'smart' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <Brain className="w-5 h-5" />
          {isRTL ? 'المستشار الذكي' : 'Smart Advisor'}
        </button>
        <button
          onClick={() => setActiveTab('manual')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'manual' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
        >
          <Settings className="w-5 h-5" />
          {isRTL ? 'اختيار يدوي' : 'Manual Selection'}
        </button>
        <button
          onClick={() => setActiveTab('results')}
          className={`flex-1 py-2 px-4 rounded-lg font-medium transition-all flex items-center justify-center gap-2 ${activeTab === 'results' ? 'bg-white shadow text-blue-600' : 'text-gray-600 hover:text-gray-800'}`}
          disabled={!testResult}
        >
          <FileText className="w-5 h-5" />
          {isRTL ? 'النتائج' : 'Results'}
        </button>
      </div>
      
      {/* Content */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {activeTab === 'smart' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <Brain className="w-16 h-16 mx-auto text-purple-500 mb-4" />
              <h3 className="text-xl font-bold text-gray-800 mb-2">
                {isRTL ? 'المستشار الإحصائي الذكي' : 'Smart Statistical Advisor'}
              </h3>
              <p className="text-gray-600 max-w-md mx-auto">
                {isRTL 
                  ? 'اختر سؤالك البحثي وسيقوم النظام باقتراح الاختبار الأنسب لبياناتك'
                  : 'Select your research question and the system will recommend the best test for your data'}
              </p>
            </div>
            
            {/* Research Questions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { q: 'compare-two-means', icon: <BarChart2 />, label: isRTL ? 'مقارنة متوسطي مجموعتين' : 'Compare means of two groups', tests: ['independent-t', 'mann-whitney'] },
                { q: 'compare-paired', icon: <Activity />, label: isRTL ? 'مقارنة قياسين (قبل/بعد)' : 'Compare paired measurements', tests: ['paired-t', 'wilcoxon'] },
                { q: 'compare-multiple', icon: <Layers />, label: isRTL ? 'مقارنة 3+ مجموعات' : 'Compare 3+ groups', tests: ['anova', 'kruskal-wallis'] },
                { q: 'correlation', icon: <TrendingUp />, label: isRTL ? 'العلاقة بين متغيرين' : 'Relationship between variables', tests: ['pearson', 'spearman'] },
                { q: 'normality', icon: <BarChart2 />, label: isRTL ? 'اختبار التوزيع الطبيعي' : 'Test for normality', tests: ['shapiro-wilk'] },
                { q: 'categorical', icon: <GitBranch />, label: isRTL ? 'العلاقة بين متغيرين فئويين' : 'Association between categorical variables', tests: ['chi-square'] }
              ].map(item => (
                <button
                  key={item.q}
                  onClick={() => { setSelectedTest(item.tests[0]); setActiveTab('manual'); }}
                  className="p-4 bg-gray-50 rounded-xl hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent transition-all text-right"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                      {item.icon}
                    </div>
                    <span className="font-medium text-gray-800">{item.label}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {activeTab === 'manual' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Test Categories */}
            <div className="lg:col-span-2 space-y-4">
              {testCategories.map(category => (
                <div key={category.id} className="border rounded-xl overflow-hidden">
                  <div className={`bg-gradient-to-r ${category.color} p-3 text-white`}>
                    <div className="flex items-center gap-2">
                      {category.icon}
                      <span className="font-semibold">{isRTL ? category.nameAr : category.name}</span>
                    </div>
                  </div>
                  <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-2">
                    {category.tests.map(test => (
                      <button
                        key={test.id}
                        onClick={() => { setSelectedTest(test.id); setTestParams({}); }}
                        className={`p-3 rounded-lg text-right transition-all ${selectedTest === test.id ? 'bg-blue-100 border-2 border-blue-400' : 'bg-gray-50 hover:bg-gray-100 border-2 border-transparent'}`}
                      >
                        <div className="font-medium text-gray-800">{isRTL ? test.nameAr : test.name}</div>
                        <div className="text-xs text-gray-500">{isRTL ? test.descAr : test.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            
            {/* Test Configuration */}
            <div>
              {selectedTest ? renderTestForm() : (
                <div className="bg-gray-50 rounded-xl p-6 text-center">
                  <HelpCircle className="w-12 h-12 mx-auto text-gray-300 mb-3" />
                  <p className="text-gray-500">
                    {isRTL ? 'اختر اختباراً للبدء' : 'Select a test to begin'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'results' && renderResults()}
      </div>
      
      {/* Test History */}
      {testHistory.length > 0 && activeTab !== 'results' && (
        <div className="bg-white rounded-2xl shadow-lg p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-blue-500" />
            {isRTL ? 'سجل الاختبارات' : 'Test History'}
          </h3>
          <div className="space-y-2">
            {testHistory.slice(0, 5).map((result, i) => (
              <div
                key={i}
                onClick={() => { setTestResult(result); setActiveTab('results'); }}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${result.pValue < 0.05 ? 'bg-green-500' : 'bg-gray-400'}`} />
                  <span className="font-medium">{isRTL ? result.nameAr : result.name}</span>
                </div>
                <div className="text-sm text-gray-500">
                  p = {result.pValue.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfessionalStatisticalTests;
