// المساعد الذكي مع حفظ التقارير
// AI Assistant with Report Saving

import React, { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../i18n';
import ReportGenerator, { FullReport, ReportConfig } from '../utils/ReportGenerator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  data?: any;
}

interface AIAssistantWithReportsProps {
  data: Record<string, any>[];
  columns?: string[];
}

const AIAssistantWithReports: React.FC<AIAssistantWithReportsProps> = ({ data }) => {
  const { language, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<'chat' | 'analysis' | 'reports'>('chat');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [report, setReport] = useState<FullReport | null>(null);
  const [reportConfig, setReportConfig] = useState<Partial<ReportConfig>>({
    title: language === 'ar' ? 'تقرير تحليل البيانات' : 'Data Analysis Report',
    author: '',
    language: language,
    includeCharts: true,
    includeRawData: false,
    includeSummary: true,
    includeRecommendations: true,
    theme: 'professional',
    format: 'html'
  });
  const [showReportModal, setShowReportModal] = useState(false);
  const [savedReports, setSavedReports] = useState<{ name: string; date: string; report: FullReport }[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reportGenerator = useRef<ReportGenerator | null>(null);

  useEffect(() => {
    if (data && data.length > 0) {
      reportGenerator.current = new ReportGenerator(data, language);
      const fullReport = reportGenerator.current.generateFullReport({ language });
      setReport(fullReport);
      
      // رسالة ترحيب
      const welcomeMessage: Message = {
        id: '1',
        role: 'assistant',
        content: language === 'ar' 
          ? `مرحباً! أنا المساعد الإحصائي الذكي. 

لقد قمت بتحليل بياناتك:
- **${fullReport.dataOverview.totalRows}** صف
- **${fullReport.dataOverview.totalColumns}** عمود
- **${fullReport.dataOverview.numericColumns}** متغير رقمي
- **${fullReport.dataOverview.categoricalColumns}** متغير فئوي
- جودة البيانات: **${fullReport.dataOverview.dataQualityScore.toFixed(0)}%**

يمكنني مساعدتك في:
- تحليل البيانات وصفياً
- إجراء الاختبارات الإحصائية
- اكتشاف العلاقات والأنماط
- إنشاء وحفظ التقارير

اسألني أي سؤال!`
          : `Hello! I'm your Smart Statistical Assistant.

I've analyzed your data:
- **${fullReport.dataOverview.totalRows}** rows
- **${fullReport.dataOverview.totalColumns}** columns
- **${fullReport.dataOverview.numericColumns}** numeric variables
- **${fullReport.dataOverview.categoricalColumns}** categorical variables
- Data quality: **${fullReport.dataOverview.dataQualityScore.toFixed(0)}%**

I can help you with:
- Descriptive data analysis
- Statistical tests
- Discovering relationships and patterns
- Creating and saving reports

Ask me anything!`,
        timestamp: new Date()
      };
      setMessages([welcomeMessage]);
    }
  }, [data, language]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const processQuestion = (question: string): string => {
    if (!report || !reportGenerator.current) {
      return language === 'ar' 
        ? 'لا توجد بيانات محملة. يرجى تحميل البيانات أولاً.'
        : 'No data loaded. Please load data first.';
    }

    const q = question.toLowerCase();
    
    // ملخص البيانات
    if (q.includes('ملخص') || q.includes('وصف') || q.includes('summary') || q.includes('describe') || q.includes('overview')) {
      const overview = report.dataOverview;
      const numericStats = report.columnStats.filter(c => c.type === 'numeric');
      
      let response = language === 'ar' ? `## 📊 ملخص البيانات

### نظرة عامة
| المؤشر | القيمة |
|--------|--------|
| إجمالي الصفوف | ${overview.totalRows.toLocaleString()} |
| إجمالي الأعمدة | ${overview.totalColumns} |
| الأعمدة الرقمية | ${overview.numericColumns} |
| الأعمدة الفئوية | ${overview.categoricalColumns} |
| القيم المفقودة | ${overview.missingPercent.toFixed(1)}% |
| الصفوف المكررة | ${overview.duplicateRows} |
| جودة البيانات | ${overview.dataQualityScore.toFixed(0)}% |

` : `## 📊 Data Summary

### Overview
| Metric | Value |
|--------|-------|
| Total Rows | ${overview.totalRows.toLocaleString()} |
| Total Columns | ${overview.totalColumns} |
| Numeric Columns | ${overview.numericColumns} |
| Categorical Columns | ${overview.categoricalColumns} |
| Missing Values | ${overview.missingPercent.toFixed(1)}% |
| Duplicate Rows | ${overview.duplicateRows} |
| Data Quality | ${overview.dataQualityScore.toFixed(0)}% |

`;

      if (numericStats.length > 0) {
        response += language === 'ar' ? `### الإحصاءات الرقمية
| المتغير | المتوسط | الوسيط | الانحراف | الحد الأدنى | الحد الأقصى |
|---------|---------|--------|----------|-------------|-------------|
` : `### Numeric Statistics
| Variable | Mean | Median | Std | Min | Max |
|----------|------|--------|-----|-----|-----|
`;
        numericStats.forEach(col => {
          response += `| ${col.name} | ${col.mean?.toFixed(2) || '-'} | ${col.median?.toFixed(2) || '-'} | ${col.std?.toFixed(2) || '-'} | ${col.min?.toFixed(2) || '-'} | ${col.max?.toFixed(2) || '-'} |\n`;
        });
      }
      
      return response;
    }
    
    // القيم المفقودة
    if (q.includes('مفقود') || q.includes('فارغ') || q.includes('missing') || q.includes('null') || q.includes('empty')) {
      const missingCols = report.columnStats.filter(c => c.missing > 0);
      
      if (missingCols.length === 0) {
        return language === 'ar' 
          ? '✅ **لا توجد قيم مفقودة في البيانات!** جميع البيانات مكتملة.'
          : '✅ **No missing values in the data!** All data is complete.';
      }
      
      let response = language === 'ar' ? `## 🔍 تحليل القيم المفقودة

| العمود | المفقودة | النسبة | التوصية |
|--------|----------|--------|---------|
` : `## 🔍 Missing Values Analysis

| Column | Missing | Percentage | Recommendation |
|--------|---------|------------|----------------|
`;
      
      missingCols.sort((a, b) => b.missingPercent - a.missingPercent).forEach(col => {
        const rec = col.missingPercent > 50 
          ? (language === 'ar' ? 'حذف العمود' : 'Drop column')
          : col.missingPercent > 20 
            ? (language === 'ar' ? 'تعويض متقدم' : 'Advanced imputation')
            : col.type === 'numeric'
              ? (language === 'ar' ? 'تعويض بالوسيط' : 'Impute with median')
              : (language === 'ar' ? 'تعويض بالمنوال' : 'Impute with mode');
        response += `| ${col.name} | ${col.missing} | ${col.missingPercent.toFixed(1)}% | ${rec} |\n`;
      });
      
      response += language === 'ar' 
        ? `\n### التوصيات:
1. الأعمدة ذات النسبة > 50% يُفضل حذفها
2. الأعمدة ذات النسبة 20-50% تحتاج تعويض متقدم (KNN)
3. الأعمدة ذات النسبة < 20% يمكن تعويضها بالمتوسط/الوسيط`
        : `\n### Recommendations:
1. Columns with > 50% missing should be dropped
2. Columns with 20-50% need advanced imputation (KNN)
3. Columns with < 20% can be imputed with mean/median`;
      
      return response;
    }
    
    // الارتباطات
    if (q.includes('ارتباط') || q.includes('علاق') || q.includes('correlation') || q.includes('relationship')) {
      const numericCols = report.columnStats.filter(c => c.type === 'numeric');
      
      if (numericCols.length < 2) {
        return language === 'ar'
          ? '⚠️ يجب وجود متغيرين رقميين على الأقل لحساب الارتباط.'
          : '⚠️ At least 2 numeric variables are required for correlation.';
      }
      
      // حساب الارتباطات
      const correlations: { var1: string; var2: string; r: number; interpretation: string }[] = [];
      
      for (let i = 0; i < numericCols.length; i++) {
        for (let j = i + 1; j < numericCols.length; j++) {
          const col1 = numericCols[i].name;
          const col2 = numericCols[j].name;
          
          const vals1 = data.map(row => parseFloat(row[col1])).filter(v => !isNaN(v));
          const vals2 = data.map(row => parseFloat(row[col2])).filter(v => !isNaN(v));
          
          if (vals1.length >= 3 && vals2.length >= 3) {
            const n = Math.min(vals1.length, vals2.length);
            const mean1 = vals1.reduce((a, b) => a + b, 0) / vals1.length;
            const mean2 = vals2.reduce((a, b) => a + b, 0) / vals2.length;
            
            let num = 0, den1 = 0, den2 = 0;
            for (let k = 0; k < n; k++) {
              const d1 = vals1[k] - mean1;
              const d2 = vals2[k] - mean2;
              num += d1 * d2;
              den1 += d1 * d1;
              den2 += d2 * d2;
            }
            
            const r = den1 > 0 && den2 > 0 ? num / Math.sqrt(den1 * den2) : 0;
            const absR = Math.abs(r);
            
            let interpretation: string;
            if (absR >= 0.8) interpretation = language === 'ar' ? 'قوي جداً' : 'Very Strong';
            else if (absR >= 0.6) interpretation = language === 'ar' ? 'قوي' : 'Strong';
            else if (absR >= 0.4) interpretation = language === 'ar' ? 'متوسط' : 'Moderate';
            else if (absR >= 0.2) interpretation = language === 'ar' ? 'ضعيف' : 'Weak';
            else interpretation = language === 'ar' ? 'ضعيف جداً' : 'Very Weak';
            
            correlations.push({ var1: col1, var2: col2, r, interpretation });
          }
        }
      }
      
      correlations.sort((a, b) => Math.abs(b.r) - Math.abs(a.r));
      
      let response = language === 'ar' ? `## 🔗 تحليل الارتباطات

| المتغير 1 | المتغير 2 | معامل الارتباط | القوة | الاتجاه |
|-----------|-----------|----------------|-------|---------|
` : `## 🔗 Correlation Analysis

| Variable 1 | Variable 2 | Correlation | Strength | Direction |
|------------|------------|-------------|----------|-----------|
`;
      
      correlations.slice(0, 10).forEach(corr => {
        const direction = corr.r > 0 
          ? (language === 'ar' ? 'طردي ↗️' : 'Positive ↗️')
          : (language === 'ar' ? 'عكسي ↘️' : 'Negative ↘️');
        response += `| ${corr.var1} | ${corr.var2} | ${corr.r.toFixed(3)} | ${corr.interpretation} | ${direction} |\n`;
      });
      
      // أقوى الارتباطات
      const strongCorrs = correlations.filter(c => Math.abs(c.r) >= 0.5);
      if (strongCorrs.length > 0) {
        response += language === 'ar' 
          ? `\n### 💡 الرؤى الرئيسية:\n`
          : `\n### 💡 Key Insights:\n`;
        
        strongCorrs.slice(0, 3).forEach(corr => {
          response += language === 'ar'
            ? `- يوجد ارتباط **${corr.interpretation}** ${corr.r > 0 ? 'طردي' : 'عكسي'} بين **${corr.var1}** و **${corr.var2}** (r = ${corr.r.toFixed(3)})\n`
            : `- There is a **${corr.interpretation}** ${corr.r > 0 ? 'positive' : 'negative'} correlation between **${corr.var1}** and **${corr.var2}** (r = ${corr.r.toFixed(3)})\n`;
        });
      }
      
      return response;
    }
    
    // التوزيع الطبيعي
    if (q.includes('توزيع') || q.includes('طبيعي') || q.includes('normal') || q.includes('distribution')) {
      const numericCols = report.columnStats.filter(c => c.type === 'numeric');
      
      if (numericCols.length === 0) {
        return language === 'ar'
          ? '⚠️ لا توجد متغيرات رقمية لتحليل التوزيع.'
          : '⚠️ No numeric variables for distribution analysis.';
      }
      
      let response = language === 'ar' ? `## 📈 تحليل التوزيعات

| المتغير | الالتواء | التفرطح | التوزيع | التوصية |
|---------|----------|---------|---------|---------|
` : `## 📈 Distribution Analysis

| Variable | Skewness | Kurtosis | Distribution | Recommendation |
|----------|----------|----------|--------------|----------------|
`;
      
      numericCols.forEach(col => {
        const distType = col.isNormal 
          ? (language === 'ar' ? '✅ طبيعي' : '✅ Normal')
          : (language === 'ar' ? '❌ غير طبيعي' : '❌ Not Normal');
        
        let rec: string;
        if (col.isNormal) {
          rec = language === 'ar' ? 'اختبارات معلمية' : 'Parametric tests';
        } else if (Math.abs(col.skewness || 0) > 2) {
          rec = language === 'ar' ? 'تحويل لوغاريتمي' : 'Log transformation';
        } else {
          rec = language === 'ar' ? 'اختبارات لامعلمية' : 'Non-parametric tests';
        }
        
        response += `| ${col.name} | ${col.skewness?.toFixed(2) || '-'} | ${col.kurtosis?.toFixed(2) || '-'} | ${distType} | ${rec} |\n`;
      });
      
      const normalCount = numericCols.filter(c => c.isNormal).length;
      response += language === 'ar'
        ? `\n### 📝 الملخص:
- **${normalCount}** من **${numericCols.length}** متغيرات تتبع التوزيع الطبيعي
- ${normalCount < numericCols.length / 2 ? 'يُنصح باستخدام الاختبارات اللامعلمية' : 'يمكن استخدام الاختبارات المعلمية'}`
        : `\n### 📝 Summary:
- **${normalCount}** out of **${numericCols.length}** variables follow normal distribution
- ${normalCount < numericCols.length / 2 ? 'Non-parametric tests recommended' : 'Parametric tests can be used'}`;
      
      return response;
    }
    
    // القيم الشاذة
    if (q.includes('شاذ') || q.includes('متطرف') || q.includes('outlier') || q.includes('extreme')) {
      const numericCols = report.columnStats.filter(c => c.type === 'numeric');
      
      let response = language === 'ar' ? `## 🎯 تحليل القيم الشاذة

| المتغير | عدد الشاذة | النسبة | الحد الأدنى الطبيعي | الحد الأقصى الطبيعي |
|---------|------------|--------|---------------------|---------------------|
` : `## 🎯 Outlier Analysis

| Variable | Outliers | Percentage | Lower Bound | Upper Bound |
|----------|----------|------------|-------------|-------------|
`;
      
      let totalOutliers = 0;
      
      numericCols.forEach(col => {
        const values = data.map(row => parseFloat(row[col.name])).filter(v => !isNaN(v));
        values.sort((a, b) => a - b);
        
        const q1 = values[Math.floor(values.length * 0.25)];
        const q3 = values[Math.floor(values.length * 0.75)];
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;
        
        const outliers = values.filter(v => v < lowerBound || v > upperBound);
        totalOutliers += outliers.length;
        
        if (outliers.length > 0) {
          response += `| ${col.name} | ${outliers.length} | ${((outliers.length / values.length) * 100).toFixed(1)}% | ${lowerBound.toFixed(2)} | ${upperBound.toFixed(2)} |\n`;
        }
      });
      
      if (totalOutliers === 0) {
        response = language === 'ar'
          ? '✅ **لا توجد قيم شاذة في البيانات!** جميع القيم ضمن النطاق الطبيعي.'
          : '✅ **No outliers in the data!** All values are within normal range.';
      } else {
        response += language === 'ar'
          ? `\n### 💡 التوصيات:
1. **Winsorization**: استبدال القيم الشاذة بأقرب قيمة طبيعية
2. **الحذف**: إذا كانت النسبة < 5%
3. **التحويل**: استخدام تحويل لوغاريتمي
4. **الاحتفاظ**: إذا كانت القيم حقيقية ومهمة`
          : `\n### 💡 Recommendations:
1. **Winsorization**: Replace outliers with nearest normal value
2. **Removal**: If percentage < 5%
3. **Transformation**: Use log transformation
4. **Keep**: If values are genuine and important`;
      }
      
      return response;
    }
    
    // اقتراح الاختبار
    if (q.includes('اختبار') || q.includes('مناسب') || q.includes('test') || q.includes('suitable') || q.includes('recommend')) {
      const numericCols = report.columnStats.filter(c => c.type === 'numeric');
      const catCols = report.columnStats.filter(c => c.type === 'categorical');
      const normalCols = numericCols.filter(c => c.isNormal);
      
      let response = language === 'ar' ? `## 🧪 اقتراحات الاختبارات المناسبة

بناءً على تحليل بياناتك:
- **${numericCols.length}** متغير رقمي (${normalCols.length} طبيعي)
- **${catCols.length}** متغير فئوي

### الاختبارات المقترحة:

` : `## 🧪 Recommended Statistical Tests

Based on your data analysis:
- **${numericCols.length}** numeric variables (${normalCols.length} normal)
- **${catCols.length}** categorical variables

### Suggested Tests:

`;
      
      // اقتراحات بناءً على البيانات
      if (numericCols.length >= 2) {
        response += language === 'ar' 
          ? `#### 🔗 لتحليل العلاقات:
- **Pearson Correlation**: ${normalCols.length >= 2 ? '✅ مناسب (بيانات طبيعية)' : '⚠️ تحقق من التوزيع الطبيعي'}
- **Spearman Correlation**: ✅ مناسب دائماً (لامعلمي)
- **Linear Regression**: ${normalCols.length >= 1 ? '✅ مناسب للتنبؤ' : '⚠️ تحقق من الافتراضات'}

`
          : `#### 🔗 For Relationship Analysis:
- **Pearson Correlation**: ${normalCols.length >= 2 ? '✅ Suitable (normal data)' : '⚠️ Check normality'}
- **Spearman Correlation**: ✅ Always suitable (non-parametric)
- **Linear Regression**: ${normalCols.length >= 1 ? '✅ Suitable for prediction' : '⚠️ Check assumptions'}

`;
      }
      
      if (catCols.length >= 1 && numericCols.length >= 1) {
        const catCol = catCols[0];
        const numGroups = catCol.unique;
        
        response += language === 'ar'
          ? `#### 📊 للمقارنة بين المجموعات:
${numGroups === 2 
  ? `- **Independent T-Test**: ${normalCols.length > 0 ? '✅ مناسب' : '⚠️ استخدم Mann-Whitney'}
- **Mann-Whitney U**: ✅ بديل لامعلمي`
  : `- **One-Way ANOVA**: ${normalCols.length > 0 ? '✅ مناسب' : '⚠️ استخدم Kruskal-Wallis'}
- **Kruskal-Wallis**: ✅ بديل لامعلمي`}

`
          : `#### 📊 For Group Comparison:
${numGroups === 2
  ? `- **Independent T-Test**: ${normalCols.length > 0 ? '✅ Suitable' : '⚠️ Use Mann-Whitney'}
- **Mann-Whitney U**: ✅ Non-parametric alternative`
  : `- **One-Way ANOVA**: ${normalCols.length > 0 ? '✅ Suitable' : '⚠️ Use Kruskal-Wallis'}
- **Kruskal-Wallis**: ✅ Non-parametric alternative`}

`;
      }
      
      if (catCols.length >= 2) {
        response += language === 'ar'
          ? `#### 📋 لتحليل العلاقة بين المتغيرات الفئوية:
- **Chi-Square Test**: ✅ مناسب لجدول التقاطع
- **Fisher's Exact**: ✅ للعينات الصغيرة

`
          : `#### 📋 For Categorical Variable Relationship:
- **Chi-Square Test**: ✅ Suitable for contingency table
- **Fisher's Exact**: ✅ For small samples

`;
      }
      
      return response;
    }
    
    // جودة البيانات
    if (q.includes('جودة') || q.includes('quality')) {
      const overview = report.dataOverview;
      const insights = report.insights;
      const recommendations = report.recommendations;
      
      let response = language === 'ar' ? `## ✨ تقرير جودة البيانات

### النتيجة الإجمالية: **${overview.dataQualityScore.toFixed(0)}%** ${overview.dataQualityScore >= 80 ? '🟢' : overview.dataQualityScore >= 60 ? '🟡' : '🔴'}

| المؤشر | النتيجة |
|--------|---------|
| الاكتمال | ${(100 - overview.missingPercent).toFixed(1)}% |
| عدم التكرار | ${((1 - overview.duplicateRows / overview.totalRows) * 100).toFixed(1)}% |

` : `## ✨ Data Quality Report

### Overall Score: **${overview.dataQualityScore.toFixed(0)}%** ${overview.dataQualityScore >= 80 ? '🟢' : overview.dataQualityScore >= 60 ? '🟡' : '🔴'}

| Metric | Score |
|--------|-------|
| Completeness | ${(100 - overview.missingPercent).toFixed(1)}% |
| Uniqueness | ${((1 - overview.duplicateRows / overview.totalRows) * 100).toFixed(1)}% |

`;
      
      if (insights.length > 0) {
        response += language === 'ar' ? `### المشاكل المكتشفة:\n` : `### Issues Found:\n`;
        insights.slice(0, 5).forEach((insight, i) => {
          const icon = insight.severity === 'high' ? '🔴' : insight.severity === 'medium' ? '🟡' : '🔵';
          response += `${i + 1}. ${icon} ${language === 'ar' ? insight.message : insight.messageEn}\n`;
        });
      }
      
      if (recommendations.length > 0) {
        response += language === 'ar' ? `\n### التوصيات:\n` : `\n### Recommendations:\n`;
        recommendations.slice(0, 5).forEach((rec, i) => {
          response += `${i + 1}. ${language === 'ar' ? rec.text : rec.textEn}\n`;
        });
      }
      
      return response;
    }
    
    // إنشاء تقرير
    if (q.includes('تقرير') || q.includes('report') || q.includes('export') || q.includes('حفظ') || q.includes('save')) {
      setShowReportModal(true);
      return language === 'ar'
        ? '📄 **تم فتح نافذة إنشاء التقرير!**\n\nيمكنك الآن تخصيص التقرير وحفظه بالصيغة المطلوبة.'
        : '📄 **Report creation window opened!**\n\nYou can now customize and save the report in your preferred format.';
    }
    
    // مساعدة
    if (q.includes('مساعد') || q.includes('help') || q.includes('ماذا') || q.includes('what can')) {
      return language === 'ar' ? `## 💡 كيف يمكنني مساعدتك؟

### الأسئلة التي يمكنني الإجابة عليها:

#### 📊 تحليل البيانات:
- "ملخص البيانات" - نظرة عامة شاملة
- "تحليل القيم المفقودة" - اكتشاف ومعالجة المفقودات
- "تحليل القيم الشاذة" - اكتشاف القيم المتطرفة
- "جودة البيانات" - تقييم شامل للجودة

#### 🔗 العلاقات والارتباطات:
- "تحليل الارتباطات" - اكتشاف العلاقات بين المتغيرات
- "تحليل التوزيعات" - فحص التوزيع الطبيعي

#### 🧪 الاختبارات الإحصائية:
- "ما الاختبار المناسب؟" - اقتراحات ذكية

#### 📄 التقارير:
- "إنشاء تقرير" - حفظ التحليل كتقرير

اكتب سؤالك وسأساعدك!` 
        : `## 💡 How can I help you?

### Questions I can answer:

#### 📊 Data Analysis:
- "Data summary" - Comprehensive overview
- "Missing values analysis" - Discover and handle missing data
- "Outlier analysis" - Detect extreme values
- "Data quality" - Comprehensive quality assessment

#### 🔗 Relationships & Correlations:
- "Correlation analysis" - Discover variable relationships
- "Distribution analysis" - Check normality

#### 🧪 Statistical Tests:
- "What test is suitable?" - Smart recommendations

#### 📄 Reports:
- "Create report" - Save analysis as a report

Type your question and I'll help!`;
    }
    
    // رد افتراضي
    return language === 'ar'
      ? `🤔 لم أفهم سؤالك بالضبط. جرب أحد هذه الأسئلة:
- "ملخص البيانات"
- "تحليل الارتباطات"
- "ما الاختبار المناسب؟"
- "إنشاء تقرير"
- "مساعدة"`
      : `🤔 I didn't quite understand your question. Try one of these:
- "Data summary"
- "Correlation analysis"
- "What test is suitable?"
- "Create report"
- "Help"`;
  };

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    
    setTimeout(() => {
      const response = processQuestion(input);
      
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 500);
  };

  const handleSaveReport = (format: 'html' | 'json' | 'csv') => {
    if (!reportGenerator.current || !report) return;
    
    const updatedReport = reportGenerator.current.generateFullReport({
      ...reportConfig,
      language
    });
    
    reportGenerator.current.downloadReport(format, updatedReport);
    
    // حفظ في السجل
    const newSavedReport = {
      name: reportConfig.title || 'Report',
      date: new Date().toISOString(),
      report: updatedReport
    };
    setSavedReports(prev => [newSavedReport, ...prev.slice(0, 9)]);
    setShowReportModal(false);
  };

  const handlePrintReport = () => {
    if (!reportGenerator.current || !report) return;
    reportGenerator.current.printReport(report);
  };

  const renderMarkdown = (content: string) => {
    // Simple markdown rendering
    let html = content
      .replace(/^## (.*$)/gm, '<h2 class="text-xl font-bold mt-4 mb-2 text-purple-700">$1</h2>')
      .replace(/^### (.*$)/gm, '<h3 class="text-lg font-semibold mt-3 mb-2 text-gray-700">$1</h3>')
      .replace(/^#### (.*$)/gm, '<h4 class="text-md font-medium mt-2 mb-1 text-gray-600">$1</h4>')
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/^- (.*$)/gm, '<li class="ml-4">$1</li>')
      .replace(/^\d+\. (.*$)/gm, '<li class="ml-4 list-decimal">$1</li>')
      .replace(/\n/g, '<br>');
    
    // Table rendering
    const tableRegex = /\|(.+)\|\n\|[-:\s|]+\|\n((?:\|.+\|\n?)+)/g;
    html = html.replace(tableRegex, (_match, header, body) => {
      const headerCells = header.split('|').filter((c: string) => c.trim());
      const bodyRows = body.trim().split('\n').map((row: string) => 
        row.split('|').filter((c: string) => c.trim())
      );
      
      return `<table class="w-full border-collapse my-4 text-sm">
        <thead><tr class="bg-purple-100">${headerCells.map((c: string) => `<th class="border border-purple-200 px-3 py-2 text-${isRTL ? 'right' : 'left'}">${c.trim()}</th>`).join('')}</tr></thead>
        <tbody>${bodyRows.map((row: string[], i: number) => `<tr class="${i % 2 ? 'bg-gray-50' : ''}">${row.map((c: string) => `<td class="border border-gray-200 px-3 py-2">${c.trim()}</td>`).join('')}</tr>`).join('')}</tbody>
      </table>`;
    });
    
    return html;
  };

  const quickQuestions = language === 'ar' ? [
    'ملخص البيانات',
    'تحليل الارتباطات',
    'القيم المفقودة',
    'القيم الشاذة',
    'ما الاختبار المناسب؟',
    'جودة البيانات',
    'إنشاء تقرير'
  ] : [
    'Data summary',
    'Correlation analysis',
    'Missing values',
    'Outliers',
    'Recommend test',
    'Data quality',
    'Create report'
  ];

  const COLORS = ['#667eea', '#764ba2', '#f59e0b', '#10b981', '#ef4444', '#6366f1'];

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <span className="text-xl">🤖</span>
            </div>
            <div>
              <h2 className="font-bold text-lg">{language === 'ar' ? 'المساعد الإحصائي الذكي' : 'Smart Statistical Assistant'}</h2>
              <p className="text-sm opacity-80">{language === 'ar' ? 'تحليل ذكي وتقارير احترافية' : 'Smart analysis & professional reports'}</p>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-2">
            {(['chat', 'analysis', 'reports'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab 
                    ? 'bg-white text-purple-600' 
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {tab === 'chat' ? (language === 'ar' ? '💬 المحادثة' : '💬 Chat') :
                 tab === 'analysis' ? (language === 'ar' ? '📊 التحليل' : '📊 Analysis') :
                 (language === 'ar' ? '📄 التقارير' : '📄 Reports')}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'chat' && (
          <div className="h-full flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map(msg => (
                <div
                  key={msg.id}
                  className={`flex ${msg.role === 'user' ? (isRTL ? 'justify-start' : 'justify-end') : (isRTL ? 'justify-end' : 'justify-start')}`}
                >
                  <div className={`max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-purple-600 text-white rounded-2xl rounded-br-sm px-4 py-3'
                      : 'bg-white shadow-md rounded-2xl rounded-bl-sm px-4 py-3'
                  }`}>
                    {msg.role === 'assistant' ? (
                      <div 
                        className="prose prose-sm max-w-none"
                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                      />
                    ) : (
                      <p>{msg.content}</p>
                    )}
                    <p className={`text-xs mt-2 ${msg.role === 'user' ? 'text-purple-200' : 'text-gray-400'}`}>
                      {msg.timestamp.toLocaleTimeString(language === 'ar' ? 'ar-SA' : 'en-US', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
              
              {isTyping && (
                <div className={`flex ${isRTL ? 'justify-end' : 'justify-start'}`}>
                  <div className="bg-white shadow-md rounded-2xl px-4 py-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
            
            {/* Quick Questions */}
            <div className="px-4 py-2 border-t border-purple-100">
              <div className="flex flex-wrap gap-2">
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => { setInput(q); handleSend(); }}
                    className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-full text-sm hover:bg-purple-200 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
            
            {/* Input */}
            <div className="p-4 border-t border-purple-100 bg-white">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyPress={e => e.key === 'Enter' && handleSend()}
                  placeholder={language === 'ar' ? 'اكتب سؤالك هنا...' : 'Type your question here...'}
                  className="flex-1 px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {language === 'ar' ? 'إرسال' : 'Send'}
                </button>
              </div>
            </div>
          </div>
        )}
        
        {activeTab === 'analysis' && report && (
          <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Overview Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: language === 'ar' ? 'الصفوف' : 'Rows', value: report.dataOverview.totalRows.toLocaleString(), icon: '📊', color: 'from-blue-500 to-blue-600' },
                { label: language === 'ar' ? 'الأعمدة' : 'Columns', value: report.dataOverview.totalColumns, icon: '📋', color: 'from-green-500 to-green-600' },
                { label: language === 'ar' ? 'المفقودة' : 'Missing', value: `${report.dataOverview.missingPercent.toFixed(1)}%`, icon: '❓', color: 'from-yellow-500 to-orange-500' },
                { label: language === 'ar' ? 'الجودة' : 'Quality', value: `${report.dataOverview.dataQualityScore.toFixed(0)}%`, icon: '✨', color: 'from-purple-500 to-indigo-600' }
              ].map((card, i) => (
                <div key={i} className={`bg-gradient-to-r ${card.color} text-white rounded-xl p-4`}>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">{card.icon}</span>
                    <span className="text-sm opacity-80">{card.label}</span>
                  </div>
                  <p className="text-2xl font-bold">{card.value}</p>
                </div>
              ))}
            </div>
            
            {/* Charts */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Data Types Distribution */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4">{language === 'ar' ? 'توزيع أنواع البيانات' : 'Data Types Distribution'}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: language === 'ar' ? 'رقمي' : 'Numeric', value: report.dataOverview.numericColumns },
                        { name: language === 'ar' ? 'فئوي' : 'Categorical', value: report.dataOverview.categoricalColumns }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                    >
                      {COLORS.slice(0, 2).map((color, index) => (
                        <Cell key={index} fill={color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              {/* Missing Values by Column */}
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4">{language === 'ar' ? 'القيم المفقودة حسب العمود' : 'Missing Values by Column'}</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={report.columnStats.filter(c => c.missing > 0).slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="missingPercent" fill="#667eea" name={language === 'ar' ? 'النسبة %' : 'Percentage %'} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            {/* Column Statistics Table */}
            <div className="bg-white rounded-xl p-6 shadow-sm overflow-x-auto">
              <h3 className="font-bold text-gray-700 mb-4">{language === 'ar' ? 'إحصائيات الأعمدة' : 'Column Statistics'}</h3>
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-purple-50">
                    <th className="px-4 py-3 text-right">{language === 'ar' ? 'العمود' : 'Column'}</th>
                    <th className="px-4 py-3">{language === 'ar' ? 'النوع' : 'Type'}</th>
                    <th className="px-4 py-3">{language === 'ar' ? 'العدد' : 'Count'}</th>
                    <th className="px-4 py-3">{language === 'ar' ? 'المفقودة' : 'Missing'}</th>
                    <th className="px-4 py-3">{language === 'ar' ? 'الفريدة' : 'Unique'}</th>
                    <th className="px-4 py-3">{language === 'ar' ? 'المتوسط/المنوال' : 'Mean/Mode'}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.columnStats.map((col, i) => (
                    <tr key={i} className={i % 2 ? 'bg-gray-50' : ''}>
                      <td className="px-4 py-3 font-medium">{col.name}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          col.type === 'numeric' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                        }`}>
                          {col.type === 'numeric' ? (language === 'ar' ? 'رقمي' : 'Numeric') : (language === 'ar' ? 'فئوي' : 'Categorical')}
                        </span>
                      </td>
                      <td className="px-4 py-3">{col.count - col.missing}</td>
                      <td className="px-4 py-3">
                        <span className={col.missingPercent > 20 ? 'text-red-600 font-medium' : ''}>
                          {col.missing} ({col.missingPercent.toFixed(1)}%)
                        </span>
                      </td>
                      <td className="px-4 py-3">{col.unique}</td>
                      <td className="px-4 py-3">
                        {col.type === 'numeric' ? col.mean?.toFixed(2) : col.mode}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {/* Insights */}
            {report.insights.length > 0 && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4">{language === 'ar' ? 'الرؤى المكتشفة' : 'Discovered Insights'}</h3>
                <div className="space-y-3">
                  {report.insights.map((insight, i) => (
                    <div key={i} className={`p-4 rounded-lg border-r-4 ${
                      insight.severity === 'high' ? 'bg-red-50 border-red-500' :
                      insight.severity === 'medium' ? 'bg-yellow-50 border-yellow-500' :
                      'bg-blue-50 border-blue-500'
                    }`}>
                      <div className="flex items-center gap-2">
                        <span>{insight.severity === 'high' ? '🔴' : insight.severity === 'medium' ? '🟡' : '🔵'}</span>
                        <span>{language === 'ar' ? insight.message : insight.messageEn}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
        
        {activeTab === 'reports' && (
          <div className="h-full overflow-y-auto p-6 space-y-6">
            {/* Create Report Section */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-2xl">📄</span>
                {language === 'ar' ? 'إنشاء تقرير جديد' : 'Create New Report'}
              </h3>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {language === 'ar' ? 'عنوان التقرير' : 'Report Title'}
                  </label>
                  <input
                    type="text"
                    value={reportConfig.title}
                    onChange={e => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'أدخل عنوان التقرير' : 'Enter report title'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">
                    {language === 'ar' ? 'اسم المؤلف' : 'Author Name'}
                  </label>
                  <input
                    type="text"
                    value={reportConfig.author}
                    onChange={e => setReportConfig(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                    placeholder={language === 'ar' ? 'أدخل اسم المؤلف' : 'Enter author name'}
                  />
                </div>
              </div>
              
              {/* Report Options */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { key: 'includeSummary', label: language === 'ar' ? 'الملخص' : 'Summary' },
                  { key: 'includeCharts', label: language === 'ar' ? 'الرسوم' : 'Charts' },
                  { key: 'includeRecommendations', label: language === 'ar' ? 'التوصيات' : 'Recommendations' },
                  { key: 'includeRawData', label: language === 'ar' ? 'البيانات الخام' : 'Raw Data' }
                ].map(option => (
                  <label key={option.key} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={reportConfig[option.key as keyof ReportConfig] as boolean}
                      onChange={e => setReportConfig(prev => ({ ...prev, [option.key]: e.target.checked }))}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500"
                    />
                    <span className="text-sm text-gray-600">{option.label}</span>
                  </label>
                ))}
              </div>
              
              {/* Export Buttons */}
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => handleSaveReport('html')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <span>🌐</span>
                  {language === 'ar' ? 'تصدير HTML' : 'Export HTML'}
                </button>
                <button
                  onClick={() => handleSaveReport('json')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <span>📋</span>
                  {language === 'ar' ? 'تصدير JSON' : 'Export JSON'}
                </button>
                <button
                  onClick={() => handleSaveReport('csv')}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <span>📊</span>
                  {language === 'ar' ? 'تصدير CSV' : 'Export CSV'}
                </button>
                <button
                  onClick={handlePrintReport}
                  className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 text-white rounded-lg hover:shadow-lg transition-all"
                >
                  <span>🖨️</span>
                  {language === 'ar' ? 'طباعة' : 'Print'}
                </button>
              </div>
            </div>
            
            {/* Saved Reports */}
            <div className="bg-white rounded-xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                <span className="text-2xl">📁</span>
                {language === 'ar' ? 'التقارير المحفوظة' : 'Saved Reports'}
              </h3>
              
              {savedReports.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <span className="text-4xl mb-2 block">📄</span>
                  {language === 'ar' ? 'لا توجد تقارير محفوظة بعد' : 'No saved reports yet'}
                </div>
              ) : (
                <div className="space-y-3">
                  {savedReports.map((saved, i) => (
                    <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium">{saved.name}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(saved.date).toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            if (reportGenerator.current) {
                              reportGenerator.current.downloadReport('html', saved.report);
                            }
                          }}
                          className="px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm hover:bg-purple-200"
                        >
                          {language === 'ar' ? 'تحميل' : 'Download'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            
            {/* Report Preview */}
            {report && (
              <div className="bg-white rounded-xl p-6 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
                  <span className="text-2xl">👁️</span>
                  {language === 'ar' ? 'معاينة التقرير' : 'Report Preview'}
                </h3>
                
                <div className="border border-gray-200 rounded-lg p-6 bg-gray-50 max-h-96 overflow-y-auto">
                  <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-purple-700">{reportConfig.title}</h2>
                    {reportConfig.author && <p className="text-gray-500">{reportConfig.author}</p>}
                    <p className="text-sm text-gray-400">{new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US')}</p>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="text-center p-4 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{report.dataOverview.totalRows}</p>
                      <p className="text-sm text-gray-500">{language === 'ar' ? 'صف' : 'Rows'}</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{report.dataOverview.totalColumns}</p>
                      <p className="text-sm text-gray-500">{language === 'ar' ? 'عمود' : 'Columns'}</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{report.dataOverview.missingPercent.toFixed(1)}%</p>
                      <p className="text-sm text-gray-500">{language === 'ar' ? 'مفقودة' : 'Missing'}</p>
                    </div>
                    <div className="text-center p-4 bg-white rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">{report.dataOverview.dataQualityScore.toFixed(0)}%</p>
                      <p className="text-sm text-gray-500">{language === 'ar' ? 'جودة' : 'Quality'}</p>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-500 text-center">
                    {language === 'ar' ? '... المزيد من المحتوى في التقرير الكامل' : '... more content in full report'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6">
            <h3 className="text-xl font-bold mb-4">{language === 'ar' ? 'إنشاء التقرير' : 'Create Report'}</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'عنوان التقرير' : 'Report Title'}</label>
                <input
                  type="text"
                  value={reportConfig.title}
                  onChange={e => setReportConfig(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">{language === 'ar' ? 'المؤلف' : 'Author'}</label>
                <input
                  type="text"
                  value={reportConfig.author}
                  onChange={e => setReportConfig(prev => ({ ...prev, author: e.target.value }))}
                  className="w-full px-4 py-2 border rounded-lg"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => handleSaveReport('html')}
                className="flex-1 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
              >
                HTML
              </button>
              <button
                onClick={() => handleSaveReport('json')}
                className="flex-1 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                JSON
              </button>
              <button
                onClick={() => setShowReportModal(false)}
                className="flex-1 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
              >
                {language === 'ar' ? 'إلغاء' : 'Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIAssistantWithReports;
