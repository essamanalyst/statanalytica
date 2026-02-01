// نظام توليد وحفظ التقارير الاحترافي
// Professional Report Generation System

export interface ReportSection {
  id: string;
  title: string;
  titleEn: string;
  content: string;
  contentEn: string;
  type: 'text' | 'table' | 'chart' | 'statistics' | 'test' | 'recommendation';
  data?: any;
  order: number;
}

export interface ReportConfig {
  title: string;
  author: string;
  date: string;
  language: 'ar' | 'en';
  includeCharts: boolean;
  includeRawData: boolean;
  includeSummary: boolean;
  includeRecommendations: boolean;
  theme: 'professional' | 'academic' | 'minimal';
  format: 'pdf' | 'html' | 'word' | 'excel' | 'json';
}

export interface ColumnStats {
  name: string;
  type: string;
  count: number;
  missing: number;
  missingPercent: number;
  unique: number;
  mean?: number;
  median?: number;
  std?: number;
  min?: number;
  max?: number;
  skewness?: number;
  kurtosis?: number;
  isNormal?: boolean;
  mode?: string | number;
  topCategories?: { value: string; count: number; percent: number }[];
}

export interface TestResult {
  testName: string;
  testNameEn: string;
  statistic: number;
  pValue: number;
  df?: number;
  effectSize?: number;
  effectSizeInterpretation?: string;
  ci?: [number, number];
  conclusion: string;
  conclusionEn: string;
  interpretation: string;
  interpretationEn: string;
  recommendations: string[];
  recommendationsEn: string[];
}

export interface FullReport {
  config: ReportConfig;
  dataOverview: {
    totalRows: number;
    totalColumns: number;
    numericColumns: number;
    categoricalColumns: number;
    missingCells: number;
    missingPercent: number;
    duplicateRows: number;
    dataQualityScore: number;
  };
  columnStats: ColumnStats[];
  correlations?: { var1: string; var2: string; r: number; p: number; interpretation: string }[];
  testResults?: TestResult[];
  insights: { type: string; message: string; messageEn: string; severity: string }[];
  recommendations: { text: string; textEn: string; priority: string }[];
  generatedAt: string;
}

// دوال إحصائية مساعدة
const mean = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  return valid.length ? valid.reduce((a, b) => a + b, 0) / valid.length : 0;
};

const median = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined).sort((a, b) => a - b);
  if (!valid.length) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
};

const std = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  if (valid.length < 2) return 0;
  const m = mean(valid);
  return Math.sqrt(valid.reduce((acc, val) => acc + Math.pow(val - m, 2), 0) / (valid.length - 1));
};

