import React, { useState } from 'react';
import {
  Database,
  Cloud,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Shield,
  Zap,
  RefreshCw,
  HelpCircle
} from 'lucide-react';

interface ConnectionStep {
  id: string;
  title: string;
  description: string;
}

interface DataConnectionWizardProps {
  type: 'database' | 'cloud';
  onComplete: (config: Record<string, unknown>) => void;
  onCancel: () => void;
}

const DataConnectionWizard: React.FC<DataConnectionWizardProps> = ({ type, onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [config, setConfig] = useState<Record<string, string>>({});

  const databaseSteps: ConnectionStep[] = [
    { id: 'type', title: 'نوع قاعدة البيانات', description: 'اختر نوع قاعدة البيانات' },
    { id: 'connection', title: 'معلومات الاتصال', description: 'أدخل بيانات الاتصال' },
    { id: 'authentication', title: 'المصادقة', description: 'أدخل بيانات الدخول' },
    { id: 'query', title: 'الاستعلام', description: 'اختر الجدول أو اكتب استعلام' },
    { id: 'test', title: 'اختبار الاتصال', description: 'تأكد من صحة الاتصال' }
  ];

  const cloudSteps: ConnectionStep[] = [
    { id: 'provider', title: 'مزود الخدمة', description: 'اختر مزود الخدمة السحابية' },
    { id: 'credentials', title: 'بيانات الاعتماد', description: 'أدخل بيانات الاعتماد' },
    { id: 'source', title: 'مصدر البيانات', description: 'حدد موقع البيانات' },
    { id: 'options', title: 'خيارات إضافية', description: 'إعدادات متقدمة' },
    { id: 'test', title: 'اختبار الاتصال', description: 'تأكد من صحة الاتصال' }
  ];

  const steps = type === 'database' ? databaseSteps : cloudSteps;

  const testConnection = async () => {
    setConnectionStatus('testing');
    setIsLoading(true);
    
    // Simulate connection test
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Random success/failure for demo
    const success = Math.random() > 0.3;
    setConnectionStatus(success ? 'success' : 'error');
    setIsLoading(false);
  };

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete(config);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const renderDatabaseTypeStep = () => {
    const databases = [
      { id: 'postgresql', name: 'PostgreSQL', icon: '🐘', description: 'قاعدة بيانات علائقية مفتوحة المصدر' },
      { id: 'mysql', name: 'MySQL', icon: '🐬', description: 'قاعدة بيانات علائقية شائعة' },
      { id: 'sqlserver', name: 'SQL Server', icon: '🪟', description: 'قاعدة بيانات Microsoft' },
      { id: 'oracle', name: 'Oracle', icon: '🔴', description: 'قاعدة بيانات Oracle' },
      { id: 'mongodb', name: 'MongoDB', icon: '🍃', description: 'قاعدة بيانات NoSQL' },
      { id: 'sqlite', name: 'SQLite', icon: '📦', description: 'قاعدة بيانات ملف' }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {databases.map(db => (
          <button
            key={db.id}
            onClick={() => setConfig({ ...config, dbType: db.id })}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              config.dbType === db.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-3xl block mb-2">{db.icon}</span>
            <h4 className="font-semibold">{db.name}</h4>
            <p className="text-xs text-gray-500 mt-1">{db.description}</p>
          </button>
        ))}
      </div>
    );
  };

  const renderConnectionStep = () => {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المضيف (Host)</label>
            <input
              type="text"
              value={config.host || ''}
              onChange={(e) => setConfig({ ...config, host: e.target.value })}
              placeholder="localhost أو عنوان IP"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">المنفذ (Port)</label>
            <input
              type="text"
              value={config.port || ''}
              onChange={(e) => setConfig({ ...config, port: e.target.value })}
              placeholder="5432"
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم قاعدة البيانات</label>
          <input
            type="text"
            value={config.database || ''}
            onChange={(e) => setConfig({ ...config, database: e.target.value })}
            placeholder="mydb"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="ssl"
            checked={config.ssl === 'true'}
            onChange={(e) => setConfig({ ...config, ssl: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4"
          />
          <label htmlFor="ssl" className="text-sm text-gray-700 flex items-center gap-2">
            <Shield className="w-4 h-4 text-green-500" />
            استخدام اتصال SSL آمن
          </label>
        </div>
      </div>
    );
  };

  const renderAuthStep = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
          <input
            type="text"
            value={config.username || ''}
            onChange={(e) => setConfig({ ...config, username: e.target.value })}
            placeholder="admin"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
          <input
            type="password"
            value={config.password || ''}
            onChange={(e) => setConfig({ ...config, password: e.target.value })}
            placeholder="••••••••"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 flex items-start gap-2">
          <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-yellow-700">
            <strong>تنبيه أمني:</strong> بيانات الاتصال يتم تشفيرها ولا يتم تخزينها بشكل دائم.
          </div>
        </div>
      </div>
    );
  };

  const renderQueryStep = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم الجدول</label>
          <input
            type="text"
            value={config.table || ''}
            onChange={(e) => setConfig({ ...config, table: e.target.value })}
            placeholder="users"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div className="text-center text-gray-500">- أو -</div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">استعلام SQL مخصص</label>
          <textarea
            value={config.query || ''}
            onChange={(e) => setConfig({ ...config, query: e.target.value })}
            placeholder="SELECT * FROM users WHERE active = true"
            rows={5}
            className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700">
            <HelpCircle className="w-4 h-4" />
            مساعدة في SQL
          </button>
        </div>
      </div>
    );
  };

  const renderTestStep = () => {
    return (
      <div className="text-center py-8">
        {connectionStatus === 'idle' && (
          <div>
            <Database className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">جاهز للاختبار</h3>
            <p className="text-gray-500 mb-6">انقر لاختبار الاتصال بقاعدة البيانات</p>
            <button
              onClick={testConnection}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <Zap className="w-5 h-5" />
              اختبار الاتصال
            </button>
          </div>
        )}
        
        {connectionStatus === 'testing' && (
          <div>
            <Loader2 className="w-16 h-16 text-blue-600 mx-auto mb-4 animate-spin" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">جارٍ الاختبار...</h3>
            <p className="text-gray-500">يتم الاتصال بقاعدة البيانات</p>
          </div>
        )}
        
        {connectionStatus === 'success' && (
          <div>
            <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-700 mb-2">تم الاتصال بنجاح!</h3>
            <p className="text-gray-500 mb-4">قاعدة البيانات جاهزة للاستخدام</p>
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="text-sm text-green-700 space-y-1">
                <div className="flex justify-between">
                  <span>الإصدار:</span>
                  <span className="font-mono">PostgreSQL 14.2</span>
                </div>
                <div className="flex justify-between">
                  <span>الجداول:</span>
                  <span className="font-mono">24</span>
                </div>
                <div className="flex justify-between">
                  <span>زمن الاستجابة:</span>
                  <span className="font-mono">45ms</span>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {connectionStatus === 'error' && (
          <div>
            <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-red-700 mb-2">فشل الاتصال</h3>
            <p className="text-gray-500 mb-4">تحقق من بيانات الاتصال وحاول مرة أخرى</p>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md mx-auto text-right">
              <p className="text-sm text-red-700 font-mono">
                Error: Connection refused to host localhost:5432
              </p>
            </div>
            <button
              onClick={testConnection}
              className="mt-4 px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2 mx-auto"
            >
              <RefreshCw className="w-4 h-4" />
              إعادة المحاولة
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderCloudProviderStep = () => {
    const providers = [
      { id: 'gcs', name: 'Google Cloud Storage', icon: '☁️' },
      { id: 'bigquery', name: 'BigQuery', icon: '📊' },
      { id: 's3', name: 'AWS S3', icon: '🪣' },
      { id: 'azure', name: 'Azure Blob', icon: '☁️' },
      { id: 'sheets', name: 'Google Sheets', icon: '📋' },
      { id: 'dropbox', name: 'Dropbox', icon: '📦' }
    ];

    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {providers.map(p => (
          <button
            key={p.id}
            onClick={() => setConfig({ ...config, provider: p.id })}
            className={`p-4 border-2 rounded-xl text-center transition-all ${
              config.provider === p.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <span className="text-3xl block mb-2">{p.icon}</span>
            <h4 className="font-semibold">{p.name}</h4>
          </button>
        ))}
      </div>
    );
  };

  const renderCredentialsStep = () => {
    return (
      <div className="space-y-4">
        {config.provider === 'gcs' || config.provider === 'bigquery' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">معرف المشروع</label>
              <input
                type="text"
                value={config.projectId || ''}
                onChange={(e) => setConfig({ ...config, projectId: e.target.value })}
                placeholder="my-project-id"
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">ملف المفتاح (JSON)</label>
              <textarea
                value={config.keyFile || ''}
                onChange={(e) => setConfig({ ...config, keyFile: e.target.value })}
                placeholder='{"type": "service_account", ...}'
                rows={5}
                className="w-full border rounded-lg px-3 py-2 font-mono text-sm"
              />
            </div>
          </>
        ) : config.provider === 's3' ? (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Access Key ID</label>
              <input
                type="text"
                value={config.accessKey || ''}
                onChange={(e) => setConfig({ ...config, accessKey: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Secret Access Key</label>
              <input
                type="password"
                value={config.secretKey || ''}
                onChange={(e) => setConfig({ ...config, secretKey: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">المنطقة</label>
              <select
                value={config.region || ''}
                onChange={(e) => setConfig({ ...config, region: e.target.value })}
                className="w-full border rounded-lg px-3 py-2"
              >
                <option value="">اختر المنطقة</option>
                <option value="us-east-1">US East (N. Virginia)</option>
                <option value="us-west-2">US West (Oregon)</option>
                <option value="eu-west-1">EU (Ireland)</option>
                <option value="me-south-1">Middle East (Bahrain)</option>
              </select>
            </div>
          </>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رمز الوصول</label>
            <input
              type="password"
              value={config.accessToken || ''}
              onChange={(e) => setConfig({ ...config, accessToken: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        )}
      </div>
    );
  };

  const renderSourceStep = () => {
    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم الحاوية / Bucket</label>
          <input
            type="text"
            value={config.bucket || ''}
            onChange={(e) => setConfig({ ...config, bucket: e.target.value })}
            placeholder="my-bucket"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">المسار</label>
          <input
            type="text"
            value={config.path || ''}
            onChange={(e) => setConfig({ ...config, path: e.target.value })}
            placeholder="folder/data.csv"
            className="w-full border rounded-lg px-3 py-2"
          />
        </div>
      </div>
    );
  };

  const renderOptionsStep = () => {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="cache"
            checked={config.cache === 'true'}
            onChange={(e) => setConfig({ ...config, cache: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4"
          />
          <label htmlFor="cache" className="text-sm text-gray-700">
            تخزين البيانات مؤقتًا (Cache)
          </label>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="autoRefresh"
            checked={config.autoRefresh === 'true'}
            onChange={(e) => setConfig({ ...config, autoRefresh: e.target.checked ? 'true' : 'false' })}
            className="w-4 h-4"
          />
          <label htmlFor="autoRefresh" className="text-sm text-gray-700">
            تحديث تلقائي
          </label>
        </div>
        {config.autoRefresh === 'true' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">فترة التحديث (بالثواني)</label>
            <input
              type="number"
              value={config.refreshInterval || '300'}
              onChange={(e) => setConfig({ ...config, refreshInterval: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        )}
      </div>
    );
  };

  const renderStepContent = () => {
    if (type === 'database') {
      switch (steps[currentStep].id) {
        case 'type': return renderDatabaseTypeStep();
        case 'connection': return renderConnectionStep();
        case 'authentication': return renderAuthStep();
        case 'query': return renderQueryStep();
        case 'test': return renderTestStep();
      }
    } else {
      switch (steps[currentStep].id) {
        case 'provider': return renderCloudProviderStep();
        case 'credentials': return renderCredentialsStep();
        case 'source': return renderSourceStep();
        case 'options': return renderOptionsStep();
        case 'test': return renderTestStep();
      }
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-2xl w-full">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
        <div className="flex items-center gap-3">
          {type === 'database' ? <Database className="w-8 h-8" /> : <Cloud className="w-8 h-8" />}
          <div>
            <h2 className="text-xl font-bold">
              {type === 'database' ? 'معالج الاتصال بقاعدة البيانات' : 'معالج الاتصال السحابي'}
            </h2>
            <p className="text-blue-100 text-sm">{steps[currentStep].description}</p>
          </div>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="px-6 py-4 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className="flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    idx < currentStep
                      ? 'bg-green-500 text-white'
                      : idx === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {idx < currentStep ? <CheckCircle className="w-5 h-5" /> : idx + 1}
                </div>
                <span className={`text-xs mt-1 ${idx === currentStep ? 'text-blue-600 font-medium' : 'text-gray-500'}`}>
                  {step.title}
                </span>
              </div>
              {idx < steps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 ${idx < currentStep ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 min-h-[300px]">
        {renderStepContent()}
      </div>

      {/* Footer */}
      <div className="px-6 py-4 border-t bg-gray-50 flex justify-between">
        <button
          onClick={currentStep === 0 ? onCancel : handlePrev}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          <ArrowRight className="w-4 h-4" />
          {currentStep === 0 ? 'إلغاء' : 'السابق'}
        </button>
        <button
          onClick={handleNext}
          disabled={isLoading || (currentStep === steps.length - 1 && connectionStatus !== 'success')}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {currentStep === steps.length - 1 ? 'إنهاء' : 'التالي'}
          <ArrowLeft className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default DataConnectionWizard;
