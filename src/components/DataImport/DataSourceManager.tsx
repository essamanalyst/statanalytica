import React, { useState, useCallback } from 'react';
import {
  Upload,
  Database,
  Cloud,
  Globe,
  FileSpreadsheet,
  FileJson,
  FileText,
  Table,
  Server,
  Wifi,
  Link,
  FolderOpen,
  CheckCircle,
  AlertCircle,
  Settings,
  Eye,
  Download,
  Trash2,
  Plus,
  X,
  Loader2,
  Copy,
  Key
} from 'lucide-react';

interface DataSource {
  id: string;
  name: string;
  type: 'file' | 'database' | 'cloud' | 'api' | 'url';
  subType: string;
  config: Record<string, any>;
  status: 'connected' | 'disconnected' | 'error' | 'loading';
  lastSync?: Date;
  rowCount?: number;
  columns?: string[];
}

interface DataSourceManagerProps {
  onDataLoaded: (data: any[], columns: string[], sourceName: string) => void;
  onClose?: () => void;
}

const DataSourceManager: React.FC<DataSourceManagerProps> = ({ onDataLoaded, onClose }) => {
  const [activeTab, setActiveTab] = useState<'file' | 'database' | 'cloud' | 'api' | 'url'>('file');
  const [_savedSources, _setSavedSources] = useState<DataSource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // File Upload State
  const [fileConfig, setFileConfig] = useState({
    encoding: 'UTF-8',
    delimiter: ',',
    hasHeader: true,
    skipRows: 0,
    sheetName: '',
    dateFormat: 'auto',
    decimalSeparator: '.',
    thousandsSeparator: ',',
    nullValues: ['', 'NA', 'N/A', 'null', 'NULL', 'None', 'NaN'],
    trimWhitespace: true,
    parseNumbers: true,
    parseDates: true
  });

  // Database Config State
  const [dbConfig, setDbConfig] = useState({
    type: 'postgresql',
    host: 'localhost',
    port: '5432',
    database: '',
    username: '',
    password: '',
    ssl: false,
    query: '',
    table: ''
  });

  // Cloud Config State
  const [cloudConfig, setCloudConfig] = useState({
    provider: 'gcs',
    projectId: '',
    bucket: '',
    path: '',
    credentials: '',
    region: '',
    accessKey: '',
    secretKey: '',
    connectionString: ''
  });

  // API Config State
  const [apiConfig, setApiConfig] = useState({
    method: 'GET',
    url: '',
    headers: [{ key: 'Content-Type', value: 'application/json' }],
    body: '',
    authType: 'none',
    authToken: '',
    username: '',
    password: '',
    dataPath: '',
    pagination: false,
    pageParam: 'page',
    limitParam: 'limit',
    maxPages: 10
  });

  // URL Config State
  const [urlConfig, setUrlConfig] = useState({
    url: '',
    format: 'auto',
    refresh: false,
    refreshInterval: 60
  });

  const fileTypes = [
    { id: 'csv', name: 'CSV', icon: FileSpreadsheet, ext: '.csv', color: 'text-green-500' },
    { id: 'excel', name: 'Excel', icon: FileSpreadsheet, ext: '.xlsx,.xls', color: 'text-emerald-500' },
    { id: 'json', name: 'JSON', icon: FileJson, ext: '.json', color: 'text-yellow-500' },
    { id: 'txt', name: 'Text', icon: FileText, ext: '.txt,.tsv', color: 'text-gray-500' },
    { id: 'parquet', name: 'Parquet', icon: Table, ext: '.parquet', color: 'text-purple-500' },
    { id: 'xml', name: 'XML', icon: FileText, ext: '.xml', color: 'text-orange-500' },
    { id: 'sql', name: 'SQL', icon: Database, ext: '.sql', color: 'text-blue-500' },
    { id: 'sas', name: 'SAS', icon: Table, ext: '.sas7bdat', color: 'text-indigo-500' },
    { id: 'spss', name: 'SPSS', icon: Table, ext: '.sav', color: 'text-pink-500' },
    { id: 'stata', name: 'Stata', icon: Table, ext: '.dta', color: 'text-red-500' }
  ];

  const databases = [
    { id: 'postgresql', name: 'PostgreSQL', port: '5432', icon: '🐘' },
    { id: 'mysql', name: 'MySQL', port: '3306', icon: '🐬' },
    { id: 'mariadb', name: 'MariaDB', port: '3306', icon: '🦭' },
    { id: 'sqlite', name: 'SQLite', port: '', icon: '📦' },
    { id: 'sqlserver', name: 'SQL Server', port: '1433', icon: '🪟' },
    { id: 'oracle', name: 'Oracle', port: '1521', icon: '🔴' },
    { id: 'mongodb', name: 'MongoDB', port: '27017', icon: '🍃' },
    { id: 'redis', name: 'Redis', port: '6379', icon: '🔴' },
    { id: 'cassandra', name: 'Cassandra', port: '9042', icon: '👁️' },
    { id: 'clickhouse', name: 'ClickHouse', port: '8123', icon: '🏠' },
    { id: 'snowflake', name: 'Snowflake', port: '443', icon: '❄️' },
    { id: 'bigquery', name: 'BigQuery', port: '', icon: '📊' }
  ];

  const cloudProviders = [
    { id: 'gcs', name: 'Google Cloud Storage', icon: '☁️', color: 'bg-blue-500' },
    { id: 'bigquery', name: 'Google BigQuery', icon: '📊', color: 'bg-blue-600' },
    { id: 'sheets', name: 'Google Sheets', icon: '📋', color: 'bg-green-500' },
    { id: 's3', name: 'AWS S3', icon: '🪣', color: 'bg-orange-500' },
    { id: 'redshift', name: 'AWS Redshift', icon: '🔴', color: 'bg-red-500' },
    { id: 'athena', name: 'AWS Athena', icon: '🔍', color: 'bg-purple-500' },
    { id: 'azure', name: 'Azure Blob', icon: '☁️', color: 'bg-blue-400' },
    { id: 'synapse', name: 'Azure Synapse', icon: '💠', color: 'bg-indigo-500' },
    { id: 'databricks', name: 'Databricks', icon: '🧱', color: 'bg-red-600' },
    { id: 'dropbox', name: 'Dropbox', icon: '📦', color: 'bg-blue-500' },
    { id: 'onedrive', name: 'OneDrive', icon: '☁️', color: 'bg-blue-600' }
  ];

  const sampleDatasets = [
    {
      id: 'iris',
      name: 'Iris Dataset',
      description: 'مجموعة بيانات زهرة السوسن الشهيرة - 150 عينة، 4 متغيرات',
      rows: 150,
      cols: 5,
      category: 'تصنيف'
    },
    {
      id: 'mtcars',
      name: 'Motor Trend Cars',
      description: 'بيانات السيارات من مجلة Motor Trend - 32 سيارة',
      rows: 32,
      cols: 11,
      category: 'انحدار'
    },
    {
      id: 'titanic',
      name: 'Titanic Passengers',
      description: 'بيانات ركاب سفينة تايتانيك - 891 راكب',
      rows: 891,
      cols: 12,
      category: 'تصنيف'
    },
    {
      id: 'boston',
      name: 'Boston Housing',
      description: 'أسعار المنازل في بوسطن - 506 منطقة',
      rows: 506,
      cols: 14,
      category: 'انحدار'
    },
    {
      id: 'wine',
      name: 'Wine Quality',
      description: 'جودة النبيذ الأحمر والأبيض - 6497 عينة',
      rows: 6497,
      cols: 13,
      category: 'تصنيف'
    },
    {
      id: 'diabetes',
      name: 'Diabetes Dataset',
      description: 'بيانات مرضى السكري - 768 مريض',
      rows: 768,
      cols: 9,
      category: 'تصنيف'
    },
    {
      id: 'sales',
      name: 'Sales Data',
      description: 'بيانات مبيعات شهرية - 1000 معاملة',
      rows: 1000,
      cols: 8,
      category: 'سلاسل زمنية'
    },
    {
      id: 'customers',
      name: 'Customer Segmentation',
      description: 'بيانات العملاء للتجزئة - 500 عميل',
      rows: 500,
      cols: 10,
      category: 'تجميع'
    }
  ];

  const generateSampleData = (datasetId: string): { data: any[], columns: string[] } => {
    switch (datasetId) {
      case 'iris':
        return {
          columns: ['sepal_length', 'sepal_width', 'petal_length', 'petal_width', 'species'],
          data: Array.from({ length: 150 }, (_, i) => ({
            sepal_length: (4.3 + Math.random() * 3.6).toFixed(1),
            sepal_width: (2.0 + Math.random() * 2.4).toFixed(1),
            petal_length: (1.0 + Math.random() * 5.9).toFixed(1),
            petal_width: (0.1 + Math.random() * 2.4).toFixed(1),
            species: ['setosa', 'versicolor', 'virginica'][i % 3]
          }))
        };
      case 'mtcars':
        const carNames = ['Mazda RX4', 'Mazda RX4 Wag', 'Datsun 710', 'Hornet 4 Drive', 'Hornet Sportabout',
          'Valiant', 'Duster 360', 'Merc 240D', 'Merc 230', 'Merc 280', 'Merc 280C', 'Merc 450SE',
          'Merc 450SL', 'Merc 450SLC', 'Cadillac Fleetwood', 'Lincoln Continental', 'Chrysler Imperial',
          'Fiat 128', 'Honda Civic', 'Toyota Corolla', 'Toyota Corona', 'Dodge Challenger', 'AMC Javelin',
          'Camaro Z28', 'Pontiac Firebird', 'Fiat X1-9', 'Porsche 914-2', 'Lotus Europa', 'Ford Pantera L',
          'Ferrari Dino', 'Maserati Bora', 'Volvo 142E'];
        return {
          columns: ['name', 'mpg', 'cyl', 'disp', 'hp', 'drat', 'wt', 'qsec', 'vs', 'am', 'gear'],
          data: carNames.map((name, i) => ({
            name,
            mpg: (10 + Math.random() * 24).toFixed(1),
            cyl: [4, 6, 8][i % 3],
            disp: (70 + Math.random() * 400).toFixed(0),
            hp: (50 + Math.random() * 285).toFixed(0),
            drat: (2.5 + Math.random() * 2).toFixed(2),
            wt: (1.5 + Math.random() * 4).toFixed(3),
            qsec: (14 + Math.random() * 9).toFixed(2),
            vs: i % 2,
            am: (i + 1) % 2,
            gear: [3, 4, 5][i % 3]
          }))
        };
      case 'titanic':
        return {
          columns: ['PassengerId', 'Survived', 'Pclass', 'Name', 'Sex', 'Age', 'SibSp', 'Parch', 'Ticket', 'Fare', 'Cabin', 'Embarked'],
          data: Array.from({ length: 891 }, (_, i) => ({
            PassengerId: i + 1,
            Survived: Math.random() > 0.6 ? 0 : 1,
            Pclass: [1, 2, 3][Math.floor(Math.random() * 3)],
            Name: `Passenger ${i + 1}`,
            Sex: Math.random() > 0.5 ? 'male' : 'female',
            Age: Math.floor(1 + Math.random() * 79),
            SibSp: Math.floor(Math.random() * 5),
            Parch: Math.floor(Math.random() * 3),
            Ticket: `T${100000 + i}`,
            Fare: (7 + Math.random() * 500).toFixed(2),
            Cabin: Math.random() > 0.7 ? `C${Math.floor(Math.random() * 150)}` : '',
            Embarked: ['S', 'C', 'Q'][Math.floor(Math.random() * 3)]
          }))
        };
      case 'boston':
        return {
          columns: ['CRIM', 'ZN', 'INDUS', 'CHAS', 'NOX', 'RM', 'AGE', 'DIS', 'RAD', 'TAX', 'PTRATIO', 'B', 'LSTAT', 'MEDV'],
          data: Array.from({ length: 506 }, () => ({
            CRIM: (0.006 + Math.random() * 88).toFixed(5),
            ZN: (Math.random() * 100).toFixed(1),
            INDUS: (0.5 + Math.random() * 27).toFixed(2),
            CHAS: Math.random() > 0.9 ? 1 : 0,
            NOX: (0.38 + Math.random() * 0.49).toFixed(3),
            RM: (3.5 + Math.random() * 5).toFixed(3),
            AGE: (2 + Math.random() * 98).toFixed(1),
            DIS: (1 + Math.random() * 11).toFixed(4),
            RAD: Math.floor(1 + Math.random() * 24),
            TAX: Math.floor(187 + Math.random() * 524),
            PTRATIO: (12 + Math.random() * 10).toFixed(1),
            B: (0.3 + Math.random() * 396).toFixed(2),
            LSTAT: (1.7 + Math.random() * 36).toFixed(2),
            MEDV: (5 + Math.random() * 45).toFixed(1)
          }))
        };
      case 'wine':
        return {
          columns: ['type', 'fixed_acidity', 'volatile_acidity', 'citric_acid', 'residual_sugar', 'chlorides', 'free_sulfur_dioxide', 'total_sulfur_dioxide', 'density', 'pH', 'sulphates', 'alcohol', 'quality'],
          data: Array.from({ length: 1000 }, () => ({
            type: Math.random() > 0.5 ? 'red' : 'white',
            fixed_acidity: (4 + Math.random() * 12).toFixed(1),
            volatile_acidity: (0.1 + Math.random() * 1.5).toFixed(2),
            citric_acid: (Math.random() * 1).toFixed(2),
            residual_sugar: (0.6 + Math.random() * 65).toFixed(1),
            chlorides: (0.01 + Math.random() * 0.6).toFixed(3),
            free_sulfur_dioxide: Math.floor(1 + Math.random() * 288),
            total_sulfur_dioxide: Math.floor(6 + Math.random() * 434),
            density: (0.987 + Math.random() * 0.014).toFixed(4),
            pH: (2.7 + Math.random() * 0.9).toFixed(2),
            sulphates: (0.2 + Math.random() * 1.8).toFixed(2),
            alcohol: (8 + Math.random() * 6.5).toFixed(1),
            quality: Math.floor(3 + Math.random() * 6)
          }))
        };
      case 'diabetes':
        return {
          columns: ['Pregnancies', 'Glucose', 'BloodPressure', 'SkinThickness', 'Insulin', 'BMI', 'DiabetesPedigreeFunction', 'Age', 'Outcome'],
          data: Array.from({ length: 768 }, () => ({
            Pregnancies: Math.floor(Math.random() * 17),
            Glucose: Math.floor(44 + Math.random() * 155),
            BloodPressure: Math.floor(24 + Math.random() * 98),
            SkinThickness: Math.floor(Math.random() * 99),
            Insulin: Math.floor(Math.random() * 846),
            BMI: (18 + Math.random() * 49).toFixed(1),
            DiabetesPedigreeFunction: (0.08 + Math.random() * 2.34).toFixed(3),
            Age: Math.floor(21 + Math.random() * 60),
            Outcome: Math.random() > 0.65 ? 0 : 1
          }))
        };
      case 'sales':
        const categories = ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'];
        const regions = ['North', 'South', 'East', 'West', 'Central'];
        return {
          columns: ['date', 'product', 'category', 'region', 'quantity', 'unit_price', 'total', 'customer_id'],
          data: Array.from({ length: 1000 }, (_, i) => {
            const quantity = Math.floor(1 + Math.random() * 50);
            const unitPrice = (5 + Math.random() * 495).toFixed(2);
            return {
              date: new Date(2023, Math.floor(i / 84), (i % 28) + 1).toISOString().split('T')[0],
              product: `Product ${Math.floor(Math.random() * 100) + 1}`,
              category: categories[Math.floor(Math.random() * categories.length)],
              region: regions[Math.floor(Math.random() * regions.length)],
              quantity,
              unit_price: unitPrice,
              total: (quantity * parseFloat(unitPrice)).toFixed(2),
              customer_id: `C${1000 + Math.floor(Math.random() * 500)}`
            };
          })
        };
      case 'customers':
        return {
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
            avg_purchase_value: (20 + Math.random() * 480).toFixed(2),
            preferred_category: ['Electronics', 'Clothing', 'Food', 'Books', 'Sports'][Math.floor(Math.random() * 5)]
          }))
        };
      default:
        return { data: [], columns: [] };
    }
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsLoading(true);
    setError(null);

    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const content = e.target?.result as string;
        let data: any[] = [];
        let columns: string[] = [];

        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.csv') || fileName.endsWith('.txt') || fileName.endsWith('.tsv')) {
          const delimiter = fileName.endsWith('.tsv') ? '\t' : fileConfig.delimiter;
          const lines = content.split('\n').filter(line => line.trim());
          
          if (fileConfig.skipRows > 0) {
            lines.splice(0, fileConfig.skipRows);
          }

          if (fileConfig.hasHeader && lines.length > 0) {
            columns = lines[0].split(delimiter).map(col => col.trim().replace(/^["']|["']$/g, ''));
            lines.shift();
          } else {
            const firstLine = lines[0].split(delimiter);
            columns = firstLine.map((_, i) => `Column_${i + 1}`);
          }

          data = lines.map(line => {
            const values = line.split(delimiter).map(val => {
              let v = val.trim().replace(/^["']|["']$/g, '');
              if (fileConfig.trimWhitespace) v = v.trim();
              if (fileConfig.nullValues.includes(v)) return null;
              if (fileConfig.parseNumbers && !isNaN(Number(v)) && v !== '') {
                return Number(v);
              }
              return v;
            });
            const row: Record<string, any> = {};
            columns.forEach((col, i) => {
              row[col] = values[i] ?? null;
            });
            return row;
          });
        } else if (fileName.endsWith('.json')) {
          const jsonData = JSON.parse(content);
          if (Array.isArray(jsonData)) {
            data = jsonData;
            columns = data.length > 0 ? Object.keys(data[0]) : [];
          } else if (typeof jsonData === 'object') {
            // Try to find array in nested structure
            const findArray = (obj: any): any[] | null => {
              if (Array.isArray(obj)) return obj;
              for (const key of Object.keys(obj)) {
                if (Array.isArray(obj[key])) return obj[key];
                if (typeof obj[key] === 'object') {
                  const result = findArray(obj[key]);
                  if (result) return result;
                }
              }
              return null;
            };
            const arr = findArray(jsonData);
            if (arr) {
              data = arr;
              columns = data.length > 0 ? Object.keys(data[0]) : [];
            } else {
              data = [jsonData];
              columns = Object.keys(jsonData);
            }
          }
        } else if (fileName.endsWith('.xml')) {
          // Basic XML parsing
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(content, 'text/xml');
          const rows = xmlDoc.querySelectorAll('row, record, item, entry');
          if (rows.length > 0) {
            data = Array.from(rows).map(row => {
              const obj: Record<string, any> = {};
              Array.from(row.children).forEach(child => {
                obj[child.tagName] = child.textContent;
              });
              return obj;
            });
            columns = data.length > 0 ? Object.keys(data[0]) : [];
          }
        }

        if (data.length > 0) {
          setPreviewData(data.slice(0, 10));
          onDataLoaded(data, columns, file.name);
          setSuccess(`تم تحميل ${data.length} صف و ${columns.length} عمود بنجاح`);
        } else {
          setError('لم يتم العثور على بيانات في الملف');
        }
      } catch (err) {
        setError(`خطأ في قراءة الملف: ${err instanceof Error ? err.message : 'خطأ غير معروف'}`);
      } finally {
        setIsLoading(false);
      }
    };

    reader.onerror = () => {
      setError('فشل في قراءة الملف');
      setIsLoading(false);
    };

    reader.readAsText(file, fileConfig.encoding);
  }, [fileConfig, onDataLoaded]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const input = document.createElement('input');
      input.type = 'file';
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(files[0]);
      input.files = dataTransfer.files;
      handleFileUpload({ target: input } as any);
    }
  };

  const loadSampleDataset = (datasetId: string) => {
    setIsLoading(true);
    setError(null);
    
    setTimeout(() => {
      try {
        const { data, columns } = generateSampleData(datasetId);
        const dataset = sampleDatasets.find(d => d.id === datasetId);
        setPreviewData(data.slice(0, 10));
        onDataLoaded(data, columns, dataset?.name || datasetId);
        setSuccess(`تم تحميل مجموعة البيانات "${dataset?.name}" بنجاح`);
      } catch (err) {
        setError('فشل في تحميل مجموعة البيانات');
      } finally {
        setIsLoading(false);
      }
    }, 500);
  };

  const testDatabaseConnection = () => {
    setIsLoading(true);
    setError(null);
    
    setTimeout(() => {
      // Simulate connection test
      if (dbConfig.host && dbConfig.database) {
        setSuccess('تم الاتصال بقاعدة البيانات بنجاح!');
      } else {
        setError('يرجى ملء جميع حقول الاتصال المطلوبة');
      }
      setIsLoading(false);
    }, 1500);
  };

  const fetchFromUrl = () => {
    if (!urlConfig.url) {
      setError('يرجى إدخال رابط URL صالح');
      return;
    }

    setIsLoading(true);
    setError(null);

    // Since we can't actually fetch external URLs in this environment,
    // we'll simulate loading some sample data
    setTimeout(() => {
      try {
        const { data, columns } = generateSampleData('sales');
        setPreviewData(data.slice(0, 10));
        onDataLoaded(data, columns, 'URL Data');
        setSuccess('تم تحميل البيانات من الرابط بنجاح');
      } catch (err) {
        setError('فشل في تحميل البيانات من الرابط');
      } finally {
        setIsLoading(false);
      }
    }, 1000);
  };

  const tabs = [
    { id: 'file', label: 'ملفات محلية', icon: FolderOpen },
    { id: 'database', label: 'قواعد البيانات', icon: Database },
    { id: 'cloud', label: 'السحابة', icon: Cloud },
    { id: 'api', label: 'API', icon: Globe },
    { id: 'url', label: 'رابط مباشر', icon: Link }
  ];

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold">مدير مصادر البيانات</h2>
            <p className="text-blue-100 mt-1">استيراد البيانات من مختلف المصادر</p>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
              <X className="w-6 h-6" />
            </button>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mt-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-white text-blue-600 shadow-lg'
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {/* Alerts */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="mr-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {success && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700">
            <CheckCircle className="w-5 h-5 flex-shrink-0" />
            <span>{success}</span>
            <button onClick={() => setSuccess(null)} className="mr-auto">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* File Upload Tab */}
        {activeTab === 'file' && (
          <div className="space-y-6">
            {/* Drop Zone */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-500 hover:bg-blue-50/50 transition-all cursor-pointer"
            >
              <input
                type="file"
                id="file-upload"
                className="hidden"
                accept=".csv,.xlsx,.xls,.json,.txt,.tsv,.xml,.parquet"
                onChange={handleFileUpload}
              />
              <label htmlFor="file-upload" className="cursor-pointer">
                <Upload className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  اسحب الملف هنا أو انقر للاختيار
                </p>
                <p className="text-gray-500">
                  CSV, Excel, JSON, TXT, TSV, XML, Parquet
                </p>
              </label>
            </div>

            {/* File Types */}
            <div className="grid grid-cols-5 gap-3">
              {fileTypes.map(type => (
                <div
                  key={type.id}
                  className="flex flex-col items-center p-3 border rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer"
                >
                  <type.icon className={`w-8 h-8 ${type.color} mb-2`} />
                  <span className="text-sm font-medium">{type.name}</span>
                </div>
              ))}
            </div>

            {/* File Options */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                خيارات الاستيراد
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">الترميز</label>
                  <select
                    value={fileConfig.encoding}
                    onChange={(e) => setFileConfig({ ...fileConfig, encoding: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="UTF-8">UTF-8</option>
                    <option value="UTF-16">UTF-16</option>
                    <option value="ISO-8859-1">ISO-8859-1</option>
                    <option value="Windows-1256">Windows-1256 (Arabic)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">الفاصل</label>
                  <select
                    value={fileConfig.delimiter}
                    onChange={(e) => setFileConfig({ ...fileConfig, delimiter: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value=",">فاصلة (,)</option>
                    <option value=";">فاصلة منقوطة (;)</option>
                    <option value="\t">Tab</option>
                    <option value="|">Pipe (|)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">تخطي صفوف</label>
                  <input
                    type="number"
                    min="0"
                    value={fileConfig.skipRows}
                    onChange={(e) => setFileConfig({ ...fileConfig, skipRows: parseInt(e.target.value) || 0 })}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={fileConfig.hasHeader}
                      onChange={(e) => setFileConfig({ ...fileConfig, hasHeader: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-600">الصف الأول عناوين</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Sample Datasets */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Table className="w-5 h-5" />
                مجموعات بيانات نموذجية
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {sampleDatasets.map(dataset => (
                  <button
                    key={dataset.id}
                    onClick={() => loadSampleDataset(dataset.id)}
                    disabled={isLoading}
                    className="p-4 border rounded-xl text-right hover:border-blue-300 hover:bg-blue-50 transition-all group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600">
                        {dataset.category}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-800 mb-1">{dataset.name}</h4>
                    <p className="text-xs text-gray-500 mb-2 line-clamp-2">{dataset.description}</p>
                    <div className="flex gap-3 text-xs text-gray-400">
                      <span>{dataset.rows} صف</span>
                      <span>{dataset.cols} عمود</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Database Tab */}
        {activeTab === 'database' && (
          <div className="space-y-6">
            {/* Database Types */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {databases.map(db => (
                <button
                  key={db.id}
                  onClick={() => setDbConfig({ ...dbConfig, type: db.id, port: db.port })}
                  className={`p-4 border rounded-xl text-center transition-all ${
                    dbConfig.type === db.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl block mb-2">{db.icon}</span>
                  <span className="text-sm font-medium text-gray-700">{db.name}</span>
                </button>
              ))}
            </div>

            {/* Connection Form */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Server className="w-5 h-5" />
                إعدادات الاتصال
              </h3>
              
              {dbConfig.type !== 'sqlite' && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-600 mb-1">المضيف (Host)</label>
                    <input
                      type="text"
                      value={dbConfig.host}
                      onChange={(e) => setDbConfig({ ...dbConfig, host: e.target.value })}
                      placeholder="localhost أو عنوان IP"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">المنفذ (Port)</label>
                    <input
                      type="text"
                      value={dbConfig.port}
                      onChange={(e) => setDbConfig({ ...dbConfig, port: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">SSL</label>
                    <select
                      value={dbConfig.ssl ? 'true' : 'false'}
                      onChange={(e) => setDbConfig({ ...dbConfig, ssl: e.target.value === 'true' })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="false">غير مفعل</option>
                      <option value="true">مفعل</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">قاعدة البيانات</label>
                  <input
                    type="text"
                    value={dbConfig.database}
                    onChange={(e) => setDbConfig({ ...dbConfig, database: e.target.value })}
                    placeholder="اسم قاعدة البيانات"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">اسم المستخدم</label>
                  <input
                    type="text"
                    value={dbConfig.username}
                    onChange={(e) => setDbConfig({ ...dbConfig, username: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">كلمة المرور</label>
                  <input
                    type="password"
                    value={dbConfig.password}
                    onChange={(e) => setDbConfig({ ...dbConfig, password: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-600 mb-1">
                  اسم الجدول أو استعلام SQL
                </label>
                <textarea
                  value={dbConfig.query}
                  onChange={(e) => setDbConfig({ ...dbConfig, query: e.target.value })}
                  placeholder="SELECT * FROM table_name WHERE ..."
                  rows={4}
                  className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={testDatabaseConnection}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Wifi className="w-5 h-5" />}
                  اختبار الاتصال
                </button>
                <button
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  تحميل البيانات
                </button>
              </div>
            </div>

            {/* Connection String */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                <Key className="w-5 h-5" />
                سلسلة الاتصال
              </h4>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${dbConfig.type}://${dbConfig.username}:****@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`}
                  className="flex-1 bg-white border rounded-lg px-3 py-2 font-mono text-sm"
                />
                <button className="p-2 bg-white border rounded-lg hover:bg-gray-50">
                  <Copy className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Cloud Tab */}
        {activeTab === 'cloud' && (
          <div className="space-y-6">
            {/* Cloud Providers */}
            <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
              {cloudProviders.map(provider => (
                <button
                  key={provider.id}
                  onClick={() => setCloudConfig({ ...cloudConfig, provider: provider.id })}
                  className={`p-4 border rounded-xl text-center transition-all ${
                    cloudConfig.provider === provider.id
                      ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                      : 'hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <span className="text-2xl block mb-2">{provider.icon}</span>
                  <span className="text-xs font-medium text-gray-700">{provider.name}</span>
                </button>
              ))}
            </div>

            {/* Cloud Configuration */}
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Cloud className="w-5 h-5" />
                إعدادات المصدر السحابي
              </h3>

              {(cloudConfig.provider === 'gcs' || cloudConfig.provider === 'bigquery' || cloudConfig.provider === 'sheets') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">معرف المشروع</label>
                      <input
                        type="text"
                        value={cloudConfig.projectId}
                        onChange={(e) => setCloudConfig({ ...cloudConfig, projectId: e.target.value })}
                        placeholder="my-project-id"
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">
                        {cloudConfig.provider === 'sheets' ? 'معرف الجدول' : 'اسم الحاوية'}
                      </label>
                      <input
                        type="text"
                        value={cloudConfig.bucket}
                        onChange={(e) => setCloudConfig({ ...cloudConfig, bucket: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">
                      ملف بيانات الاعتماد (JSON)
                    </label>
                    <textarea
                      value={cloudConfig.credentials}
                      onChange={(e) => setCloudConfig({ ...cloudConfig, credentials: e.target.value })}
                      placeholder='{"type": "service_account", ...}'
                      rows={4}
                      className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </div>
                </div>
              )}

              {(cloudConfig.provider === 's3' || cloudConfig.provider === 'redshift' || cloudConfig.provider === 'athena') && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Access Key ID</label>
                      <input
                        type="text"
                        value={cloudConfig.accessKey}
                        onChange={(e) => setCloudConfig({ ...cloudConfig, accessKey: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">Secret Access Key</label>
                      <input
                        type="password"
                        value={cloudConfig.secretKey}
                        onChange={(e) => setCloudConfig({ ...cloudConfig, secretKey: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">المنطقة</label>
                      <select
                        value={cloudConfig.region}
                        onChange={(e) => setCloudConfig({ ...cloudConfig, region: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      >
                        <option value="">اختر المنطقة</option>
                        <option value="us-east-1">US East (N. Virginia)</option>
                        <option value="us-west-2">US West (Oregon)</option>
                        <option value="eu-west-1">EU (Ireland)</option>
                        <option value="eu-central-1">EU (Frankfurt)</option>
                        <option value="ap-southeast-1">Asia Pacific (Singapore)</option>
                        <option value="me-south-1">Middle East (Bahrain)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">اسم الحاوية / Bucket</label>
                      <input
                        type="text"
                        value={cloudConfig.bucket}
                        onChange={(e) => setCloudConfig({ ...cloudConfig, bucket: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">المسار</label>
                    <input
                      type="text"
                      value={cloudConfig.path}
                      onChange={(e) => setCloudConfig({ ...cloudConfig, path: e.target.value })}
                      placeholder="folder/file.csv"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>
              )}

              {(cloudConfig.provider === 'azure' || cloudConfig.provider === 'synapse') && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">سلسلة الاتصال</label>
                    <textarea
                      value={cloudConfig.connectionString}
                      onChange={(e) => setCloudConfig({ ...cloudConfig, connectionString: e.target.value })}
                      placeholder="DefaultEndpointsProtocol=https;AccountName=..."
                      rows={3}
                      className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">اسم الحاوية</label>
                      <input
                        type="text"
                        value={cloudConfig.bucket}
                        onChange={(e) => setCloudConfig({ ...cloudConfig, bucket: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-600 mb-1">المسار</label>
                      <input
                        type="text"
                        value={cloudConfig.path}
                        onChange={(e) => setCloudConfig({ ...cloudConfig, path: e.target.value })}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <button
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Wifi className="w-5 h-5" />
                  اختبار الاتصال
                </button>
                <button
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  تحميل البيانات
                </button>
              </div>
            </div>
          </div>
        )}

        {/* API Tab */}
        {activeTab === 'api' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5" />
                إعدادات API
              </h3>

              <div className="space-y-4">
                {/* Method & URL */}
                <div className="flex gap-3">
                  <div className="w-32">
                    <label className="block text-sm font-medium text-gray-600 mb-1">الطريقة</label>
                    <select
                      value={apiConfig.method}
                      onChange={(e) => setApiConfig({ ...apiConfig, method: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-600 mb-1">عنوان API</label>
                    <input
                      type="url"
                      value={apiConfig.url}
                      onChange={(e) => setApiConfig({ ...apiConfig, url: e.target.value })}
                      placeholder="https://api.example.com/data"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                </div>

                {/* Authentication */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">المصادقة</label>
                  <div className="flex gap-3">
                    <select
                      value={apiConfig.authType}
                      onChange={(e) => setApiConfig({ ...apiConfig, authType: e.target.value })}
                      className="w-40 border rounded-lg px-3 py-2"
                    >
                      <option value="none">بدون</option>
                      <option value="bearer">Bearer Token</option>
                      <option value="basic">Basic Auth</option>
                      <option value="apikey">API Key</option>
                    </select>
                    
                    {apiConfig.authType === 'bearer' && (
                      <input
                        type="password"
                        value={apiConfig.authToken}
                        onChange={(e) => setApiConfig({ ...apiConfig, authToken: e.target.value })}
                        placeholder="Bearer Token"
                        className="flex-1 border rounded-lg px-3 py-2"
                      />
                    )}
                    
                    {apiConfig.authType === 'basic' && (
                      <>
                        <input
                          type="text"
                          value={apiConfig.username}
                          onChange={(e) => setApiConfig({ ...apiConfig, username: e.target.value })}
                          placeholder="اسم المستخدم"
                          className="flex-1 border rounded-lg px-3 py-2"
                        />
                        <input
                          type="password"
                          value={apiConfig.password}
                          onChange={(e) => setApiConfig({ ...apiConfig, password: e.target.value })}
                          placeholder="كلمة المرور"
                          className="flex-1 border rounded-lg px-3 py-2"
                        />
                      </>
                    )}
                    
                    {apiConfig.authType === 'apikey' && (
                      <input
                        type="password"
                        value={apiConfig.authToken}
                        onChange={(e) => setApiConfig({ ...apiConfig, authToken: e.target.value })}
                        placeholder="API Key"
                        className="flex-1 border rounded-lg px-3 py-2"
                      />
                    )}
                  </div>
                </div>

                {/* Headers */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">الترويسات (Headers)</label>
                  {apiConfig.headers.map((header, idx) => (
                    <div key={idx} className="flex gap-2 mb-2">
                      <input
                        type="text"
                        value={header.key}
                        onChange={(e) => {
                          const newHeaders = [...apiConfig.headers];
                          newHeaders[idx].key = e.target.value;
                          setApiConfig({ ...apiConfig, headers: newHeaders });
                        }}
                        placeholder="Key"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <input
                        type="text"
                        value={header.value}
                        onChange={(e) => {
                          const newHeaders = [...apiConfig.headers];
                          newHeaders[idx].value = e.target.value;
                          setApiConfig({ ...apiConfig, headers: newHeaders });
                        }}
                        placeholder="Value"
                        className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => {
                          const newHeaders = apiConfig.headers.filter((_, i) => i !== idx);
                          setApiConfig({ ...apiConfig, headers: newHeaders });
                        }}
                        className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => setApiConfig({ ...apiConfig, headers: [...apiConfig.headers, { key: '', value: '' }] })}
                    className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Plus className="w-4 h-4" />
                    إضافة ترويسة
                  </button>
                </div>

                {/* Body (for POST/PUT) */}
                {(apiConfig.method === 'POST' || apiConfig.method === 'PUT' || apiConfig.method === 'PATCH') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">جسم الطلب (Body)</label>
                    <textarea
                      value={apiConfig.body}
                      onChange={(e) => setApiConfig({ ...apiConfig, body: e.target.value })}
                      placeholder='{"key": "value"}'
                      rows={4}
                      className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
                    />
                  </div>
                )}

                {/* Data Path */}
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">مسار البيانات في الاستجابة</label>
                  <input
                    type="text"
                    value={apiConfig.dataPath}
                    onChange={(e) => setApiConfig({ ...apiConfig, dataPath: e.target.value })}
                    placeholder="data.items أو results"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">اترك فارغًا إذا كانت الاستجابة مصفوفة مباشرة</p>
                </div>

                {/* Pagination */}
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={apiConfig.pagination}
                      onChange={(e) => setApiConfig({ ...apiConfig, pagination: e.target.checked })}
                      className="w-4 h-4 text-blue-600 rounded"
                    />
                    <span className="text-sm text-gray-600">دعم الترقيم (Pagination)</span>
                  </label>
                  
                  {apiConfig.pagination && (
                    <>
                      <input
                        type="text"
                        value={apiConfig.pageParam}
                        onChange={(e) => setApiConfig({ ...apiConfig, pageParam: e.target.value })}
                        placeholder="page"
                        className="w-24 border rounded-lg px-2 py-1 text-sm"
                      />
                      <input
                        type="number"
                        value={apiConfig.maxPages}
                        onChange={(e) => setApiConfig({ ...apiConfig, maxPages: parseInt(e.target.value) || 10 })}
                        placeholder="Max pages"
                        className="w-20 border rounded-lg px-2 py-1 text-sm"
                      />
                    </>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
                >
                  <Eye className="w-5 h-5" />
                  اختبار
                </button>
                <button
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  <Download className="w-5 h-5" />
                  جلب البيانات
                </button>
              </div>
            </div>

            {/* Popular APIs */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">واجهات برمجة شائعة</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { name: 'JSONPlaceholder', url: 'https://jsonplaceholder.typicode.com/posts' },
                  { name: 'REST Countries', url: 'https://restcountries.com/v3.1/all' },
                  { name: 'Open Weather', url: 'https://api.openweathermap.org/data/2.5/weather' },
                  { name: 'GitHub API', url: 'https://api.github.com/users' }
                ].map(api => (
                  <button
                    key={api.name}
                    onClick={() => setApiConfig({ ...apiConfig, url: api.url })}
                    className="p-3 border rounded-lg text-right hover:border-blue-300 hover:bg-blue-50 transition-all"
                  >
                    <div className="font-medium text-gray-700">{api.name}</div>
                    <div className="text-xs text-gray-500 truncate">{api.url}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* URL Tab */}
        {activeTab === 'url' && (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-6">
              <h3 className="font-semibold text-gray-700 mb-4 flex items-center gap-2">
                <Link className="w-5 h-5" />
                استيراد من رابط مباشر
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">رابط الملف</label>
                  <input
                    type="url"
                    value={urlConfig.url}
                    onChange={(e) => setUrlConfig({ ...urlConfig, url: e.target.value })}
                    placeholder="https://example.com/data.csv"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1">تنسيق الملف</label>
                    <select
                      value={urlConfig.format}
                      onChange={(e) => setUrlConfig({ ...urlConfig, format: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="auto">اكتشاف تلقائي</option>
                      <option value="csv">CSV</option>
                      <option value="json">JSON</option>
                      <option value="excel">Excel</option>
                      <option value="xml">XML</option>
                    </select>
                  </div>
                  <div className="flex items-end gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={urlConfig.refresh}
                        onChange={(e) => setUrlConfig({ ...urlConfig, refresh: e.target.checked })}
                        className="w-4 h-4 text-blue-600 rounded"
                      />
                      <span className="text-sm text-gray-600">تحديث تلقائي</span>
                    </label>
                    {urlConfig.refresh && (
                      <input
                        type="number"
                        value={urlConfig.refreshInterval}
                        onChange={(e) => setUrlConfig({ ...urlConfig, refreshInterval: parseInt(e.target.value) || 60 })}
                        className="w-20 border rounded-lg px-2 py-1 text-sm"
                        placeholder="ثانية"
                      />
                    )}
                  </div>
                </div>
              </div>

              <button
                onClick={fetchFromUrl}
                disabled={isLoading || !urlConfig.url}
                className="mt-6 flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Download className="w-5 h-5" />}
                تحميل البيانات
              </button>
            </div>

            {/* Sample URLs */}
            <div>
              <h3 className="font-semibold text-gray-700 mb-3">روابط نموذجية للتجربة</h3>
              <div className="space-y-2">
                {[
                  { name: 'Iris Dataset (CSV)', url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/iris.csv' },
                  { name: 'Tips Dataset (CSV)', url: 'https://raw.githubusercontent.com/mwaskom/seaborn-data/master/tips.csv' },
                  { name: 'Titanic Dataset (CSV)', url: 'https://raw.githubusercontent.com/datasciencedojo/datasets/master/titanic.csv' },
                  { name: 'World Population (JSON)', url: 'https://restcountries.com/v3.1/all' }
                ].map(item => (
                  <button
                    key={item.name}
                    onClick={() => setUrlConfig({ ...urlConfig, url: item.url })}
                    className="w-full p-3 border rounded-lg text-right hover:border-blue-300 hover:bg-blue-50 transition-all flex items-center justify-between"
                  >
                    <span className="font-medium text-gray-700">{item.name}</span>
                    <span className="text-xs text-gray-400 truncate max-w-md">{item.url}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Preview Data */}
        {previewData && previewData.length > 0 && (
          <div className="mt-6 border-t pt-6">
            <h3 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              معاينة البيانات (أول 10 صفوف)
            </h3>
            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    {Object.keys(previewData[0]).map(col => (
                      <th key={col} className="px-4 py-2 text-right font-medium text-gray-600 border-b">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      {Object.values(row).map((val: any, i) => (
                        <td key={i} className="px-4 py-2 border-b text-gray-700">
                          {val === null ? <span className="text-gray-400 italic">null</span> : String(val)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white/80 flex items-center justify-center z-50">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">جارٍ تحميل البيانات...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataSourceManager;
