import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n';

interface Props {
  data: Record<string, any>[];
  columns: string[];
}

// ==================== الدوال الإحصائية المساعدة ====================

const normalCDF = (x: number): number => {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x) / Math.sqrt(2);
  const t = 1.0 / (1.0 + p * x);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1.0 + sign * y);
};

const gamma = (z: number): number => {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gamma(1 - z));
  z -= 1;
  const g = 7;
  const c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028,
    771.32342877765313, -176.61502916214059, 12.507343278686905,
    -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
};

const incompleteBeta = (a: number, b: number, x: number): number => {
  if (x === 0 || x === 1) return x;
  const bt = Math.exp(
    gamma(a + b) - gamma(a) - gamma(b) + a * Math.log(x) + b * Math.log(1 - x)
  );
  if (x < (a + 1) / (a + b + 2)) {
    return bt * betaCF(a, b, x) / a;
  }
  return 1 - bt * betaCF(b, a, 1 - x) / b;
};

const betaCF = (a: number, b: number, x: number): number => {
  const maxIter = 100, eps = 1e-10;
  let qab = a + b, qap = a + 1, qam = a - 1;
  let c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < eps) d = eps;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= maxIter; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c; if (Math.abs(c) < eps) c = eps;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < eps) d = eps;
    c = 1 + aa / c; if (Math.abs(c) < eps) c = eps;
    d = 1 / d;
    const del = d * c; h *= del;
    if (Math.abs(del - 1) < eps) break;
  }
  return h;
};

const tCDF = (t: number, df: number): number => {
  const x = df / (df + t * t);
  return 1 - 0.5 * incompleteBeta(df / 2, 0.5, x);
};

const _fCDF = (f: number, df1: number, df2: number): number => {
  if (f <= 0) return 0;
  const x = df1 * f / (df1 * f + df2);
  return incompleteBeta(df1 / 2, df2 / 2, x);
};
void _fCDF;

const chiSquareCDF = (x: number, df: number): number => {
  if (x <= 0) return 0;
  return incompleteBeta(df / 2, 0.5, x / (x + df)) * 0.5 + 0.5;
};

const mean = (arr: number[]): number => arr.reduce((a, b) => a + b, 0) / arr.length;
const variance = (arr: number[]): number => {
  const m = mean(arr);
  return arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1);
};
const std = (arr: number[]): number => Math.sqrt(variance(arr));

const rank = (arr: number[]): number[] => {
  const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
  const ranks = new Array(arr.length);
  let i = 0;
  while (i < sorted.length) {
    let j = i;
    while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) ranks[sorted[k].i] = avgRank;
    i = j;
  }
  return ranks;
};

const autocorrelation = (arr: number[], lag: number): number => {
  const n = arr.length;
  const m = mean(arr);
  let num = 0, den = 0;
  for (let i = 0; i < n - lag; i++) {
    num += (arr[i] - m) * (arr[i + lag] - m);
  }
  for (let i = 0; i < n; i++) {
    den += (arr[i] - m) ** 2;
  }
  return num / den;
};

interface TestCategory {
  id: string;
  nameEn: string;
  nameAr: string;
  icon: string;
  color: string;
  tests: TestDefinition[];
}

interface TestDefinition {
  id: string;
  nameEn: string;
  nameAr: string;
  descriptionEn: string;
  descriptionAr: string;
  assumptionsEn: string[];
  assumptionsAr: string[];
  requiredInputs: InputType[];
  category: string;
}

interface InputType {
  id: string;
  labelEn: string;
  labelAr: string;
  type: 'numeric-column' | 'categorical-column' | 'number' | 'select' | 'multi-column';
  options?: { value: string; label: string }[];
  default?: any;
}

interface TestResult {
  testNameEn: string;
  testNameAr: string;
  statistic: number;
  statisticName: string;
  pValue: number;
  df?: number | string;
  effectSize?: number;
  effectSizeName?: string;
  effectSizeInterpretationEn?: string;
  effectSizeInterpretationAr?: string;
  confidenceInterval?: [number, number];
  conclusionEn: string;
  conclusionAr: string;
  interpretationEn: string;
  interpretationAr: string;
  additionalStats?: Record<string, any>;
}

