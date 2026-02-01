import React, { useState, useCallback } from 'react';
import * as XLSX from 'xlsx';
import { useLanguage } from '../i18n';

interface ExcelUploaderProps {
  onDataLoaded: (data: any[], columns: string[]) => void;
}

const ExcelUploader: React.FC<ExcelUploaderProps> = ({ onDataLoaded }) => {
  const { language } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const parseExcelFile = useCallback((file: File): Promise<{ data: any[], columns: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          
          if (!arrayBuffer || arrayBuffer.byteLength === 0) {
            reject(new Error(language === 'ar' ? 'الملف فارغ' : 'File is empty'));
            return;
          }

          // Read workbook
          const workbook = XLSX.read(arrayBuffer, { 
            type: 'array',
            cellDates: true,
            cellNF: false,
            cellText: false,
            raw: false
          });

          if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
            reject(new Error(language === 'ar' ? 'لا توجد أوراق عمل في الملف' : 'No worksheets found'));
            return;
          }

          // Get first sheet
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];

          if (!worksheet) {
            reject(new Error(language === 'ar' ? 'ورقة العمل فارغة' : 'Worksheet is empty'));
            return;
          }

          // Convert to JSON
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
            header: 1,
            defval: '',
            blankrows: false
          }) as any[][];

          if (!jsonData || jsonData.length === 0) {
            reject(new Error(language === 'ar' ? 'لا توجد بيانات' : 'No data found'));
            return;
          }

          // Extract headers from first row
          const headers = jsonData[0].map((h: any, i: number) => 
            h ? String(h).trim() : `Column_${i + 1}`
          );

          // Convert rows to objects
          const data = jsonData.slice(1).map(row => {
            const obj: any = {};
            headers.forEach((header, i) => {
              let value = row[i];
              // Handle dates
              if (value instanceof Date) {
                value = value.toISOString().split('T')[0];
              }
              obj[header] = value !== undefined ? value : '';
            });
            return obj;
          }).filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));

          resolve({ data, columns: headers });
        } catch (err: any) {
          reject(new Error(err.message || (language === 'ar' ? 'خطأ في قراءة الملف' : 'Error reading file')));
        }
      };

      reader.onerror = () => {
        reject(new Error(language === 'ar' ? 'فشل في قراءة الملف' : 'Failed to read file'));
      };

      reader.readAsArrayBuffer(file);
    });
  }, [language]);

  const parseCSVFile = useCallback((file: File): Promise<{ data: any[], columns: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          
          if (!text || text.trim().length === 0) {
            reject(new Error(language === 'ar' ? 'الملف فارغ' : 'File is empty'));
            return;
          }

          const lines = text.split(/\r?\n/).filter(line => line.trim());
          
          if (lines.length === 0) {
            reject(new Error(language === 'ar' ? 'لا توجد بيانات' : 'No data found'));
            return;
          }

          // Detect delimiter
          const firstLine = lines[0];
          let delimiter = ',';
          if (firstLine.includes('\t')) delimiter = '\t';
          else if (firstLine.includes(';')) delimiter = ';';

          // Parse headers
          const headers = firstLine.split(delimiter).map((h, i) => 
            h.replace(/^["']|["']$/g, '').trim() || `Column_${i + 1}`
          );

          // Parse data rows
          const data = lines.slice(1).map(line => {
            const values = line.split(delimiter).map(v => v.replace(/^["']|["']$/g, '').trim());
            const obj: any = {};
            headers.forEach((header, i) => {
              let value: any = values[i] || '';
              // Try to parse numbers
              if (value !== '' && !isNaN(Number(value))) {
                value = Number(value);
              }
              obj[header] = value;
            });
            return obj;
          }).filter(row => Object.values(row).some(v => v !== '' && v !== null && v !== undefined));

          resolve({ data, columns: headers });
        } catch (err: any) {
          reject(new Error(err.message || (language === 'ar' ? 'خطأ في قراءة الملف' : 'Error reading file')));
        }
      };

      reader.onerror = () => {
        reject(new Error(language === 'ar' ? 'فشل في قراءة الملف' : 'Failed to read file'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }, [language]);

  const parseJSONFile = useCallback((file: File): Promise<{ data: any[], columns: string[] }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          const text = e.target?.result as string;
          let jsonData = JSON.parse(text);

          // Handle nested data
          if (!Array.isArray(jsonData)) {
            if (jsonData.data && Array.isArray(jsonData.data)) {
              jsonData = jsonData.data;
            } else if (jsonData.results && Array.isArray(jsonData.results)) {
              jsonData = jsonData.results;
            } else {
              jsonData = [jsonData];
            }
          }

          if (jsonData.length === 0) {
            reject(new Error(language === 'ar' ? 'لا توجد بيانات' : 'No data found'));
            return;
          }

          const columns = Object.keys(jsonData[0]);
          resolve({ data: jsonData, columns });
        } catch (err: any) {
          reject(new Error(language === 'ar' ? 'خطأ في تحليل JSON' : 'Error parsing JSON'));
        }
      };

      reader.onerror = () => {
        reject(new Error(language === 'ar' ? 'فشل في قراءة الملف' : 'Failed to read file'));
      };

      reader.readAsText(file, 'UTF-8');
    });
  }, [language]);

  const handleFile = useCallback(async (file: File) => {
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const fileName = file.name.toLowerCase();
      const extension = fileName.split('.').pop() || '';
      
      let result: { data: any[], columns: string[] };

      if (['xlsx', 'xls', 'xlsm', 'xlsb'].includes(extension)) {
        result = await parseExcelFile(file);
      } else if (['csv', 'txt', 'tsv'].includes(extension)) {
        result = await parseCSVFile(file);
      } else if (extension === 'json') {
        result = await parseJSONFile(file);
      } else {
        throw new Error(
          language === 'ar' 
            ? `صيغة غير مدعومة: .${extension}` 
            : `Unsupported format: .${extension}`
        );
      }

      if (result.data.length === 0) {
        throw new Error(language === 'ar' ? 'لا توجد بيانات في الملف' : 'No data in file');
      }

      onDataLoaded(result.data, result.columns);
      
      setSuccess(
        language === 'ar'
          ? `✅ تم تحميل ${result.data.length} صف و ${result.columns.length} عمود من "${file.name}"`
          : `✅ Loaded ${result.data.length} rows and ${result.columns.length} columns from "${file.name}"`
      );
    } catch (err: any) {
      console.error('File upload error:', err);
      setError(err.message || (language === 'ar' ? 'خطأ في تحميل الملف' : 'Error loading file'));
    } finally {
      setLoading(false);
    }
  }, [language, parseExcelFile, parseCSVFile, parseJSONFile, onDataLoaded]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
    // Reset input
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  return (
    <div className="space-y-4">
      {/* Drop Zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={`
          relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer
          transition-all duration-300
          ${dragOver 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-300 hover:border-blue-400 hover:bg-gray-50'
          }
          ${loading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          type="file"
          accept=".xlsx,.xls,.xlsm,.xlsb,.csv,.json,.txt,.tsv"
          onChange={handleFileInput}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          disabled={loading}
        />
        
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
              <p className="text-gray-600">
                {language === 'ar' ? 'جاري تحميل الملف...' : 'Loading file...'}
              </p>
            </div>
          ) : (
            <>
              <div className="w-16 h-16 mx-auto bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>
              
              <div>
                <p className="text-lg font-medium text-gray-700">
                  {language === 'ar' 
                    ? 'اسحب وأفلت الملف هنا أو انقر للاختيار'
                    : 'Drag & drop file here or click to browse'
                  }
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  {language === 'ar'
                    ? 'الصيغ المدعومة: Excel (.xlsx, .xls), CSV, JSON, TXT'
                    : 'Supported formats: Excel (.xlsx, .xls), CSV, JSON, TXT'
                  }
                </p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Supported Formats */}
      <div className="flex flex-wrap gap-2 justify-center">
        {[
          { ext: 'XLSX', color: 'bg-green-100 text-green-700', icon: '📊' },
          { ext: 'XLS', color: 'bg-green-100 text-green-700', icon: '📊' },
          { ext: 'CSV', color: 'bg-blue-100 text-blue-700', icon: '📄' },
          { ext: 'JSON', color: 'bg-yellow-100 text-yellow-700', icon: '📋' },
          { ext: 'TXT', color: 'bg-gray-100 text-gray-700', icon: '📝' },
        ].map(format => (
          <span key={format.ext} className={`px-3 py-1 rounded-full text-sm font-medium ${format.color}`}>
            {format.icon} {format.ext}
          </span>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <span>{error}</span>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>{success}</span>
        </div>
      )}
    </div>
  );
};

export default ExcelUploader;
