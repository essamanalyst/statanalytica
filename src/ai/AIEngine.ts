// محرك الذكاء الاصطناعي المتقدم
// Advanced AI Engine for Statistical Analysis

export interface AIRecommendation {
  type: 'test' | 'cleaning' | 'visualization' | 'analysis' | 'insight';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  confidence: number;
  priority: 'high' | 'medium' | 'low';
  action?: () => void;
  code?: string;
}

export interface DataInsight {
  id: string;
  category: 'pattern' | 'anomaly' | 'correlation' | 'trend' | 'distribution' | 'quality';
  title: string;
  titleAr: string;
  description: string;
  descriptionAr: string;
  importance: number;
  affectedColumns: string[];
  suggestion: string;
  suggestionAr: string;
  visualType?: string;
}

export interface ColumnProfile {
  name: string;
  type: 'numeric' | 'categorical' | 'datetime' | 'text' | 'boolean';
  subType?: 'continuous' | 'discrete' | 'ordinal' | 'nominal' | 'binary';
  stats: {
    count: number;
    missing: number;
    missingPercent: number;
    unique: number;
    uniquePercent: number;
    mean?: number;
    median?: number;
    mode?: any;
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
    isNormal?: boolean;
    outliers?: number;
    outliersPercent?: number;
  };
  distribution?: { value: any; count: number; percent: number }[];
  correlations?: { column: string; value: number; strength: string }[];
}

export interface DataProfile {
  rowCount: number;
  columnCount: number;
  numericColumns: string[];
  categoricalColumns: string[];
  dateColumns: string[];
  textColumns: string[];
  booleanColumns: string[];
  missingCells: number;
  missingPercent: number;
  duplicateRows: number;
  duplicatePercent: number;
  memoryUsage: string;
  qualityScore: number;
  columns: ColumnProfile[];
}

export interface TestRecommendation {
  testName: string;
  testNameAr: string;
  category: string;
  categoryAr: string;
  score: number;
  reason: string;
  reasonAr: string;
  requirements: string[];
  requirementsAr: string[];
  assumptions: { name: string; nameAr: string; met: boolean; details: string }[];
  alternative?: string;
  alternativeAr?: string;
}

// ==================== Statistical Functions ====================

const mean = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && isFinite(x));
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
};

const median = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && isFinite(x)).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
};

const mode = (arr: any[]): any => {
  const freq: Record<string, number> = {};
  arr.forEach(v => {
    const key = String(v);
    freq[key] = (freq[key] || 0) + 1;
  });
  let maxFreq = 0;
  let modeVal = arr[0];
  Object.entries(freq).forEach(([k, v]) => {
    if (v > maxFreq) {
      maxFreq = v;
      modeVal = k;
    }
  });
  return modeVal;
};

const variance = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && isFinite(x));
  if (valid.length < 2) return 0;
  const m = mean(valid);
  return valid.reduce((sum, x) => sum + (x - m) ** 2, 0) / (valid.length - 1);
};

const std = (arr: number[]): number => Math.sqrt(variance(arr));

const percentile = (arr: number[], p: number): number => {
  const valid = arr.filter(x => !isNaN(x) && isFinite(x)).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const idx = (p / 100) * (valid.length - 1);
  const lower = Math.floor(idx);
  const upper = Math.ceil(idx);
  if (lower === upper) return valid[lower];
  return valid[lower] + (idx - lower) * (valid[upper] - valid[lower]);
};

const skewness = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && isFinite(x));
  if (valid.length < 3) return 0;
  const m = mean(valid);
  const s = std(valid);
  if (s === 0) return 0;
  const n = valid.length;
  const sum = valid.reduce((acc, x) => acc + ((x - m) / s) ** 3, 0);
  return (n / ((n - 1) * (n - 2))) * sum;
};

const kurtosis = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && isFinite(x));
  if (valid.length < 4) return 0;
  const m = mean(valid);
  const s = std(valid);
  if (s === 0) return 0;
  const n = valid.length;
  const sum = valid.reduce((acc, x) => acc + ((x - m) / s) ** 4, 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * (n - 1) ** 2) / ((n - 2) * (n - 3));
};

