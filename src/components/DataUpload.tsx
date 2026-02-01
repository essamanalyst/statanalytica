import React, { useState, useCallback, useRef } from 'react';
import {
  Upload,
  FileSpreadsheet,
  FileJson,
  FileText,
  Table,
  Database,
  Cloud,
  Globe,
  Link,
  X,
  CheckCircle,
  AlertCircle,
  Loader2,
  Settings,
  Eye,
  Download,
  FolderOpen,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Columns,
  Calendar,
  Type,
  Hash,
  ToggleLeft
} from 'lucide-react';
import CloudProvidersModal from './CloudProviders';
import { useLanguage } from '../i18n';
import { useNotification } from './NotificationSystem';

// Excel file parser using XLSX library
const parseExcelBuffer = async (buffer: ArrayBuffer, hasHeader: boolean = true): Promise<{ data: any[], columns: string[] }> => {
  // Dynamic import to avoid bundling issues
  const XLSX = await import('xlsx');
  
  const workbook = XLSX.read(buffer, { 
    type: 'array',
    cellDates: true,
    cellNF: false,
    cellText: false,
    raw: false
  });

  if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
    throw new Error('No worksheets found in file');
  }

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  if (!worksheet) {
    throw new Error('Worksheet is empty');
  }

  // Convert to array of arrays first
  const rawData = XLSX.utils.sheet_to_json(worksheet, { 
    header: 1,
    defval: '',
    blankrows: false,
    raw: false
  }) as any[][];

  if (!rawData || rawData.length === 0) {
    throw new Error('No data found in file');
  }

  // Extract headers
  let headers: string[];
  let dataRows: any[][];

  if (hasHeader) {
    headers = rawData[0].map((h: any, i: number) => 
      h !== null && h !== undefined && String(h).trim() !== '' 
        ? String(h).trim() 
        : `Column_${i + 1}`
    );
    dataRows = rawData.slice(1);
  } else {
    const numCols = rawData[0].length;
    headers = Array.from({ length: numCols }, (_, i) => `Column_${i + 1}`);
    dataRows = rawData;
  }

  // Convert rows to objects
  const data = dataRows.map(row => {
    const obj: Record<string, any> = {};
    headers.forEach((header, i) => {
      let value = row[i];
      
      // Handle dates
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      }
      
      // Handle empty values
      if (value === undefined || value === null || value === '') {
        obj[header] = null;
      } else {
        obj[header] = value;
      }
    });
    return obj;
  }).filter(row => Object.values(row).some(v => v !== null && v !== '' && v !== undefined));

  return { data, columns: headers };
};

interface DataUploadProps {
  onDataLoaded: (data: any[], columns: string[]) => void;
}

interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text';
  nullCount: number;
  uniqueCount: number;
  sample: any[];
}

