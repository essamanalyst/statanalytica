import React, { useState, useMemo } from 'react';
import { useLanguage } from '../i18n';
import {
  RefreshCw,
  Check,
  X,
  Hash,
  Type,
  Calendar,
  ToggleLeft,
  List,
  Clock,
  Percent,
  DollarSign,
  Mail,
  Phone,
  Link,
  Eye,
  Wand2,
  ArrowRight,
  Undo,
  Save,
  Filter
} from 'lucide-react';

interface DataTypeEditorProps {
  data: Record<string, any>[];
  onDataChange: (newData: Record<string, any>[]) => void;
}

interface ColumnTypeInfo {
  name: string;
  currentType: string;
  suggestedType: string;
  sampleValues: any[];
  uniqueCount: number;
  missingCount: number;
  canConvert: Record<string, boolean>;
  conversionPreview: Record<string, { success: number; failed: number; sample: any[] }>;
}

const DATA_TYPES = [
  { id: 'string', nameAr: 'نصي', nameEn: 'Text', icon: Type, color: 'blue' },
  { id: 'number', nameAr: 'رقمي', nameEn: 'Number', icon: Hash, color: 'green' },
  { id: 'integer', nameAr: 'عدد صحيح', nameEn: 'Integer', icon: Hash, color: 'emerald' },
  { id: 'float', nameAr: 'عدد عشري', nameEn: 'Decimal', icon: Percent, color: 'teal' },
  { id: 'boolean', nameAr: 'منطقي', nameEn: 'Boolean', icon: ToggleLeft, color: 'purple' },
  { id: 'date', nameAr: 'تاريخ', nameEn: 'Date', icon: Calendar, color: 'orange' },
  { id: 'datetime', nameAr: 'تاريخ ووقت', nameEn: 'DateTime', icon: Clock, color: 'amber' },
  { id: 'category', nameAr: 'فئوي', nameEn: 'Category', icon: List, color: 'pink' },
  { id: 'currency', nameAr: 'عملة', nameEn: 'Currency', icon: DollarSign, color: 'yellow' },
  { id: 'email', nameAr: 'بريد إلكتروني', nameEn: 'Email', icon: Mail, color: 'red' },
  { id: 'phone', nameAr: 'هاتف', nameEn: 'Phone', icon: Phone, color: 'indigo' },
  { id: 'url', nameAr: 'رابط', nameEn: 'URL', icon: Link, color: 'cyan' },
];

