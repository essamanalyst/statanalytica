import React, { useState } from 'react';
import {
  X,
  Cloud,
  Loader2,
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Download,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { useLanguage } from '../i18n';
import { useNotification } from './NotificationSystem';

interface CloudProvidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: any[], source: string) => void;
}

type CloudProvider = 'google' | 'aws' | 'azure' | 'snowflake' | 'mongodb' | 'firebase' | 'supabase' | 'api';
type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'error';

interface ProviderConfig {
  id: CloudProvider;
  name: string;
  icon: string;
  color: string;
  description: {
    ar: string;
    en: string;
  };
  fields: {
    key: string;
    label: { ar: string; en: string };
    type: 'text' | 'password' | 'textarea' | 'select';
    placeholder?: string;
    required?: boolean;
    options?: { value: string; label: string }[];
  }[];
}

const CloudProvidersModal: React.FC<CloudProvidersModalProps> = ({ isOpen, onClose, onDataLoaded }) => {
  const { language, isRTL } = useLanguage();
  const { success: notifySuccess, error: notifyError } = useNotification();
  
  const [selectedProvider, setSelectedProvider] = useState<CloudProvider | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState<Record<string, boolean>>({});
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [testResult, setTestResult] = useState<string | null>(null);

  const providers: ProviderConfig[] = [
    {
      id: 'google',
      name: 'Google Cloud',
      icon: '🔵',
      color: 'from-blue-500 to-blue-600',
      description: {
        ar: 'BigQuery, Cloud Storage, Google Sheets',
        en: 'BigQuery, Cloud Storage, Google Sheets'
      },
      fields: [
        { key: 'service', label: { ar: 'الخدمة', en: 'Service' }, type: 'select', required: true, options: [
          { value: 'bigquery', label: 'BigQuery' },
          { value: 'storage', label: 'Cloud Storage' },
          { value: 'sheets', label: 'Google Sheets' }
        ]},
        { key: 'projectId', label: { ar: 'معرف المشروع', en: 'Project ID' }, type: 'text', placeholder: 'my-project-123', required: true },
        { key: 'credentials', label: { ar: 'مفتاح API أو JSON', en: 'API Key or JSON' }, type: 'textarea', placeholder: 'Paste your service account JSON or API key', required: true },
        { key: 'query', label: { ar: 'الاستعلام/المسار', en: 'Query/Path' }, type: 'textarea', placeholder: 'SELECT * FROM dataset.table LIMIT 1000' }
      ]
    },
    {
      id: 'aws',
      name: 'Amazon AWS',
      icon: '🟠',
      color: 'from-orange-500 to-orange-600',
      description: {
        ar: 'S3, Redshift, Athena, RDS',
        en: 'S3, Redshift, Athena, RDS'
      },
      fields: [
        { key: 'service', label: { ar: 'الخدمة', en: 'Service' }, type: 'select', required: true, options: [
          { value: 's3', label: 'S3' },
          { value: 'redshift', label: 'Redshift' },
          { value: 'athena', label: 'Athena' },
          { value: 'rds', label: 'RDS' }
        ]},
        { key: 'region', label: { ar: 'المنطقة', en: 'Region' }, type: 'select', required: true, options: [
          { value: 'us-east-1', label: 'US East (N. Virginia)' },
          { value: 'us-west-2', label: 'US West (Oregon)' },
          { value: 'eu-west-1', label: 'EU (Ireland)' },
          { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
          { value: 'me-south-1', label: 'Middle East (Bahrain)' }
        ]},
        { key: 'accessKeyId', label: { ar: 'Access Key ID', en: 'Access Key ID' }, type: 'text', required: true },
        { key: 'secretAccessKey', label: { ar: 'Secret Access Key', en: 'Secret Access Key' }, type: 'password', required: true },
        { key: 'bucket', label: { ar: 'الحاوية/قاعدة البيانات', en: 'Bucket/Database' }, type: 'text', placeholder: 'my-bucket' },
        { key: 'path', label: { ar: 'المسار/الاستعلام', en: 'Path/Query' }, type: 'textarea', placeholder: 'data/file.csv or SELECT * FROM table' }
      ]
    },
    {
      id: 'azure',
      name: 'Microsoft Azure',
      icon: '🔷',
      color: 'from-blue-600 to-blue-700',
      description: {
        ar: 'Blob Storage, SQL Database, Synapse',
        en: 'Blob Storage, SQL Database, Synapse'
      },
      fields: [
        { key: 'service', label: { ar: 'الخدمة', en: 'Service' }, type: 'select', required: true, options: [
          { value: 'blob', label: 'Blob Storage' },
          { value: 'sql', label: 'SQL Database' },
          { value: 'synapse', label: 'Synapse Analytics' },
          { value: 'cosmos', label: 'Cosmos DB' }
        ]},
        { key: 'accountName', label: { ar: 'اسم الحساب', en: 'Account Name' }, type: 'text', required: true },
        { key: 'accountKey', label: { ar: 'مفتاح الحساب', en: 'Account Key' }, type: 'password', required: true },
        { key: 'container', label: { ar: 'الحاوية/قاعدة البيانات', en: 'Container/Database' }, type: 'text', placeholder: 'my-container' },
        { key: 'query', label: { ar: 'المسار/الاستعلام', en: 'Path/Query' }, type: 'textarea', placeholder: 'data/file.csv or SELECT * FROM table' }
      ]
    },
    {
      id: 'snowflake',
      name: 'Snowflake',
      icon: '❄️',
      color: 'from-cyan-500 to-blue-500',
      description: {
        ar: 'مستودع البيانات السحابي',
        en: 'Cloud Data Warehouse'
      },
      fields: [
        { key: 'account', label: { ar: 'معرف الحساب', en: 'Account Identifier' }, type: 'text', placeholder: 'xy12345.us-east-1', required: true },
        { key: 'username', label: { ar: 'اسم المستخدم', en: 'Username' }, type: 'text', required: true },
        { key: 'password', label: { ar: 'كلمة المرور', en: 'Password' }, type: 'password', required: true },
        { key: 'warehouse', label: { ar: 'المستودع', en: 'Warehouse' }, type: 'text', placeholder: 'COMPUTE_WH' },
        { key: 'database', label: { ar: 'قاعدة البيانات', en: 'Database' }, type: 'text', placeholder: 'MY_DATABASE' },
        { key: 'schema', label: { ar: 'المخطط', en: 'Schema' }, type: 'text', placeholder: 'PUBLIC' },
        { key: 'query', label: { ar: 'الاستعلام', en: 'Query' }, type: 'textarea', placeholder: 'SELECT * FROM table LIMIT 1000', required: true }
      ]
    },
    {
      id: 'mongodb',
      name: 'MongoDB Atlas',
      icon: '🍃',
      color: 'from-green-500 to-emerald-500',
      description: {
        ar: 'قاعدة بيانات NoSQL',
        en: 'NoSQL Database'
      },
      fields: [
        { key: 'connectionString', label: { ar: 'سلسلة الاتصال', en: 'Connection String' }, type: 'password', placeholder: 'mongodb+srv://user:pass@cluster.mongodb.net/', required: true },
        { key: 'database', label: { ar: 'قاعدة البيانات', en: 'Database' }, type: 'text', placeholder: 'mydb', required: true },
        { key: 'collection', label: { ar: 'المجموعة', en: 'Collection' }, type: 'text', placeholder: 'users', required: true },
        { key: 'filter', label: { ar: 'فلتر (JSON)', en: 'Filter (JSON)' }, type: 'textarea', placeholder: '{ "status": "active" }' },
        { key: 'limit', label: { ar: 'الحد الأقصى', en: 'Limit' }, type: 'text', placeholder: '1000' }
      ]
    },
    {
      id: 'firebase',
      name: 'Firebase',
      icon: '🔥',
      color: 'from-orange-400 to-amber-500',
      description: {
        ar: 'Firestore, Realtime Database',
        en: 'Firestore, Realtime Database'
      },
      fields: [
        { key: 'service', label: { ar: 'الخدمة', en: 'Service' }, type: 'select', required: true, options: [
          { value: 'firestore', label: 'Firestore' },
          { value: 'realtime', label: 'Realtime Database' }
        ]},
        { key: 'projectId', label: { ar: 'معرف المشروع', en: 'Project ID' }, type: 'text', required: true },
        { key: 'apiKey', label: { ar: 'مفتاح API', en: 'API Key' }, type: 'password', required: true },
        { key: 'collection', label: { ar: 'المجموعة/المسار', en: 'Collection/Path' }, type: 'text', placeholder: 'users', required: true }
      ]
    },
    {
      id: 'supabase',
      name: 'Supabase',
      icon: '⚡',
      color: 'from-emerald-500 to-teal-600',
      description: {
        ar: 'PostgreSQL مفتوح المصدر',
        en: 'Open Source PostgreSQL'
      },
      fields: [
        { key: 'url', label: { ar: 'رابط المشروع', en: 'Project URL' }, type: 'text', placeholder: 'https://xyz.supabase.co', required: true },
        { key: 'anonKey', label: { ar: 'المفتاح العام', en: 'Anon Key' }, type: 'password', required: true },
        { key: 'table', label: { ar: 'الجدول', en: 'Table' }, type: 'text', placeholder: 'users', required: true },
        { key: 'select', label: { ar: 'الأعمدة', en: 'Columns' }, type: 'text', placeholder: '* or column1,column2' },
        { key: 'filter', label: { ar: 'الفلتر', en: 'Filter' }, type: 'text', placeholder: 'status=eq.active' }
      ]
    },
    {
      id: 'api',
      name: 'REST API',
      icon: '🌐',
      color: 'from-purple-500 to-pink-500',
      description: {
        ar: 'أي نقطة نهاية HTTP',
        en: 'Any HTTP Endpoint'
      },
      fields: [
        { key: 'url', label: { ar: 'الرابط', en: 'URL' }, type: 'text', placeholder: 'https://api.example.com/data', required: true },
        { key: 'method', label: { ar: 'الطريقة', en: 'Method' }, type: 'select', options: [
          { value: 'GET', label: 'GET' },
          { value: 'POST', label: 'POST' }
        ]},
        { key: 'headers', label: { ar: 'الرؤوس (JSON)', en: 'Headers (JSON)' }, type: 'textarea', placeholder: '{"Authorization": "Bearer token"}' },
        { key: 'body', label: { ar: 'الجسم (JSON)', en: 'Body (JSON)' }, type: 'textarea', placeholder: '{"query": "..."}' },
        { key: 'dataPath', label: { ar: 'مسار البيانات', en: 'Data Path' }, type: 'text', placeholder: 'data.items' }
      ]
    }
  ];

  const getProvider = (id: CloudProvider) => providers.find(p => p.id === id);

  const handleConnect = async () => {
    if (!selectedProvider) return;
    
    const provider = getProvider(selectedProvider);
    if (!provider) return;

    // Validate required fields
    const missingFields = provider.fields
      .filter(f => f.required && !formData[f.key]?.trim())
      .map(f => f.label[language as 'ar' | 'en']);

    if (missingFields.length > 0) {
      setError(
        language === 'ar'
          ? `يرجى ملء الحقول المطلوبة: ${missingFields.join('، ')}`
          : `Please fill required fields: ${missingFields.join(', ')}`
      );
      return;
    }

    setConnectionStatus('connecting');
    setError(null);
    setTestResult(null);

    try {
      // Simulate connection based on provider type
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For API type, actually try to fetch
      if (selectedProvider === 'api' && formData.url) {
        try {
          let headers: Record<string, string> = { 'Accept': 'application/json' };
          if (formData.headers?.trim()) {
            try {
              headers = { ...headers, ...JSON.parse(formData.headers) };
            } catch {
              throw new Error(language === 'ar' ? 'صيغة Headers غير صالحة' : 'Invalid Headers format');
            }
          }

          let body: string | undefined;
          if (formData.method === 'POST' && formData.body?.trim()) {
            try {
              JSON.parse(formData.body);
              body = formData.body;
            } catch {
              throw new Error(language === 'ar' ? 'صيغة Body غير صالحة' : 'Invalid Body format');
            }
          }

          const response = await fetch(formData.url, {
            method: formData.method || 'GET',
            headers,
            body
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const jsonData = await response.json();

          // Extract data
          let data = jsonData;
          if (formData.dataPath?.trim()) {
            const paths = formData.dataPath.split('.');
            for (const path of paths) {
              if (data && typeof data === 'object' && path in data) {
                data = data[path];
              }
            }
          }

          // Find array
          if (!Array.isArray(data)) {
            const findArray = (obj: any, depth = 0): any[] | null => {
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
            const found = findArray(data);
            data = found || [data];
          }

          if (data.length > 0) {
            setConnectionStatus('connected');
            setTestResult(
              language === 'ar'
                ? `✅ تم الاتصال بنجاح! تم العثور على ${data.length} سجل`
                : `✅ Connected successfully! Found ${data.length} records`
            );
            
            // Auto load data
            onDataLoaded(data, `API: ${formData.url}`);
            notifySuccess(
              language === 'ar' ? 'تم جلب البيانات' : 'Data Fetched',
              `${data.length} ${language === 'ar' ? 'سجل' : 'records'}`,
              'import',
              'REST API'
            );
            onClose();
            return;
          } else {
            throw new Error(language === 'ar' ? 'لم يتم العثور على بيانات' : 'No data found');
          }
        } catch (err) {
          throw err;
        }
      }

      // For Supabase, try actual connection
      if (selectedProvider === 'supabase' && formData.url && formData.anonKey && formData.table) {
        try {
          const url = `${formData.url}/rest/v1/${formData.table}?select=${formData.select || '*'}${formData.filter ? `&${formData.filter}` : ''}&limit=1000`;
          
          const response = await fetch(url, {
            headers: {
              'apikey': formData.anonKey,
              'Authorization': `Bearer ${formData.anonKey}`
            }
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const data = await response.json();

          if (Array.isArray(data) && data.length > 0) {
            setConnectionStatus('connected');
            onDataLoaded(data, `Supabase: ${formData.table}`);
            notifySuccess(
              language === 'ar' ? 'تم جلب البيانات' : 'Data Fetched',
              `${data.length} ${language === 'ar' ? 'سجل' : 'records'}`,
              'import',
              'Supabase'
            );
            onClose();
            return;
          } else {
            throw new Error(language === 'ar' ? 'لم يتم العثور على بيانات' : 'No data found');
          }
        } catch (err) {
          throw err;
        }
      }

      // For other providers, show info message
      setConnectionStatus('error');
      setError(
        language === 'ar'
          ? `للاتصال بـ ${provider.name}، تحتاج إلى خادم وسيط (Backend Server) لأسباب أمنية. يمكنك:\n\n1. تصدير البيانات كملف CSV/Excel\n2. استخدام REST API إذا كان متاحاً\n3. استخدام Supabase كبديل مجاني`
          : `To connect to ${provider.name}, you need a backend server for security reasons. You can:\n\n1. Export data as CSV/Excel file\n2. Use REST API if available\n3. Use Supabase as a free alternative`
      );

    } catch (err) {
      console.error('Connection error:', err);
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : (language === 'ar' ? 'خطأ في الاتصال' : 'Connection error'));
      notifyError(
        language === 'ar' ? 'فشل الاتصال' : 'Connection Failed',
        err instanceof Error ? err.message : '',
        'import'
      );
    }
  };

  const handleFieldChange = (key: string, value: string) => {
    setFormData(prev => ({ ...prev, [key]: value }));
    setError(null);
    setTestResult(null);
    setConnectionStatus('idle');
  };

  const togglePasswordVisibility = (key: string) => {
    setShowPassword(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const resetForm = () => {
    setFormData({});
    setError(null);
    setTestResult(null);
    setConnectionStatus('idle');
  };

  if (!isOpen) return null;

  const currentProvider = selectedProvider ? getProvider(selectedProvider) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col ${isRTL ? 'rtl' : 'ltr'}`}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Cloud className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold">
                {language === 'ar' ? 'مدير المصادر السحابية' : 'Cloud Sources Manager'}
              </h2>
              <p className="text-sm text-white/80">
                {language === 'ar' ? 'اتصل بمصادر البيانات السحابية' : 'Connect to cloud data sources'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white/20 rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {!selectedProvider ? (
            // Provider Selection Grid
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {language === 'ar' ? 'اختر مصدر البيانات' : 'Select Data Source'}
                </h3>
                <p className="text-gray-500">
                  {language === 'ar' 
                    ? 'اختر المزود السحابي الذي ترغب في الاتصال به'
                    : 'Choose the cloud provider you want to connect to'}
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {providers.map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => {
                      setSelectedProvider(provider.id);
                      resetForm();
                    }}
                    className="p-6 bg-white border-2 border-gray-100 rounded-xl text-center hover:border-blue-300 hover:shadow-lg transition-all group"
                  >
                    <div className={`w-16 h-16 mx-auto mb-3 rounded-xl bg-gradient-to-br ${provider.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <span className="text-3xl">{provider.icon}</span>
                    </div>
                    <span className="font-semibold text-gray-800 block">{provider.name}</span>
                    <span className="text-xs text-gray-500 mt-1 block">
                      {provider.description[language as 'ar' | 'en']}
                    </span>
                  </button>
                ))}
              </div>

              {/* Quick Tips */}
              <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
                <h4 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                  <span>💡</span>
                  {language === 'ar' ? 'نصائح سريعة' : 'Quick Tips'}
                </h4>
                <ul className={`text-sm text-blue-700 space-y-1 ${isRTL ? 'mr-6' : 'ml-6'} list-disc`}>
                  <li>
                    {language === 'ar'
                      ? 'REST API و Supabase يعملان مباشرة من المتصفح'
                      : 'REST API and Supabase work directly from browser'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'المزودون الآخرون يتطلبون خادم وسيط للأمان'
                      : 'Other providers require a backend server for security'}
                  </li>
                  <li>
                    {language === 'ar'
                      ? 'يمكنك دائماً تصدير البيانات كـ CSV واستيرادها'
                      : 'You can always export data as CSV and import it'}
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            // Provider Configuration Form
            <div className="space-y-6">
              {/* Back Button & Provider Info */}
              <div className="flex items-center justify-between">
                <button
                  onClick={() => {
                    setSelectedProvider(null);
                    resetForm();
                  }}
                  className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
                >
                  <span className={isRTL ? 'rotate-180' : ''}>←</span>
                  {language === 'ar' ? 'رجوع' : 'Back'}
                </button>
                
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${currentProvider?.color} flex items-center justify-center`}>
                    <span className="text-xl">{currentProvider?.icon}</span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{currentProvider?.name}</h3>
                    <p className="text-xs text-gray-500">
                      {currentProvider?.description[language as 'ar' | 'en']}
                    </p>
                  </div>
                </div>
              </div>

              {/* Connection Status */}
              <div className={`p-4 rounded-xl flex items-center gap-3 ${
                connectionStatus === 'connected' ? 'bg-green-50 border border-green-200' :
                connectionStatus === 'connecting' ? 'bg-blue-50 border border-blue-200' :
                connectionStatus === 'error' ? 'bg-red-50 border border-red-200' :
                'bg-gray-50 border border-gray-200'
              }`}>
                <div className={`w-3 h-3 rounded-full ${
                  connectionStatus === 'connected' ? 'bg-green-500' :
                  connectionStatus === 'connecting' ? 'bg-blue-500 animate-pulse' :
                  connectionStatus === 'error' ? 'bg-red-500' :
                  'bg-gray-400'
                }`} />
                <div className="flex-1">
                  <span className={`text-sm font-medium ${
                    connectionStatus === 'connected' ? 'text-green-700' :
                    connectionStatus === 'connecting' ? 'text-blue-700' :
                    connectionStatus === 'error' ? 'text-red-700' :
                    'text-gray-600'
                  }`}>
                    {connectionStatus === 'connected' ? (language === 'ar' ? '✓ متصل' : '✓ Connected') :
                     connectionStatus === 'connecting' ? (language === 'ar' ? 'جاري الاتصال...' : 'Connecting...') :
                     connectionStatus === 'error' ? (language === 'ar' ? '✗ فشل الاتصال' : '✗ Connection Failed') :
                     (language === 'ar' ? 'غير متصل' : 'Not Connected')}
                  </span>
                </div>
                {connectionStatus !== 'idle' && (
                  <button
                    onClick={resetForm}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Form Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentProvider?.fields.map(field => (
                  <div key={field.key} className={field.type === 'textarea' ? 'md:col-span-2' : ''}>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {field.label[language as 'ar' | 'en']}
                      {field.required && <span className="text-red-500 ml-1">*</span>}
                    </label>
                    
                    {field.type === 'select' ? (
                      <select
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        className="w-full border-2 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      >
                        <option value="">{language === 'ar' ? 'اختر...' : 'Select...'}</option>
                        {field.options?.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    ) : field.type === 'textarea' ? (
                      <textarea
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        rows={3}
                        className="w-full border-2 rounded-lg px-4 py-3 font-mono text-sm focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        dir="ltr"
                      />
                    ) : field.type === 'password' ? (
                      <div className="relative">
                        <input
                          type={showPassword[field.key] ? 'text' : 'password'}
                          value={formData[field.key] || ''}
                          onChange={(e) => handleFieldChange(field.key, e.target.value)}
                          placeholder={field.placeholder}
                          className={`w-full border-2 rounded-lg px-4 py-3 ${isRTL ? 'pl-12' : 'pr-12'} focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all`}
                          dir="ltr"
                        />
                        <button
                          type="button"
                          onClick={() => togglePasswordVisibility(field.key)}
                          className={`absolute top-1/2 -translate-y-1/2 ${isRTL ? 'left-3' : 'right-3'} text-gray-400 hover:text-gray-600`}
                        >
                          {showPassword[field.key] ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                    ) : (
                      <input
                        type="text"
                        value={formData[field.key] || ''}
                        onChange={(e) => handleFieldChange(field.key, e.target.value)}
                        placeholder={field.placeholder}
                        className="w-full border-2 rounded-lg px-4 py-3 focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                        dir="ltr"
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-700 whitespace-pre-line">{error}</div>
                  </div>
                </div>
              )}

              {/* Success Message */}
              {testResult && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-xl">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-green-700">{testResult}</div>
                  </div>
                </div>
              )}

              {/* Provider-specific help */}
              {selectedProvider === 'supabase' && (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl">
                  <h4 className="font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                    <span>⚡</span>
                    {language === 'ar' ? 'كيفية الحصول على بيانات Supabase' : 'How to get Supabase credentials'}
                  </h4>
                  <ol className={`text-sm text-emerald-700 space-y-1 ${isRTL ? 'mr-6' : 'ml-6'} list-decimal`}>
                    <li>{language === 'ar' ? 'افتح لوحة تحكم Supabase' : 'Open Supabase Dashboard'}</li>
                    <li>{language === 'ar' ? 'اذهب إلى Settings → API' : 'Go to Settings → API'}</li>
                    <li>{language === 'ar' ? 'انسخ Project URL و anon public key' : 'Copy Project URL and anon public key'}</li>
                  </ol>
                  <a
                    href="https://supabase.com/dashboard"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs text-emerald-600 hover:text-emerald-800"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {language === 'ar' ? 'فتح لوحة التحكم' : 'Open Dashboard'}
                  </a>
                </div>
              )}

              {selectedProvider === 'api' && (
                <div className="p-4 bg-purple-50 border border-purple-200 rounded-xl">
                  <h4 className="font-semibold text-purple-800 mb-2 flex items-center gap-2">
                    <span>🌐</span>
                    {language === 'ar' ? 'أمثلة APIs للتجربة' : 'Sample APIs to try'}
                  </h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {[
                      { name: 'Users', url: 'https://jsonplaceholder.typicode.com/users' },
                      { name: 'Posts', url: 'https://jsonplaceholder.typicode.com/posts' },
                      { name: 'Countries', url: 'https://restcountries.com/v3.1/all' }
                    ].map(api => (
                      <button
                        key={api.name}
                        onClick={() => handleFieldChange('url', api.url)}
                        className="px-3 py-1 bg-white rounded-lg text-xs text-purple-600 hover:bg-purple-100 border border-purple-200"
                      >
                        {api.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedProvider && (
          <div className="flex items-center justify-between p-6 border-t bg-gray-50">
            <button
              onClick={onClose}
              className="px-6 py-2.5 text-gray-600 hover:text-gray-800 transition-colors"
            >
              {language === 'ar' ? 'إلغاء' : 'Cancel'}
            </button>
            
            <div className="flex gap-3">
              <button
                onClick={resetForm}
                className="flex items-center gap-2 px-4 py-2.5 border-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                {language === 'ar' ? 'إعادة تعيين' : 'Reset'}
              </button>
              
              <button
                onClick={handleConnect}
                disabled={connectionStatus === 'connecting'}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 disabled:opacity-50 transition-all shadow-md hover:shadow-lg"
              >
                {connectionStatus === 'connecting' ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Download className="w-5 h-5" />
                )}
                {connectionStatus === 'connecting'
                  ? (language === 'ar' ? 'جاري الاتصال...' : 'Connecting...')
                  : (language === 'ar' ? 'اتصال وجلب البيانات' : 'Connect & Fetch Data')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CloudProvidersModal;
