import React, { useState } from 'react';
import {
  Cloud,
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  Upload,
  Database,
  FileSpreadsheet,
  HardDrive,
  RefreshCw,
  Copy,
  Play
} from 'lucide-react';

interface GoogleCloudConnectorProps {
  onConnect: (config: any) => void;
  onDataLoaded: (data: any[]) => void;
}

type ServiceType = 'bigquery' | 'storage' | 'sheets';
type AuthMethod = 'service_account' | 'oauth' | 'api_key';

const GoogleCloudConnector: React.FC<GoogleCloudConnectorProps> = ({ onConnect, onDataLoaded }) => {
  const [serviceType, setServiceType] = useState<ServiceType>('bigquery');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('service_account');
  const [showSecrets, setShowSecrets] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Service Account
  const [projectId, setProjectId] = useState('');
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [privateKey, setPrivateKey] = useState('');
  const [clientEmail, setClientEmail] = useState('');

  // OAuth
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [refreshToken, setRefreshToken] = useState('');

  // API Key
  const [apiKey, setApiKey] = useState('');

  // BigQuery
  const [dataset, setDataset] = useState('');
  const [query, setQuery] = useState('SELECT * FROM `project.dataset.table` LIMIT 1000');
  const [location, setLocation] = useState('US');

  // Cloud Storage
  const [bucketName, setBucketName] = useState('');
  const [objectPath, setObjectPath] = useState('');
  const [fileFormat, setFileFormat] = useState<'csv' | 'json' | 'parquet' | 'avro'>('csv');

  // Sheets
  const [spreadsheetId, setSpreadsheetId] = useState('');
  const [sheetName, setSheetName] = useState('');
  const [range, setRange] = useState('A1:Z1000');

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setServiceAccountJson(content);
        try {
          const json = JSON.parse(content);
          if (json.project_id) setProjectId(json.project_id);
          if (json.client_email) setClientEmail(json.client_email);
          if (json.private_key) setPrivateKey(json.private_key);
        } catch {
          // Invalid JSON
        }
      };
      reader.readAsText(file);
    }
  };

  const testConnection = async () => {
    setIsConnecting(true);
    setError(null);
    setConnectionStatus('idle');

    try {
      // محاكاة الاتصال
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // في بيئة حقيقية، سيتم إرسال بيانات الاعتماد إلى الخادم
      // للتحقق من صحة الاتصال
      
      setConnectionStatus('success');
      
      // بيانات تجريبية
      const sampleData = [
        { id: 1, name: 'Sample 1', value: 100, date: '2024-01-01' },
        { id: 2, name: 'Sample 2', value: 200, date: '2024-01-02' },
        { id: 3, name: 'Sample 3', value: 300, date: '2024-01-03' },
      ];
      
      onDataLoaded(sampleData);
      onConnect({
        provider: 'google',
        service: serviceType,
        authMethod,
        projectId,
        dataset,
        bucketName,
        spreadsheetId
      });
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'فشل الاتصال');
    } finally {
      setIsConnecting(false);
    }
  };

  const services = [
    { id: 'bigquery', name: 'BigQuery', icon: Database, color: 'from-blue-500 to-blue-600' },
    { id: 'storage', name: 'Cloud Storage', icon: HardDrive, color: 'from-green-500 to-green-600' },
    { id: 'sheets', name: 'Google Sheets', icon: FileSpreadsheet, color: 'from-emerald-500 to-teal-600' }
  ];

  const authMethods = [
    { id: 'service_account', name: 'حساب الخدمة', desc: 'ملف JSON من Google Cloud Console' },
    { id: 'oauth', name: 'OAuth 2.0', desc: 'للتطبيقات التفاعلية' },
    { id: 'api_key', name: 'مفتاح API', desc: 'للبيانات العامة فقط' }
  ];

  return (
    <div className="space-y-6">
      {/* اختيار الخدمة */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">اختر الخدمة</label>
        <div className="grid grid-cols-3 gap-3">
          {services.map(service => {
            const Icon = service.icon;
            return (
              <button
                key={service.id}
                onClick={() => setServiceType(service.id as ServiceType)}
                className={`p-4 rounded-xl border-2 transition-all ${
                  serviceType === service.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center mx-auto mb-2`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className="text-sm font-medium text-gray-700">{service.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* طريقة المصادقة */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">طريقة المصادقة</label>
        <div className="space-y-2">
          {authMethods.map(method => (
            <label
              key={method.id}
              className={`flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all ${
                authMethod === method.id
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-blue-300'
              }`}
            >
              <input
                type="radio"
                name="authMethod"
                value={method.id}
                checked={authMethod === method.id}
                onChange={() => setAuthMethod(method.id as AuthMethod)}
                className="w-4 h-4 text-blue-600"
              />
              <div>
                <span className="font-medium text-gray-800">{method.name}</span>
                <p className="text-xs text-gray-500">{method.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* حقول المصادقة */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-700 flex items-center gap-2">
            <Key className="w-4 h-4" />
            بيانات الاعتماد
          </h4>
          <button
            onClick={() => setShowSecrets(!showSecrets)}
            className="text-gray-500 hover:text-gray-700"
          >
            {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {authMethod === 'service_account' && (
          <>
            {/* رفع ملف JSON */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">
                ملف حساب الخدمة (JSON)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="service-account-file"
                />
                <label htmlFor="service-account-file" className="cursor-pointer">
                  <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <span className="text-sm text-gray-600">اسحب الملف هنا أو انقر للتحميل</span>
                </label>
              </div>
              {serviceAccountJson && (
                <div className="mt-2 p-2 bg-green-50 rounded-lg flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm text-green-700">تم تحميل ملف الاعتماد</span>
                </div>
              )}
            </div>

            <div className="text-center text-gray-400 text-sm">— أو أدخل يدويًا —</div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Project ID</label>
                <input
                  type="text"
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  placeholder="my-project-123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Client Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="service-account@project.iam.gserviceaccount.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Private Key</label>
                <textarea
                  value={privateKey}
                  onChange={(e) => setPrivateKey(e.target.value)}
                  placeholder="-----BEGIN PRIVATE KEY-----\n..."
                  rows={3}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-xs ${
                    !showSecrets ? 'text-security-disc' : ''
                  }`}
                  style={!showSecrets ? { WebkitTextSecurity: 'disc' } as any : {}}
                />
              </div>
            </div>
          </>
        )}

        {authMethod === 'oauth' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">كيفية الحصول على OAuth Credentials:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>اذهب إلى Google Cloud Console</li>
                    <li>APIs & Services → Credentials</li>
                    <li>Create Credentials → OAuth client ID</li>
                    <li>اختر Application type: Web application</li>
                  </ol>
                  <a
                    href="https://console.cloud.google.com/apis/credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800"
                  >
                    فتح Google Cloud Console
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Client ID</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="123456789-abc123.apps.googleusercontent.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Client Secret</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="GOCSPX-..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Refresh Token</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={refreshToken}
                onChange={(e) => setRefreshToken(e.target.value)}
                placeholder="1//0abc..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {authMethod === 'api_key' && (
          <div className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">تنبيه:</p>
                  <p className="text-xs">مفتاح API يعمل فقط مع البيانات العامة. للبيانات الخاصة، استخدم Service Account.</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">API Key</label>
              <div className="relative">
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={() => navigator.clipboard.writeText(apiKey)}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
                >
                  <Copy className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* إعدادات الخدمة المحددة */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h4 className="font-semibold text-gray-700 flex items-center gap-2">
          <Cloud className="w-4 h-4" />
          إعدادات {services.find(s => s.id === serviceType)?.name}
        </h4>

        {serviceType === 'bigquery' && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Dataset</label>
                <input
                  type="text"
                  value={dataset}
                  onChange={(e) => setDataset(e.target.value)}
                  placeholder="my_dataset"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                <select
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="US">US</option>
                  <option value="EU">EU</option>
                  <option value="asia-east1">Asia East 1</option>
                  <option value="asia-northeast1">Asia Northeast 1</option>
                  <option value="europe-west1">Europe West 1</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SQL Query</label>
              <textarea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="SELECT * FROM `project.dataset.table` LIMIT 1000"
              />
            </div>
          </>
        )}

        {serviceType === 'storage' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Bucket Name</label>
              <input
                type="text"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="my-bucket-name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Object Path</label>
              <input
                type="text"
                value={objectPath}
                onChange={(e) => setObjectPath(e.target.value)}
                placeholder="folder/data.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">File Format</label>
              <select
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="parquet">Parquet</option>
                <option value="avro">Avro</option>
              </select>
            </div>
          </>
        )}

        {serviceType === 'sheets' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Spreadsheet ID</label>
              <input
                type="text"
                value={spreadsheetId}
                onChange={(e) => setSpreadsheetId(e.target.value)}
                placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-500 mt-1">
                يمكنك العثور عليه في رابط الجدول: docs.google.com/spreadsheets/d/<strong>[ID]</strong>/edit
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Sheet Name</label>
                <input
                  type="text"
                  value={sheetName}
                  onChange={(e) => setSheetName(e.target.value)}
                  placeholder="Sheet1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Range</label>
                <input
                  type="text"
                  value={range}
                  onChange={(e) => setRange(e.target.value)}
                  placeholder="A1:Z1000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </>
        )}
      </div>

      {/* حالة الاتصال */}
      {connectionStatus !== 'idle' && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          connectionStatus === 'success'
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}>
          {connectionStatus === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">تم الاتصال بنجاح!</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error || 'فشل الاتصال'}</span>
            </>
          )}
        </div>
      )}

      {/* زر الاتصال */}
      <button
        onClick={testConnection}
        disabled={isConnecting}
        className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isConnecting ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            جاري الاتصال...
          </>
        ) : (
          <>
            <Play className="w-5 h-5" />
            اتصال وتحميل البيانات
          </>
        )}
      </button>
    </div>
  );
};

export default GoogleCloudConnector;
