import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n';
import {
  Brain,
  Sparkles,
  Target,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  ArrowLeft,
  Lightbulb,
  BarChart3,
  TrendingUp,
  Users,
  Layers,
  Clock,
  FileQuestion,
  ChevronDown,
  ChevronUp,
  Play,
  BookOpen,
  Award,
  Settings,
  RefreshCw,
  Download,
  Share2,
  Filter,
  MessageCircle,
  PieChart,
  Activity,
  Hash,
  Calendar,
  Type,
  ToggleLeft,
  GitBranch,
  Shuffle,
  Scale,
  Compass
} from 'lucide-react';

interface SmartTestAdvisorProps {
  data: Record<string, any>[];
  columns: string[];
}

interface ColumnAnalysis {
  name: string;
  type: 'numeric' | 'categorical' | 'ordinal' | 'datetime' | 'boolean' | 'text';
  uniqueValues: number;
  missingCount: number;
  missingPercent: number;
  isNormal?: boolean;
  skewness?: number;
  kurtosis?: number;
  outlierCount?: number;
  categories?: string[];
  mean?: number;
  std?: number;
  min?: number;
  max?: number;
}

interface ResearchQuestion {
  id: string;
  category: string;
  categoryEn: string;
  question: string;
  questionEn: string;
  description: string;
  descriptionEn: string;
  icon: React.ReactNode;
  requiredVars: { type: string; count: number | string; description: string; descriptionEn: string }[];
  examples: string[];
  examplesEn: string[];
}

interface TestRecommendation {
  testName: string;
  testNameAr: string;
  category: string;
  categoryEn: string;
  confidence: number;
  matchScore: number;
  description: string;
  descriptionEn: string;
  assumptions: { name: string; nameEn: string; met: boolean; details: string; detailsEn: string }[];
  alternativeIf: string;
  alternativeIfEn: string;
  alternativeTest: string;
  interpretation: string;
  interpretationEn: string;
  effectSize: string;
  effectSizeEn: string;
  sampleSizeNote: string;
  sampleSizeNoteEn: string;
  references: string[];
}

