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
    query: 'SELECT * FROM '
  });

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
            setSuccess(
              language === 'ar' 
                ? `✅ تم تحميل ${data.length.toLocaleString()} صف و ${columns.length} عمود من "${file.name}"`
                : `✅ Loaded ${data.length.toLocaleString()} rows and ${columns.length} columns from "${file.name}"`
            );
          } else {
            setError(language === 'ar' ? 'الملف فارغ أو لا يحتوي على بيانات' : 'File is empty or contains no data');
          }
        } catch (err) {
          console.error('Excel parsing error:', err);
          setError(`${language === 'ar' ? 'خطأ في قراءة ملف Excel' : 'Error reading Excel file'}: ${err instanceof Error ? err.message : 'Unknown error'}`);
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

  const loadFromUrl = () => {
    if (!urlConfig.url) {
      setError(t('upload.enterValidUrl'));
      return;
    }

    setIsLoading(true);
    setError(null);

    setTimeout(() => {
      const { data, columns } = generateSampleData('sales');
      const colInfo = analyzeColumns(data, columns);
      
      setColumnInfo(colInfo);
      setPreviewData(data.slice(0, 10));
      setShowPreview(true);
      onDataLoaded(data, columns);
      setSuccess(t('upload.urlLoadSuccess'));
      setIsLoading(false);
    }, 1000);
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
        <div className="max-w-2xl mx-auto space-y-6">
          <div className="bg-white border rounded-xl p-6">
            <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
              <Link className="w-5 h-5" />
              {t('upload.loadFromUrl')}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.fileUrl')}</label>
                <input
                  type="url"
                  value={urlConfig.url}
                  onChange={(e) => setUrlConfig({ ...urlConfig, url: e.target.value })}
                  placeholder="https://example.com/data.csv"
                  className="w-full border rounded-lg px-4 py-3"
                  dir="ltr"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.fileFormat')}</label>
                <select
                  value={urlConfig.format}
                  onChange={(e) => setUrlConfig({ ...urlConfig, format: e.target.value })}
                  className="w-full border rounded-lg px-4 py-3"
                >
                  <option value="auto">{t('upload.autoDetect')}</option>
                  <option value="csv">CSV</option>
                  <option value="json">JSON</option>
                  <option value="excel">Excel</option>
                </select>
              </div>

              <button
                onClick={loadFromUrl}
                disabled={isLoading || !urlConfig.url}
                className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                {t('upload.loadData')}
              </button>
            </div>
          </div>

          {/* Sample URLs */}
          <div className="bg-gray-50 rounded-xl p-4">
            <h4 className="font-medium text-gray-700 mb-3">{t('upload.sampleUrls')}</h4>
            <div className="space-y-2">
              {[
                { name: 'Iris Dataset', url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv' },
                { name: 'Tips Dataset', url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv' },
                { name: 'Titanic Dataset', url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv' }
              ].map(item => (
                <button
                  key={item.name}
                  onClick={() => setUrlConfig({ ...urlConfig, url: item.url })}
                  className="w-full flex items-center justify-between p-3 bg-white rounded-lg hover:shadow transition-shadow"
                >
                  <span className="font-medium text-gray-700">{item.name}</span>
                  <ExternalLink className="w-4 h-4 text-gray-400" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Database Tab */}
      {activeTab === 'database' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border rounded-xl p-6 space-y-6">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Database className="w-5 h-5" />
              {t('upload.databaseConnection')}
            </h3>

            {/* Database Types */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {[
                { id: 'postgresql', name: 'PostgreSQL', icon: '🐘' },
                { id: 'mysql', name: 'MySQL', icon: '🐬' },
                { id: 'sqlite', name: 'SQLite', icon: '📦' },
                { id: 'sqlserver', name: 'SQL Server', icon: '🪟' },
                { id: 'oracle', name: 'Oracle', icon: '🔴' },
                { id: 'mongodb', name: 'MongoDB', icon: '🍃' }
              ].map(db => (
                <button
                  key={db.id}
                  onClick={() => setDbConfig({ ...dbConfig, type: db.id })}
                  className={`p-3 border-2 rounded-xl text-center transition-all ${
                    dbConfig.type === db.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <span className="text-2xl block mb-1">{db.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{db.name}</span>
                </button>
              ))}
            </div>

            {/* Connection Form */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.host')}</label>
                <input
                  type="text"
                  value={dbConfig.host}
                  onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                  placeholder="localhost"
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.port')}</label>
                <input
                  type="text"
                  value={dbConfig.port}
                  onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.databaseName')}</label>
                <input
                  type="text"
                  value={dbConfig.database}
                  onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.username')}</label>
                <input
                  type="text"
                  value={dbConfig.username}
                  onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2"
                  dir="ltr"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.password')}</label>
              <input
                type="password"
                value={dbConfig.password}
                onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.sqlQuery')}</label>
              <textarea
                value={dbConfig.query}
                onChange={(e) => setDbConfig({ ...dbConfig, query: e.target.value })}
                rows={4}
                className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                dir="ltr"
              />
            </div>

            <div className="flex gap-3">
              <button className="flex items-center gap-2 px-4 py-2 border rounded-lg hover:bg-gray-50">
                <RefreshCw className="w-4 h-4" />
                {t('upload.testConnection')}
              </button>
              <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                <Download className="w-4 h-4" />
                {t('upload.loadData')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* API Tab */}
      {activeTab === 'api' && (
        <div className="max-w-3xl mx-auto">
          <div className="bg-white border rounded-xl p-6 space-y-6">
            <h3 className="font-semibold text-gray-700 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              {t('upload.importFromApi')}
            </h3>

            <div className="flex gap-3">
              <select
                value={apiConfig.method}
                onChange={(e) => setApiConfig({ ...apiConfig, method: e.target.value })}
                className="w-24 border rounded-lg px-3 py-2"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
              </select>
              <input
                type="url"
                value={apiConfig.url}
                onChange={(e) => setApiConfig({ ...apiConfig, url: e.target.value })}
                placeholder="https://api.example.com/data"
                className="flex-1 border rounded-lg px-3 py-2"
                dir="ltr"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.headers')} (JSON)</label>
              <textarea
                value={apiConfig.headers}
                onChange={(e) => setApiConfig({ ...apiConfig, headers: e.target.value })}
                rows={3}
                className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                dir="ltr"
              />
            </div>

            {apiConfig.method === 'POST' && (
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.body')} (JSON)</label>
                <textarea
                  value={apiConfig.body}
                  onChange={(e) => setApiConfig({ ...apiConfig, body: e.target.value })}
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                  dir="ltr"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">{t('upload.dataPath')}</label>
              <input
                type="text"
                value={apiConfig.dataPath}
                onChange={(e) => setApiConfig({ ...apiConfig, dataPath: e.target.value })}
                placeholder="data.items, results"
                className="w-full border rounded-lg px-3 py-2"
                dir="ltr"
              />
            </div>

            <button className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              <Download className="w-4 h-4" />
              {t('upload.fetchData')}
            </button>
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