const DataTypeEditor: React.FC<DataTypeEditorProps> = ({ data, onDataChange }) => {
  const { language, isRTL } = useLanguage();
  const [pendingChanges, setPendingChanges] = useState<Record<string, string>>({});
  const [showPreview, setShowPreview] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [conversionOptions] = useState<Record<string, any>>({});

  // تحليل الأعمدة
  const columnAnalysis = useMemo((): ColumnTypeInfo[] => {
    if (!data || data.length === 0) return [];

    const columns = Object.keys(data[0]);
    
    return columns.map(colName => {
      const values = data.map(row => row[colName]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
      const sampleValues = nonNullValues.slice(0, 5);
      const uniqueCount = new Set(nonNullValues.map(v => String(v))).size;
      const missingCount = values.length - nonNullValues.length;

      // تحديد النوع الحالي
      const currentType = detectCurrentType(nonNullValues);
      
      // اقتراح النوع الأفضل
      const suggestedType = suggestBestType(nonNullValues, uniqueCount, values.length);

      // فحص إمكانية التحويل لكل نوع
      const canConvert: Record<string, boolean> = {};
      const conversionPreview: Record<string, { success: number; failed: number; sample: any[] }> = {};

      DATA_TYPES.forEach(type => {
        const result = testConversion(nonNullValues, type.id);
        canConvert[type.id] = result.success > result.failed;
        conversionPreview[type.id] = result;
      });

      return {
        name: colName,
        currentType,
        suggestedType,
        sampleValues,
        uniqueCount,
        missingCount,
        canConvert,
        conversionPreview
      };
    });
  }, [data]);

  // كشف النوع الحالي
  function detectCurrentType(values: any[]): string {
    if (values.length === 0) return 'string';

    const sample = values.slice(0, 100);
    
    // فحص إذا كانت جميعها أرقام
    const allNumbers = sample.every(v => !isNaN(Number(v)) && v !== '');
    if (allNumbers) {
      const hasDecimals = sample.some(v => String(v).includes('.'));
      return hasDecimals ? 'float' : 'integer';
    }

    // فحص إذا كانت منطقية
    const booleanValues = ['true', 'false', '0', '1', 'yes', 'no', 'نعم', 'لا'];
    const allBoolean = sample.every(v => booleanValues.includes(String(v).toLowerCase()));
    if (allBoolean) return 'boolean';

    // فحص إذا كانت تواريخ
    const datePatterns = [
      /^\d{4}-\d{2}-\d{2}$/,
      /^\d{2}\/\d{2}\/\d{4}$/,
      /^\d{2}-\d{2}-\d{4}$/,
    ];
    const allDates = sample.every(v => {
      const str = String(v);
      return datePatterns.some(p => p.test(str)) || !isNaN(Date.parse(str));
    });
    if (allDates) return 'date';

    // فحص البريد الإلكتروني
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const allEmails = sample.every(v => emailPattern.test(String(v)));
    if (allEmails) return 'email';

    // فحص الهاتف
    const phonePattern = /^[\d\s\-\+\(\)]{7,}$/;
    const allPhones = sample.every(v => phonePattern.test(String(v)));
    if (allPhones) return 'phone';

    // فحص الروابط
    const urlPattern = /^(https?:\/\/|www\.)/i;
    const allUrls = sample.every(v => urlPattern.test(String(v)));
    if (allUrls) return 'url';

    return 'string';
  }

  // اقتراح النوع الأفضل
  function suggestBestType(values: any[], uniqueCount: number, totalCount: number): string {
    const currentType = detectCurrentType(values);
    
    // إذا كان النوع نصي وعدد القيم الفريدة قليل، اقترح فئوي
    if (currentType === 'string' && uniqueCount <= 20 && uniqueCount < totalCount * 0.1) {
      return 'category';
    }

    return currentType;
  }

  // اختبار التحويل
  function testConversion(values: any[], targetType: string): { success: number; failed: number; sample: any[] } {
    let success = 0;
    let failed = 0;
    const sample: any[] = [];

    const testValues = values.slice(0, 100);

    testValues.forEach((v, i) => {
      try {
        const converted = convertValue(v, targetType);
        if (converted !== null && converted !== undefined) {
          success++;
          if (i < 3) sample.push({ original: v, converted });
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    });

    return { success, failed, sample };
  }

  // تحويل قيمة واحدة
  function convertValue(value: any, targetType: string, _options: any = {}): any {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    const strValue = String(value).trim();

    switch (targetType) {
      case 'number':
      case 'float':
        const num = parseFloat(strValue.replace(/[,،]/g, '.').replace(/[^\d.\-]/g, ''));
        return isNaN(num) ? null : num;

      case 'integer':
        const int = parseInt(strValue.replace(/[^\d\-]/g, ''), 10);
        return isNaN(int) ? null : int;

      case 'boolean':
        const lower = strValue.toLowerCase();
        if (['true', '1', 'yes', 'نعم', 'صحيح'].includes(lower)) return true;
        if (['false', '0', 'no', 'لا', 'خطأ'].includes(lower)) return false;
        return null;

      case 'date':
      case 'datetime':
        const date = new Date(strValue);
        if (isNaN(date.getTime())) {
          // محاولة تنسيقات أخرى
          const parts = strValue.split(/[\/\-\.]/);
          if (parts.length === 3) {
            const [a, b, c] = parts.map(Number);
            if (a > 31) {
              // YYYY-MM-DD
              return new Date(a, b - 1, c);
            } else if (c > 31) {
              // DD-MM-YYYY
              return new Date(c, b - 1, a);
            }
          }
          return null;
        }
        return date;

      case 'category':
        return strValue;

      case 'currency':
        const currency = parseFloat(strValue.replace(/[^\d.\-]/g, ''));
        return isNaN(currency) ? null : currency;

      case 'email':
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailPattern.test(strValue) ? strValue.toLowerCase() : null;

      case 'phone':
        return strValue.replace(/[^\d\+]/g, '');

      case 'url':
        try {
          new URL(strValue.startsWith('http') ? strValue : `https://${strValue}`);
          return strValue;
        } catch {
          return null;
        }

      case 'string':
      default:
        return strValue;
    }
  }

  // تطبيق التغييرات
  const applyChanges = () => {
    if (Object.keys(pendingChanges).length === 0) return;

    const newData = data.map(row => {
      const newRow = { ...row };
      
      Object.entries(pendingChanges).forEach(([colName, targetType]) => {
        const options = conversionOptions[colName] || {};
        const converted = convertValue(row[colName], targetType, options);
        newRow[colName] = converted;
      });

      return newRow;
    });

    onDataChange(newData);
    setPendingChanges({});
  };

  // تطبيق تغيير واحد
  const applyColumnChange = (colName: string, targetType: string) => {
    const newData = data.map(row => ({
      ...row,
      [colName]: convertValue(row[colName], targetType, conversionOptions[colName] || {})
    }));

    onDataChange(newData);
    
    // إزالة من التغييرات المعلقة
    const newPending = { ...pendingChanges };
    delete newPending[colName];
    setPendingChanges(newPending);
  };

  // تطبيق الاقتراحات التلقائية
  const applyAllSuggestions = () => {
    const newData = data.map(row => {
      const newRow = { ...row };
      
      columnAnalysis.forEach(col => {
        if (col.suggestedType !== col.currentType && col.canConvert[col.suggestedType]) {
          newRow[col.name] = convertValue(row[col.name], col.suggestedType);
        }
      });

      return newRow;
    });

    onDataChange(newData);
  };

  // الأعمدة المفلترة
  const filteredColumns = useMemo(() => {
    return columnAnalysis.filter(col => {
      const matchesSearch = col.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'all' || col.currentType === filterType;
      return matchesSearch && matchesType;
    });
  }, [columnAnalysis, searchTerm, filterType]);

  // الحصول على أيقونة النوع
  const getTypeIcon = (typeId: string) => {
    const type = DATA_TYPES.find(t => t.id === typeId);
    return type?.icon || Type;
  };

  // الحصول على لون النوع
  const getTypeColor = (typeId: string) => {
    const type = DATA_TYPES.find(t => t.id === typeId);
    return type?.color || 'gray';
  };

  // الحصول على اسم النوع
  const getTypeName = (typeId: string) => {
    const type = DATA_TYPES.find(t => t.id === typeId);
    return language === 'ar' ? type?.nameAr : type?.nameEn;
  };

  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Type className="w-16 h-16 mx-auto mb-4 opacity-50" />
        <p>{language === 'ar' ? 'لا توجد بيانات لتعديل أنواعها' : 'No data to edit types'}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* الرأس مع الإحصائيات */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Type className="w-7 h-7" />
              {language === 'ar' ? 'محرر أنواع البيانات' : 'Data Type Editor'}
            </h2>
            <p className="text-blue-100 mt-1">
              {language === 'ar' 
                ? 'تعديل وتصحيح أنواع البيانات بسهولة'
                : 'Easily modify and correct data types'}
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{columnAnalysis.length}</div>
              <div className="text-xs text-blue-100">
                {language === 'ar' ? 'عمود' : 'Columns'}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">
                {columnAnalysis.filter(c => c.suggestedType !== c.currentType).length}
              </div>
              <div className="text-xs text-blue-100">
                {language === 'ar' ? 'اقتراح تحسين' : 'Suggestions'}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{Object.keys(pendingChanges).length}</div>
              <div className="text-xs text-blue-100">
                {language === 'ar' ? 'تغيير معلق' : 'Pending'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* شريط الأدوات */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap items-center gap-4">
          {/* البحث */}
          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={language === 'ar' ? 'بحث عن عمود...' : 'Search column...'}
                className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Filter className={`absolute ${isRTL ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400`} />
            </div>
          </div>

          {/* فلتر النوع */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{language === 'ar' ? 'جميع الأنواع' : 'All Types'}</option>
            {DATA_TYPES.map(type => (
              <option key={type.id} value={type.id}>
                {language === 'ar' ? type.nameAr : type.nameEn}
              </option>
            ))}
          </select>

          {/* زر تطبيق الاقتراحات */}
          <button
            onClick={applyAllSuggestions}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
          >
            <Wand2 className="w-4 h-4" />
            {language === 'ar' ? 'تطبيق الاقتراحات' : 'Apply Suggestions'}
          </button>

          {/* زر تطبيق التغييرات */}
          {Object.keys(pendingChanges).length > 0 && (
            <button
              onClick={applyChanges}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Save className="w-4 h-4" />
              {language === 'ar' 
                ? `تطبيق ${Object.keys(pendingChanges).length} تغيير` 
                : `Apply ${Object.keys(pendingChanges).length} Changes`}
            </button>
          )}
        </div>
      </div>

      {/* قائمة الأعمدة */}
      <div className="space-y-4">
        {filteredColumns.map((col) => {
          const hasPendingChange = pendingChanges[col.name];
          const hasSuggestion = col.suggestedType !== col.currentType;
          const Icon = getTypeIcon(col.currentType);
          const color = getTypeColor(col.currentType);

          return (
            <div
              key={col.name}
              className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                hasPendingChange ? 'ring-2 ring-blue-500' : ''
              } ${hasSuggestion ? 'border-amber-300' : ''}`}
            >
              {/* رأس البطاقة */}
              <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg bg-${color}-100 flex items-center justify-center`}>
                      <Icon className={`w-5 h-5 text-${color}-600`} />
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800">{col.name}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <span className={`px-2 py-0.5 rounded-full bg-${color}-100 text-${color}-700 text-xs font-medium`}>
                          {getTypeName(col.currentType)}
                        </span>
                        <span>•</span>
                        <span>{col.uniqueCount} {language === 'ar' ? 'قيمة فريدة' : 'unique'}</span>
                        {col.missingCount > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-amber-600">
                              {col.missingCount} {language === 'ar' ? 'مفقودة' : 'missing'}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* الإجراءات السريعة */}
                  <div className="flex items-center gap-2">
                    {hasSuggestion && (
                      <button
                        onClick={() => applyColumnChange(col.name, col.suggestedType)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm"
                      >
                        <Wand2 className="w-4 h-4" />
                        {language === 'ar' ? 'اقتراح:' : 'Suggest:'} {getTypeName(col.suggestedType)}
                      </button>
                    )}
                    
                    <button
                      onClick={() => setShowPreview(showPreview === col.name ? null : col.name)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* القيم النموذجية */}
              <div className="px-4 py-3 bg-gray-50 border-b">
                <div className="text-xs text-gray-500 mb-2">
                  {language === 'ar' ? 'قيم نموذجية:' : 'Sample values:'}
                </div>
                <div className="flex flex-wrap gap-2">
                  {col.sampleValues.map((val, i) => (
                    <span
                      key={i}
                      className="px-2 py-1 bg-white border rounded text-sm text-gray-700 font-mono"
                    >
                      {String(val).substring(0, 30)}{String(val).length > 30 ? '...' : ''}
                    </span>
                  ))}
                </div>
              </div>

              {/* اختيار النوع الجديد */}
              <div className="p-4">
                <div className="text-sm text-gray-600 mb-3">
                  {language === 'ar' ? 'تحويل إلى:' : 'Convert to:'}
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                  {DATA_TYPES.map((type) => {
                    const TypeIcon = type.icon;
                    const isCurrentType = col.currentType === type.id;
                    const isPending = pendingChanges[col.name] === type.id;
                    const canConvert = col.canConvert[type.id];
                    const preview = col.conversionPreview[type.id];
                    const successRate = preview ? Math.round((preview.success / (preview.success + preview.failed)) * 100) : 0;

                    return (
                      <button
                        key={type.id}
                        onClick={() => {
                          if (!isCurrentType && canConvert) {
                            setPendingChanges({
                              ...pendingChanges,
                              [col.name]: type.id
                            });
                          }
                        }}
                        disabled={isCurrentType || !canConvert}
                        className={`relative p-3 rounded-xl border-2 transition-all ${
                          isCurrentType
                            ? 'bg-gray-100 border-gray-300 cursor-default'
                            : isPending
                            ? `bg-${type.color}-50 border-${type.color}-500 ring-2 ring-${type.color}-200`
                            : canConvert
                            ? `hover:bg-${type.color}-50 hover:border-${type.color}-300 border-gray-200 cursor-pointer`
                            : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                        }`}
                      >
                        <div className="flex flex-col items-center gap-1">
                          <TypeIcon className={`w-5 h-5 ${
                            isCurrentType ? 'text-gray-400' :
                            isPending ? `text-${type.color}-600` :
                            canConvert ? `text-${type.color}-500` : 'text-gray-300'
                          }`} />
                          <span className={`text-xs font-medium ${
                            isCurrentType ? 'text-gray-500' :
                            isPending ? `text-${type.color}-700` :
                            canConvert ? 'text-gray-700' : 'text-gray-400'
                          }`}>
                            {language === 'ar' ? type.nameAr : type.nameEn}
                          </span>
                          {!isCurrentType && canConvert && (
                            <span className={`text-[10px] ${
                              successRate >= 90 ? 'text-green-600' :
                              successRate >= 70 ? 'text-amber-600' : 'text-red-600'
                            }`}>
                              {successRate}%
                            </span>
                          )}
                        </div>
                        
                        {isCurrentType && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-gray-500 rounded-full flex items-center justify-center">
                            <Check className="w-3 h-3 text-white" />
                          </div>
                        )}
                        
                        {isPending && (
                          <div className={`absolute -top-1 -right-1 w-4 h-4 bg-${type.color}-500 rounded-full flex items-center justify-center`}>
                            <ArrowRight className="w-3 h-3 text-white" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* معاينة التحويل */}
                {showPreview === col.name && pendingChanges[col.name] && (
                  <div className="mt-4 p-4 bg-blue-50 rounded-xl border border-blue-200">
                    <h4 className="font-medium text-blue-800 mb-3 flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      {language === 'ar' ? 'معاينة التحويل' : 'Conversion Preview'}
                    </h4>
                    <div className="space-y-2">
                      {col.conversionPreview[pendingChanges[col.name]]?.sample.map((item, i) => (
                        <div key={i} className="flex items-center gap-3 text-sm">
                          <span className="px-2 py-1 bg-white rounded border text-gray-600 font-mono">
                            {String(item.original)}
                          </span>
                          <ArrowRight className="w-4 h-4 text-blue-400" />
                          <span className="px-2 py-1 bg-green-100 rounded border border-green-200 text-green-700 font-mono">
                            {item.converted instanceof Date 
                              ? item.converted.toLocaleDateString()
                              : String(item.converted)}
                          </span>
                        </div>
                      ))}
                    </div>
                    
                    <div className="mt-3 flex items-center justify-between">
                      <div className="text-sm text-blue-700">
                        <span className="text-green-600 font-medium">
                          {col.conversionPreview[pendingChanges[col.name]]?.success}
                        </span>
                        {' '}{language === 'ar' ? 'ناجح' : 'success'} / 
                        <span className="text-red-600 font-medium">
                          {' '}{col.conversionPreview[pendingChanges[col.name]]?.failed}
                        </span>
                        {' '}{language === 'ar' ? 'فشل' : 'failed'}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            const newPending = { ...pendingChanges };
                            delete newPending[col.name];
                            setPendingChanges(newPending);
                          }}
                          className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors text-sm"
                        >
                          <X className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => applyColumnChange(col.name, pendingChanges[col.name])}
                          className="flex items-center gap-2 px-3 py-1.5 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                        >
                          <Check className="w-4 h-4" />
                          {language === 'ar' ? 'تطبيق' : 'Apply'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* التغيير المعلق */}
                {pendingChanges[col.name] && showPreview !== col.name && (
                  <div className="mt-3 flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 text-blue-700">
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm">
                        {language === 'ar' ? 'سيتم التحويل إلى' : 'Will convert to'}: 
                        <strong className="mx-1">{getTypeName(pendingChanges[col.name])}</strong>
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setShowPreview(col.name)}
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {language === 'ar' ? 'معاينة' : 'Preview'}
                      </button>
                      <button
                        onClick={() => {
                          const newPending = { ...pendingChanges };
                          delete newPending[col.name];
                          setPendingChanges(newPending);
                        }}
                        className="text-red-500 hover:text-red-600"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* شريط التغييرات المعلقة الثابت */}
      {Object.keys(pendingChanges).length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg p-4 z-50">
          <div className="max-w-6xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-gray-700">
                <RefreshCw className="w-5 h-5 text-blue-500" />
                <span className="font-medium">
                  {Object.keys(pendingChanges).length} {language === 'ar' ? 'تغيير معلق' : 'pending changes'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {Object.entries(pendingChanges).slice(0, 3).map(([col, type]) => (
                  <span key={col} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {col} → {getTypeName(type)}
                  </span>
                ))}
                {Object.keys(pendingChanges).length > 3 && (
                  <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-sm">
                    +{Object.keys(pendingChanges).length - 3} {language === 'ar' ? 'آخرين' : 'more'}
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setPendingChanges({})}
                className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Undo className="w-4 h-4" />
                {language === 'ar' ? 'تراجع الكل' : 'Undo All'}
              </button>
              <button
                onClick={applyChanges}
                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg hover:opacity-90 transition-opacity font-medium"
              >
                <Save className="w-4 h-4" />
                {language === 'ar' ? 'تطبيق جميع التغييرات' : 'Apply All Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DataTypeEditor;