const SmartTestAdvisor: React.FC<SmartTestAdvisorProps> = ({ data, columns }) => {
  const { language, isRTL } = useLanguage();
  
  const [step, setStep] = useState<number>(1);
  const [selectedQuestion, setSelectedQuestion] = useState<ResearchQuestion | null>(null);
  const [selectedVariables, setSelectedVariables] = useState<{
    dependent: string[];
    independent: string[];
    grouping: string[];
    covariate: string[];
  }>({
    dependent: [],
    independent: [],
    grouping: [],
    covariate: []
  });
  const [recommendations, setRecommendations] = useState<TestRecommendation[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestRecommendation | null>(null);
  const [testResult, setTestResult] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [significanceLevel, setSignificanceLevel] = useState(0.05);
  const [expandedAssumption, setExpandedAssumption] = useState<string | null>(null);

  // النصوص المترجمة
  const texts = {
    title: language === 'ar' ? 'المستشار الإحصائي الذكي' : 'Smart Statistical Advisor',
    subtitle: language === 'ar' ? 'دليلك لاختيار الاختبار الإحصائي المناسب' : 'Your guide to choosing the right statistical test',
    
    // Steps
    step1: language === 'ar' ? 'تحليل البيانات' : 'Data Analysis',
    step2: language === 'ar' ? 'سؤال البحث' : 'Research Question',
    step3: language === 'ar' ? 'اختيار المتغيرات' : 'Variable Selection',
    step4: language === 'ar' ? 'التوصيات' : 'Recommendations',
    step5: language === 'ar' ? 'التنفيذ' : 'Execution',
    
    // Data Analysis
    dataAnalysisTitle: language === 'ar' ? 'تحليل البيانات المتاحة' : 'Available Data Analysis',
    totalRows: language === 'ar' ? 'إجمالي الصفوف' : 'Total Rows',
    numericVars: language === 'ar' ? 'متغيرات رقمية' : 'Numeric Variables',
    categoricalVars: language === 'ar' ? 'متغيرات فئوية' : 'Categorical Variables',
    columnsWithMissing: language === 'ar' ? 'أعمدة بها فجوات' : 'Columns with Gaps',
    
    // Table headers
    variable: language === 'ar' ? 'المتغير' : 'Variable',
    type: language === 'ar' ? 'النوع' : 'Type',
    uniqueValues: language === 'ar' ? 'القيم الفريدة' : 'Unique Values',
    missing: language === 'ar' ? 'المفقودة' : 'Missing',
    distribution: language === 'ar' ? 'التوزيع' : 'Distribution',
    notes: language === 'ar' ? 'ملاحظات' : 'Notes',
    
    // Data types
    numeric: language === 'ar' ? 'رقمي' : 'Numeric',
    categorical: language === 'ar' ? 'فئوي' : 'Categorical',
    ordinal: language === 'ar' ? 'ترتيبي' : 'Ordinal',
    datetime: language === 'ar' ? 'تاريخ' : 'Date',
    boolean: language === 'ar' ? 'منطقي' : 'Boolean',
    text: language === 'ar' ? 'نصي' : 'Text',
    
    // Distribution
    normal: language === 'ar' ? 'طبيعي' : 'Normal',
    notNormal: language === 'ar' ? 'غير طبيعي' : 'Not Normal',
    outliers: language === 'ar' ? 'قيم شاذة' : 'outliers',
    categories: language === 'ar' ? 'فئة' : 'categories',
    
    // Navigation
    next: language === 'ar' ? 'التالي' : 'Next',
    previous: language === 'ar' ? 'السابق' : 'Previous',
    nextStep2: language === 'ar' ? 'التالي: تحديد سؤال البحث' : 'Next: Define Research Question',
    nextStep3: language === 'ar' ? 'التالي: اختيار المتغيرات' : 'Next: Select Variables',
    
    // Research Question
    researchQuestionTitle: language === 'ar' ? 'ما هو سؤالك البحثي؟' : 'What is your research question?',
    researchQuestionSubtitle: language === 'ar' ? 'اختر السؤال الذي يصف هدفك من التحليل الإحصائي' : 'Choose the question that describes your analysis goal',
    
    // Categories
    comparison: language === 'ar' ? 'المقارنة' : 'Comparison',
    relationship: language === 'ar' ? 'العلاقة' : 'Relationship',
    prediction: language === 'ar' ? 'التنبؤ' : 'Prediction',
    assumptions: language === 'ar' ? 'الافتراضات' : 'Assumptions',
    timeSeries: language === 'ar' ? 'السلاسل الزمنية' : 'Time Series',
    goodnessOfFit: language === 'ar' ? 'المطابقة' : 'Goodness of Fit',
    measurement: language === 'ar' ? 'القياس' : 'Measurement',
    
    // Variable Selection
    variableSelectionTitle: language === 'ar' ? 'اختر المتغيرات' : 'Select Variables',
    dependentVar: language === 'ar' ? 'المتغير التابع (المراد دراسته)' : 'Dependent Variable (to be studied)',
    independentVar: language === 'ar' ? 'المتغير المستقل (المفسر)' : 'Independent Variable (predictor)',
    groupingVar: language === 'ar' ? 'متغير التجميع (للمقارنة بين المجموعات)' : 'Grouping Variable (for group comparison)',
    advancedOptions: language === 'ar' ? 'خيارات متقدمة' : 'Advanced Options',
    significanceLevel: language === 'ar' ? 'مستوى الدلالة (α)' : 'Significance Level (α)',
    covariate: language === 'ar' ? 'متغير مشترك (Covariate)' : 'Covariate',
    none: language === 'ar' ? '-- لا يوجد --' : '-- None --',
    confidence99: language === 'ar' ? '99% ثقة' : '99% confidence',
    confidence95: language === 'ar' ? '95% ثقة' : '95% confidence',
    confidence90: language === 'ar' ? '90% ثقة' : '90% confidence',
    analyzeAndRecommend: language === 'ar' ? 'تحليل واقتراح الاختبارات' : 'Analyze & Recommend Tests',
    required: language === 'ar' ? '*' : '*',
    
    // Recommendations
    recommendationsTitle: language === 'ar' ? 'الاختبارات الموصى بها' : 'Recommended Tests',
    analyzing: language === 'ar' ? 'جاري تحليل البيانات وفحص الافتراضات...' : 'Analyzing data and checking assumptions...',
    noTestsFound: language === 'ar' ? 'لم يتم العثور على اختبارات مناسبة' : 'No suitable tests found',
    ensureVariables: language === 'ar' ? 'تأكد من اختيار المتغيرات المناسبة لسؤال البحث' : 'Make sure to select appropriate variables for the research question',
    match: language === 'ar' ? 'مطابقة' : 'Match',
    statisticalAssumptions: language === 'ar' ? 'الافتراضات الإحصائية' : 'Statistical Assumptions',
    effectSize: language === 'ar' ? 'حجم الأثر' : 'Effect Size',
    alternative: language === 'ar' ? 'البديل' : 'Alternative',
    sampleSize: language === 'ar' ? 'حجم العينة' : 'Sample Size',
    howToInterpret: language === 'ar' ? 'كيفية التفسير' : 'How to Interpret',
    runThisTest: language === 'ar' ? 'تنفيذ هذا الاختبار' : 'Run This Test',
    
    // Test categories
    parametric: language === 'ar' ? 'معلمي' : 'Parametric',
    nonParametric: language === 'ar' ? 'لامعلمي' : 'Non-parametric',
    distributionTest: language === 'ar' ? 'توزيع' : 'Distribution',
    homogeneity: language === 'ar' ? 'تجانس' : 'Homogeneity',
    reliability: language === 'ar' ? 'موثوقية' : 'Reliability',
    
    // Results
    resultsTitle: language === 'ar' ? 'نتائج الاختبار' : 'Test Results',
    statisticValue: language === 'ar' ? 'قيمة الإحصائي' : 'Statistic Value',
    pValue: language === 'ar' ? 'القيمة الاحتمالية' : 'P-Value',
    degreesOfFreedom: language === 'ar' ? 'درجات الحرية' : 'Degrees of Freedom',
    confidenceInterval: language === 'ar' ? 'فترة الثقة 95%' : '95% Confidence Interval',
    interpretation: language === 'ar' ? 'التفسير' : 'Interpretation',
    significant: language === 'ar' ? 'دال إحصائياً' : 'Statistically Significant',
    notSignificant: language === 'ar' ? 'غير دال' : 'Not Significant',
    selectAnotherTest: language === 'ar' ? 'اختيار اختبار آخر' : 'Select Another Test',
    exportResults: language === 'ar' ? 'تصدير النتائج' : 'Export Results',
    addToReport: language === 'ar' ? 'إضافة للتقرير' : 'Add to Report',
    
    // Interpretation texts
    rejectNull: language === 'ar' 
      ? 'نرفض الفرضية الصفرية ونستنتج وجود فرق/علاقة دالة إحصائياً.' 
      : 'We reject the null hypothesis and conclude there is a statistically significant difference/relationship.',
    failToRejectNull: language === 'ar' 
      ? 'لا يمكن رفض الفرضية الصفرية. لا يوجد دليل كافٍ على وجود فرق/علاقة دالة إحصائياً.' 
      : 'We fail to reject the null hypothesis. There is insufficient evidence of a statistically significant difference/relationship.',
    since: language === 'ar' ? 'بما أن' : 'Since',
    lessThan: language === 'ar' ? 'أقل من' : 'less than',
    greaterThan: language === 'ar' ? 'أكبر من' : 'greater than',
    effectSizeIndicates: language === 'ar' ? 'حجم الأثر يشير إلى تأثير' : 'Effect size indicates',
    small: language === 'ar' ? 'ضعيف' : 'small',
    medium: language === 'ar' ? 'متوسط' : 'medium',
    large: language === 'ar' ? 'قوي' : 'large',
    effect: language === 'ar' ? 'تأثير' : 'effect',
    
    // Any type
    anyType: language === 'ar' ? 'أي نوع' : 'any type'
  };

  // تحليل الأعمدة
  const columnAnalysis = useMemo((): ColumnAnalysis[] => {
    return columns.map(col => {
      const values = data.map(row => row[col]).filter(v => v !== null && v !== undefined && v !== '');
      const allValues = data.map(row => row[col]);
      const uniqueValues = [...new Set(values)];
      const missingCount = allValues.length - values.length;
      
      const numericValues = values.filter(v => !isNaN(Number(v)));
      const isNumeric = numericValues.length > values.length * 0.8;
      
      const datePatterns = [/^\d{4}-\d{2}-\d{2}/, /^\d{2}\/\d{2}\/\d{4}/];
      const isDate = values.some(v => datePatterns.some(p => p.test(String(v))));
      
      const booleanValues = ['true', 'false', '0', '1', 'yes', 'no', 'نعم', 'لا'];
      const isBoolean = values.every(v => booleanValues.includes(String(v).toLowerCase()));
      
      let type: ColumnAnalysis['type'] = 'text';
      if (isBoolean) type = 'boolean';
      else if (isDate) type = 'datetime';
      else if (isNumeric) type = 'numeric';
      else if (uniqueValues.length <= 20) type = 'categorical';
      else if (uniqueValues.length <= 10 && values.every(v => !isNaN(Number(v)))) type = 'ordinal';
      
      const analysis: ColumnAnalysis = {
        name: col,
        type,
        uniqueValues: uniqueValues.length,
        missingCount,
        missingPercent: (missingCount / allValues.length) * 100,
        categories: type === 'categorical' ? uniqueValues.map(String).slice(0, 20) : undefined
      };
      
      if (type === 'numeric') {
        const nums = numericValues.map(Number);
        const n = nums.length;
        const mean = nums.reduce((a, b) => a + b, 0) / n;
        const variance = nums.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / n;
        const std = Math.sqrt(variance);
        
        const skewness = nums.reduce((a, b) => a + Math.pow((b - mean) / std, 3), 0) / n;
        const kurtosis = nums.reduce((a, b) => a + Math.pow((b - mean) / std, 4), 0) / n - 3;
        const isNormal = Math.abs(skewness) < 2 && Math.abs(kurtosis) < 7;
        
        const sorted = [...nums].sort((a, b) => a - b);
        const q1 = sorted[Math.floor(n * 0.25)];
        const q3 = sorted[Math.floor(n * 0.75)];
        const iqr = q3 - q1;
        const outlierCount = nums.filter(v => v < q1 - 1.5 * iqr || v > q3 + 1.5 * iqr).length;
        
        analysis.mean = mean;
        analysis.std = std;
        analysis.min = Math.min(...nums);
        analysis.max = Math.max(...nums);
        analysis.skewness = skewness;
        analysis.kurtosis = kurtosis;
        analysis.isNormal = isNormal;
        analysis.outlierCount = outlierCount;
      }
      
      return analysis;
    });
  }, [data, columns]);

  // الأسئلة البحثية
  const researchQuestions: ResearchQuestion[] = [
    {
      id: 'compare_two_means_independent',
      category: 'المقارنة',
      categoryEn: 'Comparison',
      question: 'هل يوجد فرق بين متوسطي مجموعتين مستقلتين؟',
      questionEn: 'Is there a difference between the means of two independent groups?',
      description: 'مقارنة متوسط متغير رقمي بين مجموعتين مختلفتين (مثل: ذكور vs إناث)',
      descriptionEn: 'Compare the mean of a numeric variable between two different groups (e.g., males vs females)',
      icon: <Users className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 1, description: 'متغير رقمي للمقارنة', descriptionEn: 'Numeric variable to compare' },
        { type: 'categorical', count: 1, description: 'متغير تصنيفي (مجموعتين)', descriptionEn: 'Categorical variable (two groups)' }
      ],
      examples: ['هل يختلف الراتب بين الذكور والإناث؟', 'هل يختلف الأداء بين المجموعة التجريبية والضابطة؟'],
      examplesEn: ['Does salary differ between males and females?', 'Does performance differ between experimental and control groups?']
    },
    {
      id: 'compare_two_means_paired',
      category: 'المقارنة',
      categoryEn: 'Comparison',
      question: 'هل يوجد فرق بين قياسين لنفس المجموعة؟',
      questionEn: 'Is there a difference between two measurements for the same group?',
      description: 'مقارنة قياسات متكررة لنفس الأفراد (قبل وبعد)',
      descriptionEn: 'Compare repeated measurements for the same individuals (before and after)',
      icon: <RefreshCw className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 2, description: 'متغيرين رقميين (قبل وبعد)', descriptionEn: 'Two numeric variables (before and after)' }
      ],
      examples: ['هل تحسن الأداء بعد التدريب؟', 'هل انخفض الوزن بعد الحمية؟'],
      examplesEn: ['Did performance improve after training?', 'Did weight decrease after the diet?']
    },
    {
      id: 'compare_multiple_means',
      category: 'المقارنة',
      categoryEn: 'Comparison',
      question: 'هل يوجد فرق بين متوسطات ثلاث مجموعات أو أكثر؟',
      questionEn: 'Is there a difference between the means of three or more groups?',
      description: 'مقارنة متوسط متغير رقمي بين أكثر من مجموعتين',
      descriptionEn: 'Compare the mean of a numeric variable between more than two groups',
      icon: <Layers className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 1, description: 'متغير رقمي للمقارنة', descriptionEn: 'Numeric variable to compare' },
        { type: 'categorical', count: 1, description: 'متغير تصنيفي (3+ مجموعات)', descriptionEn: 'Categorical variable (3+ groups)' }
      ],
      examples: ['هل يختلف الأداء حسب المستوى التعليمي؟', 'هل تختلف المبيعات حسب المنطقة؟'],
      examplesEn: ['Does performance differ by education level?', 'Do sales differ by region?']
    },
    {
      id: 'compare_proportions',
      category: 'المقارنة',
      categoryEn: 'Comparison',
      question: 'هل يوجد فرق بين نسبتين أو أكثر؟',
      questionEn: 'Is there a difference between two or more proportions?',
      description: 'مقارنة نسب أو تكرارات بين مجموعات',
      descriptionEn: 'Compare proportions or frequencies between groups',
      icon: <PieChart className="w-5 h-5" />,
      requiredVars: [
        { type: 'categorical', count: 2, description: 'متغيرين فئويين', descriptionEn: 'Two categorical variables' }
      ],
      examples: ['هل تختلف نسبة النجاح بين الجنسين؟', 'هل يختلف التفضيل حسب الفئة العمرية؟'],
      examplesEn: ['Does success rate differ between genders?', 'Does preference differ by age group?']
    },
    {
      id: 'relationship_two_numeric',
      category: 'العلاقة',
      categoryEn: 'Relationship',
      question: 'هل توجد علاقة بين متغيرين رقميين؟',
      questionEn: 'Is there a relationship between two numeric variables?',
      description: 'قياس قوة واتجاه العلاقة بين متغيرين كميين',
      descriptionEn: 'Measure the strength and direction of the relationship between two quantitative variables',
      icon: <TrendingUp className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 2, description: 'متغيرين رقميين', descriptionEn: 'Two numeric variables' }
      ],
      examples: ['هل توجد علاقة بين العمر والدخل؟', 'هل يرتبط الطول بالوزن؟'],
      examplesEn: ['Is there a relationship between age and income?', 'Is height related to weight?']
    },
    {
      id: 'relationship_categorical',
      category: 'العلاقة',
      categoryEn: 'Relationship',
      question: 'هل توجد علاقة بين متغيرين فئويين؟',
      questionEn: 'Is there a relationship between two categorical variables?',
      description: 'اختبار الاستقلالية أو الارتباط بين متغيرات تصنيفية',
      descriptionEn: 'Test independence or association between categorical variables',
      icon: <GitBranch className="w-5 h-5" />,
      requiredVars: [
        { type: 'categorical', count: 2, description: 'متغيرين فئويين', descriptionEn: 'Two categorical variables' }
      ],
      examples: ['هل يرتبط الجنس بالتخصص؟', 'هل يرتبط التدخين بالمرض؟'],
      examplesEn: ['Is gender related to major?', 'Is smoking related to disease?']
    },
    {
      id: 'prediction_numeric',
      category: 'التنبؤ',
      categoryEn: 'Prediction',
      question: 'هل يمكن التنبؤ بمتغير رقمي من متغيرات أخرى؟',
      questionEn: 'Can a numeric variable be predicted from other variables?',
      description: 'بناء نموذج للتنبؤ بقيمة متغير تابع',
      descriptionEn: 'Build a model to predict the value of a dependent variable',
      icon: <Target className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 1, description: 'متغير تابع رقمي', descriptionEn: 'Numeric dependent variable' },
        { type: 'any', count: '1+', description: 'متغير(ات) مستقلة', descriptionEn: 'Independent variable(s)' }
      ],
      examples: ['التنبؤ بالمبيعات من الإعلانات', 'التنبؤ بالدرجات من ساعات الدراسة'],
      examplesEn: ['Predict sales from advertising', 'Predict grades from study hours']
    },
    {
      id: 'prediction_categorical',
      category: 'التنبؤ',
      categoryEn: 'Prediction',
      question: 'هل يمكن التنبؤ بفئة من متغيرات أخرى؟',
      questionEn: 'Can a category be predicted from other variables?',
      description: 'تصنيف الحالات إلى فئات بناءً على متغيرات مستقلة',
      descriptionEn: 'Classify cases into categories based on independent variables',
      icon: <Filter className="w-5 h-5" />,
      requiredVars: [
        { type: 'categorical', count: 1, description: 'متغير تابع فئوي', descriptionEn: 'Categorical dependent variable' },
        { type: 'any', count: '1+', description: 'متغير(ات) مستقلة', descriptionEn: 'Independent variable(s)' }
      ],
      examples: ['التنبؤ بالإصابة بالمرض', 'تصنيف العملاء حسب احتمال الشراء'],
      examplesEn: ['Predict disease occurrence', 'Classify customers by purchase probability']
    },
    {
      id: 'normality_test',
      category: 'الافتراضات',
      categoryEn: 'Assumptions',
      question: 'هل البيانات تتبع التوزيع الطبيعي؟',
      questionEn: 'Does the data follow a normal distribution?',
      description: 'اختبار ما إذا كان المتغير يتبع التوزيع الطبيعي',
      descriptionEn: 'Test whether a variable follows a normal distribution',
      icon: <Activity className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 1, description: 'متغير رقمي', descriptionEn: 'Numeric variable' }
      ],
      examples: ['هل الدرجات موزعة طبيعياً؟', 'فحص افتراض الطبيعية قبل التحليل'],
      examplesEn: ['Are grades normally distributed?', 'Check normality assumption before analysis']
    },
    {
      id: 'variance_homogeneity',
      category: 'الافتراضات',
      categoryEn: 'Assumptions',
      question: 'هل التباينات متجانسة بين المجموعات؟',
      questionEn: 'Are variances homogeneous between groups?',
      description: 'اختبار تساوي التباينات بين مجموعتين أو أكثر',
      descriptionEn: 'Test equality of variances between two or more groups',
      icon: <Scale className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 1, description: 'متغير رقمي', descriptionEn: 'Numeric variable' },
        { type: 'categorical', count: 1, description: 'متغير تصنيفي', descriptionEn: 'Categorical variable' }
      ],
      examples: ['فحص تجانس التباين قبل ANOVA', 'التحقق من افتراضات t-test'],
      examplesEn: ['Check variance homogeneity before ANOVA', 'Verify t-test assumptions']
    },
    {
      id: 'time_series_stationarity',
      category: 'السلاسل الزمنية',
      categoryEn: 'Time Series',
      question: 'هل السلسلة الزمنية مستقرة؟',
      questionEn: 'Is the time series stationary?',
      description: 'اختبار استقرارية السلسلة الزمنية',
      descriptionEn: 'Test time series stationarity',
      icon: <Clock className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 1, description: 'متغير رقمي (سلسلة زمنية)', descriptionEn: 'Numeric variable (time series)' }
      ],
      examples: ['هل أسعار الأسهم مستقرة؟', 'فحص الاستقرارية قبل التنبؤ'],
      examplesEn: ['Are stock prices stationary?', 'Check stationarity before forecasting']
    },
    {
      id: 'autocorrelation',
      category: 'السلاسل الزمنية',
      categoryEn: 'Time Series',
      question: 'هل يوجد ارتباط ذاتي في البيانات؟',
      questionEn: 'Is there autocorrelation in the data?',
      description: 'اختبار الارتباط بين القيم المتتالية',
      descriptionEn: 'Test correlation between consecutive values',
      icon: <Shuffle className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: 1, description: 'متغير رقمي (بواقي أو سلسلة)', descriptionEn: 'Numeric variable (residuals or series)' }
      ],
      examples: ['فحص استقلالية البواقي', 'اختبار Durbin-Watson'],
      examplesEn: ['Check residual independence', 'Durbin-Watson test']
    },
    {
      id: 'goodness_of_fit',
      category: 'المطابقة',
      categoryEn: 'Goodness of Fit',
      question: 'هل البيانات تطابق توزيعاً نظرياً معيناً؟',
      questionEn: 'Does the data match a specific theoretical distribution?',
      description: 'اختبار مطابقة البيانات المرصودة للمتوقعة',
      descriptionEn: 'Test if observed data matches expected distribution',
      icon: <Compass className="w-5 h-5" />,
      requiredVars: [
        { type: 'categorical', count: 1, description: 'متغير فئوي', descriptionEn: 'Categorical variable' }
      ],
      examples: ['هل التكرارات تتبع التوزيع المتوقع؟', 'اختبار مطابقة نسب معينة'],
      examplesEn: ['Do frequencies follow expected distribution?', 'Test for specific proportions']
    },
    {
      id: 'reliability',
      category: 'القياس',
      categoryEn: 'Measurement',
      question: 'ما مدى ثبات/موثوقية المقياس؟',
      questionEn: 'How reliable is the scale/measure?',
      description: 'قياس الاتساق الداخلي للمقياس',
      descriptionEn: 'Measure internal consistency of the scale',
      icon: <Award className="w-5 h-5" />,
      requiredVars: [
        { type: 'numeric', count: '3+', description: 'فقرات المقياس (3 أو أكثر)', descriptionEn: 'Scale items (3 or more)' }
      ],
      examples: ['حساب معامل ألفا كرونباخ', 'قياس ثبات الاستبيان'],
      examplesEn: ["Calculate Cronbach's alpha", 'Measure questionnaire reliability']
    }
  ];

  // تحليل وتوصية الاختبارات
  const analyzeAndRecommend = () => {
    setIsAnalyzing(true);
    
    setTimeout(() => {
      const recs: TestRecommendation[] = [];
      
      if (!selectedQuestion) {
        setIsAnalyzing(false);
        return;
      }
      
      const depVars = selectedVariables.dependent.map(v => 
        columnAnalysis.find(c => c.name === v)
      ).filter(Boolean) as ColumnAnalysis[];
      
      const indVars = selectedVariables.independent.map(v => 
        columnAnalysis.find(c => c.name === v)
      ).filter(Boolean) as ColumnAnalysis[];
      
      const groupVars = selectedVariables.grouping.map(v => 
        columnAnalysis.find(c => c.name === v)
      ).filter(Boolean) as ColumnAnalysis[];
      
      const n = data.length;
      
      switch (selectedQuestion.id) {
        case 'compare_two_means_independent':
          if (depVars[0] && groupVars[0]) {
            const isNormal = depVars[0].isNormal;
            const groupCount = groupVars[0].uniqueValues;
            
            if (groupCount === 2) {
              if (isNormal && n >= 30) {
                recs.push({
                  testName: "Independent Samples T-Test",
                  testNameAr: "اختبار ت للعينات المستقلة",
                  category: "معلمي",
                  categoryEn: "Parametric",
                  confidence: 95,
                  matchScore: 98,
                  description: "يقارن متوسطي مجموعتين مستقلتين عندما يتبع المتغير التوزيع الطبيعي",
                  descriptionEn: "Compares means of two independent groups when the variable follows normal distribution",
                  assumptions: [
                    { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: isNormal!, details: isNormal ? "البيانات تتبع التوزيع الطبيعي تقريباً" : "البيانات لا تتبع التوزيع الطبيعي", detailsEn: isNormal ? "Data approximately follows normal distribution" : "Data does not follow normal distribution" },
                    { name: "استقلالية العينات", nameEn: "Independence", met: true, details: "المجموعتان مستقلتان", detailsEn: "The two groups are independent" },
                    { name: "حجم العينة", nameEn: "Sample Size", met: n >= 30, details: `حجم العينة = ${n}`, detailsEn: `Sample size = ${n}` },
                    { name: "تجانس التباين", nameEn: "Homogeneity of Variance", met: true, details: "يُفترض تجانس التباين (يُفحص بـ Levene)", detailsEn: "Assumes homogeneity (check with Levene's test)" }
                  ],
                  alternativeIf: "إذا لم يتحقق افتراض الطبيعية أو كان حجم العينة صغيراً",
                  alternativeIfEn: "If normality assumption is not met or sample size is small",
                  alternativeTest: "Mann-Whitney U Test",
                  interpretation: "إذا كانت p-value < 0.05، نرفض الفرضية الصفرية ونستنتج وجود فرق دال إحصائياً بين المجموعتين",
                  interpretationEn: "If p-value < 0.05, we reject the null hypothesis and conclude there is a significant difference between groups",
                  effectSize: "Cohen's d: صغير (0.2)، متوسط (0.5)، كبير (0.8)",
                  effectSizeEn: "Cohen's d: small (0.2), medium (0.5), large (0.8)",
                  sampleSizeNote: n < 30 ? "⚠️ حجم العينة صغير، قد يؤثر على قوة الاختبار" : "✓ حجم العينة كافٍ",
                  sampleSizeNoteEn: n < 30 ? "⚠️ Small sample size may affect test power" : "✓ Sample size is sufficient",
                  references: ["Cohen, J. (1988)", "Student (1908)"]
                });
                
                recs.push({
                  testName: "Welch's T-Test",
                  testNameAr: "اختبار ولش",
                  category: "معلمي",
                  categoryEn: "Parametric",
                  confidence: 90,
                  matchScore: 92,
                  description: "نسخة معدلة من t-test لا تفترض تساوي التباينات",
                  descriptionEn: "Modified version of t-test that doesn't assume equal variances",
                  assumptions: [
                    { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: isNormal!, details: "مطلوب لكلا المجموعتين", detailsEn: "Required for both groups" },
                    { name: "استقلالية العينات", nameEn: "Independence", met: true, details: "المجموعتان مستقلتان", detailsEn: "The two groups are independent" },
                    { name: "تجانس التباين", nameEn: "Homogeneity of Variance", met: true, details: "غير مطلوب - ميزة هذا الاختبار", detailsEn: "Not required - advantage of this test" }
                  ],
                  alternativeIf: "يُستخدم عندما لا تتساوى التباينات",
                  alternativeIfEn: "Used when variances are not equal",
                  alternativeTest: "Independent T-Test",
                  interpretation: "مشابه لـ t-test العادي لكن أكثر متانة",
                  interpretationEn: "Similar to regular t-test but more robust",
                  effectSize: "Cohen's d",
                  effectSizeEn: "Cohen's d",
                  sampleSizeNote: "يعمل جيداً مع أحجام عينات غير متساوية",
                  sampleSizeNoteEn: "Works well with unequal sample sizes",
                  references: ["Welch, B. L. (1947)"]
                });
              }
              
              recs.push({
                testName: "Mann-Whitney U Test",
                testNameAr: "اختبار مان-ويتني",
                category: "لامعلمي",
                categoryEn: "Non-parametric",
                confidence: isNormal ? 75 : 95,
                matchScore: isNormal ? 70 : 95,
                description: "البديل اللامعلمي لاختبار t، يقارن رتب المجموعتين",
                descriptionEn: "Non-parametric alternative to t-test, compares ranks of two groups",
                assumptions: [
                  { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: true, details: "غير مطلوب - ميزة الاختبارات اللامعلمية", detailsEn: "Not required - advantage of non-parametric tests" },
                  { name: "استقلالية العينات", nameEn: "Independence", met: true, details: "المجموعتان مستقلتان", detailsEn: "The two groups are independent" },
                  { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "ترتيبي على الأقل", detailsEn: "At least ordinal" }
                ],
                alternativeIf: "عندما تتحقق افتراضات t-test",
                alternativeIfEn: "When t-test assumptions are met",
                alternativeTest: "Independent T-Test",
                interpretation: "يختبر ما إذا كان التوزيعان مختلفين",
                interpretationEn: "Tests whether the two distributions are different",
                effectSize: "r = Z / √N",
                effectSizeEn: "r = Z / √N",
                sampleSizeNote: "فعال مع العينات الصغيرة",
                sampleSizeNoteEn: "Effective with small samples",
                references: ["Mann & Whitney (1947)"]
              });
            }
          }
          break;
          
        case 'compare_two_means_paired':
          if (depVars.length >= 2) {
            const isNormal = depVars[0].isNormal && depVars[1].isNormal;
            
            recs.push({
              testName: "Paired Samples T-Test",
              testNameAr: "اختبار ت للعينات المزدوجة",
              category: "معلمي",
              categoryEn: "Parametric",
              confidence: isNormal ? 95 : 70,
              matchScore: isNormal ? 98 : 75,
              description: "يقارن متوسطي قياسين لنفس المجموعة (قبل/بعد)",
              descriptionEn: "Compares means of two measurements for the same group (before/after)",
              assumptions: [
                { name: "التوزيع الطبيعي للفروق", nameEn: "Normality of Differences", met: isNormal!, details: "فروق القياسات يجب أن تتبع التوزيع الطبيعي", detailsEn: "Differences should follow normal distribution" },
                { name: "القياسات المزدوجة", nameEn: "Paired Measurements", met: true, details: "نفس الأفراد في القياسين", detailsEn: "Same individuals in both measurements" },
                { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "المتغيرات رقمية", detailsEn: "Variables are numeric" }
              ],
              alternativeIf: "إذا لم تتبع الفروق التوزيع الطبيعي",
              alternativeIfEn: "If differences don't follow normal distribution",
              alternativeTest: "Wilcoxon Signed-Rank Test",
              interpretation: "يختبر ما إذا كان متوسط الفرق يختلف عن الصفر",
              interpretationEn: "Tests whether mean difference differs from zero",
              effectSize: "Cohen's d للقياسات المتكررة",
              effectSizeEn: "Cohen's d for repeated measures",
              sampleSizeNote: `حجم العينة = ${n}`,
              sampleSizeNoteEn: `Sample size = ${n}`,
              references: ["Student (1908)"]
            });
            
            recs.push({
              testName: "Wilcoxon Signed-Rank Test",
              testNameAr: "اختبار ويلكوكسون",
              category: "لامعلمي",
              categoryEn: "Non-parametric",
              confidence: isNormal ? 75 : 95,
              matchScore: isNormal ? 70 : 95,
              description: "البديل اللامعلمي لاختبار t المزدوج",
              descriptionEn: "Non-parametric alternative to paired t-test",
              assumptions: [
                { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: true, details: "غير مطلوب", detailsEn: "Not required" },
                { name: "تماثل توزيع الفروق", nameEn: "Symmetry of Differences", met: true, details: "يُفترض تماثل التوزيع حول الوسيط", detailsEn: "Assumes symmetric distribution around median" },
                { name: "القياسات المزدوجة", nameEn: "Paired Measurements", met: true, details: "نفس الأفراد في القياسين", detailsEn: "Same individuals in both measurements" }
              ],
              alternativeIf: "عندما تتحقق افتراضات t-test المزدوج",
              alternativeIfEn: "When paired t-test assumptions are met",
              alternativeTest: "Paired T-Test",
              interpretation: "يختبر ما إذا كان وسيط الفروق يختلف عن الصفر",
              interpretationEn: "Tests whether median of differences differs from zero",
              effectSize: "r = Z / √N",
              effectSizeEn: "r = Z / √N",
              sampleSizeNote: "فعال مع العينات الصغيرة",
              sampleSizeNoteEn: "Effective with small samples",
              references: ["Wilcoxon (1945)"]
            });
          }
          break;
          
        case 'compare_multiple_means':
          if (depVars[0] && groupVars[0]) {
            const isNormal = depVars[0].isNormal;
            const groupCount = groupVars[0].uniqueValues;
            
            if (groupCount >= 3) {
              recs.push({
                testName: "One-Way ANOVA",
                testNameAr: "تحليل التباين الأحادي",
                category: "معلمي",
                categoryEn: "Parametric",
                confidence: isNormal ? 95 : 70,
                matchScore: isNormal ? 98 : 75,
                description: "يقارن متوسطات ثلاث مجموعات أو أكثر",
                descriptionEn: "Compares means of three or more groups",
                assumptions: [
                  { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: isNormal!, details: "في كل مجموعة", detailsEn: "In each group" },
                  { name: "استقلالية الملاحظات", nameEn: "Independence", met: true, details: "كل ملاحظة مستقلة", detailsEn: "Each observation is independent" },
                  { name: "تجانس التباين", nameEn: "Homogeneity of Variance", met: true, details: "تباينات المجموعات متساوية (Levene's test)", detailsEn: "Group variances are equal (Levene's test)" },
                  { name: "حجم العينة", nameEn: "Sample Size", met: n >= groupCount * 10, details: `${n} ملاحظة لـ ${groupCount} مجموعات`, detailsEn: `${n} observations for ${groupCount} groups` }
                ],
                alternativeIf: "إذا لم تتحقق افتراضات ANOVA",
                alternativeIfEn: "If ANOVA assumptions are not met",
                alternativeTest: "Kruskal-Wallis Test",
                interpretation: "إذا كانت p < 0.05، يوجد فرق بين مجموعتين على الأقل (يتطلب اختبارات بعدية)",
                interpretationEn: "If p < 0.05, there's a difference between at least two groups (requires post-hoc tests)",
                effectSize: "η² (Eta-squared): صغير (0.01)، متوسط (0.06)، كبير (0.14)",
                effectSizeEn: "η² (Eta-squared): small (0.01), medium (0.06), large (0.14)",
                sampleSizeNote: n < groupCount * 10 ? "⚠️ يُفضل 10+ ملاحظات لكل مجموعة" : "✓ حجم العينة مناسب",
                sampleSizeNoteEn: n < groupCount * 10 ? "⚠️ 10+ observations per group preferred" : "✓ Sample size is adequate",
                references: ["Fisher, R. A. (1925)"]
              });
              
              recs.push({
                testName: "Kruskal-Wallis Test",
                testNameAr: "اختبار كروسكال-واليس",
                category: "لامعلمي",
                categoryEn: "Non-parametric",
                confidence: isNormal ? 75 : 95,
                matchScore: isNormal ? 70 : 95,
                description: "البديل اللامعلمي لـ ANOVA، يقارن رتب المجموعات",
                descriptionEn: "Non-parametric alternative to ANOVA, compares group ranks",
                assumptions: [
                  { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: true, details: "غير مطلوب", detailsEn: "Not required" },
                  { name: "استقلالية الملاحظات", nameEn: "Independence", met: true, details: "كل ملاحظة مستقلة", detailsEn: "Each observation is independent" },
                  { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "ترتيبي على الأقل", detailsEn: "At least ordinal" }
                ],
                alternativeIf: "عندما تتحقق افتراضات ANOVA",
                alternativeIfEn: "When ANOVA assumptions are met",
                alternativeTest: "One-Way ANOVA",
                interpretation: "يختبر ما إذا كانت التوزيعات مختلفة",
                interpretationEn: "Tests whether distributions are different",
                effectSize: "ε² (Epsilon-squared)",
                effectSizeEn: "ε² (Epsilon-squared)",
                sampleSizeNote: "فعال مع أي حجم عينة",
                sampleSizeNoteEn: "Effective with any sample size",
                references: ["Kruskal & Wallis (1952)"]
              });
            }
          }
          break;
          
        case 'relationship_two_numeric':
          if (depVars.length >= 1 && indVars.length >= 1) {
            const var1 = depVars[0];
            const var2 = indVars[0];
            const bothNormal = var1.isNormal && var2.isNormal;
            
            recs.push({
              testName: "Pearson Correlation",
              testNameAr: "ارتباط بيرسون",
              category: "معلمي",
              categoryEn: "Parametric",
              confidence: bothNormal ? 95 : 70,
              matchScore: bothNormal ? 98 : 75,
              description: "يقيس قوة واتجاه العلاقة الخطية بين متغيرين رقميين",
              descriptionEn: "Measures strength and direction of linear relationship between two numeric variables",
              assumptions: [
                { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: bothNormal!, details: "كلا المتغيرين", detailsEn: "Both variables" },
                { name: "العلاقة الخطية", nameEn: "Linear Relationship", met: true, details: "يُفترض وجود علاقة خطية", detailsEn: "Assumes linear relationship" },
                { name: "عدم وجود شوائب", nameEn: "No Outliers", met: (var1.outlierCount || 0) < n * 0.05, details: `${var1.outlierCount || 0} قيم شاذة`, detailsEn: `${var1.outlierCount || 0} outliers` },
                { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "متغيرات فترية/نسبية", detailsEn: "Interval/ratio variables" }
              ],
              alternativeIf: "العلاقة غير خطية أو البيانات غير طبيعية",
              alternativeIfEn: "If relationship is non-linear or data is non-normal",
              alternativeTest: "Spearman Correlation",
              interpretation: "r قريب من 1 أو -1 يعني ارتباط قوي، قريب من 0 يعني ضعيف",
              interpretationEn: "r close to 1 or -1 means strong correlation, close to 0 means weak",
              effectSize: "|r|: ضعيف (<0.3)، متوسط (0.3-0.5)، قوي (>0.5)",
              effectSizeEn: "|r|: weak (<0.3), medium (0.3-0.5), strong (>0.5)",
              sampleSizeNote: n < 30 ? "⚠️ يُفضل n ≥ 30" : "✓ حجم كافٍ",
              sampleSizeNoteEn: n < 30 ? "⚠️ n ≥ 30 preferred" : "✓ Sufficient size",
              references: ["Pearson (1895)"]
            });
            
            recs.push({
              testName: "Spearman Correlation",
              testNameAr: "ارتباط سبيرمان",
              category: "لامعلمي",
              categoryEn: "Non-parametric",
              confidence: bothNormal ? 80 : 95,
              matchScore: bothNormal ? 75 : 95,
              description: "يقيس العلاقة الرتبية (monotonic) بين المتغيرين",
              descriptionEn: "Measures monotonic relationship between variables",
              assumptions: [
                { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: true, details: "غير مطلوب", detailsEn: "Not required" },
                { name: "العلاقة الرتبية", nameEn: "Monotonic Relationship", met: true, details: "علاقة متزايدة أو متناقصة", detailsEn: "Increasing or decreasing relationship" },
                { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "ترتيبي على الأقل", detailsEn: "At least ordinal" }
              ],
              alternativeIf: "العلاقة خطية والبيانات طبيعية",
              alternativeIfEn: "If relationship is linear and data is normal",
              alternativeTest: "Pearson Correlation",
              interpretation: "مشابه لبيرسون لكن يعتمد على الرتب",
              interpretationEn: "Similar to Pearson but based on ranks",
              effectSize: "|ρ|: نفس معايير بيرسون",
              effectSizeEn: "|ρ|: same criteria as Pearson",
              sampleSizeNote: "مقاوم للقيم الشاذة",
              sampleSizeNoteEn: "Resistant to outliers",
              references: ["Spearman (1904)"]
            });
            
            recs.push({
              testName: "Kendall's Tau",
              testNameAr: "ارتباط كيندال",
              category: "لامعلمي",
              categoryEn: "Non-parametric",
              confidence: 75,
              matchScore: 70,
              description: "مقياس ارتباط رتبي بديل، أكثر متانة مع العينات الصغيرة",
              descriptionEn: "Alternative rank correlation, more robust with small samples",
              assumptions: [
                { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: true, details: "غير مطلوب", detailsEn: "Not required" },
                { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "ترتيبي على الأقل", detailsEn: "At least ordinal" }
              ],
              alternativeIf: "العينة كبيرة",
              alternativeIfEn: "If sample is large",
              alternativeTest: "Spearman Correlation",
              interpretation: "أكثر تحفظاً من سبيرمان",
              interpretationEn: "More conservative than Spearman",
              effectSize: "τ: نفس التفسير",
              effectSizeEn: "τ: same interpretation",
              sampleSizeNote: "ممتاز للعينات الصغيرة (n < 20)",
              sampleSizeNoteEn: "Excellent for small samples (n < 20)",
              references: ["Kendall (1938)"]
            });
          }
          break;
          
        case 'relationship_categorical':
          if (depVars[0] && indVars[0]) {
            const var1 = depVars[0];
            const var2 = indVars[0];
            const is2x2 = var1.uniqueValues === 2 && var2.uniqueValues === 2;
            
            recs.push({
              testName: "Chi-Square Test of Independence",
              testNameAr: "اختبار كاي تربيع للاستقلالية",
              category: "لامعلمي",
              categoryEn: "Non-parametric",
              confidence: 95,
              matchScore: 98,
              description: "يختبر العلاقة بين متغيرين فئويين",
              descriptionEn: "Tests relationship between two categorical variables",
              assumptions: [
                { name: "التكرار المتوقع", nameEn: "Expected Frequency", met: n >= 5 * var1.uniqueValues * var2.uniqueValues, details: "كل خلية ≥ 5", detailsEn: "Each cell ≥ 5" },
                { name: "استقلالية الملاحظات", nameEn: "Independence", met: true, details: "كل ملاحظة في خلية واحدة فقط", detailsEn: "Each observation in one cell only" },
                { name: "حجم العينة", nameEn: "Sample Size", met: n >= 20, details: `n = ${n}`, detailsEn: `n = ${n}` }
              ],
              alternativeIf: "التكرارات المتوقعة < 5",
              alternativeIfEn: "If expected frequencies < 5",
              alternativeTest: "Fisher's Exact Test",
              interpretation: "p < 0.05 يعني وجود علاقة دالة بين المتغيرين",
              interpretationEn: "p < 0.05 means significant relationship between variables",
              effectSize: "Cramér's V: ضعيف (<0.1)، متوسط (0.1-0.3)، قوي (>0.3)",
              effectSizeEn: "Cramér's V: weak (<0.1), medium (0.1-0.3), strong (>0.3)",
              sampleSizeNote: n < 20 ? "⚠️ استخدم Fisher's Exact" : "✓ حجم كافٍ",
              sampleSizeNoteEn: n < 20 ? "⚠️ Use Fisher's Exact" : "✓ Sufficient size",
              references: ["Pearson (1900)"]
            });
            
            if (is2x2) {
              recs.push({
                testName: "Fisher's Exact Test",
                testNameAr: "اختبار فيشر الدقيق",
                category: "لامعلمي",
                categoryEn: "Non-parametric",
                confidence: 90,
                matchScore: is2x2 ? 95 : 60,
                description: "اختبار دقيق للجداول 2×2، خاصة مع العينات الصغيرة",
                descriptionEn: "Exact test for 2×2 tables, especially with small samples",
                assumptions: [
                  { name: "جدول 2×2", nameEn: "2×2 Table", met: is2x2, details: is2x2 ? "نعم" : "لا - أكثر من فئتين", detailsEn: is2x2 ? "Yes" : "No - more than two categories" },
                  { name: "هوامش ثابتة", nameEn: "Fixed Margins", met: true, details: "مجاميع الصفوف والأعمدة ثابتة", detailsEn: "Row and column totals are fixed" }
                ],
                alternativeIf: "العينة كبيرة والتكرارات ≥ 5",
                alternativeIfEn: "If sample is large and frequencies ≥ 5",
                alternativeTest: "Chi-Square Test",
                interpretation: "يحسب الاحتمال الدقيق بدون تقريب",
                interpretationEn: "Calculates exact probability without approximation",
                effectSize: "Odds Ratio",
                effectSizeEn: "Odds Ratio",
                sampleSizeNote: "مثالي للعينات الصغيرة",
                sampleSizeNoteEn: "Ideal for small samples",
                references: ["Fisher (1922)"]
              });
            }
          }
          break;
          
        case 'normality_test':
          if (depVars[0]) {
            recs.push({
              testName: "Shapiro-Wilk Test",
              testNameAr: "اختبار شابيرو-ويلك",
              category: "توزيع",
              categoryEn: "Distribution",
              confidence: 98,
              matchScore: n <= 5000 ? 98 : 70,
              description: "أقوى اختبار للطبيعية، خاصة للعينات الصغيرة والمتوسطة",
              descriptionEn: "Most powerful normality test, especially for small to medium samples",
              assumptions: [
                { name: "حجم العينة", nameEn: "Sample Size", met: n >= 3 && n <= 5000, details: `n = ${n} (مثالي: 3-5000)`, detailsEn: `n = ${n} (ideal: 3-5000)` },
                { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "متغير رقمي مستمر", detailsEn: "Continuous numeric variable" }
              ],
              alternativeIf: "n > 5000",
              alternativeIfEn: "If n > 5000",
              alternativeTest: "Kolmogorov-Smirnov Test",
              interpretation: "p > 0.05 يعني أن البيانات تتبع التوزيع الطبيعي",
              interpretationEn: "p > 0.05 means data follows normal distribution",
              effectSize: "W قريب من 1 = طبيعي",
              effectSizeEn: "W close to 1 = normal",
              sampleSizeNote: n > 5000 ? "⚠️ قد يكون حساساً جداً" : "✓ مناسب",
              sampleSizeNoteEn: n > 5000 ? "⚠️ May be too sensitive" : "✓ Appropriate",
              references: ["Shapiro & Wilk (1965)"]
            });
            
            recs.push({
              testName: "Kolmogorov-Smirnov Test",
              testNameAr: "اختبار كولموجوروف-سميرنوف",
              category: "توزيع",
              categoryEn: "Distribution",
              confidence: 85,
              matchScore: n > 50 ? 85 : 70,
              description: "يقارن التوزيع التجريبي بالنظري",
              descriptionEn: "Compares empirical distribution to theoretical",
              assumptions: [
                { name: "حجم العينة", nameEn: "Sample Size", met: n >= 20, details: `n = ${n}`, detailsEn: `n = ${n}` },
                { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "متغير مستمر", detailsEn: "Continuous variable" }
              ],
              alternativeIf: "العينة صغيرة",
              alternativeIfEn: "If sample is small",
              alternativeTest: "Shapiro-Wilk Test",
              interpretation: "أقل قوة من Shapiro-Wilk لكن يعمل مع عينات أكبر",
              interpretationEn: "Less powerful than Shapiro-Wilk but works with larger samples",
              effectSize: "D (أقصى فرق)",
              effectSizeEn: "D (maximum difference)",
              sampleSizeNote: "مناسب للعينات الكبيرة",
              sampleSizeNoteEn: "Suitable for large samples",
              references: ["Kolmogorov (1933), Smirnov (1948)"]
            });
            
            recs.push({
              testName: "Anderson-Darling Test",
              testNameAr: "اختبار أندرسون-دارلينج",
              category: "توزيع",
              categoryEn: "Distribution",
              confidence: 90,
              matchScore: 88,
              description: "يعطي وزناً أكبر للأطراف، جيد لكشف الانحرافات",
              descriptionEn: "Gives more weight to tails, good for detecting deviations",
              assumptions: [
                { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "متغير مستمر", detailsEn: "Continuous variable" }
              ],
              alternativeIf: "التركيز على المركز",
              alternativeIfEn: "If focus is on center",
              alternativeTest: "Shapiro-Wilk Test",
              interpretation: "حساس للأطراف (tails)",
              interpretationEn: "Sensitive to tails",
              effectSize: "A²",
              effectSizeEn: "A²",
              sampleSizeNote: "جيد مع جميع الأحجام",
              sampleSizeNoteEn: "Good with all sizes",
              references: ["Anderson & Darling (1952)"]
            });
          }
          break;
          
        case 'variance_homogeneity':
          if (depVars[0] && groupVars[0]) {
            recs.push({
              testName: "Levene's Test",
              testNameAr: "اختبار ليفين",
              category: "تجانس",
              categoryEn: "Homogeneity",
              confidence: 95,
              matchScore: 98,
              description: "يختبر تساوي التباينات، متين ضد عدم الطبيعية",
              descriptionEn: "Tests equality of variances, robust against non-normality",
              assumptions: [
                { name: "استقلالية", nameEn: "Independence", met: true, details: "الملاحظات مستقلة", detailsEn: "Observations are independent" },
                { name: "مستوى القياس", nameEn: "Measurement Level", met: true, details: "رقمي", detailsEn: "Numeric" }
              ],
              alternativeIf: "البيانات طبيعية تماماً",
              alternativeIfEn: "If data is perfectly normal",
              alternativeTest: "Bartlett's Test",
              interpretation: "p > 0.05 يعني تجانس التباينات",
              interpretationEn: "p > 0.05 means homogeneous variances",
              effectSize: "لا يوجد حجم أثر قياسي",
              effectSizeEn: "No standard effect size",
              sampleSizeNote: "الأكثر استخداماً",
              sampleSizeNoteEn: "Most commonly used",
              references: ["Levene (1960)"]
            });
            
            recs.push({
              testName: "Bartlett's Test",
              testNameAr: "اختبار بارتليت",
              category: "تجانس",
              categoryEn: "Homogeneity",
              confidence: 85,
              matchScore: depVars[0].isNormal ? 90 : 60,
              description: "يختبر تجانس التباينات، حساس لعدم الطبيعية",
              descriptionEn: "Tests homogeneity of variances, sensitive to non-normality",
              assumptions: [
                { name: "التوزيع الطبيعي", nameEn: "Normal Distribution", met: depVars[0].isNormal!, details: "مطلوب بشدة", detailsEn: "Strongly required" }
              ],
              alternativeIf: "البيانات غير طبيعية",
              alternativeIfEn: "If data is non-normal",
              alternativeTest: "Levene's Test",
              interpretation: "أكثر قوة من Levene مع البيانات الطبيعية",
              interpretationEn: "More powerful than Levene with normal data",
              effectSize: "χ²",
              effectSizeEn: "χ²",
              sampleSizeNote: depVars[0].isNormal ? "✓ مناسب" : "⚠️ استخدم Levene",
              sampleSizeNoteEn: depVars[0].isNormal ? "✓ Appropriate" : "⚠️ Use Levene",
              references: ["Bartlett (1937)"]
            });
          }
          break;
          
        case 'autocorrelation':
          if (depVars[0]) {
            recs.push({
              testName: "Durbin-Watson Test",
              testNameAr: "اختبار دوربن-واتسون",
              category: "سلاسل زمنية",
              categoryEn: "Time Series",
              confidence: 95,
              matchScore: 98,
              description: "يكشف الارتباط الذاتي من الدرجة الأولى في البواقي",
              descriptionEn: "Detects first-order autocorrelation in residuals",
              assumptions: [
                { name: "بيانات مرتبة", nameEn: "Ordered Data", met: true, details: "ترتيب زمني أو منطقي", detailsEn: "Temporal or logical order" },
                { name: "نموذج انحدار", nameEn: "Regression Model", met: true, details: "مطبق على بواقي الانحدار", detailsEn: "Applied to regression residuals" }
              ],
              alternativeIf: "ارتباط ذاتي من درجات أعلى",
              alternativeIfEn: "If higher-order autocorrelation",
              alternativeTest: "Ljung-Box Test",
              interpretation: "DW ≈ 2 = لا ارتباط، < 2 = إيجابي، > 2 = سلبي",
              interpretationEn: "DW ≈ 2 = no correlation, < 2 = positive, > 2 = negative",
              effectSize: "DW: 0-4 (2 = مثالي)",
              effectSizeEn: "DW: 0-4 (2 = ideal)",
              sampleSizeNote: "يحتاج n ≥ 15",
              sampleSizeNoteEn: "Needs n ≥ 15",
              references: ["Durbin & Watson (1950, 1951)"]
            });
            
            recs.push({
              testName: "Ljung-Box Test",
              testNameAr: "اختبار ليونج-بوكس",
              category: "سلاسل زمنية",
              categoryEn: "Time Series",
              confidence: 90,
              matchScore: 90,
              description: "يختبر الارتباط الذاتي عند عدة تأخيرات",
              descriptionEn: "Tests autocorrelation at multiple lags",
              assumptions: [
                { name: "حجم العينة", nameEn: "Sample Size", met: n >= 20, details: `n = ${n}`, detailsEn: `n = ${n}` }
              ],
              alternativeIf: "اختبار تأخير واحد فقط",
              alternativeIfEn: "If testing single lag only",
              alternativeTest: "Durbin-Watson Test",
              interpretation: "p > 0.05 = لا ارتباط ذاتي دال",
              interpretationEn: "p > 0.05 = no significant autocorrelation",
              effectSize: "Q statistic",
              effectSizeEn: "Q statistic",
              sampleSizeNote: "مناسب للسلاسل الطويلة",
              sampleSizeNoteEn: "Suitable for long series",
              references: ["Ljung & Box (1978)"]
            });
          }
          break;
          
        case 'time_series_stationarity':
          if (depVars[0]) {
            recs.push({
              testName: "Augmented Dickey-Fuller Test",
              testNameAr: "اختبار ديكي-فولر الموسع",
              category: "سلاسل زمنية",
              categoryEn: "Time Series",
              confidence: 95,
              matchScore: 98,
              description: "يختبر وجود جذر الوحدة (عدم الاستقرارية)",
              descriptionEn: "Tests for unit root (non-stationarity)",
              assumptions: [
                { name: "سلسلة زمنية", nameEn: "Time Series", met: true, details: "بيانات متسلسلة", detailsEn: "Sequential data" },
                { name: "حجم كافٍ", nameEn: "Sufficient Size", met: n >= 25, details: `n = ${n}`, detailsEn: `n = ${n}` }
              ],
              alternativeIf: "فحص الاستقرارية حول اتجاه",
              alternativeIfEn: "If checking stationarity around trend",
              alternativeTest: "KPSS Test",
              interpretation: "p < 0.05 = السلسلة مستقرة (رفض جذر الوحدة)",
              interpretationEn: "p < 0.05 = series is stationary (reject unit root)",
              effectSize: "ADF statistic",
              effectSizeEn: "ADF statistic",
              sampleSizeNote: n < 25 ? "⚠️ يحتاج n ≥ 25" : "✓ مناسب",
              sampleSizeNoteEn: n < 25 ? "⚠️ Needs n ≥ 25" : "✓ Appropriate",
              references: ["Dickey & Fuller (1979)"]
            });
            
            recs.push({
              testName: "KPSS Test",
              testNameAr: "اختبار KPSS",
              category: "سلاسل زمنية",
              categoryEn: "Time Series",
              confidence: 90,
              matchScore: 90,
              description: "يختبر الاستقرارية (الفرضية الصفرية = مستقرة)",
              descriptionEn: "Tests stationarity (null = stationary)",
              assumptions: [
                { name: "سلسلة زمنية", nameEn: "Time Series", met: true, details: "بيانات متسلسلة", detailsEn: "Sequential data" }
              ],
              alternativeIf: "فحص عدم الاستقرارية",
              alternativeIfEn: "If checking non-stationarity",
              alternativeTest: "ADF Test",
              interpretation: "p > 0.05 = السلسلة مستقرة",
              interpretationEn: "p > 0.05 = series is stationary",
              effectSize: "KPSS statistic",
              effectSizeEn: "KPSS statistic",
              sampleSizeNote: "مكمل لـ ADF",
              sampleSizeNoteEn: "Complementary to ADF",
              references: ["Kwiatkowski et al. (1992)"]
            });
          }
          break;
          
        case 'goodness_of_fit':
          if (depVars[0]) {
            recs.push({
              testName: "Chi-Square Goodness of Fit",
              testNameAr: "كاي تربيع لجودة المطابقة",
              category: "مطابقة",
              categoryEn: "Goodness of Fit",
              confidence: 95,
              matchScore: 98,
              description: "يقارن التكرارات المرصودة بالمتوقعة",
              descriptionEn: "Compares observed frequencies to expected",
              assumptions: [
                { name: "التكرار المتوقع", nameEn: "Expected Frequency", met: true, details: "كل فئة ≥ 5", detailsEn: "Each category ≥ 5" },
                { name: "استقلالية", nameEn: "Independence", met: true, details: "الملاحظات مستقلة", detailsEn: "Observations are independent" }
              ],
              alternativeIf: "التكرارات صغيرة جداً",
              alternativeIfEn: "If frequencies are too small",
              alternativeTest: "Exact Binomial Test",
              interpretation: "p > 0.05 = البيانات تطابق التوزيع المتوقع",
              interpretationEn: "p > 0.05 = data matches expected distribution",
              effectSize: "χ²",
              effectSizeEn: "χ²",
              sampleSizeNote: "يحتاج n ≥ 5 في كل فئة",
              sampleSizeNoteEn: "Needs n ≥ 5 in each category",
              references: ["Pearson (1900)"]
            });
          }
          break;
          
        case 'reliability':
          if (depVars.length >= 3) {
            recs.push({
              testName: "Cronbach's Alpha",
              testNameAr: "معامل ألفا كرونباخ",
              category: "موثوقية",
              categoryEn: "Reliability",
              confidence: 98,
              matchScore: 98,
              description: "يقيس الاتساق الداخلي للمقياس",
              descriptionEn: "Measures internal consistency of the scale",
              assumptions: [
                { name: "عدد الفقرات", nameEn: "Number of Items", met: depVars.length >= 3, details: `${depVars.length} فقرات`, detailsEn: `${depVars.length} items` },
                { name: "أحادية البعد", nameEn: "Unidimensionality", met: true, details: "الفقرات تقيس بعداً واحداً", detailsEn: "Items measure one dimension" }
              ],
              alternativeIf: "فقرات غير متجانسة",
              alternativeIfEn: "If items are heterogeneous",
              alternativeTest: "McDonald's Omega",
              interpretation: "α > 0.7 = مقبول، > 0.8 = جيد، > 0.9 = ممتاز",
              interpretationEn: "α > 0.7 = acceptable, > 0.8 = good, > 0.9 = excellent",
              effectSize: "α: 0-1",
              effectSizeEn: "α: 0-1",
              sampleSizeNote: "يحتاج n ≥ 30",
              sampleSizeNoteEn: "Needs n ≥ 30",
              references: ["Cronbach (1951)"]
            });
          }
          break;
      }
      
      recs.sort((a, b) => b.matchScore - a.matchScore);
      
      setRecommendations(recs);
      setIsAnalyzing(false);
    }, 1500);
  };

  // تنفيذ الاختبار
  const runTest = (test: TestRecommendation) => {
    setSelectedTest(test);
    
    const mockResults: any = {
      testName: test.testName,
      testNameAr: test.testNameAr,
      statistic: (Math.random() * 10).toFixed(4),
      pValue: Math.random().toFixed(4),
      df: Math.floor(Math.random() * 50) + 1,
      effectSize: (Math.random()).toFixed(4),
      ci95: {
        lower: (Math.random() * -2).toFixed(4),
        upper: (Math.random() * 2).toFixed(4)
      },
      sampleSize: data.length,
      conclusion: Math.random() > 0.5 ? 'significant' : 'not_significant'
    };
    
    setTestResult(mockResults);
  };

  const numericColumns = columnAnalysis.filter(c => c.type === 'numeric');
  const categoricalColumns = columnAnalysis.filter(c => c.type === 'categorical' || c.type === 'ordinal');

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-4 h-4 text-blue-500" />;
      case 'categorical': return <Type className="w-4 h-4 text-green-500" />;
      case 'ordinal': return <Layers className="w-4 h-4 text-purple-500" />;
      case 'datetime': return <Calendar className="w-4 h-4 text-orange-500" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4 text-pink-500" />;
      default: return <Type className="w-4 h-4 text-gray-500" />;
    }
  };

  const getTypeName = (type: string) => {
    switch (type) {
      case 'numeric': return texts.numeric;
      case 'categorical': return texts.categorical;
      case 'ordinal': return texts.ordinal;
      case 'datetime': return texts.datetime;
      case 'boolean': return texts.boolean;
      default: return texts.text;
    }
  };

  const getConfidenceColor = (conf: number) => {
    if (conf >= 90) return 'text-green-600 bg-green-50';
    if (conf >= 75) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getMatchColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 75) return 'bg-yellow-500';
    if (score >= 60) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const ArrowIcon = isRTL ? ArrowLeft : ArrowRight;

  return (
    <div className="space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Brain className="w-7 h-7" />
          </div>
          <div>
            <h2 className="text-2xl font-bold">{texts.title}</h2>
            <p className="text-purple-100">{texts.subtitle}</p>
          </div>
        </div>
        
        {/* Progress Steps */}
        <div className="flex items-center justify-between mt-6">
          {[
            { num: 1, label: texts.step1, icon: <BarChart3 className="w-4 h-4" /> },
            { num: 2, label: texts.step2, icon: <FileQuestion className="w-4 h-4" /> },
            { num: 3, label: texts.step3, icon: <Settings className="w-4 h-4" /> },
            { num: 4, label: texts.step4, icon: <Lightbulb className="w-4 h-4" /> },
            { num: 5, label: texts.step5, icon: <Play className="w-4 h-4" /> }
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div 
                className={`flex flex-col items-center cursor-pointer transition-all ${
                  step >= s.num ? 'opacity-100' : 'opacity-50'
                }`}
                onClick={() => s.num < step && setStep(s.num)}
              >
                <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                  step === s.num 
                    ? 'bg-white text-purple-600 shadow-lg scale-110' 
                    : step > s.num 
                      ? 'bg-green-400 text-white' 
                      : 'bg-white/30 text-white'
                }`}>
                  {step > s.num ? <CheckCircle2 className="w-5 h-5" /> : s.icon}
                </div>
                <span className="text-xs mt-2 hidden md:block">{s.label}</span>
              </div>
              {i < 4 && (
                <div className={`flex-1 h-1 mx-2 rounded ${
                  step > s.num ? 'bg-green-400' : 'bg-white/30'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Step 1: Data Analysis */}
      {step === 1 && (
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-purple-600" />
            {texts.dataAnalysisTitle}
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
              <div className="text-3xl font-bold text-blue-600">{data.length}</div>
              <div className="text-sm text-blue-700">{texts.totalRows}</div>
            </div>
            <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
              <div className="text-3xl font-bold text-green-600">{numericColumns.length}</div>
              <div className="text-sm text-green-700">{texts.numericVars}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
              <div className="text-3xl font-bold text-purple-600">{categoricalColumns.length}</div>
              <div className="text-sm text-purple-700">{texts.categoricalVars}</div>
            </div>
            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
              <div className="text-3xl font-bold text-orange-600">
                {columnAnalysis.filter(c => c.missingPercent > 0).length}
              </div>
              <div className="text-sm text-orange-700">{texts.columnsWithMissing}</div>
            </div>
          </div>
          
          {/* Column Details */}
          <div className="border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className={`${isRTL ? 'text-right' : 'text-left'} p-3 font-semibold`}>{texts.variable}</th>
                  <th className={`${isRTL ? 'text-right' : 'text-left'} p-3 font-semibold`}>{texts.type}</th>
                  <th className={`${isRTL ? 'text-right' : 'text-left'} p-3 font-semibold`}>{texts.uniqueValues}</th>
                  <th className={`${isRTL ? 'text-right' : 'text-left'} p-3 font-semibold`}>{texts.missing}</th>
                  <th className={`${isRTL ? 'text-right' : 'text-left'} p-3 font-semibold`}>{texts.distribution}</th>
                  <th className={`${isRTL ? 'text-right' : 'text-left'} p-3 font-semibold`}>{texts.notes}</th>
                </tr>
              </thead>
              <tbody>
                {columnAnalysis.map((col, i) => (
                  <tr key={col.name} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="p-3 font-medium">{col.name}</td>
                    <td className="p-3">
                      <span className="flex items-center gap-2">
                        {getTypeIcon(col.type)}
                        <span className="text-gray-600">{getTypeName(col.type)}</span>
                      </span>
                    </td>
                    <td className="p-3">{col.uniqueValues}</td>
                    <td className="p-3">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        col.missingPercent === 0 ? 'bg-green-100 text-green-700' :
                        col.missingPercent < 5 ? 'bg-yellow-100 text-yellow-700' :
                        'bg-red-100 text-red-700'
                      }`}>
                        {col.missingPercent.toFixed(1)}%
                      </span>
                    </td>
                    <td className="p-3">
                      {col.type === 'numeric' && (
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          col.isNormal ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
                        }`}>
                          {col.isNormal ? texts.normal : texts.notNormal}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-gray-500 text-xs">
                      {col.type === 'numeric' && col.outlierCount! > 0 && (
                        <span className="text-orange-600">
                          {col.outlierCount} {texts.outliers}
                        </span>
                      )}
                      {col.type === 'categorical' && (
                        <span>{col.uniqueValues} {texts.categories}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="mt-6 flex justify-end">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2"
            >
              {texts.nextStep2}
              <ArrowIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Research Question */}
      {step === 2 && (
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-purple-600" />
            {texts.researchQuestionTitle}
          </h3>
          <p className="text-gray-600 mb-6">{texts.researchQuestionSubtitle}</p>
          
          {/* Categories */}
          {[
            { ar: 'المقارنة', en: 'Comparison', icon: <Users className="w-5 h-5 text-blue-500" /> },
            { ar: 'العلاقة', en: 'Relationship', icon: <GitBranch className="w-5 h-5 text-green-500" /> },
            { ar: 'التنبؤ', en: 'Prediction', icon: <Target className="w-5 h-5 text-purple-500" /> },
            { ar: 'الافتراضات', en: 'Assumptions', icon: <CheckCircle2 className="w-5 h-5 text-orange-500" /> },
            { ar: 'السلاسل الزمنية', en: 'Time Series', icon: <Clock className="w-5 h-5 text-pink-500" /> },
            { ar: 'المطابقة', en: 'Goodness of Fit', icon: <Compass className="w-5 h-5 text-cyan-500" /> },
            { ar: 'القياس', en: 'Measurement', icon: <Award className="w-5 h-5 text-yellow-500" /> }
          ].map(category => {
            const questions = researchQuestions.filter(q => q.category === category.ar);
            if (questions.length === 0) return null;
            
            return (
              <div key={category.ar} className="mb-6">
                <h4 className="text-lg font-semibold text-gray-700 mb-3 flex items-center gap-2">
                  {category.icon}
                  {language === 'ar' ? category.ar : category.en}
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {questions.map(q => (
                    <div
                      key={q.id}
                      onClick={() => setSelectedQuestion(q)}
                      className={`p-4 rounded-xl border-2 cursor-pointer transition-all hover:shadow-md ${
                        selectedQuestion?.id === q.id
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-purple-300'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className={`p-2 rounded-lg ${
                          selectedQuestion?.id === q.id ? 'bg-purple-100' : 'bg-gray-100'
                        }`}>
                          {q.icon}
                        </div>
                        <div className="flex-1">
                          <h5 className="font-semibold text-gray-800">
                            {language === 'ar' ? q.question : q.questionEn}
                          </h5>
                          <p className="text-sm text-gray-500 mt-1">
                            {language === 'ar' ? q.description : q.descriptionEn}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1">
                            {q.requiredVars.map((v, i) => (
                              <span key={i} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">
                                {v.type === 'numeric' ? texts.numeric : 
                                 v.type === 'categorical' ? texts.categorical : texts.anyType} ({v.count})
                              </span>
                            ))}
                          </div>
                        </div>
                        {selectedQuestion?.id === q.id && (
                          <CheckCircle2 className="w-5 h-5 text-purple-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(1)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              {texts.previous}
            </button>
            <button
              onClick={() => selectedQuestion && setStep(3)}
              disabled={!selectedQuestion}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {texts.nextStep3}
              <ArrowIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Variable Selection */}
      {step === 3 && selectedQuestion && (
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <Settings className="w-6 h-6 text-purple-600" />
            {texts.variableSelectionTitle}
          </h3>
          <p className="text-gray-600 mb-6">
            <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded-lg text-sm">
              {language === 'ar' ? selectedQuestion.question : selectedQuestion.questionEn}
            </span>
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Dependent Variables */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                {texts.dependentVar}
                <span className="text-red-500 mx-1">{texts.required}</span>
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-3">
                {columnAnalysis.map(col => (
                  <label key={col.name} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVariables.dependent.includes(col.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariables(prev => ({
                            ...prev,
                            dependent: [...prev.dependent, col.name]
                          }));
                        } else {
                          setSelectedVariables(prev => ({
                            ...prev,
                            dependent: prev.dependent.filter(v => v !== col.name)
                          }));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="flex items-center gap-2">
                      {getTypeIcon(col.type)}
                      {col.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Independent Variables */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                {texts.independentVar}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-3">
                {columnAnalysis.map(col => (
                  <label key={col.name} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVariables.independent.includes(col.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariables(prev => ({
                            ...prev,
                            independent: [...prev.independent, col.name]
                          }));
                        } else {
                          setSelectedVariables(prev => ({
                            ...prev,
                            independent: prev.independent.filter(v => v !== col.name)
                          }));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="flex items-center gap-2">
                      {getTypeIcon(col.type)}
                      {col.name}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Grouping Variable */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                {texts.groupingVar}
              </label>
              <div className="space-y-2 max-h-48 overflow-y-auto border rounded-xl p-3">
                {categoricalColumns.map(col => (
                  <label key={col.name} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVariables.grouping.includes(col.name)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedVariables(prev => ({
                            ...prev,
                            grouping: [...prev.grouping, col.name]
                          }));
                        } else {
                          setSelectedVariables(prev => ({
                            ...prev,
                            grouping: prev.grouping.filter(v => v !== col.name)
                          }));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 rounded"
                    />
                    <span className="flex items-center gap-2">
                      {getTypeIcon(col.type)}
                      {col.name}
                      <span className="text-xs text-gray-500">({col.uniqueValues} {texts.categories})</span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
            
            {/* Advanced Options */}
            <div className="space-y-3">
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm font-semibold text-gray-700"
              >
                <Settings className="w-4 h-4" />
                {texts.advancedOptions}
                {showAdvanced ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              {showAdvanced && (
                <div className="border rounded-xl p-4 space-y-4">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{texts.significanceLevel}</label>
                    <select
                      value={significanceLevel}
                      onChange={(e) => setSignificanceLevel(parseFloat(e.target.value))}
                      className="w-full border rounded-lg p-2"
                    >
                      <option value={0.01}>0.01 ({texts.confidence99})</option>
                      <option value={0.05}>0.05 ({texts.confidence95})</option>
                      <option value={0.10}>0.10 ({texts.confidence90})</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">{texts.covariate}</label>
                    <select
                      value={selectedVariables.covariate[0] || ''}
                      onChange={(e) => setSelectedVariables(prev => ({
                        ...prev,
                        covariate: e.target.value ? [e.target.value] : []
                      }))}
                      className="w-full border rounded-lg p-2"
                    >
                      <option value="">{texts.none}</option>
                      {numericColumns.map(col => (
                        <option key={col.name} value={col.name}>{col.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(2)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              {texts.previous}
            </button>
            <button
              onClick={() => {
                analyzeAndRecommend();
                setStep(4);
              }}
              disabled={selectedVariables.dependent.length === 0}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-5 h-5" />
              {texts.analyzeAndRecommend}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Recommendations */}
      {step === 4 && (
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Lightbulb className="w-6 h-6 text-yellow-500" />
            {texts.recommendationsTitle}
          </h3>
          
          {isAnalyzing ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-200 border-t-purple-600 mb-4"></div>
              <p className="text-gray-600 animate-pulse">{texts.analyzing}</p>
            </div>
          ) : recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, index) => (
                <div
                  key={rec.testName}
                  className={`border-2 rounded-xl overflow-hidden transition-all ${
                    selectedTest?.testName === rec.testName
                      ? 'border-purple-500 shadow-lg'
                      : 'border-gray-200 hover:border-purple-300'
                  }`}
                >
                  <div className="p-4 bg-gradient-to-r from-gray-50 to-white">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4">
                        {/* Rank Badge */}
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          index === 0 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
                          index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-500' :
                          'bg-gradient-to-r from-amber-600 to-amber-700'
                        }`}>
                          {index + 1}
                        </div>
                        
                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <h4 className="text-lg font-bold text-gray-800">
                              {language === 'ar' ? rec.testNameAr : rec.testName}
                            </h4>
                            <span className="text-sm text-gray-500">
                              ({language === 'ar' ? rec.testName : rec.testNameAr})
                            </span>
                            <span className={`px-2 py-1 rounded-full text-xs ${
                              rec.category === 'معلمي' || rec.categoryEn === 'Parametric' 
                                ? 'bg-blue-100 text-blue-700' 
                                : rec.category === 'لامعلمي' || rec.categoryEn === 'Non-parametric'
                                  ? 'bg-green-100 text-green-700' 
                                  : 'bg-purple-100 text-purple-700'
                            }`}>
                              {language === 'ar' ? rec.category : rec.categoryEn}
                            </span>
                          </div>
                          <p className="text-gray-600 text-sm mt-1">
                            {language === 'ar' ? rec.description : rec.descriptionEn}
                          </p>
                        </div>
                      </div>
                      
                      {/* Match Score */}
                      <div className="text-center">
                        <div className={`text-2xl font-bold ${getConfidenceColor(rec.matchScore).split(' ')[0]}`}>
                          {rec.matchScore}%
                        </div>
                        <div className="text-xs text-gray-500">{texts.match}</div>
                        <div className={`w-16 h-2 rounded-full mt-1 bg-gray-200 overflow-hidden`}>
                          <div 
                            className={`h-full ${getMatchColor(rec.matchScore)}`}
                            style={{ width: `${rec.matchScore}%` }}
                          />
                        </div>
                      </div>
                    </div>
                    
                    {/* Assumptions */}
                    <div className="mt-4 pt-4 border-t">
                      <h5 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {texts.statisticalAssumptions}
                      </h5>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        {rec.assumptions.map((assumption, i) => (
                          <div 
                            key={i}
                            onClick={() => setExpandedAssumption(
                              expandedAssumption === `${rec.testName}-${i}` ? null : `${rec.testName}-${i}`
                            )}
                            className={`p-2 rounded-lg text-sm cursor-pointer transition-all ${
                              assumption.met 
                                ? 'bg-green-50 border border-green-200' 
                                : 'bg-red-50 border border-red-200'
                            }`}
                          >
                            <div className="flex items-center gap-2">
                              {assumption.met ? (
                                <CheckCircle2 className="w-4 h-4 text-green-600" />
                              ) : (
                                <XCircle className="w-4 h-4 text-red-600" />
                              )}
                              <span className={assumption.met ? 'text-green-700' : 'text-red-700'}>
                                {language === 'ar' ? assumption.name : assumption.nameEn}
                              </span>
                            </div>
                            {expandedAssumption === `${rec.testName}-${i}` && (
                              <p className="text-xs mt-2 text-gray-600">
                                {language === 'ar' ? assumption.details : assumption.detailsEn}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Additional Info */}
                    <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                      <div className="bg-blue-50 p-3 rounded-lg">
                        <div className="font-semibold text-blue-700 flex items-center gap-1 mb-1">
                          <Activity className="w-4 h-4" />
                          {texts.effectSize}
                        </div>
                        <p className="text-blue-600 text-xs">
                          {language === 'ar' ? rec.effectSize : rec.effectSizeEn}
                        </p>
                      </div>
                      
                      <div className="bg-orange-50 p-3 rounded-lg">
                        <div className="font-semibold text-orange-700 flex items-center gap-1 mb-1">
                          <AlertTriangle className="w-4 h-4" />
                          {texts.alternative}
                        </div>
                        <p className="text-orange-600 text-xs">
                          {language === 'ar' ? rec.alternativeIf : rec.alternativeIfEn}
                        </p>
                        <p className="text-orange-800 text-xs font-medium">→ {rec.alternativeTest}</p>
                      </div>
                      
                      <div className="bg-purple-50 p-3 rounded-lg">
                        <div className="font-semibold text-purple-700 flex items-center gap-1 mb-1">
                          <Users className="w-4 h-4" />
                          {texts.sampleSize}
                        </div>
                        <p className="text-purple-600 text-xs">
                          {language === 'ar' ? rec.sampleSizeNote : rec.sampleSizeNoteEn}
                        </p>
                      </div>
                    </div>
                    
                    {/* Interpretation */}
                    <div className="mt-4 bg-gray-50 p-3 rounded-lg">
                      <div className="font-semibold text-gray-700 flex items-center gap-1 mb-1">
                        <BookOpen className="w-4 h-4" />
                        {texts.howToInterpret}
                      </div>
                      <p className="text-gray-600 text-sm">
                        {language === 'ar' ? rec.interpretation : rec.interpretationEn}
                      </p>
                    </div>
                    
                    {/* Action Button */}
                    <div className="mt-4 flex justify-end">
                      <button
                        onClick={() => {
                          runTest(rec);
                          setStep(5);
                        }}
                        className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all flex items-center gap-2"
                      >
                        <Play className="w-4 h-4" />
                        {texts.runThisTest}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              <FileQuestion className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p>{texts.noTestsFound}</p>
              <p className="text-sm">{texts.ensureVariables}</p>
            </div>
          )}
          
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setStep(3)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              {texts.previous}
            </button>
          </div>
        </div>
      )}

      {/* Step 5: Results */}
      {step === 5 && selectedTest && testResult && (
        <div className="bg-white rounded-xl shadow-lg border p-6">
          <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
            <Award className="w-6 h-6 text-green-600" />
            {texts.resultsTitle}
          </h3>
          
          {/* Test Info Header */}
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h4 className="text-lg font-bold text-gray-800">
                  {language === 'ar' ? selectedTest.testNameAr : selectedTest.testName}
                </h4>
                <p className="text-gray-500">
                  {language === 'ar' ? selectedTest.testName : selectedTest.testNameAr}
                </p>
              </div>
              <span className={`px-4 py-2 rounded-full text-sm font-bold ${
                testResult.conclusion === 'significant' 
                  ? 'bg-green-100 text-green-700 border-2 border-green-300' 
                  : 'bg-gray-100 text-gray-700 border-2 border-gray-300'
              }`}>
                {testResult.conclusion === 'significant' ? texts.significant : texts.notSignificant}
              </span>
            </div>
          </div>
          
          {/* Results Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-blue-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-blue-600">{testResult.statistic}</div>
              <div className="text-sm text-blue-700">{texts.statisticValue}</div>
            </div>
            <div className={`rounded-xl p-4 text-center ${
              parseFloat(testResult.pValue) < significanceLevel ? 'bg-green-50' : 'bg-gray-50'
            }`}>
              <div className={`text-3xl font-bold ${
                parseFloat(testResult.pValue) < significanceLevel ? 'text-green-600' : 'text-gray-600'
              }`}>
                {testResult.pValue}
              </div>
              <div className={`text-sm ${
                parseFloat(testResult.pValue) < significanceLevel ? 'text-green-700' : 'text-gray-700'
              }`}>
                {texts.pValue}
              </div>
            </div>
            <div className="bg-purple-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-purple-600">{testResult.df}</div>
              <div className="text-sm text-purple-700">{texts.degreesOfFreedom}</div>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 text-center">
              <div className="text-3xl font-bold text-orange-600">{testResult.effectSize}</div>
              <div className="text-sm text-orange-700">{texts.effectSize}</div>
            </div>
          </div>
          
          {/* Confidence Interval */}
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <h5 className="font-semibold text-gray-700 mb-2">{texts.confidenceInterval}</h5>
            <div className="flex items-center gap-4">
              <span className="text-lg font-mono text-gray-800">
                [{testResult.ci95.lower}, {testResult.ci95.upper}]
              </span>
              <div className="flex-1 h-4 bg-gray-200 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ 
                    marginLeft: '20%',
                    width: '60%'
                  }}
                />
              </div>
            </div>
          </div>
          
          {/* Interpretation */}
          <div className={`rounded-xl p-4 mb-6 ${
            testResult.conclusion === 'significant' 
              ? 'bg-green-50 border-2 border-green-200' 
              : 'bg-gray-50 border-2 border-gray-200'
          }`}>
            <h5 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              {texts.interpretation}
            </h5>
            <p className="text-gray-700">
              {testResult.conclusion === 'significant' ? (
                <>
                  {texts.since} p-value ({testResult.pValue}) {texts.lessThan} {significanceLevel}،
                  <strong> {texts.rejectNull}</strong>
                  {' '}{texts.effectSizeIndicates} {
                    parseFloat(testResult.effectSize) < 0.3 ? texts.small :
                    parseFloat(testResult.effectSize) < 0.5 ? texts.medium : texts.large
                  } {texts.effect}.
                </>
              ) : (
                <>
                  {texts.since} p-value ({testResult.pValue}) {texts.greaterThan} {significanceLevel}،
                  <strong> {texts.failToRejectNull}</strong>
                </>
              )}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex flex-wrap gap-3 justify-between">
            <button
              onClick={() => setStep(4)}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all"
            >
              {texts.selectAnotherTest}
            </button>
            <div className="flex gap-3">
              <button className="px-6 py-3 border border-purple-200 text-purple-600 rounded-xl hover:bg-purple-50 transition-all flex items-center gap-2">
                <Download className="w-5 h-5" />
                {texts.exportResults}
              </button>
              <button className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all flex items-center gap-2">
                <Share2 className="w-5 h-5" />
                {texts.addToReport}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SmartTestAdvisor;
