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
  Database,
  HardDrive,
  RefreshCw,
  Play,
  Shield
} from 'lucide-react';

interface AWSConnectorProps {
  onConnect: (config: any) => void;
  onDataLoaded: (data: any[]) => void;
}

type ServiceType = 's3' | 'redshift' | 'athena' | 'rds';
type AuthMethod = 'access_keys' | 'iam_role' | 'profile';

const AWSConnector: React.FC<AWSConnectorProps> = ({ onConnect, onDataLoaded }) => {
  const [serviceType, setServiceType] = useState<ServiceType>('s3');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('access_keys');
  const [showSecrets, setShowSecrets] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Access Keys
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretAccessKey, setSecretAccessKey] = useState('');
  const [sessionToken, setSessionToken] = useState('');
  const [region, setRegion] = useState('us-east-1');

  // IAM Role
  const [roleArn, setRoleArn] = useState('');
  const [externalId, setExternalId] = useState('');

  // Profile
  const [profileName, setProfileName] = useState('default');

  // S3
  const [bucketName, setBucketName] = useState('');
  const [objectKey, setObjectKey] = useState('');
  const [fileFormat, setFileFormat] = useState<'csv' | 'json' | 'parquet'>('csv');

  // Redshift
  const [redshiftHost, setRedshiftHost] = useState('');
  const [redshiftPort, setRedshiftPort] = useState('5439');
  const [redshiftDatabase, setRedshiftDatabase] = useState('');
  const [redshiftUsername, setRedshiftUsername] = useState('');
  const [redshiftPassword, setRedshiftPassword] = useState('');
  const [redshiftQuery, setRedshiftQuery] = useState('SELECT * FROM schema.table LIMIT 1000');

  // Athena
  const [athenaDatabase, setAthenaDatabase] = useState('');
  const [athenaQuery, setAthenaQuery] = useState('');
  const [athenaOutputLocation, setAthenaOutputLocation] = useState('');

  // RDS
  const [rdsEngine, setRdsEngine] = useState<'mysql' | 'postgresql' | 'sqlserver'>('postgresql');
  const [rdsEndpoint, setRdsEndpoint] = useState('');
  const [rdsPort, setRdsPort] = useState('5432');
  const [rdsDatabase, setRdsDatabase] = useState('');
  const [rdsUsername, setRdsUsername] = useState('');
  const [rdsPassword, setRdsPassword] = useState('');
  const [rdsQuery, setRdsQuery] = useState('');

  const regions = [
    { value: 'us-east-1', label: 'US East (N. Virginia)' },
    { value: 'us-east-2', label: 'US East (Ohio)' },
    { value: 'us-west-1', label: 'US West (N. California)' },
    { value: 'us-west-2', label: 'US West (Oregon)' },
    { value: 'eu-west-1', label: 'Europe (Ireland)' },
    { value: 'eu-west-2', label: 'Europe (London)' },
    { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
    { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
    { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
    { value: 'ap-south-1', label: 'Asia Pacific (Mumbai)' },
    { value: 'me-south-1', label: 'Middle East (Bahrain)' },
    { value: 'af-south-1', label: 'Africa (Cape Town)' }
  ];

  const services = [
    { id: 's3', name: 'S3', icon: HardDrive, color: 'from-green-500 to-green-600', desc: 'تخزين الكائنات' },
    { id: 'redshift', name: 'Redshift', icon: Database, color: 'from-red-500 to-red-600', desc: 'مستودع البيانات' },
    { id: 'athena', name: 'Athena', icon: Database, color: 'from-purple-500 to-purple-600', desc: 'استعلام SQL تفاعلي' },
    { id: 'rds', name: 'RDS', icon: Database, color: 'from-blue-500 to-blue-600', desc: 'قاعدة بيانات علائقية' }
  ];

  const testConnection = async () => {
    setIsConnecting(true);
    setError(null);
    setConnectionStatus('idle');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionStatus('success');
      
      const sampleData = [
        { id: 1, product: 'Product A', sales: 1500, region: 'US' },
        { id: 2, product: 'Product B', sales: 2300, region: 'EU' },
        { id: 3, product: 'Product C', sales: 1800, region: 'Asia' },
      ];
      
      onDataLoaded(sampleData);
      onConnect({
        provider: 'aws',
        service: serviceType,
        authMethod,
        region,
        bucketName,
        redshiftHost
      });
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'فشل الاتصال');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* اختيار الخدمة */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">اختر خدمة AWS</label>
        <div className="grid grid-cols-2 gap-3">
          {services.map(service => {
            const Icon = service.icon;
            return (
              <button
                key={service.id}
                onClick={() => setServiceType(service.id as ServiceType)}
                className={`p-4 rounded-xl border-2 transition-all text-right ${
                  serviceType === service.id
                    ? 'border-orange-500 bg-orange-50'
                    : 'border-gray-200 hover:border-orange-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${service.color} flex items-center justify-center`}>
                    <Icon className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <span className="font-semibold text-gray-800">{service.name}</span>
                    <p className="text-xs text-gray-500">{service.desc}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* طريقة المصادقة */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">طريقة المصادقة</label>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setAuthMethod('access_keys')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'access_keys'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <Key className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <span className="text-sm font-medium">Access Keys</span>
          </button>
          <button
            onClick={() => setAuthMethod('iam_role')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'iam_role'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <Shield className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <span className="text-sm font-medium">IAM Role</span>
          </button>
          <button
            onClick={() => setAuthMethod('profile')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'profile'
                ? 'border-orange-500 bg-orange-50'
                : 'border-gray-200 hover:border-orange-300'
            }`}
          >
            <Cloud className="w-5 h-5 mx-auto mb-1 text-orange-500" />
            <span className="text-sm font-medium">AWS Profile</span>
          </button>
        </div>
      </div>

      {/* بيانات الاعتماد */}
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

        {/* Region - مشترك */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Region</label>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
          >
            {regions.map(r => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>

        {authMethod === 'access_keys' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">كيفية الحصول على Access Keys:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>اذهب إلى AWS Console → IAM</li>
                    <li>Users → اختر المستخدم → Security credentials</li>
                    <li>Create access key</li>
                    <li>حدد Use case: Application running outside AWS</li>
                  </ol>
                  <a
                    href="https://console.aws.amazon.com/iam/home#/security_credentials"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800"
                  >
                    فتح AWS IAM Console
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Access Key ID</label>
              <input
                type="text"
                value={accessKeyId}
                onChange={(e) => setAccessKeyId(e.target.value)}
                placeholder="AKIAIOSFODNN7EXAMPLE"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Secret Access Key</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={secretAccessKey}
                onChange={(e) => setSecretAccessKey(e.target.value)}
                placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                Session Token <span className="text-gray-400">(اختياري - للاعتمادات المؤقتة)</span>
              </label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={sessionToken}
                onChange={(e) => setSessionToken(e.target.value)}
                placeholder="FwoGZXIvYXdzE..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
            </div>
          </>
        )}

        {authMethod === 'iam_role' && (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">IAM Role Assumption:</p>
                  <p className="text-xs">يتطلب إعداد Trust Policy صحيح للسماح بالـ AssumeRole</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Role ARN</label>
              <input
                type="text"
                value={roleArn}
                onChange={(e) => setRoleArn(e.target.value)}
                placeholder="arn:aws:iam::123456789012:role/MyRole"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                External ID <span className="text-gray-400">(اختياري)</span>
              </label>
              <input
                type="text"
                value={externalId}
                onChange={(e) => setExternalId(e.target.value)}
                placeholder="external-id-123"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
          </>
        )}

        {authMethod === 'profile' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Profile Name</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="default"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              من ملف ~/.aws/credentials
            </p>
          </div>
        )}
      </div>

      {/* إعدادات الخدمة */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h4 className="font-semibold text-gray-700">
          إعدادات {services.find(s => s.id === serviceType)?.name}
        </h4>

        {serviceType === 's3' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Bucket Name</label>
              <input
                type="text"
                value={bucketName}
                onChange={(e) => setBucketName(e.target.value)}
                placeholder="my-data-bucket"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Object Key (Path)</label>
              <input
                type="text"
                value={objectKey}
                onChange={(e) => setObjectKey(e.target.value)}
                placeholder="data/analytics/report.csv"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">File Format</label>
              <select
                value={fileFormat}
                onChange={(e) => setFileFormat(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="csv">CSV</option>
                <option value="json">JSON</option>
                <option value="parquet">Parquet</option>
              </select>
            </div>
          </>
        )}

        {serviceType === 'redshift' && (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Host (Endpoint)</label>
                <input
                  type="text"
                  value={redshiftHost}
                  onChange={(e) => setRedshiftHost(e.target.value)}
                  placeholder="cluster.xxx.region.redshift.amazonaws.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Port</label>
                <input
                  type="text"
                  value={redshiftPort}
                  onChange={(e) => setRedshiftPort(e.target.value)}
                  placeholder="5439"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Database</label>
              <input
                type="text"
                value={redshiftDatabase}
                onChange={(e) => setRedshiftDatabase(e.target.value)}
                placeholder="analytics"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                <input
                  type="text"
                  value={redshiftUsername}
                  onChange={(e) => setRedshiftUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={redshiftPassword}
                  onChange={(e) => setRedshiftPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SQL Query</label>
              <textarea
                value={redshiftQuery}
                onChange={(e) => setRedshiftQuery(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                placeholder="SELECT * FROM schema.table LIMIT 1000"
              />
            </div>
          </>
        )}

        {serviceType === 'athena' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Database</label>
              <input
                type="text"
                value={athenaDatabase}
                onChange={(e) => setAthenaDatabase(e.target.value)}
                placeholder="my_database"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Output Location (S3)</label>
              <input
                type="text"
                value={athenaOutputLocation}
                onChange={(e) => setAthenaOutputLocation(e.target.value)}
                placeholder="s3://my-bucket/athena-results/"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SQL Query</label>
              <textarea
                value={athenaQuery}
                onChange={(e) => setAthenaQuery(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                placeholder="SELECT * FROM my_table WHERE date > '2024-01-01'"
              />
            </div>
          </>
        )}

        {serviceType === 'rds' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Database Engine</label>
              <select
                value={rdsEngine}
                onChange={(e) => setRdsEngine(e.target.value as any)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              >
                <option value="postgresql">PostgreSQL</option>
                <option value="mysql">MySQL</option>
                <option value="sqlserver">SQL Server</option>
              </select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Endpoint</label>
                <input
                  type="text"
                  value={rdsEndpoint}
                  onChange={(e) => setRdsEndpoint(e.target.value)}
                  placeholder="database.xxx.region.rds.amazonaws.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 text-sm"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Port</label>
                <input
                  type="text"
                  value={rdsPort}
                  onChange={(e) => setRdsPort(e.target.value)}
                  placeholder="5432"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Database Name</label>
              <input
                type="text"
                value={rdsDatabase}
                onChange={(e) => setRdsDatabase(e.target.value)}
                placeholder="mydb"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                <input
                  type="text"
                  value={rdsUsername}
                  onChange={(e) => setRdsUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={rdsPassword}
                  onChange={(e) => setRdsPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SQL Query</label>
              <textarea
                value={rdsQuery}
                onChange={(e) => setRdsQuery(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 font-mono text-sm"
                placeholder="SELECT * FROM users LIMIT 1000"
              />
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
              <span className="text-green-700">تم الاتصال بـ AWS بنجاح!</span>
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
        className="w-full py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-xl font-semibold hover:from-orange-600 hover:to-orange-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isConnecting ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            جاري الاتصال بـ AWS...
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

export default AWSConnector;
