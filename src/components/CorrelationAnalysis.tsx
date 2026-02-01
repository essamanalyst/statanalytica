import { useState, useMemo } from 'react';
import { Dataset } from '@/types';
import { TrendingUp, Info } from 'lucide-react';
import { cn } from '@/utils/cn';
import * as stats from '@/utils/statistics';
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CorrelationAnalysisProps {
  dataset: Dataset | null;
}

export function CorrelationAnalysis({ dataset }: CorrelationAnalysisProps) {
  const [selectedVars, setSelectedVars] = useState<string[]>([]);

  const numericColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter(c => c.type === 'numeric');
  }, [dataset]);

  const correlationMatrix = useMemo(() => {
    if (!dataset || numericColumns.length < 2) return null;
    
    const matrix: { var1: string; var2: string; pearson: number; spearman: number; pValue: number }[] = [];
    
    for (let i = 0; i < numericColumns.length; i++) {
      for (let j = i + 1; j < numericColumns.length; j++) {
        const col1 = numericColumns[i];
        const col2 = numericColumns[j];
        
        const pearsonResult = stats.pearsonCorrelation(col1.values, col2.values);
        const spearmanResult = stats.spearmanCorrelation(col1.values, col2.values);
        
        matrix.push({
          var1: col1.name,
          var2: col2.name,
          pearson: pearsonResult.r,
          spearman: spearmanResult.rho,
          pValue: pearsonResult.pValue
        });
      }
    }
    
    return matrix;
  }, [dataset, numericColumns]);

  const heatmapData = useMemo(() => {
    if (!correlationMatrix || numericColumns.length < 2) return null;
    
    const vars = numericColumns.map(c => c.name);
    const matrix: number[][] = vars.map(() => vars.map(() => 1));
    
    correlationMatrix.forEach(({ var1, var2, pearson }) => {
      const i1 = vars.indexOf(var1);
      const i2 = vars.indexOf(var2);
      matrix[i1][i2] = pearson;
      matrix[i2][i1] = pearson;
    });
    
    return { vars, matrix };
  }, [correlationMatrix, numericColumns]);

  const scatterData = useMemo(() => {
    if (!dataset || selectedVars.length !== 2) return [];
    
    const col1 = dataset.columns.find(c => c.name === selectedVars[0]);
    const col2 = dataset.columns.find(c => c.name === selectedVars[1]);
    
    if (!col1 || !col2) return [];
    
    return dataset.rows
      .filter(row => !isNaN(row[selectedVars[0]]) && !isNaN(row[selectedVars[1]]))
      .slice(0, 500)
      .map(row => ({
        x: row[selectedVars[0]],
        y: row[selectedVars[1]]
      }));
  }, [dataset, selectedVars]);

  const selectedCorrelation = useMemo(() => {
    if (!dataset || selectedVars.length !== 2) return null;
    
    const col1 = dataset.columns.find(c => c.name === selectedVars[0]);
    const col2 = dataset.columns.find(c => c.name === selectedVars[1]);
    
    if (!col1 || !col2) return null;
    
    const pearsonResult = stats.pearsonCorrelation(col1.values, col2.values);
    const spearmanResult = stats.spearmanCorrelation(col1.values, col2.values);
    const regression = stats.linearRegression(col1.values, col2.values);
    
    return {
      pearson: pearsonResult,
      spearman: spearmanResult,
      regression
    };
  }, [dataset, selectedVars]);

  const getCorrelationColor = (r: number) => {
    if (r >= 0.7) return 'bg-green-500';
    if (r >= 0.4) return 'bg-green-300';
    if (r >= 0.2) return 'bg-green-100';
    if (r >= -0.2) return 'bg-gray-100';
    if (r >= -0.4) return 'bg-red-100';
    if (r >= -0.7) return 'bg-red-300';
    return 'bg-red-500';
  };

  const getCorrelationStrength = (r: number) => {
    const abs = Math.abs(r);
    if (abs >= 0.8) return { text: 'قوي جداً', textEn: 'Very Strong' };
    if (abs >= 0.6) return { text: 'قوي', textEn: 'Strong' };
    if (abs >= 0.4) return { text: 'متوسط', textEn: 'Moderate' };
    if (abs >= 0.2) return { text: 'ضعيف', textEn: 'Weak' };
    return { text: 'ضعيف جداً', textEn: 'Very Weak' };
  };

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <TrendingUp className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">قم بتحميل البيانات أولاً</p>
      </div>
    );
  }

  if (numericColumns.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <TrendingUp className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">تحتاج عمودين رقميين على الأقل لتحليل الارتباط</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">تحليل الارتباط</h2>
        <p className="text-gray-600 mt-1">اكتشف العلاقات بين المتغيرات الرقمية</p>
      </div>

      {/* Variable Selection */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">اختر متغيرين للتحليل التفصيلي</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">المتغير الأول (X):</label>
            <select
              value={selectedVars[0] || ''}
              onChange={(e) => setSelectedVars([e.target.value, selectedVars[1] || ''])}
              className="w-full p-3 border border-gray-200 rounded-lg"
            >
              <option value="">اختر</option>
              {numericColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">المتغير الثاني (Y):</label>
            <select
              value={selectedVars[1] || ''}
              onChange={(e) => setSelectedVars([selectedVars[0] || '', e.target.value])}
              className="w-full p-3 border border-gray-200 rounded-lg"
            >
              <option value="">اختر</option>
              {numericColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Detailed Correlation Results */}
      {selectedCorrelation && selectedVars.length === 2 && (
        <div className="grid grid-cols-2 gap-6">
          {/* Scatter Plot */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-4">
              الرسم التشتتي: {selectedVars[0]} vs {selectedVars[1]}
            </h4>
            <ResponsiveContainer width="100%" height={300}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="x" type="number" name={selectedVars[0]} />
                <YAxis dataKey="y" type="number" name={selectedVars[1]} />
                <Tooltip />
                <Scatter data={scatterData} fill="#3B82F6" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {/* Correlation Stats */}
          <div className="bg-white rounded-xl p-6 border border-gray-200">
            <h4 className="font-semibold text-gray-800 mb-4">نتائج الارتباط</h4>
            
            <div className="space-y-4">
              {/* Pearson */}
              <div className={cn(
                'p-4 rounded-lg',
                Math.abs(selectedCorrelation.pearson.r) >= 0.5 ? 'bg-green-50' : 'bg-gray-50'
              )}>
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">معامل بيرسون (Pearson r)</span>
                  <span className={cn(
                    'text-xl font-bold',
                    selectedCorrelation.pearson.r >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {selectedCorrelation.pearson.r.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>p-value: {selectedCorrelation.pearson.pValue < 0.001 ? '< 0.001' : selectedCorrelation.pearson.pValue.toFixed(4)}</span>
                  <span>{getCorrelationStrength(selectedCorrelation.pearson.r).text}</span>
                </div>
              </div>

              {/* Spearman */}
              <div className="p-4 rounded-lg bg-gray-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">معامل سبيرمان (Spearman ρ)</span>
                  <span className={cn(
                    'text-xl font-bold',
                    selectedCorrelation.spearman.rho >= 0 ? 'text-green-600' : 'text-red-600'
                  )}>
                    {selectedCorrelation.spearman.rho.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>p-value: {selectedCorrelation.spearman.pValue < 0.001 ? '< 0.001' : selectedCorrelation.spearman.pValue.toFixed(4)}</span>
                  <span>{getCorrelationStrength(selectedCorrelation.spearman.rho).text}</span>
                </div>
              </div>

              {/* R-squared */}
              <div className="p-4 rounded-lg bg-blue-50">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium text-gray-700">معامل التحديد (R²)</span>
                  <span className="text-xl font-bold text-blue-600">
                    {(selectedCorrelation.regression.rSquared * 100).toFixed(2)}%
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {(selectedCorrelation.regression.rSquared * 100).toFixed(1)}% من التباين في {selectedVars[1]} يمكن تفسيره بـ {selectedVars[0]}
                </p>
              </div>

              {/* Regression Equation */}
              <div className="p-4 rounded-lg bg-purple-50">
                <p className="font-medium text-gray-700 mb-2">معادلة الانحدار الخطي:</p>
                <p className="text-lg font-mono text-purple-800">
                  y = {selectedCorrelation.regression.slope.toFixed(4)}x + {selectedCorrelation.regression.intercept.toFixed(4)}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Correlation Matrix Heatmap */}
      {heatmapData && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">مصفوفة الارتباط (Correlation Matrix)</h3>
          
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr>
                  <th className="p-2"></th>
                  {heatmapData.vars.map(v => (
                    <th key={v} className="p-2 text-xs font-medium text-gray-700 text-center" style={{ writingMode: 'vertical-rl' }}>
                      {v}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {heatmapData.vars.map((var1, i) => (
                  <tr key={var1}>
                    <td className="p-2 text-xs font-medium text-gray-700">{var1}</td>
                    {heatmapData.matrix[i].map((corr, j) => (
                      <td
                        key={j}
                        className={cn(
                          'p-2 text-center text-xs font-medium cursor-pointer transition-all hover:scale-110',
                          getCorrelationColor(corr),
                          corr >= 0.5 || corr <= -0.5 ? 'text-white' : 'text-gray-700'
                        )}
                        onClick={() => {
                          if (i !== j) {
                            setSelectedVars([var1, heatmapData.vars[j]]);
                          }
                        }}
                        title={`${var1} ↔ ${heatmapData.vars[j]}: ${corr.toFixed(3)}`}
                      >
                        {corr.toFixed(2)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="mt-4 flex items-center justify-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span>سالب قوي</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-red-200 rounded"></div>
              <span>سالب</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-gray-100 rounded border"></div>
              <span>لا ارتباط</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-200 rounded"></div>
              <span>موجب</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span>موجب قوي</span>
            </div>
          </div>
        </div>
      )}

      {/* All Correlations Table */}
      {correlationMatrix && correlationMatrix.length > 0 && (
        <div className="bg-white rounded-xl p-6 border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4">جميع الارتباطات</h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-right py-3 px-4">المتغير 1</th>
                  <th className="text-right py-3 px-4">المتغير 2</th>
                  <th className="text-right py-3 px-4">Pearson r</th>
                  <th className="text-right py-3 px-4">Spearman ρ</th>
                  <th className="text-right py-3 px-4">p-value</th>
                  <th className="text-right py-3 px-4">القوة</th>
                  <th className="text-right py-3 px-4">الدلالة</th>
                </tr>
              </thead>
              <tbody>
                {correlationMatrix
                  .sort((a, b) => Math.abs(b.pearson) - Math.abs(a.pearson))
                  .map((corr, i) => (
                    <tr 
                      key={i} 
                      className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedVars([corr.var1, corr.var2])}
                    >
                      <td className="py-3 px-4">{corr.var1}</td>
                      <td className="py-3 px-4">{corr.var2}</td>
                      <td className={cn(
                        'py-3 px-4 font-medium',
                        corr.pearson >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {corr.pearson.toFixed(4)}
                      </td>
                      <td className={cn(
                        'py-3 px-4',
                        corr.spearman >= 0 ? 'text-green-600' : 'text-red-600'
                      )}>
                        {corr.spearman.toFixed(4)}
                      </td>
                      <td className="py-3 px-4">
                        {corr.pValue < 0.001 ? '< 0.001' : corr.pValue.toFixed(4)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2 py-1 rounded text-xs',
                          Math.abs(corr.pearson) >= 0.6 ? 'bg-green-100 text-green-700' :
                          Math.abs(corr.pearson) >= 0.3 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        )}>
                          {getCorrelationStrength(corr.pearson).text}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {corr.pValue < 0.05 ? (
                          <span className="text-green-600 font-medium">دال ✓</span>
                        ) : (
                          <span className="text-gray-400">غير دال</span>
                        )}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Interpretation Guide */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
        <h3 className="font-semibold text-blue-800 mb-4 flex items-center gap-2">
          <Info className="w-5 h-5" />
          دليل تفسير معاملات الارتباط
        </h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium text-gray-800 mb-2">قوة الارتباط:</h4>
            <ul className="space-y-1 text-gray-600">
              <li>|r| ≥ 0.8: قوي جداً</li>
              <li>0.6 ≤ |r| &lt; 0.8: قوي</li>
              <li>0.4 ≤ |r| &lt; 0.6: متوسط</li>
              <li>0.2 ≤ |r| &lt; 0.4: ضعيف</li>
              <li>|r| &lt; 0.2: ضعيف جداً / لا ارتباط</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium text-gray-800 mb-2">الفرق بين المعاملات:</h4>
            <ul className="space-y-1 text-gray-600">
              <li><strong>Pearson:</strong> للعلاقات الخطية والبيانات الطبيعية</li>
              <li><strong>Spearman:</strong> للعلاقات الرتبية ولا يتطلب توزيع طبيعي</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
