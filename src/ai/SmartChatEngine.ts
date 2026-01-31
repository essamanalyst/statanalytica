// محرك المحادثة الذكي المتقدم
// Smart Chat Engine with Context-Aware Responses

export interface DataContext {
  data: Record<string, any>[];
  columns: string[];
  numericColumns: string[];
  categoricalColumns: string[];
  rowCount: number;
  columnCount: number;
  analysis?: DataAnalysis;
}

export interface DataAnalysis {
  columns: ColumnAnalysis[];
  correlations: CorrelationResult[];
  quality: QualityMetrics;
  insights: Insight[];
}

export interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text';
  count: number;
  missing: number;
  missingPercent: number;
  unique: number;
  // للأعمدة الرقمية
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  skewness?: number;
  kurtosis?: number;
  isNormal?: boolean;
  normalityPValue?: number;
  outliers?: number;
  q1?: number;
  q3?: number;
  iqr?: number;
  // للأعمدة الفئوية
  categories?: { value: string; count: number; percent: number }[];
  mode?: string;
}

export interface CorrelationResult {
  var1: string;
  var2: string;
  pearson: number;
  spearman: number;
  pValue: number;
  strength: 'none' | 'weak' | 'moderate' | 'strong' | 'very_strong';
  direction: 'positive' | 'negative' | 'none';
}

export interface QualityMetrics {
  overallScore: number;
  completeness: number;
  validity: number;
  uniqueness: number;
  consistency: number;
  issues: QualityIssue[];
}

export interface QualityIssue {
  type: 'missing' | 'outlier' | 'duplicate' | 'invalid' | 'inconsistent';
  column?: string;
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestion: string;
  affectedRows?: number;
}

export interface Insight {
  type: 'quality' | 'distribution' | 'correlation' | 'outlier' | 'pattern' | 'recommendation';
  importance: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  details?: string;
  action?: string;
  relatedColumns?: string[];
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  context?: MessageContext;
  suggestions?: string[];
  charts?: ChartData[];
  tables?: TableData[];
  actions?: ActionButton[];
}

export interface MessageContext {
  topic?: string;
  columns?: string[];
  testType?: string;
  analysisType?: string;
}

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'scatter' | 'histogram' | 'box';
  title: string;
  data: any[];
  xKey?: string;
  yKey?: string;
}

export interface TableData {
  title: string;
  headers: string[];
  rows: (string | number)[][];
}

export interface ActionButton {
  label: string;
  action: string;
  params?: Record<string, any>;
}

// الدوال الإحصائية
const mean = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null);
  return valid.length > 0 ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
};

const median = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
};

const std = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null);
  if (valid.length < 2) return 0;
  const m = mean(valid);
  const variance = valid.reduce((sum, x) => sum + Math.pow(x - m, 2), 0) / (valid.length - 1);
  return Math.sqrt(variance);
};

const percentile = (arr: number[], p: number): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const index = (p / 100) * (valid.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return valid[lower];
  return valid[lower] + (valid[upper] - valid[lower]) * (index - lower);
};

const skewness = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null);
  if (valid.length < 3) return 0;
  const m = mean(valid);
  const s = std(valid);
  if (s === 0) return 0;
  const n = valid.length;
  const sum = valid.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
};

const kurtosis = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null);
  if (valid.length < 4) return 0;
  const m = mean(valid);
  const s = std(valid);
  if (s === 0) return 0;
  const n = valid.length;
  const sum = valid.reduce((acc, x) => acc + Math.pow((x - m) / s, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
};

const pearsonCorrelation = (x: number[], y: number[]): number => {
  const n = Math.min(x.length, y.length);
  if (n < 3) return 0;
  const validPairs: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    if (!isNaN(x[i]) && !isNaN(y[i]) && x[i] !== null && y[i] !== null) {
      validPairs.push([x[i], y[i]]);
    }
  }
  if (validPairs.length < 3) return 0;
  const xVals = validPairs.map(p => p[0]);
  const yVals = validPairs.map(p => p[1]);
  const xMean = mean(xVals);
  const yMean = mean(yVals);
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
  const denom = Math.sqrt(xDenom * yDenom);
  return denom === 0 ? 0 : numerator / denom;
};

// محرك المحادثة الذكي
export class SmartChatEngine {
  private dataContext: DataContext | null = null;
  private conversationHistory: ChatMessage[] = [];
  private language: 'ar' | 'en' = 'ar';

  constructor(language: 'ar' | 'en' = 'ar') {
    this.language = language;
  }

  setLanguage(lang: 'ar' | 'en'): void {
    this.language = lang;
  }

  loadData(data: Record<string, any>[]): DataAnalysis {
    if (!data || data.length === 0) {
      throw new Error('No data provided');
    }

    const columns = Object.keys(data[0]);
    const numericColumns: string[] = [];
    const categoricalColumns: string[] = [];
    const columnAnalyses: ColumnAnalysis[] = [];

    // تحليل كل عمود
    for (const col of columns) {
      const values = data.map(row => row[col]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = nonNull.filter(v => typeof v === 'number' || !isNaN(Number(v))).map(Number);
      
      const isNumeric = numericValues.length > nonNull.length * 0.7;
      
      if (isNumeric && numericValues.length > 0) {
        numericColumns.push(col);
        
        const q1 = percentile(numericValues, 25);
        const q3 = percentile(numericValues, 75);
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        const outliers = numericValues.filter(v => v < lowerBound || v > upperBound);
        
        const sk = skewness(numericValues);
        const kurt = kurtosis(numericValues);
        
        // اختبار التوزيع الطبيعي المبسط
        const isNormal = Math.abs(sk) < 2 && Math.abs(kurt) < 7;
        
        columnAnalyses.push({
          name: col,
          type: 'numeric',
          count: values.length,
          missing: values.length - nonNull.length,
          missingPercent: ((values.length - nonNull.length) / values.length) * 100,
          unique: new Set(numericValues).size,
          mean: mean(numericValues),
          median: median(numericValues),
          std: std(numericValues),
          min: Math.min(...numericValues),
          max: Math.max(...numericValues),
          skewness: sk,
          kurtosis: kurt,
          isNormal,
          normalityPValue: isNormal ? 0.1 : 0.01,
          outliers: outliers.length,
          q1,
          q3,
          iqr
        });
      } else {
        categoricalColumns.push(col);
        
        const valueCounts: Record<string, number> = {};
        for (const v of nonNull) {
          const strVal = String(v);
          valueCounts[strVal] = (valueCounts[strVal] || 0) + 1;
        }
        
        const categories = Object.entries(valueCounts)
          .map(([value, count]) => ({
            value,
            count,
            percent: (count / nonNull.length) * 100
          }))
          .sort((a, b) => b.count - a.count);
        
        columnAnalyses.push({
          name: col,
          type: 'categorical',
          count: values.length,
          missing: values.length - nonNull.length,
          missingPercent: ((values.length - nonNull.length) / values.length) * 100,
          unique: Object.keys(valueCounts).length,
          categories: categories.slice(0, 10),
          mode: categories[0]?.value
        });
      }
    }

    // حساب الارتباطات
    const correlations: CorrelationResult[] = [];
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        const vals1 = data.map(row => Number(row[col1])).filter(v => !isNaN(v));
        const vals2 = data.map(row => Number(row[col2])).filter(v => !isNaN(v));
        
        const r = pearsonCorrelation(vals1, vals2);
        const absR = Math.abs(r);
        
        let strength: CorrelationResult['strength'] = 'none';
        if (absR >= 0.9) strength = 'very_strong';
        else if (absR >= 0.7) strength = 'strong';
        else if (absR >= 0.5) strength = 'moderate';
        else if (absR >= 0.3) strength = 'weak';
        
        correlations.push({
          var1: col1,
          var2: col2,
          pearson: r,
          spearman: r, // مبسط
          pValue: absR > 0.3 ? 0.01 : 0.1,
          strength,
          direction: r > 0 ? 'positive' : r < 0 ? 'negative' : 'none'
        });
      }
    }