const detectOutliers = (arr: number[]): number[] => {
  const valid = arr.filter(x => !isNaN(x) && isFinite(x));
  const q1 = percentile(valid, 25);
  const q3 = percentile(valid, 75);
  const iqr = q3 - q1;
  const lower = q1 - 1.5 * iqr;
  const upper = q3 + 1.5 * iqr;
  return valid.filter(x => x < lower || x > upper);
};

const shapiroWilk = (arr: number[]): { w: number; pValue: number; isNormal: boolean } => {
  const valid = arr.filter(x => !isNaN(x) && isFinite(x)).sort((a, b) => a - b);
  const n = valid.length;
  
  if (n < 3) return { w: 1, pValue: 1, isNormal: true };
  if (n > 5000) {
    // Use approximation for large samples
    const sk = Math.abs(skewness(valid));
    const ku = Math.abs(kurtosis(valid));
    const isNormal = sk < 2 && ku < 7;
    return { w: isNormal ? 0.98 : 0.85, pValue: isNormal ? 0.15 : 0.01, isNormal };
  }
  
  const m = mean(valid);
  const ss = valid.reduce((sum, x) => sum + (x - m) ** 2, 0);
  
  // Simplified Shapiro-Wilk calculation
  let b = 0;
  const halfN = Math.floor(n / 2);
  for (let i = 0; i < halfN; i++) {
    const a = 0.7071 * (1 - (2 * i + 1) / n); // Simplified coefficient
    b += a * (valid[n - 1 - i] - valid[i]);
  }
  
  const w = (b * b) / ss;
  
  // Approximate p-value
  const logW = Math.log(1 - w);
  const mu = -1.5861 - 0.31082 * Math.log(n);
  const sigma = Math.exp(1.0308 - 0.26758 * Math.log(n));
  const z = (logW - mu) / sigma;
  const pValue = 1 - normalCDF(z);
  
  return { w: Math.min(1, Math.max(0, w)), pValue, isNormal: pValue > 0.05 };
};

const normalCDF = (z: number): number => {
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
};

const pearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  
  const validPairs: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i]) && isFinite(x[i]) && isFinite(y[i])) {
      validPairs.push([x[i], y[i]]);
    }
  }
  
  if (validPairs.length < 2) return 0;
  
  const xVals = validPairs.map(p => p[0]);
  const yVals = validPairs.map(p => p[1]);
  const xMean = mean(xVals);
  const yMean = mean(yVals);
  
  let num = 0, denX = 0, denY = 0;
  validPairs.forEach(([xi, yi]) => {
    const dx = xi - xMean;
    const dy = yi - yMean;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  });
  
  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
};

// ==================== AI Engine Class ====================

export class AIEngine {
  private data: Record<string, any>[] = [];
  private profile: DataProfile | null = null;
  private insights: DataInsight[] = [];
  private recommendations: AIRecommendation[] = [];

  constructor(data?: Record<string, any>[]) {
    if (data) {
      this.loadData(data);
    }
  }

  loadData(data: Record<string, any>[]): void {
    this.data = data;
    this.profile = null;
    this.insights = [];
    this.recommendations = [];
  }

