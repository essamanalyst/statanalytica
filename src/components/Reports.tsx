import { useState, useRef } from 'react';
import { Dataset } from '@/types';
import { FileText, Download, Printer, Share2, CheckCircle, File, FileSpreadsheet, Eye, Loader2 } from 'lucide-react';
import { cn } from '@/utils/cn';
import { calculateDescriptiveStats } from '@/utils/dataProcessing';
import { saveAs } from 'file-saver';
import { useLanguage } from '../i18n';

interface ReportsProps {
  dataset: Dataset | null;
}

type ReportSection = 'summary' | 'descriptive' | 'visualization' | 'tests' | 'conclusions';

export function Reports({ dataset }: ReportsProps) {
  const { t, language, isRTL } = useLanguage();
  const [selectedSections, setSelectedSections] = useState<ReportSection[]>(['summary', 'descriptive']);
  const [reportTitle, setReportTitle] = useState(language === 'ar' ? 'تقرير التحليل الإحصائي' : 'Statistical Analysis Report');
  const [authorName, setAuthorName] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const reportRef = useRef<HTMLDivElement>(null);

  const sections: { id: ReportSection; label: string; description: string }[] = [
    { id: 'summary', label: t('reports.sections.summary'), description: t('reports.sections.dataDescription') || 'Basic information about the dataset' },
    { id: 'descriptive', label: t('reports.sections.descriptiveStats'), description: t('descriptive.subtitle') },
    { id: 'visualization', label: t('viz.title'), description: t('viz.subtitle') },
    { id: 'tests', label: t('tests.title'), description: t('tests.subtitle') },
    { id: 'conclusions', label: t('reports.sections.conclusions'), description: t('reports.sections.recommendations') },
  ];

  const toggleSection = (sectionId: ReportSection) => {
    setSelectedSections(prev => 
      prev.includes(sectionId)
        ? prev.filter(s => s !== sectionId)
        : [...prev, sectionId]
    );
  };

  const generateHTMLContent = () => {
    if (!dataset) return '';

    const numericColumns = dataset.columns.filter(c => c.type === 'numeric');
    const stats = numericColumns.map(col => ({
      name: col.name,
      stats: calculateDescriptiveStats(col.values)
    }));

    const currentDate = new Date().toLocaleDateString(language === 'ar' ? 'ar-SA' : 'en-US');

    let content = '';

    // Summary Section
    if (selectedSections.includes('summary')) {
      content += `
        <div class="section">
          <h2>${t('reports.sections.summary')}</h2>
          <div class="summary-grid">
            <div class="summary-card">
              <span class="label">${t('label.rows')}</span>
              <span class="value">${dataset.rowCount.toLocaleString()}</span>
            </div>
            <div class="summary-card">
              <span class="label">${t('label.columns')}</span>
              <span class="value">${dataset.columnCount}</span>
            </div>
            <div class="summary-card">
              <span class="label">${t('dataType.numeric')}</span>
              <span class="value">${numericColumns.length}</span>
            </div>
            <div class="summary-card">
              <span class="label">${t('dataType.categorical')}</span>
              <span class="value">${dataset.columns.filter(c => c.type === 'categorical').length}</span>
            </div>
          </div>
          
          <h3>${language === 'ar' ? 'تفاصيل الأعمدة' : 'Column Details'}</h3>
          <table>
            <thead>
              <tr>
                <th>${t('label.name')}</th>
                <th>${t('label.type')}</th>
                <th>${t('cleaning.missingValues')}</th>
                <th>${t('descriptive.uniqueValues')}</th>
              </tr>
            </thead>
            <tbody>
              ${dataset.columns.map(col => `
              <tr>
                <td><strong>${col.name}</strong></td>
                <td>${col.type === 'numeric' ? t('dataType.numeric') : t('dataType.categorical')}</td>
                <td>${col.missing} (${((col.missing / dataset.rowCount) * 100).toFixed(1)}%)</td>
                <td>${col.unique}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Descriptive Statistics Section
    if (selectedSections.includes('descriptive') && stats.length > 0) {
      content += `
        <div class="section">
          <h2>${t('descriptive.title')}</h2>
          <table>
            <thead>
              <tr>
                <th>${t('label.column')}</th>
                <th>${t('label.count')}</th>
                <th>${t('descriptive.mean')}</th>
                <th>${t('descriptive.median')}</th>
                <th>${t('descriptive.stdDev')}</th>
                <th>${t('descriptive.minimum')}</th>
                <th>${t('descriptive.maximum')}</th>
              </tr>
            </thead>
            <tbody>
              ${stats.map(({ name, stats: s }) => `
              <tr>
                <td><strong>${name}</strong></td>
                <td>${s.count}</td>
                <td>${s.mean.toFixed(3)}</td>
                <td>${s.median.toFixed(3)}</td>
                <td>${s.std.toFixed(3)}</td>
                <td>${s.min.toFixed(3)}</td>
                <td>${s.max.toFixed(3)}</td>
              </tr>
              `).join('')}
            </tbody>
          </table>
          
          <h3>${t('descriptive.shape')}</h3>
          <table>
            <thead>
              <tr>
                <th>${t('label.column')}</th>
                <th>${t('descriptive.skewness')}</th>
                <th>${t('descriptive.interpretation')}</th>
                <th>${t('descriptive.kurtosis')}</th>
                <th>${t('descriptive.iqr')}</th>
              </tr>
            </thead>
            <tbody>
              ${stats.map(({ name, stats: s }) => {
                let skewInterpret = '';
                if (s.skewness > 1) skewInterpret = language === 'ar' ? 'التواء إيجابي قوي' : 'Strong positive skew';
                else if (s.skewness > 0.5) skewInterpret = language === 'ar' ? 'التواء إيجابي معتدل' : 'Moderate positive skew';
                else if (s.skewness < -1) skewInterpret = language === 'ar' ? 'التواء سلبي قوي' : 'Strong negative skew';
                else if (s.skewness < -0.5) skewInterpret = language === 'ar' ? 'التواء سلبي معتدل' : 'Moderate negative skew';
                else skewInterpret = language === 'ar' ? 'توزيع متماثل تقريباً' : 'Approximately symmetric';
                
                return `
                <tr>
                  <td><strong>${name}</strong></td>
                  <td>${s.skewness.toFixed(3)}</td>
                  <td><em>${skewInterpret}</em></td>
                  <td>${s.kurtosis.toFixed(3)}</td>
                  <td>${s.iqr.toFixed(3)}</td>
                </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    }

    // Conclusions Section
    if (selectedSections.includes('conclusions')) {
      const totalMissing = dataset.columns.reduce((acc, c) => acc + c.missing, 0);
      const missingRate = ((totalMissing / (dataset.rowCount * dataset.columnCount)) * 100).toFixed(2);
      
      content += `
        <div class="section">
          <h2>${t('reports.sections.conclusions')}</h2>
          <div class="conclusion-box">
            <h3>${language === 'ar' ? 'ملخص التحليل' : 'Analysis Summary'}</h3>
            <ul>
              <li>${language === 'ar' ? `تم تحليل ${dataset.rowCount.toLocaleString()} ملاحظة و ${dataset.columnCount} متغير` : `Analyzed ${dataset.rowCount.toLocaleString()} observations and ${dataset.columnCount} variables`}</li>
              <li>${language === 'ar' ? `نسبة القيم المفقودة الإجمالية: ${missingRate}%` : `Total missing values rate: ${missingRate}%`}</li>
              ${numericColumns.length > 0 ? `<li>${language === 'ar' ? 'تتوفر بيانات رقمية للتحليل الإحصائي المتقدم' : 'Numeric data available for advanced statistical analysis'}</li>` : ''}
            </ul>
            
            <h3>${t('reports.sections.recommendations')}</h3>
            <ul>
              ${parseFloat(missingRate) > 5 ? `<li>${language === 'ar' ? 'يُنصح بمعالجة القيم المفقودة قبل التحليل المتقدم' : 'Consider handling missing values before advanced analysis'}</li>` : ''}
              <li>${language === 'ar' ? 'فحص القيم الشاذة في المتغيرات الرقمية' : 'Check for outliers in numeric variables'}</li>
              <li>${language === 'ar' ? 'التحقق من افتراضات الاختبارات الإحصائية' : 'Verify statistical test assumptions'}</li>
              <li>${language === 'ar' ? 'استخدام التصور البياني لفهم أفضل للبيانات' : 'Use visualizations for better data understanding'}</li>
            </ul>
          </div>
        </div>
      `;
    }

    return { content, currentDate };
  };

  const generateFullHTML = () => {
    if (!dataset) return '';
    
    const result = generateHTMLContent();
    if (!result) return '';
    const { content, currentDate } = result;
    const direction = isRTL ? 'rtl' : 'ltr';
    const fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

    return `
<!DOCTYPE html>
<html dir="${direction}" lang="${language}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${reportTitle}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
    
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body { 
      font-family: ${isRTL ? "'Cairo', " : ""}${fontFamily};
      direction: ${direction};
      background: #f0f4f8;
      color: #1a202c;
      line-height: 1.6;
      padding: 20px;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    
    .header {
      background: linear-gradient(135deg, #059669 0%, #0891b2 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }
    
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header .meta {
      opacity: 0.9;
      font-size: 14px;
    }
    
    .content {
      padding: 40px;
    }
    
    .section {
      margin-bottom: 40px;
      page-break-inside: avoid;
    }
    
    h2 {
      color: #059669;
      font-size: 22px;
      margin-bottom: 20px;
      padding-bottom: 10px;
      border-bottom: 3px solid #059669;
    }
    
    h3 {
      color: #1a202c;
      font-size: 18px;
      margin: 25px 0 15px 0;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 16px;
      margin-bottom: 30px;
    }
    
    .summary-card {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }
    
    .summary-card .label {
      display: block;
      font-size: 13px;
      color: #059669;
      margin-bottom: 8px;
    }
    
    .summary-card .value {
      display: block;
      font-size: 28px;
      font-weight: bold;
      color: #047857;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    
    th, td {
      border: 1px solid #e2e8f0;
      padding: 12px 16px;
      text-align: ${isRTL ? 'right' : 'left'};
    }
    
    th {
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
    }
    
    tr:nth-child(even) { background: #f8fafc; }
    tr:hover { background: #ecfdf5; }
    
    .conclusion-box {
      background: linear-gradient(135deg, #ecfdf5 0%, #f0fdfa 100%);
      border: 1px solid #a7f3d0;
      border-radius: 12px;
      padding: 25px;
    }
    
    .conclusion-box h3 {
      color: #059669;
      margin-top: 0;
    }
    
    .conclusion-box ul {
      padding-${isRTL ? 'right' : 'left'}: 20px;
    }
    
    .conclusion-box li {
      margin-bottom: 10px;
      color: #374151;
    }
    
    .footer {
      text-align: center;
      padding: 30px;
      background: #f8fafc;
      color: #6b7280;
      font-size: 13px;
      border-top: 1px solid #e2e8f0;
    }
    
    @media print {
      body { background: white; padding: 0; }
      .container { box-shadow: none; border-radius: 0; }
      .header { padding: 30px; }
      .content { padding: 30px; }
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
    }
    
    @media (max-width: 600px) {
      .summary-grid { grid-template-columns: repeat(2, 1fr); }
      table { font-size: 12px; }
      th, td { padding: 8px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${reportTitle}</h1>
      <div class="meta">
        <p>${t('reports.reportDate')}: ${currentDate}</p>
        ${authorName ? `<p>${t('reports.reportAuthor')}: ${authorName}</p>` : ''}
        <p>${t('label.source')}: ${dataset.name}</p>
      </div>
    </div>
    
    <div class="content">
      ${content}
    </div>
    
    <div class="footer">
      ${language === 'ar' ? 'تم إنشاء هذا التقرير بواسطة' : 'Generated by'} StatAnalytica &copy; ${new Date().getFullYear()}
    </div>
  </div>
</body>
</html>
    `;
  };

  const downloadHTML = () => {
    const html = generateFullHTML();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    saveAs(blob, `${reportTitle}.html`);
  };

  const downloadPDF = async () => {
    if (!dataset) return;
    
    setIsGenerating(true);
    
    try {
      // Create a hidden iframe to render the HTML
      const html = generateFullHTML();
      
      // Create a Blob URL for the HTML
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      
      // Open in new window for printing as PDF
      const printWindow = window.open(url, '_blank');
      
      if (printWindow) {
        printWindow.onload = () => {
          setTimeout(() => {
            printWindow.print();
            URL.revokeObjectURL(url);
          }, 500);
        };
      }
      
      // Also provide a direct download option using print to PDF
      setTimeout(() => {
        setIsGenerating(false);
      }, 1000);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
      setIsGenerating(false);
      
      // Fallback: Download as HTML with .pdf extension suggestion
      const html = generateFullHTML();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      saveAs(blob, `${reportTitle}.html`);
      
      alert(language === 'ar' 
        ? 'تم تحميل التقرير كـ HTML. يمكنك فتحه في المتصفح واستخدام "طباعة إلى PDF" لإنشاء ملف PDF.'
        : 'Report downloaded as HTML. You can open it in a browser and use "Print to PDF" to create a PDF file.'
      );
    }
  };

  const printReport = () => {
    const html = generateFullHTML();
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const copyToClipboard = async () => {
    const html = generateFullHTML();
    try {
      await navigator.clipboard.writeText(html);
      alert(language === 'ar' ? 'تم نسخ HTML إلى الحافظة' : 'HTML copied to clipboard');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <FileText className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">{t('message.info.selectData')}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${isRTL ? 'rtl' : 'ltr'}`} dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center text-3xl backdrop-blur-sm">
            📄
          </div>
          <div>
            <h1 className="text-2xl font-bold">{t('reports.title')}</h1>
            <p className="text-white/80 mt-1">{t('reports.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Report Settings */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-green-600" />
          {t('label.settings')}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('reports.reportTitle')}:</label>
            <input
              type="text"
              value={reportTitle}
              onChange={(e) => setReportTitle(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('reports.reportTitle')}
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('reports.reportAuthor')} ({t('label.optional')}):</label>
            <input
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
              placeholder={t('reports.reportAuthor')}
            />
          </div>
        </div>
      </div>

      {/* Section Selection */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <CheckCircle className="w-5 h-5 text-green-600" />
          {language === 'ar' ? 'أقسام التقرير' : 'Report Sections'}
        </h3>
        
        <div className="space-y-3">
          {sections.map(section => (
            <label
              key={section.id}
              className={cn(
                'flex items-center gap-4 p-4 rounded-lg border cursor-pointer transition-all',
                selectedSections.includes(section.id)
                  ? 'border-green-500 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <input
                type="checkbox"
                checked={selectedSections.includes(section.id)}
                onChange={() => toggleSection(section.id)}
                className="w-5 h-5 rounded text-green-600"
              />
              <div className="flex-1">
                <p className="font-medium text-gray-800">{section.label}</p>
                <p className="text-sm text-gray-600">{section.description}</p>
              </div>
              {selectedSections.includes(section.id) && (
                <CheckCircle className="w-5 h-5 text-green-600" />
              )}
            </label>
          ))}
        </div>
      </div>

      {/* Export Options */}
      <div className="bg-gradient-to-r from-green-50 to-teal-50 rounded-xl p-6 border border-green-200">
        <h3 className="font-semibold text-green-800 mb-4 flex items-center gap-2">
          <Download className="w-5 h-5" />
          {t('reports.export.format')}
        </h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button
            onClick={downloadHTML}
            disabled={selectedSections.length === 0}
            className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-lg transition-all disabled:opacity-50"
          >
            <File className="w-10 h-10 text-orange-500" />
            <span className="font-medium">HTML</span>
            <span className="text-xs text-gray-500 text-center">
              {language === 'ar' ? 'تقرير تفاعلي' : 'Interactive'}
            </span>
          </button>
          
          <button
            onClick={downloadPDF}
            disabled={selectedSections.length === 0 || isGenerating}
            className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-lg transition-all disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-10 h-10 text-red-500 animate-spin" />
            ) : (
              <Download className="w-10 h-10 text-red-500" />
            )}
            <span className="font-medium">PDF</span>
            <span className="text-xs text-gray-500 text-center">
              {isGenerating 
                ? (language === 'ar' ? 'جاري الإنشاء...' : 'Generating...')
                : (language === 'ar' ? 'طباعة إلى PDF' : 'Print to PDF')
              }
            </span>
          </button>
          
          <button
            onClick={printReport}
            disabled={selectedSections.length === 0}
            className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Printer className="w-10 h-10 text-gray-600" />
            <span className="font-medium">{t('action.print')}</span>
            <span className="text-xs text-gray-500 text-center">
              {language === 'ar' ? 'طباعة مباشرة' : 'Direct print'}
            </span>
          </button>

          <button
            onClick={() => setShowPreview(!showPreview)}
            disabled={selectedSections.length === 0}
            className="flex flex-col items-center gap-2 p-6 bg-white rounded-xl border border-gray-200 hover:border-green-400 hover:shadow-lg transition-all disabled:opacity-50"
          >
            <Eye className="w-10 h-10 text-blue-500" />
            <span className="font-medium">{t('reports.preview')}</span>
            <span className="text-xs text-gray-500 text-center">
              {language === 'ar' ? 'معاينة التقرير' : 'Preview report'}
            </span>
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-4 p-4 bg-white/50 rounded-lg border border-green-200">
          <p className="text-sm text-green-800">
            <strong>💡 {language === 'ar' ? 'نصيحة' : 'Tip'}:</strong>{' '}
            {language === 'ar' 
              ? 'لإنشاء ملف PDF، انقر على زر PDF ثم اختر "حفظ كـ PDF" أو "Save as PDF" من نافذة الطباعة.'
              : 'To create a PDF file, click the PDF button and then choose "Save as PDF" from the print dialog.'
            }
          </p>
        </div>
      </div>

      {/* Preview */}
      {showPreview && (
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-green-600" />
              {t('reports.preview')}
            </h3>
            <button 
              onClick={copyToClipboard}
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700"
            >
              <Share2 className="w-4 h-4" />
              {t('action.copy')} HTML
            </button>
          </div>
          
          <div 
            ref={reportRef}
            className="border border-gray-200 rounded-lg overflow-hidden"
            style={{ maxHeight: '600px', overflowY: 'auto' }}
          >
            <iframe
              srcDoc={generateFullHTML()}
              className="w-full"
              style={{ height: '600px', border: 'none' }}
              title="Report Preview"
            />
          </div>
        </div>
      )}
    </div>
  );
}
