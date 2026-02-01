// محرك الذكاء الاصطناعي المتقدم للتحليل الإحصائي
// Advanced AI Engine for Statistical Analysis

export interface DataColumn {
  name: string;
  values: any[];
  type: 'numeric' | 'categorical' | 'date' | 'text' | 'boolean' | 'ordinal';
  missing: number;
  unique: number;
}

export interface ColumnStatistics {
  name: string;
  type: string;
  count: number;
  missing: number;
  missingPercent: number;
  unique: number;
  // للبيانات الرقمية
  mean?: number;
  median?: number;
  mode?: number;
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
  cv?: number; // معامل الاختلاف
  sem?: number; // الخطأ المعياري
  ci95?: { lower: number; upper: number };
  isNormal?: boolean;
  normalityPValue?: number;
  outliers?: number[];
  outliersCount?: number;
  // للبيانات الفئوية
  categories?: { value: string; count: number; percent: number }[];
  entropy?: number;
}

export interface DataQuality {
  score: number;
  completeness: number;
  consistency: number;
  validity: number;
  uniqueness: number;
  issues: {
    type: 'critical' | 'warning' | 'info';
    message: string;
    column?: string;
    suggestion: string;
  }[];
}

export interface AIInsight {
  id: string;
  type: 'pattern' | 'anomaly' | 'correlation' | 'distribution' | 'quality' | 'recommendation';
  severity: 'high' | 'medium' | 'low';
  title: string;
  titleEn: string;
  description: string;
  descriptionEn: string;
  details: string;
  detailsEn: string;
  action?: string;
  actionEn?: string;
  affectedColumns?: string[];
  value?: number;
  confidence: number;
}

export interface TestRecommendation {
  id: string;
  name: string;
  nameEn: string;
  category: string;
  categoryEn: string;
  description: string;
  descriptionEn: string;
  suitability: number; // 0-100
  reasons: string[];
  reasonsEn: string[];
  assumptions: {
    name: string;
    nameEn: string;
    met: boolean;
    details: string;
    detailsEn: string;
  }[];
  variables: {
    dependent?: string;
    independent?: string[];
    grouping?: string;
  };
  alternativeTest?: string;
  alternativeTestEn?: string;
}

export interface AnalysisResult {
  testName: string;
  testNameEn: string;
  statistic: number;
  pValue: number;
  degreesOfFreedom?: number;
  effectSize?: {
    name: string;
    value: number;
    interpretation: string;
    interpretationEn: string;
  };
  confidenceInterval?: {
    lower: number;
    upper: number;
    level: number;
  };
  conclusion: string;
  conclusionEn: string;
  interpretation: string;
  interpretationEn: string;
  recommendations: string[];
  recommendationsEn: string[];
  additionalStats?: Record<string, number>;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

class AdvancedAIEngine {
  private data: Record<string, any>[] = [];
  private columns: DataColumn[] = [];
  private statistics: Map<string, ColumnStatistics> = new Map();
  private correlationMatrix: Map<string, Map<string, number>> = new Map();
  private insights: AIInsight[] = [];
  private analysisHistory: AnalysisResult[] = [];
  private chatHistory: ChatMessage[] = [];

  // ========== الدوال الرياضية الأساسية ==========
  
  private sum(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0);
  }

  private mean(arr: number[]): number {
    if (arr.length === 0) return 0;
    return this.sum(arr) / arr.length;
  }