  // Profile the entire dataset
  profileData(): DataProfile {
    if (this.profile) return this.profile;
    if (!this.data.length) {
      return {
        rowCount: 0,
        columnCount: 0,
        numericColumns: [],
        categoricalColumns: [],
        dateColumns: [],
        textColumns: [],
        booleanColumns: [],
        missingCells: 0,
        missingPercent: 0,
        duplicateRows: 0,
        duplicatePercent: 0,
        memoryUsage: '0 KB',
        qualityScore: 0,
        columns: []
      };
    }

    const columns = Object.keys(this.data[0]);
    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    const dateColumns: string[] = [];
    const textColumns: string[] = [];
    const booleanColumns: string[] = [];
    const columnProfiles: ColumnProfile[] = [];

    let totalMissing = 0;

    columns.forEach(col => {
      const values = this.data.map(row => row[col]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const missing = values.length - nonNull.length;
      totalMissing += missing;

      const colType = this.detectColumnType(nonNull);
      const profile = this.profileColumn(col, values, colType);
      columnProfiles.push(profile);

      switch (colType.type) {
        case 'numeric':
          numericColumns.push(col);
          break;
        case 'categorical':
          categoricalColumns.push(col);
          break;
        case 'datetime':
          dateColumns.push(col);
          break;
        case 'boolean':
          booleanColumns.push(col);
          break;
        default:
          textColumns.push(col);
      }
    });

    // Calculate duplicates
    const rowStrings = this.data.map(row => JSON.stringify(row));
    const uniqueRows = new Set(rowStrings);
    const duplicateRows = this.data.length - uniqueRows.size;

    // Calculate quality score
    const qualityScore = this.calculateQualityScore(columnProfiles, totalMissing, duplicateRows);

    this.profile = {
      rowCount: this.data.length,
      columnCount: columns.length,
      numericColumns,
      categoricalColumns,
      dateColumns,
      textColumns,
      booleanColumns,
      missingCells: totalMissing,
      missingPercent: (totalMissing / (this.data.length * columns.length)) * 100,
      duplicateRows,
      duplicatePercent: (duplicateRows / this.data.length) * 100,
      memoryUsage: this.estimateMemory(),
      qualityScore,
      columns: columnProfiles
    };

    // Calculate correlations for numeric columns
    this.calculateCorrelations();

    return this.profile;
  }

  private detectColumnType(values: any[]): { type: string; subType?: string } {
    if (!values.length) return { type: 'text' };

    const sample = values.slice(0, Math.min(100, values.length));
    
    // Check for boolean
    const boolValues = sample.filter(v => 
      typeof v === 'boolean' || 
      v === 'true' || v === 'false' ||
      v === 0 || v === 1 ||
      v === 'yes' || v === 'no'
    );
    if (boolValues.length / sample.length > 0.9) {
      return { type: 'boolean' };
    }

    // Check for numeric
    const numericValues = sample.filter(v => {
      if (typeof v === 'number') return !isNaN(v);
      if (typeof v === 'string') {
        const num = parseFloat(v.replace(/,/g, ''));
        return !isNaN(num);
      }
      return false;
    });
    
    if (numericValues.length / sample.length > 0.8) {
      const nums = numericValues.map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, '')));
      const isInteger = nums.every(n => Number.isInteger(n));
      const uniqueRatio = new Set(nums).size / nums.length;
      