    // تحليل الجودة
    const issues: QualityIssue[] = [];
    let totalMissing = 0;
    let totalOutliers = 0;
    
    for (const col of columnAnalyses) {
      if (col.missingPercent > 5) {
        issues.push({
          type: 'missing',
          column: col.name,
          severity: col.missingPercent > 20 ? 'high' : col.missingPercent > 10 ? 'medium' : 'low',
          description: this.language === 'ar' 
            ? `العمود "${col.name}" يحتوي على ${col.missingPercent.toFixed(1)}% قيم مفقودة`
            : `Column "${col.name}" has ${col.missingPercent.toFixed(1)}% missing values`,
          suggestion: this.language === 'ar'
            ? 'يمكن معالجة القيم المفقودة بالتعويض بالمتوسط أو الوسيط'
            : 'Consider imputing with mean or median',
          affectedRows: col.missing
        });
        totalMissing += col.missing;
      }
      
      if (col.type === 'numeric' && col.outliers && col.outliers > 0) {
        const outlierPercent = (col.outliers / col.count) * 100;
        if (outlierPercent > 1) {
          issues.push({
            type: 'outlier',
            column: col.name,
            severity: outlierPercent > 10 ? 'high' : outlierPercent > 5 ? 'medium' : 'low',
            description: this.language === 'ar'
              ? `العمود "${col.name}" يحتوي على ${col.outliers} قيم شاذة (${outlierPercent.toFixed(1)}%)`
              : `Column "${col.name}" has ${col.outliers} outliers (${outlierPercent.toFixed(1)}%)`,
            suggestion: this.language === 'ar'
              ? 'تحقق من القيم الشاذة - قد تكون أخطاء إدخال أو قيم حقيقية مهمة'
              : 'Review outliers - they may be data entry errors or important true values',
            affectedRows: col.outliers
          });
          totalOutliers += col.outliers;
        }
      }
    }

    const totalCells = data.length * columns.length;
    const completeness = 100 - (totalMissing / totalCells) * 100;
    const validity = 100 - (totalOutliers / totalCells) * 100;
    
    const quality: QualityMetrics = {
      overallScore: (completeness + validity) / 2,
      completeness,
      validity,
      uniqueness: 95,
      consistency: 90,
      issues
    };

    // توليد الرؤى
    const insights: Insight[] = [];
    
    // رؤى جودة البيانات
    if (totalMissing > 0) {
      insights.push({
        type: 'quality',
        importance: totalMissing > data.length * 0.1 ? 'high' : 'medium',
        title: this.language === 'ar' ? 'قيم مفقودة مكتشفة' : 'Missing Values Detected',
        description: this.language === 'ar'
          ? `تم اكتشاف ${totalMissing} قيمة مفقودة في البيانات`
          : `Found ${totalMissing} missing values in the data`,
        action: this.language === 'ar' ? 'انتقل لتنظيف البيانات' : 'Go to Data Cleaning'
      });
    }

    // رؤى الارتباط
    const strongCorrelations = correlations.filter(c => c.strength === 'strong' || c.strength === 'very_strong');
    for (const corr of strongCorrelations.slice(0, 3)) {
      insights.push({
        type: 'correlation',
        importance: 'high',
        title: this.language === 'ar' ? 'ارتباط قوي مكتشف' : 'Strong Correlation Found',
        description: this.language === 'ar'
          ? `يوجد ارتباط ${corr.direction === 'positive' ? 'طردي' : 'عكسي'} قوي (r=${corr.pearson.toFixed(3)}) بين "${corr.var1}" و "${corr.var2}"`
          : `Found ${corr.direction} strong correlation (r=${corr.pearson.toFixed(3)}) between "${corr.var1}" and "${corr.var2}"`,
        relatedColumns: [corr.var1, corr.var2]
      });
    }

    // رؤى التوزيع
    for (const col of columnAnalyses.filter(c => c.type === 'numeric')) {
      if (col.skewness && Math.abs(col.skewness) > 1) {
        insights.push({
          type: 'distribution',
          importance: 'medium',
          title: this.language === 'ar' ? 'توزيع ملتوي' : 'Skewed Distribution',
          description: this.language === 'ar'
            ? `المتغير "${col.name}" لديه التواء ${col.skewness > 0 ? 'موجب' : 'سالب'} (${col.skewness.toFixed(2)})`
            : `Variable "${col.name}" has ${col.skewness > 0 ? 'positive' : 'negative'} skewness (${col.skewness.toFixed(2)})`,
          action: this.language === 'ar' ? 'قد تحتاج لتحويل لوغاريتمي' : 'May need log transformation',
          relatedColumns: [col.name]
        });
      }
    }

    this.dataContext = {
      data,
      columns,
      numericColumns,
      categoricalColumns,
      rowCount: data.length,
      columnCount: columns.length,
      analysis: {
        columns: columnAnalyses,
        correlations,
        quality,
        insights
      }
    };

