import { useMemo } from 'react';
import { Dataset } from '@/types';
import { Wrench } from 'lucide-react';
import DataCleaningPanel from './DataCleaning/DataCleaningPanel';
import { useLanguage } from '../i18n';

interface DataCleaningProps {
  dataset: Dataset | null;
  onDatasetUpdate: (dataset: Dataset) => void;
}

export function DataCleaning({ dataset, onDatasetUpdate }: DataCleaningProps) {
  const { t, isRTL } = useLanguage();

  // تحويل بيانات Dataset إلى التنسيق المطلوب
  const cleaningData = useMemo(() => {
    if (!dataset) return [];
    return dataset.rows;
  }, [dataset]);

  const cleaningColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.map(col => ({
      name: col.name,
      type: col.type as 'numeric' | 'categorical' | 'date' | 'boolean' | 'text',
      missing: col.missing || 0,
      unique: col.unique || 0,
      sample: col.values?.slice(0, 5) || []
    }));
  }, [dataset]);

  const handleDataUpdate = (newData: any[], operation: string) => {
    if (!dataset) return;

    // إعادة بناء الأعمدة من البيانات الجديدة
    const columnNames = newData.length > 0 ? Object.keys(newData[0]) : dataset.columns.map(c => c.name);
    
    const newColumns = columnNames.map(colName => {
      const values = newData.map(row => row[colName]);
      const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
      const uniqueSet = new Set(nonNull);
      
      // كشف نوع البيانات
      const numericCount = nonNull.filter(v => !isNaN(Number(v))).length;
      const colType = numericCount === nonNull.length && nonNull.length > 0 ? 'numeric' : 'categorical';
      
      let stats: Record<string, number> = {};
      if (colType === 'numeric') {
        const nums = nonNull.map(Number).filter(n => !isNaN(n));
        if (nums.length > 0) {
          const sum = nums.reduce((a, b) => a + b, 0);
          const mean = sum / nums.length;
          const sorted = [...nums].sort((a, b) => a - b);
          const median = sorted[Math.floor(sorted.length / 2)];
          const min = sorted[0];
          const max = sorted[sorted.length - 1];
          const variance = nums.reduce((acc, n) => acc + Math.pow(n - mean, 2), 0) / nums.length;
          const stdDev = Math.sqrt(variance);
          stats = { mean, median, min, max, stdDev, sum };
        }
      }

      return {
        name: colName,
        type: colType as 'numeric' | 'categorical' | 'date' | 'boolean' | 'text',
        values: values,
        missing: values.length - nonNull.length,
        unique: uniqueSet.size,
        nullCount: values.length - nonNull.length,
        uniqueCount: uniqueSet.size,
        stats
      };
    });

    const updatedDataset: Dataset = {
      ...dataset,
      columns: newColumns,
      rows: newData,
      rowCount: newData.length,
      columnCount: newColumns.length
    };

    console.log(`${t('cleaning.title')}: ${operation}`);
    onDatasetUpdate(updatedDataset);
  };

  if (!dataset) {
    return (
      <div className={`flex flex-col items-center justify-center h-96 text-gray-500 ${isRTL ? 'rtl' : 'ltr'}`}>
        <Wrench className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">{t('message.noData')}</p>
        <p className="text-sm text-gray-400 mt-2">{t('message.uploadFirst')}</p>
      </div>
    );
  }

  return (
    <DataCleaningPanel
      data={cleaningData}
      columns={cleaningColumns}
      onDataUpdate={handleDataUpdate}
    />
  );
}
