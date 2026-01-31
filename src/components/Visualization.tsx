import { useState, useMemo } from 'react';
import { Dataset } from '@/types';
import {
  BarChart, Bar, LineChart, Line, ScatterChart, Scatter,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { PieChart as PieIcon, BarChart3, LineChart as LineIcon, ScatterChart as ScatterIcon, Download, Settings2, TrendingUp } from 'lucide-react';
import { cn } from '@/utils/cn';
import { calculateDescriptiveStats } from '@/utils/dataProcessing';
import { useLanguage } from '../i18n';

interface VisualizationProps {
  dataset: Dataset | null;
}

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16', '#F97316', '#6366F1'];

type ChartType = 'bar' | 'line' | 'scatter' | 'pie' | 'histogram' | 'boxplot' | 'area' | 'composed';

export function Visualization({ dataset }: VisualizationProps) {
  const { t, isRTL } = useLanguage();
  const [chartType, setChartType] = useState<ChartType>('bar');
  const [xAxis, setXAxis] = useState<string>('');
  const [yAxis, setYAxis] = useState<string>('');
  const [colorBy] = useState<string>('');
  const [showGrid, setShowGrid] = useState(true);
  const [showLegend, setShowLegend] = useState(true);
  const [chartTitle, setChartTitle] = useState('');

  const numericColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter(c => c.type === 'numeric');
  }, [dataset]);

  const categoricalColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter(c => c.type === 'categorical' || c.type === 'ordinal');
  }, [dataset]);

  const allColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns;
  }, [dataset]);

  const chartData = useMemo(() => {
    if (!dataset || !xAxis) return [];

    if (chartType === 'histogram') {
      const col = dataset.columns.find(c => c.name === xAxis);
      if (!col) return [];
      
      const values = col.values.filter((x: number) => !isNaN(x) && x !== null);
      const min = Math.min(...values);
      const max = Math.max(...values);
      const binCount = Math.min(20, Math.ceil(Math.sqrt(values.length)));
      const binWidth = (max - min) / binCount || 1;
      
      const bins: { range: string; count: number }[] = [];
      for (let i = 0; i < binCount; i++) {
        const from = min + i * binWidth;
        const to = from + binWidth;
        bins.push({
          range: `${from.toFixed(1)}`,
          count: values.filter((x: number) => x >= from && (i === binCount - 1 ? x <= to : x < to)).length
        });
      }
      return bins;
    }

    if (chartType === 'boxplot') {
      const col = dataset.columns.find(c => c.name === xAxis);
      if (!col) return [];
      
      const stats = calculateDescriptiveStats(col.values);
      return [{
        name: xAxis,
        min: stats.min,
        q1: stats.q1,
        median: stats.median,
        q3: stats.q3,
        max: stats.max
      }];
    }

    if (chartType === 'pie') {
      const col = dataset.columns.find(c => c.name === xAxis);
      if (!col) return [];
      
      const counts: Record<string, number> = {};
      col.values.forEach((v: any) => {
        if (v !== null && v !== undefined && v !== '') {
          const key = String(v);
          counts[key] = (counts[key] || 0) + 1;
        }
      });
      
      return Object.entries(counts)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 10);
    }

    if (chartType === 'scatter' && yAxis) {
      const xCol = dataset.columns.find(c => c.name === xAxis);
      const yCol = dataset.columns.find(c => c.name === yAxis);
      if (!xCol || !yCol) return [];
      
      return dataset.rows
        .filter(row => row[xAxis] !== null && row[yAxis] !== null && !isNaN(row[xAxis]) && !isNaN(row[yAxis]))
        .slice(0, 500)
        .map(row => ({
          x: row[xAxis],
          y: row[yAxis],
          ...(colorBy ? { category: row[colorBy] } : {})
        }));
    }

    // Aggregation for bar/line charts
    if (categoricalColumns.some(c => c.name === xAxis) && yAxis) {
      const groups: Record<string, number[]> = {};
      dataset.rows.forEach(row => {
        const key = String(row[xAxis] || 'Other');
        if (!groups[key]) groups[key] = [];
        if (!isNaN(row[yAxis]) && row[yAxis] !== null) {
          groups[key].push(row[yAxis]);
        }
      });
      
      return Object.entries(groups).map(([name, values]) => ({
        name,
        value: values.reduce((a, b) => a + b, 0) / values.length,
        count: values.length
      }));
    }

    // Default: use first N rows
    return dataset.rows.slice(0, 50).map((row, i) => ({
      name: row[xAxis] || i,
      ...(yAxis ? { value: row[yAxis] } : {}),
      ...row
    }));
  }, [dataset, xAxis, yAxis, colorBy, chartType, categoricalColumns]);

  const chartTypes: { id: ChartType; icon: any; label: string }[] = [
    { id: 'bar', icon: BarChart3, label: t('viz.types.bar') },
    { id: 'line', icon: LineIcon, label: t('viz.types.line') },
    { id: 'scatter', icon: ScatterIcon, label: t('viz.types.scatter') },
    { id: 'pie', icon: PieIcon, label: t('viz.types.pie') },
    { id: 'histogram', icon: BarChart3, label: t('viz.types.histogram') },
    { id: 'area', icon: TrendingUp, label: t('viz.types.area') },
  ];

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <BarChart3 className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">{t('viz.subtitle')}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 via-pink-600 to-red-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
            📊
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('viz.title')}</h1>
            <p className="text-white/80 mt-1">{t('viz.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Chart Type Selection */}
      <div className="flex gap-2 flex-wrap">
        {chartTypes.map(type => (
          <button
            key={type.id}
            onClick={() => setChartType(type.id)}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
              chartType === type.id
                ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
            )}
          >
            <type.icon className="w-4 h-4" />
            {type.label}
          </button>
        ))}
      </div>

      {/* Chart Configuration */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Settings2 className="w-5 h-5 text-purple-600" />
          {t('viz.settings.title') || t('label.settings')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">
              {chartType === 'histogram' ? t('label.column') : t('viz.settings.xAxis')}
            </label>
            <select
              value={xAxis}
              onChange={(e) => setXAxis(e.target.value)}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            >
              <option value="">{t('action.selectAll') || 'Select'}</option>
              {(chartType === 'histogram' ? numericColumns : allColumns).map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
          
          {chartType !== 'histogram' && chartType !== 'pie' && (
            <div>
              <label className="block text-sm text-gray-600 mb-2">{t('viz.settings.yAxis')}</label>
              <select
                value={yAxis}
                onChange={(e) => setYAxis(e.target.value)}
                className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">{t('action.selectAll') || 'Select'}</option>
                {numericColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('viz.settings.title')}</label>
            <input
              type="text"
              value={chartTitle}
              onChange={(e) => setChartTitle(e.target.value)}
              placeholder={t('viz.settings.title')}
              className="w-full p-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex items-end gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showGrid}
                onChange={(e) => setShowGrid(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600"
              />
              <span className="text-sm text-gray-600">{t('viz.settings.gridLines')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLegend}
                onChange={(e) => setShowLegend(e.target.checked)}
                className="w-4 h-4 rounded text-purple-600"
              />
              <span className="text-sm text-gray-600">{t('viz.settings.legend')}</span>
            </label>
          </div>
        </div>
      </div>

      {/* Chart Display */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        {chartTitle && (
          <h3 className="text-xl font-bold text-center text-gray-800 mb-6">{chartTitle}</h3>
        )}
        
        <div className="h-96">
          {chartData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>{t('message.info.selectVariables')}</p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              {chartType === 'bar' && (
                <BarChart data={chartData}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  {showLegend && <Legend />}
                  <Bar dataKey="value" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
              
              {chartType === 'line' && (
                <LineChart data={chartData}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  {showLegend && <Legend />}
                  <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6' }} />
                </LineChart>
              )}
              
              {chartType === 'scatter' && (
                <ScatterChart>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis type="number" dataKey="x" name={xAxis} />
                  <YAxis type="number" dataKey="y" name={yAxis} />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  {showLegend && <Legend />}
                  <Scatter name={`${xAxis} vs ${yAxis}`} data={chartData} fill="#8B5CF6" />
                </ScatterChart>
              )}
              
              {chartType === 'pie' && (
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    labelLine={true}
                    label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
                    outerRadius={120}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {chartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  {showLegend && <Legend />}
                </PieChart>
              )}
              
              {chartType === 'histogram' && (
                <BarChart data={chartData}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="range" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
              
              {chartType === 'area' && (
                <AreaChart data={chartData}>
                  {showGrid && <CartesianGrid strokeDasharray="3 3" />}
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  {showLegend && <Legend />}
                  <Area type="monotone" dataKey="value" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.3} />
                </AreaChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
        
        {chartData.length > 0 && (
          <div className="mt-4 flex justify-end">
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-lg hover:opacity-90 transition-all">
              <Download className="w-4 h-4" />
              {t('viz.actions.exportImage')}
            </button>
          </div>
        )}
      </div>

      {/* Quick Charts */}
      <div className="grid grid-cols-2 gap-4">
        {numericColumns.slice(0, 4).map(col => (
          <div key={col.name} className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <h4 className="font-medium text-gray-800 mb-3">{col.name}</h4>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={(() => {
                const values = col.values.filter((x: number) => !isNaN(x) && x !== null);
                const min = Math.min(...values);
                const max = Math.max(...values);
                const binCount = 15;
                const binWidth = (max - min) / binCount || 1;
                
                return Array.from({ length: binCount }, (_, i) => {
                  const from = min + i * binWidth;
                  const to = from + binWidth;
                  return {
                    x: from.toFixed(1),
                    y: values.filter((x: number) => x >= from && (i === binCount - 1 ? x <= to : x < to)).length
                  };
                });
              })()}>
                <Area type="monotone" dataKey="y" stroke="#8B5CF6" fill="#8B5CF6" fillOpacity={0.2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        ))}
      </div>
    </div>
  );
}
