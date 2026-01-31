import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Dataset, DataColumn, DescriptiveStats, CleaningOperation } from '@/types';
import * as stats from './statistics';

// Parse CSV file
export function parseCSV(file: File): Promise<{ rows: Record<string, any>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: true,
      complete: (results) => {
        resolve({
          rows: results.data as Record<string, any>[],
          headers: results.meta.fields || []
        });
      },
      error: (error) => reject(error)
    });
  });
}

// Parse Excel file
export function parseExcel(file: File): Promise<{ rows: Record<string, any>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet) as Record<string, any>[];
        const headers = Object.keys(rows[0] || {});
        resolve({ rows, headers });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// Parse JSON file
export function parseJSON(file: File): Promise<{ rows: Record<string, any>[]; headers: string[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        const rows = Array.isArray(data) ? data : [data];
        const headers = Object.keys(rows[0] || {});
        resolve({ rows, headers });
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

// Detect column type
export function detectColumnType(values: any[]): DataColumn['type'] {
  const nonNull = values.filter(v => v !== null && v !== undefined && v !== '');
  if (nonNull.length === 0) return 'text';
  
  // Check for numeric
  const numericCount = nonNull.filter(v => typeof v === 'number' || (!isNaN(parseFloat(v)) && isFinite(v))).length;
  if (numericCount / nonNull.length > 0.9) return 'numeric';
  
  // Check for datetime
  const dateCount = nonNull.filter(v => {
    if (v instanceof Date) return true;
    const d = new Date(v);
    return !isNaN(d.getTime()) && typeof v === 'string' && v.match(/\d{4}[-/]\d{1,2}[-/]\d{1,2}/);
  }).length;
  if (dateCount / nonNull.length > 0.8) return 'datetime';
  
  // Check for categorical (few unique values)
  const uniqueCount = new Set(nonNull).size;
  if (uniqueCount <= 20 || uniqueCount / nonNull.length < 0.1) return 'categorical';
  
  return 'text';
}

// Create dataset from rows
export function createDataset(name: string, rows: Record<string, any>[], headers: string[]): Dataset {
  const columns: DataColumn[] = headers.map(header => {
    const values = rows.map(row => row[header]);
    const type = detectColumnType(values);
    const missing = values.filter(v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))).length;
    const unique = new Set(values.filter(v => v !== null && v !== undefined && v !== '')).size;
    
    return {
      name: header,
      type,
      values,
      missing,
      unique
    };
  });
  
  return {
    name,
    columns,
    rows,
    rowCount: rows.length,
    columnCount: columns.length
  };
}

// Calculate descriptive statistics
export function calculateDescriptiveStats(values: number[]): DescriptiveStats {
  const valid = values.filter(v => v !== null && v !== undefined && !isNaN(v));
  const missing = values.length - valid.length;
  
  if (valid.length === 0) {
    return {
      count: 0, mean: 0, median: 0, mode: [], std: 0, variance: 0,
      min: 0, max: 0, range: 0, q1: 0, q3: 0, iqr: 0,
      skewness: 0, kurtosis: 0, missing, missingPercent: 100
    };
  }
  
  const q = stats.quartiles(valid);
  
  return {
    count: valid.length,
    mean: stats.mean(valid),
    median: stats.median(valid),
    mode: stats.mode(valid),
    std: stats.std(valid),
    variance: stats.variance(valid),
    min: Math.min(...valid),
    max: Math.max(...valid),
    range: Math.max(...valid) - Math.min(...valid),
    q1: q.q1,
    q3: q.q3,
    iqr: stats.iqr(valid),
    skewness: stats.skewness(valid),
    kurtosis: stats.kurtosis(valid),
    missing,
    missingPercent: (missing / values.length) * 100
  };
}

// Handle missing values
export function handleMissingValues(
  values: any[],
  method: 'drop' | 'mean' | 'median' | 'mode' | 'constant',
  constant?: any
): { values: any[]; operation: CleaningOperation } {
  const beforeMissing = values.filter(v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))).length;
  let newValues: any[];
  
  switch (method) {
    case 'drop':
      newValues = values.filter(v => v !== null && v !== undefined && v !== '' && !(typeof v === 'number' && isNaN(v)));
      break;
    case 'mean': {
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      const meanVal = stats.mean(numericValues);
      newValues = values.map(v => (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) ? meanVal : v);
      break;
    }
    case 'median': {
      const numericValues = values.filter(v => typeof v === 'number' && !isNaN(v));
      const medianVal = stats.median(numericValues);
      newValues = values.map(v => (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) ? medianVal : v);
      break;
    }
    case 'mode': {
      const modeVal = stats.mode(values.filter(v => v !== null && v !== undefined && v !== ''))[0];
      newValues = values.map(v => (v === null || v === undefined || v === '') ? modeVal : v);
      break;
    }
    case 'constant':
      newValues = values.map(v => (v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))) ? constant : v);
      break;
    default:
      newValues = values;
  }
  
  const afterMissing = newValues.filter(v => v === null || v === undefined || v === '' || (typeof v === 'number' && isNaN(v))).length;
  
  return {
    values: newValues,
    operation: {
      type: 'missing',
      method,
      before: beforeMissing,
      after: afterMissing
    }
  };
}