const skewness = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  if (valid.length < 3) return 0;
  const m = mean(valid);
  const s = std(valid);
  if (s === 0) return 0;
  const n = valid.length;
  const sum = valid.reduce((acc, val) => acc + Math.pow((val - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
};

const kurtosis = (arr: number[]): number => {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  if (valid.length < 4) return 0;
  const m = mean(valid);
  const s = std(valid);
  if (s === 0) return 0;
  const n = valid.length;
  const sum = valid.reduce((acc, val) => acc + Math.pow((val - m) / s, 4), 0);
  return ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum - (3 * (n - 1) * (n - 1)) / ((n - 2) * (n - 3));
};

const mode = (arr: any[]): any => {
  const freq: { [key: string]: number } = {};
  arr.forEach(val => {
    if (val !== null && val !== undefined && val !== '') {
      freq[String(val)] = (freq[String(val)] || 0) + 1;
    }
  });
  let maxFreq = 0;
  let modeVal = null;
  for (const [val, count] of Object.entries(freq)) {
    if (count > maxFreq) {
      maxFreq = count;
      modeVal = val;
    }
  }
  return modeVal;
};

export class ReportGenerator {
  private data: Record<string, any>[];
  private language: 'ar' | 'en';
  private columnStats: ColumnStats[] = [];
  
  constructor(data: Record<string, any>[], language: 'ar' | 'en' = 'ar') {
    this.data = data;
    this.language = language;
    this.analyzeData();
  }
  
  private analyzeData(): void {
    if (!this.data || this.data.length === 0) return;
    
    const columns = Object.keys(this.data[0]);
    
    this.columnStats = columns.map(col => {
      const values = this.data.map(row => row[col]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const numericValues = values.map(v => parseFloat(v)).filter(v => !isNaN(v));
      const isNumeric = numericValues.length > values.length * 0.5;
      
      const stats: ColumnStats = {
        name: col,
        type: isNumeric ? 'numeric' : 'categorical',
        count: values.length,
        missing: values.length - nonNull.length,
        missingPercent: ((values.length - nonNull.length) / values.length) * 100,
        unique: new Set(nonNull.map(String)).size,
      };
      
      if (isNumeric && numericValues.length > 0) {
        stats.mean = mean(numericValues);
        stats.median = median(numericValues);
        stats.std = std(numericValues);
        stats.min = Math.min(...numericValues);
        stats.max = Math.max(...numericValues);
        stats.skewness = skewness(numericValues);
        stats.kurtosis = kurtosis(numericValues);
        
        // Shapiro-Wilk approximation
        const n = numericValues.length;
        const sk = Math.abs(stats.skewness || 0);
        const ku = Math.abs(stats.kurtosis || 0);
        stats.isNormal = sk < 2 && ku < 7 && n >= 3;
      } else {
        stats.mode = mode(nonNull);
        const freq: { [key: string]: number } = {};
        nonNull.forEach(v => {
          freq[String(v)] = (freq[String(v)] || 0) + 1;
        });
        stats.topCategories = Object.entries(freq)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([value, count]) => ({
            value,
            count,
            percent: (count / nonNull.length) * 100
          }));
      }
      
      return stats;
    });
  }
  
  public getDataOverview() {
    const totalCells = this.data.length * Object.keys(this.data[0] || {}).length;
    let missingCells = 0;
    
    this.data.forEach(row => {
      Object.values(row).forEach(val => {
        if (val === null || val === undefined || val === '') {
          missingCells++;
        }
      });
    });
    
    const seen = new Set();
    let duplicateRows = 0;
    this.data.forEach(row => {
      const key = JSON.stringify(row);
      if (seen.has(key)) {
        duplicateRows++;
      } else {
        seen.add(key);
      }
    });
    
    const numericColumns = this.columnStats.filter(c => c.type === 'numeric').length;
    const categoricalColumns = this.columnStats.filter(c => c.type === 'categorical').length;
    
    // Calculate quality score
    const completeness = totalCells > 0 ? ((totalCells - missingCells) / totalCells) * 100 : 100;
    const uniqueness = this.data.length > 0 ? ((this.data.length - duplicateRows) / this.data.length) * 100 : 100;
    const dataQualityScore = (completeness * 0.6 + uniqueness * 0.4);
    
    return {
      totalRows: this.data.length,
      totalColumns: Object.keys(this.data[0] || {}).length,
      numericColumns,
      categoricalColumns,
      missingCells,
      missingPercent: totalCells > 0 ? (missingCells / totalCells) * 100 : 0,
      duplicateRows,
      dataQualityScore
    };
  }
  
  public generateInsights(): { type: string; message: string; messageEn: string; severity: string }[] {
    const insights: { type: string; message: string; messageEn: string; severity: string }[] = [];
    
    // Check for missing values
    this.columnStats.forEach(col => {
      if (col.missingPercent > 20) {
        insights.push({
          type: 'missing',
          message: `العمود "${col.name}" يحتوي على ${col.missingPercent.toFixed(1)}% قيم مفقودة`,
          messageEn: `Column "${col.name}" has ${col.missingPercent.toFixed(1)}% missing values`,
          severity: col.missingPercent > 50 ? 'high' : 'medium'
        });
      }
    });
    
    // Check for skewness
    this.columnStats.forEach(col => {
      if (col.type === 'numeric' && col.skewness !== undefined) {
        if (Math.abs(col.skewness) > 2) {
          insights.push({
            type: 'distribution',
            message: `العمود "${col.name}" له التواء عالي (${col.skewness.toFixed(2)})، قد يحتاج لتحويل`,
            messageEn: `Column "${col.name}" is highly skewed (${col.skewness.toFixed(2)}), may need transformation`,
            severity: 'medium'
          });
        }
      }
    });
    
    // Check for outliers
    this.columnStats.forEach(col => {
      if (col.type === 'numeric' && col.mean !== undefined && col.std !== undefined) {
        const values = this.data.map(row => parseFloat(row[col.name])).filter(v => !isNaN(v));
        const q1 = values.sort((a, b) => a - b)[Math.floor(values.length * 0.25)];
        const q3 = values.sort((a, b) => a - b)[Math.floor(values.length * 0.75)];
        const iqr = q3 - q1;
        const outliers = values.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr);
        
        if (outliers.length > values.length * 0.05) {
          insights.push({
            type: 'outliers',
            message: `العمود "${col.name}" يحتوي على ${outliers.length} قيمة شاذة (${((outliers.length / values.length) * 100).toFixed(1)}%)`,
            messageEn: `Column "${col.name}" has ${outliers.length} outliers (${((outliers.length / values.length) * 100).toFixed(1)}%)`,
            severity: 'medium'
          });
        }
      }
    });
    
    // Check normality
    this.columnStats.forEach(col => {
      if (col.type === 'numeric' && col.isNormal === false) {
        insights.push({
          type: 'normality',
          message: `العمود "${col.name}" لا يتبع التوزيع الطبيعي`,
          messageEn: `Column "${col.name}" is not normally distributed`,
          severity: 'low'
        });
      }
    });
    
    return insights;
  }
  
  public generateRecommendations(): { text: string; textEn: string; priority: string }[] {
    const recommendations: { text: string; textEn: string; priority: string }[] = [];
    const overview = this.getDataOverview();
    const insights = this.generateInsights();
    
    if (overview.missingPercent > 5) {
      recommendations.push({
        text: 'يُنصح بمعالجة القيم المفقودة قبل التحليل باستخدام التعويض بالمتوسط أو الوسيط',
        textEn: 'Consider handling missing values before analysis using mean or median imputation',
        priority: 'high'
      });
    }
    
    if (overview.duplicateRows > 0) {
      recommendations.push({
        text: `يوجد ${overview.duplicateRows} صفوف مكررة، يُنصح بمراجعتها وحذفها إذا لزم`,
        textEn: `There are ${overview.duplicateRows} duplicate rows, consider reviewing and removing them`,
        priority: 'medium'
      });
    }
    
    const nonNormalCols = this.columnStats.filter(c => c.type === 'numeric' && c.isNormal === false);
    if (nonNormalCols.length > 0) {
      recommendations.push({
        text: 'بعض المتغيرات لا تتبع التوزيع الطبيعي، يُنصح باستخدام اختبارات لامعلمية',
        textEn: 'Some variables are not normally distributed, consider using non-parametric tests',
        priority: 'medium'
      });
    }
    
    const skewedCols = insights.filter(i => i.type === 'distribution');
    if (skewedCols.length > 0) {
      recommendations.push({
        text: 'بعض المتغيرات لها التواء عالي، يُنصح بتطبيق تحويل لوغاريتمي أو Box-Cox',
        textEn: 'Some variables are highly skewed, consider applying log or Box-Cox transformation',
        priority: 'medium'
      });
    }
    
    if (overview.numericColumns >= 2) {
      recommendations.push({
        text: 'يمكن إجراء تحليل الارتباط بين المتغيرات الرقمية لاكتشاف العلاقات',
        textEn: 'Consider performing correlation analysis between numeric variables',
        priority: 'low'
      });
    }
    
    return recommendations;
  }
  
  public generateFullReport(config: Partial<ReportConfig> = {}): FullReport {
    const defaultConfig: ReportConfig = {
      title: this.language === 'ar' ? 'تقرير تحليل البيانات' : 'Data Analysis Report',
      author: '',
      date: new Date().toISOString().split('T')[0],
      language: this.language,
      includeCharts: true,
      includeRawData: false,
      includeSummary: true,
      includeRecommendations: true,
      theme: 'professional',
      format: 'html'
    };
    
    const finalConfig = { ...defaultConfig, ...config };
    
    return {
      config: finalConfig,
      dataOverview: this.getDataOverview(),
      columnStats: this.columnStats,
      insights: this.generateInsights(),
      recommendations: this.generateRecommendations(),
      generatedAt: new Date().toISOString()
    };
  }
  
  public exportToHTML(report: FullReport): string {
    const isAr = report.config.language === 'ar';
    const dir = isAr ? 'rtl' : 'ltr';
    const font = isAr ? 'Cairo, Tajawal, sans-serif' : 'Inter, Segoe UI, sans-serif';
    
    const html = `
<!DOCTYPE html>
<html lang="${report.config.language}" dir="${dir}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${report.config.title}</title>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: ${font};
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
      direction: ${dir};
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 20px;
      box-shadow: 0 25px 50px rgba(0,0,0,0.15);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    .header h1 { font-size: 2.5rem; margin-bottom: 10px; }
    .header .meta { opacity: 0.9; font-size: 0.95rem; }
    .content { padding: 40px; }
    .section {
      margin-bottom: 40px;
      padding: 25px;
      background: #f8fafc;
      border-radius: 15px;
      border-${isAr ? 'right' : 'left'}: 4px solid #667eea;
    }
    .section h2 {
      color: #1e293b;
      font-size: 1.5rem;
      margin-bottom: 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .section h2::before {
      content: '';
      width: 8px;
      height: 8px;
      background: #667eea;
      border-radius: 50%;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      margin-bottom: 20px;
    }
    .stat-card {
      background: white;
      padding: 20px;
      border-radius: 12px;
      box-shadow: 0 4px 15px rgba(0,0,0,0.05);
      text-align: center;
    }
    .stat-card .value {
      font-size: 2rem;
      font-weight: 700;
      color: #667eea;
    }
    .stat-card .label {
      color: #64748b;
      font-size: 0.9rem;
      margin-top: 5px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
      background: white;
      border-radius: 10px;
      overflow: hidden;
    }
    th, td {
      padding: 12px 15px;
      text-align: ${isAr ? 'right' : 'left'};
      border-bottom: 1px solid #e2e8f0;
    }
    th {
      background: #667eea;
      color: white;
      font-weight: 600;
    }
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #f1f5f9; }
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 20px;
      font-size: 0.8rem;
      font-weight: 500;
    }
    .badge-high { background: #fee2e2; color: #dc2626; }
    .badge-medium { background: #fef3c7; color: #d97706; }
    .badge-low { background: #dcfce7; color: #16a34a; }
    .insight-card {
      background: white;
      padding: 15px 20px;
      border-radius: 10px;
      margin-bottom: 10px;
      display: flex;
      align-items: center;
      gap: 15px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.05);
    }
    .recommendation-card {
      background: linear-gradient(135deg, #667eea15 0%, #764ba215 100%);
      padding: 15px 20px;
      border-radius: 10px;
      margin-bottom: 10px;
      border-${isAr ? 'right' : 'left'}: 3px solid #667eea;
    }
    .quality-bar {
      height: 10px;
      background: #e2e8f0;
      border-radius: 5px;
      overflow: hidden;
      margin-top: 10px;
    }
    .quality-fill {
      height: 100%;
      border-radius: 5px;
      transition: width 0.5s;
    }
    .quality-high { background: linear-gradient(90deg, #22c55e, #16a34a); }
    .quality-medium { background: linear-gradient(90deg, #f59e0b, #d97706); }
    .quality-low { background: linear-gradient(90deg, #ef4444, #dc2626); }
    .footer {
      text-align: center;
      padding: 20px;
      background: #f8fafc;
      color: #64748b;
      font-size: 0.85rem;
    }
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; }
      .section { break-inside: avoid; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${report.config.title}</h1>
      <div class="meta">
        ${report.config.author ? `${isAr ? 'المؤلف' : 'Author'}: ${report.config.author} | ` : ''}
        ${isAr ? 'التاريخ' : 'Date'}: ${report.config.date} |
        ${isAr ? 'وقت التوليد' : 'Generated'}: ${new Date(report.generatedAt).toLocaleString(isAr ? 'ar-SA' : 'en-US')}
      </div>
    </div>
    
    <div class="content">
      <!-- Data Overview Section -->
      <div class="section">
        <h2>${isAr ? 'نظرة عامة على البيانات' : 'Data Overview'}</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="value">${report.dataOverview.totalRows.toLocaleString()}</div>
            <div class="label">${isAr ? 'إجمالي الصفوف' : 'Total Rows'}</div>
          </div>
          <div class="stat-card">
            <div class="value">${report.dataOverview.totalColumns}</div>
            <div class="label">${isAr ? 'إجمالي الأعمدة' : 'Total Columns'}</div>
          </div>
          <div class="stat-card">
            <div class="value">${report.dataOverview.numericColumns}</div>
            <div class="label">${isAr ? 'أعمدة رقمية' : 'Numeric Columns'}</div>
          </div>
          <div class="stat-card">
            <div class="value">${report.dataOverview.categoricalColumns}</div>
            <div class="label">${isAr ? 'أعمدة فئوية' : 'Categorical Columns'}</div>
          </div>
          <div class="stat-card">
            <div class="value">${report.dataOverview.missingPercent.toFixed(1)}%</div>
            <div class="label">${isAr ? 'القيم المفقودة' : 'Missing Values'}</div>
          </div>
          <div class="stat-card">
            <div class="value">${report.dataOverview.dataQualityScore.toFixed(0)}%</div>
            <div class="label">${isAr ? 'جودة البيانات' : 'Data Quality'}</div>
            <div class="quality-bar">
              <div class="quality-fill ${report.dataOverview.dataQualityScore >= 80 ? 'quality-high' : report.dataOverview.dataQualityScore >= 60 ? 'quality-medium' : 'quality-low'}" 
                   style="width: ${report.dataOverview.dataQualityScore}%"></div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Column Statistics Section -->
      <div class="section">
        <h2>${isAr ? 'إحصائيات الأعمدة' : 'Column Statistics'}</h2>
        
        <!-- Numeric Columns -->
        ${report.columnStats.filter(c => c.type === 'numeric').length > 0 ? `
        <h3 style="margin: 20px 0 10px; color: #475569;">${isAr ? 'المتغيرات الرقمية' : 'Numeric Variables'}</h3>
        <table>
          <thead>
            <tr>
              <th>${isAr ? 'العمود' : 'Column'}</th>
              <th>${isAr ? 'العدد' : 'Count'}</th>
              <th>${isAr ? 'المتوسط' : 'Mean'}</th>
              <th>${isAr ? 'الوسيط' : 'Median'}</th>
              <th>${isAr ? 'الانحراف' : 'Std'}</th>
              <th>${isAr ? 'الحد الأدنى' : 'Min'}</th>
              <th>${isAr ? 'الحد الأقصى' : 'Max'}</th>
              <th>${isAr ? 'الالتواء' : 'Skewness'}</th>
              <th>${isAr ? 'طبيعي؟' : 'Normal?'}</th>
            </tr>
          </thead>
          <tbody>
            ${report.columnStats.filter(c => c.type === 'numeric').map(col => `
            <tr>
              <td><strong>${col.name}</strong></td>
              <td>${col.count - col.missing}</td>
              <td>${col.mean?.toFixed(2) || '-'}</td>
              <td>${col.median?.toFixed(2) || '-'}</td>
              <td>${col.std?.toFixed(2) || '-'}</td>
              <td>${col.min?.toFixed(2) || '-'}</td>
              <td>${col.max?.toFixed(2) || '-'}</td>
              <td>${col.skewness?.toFixed(2) || '-'}</td>
              <td><span class="badge ${col.isNormal ? 'badge-low' : 'badge-medium'}">${col.isNormal ? (isAr ? 'نعم' : 'Yes') : (isAr ? 'لا' : 'No')}</span></td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
        
        <!-- Categorical Columns -->
        ${report.columnStats.filter(c => c.type === 'categorical').length > 0 ? `
        <h3 style="margin: 30px 0 10px; color: #475569;">${isAr ? 'المتغيرات الفئوية' : 'Categorical Variables'}</h3>
        <table>
          <thead>
            <tr>
              <th>${isAr ? 'العمود' : 'Column'}</th>
              <th>${isAr ? 'العدد' : 'Count'}</th>
              <th>${isAr ? 'الفئات الفريدة' : 'Unique'}</th>
              <th>${isAr ? 'المفقودة' : 'Missing'}</th>
              <th>${isAr ? 'المنوال' : 'Mode'}</th>
              <th>${isAr ? 'أهم الفئات' : 'Top Categories'}</th>
            </tr>
          </thead>
          <tbody>
            ${report.columnStats.filter(c => c.type === 'categorical').map(col => `
            <tr>
              <td><strong>${col.name}</strong></td>
              <td>${col.count - col.missing}</td>
              <td>${col.unique}</td>
              <td>${col.missing} (${col.missingPercent.toFixed(1)}%)</td>
              <td>${col.mode || '-'}</td>
              <td>${col.topCategories?.slice(0, 3).map(c => `${c.value} (${c.percent.toFixed(1)}%)`).join(', ') || '-'}</td>
            </tr>
            `).join('')}
          </tbody>
        </table>
        ` : ''}
      </div>
      
      <!-- Insights Section -->
      ${report.insights.length > 0 ? `
      <div class="section">
        <h2>${isAr ? 'الرؤى والاكتشافات' : 'Insights & Discoveries'}</h2>
        ${report.insights.map(insight => `
        <div class="insight-card">
          <span class="badge badge-${insight.severity}">${
            insight.severity === 'high' ? (isAr ? 'مهم' : 'High') :
            insight.severity === 'medium' ? (isAr ? 'متوسط' : 'Medium') :
            (isAr ? 'معلومة' : 'Info')
          }</span>
          <span>${isAr ? insight.message : insight.messageEn}</span>
        </div>
        `).join('')}
      </div>
      ` : ''}
      
      <!-- Recommendations Section -->
      ${report.recommendations.length > 0 ? `
      <div class="section">
        <h2>${isAr ? 'التوصيات' : 'Recommendations'}</h2>
        ${report.recommendations.map((rec, i) => `
        <div class="recommendation-card">
          <strong>${i + 1}.</strong> ${isAr ? rec.text : rec.textEn}
          <span class="badge badge-${rec.priority}" style="margin-${isAr ? 'right' : 'left'}: 10px;">${
            rec.priority === 'high' ? (isAr ? 'أولوية عالية' : 'High Priority') :
            rec.priority === 'medium' ? (isAr ? 'أولوية متوسطة' : 'Medium Priority') :
            (isAr ? 'أولوية منخفضة' : 'Low Priority')
          }</span>
        </div>
        `).join('')}
      </div>
      ` : ''}
    </div>
    
    <div class="footer">
      ${isAr ? 'تم إنشاء هذا التقرير بواسطة StatAnalytica' : 'This report was generated by StatAnalytica'}
      <br>
      © ${new Date().getFullYear()} StatAnalytica - ${isAr ? 'جميع الحقوق محفوظة' : 'All Rights Reserved'}
    </div>
  </div>
</body>
</html>
    `;
    
    return html;
  }
  
  public exportToJSON(report: FullReport): string {
    return JSON.stringify(report, null, 2);
  }
  
  public exportToCSV(): string {
    if (!this.data || this.data.length === 0) return '';
    
    const headers = Object.keys(this.data[0]);
    const csv = [
      headers.join(','),
      ...this.data.map(row => headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
          return `"${val.replace(/"/g, '""')}"`;
        }
        return val;
      }).join(','))
    ].join('\n');
    
    return csv;
  }
  
  public downloadReport(format: 'html' | 'json' | 'csv', report?: FullReport): void {
    let content: string;
    let mimeType: string;
    let extension: string;
    
    switch (format) {
      case 'html':
        content = this.exportToHTML(report || this.generateFullReport());
        mimeType = 'text/html';
        extension = 'html';
        break;
      case 'json':
        content = this.exportToJSON(report || this.generateFullReport());
        mimeType = 'application/json';
        extension = 'json';
        break;
      case 'csv':
        content = this.exportToCSV();
        mimeType = 'text/csv';
        extension = 'csv';
        break;
      default:
        return;
    }
    
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `report_${new Date().toISOString().split('T')[0]}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
  
  public printReport(report?: FullReport): void {
    const html = this.exportToHTML(report || this.generateFullReport());
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  }
}

export default ReportGenerator;
