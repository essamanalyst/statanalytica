import React, { useState, useMemo } from 'react';
import { useLanguage } from '../../i18n';
import {
  Trash2, Zap, AlertTriangle, CheckCircle, RefreshCw,
  Filter, Copy, Scissors, Type, Calendar, Hash, ToggleLeft,
  ArrowUpDown, Search, Eye, EyeOff, Undo2, Redo2,
  FileText, ChevronDown, ChevronRight, Play,
  Info, Layers, Grid, BarChart3, PieChart,
  TrendingUp, Target, Crosshair, Wand2, Sparkles
} from 'lucide-react';
import {
  missingValueHandlers,
  outlierHandlers,
  duplicateHandlers,
  transformationHandlers,
  textHandlers,
  dateHandlers,
  typeConversionHandlers,
  generateQualityReport,
  autoClean,
  CleaningOperation,
  CleaningResult,
  DataQualityReport
} from './CleaningEngine';

interface DataRow {
  [key: string]: any;
}

interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text';
  missing: number;
  unique: number;
  sample: any[];
}

interface DataCleaningPanelProps {
  data: DataRow[];
  columns: ColumnInfo[];
  onDataUpdate: (data: DataRow[], operation: string) => void;
}

type TabType = 'overview' | 'missing' | 'outliers' | 'duplicates' | 'transform' | 'text' | 'date' | 'types' | 'filter' | 'columns' | 'auto';

