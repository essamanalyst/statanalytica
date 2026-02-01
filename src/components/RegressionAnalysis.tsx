import { useMemo } from 'react';
import { Dataset } from '@/types';
import AdvancedRegressionAnalysis from './AdvancedRegressionAnalysis';

interface Props {
  dataset: Dataset | null;
}

export const RegressionAnalysis: React.FC<Props> = ({ dataset }) => {
  const { data, columns } = useMemo(() => {
    if (!dataset) return { data: [], columns: [] };
    
    // Convert dataset to array format
    const rows: Record<string, any>[] = [];
    const numRows = dataset.columns[0]?.values?.length || 0;
    
    for (let i = 0; i < numRows; i++) {
      const row: Record<string, any> = {};
      dataset.columns.forEach((col) => {
        row[col.name] = col.values[i];
      });
      rows.push(row);
    }
    
    return {
      data: rows,
      columns: dataset.columns.map((c) => c.name)
    };
  }, [dataset]);

  if (!dataset || data.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border p-12 text-center">
        <div className="text-6xl mb-4">📈</div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">لا توجد بيانات</h3>
        <p className="text-gray-500">يرجى تحميل بيانات أولاً لإجراء تحليل الانحدار</p>
      </div>
    );
  }

  return (
    <AdvancedRegressionAnalysis
      data={data}
      columns={columns}
    />
  );
};

export default RegressionAnalysis;
