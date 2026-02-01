// Data Types
export interface DataColumn {
  name: string;
  type: 'numeric' | 'categorical' | 'ordinal' | 'datetime' | 'text' | 'date' | 'boolean';
  values: any[];
  missing: number;
  unique: number;
  nullCount?: number;
  uniqueCount?: number;
  stats?: {
    mean?: number;
    median?: number;
    min?: number;
    max?: number;
    stdDev?: number;
    sum?: number;
  };
}

export interface Dataset {
  name: string;
  columns: DataColumn[];
  rows: Record<string, any>[];
  rowCount: number;
  columnCount: number;
}

export interface DescriptiveStats {
  count: number;
  mean: number;
  median: number;
  mode: number[];
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
  missing: number;
  missingPercent: number;
}

export interface TestResult {
  testName: string;
  testNameAr: string;
  statistic: number;
  pValue: number;
  interpretation: string;
  interpretationAr: string;
  conclusion: string;
  conclusionAr: string;
  assumptions?: string[];
  effect?: {
    name: string;
    value: number;
    interpretation: string;
  };
}

export interface CorrelationResult {
  variable1: string;
  variable2: string;
  pearson: number;
  spearman: number;
  kendall: number;
  pValue: number;
  strength: string;
  strengthAr: string;
}

export interface RegressionResult {
  type: 'linear' | 'multiple' | 'logistic';
  coefficients: { name: string; value: number; stdError: number; tValue: number; pValue: number }[];
  rSquared: number;
  adjustedRSquared: number;
  fStatistic: number;
  fPValue: number;
  residuals: number[];
  predictions: number[];
}

export interface OutlierResult {
  index: number;
  value: number;
  method: string;
  score: number;
}

export interface CleaningOperation {
  type: 'missing' | 'outlier' | 'duplicate' | 'transform';
  column?: string;
  method: string;
  before: number;
  after: number;
}

export type ChartType = 'histogram' | 'boxplot' | 'scatter' | 'line' | 'bar' | 'pie' | 'heatmap' | 'violin';

export interface ChartConfig {
  type: ChartType;
  title: string;
  xAxis?: string;
  yAxis?: string;
  color?: string;
  showLegend?: boolean;
  showGrid?: boolean;
}