const DataCleaningPanel: React.FC<DataCleaningPanelProps> = ({ data, columns, onDataUpdate }) => {
  const { t, isRTL } = useLanguage();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedColumn, setSelectedColumn] = useState<string>(columns[0]?.name || '');
  const [operationHistory, setOperationHistory] = useState<CleaningOperation[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [previewData, setPreviewData] = useState<DataRow[] | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const qualityReport = useMemo(() => generateQualityReport(data, columns), [data, columns]);

  const applyOperation = (result: CleaningResult, operationType: string, columnName?: string) => {
    if (result.success && result.affectedRows > 0) {
      const operation: CleaningOperation = {
        id: Date.now().toString(),
        type: operationType,
        description: result.message,
        column: columnName,
        params: result.details || {},
        timestamp: new Date(),
        affectedRows: result.affectedRows,
        reversible: true
      };

      setOperationHistory(prev => [...prev.slice(0, historyIndex + 1), operation]);
      setHistoryIndex(prev => prev + 1);
      onDataUpdate(result.data, result.message);
      setPreviewData(null);
      setShowPreview(false);
    }
  };

  const previewOperation = (result: CleaningResult) => {
    if (result.success) {
      setPreviewData(result.data);
      setShowPreview(true);
    }
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: t('cleaning.overview'), icon: <BarChart3 size={18} /> },
    { id: 'missing', label: t('cleaning.missingValues'), icon: <AlertTriangle size={18} /> },
    { id: 'outliers', label: t('cleaning.outliers'), icon: <Target size={18} /> },
    { id: 'duplicates', label: t('cleaning.duplicates'), icon: <Copy size={18} /> },
    { id: 'transform', label: t('cleaning.transformations'), icon: <TrendingUp size={18} /> },
    { id: 'text', label: t('cleaning.textProcessing'), icon: <Type size={18} /> },
    { id: 'date', label: t('cleaning.dateProcessing'), icon: <Calendar size={18} /> },
    { id: 'types', label: t('cleaning.dataTypes'), icon: <Hash size={18} /> },
    { id: 'filter', label: t('cleaning.filtering'), icon: <Filter size={18} /> },
    { id: 'columns', label: t('cleaning.columnManagement'), icon: <Layers size={18} /> },
    { id: 'auto', label: t('cleaning.autoCleaning'), icon: <Wand2 size={18} /> }
  ];

  return (
    <div className={`bg-white rounded-2xl shadow-xl overflow-hidden ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-3">
              <Sparkles className="w-8 h-8" />
              {t('cleaning.title')}
            </h2>
            <p className="text-purple-200 mt-1">{t('cleaning.subtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => historyIndex > 0 && setHistoryIndex(historyIndex - 1)}
              disabled={historyIndex <= 0}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50"
              title={t('action.undo')}
            >
              <Undo2 size={20} />
            </button>
            <button 
              onClick={() => historyIndex < operationHistory.length - 1 && setHistoryIndex(historyIndex + 1)}
              disabled={historyIndex >= operationHistory.length - 1}
              className="p-2 bg-white/20 rounded-lg hover:bg-white/30 disabled:opacity-50"
              title={t('action.redo')}
            >
              <Redo2 size={20} />
            </button>
            <span className="text-sm bg-white/20 px-3 py-1 rounded-full">
              {operationHistory.length} {t('cleaning.operations')}
            </span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b overflow-x-auto">
        <div className="flex p-2 gap-1 min-w-max">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-purple-100 text-purple-700 font-medium'
                  : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        {activeTab === 'overview' && (
          <OverviewTab qualityReport={qualityReport} data={data} columns={columns} />
        )}
        {activeTab === 'missing' && (
          <MissingValuesTab 
            data={data} 
            columns={columns} 
            selectedColumn={selectedColumn}
            onColumnSelect={setSelectedColumn}
            onApply={applyOperation}
            onPreview={previewOperation}
          />
        )}
        {activeTab === 'outliers' && (
          <OutliersTab 
            data={data} 
            columns={columns.filter(c => c.type === 'numeric')} 
            selectedColumn={selectedColumn}
            onColumnSelect={setSelectedColumn}
            onApply={applyOperation}
            onPreview={previewOperation}
          />
        )}
        {activeTab === 'duplicates' && (
          <DuplicatesTab 
            data={data} 
            columns={columns}
            onApply={applyOperation}
          />
        )}
        {activeTab === 'transform' && (
          <TransformTab 
            data={data} 
            columns={columns.filter(c => c.type === 'numeric')} 
            selectedColumn={selectedColumn}
            onColumnSelect={setSelectedColumn}
            onApply={applyOperation}
          />
        )}
        {activeTab === 'text' && (
          <TextTab 
            data={data} 
            columns={columns.filter(c => c.type === 'text' || c.type === 'categorical')} 
            selectedColumn={selectedColumn}
            onColumnSelect={setSelectedColumn}
            onApply={applyOperation}
          />
        )}
        {activeTab === 'date' && (
          <DateTab 
            data={data} 
            columns={columns} 
            selectedColumn={selectedColumn}
            onColumnSelect={setSelectedColumn}
            onApply={applyOperation}
          />
        )}
        {activeTab === 'types' && (
          <TypesTab 
            data={data} 
            columns={columns}
            onApply={applyOperation}
          />
        )}
        {activeTab === 'filter' && (
          <FilterTab 
            data={data} 
            columns={columns}
            onApply={applyOperation}
          />
        )}
        {activeTab === 'columns' && (
          <ColumnsTab 
            data={data} 
            columns={columns}
            onApply={applyOperation}
          />
        )}
        {activeTab === 'auto' && (
          <AutoCleanTab 
            data={data} 
            columns={columns}
            onApply={(result) => applyOperation(result, 'auto-clean')}
          />
        )}
      </div>

      {/* Preview Modal */}
      {showPreview && previewData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden">
            <div className="p-4 border-b flex items-center justify-between">
              <h3 className="text-lg font-bold">{t('cleaning.preview')}</h3>
              <button onClick={() => setShowPreview(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <EyeOff size={20} />
              </button>
            </div>
            <div className="overflow-auto max-h-96">
              <table className="w-full">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    {columns.slice(0, 8).map(col => (
                      <th key={col.name} className={`px-4 py-2 text-sm font-medium text-gray-700 ${isRTL ? 'text-right' : 'text-left'}`}>
                        {col.name}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.slice(0, 20).map((row, idx) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      {columns.slice(0, 8).map(col => (
                        <td key={col.name} className="px-4 py-2 text-sm">
                          {row[col.name]?.toString() || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ==================== Overview Tab ====================
const OverviewTab: React.FC<{ qualityReport: DataQualityReport; data: DataRow[]; columns: ColumnInfo[] }> = ({ qualityReport, columns }) => {
  const { t } = useLanguage();
  
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600 bg-green-100';
    if (score >= 60) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return t('cleaning.qualityExcellent');
    if (score >= 80) return t('cleaning.qualityVeryGood');
    if (score >= 70) return t('cleaning.qualityGood');
    if (score >= 60) return t('cleaning.qualityAcceptable');
    return t('cleaning.qualityNeedsImprovement');
  };

  return (
    <div className="space-y-6">
      {/* Score Card */}
      <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-2xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold text-gray-800">{t('cleaning.overallQuality')}</h3>
            <p className="text-gray-600">{t('cleaning.qualityDescription')}</p>
          </div>
          <div className={`text-center px-8 py-4 rounded-2xl ${getScoreColor(qualityReport.overallScore)}`}>
            <div className="text-4xl font-bold">{qualityReport.overallScore.toFixed(0)}%</div>
            <div className="text-sm font-medium">{getScoreLabel(qualityReport.overallScore)}</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-blue-50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Grid className="w-10 h-10 text-blue-600 p-2 bg-blue-100 rounded-lg" />
            <div>
              <div className="text-2xl font-bold text-blue-700">{qualityReport.totalRows.toLocaleString()}</div>
              <div className="text-sm text-blue-600">{t('label.totalRows')}</div>
            </div>
          </div>
        </div>
        <div className="bg-green-50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Layers className="w-10 h-10 text-green-600 p-2 bg-green-100 rounded-lg" />
            <div>
              <div className="text-2xl font-bold text-green-700">{qualityReport.totalColumns}</div>
              <div className="text-sm text-green-600">{t('label.totalColumns')}</div>
            </div>
          </div>
        </div>
        <div className="bg-orange-50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <AlertTriangle className="w-10 h-10 text-orange-600 p-2 bg-orange-100 rounded-lg" />
            <div>
              <div className="text-2xl font-bold text-orange-700">
                {qualityReport.missingValues.reduce((sum, m) => sum + m.count, 0).toLocaleString()}
              </div>
              <div className="text-sm text-orange-600">{t('cleaning.missingValues')}</div>
            </div>
          </div>
        </div>
        <div className="bg-red-50 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <Copy className="w-10 h-10 text-red-600 p-2 bg-red-100 rounded-lg" />
            <div>
              <div className="text-2xl font-bold text-red-700">{qualityReport.duplicateRows}</div>
              <div className="text-sm text-red-600">{t('cleaning.duplicateRows')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Issues List */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Missing Values */}
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-orange-50 px-4 py-3 border-b flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <span className="font-bold text-orange-800">{t('cleaning.missingByColumn')}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {qualityReport.missingValues.length > 0 ? (
              qualityReport.missingValues.map(m => (
                <div key={m.column} className="px-4 py-3 border-b last:border-0 flex items-center justify-between">
                  <span className="font-medium">{m.column}</span>
                  <div className="flex items-center gap-3">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-orange-500 h-2 rounded-full" 
                        style={{ width: `${Math.min(m.percentage, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm text-gray-600 w-20 text-left">
                      {m.count} ({m.percentage.toFixed(1)}%)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-green-600">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                {t('cleaning.noMissingValues')}
              </div>
            )}
          </div>
        </div>

        {/* Outliers */}
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-red-50 px-4 py-3 border-b flex items-center gap-2">
            <Target className="w-5 h-5 text-red-600" />
            <span className="font-bold text-red-800">{t('cleaning.detectedOutliers')}</span>
          </div>
          <div className="max-h-64 overflow-y-auto">
            {qualityReport.outliers.length > 0 ? (
              qualityReport.outliers.map(o => (
                <div key={o.column} className="px-4 py-3 border-b last:border-0 flex items-center justify-between">
                  <span className="font-medium">{o.column}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs bg-gray-100 px-2 py-1 rounded">{o.method}</span>
                    <span className="text-red-600 font-bold">{o.count}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-4 text-center text-green-600">
                <CheckCircle className="w-8 h-8 mx-auto mb-2" />
                {t('cleaning.noOutliers')}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Column Types */}
      <div className="border rounded-xl overflow-hidden">
        <div className="bg-purple-50 px-4 py-3 border-b flex items-center gap-2">
          <Hash className="w-5 h-5 text-purple-600" />
          <span className="font-bold text-purple-800">{t('cleaning.columnTypes')}</span>
        </div>
        <div className="p-4">
          <div className="flex flex-wrap gap-2">
            {columns.map(col => (
              <div key={col.name} className={`px-3 py-2 rounded-lg border flex items-center gap-2 ${
                col.type === 'numeric' ? 'bg-blue-50 border-blue-200' :
                col.type === 'categorical' ? 'bg-green-50 border-green-200' :
                col.type === 'date' ? 'bg-yellow-50 border-yellow-200' :
                col.type === 'boolean' ? 'bg-purple-50 border-purple-200' :
                'bg-gray-50 border-gray-200'
              }`}>
                {col.type === 'numeric' && <Hash size={14} className="text-blue-600" />}
                {col.type === 'categorical' && <Type size={14} className="text-green-600" />}
                {col.type === 'date' && <Calendar size={14} className="text-yellow-600" />}
                {col.type === 'boolean' && <ToggleLeft size={14} className="text-purple-600" />}
                {col.type === 'text' && <FileText size={14} className="text-gray-600" />}
                <span className="text-sm font-medium">{col.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Missing Values Tab ====================
const MissingValuesTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  selectedColumn: string;
  onColumnSelect: (col: string) => void;
  onApply: (result: CleaningResult, type: string, column?: string) => void;
  onPreview: (result: CleaningResult) => void;
}> = ({ data, columns, selectedColumn, onColumnSelect, onApply, onPreview }) => {
  const { t } = useLanguage();
  const [method, setMethod] = useState<string>('mean');
  const [customValue, setCustomValue] = useState<string>('');
  const [kValue, setKValue] = useState<number>(5);
  const [selectedFeatures, setSelectedFeatures] = useState<string[]>([]);
  const [dropThreshold] = useState<number>(50);

  const columnsWithMissing = columns.filter(c => c.missing > 0);
  const numericColumns = columns.filter(c => c.type === 'numeric');

  const selectedColInfo = columns.find(c => c.name === selectedColumn);
  const missingCount = selectedColInfo?.missing || 0;
  const missingPct = ((missingCount / data.length) * 100).toFixed(1);

  const handleApply = () => {
    let result: CleaningResult;
    switch (method) {
      case 'drop_rows':
        result = missingValueHandlers.dropRows(data, [selectedColumn]);
        break;
      case 'mean':
        result = missingValueHandlers.fillMean(data, selectedColumn);
        break;
      case 'median':
        result = missingValueHandlers.fillMedian(data, selectedColumn);
        break;
      case 'mode':
        result = missingValueHandlers.fillMode(data, selectedColumn);
        break;
      case 'constant':
        result = missingValueHandlers.fillConstant(data, selectedColumn, customValue);
        break;
      case 'ffill':
        result = missingValueHandlers.fillForward(data, selectedColumn);
        break;
      case 'bfill':
        result = missingValueHandlers.fillBackward(data, selectedColumn);
        break;
      case 'interpolate':
        result = missingValueHandlers.fillInterpolate(data, selectedColumn);
        break;
      case 'knn':
        result = missingValueHandlers.fillKNN(data, selectedColumn, kValue, selectedFeatures);
        break;
      default:
        return;
    }
    onApply(result, `missing-${method}`, selectedColumn);
  };

  const methods = [
    { id: 'drop_rows', label: t('cleaning.dropRows'), icon: <Trash2 size={18} />, desc: t('cleaning.dropRowsDesc') },
    { id: 'mean', label: t('cleaning.fillMean'), icon: <BarChart3 size={18} />, desc: t('cleaning.fillMeanDesc'), numeric: true },
    { id: 'median', label: t('cleaning.fillMedian'), icon: <TrendingUp size={18} />, desc: t('cleaning.fillMedianDesc'), numeric: true },
    { id: 'mode', label: t('cleaning.fillMode'), icon: <PieChart size={18} />, desc: t('cleaning.fillModeDesc') },
    { id: 'constant', label: t('cleaning.fillConstant'), icon: <Hash size={18} />, desc: t('cleaning.fillConstantDesc') },
    { id: 'ffill', label: t('cleaning.forwardFillVal'), icon: <ChevronRight size={18} />, desc: t('cleaning.forwardFillDesc') },
    { id: 'bfill', label: t('cleaning.backwardFillVal'), icon: <ChevronDown size={18} />, desc: t('cleaning.backwardFillDesc') },
    { id: 'interpolate', label: t('cleaning.interpolateFill'), icon: <TrendingUp size={18} />, desc: t('cleaning.interpolateDesc'), numeric: true },
    { id: 'knn', label: t('cleaning.knnImputation'), icon: <Crosshair size={18} />, desc: t('cleaning.knnImputationDesc'), numeric: true, advanced: true }
  ];

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gradient-to-r from-orange-50 to-yellow-50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <AlertTriangle className="w-12 h-12 text-orange-500 p-2 bg-orange-100 rounded-xl" />
          <div>
            <h3 className="font-bold text-lg text-orange-800">
              {columnsWithMissing.length} {t('cleaning.columnsWithMissing')}
            </h3>
            <p className="text-orange-600">
              {t('cleaning.totalMissing')}: {columnsWithMissing.reduce((sum, c) => sum + c.missing, 0).toLocaleString()}
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            const result = missingValueHandlers.dropColumns(data, columns.map(c => c.name), dropThreshold);
            onApply(result, 'drop-columns-missing');
          }}
          className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 flex items-center gap-2"
        >
          <Trash2 size={18} />
          {t('cleaning.dropHighMissing')} ({'>'}  {dropThreshold}%)
        </button>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {/* Column Selection */}
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('cleaning.selectColumn')}</div>
          <div className="max-h-80 overflow-y-auto">
            {columnsWithMissing.map(col => (
              <button
                key={col.name}
                onClick={() => onColumnSelect(col.name)}
                className={`w-full px-4 py-3 border-b text-right flex items-center justify-between hover:bg-gray-50 ${
                  selectedColumn === col.name ? 'bg-purple-50 border-r-4 border-r-purple-500' : ''
                }`}
              >
                <span className="font-medium">{col.name}</span>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${
                    (col.missing / data.length) > 0.3 ? 'bg-red-100 text-red-700' :
                    (col.missing / data.length) > 0.1 ? 'bg-orange-100 text-orange-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {((col.missing / data.length) * 100).toFixed(1)}%
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Method Selection */}
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('cleaning.processingMethod')}</div>
          <div className="max-h-80 overflow-y-auto p-2">
            {methods.map(m => (
              <button
                key={m.id}
                onClick={() => setMethod(m.id)}
                disabled={m.numeric && selectedColInfo?.type !== 'numeric'}
                className={`w-full px-3 py-2 rounded-lg text-right mb-1 flex items-center gap-3 ${
                  method === m.id ? 'bg-purple-100 text-purple-700' : 'hover:bg-gray-100'
                } ${m.numeric && selectedColInfo?.type !== 'numeric' ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className={`p-2 rounded-lg ${method === m.id ? 'bg-purple-200' : 'bg-gray-100'}`}>
                  {m.icon}
                </span>
                <div className="flex-1">
                  <div className="font-medium flex items-center gap-2">
                    {m.label}
                    {m.advanced && <span className="text-xs bg-purple-500 text-white px-2 py-0.5 rounded">{t('label.advanced')}</span>}
                  </div>
                  <div className="text-xs text-gray-500">{m.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div className="space-y-4">
          {selectedColumn && (
            <div className="bg-blue-50 rounded-xl p-4">
              <h4 className="font-bold text-blue-800 mb-2">{selectedColumn}</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="bg-white rounded-lg p-2">
                  <div className="text-gray-500">{t('label.missing')}</div>
                  <div className="font-bold text-lg text-orange-600">{missingCount}</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-gray-500">{t('label.percentage')}</div>
                  <div className="font-bold text-lg text-orange-600">{missingPct}%</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-gray-500">{t('label.type')}</div>
                  <div className="font-bold">{selectedColInfo?.type}</div>
                </div>
                <div className="bg-white rounded-lg p-2">
                  <div className="text-gray-500">{t('label.unique')}</div>
                  <div className="font-bold">{selectedColInfo?.unique}</div>
                </div>
              </div>
            </div>
          )}

          {method === 'constant' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('cleaning.constantValue')}</label>
              <input
                type="text"
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                placeholder={t('cleaning.enterValue')}
                className="w-full p-3 border rounded-lg"
              />
            </div>
          )}

          {method === 'knn' && (
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.kValue')}</label>
                <input
                  type="number"
                  value={kValue}
                  onChange={(e) => setKValue(parseInt(e.target.value) || 5)}
                  min={1}
                  max={50}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.featureColumns')}</label>
                <div className="max-h-32 overflow-y-auto border rounded-lg p-2">
                  {numericColumns.filter(c => c.name !== selectedColumn).map(col => (
                    <label key={col.name} className="flex items-center gap-2 p-1 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={selectedFeatures.includes(col.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFeatures([...selectedFeatures, col.name]);
                          } else {
                            setSelectedFeatures(selectedFeatures.filter(f => f !== col.name));
                          }
                        }}
                      />
                      <span className="text-sm">{col.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={handleApply}
              disabled={!selectedColumn}
              className="flex-1 py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Play size={18} />
              {t('action.apply')}
            </button>
            <button
              onClick={() => {
                let result: CleaningResult;
                switch (method) {
                  case 'mean':
                    result = missingValueHandlers.fillMean(data, selectedColumn);
                    break;
                  default:
                    result = missingValueHandlers.fillMedian(data, selectedColumn);
                }
                onPreview(result);
              }}
              className="px-4 py-3 border rounded-lg hover:bg-gray-50"
              title={t('action.preview')}
            >
              <Eye size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ==================== Outliers Tab ====================
const OutliersTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  selectedColumn: string;
  onColumnSelect: (col: string) => void;
  onApply: (result: CleaningResult, type: string, column?: string) => void;
  onPreview: (result: CleaningResult) => void;
}> = ({ data, columns, selectedColumn, onColumnSelect, onApply }) => {
  const { t } = useLanguage();
  const [method, setMethod] = useState<'zscore' | 'iqr' | 'mad'>('iqr');
  const [threshold, setThreshold] = useState<number>(1.5);
  const [action, setAction] = useState<'remove' | 'cap' | 'median' | 'winsorize'>('cap');
  const [winsorPct, setWinsorPct] = useState<number>(5);

  const detectedOutliers = useMemo(() => {
    if (!selectedColumn) return { indices: [], values: [], bounds: { lower: 0, upper: 0 } };
    
    switch (method) {
      case 'zscore':
        return { ...outlierHandlers.detectZScore(data, selectedColumn, threshold), bounds: { lower: 0, upper: 0 } };
      case 'mad':
        return { ...outlierHandlers.detectMAD(data, selectedColumn, threshold), bounds: { lower: 0, upper: 0 } };
      default:
        return outlierHandlers.detectIQR(data, selectedColumn, threshold);
    }
  }, [data, selectedColumn, method, threshold]);

  const handleApply = () => {
    let result: CleaningResult;
    switch (action) {
      case 'remove':
        result = outlierHandlers.removeOutliers(data, detectedOutliers.indices);
        break;
      case 'median':
        result = outlierHandlers.replaceWithMedian(data, selectedColumn, detectedOutliers.indices);
        break;
      case 'winsorize':
        result = outlierHandlers.winsorize(data, selectedColumn, winsorPct);
        break;
      default:
        result = outlierHandlers.capOutliers(data, selectedColumn, detectedOutliers.bounds.lower, detectedOutliers.bounds.upper);
    }
    onApply(result, `outliers-${action}`, selectedColumn);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        {/* Column Selection */}
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('cleaning.selectNumericColumn')}</div>
          <div className="max-h-80 overflow-y-auto">
            {columns.map(col => {
              const outliers = outlierHandlers.detectIQR(data, col.name);
              return (
                <button
                  key={col.name}
                  onClick={() => onColumnSelect(col.name)}
                  className={`w-full px-4 py-3 border-b text-right flex items-center justify-between hover:bg-gray-50 ${
                    selectedColumn === col.name ? 'bg-purple-50 border-r-4 border-r-purple-500' : ''
                  }`}
                >
                  <span className="font-medium">{col.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    outliers.indices.length > 10 ? 'bg-red-100 text-red-700' :
                    outliers.indices.length > 0 ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {outliers.indices.length} {t('cleaning.outlier')}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Method & Options */}
        <div className="space-y-4">
          <div className="border rounded-xl p-4">
            <h4 className="font-bold mb-3">{t('cleaning.detectionMethod')}</h4>
            <div className="space-y-2">
              {[
                { id: 'iqr', label: t('cleaning.iqrMethod'), desc: t('cleaning.iqrMethodDesc') },
                { id: 'zscore', label: t('cleaning.zscoreMethod'), desc: t('cleaning.zscoreMethodDesc') },
                { id: 'mad', label: t('cleaning.madMethod'), desc: t('cleaning.madMethodDesc') }
              ].map(m => (
                <button
                  key={m.id}
                  onClick={() => {
                    setMethod(m.id as any);
                    setThreshold(m.id === 'iqr' ? 1.5 : 3);
                  }}
                  className={`w-full p-3 rounded-lg text-right ${
                    method === m.id ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50 hover:bg-gray-100'
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="text-xs text-gray-500">{m.desc}</div>
                </button>
              ))}
            </div>
            
            <div className="mt-4">
              <label className="block text-sm font-medium mb-2">
                {method === 'iqr' ? t('cleaning.iqrMultiplier') : t('cleaning.threshold')}
              </label>
              <input
                type="range"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                min={method === 'iqr' ? 1 : 2}
                max={method === 'iqr' ? 3 : 5}
                step={0.1}
                className="w-full"
              />
              <div className="text-center font-bold text-lg">{threshold}</div>
            </div>
          </div>

          <div className="border rounded-xl p-4">
            <h4 className="font-bold mb-3">{t('cleaning.handlingMethod')}</h4>
            <select
              value={action}
              onChange={(e) => setAction(e.target.value as any)}
              className="w-full p-3 border rounded-lg"
            >
              <option value="cap">{t('cleaning.capOutliers')}</option>
              <option value="remove">{t('cleaning.removeOutliers')}</option>
              <option value="median">{t('cleaning.replaceWithMedian')}</option>
              <option value="winsorize">{t('cleaning.winsorize')}</option>
            </select>

            {action === 'winsorize' && (
              <div className="mt-3">
                <label className="block text-sm font-medium mb-2">{t('cleaning.percentile')}</label>
                <input
                  type="number"
                  value={winsorPct}
                  onChange={(e) => setWinsorPct(parseInt(e.target.value))}
                  min={1}
                  max={25}
                  className="w-full p-2 border rounded-lg"
                />
              </div>
            )}
          </div>
        </div>

        {/* Results */}
        <div className="space-y-4">
          <div className="bg-red-50 rounded-xl p-4">
            <h4 className="font-bold text-red-800 mb-3">{t('cleaning.detectionResults')}</h4>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-3xl font-bold text-red-600">{detectedOutliers.indices.length}</div>
                <div className="text-sm text-gray-600">{t('cleaning.outlierValue')}</div>
              </div>
              <div className="bg-white rounded-lg p-3 text-center">
                <div className="text-3xl font-bold text-red-600">
                  {((detectedOutliers.indices.length / data.length) * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">{t('cleaning.ofData')}</div>
              </div>
            </div>
            
            {detectedOutliers.bounds && (
              <div className="mt-3 bg-white rounded-lg p-3">
                <div className="text-sm text-gray-600 mb-1">{t('cleaning.calculatedBounds')}</div>
                <div className="flex justify-between font-mono">
                  <span className="text-blue-600">↓ {detectedOutliers.bounds.lower.toFixed(2)}</span>
                  <span className="text-blue-600">↑ {detectedOutliers.bounds.upper.toFixed(2)}</span>
                </div>
              </div>
            )}
          </div>

          {detectedOutliers.values && detectedOutliers.values.length > 0 && (
            <div className="border rounded-xl p-4">
              <h4 className="font-bold mb-2">{t('cleaning.sampleOutliers')}</h4>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto">
                {detectedOutliers.values.slice(0, 20).map((val, idx) => (
                  <span key={idx} className="px-2 py-1 bg-red-100 text-red-700 rounded text-sm font-mono">
                    {val.toFixed(2)}
                  </span>
                ))}
              </div>
            </div>
          )}

          <button
            onClick={handleApply}
            disabled={!selectedColumn || detectedOutliers.indices.length === 0}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Zap size={18} />
            {t('cleaning.handleOutliers')} ({detectedOutliers.indices.length})
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Duplicates Tab ====================
const DuplicatesTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  onApply: (result: CleaningResult, type: string) => void;
}> = ({ data, columns, onApply }) => {
  const { t } = useLanguage();
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [keep, setKeep] = useState<'first' | 'last'>('first');

  const duplicates = useMemo(() => {
    const cols = selectedColumns.length > 0 ? selectedColumns : undefined;
    return duplicateHandlers.detectDuplicates(data, cols);
  }, [data, selectedColumns]);

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-red-50 to-orange-50 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Copy className="w-12 h-12 text-red-500 p-2 bg-red-100 rounded-xl" />
          <div>
            <h3 className="font-bold text-lg text-red-800">{duplicates.indices.length} {t('cleaning.duplicateRow')}</h3>
            <p className="text-red-600">{t('cleaning.inGroups')}: {duplicates.groups.length}</p>
          </div>
        </div>
        <button
          onClick={() => {
            const cols = selectedColumns.length > 0 ? selectedColumns : undefined;
            const result = duplicateHandlers.removeDuplicates(data, cols, keep);
            onApply(result, 'remove-duplicates');
          }}
          disabled={duplicates.indices.length === 0}
          className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 flex items-center gap-2"
        >
          <Trash2 size={18} />
          {t('cleaning.removeDuplicates')}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">
            {t('cleaning.selectColumnsForComparison')}
          </div>
          <div className="p-4 max-h-80 overflow-y-auto">
            <button
              onClick={() => setSelectedColumns([])}
              className={`w-full p-3 rounded-lg text-right mb-2 ${
                selectedColumns.length === 0 ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className="font-medium">{t('cleaning.allColumns')}</div>
              <div className="text-xs text-gray-500">{t('cleaning.compareFullRows')}</div>
            </button>
            
            <div className="border-t pt-2 mt-2">
              {columns.map(col => (
                <label key={col.name} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedColumns.includes(col.name)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedColumns([...selectedColumns, col.name]);
                      } else {
                        setSelectedColumns(selectedColumns.filter(c => c !== col.name));
                      }
                    }}
                    className="w-4 h-4"
                  />
                  <span>{col.name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border rounded-xl p-4">
            <h4 className="font-bold mb-3">{t('cleaning.keepOption')}</h4>
            <div className="flex gap-3">
              <button
                onClick={() => setKeep('first')}
                className={`flex-1 p-3 rounded-lg ${
                  keep === 'first' ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50'
                }`}
              >
                {t('cleaning.keepFirst')}
              </button>
              <button
                onClick={() => setKeep('last')}
                className={`flex-1 p-3 rounded-lg ${
                  keep === 'last' ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50'
                }`}
              >
                {t('cleaning.keepLast')}
              </button>
            </div>
          </div>

          {duplicates.groups.length > 0 && (
            <div className="border rounded-xl p-4">
              <h4 className="font-bold mb-3">{t('cleaning.duplicateGroups')}</h4>
              <div className="max-h-48 overflow-y-auto space-y-2">
                {duplicates.groups.slice(0, 10).map((group, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-lg p-2 text-sm">
                    <span className="font-medium">{t('cleaning.group')} {idx + 1}: </span>
                    <span className="text-gray-600">
                      {t('cleaning.rows')} {group.slice(0, 5).join(', ')}{group.length > 5 ? ` ${t('cleaning.andMore')} ${group.length - 5}` : ''}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ==================== Transform Tab ====================
const TransformTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  selectedColumn: string;
  onColumnSelect: (col: string) => void;
  onApply: (result: CleaningResult, type: string, column?: string) => void;
}> = ({ data, columns, selectedColumn, onColumnSelect, onApply }) => {
  const { t } = useLanguage();
  const [transform, setTransform] = useState<string>('log');
  const [power, setPower] = useState<number>(2);
  const [minVal, setMinVal] = useState<number>(0);
  const [maxVal, setMaxVal] = useState<number>(1);

  const transforms = [
    { id: 'log', label: t('cleaning.logTransform'), desc: t('cleaning.logTransformDesc'), icon: '📈' },
    { id: 'log1p', label: t('cleaning.log1pTransform'), desc: t('cleaning.log1pTransformDesc'), icon: '📊' },
    { id: 'sqrt', label: t('cleaning.sqrtTransform'), desc: t('cleaning.sqrtTransformDesc'), icon: '√' },
    { id: 'boxcox', label: t('cleaning.boxcoxTransform'), desc: t('cleaning.boxcoxTransformDesc'), icon: '📦' },
    { id: 'minmax', label: t('cleaning.minmaxTransform'), desc: t('cleaning.minmaxTransformDesc'), icon: '↔️' },
    { id: 'zscore', label: t('cleaning.zscoreTransform'), desc: t('cleaning.zscoreTransformDesc'), icon: '📐' },
    { id: 'robust', label: t('cleaning.robustTransform'), desc: t('cleaning.robustTransformDesc'), icon: '🛡️' },
    { id: 'power', label: t('cleaning.powerTransform'), desc: t('cleaning.powerTransformDesc'), icon: '^' },
    { id: 'reciprocal', label: t('cleaning.reciprocalTransform'), desc: t('cleaning.reciprocalTransformDesc'), icon: '⟲' }
  ];

  const handleApply = () => {
    let result: CleaningResult;
    switch (transform) {
      case 'log':
        result = transformationHandlers.logTransform(data, selectedColumn);
        break;
      case 'log1p':
        result = transformationHandlers.log1pTransform(data, selectedColumn);
        break;
      case 'sqrt':
        result = transformationHandlers.sqrtTransform(data, selectedColumn);
        break;
      case 'boxcox':
        result = transformationHandlers.boxCoxTransform(data, selectedColumn);
        break;
      case 'minmax':
        result = transformationHandlers.minMaxNormalize(data, selectedColumn, minVal, maxVal);
        break;
      case 'zscore':
        result = transformationHandlers.standardize(data, selectedColumn);
        break;
      case 'robust':
        result = transformationHandlers.robustScale(data, selectedColumn);
        break;
      case 'power':
        result = transformationHandlers.powerTransform(data, selectedColumn, power);
        break;
      case 'reciprocal':
        result = transformationHandlers.reciprocalTransform(data, selectedColumn);
        break;
      default:
        return;
    }
    onApply(result, `transform-${transform}`, selectedColumn);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('label.column')}</div>
          <div className="max-h-80 overflow-y-auto">
            {columns.map(col => (
              <button
                key={col.name}
                onClick={() => onColumnSelect(col.name)}
                className={`w-full px-4 py-3 border-b text-right hover:bg-gray-50 ${
                  selectedColumn === col.name ? 'bg-purple-50 border-r-4 border-r-purple-500' : ''
                }`}
              >
                {col.name}
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('cleaning.transformationType')}</div>
          <div className="max-h-80 overflow-y-auto p-2">
            {transforms.map(tr => (
              <button
                key={tr.id}
                onClick={() => setTransform(tr.id)}
                className={`w-full p-3 rounded-lg text-right mb-1 flex items-center gap-3 ${
                  transform === tr.id ? 'bg-purple-100' : 'hover:bg-gray-100'
                }`}
              >
                <span className="text-2xl">{tr.icon}</span>
                <div>
                  <div className="font-medium">{tr.label}</div>
                  <div className="text-xs text-gray-500">{tr.desc}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {transform === 'minmax' && (
            <div className="border rounded-xl p-4">
              <h4 className="font-bold mb-3">{t('cleaning.normalizationRange')}</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-gray-600">{t('label.min')}</label>
                  <input
                    type="number"
                    value={minVal}
                    onChange={(e) => setMinVal(parseFloat(e.target.value))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
                <div>
                  <label className="text-sm text-gray-600">{t('label.max')}</label>
                  <input
                    type="number"
                    value={maxVal}
                    onChange={(e) => setMaxVal(parseFloat(e.target.value))}
                    className="w-full p-2 border rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {transform === 'power' && (
            <div className="border rounded-xl p-4">
              <h4 className="font-bold mb-3">{t('cleaning.exponent')}</h4>
              <input
                type="number"
                value={power}
                onChange={(e) => setPower(parseFloat(e.target.value))}
                step={0.5}
                className="w-full p-2 border rounded-lg"
              />
            </div>
          )}

          <div className="bg-blue-50 rounded-xl p-4">
            <Info className="w-5 h-5 text-blue-600 mb-2" />
            <p className="text-sm text-blue-800">
              {t('cleaning.newColumnCreated')}: <code className="bg-blue-100 px-1 rounded">{selectedColumn}_{transform}</code>
            </p>
          </div>

          <button
            onClick={handleApply}
            disabled={!selectedColumn}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {t('cleaning.applyTransformation')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Text Tab ====================
const TextTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  selectedColumn: string;
  onColumnSelect: (col: string) => void;
  onApply: (result: CleaningResult, type: string, column?: string) => void;
}> = ({ data, columns, selectedColumn, onColumnSelect, onApply }) => {
  const { t } = useLanguage();
  const [operation, setOperation] = useState<string>('trim');
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [pattern, setPattern] = useState('');
  const [newColumnName, setNewColumnName] = useState('extracted');
  const [delimiter, setDelimiter] = useState(',');
  const [splitColumns, setSplitColumns] = useState('col1,col2');

  const operations = [
    { id: 'trim', label: t('cleaning.trimSpaces'), icon: <Scissors size={18} /> },
    { id: 'lower', label: t('cleaning.toLowerCase'), icon: <Type size={18} /> },
    { id: 'upper', label: t('cleaning.toUpperCase'), icon: <Type size={18} /> },
    { id: 'title', label: t('cleaning.toTitleCase'), icon: <Type size={18} /> },
    { id: 'special', label: t('cleaning.removeSpecial'), icon: <Trash2 size={18} /> },
    { id: 'replace', label: t('cleaning.replaceText'), icon: <RefreshCw size={18} /> },
    { id: 'extract', label: t('cleaning.extractPattern'), icon: <Search size={18} /> },
    { id: 'split', label: t('cleaning.splitColumn'), icon: <Scissors size={18} /> }
  ];

  const handleApply = () => {
    let result: CleaningResult;
    switch (operation) {
      case 'trim':
        result = textHandlers.trimWhitespace(data, selectedColumn);
        break;
      case 'lower':
        result = textHandlers.toLowerCase(data, selectedColumn);
        break;
      case 'upper':
        result = textHandlers.toUpperCase(data, selectedColumn);
        break;
      case 'title':
        result = textHandlers.toTitleCase(data, selectedColumn);
        break;
      case 'special':
        result = textHandlers.removeSpecialChars(data, selectedColumn);
        break;
      case 'replace':
        result = textHandlers.replaceText(data, selectedColumn, searchText, replaceText);
        break;
      case 'extract':
        result = textHandlers.extractPattern(data, selectedColumn, pattern, newColumnName);
        break;
      case 'split':
        result = textHandlers.splitColumn(data, selectedColumn, delimiter, splitColumns.split(',').map(s => s.trim()));
        break;
      default:
        return;
    }
    onApply(result, `text-${operation}`, selectedColumn);
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('cleaning.textColumn')}</div>
          <div className="max-h-80 overflow-y-auto">
            {columns.map(col => (
              <button
                key={col.name}
                onClick={() => onColumnSelect(col.name)}
                className={`w-full px-4 py-3 border-b text-right hover:bg-gray-50 ${
                  selectedColumn === col.name ? 'bg-purple-50 border-r-4 border-r-purple-500' : ''
                }`}
              >
                <div className="font-medium">{col.name}</div>
                <div className="text-xs text-gray-500">
                  {col.unique} {t('label.uniqueValues')}
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('cleaning.operation')}</div>
          <div className="p-2">
            {operations.map(op => (
              <button
                key={op.id}
                onClick={() => setOperation(op.id)}
                className={`w-full p-3 rounded-lg text-right mb-1 flex items-center gap-3 ${
                  operation === op.id ? 'bg-purple-100' : 'hover:bg-gray-100'
                }`}
              >
                {op.icon}
                <span className="font-medium">{op.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {operation === 'replace' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.searchFor')}</label>
                <input
                  type="text"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.replaceWith')}</label>
                <input
                  type="text"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            </>
          )}

          {operation === 'extract' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.pattern')} (Regex)</label>
                <input
                  type="text"
                  value={pattern}
                  onChange={(e) => setPattern(e.target.value)}
                  placeholder={t('cleaning.patternExample')}
                  className="w-full p-3 border rounded-lg font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.newColumnName')}</label>
                <input
                  type="text"
                  value={newColumnName}
                  onChange={(e) => setNewColumnName(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            </>
          )}

          {operation === 'split' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.delimiter')}</label>
                <input
                  type="text"
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.columnNames')}</label>
                <input
                  type="text"
                  value={splitColumns}
                  onChange={(e) => setSplitColumns(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                />
              </div>
            </>
          )}

          <button
            onClick={handleApply}
            disabled={!selectedColumn}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {t('action.apply')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Date Tab ====================
const DateTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  selectedColumn: string;
  onColumnSelect: (col: string) => void;
  onApply: (result: CleaningResult, type: string, column?: string) => void;
}> = ({ data, columns, selectedColumn, onColumnSelect, onApply }) => {
  const { t } = useLanguage();
  const [operation, setOperation] = useState<string>('parse');
  const [format, setFormat] = useState('YYYY-MM-DD');
  const [parts, setParts] = useState<string[]>(['year', 'month', 'day']);
  const [secondColumn, setSecondColumn] = useState('');
  const [diffUnit, setDiffUnit] = useState<'days' | 'hours' | 'months' | 'years'>('days');

  const operations = [
    { id: 'parse', label: t('cleaning.parseDate'), icon: <Calendar size={18} /> },
    { id: 'extract', label: t('cleaning.extractParts'), icon: <Layers size={18} /> },
    { id: 'format', label: t('cleaning.formatDate'), icon: <FileText size={18} /> },
    { id: 'diff', label: t('cleaning.dateDiff'), icon: <ArrowUpDown size={18} /> }
  ];

  const handleApply = () => {
    let result: CleaningResult;
    switch (operation) {
      case 'parse':
        result = dateHandlers.parseDate(data, selectedColumn);
        break;
      case 'extract':
        result = dateHandlers.extractDateParts(data, selectedColumn, parts as any[]);
        break;
      case 'format':
        result = dateHandlers.formatDate(data, selectedColumn, format);
        break;
      case 'diff':
        result = dateHandlers.dateDiff(data, selectedColumn, secondColumn, diffUnit, `${selectedColumn}_diff_${diffUnit}`);
        break;
      default:
        return;
    }
    onApply(result, `date-${operation}`, selectedColumn);
  };

  const allParts = [
    { id: 'year', label: t('cleaning.year') },
    { id: 'month', label: t('cleaning.month') },
    { id: 'day', label: t('cleaning.day') },
    { id: 'hour', label: t('cleaning.hour') },
    { id: 'minute', label: t('cleaning.minute') },
    { id: 'dayOfWeek', label: t('cleaning.dayOfWeek') },
    { id: 'quarter', label: t('cleaning.quarter') }
  ];

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('label.column')}</div>
          <div className="max-h-80 overflow-y-auto">
            {columns.map(col => (
              <button
                key={col.name}
                onClick={() => onColumnSelect(col.name)}
                className={`w-full px-4 py-3 border-b text-right hover:bg-gray-50 ${
                  selectedColumn === col.name ? 'bg-purple-50 border-r-4 border-r-purple-500' : ''
                }`}
              >
                <div className="font-medium">{col.name}</div>
                <div className="text-xs text-gray-500">{col.type}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="border rounded-xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('cleaning.operation')}</div>
          <div className="p-2">
            {operations.map(op => (
              <button
                key={op.id}
                onClick={() => setOperation(op.id)}
                className={`w-full p-3 rounded-lg text-right mb-1 flex items-center gap-3 ${
                  operation === op.id ? 'bg-purple-100' : 'hover:bg-gray-100'
                }`}
              >
                {op.icon}
                <span className="font-medium">{op.label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          {operation === 'extract' && (
            <div className="border rounded-xl p-4">
              <h4 className="font-bold mb-3">{t('cleaning.components')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {allParts.map(part => (
                  <label key={part.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                    <input
                      type="checkbox"
                      checked={parts.includes(part.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setParts([...parts, part.id]);
                        } else {
                          setParts(parts.filter(p => p !== part.id));
                        }
                      }}
                    />
                    <span className="text-sm">{part.label}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {operation === 'format' && (
            <div>
              <label className="block text-sm font-medium mb-2">{t('cleaning.dateFormat')}</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value)}
                className="w-full p-3 border rounded-lg"
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="YYYY/MM/DD HH:mm">YYYY/MM/DD HH:mm</option>
              </select>
            </div>
          )}

          {operation === 'diff' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.secondDate')}</label>
                <select
                  value={secondColumn}
                  onChange={(e) => setSecondColumn(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="">{t('action.select')}...</option>
                  {columns.filter(c => c.name !== selectedColumn).map(col => (
                    <option key={col.name} value={col.name}>{col.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">{t('cleaning.unit')}</label>
                <select
                  value={diffUnit}
                  onChange={(e) => setDiffUnit(e.target.value as any)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value="days">{t('cleaning.days')}</option>
                  <option value="hours">{t('cleaning.hours')}</option>
                  <option value="months">{t('cleaning.months')}</option>
                  <option value="years">{t('cleaning.years')}</option>
                </select>
              </div>
            </>
          )}

          <button
            onClick={handleApply}
            disabled={!selectedColumn}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
          >
            {t('action.apply')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ==================== Types Tab ====================
const TypesTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  onApply: (result: CleaningResult, type: string) => void;
}> = ({ data, columns, onApply }) => {
  const { t, language, isRTL } = useLanguage();
  const [selectedColumn, setSelectedColumn] = useState(columns[0]?.name || '');
  const [targetType, setTargetType] = useState<string>('number');
  const [decimalSep, setDecimalSep] = useState('.');
  const [viewMode, setViewMode] = useState<'simple' | 'advanced'>('advanced');

  // تحليل الأعمدة
  const columnAnalysis = useMemo(() => {
    return columns.map(col => {
      const values = data.map(row => row[col.name]);
      const nonNullValues = values.filter(v => v !== null && v !== undefined && v !== '');
      const sampleValues = nonNullValues.slice(0, 5);
      
      // تحديد النوع الحالي المكتشف
      const detectedType = detectColumnType(nonNullValues);
      
      // اقتراح النوع الأفضل
      const suggestedType = suggestBestType(nonNullValues, col.unique, data.length);
      
      // فحص إمكانية التحويل
      const conversionResults = testConversions(nonNullValues);
      
      return {
        ...col,
        sampleValues,
        detectedType,
        suggestedType,
        conversionResults,
        hasSuggestion: suggestedType !== detectedType
      };
    });
  }, [data, columns]);

  function detectColumnType(values: any[]): string {
    if (values.length === 0) return 'text';
    const sample = values.slice(0, 100);
    
    // فحص الأرقام
    const allNumbers = sample.every(v => !isNaN(Number(v)) && v !== '');
    if (allNumbers) {
      const hasDecimals = sample.some(v => String(v).includes('.'));
      return hasDecimals ? 'float' : 'integer';
    }
    
    // فحص المنطقي
    const booleanValues = ['true', 'false', '0', '1', 'yes', 'no', 'نعم', 'لا'];
    const allBoolean = sample.every(v => booleanValues.includes(String(v).toLowerCase()));
    if (allBoolean) return 'boolean';
    
    // فحص التاريخ
    const datePatterns = [/^\d{4}-\d{2}-\d{2}$/, /^\d{2}\/\d{2}\/\d{4}$/];
    const allDates = sample.every(v => datePatterns.some(p => p.test(String(v))) || !isNaN(Date.parse(String(v))));
    if (allDates) return 'date';
    
    return 'text';
  }

  function suggestBestType(values: any[], uniqueCount: number, totalCount: number): string {
    const currentType = detectColumnType(values);
    if (currentType === 'text' && uniqueCount <= 20 && uniqueCount < totalCount * 0.1) {
      return 'category';
    }
    return currentType;
  }

  function testConversions(values: any[]): Record<string, { success: number; failed: number }> {
    const results: Record<string, { success: number; failed: number }> = {};
    const types = ['number', 'integer', 'boolean', 'date', 'text', 'category'];
    const sample = values.slice(0, 100);
    
    types.forEach(type => {
      let success = 0, failed = 0;
      sample.forEach(v => {
        try {
          const converted = convertValue(v, type);
          if (converted !== null) success++;
          else failed++;
        } catch {
          failed++;
        }
      });
      results[type] = { success, failed };
    });
    
    return results;
  }

  function convertValue(value: any, targetType: string): any {
    if (value === null || value === undefined || value === '') return null;
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
        if (['true', '1', 'yes', 'نعم'].includes(lower)) return true;
        if (['false', '0', 'no', 'لا'].includes(lower)) return false;
        return null;
      case 'date':
        const date = new Date(strValue);
        return isNaN(date.getTime()) ? null : date;
      default:
        return strValue;
    }
  }

  const applyTypeChange = (colName: string, newType: string) => {
    const newData = data.map(row => ({
      ...row,
      [colName]: convertValue(row[colName], newType)
    }));

    const result: CleaningResult = {
      success: true,
      data: newData,
      affectedRows: data.length,
      message: language === 'ar' 
        ? `تم تحويل العمود "${colName}" إلى ${newType}` 
        : `Column "${colName}" converted to ${newType}`
    };

    onApply(result, `type-${newType}`);
  };

  const applyAllSuggestions = () => {
    let newData = [...data];
    let changedColumns = 0;

    columnAnalysis.forEach(col => {
      if (col.hasSuggestion) {
        newData = newData.map(row => ({
          ...row,
          [col.name]: convertValue(row[col.name], col.suggestedType)
        }));
        changedColumns++;
      }
    });

    const result: CleaningResult = {
      success: true,
      data: newData,
      affectedRows: data.length,
      message: language === 'ar' 
        ? `تم تطبيق ${changedColumns} اقتراح تحويل` 
        : `Applied ${changedColumns} conversion suggestions`
    };

    onApply(result, 'type-auto');
  };

  const handleApply = () => {
    let result: CleaningResult;
    switch (targetType) {
      case 'number':
        result = typeConversionHandlers.toNumber(data, selectedColumn, decimalSep);
        break;
      case 'string':
        result = typeConversionHandlers.toString(data, selectedColumn);
        break;
      case 'boolean':
        result = typeConversionHandlers.toBoolean(data, selectedColumn);
        break;
      case 'category':
        result = typeConversionHandlers.toCategory(data, selectedColumn);
        break;
      default:
        return;
    }
    onApply(result, `type-${targetType}`);
  };

  const dataTypes = [
    { id: 'text', nameAr: 'نصي', nameEn: 'Text', icon: Type, color: 'blue' },
    { id: 'number', nameAr: 'رقمي', nameEn: 'Number', icon: Hash, color: 'green' },
    { id: 'integer', nameAr: 'عدد صحيح', nameEn: 'Integer', icon: Hash, color: 'emerald' },
    { id: 'float', nameAr: 'عدد عشري', nameEn: 'Decimal', icon: Hash, color: 'teal' },
    { id: 'boolean', nameAr: 'منطقي', nameEn: 'Boolean', icon: ToggleLeft, color: 'purple' },
    { id: 'date', nameAr: 'تاريخ', nameEn: 'Date', icon: Calendar, color: 'orange' },
    { id: 'category', nameAr: 'فئوي', nameEn: 'Category', icon: Layers, color: 'pink' },
  ];

  const getTypeName = (typeId: string) => {
    const type = dataTypes.find(t => t.id === typeId);
    return language === 'ar' ? type?.nameAr : type?.nameEn;
  };

  const suggestionsCount = columnAnalysis.filter(c => c.hasSuggestion).length;

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`}>
      {/* الرأس */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <Hash className="w-7 h-7" />
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
              <div className="text-2xl font-bold">{columns.length}</div>
              <div className="text-xs text-blue-100">
                {language === 'ar' ? 'عمود' : 'Columns'}
              </div>
            </div>
            <div className="bg-white/20 rounded-xl px-4 py-2 text-center">
              <div className="text-2xl font-bold">{suggestionsCount}</div>
              <div className="text-xs text-blue-100">
                {language === 'ar' ? 'اقتراح' : 'Suggestions'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* شريط الأدوات */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode('simple')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'simple' 
                  ? 'bg-purple-100 text-purple-700 font-medium' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {language === 'ar' ? 'عرض بسيط' : 'Simple View'}
            </button>
            <button
              onClick={() => setViewMode('advanced')}
              className={`px-4 py-2 rounded-lg transition-all ${
                viewMode === 'advanced' 
                  ? 'bg-purple-100 text-purple-700 font-medium' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {language === 'ar' ? 'عرض متقدم' : 'Advanced View'}
            </button>
          </div>

          {suggestionsCount > 0 && (
            <button
              onClick={applyAllSuggestions}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-lg hover:opacity-90 transition-opacity"
            >
              <Wand2 size={18} />
              {language === 'ar' 
                ? `تطبيق ${suggestionsCount} اقتراح` 
                : `Apply ${suggestionsCount} Suggestions`}
            </button>
          )}
        </div>
      </div>

      {viewMode === 'simple' ? (
        /* العرض البسيط */
        <div className="grid md:grid-cols-2 gap-6">
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b font-bold">{t('cleaning.columnsAndTypes')}</div>
            <div className="max-h-96 overflow-y-auto">
              {columns.map(col => (
                <button
                  key={col.name}
                  onClick={() => setSelectedColumn(col.name)}
                  className={`w-full px-4 py-3 border-b flex items-center justify-between hover:bg-gray-50 ${
                    selectedColumn === col.name ? 'bg-purple-50 border-r-4 border-r-purple-500' : ''
                  }`}
                >
                  <span className="font-medium">{col.name}</span>
                  <span className={`px-2 py-1 rounded text-xs ${
                    col.type === 'numeric' ? 'bg-blue-100 text-blue-700' :
                    col.type === 'categorical' ? 'bg-green-100 text-green-700' :
                    col.type === 'date' ? 'bg-yellow-100 text-yellow-700' :
                    col.type === 'boolean' ? 'bg-purple-100 text-purple-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {col.type}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div className="border rounded-xl p-4">
              <h4 className="font-bold mb-3">{t('cleaning.convertTo')}</h4>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'number', label: t('dataType.numeric'), icon: <Hash size={18} /> },
                  { id: 'string', label: t('dataType.text'), icon: <Type size={18} /> },
                  { id: 'boolean', label: t('dataType.boolean'), icon: <ToggleLeft size={18} /> },
                  { id: 'category', label: t('dataType.categorical'), icon: <Layers size={18} /> }
                ].map(tp => (
                  <button
                    key={tp.id}
                    onClick={() => setTargetType(tp.id)}
                    className={`p-3 rounded-lg flex items-center gap-2 ${
                      targetType === tp.id ? 'bg-purple-100 border-2 border-purple-500' : 'bg-gray-50'
                    }`}
                  >
                    {tp.icon}
                    <span>{tp.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {targetType === 'number' && (
              <div className="border rounded-xl p-4">
                <label className="block text-sm font-medium mb-2">{t('cleaning.decimalSeparator')}</label>
                <select
                  value={decimalSep}
                  onChange={(e) => setDecimalSep(e.target.value)}
                  className="w-full p-3 border rounded-lg"
                >
                  <option value=".">{t('cleaning.point')} (.)</option>
                  <option value=",">{t('cleaning.comma')} (,)</option>
                </select>
              </div>
            )}

            <button
              onClick={handleApply}
              disabled={!selectedColumn}
              className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {t('cleaning.convertType')}
            </button>
          </div>
        </div>
      ) : (
        /* العرض المتقدم */
        <div className="space-y-4">
          {columnAnalysis.map((col) => {
            const TypeIcon = dataTypes.find(t => t.id === col.detectedType)?.icon || Type;

            return (
              <div
                key={col.name}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                  col.hasSuggestion ? 'border-amber-300 ring-1 ring-amber-200' : ''
                }`}
              >
                {/* رأس البطاقة */}
                <div className="p-4 bg-gradient-to-r from-gray-50 to-white border-b">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                        <TypeIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-800">{col.name}</h3>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          <span className="px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            {getTypeName(col.detectedType)}
                          </span>
                          <span>•</span>
                          <span>{col.unique} {language === 'ar' ? 'قيمة فريدة' : 'unique'}</span>
                          {col.missing > 0 && (
                            <>
                              <span>•</span>
                              <span className="text-amber-600">
                                {col.missing} {language === 'ar' ? 'مفقودة' : 'missing'}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {col.hasSuggestion && (
                      <button
                        onClick={() => applyTypeChange(col.name, col.suggestedType)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors text-sm"
                      >
                        <Wand2 size={16} />
                        {language === 'ar' ? 'اقتراح:' : 'Suggest:'} {getTypeName(col.suggestedType)}
                      </button>
                    )}
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
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-2">
                    {dataTypes.map((type) => {
                      const Icon = type.icon;
                      const isCurrentType = col.detectedType === type.id;
                      const conversionResult = col.conversionResults[type.id];
                      const successRate = conversionResult 
                        ? Math.round((conversionResult.success / (conversionResult.success + conversionResult.failed)) * 100) 
                        : 0;
                      const canConvert = successRate > 50;

                      return (
                        <button
                          key={type.id}
                          onClick={() => !isCurrentType && canConvert && applyTypeChange(col.name, type.id)}
                          disabled={isCurrentType || !canConvert}
                          className={`relative p-3 rounded-xl border-2 transition-all ${
                            isCurrentType
                              ? 'bg-gray-100 border-gray-300 cursor-default'
                              : canConvert
                              ? 'hover:bg-blue-50 hover:border-blue-300 border-gray-200 cursor-pointer'
                              : 'bg-gray-50 border-gray-200 cursor-not-allowed opacity-50'
                          }`}
                        >
                          <div className="flex flex-col items-center gap-1">
                            <Icon className={`w-5 h-5 ${
                              isCurrentType ? 'text-gray-400' :
                              canConvert ? 'text-blue-500' : 'text-gray-300'
                            }`} />
                            <span className={`text-xs font-medium ${
                              isCurrentType ? 'text-gray-500' :
                              canConvert ? 'text-gray-700' : 'text-gray-400'
                            }`}>
                              {language === 'ar' ? type.nameAr : type.nameEn}
                            </span>
                            {!isCurrentType && (
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
                              <CheckCircle className="w-3 h-3 text-white" />
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ==================== Filter Tab ====================
const FilterTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  onApply: (result: CleaningResult, type: string) => void;
}> = ({ data, columns, onApply }) => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<{ column: string; operator: string; value: string }[]>([]);

  const operators = [
    { id: 'eq', label: '=' },
    { id: 'ne', label: '≠' },
    { id: 'gt', label: '>' },
    { id: 'gte', label: '≥' },
    { id: 'lt', label: '<' },
    { id: 'lte', label: '≤' },
    { id: 'contains', label: t('cleaning.contains') },
    { id: 'startswith', label: t('cleaning.startsWith') },
    { id: 'endswith', label: t('cleaning.endsWith') },
    { id: 'isnull', label: t('cleaning.isEmpty') },
    { id: 'notnull', label: t('cleaning.isNotEmpty') }
  ];

  const addFilter = () => {
    setFilters([...filters, { column: columns[0]?.name || '', operator: 'eq', value: '' }]);
  };

  const removeFilter = (index: number) => {
    setFilters(filters.filter((_, i) => i !== index));
  };

  const applyFilters = () => {
    let filteredData = [...data];
    
    filters.forEach(filter => {
      filteredData = filteredData.filter(row => {
        const val = row[filter.column];
        const filterVal = filter.value;

        switch (filter.operator) {
          case 'eq': return String(val) === filterVal;
          case 'ne': return String(val) !== filterVal;
          case 'gt': return Number(val) > Number(filterVal);
          case 'gte': return Number(val) >= Number(filterVal);
          case 'lt': return Number(val) < Number(filterVal);
          case 'lte': return Number(val) <= Number(filterVal);
          case 'contains': return String(val).includes(filterVal);
          case 'startswith': return String(val).startsWith(filterVal);
          case 'endswith': return String(val).endsWith(filterVal);
          case 'isnull': return val === null || val === undefined || val === '';
          case 'notnull': return val !== null && val !== undefined && val !== '';
          default: return true;
        }
      });
    });

    const result: CleaningResult = {
      success: true,
      data: filteredData,
      affectedRows: data.length - filteredData.length,
      message: t('cleaning.filteredRows').replace('{removed}', String(data.length - filteredData.length)).replace('{remaining}', String(filteredData.length))
    };

    onApply(result, 'filter');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-lg">{t('cleaning.filterConditions')}</h3>
        <button
          onClick={addFilter}
          className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          + {t('cleaning.addCondition')}
        </button>
      </div>

      {filters.length === 0 ? (
        <div className="bg-gray-50 rounded-xl p-8 text-center">
          <Filter className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">{t('cleaning.noFiltersAdded')}</p>
          <button
            onClick={addFilter}
            className="mt-3 text-purple-600 hover:underline"
          >
            {t('cleaning.addNewCondition')}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filters.map((filter, idx) => (
            <div key={idx} className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
              <select
                value={filter.column}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[idx].column = e.target.value;
                  setFilters(newFilters);
                }}
                className="flex-1 p-2 border rounded-lg"
              >
                {columns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
              
              <select
                value={filter.operator}
                onChange={(e) => {
                  const newFilters = [...filters];
                  newFilters[idx].operator = e.target.value;
                  setFilters(newFilters);
                }}
                className="w-32 p-2 border rounded-lg"
              >
                {operators.map(op => (
                  <option key={op.id} value={op.id}>{op.label}</option>
                ))}
              </select>

              {!['isnull', 'notnull'].includes(filter.operator) && (
                <input
                  type="text"
                  value={filter.value}
                  onChange={(e) => {
                    const newFilters = [...filters];
                    newFilters[idx].value = e.target.value;
                    setFilters(newFilters);
                  }}
                  placeholder={t('label.value')}
                  className="flex-1 p-2 border rounded-lg"
                />
              )}

              <button
                onClick={() => removeFilter(idx)}
                className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}

          <button
            onClick={applyFilters}
            className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700"
          >
            {t('cleaning.applyFilter')}
          </button>
        </div>
      )}
    </div>
  );
};

// ==================== Columns Tab ====================
const ColumnsTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  onApply: (result: CleaningResult, type: string) => void;
}> = ({ data, columns, onApply }) => {
  const { t } = useLanguage();
  const [selectedColumns, setSelectedColumns] = useState<string[]>(columns.map(c => c.name));
  const [renameMap, setRenameMap] = useState<Record<string, string>>({});

  const handleSelectAll = () => {
    setSelectedColumns(columns.map(c => c.name));
  };

  const handleDeselectAll = () => {
    setSelectedColumns([]);
  };

  const applyColumnSelection = () => {
    const newData = data.map(row => {
      const newRow: DataRow = {};
      selectedColumns.forEach(col => {
        const newName = renameMap[col] || col;
        newRow[newName] = row[col];
      });
      return newRow;
    });

    const result: CleaningResult = {
      success: true,
      data: newData,
      affectedRows: data.length,
      message: t('cleaning.keptColumns').replace('{kept}', String(selectedColumns.length)).replace('{total}', String(columns.length))
    };

    onApply(result, 'columns');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={handleSelectAll}
            className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t('action.selectAll')}
          </button>
          <button
            onClick={handleDeselectAll}
            className="px-3 py-1 text-sm bg-gray-100 rounded-lg hover:bg-gray-200"
          >
            {t('action.deselectAll')}
          </button>
        </div>
        <span className="text-sm text-gray-600">
          {selectedColumns.length} / {columns.length} {t('label.selected')}
        </span>
      </div>

      <div className="grid md:grid-cols-2 gap-3 max-h-96 overflow-y-auto">
        {columns.map(col => (
          <div
            key={col.name}
            className={`p-4 rounded-xl border-2 transition-all ${
              selectedColumns.includes(col.name) 
                ? 'border-purple-500 bg-purple-50' 
                : 'border-gray-200 bg-gray-50 opacity-60'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedColumns.includes(col.name)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedColumns([...selectedColumns, col.name]);
                    } else {
                      setSelectedColumns(selectedColumns.filter(c => c !== col.name));
                    }
                  }}
                  className="w-4 h-4"
                />
                <span className="font-medium">{col.name}</span>
              </label>
              <span className={`px-2 py-1 rounded text-xs ${
                col.type === 'numeric' ? 'bg-blue-100 text-blue-700' :
                col.type === 'categorical' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {col.type}
              </span>
            </div>
            
            {selectedColumns.includes(col.name) && (
              <input
                type="text"
                value={renameMap[col.name] || ''}
                onChange={(e) => setRenameMap({ ...renameMap, [col.name]: e.target.value })}
                placeholder={t('cleaning.newNameOptional')}
                className="w-full p-2 text-sm border rounded-lg mt-2"
              />
            )}
          </div>
        ))}
      </div>

      <button
        onClick={applyColumnSelection}
        disabled={selectedColumns.length === 0}
        className="w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
      >
        {t('cleaning.applyChanges')}
      </button>
    </div>
  );
};

// ==================== Auto Clean Tab ====================
const AutoCleanTab: React.FC<{
  data: DataRow[];
  columns: ColumnInfo[];
  onApply: (result: CleaningResult) => void;
}> = ({ data, columns, onApply }) => {
  const { t } = useLanguage();
  const [options, setOptions] = useState({
    handleMissing: true,
    handleOutliers: true,
    handleDuplicates: true,
    missingThreshold: 50,
    outlierMethod: 'iqr' as 'zscore' | 'iqr' | 'mad'
  });
  const [preview, setPreview] = useState<{ data: DataRow[]; operations: string[] } | null>(null);

  const runAutoClean = () => {
    const result = autoClean(data, columns, options);
    setPreview(result);
  };

  const applyAutoClean = () => {
    if (preview) {
      const result: CleaningResult = {
        success: true,
        data: preview.data,
        affectedRows: data.length - preview.data.length,
        message: t('cleaning.executedOperations').replace('{count}', String(preview.operations.length))
      };
      onApply(result);
      setPreview(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-2xl p-6">
        <div className="flex items-center gap-4 mb-4">
          <Wand2 className="w-12 h-12 text-purple-600 p-2 bg-purple-100 rounded-xl" />
          <div>
            <h3 className="font-bold text-xl text-purple-800">{t('cleaning.smartAutoCleaning')}</h3>
            <p className="text-purple-600">{t('cleaning.autoDetectAndFix')}</p>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-4 bg-white rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={options.handleMissing}
              onChange={(e) => setOptions({ ...options, handleMissing: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">{t('cleaning.missingValues')}</div>
              <div className="text-sm text-gray-500">{t('cleaning.autoImpute')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-white rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={options.handleOutliers}
              onChange={(e) => setOptions({ ...options, handleOutliers: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">{t('cleaning.outliers')}</div>
              <div className="text-sm text-gray-500">{t('cleaning.capToBounds')}</div>
            </div>
          </label>

          <label className="flex items-center gap-3 p-4 bg-white rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={options.handleDuplicates}
              onChange={(e) => setOptions({ ...options, handleDuplicates: e.target.checked })}
              className="w-5 h-5"
            />
            <div>
              <div className="font-medium">{t('cleaning.duplicates')}</div>
              <div className="text-sm text-gray-500">{t('cleaning.removeDuplicates')}</div>
            </div>
          </label>
        </div>

        <div className="flex gap-4 mt-6">
          <button
            onClick={runAutoClean}
            className="flex-1 py-3 bg-purple-600 text-white rounded-xl font-medium hover:bg-purple-700 flex items-center justify-center gap-2"
          >
            <Search size={20} />
            {t('cleaning.previewCleaning')}
          </button>
        </div>
      </div>

      {preview && (
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-green-50 px-4 py-3 border-b flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <span className="font-bold text-green-800">
                {preview.operations.length} {t('cleaning.operationsReady')}
              </span>
            </div>
            <button
              onClick={applyAutoClean}
              className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              {t('cleaning.applyAll')}
            </button>
          </div>
          <div className="p-4 max-h-64 overflow-y-auto">
            {preview.operations.map((op, idx) => (
              <div key={idx} className="flex items-center gap-3 p-2 hover:bg-gray-50 rounded">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-sm">{op}</span>
              </div>
            ))}
          </div>
          <div className="bg-gray-50 px-4 py-3 border-t text-sm text-gray-600">
            {t('cleaning.remainingRows')}: {preview.data.length.toLocaleString()} {t('cleaning.of')} {data.length.toLocaleString()}
          </div>
        </div>
      )}
    </div>
  );
};

export default DataCleaningPanel;
