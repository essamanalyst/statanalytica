import React, { useState } from 'react';
import {
  Shield,
  Trash2,
  CheckCircle,
  AlertCircle,
  Lock
} from 'lucide-react';

interface SavedCredential {
  id: string;
  name: string;
  provider: string;
  createdAt: Date;
  lastUsed?: Date;
  isValid: boolean;
}

interface CredentialsManagerProps {
  onSelect: (credential: SavedCredential) => void;
}

const CredentialsManager: React.FC<CredentialsManagerProps> = ({ onSelect }) => {
  const [savedCredentials, setSavedCredentials] = useState<SavedCredential[]>([
    {
      id: '1',
      name: 'Google Cloud Production',
      provider: 'google',
      createdAt: new Date('2024-01-15'),
      lastUsed: new Date('2024-01-20'),
      isValid: true
    },
    {
      id: '2',
      name: 'AWS Analytics',
      provider: 'aws',
      createdAt: new Date('2024-01-10'),
      lastUsed: new Date('2024-01-19'),
      isValid: true
    }
  ]);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const getProviderIcon = (provider: string) => {
    const icons: Record<string, string> = {
      google: '🔵',
      aws: '🟠',
      azure: '🔷',
      snowflake: '❄️',
      databricks: '🔶',
      dropbox: '📦',
      microsoft: '🪟',
      mongodb: '🍃',
      firebase: '🔥',
      supabase: '⚡'
    };
    return icons[provider] || '☁️';
  };

  const deleteCredential = (id: string) => {
    setSavedCredentials(prev => prev.filter(c => c.id !== id));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center">
          <Shield className="w-6 h-6 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-bold text-gray-800">مدير بيانات الاعتماد</h3>
          <p className="text-sm text-gray-500">إدارة الاتصالات المحفوظة</p>
        </div>
      </div>

      {savedCredentials.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          <Lock className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>لا توجد بيانات اعتماد محفوظة</p>
        </div>
      ) : (
        <div className="space-y-3">
          {savedCredentials.map(cred => (
            <div
              key={cred.id}
              className={`p-4 rounded-lg border-2 transition-all cursor-pointer ${
                selectedId === cred.id
                  ? 'border-purple-500 bg-purple-50'
                  : 'border-gray-200 hover:border-purple-300'
              }`}
              onClick={() => {
                setSelectedId(cred.id);
                onSelect(cred);
              }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{getProviderIcon(cred.provider)}</span>
                  <div>
                    <h4 className="font-semibold text-gray-800">{cred.name}</h4>
                    <p className="text-xs text-gray-500">
                      آخر استخدام: {cred.lastUsed?.toLocaleDateString('ar-SA')}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {cred.isValid ? (
                    <span className="flex items-center gap-1 text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      صالح
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-600 bg-red-100 px-2 py-1 rounded-full">
                      <AlertCircle className="w-3 h-3" />
                      منتهي
                    </span>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteCredential(cred.id);
                    }}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <button className="w-full mt-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors">
        + إضافة اتصال جديد
      </button>
    </div>
  );
};

export default CredentialsManager;