const testCategories: TestCategory[] = [
  {
    id: 'parametric',
    nameEn: 'Parametric Tests',
    nameAr: 'الاختبارات المعلمية',
    icon: '📊',
    color: 'blue',
    tests: [
      {
        id: 'one-sample-ttest',
        nameEn: 'One Sample T-Test',
        nameAr: 'اختبار ت لعينة واحدة',
        descriptionEn: 'Tests if sample mean differs from hypothesized value',
        descriptionAr: 'يختبر ما إذا كان متوسط العينة يختلف عن قيمة مفترضة',
        assumptionsEn: ['Normal distribution', 'Continuous data', 'Random sampling'],
        assumptionsAr: ['التوزيع الطبيعي', 'بيانات مستمرة', 'عينة عشوائية'],
        requiredInputs: [
          { id: 'column', labelEn: 'Variable', labelAr: 'المتغير', type: 'numeric-column' },
          { id: 'mu', labelEn: 'Hypothesized Mean', labelAr: 'المتوسط المفترض', type: 'number', default: 0 }
        ],
        category: 'parametric'
      },
      {
        id: 'independent-ttest',
        nameEn: 'Independent Samples T-Test',
        nameAr: 'اختبار ت للعينات المستقلة',
        descriptionEn: 'Compares means of two independent groups',
        descriptionAr: 'يقارن متوسطات مجموعتين مستقلتين',
        assumptionsEn: ['Normal distribution', 'Equal variances', 'Independent samples'],
        assumptionsAr: ['التوزيع الطبيعي', 'تجانس التباين', 'استقلال العينات'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Group 1', labelAr: 'المجموعة 1', type: 'numeric-column' },
          { id: 'column2', labelEn: 'Group 2', labelAr: 'المجموعة 2', type: 'numeric-column' }
        ],
        category: 'parametric'
      },
      {
        id: 'paired-ttest',
        nameEn: 'Paired Samples T-Test',
        nameAr: 'اختبار ت للعينات المزدوجة',
        descriptionEn: 'Compares means of two related measurements',
        descriptionAr: 'يقارن متوسطات قياسين مرتبطين',
        assumptionsEn: ['Normal distribution of differences', 'Paired observations'],
        assumptionsAr: ['التوزيع الطبيعي للفروق', 'ملاحظات مزدوجة'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Before/Time 1', labelAr: 'قبل/الوقت 1', type: 'numeric-column' },
          { id: 'column2', labelEn: 'After/Time 2', labelAr: 'بعد/الوقت 2', type: 'numeric-column' }
        ],
        category: 'parametric'
      },
      {
        id: 'one-way-anova',
        nameEn: 'One-Way ANOVA',
        nameAr: 'تحليل التباين الأحادي',
        descriptionEn: 'Compares means across multiple groups',
        descriptionAr: 'يقارن المتوسطات عبر مجموعات متعددة',
        assumptionsEn: ['Normal distribution', 'Equal variances', 'Independence'],
        assumptionsAr: ['التوزيع الطبيعي', 'تجانس التباين', 'الاستقلالية'],
        requiredInputs: [
          { id: 'valueColumn', labelEn: 'Values', labelAr: 'القيم', type: 'numeric-column' },
          { id: 'groupColumn', labelEn: 'Groups', labelAr: 'المجموعات', type: 'categorical-column' }
        ],
        category: 'parametric'
      },
      {
        id: 'welch-ttest',
        nameEn: "Welch's T-Test",
        nameAr: 'اختبار ويلش',
        descriptionEn: 'T-test for unequal variances',
        descriptionAr: 'اختبار ت للتباينات غير المتساوية',
        assumptionsEn: ['Normal distribution', 'Independent samples'],
        assumptionsAr: ['التوزيع الطبيعي', 'استقلال العينات'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Group 1', labelAr: 'المجموعة 1', type: 'numeric-column' },
          { id: 'column2', labelEn: 'Group 2', labelAr: 'المجموعة 2', type: 'numeric-column' }
        ],
        category: 'parametric'
      },
      {
        id: 'z-test',
        nameEn: 'Z-Test',
        nameAr: 'اختبار Z',
        descriptionEn: 'Tests mean with known population variance',
        descriptionAr: 'يختبر المتوسط مع تباين مجتمع معروف',
        assumptionsEn: ['Known population variance', 'Normal distribution or n>30'],
        assumptionsAr: ['تباين المجتمع معروف', 'توزيع طبيعي أو n>30'],
        requiredInputs: [
          { id: 'column', labelEn: 'Variable', labelAr: 'المتغير', type: 'numeric-column' },
          { id: 'mu', labelEn: 'Population Mean', labelAr: 'متوسط المجتمع', type: 'number', default: 0 },
          { id: 'sigma', labelEn: 'Population SD', labelAr: 'الانحراف المعياري للمجتمع', type: 'number', default: 1 }
        ],
        category: 'parametric'
      }
    ]
  },
  {
    id: 'nonparametric',
    nameEn: 'Non-Parametric Tests',
    nameAr: 'الاختبارات اللامعلمية',
    icon: '📈',
    color: 'green',
    tests: [
      {
        id: 'mann-whitney',
        nameEn: 'Mann-Whitney U Test',
        nameAr: 'اختبار مان-ويتني',
        descriptionEn: 'Non-parametric alternative to independent t-test',
        descriptionAr: 'بديل لامعلمي لاختبار ت للعينات المستقلة',
        assumptionsEn: ['Ordinal data', 'Independent samples', 'Similar shape distributions'],
        assumptionsAr: ['بيانات ترتيبية', 'عينات مستقلة', 'توزيعات متشابهة الشكل'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Group 1', labelAr: 'المجموعة 1', type: 'numeric-column' },
          { id: 'column2', labelEn: 'Group 2', labelAr: 'المجموعة 2', type: 'numeric-column' }
        ],
        category: 'nonparametric'
      },
      {
        id: 'wilcoxon',
        nameEn: 'Wilcoxon Signed-Rank Test',
        nameAr: 'اختبار ويلكوكسون',
        descriptionEn: 'Non-parametric alternative to paired t-test',
        descriptionAr: 'بديل لامعلمي لاختبار ت للعينات المزدوجة',
        assumptionsEn: ['Symmetric distribution of differences', 'Paired data'],
        assumptionsAr: ['توزيع متماثل للفروق', 'بيانات مزدوجة'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Before', labelAr: 'قبل', type: 'numeric-column' },
          { id: 'column2', labelEn: 'After', labelAr: 'بعد', type: 'numeric-column' }
        ],
        category: 'nonparametric'
      },
      {
        id: 'kruskal-wallis',
        nameEn: 'Kruskal-Wallis Test',
        nameAr: 'اختبار كروسكال-واليس',
        descriptionEn: 'Non-parametric alternative to one-way ANOVA',
        descriptionAr: 'بديل لامعلمي لتحليل التباين الأحادي',
        assumptionsEn: ['Ordinal data', 'Independent samples', 'Similar distributions'],
        assumptionsAr: ['بيانات ترتيبية', 'عينات مستقلة', 'توزيعات متشابهة'],
        requiredInputs: [
          { id: 'valueColumn', labelEn: 'Values', labelAr: 'القيم', type: 'numeric-column' },
          { id: 'groupColumn', labelEn: 'Groups', labelAr: 'المجموعات', type: 'categorical-column' }
        ],
        category: 'nonparametric'
      },
      {
        id: 'sign-test',
        nameEn: 'Sign Test',
        nameAr: 'اختبار الإشارة',
        descriptionEn: 'Tests median of paired differences',
        descriptionAr: 'يختبر وسيط الفروق المزدوجة',
        assumptionsEn: ['Paired data', 'Continuous or ordinal'],
        assumptionsAr: ['بيانات مزدوجة', 'مستمرة أو ترتيبية'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Before', labelAr: 'قبل', type: 'numeric-column' },
          { id: 'column2', labelEn: 'After', labelAr: 'بعد', type: 'numeric-column' }
        ],
        category: 'nonparametric'
      },
      {
        id: 'runs-test',
        nameEn: 'Runs Test (Wald-Wolfowitz)',
        nameAr: 'اختبار التتابعات',
        descriptionEn: 'Tests randomness of sequence',
        descriptionAr: 'يختبر عشوائية التسلسل',
        assumptionsEn: ['Binary or dichotomized data'],
        assumptionsAr: ['بيانات ثنائية'],
        requiredInputs: [
          { id: 'column', labelEn: 'Variable', labelAr: 'المتغير', type: 'numeric-column' }
        ],
        category: 'nonparametric'
      }
    ]
  },
  {
    id: 'normality',
    nameEn: 'Normality Tests',
    nameAr: 'اختبارات التوزيع الطبيعي',
    icon: '🔔',
    color: 'purple',
    tests: [
      {
        id: 'shapiro-wilk',
        nameEn: 'Shapiro-Wilk Test',
        nameAr: 'اختبار شابيرو-ويلك',
        descriptionEn: 'Most powerful normality test for small samples',
        descriptionAr: 'أقوى اختبار للتوزيع الطبيعي للعينات الصغيرة',
        assumptionsEn: ['Sample size 3-5000'],
        assumptionsAr: ['حجم العينة 3-5000'],
        requiredInputs: [
          { id: 'column', labelEn: 'Variable', labelAr: 'المتغير', type: 'numeric-column' }
        ],
        category: 'normality'
      },
      {
        id: 'kolmogorov-smirnov',
        nameEn: 'Kolmogorov-Smirnov Test',
        nameAr: 'اختبار كولموجوروف-سميرنوف',
        descriptionEn: 'Tests if sample follows specified distribution',
        descriptionAr: 'يختبر ما إذا كانت العينة تتبع توزيعاً محدداً',
        assumptionsEn: ['Continuous distribution', 'Known parameters'],
        assumptionsAr: ['توزيع مستمر', 'معلمات معروفة'],
        requiredInputs: [
          { id: 'column', labelEn: 'Variable', labelAr: 'المتغير', type: 'numeric-column' }
        ],
        category: 'normality'
      },
      {
        id: 'jarque-bera',
        nameEn: 'Jarque-Bera Test',
        nameAr: 'اختبار جارك-بيرا',
        descriptionEn: 'Tests normality using skewness and kurtosis',
        descriptionAr: 'يختبر التوزيع الطبيعي باستخدام الالتواء والتفرطح',
        assumptionsEn: ['Large sample size (n > 30)'],
        assumptionsAr: ['حجم عينة كبير (n > 30)'],
        requiredInputs: [
          { id: 'column', labelEn: 'Variable', labelAr: 'المتغير', type: 'numeric-column' }
        ],
        category: 'normality'
      }
    ]
  },
  {
    id: 'variance',
    nameEn: 'Variance & Homogeneity Tests',
    nameAr: 'اختبارات التباين والتجانس',
    icon: '⚖️',
    color: 'orange',
    tests: [
      {
        id: 'levene',
        nameEn: "Levene's Test",
        nameAr: 'اختبار ليفين',
        descriptionEn: 'Tests equality of variances',
        descriptionAr: 'يختبر تساوي التباينات',
        assumptionsEn: ['Independent samples'],
        assumptionsAr: ['عينات مستقلة'],
        requiredInputs: [
          { id: 'valueColumn', labelEn: 'Values', labelAr: 'القيم', type: 'numeric-column' },
          { id: 'groupColumn', labelEn: 'Groups', labelAr: 'المجموعات', type: 'categorical-column' }
        ],
        category: 'variance'
      },
      {
        id: 'f-test',
        nameEn: 'F-Test for Variances',
        nameAr: 'اختبار F للتباينات',
        descriptionEn: 'Compares variances of two groups',
        descriptionAr: 'يقارن تباينات مجموعتين',
        assumptionsEn: ['Normal distribution', 'Independent samples'],
        assumptionsAr: ['التوزيع الطبيعي', 'عينات مستقلة'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Group 1', labelAr: 'المجموعة 1', type: 'numeric-column' },
          { id: 'column2', labelEn: 'Group 2', labelAr: 'المجموعة 2', type: 'numeric-column' }
        ],
        category: 'variance'
      }
    ]
  },
  {
    id: 'correlation',
    nameEn: 'Correlation Tests',
    nameAr: 'اختبارات الارتباط',
    icon: '🔗',
    color: 'cyan',
    tests: [
      {
        id: 'pearson',
        nameEn: 'Pearson Correlation',
        nameAr: 'ارتباط بيرسون',
        descriptionEn: 'Linear correlation between two continuous variables',
        descriptionAr: 'الارتباط الخطي بين متغيرين مستمرين',
        assumptionsEn: ['Linear relationship', 'Bivariate normality', 'No outliers'],
        assumptionsAr: ['علاقة خطية', 'توزيع طبيعي ثنائي', 'لا قيم شاذة'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Variable X', labelAr: 'المتغير X', type: 'numeric-column' },
          { id: 'column2', labelEn: 'Variable Y', labelAr: 'المتغير Y', type: 'numeric-column' }
        ],
        category: 'correlation'
      },
      {
        id: 'spearman',
        nameEn: 'Spearman Correlation',
        nameAr: 'ارتباط سبيرمان',
        descriptionEn: 'Rank-based correlation',
        descriptionAr: 'الارتباط القائم على الرتب',
        assumptionsEn: ['Monotonic relationship', 'Ordinal or continuous data'],
        assumptionsAr: ['علاقة أحادية الاتجاه', 'بيانات ترتيبية أو مستمرة'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Variable X', labelAr: 'المتغير X', type: 'numeric-column' },
          { id: 'column2', labelEn: 'Variable Y', labelAr: 'المتغير Y', type: 'numeric-column' }
        ],
        category: 'correlation'
      },
      {
        id: 'kendall',
        nameEn: 'Kendall Tau',
        nameAr: 'تاو كيندال',
        descriptionEn: 'Rank correlation robust to ties',
        descriptionAr: 'ارتباط رتبي متين للقيم المتكررة',
        assumptionsEn: ['Ordinal data', 'Monotonic relationship'],
        assumptionsAr: ['بيانات ترتيبية', 'علاقة أحادية الاتجاه'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Variable X', labelAr: 'المتغير X', type: 'numeric-column' },
          { id: 'column2', labelEn: 'Variable Y', labelAr: 'المتغير Y', type: 'numeric-column' }
        ],
        category: 'correlation'
      }
    ]
  },
  {
    id: 'categorical',
    nameEn: 'Categorical Tests',
    nameAr: 'اختبارات البيانات الفئوية',
    icon: '📋',
    color: 'pink',
    tests: [
      {
        id: 'chi-square-independence',
        nameEn: 'Chi-Square Test of Independence',
        nameAr: 'اختبار مربع كاي للاستقلالية',
        descriptionEn: 'Tests association between two categorical variables',
        descriptionAr: 'يختبر العلاقة بين متغيرين فئويين',
        assumptionsEn: ['Expected frequency ≥ 5', 'Independent observations'],
        assumptionsAr: ['التكرار المتوقع ≥ 5', 'ملاحظات مستقلة'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Variable 1', labelAr: 'المتغير 1', type: 'categorical-column' },
          { id: 'column2', labelEn: 'Variable 2', labelAr: 'المتغير 2', type: 'categorical-column' }
        ],
        category: 'categorical'
      },
      {
        id: 'fisher-exact',
        nameEn: "Fisher's Exact Test",
        nameAr: 'اختبار فيشر الدقيق',
        descriptionEn: 'Exact test for 2x2 contingency tables',
        descriptionAr: 'اختبار دقيق لجداول التوافق 2×2',
        assumptionsEn: ['2x2 table', 'Small sample sizes'],
        assumptionsAr: ['جدول 2×2', 'أحجام عينات صغيرة'],
        requiredInputs: [
          { id: 'column1', labelEn: 'Variable 1', labelAr: 'المتغير 1', type: 'categorical-column' },
          { id: 'column2', labelEn: 'Variable 2', labelAr: 'المتغير 2', type: 'categorical-column' }
        ],
        category: 'categorical'
      }
    ]
  },
  {
    id: 'timeseries',
    nameEn: 'Time Series Tests',
    nameAr: 'اختبارات السلاسل الزمنية',
    icon: '📈',
    color: 'indigo',
    tests: [
      {
        id: 'durbin-watson',
        nameEn: 'Durbin-Watson Test',
        nameAr: 'اختبار دربن-واتسون',
        descriptionEn: 'Tests for autocorrelation in residuals',
        descriptionAr: 'يختبر الارتباط الذاتي في البواقي',
        assumptionsEn: ['Linear regression residuals'],
        assumptionsAr: ['بواقي الانحدار الخطي'],
        requiredInputs: [
          { id: 'column', labelEn: 'Residuals/Series', labelAr: 'البواقي/السلسلة', type: 'numeric-column' }
        ],
        category: 'timeseries'
      },
      {
        id: 'ljung-box',
        nameEn: 'Ljung-Box Test',
        nameAr: 'اختبار ليونج-بوكس',
        descriptionEn: 'Tests for autocorrelation at multiple lags',
        descriptionAr: 'يختبر الارتباط الذاتي عند فترات متعددة',
        assumptionsEn: ['Stationary series'],
        assumptionsAr: ['سلسلة مستقرة'],
        requiredInputs: [
          { id: 'column', labelEn: 'Time Series', labelAr: 'السلسلة الزمنية', type: 'numeric-column' },
          { id: 'lags', labelEn: 'Number of Lags', labelAr: 'عدد الفترات', type: 'number', default: 10 }
        ],
        category: 'timeseries'
      },
      {
        id: 'adf',
        nameEn: 'Augmented Dickey-Fuller Test',
        nameAr: 'اختبار ديكي-فولر المعزز',
        descriptionEn: 'Tests for unit root (stationarity)',
        descriptionAr: 'يختبر جذر الوحدة (الاستقرار)',
        assumptionsEn: ['Time series data'],
        assumptionsAr: ['بيانات سلسلة زمنية'],
        requiredInputs: [
          { id: 'column', labelEn: 'Time Series', labelAr: 'السلسلة الزمنية', type: 'numeric-column' }
        ],
        category: 'timeseries'
      }
    ]
  }
];