const DataUpload: React.FC<DataUploadProps> = ({ onDataLoaded }) => {
  const { t, language, isRTL } = useLanguage();
  const { success: notifySuccess, error: notifyError } = useNotification();
  const [activeTab, setActiveTab] = useState<'file' | 'database' | 'cloud' | 'api' | 'url' | 'sample'>('file');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [columnInfo, setColumnInfo] = useState<ColumnInfo[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCloudModal, setShowCloudModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // File config
  const [fileConfig, setFileConfig] = useState({
    encoding: 'UTF-8',
    delimiter: ',',
    hasHeader: true,
    skipRows: 0,
    trimWhitespace: true,
    parseNumbers: true,
    parseDates: true,
    nullValues: ['', 'NA', 'N/A', 'null', 'NULL', 'None', 'NaN', '.', '-']
  });

  // Database config
  const [dbConfig, setDbConfig] = useState({
    type: 'postgresql',
    host: 'localhost',
    port: '5432',
    database: '',
    username: '',
    password: '',
    query: 'SELECT * FROM ',
    tableName: '',
    connectionStatus: 'disconnected' as 'disconnected' | 'connecting' | 'connected' | 'error',
    connectionError: ''
  });

  // Available tables (simulated) - reserved for future use
  const [_availableTables, _setAvailableTables] = useState<string[]>([]);
  const [_dbConnectionTested, _setDbConnectionTested] = useState(false);
  void _availableTables; void _setAvailableTables; void _dbConnectionTested; void _setDbConnectionTested;

  // API config
  const [apiConfig, setApiConfig] = useState({
    url: '',
    method: 'GET',
    headers: '{"Content-Type": "application/json"}',
    body: '',
    dataPath: ''
  });

  // URL config
  const [urlConfig, setUrlConfig] = useState({
    url: '',
    format: 'auto'
  });

  const sampleDatasets = [
    {
      id: 'iris',
      name: 'Iris Dataset',
      nameAr: 'بيانات زهرة السوسن',
      description: language === 'ar' ? '150 عينة، 4 متغيرات رقمية + تصنيف' : '150 samples, 4 numeric variables + classification',
      category: language === 'ar' ? 'تصنيف' : 'Classification',
      rows: 150,
      cols: 5,
      icon: '🌸'
    },
    {
      id: 'mtcars',
      name: 'Motor Trend Cars',
      nameAr: 'بيانات السيارات',
      description: language === 'ar' ? '32 سيارة مع 11 متغير' : '32 cars with 11 variables',
      category: language === 'ar' ? 'انحدار' : 'Regression',
      rows: 32,
      cols: 11,
      icon: '🚗'
    },
    {
      id: 'titanic',
      name: 'Titanic',
      nameAr: 'ركاب تايتانيك',
      description: language === 'ar' ? '891 راكب، بيانات النجاة' : '891 passengers, survival data',
      category: language === 'ar' ? 'تصنيف' : 'Classification',
      rows: 891,
      cols: 12,
      icon: '🚢'
    },
    {
      id: 'boston',
      name: 'Boston Housing',
      nameAr: 'أسعار منازل بوسطن',
      description: language === 'ar' ? '506 منطقة، 14 متغير' : '506 areas, 14 variables',
      category: language === 'ar' ? 'انحدار' : 'Regression',
      rows: 506,
      cols: 14,
      icon: '🏠'
    },
    {
      id: 'wine',
      name: 'Wine Quality',
      nameAr: 'جودة النبيذ',
      description: language === 'ar' ? '6497 عينة، تحليل كيميائي' : '6497 samples, chemical analysis',
      category: language === 'ar' ? 'تصنيف' : 'Classification',
      rows: 6497,
      cols: 13,
      icon: '🍷'
    },
    {
      id: 'diabetes',
      name: 'Diabetes',
      nameAr: 'بيانات السكري',
      description: language === 'ar' ? '768 مريض، تشخيص طبي' : '768 patients, medical diagnosis',
      category: language === 'ar' ? 'تصنيف' : 'Classification',
      rows: 768,
      cols: 9,
      icon: '🏥'
    },
    {
      id: 'sales',
      name: 'Sales Data',
      nameAr: 'بيانات المبيعات',
      description: language === 'ar' ? '1000 معاملة، سلاسل زمنية' : '1000 transactions, time series',
      category: language === 'ar' ? 'سلاسل زمنية' : 'Time Series',
      rows: 1000,
      cols: 8,
      icon: '💰'
    },
    {
      id: 'customers',
      name: 'Customer Segmentation',
      nameAr: 'تجزئة العملاء',
      description: language === 'ar' ? '500 عميل، تحليل سلوكي' : '500 customers, behavioral analysis',
      category: language === 'ar' ? 'تجميع' : 'Clustering',
      rows: 500,
      cols: 10,
      icon: '👥'
    },
    {
      id: 'survey',
      name: 'Survey Results',
      nameAr: 'نتائج استبيان',
      description: language === 'ar' ? '200 استجابة، مقياس ليكرت' : '200 responses, Likert scale',
      category: language === 'ar' ? 'إحصاء' : 'Statistics',
      rows: 200,
      cols: 15,
      icon: '📊'
    },
    {
      id: 'stocks',
      name: 'Stock Prices',
      nameAr: 'أسعار الأسهم',
      description: language === 'ar' ? '500 يوم تداول' : '500 trading days',
      category: language === 'ar' ? 'سلاسل زمنية' : 'Time Series',
      rows: 500,
      cols: 7,
      icon: '📈'
    }
  ];

  const detectColumnType = (values: any[]): 'numeric' | 'categorical' | 'date' | 'boolean' | 'text' => {
    const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
    if (nonNull.length === 0) return 'text';

    const sample = nonNull.slice(0, 100);
    
    const boolValues = sample.filter(v => 
      typeof v === 'boolean' || 
      ['true', 'false', '0', '1', 'yes', 'no'].includes(String(v).toLowerCase())
    );
    if (boolValues.length === sample.length) return 'boolean';

    const numericValues = sample.filter(v => !isNaN(Number(v)));
    if (numericValues.length === sample.length) return 'numeric';

    const dateValues = sample.filter(v => {
      const d = new Date(v);
      return !isNaN(d.getTime()) && String(v).match(/\d{4}|\d{2}[-/]\d{2}/);
    });
    if (dateValues.length > sample.length * 0.8) return 'date';

    const unique = new Set(sample);
    if (unique.size <= Math.min(20, sample.length * 0.5)) return 'categorical';

    return 'text';
  };

  const analyzeColumns = (data: any[], columns: string[]): ColumnInfo[] => {
    return columns.map(col => {
      const values = data.map(row => row[col]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const unique = new Set(nonNull);
      
      return {
        name: col,
        type: detectColumnType(values),
        nullCount: values.length - nonNull.length,
        uniqueCount: unique.size,
        sample: Array.from(unique).slice(0, 5)
      };
    });
  };

  const generateSampleData = (datasetId: string): { data: any[], columns: string[] } => {
    const generators: Record<string, () => { data: any[], columns: string[] }> = {
      iris: () => ({
        columns: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'],
        data: Array.from({ length: 150 }, (_, i) => ({
          sepal_length: +(4.3 + Math.random() * 3.6).toFixed(1),
          sepal_width: +(2.0 + Math.random() * 2.4).toFixed(1),
          petal_length: +(1.0 + Math.random() * 5.9).toFixed(1),
          petal_width: +(0.1 + Math.random() * 2.4).toFixed(1),
          species: ['setosa', 'versicolor', 'virginica'][i % 3]
        }))
      }),
      mtcars: () => {
        const cars = ['Mazda RX4', 'Datsun 710', 'Hornet', 'Valiant', 'Duster', 'Merc 240D', 'Merc 280', 
                     'Cadillac', 'Lincoln', 'Chrysler', 'Fiat 128', 'Honda Civic', 'Toyota', 'Camaro', 
                     'Pontiac', 'Porsche', 'Lotus', 'Ferrari', 'Maserati', 'Volvo', 'BMW', 'Audi',
                     'Ford', 'Chevrolet', 'Dodge', 'Jeep', 'Tesla', 'Nissan', 'Subaru', 'Kia', 'Hyundai', 'VW'];
        return {
          columns: ['name', 'mpg', 'cyl', 'disp', 'hp', 'drat', 'wt', 'qsec', 'vs', 'am', 'gear'],
          data: cars.map((name, i) => ({
            name,
            mpg: +(10 + Math.random() * 24).toFixed(1),
            cyl: [4, 6, 8][i % 3],
            disp: Math.floor(70 + Math.random() * 400),
            hp: Math.floor(50 + Math.random() * 285),
            drat: +(2.5 + Math.random() * 2).toFixed(2),
            wt: +(1.5 + Math.random() * 4).toFixed(3),
            qsec: +(14 + Math.random() * 9).toFixed(2),
            vs: i % 2,
            am: (i + 1) % 2,
            gear: [3, 4, 5][i % 3]
          }))
        };
      },
      titanic: () => ({
        columns: ['PassengerId', 'Survived', 'Pclass', 'Name', 'Sex', 'Age', 'SibSp', 'Parch', 'Fare', 'Embarked'],
        data: Array.from({ length: 891 }, (_, i) => ({
          PassengerId: i + 1,
          Survived: Math.random() > 0.6 ? 0 : 1,
          Pclass: [1, 2, 3][Math.floor(Math.random() * 3)],
          Name: `Passenger ${i + 1}`,
          Sex: Math.random() > 0.5 ? 'male' : 'female',
          Age: Math.random() > 0.1 ? Math.floor(1 + Math.random() * 79) : null,
          SibSp: Math.floor(Math.random() * 5),
          Parch: Math.floor(Math.random() * 3),
          Fare: +(7 + Math.random() * 500).toFixed(2),
          Embarked: ['S', 'C', 'Q'][Math.floor(Math.random() * 3)]
        }))
      }),
      boston: () => ({
        columns: ['CRIM', 'ZN', 'INDUS', 'CHAS', 'NOX', 'RM', 'AGE', 'DIS', 'RAD', 'TAX', 'PTRATIO', 'B', 'LSTAT', 'MEDV'],
        data: Array.from({ length: 506 }, () => ({
          CRIM: +(0.006 + Math.random() * 88).toFixed(5),
          ZN: +(Math.random() * 100).toFixed(1),
          INDUS: +(0.5 + Math.random() * 27).toFixed(2),
          CHAS: Math.random() > 0.9 ? 1 : 0,
          NOX: +(0.38 + Math.random() * 0.49).toFixed(3),
          RM: +(3.5 + Math.random() * 5).toFixed(3),
          AGE: +(2 + Math.random() * 98).toFixed(1),
          DIS: +(1 + Math.random() * 11).toFixed(4),
          RAD: Math.floor(1 + Math.random() * 24),
          TAX: Math.floor(187 + Math.random() * 524),
          PTRATIO: +(12 + Math.random() * 10).toFixed(1),
          B: +(0.3 + Math.random() * 396).toFixed(2),
          LSTAT: +(1.7 + Math.random() * 36).toFixed(2),
          MEDV: +(5 + Math.random() * 45).toFixed(1)
        }))
      }),
      wine: () => ({
        columns: ['type', 'fixed_acidity', 'volatile_acidity', 'citric_acid', 'residual_sugar', 'chlorides', 'free_so2', 'total_so2', 'density', 'pH', 'sulphates', 'alcohol', 'quality'],
        data: Array.from({ length: 1000 }, () => ({
          type: Math.random() > 0.5 ? 'red' : 'white',
          fixed_acidity: +(4 + Math.random() * 12).toFixed(1),
          volatile_acidity: +(0.1 + Math.random() * 1.5).toFixed(2),
          citric_acid: +(Math.random()).toFixed(2),
          residual_sugar: +(0.6 + Math.random() * 65).toFixed(1),
          chlorides: +(0.01 + Math.random() * 0.6).toFixed(3),
          free_so2: Math.floor(1 + Math.random() * 288),
          total_so2: Math.floor(6 + Math.random() * 434),
          density: +(0.987 + Math.random() * 0.014).toFixed(4),
          pH: +(2.7 + Math.random() * 0.9).toFixed(2),
          sulphates: +(0.2 + Math.random() * 1.8).toFixed(2),
          alcohol: +(8 + Math.random() * 6.5).toFixed(1),
          quality: Math.floor(3 + Math.random() * 6)
        }))
      }),
      diabetes: () => ({
        columns: ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigree', 'Age', 'Outcome'],
        data: Array.from({ length: 768 }, () => ({
          Pregnancies: Math.floor(Math.random() * 17),
          Glucose: Math.floor(44 + Math.random() * 155),
          BloodPressure: Math.floor(24 + Math.random() * 98),
          SkinThickness: Math.floor(Math.random() * 99),
          Insulin: Math.floor(Math.random() * 846),
          BMI: +(18 + Math.random() * 49).toFixed(1),
          DiabetesPedigree: +(0.08 + Math.random() * 2.34).toFixed(3),
          Age: Math.floor(21 + Math.random() * 60),
          Outcome: Math.random() > 0.65 ? 0 : 1
        }))
      }),
      sales: () => {
        const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];
        const regions = ['North', 'South', 'East', 'West', 'Central'];
        return {
          columns: ['date', 'product', 'category', 'region', 'quantity', 'unit_price', 'total', 'customer_id'],
          data: Array.from({ length: 1000 }, (_, i) => {
            const quantity = Math.floor(1 + Math.random() * 50);
            const unitPrice = +(5 + Math.random() * 495).toFixed(2);
            return {
              date: new Date(2023, Math.floor(i / 84), (i % 28) + 1).toISOString().split('T')[0],
              product: `Product ${Math.floor(Math.random() * 100) + 1}`,
              category: categories[Math.floor(Math.random() * categories.length)],
              region: regions[Math.floor(Math.random() * regions.length)],
              quantity,
              unit_price: unitPrice,
              total: +(quantity * unitPrice).toFixed(2),
              customer_id: `C${1000 + Math.floor(Math.random() * 500)}`
            };
          })
        };
      },
      customers: () => ({
        columns: ['customer_id', 'age', 'gender', 'income', 'spending_score', 'membership_years', 'last_purchase_days', 'total_purchases', 'avg_purchase_value', 'preferred_category'],
        data: Array.from({ length: 500 }, (_, i) => ({
          customer_id: `C${1000 + i}`,
          age: Math.floor(18 + Math.random() * 62),
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          income: Math.floor(20000 + Math.random() * 180000),
          spending_score: Math.floor(1 + Math.random() * 100),
          membership_years: Math.floor(Math.random() * 10),
          last_purchase_days: Math.floor(Math.random() * 365),
          total_purchases: Math.floor(1 + Math.random() * 200),
          avg_purchase_value: +(20 + Math.random() * 480).toFixed(2),
          preferred_category: ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'][Math.floor(Math.random() * 5)]
        }))
      }),
      survey: () => ({
        columns: ['respondent_id', 'age_group', 'gender', 'education', 'q1', 'q2', 'q3', 'q4', 'q5', 'q6', 'q7', 'q8', 'q9', 'q10', 'satisfaction'],
        data: Array.from({ length: 200 }, (_, i) => ({
          respondent_id: i + 1,
          age_group: ['18-25', '26-35', '36-45', '46-55', '55+'][Math.floor(Math.random() * 5)],
          gender: Math.random() > 0.5 ? 'Male' : 'Female',
          education: ['High School', 'Bachelor', 'Master', 'PhD'][Math.floor(Math.random() * 4)],
          q1: Math.floor(1 + Math.random() * 5),
          q2: Math.floor(1 + Math.random() * 5),
          q3: Math.floor(1 + Math.random() * 5),
          q4: Math.floor(1 + Math.random() * 5),
          q5: Math.floor(1 + Math.random() * 5),
          q6: Math.floor(1 + Math.random() * 5),
          q7: Math.floor(1 + Math.random() * 5),
          q8: Math.floor(1 + Math.random() * 5),
          q9: Math.floor(1 + Math.random() * 5),
          q10: Math.floor(1 + Math.random() * 5),
          satisfaction: ['Very Dissatisfied', 'Dissatisfied', 'Neutral', 'Satisfied', 'Very Satisfied'][Math.floor(Math.random() * 5)]
        }))
      }),
      stocks: () => ({
        columns: ['date', 'open', 'high', 'low', 'close', 'volume', 'adj_close'],
        data: Array.from({ length: 500 }, (_, i) => {
          const basePrice = 100 + Math.sin(i / 30) * 20 + Math.random() * 10;
          const open = +basePrice.toFixed(2);
          const high = +(basePrice + Math.random() * 5).toFixed(2);
          const low = +(basePrice - Math.random() * 5).toFixed(2);
          const close = +(low + Math.random() * (high - low)).toFixed(2);
          return {
            date: new Date(2022, 0, 1 + i).toISOString().split('T')[0],
            open,
            high,
            low,
            close,
            volume: Math.floor(1000000 + Math.random() * 9000000),
            adj_close: close
          };
        })
      })
    };

    const generator = generators[datasetId];
    return generator ? generator() : { data: [], columns: [] };
  };

  const parseFile = useCallback((content: string, fileName: string): { data: any[], columns: string[] } => {
    const isCSV = fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv');
    const isJSON = fileName.endsWith('.json');

    if (isJSON) {
      const jsonData = JSON.parse(content);
      if (Array.isArray(jsonData)) {
        return { data: jsonData, columns: jsonData.length > 0 ? Object.keys(jsonData[0]) : [] };
      }
      const findArray = (obj: any): any[] | null => {
        if (Array.isArray(obj)) return obj;
        for (const key of Object.keys(obj)) {
          if (Array.isArray(obj[key])) return obj[key];
          if (typeof obj[key] === 'object' && obj[key] !== null) {
            const result = findArray(obj[key]);
            if (result) return result;
          }
        }
        return null;
      };
      const arr = findArray(jsonData);
      if (arr && arr.length > 0) {
        return { data: arr, columns: Object.keys(arr[0]) };
      }
      return { data: [jsonData], columns: Object.keys(jsonData) };
    }

    if (isCSV) {
      const delimiter = fileName.endsWith('.tsv') ? '\t' : fileConfig.delimiter;
      let lines = content.split('\n').filter(line => line.trim());
      
      if (fileConfig.skipRows > 0) {
        lines = lines.slice(fileConfig.skipRows);
      }

      let columns: string[];
      if (fileConfig.hasHeader && lines.length > 0) {
        columns = lines[0].split(delimiter).map(col => 
          fileConfig.trimWhitespace ? col.trim().replace(/^["']|["']$/g, '') : col.replace(/^["']|["']$/g, '')
        );
        lines = lines.slice(1);
      } else {
        const firstLine = lines[0]?.split(delimiter) || [];
        columns = firstLine.map((_, i) => `Column_${i + 1}`);
      }

      const data = lines.map(line => {
        const values = line.split(delimiter).map(val => {
          let v = val.replace(/^["']|["']$/g, '');
          if (fileConfig.trimWhitespace) v = v.trim();
          if (fileConfig.nullValues.includes(v)) return null;
          if (fileConfig.parseNumbers && v !== '' && !isNaN(Number(v))) {
            return Number(v);
          }
          if (fileConfig.parseDates) {
            const dateMatch = v.match(/^\d{4}-\d{2}-\d{2}/);
            if (dateMatch) return v;
          }
          return v;
        });
        
        const row: Record<string, any> = {};
        columns.forEach((col, i) => {
          row[col] = values[i] ?? null;
        });
        return row;
      });

      return { data, columns };
    }

    throw new Error(t('error.unsupportedFormat'));
  }, [fileConfig, t]);

  const parseExcelFile = useCallback(async (arrayBuffer: ArrayBuffer, _fileName?: string): Promise<{ data: any[], columns: string[] }> => {
    try {
      console.log('Starting Excel parsing, buffer size:', arrayBuffer.byteLength);
      
      // Use the top-level parser function
      const result = await parseExcelBuffer(arrayBuffer, fileConfig.hasHeader);
      
      let { data, columns } = result;
      
      console.log('Columns detected:', columns);
      console.log('Rows extracted:', data.length);
      
      // Process values (handle nulls, parse numbers)
      data = data.map(row => {
        const newRow: Record<string, any> = {};
        columns.forEach(col => {
          let val = row[col];
          
          // Handle null values
          if (val === null || val === undefined || val === '') {
            newRow[col] = null;
          } else if (fileConfig.nullValues.includes(String(val))) {
            newRow[col] = null;
          } else if (fileConfig.parseNumbers && typeof val === 'string' && !isNaN(Number(val)) && val.trim() !== '') {
            newRow[col] = Number(val);
          } else {
            newRow[col] = val;
          }
        });
        return newRow;
      });
      
      // Skip rows if specified
      if (fileConfig.skipRows > 0) {
        data = data.slice(fileConfig.skipRows);
      }
      
      console.log('Excel parsing complete, final rows:', data.length);
      
      return { data, columns };
    } catch (err) {
      console.error('Excel parsing error details:', err);
      throw new Error(`${language === 'ar' ? 'خطأ في قراءة ملف Excel' : 'Excel parsing error'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  }, [fileConfig, language]);

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.split('.').pop() || '';
    const excelExtensions = ['xlsx', 'xls', 'xlsm', 'xlsb'];
    const textExtensions = ['csv', 'txt', 'tsv', 'json'];
    const isExcel = excelExtensions.includes(fileExtension);
    const isText = textExtensions.includes(fileExtension);

    if (isExcel) {
      // Handle Excel files with ArrayBuffer
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          console.log('File read complete, buffer size:', arrayBuffer?.byteLength);
          
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            throw new Error(language === 'ar' ? 'الملف فارغ' : 'File is empty');
          }
          
          // Use await since parseExcelFile is now async
          const { data, columns } = await parseExcelFile(arrayBuffer, fileName);

          if (data.length > 0) {
            const colInfo = analyzeColumns(data, columns);
            setColumnInfo(colInfo);
            setPreviewData(data.slice(0, 10));
            setShowPreview(true);
            onDataLoaded(data, columns);
            const successMsg = language === 'ar' 
                ? `✅ تم تحميل ${data.length.toLocaleString()} صف و ${columns.length} عمود من "${file.name}"`
                : `✅ Loaded ${data.length.toLocaleString()} rows and ${columns.length} columns from "${file.name}"`;
            setSuccess(successMsg);
            notifySuccess(
              language === 'ar' ? 'تم تحميل البيانات' : 'Data Loaded',
              `${data.length.toLocaleString()} ${language === 'ar' ? 'صف' : 'rows'} × ${columns.length} ${language === 'ar' ? 'عمود' : 'columns'}`,
              'import',
              file.name
            );
          } else {
            const errMsg = language === 'ar' ? 'الملف فارغ أو لا يحتوي على بيانات' : 'File is empty or contains no data';
            setError(errMsg);
            notifyError(language === 'ar' ? 'خطأ في التحميل' : 'Load Error', errMsg, 'import');
          }
        } catch (err) {
          console.error('Excel parsing error:', err);
          const errMsg = `${language === 'ar' ? 'خطأ في قراءة ملف Excel' : 'Error reading Excel file'}: ${err instanceof Error ? err.message : 'Unknown error'}`;
          setError(errMsg);
          notifyError(language === 'ar' ? 'خطأ في التحميل' : 'Load Error', errMsg, 'import');
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = (err) => {
        console.error('FileReader error:', err);
        setError(language === 'ar' ? 'فشل في قراءة الملف' : 'Failed to read file');
        setIsLoading(false);
      };

      console.log('Starting to read Excel file:', file.name, 'size:', file.size);
      reader.readAsArrayBuffer(file);
    } else if (isText) {
      // Handle text-based files (CSV, JSON, TXT, TSV)
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          if (!content || content.trim().length === 0) {
            throw new Error(language === 'ar' ? 'الملف فارغ' : 'File is empty');
          }
          
          const { data, columns } = parseFile(content, fileName);

          if (data.length > 0) {
            const colInfo = analyzeColumns(data, columns);
            setColumnInfo(colInfo);
            setPreviewData(data.slice(0, 10));
            setShowPreview(true);
            onDataLoaded(data, columns);
            setSuccess(
              language === 'ar' 
                ? `✅ تم تحميل ${data.length.toLocaleString()} صف و ${columns.length} عمود من "${file.name}"`
                : `✅ Loaded ${data.length.toLocaleString()} rows and ${columns.length} columns from "${file.name}"`
            );
          } else {
            setError(language === 'ar' ? 'الملف فارغ أو لا يحتوي على بيانات' : 'File is empty or contains no data');
          }
        } catch (err) {
          console.error('File parsing error:', err);
          setError(`${language === 'ar' ? 'خطأ في قراءة الملف' : 'Error reading file'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
        } finally {
          setIsLoading(false);
        }
      };

      reader.onerror = () => {
        setError(language === 'ar' ? 'فشل في قراءة الملف' : 'Failed to read file');
        setIsLoading(false);
      };

      reader.readAsText(file, fileConfig.encoding);
    } else {
      // Unsupported file format
      setError(
        language === 'ar' 
          ? `صيغة الملف غير مدعومة: .${fileExtension}. الصيغ المدعومة: CSV, Excel, JSON, TXT, TSV`
          : `Unsupported file format: .${fileExtension}. Supported formats: CSV, Excel, JSON, TXT, TSV`
      );
      setIsLoading(false);
    }
  }, [fileConfig, parseFile, parseExcelFile, onDataLoaded, language]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const files = e.dataTransfer.files;
    if (files.length > 0 && fileInputRef.current) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      fileInputRef.current.files = dataTransfer.files;
      handleFileUpload({ target: fileInputRef.current } as any);
    }
  }, [handleFileUpload]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const loadSampleDataset = (datasetId: string) => {
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    setTimeout(() => {
      try {
        const { data, columns } = generateSampleData(datasetId);
        const dataset = sampleDatasets.find(d => d.id === datasetId);
        const colInfo = analyzeColumns(data, columns);
        
        setColumnInfo(colInfo);
        setPreviewData(data.slice(0, 10));
        setShowPreview(true);
        onDataLoaded(data, columns);
        const datasetName = language === 'ar' ? dataset?.nameAr : dataset?.name;
        setSuccess(
          language === 'ar'
            ? `تم تحميل "${datasetName}" - ${data.length.toLocaleString()} صف`
            : `Loaded "${datasetName}" - ${data.length.toLocaleString()} rows`
        );
      } catch (err) {
        setError(t('error.loadFailed'));
      } finally {
        setIsLoading(false);
      }
    }, 300);
  };

  const loadFromUrl = async () => {
    if (!urlConfig.url) {
      setError(language === 'ar' ? 'يرجى إدخال رابط صالح' : 'Please enter a valid URL');
      return;
    }

    // Validate URL format
    try {
      new URL(urlConfig.url);
    } catch {
      setError(language === 'ar' ? 'صيغة الرابط غير صالحة' : 'Invalid URL format');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Fetch data from URL
      const response = await fetch(urlConfig.url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json, text/csv, text/plain, */*'
        }
      });

      if (!response.ok) {
        throw new Error(`${language === 'ar' ? 'خطأ في الاستجابة' : 'Response error'}: ${response.status} ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type') || '';
      const text = await response.text();

      if (!text || text.trim().length === 0) {
        throw new Error(language === 'ar' ? 'الملف فارغ' : 'File is empty');
      }

      let data: any[] = [];
      let columns: string[] = [];

      // Determine format
      let format = urlConfig.format;
      if (format === 'auto') {
        if (contentType.includes('json') || urlConfig.url.endsWith('.json')) {
          format = 'json';
        } else if (contentType.includes('csv') || urlConfig.url.endsWith('.csv')) {
          format = 'csv';
        } else if (urlConfig.url.endsWith('.xlsx') || urlConfig.url.endsWith('.xls')) {
          format = 'excel';
        } else {
          // Try to detect from content
          const trimmed = text.trim();
          if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
            format = 'json';
          } else {
            format = 'csv'; // Default to CSV
          }
        }
      }

      // Parse based on format
      if (format === 'json') {
        const jsonData = JSON.parse(text);
        
        if (Array.isArray(jsonData)) {
          data = jsonData;
        } else {
          // Find array in response
          const findArray = (obj: any, depth: number = 0): any[] | null => {
            if (depth > 5) return null;
            if (Array.isArray(obj)) return obj;
            if (typeof obj === 'object' && obj !== null) {
              for (const key of Object.keys(obj)) {
                const result = findArray(obj[key], depth + 1);
                if (result && result.length > 0) return result;
              }
            }
            return null;
          };
          const foundArray = findArray(jsonData);
          if (foundArray) {
            data = foundArray;
          } else {
            data = [jsonData];
          }
        }
        
        if (data.length > 0) {
          columns = Object.keys(data[0]);
        }
      } else if (format === 'csv') {
        // Parse CSV
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) {
          throw new Error(language === 'ar' ? 'الملف فارغ' : 'File is empty');
        }

        // Detect delimiter
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes('\t')) delimiter = '\t';
        else if (firstLine.includes(';')) delimiter = ';';

        // Parse header
        columns = firstLine.split(delimiter).map(col => col.trim().replace(/^["']|["']$/g, ''));

        // Parse rows
        data = lines.slice(1).map(line => {
          const values = line.split(delimiter).map(val => {
            let v = val.trim().replace(/^["']|["']$/g, '');
            if (v === '' || v === 'NA' || v === 'N/A' || v === 'null' || v === 'NULL') return null;
            if (!isNaN(Number(v)) && v !== '') return Number(v);
            return v;
          });
          
          const row: Record<string, any> = {};
          columns.forEach((col, i) => {
            row[col] = values[i] ?? null;
          });
          return row;
        }).filter(row => Object.values(row).some(v => v !== null));
      } else if (format === 'excel') {
        // For Excel files, we need to fetch as ArrayBuffer
        const excelResponse = await fetch(urlConfig.url);
        const arrayBuffer = await excelResponse.arrayBuffer();
        const result = await parseExcelBuffer(arrayBuffer, fileConfig.hasHeader);
        data = result.data;
        columns = result.columns;
      }

      if (!data || data.length === 0) {
        throw new Error(language === 'ar' ? 'لم يتم العثور على بيانات' : 'No data found');
      }

      // Analyze and display data
      const colInfo = analyzeColumns(data, columns);
      setColumnInfo(colInfo);
      setPreviewData(data.slice(0, 10));
      setShowPreview(true);
      onDataLoaded(data, columns);
      
      const successMsg = language === 'ar' 
        ? `✅ تم تحميل ${data.length.toLocaleString()} صف و ${columns.length} عمود من الرابط`
        : `✅ Loaded ${data.length.toLocaleString()} rows and ${columns.length} columns from URL`;
      setSuccess(successMsg);
      notifySuccess(
        language === 'ar' ? 'تم تحميل البيانات' : 'Data Loaded',
        `${data.length.toLocaleString()} ${language === 'ar' ? 'صف' : 'rows'} × ${columns.length} ${language === 'ar' ? 'عمود' : 'columns'}`,
        'import',
        urlConfig.url
      );

    } catch (err) {
      console.error('URL fetch error:', err);
      let errorMsg = err instanceof Error ? err.message : (language === 'ar' ? 'خطأ غير معروف' : 'Unknown error');
      
      // Check for CORS error
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = language === 'ar' 
          ? 'فشل في الوصول للرابط. قد يكون السبب عدم دعم CORS. جرب تحميل الملف يدوياً.'
          : 'Failed to access URL. This might be due to CORS restrictions. Try downloading the file manually.';
      }
      
      setError(errorMsg);
      notifyError(
        language === 'ar' ? 'فشل التحميل' : 'Load Failed',
        errorMsg,
        'import'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'numeric': return <Hash className="w-4 h-4 text-blue-500" />;
      case 'categorical': return <Type className="w-4 h-4 text-green-500" />;
      case 'date': return <Calendar className="w-4 h-4 text-purple-500" />;
      case 'boolean': return <ToggleLeft className="w-4 h-4 text-orange-500" />;
      default: return <Type className="w-4 h-4 text-gray-500" />;
    }
  };

  const tabs = [
    { id: 'file', label: t('upload.localFile'), icon: FolderOpen },
    { id: 'sample', label: t('upload.sampleData'), icon: Table },
    { id: 'url', label: t('upload.urlLink'), icon: Link },
    { id: 'database', label: t('upload.database'), icon: Database },
    { id: 'api', label: 'API', icon: Globe },
    { id: 'cloud', label: t('upload.cloud'), icon: Cloud }
  ];

  return (
    <div className="p-6 space-y-6" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{t('upload.title')}</h2>
          <p className="text-gray-500 mt-1">{t('upload.subtitle')}</p>
        </div>
        {success && (
          <div className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span className="text-sm">{success}</span>
          </div>
        )}
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-700">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
          <button onClick={() => setError(null)} className={`${isRTL ? 'mr-auto' : 'ml-auto'} p-1 hover:bg-red-100 rounded`}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 p-1 bg-gray-100 rounded-xl">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-50'
            }`}
          >
            <tab.icon className="w-5 h-5" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* File Upload Tab */}
      {activeTab === 'file' && (
        <div className="space-y-6">
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-gray-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/50 transition-all cursor-pointer group"
          >
            <input
              ref={fileInputRef}
              type="file"
              id="file-upload"
              className="hidden"
              accept=".csv,.xlsx,.xls,.json,.txt,.tsv,.xml"
              onChange={handleFileUpload}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
              <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <Upload className="w-10 h-10 text-blue-600" />
              </div>
              <p className="text-xl font-semibold text-gray-700 mb-2">
                {t('upload.dragDropText')}
              </p>
              <p className="text-gray-500">
                {t('upload.supportedFormats')}
              </p>
            </label>
          </div>

          {/* File Types */}
          <div className="flex flex-wrap justify-center gap-4">
            {[
              { ext: 'CSV', icon: FileSpreadsheet, color: 'text-green-500' },
              { ext: 'Excel', icon: FileSpreadsheet, color: 'text-emerald-600' },
              { ext: 'JSON', icon: FileJson, color: 'text-yellow-500' },
              { ext: 'TXT', icon: FileText, color: 'text-gray-500' }
            ].map(type => (
              <div key={type.ext} className="flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                <type.icon className={`w-5 h-5 ${type.color}`} />
                <span className="text-sm font-medium text-gray-600">{type.ext}</span>
              </div>
            ))}
          </div>

          {/* Advanced Options */}
          <div className="bg-gray-50 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-between p-4 hover:bg-gray-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-gray-500" />
                <span className="font-medium text-gray-700">{t('upload.advancedOptions')}</span>
              </div>
              {showAdvanced ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </button>
            
            {showAdvanced && (
              <div className="p-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.encoding')}</label>
                  <select
                    value={fileConfig.encoding}
                    onChange={(e) => setFileConfig({ ...fileConfig, encoding: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="UTF-8">UTF-8</option>
                    <option value="UTF-16">UTF-16</option>
                    <option value="ISO-8859-1">ISO-8859-1</option>
                    <option value="Windows-1256">Windows-1256</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.delimiter')}</label>
                  <select
                    value={fileConfig.delimiter}
                    onChange={(e) => setFileConfig({ ...fileConfig, delimiter: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value=",">{language === 'ar' ? 'فاصلة' : 'Comma'} (,)</option>
                    <option value=";">{language === 'ar' ? 'فاصلة منقوطة' : 'Semicolon'} (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.skipRows')}</label>
                  <input
                    type="number"
                    min="0"
                    value={fileConfig.skipRows}
                    onChange={(e) => setFileConfig({ ...fileConfig, skipRows: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex flex-col justify-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fileConfig.hasHeader}
                      onChange={(e) => setFileConfig({ ...fileConfig, hasHeader: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-600">{t('upload.hasHeader')}</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sample Datasets Tab */}
      {activeTab === 'sample' && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {sampleDatasets.map(dataset => (
            <button
              key={dataset.id}
              onClick={() => loadSampleDataset(dataset.id)}
              disabled={isLoading}
              className={`p-4 bg-white border-2 border-gray-100 rounded-xl ${isRTL ? 'text-right' : 'text-left'} hover:border-blue-300 hover:shadow-lg transition-all group disabled:opacity-50`}
            >
              <div className="flex items-start justify-between mb-3">
                <span className="text-2xl">{dataset.icon}</span>
                <span className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600">
                  {dataset.category}
                </span>
              </div>
              <h4 className="font-semibold text-gray-800 mb-1">
                {language === 'ar' ? dataset.nameAr : dataset.name}
              </h4>
              <p className="text-xs text-gray-500 mb-3 line-clamp-2">{dataset.description}</p>
              <div className="flex gap-3 text-xs text-gray-400">
                <span>{dataset.rows} {t('label.rows')}</span>
                <span>{dataset.cols} {t('label.columns')}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* URL Tab */}
      {activeTab === 'url' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Info Banner */}
          <div className="p-4 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Link className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-indigo-800 mb-1">
                  {language === 'ar' ? 'استيراد البيانات من رابط URL' : 'Import Data from URL'}
                </h4>
                <p className="text-sm text-indigo-700">
                  {language === 'ar' 
                    ? 'أدخل رابط مباشر لملف CSV أو JSON أو Excel وسيتم تحميله تلقائياً. يدعم معظم المستودعات العامة مثل GitHub و Kaggle.'
                    : 'Enter a direct link to a CSV, JSON, or Excel file and it will be loaded automatically. Supports most public repositories like GitHub and Kaggle.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Link className="w-5 h-5 text-indigo-600" />
                {t('upload.loadFromUrl')}
              </h3>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                urlConfig.format === 'auto' ? 'bg-gray-100 text-gray-600' :
                urlConfig.format === 'csv' ? 'bg-green-100 text-green-700' :
                urlConfig.format === 'json' ? 'bg-yellow-100 text-yellow-700' :
                'bg-blue-100 text-blue-700'
              }`}>
                {urlConfig.format.toUpperCase()}
              </span>
            </div>
            
            <div className="space-y-4">
              {/* URL Input */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  {t('upload.fileUrl')} <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="url"
                    value={urlConfig.url}
                    onChange={(e) => setUrlConfig({ ...urlConfig, url: e.target.value })}
                    placeholder="https://raw.githubusercontent.com/user/repo/main/data.csv"
                    className="w-full border-2 rounded-lg px-4 py-3 pr-12 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200"
                    dir="ltr"
                  />
                  {urlConfig.url && (
                    <button
                      onClick={() => setUrlConfig({ ...urlConfig, url: '' })}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'ar' 
                    ? 'استخدم روابط مباشرة للملفات (raw links). مثال: من GitHub استخدم raw.githubusercontent.com'
                    : 'Use direct file links (raw links). Example: from GitHub use raw.githubusercontent.com'}
                </p>
              </div>
              
              {/* Format Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">{t('upload.fileFormat')}</label>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { id: 'auto', name: language === 'ar' ? 'تلقائي' : 'Auto', icon: '🔄', desc: language === 'ar' ? 'كشف تلقائي' : 'Auto detect' },
                    { id: 'csv', name: 'CSV', icon: '📊', desc: language === 'ar' ? 'قيم مفصولة' : 'Comma separated' },
                    { id: 'json', name: 'JSON', icon: '📋', desc: language === 'ar' ? 'بيانات منظمة' : 'Structured data' },
                    { id: 'excel', name: 'Excel', icon: '📗', desc: language === 'ar' ? 'جداول بيانات' : 'Spreadsheets' }
                  ].map(fmt => (
                    <button
                      key={fmt.id}
                      onClick={() => setUrlConfig({ ...urlConfig, format: fmt.id })}
                      className={`p-3 border-2 rounded-xl text-center transition-all ${
                        urlConfig.format === fmt.id
                          ? 'border-indigo-500 bg-indigo-50 shadow-md'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <span className="text-xl block mb-1">{fmt.icon}</span>
                      <span className="text-sm font-medium text-gray-700 block">{fmt.name}</span>
                      <span className="text-xs text-gray-500">{fmt.desc}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={loadFromUrl}
                  disabled={isLoading || !urlConfig.url}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-md hover:shadow-lg"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                  {isLoading 
                    ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...') 
                    : (language === 'ar' ? 'تحميل البيانات' : 'Load Data')}
                </button>
                <button
                  onClick={() => {
                    setUrlConfig({ url: '', format: 'auto' });
                    setError(null);
                    setSuccess(null);
                  }}
                  className="px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  <RefreshCw className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
          </div>

          {/* Sample URLs - Enhanced */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-lg">🔗</span>
              {language === 'ar' ? 'روابط بيانات جاهزة للتجربة' : 'Sample Data URLs to Try'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { 
                  name: 'Iris Dataset', 
                  url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv',
                  desc: language === 'ar' ? '150 عينة زهور' : '150 flower samples',
                  format: 'csv',
                  icon: '🌸'
                },
                { 
                  name: 'Tips Dataset', 
                  url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv',
                  desc: language === 'ar' ? 'بيانات المطاعم' : 'Restaurant tips data',
                  format: 'csv',
                  icon: '🍽️'
                },
                { 
                  name: 'Titanic Dataset', 
                  url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv',
                  desc: language === 'ar' ? 'ركاب تايتانيك' : 'Titanic passengers',
                  format: 'csv',
                  icon: '🚢'
                },
                { 
                  name: 'Diamonds Dataset', 
                  url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/diamonds.csv',
                  desc: language === 'ar' ? 'أسعار الألماس' : 'Diamond prices',
                  format: 'csv',
                  icon: '💎'
                },
                { 
                  name: 'Penguins Dataset', 
                  url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/penguins.csv',
                  desc: language === 'ar' ? 'بيانات البطاريق' : 'Penguin measurements',
                  format: 'csv',
                  icon: '🐧'
                },
                { 
                  name: 'MPG Dataset', 
                  url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/mpg.csv',
                  desc: language === 'ar' ? 'استهلاك الوقود' : 'Fuel consumption',
                  format: 'csv',
                  icon: '🚗'
                },
                { 
                  name: 'Flights Dataset', 
                  url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/flights.csv',
                  desc: language === 'ar' ? 'رحلات جوية' : 'Flight passengers',
                  format: 'csv',
                  icon: '✈️'
                },
                { 
                  name: 'Countries (JSON)', 
                  url: 'https://restcountries.com/v3.1/all',
                  desc: language === 'ar' ? 'بيانات الدول' : 'World countries',
                  format: 'json',
                  icon: '🌍'
                }
              ].map(item => (
                <button
                  key={item.name}
                  onClick={() => setUrlConfig({ ...urlConfig, url: item.url, format: item.format })}
                  className="flex items-center gap-3 p-4 bg-white rounded-lg border-2 border-transparent hover:border-indigo-300 hover:shadow-md transition-all group text-left"
                >
                  <span className="text-2xl">{item.icon}</span>
                  <div className="flex-1">
                    <span className="font-medium text-gray-800 group-hover:text-indigo-600 block">{item.name}</span>
                    <span className="text-xs text-gray-500">{item.desc}</span>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      item.format === 'csv' ? 'bg-green-100 text-green-700' :
                      item.format === 'json' ? 'bg-yellow-100 text-yellow-700' :
                      'bg-blue-100 text-blue-700'
                    }`}>
                      {item.format.toUpperCase()}
                    </span>
                    <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-indigo-500" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* CORS Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800 text-sm mb-1">
                  {language === 'ar' ? 'ملاحظة حول الروابط' : 'Note about URLs'}
                </h4>
                <p className="text-sm text-amber-700">
                  {language === 'ar' 
                    ? 'بعض المواقع لا تسمح بالوصول المباشر من المتصفح (CORS). استخدم روابط من GitHub Raw أو مستودعات عامة تدعم CORS. إذا واجهت مشكلة، حمّل الملف يدوياً واستورده من تبويب "ملف محلي".'
                    : 'Some websites do not allow direct browser access (CORS). Use links from GitHub Raw or public repositories that support CORS. If you encounter issues, download the file manually and import it from the "Local File" tab.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Tab */}
      {activeTab === 'database' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Important Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800 mb-1">
                  {language === 'ar' ? 'ملاحظة مهمة' : 'Important Notice'}
                </h4>
                <p className="text-sm text-amber-700">
                  {language === 'ar' 
                    ? 'الاتصال المباشر بقواعد البيانات يتطلب خادم وسيط (Backend Server) لأسباب أمنية. يمكنك استخدام أحد الخيارات التالية:'
                    : 'Direct database connection requires a backend server for security reasons. You can use one of the following options:'}
                </p>
                <ul className={`text-sm text-amber-700 mt-2 ${isRTL ? 'mr-4' : 'ml-4'} list-disc`}>
                  <li>{language === 'ar' ? 'تصدير البيانات كملف CSV أو Excel ثم استيرادها' : 'Export data as CSV or Excel file then import it'}</li>
                  <li>{language === 'ar' ? 'استخدام API للوصول للبيانات' : 'Use API to access data'}</li>
                  <li>{language === 'ar' ? 'استخدام خدمات البيانات السحابية' : 'Use cloud data services'}</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6 space-y-6">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Database className="w-5 h-5" />
              {t('upload.databaseConnection')}
            </h3>

            {/* Connection Status */}
            <div className={`p-3 rounded-lg flex items-center gap-3 ${
              dbConfig.connectionStatus === 'connected' ? 'bg-green-50 border border-green-200' :
              dbConfig.connectionStatus === 'connecting' ? 'bg-blue-50 border border-blue-200' :
              dbConfig.connectionStatus === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-gray-50 border border-gray-200'
            }`}>
              <div className={`w-3 h-3 rounded-full ${
                dbConfig.connectionStatus === 'connected' ? 'bg-green-500' :
                dbConfig.connectionStatus === 'connecting' ? 'bg-blue-500 animate-pulse' :
                dbConfig.connectionStatus === 'error' ? 'bg-red-500' :
                'bg-gray-400'
              }`} />
              <span className={`text-sm font-medium ${
                dbConfig.connectionStatus === 'connected' ? 'text-green-700' :
                dbConfig.connectionStatus === 'connecting' ? 'text-blue-700' :
                dbConfig.connectionStatus === 'error' ? 'text-red-700' :
                'text-gray-600'
              }`}>
                {dbConfig.connectionStatus === 'connected' ? (language === 'ar' ? 'متصل' : 'Connected') :
                 dbConfig.connectionStatus === 'connecting' ? (language === 'ar' ? 'جاري الاتصال...' : 'Connecting...') :
                 dbConfig.connectionStatus === 'error' ? (language === 'ar' ? 'فشل الاتصال' : 'Connection Failed') :
                 (language === 'ar' ? 'غير متصل' : 'Disconnected')}
              </span>
              {dbConfig.connectionError && (
                <span className="text-xs text-red-600">{dbConfig.connectionError}</span>
              )}
            </div>

            {/* Database Types */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                {language === 'ar' ? 'نوع قاعدة البيانات' : 'Database Type'}
              </label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
                {[
                  { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', defaultPort: '5432' },
                  { id: 'mysql', name: 'MySQL', icon: '🐬', defaultPort: '3306' },
                  { id: 'sqlite', name: 'SQLite', icon: '📦', defaultPort: '' },
                  { id: 'sqlserver', name: 'SQL Server', icon: '🪟', defaultPort: '1433' },
                  { id: 'oracle', name: 'Oracle', icon: '🔴', defaultPort: '1521' },
                  { id: 'mongodb', name: 'MongoDB', icon: '🍃', defaultPort: '27017' }
                ].map(db => (
                  <button
                    key={db.id}
                    onClick={() => setDbConfig({ ...dbConfig, type: db.id, port: db.defaultPort, connectionStatus: 'disconnected' })}
                    className={`p-3 border-2 rounded-xl text-center transition-all ${
                      dbConfig.type === db.id
                        ? 'border-blue-500 bg-blue-50 shadow-md'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="text-2xl block mb-1">{db.icon}</span>
                    <span className="text-xs font-medium text-gray-700">{db.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Connection Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {t('upload.host')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dbConfig.host}
                  onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value, connectionStatus: 'disconnected' })}
                  placeholder="localhost أو db.example.com"
                  className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {t('upload.port')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dbConfig.port}
                  onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value, connectionStatus: 'disconnected' })}
                  placeholder={dbConfig.type === 'postgresql' ? '5432' : dbConfig.type === 'mysql' ? '3306' : ''}
                  className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {t('upload.databaseName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value, connectionStatus: 'disconnected' })}
                  placeholder={language === 'ar' ? 'اسم قاعدة البيانات' : 'database_name'}
                  className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  {t('upload.username')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={dbConfig.username}
                  onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value, connectionStatus: 'disconnected' })}
                  placeholder={dbConfig.type === 'postgresql' ? 'postgres' : dbConfig.type === 'mysql' ? 'root' : 'admin'}
                  className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                {t('upload.password')}
              </label>
              <input
                type="password"
                value={dbConfig.password}
                onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value, connectionStatus: 'disconnected' })}
                placeholder="••••••••"
                className="w-full border rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            {/* Query Section */}
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-600">
                  {t('upload.sqlQuery')} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDbConfig({ ...dbConfig, query: `SELECT * FROM ${dbConfig.tableName || 'table_name'} LIMIT 1000` })}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                  >
                    SELECT *
                  </button>
                  <button
                    onClick={() => setDbConfig({ ...dbConfig, query: `SELECT column1, column2, column3 FROM ${dbConfig.tableName || 'table_name'} WHERE condition = 'value'` })}
                    className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600"
                  >
                    {language === 'ar' ? 'استعلام مخصص' : 'Custom Query'}
                  </button>
                </div>
              </div>
              <textarea
                value={dbConfig.query}
                onChange={(e) => setDbConfig({ ...dbConfig, query: e.target.value })}
                rows={4}
                placeholder={`SELECT * FROM customers WHERE status = 'active' ORDER BY created_at DESC LIMIT 1000`}
                className="w-full border rounded-lg px-3 py-2.5 font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                dir="ltr"
              />
              <p className="text-xs text-gray-500 mt-1">
                {language === 'ar' 
                  ? 'نصيحة: استخدم LIMIT لتحديد عدد الصفوف المسترجعة'
                  : 'Tip: Use LIMIT to control the number of rows returned'}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-2">
              <button 
                onClick={() => {
                  // Validate required fields
                  if (!dbConfig.host || !dbConfig.database || !dbConfig.username) {
                    setDbConfig({ 
                      ...dbConfig, 
                      connectionStatus: 'error', 
                      connectionError: language === 'ar' ? 'يرجى ملء جميع الحقول المطلوبة' : 'Please fill all required fields' 
                    });
                    return;
                  }
                  
                  // Simulate connection test
                  setDbConfig({ ...dbConfig, connectionStatus: 'connecting', connectionError: '' });
                  setTimeout(() => {
                    // For demo purposes, show that backend is required
                    setDbConfig({ 
                      ...dbConfig, 
                      connectionStatus: 'error', 
                      connectionError: language === 'ar' 
                        ? 'يتطلب الاتصال خادم وسيط (Backend). يرجى استخدام تصدير CSV/Excel بدلاً من ذلك.'
                        : 'Connection requires a backend server. Please use CSV/Excel export instead.' 
                    });
                  }, 2000);
                }}
                disabled={dbConfig.connectionStatus === 'connecting'}
                className="flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
              >
                {dbConfig.connectionStatus === 'connecting' ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4" />
                )}
                {t('upload.testConnection')}
              </button>
              
              <button 
                onClick={() => {
                  if (!dbConfig.query.trim()) {
                    setError(language === 'ar' ? 'يرجى إدخال استعلام SQL' : 'Please enter a SQL query');
                    return;
                  }
                  
                  setIsLoading(true);
                  setError(null);
                  
                  // Simulate loading - show message that backend is required
                  setTimeout(() => {
                    setIsLoading(false);
                    setError(
                      language === 'ar'
                        ? 'لا يمكن تنفيذ الاستعلام مباشرة من المتصفح. يرجى تصدير البيانات كملف CSV أو Excel من أداة إدارة قاعدة البيانات (مثل pgAdmin, MySQL Workbench, DBeaver) ثم استيرادها من تبويب "ملف محلي".'
                        : 'Cannot execute query directly from browser. Please export data as CSV or Excel from your database management tool (e.g., pgAdmin, MySQL Workbench, DBeaver) then import it from "Local File" tab.'
                    );
                  }, 1500);
                }}
                disabled={isLoading || dbConfig.connectionStatus === 'connecting'}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {t('upload.loadData')}
              </button>
            </div>

            {/* Help Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mt-4">
              <h4 className="font-semibold text-blue-800 mb-3 flex items-center gap-2">
                <span>💡</span>
                {language === 'ar' ? 'كيفية استيراد البيانات من قاعدة البيانات' : 'How to Import Data from Database'}
              </h4>
              <div className="space-y-3 text-sm text-blue-700">
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">1.</span>
                  <span>
                    {language === 'ar'
                      ? 'افتح أداة إدارة قاعدة البيانات الخاصة بك (pgAdmin, MySQL Workbench, DBeaver, etc.)'
                      : 'Open your database management tool (pgAdmin, MySQL Workbench, DBeaver, etc.)'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">2.</span>
                  <span>
                    {language === 'ar'
                      ? 'نفذ الاستعلام واختر "تصدير النتائج" (Export Results)'
                      : 'Execute your query and select "Export Results"'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">3.</span>
                  <span>
                    {language === 'ar'
                      ? 'احفظ الملف بصيغة CSV أو Excel'
                      : 'Save the file as CSV or Excel format'}
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="font-bold text-blue-600">4.</span>
                  <span>
                    {language === 'ar'
                      ? 'ارجع إلى تبويب "ملف محلي" وارفع الملف المُصدَّر'
                      : 'Return to "Local File" tab and upload the exported file'}
                  </span>
                </div>
              </div>
              
              {/* Quick Links */}
              <div className="mt-4 pt-3 border-t border-blue-200">
                <p className="text-xs text-blue-600 mb-2">
                  {language === 'ar' ? 'روابط مفيدة:' : 'Helpful Links:'}
                </p>
                <div className="flex flex-wrap gap-2">
                  {[
                    { name: 'pgAdmin', url: 'https://www.pgadmin.org/download/' },
                    { name: 'MySQL Workbench', url: 'https://www.mysql.com/products/workbench/' },
                    { name: 'DBeaver', url: 'https://dbeaver.io/download/' },
                    { name: 'Azure Data Studio', url: 'https://azure.microsoft.com/en-us/products/data-studio/' }
                  ].map(tool => (
                    <a
                      key={tool.name}
                      href={tool.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded text-xs text-blue-600 hover:bg-blue-100"
                    >
                      <ExternalLink className="w-3 h-3" />
                      {tool.name}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Info Banner */}
          <div className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center flex-shrink-0">
                <Globe className="w-5 h-5 text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-1">
                  {language === 'ar' ? 'استيراد البيانات من API' : 'Import Data from API'}
                </h4>
                <p className="text-sm text-blue-700">
                  {language === 'ar' 
                    ? 'أدخل رابط API وسيتم جلب البيانات تلقائياً. تأكد من أن API يدعم CORS أو استخدم API عام.'
                    : 'Enter the API URL and data will be fetched automatically. Make sure the API supports CORS or use a public API.'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white border rounded-xl p-6 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-700 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-600" />
                {t('upload.importFromApi')}
              </h3>
              <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                apiConfig.url ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
              }`}>
                {apiConfig.method}
              </span>
            </div>

            {/* Method & URL */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  {language === 'ar' ? 'الطريقة والرابط' : 'Method & URL'} <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-3">
                  <select
                    value={apiConfig.method}
                    onChange={(e) => setApiConfig({ ...apiConfig, method: e.target.value })}
                    className="w-28 border-2 rounded-lg px-3 py-3 font-semibold focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                  </select>
                  <input
                    type="url"
                    value={apiConfig.url}
                    onChange={(e) => setApiConfig({ ...apiConfig, url: e.target.value })}
                    placeholder="https://api.example.com/data"
                    className="flex-1 border-2 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Headers */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  <span className="flex items-center gap-2">
                    {language === 'ar' ? 'الرؤوس (Headers)' : 'Headers'} 
                    <span className="text-xs text-gray-400">(JSON)</span>
                  </span>
                </label>
                <textarea
                  value={apiConfig.headers}
                  onChange={(e) => setApiConfig({ ...apiConfig, headers: e.target.value })}
                  rows={3}
                  placeholder={`{
  "Content-Type": "application/json",
  "Authorization": "Bearer YOUR_TOKEN"
}`}
                  className="w-full border-2 rounded-lg px-4 py-3 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  dir="ltr"
                />
              </div>

              {/* Body for POST/PUT */}
              {(apiConfig.method === 'POST' || apiConfig.method === 'PUT') && (
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    <span className="flex items-center gap-2">
                      {language === 'ar' ? 'جسم الطلب (Body)' : 'Request Body'} 
                      <span className="text-xs text-gray-400">(JSON)</span>
                    </span>
                  </label>
                  <textarea
                    value={apiConfig.body}
                    onChange={(e) => setApiConfig({ ...apiConfig, body: e.target.value })}
                    rows={5}
                    placeholder={`{
  "query": "SELECT * FROM users",
  "limit": 1000
}`}
                    className="w-full border-2 rounded-lg px-4 py-3 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                    dir="ltr"
                  />
                </div>
              )}

              {/* Data Path */}
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-2">
                  <span className="flex items-center gap-2">
                    {language === 'ar' ? 'مسار البيانات' : 'Data Path'} 
                    <span className="text-xs text-gray-400">({language === 'ar' ? 'اختياري' : 'optional'})</span>
                  </span>
                </label>
                <input
                  type="text"
                  value={apiConfig.dataPath}
                  onChange={(e) => setApiConfig({ ...apiConfig, dataPath: e.target.value })}
                  placeholder="data, results, data.items, response.records"
                  className="w-full border-2 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200"
                  dir="ltr"
                />
                <p className="text-xs text-gray-500 mt-1">
                  {language === 'ar' 
                    ? 'حدد المسار إذا كانت البيانات موجودة داخل كائن. مثال: إذا كان الرد {"data": {"items": [...]}} اكتب: data.items'
                    : 'Specify the path if data is nested. Example: if response is {"data": {"items": [...]}} use: data.items'}
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap gap-3 pt-4 border-t">
              <button 
                onClick={async () => {
                  if (!apiConfig.url) {
                    setError(language === 'ar' ? 'يرجى إدخال رابط API' : 'Please enter API URL');
                    return;
                  }

                  setIsLoading(true);
                  setError(null);
                  setSuccess(null);

                  try {
                    // Parse headers
                    let headers: Record<string, string> = {};
                    try {
                      if (apiConfig.headers.trim()) {
                        headers = JSON.parse(apiConfig.headers);
                      }
                    } catch {
                      throw new Error(language === 'ar' ? 'صيغة Headers غير صالحة (يجب أن تكون JSON)' : 'Invalid Headers format (must be JSON)');
                    }

                    // Parse body for POST/PUT
                    let body: string | undefined;
                    if ((apiConfig.method === 'POST' || apiConfig.method === 'PUT') && apiConfig.body.trim()) {
                      try {
                        JSON.parse(apiConfig.body); // Validate JSON
                        body = apiConfig.body;
                      } catch {
                        throw new Error(language === 'ar' ? 'صيغة Body غير صالحة (يجب أن تكون JSON)' : 'Invalid Body format (must be JSON)');
                      }
                    }

                    // Make API request
                    const response = await fetch(apiConfig.url, {
                      method: apiConfig.method,
                      headers: {
                        'Accept': 'application/json',
                        ...headers
                      },
                      body: body
                    });

                    if (!response.ok) {
                      throw new Error(`${language === 'ar' ? 'خطأ في الاستجابة' : 'Response error'}: ${response.status} ${response.statusText}`);
                    }

                    const contentType = response.headers.get('content-type');
                    if (!contentType || !contentType.includes('application/json')) {
                      // Try to parse anyway
                      console.warn('Response content-type is not JSON:', contentType);
                    }

                    const jsonData = await response.json();

                    // Extract data using path
                    let data = jsonData;
                    if (apiConfig.dataPath.trim()) {
                      const paths = apiConfig.dataPath.split('.');
                      for (const path of paths) {
                        if (data && typeof data === 'object' && path in data) {
                          data = data[path];
                        } else {
                          throw new Error(language === 'ar' 
                            ? `المسار "${apiConfig.dataPath}" غير موجود في الاستجابة` 
                            : `Path "${apiConfig.dataPath}" not found in response`);
                        }
                      }
                    }

                    // Find array in response
                    if (!Array.isArray(data)) {
                      // Try to find an array in the response
                      const findArray = (obj: any, depth: number = 0): any[] | null => {
                        if (depth > 5) return null;
                        if (Array.isArray(obj)) return obj;
                        if (typeof obj === 'object' && obj !== null) {
                          for (const key of Object.keys(obj)) {
                            const result = findArray(obj[key], depth + 1);
                            if (result && result.length > 0) return result;
                          }
                        }
                        return null;
                      };
                      const foundArray = findArray(data);
                      if (foundArray) {
                        data = foundArray;
                      } else {
                        // If single object, wrap in array
                        data = [data];
                      }
                    }

                    if (!data || data.length === 0) {
                      throw new Error(language === 'ar' ? 'لم يتم العثور على بيانات في الاستجابة' : 'No data found in response');
                    }

                    // Extract columns
                    const columns = Object.keys(data[0]);
                    
                    // Analyze columns
                    const colInfo = analyzeColumns(data, columns);
                    setColumnInfo(colInfo);
                    setPreviewData(data.slice(0, 10));
                    setShowPreview(true);
                    onDataLoaded(data, columns);
                    
                    const successMsg = language === 'ar' 
                      ? `✅ تم جلب ${data.length.toLocaleString()} صف و ${columns.length} عمود من API`
                      : `✅ Fetched ${data.length.toLocaleString()} rows and ${columns.length} columns from API`;
                    setSuccess(successMsg);
                    notifySuccess(
                      language === 'ar' ? 'تم جلب البيانات' : 'Data Fetched',
                      `${data.length.toLocaleString()} ${language === 'ar' ? 'صف' : 'rows'}`,
                      'import',
                      'API'
                    );

                  } catch (err) {
                    console.error('API fetch error:', err);
                    const errorMsg = err instanceof Error ? err.message : (language === 'ar' ? 'خطأ غير معروف' : 'Unknown error');
                    setError(errorMsg);
                    notifyError(
                      language === 'ar' ? 'فشل جلب البيانات' : 'Fetch Failed',
                      errorMsg,
                      'import'
                    );
                  } finally {
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading || !apiConfig.url}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {isLoading 
                  ? (language === 'ar' ? 'جاري الجلب...' : 'Fetching...') 
                  : (language === 'ar' ? 'جلب البيانات' : 'Fetch Data')}
              </button>
              
              <button 
                onClick={() => {
                  setApiConfig({
                    url: '',
                    method: 'GET',
                    headers: '{"Content-Type": "application/json"}',
                    body: '',
                    dataPath: ''
                  });
                  setError(null);
                  setSuccess(null);
                }}
                className="flex items-center gap-2 px-4 py-3 border-2 border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
              </button>
            </div>
          </div>

          {/* Sample APIs */}
          <div className="bg-gradient-to-r from-gray-50 to-slate-50 rounded-xl p-6 border border-gray-200">
            <h4 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <span className="text-lg">🔗</span>
              {language === 'ar' ? 'أمثلة على APIs عامة للتجربة' : 'Sample Public APIs to Try'}
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { 
                  name: 'JSONPlaceholder - Users', 
                  url: 'https://jsonplaceholder.typicode.com/users',
                  path: '',
                  desc: language === 'ar' ? '10 مستخدمين' : '10 users'
                },
                { 
                  name: 'JSONPlaceholder - Posts', 
                  url: 'https://jsonplaceholder.typicode.com/posts',
                  path: '',
                  desc: language === 'ar' ? '100 منشور' : '100 posts'
                },
                { 
                  name: 'REST Countries', 
                  url: 'https://restcountries.com/v3.1/all',
                  path: '',
                  desc: language === 'ar' ? 'جميع الدول' : 'All countries'
                },
                { 
                  name: 'CoinGecko - Crypto', 
                  url: 'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&per_page=50',
                  path: '',
                  desc: language === 'ar' ? '50 عملة رقمية' : '50 cryptocurrencies'
                },
                { 
                  name: 'Open Library - Books', 
                  url: 'https://openlibrary.org/subjects/programming.json',
                  path: 'works',
                  desc: language === 'ar' ? 'كتب البرمجة' : 'Programming books'
                },
                { 
                  name: 'GitHub - Repos', 
                  url: 'https://api.github.com/users/facebook/repos',
                  path: '',
                  desc: language === 'ar' ? 'مستودعات Facebook' : 'Facebook repositories'
                }
              ].map(api => (
                <button
                  key={api.name}
                  onClick={() => setApiConfig({ 
                    ...apiConfig, 
                    url: api.url, 
                    dataPath: api.path,
                    method: 'GET'
                  })}
                  className="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-transparent hover:border-blue-300 hover:shadow-md transition-all group text-left"
                >
                  <div>
                    <span className="font-medium text-gray-800 group-hover:text-blue-600">{api.name}</span>
                    <span className="text-xs text-gray-500 block mt-1">{api.desc}</span>
                  </div>
                  <ExternalLink className="w-4 h-4 text-gray-400 group-hover:text-blue-500" />
                </button>
              ))}
            </div>
          </div>

          {/* CORS Notice */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-amber-800 text-sm mb-1">
                  {language === 'ar' ? 'ملاحظة حول CORS' : 'Note about CORS'}
                </h4>
                <p className="text-sm text-amber-700">
                  {language === 'ar' 
                    ? 'بعض APIs لا تدعم الوصول من المتصفح مباشرة (CORS). إذا واجهت مشكلة، يمكنك استخدام الخيارات الأخرى مثل تصدير البيانات كملف CSV.'
                    : 'Some APIs do not support browser access (CORS). If you encounter issues, you can use other options like exporting data as CSV.'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cloud Tab */}
      {activeTab === 'cloud' && (
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center">
              <Cloud className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800 mb-2">{t('cloud.title')}</h3>
            <p className="text-gray-500">{t('cloud.subtitle')}</p>
          </div>

          {/* Cloud Providers Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {[
              { id: 'google', name: 'Google Cloud', icon: '🔵', color: 'from-blue-500 to-blue-600', services: 'BigQuery, Storage, Sheets' },
              { id: 'aws', name: 'Amazon AWS', icon: '🟠', color: 'from-orange-500 to-orange-600', services: 'S3, Redshift, Athena' },
              { id: 'azure', name: 'Microsoft Azure', icon: '🔷', color: 'from-blue-600 to-blue-700', services: 'Blob, SQL, Synapse' },
              { id: 'snowflake', name: 'Snowflake', icon: '❄️', color: 'from-cyan-500 to-blue-500', services: 'Data Warehouse' },
              { id: 'mongodb', name: 'MongoDB Atlas', icon: '🍃', color: 'from-green-500 to-emerald-500', services: 'NoSQL Database' },
              { id: 'firebase', name: 'Firebase', icon: '🔥', color: 'from-orange-400 to-amber-500', services: 'Firestore, Realtime DB' },
              { id: 'supabase', name: 'Supabase', icon: '⚡', color: 'from-emerald-500 to-teal-600', services: 'PostgreSQL, Storage' },
              { id: 'api', name: 'REST API', icon: '🌐', color: 'from-purple-500 to-pink-500', services: 'Any HTTP Endpoint' }
            ].map(provider => (
              <button
                key={provider.id}
                onClick={() => setShowCloudModal(true)}
                className="p-5 bg-white border-2 border-gray-100 rounded-xl text-center hover:border-blue-300 hover:shadow-lg transition-all group"
              >
                <div className={`w-14 h-14 mx-auto mb-3 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                  <span className="text-2xl">{provider.icon}</span>
                </div>
                <span className="text-sm font-semibold text-gray-800 block">{provider.name}</span>
                <span className="text-xs text-gray-500 mt-1 block">{provider.services}</span>
              </button>
            ))}
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">🔐</span>
                </div>
                <h4 className="font-semibold text-blue-800">{t('cloud.secureConnection')}</h4>
              </div>
              <p className="text-sm text-blue-600">{t('cloud.secureConnectionDesc')}</p>
            </div>
            <div className="p-4 bg-green-50 rounded-xl border border-green-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">💾</span>
                </div>
                <h4 className="font-semibold text-green-800">{t('cloud.saveConnections')}</h4>
              </div>
              <p className="text-sm text-green-600">{t('cloud.saveConnectionsDesc')}</p>
            </div>
            <div className="p-4 bg-purple-50 rounded-xl border border-purple-100">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-lg">⚡</span>
                </div>
                <h4 className="font-semibold text-purple-800">{t('cloud.directQueries')}</h4>
              </div>
              <p className="text-sm text-purple-600">{t('cloud.directQueriesDesc')}</p>
            </div>
          </div>

          {/* Open Modal Button */}
          <div className="text-center">
            <button
              onClick={() => setShowCloudModal(true)}
              className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all shadow-lg hover:shadow-xl"
            >
              <Cloud className="w-5 h-5" />
              {t('cloud.openManager')}
            </button>
          </div>
        </div>
      )}

      {/* Cloud Providers Modal */}
      <CloudProvidersModal
        isOpen={showCloudModal}
        onClose={() => setShowCloudModal(false)}
        onDataLoaded={(data, source) => {
          const columns = data.length > 0 ? Object.keys(data[0]) : [];
          const colInfo = analyzeColumns(data, columns);
          setColumnInfo(colInfo);
          setPreviewData(data.slice(0, 10));
          setShowPreview(true);
          onDataLoaded(data, columns);
          setSuccess(
            language === 'ar'
              ? `تم تحميل ${data.length.toLocaleString()} صف من ${source}`
              : `Loaded ${data.length.toLocaleString()} rows from ${source}`
          );
          setShowCloudModal(false);
        }}
      />

      {/* Data Preview */}
      {showPreview && previewData && previewData.length > 0 && (
        <div className="bg-white border rounded-xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b bg-gray-50">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              {t('upload.preview')}
            </h3>
            <button
              onClick={() => setShowPreview(false)}
              className="p-1 hover:bg-gray-200 rounded"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Column Info */}
          {columnInfo.length > 0 && (
            <div className="p-4 border-b bg-gray-50">
              <h4 className="text-sm font-medium text-gray-600 mb-3 flex items-center gap-2">
                <Columns className="w-4 h-4" />
                {t('upload.columnInfo')}
              </h4>
              <div className="flex flex-wrap gap-2">
                {columnInfo.map(col => (
                  <div
                    key={col.name}
                    className="flex items-center gap-2 px-3 py-1.5 bg-white border rounded-lg text-sm"
                  >
                    {getTypeIcon(col.type)}
                    <span className="font-medium">{col.name}</span>
                    {col.nullCount > 0 && (
                      <span className="text-xs text-orange-500">({col.nullCount} null)</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Table */}
          <div className="overflow-x-auto max-h-80">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 sticky top-0">
                <tr>
                  <th className={`px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} font-medium text-gray-600 border-b`}>#</th>
                  {Object.keys(previewData[0]).map(col => (
                    <th key={col} className={`px-4 py-2 ${isRTL ? 'text-right' : 'text-left'} font-medium text-gray-600 border-b whitespace-nowrap`}>
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-2 border-b text-gray-400">{idx + 1}</td>
                    {Object.values(row).map((val: any, i) => (
                      <td key={i} className="px-4 py-2 border-b text-gray-700 whitespace-nowrap">
                        {val === null || val === undefined ? (
                          <span className="text-gray-400 italic">null</span>
                        ) : (
                          String(val)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="p-3 border-t bg-gray-50 text-center text-sm text-gray-500">
            {t('upload.showingFirst10')}
          </div>
        </div>
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-8 shadow-2xl text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-700 font-medium">{t('message.loading')}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataUpload;
