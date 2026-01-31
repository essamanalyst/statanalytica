// محرك تنظيف البيانات الشامل

export interface DataRow {
  [key: string]: any;
}

export interface ColumnInfo {
  name: string;
  type: 'numeric' | 'categorical' | 'date' | 'boolean' | 'text';
  missing: number;
  unique: number;
  sample: any[];
}

export interface CleaningOperation {
  id: string;
  type: string;
  description: string;
  column?: string;
  params: Record<string, any>;
  timestamp: Date;
  affectedRows: number;
  reversible: boolean;
}

export interface CleaningResult {
  success: boolean;
  data: DataRow[];
  affectedRows: number;
  message: string;
  details?: Record<string, any>;
}

export interface ValidationRule {
  type: 'range' | 'pattern' | 'enum' | 'custom' | 'unique' | 'not_null' | 'type';
  column: string;
  params: Record<string, any>;
  message: string;
}

export interface DataQualityReport {
  totalRows: number;
  totalColumns: number;
  missingValues: { column: string; count: number; percentage: number }[];
  duplicateRows: number;
  outliers: { column: string; count: number; method: string }[];
  dataTypeIssues: { column: string; invalidCount: number; expectedType: string }[];
  overallScore: number;
}

// ==================== معالجة القيم المفقودة ====================
export const missingValueHandlers = {
  // حذف الصفوف
  dropRows: (data: DataRow[], columns: string[], threshold?: number): CleaningResult => {
    const thresholdValue = threshold ?? 1;
    const originalLength = data.length;
    
    const newData = data.filter(row => {
      const missingCount = columns.filter(col => 
        row[col] === null || row[col] === undefined || row[col] === '' || 
        (typeof row[col] === 'number' && isNaN(row[col]))
      ).length;
      return missingCount < thresholdValue;
    });

    return {
      success: true,
      data: newData,
      affectedRows: originalLength - newData.length,
      message: `تم حذف ${originalLength - newData.length} صف يحتوي على قيم مفقودة`
    };
  },

  // حذف الأعمدة
  dropColumns: (data: DataRow[], columns: string[], threshold?: number): CleaningResult => {
    const thresholdPct = threshold ?? 50;
    const columnsToRemove: string[] = [];
    
    columns.forEach(col => {
      const missingCount = data.filter(row => 
        row[col] === null || row[col] === undefined || row[col] === ''
      ).length;
      const missingPct = (missingCount / data.length) * 100;
      if (missingPct >= thresholdPct) {
        columnsToRemove.push(col);
      }
    });

    const newData = data.map(row => {
      const newRow = { ...row };
      columnsToRemove.forEach(col => delete newRow[col]);
      return newRow;
    });

    return {
      success: true,
      data: newData,
      affectedRows: data.length,
      message: `تم حذف ${columnsToRemove.length} عمود: ${columnsToRemove.join(', ')}`
    };
  },

  // تعويض بالمتوسط
  fillMean: (data: DataRow[], column: string): CleaningResult => {
    const values = data
      .map(row => row[column])
      .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
      .map(Number);
    
    if (values.length === 0) {
      return { success: false, data, affectedRows: 0, message: 'لا توجد قيم رقمية صالحة' };
    }

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    let affected = 0;

    const newData = data.map(row => {
      if (row[column] === null || row[column] === undefined || row[column] === '' || 
          (typeof row[column] === 'number' && isNaN(row[column]))) {
        affected++;
        return { ...row, [column]: mean };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تعويض ${affected} قيمة بالمتوسط (${mean.toFixed(2)})`,
      details: { mean }
    };
  },

  // تعويض بالوسيط
  fillMedian: (data: DataRow[], column: string): CleaningResult => {
    const values = data
      .map(row => row[column])
      .filter(v => v !== null && v !== undefined && v !== '' && !isNaN(Number(v)))
      .map(Number)
      .sort((a, b) => a - b);
    
    if (values.length === 0) {
      return { success: false, data, affectedRows: 0, message: 'لا توجد قيم رقمية صالحة' };
    }

    const mid = Math.floor(values.length / 2);
    const median = values.length % 2 ? values[mid] : (values[mid - 1] + values[mid]) / 2;
    let affected = 0;

    const newData = data.map(row => {
      if (row[column] === null || row[column] === undefined || row[column] === '' ||
          (typeof row[column] === 'number' && isNaN(row[column]))) {
        affected++;
        return { ...row, [column]: median };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تعويض ${affected} قيمة بالوسيط (${median.toFixed(2)})`,
      details: { median }
    };
  },

  // تعويض بالمنوال
  fillMode: (data: DataRow[], column: string): CleaningResult => {
    const valueCounts: Record<string, number> = {};
    data.forEach(row => {
      const val = row[column];
      if (val !== null && val !== undefined && val !== '') {
        const key = String(val);
        valueCounts[key] = (valueCounts[key] || 0) + 1;
      }
    });

    const mode = Object.entries(valueCounts).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!mode) {
      return { success: false, data, affectedRows: 0, message: 'لا توجد قيم صالحة' };
    }

    let affected = 0;
    const newData = data.map(row => {
      if (row[column] === null || row[column] === undefined || row[column] === '') {
        affected++;
        return { ...row, [column]: mode };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تعويض ${affected} قيمة بالمنوال (${mode})`,
      details: { mode }
    };
  },

  // تعويض بقيمة ثابتة
  fillConstant: (data: DataRow[], column: string, value: any): CleaningResult => {
    let affected = 0;
    const newData = data.map(row => {
      if (row[column] === null || row[column] === undefined || row[column] === '') {
        affected++;
        return { ...row, [column]: value };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تعويض ${affected} قيمة بـ "${value}"`
    };
  },

  // تعويض بالقيمة السابقة (Forward Fill)
  fillForward: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;
    let lastValue: any = null;
    
    const newData = data.map(row => {
      if (row[column] === null || row[column] === undefined || row[column] === '') {
        if (lastValue !== null) {
          affected++;
          return { ...row, [column]: lastValue };
        }
      } else {
        lastValue = row[column];
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تعويض ${affected} قيمة بالقيمة السابقة`
    };
  },

  // تعويض بالقيمة اللاحقة (Backward Fill)
  fillBackward: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;
    const reversedData = [...data].reverse();
    let lastValue: any = null;

    const processedData = reversedData.map(row => {
      if (row[column] === null || row[column] === undefined || row[column] === '') {
        if (lastValue !== null) {
          affected++;
          return { ...row, [column]: lastValue };
        }
      } else {
        lastValue = row[column];
      }
      return row;
    });

    return {
      success: true,
      data: processedData.reverse(),
      affectedRows: affected,
      message: `تم تعويض ${affected} قيمة بالقيمة اللاحقة`
    };
  },

  // الاستيفاء الخطي
  fillInterpolate: (data: DataRow[], column: string): CleaningResult => {
    const newData = [...data];
    let affected = 0;

    for (let i = 0; i < newData.length; i++) {
      if (newData[i][column] === null || newData[i][column] === undefined || newData[i][column] === '') {
        // البحث عن أقرب قيمة سابقة ولاحقة
        let prevIdx = i - 1;
        let nextIdx = i + 1;

        while (prevIdx >= 0 && (newData[prevIdx][column] === null || newData[prevIdx][column] === undefined)) prevIdx--;
        while (nextIdx < newData.length && (newData[nextIdx][column] === null || newData[nextIdx][column] === undefined)) nextIdx++;

        if (prevIdx >= 0 && nextIdx < newData.length) {
          const prevVal = Number(newData[prevIdx][column]);
          const nextVal = Number(newData[nextIdx][column]);
          const interpolated = prevVal + (nextVal - prevVal) * ((i - prevIdx) / (nextIdx - prevIdx));
          newData[i] = { ...newData[i], [column]: interpolated };
          affected++;
        }
      }
    }

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تعويض ${affected} قيمة بالاستيفاء الخطي`
    };
  },

  // تعويض KNN
  fillKNN: (data: DataRow[], column: string, k: number = 5, features: string[]): CleaningResult => {
    const validData = data.filter(row => 
      row[column] !== null && row[column] !== undefined && row[column] !== '' &&
      features.every(f => row[f] !== null && row[f] !== undefined && !isNaN(Number(row[f])))
    );

    if (validData.length < k) {
      return { success: false, data, affectedRows: 0, message: `عدد البيانات الصالحة غير كافٍ (${validData.length} < ${k})` };
    }

    let affected = 0;
    const newData = data.map(row => {
      if (row[column] === null || row[column] === undefined || row[column] === '') {
        // حساب المسافات
        const distances = validData.map(vr => {
          const dist = Math.sqrt(
            features.reduce((sum, f) => {
              const diff = Number(row[f]) - Number(vr[f]);
              return sum + (isNaN(diff) ? 0 : diff * diff);
            }, 0)
          );
          return { row: vr, distance: dist };
        }).sort((a, b) => a.distance - b.distance).slice(0, k);

        const knnValue = distances.reduce((sum, d) => sum + Number(d.row[column]), 0) / k;
        affected++;
        return { ...row, [column]: knnValue };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تعويض ${affected} قيمة باستخدام KNN (k=${k})`
    };
  }
};

// ==================== معالجة القيم الشاذة ====================
export const outlierHandlers = {
  // كشف بـ Z-Score
  detectZScore: (data: DataRow[], column: string, threshold: number = 3): { indices: number[]; values: number[] } => {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);

    const outlierIndices: number[] = [];
    const outlierValues: number[] = [];

    data.forEach((row, idx) => {
      const val = Number(row[column]);
      if (!isNaN(val) && std > 0) {
        const zScore = Math.abs((val - mean) / std);
        if (zScore > threshold) {
          outlierIndices.push(idx);
          outlierValues.push(val);
        }
      }
    });

    return { indices: outlierIndices, values: outlierValues };
  },

  // كشف بـ IQR
  detectIQR: (data: DataRow[], column: string, multiplier: number = 1.5): { indices: number[]; values: number[]; bounds: { lower: number; upper: number } } => {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v)).sort((a, b) => a - b);
    
    const q1Idx = Math.floor(values.length * 0.25);
    const q3Idx = Math.floor(values.length * 0.75);
    const q1 = values[q1Idx];
    const q3 = values[q3Idx];
    const iqr = q3 - q1;
    const lower = q1 - multiplier * iqr;
    const upper = q3 + multiplier * iqr;

    const outlierIndices: number[] = [];
    const outlierValues: number[] = [];

    data.forEach((row, idx) => {
      const val = Number(row[column]);
      if (!isNaN(val) && (val < lower || val > upper)) {
        outlierIndices.push(idx);
        outlierValues.push(val);
      }
    });

    return { indices: outlierIndices, values: outlierValues, bounds: { lower, upper } };
  },

  // كشف بـ Modified Z-Score (MAD)
  detectMAD: (data: DataRow[], column: string, threshold: number = 3.5): { indices: number[]; values: number[] } => {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
    const sortedValues = [...values].sort((a, b) => a - b);
    const median = sortedValues[Math.floor(sortedValues.length / 2)];
    
    const absDeviations = values.map(v => Math.abs(v - median)).sort((a, b) => a - b);
    const mad = absDeviations[Math.floor(absDeviations.length / 2)];

    const outlierIndices: number[] = [];
    const outlierValues: number[] = [];

    data.forEach((row, idx) => {
      const val = Number(row[column]);
      if (!isNaN(val) && mad > 0) {
        const modifiedZScore = 0.6745 * (val - median) / mad;
        if (Math.abs(modifiedZScore) > threshold) {
          outlierIndices.push(idx);
          outlierValues.push(val);
        }
      }
    });

    return { indices: outlierIndices, values: outlierValues };
  },

  // كشف بـ Isolation Forest (تبسيط)
  detectIsolationForest: (data: DataRow[], columns: string[], contamination: number = 0.1): { indices: number[] } => {
    // تنفيذ مبسط - حساب درجة الشذوذ بناءً على المسافة من المركز
    const numericData = data.map(row => 
      columns.map(col => Number(row[col])).filter(v => !isNaN(v))
    ).filter(arr => arr.length === columns.length);

    if (numericData.length === 0) return { indices: [] };

    // حساب المركز
    const center = columns.map((_, i) => {
      const vals = numericData.map(row => row[i]);
      return vals.reduce((a, b) => a + b, 0) / vals.length;
    });

    // حساب المسافات
    const distances = numericData.map((row, idx) => ({
      idx,
      distance: Math.sqrt(row.reduce((sum, val, i) => sum + (val - center[i]) ** 2, 0))
    })).sort((a, b) => b.distance - a.distance);

    const outlierCount = Math.ceil(data.length * contamination);
    return { indices: distances.slice(0, outlierCount).map(d => d.idx) };
  },

  // معالجة: حذف
  removeOutliers: (data: DataRow[], indices: number[]): CleaningResult => {
    const indexSet = new Set(indices);
    const newData = data.filter((_, idx) => !indexSet.has(idx));
    return {
      success: true,
      data: newData,
      affectedRows: indices.length,
      message: `تم حذف ${indices.length} قيمة شاذة`
    };
  },

  // معالجة: استبدال بالوسيط
  replaceWithMedian: (data: DataRow[], column: string, indices: number[]): CleaningResult => {
    const indexSet = new Set(indices);
    const validValues = data
      .filter((_, idx) => !indexSet.has(idx))
      .map(row => Number(row[column]))
      .filter(v => !isNaN(v))
      .sort((a, b) => a - b);
    
    const median = validValues[Math.floor(validValues.length / 2)];
    
    const newData = data.map((row, idx) => {
      if (indexSet.has(idx)) {
        return { ...row, [column]: median };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: indices.length,
      message: `تم استبدال ${indices.length} قيمة شاذة بالوسيط (${median.toFixed(2)})`
    };
  },

  // معالجة: تحديد بالحدود
  capOutliers: (data: DataRow[], column: string, lower: number, upper: number): CleaningResult => {
    let affected = 0;
    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val)) {
        if (val < lower) {
          affected++;
          return { ...row, [column]: lower };
        } else if (val > upper) {
          affected++;
          return { ...row, [column]: upper };
        }
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحديد ${affected} قيمة ضمن النطاق [${lower.toFixed(2)}, ${upper.toFixed(2)}]`
    };
  },

  // معالجة: Winsorization
  winsorize: (data: DataRow[], column: string, percentile: number = 5): CleaningResult => {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v)).sort((a, b) => a - b);
    const lowerIdx = Math.floor(values.length * (percentile / 100));
    const upperIdx = Math.floor(values.length * (1 - percentile / 100));
    const lowerBound = values[lowerIdx];
    const upperBound = values[upperIdx];

    return outlierHandlers.capOutliers(data, column, lowerBound, upperBound);
  }
};

// ==================== معالجة التكرارات ====================
export const duplicateHandlers = {
  // كشف التكرارات
  detectDuplicates: (data: DataRow[], columns?: string[]): { indices: number[]; groups: number[][] } => {
    const seen = new Map<string, number[]>();
    
    data.forEach((row, idx) => {
      const key = columns 
        ? columns.map(col => JSON.stringify(row[col])).join('|')
        : JSON.stringify(row);
      
      if (!seen.has(key)) {
        seen.set(key, []);
      }
      seen.get(key)!.push(idx);
    });

    const duplicateIndices: number[] = [];
    const duplicateGroups: number[][] = [];

    seen.forEach(indices => {
      if (indices.length > 1) {
        duplicateGroups.push(indices);
        duplicateIndices.push(...indices.slice(1)); // احتفظ بالأول
      }
    });

    return { indices: duplicateIndices, groups: duplicateGroups };
  },

  // حذف التكرارات
  removeDuplicates: (data: DataRow[], columns?: string[], keep: 'first' | 'last' = 'first'): CleaningResult => {
    const { indices } = duplicateHandlers.detectDuplicates(data, columns);
    
    if (keep === 'last') {
      // اعكس المنطق
      const lastIndices = new Set(indices.map(i => data.length - 1 - i));
      const newData = data.filter((_, idx) => !lastIndices.has(data.length - 1 - idx));
      return {
        success: true,
        data: newData,
        affectedRows: indices.length,
        message: `تم حذف ${indices.length} صف مكرر (الاحتفاظ بالأخير)`
      };
    }

    const indexSet = new Set(indices);
    const newData = data.filter((_, idx) => !indexSet.has(idx));
    return {
      success: true,
      data: newData,
      affectedRows: indices.length,
      message: `تم حذف ${indices.length} صف مكرر (الاحتفاظ بالأول)`
    };
  }
};

// ==================== تحويل البيانات ====================
export const transformationHandlers = {
  // Log Transform
  logTransform: (data: DataRow[], column: string, base: number = Math.E): CleaningResult => {
    let affected = 0;
    let errors = 0;

    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val) && val > 0) {
        affected++;
        const logVal = base === Math.E ? Math.log(val) : Math.log(val) / Math.log(base);
        return { ...row, [`${column}_log`]: logVal };
      } else if (!isNaN(val) && val <= 0) {
        errors++;
      }
      return { ...row, [`${column}_log`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحويل ${affected} قيمة (${errors} قيمة سالبة أو صفرية تم تجاهلها)`
    };
  },

  // Log1p Transform (للقيم الصفرية)
  log1pTransform: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;

    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val) && val >= 0) {
        affected++;
        return { ...row, [`${column}_log1p`]: Math.log1p(val) };
      }
      return { ...row, [`${column}_log1p`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحويل ${affected} قيمة باستخدام log(1+x)`
    };
  },

  // Square Root Transform
  sqrtTransform: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;

    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val) && val >= 0) {
        affected++;
        return { ...row, [`${column}_sqrt`]: Math.sqrt(val) };
      }
      return { ...row, [`${column}_sqrt`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحويل ${affected} قيمة باستخدام الجذر التربيعي`
    };
  },

  // Box-Cox Transform
  boxCoxTransform: (data: DataRow[], column: string, lambda?: number): CleaningResult => {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v) && v > 0);
    
    if (values.length === 0) {
      return { success: false, data, affectedRows: 0, message: 'لا توجد قيم موجبة للتحويل' };
    }

    // تقدير lambda الأمثل إذا لم يُحدد
    const estimatedLambda = lambda ?? 0.5; // يمكن تحسين هذا

    let affected = 0;
    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val) && val > 0) {
        affected++;
        const transformed = estimatedLambda === 0 
          ? Math.log(val) 
          : (Math.pow(val, estimatedLambda) - 1) / estimatedLambda;
        return { ...row, [`${column}_boxcox`]: transformed };
      }
      return { ...row, [`${column}_boxcox`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحويل Box-Cox مع λ = ${estimatedLambda.toFixed(2)}`
    };
  },

  // Min-Max Normalization
  minMaxNormalize: (data: DataRow[], column: string, min: number = 0, max: number = 1): CleaningResult => {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const range = dataMax - dataMin;

    if (range === 0) {
      return { success: false, data, affectedRows: 0, message: 'جميع القيم متساوية' };
    }

    let affected = 0;
    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val)) {
        affected++;
        const normalized = min + ((val - dataMin) / range) * (max - min);
        return { ...row, [`${column}_normalized`]: normalized };
      }
      return { ...row, [`${column}_normalized`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم التطبيع إلى النطاق [${min}, ${max}]`,
      details: { dataMin, dataMax }
    };
  },

  // Z-Score Standardization
  standardize: (data: DataRow[], column: string): CleaningResult => {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v));
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const std = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / values.length);

    if (std === 0) {
      return { success: false, data, affectedRows: 0, message: 'الانحراف المعياري صفر' };
    }

    let affected = 0;
    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val)) {
        affected++;
        return { ...row, [`${column}_standardized`]: (val - mean) / std };
      }
      return { ...row, [`${column}_standardized`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم التوحيد (المتوسط: ${mean.toFixed(2)}, الانحراف: ${std.toFixed(2)})`,
      details: { mean, std }
    };
  },

  // Robust Scaling
  robustScale: (data: DataRow[], column: string): CleaningResult => {
    const values = data.map(row => Number(row[column])).filter(v => !isNaN(v)).sort((a, b) => a - b);
    const median = values[Math.floor(values.length / 2)];
    const q1 = values[Math.floor(values.length * 0.25)];
    const q3 = values[Math.floor(values.length * 0.75)];
    const iqr = q3 - q1;

    if (iqr === 0) {
      return { success: false, data, affectedRows: 0, message: 'المدى الربيعي صفر' };
    }

    let affected = 0;
    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val)) {
        affected++;
        return { ...row, [`${column}_robust`]: (val - median) / iqr };
      }
      return { ...row, [`${column}_robust`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم التحجيم المتين (الوسيط: ${median.toFixed(2)}, IQR: ${iqr.toFixed(2)})`
    };
  },

  // Power Transform
  powerTransform: (data: DataRow[], column: string, power: number): CleaningResult => {
    let affected = 0;
    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val)) {
        affected++;
        return { ...row, [`${column}_power${power}`]: Math.pow(val, power) };
      }
      return { ...row, [`${column}_power${power}`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم رفع القيم للأس ${power}`
    };
  },

  // Reciprocal Transform
  reciprocalTransform: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;
    let zeros = 0;

    const newData = data.map(row => {
      const val = Number(row[column]);
      if (!isNaN(val) && val !== 0) {
        affected++;
        return { ...row, [`${column}_reciprocal`]: 1 / val };
      } else if (val === 0) {
        zeros++;
      }
      return { ...row, [`${column}_reciprocal`]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم حساب المقلوب لـ ${affected} قيمة (${zeros} قيمة صفرية تم تجاهلها)`
    };
  }
};

// ==================== معالجة النصوص ====================
export const textHandlers = {
  // إزالة المسافات الزائدة
  trimWhitespace: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;
    const newData = data.map(row => {
      const val = row[column];
      if (typeof val === 'string') {
        const trimmed = val.trim().replace(/\s+/g, ' ');
        if (trimmed !== val) affected++;
        return { ...row, [column]: trimmed };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تنظيف المسافات في ${affected} قيمة`
    };
  },

  // تحويل لحروف صغيرة
  toLowerCase: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;
    const newData = data.map(row => {
      const val = row[column];
      if (typeof val === 'string') {
        affected++;
        return { ...row, [column]: val.toLowerCase() };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم التحويل لحروف صغيرة في ${affected} قيمة`
    };
  },

  // تحويل لحروف كبيرة
  toUpperCase: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;
    const newData = data.map(row => {
      const val = row[column];
      if (typeof val === 'string') {
        affected++;
        return { ...row, [column]: val.toUpperCase() };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم التحويل لحروف كبيرة في ${affected} قيمة`
    };
  },

  // تحويل لحالة العنوان
  toTitleCase: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;
    const newData = data.map(row => {
      const val = row[column];
      if (typeof val === 'string') {
        affected++;
        const titleCase = val.replace(/\w\S*/g, txt => 
          txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
        );
        return { ...row, [column]: titleCase };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم التحويل لحالة العنوان في ${affected} قيمة`
    };
  },

  // إزالة الأحرف الخاصة
  removeSpecialChars: (data: DataRow[], column: string, keepPattern?: string): CleaningResult => {
    let affected = 0;
    const pattern = keepPattern ? new RegExp(`[^${keepPattern}]`, 'g') : /[^\w\s\u0600-\u06FF]/g;
    
    const newData = data.map(row => {
      const val = row[column];
      if (typeof val === 'string') {
        const cleaned = val.replace(pattern, '');
        if (cleaned !== val) affected++;
        return { ...row, [column]: cleaned };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم إزالة الأحرف الخاصة من ${affected} قيمة`
    };
  },

  // استبدال نص
  replaceText: (data: DataRow[], column: string, search: string, replace: string, useRegex: boolean = false): CleaningResult => {
    let affected = 0;
    const pattern = useRegex ? new RegExp(search, 'g') : search;
    
    const newData = data.map(row => {
      const val = row[column];
      if (typeof val === 'string' && val.includes(search)) {
        affected++;
        return { ...row, [column]: val.replace(pattern, replace) };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم استبدال "${search}" بـ "${replace}" في ${affected} قيمة`
    };
  },

  // استخراج نمط
  extractPattern: (data: DataRow[], column: string, pattern: string, newColumn: string): CleaningResult => {
    let affected = 0;
    const regex = new RegExp(pattern);
    
    const newData = data.map(row => {
      const val = row[column];
      if (typeof val === 'string') {
        const match = val.match(regex);
        if (match) {
          affected++;
          return { ...row, [newColumn]: match[0] };
        }
      }
      return { ...row, [newColumn]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم استخراج النمط في ${affected} قيمة إلى عمود "${newColumn}"`
    };
  },

  // تقسيم العمود
  splitColumn: (data: DataRow[], column: string, delimiter: string, newColumns: string[]): CleaningResult => {
    const newData = data.map(row => {
      const val = row[column];
      const newRow = { ...row };
      if (typeof val === 'string') {
        const parts = val.split(delimiter);
        newColumns.forEach((col, i) => {
          newRow[col] = parts[i] || null;
        });
      } else {
        newColumns.forEach(col => {
          newRow[col] = null;
        });
      }
      return newRow;
    });

    return {
      success: true,
      data: newData,
      affectedRows: data.length,
      message: `تم تقسيم العمود "${column}" إلى ${newColumns.length} أعمدة`
    };
  },

  // دمج الأعمدة
  mergeColumns: (data: DataRow[], columns: string[], newColumn: string, separator: string = ' '): CleaningResult => {
    const newData = data.map(row => {
      const values = columns.map(col => row[col] ?? '').filter(v => v !== '');
      return { ...row, [newColumn]: values.join(separator) };
    });

    return {
      success: true,
      data: newData,
      affectedRows: data.length,
      message: `تم دمج ${columns.length} أعمدة في عمود "${newColumn}"`
    };
  }
};

// ==================== معالجة التواريخ ====================
export const dateHandlers = {
  // تحويل لتاريخ
  parseDate: (data: DataRow[], column: string, _format?: string): CleaningResult => {
    let affected = 0;
    let errors = 0;

    const newData = data.map(row => {
      const val = row[column];
      if (val) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          affected++;
          return { ...row, [column]: date.toISOString() };
        } else {
          errors++;
        }
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحويل ${affected} قيمة لتاريخ (${errors} قيمة غير صالحة)`
    };
  },

  // استخراج مكونات التاريخ
  extractDateParts: (data: DataRow[], column: string, parts: ('year' | 'month' | 'day' | 'hour' | 'minute' | 'dayOfWeek' | 'quarter')[]): CleaningResult => {
    let affected = 0;

    const newData = data.map(row => {
      const val = row[column];
      const newRow = { ...row };
      
      if (val) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          affected++;
          parts.forEach(part => {
            switch (part) {
              case 'year': newRow[`${column}_year`] = date.getFullYear(); break;
              case 'month': newRow[`${column}_month`] = date.getMonth() + 1; break;
              case 'day': newRow[`${column}_day`] = date.getDate(); break;
              case 'hour': newRow[`${column}_hour`] = date.getHours(); break;
              case 'minute': newRow[`${column}_minute`] = date.getMinutes(); break;
              case 'dayOfWeek': newRow[`${column}_dayOfWeek`] = date.getDay(); break;
              case 'quarter': newRow[`${column}_quarter`] = Math.ceil((date.getMonth() + 1) / 3); break;
            }
          });
        }
      }
      return newRow;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم استخراج ${parts.length} مكون من التاريخ في ${affected} صف`
    };
  },

  // حساب الفرق بين تاريخين
  dateDiff: (data: DataRow[], column1: string, column2: string, unit: 'days' | 'hours' | 'minutes' | 'months' | 'years', newColumn: string): CleaningResult => {
    let affected = 0;

    const newData = data.map(row => {
      const date1 = new Date(row[column1]);
      const date2 = new Date(row[column2]);
      
      if (!isNaN(date1.getTime()) && !isNaN(date2.getTime())) {
        affected++;
        let diff: number;
        const diffMs = date2.getTime() - date1.getTime();
        
        switch (unit) {
          case 'minutes': diff = diffMs / (1000 * 60); break;
          case 'hours': diff = diffMs / (1000 * 60 * 60); break;
          case 'days': diff = diffMs / (1000 * 60 * 60 * 24); break;
          case 'months': diff = (date2.getFullYear() - date1.getFullYear()) * 12 + (date2.getMonth() - date1.getMonth()); break;
          case 'years': diff = date2.getFullYear() - date1.getFullYear(); break;
        }
        return { ...row, [newColumn]: diff };
      }
      return { ...row, [newColumn]: null };
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم حساب الفرق (${unit}) في ${affected} صف`
    };
  },

  // تنسيق التاريخ
  formatDate: (data: DataRow[], column: string, format: string): CleaningResult => {
    let affected = 0;

    const formatDate = (date: Date, fmt: string): string => {
      const pad = (n: number) => n.toString().padStart(2, '0');
      return fmt
        .replace('YYYY', date.getFullYear().toString())
        .replace('MM', pad(date.getMonth() + 1))
        .replace('DD', pad(date.getDate()))
        .replace('HH', pad(date.getHours()))
        .replace('mm', pad(date.getMinutes()))
        .replace('ss', pad(date.getSeconds()));
    };

    const newData = data.map(row => {
      const val = row[column];
      if (val) {
        const date = new Date(val);
        if (!isNaN(date.getTime())) {
          affected++;
          return { ...row, [column]: formatDate(date, format) };
        }
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تنسيق ${affected} تاريخ بالصيغة "${format}"`
    };
  }
};

// ==================== تحويل أنواع البيانات ====================
export const typeConversionHandlers = {
  toNumber: (data: DataRow[], column: string, decimal: string = '.'): CleaningResult => {
    let affected = 0;
    let errors = 0;

    const newData = data.map(row => {
      const val = row[column];
      if (val !== null && val !== undefined) {
        const strVal = String(val).replace(decimal === ',' ? ',' : '.', '.');
        const num = parseFloat(strVal);
        if (!isNaN(num)) {
          affected++;
          return { ...row, [column]: num };
        } else {
          errors++;
        }
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحويل ${affected} قيمة لأرقام (${errors} قيمة غير صالحة)`
    };
  },

  toString: (data: DataRow[], column: string): CleaningResult => {
    let affected = 0;

    const newData = data.map(row => {
      const val = row[column];
      if (val !== null && val !== undefined && typeof val !== 'string') {
        affected++;
        return { ...row, [column]: String(val) };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحويل ${affected} قيمة لنصوص`
    };
  },

  toBoolean: (data: DataRow[], column: string, trueValues: string[] = ['true', '1', 'yes', 'نعم'], falseValues: string[] = ['false', '0', 'no', 'لا']): CleaningResult => {
    let affected = 0;

    const newData = data.map(row => {
      const val = String(row[column]).toLowerCase();
      if (trueValues.includes(val)) {
        affected++;
        return { ...row, [column]: true };
      } else if (falseValues.includes(val)) {
        affected++;
        return { ...row, [column]: false };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: affected,
      message: `تم تحويل ${affected} قيمة لقيم منطقية`
    };
  },

  toCategory: (data: DataRow[], column: string): CleaningResult => {
    const uniqueValues = [...new Set(data.map(row => row[column]).filter(v => v !== null && v !== undefined))];
    const categoryMap = new Map(uniqueValues.map((val, idx) => [String(val), idx]));

    const newData = data.map(row => {
      const val = row[column];
      if (val !== null && val !== undefined) {
        return { 
          ...row, 
          [`${column}_code`]: categoryMap.get(String(val)),
          [column]: String(val)
        };
      }
      return row;
    });

    return {
      success: true,
      data: newData,
      affectedRows: data.length,
      message: `تم إنشاء عمود رمزي لـ ${uniqueValues.length} فئة`,
      details: { categories: Object.fromEntries(categoryMap) }
    };
  }
};

// ==================== تقرير جودة البيانات ====================
export const generateQualityReport = (data: DataRow[], columns: ColumnInfo[]): DataQualityReport => {
  const totalRows = data.length;
  const totalColumns = columns.length;

  // القيم المفقودة
  const missingValues = columns.map(col => {
    const count = data.filter(row => 
      row[col.name] === null || row[col.name] === undefined || row[col.name] === ''
    ).length;
    return { column: col.name, count, percentage: (count / totalRows) * 100 };
  }).filter(m => m.count > 0);

  // التكرارات
  const { indices } = duplicateHandlers.detectDuplicates(data);
  const duplicateRows = indices.length;

  // القيم الشاذة
  const numericColumns = columns.filter(c => c.type === 'numeric');
  const outliers = numericColumns.map(col => {
    const { indices } = outlierHandlers.detectIQR(data, col.name);
    return { column: col.name, count: indices.length, method: 'IQR' };
  }).filter(o => o.count > 0);

  // مشاكل أنواع البيانات
  const dataTypeIssues = columns.map(col => {
    let invalidCount = 0;
    if (col.type === 'numeric') {
      invalidCount = data.filter(row => {
        const val = row[col.name];
        return val !== null && val !== undefined && val !== '' && isNaN(Number(val));
      }).length;
    }
    return { column: col.name, invalidCount, expectedType: col.type };
  }).filter(d => d.invalidCount > 0);

  // حساب النتيجة الإجمالية
  const missingScore = 100 - (missingValues.reduce((sum, m) => sum + m.percentage, 0) / columns.length);
  const duplicateScore = 100 - (duplicateRows / totalRows) * 100;
  const outlierScore = 100 - (outliers.reduce((sum, o) => sum + o.count, 0) / (totalRows * numericColumns.length)) * 100;
  const typeScore = 100 - (dataTypeIssues.reduce((sum, d) => sum + d.invalidCount, 0) / (totalRows * columns.length)) * 100;

  const overallScore = Math.max(0, Math.min(100, (missingScore + duplicateScore + outlierScore + typeScore) / 4));

  return {
    totalRows,
    totalColumns,
    missingValues,
    duplicateRows,
    outliers,
    dataTypeIssues,
    overallScore
  };
};

// ==================== التنظيف التلقائي ====================
export const autoClean = (data: DataRow[], columns: ColumnInfo[], options: {
  handleMissing: boolean;
  handleOutliers: boolean;
  handleDuplicates: boolean;
  missingThreshold: number;
  outlierMethod: 'zscore' | 'iqr' | 'mad';
}): { data: DataRow[]; operations: string[] } => {
  let cleanedData = [...data];
  const operations: string[] = [];

  // معالجة التكرارات
  if (options.handleDuplicates) {
    const result = duplicateHandlers.removeDuplicates(cleanedData);
    if (result.affectedRows > 0) {
      cleanedData = result.data;
      operations.push(result.message);
    }
  }

  // معالجة القيم المفقودة
  if (options.handleMissing) {
    columns.forEach(col => {
      const missingCount = cleanedData.filter(row => 
        row[col.name] === null || row[col.name] === undefined || row[col.name] === ''
      ).length;
      const missingPct = (missingCount / cleanedData.length) * 100;

      if (missingPct > 0 && missingPct < options.missingThreshold) {
        let result: CleaningResult;
        if (col.type === 'numeric') {
          result = missingValueHandlers.fillMedian(cleanedData, col.name);
        } else {
          result = missingValueHandlers.fillMode(cleanedData, col.name);
        }
        if (result.affectedRows > 0) {
          cleanedData = result.data;
          operations.push(`${col.name}: ${result.message}`);
        }
      }
    });
  }

  // معالجة القيم الشاذة
  if (options.handleOutliers) {
    columns.filter(c => c.type === 'numeric').forEach(col => {
      let outlierIndices: number[];
      let bounds: { lower: number; upper: number } | undefined;

      switch (options.outlierMethod) {
        case 'zscore':
          outlierIndices = outlierHandlers.detectZScore(cleanedData, col.name).indices;
          break;
        case 'mad':
          outlierIndices = outlierHandlers.detectMAD(cleanedData, col.name).indices;
          break;
        default:
          const iqrResult = outlierHandlers.detectIQR(cleanedData, col.name);
          outlierIndices = iqrResult.indices;
          bounds = iqrResult.bounds;
      }

      if (outlierIndices.length > 0 && bounds) {
        const result = outlierHandlers.capOutliers(cleanedData, col.name, bounds.lower, bounds.upper);
        cleanedData = result.data;
        operations.push(`${col.name}: ${result.message}`);
      }
    });
  }

  return { data: cleanedData, operations };
};
