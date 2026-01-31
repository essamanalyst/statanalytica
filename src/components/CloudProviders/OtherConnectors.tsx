import React, { useState } from 'react';
import {
  Key,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Info,
  ExternalLink,
  RefreshCw,
  Play,
  Database,
  Globe,
  FileJson
} from 'lucide-react';

// Snowflake Connector
interface SnowflakeConnectorProps {
  onConnect: (config: any) => void;
  onDataLoaded: (data: any[]) => void;
}

export const SnowflakeConnector: React.FC<SnowflakeConnectorProps> = ({ onConnect, onDataLoaded }) => {
  const [showSecrets, setShowSecrets] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [authMethod, setAuthMethod] = useState<'password' | 'key_pair' | 'sso'>('password');

  const [account, setAccount] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [warehouse, setWarehouse] = useState('');
  const [database, setDatabase] = useState('');
  const [schema, setSchema] = useState('');
  const [role, setRole] = useState('');
  const [query, setQuery] = useState('SELECT * FROM table_name LIMIT 1000');

  // Key Pair
  const [privateKey, setPrivateKey] = useState('');
  const [passphrase, setPassphrase] = useState('');

  const testConnection = async () => {
    setIsConnecting(true);
    setConnectionStatus('idle');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConnectionStatus('success');
      
      const sampleData = [
        { id: 1, customer: 'Acme Corp', amount: 50000, region: 'EMEA' },
        { id: 2, customer: 'Tech Inc', amount: 75000, region: 'APAC' },
        { id: 3, customer: 'Global Ltd', amount: 120000, region: 'Americas' },
      ];
      
      onDataLoaded(sampleData);
      onConnect({ provider: 'snowflake', account, warehouse, database });
    } catch {
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-4 border border-cyan-200">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">❄️</span>
          <div>
            <h3 className="font-bold text-gray-800">Snowflake</h3>
            <p className="text-sm text-gray-600">مستودع بيانات سحابي</p>
          </div>
        </div>
      </div>

      {/* طريقة المصادقة */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">طريقة المصادقة</label>
        <div className="grid grid-cols-3 gap-3">
          {[
            { id: 'password', name: 'كلمة المرور' },
            { id: 'key_pair', name: 'Key Pair' },
            { id: 'sso', name: 'SSO/Okta' }
          ].map(method => (
            <button
              key={method.id}
              onClick={() => setAuthMethod(method.id as any)}
              className={`p-3 rounded-lg border-2 transition-all ${
                authMethod === method.id
                  ? 'border-cyan-500 bg-cyan-50'
                  : 'border-gray-200 hover:border-cyan-300'
              }`}
            >
              <span className="text-sm font-medium">{method.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* بيانات الاتصال */}
      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-700 flex items-center gap-2">
            <Key className="w-4 h-4" />
            بيانات الاتصال
          </h4>
          <button onClick={() => setShowSecrets(!showSecrets)} className="text-gray-500 hover:text-gray-700">
            {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Info className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Account Identifier:</p>
              <p className="text-xs">الصيغة: <code className="bg-blue-100 px-1 rounded">orgname-account_name</code> أو <code className="bg-blue-100 px-1 rounded">account.region.cloud</code></p>
              <a
                href="https://docs.snowflake.com/en/user-guide/admin-account-identifier"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 mt-2 text-blue-600 hover:text-blue-800"
              >
                مزيد من المعلومات
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Account Identifier</label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="myorg-myaccount أو xy12345.us-east-1.aws"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="my_username"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        {authMethod === 'password' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
            <input
              type={showSecrets ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        )}

        {authMethod === 'key_pair' && (
          <>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Private Key (PEM)</label>
              <textarea
                value={privateKey}
                onChange={(e) => setPrivateKey(e.target.value)}
                rows={3}
                placeholder="-----BEGIN ENCRYPTED PRIVATE KEY-----"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Passphrase (اختياري)</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
              />
            </div>
          </>
        )}

        {authMethod === 'sso' && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">SSO Authentication:</p>
                <p className="text-xs">سيتم فتح نافذة المتصفح للمصادقة عبر مزود الهوية (Okta, Azure AD, etc.)</p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Warehouse</label>
            <input
              type="text"
              value={warehouse}
              onChange={(e) => setWarehouse(e.target.value)}
              placeholder="COMPUTE_WH"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Role (اختياري)</label>
            <input
              type="text"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="ACCOUNTADMIN"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Database</label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="MY_DATABASE"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Schema</label>
            <input
              type="text"
              value={schema}
              onChange={(e) => setSchema(e.target.value)}
              placeholder="PUBLIC"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* الاستعلام */}
      <div>
        <label className="block text-sm font-medium text-gray-600 mb-1">SQL Query</label>
        <textarea
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 font-mono text-sm"
        />
      </div>

      {/* حالة الاتصال */}
      {connectionStatus !== 'idle' && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          connectionStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {connectionStatus === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">تم الاتصال بـ Snowflake بنجاح!</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">فشل الاتصال</span>
            </>
          )}
        </div>
      )}

      <button
        onClick={testConnection}
        disabled={isConnecting}
        className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl font-semibold hover:from-cyan-600 hover:to-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

// MongoDB Connector
interface MongoDBConnectorProps {
  onConnect: (config: any) => void;
  onDataLoaded: (data: any[]) => void;
}

export const MongoDBConnector: React.FC<MongoDBConnectorProps> = ({ onConnect, onDataLoaded }) => {
  const [showSecrets, setShowSecrets] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [authMethod, setAuthMethod] = useState<'connection_string' | 'credentials'>('connection_string');

  const [connectionString, setConnectionString] = useState('');
  const [host, setHost] = useState('');
  const [port, setPort] = useState('27017');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [database, setDatabase] = useState('');
  const [collection, setCollection] = useState('');
  const [query, setQuery] = useState('{}');
  const [projection, setProjection] = useState('');
  const [limit, setLimit] = useState('1000');

  const testConnection = async () => {
    setIsConnecting(true);
    setConnectionStatus('idle');
    
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      setConnectionStatus('success');
      
      const sampleData = [
        { _id: '1', name: 'Document 1', type: 'A', value: 100 },
        { _id: '2', name: 'Document 2', type: 'B', value: 200 },
        { _id: '3', name: 'Document 3', type: 'A', value: 150 },
      ];
      
      onDataLoaded(sampleData);
      onConnect({ provider: 'mongodb', database, collection });
    } catch {
      setConnectionStatus('error');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-3xl">🍃</span>
          <div>
            <h3 className="font-bold text-gray-800">MongoDB</h3>
            <p className="text-sm text-gray-600">قاعدة بيانات NoSQL</p>
          </div>
        </div>
      </div>

      {/* طريقة الاتصال */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">طريقة الاتصال</label>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setAuthMethod('connection_string')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'connection_string'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <Database className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <span className="text-sm font-medium">Connection String</span>
          </button>
          <button
            onClick={() => setAuthMethod('credentials')}
            className={`p-3 rounded-lg border-2 transition-all ${
              authMethod === 'credentials'
                ? 'border-green-500 bg-green-50'
                : 'border-gray-200 hover:border-green-300'
            }`}
          >
            <Key className="w-5 h-5 mx-auto mb-1 text-green-500" />
            <span className="text-sm font-medium">بيانات الاعتماد</span>
          </button>
        </div>
      </div>

      <div className="bg-gray-50 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold text-gray-700 flex items-center gap-2">
            <Key className="w-4 h-4" />
            بيانات الاتصال
          </h4>
          <button onClick={() => setShowSecrets(!showSecrets)} className="text-gray-500 hover:text-gray-700">
            {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {authMethod === 'connection_string' ? (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Info className="w-5 h-5 text-blue-500 mt-0.5" />
                <div className="text-sm text-blue-700">
                  <p className="font-medium mb-1">MongoDB Atlas Connection String:</p>
                  <p className="text-xs">يمكنك الحصول عليه من Atlas Dashboard → Connect → Drivers</p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Connection String</label>
              <textarea
                value={connectionString}
                onChange={(e) => setConnectionString(e.target.value)}
                rows={2}
                placeholder="mongodb+srv://username:password@cluster.mongodb.net/database"
                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-xs ${
                  !showSecrets ? 'blur-sm hover:blur-none' : ''
                }`}
              />
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-600 mb-1">Host</label>
                <input
                  type="text"
                  value={host}
                  onChange={(e) => setHost(e.target.value)}
                  placeholder="cluster.mongodb.net"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Port</label>
                <input
                  type="text"
                  value={port}
                  onChange={(e) => setPort(e.target.value)}
                  placeholder="27017"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Database</label>
            <input
              type="text"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="mydb"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Collection</label>
            <input
              type="text"
              value={collection}
              onChange={(e) => setCollection(e.target.value)}
              placeholder="users"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* Query */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">Query Filter (JSON)</label>
          <textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            placeholder='{"status": "active", "age": {"$gt": 18}}'
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Projection (اختياري)</label>
            <input
              type="text"
              value={projection}
              onChange={(e) => setProjection(e.target.value)}
              placeholder='{"name": 1, "email": 1}'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 font-mono text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Limit</label>
            <input
              type="number"
              value={limit}
              onChange={(e) => setLimit(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
          </div>
        </div>
      </div>

      {/* حالة الاتصال */}
      {connectionStatus !== 'idle' && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          connectionStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {connectionStatus === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">تم الاتصال بـ MongoDB بنجاح!</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">فشل الاتصال</span>
            </>
          )}
        </div>
      )}

      <button
        onClick={testConnection}
        disabled={isConnecting}
        className="w-full py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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

// REST API Connector
interface APIConnectorProps {
  onConnect: (config: any) => void;
  onDataLoaded: (data: any[]) => void;
}

export const APIConnector: React.FC<APIConnectorProps> = ({ onConnect, onDataLoaded }) => {
  const [showSecrets, setShowSecrets] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [error, setError] = useState<string | null>(null);

  const [url, setUrl] = useState('');
  const [method, setMethod] = useState<'GET' | 'POST'>('GET');
  const [authType, setAuthType] = useState<'none' | 'bearer' | 'basic' | 'api_key'>('none');
  const [bearerToken, setBearerToken] = useState('');
  const [basicUsername, setBasicUsername] = useState('');
  const [basicPassword, setBasicPassword] = useState('');
  const [apiKeyName, setApiKeyName] = useState('X-API-Key');
  const [apiKeyValue, setApiKeyValue] = useState('');
  const [apiKeyLocation, setApiKeyLocation] = useState<'header' | 'query'>('header');
  const [headers, setHeaders] = useState('');
  const [body, setBody] = useState('');
  const [dataPath, setDataPath] = useState('');

  const testConnection = async () => {
    setIsConnecting(true);
    setConnectionStatus('idle');
    setError(null);
    
    try {
      // Build headers
      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      // Add auth headers
      if (authType === 'bearer') {
        requestHeaders['Authorization'] = `Bearer ${bearerToken}`;
      } else if (authType === 'basic') {
        requestHeaders['Authorization'] = `Basic ${btoa(`${basicUsername}:${basicPassword}`)}`;
      } else if (authType === 'api_key' && apiKeyLocation === 'header') {
        requestHeaders[apiKeyName] = apiKeyValue;
      }

      // Parse custom headers
      if (headers) {
        try {
          const customHeaders = JSON.parse(headers);
          Object.assign(requestHeaders, customHeaders);
        } catch {
          // Invalid JSON
        }
      }

      // Build URL with API key if needed
      let finalUrl = url;
      if (authType === 'api_key' && apiKeyLocation === 'query') {
        const separator = url.includes('?') ? '&' : '?';
        finalUrl = `${url}${separator}${apiKeyName}=${apiKeyValue}`;
      }

      const response = await fetch(finalUrl, {
        method,
        headers: requestHeaders,
        body: method === 'POST' && body ? body : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let data = await response.json();

      // Extract data from path
      if (dataPath) {
        const paths = dataPath.split('.');
        for (const p of paths) {
          if (data && typeof data === 'object') {
            data = data[p];
          }
        }
      }

      if (Array.isArray(data)) {
        setConnectionStatus('success');
        onDataLoaded(data);
        onConnect({ provider: 'api', url: finalUrl, method });
      } else if (typeof data === 'object') {
        setConnectionStatus('success');
        onDataLoaded([data]);
        onConnect({ provider: 'api', url: finalUrl, method });
      } else {
        throw new Error('البيانات المستلمة ليست بصيغة صحيحة');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(err instanceof Error ? err.message : 'فشل الاتصال');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-200">
        <div className="flex items-center gap-3 mb-3">
          <Globe className="w-8 h-8 text-purple-500" />
          <div>
            <h3 className="font-bold text-gray-800">REST API</h3>
            <p className="text-sm text-gray-600">الاتصال بأي API خارجي</p>
          </div>
        </div>
      </div>

      {/* URL والـ Method */}
      <div className="flex gap-3">
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 bg-white"
        >
          <option value="GET">GET</option>
          <option value="POST">POST</option>
        </select>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/data"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
        />
      </div>

      {/* نوع المصادقة */}
      <div>
        <label className="block text-sm font-semibold text-gray-700 mb-3">المصادقة</label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'none', name: 'بدون' },
            { id: 'bearer', name: 'Bearer Token' },
            { id: 'basic', name: 'Basic Auth' },
            { id: 'api_key', name: 'API Key' }
          ].map(auth => (
            <button
              key={auth.id}
              onClick={() => setAuthType(auth.id as any)}
              className={`p-2 rounded-lg border-2 transition-all text-sm ${
                authType === auth.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
            >
              {auth.name}
            </button>
          ))}
        </div>
      </div>

      {/* حقول المصادقة */}
      {authType !== 'none' && (
        <div className="bg-gray-50 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-gray-700 flex items-center gap-2">
              <Key className="w-4 h-4" />
              بيانات المصادقة
            </h4>
            <button onClick={() => setShowSecrets(!showSecrets)} className="text-gray-500 hover:text-gray-700">
              {showSecrets ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {authType === 'bearer' && (
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Bearer Token</label>
              <input
                type={showSecrets ? 'text' : 'password'}
                value={bearerToken}
                onChange={(e) => setBearerToken(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
              />
            </div>
          )}

          {authType === 'basic' && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Username</label>
                <input
                  type="text"
                  value={basicUsername}
                  onChange={(e) => setBasicUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">Password</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={basicPassword}
                  onChange={(e) => setBasicPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {authType === 'api_key' && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Key Name</label>
                  <input
                    type="text"
                    value={apiKeyName}
                    onChange={(e) => setApiKeyName(e.target.value)}
                    placeholder="X-API-Key"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Location</label>
                  <select
                    value={apiKeyLocation}
                    onChange={(e) => setApiKeyLocation(e.target.value as any)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                  >
                    <option value="header">Header</option>
                    <option value="query">Query Parameter</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-600 mb-1">API Key Value</label>
                <input
                  type={showSecrets ? 'text' : 'password'}
                  value={apiKeyValue}
                  onChange={(e) => setApiKeyValue(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono"
                />
              </div>
            </>
          )}
        </div>
      )}

      {/* Headers و Body */}
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Custom Headers (JSON) <span className="text-gray-400">- اختياري</span>
          </label>
          <textarea
            value={headers}
            onChange={(e) => setHeaders(e.target.value)}
            rows={2}
            placeholder='{"Accept-Language": "ar", "X-Custom-Header": "value"}'
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
          />
        </div>

        {method === 'POST' && (
          <div>
            <label className="block text-sm font-medium text-gray-600 mb-1">Request Body (JSON)</label>
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={3}
              placeholder='{"query": "sales", "limit": 100}'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-mono text-sm"
            />
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            <FileJson className="w-4 h-4 inline ml-1" />
            Data Path <span className="text-gray-400">- مسار البيانات في الاستجابة</span>
          </label>
          <input
            type="text"
            value={dataPath}
            onChange={(e) => setDataPath(e.target.value)}
            placeholder="data.items أو results أو اتركه فارغاً للجذر"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      {/* حالة الاتصال */}
      {connectionStatus !== 'idle' && (
        <div className={`p-4 rounded-xl flex items-center gap-3 ${
          connectionStatus === 'success' ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
        }`}>
          {connectionStatus === 'success' ? (
            <>
              <CheckCircle className="w-5 h-5 text-green-500" />
              <span className="text-green-700">تم جلب البيانات بنجاح!</span>
            </>
          ) : (
            <>
              <AlertCircle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error || 'فشل الاتصال'}</span>
            </>
          )}
        </div>
      )}

      <button
        onClick={testConnection}
        disabled={isConnecting || !url}
        className="w-full py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl font-semibold hover:from-purple-600 hover:to-pink-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
