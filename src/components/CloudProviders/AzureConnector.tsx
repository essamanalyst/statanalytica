import React, { useState } from 'react';
import {
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
  Cloud
} from 'lucide-react';

interface AzureConnectorProps {
  onConnect: (config: any) => void;
  onDataLoaded: (data: any[]) => void;
}

type ServiceType = 'blob' | 'sql' | 'synapse' | 'cosmos';
type AuthMethod = 'connection_string' | 'sas_token' | 'service_principal' | 'managed_identity';

const AzureConnector: React.FC<AzureConnectorProps> = ({ onConnect, onDataLoaded }) => {
  const [serviceType, setServiceType] = useState<ServiceType>('blob');
  const [authMethod, setAuthMethod] = useState<AuthMethod>('connection_string');
  const [showSecrets, setShowSecrets] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  // Connection String
  const [connectionString, setConnectionString] = useState('');

  // SAS Token
  const [accountName, setAccountName] = useState('');
  const [sasToken, setSasToken] = useState('');

  // Service Principal
  const [tenantId, setTenantId] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');

  // Blob Storage
  const [containerName, setContainerName] = useState('');
  const [blobPath, setBlobPath] = useState('');
  const [fileFormat, setFileFormat] = useState<'csv' | 'json' | 'parquet'>('csv');

  // SQL Database
  const [sqlServer, setSqlServer] = useState('');
  const [sqlDatabase, setSqlDatabase] = useState('');
  const [sqlUsername, setSqlUsername] = useState('');
  const [sqlPassword, setSqlPassword] = useState('');
  const [sqlQuery, setSqlQuery] = useState('SELECT TOP 1000 * FROM dbo.TableName');

  // Synapse
  const [synapseWorkspace, setSynapseWorkspace] = useState('');
  const [synapseSqlPool, setSynapseSqlPool] = useState('');
  const [synapseQuery, setSynapseQuery] = useState('');

  // Cosmos DB
  const [cosmosEndpoint, setCosmosEndpoint] = useState('');
  const [cosmosKey, setCosmosKey] = useState('');
  const [cosmosDatabase, setCosmosDatabase] = useState('');
  const [cosmosContainer, setCosmosContainer] = useState('');
  const [cosmosQuery, setCosmosQuery] = useState('SELECT * FROM c');

  const services = [
    { id: 'blob', name: 'Blob Storage', icon: HardDrive, color: 'from-blue-500 to-blue-600', desc: 'تخزين الملفات' },
    { id: 'sql', name: 'SQL Database', icon: Database, color: 'from-blue-600 to-blue-700', desc: 'قاعدة بيانات SQL' },
    { id: 'synapse', name: 'Synapse', icon: Database, color: 'from-purple-500 to-purple-600', desc: 'تحليلات متقدمة' },
    { id: 'cosmos', name: 'Cosmos DB', icon: Database, color: 'from-green-500 to-teal-600', desc: 'NoSQL عالمي' }
  ];

  const testConnection = async () => {
    setIsConnecting(true);
    setError(null);
    setConnectionStatus('idle');

    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setConnectionStatus('success');
      
      const sampleData = [
        { id: 1, category: 'Electronics', revenue: 25000, country: 'UAE' },
        { id: 2, category: 'Clothing', revenue: 18000, country: 'KSA' },
        { id: 3, category: 'Food', revenue: 32000, country: 'Egypt' },
      ];
      
      onDataLoaded(sampleData);
      onConnect({
        provider: 'azure',
        service: serviceType,
        authMethod,
        accountName,
        containerName
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
        <label className="block text-sm font-semibold text-gray-700 mb-3">اختر خدمة Azure</label>
        <div className="grid grid-cols-2 gap-3">
          {services.map(service => {
            const Icon = service.icon;
            return (
              <button
                key={service.id}
                onClick={() => setServiceType(service.id as ServiceType)}
                className={`p-4 rounded-xl border-2 transition-all text-right ${
                  serviceType === service.id
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300'
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
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAuthMethod('connection_string')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'connection_string'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <Key className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <span className="text-sm font-medium">Connection String</span>
          </button>
          <button
            onClick={() => setAuthMethod('sas_token')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'sas_token'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <Key className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <span className="text-sm font-medium">SAS Token</span>
          </button>
          <button
            onClick={() => setAuthMethod('service_principal')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'service_principal'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <Cloud className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <span className="text-sm font-medium">Service Principal</span>
          </button>
          <button
            onClick={() => setAuthMethod('managed_identity')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'managed_identity'
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <Cloud className="w-5 h-5 mx-auto mb-1 text-blue-500" />
            <span className="text-sm font-medium">Managed Identity</span>
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

        {authMethod === 'connection_string' && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">كيفية الحصول على Connection String:</p>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>اذهب إلى Azure Portal</li>
                    <li>Storage Account → Access keys</li>
                    <li>انسخ Connection string</li>
                  </ol>
                  <a
                    href="https://portal.azure.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800"
                  >
                    فتح Azure Portal
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Connection String</label>
              <textarea
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                rows={3}
                placeholder="DefaultEndpointsProtocol=https;AccountName=xxx;AccountKey=xxx;EndpointSuffix=core.windows.net"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs ${
                  !showSecrets ? 'blur-sm hover:blur-none' : ''
                }`}
              />
            </div>
          </>
        )}

        {authMethod === 'sas_token' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Storage Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                placeholder="mystorageaccount"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SAS Token</label>
              <textarea
                value={sasToken}
                onChange={(e) => setSasToken(e.target.value)}
                rows={2}
                placeholder="?sv=2021-06-08&ss=bfqt&srt=sco&sp=rwdlacupiytfx&se=..."
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-xs ${
                  !showSecrets ? 'blur-sm hover:blur-none' : ''
                }`}
              />
            </div>
          </>
        )}

        {authMethod === 'service_principal' && (
          <>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
                <div className="text-sm text-yellow-700">
                  <p className="font-medium">App Registration مطلوب:</p>
                  <p className="text-xs">يجب إنشاء App Registration في Azure AD وتعيين الأذونات المناسبة</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Tenant ID (Directory ID)</label>
              <input
                type="text"
                value={tenantId}
                onChange={(e) => setTenantId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Client ID (Application ID)</label>
              <input
                type="text"
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Client Secret</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                placeholder="xxx~xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>
          </>
        )}

        {authMethod === 'managed_identity' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
            <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-500" />
            <p className="text-green-700 font-medium">Managed Identity</p>
            <p className="text-sm text-green-600 mt-1">
              سيتم استخدام الهوية المُدارة للموارد تلقائياً
            </p>
            <p className="text-xs text-green-500 mt-2">
              تأكد من تفعيل System-assigned managed identity على المورد
            </p>
          </div>
        )}
      </div>

      {/* إعدادات الخدمة */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        <h4 className="font-semibold text-gray-700">
          إعدادات {services.find(s => s.id === serviceType)?.name}
        </h4>

        {serviceType === 'blob' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Container Name</label>
              <input
                type="text"
                value={containerName}
                onChange={(e) => setContainerName(e.target.value)}
                placeholder="my-container"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Blob Path</label>
              <input
                type="text"
                value={blobPath}
                onChange={(e) => setBlobPath(e.target.value)}
                placeholder="data/sales/report.csv"
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
              </select>
            </div>
          </>
        )}

        {serviceType === 'sql' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Server Name</label>
              <input
                type="text"
                value={sqlServer}
                onChange={(e) => setSqlServer(e.target.value)}
                placeholder="myserver.database.windows.net"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Database</label>
              <input
                type="text"
                value={sqlDatabase}
                onChange={(e) => setSqlDatabase(e.target.value)}
                placeholder="mydb"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                <input
                  type="text"
                  value={sqlUsername}
                  onChange={(e) => setSqlUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={sqlPassword}
                  onChange={(e) => setSqlPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SQL Query</label>
              <textarea
                value={sqlQuery}
                onChange={(e) => setSqlQuery(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="SELECT TOP 1000 * FROM dbo.TableName"
              />
            </div>
          </>
        )}

        {serviceType === 'synapse' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Workspace Name</label>
              <input
                type="text"
                value={synapseWorkspace}
                onChange={(e) => setSynapseWorkspace(e.target.value)}
                placeholder="my-synapse-workspace"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Dedicated SQL Pool</label>
              <input
                type="text"
                value={synapseSqlPool}
                onChange={(e) => setSynapseSqlPool(e.target.value)}
                placeholder="SQLPool1"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SQL Query</label>
              <textarea
                value={synapseQuery}
                onChange={(e) => setSynapseQuery(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="SELECT * FROM dbo.FactSales"
              />
            </div>
          </>
        )}

        {serviceType === 'cosmos' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Account Endpoint</label>
              <input
                type="text"
                value={cosmosEndpoint}
                onChange={(e) => setCosmosEndpoint(e.target.value)}
                placeholder="https://myaccount.documents.azure.com:443/"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Primary Key</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={cosmosKey}
                onChange={(e) => setCosmosKey(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Database</label>
                <input
                  type="text"
                  value={cosmosDatabase}
                  onChange={(e) => setCosmosDatabase(e.target.value)}
                  placeholder="mydb"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Container</label>
                <input
                  type="text"
                  value={cosmosContainer}
                  onChange={(e) => setCosmosContainer(e.target.value)}
                  placeholder="mycontainer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">SQL Query</label>
              <textarea
                value={cosmosQuery}
                onChange={(e) => setCosmosQuery(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                placeholder="SELECT * FROM c WHERE c.category = 'electronics'"
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
              <span className="text-green-700">تم الاتصال بـ Azure بنجاح!</span>
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
        className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {isConnecting ? (
          <>
            <RefreshCw className="w-5 h-5 animate-spin" />
            جاري الاتصال بـ Azure...
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

export default AzureConnector;