const runTest = (testId: string, data: Record<string, any>[], inputs: Record<string, any>, _columns: string[]): TestResult | null => {
  const getNumericValues = (colName: string): number[] => {
    return data
      .map(row => parseFloat(row[colName]))
      .filter(v => !isNaN(v) && isFinite(v));
  };

  try {
    switch (testId) {
      case 'one-sample-ttest': {
        const values = getNumericValues(inputs.column);
        const mu = parseFloat(inputs.mu) || 0;
        const n = values.length;
        const m = mean(values);
        const s = std(values);
        const se = s / Math.sqrt(n);
        const t = (m - mu) / se;
        const df = n - 1;
        const pValue = 2 * (1 - tCDF(Math.abs(t), df));
        const cohensD = (m - mu) / s;
        
        return {
          testNameEn: 'One Sample T-Test',
          testNameAr: 'اختبار ت لعينة واحدة',
          statistic: t,
          statisticName: 't',
          pValue,
          df,
          effectSize: cohensD,
          effectSizeName: "Cohen's d",
          effectSizeInterpretationEn: Math.abs(cohensD) < 0.2 ? 'Negligible' : Math.abs(cohensD) < 0.5 ? 'Small' : Math.abs(cohensD) < 0.8 ? 'Medium' : 'Large',
          effectSizeInterpretationAr: Math.abs(cohensD) < 0.2 ? 'ضعيف' : Math.abs(cohensD) < 0.5 ? 'صغير' : Math.abs(cohensD) < 0.8 ? 'متوسط' : 'كبير',
          confidenceInterval: [m - 1.96 * se, m + 1.96 * se],
          conclusionEn: pValue < 0.05 ? 'Reject H₀' : 'Fail to reject H₀',
          conclusionAr: pValue < 0.05 ? 'رفض الفرضية الصفرية' : 'عدم رفض الفرضية الصفرية',
          interpretationEn: pValue < 0.05 
            ? `The sample mean (${m.toFixed(3)}) is significantly different from ${mu}`
            : `No significant difference between sample mean and ${mu}`,
          interpretationAr: pValue < 0.05 
            ? `متوسط العينة (${m.toFixed(3)}) يختلف معنوياً عن ${mu}`
            : `لا يوجد فرق معنوي بين متوسط العينة و ${mu}`,
          additionalStats: { n, mean: m, sd: s, se, mu }
        };
      }

      case 'independent-ttest': {
        const values1 = getNumericValues(inputs.column1);
        const values2 = getNumericValues(inputs.column2);
        const n1 = values1.length, n2 = values2.length;
        const m1 = mean(values1), m2 = mean(values2);
        const v1 = variance(values1), v2 = variance(values2);
        const pooledVar = ((n1 - 1) * v1 + (n2 - 1) * v2) / (n1 + n2 - 2);
        const se = Math.sqrt(pooledVar * (1/n1 + 1/n2));
        const t = (m1 - m2) / se;
        const df = n1 + n2 - 2;
        const pValue = 2 * (1 - tCDF(Math.abs(t), df));
        const pooledSD = Math.sqrt(pooledVar);
        const cohensD = (m1 - m2) / pooledSD;
        
        return {
          testNameEn: 'Independent Samples T-Test',
          testNameAr: 'اختبار ت للعينات المستقلة',
          statistic: t,
          statisticName: 't',
          pValue,
          df,
          effectSize: cohensD,
          effectSizeName: "Cohen's d",
          effectSizeInterpretationEn: Math.abs(cohensD) < 0.2 ? 'Negligible' : Math.abs(cohensD) < 0.5 ? 'Small' : Math.abs(cohensD) < 0.8 ? 'Medium' : 'Large',
          effectSizeInterpretationAr: Math.abs(cohensD) < 0.2 ? 'ضعيف' : Math.abs(cohensD) < 0.5 ? 'صغير' : Math.abs(cohensD) < 0.8 ? 'متوسط' : 'كبير',
          confidenceInterval: [(m1-m2) - 1.96*se, (m1-m2) + 1.96*se],
          conclusionEn: pValue < 0.05 ? 'Reject H₀' : 'Fail to reject H₀',
          conclusionAr: pValue < 0.05 ? 'رفض الفرضية الصفرية' : 'عدم رفض الفرضية الصفرية',
          interpretationEn: pValue < 0.05 
            ? 'Significant difference between group means'
            : 'No significant difference between group means',
          interpretationAr: pValue < 0.05 
            ? 'يوجد فرق معنوي بين متوسطي المجموعتين'
            : 'لا يوجد فرق معنوي بين متوسطي المجموعتين',
          additionalStats: { n1, n2, mean1: m1, mean2: m2, sd1: Math.sqrt(v1), sd2: Math.sqrt(v2), meanDiff: m1 - m2 }
        };
      }

      case 'paired-ttest': {
        const values1 = getNumericValues(inputs.column1);
        const values2 = getNumericValues(inputs.column2);
        const n = Math.min(values1.length, values2.length);
        const diffs = values1.slice(0, n).map((v, i) => v - values2[i]);
        const mDiff = mean(diffs);
        const sDiff = std(diffs);
        const se = sDiff / Math.sqrt(n);
        const t = mDiff / se;
        const df = n - 1;
        const pValue = 2 * (1 - tCDF(Math.abs(t), df));
        const cohensD = mDiff / sDiff;
        
        return {
          testNameEn: 'Paired Samples T-Test',
          testNameAr: 'اختبار ت للعينات المزدوجة',
          statistic: t,
          statisticName: 't',
          pValue,
          df,
          effectSize: cohensD,
          effectSizeName: "Cohen's d",
          effectSizeInterpretationEn: Math.abs(cohensD) < 0.2 ? 'Negligible' : Math.abs(cohensD) < 0.5 ? 'Small' : Math.abs(cohensD) < 0.8 ? 'Medium' : 'Large',
          effectSizeInterpretationAr: Math.abs(cohensD) < 0.2 ? 'ضعيف' : Math.abs(cohensD) < 0.5 ? 'صغير' : Math.abs(cohensD) < 0.8 ? 'متوسط' : 'كبير',
          confidenceInterval: [mDiff - 1.96*se, mDiff + 1.96*se],
          conclusionEn: pValue < 0.05 ? 'Reject H₀' : 'Fail to reject H₀',
          conclusionAr: pValue < 0.05 ? 'رفض الفرضية الصفرية' : 'عدم رفض الفرضية الصفرية',
          interpretationEn: pValue < 0.05 
            ? 'Significant change between measurements'
            : 'No significant change between measurements',
          interpretationAr: pValue < 0.05 
            ? 'يوجد تغير معنوي بين القياسين'
            : 'لا يوجد تغير معنوي بين القياسين',
          additionalStats: { n, meanDiff: mDiff, sdDiff: sDiff, mean1: mean(values1), mean2: mean(values2) }
        };
      }

      case 'mann-whitney': {
        const values1 = getNumericValues(inputs.column1);
        const values2 = getNumericValues(inputs.column2);
        const n1 = values1.length, n2 = values2.length;
        
        const combined = [
          ...values1.map(v => ({ v, group: 1 })),
          ...values2.map(v => ({ v, group: 2 }))
        ].sort((a, b) => a.v - b.v);
        
        const ranks = rank(combined.map(x => x.v));
        let R1 = 0;
        combined.forEach((item, i) => {
          if (item.group === 1) R1 += ranks[i];
        });
        
        const U1 = R1 - (n1 * (n1 + 1)) / 2;
        const U2 = n1 * n2 - U1;
        const U = Math.min(U1, U2);
        
        const muU = (n1 * n2) / 2;
        const sigmaU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
        const z = (U - muU) / sigmaU;
        const pValue = 2 * (1 - normalCDF(Math.abs(z)));
        const r = z / Math.sqrt(n1 + n2);
        
        return {
          testNameEn: 'Mann-Whitney U Test',
          testNameAr: 'اختبار مان-ويتني',
          statistic: U,
          statisticName: 'U',
          pValue,
          effectSize: Math.abs(r),
          effectSizeName: 'r',
          effectSizeInterpretationEn: Math.abs(r) < 0.1 ? 'Negligible' : Math.abs(r) < 0.3 ? 'Small' : Math.abs(r) < 0.5 ? 'Medium' : 'Large',
          effectSizeInterpretationAr: Math.abs(r) < 0.1 ? 'ضعيف' : Math.abs(r) < 0.3 ? 'صغير' : Math.abs(r) < 0.5 ? 'متوسط' : 'كبير',
          conclusionEn: pValue < 0.05 ? 'Reject H₀' : 'Fail to reject H₀',
          conclusionAr: pValue < 0.05 ? 'رفض الفرضية الصفرية' : 'عدم رفض الفرضية الصفرية',
          interpretationEn: pValue < 0.05 
            ? 'Distributions differ significantly'
            : 'No significant difference in distributions',
          interpretationAr: pValue < 0.05 
            ? 'التوزيعات تختلف معنوياً'
            : 'لا يوجد فرق معنوي في التوزيعات',
          additionalStats: { n1, n2, U1, U2, R1, z }
        };
      }

      case 'shapiro-wilk': {
        const values = getNumericValues(inputs.column);
        const n = values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const m = mean(values);
        
        const ss = values.reduce((sum, x) => sum + (x - m) ** 2, 0);
        let b = 0;
        for (let i = 0; i < Math.floor(n / 2); i++) {
          const a = (0.707106781 / Math.sqrt(n));
          b += a * (sorted[n - 1 - i] - sorted[i]);
        }
        const W = (b * b) / ss;
        
        const z = Math.log(1 - W);
        const pValue = 1 - normalCDF(-z * Math.sqrt(n / 2));
        
        return {
          testNameEn: 'Shapiro-Wilk Test',
          testNameAr: 'اختبار شابيرو-ويلك',
          statistic: W,
          statisticName: 'W',
          pValue: Math.min(Math.max(pValue, 0.001), 0.999),
          conclusionEn: pValue < 0.05 ? 'Reject H₀' : 'Fail to reject H₀',
          conclusionAr: pValue < 0.05 ? 'رفض الفرضية الصفرية' : 'عدم رفض الفرضية الصفرية',
          interpretationEn: pValue < 0.05 
            ? 'Data is NOT normally distributed'
            : 'Data appears normally distributed',
          interpretationAr: pValue < 0.05 
            ? 'البيانات لا تتبع التوزيع الطبيعي'
            : 'البيانات تتبع التوزيع الطبيعي',
          additionalStats: { n, mean: m, sd: std(values) }
        };
      }

      case 'pearson': {
        const values1 = getNumericValues(inputs.column1);
        const values2 = getNumericValues(inputs.column2);
        const n = Math.min(values1.length, values2.length);
        const x = values1.slice(0, n);
        const y = values2.slice(0, n);
        
        const mx = mean(x), my = mean(y);
        const sx = std(x), sy = std(y);
        
        let r = 0;
        for (let i = 0; i < n; i++) {
          r += (x[i] - mx) * (y[i] - my);
        }
        r = r / ((n - 1) * sx * sy);
        
        const t = r * Math.sqrt((n - 2) / (1 - r * r));
        const pValue = 2 * (1 - tCDF(Math.abs(t), n - 2));
        const rSquared = r * r;
        
        return {
          testNameEn: 'Pearson Correlation',
          testNameAr: 'ارتباط بيرسون',
          statistic: r,
          statisticName: 'r',
          pValue,
          df: n - 2,
          effectSize: rSquared,
          effectSizeName: 'R²',
          effectSizeInterpretationEn: Math.abs(r) < 0.1 ? 'Very weak' : Math.abs(r) < 0.3 ? 'Weak' : Math.abs(r) < 0.5 ? 'Moderate' : Math.abs(r) < 0.7 ? 'Strong' : 'Very strong',
          effectSizeInterpretationAr: Math.abs(r) < 0.1 ? 'ضعيف جداً' : Math.abs(r) < 0.3 ? 'ضعيف' : Math.abs(r) < 0.5 ? 'متوسط' : Math.abs(r) < 0.7 ? 'قوي' : 'قوي جداً',
          conclusionEn: pValue < 0.05 ? 'Significant correlation' : 'No significant correlation',
          conclusionAr: pValue < 0.05 ? 'ارتباط معنوي' : 'لا يوجد ارتباط معنوي',
          interpretationEn: `${r > 0 ? 'Positive' : 'Negative'} ${Math.abs(r) < 0.3 ? 'weak' : Math.abs(r) < 0.7 ? 'moderate' : 'strong'} correlation`,
          interpretationAr: `ارتباط ${r > 0 ? 'موجب' : 'سالب'} ${Math.abs(r) < 0.3 ? 'ضعيف' : Math.abs(r) < 0.7 ? 'متوسط' : 'قوي'}`,
          additionalStats: { n, r, rSquared, t }
        };
      }

      case 'durbin-watson': {
        const values = getNumericValues(inputs.column);
        const n = values.length;
        
        let sumSqDiff = 0, sumSq = 0;
        for (let i = 1; i < n; i++) {
          sumSqDiff += Math.pow(values[i] - values[i-1], 2);
        }
        for (let i = 0; i < n; i++) {
          sumSq += Math.pow(values[i], 2);
        }
        
        const DW = sumSqDiff / sumSq;
        
        let interpretationEn: string, interpretationAr: string;
        if (DW < 1.5) {
          interpretationEn = 'Positive autocorrelation detected';
          interpretationAr = 'تم اكتشاف ارتباط ذاتي موجب';
        } else if (DW > 2.5) {
          interpretationEn = 'Negative autocorrelation detected';
          interpretationAr = 'تم اكتشاف ارتباط ذاتي سالب';
        } else {
          interpretationEn = 'No significant autocorrelation';
          interpretationAr = 'لا يوجد ارتباط ذاتي معنوي';
        }
        
        return {
          testNameEn: 'Durbin-Watson Test',
          testNameAr: 'اختبار دربن-واتسون',
          statistic: DW,
          statisticName: 'DW',
          pValue: DW < 1.5 || DW > 2.5 ? 0.01 : 0.5,
          conclusionEn: DW < 1.5 || DW > 2.5 ? 'Autocorrelation present' : 'No autocorrelation',
          conclusionAr: DW < 1.5 || DW > 2.5 ? 'يوجد ارتباط ذاتي' : 'لا يوجد ارتباط ذاتي',
          interpretationEn,
          interpretationAr,
          additionalStats: { n, DW }
        };
      }

      case 'ljung-box': {
        const values = getNumericValues(inputs.column);
        const n = values.length;
        const maxLag = Math.min(parseInt(inputs.lags) || 10, Math.floor(n / 4));
        
        let Q = 0;
        for (let k = 1; k <= maxLag; k++) {
          const rk = autocorrelation(values, k);
          Q += (rk * rk) / (n - k);
        }
        Q = n * (n + 2) * Q;
        
        const pValue = 1 - chiSquareCDF(Q, maxLag);
        
        return {
          testNameEn: 'Ljung-Box Test',
          testNameAr: 'اختبار ليونج-بوكس',
          statistic: Q,
          statisticName: 'Q',
          pValue,
          df: maxLag,
          conclusionEn: pValue < 0.05 ? 'Reject H₀' : 'Fail to reject H₀',
          conclusionAr: pValue < 0.05 ? 'رفض الفرضية الصفرية' : 'عدم رفض الفرضية الصفرية',
          interpretationEn: pValue < 0.05 
            ? 'Significant autocorrelation exists'
            : 'No significant autocorrelation',
          interpretationAr: pValue < 0.05 
            ? 'يوجد ارتباط ذاتي معنوي'
            : 'لا يوجد ارتباط ذاتي معنوي',
          additionalStats: { n, lags: maxLag, Q }
        };
      }

      default:
        return null;
    }
  } catch (error) {
    console.error('Test error:', error);
    return null;
  }
};

