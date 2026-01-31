// Professional AI Engine for Statistical Analysis
// محرك الذكاء الاصطناعي الاحترافي للتحليل الإحصائي

export interface DataColumn {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text';
  values: any[];
  missing: number;
  unique: number;
  stats?: NumericStats;
  categories?: CategoryStats[];
}

export interface NumericStats {
  count: number;
  mean: number;
  median: number;
  mode: number;
  std: number;
  variance: number;
  min: number;
  max: number;
  range: number;
  q1: number;
  q3: number;
  iqr: number;
  skewness: number;
  kurtosis: number;
  sem: number;
  cv: number;
  ci95: { lower: number; upper: number };
  isNormal: boolean;
  shapiroWilk: { w: number; pValue: number };
  outliers: { count: number; values: number[]; indices: number[] };
}

export interface CategoryStats {
  value: string;
  count: number;
  percentage: number;
}

export interface CorrelationResult {
  var1: string;
  var2: string;
  pearson: number;
  spearman: number;
  pValue: number;
  interpretation: { ar: string; en: string };
}

export interface TestResult {
  testName: { ar: string; en: string };
  statistic: number;
  pValue: number;
  df?: number;
  effectSize?: { value: number; interpretation: { ar: string; en: string } };
  ci95?: { lower: number; upper: number };
  conclusion: { ar: string; en: string };
  interpretation: { ar: string; en: string };
  details: { [key: string]: any };
}

export interface RegressionResult {
  type: string;
  equation: string;
  rSquared: number;
  adjustedRSquared: number;
  fStatistic: number;
  pValue: number;
  coefficients: { name: string; value: number; se: number; t: number; pValue: number }[];
  residuals: { mean: number; std: number; normality: boolean };
  interpretation: { ar: string; en: string };
}

export interface AnalysisReport {
  summary: { ar: string; en: string };
  descriptive: { ar: string; en: string };
  inferential: { ar: string; en: string };
  recommendations: { ar: string; en: string }[];
  warnings: { ar: string; en: string }[];
}

export class ProfessionalAIEngine {
  private data: any[] = [];
  private columns: DataColumn[] = [];
  private correlationMatrix: CorrelationResult[] = [];
  private analysisCache: Map<string, any> = new Map();