      if (isInteger && uniqueRatio < 0.1 && new Set(nums).size <= 10) {
        return { type: 'categorical', subType: 'ordinal' };
      }
      return { type: 'numeric', subType: isInteger ? 'discrete' : 'continuous' };
    }

    // Check for datetime
    const dateValues = sample.filter(v => {
      if (v instanceof Date) return true;
      if (typeof v === 'string') {
        const d = new Date(v);
        return !isNaN(d.getTime()) && v.match(/\d{4}|\d{1,2}[\/\-]\d{1,2}/);
      }
      return false;
    });
    if (dateValues.length / sample.length > 0.8) {
      return { type: 'datetime' };
    }

    // Check for categorical
    const uniqueValues = new Set(sample);
    const uniqueRatio = uniqueValues.size / sample.length;
    if (uniqueRatio < 0.5 || uniqueValues.size <= 20) {
      return { type: 'categorical', subType: uniqueValues.size === 2 ? 'binary' : 'nominal' };
    }

    return { type: 'text' };
  }

  private profileColumn(name: string, values: any[], colType: { type: string; subType?: string }): ColumnProfile {
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    const missing = values.length - nonNull.length;
    const unique = new Set(nonNull).size;

    const profile: ColumnProfile = {
      name,
      type: colType.type as any,
      subType: colType.subType as any,
      stats: {
        count: nonNull.length,
        missing,
        missingPercent: (missing / values.length) * 100,
        unique,
        uniquePercent: (unique / nonNull.length) * 100
      }
    };

    if (colType.type === 'numeric') {
      const nums = nonNull.map(v => typeof v === 'number' ? v : parseFloat(String(v).replace(/,/g, ''))).filter(n => !isNaN(n));
      
      if (nums.length) {
        const q1 = percentile(nums, 25);
        const q3 = percentile(nums, 75);
        const outliers = detectOutliers(nums);
        const sw = shapiroWilk(nums);

        profile.stats = {
          ...profile.stats,
          mean: mean(nums),
          median: median(nums),
          mode: mode(nums),
          std: std(nums),
          variance: variance(nums),
          min: Math.min(...nums),
          max: Math.max(...nums),
          range: Math.max(...nums) - Math.min(...nums),
          q1,
          q3,
          iqr: q3 - q1,
          skewness: skewness(nums),
          kurtosis: kurtosis(nums),
          isNormal: sw.isNormal,
          outliers: outliers.length,
          outliersPercent: (outliers.length / nums.length) * 100
        };
      }
    } else if (colType.type === 'categorical') {
      const freq: Record<string, number> = {};
      nonNull.forEach(v => {
        const key = String(v);
        freq[key] = (freq[key] || 0) + 1;
      });

      profile.distribution = Object.entries(freq)
        .map(([value, count]) => ({
          value,
          count,
          percent: (count / nonNull.length) * 100
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 20);

      profile.stats.mode = profile.distribution[0]?.value;
    }

    return profile;
  }

  private calculateCorrelations(): void {
    if (!this.profile) return;

    const numCols = this.profile.numericColumns;
    if (numCols.length < 2) return;

    numCols.forEach(col1 => {
      const colProfile = this.profile!.columns.find(c => c.name === col1);
      if (!colProfile) return;

      const correlations: { column: string; value: number; strength: string }[] = [];
      const x = this.data.map(row => parseFloat(row[col1])).filter(n => !isNaN(n));

      numCols.forEach(col2 => {
        if (col1 === col2) return;
        const y = this.data.map(row => parseFloat(row[col2])).filter(n => !isNaN(n));
        const r = pearsonCorrelation(x, y);
        const absR = Math.abs(r);
        
        let strength = 'none';
        if (absR >= 0.8) strength = 'very_strong';
        else if (absR >= 0.6) strength = 'strong';
        else if (absR >= 0.4) strength = 'moderate';
        else if (absR >= 0.2) strength = 'weak';
        
        correlations.push({ column: col2, value: r, strength });
      });

      colProfile.correlations = correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    });
  }

  private calculateQualityScore(columns: ColumnProfile[], totalMissing: number, duplicates: number): number {
    let score = 100;

    // Penalize for missing values
    const missingPercent = (totalMissing / (this.data.length * columns.length)) * 100;
    score -= Math.min(30, missingPercent * 2);

    // Penalize for duplicates
    const dupPercent = (duplicates / this.data.length) * 100;
    score -= Math.min(20, dupPercent);

    // Penalize for outliers
    const avgOutlierPercent = columns
      .filter(c => c.stats.outliersPercent !== undefined)
      .reduce((sum, c) => sum + (c.stats.outliersPercent || 0), 0) / columns.length;
    score -= Math.min(15, avgOutlierPercent);

    // Penalize for high cardinality text columns
    const highCardCols = columns.filter(c => 
      c.type === 'text' && c.stats.uniquePercent && c.stats.uniquePercent > 90
    ).length;
    score -= Math.min(10, highCardCols * 2);

    return Math.max(0, Math.round(score));
  }

  private estimateMemory(): string {
    const bytes = JSON.stringify(this.data).length;
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  // Generate AI insights
  generateInsights(): DataInsight[] {
    if (!this.profile) this.profileData();
    if (!this.profile) return [];

    this.insights = [];
    let insightId = 0;

    // Missing value insights
    this.profile.columns.forEach(col => {
      if (col.stats.missingPercent > 5) {
        this.insights.push({
          id: `insight_${insightId++}`,
          category: 'quality',
          title: `High Missing Values in ${col.name}`,
          titleAr: `قيم مفقودة عالية في ${col.name}`,
          description: `${col.stats.missingPercent.toFixed(1)}% of values are missing`,
          descriptionAr: `${col.stats.missingPercent.toFixed(1)}% من القيم مفقودة`,
          importance: col.stats.missingPercent > 20 ? 0.9 : 0.7,
          affectedColumns: [col.name],
          suggestion: col.stats.missingPercent > 30 
            ? 'Consider removing this column or using advanced imputation'
            : 'Use mean/median imputation for numeric or mode for categorical',
          suggestionAr: col.stats.missingPercent > 30
            ? 'فكر في حذف هذا العمود أو استخدام تعويض متقدم'
            : 'استخدم التعويض بالمتوسط/الوسيط للرقمي أو المنوال للفئوي'
        });
      }
    });

    // Outlier insights
    this.profile.columns.forEach(col => {
      if (col.type === 'numeric' && col.stats.outliersPercent && col.stats.outliersPercent > 2) {
        this.insights.push({
          id: `insight_${insightId++}`,
          category: 'anomaly',
          title: `Outliers Detected in ${col.name}`,
          titleAr: `قيم شاذة في ${col.name}`,
          description: `${col.stats.outliers} outliers (${col.stats.outliersPercent?.toFixed(1)}%) detected`,
          descriptionAr: `تم اكتشاف ${col.stats.outliers} قيمة شاذة (${col.stats.outliersPercent?.toFixed(1)}%)`,
          importance: col.stats.outliersPercent > 10 ? 0.85 : 0.6,
          affectedColumns: [col.name],
          suggestion: 'Review outliers - they may be errors or important extreme cases',
          suggestionAr: 'راجع القيم الشاذة - قد تكون أخطاء أو حالات متطرفة مهمة',
          visualType: 'boxplot'
        });
      }
    });

    // Distribution insights
    this.profile.columns.forEach(col => {
      if (col.type === 'numeric' && col.stats.skewness !== undefined) {
        const sk = col.stats.skewness;
        if (Math.abs(sk) > 1) {
          this.insights.push({
            id: `insight_${insightId++}`,
            category: 'distribution',
            title: `${sk > 0 ? 'Right' : 'Left'}-Skewed Distribution in ${col.name}`,
            titleAr: `توزيع ملتوي ${sk > 0 ? 'يميناً' : 'يساراً'} في ${col.name}`,
            description: `Skewness = ${sk.toFixed(2)}. Consider log transformation`,
            descriptionAr: `الالتواء = ${sk.toFixed(2)}. فكر في التحويل اللوغاريتمي`,
            importance: 0.65,
            affectedColumns: [col.name],
            suggestion: sk > 0 ? 'Apply log or sqrt transformation' : 'Apply square or exponential transformation',
            suggestionAr: sk > 0 ? 'طبق تحويل لوغاريتمي أو جذر تربيعي' : 'طبق تحويل تربيعي أو أسي',
            visualType: 'histogram'
          });
        }
      }
    });

    // Correlation insights
    this.profile.columns.forEach(col => {
      if (col.correlations) {
        col.correlations.forEach(corr => {
          if (Math.abs(corr.value) > 0.7) {
            // Check if already added
            const exists = this.insights.some(i => 
              i.category === 'correlation' && 
              i.affectedColumns.includes(col.name) && 
              i.affectedColumns.includes(corr.column)
            );
            if (!exists) {
              this.insights.push({
                id: `insight_${insightId++}`,
                category: 'correlation',
                title: `Strong ${corr.value > 0 ? 'Positive' : 'Negative'} Correlation`,
                titleAr: `ارتباط قوي ${corr.value > 0 ? 'طردي' : 'عكسي'}`,
                description: `${col.name} and ${corr.column} have r = ${corr.value.toFixed(3)}`,
                descriptionAr: `${col.name} و ${corr.column} لديهما معامل ارتباط = ${corr.value.toFixed(3)}`,
                importance: Math.abs(corr.value),
                affectedColumns: [col.name, corr.column],
                suggestion: Math.abs(corr.value) > 0.9 
                  ? 'Consider removing one variable to avoid multicollinearity'
                  : 'May be useful for prediction or further analysis',
                suggestionAr: Math.abs(corr.value) > 0.9
                  ? 'فكر في إزالة أحد المتغيرين لتجنب التعددية الخطية'
                  : 'قد يكون مفيداً للتنبؤ أو التحليل المتقدم',
                visualType: 'scatter'
              });
            }
          }
        });
      }
    });

    // Normality insights
    this.profile.columns.forEach(col => {
      if (col.type === 'numeric' && col.stats.isNormal !== undefined && !col.stats.isNormal) {
        this.insights.push({
          id: `insight_${insightId++}`,
          category: 'distribution',
          title: `Non-Normal Distribution in ${col.name}`,
          titleAr: `توزيع غير طبيعي في ${col.name}`,
          description: 'Shapiro-Wilk test indicates non-normality',
          descriptionAr: 'اختبار شابيرو-ويلك يشير إلى عدم الطبيعية',
          importance: 0.6,
          affectedColumns: [col.name],
          suggestion: 'Use non-parametric tests or transform the data',
          suggestionAr: 'استخدم اختبارات لامعلمية أو حول البيانات',
          visualType: 'qq-plot'
        });
      }
    });

    // Sort by importance
    this.insights.sort((a, b) => b.importance - a.importance);

    return this.insights;
  }

  // Recommend statistical tests
  recommendTests(dependent?: string, independent?: string): TestRecommendation[] {
    if (!this.profile) this.profileData();
    if (!this.profile) return [];

    const recommendations: TestRecommendation[] = [];
    const depCol = dependent ? this.profile.columns.find(c => c.name === dependent) : null;
    const indCol = independent ? this.profile.columns.find(c => c.name === independent) : null;

    // Two numeric variables - correlation/regression
    if ((!dependent && !independent) || (depCol?.type === 'numeric' && indCol?.type === 'numeric')) {
      const isNormal = depCol?.stats.isNormal !== false && indCol?.stats.isNormal !== false;
      
      recommendations.push({
        testName: 'Pearson Correlation',
        testNameAr: 'ارتباط بيرسون',
        category: 'Correlation',
        categoryAr: 'الارتباط',
        score: isNormal ? 95 : 75,
        reason: 'Both variables are numeric. Pearson measures linear relationship.',
        reasonAr: 'كلا المتغيرين رقمي. بيرسون يقيس العلاقة الخطية.',
        requirements: ['Two numeric variables', 'Linear relationship'],
        requirementsAr: ['متغيران رقميان', 'علاقة خطية'],
        assumptions: [
          { name: 'Normality', nameAr: 'التوزيع الطبيعي', met: isNormal, details: isNormal ? 'Assumed normal' : 'May not be normal' },
          { name: 'Linearity', nameAr: 'الخطية', met: true, details: 'Check scatter plot' }
        ],
        alternative: 'Spearman Correlation',
        alternativeAr: 'ارتباط سبيرمان'
      });

      recommendations.push({
        testName: 'Spearman Correlation',
        testNameAr: 'ارتباط سبيرمان',
        category: 'Correlation',
        categoryAr: 'الارتباط',
        score: isNormal ? 85 : 95,
        reason: 'Non-parametric alternative. Works with monotonic relationships.',
        reasonAr: 'بديل لامعلمي. يعمل مع العلاقات الرتيبة.',
        requirements: ['Two ordinal or numeric variables'],
        requirementsAr: ['متغيران ترتيبيان أو رقميان'],
        assumptions: [
          { name: 'Monotonic relationship', nameAr: 'علاقة رتيبة', met: true, details: 'Does not require linearity' }
        ]
      });

      recommendations.push({
        testName: 'Linear Regression',
        testNameAr: 'الانحدار الخطي',
        category: 'Regression',
        categoryAr: 'الانحدار',
        score: isNormal ? 90 : 70,
        reason: 'Predicts dependent variable from independent variable(s).',
        reasonAr: 'يتنبأ بالمتغير التابع من المتغير(ات) المستقل(ة).',
        requirements: ['Numeric dependent variable', 'One or more predictors'],
        requirementsAr: ['متغير تابع رقمي', 'متنبئ واحد أو أكثر'],
        assumptions: [
          { name: 'Normality of residuals', nameAr: 'طبيعية البواقي', met: true, details: 'Check after fitting' },
          { name: 'Homoscedasticity', nameAr: 'تجانس التباين', met: true, details: 'Check residual plot' },
          { name: 'Independence', nameAr: 'الاستقلالية', met: true, details: 'Assumed' }
        ]
      });
    }

    // Numeric vs Categorical - t-test or ANOVA
    if ((depCol?.type === 'numeric' && indCol?.type === 'categorical') ||
        (depCol?.type === 'categorical' && indCol?.type === 'numeric')) {
      const numCol = depCol?.type === 'numeric' ? depCol : indCol;
      const catCol = depCol?.type === 'categorical' ? depCol : indCol;
      const groups = catCol?.stats.unique || 2;
      const isNormal = numCol?.stats.isNormal !== false;

      if (groups === 2) {
        recommendations.push({
          testName: 'Independent Samples T-Test',
          testNameAr: 'اختبار ت للعينات المستقلة',
          category: 'Comparison',
          categoryAr: 'المقارنة',
          score: isNormal ? 95 : 70,
          reason: 'Compares means of two independent groups.',
          reasonAr: 'يقارن متوسطي مجموعتين مستقلتين.',
          requirements: ['Numeric outcome', 'Two groups'],
          requirementsAr: ['ناتج رقمي', 'مجموعتان'],
          assumptions: [
            { name: 'Normality', nameAr: 'التوزيع الطبيعي', met: isNormal, details: isNormal ? 'Data appears normal' : 'Data may not be normal' },
            { name: 'Equal variances', nameAr: 'تساوي التباينات', met: true, details: 'Use Levene test to verify' }
          ],
          alternative: 'Mann-Whitney U Test',
          alternativeAr: 'اختبار مان-ويتني'
        });

        recommendations.push({
          testName: 'Mann-Whitney U Test',
          testNameAr: 'اختبار مان-ويتني',
          category: 'Comparison',
          categoryAr: 'المقارنة',
          score: isNormal ? 80 : 95,
          reason: 'Non-parametric alternative to t-test.',
          reasonAr: 'بديل لامعلمي لاختبار ت.',
          requirements: ['Ordinal or numeric outcome', 'Two groups'],
          requirementsAr: ['ناتج ترتيبي أو رقمي', 'مجموعتان'],
          assumptions: [
            { name: 'Independence', nameAr: 'الاستقلالية', met: true, details: 'Groups are independent' }
          ]
        });
      } else if (groups > 2) {
        recommendations.push({
          testName: 'One-Way ANOVA',
          testNameAr: 'تحليل التباين الأحادي',
          category: 'Comparison',
          categoryAr: 'المقارنة',
          score: isNormal ? 95 : 70,
          reason: 'Compares means across multiple groups.',
          reasonAr: 'يقارن المتوسطات عبر مجموعات متعددة.',
          requirements: ['Numeric outcome', 'Three or more groups'],
          requirementsAr: ['ناتج رقمي', 'ثلاث مجموعات أو أكثر'],
          assumptions: [
            { name: 'Normality', nameAr: 'التوزيع الطبيعي', met: isNormal, details: 'Per group normality' },
            { name: 'Homogeneity of variances', nameAr: 'تجانس التباينات', met: true, details: 'Use Levene test' }
          ],
          alternative: 'Kruskal-Wallis Test',
          alternativeAr: 'اختبار كروسكال-واليس'
        });

        recommendations.push({
          testName: 'Kruskal-Wallis Test',
          testNameAr: 'اختبار كروسكال-واليس',
          category: 'Comparison',
          categoryAr: 'المقارنة',
          score: isNormal ? 80 : 95,
          reason: 'Non-parametric alternative to ANOVA.',
          reasonAr: 'بديل لامعلمي لتحليل التباين.',
          requirements: ['Ordinal or numeric outcome', 'Three or more groups'],
          requirementsAr: ['ناتج ترتيبي أو رقمي', 'ثلاث مجموعات أو أكثر'],
          assumptions: [
            { name: 'Independence', nameAr: 'الاستقلالية', met: true, details: 'Groups are independent' }
          ]
        });
      }
    }

    // Two categorical variables - Chi-square
    if (depCol?.type === 'categorical' && indCol?.type === 'categorical') {
      recommendations.push({
        testName: 'Chi-Square Test of Independence',
        testNameAr: 'اختبار كاي تربيع للاستقلالية',
        category: 'Association',
        categoryAr: 'الارتباط',
        score: 95,
        reason: 'Tests association between two categorical variables.',
        reasonAr: 'يختبر العلاقة بين متغيرين فئويين.',
        requirements: ['Two categorical variables', 'Expected frequencies ≥ 5'],
        requirementsAr: ['متغيران فئويان', 'التكرارات المتوقعة ≥ 5'],
        assumptions: [
          { name: 'Expected frequencies', nameAr: 'التكرارات المتوقعة', met: true, details: 'Check expected cell counts' },
          { name: 'Independence', nameAr: 'الاستقلالية', met: true, details: 'Observations are independent' }
        ],
        alternative: "Fisher's Exact Test",
        alternativeAr: 'اختبار فيشر الدقيق'
      });
    }

    // Sort by score
    recommendations.sort((a, b) => b.score - a.score);

    return recommendations;
  }

  // Generate AI recommendations
  generateRecommendations(): AIRecommendation[] {
    if (!this.profile) this.profileData();
    if (!this.insights.length) this.generateInsights();

    this.recommendations = [];

    // Data cleaning recommendations
    if (this.profile && this.profile.missingPercent > 0) {
      this.recommendations.push({
        type: 'cleaning',
        title: 'Handle Missing Values',
        titleAr: 'معالجة القيم المفقودة',
        description: `${this.profile.missingPercent.toFixed(1)}% of data is missing. Consider imputation.`,
        descriptionAr: `${this.profile.missingPercent.toFixed(1)}% من البيانات مفقودة. فكر في التعويض.`,
        confidence: 0.95,
        priority: this.profile.missingPercent > 10 ? 'high' : 'medium'
      });
    }

    if (this.profile && this.profile.duplicatePercent > 0) {
      this.recommendations.push({
        type: 'cleaning',
        title: 'Remove Duplicate Rows',
        titleAr: 'إزالة الصفوف المكررة',
        description: `${this.profile.duplicateRows} duplicate rows (${this.profile.duplicatePercent.toFixed(1)}%) found.`,
        descriptionAr: `تم العثور على ${this.profile.duplicateRows} صف مكرر (${this.profile.duplicatePercent.toFixed(1)}%).`,
        confidence: 0.9,
        priority: this.profile.duplicatePercent > 5 ? 'high' : 'low'
      });
    }

    // Analysis recommendations based on data types
    if (this.profile) {
      if (this.profile.numericColumns.length >= 2) {
        this.recommendations.push({
          type: 'analysis',
          title: 'Correlation Analysis',
          titleAr: 'تحليل الارتباط',
          description: `Analyze relationships between ${this.profile.numericColumns.length} numeric variables.`,
          descriptionAr: `تحليل العلاقات بين ${this.profile.numericColumns.length} متغير رقمي.`,
          confidence: 0.85,
          priority: 'medium'
        });
      }

      if (this.profile.numericColumns.length >= 1 && this.profile.categoricalColumns.length >= 1) {
        this.recommendations.push({
          type: 'test',
          title: 'Group Comparison',
          titleAr: 'مقارنة المجموعات',
          description: 'Compare numeric outcomes across categorical groups.',
          descriptionAr: 'قارن النتائج الرقمية عبر المجموعات الفئوية.',
          confidence: 0.85,
          priority: 'medium'
        });
      }

      if (this.profile.categoricalColumns.length >= 2) {
        this.recommendations.push({
          type: 'test',
          title: 'Association Analysis',
          titleAr: 'تحليل الارتباط الفئوي',
          description: 'Test associations between categorical variables using Chi-square.',
          descriptionAr: 'اختبر العلاقات بين المتغيرات الفئوية باستخدام كاي تربيع.',
          confidence: 0.8,
          priority: 'medium'
        });
      }
    }

    // Visualization recommendations
    this.insights.forEach(insight => {
      if (insight.visualType) {
        this.recommendations.push({
          type: 'visualization',
          title: `Create ${insight.visualType} for ${insight.affectedColumns.join(', ')}`,
          titleAr: `إنشاء رسم ${insight.visualType} لـ ${insight.affectedColumns.join(', ')}`,
          description: insight.description,
          descriptionAr: insight.descriptionAr,
          confidence: insight.importance,
          priority: insight.importance > 0.7 ? 'high' : 'medium'
        });
      }
    });

    // Sort by priority and confidence
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    this.recommendations.sort((a, b) => {
      const pDiff = priorityOrder[a.priority] - priorityOrder[b.priority];
      return pDiff !== 0 ? pDiff : b.confidence - a.confidence;
    });

    return this.recommendations;
  }

  // Get summary
  getSummary(): { profile: DataProfile | null; insights: DataInsight[]; recommendations: AIRecommendation[] } {
    if (!this.profile) this.profileData();
    if (!this.insights.length) this.generateInsights();
    if (!this.recommendations.length) this.generateRecommendations();

    return {
      profile: this.profile,
      insights: this.insights,
      recommendations: this.recommendations
    };
  }
}

export default AIEngine;