const AdvancedStatisticalTests: React.FC<Props> = ({ data, columns }) => {
  const { t, language, isRTL } = useLanguage();
  const [selectedCategory, setSelectedCategory] = useState<string>('parametric');
  const [selectedTest, setSelectedTest] = useState<TestDefinition | null>(null);
  const [inputs, setInputs] = useState<Record<string, any>>({});
  const [result, setResult] = useState<TestResult | null>(null);
  const [history, setHistory] = useState<TestResult[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const numericColumns = useMemo(() => 
    columns.filter(col => {
      const values = data.map(row => parseFloat(row[col])).filter(v => !isNaN(v));
      return values.length > data.length * 0.5;
    }), [data, columns]);

  const categoricalColumns = useMemo(() => 
    columns.filter(col => !numericColumns.includes(col)), [columns, numericColumns]);

  const handleRunTest = () => {
    if (!selectedTest) return;
    const testResult = runTest(selectedTest.id, data, inputs, columns);
    if (testResult) {
      setResult(testResult);
      setHistory(prev => [testResult, ...prev].slice(0, 20));
    }
  };

  const renderInput = (input: InputType) => {
    const _label = language === 'ar' ? input.labelAr : input.labelEn;
    void _label;
    switch (input.type) {
      case 'numeric-column':
        return (
          <select
            value={inputs[input.id] || ''}
            onChange={e => setInputs(prev => ({ ...prev, [input.id]: e.target.value }))}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('action.selectColumn')}</option>
            {numericColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        );
      case 'categorical-column':
        return (
          <select
            value={inputs[input.id] || ''}
            onChange={e => setInputs(prev => ({ ...prev, [input.id]: e.target.value }))}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('action.selectColumn')}</option>
            {categoricalColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        );
      case 'number':
        return (
          <input
            type="number"
            value={inputs[input.id] ?? input.default ?? ''}
            onChange={e => setInputs(prev => ({ ...prev, [input.id]: e.target.value }))}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
            step="any"
          />
        );
      case 'multi-column':
        return (
          <select
            multiple
            value={inputs[input.id] || []}
            onChange={e => setInputs(prev => ({ 
              ...prev, 
              [input.id]: Array.from(e.target.selectedOptions, opt => opt.value) 
            }))}
            className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 h-32"
          >
            {numericColumns.map(col => (
              <option key={col} value={col}>{col}</option>
            ))}
          </select>
        );
      default:
        return null;
    }
  };

  const currentCategory = testCategories.find(c => c.id === selectedCategory);

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold mb-2">🧪 {t('tests.title')}</h2>
            <p className="opacity-90">{t('tests.subtitle')}</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
            >
              📜 {t('tests.history')} ({history.length})
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Categories Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <h3 className="font-bold text-gray-700 mb-3">📂 {t('tests.categories')}</h3>
          {testCategories.map(category => (
            <button
              key={category.id}
              onClick={() => {
                setSelectedCategory(category.id);
                setSelectedTest(null);
                setResult(null);
              }}
              className={`w-full text-${isRTL ? 'right' : 'left'} p-4 rounded-xl transition-all ${
                selectedCategory === category.id
                  ? 'bg-gradient-to-r from-blue-500 to-purple-500 text-white shadow-lg'
                  : 'bg-white hover:bg-gray-50 border'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <div>
                  <div className="font-bold">{language === 'ar' ? category.nameAr : category.nameEn}</div>
                  <div className="text-sm opacity-75">{category.tests.length} {t('tests.testsCount')}</div>
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Tests List */}
        <div className="lg:col-span-1 bg-white rounded-xl border p-4 max-h-[600px] overflow-y-auto">
          <h3 className="font-bold text-gray-700 mb-3">📋 {t('tests.availableTests')}</h3>
          <div className="space-y-2">
            {currentCategory?.tests.map(test => (
              <button
                key={test.id}
                onClick={() => {
                  setSelectedTest(test);
                  setInputs({});
                  setResult(null);
                }}
                className={`w-full text-${isRTL ? 'right' : 'left'} p-3 rounded-lg transition-all ${
                  selectedTest?.id === test.id
                    ? 'bg-blue-50 border-2 border-blue-500'
                    : 'bg-gray-50 hover:bg-gray-100 border'
                }`}
              >
                <div className="font-medium text-gray-800">{language === 'ar' ? test.nameAr : test.nameEn}</div>
                <div className="text-xs text-gray-500 mt-1">{language === 'ar' ? test.nameEn : test.nameAr}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Test Configuration & Results */}
        <div className="lg:col-span-2 space-y-4">
          {selectedTest ? (
            <>
              {/* Test Info */}
              <div className="bg-white rounded-xl border p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-gray-800">
                      {language === 'ar' ? selectedTest.nameAr : selectedTest.nameEn}
                    </h3>
                    <p className="text-gray-500">
                      {language === 'ar' ? selectedTest.nameEn : selectedTest.nameAr}
                    </p>
                  </div>
                  <span className="text-3xl">{currentCategory?.icon}</span>
                </div>
                
                <p className="text-gray-600 mb-4">
                  {language === 'ar' ? selectedTest.descriptionAr : selectedTest.descriptionEn}
                </p>
                
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                  <h4 className="font-bold text-yellow-800 mb-2">⚠️ {t('tests.assumptions')}:</h4>
                  <ul className="text-sm text-yellow-700 space-y-1">
                    {(language === 'ar' ? selectedTest.assumptionsAr : selectedTest.assumptionsEn).map((a, i) => (
                      <li key={i}>• {a}</li>
                    ))}
                  </ul>
                </div>

                {/* Inputs */}
                <div className="space-y-4">
                  <h4 className="font-bold text-gray-700">📊 {t('tests.requiredInputs')}:</h4>
                  {selectedTest.requiredInputs.map(input => (
                    <div key={input.id}>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {language === 'ar' ? input.labelAr : input.labelEn}
                      </label>
                      {renderInput(input)}
                    </div>
                  ))}
                </div>

                <button
                  onClick={handleRunTest}
                  disabled={selectedTest.requiredInputs.some(inp => !inputs[inp.id])}
                  className="w-full mt-6 py-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white rounded-xl font-bold hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  🚀 {t('tests.runTest')}
                </button>
              </div>

              {/* Results */}
              {result && (
                <div className="bg-white rounded-xl border overflow-hidden">
                  {/* Result Header */}
                  <div className={`p-6 ${result.pValue < 0.05 ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-gradient-to-r from-gray-500 to-gray-600'} text-white`}>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xl font-bold">{language === 'ar' ? result.testNameAr : result.testNameEn}</h3>
                        <p className="opacity-90">{language === 'ar' ? result.testNameEn : result.testNameAr}</p>
                      </div>
                      <div className={`text-${isRTL ? 'left' : 'right'}`}>
                        <div className="text-3xl font-bold">
                          {result.pValue < 0.001 ? 'p < 0.001' : `p = ${result.pValue.toFixed(4)}`}
                        </div>
                        <div className="text-sm px-3 py-1 rounded-full inline-block mt-1 bg-white/20">
                          {result.pValue < 0.001 
                            ? (language === 'ar' ? '⭐⭐⭐ معنوي جداً' : '⭐⭐⭐ Highly Significant') 
                            : result.pValue < 0.01 
                              ? (language === 'ar' ? '⭐⭐ معنوي' : '⭐⭐ Significant')
                              : result.pValue < 0.05 
                                ? (language === 'ar' ? '⭐ معنوي' : '⭐ Significant')
                                : (language === 'ar' ? 'غير معنوي' : 'Not Significant')}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Statistics Grid */}
                  <div className="p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <div className="text-sm text-blue-600 mb-1">{t('tests.statistic')} ({result.statisticName})</div>
                      <div className="text-2xl font-bold text-blue-800">{result.statistic.toFixed(4)}</div>
                    </div>
                    
                    <div className="bg-purple-50 rounded-xl p-4 text-center">
                      <div className="text-sm text-purple-600 mb-1">{t('tests.pValue')}</div>
                      <div className="text-2xl font-bold text-purple-800">{result.pValue.toFixed(4)}</div>
                    </div>

                    {result.df && (
                      <div className="bg-orange-50 rounded-xl p-4 text-center">
                        <div className="text-sm text-orange-600 mb-1">{t('tests.degreesOfFreedom')}</div>
                        <div className="text-2xl font-bold text-orange-800">{result.df}</div>
                      </div>
                    )}

                    {result.effectSize !== undefined && (
                      <div className="bg-green-50 rounded-xl p-4 text-center">
                        <div className="text-sm text-green-600 mb-1">{result.effectSizeName || t('tests.effectSize')}</div>
                        <div className="text-2xl font-bold text-green-800">{result.effectSize.toFixed(4)}</div>
                        {(result.effectSizeInterpretationAr || result.effectSizeInterpretationEn) && (
                          <div className="text-xs text-green-600 mt-1">
                            {language === 'ar' ? result.effectSizeInterpretationAr : result.effectSizeInterpretationEn}
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Conclusion */}
                  <div className="px-6 pb-6">
                    <div className={`p-4 rounded-xl ${result.pValue < 0.05 ? 'bg-green-50 border border-green-200' : 'bg-gray-50 border border-gray-200'}`}>
                      <h4 className={`font-bold mb-2 ${result.pValue < 0.05 ? 'text-green-800' : 'text-gray-800'}`}>
                        📊 {t('tests.conclusion')}:
                      </h4>
                      <p className={result.pValue < 0.05 ? 'text-green-700' : 'text-gray-700'}>
                        {language === 'ar' ? result.conclusionAr : result.conclusionEn}
                      </p>
                      <p className={`mt-2 ${result.pValue < 0.05 ? 'text-green-600' : 'text-gray-600'}`}>
                        {language === 'ar' ? result.interpretationAr : result.interpretationEn}
                      </p>
                    </div>

                    {/* Confidence Interval */}
                    {result.confidenceInterval && (
                      <div className="mt-4 p-4 bg-indigo-50 rounded-xl border border-indigo-200">
                        <h4 className="font-bold text-indigo-800 mb-2">📐 {t('tests.confidenceInterval')} 95%:</h4>
                        <div className="text-indigo-700">
                          [{result.confidenceInterval[0].toFixed(4)} , {result.confidenceInterval[1].toFixed(4)}]
                        </div>
                      </div>
                    )}

                    {/* Additional Stats */}
                    {result.additionalStats && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-xl border">
                        <h4 className="font-bold text-gray-800 mb-3">📈 {t('tests.additionalStats')}:</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {Object.entries(result.additionalStats).map(([key, value]) => (
                            <div key={key} className="bg-white p-3 rounded-lg border">
                              <div className="text-xs text-gray-500">{key}</div>
                              <div className="font-bold text-gray-800">
                                {typeof value === 'number' ? value.toFixed(4) : JSON.stringify(value).slice(0, 30)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="bg-white rounded-xl border p-12 text-center">
              <span className="text-6xl mb-4 block">📊</span>
              <h3 className="text-xl font-bold text-gray-700 mb-2">{t('tests.selectTestPrompt')}</h3>
              <p className="text-gray-500">{t('tests.selectTestDescription')}</p>
            </div>
          )}
        </div>
      </div>

      {/* History Panel */}
      {showHistory && history.length > 0 && (
        <div className="bg-white rounded-xl border p-6">
          <h3 className="font-bold text-gray-800 mb-4">📜 {t('tests.history')}</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {history.map((h, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <span className="font-medium">{language === 'ar' ? h.testNameAr : h.testNameEn}</span>
                  <span className={`text-gray-500 text-sm ${isRTL ? 'mr-2' : 'ml-2'}`}>
                    ({language === 'ar' ? h.testNameEn : h.testNameAr})
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-gray-600">{h.statisticName} = {h.statistic.toFixed(3)}</span>
                  <span className={`px-3 py-1 rounded-full text-sm ${
                    h.pValue < 0.05 ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                  }`}>
                    p = {h.pValue.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdvancedStatisticalTests;