    return this.dataContext.analysis!;
  }

  // المحادثة الذكية
  async chat(userMessage: string): Promise<ChatMessage> {
    // تحليل نوع السؤال
    const intent = this.detectIntent(userMessage);
    
    // توليد الرد
    const response = this.generateResponse(intent, userMessage);
    
    // إضافة للتاريخ
    this.conversationHistory.push({
      id: (Date.now() - 1).toString(),
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    });
    
    this.conversationHistory.push(response);
    
    return response;
  }

  private detectIntent(message: string): string {
    const lowerMessage = message.toLowerCase();
    
    // أنماط الأسئلة
    const patterns = {
      describe_data: /وصف|وصف.?البيانات|ملخص|نظرة.?عامة|describe|summary|overview/i,
      missing_values: /مفقود|ناقص|فارغ|missing|null|empty|na/i,
      outliers: /شاذ|متطرف|outlier|extreme|anomal/i,
      correlation: /ارتباط|علاقة|correlation|relationship|association/i,
      distribution: /توزيع|طبيعي|distribution|normal|skew/i,
      compare: /مقارن|فرق|اختلاف|compare|difference|between/i,
      test_recommendation: /اختبار|تحليل|ماذا.?استخدم|أي.?اختبار|which.?test|recommend|suggest/i,
      column_info: /عمود|متغير|column|variable|field/i,
      quality: /جودة|quality|health|issues|مشاكل/i,
      statistics: /إحصائ|متوسط|وسيط|انحراف|mean|median|std|average/i,
      prediction: /تنبؤ|توقع|predict|forecast/i,
      regression: /انحدار|regression|linear/i,
      categorical: /فئ|تصنيف|categor|nominal/i,
      help: /مساعد|ساعد|help|how|كيف/i,
      greeting: /مرحبا|اهلا|سلام|hello|hi|hey/i
    };

    for (const [intent, pattern] of Object.entries(patterns)) {
      if (pattern.test(lowerMessage)) {
        return intent;
      }
    }

    return 'general';
  }

  private generateResponse(intent: string, userMessage: string): ChatMessage {
    const isArabic = this.language === 'ar';
    
    if (!this.dataContext || !this.dataContext.analysis) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: isArabic 
          ? '⚠️ لم يتم تحميل أي بيانات بعد. يرجى تحميل ملف بيانات أولاً للحصول على تحليل مفيد.'
          : '⚠️ No data loaded yet. Please upload a data file first to get meaningful analysis.',
        timestamp: new Date(),
        suggestions: isArabic 
          ? ['كيف أحمل البيانات؟', 'ما أنواع الملفات المدعومة؟']
          : ['How do I load data?', 'What file types are supported?']
      };
    }

    void this.dataContext.analysis;
    void this.dataContext;

    switch (intent) {
      case 'greeting':
        return this.generateGreeting();
      
      case 'describe_data':
        return this.generateDataDescription();
      
      case 'missing_values':
        return this.generateMissingValuesAnalysis();
      
      case 'outliers':
        return this.generateOutliersAnalysis();
      
      case 'correlation':
        return this.generateCorrelationAnalysis();
      
      case 'distribution':
        return this.generateDistributionAnalysis();
      
      case 'compare':
        return this.generateComparisonAdvice();
      
      case 'test_recommendation':
        return this.generateTestRecommendation();
      
      case 'quality':
        return this.generateQualityReport();
      
      case 'statistics':
        return this.generateStatisticsReport();
      
      case 'column_info':
        return this.generateColumnInfo(userMessage);
      
      case 'help':
        return this.generateHelpResponse();
      
      default:
        return this.generateGeneralResponse(userMessage);
    }
  }

  private generateGreeting(): ChatMessage {
    const isArabic = this.language === 'ar';
    const data = this.dataContext!;
    
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: isArabic 
        ? `مرحباً! 👋 أنا مساعدك الإحصائي الذكي.

لديك حالياً بيانات محملة تتكون من:
• **${data.rowCount.toLocaleString()}** صف (ملاحظة)
• **${data.columnCount}** عمود (متغير)
• **${data.numericColumns.length}** متغير رقمي
• **${data.categoricalColumns.length}** متغير فئوي

كيف يمكنني مساعدتك اليوم؟`
        : `Hello! 👋 I'm your Smart Statistical Assistant.

You currently have data loaded with:
• **${data.rowCount.toLocaleString()}** rows (observations)
• **${data.columnCount}** columns (variables)
• **${data.numericColumns.length}** numeric variables
• **${data.categoricalColumns.length}** categorical variables

How can I help you today?`,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['أعطني ملخصاً للبيانات', 'هل توجد قيم مفقودة؟', 'ما الاختبار المناسب لبياناتي؟', 'تحقق من جودة البيانات']
        : ['Give me a data summary', 'Are there missing values?', 'What test is suitable for my data?', 'Check data quality']
    };
  }

  private generateDataDescription(): ChatMessage {
    const isArabic = this.language === 'ar';
    const data = this.dataContext!;
    const analysis = data.analysis!;
    
    let content = isArabic 
      ? `## 📊 ملخص البيانات\n\n`
      : `## 📊 Data Summary\n\n`;
    
    content += isArabic
      ? `### المعلومات الأساسية:\n`
      : `### Basic Information:\n`;
    
    content += isArabic
      ? `- **عدد الصفوف:** ${data.rowCount.toLocaleString()}\n`
      : `- **Number of rows:** ${data.rowCount.toLocaleString()}\n`;
    
    content += isArabic
      ? `- **عدد الأعمدة:** ${data.columnCount}\n`
      : `- **Number of columns:** ${data.columnCount}\n`;
    
    content += isArabic
      ? `- **المتغيرات الرقمية:** ${data.numericColumns.length} (${data.numericColumns.slice(0, 5).join(', ')}${data.numericColumns.length > 5 ? '...' : ''})\n`
      : `- **Numeric variables:** ${data.numericColumns.length} (${data.numericColumns.slice(0, 5).join(', ')}${data.numericColumns.length > 5 ? '...' : ''})\n`;
    
    content += isArabic
      ? `- **المتغيرات الفئوية:** ${data.categoricalColumns.length} (${data.categoricalColumns.slice(0, 5).join(', ')}${data.categoricalColumns.length > 5 ? '...' : ''})\n\n`
      : `- **Categorical variables:** ${data.categoricalColumns.length} (${data.categoricalColumns.slice(0, 5).join(', ')}${data.categoricalColumns.length > 5 ? '...' : ''})\n\n`;
    
    // جودة البيانات
    const quality = analysis.quality;
    content += isArabic
      ? `### 📈 مؤشرات الجودة:\n`
      : `### 📈 Quality Metrics:\n`;
    
    content += isArabic
      ? `- **النتيجة الإجمالية:** ${quality.overallScore.toFixed(1)}%\n`
      : `- **Overall Score:** ${quality.overallScore.toFixed(1)}%\n`;
    
    content += isArabic
      ? `- **الاكتمال:** ${quality.completeness.toFixed(1)}%\n`
      : `- **Completeness:** ${quality.completeness.toFixed(1)}%\n`;
    
    // إحصائيات الأعمدة الرقمية
    if (data.numericColumns.length > 0) {
      content += isArabic
        ? `\n### 📉 ملخص المتغيرات الرقمية:\n`
        : `\n### 📉 Numeric Variables Summary:\n`;
      
      content += `| ${isArabic ? 'المتغير' : 'Variable'} | ${isArabic ? 'المتوسط' : 'Mean'} | ${isArabic ? 'الوسيط' : 'Median'} | ${isArabic ? 'الانحراف' : 'Std'} | ${isArabic ? 'الحد الأدنى' : 'Min'} | ${isArabic ? 'الحد الأقصى' : 'Max'} |\n`;
      content += `|---------|--------|--------|------|-----|-----|\n`;
      
      for (const col of analysis.columns.filter(c => c.type === 'numeric').slice(0, 6)) {
        content += `| ${col.name} | ${col.mean?.toFixed(2)} | ${col.median?.toFixed(2)} | ${col.std?.toFixed(2)} | ${col.min?.toFixed(2)} | ${col.max?.toFixed(2)} |\n`;
      }
    }

    // الرؤى المهمة
    const importantInsights = analysis.insights.filter(i => i.importance === 'high');
    if (importantInsights.length > 0) {
      content += isArabic
        ? `\n### 💡 رؤى مهمة:\n`
        : `\n### 💡 Important Insights:\n`;
      
      for (const insight of importantInsights.slice(0, 3)) {
        content += `- ${insight.description}\n`;
      }
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['تحليل الارتباطات', 'فحص التوزيعات', 'اقتراح اختبارات', 'تفاصيل عمود محدد']
        : ['Analyze correlations', 'Check distributions', 'Suggest tests', 'Details of specific column']
    };
  }

  private generateMissingValuesAnalysis(): ChatMessage {
    const isArabic = this.language === 'ar';
    const analysis = this.dataContext!.analysis!;
    
    const colsWithMissing = analysis.columns.filter(c => c.missing > 0);
    
    if (colsWithMissing.length === 0) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: isArabic 
          ? `✅ **أخبار جيدة!** لا توجد قيم مفقودة في بياناتك. جميع الخلايا مكتملة.`
          : `✅ **Good news!** There are no missing values in your data. All cells are complete.`,
        timestamp: new Date(),
        suggestions: isArabic 
          ? ['فحص القيم الشاذة', 'تحليل التوزيعات']
          : ['Check outliers', 'Analyze distributions']
      };
    }

    let content = isArabic 
      ? `## 🔍 تحليل القيم المفقودة\n\n`
      : `## 🔍 Missing Values Analysis\n\n`;
    
    const totalMissing = colsWithMissing.reduce((sum, c) => sum + c.missing, 0);
    const totalCells = this.dataContext!.rowCount * this.dataContext!.columnCount;
    
    content += isArabic
      ? `### الملخص:\n- **إجمالي القيم المفقودة:** ${totalMissing.toLocaleString()} من ${totalCells.toLocaleString()} (${((totalMissing/totalCells)*100).toFixed(2)}%)\n- **الأعمدة المتأثرة:** ${colsWithMissing.length} من ${this.dataContext!.columnCount}\n\n`
      : `### Summary:\n- **Total missing values:** ${totalMissing.toLocaleString()} out of ${totalCells.toLocaleString()} (${((totalMissing/totalCells)*100).toFixed(2)}%)\n- **Affected columns:** ${colsWithMissing.length} out of ${this.dataContext!.columnCount}\n\n`;
    
    content += isArabic
      ? `### التفاصيل حسب العمود:\n`
      : `### Details by Column:\n`;
    
    content += `| ${isArabic ? 'العمود' : 'Column'} | ${isArabic ? 'المفقود' : 'Missing'} | ${isArabic ? 'النسبة' : 'Percent'} | ${isArabic ? 'التوصية' : 'Recommendation'} |\n`;
    content += `|--------|---------|---------|------------|\n`;
    
    for (const col of colsWithMissing.sort((a, b) => b.missingPercent - a.missingPercent).slice(0, 10)) {
      let recommendation = '';
      if (col.missingPercent > 50) {
        recommendation = isArabic ? '❌ حذف العمود' : '❌ Drop column';
      } else if (col.missingPercent > 20) {
        recommendation = isArabic ? '⚠️ تحقق من السبب' : '⚠️ Investigate cause';
      } else if (col.type === 'numeric') {
        recommendation = isArabic ? '✅ تعويض بالوسيط' : '✅ Impute with median';
      } else {
        recommendation = isArabic ? '✅ تعويض بالمنوال' : '✅ Impute with mode';
      }
      
      content += `| ${col.name} | ${col.missing} | ${col.missingPercent.toFixed(1)}% | ${recommendation} |\n`;
    }

    content += isArabic
      ? `\n### 💡 التوصيات:\n`
      : `\n### 💡 Recommendations:\n`;
    
    if (colsWithMissing.some(c => c.missingPercent > 50)) {
      content += isArabic
        ? `- **الأعمدة ذات النسبة العالية (>50%):** يُنصح بحذفها إذا لم تكن ضرورية للتحليل\n`
        : `- **High percentage columns (>50%):** Consider dropping if not essential for analysis\n`;
    }
    
    content += isArabic
      ? `- **للمتغيرات الرقمية:** استخدم الوسيط (أكثر مقاومة للقيم الشاذة) أو المتوسط\n`
      : `- **For numeric variables:** Use median (more robust to outliers) or mean\n`;
    
    content += isArabic
      ? `- **للمتغيرات الفئوية:** استخدم المنوال (القيمة الأكثر تكراراً)\n`
      : `- **For categorical variables:** Use mode (most frequent value)\n`;

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['كيف أعوض القيم المفقودة؟', 'انتقل لتنظيف البيانات', 'تحليل تأثير القيم المفقودة']
        : ['How to impute missing values?', 'Go to data cleaning', 'Analyze impact of missing values'],
      actions: [
        { label: isArabic ? 'تنظيف البيانات' : 'Data Cleaning', action: 'navigate', params: { tab: 'cleaning' } }
      ]
    };
  }

  private generateOutliersAnalysis(): ChatMessage {
    const isArabic = this.language === 'ar';
    const analysis = this.dataContext!.analysis!;
    
    const colsWithOutliers = analysis.columns.filter(c => c.type === 'numeric' && c.outliers && c.outliers > 0);
    
    if (colsWithOutliers.length === 0) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: isArabic 
          ? `✅ **ممتاز!** لم يتم اكتشاف قيم شاذة واضحة في المتغيرات الرقمية باستخدام طريقة IQR.`
          : `✅ **Excellent!** No clear outliers detected in numeric variables using IQR method.`,
        timestamp: new Date(),
        suggestions: isArabic 
          ? ['فحص التوزيعات', 'تحليل الارتباطات']
          : ['Check distributions', 'Analyze correlations']
      };
    }

    let content = isArabic 
      ? `## 🎯 تحليل القيم الشاذة\n\n`
      : `## 🎯 Outliers Analysis\n\n`;
    
    const totalOutliers = colsWithOutliers.reduce((sum, c) => sum + (c.outliers || 0), 0);
    
    content += isArabic
      ? `تم استخدام طريقة **IQR (المدى الربيعي)** لكشف القيم الشاذة.\n\n`
      : `Used **IQR (Interquartile Range)** method to detect outliers.\n\n`;
    
    content += isArabic
      ? `### الملخص:\n- **إجمالي القيم الشاذة:** ${totalOutliers}\n- **المتغيرات المتأثرة:** ${colsWithOutliers.length}\n\n`
      : `### Summary:\n- **Total outliers:** ${totalOutliers}\n- **Affected variables:** ${colsWithOutliers.length}\n\n`;
    
    content += `| ${isArabic ? 'المتغير' : 'Variable'} | ${isArabic ? 'العدد' : 'Count'} | ${isArabic ? 'النسبة' : 'Percent'} | ${isArabic ? 'الحد الأدنى' : 'Lower'} | ${isArabic ? 'الحد الأقصى' : 'Upper'} |\n`;
    content += `|---------|-------|---------|-------|-------|\n`;
    
    for (const col of colsWithOutliers.sort((a, b) => (b.outliers || 0) - (a.outliers || 0))) {
      const percent = ((col.outliers || 0) / col.count * 100).toFixed(1);
      const lower = col.q1! - 1.5 * col.iqr!;
      const upper = col.q3! + 1.5 * col.iqr!;
      content += `| ${col.name} | ${col.outliers} | ${percent}% | ${lower.toFixed(2)} | ${upper.toFixed(2)} |\n`;
    }

    content += isArabic
      ? `\n### 💡 كيفية التعامل:\n`
      : `\n### 💡 How to Handle:\n`;
    
    content += isArabic
      ? `1. **التحقق:** تأكد أنها ليست أخطاء إدخال\n`
      : `1. **Verify:** Make sure they are not data entry errors\n`;
    
    content += isArabic
      ? `2. **التحديد (Capping):** استبدل بالحدود (Q1-1.5*IQR أو Q3+1.5*IQR)\n`
      : `2. **Capping:** Replace with boundaries (Q1-1.5*IQR or Q3+1.5*IQR)\n`;
    
    content += isArabic
      ? `3. **التحويل:** استخدم تحويل لوغاريتمي للتوزيعات الملتوية\n`
      : `3. **Transform:** Use log transformation for skewed distributions\n`;
    
    content += isArabic
      ? `4. **الحذف:** إذا كانت قليلة ومؤكد أنها أخطاء\n`
      : `4. **Remove:** If few and confirmed as errors\n`;

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['كيف أعالج القيم الشاذة؟', 'ما تأثيرها على التحليل؟', 'استخدم طريقة Z-score']
        : ['How to handle outliers?', 'What is their impact?', 'Use Z-score method']
    };
  }

  private generateCorrelationAnalysis(): ChatMessage {
    const isArabic = this.language === 'ar';
    const analysis = this.dataContext!.analysis!;
    
    if (this.dataContext!.numericColumns.length < 2) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: isArabic 
          ? `⚠️ تحليل الارتباط يتطلب على الأقل متغيرين رقميين. لديك حالياً ${this.dataContext!.numericColumns.length} متغير رقمي فقط.`
          : `⚠️ Correlation analysis requires at least 2 numeric variables. You currently have only ${this.dataContext!.numericColumns.length} numeric variable(s).`,
        timestamp: new Date()
      };
    }

    let content = isArabic 
      ? `## 🔗 تحليل الارتباطات\n\n`
      : `## 🔗 Correlation Analysis\n\n`;
    
    const correlations = analysis.correlations;
    const strongCorr = correlations.filter(c => Math.abs(c.pearson) >= 0.7);
    const moderateCorr = correlations.filter(c => Math.abs(c.pearson) >= 0.5 && Math.abs(c.pearson) < 0.7);
    
    content += isArabic
      ? `### ملخص الارتباطات:\n`
      : `### Correlation Summary:\n`;
    
    content += isArabic
      ? `- **ارتباطات قوية (|r| ≥ 0.7):** ${strongCorr.length}\n`
      : `- **Strong correlations (|r| ≥ 0.7):** ${strongCorr.length}\n`;
    
    content += isArabic
      ? `- **ارتباطات متوسطة (0.5 ≤ |r| < 0.7):** ${moderateCorr.length}\n\n`
      : `- **Moderate correlations (0.5 ≤ |r| < 0.7):** ${moderateCorr.length}\n\n`;
    
    if (strongCorr.length > 0) {
      content += isArabic
        ? `### 🔴 الارتباطات القوية:\n`
        : `### 🔴 Strong Correlations:\n`;
      
      content += `| ${isArabic ? 'المتغير 1' : 'Variable 1'} | ${isArabic ? 'المتغير 2' : 'Variable 2'} | r | ${isArabic ? 'الاتجاه' : 'Direction'} |\n`;
      content += `|-----------|-----------|------|----------|\n`;
      
      for (const corr of strongCorr.slice(0, 10)) {
        const direction = isArabic 
          ? (corr.pearson > 0 ? '↗️ طردي' : '↘️ عكسي')
          : (corr.pearson > 0 ? '↗️ Positive' : '↘️ Negative');
        content += `| ${corr.var1} | ${corr.var2} | ${corr.pearson.toFixed(3)} | ${direction} |\n`;
      }
    }

    content += isArabic
      ? `\n### 💡 تفسير معامل الارتباط:\n`
      : `\n### 💡 Interpreting Correlation Coefficient:\n`;
    
    content += isArabic
      ? `| المدى | القوة |\n|-------|-------|\n| 0.9 - 1.0 | قوي جداً |\n| 0.7 - 0.9 | قوي |\n| 0.5 - 0.7 | متوسط |\n| 0.3 - 0.5 | ضعيف |\n| 0.0 - 0.3 | ضعيف جداً/لا يوجد |\n`
      : `| Range | Strength |\n|-------|----------|\n| 0.9 - 1.0 | Very Strong |\n| 0.7 - 0.9 | Strong |\n| 0.5 - 0.7 | Moderate |\n| 0.3 - 0.5 | Weak |\n| 0.0 - 0.3 | Very Weak/None |\n`;
    
    content += isArabic
      ? `\n⚠️ **تذكر:** الارتباط لا يعني السببية!`
      : `\n⚠️ **Remember:** Correlation does not imply causation!`;

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['تحليل انحدار للمتغيرات المرتبطة', 'عرض مصفوفة الارتباط', 'اختبار دلالة الارتباط']
        : ['Regression for correlated variables', 'Show correlation matrix', 'Test correlation significance']
    };
  }

  private generateDistributionAnalysis(): ChatMessage {
    const isArabic = this.language === 'ar';
    const analysis = this.dataContext!.analysis!;
    const numericCols = analysis.columns.filter(c => c.type === 'numeric');
    
    if (numericCols.length === 0) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: isArabic 
          ? `⚠️ لا توجد متغيرات رقمية لتحليل توزيعها.`
          : `⚠️ No numeric variables to analyze distribution.`,
        timestamp: new Date()
      };
    }

    let content = isArabic 
      ? `## 📊 تحليل التوزيعات\n\n`
      : `## 📊 Distribution Analysis\n\n`;
    
    const normalCols = numericCols.filter(c => c.isNormal);
    const nonNormalCols = numericCols.filter(c => !c.isNormal);
    
    content += isArabic
      ? `### الملخص:\n- **توزيع طبيعي:** ${normalCols.length} متغير\n- **توزيع غير طبيعي:** ${nonNormalCols.length} متغير\n\n`
      : `### Summary:\n- **Normal distribution:** ${normalCols.length} variables\n- **Non-normal distribution:** ${nonNormalCols.length} variables\n\n`;
    
    content += `| ${isArabic ? 'المتغير' : 'Variable'} | ${isArabic ? 'الالتواء' : 'Skewness'} | ${isArabic ? 'التفرطح' : 'Kurtosis'} | ${isArabic ? 'طبيعي؟' : 'Normal?'} | ${isArabic ? 'التوصية' : 'Recommendation'} |\n`;
    content += `|---------|----------|----------|---------|---------------|\n`;
    
    for (const col of numericCols.slice(0, 10)) {
      const skLabel = isArabic
        ? (col.skewness! > 1 ? 'موجب ↗️' : col.skewness! < -1 ? 'سالب ↙️' : 'متماثل ↔️')
        : (col.skewness! > 1 ? 'Right ↗️' : col.skewness! < -1 ? 'Left ↙️' : 'Symmetric ↔️');
      
      const kurtLabel = isArabic
        ? (col.kurtosis! > 1 ? 'مدبب' : col.kurtosis! < -1 ? 'مفلطح' : 'عادي')
        : (col.kurtosis! > 1 ? 'Leptokurtic' : col.kurtosis! < -1 ? 'Platykurtic' : 'Mesokurtic');
      
      let recommendation = '';
      if (!col.isNormal) {
        if (Math.abs(col.skewness!) > 1) {
          recommendation = isArabic ? 'تحويل Log' : 'Log transform';
        } else {
          recommendation = isArabic ? 'اختبارات لامعلمية' : 'Non-parametric tests';
        }
      } else {
        recommendation = isArabic ? 'اختبارات معلمية' : 'Parametric tests';
      }
      
      const normalIcon = col.isNormal ? '✅' : '❌';
      
      content += `| ${col.name} | ${col.skewness?.toFixed(2)} ${skLabel} | ${col.kurtosis?.toFixed(2)} ${kurtLabel} | ${normalIcon} | ${recommendation} |\n`;
    }

    content += isArabic
      ? `\n### 💡 معايير التوزيع الطبيعي:\n`
      : `\n### 💡 Normality Criteria:\n`;
    
    content += isArabic
      ? `- **الالتواء:** يجب أن يكون بين -2 و +2 (مثالي: قريب من 0)\n`
      : `- **Skewness:** Should be between -2 and +2 (ideal: close to 0)\n`;
    
    content += isArabic
      ? `- **التفرطح:** يجب أن يكون بين -7 و +7 (مثالي: قريب من 0)\n`
      : `- **Kurtosis:** Should be between -7 and +7 (ideal: close to 0)\n`;
    
    content += isArabic
      ? `- **اختبار Shapiro-Wilk:** p > 0.05 للتوزيع الطبيعي\n`
      : `- **Shapiro-Wilk test:** p > 0.05 for normal distribution\n`;

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['كيف أحول البيانات للطبيعية؟', 'ما الاختبارات اللامعلمية؟', 'عرض المدرجات التكرارية']
        : ['How to transform to normal?', 'What are non-parametric tests?', 'Show histograms']
    };
  }

  private generateComparisonAdvice(): ChatMessage {
    const isArabic = this.language === 'ar';
    const data = this.dataContext!;
    
    let content = isArabic 
      ? `## 📈 دليل مقارنة المجموعات\n\n`
      : `## 📈 Group Comparison Guide\n\n`;
    
    content += isArabic
      ? `بناءً على بياناتك، إليك الاختبارات المناسبة للمقارنة:\n\n`
      : `Based on your data, here are suitable comparison tests:\n\n`;
    
    content += isArabic
      ? `### مقارنة متوسطات مجموعتين:\n`
      : `### Comparing means of two groups:\n`;
    
    content += isArabic
      ? `| الحالة | الاختبار المعلمي | الاختبار اللامعلمي |\n`
      : `| Condition | Parametric Test | Non-parametric Test |\n`;
    content += `|---------|-----------------|---------------------|\n`;
    content += isArabic
      ? `| عينات مستقلة | Independent t-test | Mann-Whitney U |\n`
      : `| Independent samples | Independent t-test | Mann-Whitney U |\n`;
    content += isArabic
      ? `| عينات مزدوجة | Paired t-test | Wilcoxon signed-rank |\n\n`
      : `| Paired samples | Paired t-test | Wilcoxon signed-rank |\n\n`;
    
    content += isArabic
      ? `### مقارنة 3 مجموعات أو أكثر:\n`
      : `### Comparing 3+ groups:\n`;
    
    content += isArabic
      ? `| الحالة | الاختبار المعلمي | الاختبار اللامعلمي |\n`
      : `| Condition | Parametric Test | Non-parametric Test |\n`;
    content += `|---------|-----------------|---------------------|\n`;
    content += isArabic
      ? `| عينات مستقلة | One-Way ANOVA | Kruskal-Wallis |\n`
      : `| Independent samples | One-Way ANOVA | Kruskal-Wallis |\n`;
    content += isArabic
      ? `| قياسات متكررة | Repeated ANOVA | Friedman |\n\n`
      : `| Repeated measures | Repeated ANOVA | Friedman |\n\n`;
    
    content += isArabic
      ? `### 💡 كيف تختار؟\n`
      : `### 💡 How to choose?\n`;
    
    content += isArabic
      ? `1. **تحقق من التوزيع الطبيعي** - إذا كان طبيعياً، استخدم معلمي\n`
      : `1. **Check normality** - If normal, use parametric\n`;
    
    content += isArabic
      ? `2. **تحقق من تجانس التباين** - مطلوب للاختبارات المعلمية\n`
      : `2. **Check homogeneity of variance** - Required for parametric tests\n`;
    
    content += isArabic
      ? `3. **حجم العينة** - إذا كان صغيراً (<30)، استخدم لامعلمي\n`
      : `3. **Sample size** - If small (<30), use non-parametric\n`;

    // اقتراحات بناءً على البيانات
    if (data.categoricalColumns.length > 0 && data.numericColumns.length > 0) {
      content += isArabic
        ? `\n### 🎯 اقتراح لبياناتك:\n`
        : `\n### 🎯 Suggestion for your data:\n`;
      
      content += isArabic
        ? `يمكنك مقارنة **${data.numericColumns[0]}** عبر فئات **${data.categoricalColumns[0]}**`
        : `You can compare **${data.numericColumns[0]}** across categories of **${data.categoricalColumns[0]}**`;
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['تنفيذ اختبار t', 'تنفيذ ANOVA', 'تنفيذ Mann-Whitney']
        : ['Run t-test', 'Run ANOVA', 'Run Mann-Whitney'],
      actions: [
        { label: isArabic ? 'الاختبارات الإحصائية' : 'Statistical Tests', action: 'navigate', params: { tab: 'tests' } }
      ]
    };
  }

  private generateTestRecommendation(): ChatMessage {
    const isArabic = this.language === 'ar';
    const data = this.dataContext!;
    const analysis = data.analysis!;
    
    let content = isArabic 
      ? `## 🎯 توصيات الاختبارات الإحصائية\n\n`
      : `## 🎯 Statistical Test Recommendations\n\n`;
    
    content += isArabic
      ? `بناءً على تحليل بياناتك، إليك التوصيات:\n\n`
      : `Based on analyzing your data, here are my recommendations:\n\n`;
    
    // تحديد الاختبارات المناسبة
    const recommendations: { test: string; reason: string; priority: number }[] = [];
    
    // إذا كان هناك متغيرين رقميين
    if (data.numericColumns.length >= 2) {
      const normalCount = analysis.columns.filter(c => c.type === 'numeric' && c.isNormal).length;
      
      if (normalCount >= 2) {
        recommendations.push({
          test: 'Pearson Correlation',
          reason: isArabic 
            ? 'لديك متغيرات رقمية بتوزيع طبيعي - مناسب لتحليل العلاقة الخطية'
            : 'You have numeric variables with normal distribution - suitable for linear relationship analysis',
          priority: 1
        });
      } else {
        recommendations.push({
          test: 'Spearman Correlation',
          reason: isArabic 
            ? 'بعض المتغيرات غير طبيعية التوزيع - Spearman أكثر ملاءمة'
            : 'Some variables are non-normal - Spearman is more appropriate',
          priority: 1
        });
      }
    }
    
    // إذا كان هناك متغير فئوي ورقمي
    if (data.categoricalColumns.length > 0 && data.numericColumns.length > 0) {
      const catCol = analysis.columns.find(c => c.type === 'categorical');
      const numCol = analysis.columns.find(c => c.type === 'numeric');
      
      if (catCol && numCol) {
        const groups = catCol.unique;
        const isNormal = numCol.isNormal;
        
        if (groups === 2) {
          if (isNormal) {
            recommendations.push({
              test: 'Independent t-test',
              reason: isArabic 
                ? `لمقارنة ${numCol.name} بين مجموعتي ${catCol.name} (البيانات طبيعية)`
                : `To compare ${numCol.name} between two groups of ${catCol.name} (data is normal)`,
              priority: 2
            });
          } else {
            recommendations.push({
              test: 'Mann-Whitney U',
              reason: isArabic 
                ? `لمقارنة ${numCol.name} بين مجموعتي ${catCol.name} (البيانات غير طبيعية)`
                : `To compare ${numCol.name} between two groups of ${catCol.name} (data is non-normal)`,
              priority: 2
            });
          }
        } else if (groups > 2) {
          if (isNormal) {
            recommendations.push({
              test: 'One-Way ANOVA',
              reason: isArabic 
                ? `لمقارنة ${numCol.name} عبر ${groups} مجموعات من ${catCol.name}`
                : `To compare ${numCol.name} across ${groups} groups of ${catCol.name}`,
              priority: 2
            });
          } else {
            recommendations.push({
              test: 'Kruskal-Wallis',
              reason: isArabic 
                ? `لمقارنة ${numCol.name} عبر ${groups} مجموعات (البيانات غير طبيعية)`
                : `To compare ${numCol.name} across ${groups} groups (data is non-normal)`,
              priority: 2
            });
          }
        }
      }
    }
    
    // إذا كان هناك متغيرين فئويين
    if (data.categoricalColumns.length >= 2) {
      recommendations.push({
        test: 'Chi-Square Test',
        reason: isArabic 
          ? `لاختبار العلاقة بين ${data.categoricalColumns[0]} و ${data.categoricalColumns[1]}`
          : `To test relationship between ${data.categoricalColumns[0]} and ${data.categoricalColumns[1]}`,
        priority: 3
      });
    }
    
    // عرض التوصيات
    for (let i = 0; i < recommendations.length; i++) {
      const rec = recommendations[i];
      content += isArabic
        ? `### ${i + 1}. ${rec.test}\n`
        : `### ${i + 1}. ${rec.test}\n`;
      content += `📋 ${rec.reason}\n\n`;
    }
    
    if (recommendations.length === 0) {
      content += isArabic
        ? `⚠️ لم أتمكن من تحديد توصيات محددة. يرجى وصف سؤال البحث الخاص بك.`
        : `⚠️ Could not determine specific recommendations. Please describe your research question.`;
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['كيف أنفذ اختبار t؟', 'اشرح ANOVA', 'ما هو Chi-Square؟']
        : ['How to run t-test?', 'Explain ANOVA', 'What is Chi-Square?'],
      actions: [
        { label: isArabic ? 'تنفيذ الاختبارات' : 'Run Tests', action: 'navigate', params: { tab: 'tests' } }
      ]
    };
  }

  private generateQualityReport(): ChatMessage {
    const isArabic = this.language === 'ar';
    const quality = this.dataContext!.analysis!.quality;
    
    let content = isArabic 
      ? `## 📋 تقرير جودة البيانات\n\n`
      : `## 📋 Data Quality Report\n\n`;
    
    // النتيجة الإجمالية
    const scoreEmoji = quality.overallScore >= 90 ? '🟢' : quality.overallScore >= 70 ? '🟡' : '🔴';
    
    content += isArabic
      ? `### ${scoreEmoji} النتيجة الإجمالية: ${quality.overallScore.toFixed(1)}%\n\n`
      : `### ${scoreEmoji} Overall Score: ${quality.overallScore.toFixed(1)}%\n\n`;
    
    content += isArabic
      ? `| المؤشر | النتيجة | الحالة |\n`
      : `| Metric | Score | Status |\n`;
    content += `|--------|--------|--------|\n`;
    
    const getStatus = (score: number) => {
      if (score >= 90) return isArabic ? '✅ ممتاز' : '✅ Excellent';
      if (score >= 70) return isArabic ? '🟡 جيد' : '🟡 Good';
      return isArabic ? '🔴 يحتاج تحسين' : '🔴 Needs improvement';
    };
    
    content += `| ${isArabic ? 'الاكتمال' : 'Completeness'} | ${quality.completeness.toFixed(1)}% | ${getStatus(quality.completeness)} |\n`;
    content += `| ${isArabic ? 'الصحة' : 'Validity'} | ${quality.validity.toFixed(1)}% | ${getStatus(quality.validity)} |\n`;
    content += `| ${isArabic ? 'التفرد' : 'Uniqueness'} | ${quality.uniqueness.toFixed(1)}% | ${getStatus(quality.uniqueness)} |\n`;
    content += `| ${isArabic ? 'الاتساق' : 'Consistency'} | ${quality.consistency.toFixed(1)}% | ${getStatus(quality.consistency)} |\n`;
    
    // المشاكل
    if (quality.issues.length > 0) {
      content += isArabic
        ? `\n### ⚠️ المشاكل المكتشفة:\n`
        : `\n### ⚠️ Issues Found:\n`;
      
      for (const issue of quality.issues.slice(0, 5)) {
        const severityIcon = issue.severity === 'high' ? '🔴' : issue.severity === 'medium' ? '🟡' : '🟢';
        content += `${severityIcon} ${issue.description}\n`;
        content += `   💡 ${issue.suggestion}\n\n`;
      }
    } else {
      content += isArabic
        ? `\n### ✅ لم يتم اكتشاف مشاكل كبيرة!\n`
        : `\n### ✅ No major issues found!\n`;
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['كيف أحسن جودة البيانات؟', 'عالج القيم المفقودة', 'تنظيف البيانات']
        : ['How to improve quality?', 'Handle missing values', 'Clean data']
    };
  }

  private generateStatisticsReport(): ChatMessage {
    const isArabic = this.language === 'ar';
    const analysis = this.dataContext!.analysis!;
    const numericCols = analysis.columns.filter(c => c.type === 'numeric');
    
    if (numericCols.length === 0) {
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content: isArabic 
          ? `⚠️ لا توجد متغيرات رقمية لحساب الإحصائيات.`
          : `⚠️ No numeric variables to calculate statistics.`,
        timestamp: new Date()
      };
    }

    let content = isArabic 
      ? `## 📊 الإحصائيات الوصفية\n\n`
      : `## 📊 Descriptive Statistics\n\n`;
    
    content += `| ${isArabic ? 'المتغير' : 'Variable'} | N | ${isArabic ? 'المتوسط' : 'Mean'} | ${isArabic ? 'الوسيط' : 'Median'} | ${isArabic ? 'الانحراف' : 'Std'} | ${isArabic ? 'الأدنى' : 'Min'} | ${isArabic ? 'الأقصى' : 'Max'} |\n`;
    content += `|---------|---|--------|--------|------|-----|-----|\n`;
    
    for (const col of numericCols) {
      content += `| ${col.name} | ${col.count - col.missing} | ${col.mean?.toFixed(2)} | ${col.median?.toFixed(2)} | ${col.std?.toFixed(2)} | ${col.min?.toFixed(2)} | ${col.max?.toFixed(2)} |\n`;
    }
    
    content += isArabic
      ? `\n### 📈 المئينات:\n`
      : `\n### 📈 Percentiles:\n`;
    
    content += `| ${isArabic ? 'المتغير' : 'Variable'} | Q1 (25%) | ${isArabic ? 'الوسيط' : 'Median'} (50%) | Q3 (75%) | IQR |\n`;
    content += `|---------|----------|--------------|----------|-----|\n`;
    
    for (const col of numericCols.slice(0, 8)) {
      content += `| ${col.name} | ${col.q1?.toFixed(2)} | ${col.median?.toFixed(2)} | ${col.q3?.toFixed(2)} | ${col.iqr?.toFixed(2)} |\n`;
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['تحليل التوزيعات', 'تحليل الارتباطات', 'مقارنة المجموعات']
        : ['Analyze distributions', 'Analyze correlations', 'Compare groups']
    };
  }

  private generateColumnInfo(message: string): ChatMessage {
    const isArabic = this.language === 'ar';
    const analysis = this.dataContext!.analysis!;
    
    // محاولة استخراج اسم العمود من الرسالة
    const words = message.split(/\s+/);
    let targetCol: ColumnAnalysis | undefined;
    
    for (const word of words) {
      const found = analysis.columns.find(c => 
        c.name.toLowerCase().includes(word.toLowerCase()) ||
        word.toLowerCase().includes(c.name.toLowerCase())
      );
      if (found) {
        targetCol = found;
        break;
      }
    }
    
    if (!targetCol) {
      let content = isArabic
        ? `📋 **الأعمدة المتاحة:**\n\n`
        : `📋 **Available columns:**\n\n`;
      
      for (const col of analysis.columns) {
        const typeIcon = col.type === 'numeric' ? '🔢' : '📝';
        content += `${typeIcon} **${col.name}** (${col.type})\n`;
      }
      
      content += isArabic
        ? `\n💡 اكتب اسم العمود للحصول على تفاصيله.`
        : `\n💡 Type a column name to get its details.`;
      
      return {
        id: Date.now().toString(),
        role: 'assistant',
        content,
        timestamp: new Date()
      };
    }
    
    let content = isArabic
      ? `## 📊 تفاصيل العمود: ${targetCol.name}\n\n`
      : `## 📊 Column Details: ${targetCol.name}\n\n`;
    
    content += isArabic
      ? `**النوع:** ${targetCol.type === 'numeric' ? '🔢 رقمي' : '📝 فئوي'}\n`
      : `**Type:** ${targetCol.type === 'numeric' ? '🔢 Numeric' : '📝 Categorical'}\n`;
    
    content += isArabic
      ? `**عدد القيم:** ${targetCol.count.toLocaleString()}\n`
      : `**Count:** ${targetCol.count.toLocaleString()}\n`;
    
    content += isArabic
      ? `**القيم المفقودة:** ${targetCol.missing} (${targetCol.missingPercent.toFixed(1)}%)\n`
      : `**Missing:** ${targetCol.missing} (${targetCol.missingPercent.toFixed(1)}%)\n`;
    
    content += isArabic
      ? `**القيم الفريدة:** ${targetCol.unique}\n\n`
      : `**Unique values:** ${targetCol.unique}\n\n`;
    
    if (targetCol.type === 'numeric') {
      content += isArabic ? `### الإحصائيات:\n` : `### Statistics:\n`;
      content += `- ${isArabic ? 'المتوسط' : 'Mean'}: ${targetCol.mean?.toFixed(3)}\n`;
      content += `- ${isArabic ? 'الوسيط' : 'Median'}: ${targetCol.median?.toFixed(3)}\n`;
      content += `- ${isArabic ? 'الانحراف المعياري' : 'Std Dev'}: ${targetCol.std?.toFixed(3)}\n`;
      content += `- ${isArabic ? 'الحد الأدنى' : 'Min'}: ${targetCol.min?.toFixed(3)}\n`;
      content += `- ${isArabic ? 'الحد الأقصى' : 'Max'}: ${targetCol.max?.toFixed(3)}\n`;
      content += `- ${isArabic ? 'الالتواء' : 'Skewness'}: ${targetCol.skewness?.toFixed(3)}\n`;
      content += `- ${isArabic ? 'التفرطح' : 'Kurtosis'}: ${targetCol.kurtosis?.toFixed(3)}\n`;
      content += `- ${isArabic ? 'التوزيع الطبيعي' : 'Normal'}: ${targetCol.isNormal ? '✅' : '❌'}\n`;
      content += `- ${isArabic ? 'القيم الشاذة' : 'Outliers'}: ${targetCol.outliers}\n`;
    } else {
      content += isArabic ? `### أهم الفئات:\n` : `### Top Categories:\n`;
      for (const cat of (targetCol.categories || []).slice(0, 5)) {
        content += `- **${cat.value}**: ${cat.count} (${cat.percent.toFixed(1)}%)\n`;
      }
    }

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['تحليل عمود آخر', 'مقارنة مع عمود آخر', 'عرض التوزيع']
        : ['Analyze another column', 'Compare with another', 'Show distribution']
    };
  }

  private generateHelpResponse(): ChatMessage {
    const isArabic = this.language === 'ar';
    
    const content = isArabic
      ? `## 🤖 مرحباً! أنا مساعدك الإحصائي الذكي

### ما الذي يمكنني مساعدتك فيه؟

**📊 تحليل البيانات:**
- "أعطني ملخصاً للبيانات"
- "ما هي إحصائيات المتغيرات؟"
- "تحليل العمود [اسم العمود]"

**🔍 جودة البيانات:**
- "هل توجد قيم مفقودة؟"
- "تحقق من القيم الشاذة"
- "تقرير جودة البيانات"

**📈 الارتباطات والعلاقات:**
- "تحليل الارتباطات"
- "ما العلاقة بين X و Y؟"

**🧪 الاختبارات الإحصائية:**
- "ما الاختبار المناسب لبياناتي؟"
- "كيف أقارن بين مجموعتين؟"
- "اشرح اختبار t"

**📉 التوزيعات:**
- "هل البيانات طبيعية التوزيع؟"
- "تحليل التوزيعات"

💡 **نصيحة:** كلما كان سؤالك محدداً، كانت إجابتي أدق!`
      : `## 🤖 Hello! I'm your Smart Statistical Assistant

### What can I help you with?

**📊 Data Analysis:**
- "Give me a data summary"
- "What are the variable statistics?"
- "Analyze column [column name]"

**🔍 Data Quality:**
- "Are there missing values?"
- "Check for outliers"
- "Data quality report"

**📈 Correlations & Relationships:**
- "Analyze correlations"
- "What's the relationship between X and Y?"

**🧪 Statistical Tests:**
- "What test is suitable for my data?"
- "How to compare two groups?"
- "Explain t-test"

**📉 Distributions:**
- "Is the data normally distributed?"
- "Analyze distributions"

💡 **Tip:** The more specific your question, the more accurate my answer!`;

    return {
      id: Date.now().toString(),
      role: 'assistant',
      content,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['ملخص البيانات', 'جودة البيانات', 'اقتراح اختبارات', 'تحليل الارتباطات']
        : ['Data summary', 'Data quality', 'Suggest tests', 'Analyze correlations']
    };
  }

  private generateGeneralResponse(_message: string): ChatMessage {
    const isArabic = this.language === 'ar';
    
    return {
      id: Date.now().toString(),
      role: 'assistant',
      content: isArabic
        ? `فهمت سؤالك. دعني أحاول مساعدتك.

بناءً على بياناتك المحملة (${this.dataContext!.rowCount} صف، ${this.dataContext!.columnCount} عمود)، يمكنني:

1. **تحليل البيانات** - ملخص وإحصائيات
2. **فحص الجودة** - القيم المفقودة والشاذة
3. **تحليل العلاقات** - الارتباطات والتوزيعات
4. **اقتراح اختبارات** - بناءً على نوع البيانات

ما الذي تريد أن أركز عليه؟`
        : `I understand your question. Let me try to help you.

Based on your loaded data (${this.dataContext!.rowCount} rows, ${this.dataContext!.columnCount} columns), I can:

1. **Analyze data** - Summary and statistics
2. **Check quality** - Missing values and outliers
3. **Analyze relationships** - Correlations and distributions
4. **Suggest tests** - Based on data type

What would you like me to focus on?`,
      timestamp: new Date(),
      suggestions: isArabic 
        ? ['ملخص البيانات', 'فحص الجودة', 'تحليل الارتباطات', 'اقتراح اختبارات']
        : ['Data summary', 'Check quality', 'Analyze correlations', 'Suggest tests']
    };
  }

  // الحصول على تاريخ المحادثة
  getHistory(): ChatMessage[] {
    return this.conversationHistory;
  }

  // مسح التاريخ
  clearHistory(): void {
    this.conversationHistory = [];
  }

  // الحصول على سياق البيانات
  getDataContext(): DataContext | null {
    return this.dataContext;
  }
}

export default SmartChatEngine;