// Transform data
export function transformData(
  values: number[],
  method: 'log' | 'sqrt' | 'boxcox' | 'normalize' | 'standardize'
): number[] {
  const valid = values.filter(v => !isNaN(v) && v !== null && v !== undefined);
  
  switch (method) {
    case 'log':
      return values.map(v => {
        if (isNaN(v) || v === null || v === undefined) return v;
        return v > 0 ? Math.log(v) : Math.log(v + Math.abs(Math.min(...valid)) + 1);
      });
    case 'sqrt':
      return values.map(v => {
        if (isNaN(v) || v === null || v === undefined) return v;
        return v >= 0 ? Math.sqrt(v) : -Math.sqrt(Math.abs(v));
      });
    case 'normalize': {
      const min = Math.min(...valid);
      const max = Math.max(...valid);
      const range = max - min || 1;
      return values.map(v => {
        if (isNaN(v) || v === null || v === undefined) return v;
        return (v - min) / range;
      });
    }
    case 'standardize': {
      const mean = stats.mean(valid);
      const std = stats.std(valid) || 1;
      return values.map(v => {
        if (isNaN(v) || v === null || v === undefined) return v;
        return (v - mean) / std;
      });
    }
    case 'boxcox': {
      // Simplified Box-Cox with lambda = 0.5
      return values.map(v => {
        if (isNaN(v) || v === null || v === undefined) return v;
        const shifted = v > 0 ? v : v + Math.abs(Math.min(...valid)) + 1;
        return (Math.pow(shifted, 0.5) - 1) / 0.5;
      });
    }
    default:
      return values;
  }
}

// Remove duplicates
export function removeDuplicates(rows: Record<string, any>[], keys?: string[]): {
  rows: Record<string, any>[];
  removed: number;
} {
  const seen = new Set<string>();
  const uniqueRows: Record<string, any>[] = [];
  
  rows.forEach(row => {
    const key = keys
      ? keys.map(k => JSON.stringify(row[k])).join('|')
      : JSON.stringify(row);
    
    if (!seen.has(key)) {
      seen.add(key);
      uniqueRows.push(row);
    }
  });
  
  return {
    rows: uniqueRows,
    removed: rows.length - uniqueRows.length
  };
}

// Encode categorical variables
export function encodeCategorical(
  values: any[],
  method: 'label' | 'onehot'
): { encoded: any[]; mapping: Record<string, number> } {
  const unique = [...new Set(values.filter(v => v !== null && v !== undefined && v !== ''))];
  const mapping: Record<string, number> = {};
  unique.forEach((val, i) => {
    mapping[String(val)] = i;
  });
  
  if (method === 'label') {
    return {
      encoded: values.map(v => (v !== null && v !== undefined && v !== '') ? mapping[String(v)] : null),
      mapping
    };
  }
  
  // One-hot encoding returns array of arrays
  return {
    encoded: values.map(v => {
      const arr = new Array(unique.length).fill(0);
      if (v !== null && v !== undefined && v !== '') {
        arr[mapping[String(v)]] = 1;
      }
      return arr;
    }),
    mapping
  };
}

// Generate frequency table
export function frequencyTable(values: any[]): { value: any; count: number; percent: number }[] {
  const counts: Record<string, number> = {};
  const valid = values.filter(v => v !== null && v !== undefined && v !== '');
  
  valid.forEach(v => {
    const key = String(v);
    counts[key] = (counts[key] || 0) + 1;
  });
  
  return Object.entries(counts)
    .map(([value, count]) => ({
      value,
      count,
      percent: (count / valid.length) * 100
    }))
    .sort((a, b) => b.count - a.count);
}

// Cross tabulation
export function crossTab(
  values1: any[],
  values2: any[]
): { table: number[][]; rowLabels: string[]; colLabels: string[] } {
  const unique1 = [...new Set(values1.filter(v => v !== null && v !== undefined))].sort();
  const unique2 = [...new Set(values2.filter(v => v !== null && v !== undefined))].sort();
  
  const table: number[][] = unique1.map(() => new Array(unique2.length).fill(0));
  
  values1.forEach((v1, i) => {
    const v2 = values2[i];
    if (v1 !== null && v1 !== undefined && v2 !== null && v2 !== undefined) {
      const row = unique1.indexOf(v1);
      const col = unique2.indexOf(v2);
      if (row >= 0 && col >= 0) {
        table[row][col]++;
      }
    }
  });
  
  return {
    table,
    rowLabels: unique1.map(String),
    colLabels: unique2.map(String)
  };
}

// Export to CSV
export function exportToCSV(rows: Record<string, any>[], filename: string): void {
  const csv = Papa.unparse(rows);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
}

// Export to Excel
export function exportToExcel(rows: Record<string, any>[], filename: string): void {
  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, filename);
}