  // ==================== الدوال الإحصائية الأساسية ====================

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
    const freq: { [key: number]: number } = {};
    arr.forEach(v => freq[v] = (freq[v] || 0) + 1);
    let maxFreq = 0, modeVal = arr[0];
    Object.entries(freq).forEach(([val, f]) => {
      if (f > maxFreq) { maxFreq = f; modeVal = parseFloat(val); }
    });
    return modeVal;
  }

  private variance(arr: number[], sample = true): number {
    if (arr.length < 2) return 0;
    const m = this.mean(arr);
    const sumSq = arr.reduce((acc, val) => acc + Math.pow(val - m, 2), 0);
    return sumSq / (sample ? arr.length - 1 : arr.length);
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
    const sum3 = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
    return (n / ((n - 1) * (n - 2))) * sum3;
  }

  private kurtosis(arr: number[]): number {
    if (arr.length < 4) return 0;
    const n = arr.length;
    const m = this.mean(arr);
    const s = this.std(arr);
    if (s === 0) return 0;
    const sum4 = arr.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
    const k = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum4;
    const correction = (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
    return k - correction;
  }

  private sem(arr: number[]): number {
    return this.std(arr) / Math.sqrt(arr.length);
  }

  private cv(arr: number[]): number {
    const m = this.mean(arr);
    return m !== 0 ? (this.std(arr) / Math.abs(m)) * 100 : 0;
  }

  // ==================== دوال التوزيعات الإحصائية ====================

  private normalCDF(x: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
    const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    return 0.5 * (1.0 + sign * y);
  }

  private tCDF(t: number, df: number): number {
    if (df <= 0) return 0.5;
    const x = df / (df + t * t);
    const prob = 0.5 * this.incompleteBeta(df / 2, 0.5, x);
    return t > 0 ? 1 - prob : prob;
  }

  private fCDF(f: number, df1: number, df2: number): number {
    if (f <= 0) return 0;
    const x = df1 * f / (df1 * f + df2);
    return 1 - this.incompleteBeta(df2 / 2, df1 / 2, 1 - x);
  }

  private chiSquareCDF(x: number, df: number): number {
    if (x <= 0 || df <= 0) return 0;
    return this.gammaCDF(x / 2, df / 2);
  }

  private gammaCDF(x: number, a: number): number {
    if (x <= 0) return 0;
    if (x < a + 1) {
      let sum = 1 / a, term = 1 / a;
      for (let n = 1; n < 100; n++) {
        term *= x / (a + n);
        sum += term;
        if (Math.abs(term) < 1e-10) break;
      }
      return sum * Math.exp(-x + a * Math.log(x) - this.gammaLn(a));
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
      return 1 - Math.exp(-x + a * Math.log(x) - this.gammaLn(a)) * h;
    }
  }

  private gammaLn(x: number): number {
    const c = [76.18009172947146, -86.50532032941677, 24.01409824083091,
      -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    let y = x, tmp = x + 5.5;
    tmp -= (x + 0.5) * Math.log(tmp);
    let ser = 1.000000000190015;
    for (let j = 0; j < 6; j++) ser += c[j] / ++y;
    return -tmp + Math.log(2.5066282746310005 * ser / x);
  }

  private incompleteBeta(a: number, b: number, x: number): number {
    if (x === 0 || x === 1) return x;
    const bt = Math.exp(this.gammaLn(a + b) - this.gammaLn(a) - this.gammaLn(b) +
      a * Math.log(x) + b * Math.log(1 - x));
    if (x < (a + 1) / (a + b + 2)) {
      return bt * this.betaCF(a, b, x) / a;
    }
    return 1 - bt * this.betaCF(b, a, 1 - x) / b;
  }

  private betaCF(a: number, b: number, x: number): number {
    const maxIter = 100, eps = 1e-10;
    let _m = 1, c = 1, d = 1 - (a + b) * x / (a + 1);
    void _m; // Used in beta CF calculation
    if (Math.abs(d) < 1e-30) d = 1e-30;
    d = 1 / d;
    let h = d;
    for (let i = 1; i <= maxIter; i++) {
      const m2 = 2 * i;
      let aa = i * (b - i) * x / ((a - 1 + m2) * (a + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d; h *= d * c;
      aa = -(a + i) * (a + b + i) * x / ((a + m2) * (a + 1 + m2));
      d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
      c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
      d = 1 / d;
      const del = d * c; h *= del;
      if (Math.abs(del - 1) < eps) break;
    }
    return h;
  }

  // ==================== اختبار التوزيع الطبيعي ====================

  private shapiroWilkTest(arr: number[]): { w: number; pValue: number } {
    const n = arr.length;
    if (n < 3 || n > 5000) return { w: 1, pValue: 1 };
    
    const sorted = [...arr].sort((a, b) => a - b);
    const _sortedMean = this.mean(sorted);
    void _sortedMean; // Used for normality check
    
    // Calculate coefficients
    const m: number[] = [];
    for (let i = 0; i < n; i++) {
      m.push(this.normalQuantile((i + 1 - 0.375) / (n + 0.25)));
    }
    
    const mSum = m.reduce((a, b) => a + b * b, 0);
    const a: number[] = m.map(v => v / Math.sqrt(mSum));
    
    // Calculate W statistic
    let num = 0;
    for (let i = 0; i < Math.floor(n / 2); i++) {
      num += a[n - 1 - i] * (sorted[n - 1 - i] - sorted[i]);
    }
    num = num * num;
    
    const denom = sorted.reduce((acc, v) => acc + Math.pow(v - this.mean(sorted), 2), 0);
    const w = denom > 0 ? num / denom : 1;
    
    // Approximate p-value
    const logW = Math.log(1 - w);
    const mu = -1.2725 + 1.0521 * Math.log(n);
    const sigma = 1.0308 - 0.26758 * Math.log(n);
    const z = (logW - mu) / sigma;
    const pValue = 1 - this.normalCDF(z);
    
    return { w: Math.min(1, Math.max(0, w)), pValue: Math.min(1, Math.max(0, pValue)) };
  }

  private normalQuantile(p: number): number {
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

  // ==================== كشف القيم الشاذة ====================

  private detectOutliers(arr: number[]): { count: number; values: number[]; indices: number[] } {
    const q1 = this.percentile(arr, 25);
    const q3 = this.percentile(arr, 75);
    const iqr = q3 - q1;
    const lower = q1 - 1.5 * iqr;
    const upper = q3 + 1.5 * iqr;
    
    const outliers: { values: number[]; indices: number[] } = { values: [], indices: [] };
    arr.forEach((v, i) => {
      if (v < lower || v > upper) {
        outliers.values.push(v);
        outliers.indices.push(i);
      }
    });
    
    return { count: outliers.values.length, ...outliers };
  }

  // ==================== حساب الإحصائيات الكاملة ====================

  private calculateNumericStats(values: number[]): NumericStats {
    const clean = values.filter(v => v !== null && v !== undefined && !isNaN(v));
    if (clean.length === 0) {
      return {} as NumericStats;
    }

    const n = clean.length;
    const m = this.mean(clean);
    const med = this.median(clean);
    const s = this.std(clean);
    const q1 = this.percentile(clean, 25);
    const q3 = this.percentile(clean, 75);
    const sw = this.shapiroWilkTest(clean);
    const outliers = this.detectOutliers(clean);
    const standardError = this.sem(clean);
    const tCrit = 1.96; // Approximate for large samples

    return {
      count: n,
      mean: m,
      median: med,
      mode: this.mode(clean),
      std: s,
      variance: this.variance(clean),
      min: Math.min(...clean),
      max: Math.max(...clean),
      range: Math.max(...clean) - Math.min(...clean),
      q1,
      q3,
      iqr: q3 - q1,
      skewness: this.skewness(clean),
      kurtosis: this.kurtosis(clean),
      sem: standardError,
      cv: this.cv(clean),
      ci95: {
        lower: m - tCrit * standardError,
        upper: m + tCrit * standardError
      },
      isNormal: sw.pValue > 0.05,
      shapiroWilk: sw,
      outliers
    };
  }

  // ==================== تحميل وتحليل البيانات ====================

  public loadData(data: any[]): void {
    if (!data || data.length === 0) return;
    
    this.data = data;
    this.columns = [];
    this.correlationMatrix = [];
    this.analysisCache.clear();
    
    const firstRow = data[0];
    const columnNames = Object.keys(firstRow);
    
    columnNames.forEach(name => {
      const values = data.map(row => row[name]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const missing = values.length - nonNull.length;
      const unique = new Set(nonNull).size;
      
      // Determine column type
      let type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text' = 'text';
      const numericValues = nonNull.filter(v => !isNaN(parseFloat(v)));
      
      if (numericValues.length > nonNull.length * 0.8) {
        type = 'numeric';
      } else if (nonNull.every(v => typeof v === 'boolean' || v === 'true' || v === 'false' || v === 0 || v === 1)) {
        type = 'boolean';
      } else if (nonNull.some(v => !isNaN(Date.parse(v)))) {
        type = 'date';
      } else if (unique <= Math.min(20, nonNull.length * 0.5)) {
        type = 'categorical';
      }
      
      const column: DataColumn = {
        name,
        type,
        values,
        missing,
        unique
      };
      
      if (type === 'numeric') {
        const numValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
        column.stats = this.calculateNumericStats(numValues);
      } else if (type === 'categorical') {
        const freq: { [key: string]: number } = {};
        nonNull.forEach(v => freq[String(v)] = (freq[String(v)] || 0) + 1);
        column.categories = Object.entries(freq)
          .map(([value, count]) => ({
            value,
            count,
            percentage: (count / nonNull.length) * 100
          }))
          .sort((a, b) => b.count - a.count);
      }
      
      this.columns.push(column);
    });
    
    // Calculate correlation matrix for numeric columns
    this.calculateCorrelationMatrix();
  }

  // ==================== مصفوفة الارتباط ====================

  private calculateCorrelationMatrix(): void {
    const numericCols = this.columns.filter(c => c.type === 'numeric');
    this.correlationMatrix = [];
    
    for (let i = 0; i < numericCols.length; i++) {
      for (let j = i + 1; j < numericCols.length; j++) {
        const col1 = numericCols[i];
        const col2 = numericCols[j];
        
        const pairs: [number, number][] = [];
        for (let k = 0; k < this.data.length; k++) {
          const v1 = parseFloat(this.data[k][col1.name]);
          const v2 = parseFloat(this.data[k][col2.name]);
          if (!isNaN(v1) && !isNaN(v2)) {
            pairs.push([v1, v2]);
          }
        }
        
        if (pairs.length >= 3) {
          const x = pairs.map(p => p[0]);
          const y = pairs.map(p => p[1]);
          const pearson = this.pearsonCorrelation(x, y);
          const spearman = this.spearmanCorrelation(x, y);
          const pValue = this.correlationPValue(pearson, pairs.length);
          
          this.correlationMatrix.push({
            var1: col1.name,
            var2: col2.name,
            pearson,
            spearman,
            pValue,
            interpretation: this.interpretCorrelation(pearson)
          });
        }
      }
    }
  }

  private pearsonCorrelation(x: number[], y: number[]): number {
    const n = x.length;
    if (n === 0) return 0;
    
    const mx = this.mean(x);
    const my = this.mean(y);
    const sx = this.std(x, false);
    const sy = this.std(y, false);
    
    if (sx === 0 || sy === 0) return 0;
    
    let sum = 0;
    for (let i = 0; i < n; i++) {
      sum += ((x[i] - mx) / sx) * ((y[i] - my) / sy);
    }
    
    return sum / n;
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
      while (j < sorted.length - 1 && sorted[j].v === sorted[j + 1].v) j++;
      const avgRank = (i + j) / 2 + 1;
      for (let k = i; k <= j; k++) ranks[sorted[k].i] = avgRank;
      i = j + 1;
    }
    
    return ranks;
  }

  private correlationPValue(r: number, n: number): number {
    if (n <= 2) return 1;
    const t = r * Math.sqrt((n - 2) / (1 - r * r));
    return 2 * (1 - this.tCDF(Math.abs(t), n - 2));
  }

  private interpretCorrelation(r: number): { ar: string; en: string } {
    const abs = Math.abs(r);
    const direction = r > 0 ? { ar: 'طردية', en: 'positive' } : { ar: 'عكسية', en: 'negative' };
    
    if (abs >= 0.9) return { ar: `علاقة ${direction.ar} قوية جداً`, en: `Very strong ${direction.en} correlation` };
    if (abs >= 0.7) return { ar: `علاقة ${direction.ar} قوية`, en: `Strong ${direction.en} correlation` };
    if (abs >= 0.5) return { ar: `علاقة ${direction.ar} متوسطة`, en: `Moderate ${direction.en} correlation` };
    if (abs >= 0.3) return { ar: `علاقة ${direction.ar} ضعيفة`, en: `Weak ${direction.en} correlation` };
    return { ar: 'لا توجد علاقة تذكر', en: 'No significant correlation' };
  }

  // ==================== الاختبارات الإحصائية ====================

  public performTTest(col1: string, col2: string, paired = false): TestResult {
    const c1 = this.columns.find(c => c.name === col1);
    const c2 = this.columns.find(c => c.name === col2);
    
    if (!c1 || !c2 || c1.type !== 'numeric' || c2.type !== 'numeric') {
      throw new Error('Both columns must be numeric');
    }
    
    const x = c1.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    const y = c2.values.map(v => parseFloat(v)).filter(v => !isNaN(v));
    
    if (paired) {
      return this.pairedTTest(x, y);
    } else {
      return this.independentTTest(x, y);
    }
  }

  private independentTTest(x: number[], y: number[]): TestResult {
    const n1 = x.length, n2 = y.length;
    const m1 = this.mean(x), m2 = this.mean(y);
    const v1 = this.variance(x), v2 = this.variance(y);
    
    // Welch's t-test
    const se = Math.sqrt(v1 / n1 + v2 / n2);
    const t = (m1 - m2) / se;
    
    // Welch-Satterthwaite degrees of freedom
    const num = Math.pow(v1 / n1 + v2 / n2, 2);
    const denom = Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1);
    const df = num / denom;
    
    const pValue = 2 * (1 - this.tCDF(Math.abs(t), df));
    
    // Cohen's d
    const pooledStd = Math.sqrt(((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2));
    const cohensD = pooledStd > 0 ? (m1 - m2) / pooledStd : 0;
    
    const significant = pValue < 0.05;
    
    return {
      testName: { ar: 'اختبار t للعينات المستقلة', en: 'Independent Samples T-Test' },
      statistic: t,
      pValue,
      df,
      effectSize: {
        value: cohensD,
        interpretation: this.interpretCohensD(cohensD)
      },
      ci95: {
        lower: (m1 - m2) - 1.96 * se,
        upper: (m1 - m2) + 1.96 * se
      },
      conclusion: significant
        ? { ar: 'يوجد فرق دال إحصائياً بين المجموعتين', en: 'There is a statistically significant difference between the groups' }
        : { ar: 'لا يوجد فرق دال إحصائياً بين المجموعتين', en: 'There is no statistically significant difference between the groups' },
      interpretation: {
        ar: `المتوسط الأول (${m1.toFixed(2)}) ${m1 > m2 ? 'أكبر من' : 'أصغر من'} المتوسط الثاني (${m2.toFixed(2)}) بفرق ${Math.abs(m1 - m2).toFixed(2)}. ${significant ? 'هذا الفرق ذو دلالة إحصائية.' : 'هذا الفرق غير دال إحصائياً.'}`,
        en: `Mean 1 (${m1.toFixed(2)}) is ${m1 > m2 ? 'greater than' : 'less than'} Mean 2 (${m2.toFixed(2)}) by ${Math.abs(m1 - m2).toFixed(2)}. ${significant ? 'This difference is statistically significant.' : 'This difference is not statistically significant.'}`
      },
      details: {
        mean1: m1, mean2: m2, std1: Math.sqrt(v1), std2: Math.sqrt(v2), n1, n2,
        meanDiff: m1 - m2, pooledStd
      }
    };
  }

  private pairedTTest(x: number[], y: number[]): TestResult {
    const n = Math.min(x.length, y.length);
    const diff = [];
    for (let i = 0; i < n; i++) {
      diff.push(x[i] - y[i]);
    }
    
    const meanDiff = this.mean(diff);
    const stdDiff = this.std(diff);
    const seDiff = stdDiff / Math.sqrt(n);
    const t = meanDiff / seDiff;
    const df = n - 1;
    const pValue = 2 * (1 - this.tCDF(Math.abs(t), df));
    const cohensD = stdDiff > 0 ? meanDiff / stdDiff : 0;
    
    const significant = pValue < 0.05;
    
    return {
      testName: { ar: 'اختبار t للعينات المزدوجة', en: 'Paired Samples T-Test' },
      statistic: t,
      pValue,
      df,
      effectSize: {
        value: cohensD,
        interpretation: this.interpretCohensD(cohensD)
      },
      ci95: {
        lower: meanDiff - 1.96 * seDiff,
        upper: meanDiff + 1.96 * seDiff
      },
      conclusion: significant
        ? { ar: 'يوجد فرق دال إحصائياً بين القياسين', en: 'There is a statistically significant difference between measurements' }
        : { ar: 'لا يوجد فرق دال إحصائياً بين القياسين', en: 'There is no statistically significant difference between measurements' },
      interpretation: {
        ar: `متوسط الفروق ${meanDiff.toFixed(2)} ${significant ? 'يختلف معنوياً عن الصفر' : 'لا يختلف معنوياً عن الصفر'}. حجم الأثر (d = ${Math.abs(cohensD).toFixed(2)}) ${this.interpretCohensD(cohensD).ar}.`,
        en: `Mean difference ${meanDiff.toFixed(2)} ${significant ? 'differs significantly from zero' : 'does not differ significantly from zero'}. Effect size (d = ${Math.abs(cohensD).toFixed(2)}) is ${this.interpretCohensD(cohensD).en}.`
      },
      details: { meanDiff, stdDiff, n, mean1: this.mean(x), mean2: this.mean(y) }
    };
  }

  public performANOVA(numericCol: string, groupCol: string): TestResult {
    const numCol = this.columns.find(c => c.name === numericCol);
    const grpCol = this.columns.find(c => c.name === groupCol);
    
    if (!numCol || !grpCol) throw new Error('Columns not found');
    
    // Group data
    const groups: { [key: string]: number[] } = {};
    this.data.forEach(row => {
      const group = String(row[groupCol]);
      const value = parseFloat(row[numericCol]);
      if (!isNaN(value) && group) {
        if (!groups[group]) groups[group] = [];
        groups[group].push(value);
      }
    });
    
    const groupNames = Object.keys(groups);
    const k = groupNames.length;
    const allValues = Object.values(groups).flat();
    const N = allValues.length;
    const grandMean = this.mean(allValues);
    
    // Calculate sum of squares
    let ssBetween = 0, ssWithin = 0;
    const groupStats: { name: string; n: number; mean: number; std: number }[] = [];
    
    groupNames.forEach(name => {
      const g = groups[name];
      const gMean = this.mean(g);
      const gStd = this.std(g);
      ssBetween += g.length * Math.pow(gMean - grandMean, 2);
      ssWithin += g.reduce((acc, v) => acc + Math.pow(v - gMean, 2), 0);
      groupStats.push({ name, n: g.length, mean: gMean, std: gStd });
    });
    
    const dfBetween = k - 1;
    const dfWithin = N - k;
    const msBetween = ssBetween / dfBetween;
    const msWithin = ssWithin / dfWithin;
    const f = msBetween / msWithin;
    const pValue = 1 - this.fCDF(f, dfBetween, dfWithin);
    
    // Effect size (Eta-squared)
    const etaSquared = ssBetween / (ssBetween + ssWithin);
    
    const significant = pValue < 0.05;
    
    return {
      testName: { ar: 'تحليل التباين الأحادي', en: 'One-Way ANOVA' },
      statistic: f,
      pValue,
      df: dfBetween,
      effectSize: {
        value: etaSquared,
        interpretation: this.interpretEtaSquared(etaSquared)
      },
      conclusion: significant
        ? { ar: 'توجد فروق دالة إحصائياً بين المجموعات', en: 'There are statistically significant differences between groups' }
        : { ar: 'لا توجد فروق دالة إحصائياً بين المجموعات', en: 'There are no statistically significant differences between groups' },
      interpretation: {
        ar: `تم مقارنة ${k} مجموعات. ${significant ? 'توجد فروق معنوية بين المجموعات على الأقل.' : 'لا توجد فروق معنوية بين المجموعات.'} حجم الأثر (η² = ${etaSquared.toFixed(3)}) ${this.interpretEtaSquared(etaSquared).ar}.`,
        en: `Compared ${k} groups. ${significant ? 'There are significant differences between at least some groups.' : 'No significant differences between groups.'} Effect size (η² = ${etaSquared.toFixed(3)}) is ${this.interpretEtaSquared(etaSquared).en}.`
      },
      details: {
        groupStats,
        ssBetween, ssWithin, msBetween, msWithin,
        dfBetween, dfWithin, grandMean
      }
    };
  }

  public performChiSquare(col1: string, col2: string): TestResult {
    const c1 = this.columns.find(c => c.name === col1);
    const c2 = this.columns.find(c => c.name === col2);
    
    if (!c1 || !c2) throw new Error('Columns not found');
    
    // Create contingency table
    const contingency: { [key: string]: { [key: string]: number } } = {};
    const rowTotals: { [key: string]: number } = {};
    const colTotals: { [key: string]: number } = {};
    let total = 0;
    
    this.data.forEach(row => {
      const v1 = String(row[col1]);
      const v2 = String(row[col2]);
      if (v1 && v2) {
        if (!contingency[v1]) contingency[v1] = {};
        contingency[v1][v2] = (contingency[v1][v2] || 0) + 1;
        rowTotals[v1] = (rowTotals[v1] || 0) + 1;
        colTotals[v2] = (colTotals[v2] || 0) + 1;
        total++;
      }
    });
    
    const rows = Object.keys(rowTotals);
    const cols = Object.keys(colTotals);
    
    // Calculate chi-square
    let chiSquare = 0;
    rows.forEach(r => {
      cols.forEach(c => {
        const observed = contingency[r]?.[c] || 0;
        const expected = (rowTotals[r] * colTotals[c]) / total;
        if (expected > 0) {
          chiSquare += Math.pow(observed - expected, 2) / expected;
        }
      });
    });
    
    const df = (rows.length - 1) * (cols.length - 1);
    const pValue = 1 - this.chiSquareCDF(chiSquare, df);
    
    // Cramér's V
    const minDim = Math.min(rows.length, cols.length) - 1;
    const cramersV = minDim > 0 ? Math.sqrt(chiSquare / (total * minDim)) : 0;
    
    const significant = pValue < 0.05;
    
    return {
      testName: { ar: 'اختبار كاي تربيع للاستقلالية', en: 'Chi-Square Test of Independence' },
      statistic: chiSquare,
      pValue,
      df,
      effectSize: {
        value: cramersV,
        interpretation: this.interpretCramersV(cramersV)
      },
      conclusion: significant
        ? { ar: 'توجد علاقة دالة إحصائياً بين المتغيرين', en: 'There is a statistically significant relationship between variables' }
        : { ar: 'لا توجد علاقة دالة إحصائياً بين المتغيرين', en: 'There is no statistically significant relationship between variables' },
      interpretation: {
        ar: `تم تحليل جدول تكراري ${rows.length}×${cols.length}. ${significant ? 'المتغيران مرتبطان إحصائياً.' : 'المتغيران مستقلان إحصائياً.'} قوة العلاقة (V = ${cramersV.toFixed(3)}) ${this.interpretCramersV(cramersV).ar}.`,
        en: `Analyzed ${rows.length}×${cols.length} contingency table. ${significant ? 'Variables are statistically associated.' : 'Variables are statistically independent.'} Association strength (V = ${cramersV.toFixed(3)}) is ${this.interpretCramersV(cramersV).en}.`
      },
      details: { contingency, rowTotals, colTotals, total, rows, cols }
    };
  }

  // ==================== تحليل الانحدار ====================

  public performRegression(yCol: string, xCols: string[]): RegressionResult {
    const yColumn = this.columns.find(c => c.name === yCol);
    if (!yColumn || yColumn.type !== 'numeric') throw new Error('Y must be numeric');
    
    const xColumns = xCols.map(name => this.columns.find(c => c.name === name));
    if (xColumns.some(c => !c || c.type !== 'numeric')) throw new Error('All X must be numeric');
    
    // Simple linear regression for now (first X variable)
    const pairs: [number, number][] = [];
    this.data.forEach(row => {
      const y = parseFloat(row[yCol]);
      const x = parseFloat(row[xCols[0]]);
      if (!isNaN(x) && !isNaN(y)) pairs.push([x, y]);
    });
    
    const n = pairs.length;
    const x = pairs.map(p => p[0]);
    const y = pairs.map(p => p[1]);
    
    const mx = this.mean(x);
    const my = this.mean(y);
    
    let ssxy = 0, ssxx = 0, ssyy = 0;
    for (let i = 0; i < n; i++) {
      ssxy += (x[i] - mx) * (y[i] - my);
      ssxx += Math.pow(x[i] - mx, 2);
      ssyy += Math.pow(y[i] - my, 2);
    }
    
    const b1 = ssxy / ssxx;
    const b0 = my - b1 * mx;
    
    // Calculate R-squared
    const predicted = x.map(xi => b0 + b1 * xi);
    const residuals = y.map((yi, i) => yi - predicted[i]);
    const ssRes = residuals.reduce((acc, r) => acc + r * r, 0);
    const ssTot = ssyy;
    const rSquared = 1 - ssRes / ssTot;
    const adjustedRSquared = 1 - ((1 - rSquared) * (n - 1)) / (n - 2);
    
    // F-statistic
    const ssReg = ssTot - ssRes;
    const msReg = ssReg / 1;
    const msRes = ssRes / (n - 2);
    const fStat = msReg / msRes;
    const pValue = 1 - this.fCDF(fStat, 1, n - 2);
    
    // Coefficient standard errors and t-values
    const se = Math.sqrt(msRes);
    const seB1 = se / Math.sqrt(ssxx);
    const seB0 = se * Math.sqrt(1 / n + mx * mx / ssxx);
    const tB1 = b1 / seB1;
    const tB0 = b0 / seB0;
    const pB1 = 2 * (1 - this.tCDF(Math.abs(tB1), n - 2));
    const pB0 = 2 * (1 - this.tCDF(Math.abs(tB0), n - 2));
    
    return {
      type: 'simple',
      equation: `${yCol} = ${b0.toFixed(4)} + ${b1.toFixed(4)} × ${xCols[0]}`,
      rSquared,
      adjustedRSquared,
      fStatistic: fStat,
      pValue,
      coefficients: [
        { name: 'Intercept', value: b0, se: seB0, t: tB0, pValue: pB0 },
        { name: xCols[0], value: b1, se: seB1, t: tB1, pValue: pB1 }
      ],
      residuals: {
        mean: this.mean(residuals),
        std: this.std(residuals),
        normality: this.shapiroWilkTest(residuals).pValue > 0.05
      },
      interpretation: {
        ar: `النموذج يفسر ${(rSquared * 100).toFixed(1)}% من التباين في ${yCol}. كل زيادة بوحدة واحدة في ${xCols[0]} ${b1 > 0 ? 'تؤدي لزيادة' : 'تؤدي لنقص'} ${Math.abs(b1).toFixed(4)} في ${yCol}.`,
        en: `The model explains ${(rSquared * 100).toFixed(1)}% of variance in ${yCol}. Each unit increase in ${xCols[0]} ${b1 > 0 ? 'leads to' : 'leads to a decrease of'} ${Math.abs(b1).toFixed(4)} in ${yCol}.`
      }
    };
  }

  // ==================== تفسير أحجام الأثر ====================

  private interpretCohensD(d: number): { ar: string; en: string } {
    const abs = Math.abs(d);
    if (abs >= 0.8) return { ar: 'حجم أثر كبير', en: 'large effect size' };
    if (abs >= 0.5) return { ar: 'حجم أثر متوسط', en: 'medium effect size' };
    if (abs >= 0.2) return { ar: 'حجم أثر صغير', en: 'small effect size' };
    return { ar: 'حجم أثر ضئيل', en: 'negligible effect size' };
  }

  private interpretEtaSquared(eta: number): { ar: string; en: string } {
    if (eta >= 0.14) return { ar: 'حجم أثر كبير', en: 'large effect size' };
    if (eta >= 0.06) return { ar: 'حجم أثر متوسط', en: 'medium effect size' };
    if (eta >= 0.01) return { ar: 'حجم أثر صغير', en: 'small effect size' };
    return { ar: 'حجم أثر ضئيل', en: 'negligible effect size' };
  }

  private interpretCramersV(v: number): { ar: string; en: string } {
    if (v >= 0.5) return { ar: 'علاقة قوية', en: 'strong association' };
    if (v >= 0.3) return { ar: 'علاقة متوسطة', en: 'moderate association' };
    if (v >= 0.1) return { ar: 'علاقة ضعيفة', en: 'weak association' };
    return { ar: 'علاقة ضئيلة', en: 'negligible association' };
  }

  // ==================== توليد التقارير ====================

  public generateFullReport(language: 'ar' | 'en' = 'ar'): AnalysisReport {
    const numericCols = this.columns.filter(c => c.type === 'numeric');
    const categoricalCols = this.columns.filter(c => c.type === 'categorical');
    
    const summary = language === 'ar'
      ? `تحتوي البيانات على ${this.data.length} سجل و ${this.columns.length} متغير (${numericCols.length} رقمي، ${categoricalCols.length} فئوي).`
      : `Data contains ${this.data.length} records and ${this.columns.length} variables (${numericCols.length} numeric, ${categoricalCols.length} categorical).`;
    
    // Descriptive analysis
    const descriptiveParts: string[] = [];
    numericCols.forEach(col => {
      if (col.stats) {
        if (language === 'ar') {
          descriptiveParts.push(`• **${col.name}**: المتوسط = ${col.stats.mean.toFixed(2)}، الانحراف المعياري = ${col.stats.std.toFixed(2)}، المدى = [${col.stats.min.toFixed(2)} - ${col.stats.max.toFixed(2)}]، التوزيع ${col.stats.isNormal ? 'طبيعي' : 'غير طبيعي'}`);
        } else {
          descriptiveParts.push(`• **${col.name}**: Mean = ${col.stats.mean.toFixed(2)}, SD = ${col.stats.std.toFixed(2)}, Range = [${col.stats.min.toFixed(2)} - ${col.stats.max.toFixed(2)}], Distribution is ${col.stats.isNormal ? 'normal' : 'non-normal'}`);
        }
      }
    });
    
    // Correlations
    const strongCorrs = this.correlationMatrix.filter(c => Math.abs(c.pearson) >= 0.5);
    const inferentialParts: string[] = [];
    if (strongCorrs.length > 0) {
      if (language === 'ar') {
        inferentialParts.push('**الارتباطات القوية:**');
        strongCorrs.forEach(c => {
          inferentialParts.push(`• ${c.var1} و ${c.var2}: r = ${c.pearson.toFixed(3)} (${c.interpretation.ar})`);
        });
      } else {
        inferentialParts.push('**Strong Correlations:**');
        strongCorrs.forEach(c => {
          inferentialParts.push(`• ${c.var1} and ${c.var2}: r = ${c.pearson.toFixed(3)} (${c.interpretation.en})`);
        });
      }
    }
    
    // Recommendations
    const recommendations: { ar: string; en: string }[] = [];
    
    // Check for missing values
    const missingCols = this.columns.filter(c => c.missing > 0);
    if (missingCols.length > 0) {
      recommendations.push({
        ar: `معالجة القيم المفقودة في: ${missingCols.map(c => c.name).join('، ')}`,
        en: `Handle missing values in: ${missingCols.map(c => c.name).join(', ')}`
      });
    }
    
    // Check for outliers
    numericCols.forEach(col => {
      if (col.stats && col.stats.outliers.count > 0) {
        recommendations.push({
          ar: `فحص ${col.stats.outliers.count} قيمة شاذة في ${col.name}`,
          en: `Examine ${col.stats.outliers.count} outliers in ${col.name}`
        });
      }
    });
    
    // Suggest tests
    if (numericCols.length >= 2) {
      recommendations.push({
        ar: 'يمكن إجراء تحليل ارتباط أو انحدار بين المتغيرات الرقمية',
        en: 'Consider correlation or regression analysis between numeric variables'
      });
    }
    
    if (categoricalCols.length >= 1 && numericCols.length >= 1) {
      recommendations.push({
        ar: 'يمكن إجراء اختبار t أو ANOVA لمقارنة المجموعات',
        en: 'Consider t-test or ANOVA to compare groups'
      });
    }
    
    const warnings: { ar: string; en: string }[] = [];
    
    // Small sample warning
    if (this.data.length < 30) {
      warnings.push({
        ar: 'حجم العينة صغير (< 30)، قد تكون النتائج أقل موثوقية',
        en: 'Small sample size (< 30), results may be less reliable'
      });
    }
    
    // Non-normal distributions
    const nonNormal = numericCols.filter(c => c.stats && !c.stats.isNormal);
    if (nonNormal.length > 0) {
      warnings.push({
        ar: `التوزيعات غير طبيعية في: ${nonNormal.map(c => c.name).join('، ')}. يُفضل استخدام الاختبارات اللامعلمية.`,
        en: `Non-normal distributions in: ${nonNormal.map(c => c.name).join(', ')}. Consider non-parametric tests.`
      });
    }
    
    return {
      summary: { ar: summary, en: summary },
      descriptive: {
        ar: descriptiveParts.join('\n'),
        en: descriptiveParts.join('\n')
      },
      inferential: {
        ar: inferentialParts.join('\n'),
        en: inferentialParts.join('\n')
      },
      recommendations,
      warnings
    };
  }

  // ==================== نظام المحادثة الذكي ====================

  public chat(message: string, language: 'ar' | 'en' = 'ar'): {
    response: string;
    suggestions: string[];
    data?: any;
  } {
    const lowerMsg = message.toLowerCase();
    const numericCols = this.columns.filter(c => c.type === 'numeric');
    const categoricalCols = this.columns.filter(c => c.type === 'categorical');
    
    // Greeting
    if (lowerMsg.includes('مرحبا') || lowerMsg.includes('hello') || lowerMsg.includes('hi')) {
      return {
        response: language === 'ar'
          ? `مرحباً! أنا مساعدك الإحصائي الذكي. لديك بيانات تحتوي على ${this.data.length} سجل و ${this.columns.length} متغير. كيف يمكنني مساعدتك؟`
          : `Hello! I'm your intelligent statistical assistant. You have data with ${this.data.length} records and ${this.columns.length} variables. How can I help you?`,
        suggestions: language === 'ar'
          ? ['أعطني ملخص البيانات', 'هل توجد قيم مفقودة؟', 'ما هي الارتباطات القوية؟']
          : ['Give me a data summary', 'Are there missing values?', 'What are the strong correlations?']
      };
    }
    
    // Data summary
    if (lowerMsg.includes('ملخص') || lowerMsg.includes('summary') || lowerMsg.includes('وصف') || lowerMsg.includes('describe')) {
      const report = this.generateFullReport(language);
      let response = '';
      
      if (language === 'ar') {
        response = `## 📊 ملخص البيانات\n\n${report.summary.ar}\n\n`;
        response += `### المتغيرات الرقمية (${numericCols.length}):\n`;
        numericCols.forEach(col => {
          if (col.stats) {
            response += `\n**${col.name}:**\n`;
            response += `| الإحصاء | القيمة |\n|--------|-------|\n`;
            response += `| العدد | ${col.stats.count} |\n`;
            response += `| المتوسط | ${col.stats.mean.toFixed(3)} |\n`;
            response += `| الوسيط | ${col.stats.median.toFixed(3)} |\n`;
            response += `| الانحراف المعياري | ${col.stats.std.toFixed(3)} |\n`;
            response += `| الحد الأدنى | ${col.stats.min.toFixed(3)} |\n`;
            response += `| الحد الأقصى | ${col.stats.max.toFixed(3)} |\n`;
            response += `| الالتواء | ${col.stats.skewness.toFixed(3)} |\n`;
            response += `| التفرطح | ${col.stats.kurtosis.toFixed(3)} |\n`;
            response += `| التوزيع | ${col.stats.isNormal ? '✅ طبيعي' : '⚠️ غير طبيعي'} |\n`;
          }
        });
        
        if (categoricalCols.length > 0) {
          response += `\n### المتغيرات الفئوية (${categoricalCols.length}):\n`;
          categoricalCols.forEach(col => {
            response += `\n**${col.name}** (${col.unique} فئة):\n`;
            col.categories?.slice(0, 5).forEach(cat => {
              response += `• ${cat.value}: ${cat.count} (${cat.percentage.toFixed(1)}%)\n`;
            });
          });
        }
      } else {
        response = `## 📊 Data Summary\n\n${report.summary.en}\n\n`;
        response += `### Numeric Variables (${numericCols.length}):\n`;
        numericCols.forEach(col => {
          if (col.stats) {
            response += `\n**${col.name}:**\n`;
            response += `| Statistic | Value |\n|-----------|-------|\n`;
            response += `| Count | ${col.stats.count} |\n`;
            response += `| Mean | ${col.stats.mean.toFixed(3)} |\n`;
            response += `| Median | ${col.stats.median.toFixed(3)} |\n`;
            response += `| Std Dev | ${col.stats.std.toFixed(3)} |\n`;
            response += `| Min | ${col.stats.min.toFixed(3)} |\n`;
            response += `| Max | ${col.stats.max.toFixed(3)} |\n`;
            response += `| Skewness | ${col.stats.skewness.toFixed(3)} |\n`;
            response += `| Kurtosis | ${col.stats.kurtosis.toFixed(3)} |\n`;
            response += `| Distribution | ${col.stats.isNormal ? '✅ Normal' : '⚠️ Non-normal'} |\n`;
          }
        });
        
        if (categoricalCols.length > 0) {
          response += `\n### Categorical Variables (${categoricalCols.length}):\n`;
          categoricalCols.forEach(col => {
            response += `\n**${col.name}** (${col.unique} categories):\n`;
            col.categories?.slice(0, 5).forEach(cat => {
              response += `• ${cat.value}: ${cat.count} (${cat.percentage.toFixed(1)}%)\n`;
            });
          });
        }
      }
      
      return {
        response,
        suggestions: language === 'ar'
          ? ['تحليل الارتباطات', 'هل توجد قيم شاذة؟', 'ما الاختبار المناسب؟']
          : ['Analyze correlations', 'Are there outliers?', 'What test is suitable?']
      };
    }
    
    // Missing values
    if (lowerMsg.includes('مفقود') || lowerMsg.includes('missing') || lowerMsg.includes('ناقص')) {
      const missingCols = this.columns.filter(c => c.missing > 0);
      let response = '';
      
      if (missingCols.length === 0) {
        response = language === 'ar'
          ? '✅ لا توجد قيم مفقودة في البيانات!'
          : '✅ No missing values in the data!';
      } else {
        if (language === 'ar') {
          response = `## ⚠️ القيم المفقودة\n\n`;
          response += `| المتغير | المفقودة | النسبة |\n|--------|---------|-------|\n`;
          missingCols.forEach(col => {
            const pct = ((col.missing / this.data.length) * 100).toFixed(1);
            response += `| ${col.name} | ${col.missing} | ${pct}% |\n`;
          });
          response += `\n### التوصيات:\n`;
          response += `• إذا كانت النسبة أقل من 5%: يمكن استخدام التعويض بالمتوسط أو الوسيط\n`;
          response += `• إذا كانت النسبة 5-20%: يُفضل استخدام KNN أو الانحدار للتعويض\n`;
          response += `• إذا كانت النسبة أكثر من 20%: يُنصح بحذف المتغير أو فحص سبب الفقدان`;
        } else {
          response = `## ⚠️ Missing Values\n\n`;
          response += `| Variable | Missing | Percentage |\n|----------|---------|------------|\n`;
          missingCols.forEach(col => {
            const pct = ((col.missing / this.data.length) * 100).toFixed(1);
            response += `| ${col.name} | ${col.missing} | ${pct}% |\n`;
          });
          response += `\n### Recommendations:\n`;
          response += `• If < 5%: Mean or median imputation is acceptable\n`;
          response += `• If 5-20%: Consider KNN or regression imputation\n`;
          response += `• If > 20%: Consider dropping the variable or investigating the cause`;
        }
      }
      
      return {
        response,
        suggestions: language === 'ar'
          ? ['كيف أعالج القيم المفقودة؟', 'ملخص البيانات', 'تحليل التوزيعات']
          : ['How to handle missing values?', 'Data summary', 'Distribution analysis']
      };
    }
    
    // Outliers
    if (lowerMsg.includes('شاذ') || lowerMsg.includes('outlier') || lowerMsg.includes('متطرف')) {
      let response = '';
      const colsWithOutliers = numericCols.filter(c => c.stats && c.stats.outliers.count > 0);
      
      if (colsWithOutliers.length === 0) {
        response = language === 'ar'
          ? '✅ لا توجد قيم شاذة في المتغيرات الرقمية!'
          : '✅ No outliers detected in numeric variables!';
      } else {
        if (language === 'ar') {
          response = `## 🔍 القيم الشاذة\n\n`;
          response += `| المتغير | العدد | النسبة | الحد الأدنى الطبيعي | الحد الأقصى الطبيعي |\n|--------|------|-------|-------------------|-------------------|\n`;
          colsWithOutliers.forEach(col => {
            if (col.stats) {
              const lower = col.stats.q1 - 1.5 * col.stats.iqr;
              const upper = col.stats.q3 + 1.5 * col.stats.iqr;
              const pct = ((col.stats.outliers.count / col.stats.count) * 100).toFixed(1);
              response += `| ${col.name} | ${col.stats.outliers.count} | ${pct}% | ${lower.toFixed(2)} | ${upper.toFixed(2)} |\n`;
            }
          });
          response += `\n### التوصيات:\n`;
          response += `• فحص القيم الشاذة يدوياً للتأكد من صحتها\n`;
          response += `• يمكن استخدام Winsorization للحد من تأثيرها\n`;
          response += `• استخدام الوسيط بدلاً من المتوسط في التحليل`;
        } else {
          response = `## 🔍 Outliers\n\n`;
          response += `| Variable | Count | Percentage | Lower Bound | Upper Bound |\n|----------|-------|------------|-------------|-------------|\n`;
          colsWithOutliers.forEach(col => {
            if (col.stats) {
              const lower = col.stats.q1 - 1.5 * col.stats.iqr;
              const upper = col.stats.q3 + 1.5 * col.stats.iqr;
              const pct = ((col.stats.outliers.count / col.stats.count) * 100).toFixed(1);
              response += `| ${col.name} | ${col.stats.outliers.count} | ${pct}% | ${lower.toFixed(2)} | ${upper.toFixed(2)} |\n`;
            }
          });
          response += `\n### Recommendations:\n`;
          response += `• Manually inspect outliers to verify their validity\n`;
          response += `• Consider Winsorization to reduce their impact\n`;
          response += `• Use median instead of mean in analysis`;
        }
      }
      
      return {
        response,
        suggestions: language === 'ar'
          ? ['كيف أعالج القيم الشاذة؟', 'تحليل التوزيعات', 'ملخص البيانات']
          : ['How to handle outliers?', 'Distribution analysis', 'Data summary']
      };
    }
    
    // Correlations
    if (lowerMsg.includes('ارتباط') || lowerMsg.includes('correlation') || lowerMsg.includes('علاقة')) {
      let response = '';
      
      if (this.correlationMatrix.length === 0) {
        response = language === 'ar'
          ? '⚠️ لا تتوفر متغيرات رقمية كافية لحساب الارتباطات (يلزم متغيران رقميان على الأقل).'
          : '⚠️ Insufficient numeric variables for correlation (need at least 2 numeric variables).';
      } else {
        const sorted = [...this.correlationMatrix].sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson));
        
        if (language === 'ar') {
          response = `## 📈 تحليل الارتباطات\n\n`;
          response += `| المتغير 1 | المتغير 2 | Pearson | Spearman | الدلالة | التفسير |\n|-----------|-----------|---------|----------|---------|--------|\n`;
          sorted.forEach(c => {
            const sig = c.pValue < 0.05 ? '✅ دال' : '❌ غير دال';
            response += `| ${c.var1} | ${c.var2} | ${c.pearson.toFixed(3)} | ${c.spearman.toFixed(3)} | ${sig} | ${c.interpretation.ar} |\n`;
          });
          
          const strong = sorted.filter(c => Math.abs(c.pearson) >= 0.7);
          if (strong.length > 0) {
            response += `\n### 🎯 الارتباطات القوية:\n`;
            strong.forEach(c => {
              response += `• **${c.var1}** و **${c.var2}**: علاقة ${c.pearson > 0 ? 'طردية' : 'عكسية'} قوية (r = ${c.pearson.toFixed(3)})\n`;
            });
          }
        } else {
          response = `## 📈 Correlation Analysis\n\n`;
          response += `| Variable 1 | Variable 2 | Pearson | Spearman | Significance | Interpretation |\n|------------|------------|---------|----------|--------------|----------------|\n`;
          sorted.forEach(c => {
            const sig = c.pValue < 0.05 ? '✅ Sig.' : '❌ Not Sig.';
            response += `| ${c.var1} | ${c.var2} | ${c.pearson.toFixed(3)} | ${c.spearman.toFixed(3)} | ${sig} | ${c.interpretation.en} |\n`;
          });
          
          const strong = sorted.filter(c => Math.abs(c.pearson) >= 0.7);
          if (strong.length > 0) {
            response += `\n### 🎯 Strong Correlations:\n`;
            strong.forEach(c => {
              response += `• **${c.var1}** and **${c.var2}**: Strong ${c.pearson > 0 ? 'positive' : 'negative'} correlation (r = ${c.pearson.toFixed(3)})\n`;
            });
          }
        }
      }
      
      return {
        response,
        suggestions: language === 'ar'
          ? ['تحليل انحدار', 'ما الاختبار المناسب؟', 'ملخص البيانات']
          : ['Regression analysis', 'What test is suitable?', 'Data summary']
      };
    }
    
    // Test recommendation
    if (lowerMsg.includes('اختبار') || lowerMsg.includes('test') || lowerMsg.includes('مناسب') || lowerMsg.includes('suitable')) {
      let response = '';
      
      if (language === 'ar') {
        response = `## 🧪 الاختبارات الإحصائية المقترحة\n\n`;
        response += `بناءً على بياناتك (${numericCols.length} متغير رقمي، ${categoricalCols.length} متغير فئوي):\n\n`;
        
        if (numericCols.length >= 2) {
          response += `### لدراسة العلاقات:\n`;
          const normalCount = numericCols.filter(c => c.stats?.isNormal).length;
          if (normalCount >= 2) {
            response += `• **ارتباط بيرسون** - للعلاقات الخطية (التوزيعات طبيعية)\n`;
          }
          response += `• **ارتباط سبيرمان** - للعلاقات الرتبية (لا يشترط التوزيع الطبيعي)\n`;
          response += `• **الانحدار الخطي** - للتنبؤ بمتغير من متغير آخر\n\n`;
        }
        
        if (categoricalCols.length >= 1 && numericCols.length >= 1) {
          response += `### للمقارنة بين المجموعات:\n`;
          categoricalCols.forEach(cat => {
            const groupCount = cat.unique;
            if (groupCount === 2) {
              response += `• **اختبار t للعينات المستقلة** - لمقارنة مجموعتين في ${cat.name}\n`;
              response += `• **اختبار Mann-Whitney U** - بديل لامعلمي إذا التوزيع غير طبيعي\n`;
            } else if (groupCount > 2) {
              response += `• **ANOVA الأحادي** - لمقارنة ${groupCount} مجموعات في ${cat.name}\n`;
              response += `• **Kruskal-Wallis** - بديل لامعلمي إذا التوزيع غير طبيعي\n`;
            }
          });
        }
        
        if (categoricalCols.length >= 2) {
          response += `\n### للعلاقة بين متغيرات فئوية:\n`;
          response += `• **اختبار كاي تربيع** - لدراسة الاستقلالية\n`;
        }
      } else {
        response = `## 🧪 Recommended Statistical Tests\n\n`;
        response += `Based on your data (${numericCols.length} numeric, ${categoricalCols.length} categorical variables):\n\n`;
        
        if (numericCols.length >= 2) {
          response += `### For Relationships:\n`;
          const normalCount = numericCols.filter(c => c.stats?.isNormal).length;
          if (normalCount >= 2) {
            response += `• **Pearson Correlation** - for linear relationships (normal distributions)\n`;
          }
          response += `• **Spearman Correlation** - for monotonic relationships (no normality required)\n`;
          response += `• **Linear Regression** - to predict one variable from another\n\n`;
        }
        
        if (categoricalCols.length >= 1 && numericCols.length >= 1) {
          response += `### For Group Comparisons:\n`;
          categoricalCols.forEach(cat => {
            const groupCount = cat.unique;
            if (groupCount === 2) {
              response += `• **Independent Samples t-test** - to compare 2 groups in ${cat.name}\n`;
              response += `• **Mann-Whitney U test** - non-parametric alternative\n`;
            } else if (groupCount > 2) {
              response += `• **One-Way ANOVA** - to compare ${groupCount} groups in ${cat.name}\n`;
              response += `• **Kruskal-Wallis test** - non-parametric alternative\n`;
            }
          });
        }
        
        if (categoricalCols.length >= 2) {
          response += `\n### For Categorical Relationships:\n`;
          response += `• **Chi-Square test** - to test independence\n`;
        }
      }
      
      return {
        response,
        suggestions: language === 'ar'
          ? ['نفذ اختبار t', 'تحليل الارتباطات', 'تحليل انحدار']
          : ['Run t-test', 'Correlation analysis', 'Regression analysis']
      };
    }
    
    // Distribution analysis
    if (lowerMsg.includes('توزيع') || lowerMsg.includes('distribution') || lowerMsg.includes('طبيعي') || lowerMsg.includes('normal')) {
      let response = '';
      
      if (language === 'ar') {
        response = `## 📊 تحليل التوزيعات\n\n`;
        response += `| المتغير | الالتواء | التفرطح | Shapiro-Wilk (W) | p-value | الحالة |\n|--------|---------|--------|-----------------|---------|-------|\n`;
        numericCols.forEach(col => {
          if (col.stats) {
            const status = col.stats.isNormal ? '✅ طبيعي' : '⚠️ غير طبيعي';
            response += `| ${col.name} | ${col.stats.skewness.toFixed(3)} | ${col.stats.kurtosis.toFixed(3)} | ${col.stats.shapiroWilk.w.toFixed(4)} | ${col.stats.shapiroWilk.pValue.toFixed(4)} | ${status} |\n`;
          }
        });
        
        response += `\n### تفسير الالتواء:\n`;
        response += `• قيمة قريبة من 0: توزيع متماثل\n`;
        response += `• قيمة موجبة: التواء يميني (ذيل طويل لليمين)\n`;
        response += `• قيمة سالبة: التواء يساري (ذيل طويل لليسار)\n`;
        
        response += `\n### تفسير التفرطح:\n`;
        response += `• قيمة قريبة من 0: شكل طبيعي\n`;
        response += `• قيمة موجبة: قمة حادة (ذيول ثقيلة)\n`;
        response += `• قيمة سالبة: قمة مسطحة (ذيول خفيفة)`;
      } else {
        response = `## 📊 Distribution Analysis\n\n`;
        response += `| Variable | Skewness | Kurtosis | Shapiro-Wilk (W) | p-value | Status |\n|----------|----------|----------|------------------|---------|--------|\n`;
        numericCols.forEach(col => {
          if (col.stats) {
            const status = col.stats.isNormal ? '✅ Normal' : '⚠️ Non-normal';
            response += `| ${col.name} | ${col.stats.skewness.toFixed(3)} | ${col.stats.kurtosis.toFixed(3)} | ${col.stats.shapiroWilk.w.toFixed(4)} | ${col.stats.shapiroWilk.pValue.toFixed(4)} | ${status} |\n`;
          }
        });
        
        response += `\n### Skewness Interpretation:\n`;
        response += `• Value near 0: symmetric distribution\n`;
        response += `• Positive value: right-skewed (long right tail)\n`;
        response += `• Negative value: left-skewed (long left tail)\n`;
        
        response += `\n### Kurtosis Interpretation:\n`;
        response += `• Value near 0: normal shape\n`;
        response += `• Positive value: leptokurtic (heavy tails)\n`;
        response += `• Negative value: platykurtic (light tails)`;
      }
      
      return {
        response,
        suggestions: language === 'ar'
          ? ['ما الاختبار المناسب؟', 'تحليل القيم الشاذة', 'ملخص البيانات']
          : ['What test is suitable?', 'Outlier analysis', 'Data summary']
      };
    }
    
    // Default response
    return {
      response: language === 'ar'
        ? `أنا هنا لمساعدتك في تحليل بياناتك. يمكنني:\n\n• تقديم ملخص وصفي للبيانات\n• تحليل الارتباطات\n• اقتراح الاختبارات المناسبة\n• فحص التوزيعات\n• كشف القيم المفقودة والشاذة\n\nجرب أحد الاقتراحات أدناه!`
        : `I'm here to help you analyze your data. I can:\n\n• Provide descriptive summary\n• Analyze correlations\n• Recommend suitable tests\n• Check distributions\n• Detect missing values and outliers\n\nTry one of the suggestions below!`,
      suggestions: language === 'ar'
        ? ['ملخص البيانات', 'تحليل الارتباطات', 'ما الاختبار المناسب؟', 'تحليل التوزيعات']
        : ['Data summary', 'Correlation analysis', 'What test is suitable?', 'Distribution analysis']
    };
  }

  // ==================== Getters ====================

  public getColumns(): DataColumn[] {
    return this.columns;
  }

  public getNumericColumns(): DataColumn[] {
    return this.columns.filter(c => c.type === 'numeric');
  }

  public getCategoricalColumns(): DataColumn[] {
    return this.columns.filter(c => c.type === 'categorical');
  }

  public getCorrelationMatrix(): CorrelationResult[] {
    return this.correlationMatrix;
  }

  public getData(): any[] {
    return this.data;
  }

  public getDataQuality(): {
    score: number;
    completeness: number;
    validity: number;
    uniqueness: number;
    issues: { ar: string; en: string }[];
  } {
    const totalCells = this.data.length * this.columns.length;
    const missingCells = this.columns.reduce((acc, c) => acc + c.missing, 0);
    const completeness = ((totalCells - missingCells) / totalCells) * 100;
    
    const outlierCount = this.columns
      .filter(c => c.type === 'numeric' && c.stats)
      .reduce((acc, c) => acc + (c.stats?.outliers.count || 0), 0);
    const numericCells = this.columns.filter(c => c.type === 'numeric').length * this.data.length;
    const validity = numericCells > 0 ? ((numericCells - outlierCount) / numericCells) * 100 : 100;
    
    const uniqueness = (this.columns.reduce((acc, c) => acc + c.unique, 0) / 
      (this.columns.length * this.data.length)) * 100;
    
    const score = (completeness + validity + uniqueness) / 3;
    
    const issues: { ar: string; en: string }[] = [];
    if (completeness < 95) {
      issues.push({ ar: 'توجد قيم مفقودة تحتاج للمعالجة', en: 'Missing values need to be handled' });
    }
    if (validity < 95) {
      issues.push({ ar: 'توجد قيم شاذة تحتاج للفحص', en: 'Outliers need to be examined' });
    }
    
    return { score, completeness, validity, uniqueness, issues };
  }
}

export const professionalAIEngine = new ProfessionalAIEngine();
