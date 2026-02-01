import React, { useState, useEffect } from 'react';
import { useLanguage } from '../i18n';
import {
  HelpCircle, Book, MessageCircle, Keyboard, Info, Mail, 
  ChevronDown, ChevronRight, Search, Play, CheckCircle,
  BarChart2, PieChart, TrendingUp, Database,
  FileText, Upload, Filter,
  Zap, Award, Users, Clock,
  BookOpen, Lightbulb,
  Copy, Check,
  Calculator
} from 'lucide-react';

interface HelpProps {
  language?: 'ar' | 'en';
  defaultTab?: string;
}

const Help: React.FC<HelpProps> = ({ defaultTab }) => {
  const { language } = useLanguage();
  const isRTL = language === 'ar';
  
  // Map defaultTab to internal tab names
  const getInitialTab = () => {
    if (defaultTab === 'contact') return 'contact';
    if (defaultTab === 'guide') return 'guide';
    if (defaultTab === 'faq') return 'faq';
    if (defaultTab === 'tutorials') return 'tutorials';
    if (defaultTab === 'shortcuts') return 'shortcuts';
    if (defaultTab === 'glossary') return 'glossary';
    if (defaultTab === 'about') return 'about';
    return 'guide';
  };
  
  const [activeTab, setActiveTab] = useState<'guide' | 'faq' | 'tutorials' | 'shortcuts' | 'glossary' | 'about' | 'contact'>(getInitialTab());
  const [searchQuery, setSearchQuery] = useState('');
  
  // Update activeTab when defaultTab changes
  useEffect(() => {
    if (defaultTab) {
      setActiveTab(getInitialTab());
    }
  }, [defaultTab]);
  const [expandedFAQ, setExpandedFAQ] = useState<number | null>(null);
  const [expandedGuide, setExpandedGuide] = useState<string | null>('getting-started');
  const [copiedShortcut, setCopiedShortcut] = useState<string | null>(null);
  const [contactForm, setContactForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle');

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    if (!contactForm.name || !contactForm.email || !contactForm.message) {
      alert(isRTL ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill in all required fields');
      return;
    }
    
    setSendingStatus('sending');
    
    try {
      // Use FormSubmit.co service to send email directly
      const response = await fetch('https://formsubmit.co/ajax/essam.fathi.sabbah@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          name: contactForm.name,
          email: contactForm.email,
          subject: contactForm.subject || (isRTL ? `رسالة دعم من ${contactForm.name}` : `Support Message from ${contactForm.name}`),
          message: contactForm.message,
          _subject: isRTL ? `رسالة جديدة من StatAnalytica - ${contactForm.name}` : `New message from StatAnalytica - ${contactForm.name}`,
          _template: 'table',
          _captcha: 'false'
        })
      });
      
      const result = await response.json();
      
      if (response.ok && result.success) {
        setSendingStatus('success');
        setContactForm({ name: '', email: '', subject: '', message: '' });
        
        // Reset status after 5 seconds
        setTimeout(() => setSendingStatus('idle'), 5000);
      } else {
        throw new Error('Failed to send');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      setSendingStatus('error');
      
      // Reset status after 5 seconds
      setTimeout(() => setSendingStatus('idle'), 5000);
    }
  };

  const tabs = [
    { id: 'guide', icon: Book, label: isRTL ? 'دليل المستخدم' : 'User Guide' },
    { id: 'faq', icon: MessageCircle, label: isRTL ? 'الأسئلة الشائعة' : 'FAQ' },
    { id: 'tutorials', icon: Play, label: isRTL ? 'الدروس التعليمية' : 'Tutorials' },
    { id: 'shortcuts', icon: Keyboard, label: isRTL ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts' },
    { id: 'glossary', icon: BookOpen, label: isRTL ? 'مسرد المصطلحات' : 'Glossary' },
    { id: 'about', icon: Info, label: isRTL ? 'حول البرنامج' : 'About' },
    { id: 'contact', icon: Mail, label: isRTL ? 'تواصل معنا' : 'Contact Us' },
  ];

  // User Guide Sections
  const guideSections = [
    {
      id: 'getting-started',
      icon: Zap,
      title: isRTL ? 'البدء السريع' : 'Getting Started',
      color: 'from-blue-500 to-cyan-500',
      content: [
        {
          title: isRTL ? 'مرحباً بك في StatAnalytica' : 'Welcome to StatAnalytica',
          description: isRTL 
            ? 'StatAnalytica هو برنامج تحليل إحصائي احترافي يساعدك على تحليل بياناتك واستخراج رؤى قيمة منها.'
            : 'StatAnalytica is a professional statistical analysis software that helps you analyze your data and extract valuable insights.'
        },
        {
          title: isRTL ? 'الخطوة 1: استيراد البيانات' : 'Step 1: Import Data',
          description: isRTL
            ? 'ابدأ باستيراد بياناتك من ملف CSV أو Excel أو JSON. يمكنك أيضاً الاتصال بقواعد البيانات أو المصادر السحابية.'
            : 'Start by importing your data from a CSV, Excel, or JSON file. You can also connect to databases or cloud sources.'
        },
        {
          title: isRTL ? 'الخطوة 2: تنظيف البيانات' : 'Step 2: Clean Data',
          description: isRTL
            ? 'استخدم أدوات التنظيف لمعالجة القيم المفقودة والقيم الشاذة والتكرارات.'
            : 'Use cleaning tools to handle missing values, outliers, and duplicates.'
        },
        {
          title: isRTL ? 'الخطوة 3: التحليل' : 'Step 3: Analyze',
          description: isRTL
            ? 'اختر نوع التحليل المناسب: وصفي، اختبارات إحصائية، أو تحليل متقدم.'
            : 'Choose the appropriate analysis type: descriptive, statistical tests, or advanced analysis.'
        },
        {
          title: isRTL ? 'الخطوة 4: التصور والتقارير' : 'Step 4: Visualize & Report',
          description: isRTL
            ? 'أنشئ رسوماً بيانية تفاعلية وقم بتصدير تقارير احترافية.'
            : 'Create interactive charts and export professional reports.'
        }
      ]
    },
    {
      id: 'data-import',
      icon: Upload,
      title: isRTL ? 'استيراد البيانات' : 'Data Import',
      color: 'from-green-500 to-emerald-500',
      content: [
        {
          title: isRTL ? 'الملفات المدعومة' : 'Supported Files',
          description: isRTL
            ? 'CSV, Excel (.xlsx, .xls), JSON, TXT, TSV, Parquet'
            : 'CSV, Excel (.xlsx, .xls), JSON, TXT, TSV, Parquet'
        },
        {
          title: isRTL ? 'قواعد البيانات' : 'Databases',
          description: isRTL
            ? 'PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, Oracle'
            : 'PostgreSQL, MySQL, SQLite, SQL Server, MongoDB, Oracle'
        },
        {
          title: isRTL ? 'المصادر السحابية' : 'Cloud Sources',
          description: isRTL
            ? 'Google BigQuery, AWS S3, Azure Blob Storage, Google Sheets'
            : 'Google BigQuery, AWS S3, Azure Blob Storage, Google Sheets'
        },
        {
          title: isRTL ? 'خيارات الاستيراد' : 'Import Options',
          description: isRTL
            ? 'تخصيص الفاصل، الترميز، تخطي الصفوف، وتحديد أنواع البيانات تلقائياً.'
            : 'Customize delimiter, encoding, skip rows, and auto-detect data types.'
        }
      ]
    },
    {
      id: 'data-cleaning',
      icon: Filter,
      title: isRTL ? 'تنظيف البيانات' : 'Data Cleaning',
      color: 'from-orange-500 to-amber-500',
      content: [
        {
          title: isRTL ? 'معالجة القيم المفقودة' : 'Handle Missing Values',
          description: isRTL
            ? 'حذف، تعويض بالمتوسط/الوسيط/المنوال، أو استخدام طرق متقدمة مثل KNN.'
            : 'Delete, impute with mean/median/mode, or use advanced methods like KNN.'
        },
        {
          title: isRTL ? 'كشف القيم الشاذة' : 'Detect Outliers',
          description: isRTL
            ? 'استخدام Z-Score، IQR، أو Isolation Forest لكشف ومعالجة القيم الشاذة.'
            : 'Use Z-Score, IQR, or Isolation Forest to detect and handle outliers.'
        },
        {
          title: isRTL ? 'التحويلات' : 'Transformations',
          description: isRTL
            ? 'Log، Box-Cox، التطبيع، التوحيد القياسي، وغيرها.'
            : 'Log, Box-Cox, Normalization, Standardization, and more.'
        },
        {
          title: isRTL ? 'معالجة النصوص' : 'Text Processing',
          description: isRTL
            ? 'إزالة المسافات، تغيير الحالة، استخراج الأنماط، ودمج الأعمدة.'
            : 'Remove spaces, change case, extract patterns, and merge columns.'
        }
      ]
    },
    {
      id: 'descriptive-analysis',
      icon: BarChart2,
      title: isRTL ? 'التحليل الوصفي' : 'Descriptive Analysis',
      color: 'from-purple-500 to-violet-500',
      content: [
        {
          title: isRTL ? 'مقاييس النزعة المركزية' : 'Central Tendency',
          description: isRTL
            ? 'المتوسط الحسابي، الوسيط، المنوال'
            : 'Mean, Median, Mode'
        },
        {
          title: isRTL ? 'مقاييس التشتت' : 'Dispersion Measures',
          description: isRTL
            ? 'الانحراف المعياري، التباين، المدى، المدى الربيعي'
            : 'Standard Deviation, Variance, Range, Interquartile Range'
        },
        {
          title: isRTL ? 'مقاييس الشكل' : 'Shape Measures',
          description: isRTL
            ? 'الالتواء (Skewness)، التفرطح (Kurtosis)'
            : 'Skewness, Kurtosis'
        },
        {
          title: isRTL ? 'الارتباط' : 'Correlation',
          description: isRTL
            ? 'مصفوفة الارتباط، Pearson، Spearman'
            : 'Correlation Matrix, Pearson, Spearman'
        }
      ]
    },
    {
      id: 'statistical-tests',
      icon: Calculator,
      title: isRTL ? 'الاختبارات الإحصائية' : 'Statistical Tests',
      color: 'from-red-500 to-rose-500',
      content: [
        {
          title: isRTL ? 'اختبارات المعلمية' : 'Parametric Tests',
          description: isRTL
            ? 'T-Test (عينة واحدة، مستقلة، مزدوجة)، ANOVA، Welch'
            : 'T-Test (One-sample, Independent, Paired), ANOVA, Welch'
        },
        {
          title: isRTL ? 'اختبارات لامعلمية' : 'Non-parametric Tests',
          description: isRTL
            ? 'Mann-Whitney، Wilcoxon، Kruskal-Wallis، Friedman'
            : 'Mann-Whitney, Wilcoxon, Kruskal-Wallis, Friedman'
        },
        {
          title: isRTL ? 'اختبارات التوزيع' : 'Normality Tests',
          description: isRTL
            ? 'Shapiro-Wilk، Kolmogorov-Smirnov، Anderson-Darling'
            : 'Shapiro-Wilk, Kolmogorov-Smirnov, Anderson-Darling'
        },
        {
          title: isRTL ? 'اختبارات الارتباط' : 'Correlation Tests',
          description: isRTL
            ? 'Pearson، Spearman، Kendall، Point-Biserial'
            : 'Pearson, Spearman, Kendall, Point-Biserial'
        }
      ]
    },
    {
      id: 'advanced-analysis',
      icon: TrendingUp,
      title: isRTL ? 'التحليل المتقدم' : 'Advanced Analysis',
      color: 'from-indigo-500 to-blue-500',
      content: [
        {
          title: isRTL ? 'تحليل الانحدار' : 'Regression Analysis',
          description: isRTL
            ? 'الانحدار الخطي البسيط والمتعدد، اللوجستي، متعدد الحدود'
            : 'Simple and Multiple Linear Regression, Logistic, Polynomial'
        },
        {
          title: isRTL ? 'تحليل المكونات الرئيسية' : 'PCA',
          description: isRTL
            ? 'تقليل الأبعاد واستخراج المكونات الرئيسية'
            : 'Dimensionality reduction and principal component extraction'
        },
        {
          title: isRTL ? 'التحليل العنقودي' : 'Clustering',
          description: isRTL
            ? 'K-Means، Hierarchical، DBSCAN'
            : 'K-Means, Hierarchical, DBSCAN'
        },
        {
          title: isRTL ? 'السلاسل الزمنية' : 'Time Series',
          description: isRTL
            ? 'المتوسط المتحرك، التنعيم الأسي، الاستقرارية'
            : 'Moving Average, Exponential Smoothing, Stationarity'
        }
      ]
    },
    {
      id: 'visualization',
      icon: PieChart,
      title: isRTL ? 'التصور البصري' : 'Visualization',
      color: 'from-pink-500 to-rose-500',
      content: [
        {
          title: isRTL ? 'الرسوم البيانية الأساسية' : 'Basic Charts',
          description: isRTL
            ? 'أعمدة، خطي، دائري، تشتت، مساحي'
            : 'Bar, Line, Pie, Scatter, Area'
        },
        {
          title: isRTL ? 'الرسوم الإحصائية' : 'Statistical Charts',
          description: isRTL
            ? 'المدرج التكراري، الصندوق البياني، خريطة الحرارة'
            : 'Histogram, Box Plot, Heatmap'
        },
        {
          title: isRTL ? 'التخصيص' : 'Customization',
          description: isRTL
            ? 'الألوان، المحاور، العناوين، وسيلة الإيضاح'
            : 'Colors, Axes, Titles, Legend'
        },
        {
          title: isRTL ? 'التصدير' : 'Export',
          description: isRTL
            ? 'PNG، SVG، PDF'
            : 'PNG, SVG, PDF'
        }
      ]
    },
    {
      id: 'reports',
      icon: FileText,
      title: isRTL ? 'التقارير' : 'Reports',
      color: 'from-teal-500 to-cyan-500',
      content: [
        {
          title: isRTL ? 'أنواع التقارير' : 'Report Types',
          description: isRTL
            ? 'تقرير وصفي، تقرير اختبارات، تقرير شامل'
            : 'Descriptive Report, Tests Report, Comprehensive Report'
        },
        {
          title: isRTL ? 'التخصيص' : 'Customization',
          description: isRTL
            ? 'اختيار الأقسام، إضافة الرسوم، تخصيص المظهر'
            : 'Select sections, add charts, customize appearance'
        },
        {
          title: isRTL ? 'التصدير' : 'Export',
          description: isRTL
            ? 'HTML، PDF، Word'
            : 'HTML, PDF, Word'
        }
      ]
    }
  ];

  // FAQ Data
  const faqData = [
    {
      category: isRTL ? 'عام' : 'General',
      icon: HelpCircle,
      questions: [
        {
          q: isRTL ? 'ما هو StatAnalytica؟' : 'What is StatAnalytica?',
          a: isRTL 
            ? 'StatAnalytica هو برنامج تحليل إحصائي احترافي مصمم للباحثين ومحللي البيانات. يوفر أدوات شاملة لاستيراد البيانات، تنظيفها، تحليلها إحصائياً، وتصورها بيانياً.'
            : 'StatAnalytica is a professional statistical analysis software designed for researchers and data analysts. It provides comprehensive tools for importing, cleaning, analyzing, and visualizing data.'
        },
        {
          q: isRTL ? 'هل البرنامج مجاني؟' : 'Is the software free?',
          a: isRTL
            ? 'نعم، StatAnalytica مفتوح المصدر ومجاني للاستخدام الشخصي والتجاري.'
            : 'Yes, StatAnalytica is open-source and free for personal and commercial use.'
        },
        {
          q: isRTL ? 'ما هي اللغات المدعومة؟' : 'What languages are supported?',
          a: isRTL
            ? 'يدعم البرنامج حالياً اللغة العربية والإنجليزية مع إمكانية التبديل بينهما بسهولة.'
            : 'The software currently supports Arabic and English with easy switching between them.'
        }
      ]
    },
    {
      category: isRTL ? 'البيانات' : 'Data',
      icon: Database,
      questions: [
        {
          q: isRTL ? 'ما هي صيغ الملفات المدعومة؟' : 'What file formats are supported?',
          a: isRTL
            ? 'CSV، Excel (.xlsx, .xls)، JSON، TXT، TSV، Parquet. بالإضافة إلى الاتصال بقواعد البيانات والمصادر السحابية.'
            : 'CSV, Excel (.xlsx, .xls), JSON, TXT, TSV, Parquet. Plus connection to databases and cloud sources.'
        },
        {
          q: isRTL ? 'كيف أتعامل مع القيم المفقودة؟' : 'How do I handle missing values?',
          a: isRTL
            ? 'اذهب إلى تبويب "تنظيف البيانات" واختر "القيم المفقودة". يمكنك الحذف أو التعويض بالمتوسط/الوسيط/المنوال أو استخدام طرق متقدمة مثل KNN.'
            : 'Go to "Data Cleaning" tab and select "Missing Values". You can delete, impute with mean/median/mode, or use advanced methods like KNN.'
        },
        {
          q: isRTL ? 'ما هو الحد الأقصى لحجم البيانات؟' : 'What is the maximum data size?',
          a: isRTL
            ? 'يعتمد على ذاكرة المتصفح، لكن يمكنه التعامل بكفاءة مع مئات الآلاف من الصفوف.'
            : 'It depends on browser memory, but it can efficiently handle hundreds of thousands of rows.'
        }
      ]
    },
    {
      category: isRTL ? 'التحليل' : 'Analysis',
      icon: BarChart2,
      questions: [
        {
          q: isRTL ? 'كيف أختار الاختبار الإحصائي المناسب؟' : 'How do I choose the right statistical test?',
          a: isRTL
            ? 'استخدم "المستشار الإحصائي الذكي" الذي يحلل بياناتك ويقترح الاختبارات المناسبة بناءً على نوع البيانات والأهداف.'
            : 'Use the "Smart Statistical Advisor" which analyzes your data and suggests appropriate tests based on data type and goals.'
        },
        {
          q: isRTL ? 'ما الفرق بين الاختبارات المعلمية واللامعلمية؟' : 'What is the difference between parametric and non-parametric tests?',
          a: isRTL
            ? 'الاختبارات المعلمية (مثل T-Test) تفترض توزيعاً طبيعياً للبيانات، بينما اللامعلمية (مثل Mann-Whitney) لا تفترض ذلك وتستخدم عندما لا تتحقق افتراضات التوزيع الطبيعي.'
            : 'Parametric tests (like T-Test) assume normal distribution, while non-parametric (like Mann-Whitney) do not and are used when normality assumptions are not met.'
        },
        {
          q: isRTL ? 'كيف أفسر قيمة p-value؟' : 'How do I interpret p-value?',
          a: isRTL
            ? 'إذا كانت p-value < 0.05، فالنتيجة دالة إحصائياً (نرفض الفرضية الصفرية). إذا كانت ≥ 0.05، فالنتيجة غير دالة (نقبل الفرضية الصفرية).'
            : 'If p-value < 0.05, the result is statistically significant (reject null hypothesis). If ≥ 0.05, the result is not significant (accept null hypothesis).'
        }
      ]
    },
    {
      category: isRTL ? 'التقارير' : 'Reports',
      icon: FileText,
      questions: [
        {
          q: isRTL ? 'كيف أنشئ تقريراً؟' : 'How do I create a report?',
          a: isRTL
            ? 'اذهب إلى تبويب "التقارير"، اختر الأقسام المطلوبة، خصص العنوان والمؤلف، ثم اختر صيغة التصدير (HTML أو PDF).'
            : 'Go to "Reports" tab, select required sections, customize title and author, then choose export format (HTML or PDF).'
        },
        {
          q: isRTL ? 'لماذا تظهر رموز غريبة في PDF؟' : 'Why do strange characters appear in PDF?',
          a: isRTL
            ? 'استخدم زر PDF ثم اختر "حفظ كـ PDF" من نافذة الطباعة لضمان دعم الخطوط العربية بشكل صحيح.'
            : 'Use the PDF button then choose "Save as PDF" from the print dialog to ensure proper Arabic font support.'
        }
      ]
    }
  ];

  // Tutorials Data
  const tutorials = [
    {
      id: 1,
      title: isRTL ? 'البدء مع StatAnalytica' : 'Getting Started with StatAnalytica',
      description: isRTL ? 'تعلم أساسيات استخدام البرنامج' : 'Learn the basics of using the software',
      duration: isRTL ? '10 دقائق' : '10 minutes',
      level: isRTL ? 'مبتدئ' : 'Beginner',
      icon: Zap,
      color: 'from-green-500 to-emerald-500',
      steps: [
        isRTL ? 'فتح البرنامج' : 'Open the software',
        isRTL ? 'استيراد ملف بيانات' : 'Import a data file',
        isRTL ? 'استعراض البيانات' : 'Browse the data',
        isRTL ? 'إجراء تحليل بسيط' : 'Perform a simple analysis'
      ]
    },
    {
      id: 2,
      title: isRTL ? 'تنظيف البيانات' : 'Data Cleaning',
      description: isRTL ? 'تعلم كيفية تنظيف ومعالجة بياناتك' : 'Learn how to clean and process your data',
      duration: isRTL ? '15 دقيقة' : '15 minutes',
      level: isRTL ? 'مبتدئ' : 'Beginner',
      icon: Filter,
      color: 'from-orange-500 to-amber-500',
      steps: [
        isRTL ? 'تحديد القيم المفقودة' : 'Identify missing values',
        isRTL ? 'اختيار طريقة المعالجة' : 'Choose processing method',
        isRTL ? 'كشف القيم الشاذة' : 'Detect outliers',
        isRTL ? 'تطبيق التحويلات' : 'Apply transformations'
      ]
    },
    {
      id: 3,
      title: isRTL ? 'التحليل الوصفي' : 'Descriptive Analysis',
      description: isRTL ? 'فهم بياناتك من خلال الإحصاءات الوصفية' : 'Understand your data through descriptive statistics',
      duration: isRTL ? '12 دقيقة' : '12 minutes',
      level: isRTL ? 'مبتدئ' : 'Beginner',
      icon: BarChart2,
      color: 'from-blue-500 to-cyan-500',
      steps: [
        isRTL ? 'عرض الإحصاءات الأساسية' : 'View basic statistics',
        isRTL ? 'فهم التوزيعات' : 'Understand distributions',
        isRTL ? 'تحليل الارتباطات' : 'Analyze correlations',
        isRTL ? 'إنشاء الرسوم البيانية' : 'Create charts'
      ]
    },
    {
      id: 4,
      title: isRTL ? 'الاختبارات الإحصائية' : 'Statistical Tests',
      description: isRTL ? 'تعلم اختيار وتنفيذ الاختبارات الإحصائية' : 'Learn to select and perform statistical tests',
      duration: isRTL ? '20 دقيقة' : '20 minutes',
      level: isRTL ? 'متوسط' : 'Intermediate',
      icon: Calculator,
      color: 'from-purple-500 to-violet-500',
      steps: [
        isRTL ? 'فهم أنواع الاختبارات' : 'Understand test types',
        isRTL ? 'استخدام المستشار الذكي' : 'Use the smart advisor',
        isRTL ? 'تنفيذ الاختبار' : 'Execute the test',
        isRTL ? 'تفسير النتائج' : 'Interpret results'
      ]
    },
    {
      id: 5,
      title: isRTL ? 'التحليل المتقدم' : 'Advanced Analysis',
      description: isRTL ? 'تقنيات التحليل المتقدمة مثل الانحدار و PCA' : 'Advanced analysis techniques like regression and PCA',
      duration: isRTL ? '25 دقيقة' : '25 minutes',
      level: isRTL ? 'متقدم' : 'Advanced',
      icon: TrendingUp,
      color: 'from-red-500 to-rose-500',
      steps: [
        isRTL ? 'تحليل الانحدار' : 'Regression analysis',
        isRTL ? 'تحليل المكونات الرئيسية' : 'Principal Component Analysis',
        isRTL ? 'التحليل العنقودي' : 'Cluster analysis',
        isRTL ? 'تحليل السلاسل الزمنية' : 'Time series analysis'
      ]
    },
    {
      id: 6,
      title: isRTL ? 'إنشاء التقارير' : 'Creating Reports',
      description: isRTL ? 'تعلم إنشاء تقارير احترافية' : 'Learn to create professional reports',
      duration: isRTL ? '10 دقائق' : '10 minutes',
      level: isRTL ? 'مبتدئ' : 'Beginner',
      icon: FileText,
      color: 'from-teal-500 to-cyan-500',
      steps: [
        isRTL ? 'اختيار محتوى التقرير' : 'Select report content',
        isRTL ? 'تخصيص المظهر' : 'Customize appearance',
        isRTL ? 'معاينة التقرير' : 'Preview report',
        isRTL ? 'التصدير' : 'Export'
      ]
    }
  ];

  // Keyboard Shortcuts
  const shortcuts = [
    {
      category: isRTL ? 'عام' : 'General',
      items: [
        { keys: ['Ctrl', 'S'], action: isRTL ? 'حفظ' : 'Save' },
        { keys: ['Ctrl', 'Z'], action: isRTL ? 'تراجع' : 'Undo' },
        { keys: ['Ctrl', 'Y'], action: isRTL ? 'إعادة' : 'Redo' },
        { keys: ['Ctrl', 'O'], action: isRTL ? 'فتح ملف' : 'Open file' },
        { keys: ['Ctrl', 'N'], action: isRTL ? 'مشروع جديد' : 'New project' },
        { keys: ['F1'], action: isRTL ? 'المساعدة' : 'Help' },
        { keys: ['F11'], action: isRTL ? 'ملء الشاشة' : 'Fullscreen' }
      ]
    },
    {
      category: isRTL ? 'البيانات' : 'Data',
      items: [
        { keys: ['Ctrl', 'I'], action: isRTL ? 'استيراد بيانات' : 'Import data' },
        { keys: ['Ctrl', 'E'], action: isRTL ? 'تصدير بيانات' : 'Export data' },
        { keys: ['Ctrl', 'F'], action: isRTL ? 'بحث' : 'Search' },
        { keys: ['Ctrl', 'H'], action: isRTL ? 'استبدال' : 'Replace' },
        { keys: ['Delete'], action: isRTL ? 'حذف محدد' : 'Delete selected' }
      ]
    },
    {
      category: isRTL ? 'التحليل' : 'Analysis',
      items: [
        { keys: ['Ctrl', 'D'], action: isRTL ? 'تحليل وصفي' : 'Descriptive analysis' },
        { keys: ['Ctrl', 'T'], action: isRTL ? 'اختبار إحصائي' : 'Statistical test' },
        { keys: ['Ctrl', 'R'], action: isRTL ? 'تشغيل التحليل' : 'Run analysis' },
        { keys: ['Ctrl', 'G'], action: isRTL ? 'إنشاء رسم' : 'Create chart' }
      ]
    },
    {
      category: isRTL ? 'التنقل' : 'Navigation',
      items: [
        { keys: ['Alt', '1'], action: isRTL ? 'الرئيسية' : 'Home' },
        { keys: ['Alt', '2'], action: isRTL ? 'استيراد البيانات' : 'Data Import' },
        { keys: ['Alt', '3'], action: isRTL ? 'تنظيف البيانات' : 'Data Cleaning' },
        { keys: ['Alt', '4'], action: isRTL ? 'التحليل الوصفي' : 'Descriptive Analysis' },
        { keys: ['Alt', '5'], action: isRTL ? 'الاختبارات' : 'Tests' },
        { keys: ['Ctrl', ','], action: isRTL ? 'الإعدادات' : 'Settings' }
      ]
    }
  ];

  // Glossary Data
  const glossary = [
    { term: isRTL ? 'المتوسط الحسابي' : 'Mean', definition: isRTL ? 'مجموع القيم مقسوماً على عددها. يمثل القيمة المركزية للبيانات.' : 'Sum of values divided by their count. Represents the central value of data.' },
    { term: isRTL ? 'الوسيط' : 'Median', definition: isRTL ? 'القيمة الوسطى عند ترتيب البيانات تصاعدياً. أقل تأثراً بالقيم الشاذة.' : 'Middle value when data is sorted. Less affected by outliers.' },
    { term: isRTL ? 'المنوال' : 'Mode', definition: isRTL ? 'القيمة الأكثر تكراراً في مجموعة البيانات.' : 'Most frequently occurring value in a dataset.' },
    { term: isRTL ? 'الانحراف المعياري' : 'Standard Deviation', definition: isRTL ? 'مقياس لمدى انتشار البيانات حول المتوسط.' : 'Measure of data spread around the mean.' },
    { term: isRTL ? 'التباين' : 'Variance', definition: isRTL ? 'مربع الانحراف المعياري. يقيس تشتت البيانات.' : 'Square of standard deviation. Measures data dispersion.' },
    { term: isRTL ? 'الالتواء' : 'Skewness', definition: isRTL ? 'مقياس لعدم تماثل التوزيع. موجب = ذيل يميني، سالب = ذيل يساري.' : 'Measure of distribution asymmetry. Positive = right tail, negative = left tail.' },
    { term: isRTL ? 'التفرطح' : 'Kurtosis', definition: isRTL ? 'مقياس لحدة قمة التوزيع مقارنة بالتوزيع الطبيعي.' : 'Measure of peak sharpness compared to normal distribution.' },
    { term: isRTL ? 'الارتباط' : 'Correlation', definition: isRTL ? 'مقياس للعلاقة الخطية بين متغيرين (-1 إلى +1).' : 'Measure of linear relationship between two variables (-1 to +1).' },
    { term: isRTL ? 'p-value' : 'P-value', definition: isRTL ? 'احتمال الحصول على النتيجة الملاحظة إذا كانت الفرضية الصفرية صحيحة.' : 'Probability of obtaining the observed result if null hypothesis is true.' },
    { term: isRTL ? 'حجم الأثر' : 'Effect Size', definition: isRTL ? 'مقياس لحجم الفرق أو العلاقة. مستقل عن حجم العينة.' : 'Measure of difference or relationship magnitude. Independent of sample size.' },
    { term: isRTL ? 'فترة الثقة' : 'Confidence Interval', definition: isRTL ? 'نطاق من القيم المحتمل أن يحتوي على القيمة الحقيقية للمعلمة.' : 'Range of values likely to contain the true parameter value.' },
    { term: isRTL ? 'الفرضية الصفرية' : 'Null Hypothesis', definition: isRTL ? 'افتراض عدم وجود فرق أو علاقة. نحاول رفضها في الاختبار.' : 'Assumption of no difference or relationship. We try to reject it in testing.' },
    { term: isRTL ? 'درجات الحرية' : 'Degrees of Freedom', definition: isRTL ? 'عدد القيم الحرة في الحساب الإحصائي.' : 'Number of free values in statistical calculation.' },
    { term: isRTL ? 'التوزيع الطبيعي' : 'Normal Distribution', definition: isRTL ? 'توزيع متماثل على شكل جرس. كثير من الظواهر الطبيعية تتبعه.' : 'Symmetrical bell-shaped distribution. Many natural phenomena follow it.' },
    { term: isRTL ? 'القيم الشاذة' : 'Outliers', definition: isRTL ? 'قيم بعيدة جداً عن باقي البيانات. قد تؤثر على التحليل.' : 'Values far from other data. May affect analysis.' }
  ];

  // Filter based on search
  const filteredGlossary = glossary.filter(item => 
    item.term.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.definition.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const copyShortcut = (keys: string[]) => {
    navigator.clipboard.writeText(keys.join(' + '));
    setCopiedShortcut(keys.join('+'));
    setTimeout(() => setCopiedShortcut(null), 2000);
  };

  return (
    <div className={`p-6 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg">
            <HelpCircle className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-800">
              {isRTL ? 'مركز المساعدة' : 'Help Center'}
            </h1>
            <p className="text-gray-500">
              {isRTL ? 'كل ما تحتاجه لاستخدام StatAnalytica بكفاءة' : 'Everything you need to use StatAnalytica efficiently'}
            </p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <div className="relative max-w-2xl">
          <Search className={`absolute top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 ${isRTL ? 'right-4' : 'left-4'}`} />
          <input
            type="text"
            placeholder={isRTL ? 'ابحث في المساعدة...' : 'Search help...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm ${isRTL ? 'pr-12 pl-4' : 'pl-12 pr-4'}`}
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6 bg-white p-2 rounded-xl shadow-sm">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="bg-white rounded-2xl shadow-lg p-6">
        {/* User Guide */}
        {activeTab === 'guide' && (
          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Book className="w-6 h-6 text-blue-600" />
              {isRTL ? 'دليل المستخدم الشامل' : 'Comprehensive User Guide'}
            </h2>
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Sidebar */}
              <div className="lg:col-span-1 space-y-2">
                {guideSections.map((section) => (
                  <button
                    key={section.id}
                    onClick={() => setExpandedGuide(section.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left ${
                      expandedGuide === section.id
                        ? `bg-gradient-to-r ${section.color} text-white shadow-md`
                        : 'bg-gray-50 hover:bg-gray-100 text-gray-700'
                    }`}
                  >
                    <section.icon className="w-5 h-5" />
                    <span className="font-medium text-sm">{section.title}</span>
                  </button>
                ))}
              </div>
              
              {/* Content */}
              <div className="lg:col-span-3">
                {guideSections.filter(s => s.id === expandedGuide).map((section) => (
                  <div key={section.id} className="space-y-4">
                    <div className={`p-4 rounded-xl bg-gradient-to-r ${section.color} text-white`}>
                      <div className="flex items-center gap-3">
                        <section.icon className="w-8 h-8" />
                        <h3 className="text-xl font-bold">{section.title}</h3>
                      </div>
                    </div>
                    
                    <div className="grid gap-4">
                      {section.content.map((item, idx) => (
                        <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                          <div className="flex items-start gap-3">
                            <div className={`w-8 h-8 rounded-full bg-gradient-to-r ${section.color} text-white flex items-center justify-center text-sm font-bold flex-shrink-0`}>
                              {idx + 1}
                            </div>
                            <div>
                              <h4 className="font-semibold text-gray-800 mb-1">{item.title}</h4>
                              <p className="text-gray-600 text-sm leading-relaxed">{item.description}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* FAQ */}
        {activeTab === 'faq' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <MessageCircle className="w-6 h-6 text-purple-600" />
              {isRTL ? 'الأسئلة الشائعة' : 'Frequently Asked Questions'}
            </h2>
            
            {faqData.map((category, catIdx) => (
              <div key={catIdx} className="space-y-3">
                <div className="flex items-center gap-2 text-gray-700 font-semibold">
                  <category.icon className="w-5 h-5 text-blue-600" />
                  {category.category}
                </div>
                
                <div className="space-y-2">
                  {category.questions.map((faq, faqIdx) => {
                    const globalIdx = catIdx * 100 + faqIdx;
                    return (
                      <div key={faqIdx} className="border border-gray-200 rounded-xl overflow-hidden">
                        <button
                          onClick={() => setExpandedFAQ(expandedFAQ === globalIdx ? null : globalIdx)}
                          className="w-full flex items-center justify-between p-4 text-left bg-gray-50 hover:bg-gray-100 transition-colors"
                        >
                          <span className="font-medium text-gray-800">{faq.q}</span>
                          {expandedFAQ === globalIdx ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                        </button>
                        {expandedFAQ === globalIdx && (
                          <div className="p-4 bg-white border-t border-gray-100">
                            <p className="text-gray-600 leading-relaxed">{faq.a}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tutorials */}
        {activeTab === 'tutorials' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Play className="w-6 h-6 text-green-600" />
              {isRTL ? 'الدروس التعليمية' : 'Tutorials'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tutorials.map((tutorial) => (
                <div key={tutorial.id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden hover:shadow-lg transition-shadow">
                  <div className={`p-6 bg-gradient-to-r ${tutorial.color} text-white`}>
                    <div className="flex items-center justify-between mb-4">
                      <tutorial.icon className="w-10 h-10" />
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        tutorial.level === (isRTL ? 'مبتدئ' : 'Beginner') ? 'bg-green-400/30' :
                        tutorial.level === (isRTL ? 'متوسط' : 'Intermediate') ? 'bg-yellow-400/30' :
                        'bg-red-400/30'
                      }`}>
                        {tutorial.level}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold mb-2">{tutorial.title}</h3>
                    <p className="text-sm opacity-90">{tutorial.description}</p>
                  </div>
                  
                  <div className="p-4">
                    <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                      <Clock className="w-4 h-4" />
                      {tutorial.duration}
                    </div>
                    
                    <div className="space-y-2">
                      {tutorial.steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                          <div className={`w-5 h-5 rounded-full bg-gradient-to-r ${tutorial.color} text-white flex items-center justify-center text-xs`}>
                            {idx + 1}
                          </div>
                          {step}
                        </div>
                      ))}
                    </div>
                    
                    <button className={`w-full mt-4 py-2 rounded-lg bg-gradient-to-r ${tutorial.color} text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2`}>
                      <Play className="w-4 h-4" />
                      {isRTL ? 'ابدأ الدرس' : 'Start Tutorial'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Keyboard Shortcuts */}
        {activeTab === 'shortcuts' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Keyboard className="w-6 h-6 text-indigo-600" />
              {isRTL ? 'اختصارات لوحة المفاتيح' : 'Keyboard Shortcuts'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {shortcuts.map((category, catIdx) => (
                <div key={catIdx} className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-700 mb-3">{category.category}</h3>
                  <div className="space-y-2">
                    {category.items.map((shortcut, idx) => (
                      <div 
                        key={idx} 
                        className="flex items-center justify-between p-2 bg-white rounded-lg hover:shadow-sm transition-shadow cursor-pointer"
                        onClick={() => copyShortcut(shortcut.keys)}
                      >
                        <span className="text-gray-600 text-sm">{shortcut.action}</span>
                        <div className="flex items-center gap-1">
                          {shortcut.keys.map((key, keyIdx) => (
                            <React.Fragment key={keyIdx}>
                              <kbd className="px-2 py-1 bg-gray-100 border border-gray-300 rounded text-xs font-mono text-gray-700">
                                {key}
                              </kbd>
                              {keyIdx < shortcut.keys.length - 1 && (
                                <span className="text-gray-400 text-xs">+</span>
                              )}
                            </React.Fragment>
                          ))}
                          {copiedShortcut === shortcut.keys.join('+') ? (
                            <Check className="w-4 h-4 text-green-500 ml-2" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400 ml-2 opacity-0 group-hover:opacity-100" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Glossary */}
        {activeTab === 'glossary' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-teal-600" />
              {isRTL ? 'مسرد المصطلحات الإحصائية' : 'Statistical Glossary'}
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredGlossary.map((item, idx) => (
                <div key={idx} className="p-4 bg-gray-50 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                  <h4 className="font-semibold text-blue-700 mb-2">{item.term}</h4>
                  <p className="text-gray-600 text-sm leading-relaxed">{item.definition}</p>
                </div>
              ))}
            </div>
            
            {filteredGlossary.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{isRTL ? 'لم يتم العثور على نتائج' : 'No results found'}</p>
              </div>
            )}
          </div>
        )}

        {/* About */}
        {activeTab === 'about' && (
          <div className="space-y-6">
            <div className="text-center py-8">
              <div className="inline-flex p-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl shadow-lg mb-4">
                <BarChart2 className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-800 mb-2">StatAnalytica</h2>
              <p className="text-gray-500 mb-2">{isRTL ? 'الإصدار 2.0.0' : 'Version 2.0.0'}</p>
              <p className="text-gray-600 max-w-2xl mx-auto">
                {isRTL 
                  ? 'برنامج تحليل إحصائي احترافي مصمم للباحثين ومحللي البيانات. يوفر أدوات شاملة لاستيراد البيانات، تنظيفها، تحليلها، وتصورها.'
                  : 'Professional statistical analysis software designed for researchers and data analysts. Provides comprehensive tools for importing, cleaning, analyzing, and visualizing data.'}
              </p>
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Users, label: isRTL ? 'المستخدمون' : 'Users', value: '10,000+' },
                { icon: BarChart2, label: isRTL ? 'الاختبارات' : 'Tests', value: '40+' },
                { icon: MessageCircle, label: isRTL ? 'اللغات' : 'Languages', value: '2' },
                { icon: Award, label: isRTL ? 'التقييم' : 'Rating', value: '4.9/5' }
              ].map((stat, idx) => (
                <div key={idx} className="p-4 bg-gradient-to-br from-blue-50 to-purple-50 rounded-xl text-center">
                  <stat.icon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <div className="text-2xl font-bold text-gray-800">{stat.value}</div>
                  <div className="text-sm text-gray-500">{stat.label}</div>
                </div>
              ))}
            </div>
            
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">{isRTL ? 'المميزات الرئيسية' : 'Key Features'}</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  isRTL ? 'استيراد متعدد المصادر' : 'Multi-source Import',
                  isRTL ? 'تنظيف ذكي للبيانات' : 'Smart Data Cleaning',
                  isRTL ? 'أكثر من 40 اختبار إحصائي' : '40+ Statistical Tests',
                  isRTL ? 'تحليل متقدم (انحدار، PCA)' : 'Advanced Analysis (Regression, PCA)',
                  isRTL ? 'رسوم بيانية تفاعلية' : 'Interactive Charts',
                  isRTL ? 'تقارير احترافية' : 'Professional Reports',
                  isRTL ? 'مستشار إحصائي ذكي' : 'Smart Statistical Advisor',
                  isRTL ? 'دعم العربية والإنجليزية' : 'Arabic & English Support'
                ].map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-gray-600">
                    <CheckCircle className="w-5 h-5 text-green-500" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
            
            <div className="text-center text-gray-500 text-sm space-y-2">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full">
                <Award className="w-5 h-5 text-blue-600" />
                <span className="font-semibold text-gray-700">
                  {isRTL ? 'تم التطوير بواسطة' : 'Developed by'} <span className="text-blue-600">Essam Sabbah</span>
                </span>
              </div>
              <p>© 2024 StatAnalytica. {isRTL ? 'جميع الحقوق محفوظة.' : 'All rights reserved.'}</p>
              <p>{isRTL ? 'مفتوح المصدر بموجب رخصة MIT' : 'Open source under MIT License'}</p>
            </div>
          </div>
        )}

        {/* Contact */}
        {activeTab === 'contact' && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Mail className="w-6 h-6 text-pink-600" />
              {isRTL ? 'تواصل معنا' : 'Contact Us'}
            </h2>
            
            <div className="flex justify-center">
              <div className="p-8 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl text-white text-center max-w-md w-full shadow-xl">
                <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Mail className="w-10 h-10" />
                </div>
                <h3 className="font-bold text-xl mb-2">{isRTL ? 'البريد الإلكتروني' : 'Email'}</h3>
                <a 
                  href="mailto:essam.fathi.sabbah@gmail.com" 
                  className="text-lg hover:underline block mb-3"
                >
                  essam.fathi.sabbah@gmail.com
                </a>
                <p className="text-sm opacity-80">
                  {isRTL 
                    ? 'سنرد على رسالتك في أقرب وقت ممكن' 
                    : 'We will respond to your message as soon as possible'}
                </p>
              </div>
            </div>
            
            {/* Success/Error Notification */}
            {sendingStatus === 'success' && (
              <div className="bg-green-100 border border-green-400 rounded-xl p-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800">
                    {isRTL ? 'تم إرسال الرسالة بنجاح! ✓' : 'Message sent successfully! ✓'}
                  </h4>
                  <p className="text-green-700 text-sm">
                    {isRTL ? 'سنرد عليك في أقرب وقت ممكن' : 'We will respond to you as soon as possible'}
                  </p>
                </div>
              </div>
            )}
            
            {sendingStatus === 'error' && (
              <div className="bg-red-100 border border-red-400 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 bg-red-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xl">✗</span>
                </div>
                <div>
                  <h4 className="font-semibold text-red-800">
                    {isRTL ? 'فشل إرسال الرسالة' : 'Failed to send message'}
                  </h4>
                  <p className="text-red-700 text-sm">
                    {isRTL ? 'يرجى المحاولة مرة أخرى أو إرسال بريد إلكتروني مباشرة' : 'Please try again or send an email directly'}
                  </p>
                </div>
              </div>
            )}

            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-800 mb-4">{isRTL ? 'أرسل رسالة' : 'Send a Message'}</h3>
              <form onSubmit={handleContactSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <input
                    type="text"
                    placeholder={isRTL ? 'الاسم *' : 'Name *'}
                    value={contactForm.name}
                    onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                    required
                    disabled={sendingStatus === 'sending'}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                  <input
                    type="email"
                    placeholder={isRTL ? 'البريد الإلكتروني *' : 'Email *'}
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    required
                    disabled={sendingStatus === 'sending'}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                  />
                </div>
                <input
                  type="text"
                  placeholder={isRTL ? 'الموضوع (اختياري)' : 'Subject (optional)'}
                  value={contactForm.subject}
                  onChange={(e) => setContactForm({ ...contactForm, subject: e.target.value })}
                  disabled={sendingStatus === 'sending'}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <textarea
                  placeholder={isRTL ? 'الرسالة *' : 'Message *'}
                  rows={4}
                  value={contactForm.message}
                  onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                  required
                  disabled={sendingStatus === 'sending'}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                />
                <button
                  type="submit"
                  disabled={sendingStatus === 'sending'}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sendingStatus === 'sending' ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      {isRTL ? 'جاري الإرسال...' : 'Sending...'}
                    </>
                  ) : (
                    <>
                      <Mail className="w-5 h-5" />
                      {isRTL ? 'إرسال الرسالة' : 'Send Message'}
                    </>
                  )}
                </button>
              </form>
              <p className="text-center text-gray-500 text-sm mt-3">
                {isRTL 
                  ? 'سيتم إرسال رسالتك مباشرة إلى فريق الدعم' 
                  : 'Your message will be sent directly to the support team'}
              </p>
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <Lightbulb className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">
                    {isRTL ? 'نصيحة' : 'Tip'}
                  </h4>
                  <p className="text-blue-700 text-sm">
                    {isRTL 
                      ? 'للحصول على دعم أسرع، يرجى تضمين تفاصيل المشكلة ولقطات شاشة إن أمكن.'
                      : 'For faster support, please include problem details and screenshots if possible.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Help;