  private median(arr: number[]): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  }

  private mode(arr: number[]): number {
    if (arr.length === 0) return 0;
    const freq: Record<number, number> = {};
    let maxFreq = 0;
    let modeVal = arr[0];
    for (const val of arr) {
      freq[val] = (freq[val] || 0) + 1;
      if (freq[val] > maxFreq) {
        maxFreq = freq[val];
        modeVal = val;
      }
    }
    return modeVal;
  }

  private variance(arr: number[], sample = true): number {
    if (arr.length < 2) return 0;
    const m = this.mean(arr);
    const squaredDiffs = arr.map(x => Math.pow(x - m, 2));
    return this.sum(squaredDiffs) / (arr.length - (sample ? 1 : 0));
  }

  private std(arr: number[], sample = true): number {
    return Math.sqrt(this.variance(arr, sample));
  }

  private percentile(arr: number[], p: number): number {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  private skewness(arr: number[]): number {
    if (arr.length < 3) return 0;
    const n = arr.length;
    const m = this.mean(arr);
    const s = this.std(arr);
    if (s === 0) return 0;
    const sum = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum;
  }

  private kurtosis(arr: number[]): number {
    if (arr.length < 4) return 0;
    const n = arr.length;
    const m = this.mean(arr);
    const s = this.std(arr);
    if (s === 0) return 0;
    const sum = arr.reduce((acc, x) => acc + Math.pow((x - m) / s, 4), 0);
    const kurt = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum;
    const correction = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return kurt - correction;
  }

  private covariance(x: number[], y: number[]): number {
    if (x.length !== y.length || x.length < 2) return 0;
    const meanX = this.mean(x);
    const meanY = this.mean(y);
    let sum = 0;
    for (let i = 0; i < x.length; i++) {
      sum += (x[i] - meanX) * (y[i] - meanY);
    }
    return sum / (x.length - 1);
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const cov = this.covariance(x, y);
    const stdX = this.std(x);
    const stdY = this.std(y);
    if (stdX === 0 || stdY === 0) return 0;
    return cov / (stdX * stdY);
  }

  private spearmanCorrelation(x: number[], y: number[]): number {
    const rankX = this.ranks(x);
    const rankY = this.ranks(y);
    return this.pearsonCorrelation(rankX, rankY);
  }

  private ranks(arr: number[]): number[] {
    const sorted = arr.map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
      const avgRank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) {
        ranks[sorted[k].i] = avgRank;
      }
      i = j;
    }
    return ranks;
  }

  // ========== دوال التوزيعات ==========

  private normalCDF(x: number, mean = 0, std = 1): number {
    const z = (x - mean) / std;
    const t = 1 / (1 + 0.2316419 * Math.abs(z));
    const d = 0.3989422804014327 * Math.exp(-z * z / 2);
    const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
    return z > 0 ? 1 - p : p;
  }

  private normalQuantile(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

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
  }

  private tCDF(t: number, df: number): number {
    const x = df / (df + t * t);
    return 1 - 0.5 * this.incompleteBeta(x, df / 2, 0.5);
  }

  private tPValue(t: number, df: number, twoTailed = true): number {
    const p = 1 - this.tCDF(Math.abs(t), df);
    return twoTailed ? 2 * p : p;
  }

  private fCDF(f: number, df1: number, df2: number): number {
    if (f <= 0) return 0;
    const x = df1 * f / (df1 * f + df2);
    return this.incompleteBeta(x, df1 / 2, df2 / 2);
  }

  private fPValue(f: number, df1: number, df2: number): number {
    return 1 - this.fCDF(f, df1, df2);
  }

  private chiSquareCDF(x: number, df: number): number {
    if (x <= 0) return 0;
    return this.gammaIncomplete(df / 2, x / 2);
  }

  private chiSquarePValue(x: number, df: number): number {
    return 1 - this.chiSquareCDF(x, df);
  }

  private gammaLn(x: number): number {
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

  private gammaIncomplete(a: number, x: number): number {
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
      return sum * Math.exp(-x + a * Math.log(x) - this.gammaLn(a));
    } else {
      let b = x + 1 - a;
      let c = 1 / 1e-30;
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
      return 1 - Math.exp(-x + a * Math.log(x) - this.gammaLn(a)) * h;
    }
  }

  private incompleteBeta(x: number, a: number, b: number): number {
    if (x === 0) return 0;
    if (x === 1) return 1;

    const bt = Math.exp(
      this.gammaLn(a + b) - this.gammaLn(a) - this.gammaLn(b) +
      a * Math.log(x) + b * Math.log(1 - x)
    );

    if (x < (a + 1) / (a + b + 2)) {
      return bt * this.betaCF(x, a, b) / a;
    } else {
      return 1 - bt * this.betaCF(1 - x, b, a) / b;
    }
  }

  private betaCF(x: number, a: number, b: number): number {
    const maxIter = 100;
    const eps = 1e-10;
    
    let qab = a + b;
    let qap = a + 1;
    let qam = a - 1;
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
  }

  // ========== اختبارات التوزيع الطبيعي ==========

  private shapiroWilkTest(data: number[]): { w: number; pValue: number; isNormal: boolean } {
    const n = data.length;
    if (n < 3 || n > 5000) {
      return { w: 0, pValue: 0, isNormal: false };
    }

    const sorted = [...data].sort((a, b) => a - b);
    const mean = this.mean(sorted);
    
    // حساب SS
    let ss = 0;
    for (const x of sorted) {
      ss += Math.pow(x - mean, 2);
    }

    // معاملات a للتوزيع الطبيعي (تقريبية)
    const a: number[] = [];
    const m: number[] = [];
    
    for (let i = 1; i <= n; i++) {
      m.push(this.normalQuantile((i - 0.375) / (n + 0.25)));
    }

    const mSum = m.reduce((acc, val) => acc + val * val, 0);
    for (let i = 0; i < n; i++) {
      a.push(m[i] / Math.sqrt(mSum));
    }

    // حساب W
    let b = 0;
    for (let i = 0; i < n; i++) {
      b += a[i] * sorted[i];
    }
    
    const w = (b * b) / ss;

    // تقدير p-value باستخدام تحويل لوغاريتمي
    const logW = Math.log(1 - w);
    const mu = 0.0038915 * Math.pow(Math.log(n), 3) - 0.083751 * Math.pow(Math.log(n), 2) - 0.31082 * Math.log(n) - 1.5861;
    const sigma = Math.exp(0.0030302 * Math.pow(Math.log(n), 2) - 0.082676 * Math.log(n) - 0.4803);
    const z = (logW - mu) / sigma;
    const pValue = 1 - this.normalCDF(z);

    return {
      w: Math.min(1, Math.max(0, w)),
      pValue: Math.min(1, Math.max(0, pValue)),
      isNormal: pValue > 0.05
    };
  }

  // ========== كشف القيم الشاذة ==========

  private detectOutliers(arr: number[], method: 'iqr' | 'zscore' = 'iqr'): number[] {
    if (arr.length < 4) return [];

    if (method === 'iqr') {
      const q1 = this.percentile(arr, 25);
      const q3 = this.percentile(arr, 75);
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;
      return arr.filter(x => x < lowerBound || x > upperBound);
    } else {
      const m = this.mean(arr);
      const s = this.std(arr);
      if (s === 0) return [];
      return arr.filter(x => Math.abs((x - m) / s) > 3);
    }
  }

  // ========== تحليل البيانات ==========

  public loadData(data: Record<string, any>[]): void {
    this.data = data;
    this.columns = [];
    this.statistics.clear();
    this.correlationMatrix.clear();
    this.insights = [];

    if (data.length === 0) return;

    // تحديد الأعمدة وأنواعها
    const columnNames = Object.keys(data[0]);
    
    for (const name of columnNames) {
      const values = data.map(row => row[name]);
      const type = this.detectColumnType(values);
      const missing = values.filter(v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))).length;
      const unique = new Set(values.filter(v => v !== null && v !== undefined && v !== '')).size;

      this.columns.push({ name, values, type, missing, unique });
    }

    // حساب الإحصائيات لكل عمود
    this.calculateAllStatistics();

    // حساب مصفوفة الارتباط
    this.calculateCorrelationMatrix();

    // توليد الرؤى
    this.generateInsights();
  }

  private detectColumnType(values: any[]): DataColumn['type'] {
    const validValues = values.filter(v => v !== null && v !== undefined && v !== '');
    if (validValues.length === 0) return 'text';

    const sample = validValues.slice(0, Math.min(100, validValues.length));
    
    // فحص القيم المنطقية
    const booleanValues = ['true', 'false', '0', '1', 'yes', 'no', 'نعم', 'لا'];
    if (sample.every(v => booleanValues.includes(String(v).toLowerCase()))) {
      return 'boolean';
    }

    // فحص التواريخ
    const datePattern = /^\d{4}[-/]\d{1,2}[-/]\d{1,2}$|^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/;
    if (sample.every(v => datePattern.test(String(v)) || !isNaN(Date.parse(String(v))))) {
      return 'date';
    }

    // فحص الأرقام
    const numericCount = sample.filter(v => !isNaN(Number(v))).length;
    if (numericCount / sample.length >= 0.8) {
      return 'numeric';
    }

    // فحص الفئات (عدد قيم فريدة قليل)
    const uniqueRatio = new Set(sample.map(v => String(v))).size / sample.length;
    if (uniqueRatio < 0.3 || new Set(sample).size <= 20) {
      return 'categorical';
    }

    return 'text';
  }

  private calculateAllStatistics(): void {
    for (const column of this.columns) {
      const stats = this.calculateColumnStatistics(column);
      this.statistics.set(column.name, stats);
    }
  }

  private calculateColumnStatistics(column: DataColumn): ColumnStatistics {
    const validValues = column.values.filter(v => 
      v !== null && v !== undefined && v !== '' && !Number.isNaN(v)
    );

    const baseStats: ColumnStatistics = {
      name: column.name,
      type: column.type,
      count: validValues.length,
      missing: column.missing,
      missingPercent: (column.missing / column.values.length) * 100,
      unique: column.unique
    };

    if (column.type === 'numeric') {
      const numericValues = validValues.map(Number).filter(v => !isNaN(v));
      
      if (numericValues.length > 0) {
        const m = this.mean(numericValues);
        const s = this.std(numericValues);
        const q1 = this.percentile(numericValues, 25);
        const q3 = this.percentile(numericValues, 75);
        const outliers = this.detectOutliers(numericValues);
        const normality = this.shapiroWilkTest(numericValues);

        const sem = s / Math.sqrt(numericValues.length);
        const tValue = 1.96; // 95% CI approximation

        return {
          ...baseStats,
          mean: m,
          median: this.median(numericValues),
          mode: this.mode(numericValues),
          std: s,
          variance: this.variance(numericValues),
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          range: Math.max(...numericValues) - Math.min(...numericValues),
          q1,
          q3,
          iqr: q3 - q1,
          skewness: this.skewness(numericValues),
          kurtosis: this.kurtosis(numericValues),
          cv: s !== 0 ? (s / Math.abs(m)) * 100 : 0,
          sem,
          ci95: {
            lower: m - tValue * sem,
            upper: m + tValue * sem
          },
          isNormal: normality.isNormal,
          normalityPValue: normality.pValue,
          outliers,
          outliersCount: outliers.length
        };
      }
    }

    if (column.type === 'categorical' || column.type === 'boolean' || column.type === 'ordinal') {
      const freq: Record<string, number> = {};
      for (const v of validValues) {
        const key = String(v);
        freq[key] = (freq[key] || 0) + 1;
      }

      const categories = Object.entries(freq)
        .map(([value, count]) => ({
          value,
          count,
          percent: (count / validValues.length) * 100
        }))
        .sort((a, b) => b.count - a.count);

      // حساب الإنتروبيا
      let entropy = 0;
      for (const cat of categories) {
        const p = cat.count / validValues.length;
        if (p > 0) {
          entropy -= p * Math.log2(p);
        }
      }

      return {
        ...baseStats,
        categories,
        entropy
      };
    }

    return baseStats;
  }

  private calculateCorrelationMatrix(): void {
    const numericColumns = this.columns.filter(c => c.type === 'numeric');
    
    for (const col1 of numericColumns) {
      const map = new Map<string, number>();
      for (const col2 of numericColumns) {
        const values1: number[] = [];
        const values2: number[] = [];
        
        for (let i = 0; i < this.data.length; i++) {
          const v1 = Number(col1.values[i]);
          const v2 = Number(col2.values[i]);
          if (!isNaN(v1) && !isNaN(v2)) {
            values1.push(v1);
            values2.push(v2);
          }
        }

        if (values1.length > 2) {
          map.set(col2.name, this.pearsonCorrelation(values1, values2));
        }
      }
      this.correlationMatrix.set(col1.name, map);
    }
  }

  private generateInsights(): void {
    this.insights = [];
    let insightId = 0;

    // 1. رؤى القيم المفقودة
    for (const [name, stats] of this.statistics) {
      if (stats.missingPercent > 5) {
        this.insights.push({
          id: `insight-${++insightId}`,
          type: 'quality',
          severity: stats.missingPercent > 20 ? 'high' : 'medium',
          title: `قيم مفقودة في "${name}"`,
          titleEn: `Missing values in "${name}"`,
          description: `${stats.missingPercent.toFixed(1)}% من القيم مفقودة`,
          descriptionEn: `${stats.missingPercent.toFixed(1)}% of values are missing`,
          details: `العمود "${name}" يحتوي على ${stats.missing} قيمة مفقودة من أصل ${stats.count + stats.missing} قيمة.`,
          detailsEn: `Column "${name}" has ${stats.missing} missing values out of ${stats.count + stats.missing} total.`,
          action: 'يُنصح بمعالجة القيم المفقودة باستخدام التعويض الإحصائي المناسب',
          actionEn: 'Consider imputing missing values using appropriate statistical methods',
          affectedColumns: [name],
          value: stats.missingPercent,
          confidence: 100
        });
      }
    }

    // 2. رؤى القيم الشاذة
    for (const [name, stats] of this.statistics) {
      if (stats.outliersCount && stats.outliersCount > 0) {
        const outlierPercent = (stats.outliersCount / stats.count) * 100;
        if (outlierPercent > 1) {
          this.insights.push({
            id: `insight-${++insightId}`,
            type: 'anomaly',
            severity: outlierPercent > 5 ? 'high' : 'medium',
            title: `قيم شاذة في "${name}"`,
            titleEn: `Outliers detected in "${name}"`,
            description: `${stats.outliersCount} قيمة شاذة (${outlierPercent.toFixed(1)}%)`,
            descriptionEn: `${stats.outliersCount} outliers found (${outlierPercent.toFixed(1)}%)`,
            details: `تم اكتشاف قيم خارج النطاق الطبيعي باستخدام طريقة IQR.`,
            detailsEn: `Values outside the normal range were detected using the IQR method.`,
            action: 'راجع القيم الشاذة وحدد ما إذا كانت أخطاء أو قيم حقيقية',
            actionEn: 'Review outliers to determine if they are errors or genuine values',
            affectedColumns: [name],
            value: outlierPercent,
            confidence: 95
          });
        }
      }
    }

    // 3. رؤى التوزيع
    for (const [name, stats] of this.statistics) {
      if (stats.skewness !== undefined && Math.abs(stats.skewness) > 1) {
        this.insights.push({
          id: `insight-${++insightId}`,
          type: 'distribution',
          severity: 'medium',
          title: `توزيع ملتوٍ في "${name}"`,
          titleEn: `Skewed distribution in "${name}"`,
          description: `معامل الالتواء = ${stats.skewness.toFixed(2)} (${stats.skewness > 0 ? 'التواء موجب' : 'التواء سالب'})`,
          descriptionEn: `Skewness = ${stats.skewness.toFixed(2)} (${stats.skewness > 0 ? 'positive skew' : 'negative skew'})`,
          details: stats.skewness > 0 
            ? 'التوزيع ممتد نحو اليمين مع ذيل طويل للقيم العالية'
            : 'التوزيع ممتد نحو اليسار مع ذيل طويل للقيم المنخفضة',
          detailsEn: stats.skewness > 0
            ? 'Distribution is right-skewed with a long tail of high values'
            : 'Distribution is left-skewed with a long tail of low values',
          action: 'قد تحتاج لتحويل لوغاريتمي لتطبيع البيانات',
          actionEn: 'Consider log transformation to normalize the data',
          affectedColumns: [name],
          value: stats.skewness,
          confidence: 90
        });
      }
    }

    // 4. رؤى التوزيع الطبيعي
    for (const [name, stats] of this.statistics) {
      if (stats.isNormal === false && stats.normalityPValue !== undefined) {
        this.insights.push({
          id: `insight-${++insightId}`,
          type: 'distribution',
          severity: 'low',
          title: `توزيع غير طبيعي في "${name}"`,
          titleEn: `Non-normal distribution in "${name}"`,
          description: `اختبار Shapiro-Wilk: p = ${stats.normalityPValue.toFixed(4)}`,
          descriptionEn: `Shapiro-Wilk test: p = ${stats.normalityPValue.toFixed(4)}`,
          details: 'البيانات لا تتبع التوزيع الطبيعي، مما قد يؤثر على بعض الاختبارات المعلمية',
          detailsEn: 'Data does not follow normal distribution, which may affect some parametric tests',
          action: 'استخدم الاختبارات اللامعلمية أو قم بتحويل البيانات',
          actionEn: 'Use non-parametric tests or transform the data',
          affectedColumns: [name],
          value: stats.normalityPValue,
          confidence: 95
        });
      }
    }

    // 5. رؤى الارتباطات القوية
    for (const [col1, correlations] of this.correlationMatrix) {
      for (const [col2, r] of correlations) {
        if (col1 < col2 && Math.abs(r) > 0.7) {
          this.insights.push({
            id: `insight-${++insightId}`,
            type: 'correlation',
            severity: Math.abs(r) > 0.9 ? 'high' : 'medium',
            title: `ارتباط قوي بين "${col1}" و "${col2}"`,
            titleEn: `Strong correlation between "${col1}" and "${col2}"`,
            description: `معامل ارتباط بيرسون = ${r.toFixed(3)} (${r > 0 ? 'طردي' : 'عكسي'})`,
            descriptionEn: `Pearson correlation = ${r.toFixed(3)} (${r > 0 ? 'positive' : 'negative'})`,
            details: r > 0.9 || r < -0.9
              ? 'ارتباط قوي جداً، قد يشير إلى علاقة سببية أو تعدد خطي'
              : 'ارتباط قوي يستحق المزيد من التحليل',
            detailsEn: r > 0.9 || r < -0.9
              ? 'Very strong correlation, may indicate causal relationship or multicollinearity'
              : 'Strong correlation worth further investigation',
            action: 'تحقق من العلاقة السببية واحذر من التعدد الخطي في نماذج الانحدار',
            actionEn: 'Investigate causal relationship and beware of multicollinearity in regression',
            affectedColumns: [col1, col2],
            value: r,
            confidence: 95
          });
        }
      }
    }

    // ترتيب الرؤى حسب الأهمية
    this.insights.sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });
  }

  // ========== التوصيات الذكية ==========

  public getTestRecommendations(
    dependentVar?: string,
    independentVars?: string[],
    groupingVar?: string
  ): TestRecommendation[] {
    const recommendations: TestRecommendation[] = [];

    const depStats = dependentVar ? this.statistics.get(dependentVar) : undefined;
    const groupStats = groupingVar ? this.statistics.get(groupingVar) : undefined;

    // إذا لم يتم تحديد متغيرات، اقترح بناءً على البيانات المتاحة
    if (!dependentVar && !groupingVar) {
      return this.getGeneralRecommendations();
    }

    // مقارنة بين مجموعتين
    if (depStats?.type === 'numeric' && groupStats?.categories?.length === 2) {
      const isNormal = depStats.isNormal ?? false;

      if (isNormal) {
        recommendations.push({
          id: 'ind-ttest',
          name: 'اختبار t للعينات المستقلة',
          nameEn: 'Independent Samples T-Test',
          category: 'معلمي',
          categoryEn: 'Parametric',
          description: 'لمقارنة متوسطي مجموعتين مستقلتين عندما تكون البيانات طبيعية التوزيع',
          descriptionEn: 'Compare means of two independent groups when data is normally distributed',
          suitability: 95,
          reasons: [
            'المتغير التابع رقمي ومستمر',
            'متغير التجميع يحتوي على مجموعتين',
            'البيانات تتبع التوزيع الطبيعي'
          ],
          reasonsEn: [
            'Dependent variable is numeric and continuous',
            'Grouping variable has exactly two groups',
            'Data follows normal distribution'
          ],
          assumptions: [
            { name: 'التوزيع الطبيعي', nameEn: 'Normality', met: true, details: 'البيانات طبيعية التوزيع', detailsEn: 'Data is normally distributed' },
            { name: 'استقلالية المشاهدات', nameEn: 'Independence', met: true, details: 'يُفترض استقلالية المشاهدات', detailsEn: 'Observations are assumed independent' },
            { name: 'تجانس التباينات', nameEn: 'Homogeneity of Variances', met: true, details: 'استخدم اختبار Levene للتحقق', detailsEn: 'Use Levene test to verify' }
          ],
          variables: { dependent: dependentVar, grouping: groupingVar },
          alternativeTest: 'اختبار مان-ويتني',
          alternativeTestEn: 'Mann-Whitney U Test'
        });
      }

      recommendations.push({
        id: 'mann-whitney',
        name: 'اختبار مان-ويتني',
        nameEn: 'Mann-Whitney U Test',
        category: 'لامعلمي',
        categoryEn: 'Non-Parametric',
        description: 'لمقارنة توزيعات مجموعتين مستقلتين (بديل لا معلمي لاختبار t)',
        descriptionEn: 'Compare distributions of two independent groups (non-parametric alternative to t-test)',
        suitability: isNormal ? 75 : 95,
        reasons: isNormal 
          ? ['يصلح كبديل احتياطي إذا فشلت افتراضات T-Test']
          : ['البيانات لا تتبع التوزيع الطبيعي', 'اختبار أكثر مقاومة للقيم الشاذة'],
        reasonsEn: isNormal
          ? ['Can be used as backup if T-Test assumptions fail']
          : ['Data is not normally distributed', 'More robust to outliers'],
        assumptions: [
          { name: 'استقلالية المشاهدات', nameEn: 'Independence', met: true, details: 'يُفترض استقلالية المشاهدات', detailsEn: 'Observations are assumed independent' },
          { name: 'البيانات ترتيبية على الأقل', nameEn: 'Ordinal Data', met: true, details: 'البيانات الرقمية تحقق هذا الشرط', detailsEn: 'Numeric data satisfies this' }
        ],
        variables: { dependent: dependentVar, grouping: groupingVar }
      });
    }

    // مقارنة بين ثلاث مجموعات أو أكثر
    if (depStats?.type === 'numeric' && groupStats?.categories && groupStats.categories.length >= 3) {
      const isNormal = depStats.isNormal ?? false;

      if (isNormal) {
        recommendations.push({
          id: 'one-way-anova',
          name: 'تحليل التباين الأحادي',
          nameEn: 'One-Way ANOVA',
          category: 'معلمي',
          categoryEn: 'Parametric',
          description: 'لمقارنة متوسطات ثلاث مجموعات أو أكثر',
          descriptionEn: 'Compare means of three or more groups',
          suitability: 95,
          reasons: [
            'المتغير التابع رقمي',
            `متغير التجميع يحتوي على ${groupStats.categories.length} مجموعات`,
            'البيانات طبيعية التوزيع'
          ],
          reasonsEn: [
            'Dependent variable is numeric',
            `Grouping variable has ${groupStats.categories.length} groups`,
            'Data is normally distributed'
          ],
          assumptions: [
            { name: 'التوزيع الطبيعي', nameEn: 'Normality', met: true, details: 'البيانات طبيعية', detailsEn: 'Data is normal' },
            { name: 'تجانس التباينات', nameEn: 'Homogeneity', met: true, details: 'تحقق باختبار Levene', detailsEn: 'Verify with Levene test' },
            { name: 'استقلالية المشاهدات', nameEn: 'Independence', met: true, details: 'مفترض', detailsEn: 'Assumed' }
          ],
          variables: { dependent: dependentVar, grouping: groupingVar },
          alternativeTest: 'اختبار كروسكال-واليس',
          alternativeTestEn: 'Kruskal-Wallis Test'
        });
      }

      recommendations.push({
        id: 'kruskal-wallis',
        name: 'اختبار كروسكال-واليس',
        nameEn: 'Kruskal-Wallis H Test',
        category: 'لامعلمي',
        categoryEn: 'Non-Parametric',
        description: 'لمقارنة توزيعات ثلاث مجموعات أو أكثر (بديل لـ ANOVA)',
        descriptionEn: 'Compare distributions of three or more groups (non-parametric alternative to ANOVA)',
        suitability: isNormal ? 70 : 95,
        reasons: isNormal
          ? ['بديل إذا فشلت افتراضات ANOVA']
          : ['البيانات غير طبيعية التوزيع'],
        reasonsEn: isNormal
          ? ['Alternative if ANOVA assumptions fail']
          : ['Data is not normally distributed'],
        assumptions: [
          { name: 'استقلالية المشاهدات', nameEn: 'Independence', met: true, details: 'مفترض', detailsEn: 'Assumed' }
        ],
        variables: { dependent: dependentVar, grouping: groupingVar }
      });
    }

    // تحليل الارتباط
    if (independentVars && independentVars.length === 1) {
      const indepStats = this.statistics.get(independentVars[0]);
      
      if (depStats?.type === 'numeric' && indepStats?.type === 'numeric') {
        const depNormal = depStats.isNormal ?? false;
        const indepNormal = indepStats.isNormal ?? false;

        recommendations.push({
          id: 'pearson',
          name: 'ارتباط بيرسون',
          nameEn: 'Pearson Correlation',
          category: 'ارتباط',
          categoryEn: 'Correlation',
          description: 'لقياس العلاقة الخطية بين متغيرين رقميين',
          descriptionEn: 'Measure linear relationship between two numeric variables',
          suitability: (depNormal && indepNormal) ? 95 : 70,
          reasons: [
            'كلا المتغيرين رقميان',
            depNormal && indepNormal ? 'البيانات طبيعية التوزيع' : 'قد تحتاج لـ Spearman'
          ],
          reasonsEn: [
            'Both variables are numeric',
            depNormal && indepNormal ? 'Data is normally distributed' : 'May need Spearman instead'
          ],
          assumptions: [
            { name: 'العلاقة الخطية', nameEn: 'Linearity', met: true, details: 'تحقق من الرسم التشتتي', detailsEn: 'Check scatter plot' },
            { name: 'التوزيع الطبيعي', nameEn: 'Normality', met: depNormal && indepNormal, details: depNormal && indepNormal ? 'متحقق' : 'غير متحقق', detailsEn: depNormal && indepNormal ? 'Met' : 'Not met' }
          ],
          variables: { dependent: dependentVar, independent: independentVars },
          alternativeTest: 'ارتباط سبيرمان',
          alternativeTestEn: 'Spearman Correlation'
        });

        recommendations.push({
          id: 'spearman',
          name: 'ارتباط سبيرمان',
          nameEn: 'Spearman Correlation',
          category: 'ارتباط',
          categoryEn: 'Correlation',
          description: 'لقياس العلاقة الرتبية بين متغيرين (لا يتطلب توزيع طبيعي)',
          descriptionEn: 'Measure monotonic relationship between two variables (no normality required)',
          suitability: (depNormal && indepNormal) ? 80 : 95,
          reasons: [
            'لا يتطلب توزيع طبيعي',
            'أكثر مقاومة للقيم الشاذة',
            'يكشف العلاقات غير الخطية'
          ],
          reasonsEn: [
            'Does not require normal distribution',
            'More robust to outliers',
            'Detects non-linear relationships'
          ],
          assumptions: [
            { name: 'بيانات ترتيبية على الأقل', nameEn: 'Ordinal Data', met: true, details: 'متحقق', detailsEn: 'Met' }
          ],
          variables: { dependent: dependentVar, independent: independentVars }
        });
      }
    }

    // ترتيب حسب الملاءمة
    recommendations.sort((a, b) => b.suitability - a.suitability);

    return recommendations;
  }

  private getGeneralRecommendations(): TestRecommendation[] {
    const recommendations: TestRecommendation[] = [];
    const numericCols = this.columns.filter(c => c.type === 'numeric');
    const categoricalCols = this.columns.filter(c => c.type === 'categorical');

    // توصية بتحليل الارتباط إذا كان هناك متغيرات رقمية متعددة
    if (numericCols.length >= 2) {
      recommendations.push({
        id: 'correlation-analysis',
        name: 'تحليل الارتباط',
        nameEn: 'Correlation Analysis',
        category: 'استكشافي',
        categoryEn: 'Exploratory',
        description: 'استكشف العلاقات بين المتغيرات الرقمية في بياناتك',
        descriptionEn: 'Explore relationships between numeric variables in your data',
        suitability: 90,
        reasons: [
          `لديك ${numericCols.length} متغيرات رقمية`,
          'يساعد في فهم البنية الأساسية للبيانات',
          'يكشف العلاقات المحتملة'
        ],
        reasonsEn: [
          `You have ${numericCols.length} numeric variables`,
          'Helps understand data structure',
          'Reveals potential relationships'
        ],
        assumptions: [],
        variables: {}
      });
    }

    // توصية باختبار كاي تربيع إذا كان هناك متغيرات فئوية
    if (categoricalCols.length >= 2) {
      recommendations.push({
        id: 'chi-square',
        name: 'اختبار كاي تربيع',
        nameEn: 'Chi-Square Test',
        category: 'فئوي',
        categoryEn: 'Categorical',
        description: 'اختبر الاستقلالية بين المتغيرات الفئوية',
        descriptionEn: 'Test independence between categorical variables',
        suitability: 85,
        reasons: [
          `لديك ${categoricalCols.length} متغيرات فئوية`,
          'يكشف العلاقات بين الفئات'
        ],
        reasonsEn: [
          `You have ${categoricalCols.length} categorical variables`,
          'Reveals relationships between categories'
        ],
        assumptions: [
          { name: 'حجم العينة كافٍ', nameEn: 'Adequate Sample Size', met: this.data.length >= 30, details: `عدد المشاهدات: ${this.data.length}`, detailsEn: `Sample size: ${this.data.length}` }
        ],
        variables: {}
      });
    }

    return recommendations;
  }

  // ========== تنفيذ الاختبارات ==========

  public runTest(testId: string, params: {
    dependent?: string;
    independent?: string[];
    grouping?: string;
    testValue?: number;
  }): AnalysisResult | null {
    switch (testId) {
      case 'ind-ttest':
        return this.runIndependentTTest(params.dependent!, params.grouping!);
      case 'mann-whitney':
        return this.runMannWhitneyTest(params.dependent!, params.grouping!);
      case 'one-way-anova':
        return this.runOneWayAnova(params.dependent!, params.grouping!);
      case 'kruskal-wallis':
        return this.runKruskalWallisTest(params.dependent!, params.grouping!);
      case 'pearson':
        return this.runPearsonCorrelation(params.dependent!, params.independent![0]);
      case 'spearman':
        return this.runSpearmanCorrelation(params.dependent!, params.independent![0]);
      case 'chi-square':
        return this.runChiSquareTest(params.dependent!, params.grouping!);
      default:
        return null;
    }
  }

  private runIndependentTTest(dependent: string, grouping: string): AnalysisResult {
    const depCol = this.columns.find(c => c.name === dependent);
    const groupCol = this.columns.find(c => c.name === grouping);
    
    if (!depCol || !groupCol) {
      throw new Error('Invalid columns');
    }

    // تقسيم البيانات حسب المجموعات
    const groups: Record<string, number[]> = {};
    for (let i = 0; i < this.data.length; i++) {
      const groupValue = String(groupCol.values[i]);
      const depValue = Number(depCol.values[i]);
      if (!isNaN(depValue) && groupValue) {
        if (!groups[groupValue]) groups[groupValue] = [];
        groups[groupValue].push(depValue);
      }
    }

    const groupNames = Object.keys(groups);
    if (groupNames.length !== 2) {
      throw new Error('T-Test requires exactly 2 groups');
    }

    const g1 = groups[groupNames[0]];
    const g2 = groups[groupNames[1]];

    const n1 = g1.length;
    const n2 = g2.length;
    const m1 = this.mean(g1);
    const m2 = this.mean(g2);
    const v1 = this.variance(g1);
    const v2 = this.variance(g2);

    // Pooled variance
    const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
    const se = Math.sqrt(pooledVar * (1/n1 + 1/n2));
    const t = (m1 - m2) / se;
    const df = n1 + n2 - 2;
    const pValue = this.tPValue(t, df);

    // Cohen's d
    const pooledStd = Math.sqrt(pooledVar);
    const cohenD = (m1 - m2) / pooledStd;

    let effectInterpretation = 'ضعيف';
    let effectInterpretationEn = 'Small';
    if (Math.abs(cohenD) >= 0.8) {
      effectInterpretation = 'كبير';
      effectInterpretationEn = 'Large';
    } else if (Math.abs(cohenD) >= 0.5) {
      effectInterpretation = 'متوسط';
      effectInterpretationEn = 'Medium';
    }

    const isSignificant = pValue < 0.05;
    const tCrit = 1.96; // approximation for large df
    const ciLower = (m1 - m2) - tCrit * se;
    const ciUpper = (m1 - m2) + tCrit * se;

    const result: AnalysisResult = {
      testName: 'اختبار t للعينات المستقلة',
      testNameEn: 'Independent Samples T-Test',
      statistic: t,
      pValue,
      degreesOfFreedom: df,
      effectSize: {
        name: "Cohen's d",
        value: cohenD,
        interpretation: effectInterpretation,
        interpretationEn: effectInterpretationEn
      },
      confidenceInterval: {
        lower: ciLower,
        upper: ciUpper,
        level: 95
      },
      conclusion: isSignificant 
        ? `يوجد فرق دال إحصائياً بين المجموعتين (t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `لا يوجد فرق دال إحصائياً بين المجموعتين (t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      conclusionEn: isSignificant
        ? `There is a statistically significant difference between groups (t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `There is no statistically significant difference between groups (t(${df}) = ${t.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      interpretation: isSignificant
        ? `الفرق بين متوسط المجموعة الأولى (${m1.toFixed(2)}) والثانية (${m2.toFixed(2)}) دال إحصائياً. حجم الأثر ${effectInterpretation} (d = ${cohenD.toFixed(2)}).`
        : `لا يوجد دليل كافٍ على وجود فرق حقيقي بين المجموعتين. الفرق الملاحظ قد يكون بسبب الصدفة.`,
      interpretationEn: isSignificant
        ? `The difference between group 1 mean (${m1.toFixed(2)}) and group 2 mean (${m2.toFixed(2)}) is statistically significant. Effect size is ${effectInterpretationEn.toLowerCase()} (d = ${cohenD.toFixed(2)}).`
        : `There is insufficient evidence of a real difference between groups. The observed difference may be due to chance.`,
      recommendations: isSignificant
        ? ['استكشف العوامل المسببة للفرق', 'تحقق من الأهمية العملية للنتائج', 'ضع في اعتبارك حجم الأثر عند التفسير']
        : ['قد تحتاج لزيادة حجم العينة', 'تحقق من افتراضات الاختبار', 'فكر في اختبارات بديلة'],
      recommendationsEn: isSignificant
        ? ['Explore factors causing the difference', 'Consider practical significance', 'Consider effect size in interpretation']
        : ['May need larger sample size', 'Verify test assumptions', 'Consider alternative tests'],
      additionalStats: {
        [`متوسط ${groupNames[0]}`]: m1,
        [`متوسط ${groupNames[1]}`]: m2,
        [`ن ${groupNames[0]}`]: n1,
        [`ن ${groupNames[1]}`]: n2,
        'الفرق بين المتوسطين': m1 - m2
      }
    };

    this.analysisHistory.push(result);
    return result;
  }

  private runMannWhitneyTest(dependent: string, grouping: string): AnalysisResult {
    const depCol = this.columns.find(c => c.name === dependent);
    const groupCol = this.columns.find(c => c.name === grouping);
    
    if (!depCol || !groupCol) {
      throw new Error('Invalid columns');
    }

    const groups: Record<string, number[]> = {};
    for (let i = 0; i < this.data.length; i++) {
      const groupValue = String(groupCol.values[i]);
      const depValue = Number(depCol.values[i]);
      if (!isNaN(depValue) && groupValue) {
        if (!groups[groupValue]) groups[groupValue] = [];
        groups[groupValue].push(depValue);
      }
    }

    const groupNames = Object.keys(groups);
    if (groupNames.length !== 2) {
      throw new Error('Mann-Whitney requires exactly 2 groups');
    }

    const g1 = groups[groupNames[0]];
    const g2 = groups[groupNames[1]];
    const n1 = g1.length;
    const n2 = g2.length;

    // حساب الرتب
    const combined = [
      ...g1.map(v => ({ v, g: 1 })),
      ...g2.map(v => ({ v, g: 2 }))
    ].sort((a, b) => a.v - b.v);

    const ranks: number[] = [];
    let i = 0;
    while (i < combined.length) {
      let j = i;
      while (j < combined.length && combined[j].v === combined[i].v) j++;
      const avgRank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) ranks.push(avgRank);
      i = j;
    }

    // حساب U
    let r1 = 0;
    for (let k = 0; k < combined.length; k++) {
      if (combined[k].g === 1) r1 += ranks[k];
    }
    const u1 = r1 - (n1 * (n1 + 1)) / 2;
    const u2 = n1 * n2 - u1;
    const u = Math.min(u1, u2);

    // تقريب طبيعي
    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = (u - meanU) / stdU;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));

    // حجم الأثر r
    const r = Math.abs(z) / Math.sqrt(n1 + n2);
    let effectInterpretation = 'ضعيف';
    let effectInterpretationEn = 'Small';
    if (r >= 0.5) {
      effectInterpretation = 'كبير';
      effectInterpretationEn = 'Large';
    } else if (r >= 0.3) {
      effectInterpretation = 'متوسط';
      effectInterpretationEn = 'Medium';
    }

    const isSignificant = pValue < 0.05;

    return {
      testName: 'اختبار مان-ويتني',
      testNameEn: 'Mann-Whitney U Test',
      statistic: u,
      pValue,
      effectSize: {
        name: 'r',
        value: r,
        interpretation: effectInterpretation,
        interpretationEn: effectInterpretationEn
      },
      conclusion: isSignificant
        ? `يوجد فرق دال إحصائياً بين المجموعتين (U = ${u.toFixed(0)}, p = ${pValue.toFixed(4)})`
        : `لا يوجد فرق دال إحصائياً بين المجموعتين (U = ${u.toFixed(0)}, p = ${pValue.toFixed(4)})`,
      conclusionEn: isSignificant
        ? `There is a statistically significant difference between groups (U = ${u.toFixed(0)}, p = ${pValue.toFixed(4)})`
        : `There is no statistically significant difference between groups (U = ${u.toFixed(0)}, p = ${pValue.toFixed(4)})`,
      interpretation: isSignificant
        ? `التوزيعان مختلفان بشكل دال إحصائياً. حجم الأثر ${effectInterpretation} (r = ${r.toFixed(3)}).`
        : `لا يوجد دليل كافٍ على اختلاف التوزيعين.`,
      interpretationEn: isSignificant
        ? `The distributions differ significantly. Effect size is ${effectInterpretationEn.toLowerCase()} (r = ${r.toFixed(3)}).`
        : `Insufficient evidence that distributions differ.`,
      recommendations: ['تذكر أن هذا الاختبار يقارن التوزيعات وليس المتوسطات فقط'],
      recommendationsEn: ['Remember this test compares distributions, not just means'],
      additionalStats: {
        U1: u1,
        U2: u2,
        Z: z,
        [`n ${groupNames[0]}`]: n1,
        [`n ${groupNames[1]}`]: n2
      }
    };
  }

  private runOneWayAnova(dependent: string, grouping: string): AnalysisResult {
    const depCol = this.columns.find(c => c.name === dependent);
    const groupCol = this.columns.find(c => c.name === grouping);
    
    if (!depCol || !groupCol) {
      throw new Error('Invalid columns');
    }

    const groups: Record<string, number[]> = {};
    for (let i = 0; i < this.data.length; i++) {
      const groupValue = String(groupCol.values[i]);
      const depValue = Number(depCol.values[i]);
      if (!isNaN(depValue) && groupValue) {
        if (!groups[groupValue]) groups[groupValue] = [];
        groups[groupValue].push(depValue);
      }
    }

    const groupNames = Object.keys(groups);
    const k = groupNames.length;
    const allValues: number[] = [];
    for (const g of Object.values(groups)) allValues.push(...g);
    const grandMean = this.mean(allValues);
    const N = allValues.length;

    // SSB (Between groups)
    let ssb = 0;
    for (const name of groupNames) {
      const g = groups[name];
      ssb += g.length * Math.pow(this.mean(g) - grandMean, 2);
    }

    // SSW (Within groups)
    let ssw = 0;
    for (const name of groupNames) {
      const g = groups[name];
      const gMean = this.mean(g);
      for (const v of g) {
        ssw += Math.pow(v - gMean, 2);
      }
    }

    const dfB = k - 1;
    const dfW = N - k;
    const msb = ssb / dfB;
    const msw = ssw / dfW;
    const f = msb / msw;
    const pValue = this.fPValue(f, dfB, dfW);

    // Eta squared
    const etaSquared = ssb / (ssb + ssw);
    let effectInterpretation = 'ضعيف';
    let effectInterpretationEn = 'Small';
    if (etaSquared >= 0.14) {
      effectInterpretation = 'كبير';
      effectInterpretationEn = 'Large';
    } else if (etaSquared >= 0.06) {
      effectInterpretation = 'متوسط';
      effectInterpretationEn = 'Medium';
    }

    const isSignificant = pValue < 0.05;

    return {
      testName: 'تحليل التباين الأحادي',
      testNameEn: 'One-Way ANOVA',
      statistic: f,
      pValue,
      degreesOfFreedom: dfB,
      effectSize: {
        name: 'η²',
        value: etaSquared,
        interpretation: effectInterpretation,
        interpretationEn: effectInterpretationEn
      },
      conclusion: isSignificant
        ? `يوجد فرق دال إحصائياً بين المجموعات (F(${dfB},${dfW}) = ${f.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `لا يوجد فرق دال إحصائياً بين المجموعات (F(${dfB},${dfW}) = ${f.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      conclusionEn: isSignificant
        ? `Significant difference exists between groups (F(${dfB},${dfW}) = ${f.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `No significant difference between groups (F(${dfB},${dfW}) = ${f.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      interpretation: isSignificant
        ? `على الأقل متوسط إحدى المجموعات يختلف عن الأخريات. حجم الأثر ${effectInterpretation} (η² = ${etaSquared.toFixed(3)}). يُنصح بإجراء اختبارات بعدية لتحديد أي المجموعات تختلف.`
        : `لا يوجد دليل كافٍ على اختلاف المتوسطات بين المجموعات.`,
      interpretationEn: isSignificant
        ? `At least one group mean differs from others. Effect size is ${effectInterpretationEn.toLowerCase()} (η² = ${etaSquared.toFixed(3)}). Post-hoc tests recommended.`
        : `Insufficient evidence of mean differences between groups.`,
      recommendations: isSignificant
        ? ['أجرِ اختبارات بعدية (مثل Tukey HSD)', 'تحقق من تجانس التباينات', 'ضع في اعتبارك حجم الأثر']
        : ['قد تحتاج لزيادة حجم العينة', 'تحقق من افتراضات الاختبار'],
      recommendationsEn: isSignificant
        ? ['Run post-hoc tests (e.g., Tukey HSD)', 'Verify homogeneity of variances', 'Consider effect size']
        : ['May need larger sample', 'Verify test assumptions'],
      additionalStats: {
        'SSB': ssb,
        'SSW': ssw,
        'MSB': msb,
        'MSW': msw,
        'df بين المجموعات': dfB,
        'df داخل المجموعات': dfW,
        'عدد المجموعات': k
      }
    };
  }

  private runKruskalWallisTest(dependent: string, grouping: string): AnalysisResult {
    const depCol = this.columns.find(c => c.name === dependent);
    const groupCol = this.columns.find(c => c.name === grouping);
    
    if (!depCol || !groupCol) {
      throw new Error('Invalid columns');
    }

    const groups: Record<string, number[]> = {};
    for (let i = 0; i < this.data.length; i++) {
      const groupValue = String(groupCol.values[i]);
      const depValue = Number(depCol.values[i]);
      if (!isNaN(depValue) && groupValue) {
        if (!groups[groupValue]) groups[groupValue] = [];
        groups[groupValue].push(depValue);
      }
    }

    const groupNames = Object.keys(groups);
    const k = groupNames.length;

    // ترتيب جميع القيم
    const combined: { value: number; group: string }[] = [];
    for (const name of groupNames) {
      for (const v of groups[name]) {
        combined.push({ value: v, group: name });
      }
    }
    combined.sort((a, b) => a.value - b.value);

    const N = combined.length;
    const ranks: number[] = [];
    let i = 0;
    while (i < combined.length) {
      let j = i;
      while (j < combined.length && combined[j].value === combined[i].value) j++;
      const avgRank = (i + j + 1) / 2;
      for (let m = i; m < j; m++) ranks.push(avgRank);
      i = j;
    }

    // حساب مجموع الرتب لكل مجموعة
    const rankSums: Record<string, number> = {};
    for (const name of groupNames) rankSums[name] = 0;
    for (let m = 0; m < combined.length; m++) {
      rankSums[combined[m].group] += ranks[m];
    }

    // حساب H
    let h = 0;
    for (const name of groupNames) {
      const n = groups[name].length;
      const r = rankSums[name];
      h += (r * r) / n;
    }
    h = (12 / (N * (N + 1))) * h - 3 * (N + 1);

    const df = k - 1;
    const pValue = this.chiSquarePValue(h, df);

    // Epsilon squared effect size
    const epsilonSquared = h / ((N * N - 1) / (N + 1));
    let effectInterpretation = 'ضعيف';
    let effectInterpretationEn = 'Small';
    if (epsilonSquared >= 0.14) {
      effectInterpretation = 'كبير';
      effectInterpretationEn = 'Large';
    } else if (epsilonSquared >= 0.06) {
      effectInterpretation = 'متوسط';
      effectInterpretationEn = 'Medium';
    }

    const isSignificant = pValue < 0.05;

    return {
      testName: 'اختبار كروسكال-واليس',
      testNameEn: 'Kruskal-Wallis H Test',
      statistic: h,
      pValue,
      degreesOfFreedom: df,
      effectSize: {
        name: 'ε²',
        value: epsilonSquared,
        interpretation: effectInterpretation,
        interpretationEn: effectInterpretationEn
      },
      conclusion: isSignificant
        ? `يوجد فرق دال إحصائياً بين المجموعات (H(${df}) = ${h.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `لا يوجد فرق دال إحصائياً بين المجموعات (H(${df}) = ${h.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      conclusionEn: isSignificant
        ? `Significant difference exists between groups (H(${df}) = ${h.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `No significant difference between groups (H(${df}) = ${h.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      interpretation: isSignificant
        ? `توزيعات المجموعات تختلف بشكل دال إحصائياً. حجم الأثر ${effectInterpretation}.`
        : `لا يوجد دليل كافٍ على اختلاف توزيعات المجموعات.`,
      interpretationEn: isSignificant
        ? `Group distributions differ significantly. Effect size is ${effectInterpretationEn.toLowerCase()}.`
        : `Insufficient evidence that group distributions differ.`,
      recommendations: isSignificant
        ? ['أجرِ اختبارات بعدية (مثل Dunn)', 'قارن بين أزواج المجموعات']
        : ['قد تحتاج لزيادة حجم العينة'],
      recommendationsEn: isSignificant
        ? ['Run post-hoc tests (e.g., Dunn)', 'Compare group pairs']
        : ['May need larger sample'],
      additionalStats: {
        'عدد المجموعات': k,
        'N الإجمالي': N,
        'درجات الحرية': df
      }
    };
  }

  private runPearsonCorrelation(var1: string, var2: string): AnalysisResult {
    const col1 = this.columns.find(c => c.name === var1);
    const col2 = this.columns.find(c => c.name === var2);
    
    if (!col1 || !col2) {
      throw new Error('Invalid columns');
    }

    const values1: number[] = [];
    const values2: number[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      const v1 = Number(col1.values[i]);
      const v2 = Number(col2.values[i]);
      if (!isNaN(v1) && !isNaN(v2)) {
        values1.push(v1);
        values2.push(v2);
      }
    }

    const n = values1.length;
    const r = this.pearsonCorrelation(values1, values2);
    
    // اختبار الدلالة
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    const df = n - 2;
    const pValue = this.tPValue(t, df);

    // فترة الثقة باستخدام Fisher's z
    const zr = 0.5 * Math.log((1 + r) / (1 - r));
    const seZ = 1 / Math.sqrt(n - 3);
    const zLower = zr - 1.96 * seZ;
    const zUpper = zr + 1.96 * seZ;
    const ciLower = (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1);
    const ciUpper = (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1);

    let effectInterpretation = 'ضعيف';
    let effectInterpretationEn = 'Weak';
    if (Math.abs(r) >= 0.7) {
      effectInterpretation = 'قوي';
      effectInterpretationEn = 'Strong';
    } else if (Math.abs(r) >= 0.4) {
      effectInterpretation = 'متوسط';
      effectInterpretationEn = 'Moderate';
    }

    const direction = r > 0 ? 'طردي' : 'عكسي';
    const directionEn = r > 0 ? 'positive' : 'negative';
    const isSignificant = pValue < 0.05;

    return {
      testName: 'ارتباط بيرسون',
      testNameEn: 'Pearson Correlation',
      statistic: r,
      pValue,
      degreesOfFreedom: df,
      effectSize: {
        name: 'r',
        value: r,
        interpretation: `${effectInterpretation} ${direction}`,
        interpretationEn: `${effectInterpretationEn} ${directionEn}`
      },
      confidenceInterval: {
        lower: ciLower,
        upper: ciUpper,
        level: 95
      },
      conclusion: isSignificant
        ? `يوجد ارتباط ${effectInterpretation} ${direction} دال إحصائياً (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `لا يوجد ارتباط دال إحصائياً (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      conclusionEn: isSignificant
        ? `Statistically significant ${effectInterpretationEn.toLowerCase()} ${directionEn} correlation (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `No statistically significant correlation (r = ${r.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      interpretation: isSignificant
        ? `هناك علاقة خطية ${effectInterpretation} بين المتغيرين. معامل التحديد R² = ${(r*r).toFixed(3)} أي أن ${(r*r*100).toFixed(1)}% من التباين في أحد المتغيرين يُفسره الآخر.`
        : `لا يوجد دليل كافٍ على وجود علاقة خطية بين المتغيرين.`,
      interpretationEn: isSignificant
        ? `There is a ${effectInterpretationEn.toLowerCase()} linear relationship. R² = ${(r*r).toFixed(3)}, meaning ${(r*r*100).toFixed(1)}% of variance is explained.`
        : `Insufficient evidence of a linear relationship between variables.`,
      recommendations: [
        'تحقق من الرسم التشتتي للعلاقة غير الخطية',
        'تذكر أن الارتباط لا يعني السببية'
      ],
      recommendationsEn: [
        'Check scatter plot for non-linear relationships',
        'Remember correlation does not imply causation'
      ],
      additionalStats: {
        'R²': r * r,
        't': t,
        'n': n
      }
    };
  }

  private runSpearmanCorrelation(var1: string, var2: string): AnalysisResult {
    const col1 = this.columns.find(c => c.name === var1);
    const col2 = this.columns.find(c => c.name === var2);
    
    if (!col1 || !col2) {
      throw new Error('Invalid columns');
    }

    const values1: number[] = [];
    const values2: number[] = [];
    
    for (let i = 0; i < this.data.length; i++) {
      const v1 = Number(col1.values[i]);
      const v2 = Number(col2.values[i]);
      if (!isNaN(v1) && !isNaN(v2)) {
        values1.push(v1);
        values2.push(v2);
      }
    }

    const n = values1.length;
    const rho = this.spearmanCorrelation(values1, values2);
    
    // اختبار الدلالة
    const t = rho * Math.sqrt((n - 2) / (1 - rho * rho));
    const df = n - 2;
    const pValue = this.tPValue(t, df);

    let effectInterpretation = 'ضعيف';
    let effectInterpretationEn = 'Weak';
    if (Math.abs(rho) >= 0.7) {
      effectInterpretation = 'قوي';
      effectInterpretationEn = 'Strong';
    } else if (Math.abs(rho) >= 0.4) {
      effectInterpretation = 'متوسط';
      effectInterpretationEn = 'Moderate';
    }

    const direction = rho > 0 ? 'طردي' : 'عكسي';
    const directionEn = rho > 0 ? 'positive' : 'negative';
    const isSignificant = pValue < 0.05;

    return {
      testName: 'ارتباط سبيرمان',
      testNameEn: 'Spearman Correlation',
      statistic: rho,
      pValue,
      degreesOfFreedom: df,
      effectSize: {
        name: 'ρ',
        value: rho,
        interpretation: `${effectInterpretation} ${direction}`,
        interpretationEn: `${effectInterpretationEn} ${directionEn}`
      },
      conclusion: isSignificant
        ? `يوجد ارتباط رتبي ${effectInterpretation} ${direction} دال إحصائياً (ρ = ${rho.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `لا يوجد ارتباط رتبي دال إحصائياً (ρ = ${rho.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      conclusionEn: isSignificant
        ? `Statistically significant ${effectInterpretationEn.toLowerCase()} ${directionEn} rank correlation (ρ = ${rho.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `No statistically significant rank correlation (ρ = ${rho.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      interpretation: isSignificant
        ? `هناك علاقة رتبية ${effectInterpretation} بين المتغيرين. كلما زادت رتبة أحد المتغيرين ${rho > 0 ? 'زادت' : 'قلت'} رتبة الآخر.`
        : `لا يوجد دليل كافٍ على وجود علاقة رتبية بين المتغيرين.`,
      interpretationEn: isSignificant
        ? `There is a ${effectInterpretationEn.toLowerCase()} monotonic relationship. As one variable's rank increases, the other ${rho > 0 ? 'increases' : 'decreases'}.`
        : `Insufficient evidence of a monotonic relationship.`,
      recommendations: [
        'سبيرمان أكثر مقاومة للقيم الشاذة من بيرسون',
        'يكشف العلاقات غير الخطية'
      ],
      recommendationsEn: [
        'Spearman is more robust to outliers than Pearson',
        'Detects non-linear monotonic relationships'
      ],
      additionalStats: {
        't': t,
        'n': n
      }
    };
  }

  private runChiSquareTest(var1: string, var2: string): AnalysisResult {
    const col1 = this.columns.find(c => c.name === var1);
    const col2 = this.columns.find(c => c.name === var2);
    
    if (!col1 || !col2) {
      throw new Error('Invalid columns');
    }

    // بناء جدول التوافق
    const contingency: Record<string, Record<string, number>> = {};
    const rowTotals: Record<string, number> = {};
    const colTotals: Record<string, number> = {};
    let grandTotal = 0;

    for (let i = 0; i < this.data.length; i++) {
      const v1 = String(col1.values[i]);
      const v2 = String(col2.values[i]);
      if (v1 && v2) {
        if (!contingency[v1]) contingency[v1] = {};
        contingency[v1][v2] = (contingency[v1][v2] || 0) + 1;
        rowTotals[v1] = (rowTotals[v1] || 0) + 1;
        colTotals[v2] = (colTotals[v2] || 0) + 1;
        grandTotal++;
      }
    }

    const rows = Object.keys(contingency);
    const cols = Object.keys(colTotals);

    // حساب كاي تربيع
    let chiSquare = 0;
    for (const r of rows) {
      for (const c of cols) {
        const observed = contingency[r][c] || 0;
        const expected = (rowTotals[r] * colTotals[c]) / grandTotal;
        if (expected > 0) {
          chiSquare += Math.pow(observed - expected, 2) / expected;
        }
      }
    }

    const df = (rows.length - 1) * (cols.length - 1);
    const pValue = this.chiSquarePValue(chiSquare, df);

    // Cramér's V
    const minDim = Math.min(rows.length - 1, cols.length - 1);
    const cramersV = Math.sqrt(chiSquare / (grandTotal * minDim));

    let effectInterpretation = 'ضعيف';
    let effectInterpretationEn = 'Small';
    if (cramersV >= 0.5) {
      effectInterpretation = 'كبير';
      effectInterpretationEn = 'Large';
    } else if (cramersV >= 0.3) {
      effectInterpretation = 'متوسط';
      effectInterpretationEn = 'Medium';
    }

    const isSignificant = pValue < 0.05;

    return {
      testName: 'اختبار كاي تربيع للاستقلالية',
      testNameEn: 'Chi-Square Test of Independence',
      statistic: chiSquare,
      pValue,
      degreesOfFreedom: df,
      effectSize: {
        name: "Cramér's V",
        value: cramersV,
        interpretation: effectInterpretation,
        interpretationEn: effectInterpretationEn
      },
      conclusion: isSignificant
        ? `يوجد ارتباط دال إحصائياً بين المتغيرين (χ²(${df}) = ${chiSquare.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `لا يوجد ارتباط دال إحصائياً بين المتغيرين (χ²(${df}) = ${chiSquare.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      conclusionEn: isSignificant
        ? `Statistically significant association between variables (χ²(${df}) = ${chiSquare.toFixed(3)}, p = ${pValue.toFixed(4)})`
        : `No statistically significant association (χ²(${df}) = ${chiSquare.toFixed(3)}, p = ${pValue.toFixed(4)})`,
      interpretation: isSignificant
        ? `المتغيران غير مستقلين عن بعضهما. قوة العلاقة ${effectInterpretation} (V = ${cramersV.toFixed(3)}).`
        : `لا يوجد دليل كافٍ على وجود علاقة بين المتغيرين.`,
      interpretationEn: isSignificant
        ? `Variables are not independent. Association strength is ${effectInterpretationEn.toLowerCase()} (V = ${cramersV.toFixed(3)}).`
        : `Insufficient evidence of association between variables.`,
      recommendations: [
        'تحقق من القيم المتوقعة (يجب أن تكون ≥ 5)',
        'للجداول 2×2 استخدم تصحيح ييتس أو اختبار فيشر'
      ],
      recommendationsEn: [
        'Check expected values (should be ≥ 5)',
        'For 2×2 tables use Yates correction or Fisher test'
      ],
      additionalStats: {
        'عدد الصفوف': rows.length,
        'عدد الأعمدة': cols.length,
        'N': grandTotal
      }
    };
  }

  // ========== المحادثة الذكية ==========

  public chat(message: string): ChatMessage {
    const userMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      role: 'user',
      content: message,
      timestamp: new Date()
    };
    this.chatHistory.push(userMessage);

    const response = this.generateResponse(message);
    this.chatHistory.push(response);
    
    return response;
  }

  private generateResponse(message: string): ChatMessage {
    const lowerMessage = message.toLowerCase();
    const isArabic = /[\u0600-\u06FF]/.test(message);

    let content = '';
    let suggestions: string[] = [];

    // تحليل الرسالة وتوليد الرد
    if (lowerMessage.includes('مقارنة') || lowerMessage.includes('compare') || lowerMessage.includes('فرق') || lowerMessage.includes('difference')) {
      if (isArabic) {
        content = `🔍 **لمقارنة المجموعات، أنصحك بما يلي:**

1. **إذا كان لديك مجموعتين:**
   - إذا كانت البيانات طبيعية التوزيع: استخدم **اختبار t للعينات المستقلة**
   - إذا لم تكن طبيعية: استخدم **اختبار مان-ويتني**

2. **إذا كان لديك أكثر من مجموعتين:**
   - بيانات طبيعية: **تحليل التباين ANOVA**
   - بيانات غير طبيعية: **اختبار كروسكال-واليس**

📊 لقد حللت بياناتك ووجدت:
- ${this.columns.filter(c => c.type === 'numeric').length} متغيرات رقمية
- ${this.columns.filter(c => c.type === 'categorical').length} متغيرات فئوية

💡 اختر المتغير التابع ومتغير التجميع من قسم "الاختبارات الموصى بها" للحصول على توصيات مخصصة.`;
        suggestions = ['ما هو اختبار t؟', 'كيف أعرف إذا كانت بياناتي طبيعية؟', 'ما الفرق بين ANOVA وكروسكال-واليس؟'];
      } else {
        content = `🔍 **For comparing groups, I recommend:**

1. **For two groups:**
   - Normal data: **Independent Samples T-Test**
   - Non-normal data: **Mann-Whitney U Test**

2. **For more than two groups:**
   - Normal data: **One-Way ANOVA**
   - Non-normal data: **Kruskal-Wallis Test**

📊 Your data analysis shows:
- ${this.columns.filter(c => c.type === 'numeric').length} numeric variables
- ${this.columns.filter(c => c.type === 'categorical').length} categorical variables

💡 Select dependent and grouping variables in "Recommended Tests" for personalized recommendations.`;
        suggestions = ['What is a t-test?', 'How do I check normality?', 'What is the difference between ANOVA and Kruskal-Wallis?'];
      }
    } else if (lowerMessage.includes('ارتباط') || lowerMessage.includes('correlation') || lowerMessage.includes('علاقة') || lowerMessage.includes('relationship')) {
      if (isArabic) {
        content = `📈 **لتحليل العلاقة بين متغيرين:**

1. **ارتباط بيرسون (Pearson):**
   - للعلاقات الخطية
   - يتطلب بيانات طبيعية التوزيع
   - حساس للقيم الشاذة

2. **ارتباط سبيرمان (Spearman):**
   - للعلاقات الرتبية
   - لا يتطلب توزيع طبيعي
   - أكثر مقاومة للقيم الشاذة

📊 **تفسير معامل الارتباط:**
- |r| < 0.3: علاقة ضعيفة
- 0.3 ≤ |r| < 0.7: علاقة متوسطة
- |r| ≥ 0.7: علاقة قوية

⚠️ **تذكر:** الارتباط لا يعني السببية!`;
        suggestions = ['ما الفرق بين بيرسون وسبيرمان؟', 'كيف أفسر معامل الارتباط؟', 'ما هو R²؟'];
      } else {
        content = `📈 **For analyzing relationships between variables:**

1. **Pearson Correlation:**
   - For linear relationships
   - Requires normal distribution
   - Sensitive to outliers

2. **Spearman Correlation:**
   - For monotonic relationships
   - No normality requirement
   - More robust to outliers

📊 **Interpreting correlation:**
- |r| < 0.3: Weak
- 0.3 ≤ |r| < 0.7: Moderate
- |r| ≥ 0.7: Strong

⚠️ **Remember:** Correlation ≠ Causation!`;
        suggestions = ['Difference between Pearson and Spearman?', 'How to interpret correlation?', 'What is R²?'];
      }
    } else if (lowerMessage.includes('طبيعي') || lowerMessage.includes('normal') || lowerMessage.includes('توزيع') || lowerMessage.includes('distribution')) {
      const normalVars = this.columns.filter(c => c.type === 'numeric').map(c => {
        const stats = this.statistics.get(c.name);
        return { name: c.name, isNormal: stats?.isNormal, pValue: stats?.normalityPValue };
      });

      if (isArabic) {
        content = `📊 **اختبار التوزيع الطبيعي:**

**اختبار Shapiro-Wilk** هو الأكثر استخداماً لاختبار التوزيع الطبيعي.

🔍 **نتائج تحليل بياناتك:**
${normalVars.map(v => `- **${v.name}**: ${v.isNormal ? '✅ طبيعي' : '❌ غير طبيعي'} (p = ${v.pValue?.toFixed(4) || 'N/A'})`).join('\n')}

📌 **القاعدة:**
- إذا p > 0.05: التوزيع طبيعي
- إذا p ≤ 0.05: التوزيع غير طبيعي

💡 **إذا كان التوزيع غير طبيعي:**
- استخدم الاختبارات اللامعلمية
- أو جرب تحويل البيانات (مثل Log)`;
        suggestions = ['ماذا أفعل إذا كانت بياناتي غير طبيعية؟', 'ما هي الاختبارات اللامعلمية؟', 'كيف أحول البيانات؟'];
      } else {
        content = `📊 **Normality Testing:**

**Shapiro-Wilk Test** is the most commonly used test for normality.

🔍 **Your data analysis:**
${normalVars.map(v => `- **${v.name}**: ${v.isNormal ? '✅ Normal' : '❌ Not Normal'} (p = ${v.pValue?.toFixed(4) || 'N/A'})`).join('\n')}

📌 **Rule:**
- If p > 0.05: Normal distribution
- If p ≤ 0.05: Non-normal distribution

💡 **If data is not normal:**
- Use non-parametric tests
- Or try data transformation (e.g., Log)`;
        suggestions = ['What if my data is not normal?', 'What are non-parametric tests?', 'How to transform data?'];
      }
    } else if (lowerMessage.includes('حجم الأثر') || lowerMessage.includes('effect size') || lowerMessage.includes('أثر') || lowerMessage.includes('effect')) {
      if (isArabic) {
        content = `📏 **حجم الأثر (Effect Size):**

حجم الأثر يقيس **الأهمية العملية** للنتائج، وليس فقط الدلالة الإحصائية.

**أنواع حجم الأثر:**

1. **Cohen's d** (للمقارنة بين مجموعتين):
   - d < 0.2: ضعيف
   - 0.2 ≤ d < 0.5: صغير
   - 0.5 ≤ d < 0.8: متوسط
   - d ≥ 0.8: كبير

2. **η² (Eta Squared)** (لـ ANOVA):
   - η² < 0.01: ضعيف
   - 0.01 ≤ η² < 0.06: صغير
   - 0.06 ≤ η² < 0.14: متوسط
   - η² ≥ 0.14: كبير

3. **r** (للارتباط):
   - |r| < 0.1: ضعيف جداً
   - 0.1 ≤ |r| < 0.3: ضعيف
   - 0.3 ≤ |r| < 0.5: متوسط
   - |r| ≥ 0.5: قوي

⚠️ **مهم:** النتيجة الدالة إحصائياً مع حجم أثر صغير قد لا تكون ذات أهمية عملية!`;
        suggestions = ['لماذا حجم الأثر مهم؟', 'كيف أبلغ عن حجم الأثر؟', 'ما الفرق بين الدلالة الإحصائية والعملية؟'];
      } else {
        content = `📏 **Effect Size:**

Effect size measures **practical significance**, not just statistical significance.

**Types of Effect Size:**

1. **Cohen's d** (comparing two groups):
   - d < 0.2: Negligible
   - 0.2 ≤ d < 0.5: Small
   - 0.5 ≤ d < 0.8: Medium
   - d ≥ 0.8: Large

2. **η² (Eta Squared)** (for ANOVA):
   - η² < 0.01: Negligible
   - 0.01 ≤ η² < 0.06: Small
   - 0.06 ≤ η² < 0.14: Medium
   - η² ≥ 0.14: Large

3. **r** (for correlation):
   - |r| < 0.1: Negligible
   - 0.1 ≤ |r| < 0.3: Small
   - 0.3 ≤ |r| < 0.5: Medium
   - |r| ≥ 0.5: Large

⚠️ **Important:** A statistically significant result with small effect may not be practically meaningful!`;
        suggestions = ['Why is effect size important?', 'How to report effect size?', 'Statistical vs practical significance?'];
      }
    } else {
      // رد افتراضي
      if (isArabic) {
        content = `👋 **مرحباً! أنا المساعد الإحصائي الذكي.**

يمكنني مساعدتك في:
- 🔍 تحليل بياناتك وفهم خصائصها
- 📊 اختيار الاختبار الإحصائي المناسب
- 📈 تفسير نتائج التحليل
- 💡 تقديم توصيات لتحسين التحليل

📌 **البيانات المحملة حالياً:**
- ${this.data.length} صف
- ${this.columns.length} عمود
- ${this.insights.length} رؤية مكتشفة

💬 **جرب أن تسألني:**
- "كيف أقارن بين مجموعتين؟"
- "هل بياناتي طبيعية التوزيع؟"
- "ما هو الارتباط بين المتغيرات؟"
- "ما هو حجم الأثر؟"`;
        suggestions = ['كيف أبدأ التحليل؟', 'ما هي الاختبارات المناسبة لبياناتي؟', 'اشرح لي القيم المفقودة في بياناتي'];
      } else {
        content = `👋 **Hello! I'm your Smart Statistical Assistant.**

I can help you with:
- 🔍 Analyzing your data
- 📊 Choosing appropriate statistical tests
- 📈 Interpreting analysis results
- 💡 Recommendations for better analysis

📌 **Currently loaded data:**
- ${this.data.length} rows
- ${this.columns.length} columns
- ${this.insights.length} insights discovered

💬 **Try asking:**
- "How do I compare two groups?"
- "Is my data normally distributed?"
- "What's the correlation between variables?"
- "What is effect size?"`;
        suggestions = ['How do I start analysis?', 'What tests are suitable for my data?', 'Explain missing values in my data'];
      }
    }

    return {
      id: `msg-${Date.now()}`,
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions
    };
  }

  // ========== Getters ==========

  public getColumns(): DataColumn[] {
    return this.columns;
  }

  public getStatistics(): Map<string, ColumnStatistics> {
    return this.statistics;
  }

  public getColumnStatistics(columnName: string): ColumnStatistics | undefined {
    return this.statistics.get(columnName);
  }

  public getCorrelationMatrix(): Map<string, Map<string, number>> {
    return this.correlationMatrix;
  }

  public getInsights(): AIInsight[] {
    return this.insights;
  }

  public getDataQuality(): DataQuality {
    const issues: DataQuality['issues'] = [];
    let completeness = 0;
    let validity = 100;

    for (const [name, stats] of this.statistics) {
      completeness += (100 - stats.missingPercent);
      
      if (stats.missingPercent > 20) {
        issues.push({
          type: 'critical',
          message: `${name}: نسبة عالية من القيم المفقودة (${stats.missingPercent.toFixed(1)}%)`,
          column: name,
          suggestion: 'استخدم تقنيات التعويض أو احذف العمود'
        });
        validity -= 5;
      } else if (stats.missingPercent > 5) {
        issues.push({
          type: 'warning',
          message: `${name}: قيم مفقودة (${stats.missingPercent.toFixed(1)}%)`,
          column: name,
          suggestion: 'عوّض القيم المفقودة بالمتوسط أو الوسيط'
        });
      }

      if (stats.outliersCount && stats.outliersCount > stats.count * 0.05) {
        issues.push({
          type: 'warning',
          message: `${name}: ${stats.outliersCount} قيمة شاذة`,
          column: name,
          suggestion: 'راجع القيم الشاذة وقرر معالجتها'
        });
      }
    }

    completeness = completeness / this.columns.length;
    const uniqueness = 100; // يمكن حسابها بناءً على التكرارات
    const consistency = 100; // يمكن حسابها بناءً على أنواع البيانات

    const score = (completeness + validity + uniqueness + consistency) / 4;

    return {
      score,
      completeness,
      validity,
      uniqueness,
      consistency,
      issues
    };
  }

  public getAnalysisHistory(): AnalysisResult[] {
    return this.analysisHistory;
  }

  public getChatHistory(): ChatMessage[] {
    return this.chatHistory;
  }

  public clearChatHistory(): void {
    this.chatHistory = [];
  }
}

export const aiEngine = new AdvancedAIEngine();
export default AdvancedAIEngine;
