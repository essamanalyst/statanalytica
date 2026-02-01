import React, { useState } from 'react';
import {
  Cloud,
  X,
  ChevronLeft,
  ChevronRight,
  Shield,
  CheckCircle
} from 'lucide-react';
import GoogleCloudConnector from './GoogleCloudConnector';
import AWSConnector from './AWSConnector';
import AzureConnector from './AzureConnector';
import CredentialsManager from './CredentialsManager';
import { SnowflakeConnector, MongoDBConnector, APIConnector } from './OtherConnectors';

interface CloudProvidersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataLoaded: (data: any[], source: string) => void;
}

type Provider = 'google' | 'aws' | 'azure' | 'snowflake' | 'mongodb' | 'api' | 'credentials';

const providers = [
  {
    id: 'google',
    name: 'Google Cloud',
    icon: '🔵',
    color: 'from-blue-500 to-blue-600',
    services: ['BigQuery', 'Cloud Storage', 'Sheets']
  },
  {
    id: 'aws',
    name: 'Amazon Web Services',
    icon: '🟠',
    color: 'from-orange-500 to-orange-600',
    services: ['S3', 'Redshift', 'Athena', 'RDS']
  },
  {
    id: 'azure',
    name: 'Microsoft Azure',
    icon: '🔷',
    color: 'from-blue-600 to-blue-700',
    services: ['Blob Storage', 'SQL Database', 'Synapse', 'Cosmos DB']
  },
  {
    id: 'snowflake',
    name: 'Snowflake',
    icon: '❄️',
    color: 'from-cyan-500 to-blue-500',
    services: ['Data Warehouse']
  },
  {
    id: 'mongodb',
    name: 'MongoDB',
    icon: '🍃',
    color: 'from-green-500 to-emerald-500',
    services: ['Atlas', 'Self-hosted']
  },
  {
    id: 'api',
    name: 'REST API',
    icon: '🌐',
    color: 'from-purple-500 to-pink-500',
    services: ['GET', 'POST', 'Custom Auth']
  }
];

const CloudProvidersModal: React.FC<CloudProvidersModalProps> = ({ isOpen, onClose, onDataLoaded }) => {
  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [connectionSuccess, setConnectionSuccess] = useState(false);

  if (!isOpen) return null;

  const handleConnect = (config: any) => {
    console.log('Connected:', config);
    setConnectionSuccess(true);
  };

  const handleDataLoaded = (data: any[]) => {
    onDataLoaded(data, selectedProvider || 'cloud');
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const renderProviderContent = () => {
    switch (selectedProvider) {
      case 'google':
        return <GoogleCloudConnector onConnect={handleConnect} onDataLoaded={handleDataLoaded} />;
      case 'aws':
        return <AWSConnector onConnect={handleConnect} onDataLoaded={handleDataLoaded} />;
      case 'azure':
        return <AzureConnector onConnect={handleConnect} onDataLoaded={handleDataLoaded} />;
      case 'snowflake':
        return <SnowflakeConnector onConnect={handleConnect} onDataLoaded={handleDataLoaded} />;
      case 'mongodb':
        return <MongoDBConnector onConnect={handleConnect} onDataLoaded={handleDataLoaded} />;
      case 'api':
        return <APIConnector onConnect={handleConnect} onDataLoaded={handleDataLoaded} />;
      case 'credentials':
        return <CredentialsManager onSelect={(cred) => setSelectedProvider(cred.provider as Provider)} />;
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex">
        {/* الشريط الجانبي */}
        <div className="w-72 bg-gradient-to-b from-gray-50 to-gray-100 border-l border-gray-200 p-4 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Cloud className="w-5 h-5 text-blue-500" />
              المصادر السحابية
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-gray-200 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          {/* قائمة المزودين */}
          <div className="space-y-2 flex-1 overflow-auto">
            {/* مدير الاعتمادات */}
            <button
              onClick={() => setSelectedProvider('credentials')}
              className={`w-full p-3 rounded-xl transition-all text-right flex items-center gap-3 ${
                selectedProvider === 'credentials'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-600 text-white shadow-lg'
                  : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                selectedProvider === 'credentials'
                  ? 'bg-white/20'
                  : 'bg-gradient-to-br from-purple-500 to-indigo-600'
              }`}>
                <Shield className={`w-5 h-5 ${selectedProvider === 'credentials' ? 'text-white' : 'text-white'}`} />
              </div>
              <div className="flex-1">
                <span className="font-semibold block">الاتصالات المحفوظة</span>
                <span className={`text-xs ${selectedProvider === 'credentials' ? 'text-white/80' : 'text-gray-500'}`}>
                  إدارة بيانات الاعتماد
                </span>
              </div>
            </button>

            <div className="border-t border-gray-200 my-3"></div>

            {providers.map(provider => (
              <button
                key={provider.id}
                onClick={() => setSelectedProvider(provider.id as Provider)}
                className={`w-full p-3 rounded-xl transition-all text-right flex items-center gap-3 ${
                  selectedProvider === provider.id
                    ? `bg-gradient-to-r ${provider.color} text-white shadow-lg`
                    : 'bg-white hover:bg-gray-50 text-gray-700 border border-gray-200'
                }`}
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-xl ${
                  selectedProvider === provider.id
                    ? 'bg-white/20'
                    : `bg-gradient-to-br ${provider.color}`
                }`}>
                  {selectedProvider === provider.id ? (
                    <span>{provider.icon}</span>
                  ) : (
                    <span className="text-white">{provider.icon}</span>
                  )}
                </div>
                <div className="flex-1">
                  <span className="font-semibold block">{provider.name}</span>
                  <span className={`text-xs ${selectedProvider === provider.id ? 'text-white/80' : 'text-gray-500'}`}>
                    {provider.services.slice(0, 2).join(', ')}
                    {provider.services.length > 2 && '...'}
                  </span>
                </div>
                <ChevronLeft className={`w-4 h-4 ${selectedProvider === provider.id ? 'text-white' : 'text-gray-400'}`} />
              </button>
            ))}
          </div>

          {/* معلومات الأمان */}
          <div className="mt-4 p-3 bg-green-50 rounded-xl border border-green-200">
            <div className="flex items-center gap-2 text-green-700 text-sm">
              <Shield className="w-4 h-4" />
              <span className="font-medium">اتصال آمن</span>
            </div>
            <p className="text-xs text-green-600 mt-1">
              بيانات الاعتماد مشفرة ولا تُخزن على الخادم
            </p>
          </div>
        </div>

        {/* المحتوى الرئيسي */}
        <div className="flex-1 p-6 overflow-auto">
          {!selectedProvider ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <Cloud className="w-20 h-20 mb-4 opacity-50" />
              <h3 className="text-xl font-semibold text-gray-600 mb-2">اختر مزود سحابي</h3>
              <p className="text-center max-w-md">
                اختر أحد المزودين من القائمة لإعداد الاتصال وتحميل البيانات
              </p>
              
              {/* بطاقات سريعة */}
              <div className="grid grid-cols-3 gap-4 mt-8">
                {providers.slice(0, 3).map(provider => (
                  <button
                    key={provider.id}
                    onClick={() => setSelectedProvider(provider.id as Provider)}
                    className="p-4 bg-gray-50 rounded-xl border border-gray-200 hover:border-gray-300 hover:shadow-md transition-all"
                  >
                    <span className="text-3xl block mb-2">{provider.icon}</span>
                    <span className="text-sm font-medium text-gray-700">{provider.name}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : connectionSuccess ? (
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4 animate-bounce">
                <CheckCircle className="w-10 h-10 text-green-500" />
              </div>
              <h3 className="text-xl font-bold text-green-700 mb-2">تم الاتصال بنجاح!</h3>
              <p className="text-gray-600">جاري تحميل البيانات...</p>
            </div>
          ) : (
            <div>
              {/* زر الرجوع */}
              <button
                onClick={() => setSelectedProvider(null)}
                className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-6 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
                <span>رجوع للقائمة</span>
              </button>

              {renderProviderContent()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CloudProvidersModal;
