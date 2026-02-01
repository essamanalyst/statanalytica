import { useState, useMemo } from 'react';
import { Dataset } from '@/types';
import { Sparkles, CheckCircle, AlertTriangle, ArrowRight, Lightbulb, Target } from 'lucide-react';
import { cn } from '@/utils/cn';
import * as stats from '@/utils/statistics';

interface SmartTestSelectionProps {
  dataset: Dataset | null;
}

interface TestRecommendation {
  testId: string;
  testName: string;
  testNameAr: string;
  confidence: number;
  reasons: string[];
  warnings: string[];
  assumptions: { name: string; met: boolean; details: string }[];
}

export function SmartTestSelection({ dataset }: SmartTestSelectionProps) {
  const [researchQuestion, setResearchQuestion] = useState<string>('compare-two');
  const [selectedVariables, setSelectedVariables] = useState<string[]>([]);
  const [recommendation, setRecommendation] = useState<TestRecommendation | null>(null);

  const numericColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter(c => c.type === 'numeric');
  }, [dataset]);

  const categoricalColumns = useMemo(() => {
    if (!dataset) return [];
    return dataset.columns.filter(c => c.type === 'categorical' || c.type === 'ordinal');
  }, [dataset]);

  const researchQuestions = [
    { id: 'compare-two', label: 'مقارنة مجموعتين', description: 'هل يختلف المتوسط بين مجموعتين؟' },
    { id: 'compare-many', label: 'مقارنة عدة مجموعات', description: 'هل يختلف المتوسط بين ثلاث مجموعات أو أكثر؟' },
    { id: 'correlation', label: 'علاقة بين متغيرين', description: 'هل توجد علاقة بين متغيرين رقميين؟' },
    { id: 'before-after', label: 'قبل وبعد', description: 'هل تغيرت القيم بعد تدخل معين؟' },
    { id: 'independence', label: 'استقلالية', description: 'هل متغيران فئويان مستقلان؟' },
    { id: 'normality', label: 'فحص التوزيع', description: 'هل البيانات تتبع التوزيع الطبيعي؟' },
  ];

  const analyzeAndRecommend = () => {
    if (!dataset || selectedVariables.length === 0) return;

    let rec: TestRecommendation | null = null;

    if (researchQuestion === 'compare-two' && selectedVariables.length >= 2) {
      const numCol = dataset.columns.find(c => c.name === selectedVariables[0]);
      const catCol = dataset.columns.find(c => c.name === selectedVariables[1]);
      
      if (numCol && catCol) {
        const values = numCol.values.filter((x: number) => !isNaN(x) && x !== null);
        const n = values.length;
        const shapiro = stats.shapiroWilk(values);
        const isNormal = shapiro.pValue > 0.05;
        
        void [...new Set(catCol.values)].slice(0, 2);
        
        const assumptions: TestRecommendation['assumptions'] = [
          { 
            name: 'التوزيع الطبيعي', 
            met: isNormal, 
            details: `اختبار شابيرو-ويلك: W = ${shapiro.w.toFixed(3)}, p = ${shapiro.pValue.toFixed(3)}`
          },
          { 
            name: 'حجم العينة مناسب', 
            met: n >= 30, 
            details: `حجم العينة = ${n} (الموصى به >= 30)`
          },
          { 
            name: 'استقلالية العينات', 
            met: true, 
            details: 'يفترض أن العينات مستقلة'
          }
        ];

        if (isNormal && n >= 30) {
          rec = {
            testId: 'ttest-ind',
            testName: 'Independent Samples T-Test',
            testNameAr: 'اختبار T للعينات المستقلة',
            confidence: 95,
            reasons: [
              'البيانات تتبع التوزيع الطبيعي',
              'حجم العينة مناسب للاختبار المعلمي',
              'مقارنة متوسطي مجموعتين مستقلتين'
            ],
            warnings: [],
            assumptions
          };
        } else {
          rec = {
            testId: 'mann-whitney',
            testName: 'Mann-Whitney U Test',
            testNameAr: 'اختبار مان-ويتني',
            confidence: 90,
            reasons: [
              isNormal ? 'حجم العينة صغير' : 'البيانات لا تتبع التوزيع الطبيعي',
              'اختبار لامعلمي لا يتطلب افتراض التوزيع الطبيعي',
              'مناسب لمقارنة مجموعتين مستقلتين'
            ],
            warnings: isNormal ? ['قد تفقد بعض القوة الإحصائية مقارنة بـ T-test'] : [],
            assumptions
          };
        }
      }
    }

    if (researchQuestion === 'compare-many' && selectedVariables.length >= 2) {
      const numCol = dataset.columns.find(c => c.name === selectedVariables[0]);
      const catCol = dataset.columns.find(c => c.name === selectedVariables[1]);
      
      if (numCol && catCol) {
        const values = numCol.values.filter((x: number) => !isNaN(x) && x !== null);
        const shapiro = stats.shapiroWilk(values);
        const isNormal = shapiro.pValue > 0.05;
        const groupCount = new Set(catCol.values).size;
        
        const assumptions: TestRecommendation['assumptions'] = [
          { name: 'التوزيع الطبيعي', met: isNormal, details: `p = ${shapiro.pValue.toFixed(3)}` },
          { name: 'عدد المجموعات >= 3', met: groupCount >= 3, details: `عدد المجموعات = ${groupCount}` }
        ];

        if (isNormal) {
          rec = {
            testId: 'anova',
            testName: 'One-Way ANOVA',
            testNameAr: 'تحليل التباين الأحادي',
            confidence: 92,
            reasons: [
              'البيانات تتبع التوزيع الطبيعي',
              `مقارنة ${groupCount} مجموعات`,
              'اختبار معلمي قوي للمقارنات المتعددة'
            ],
            warnings: groupCount > 5 ? ['قد تحتاج اختبارات post-hoc لتحديد الفروق'] : [],
            assumptions
          };
        } else {
          rec = {
            testId: 'kruskal',
            testName: 'Kruskal-Wallis Test',
            testNameAr: 'اختبار كروسكال-واليس',
            confidence: 88,
            reasons: [
              'البيانات لا تتبع التوزيع الطبيعي',
              'بديل لامعلمي لـ ANOVA',
              'مناسب لمقارنة ثلاث مجموعات أو أكثر'
            ],
            warnings: [],
            assumptions
          };
        }
      }
    }

    if (researchQuestion === 'correlation' && selectedVariables.length >= 2) {
      const col1 = dataset.columns.find(c => c.name === selectedVariables[0]);
      const col2 = dataset.columns.find(c => c.name === selectedVariables[1]);
      
      if (col1 && col2) {
        const shapiro1 = stats.shapiroWilk(col1.values.filter((x: number) => !isNaN(x)));
        const shapiro2 = stats.shapiroWilk(col2.values.filter((x: number) => !isNaN(x)));
        const bothNormal = shapiro1.pValue > 0.05 && shapiro2.pValue > 0.05;
        
        const assumptions: TestRecommendation['assumptions'] = [
          { name: 'التوزيع الطبيعي للمتغير الأول', met: shapiro1.pValue > 0.05, details: `p = ${shapiro1.pValue.toFixed(3)}` },
          { name: 'التوزيع الطبيعي للمتغير الثاني', met: shapiro2.pValue > 0.05, details: `p = ${shapiro2.pValue.toFixed(3)}` }
        ];

        if (bothNormal) {
          rec = {
            testId: 'pearson',
            testName: 'Pearson Correlation',
            testNameAr: 'معامل ارتباط بيرسون',
            confidence: 95,
            reasons: [
              'كلا المتغيرين يتبعان التوزيع الطبيعي',
              'قياس العلاقة الخطية بين المتغيرين',
              'الاختبار الأقوى للعلاقات الخطية'
            ],
            warnings: ['يفترض وجود علاقة خطية'],
            assumptions
          };
        } else {
          rec = {
            testId: 'spearman',
            testName: 'Spearman Correlation',
            testNameAr: 'معامل ارتباط سبيرمان',
            confidence: 90,
            reasons: [
              'أحد المتغيرين أو كلاهما لا يتبع التوزيع الطبيعي',
              'يقيس العلاقة الرتبية (monotonic)',
              'أقل حساسية للقيم المتطرفة'
            ],
            warnings: [],
            assumptions
          };
        }
      }
    }

    if (researchQuestion === 'before-after' && selectedVariables.length >= 2) {
      const col1 = dataset.columns.find(c => c.name === selectedVariables[0]);
      const col2 = dataset.columns.find(c => c.name === selectedVariables[1]);
      
      if (col1 && col2) {
        const differences = col1.values.map((x: number, i: number) => x - col2.values[i]).filter((x: number) => !isNaN(x));
        const shapiro = stats.shapiroWilk(differences);
        const isNormal = shapiro.pValue > 0.05;
        
        const assumptions: TestRecommendation['assumptions'] = [
          { name: 'التوزيع الطبيعي للفروق', met: isNormal, details: `p = ${shapiro.pValue.toFixed(3)}` },
          { name: 'البيانات مزاوجة', met: true, details: 'كل ملاحظة قبل مرتبطة بملاحظة بعد' }
        ];

        if (isNormal) {
          rec = {
            testId: 'ttest-paired',
            testName: 'Paired Samples T-Test',
            testNameAr: 'اختبار T للعينات المزاوجة',
            confidence: 94,
            reasons: [
              'الفروق تتبع التوزيع الطبيعي',
              'مقارنة قياسين متكررين لنفس الأفراد',
              'أقوى من اختبار العينات المستقلة'
            ],
            warnings: [],
            assumptions
          };
        } else {
          rec = {
            testId: 'wilcoxon',
            testName: 'Wilcoxon Signed-Rank Test',
            testNameAr: 'اختبار ويلكوكسون',
            confidence: 88,
            reasons: [
              'الفروق لا تتبع التوزيع الطبيعي',
              'بديل لامعلمي لاختبار T المزاوج',
              'مناسب للبيانات المزاوجة'
            ],
            warnings: [],
            assumptions
          };
        }
      }
    }

    if (researchQuestion === 'independence' && selectedVariables.length >= 2) {
      const col1 = dataset.columns.find(c => c.name === selectedVariables[0]);
      const col2 = dataset.columns.find(c => c.name === selectedVariables[1]);
      
      if (col1 && col2) {
        const n = dataset.rowCount;
        
        rec = {
          testId: 'chi-square',
          testName: 'Chi-Square Test of Independence',
          testNameAr: 'اختبار مربع كاي للاستقلالية',
          confidence: 90,
          reasons: [
            'اختبار العلاقة بين متغيرين فئويين',
            'تحديد ما إذا كان المتغيران مستقلين',
            'الاختبار الأشهر للبيانات الفئوية'
          ],
          warnings: n < 50 ? ['حجم العينة صغير، قد تحتاج اختبار فيشر الدقيق'] : [],
          assumptions: [
            { name: 'التكرار المتوقع >= 5', met: n >= 50, details: `حجم العينة = ${n}` },
            { name: 'استقلالية الملاحظات', met: true, details: 'كل ملاحظة مستقلة' }
          ]
        };
      }
    }

    if (researchQuestion === 'normality' && selectedVariables.length >= 1) {
      const col = dataset.columns.find(c => c.name === selectedVariables[0]);
      
      if (col) {
        const n = col.values.filter((x: number) => !isNaN(x) && x !== null).length;
        
        rec = {
          testId: 'shapiro',
          testName: 'Shapiro-Wilk Test',
          testNameAr: 'اختبار شابيرو-ويلك',
          confidence: 95,
          reasons: [
            'الاختبار الأقوى للتوزيع الطبيعي',
            'مناسب لأحجام العينات الصغيرة والمتوسطة',
            'يحدد ما إذا كانت البيانات طبيعية'
          ],
          warnings: n > 5000 ? ['حجم العينة كبير جداً، الاختبار قد يكون حساساً جداً'] : [],
          assumptions: [
            { name: 'حجم العينة مناسب', met: n >= 3 && n <= 5000, details: `حجم العينة = ${n}` }
          ]
        };
      }
    }

    setRecommendation(rec);
  };

  if (!dataset) {
    return (
      <div className="flex flex-col items-center justify-center h-96 text-gray-500">
        <Sparkles className="w-16 h-16 mb-4 opacity-50" />
        <p className="text-lg">قم بتحميل البيانات أولاً</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-purple-500" />
          اختيار الاختبار الذكي
        </h2>
        <p className="text-gray-600 mt-1">دع النظام يقترح الاختبار الأنسب بناءً على بياناتك وسؤالك البحثي</p>
      </div>

      {/* Research Question */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-blue-500" />
          ما هو سؤالك البحثي؟
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {researchQuestions.map(q => (
            <button
              key={q.id}
              onClick={() => {
                setResearchQuestion(q.id);
                setSelectedVariables([]);
                setRecommendation(null);
              }}
              className={cn(
                'p-4 rounded-lg border text-right transition-all',
                researchQuestion === q.id
                  ? 'border-purple-500 bg-purple-50 shadow-lg'
                  : 'border-gray-200 hover:border-gray-300'
              )}
            >
              <p className="font-medium text-gray-800">{q.label}</p>
              <p className="text-sm text-gray-600 mt-1">{q.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Variable Selection */}
      <div className="bg-white rounded-xl p-6 border border-gray-200">
        <h3 className="font-semibold text-gray-800 mb-4">اختر المتغيرات</h3>
        
        {(researchQuestion === 'compare-two' || researchQuestion === 'compare-many') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">المتغير الرقمي (التابع):</label>
              <select
                value={selectedVariables[0] || ''}
                onChange={(e) => setSelectedVariables([e.target.value, selectedVariables[1] || ''])}
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="">اختر</option>
                {numericColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">المتغير الفئوي (المجموعات):</label>
              <select
                value={selectedVariables[1] || ''}
                onChange={(e) => setSelectedVariables([selectedVariables[0] || '', e.target.value])}
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="">اختر</option>
                {categoricalColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {(researchQuestion === 'correlation' || researchQuestion === 'before-after') && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">المتغير الأول:</label>
              <select
                value={selectedVariables[0] || ''}
                onChange={(e) => setSelectedVariables([e.target.value, selectedVariables[1] || ''])}
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="">اختر</option>
                {numericColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">المتغير الثاني:</label>
              <select
                value={selectedVariables[1] || ''}
                onChange={(e) => setSelectedVariables([selectedVariables[0] || '', e.target.value])}
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="">اختر</option>
                {numericColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {researchQuestion === 'independence' && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-600 mb-2">المتغير الأول:</label>
              <select
                value={selectedVariables[0] || ''}
                onChange={(e) => setSelectedVariables([e.target.value, selectedVariables[1] || ''])}
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="">اختر</option>
                {categoricalColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-2">المتغير الثاني:</label>
              <select
                value={selectedVariables[1] || ''}
                onChange={(e) => setSelectedVariables([selectedVariables[0] || '', e.target.value])}
                className="w-full p-3 border border-gray-200 rounded-lg"
              >
                <option value="">اختر</option>
                {categoricalColumns.map(col => (
                  <option key={col.name} value={col.name}>{col.name}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {researchQuestion === 'normality' && (
          <div>
            <label className="block text-sm text-gray-600 mb-2">المتغير:</label>
            <select
              value={selectedVariables[0] || ''}
              onChange={(e) => setSelectedVariables([e.target.value])}
              className="w-full p-3 border border-gray-200 rounded-lg"
            >
              <option value="">اختر</option>
              {numericColumns.map(col => (
                <option key={col.name} value={col.name}>{col.name}</option>
              ))}
            </select>
          </div>
        )}

        <button
          onClick={analyzeAndRecommend}
          disabled={selectedVariables.filter(Boolean).length === 0}
          className={cn(
            'mt-6 w-full py-3 rounded-lg font-medium transition-all flex items-center justify-center gap-2',
            selectedVariables.filter(Boolean).length > 0
              ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-700 hover:to-pink-700 shadow-lg'
              : 'bg-gray-200 text-gray-500 cursor-not-allowed'
          )}
        >
          <Sparkles className="w-5 h-5" />
          تحليل واقتراح الاختبار
        </button>
      </div>

      {/* Recommendation */}
      {recommendation && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-purple-900 flex items-center gap-2">
              <Lightbulb className="w-6 h-6 text-yellow-500" />
              الاختبار المقترح
            </h3>
            <span className="px-3 py-1 bg-purple-600 text-white rounded-full text-sm font-medium">
              ثقة {recommendation.confidence}%
            </span>
          </div>
          
          <div className="bg-white rounded-lg p-4 mb-4">
            <h4 className="text-lg font-bold text-gray-900">{recommendation.testNameAr}</h4>
            <p className="text-gray-600">{recommendation.testName}</p>
          </div>

          <div className="space-y-4">
            {/* Reasons */}
            <div>
              <h5 className="font-semibold text-purple-800 mb-2">لماذا هذا الاختبار؟</h5>
              <ul className="space-y-1">
                {recommendation.reasons.map((r, i) => (
                  <li key={i} className="flex items-center gap-2 text-gray-700">
                    <CheckCircle className="w-4 h-4 text-green-500" />
                    {r}
                  </li>
                ))}
              </ul>
            </div>

            {/* Warnings */}
            {recommendation.warnings.length > 0 && (
              <div>
                <h5 className="font-semibold text-amber-700 mb-2">تحذيرات</h5>
                <ul className="space-y-1">
                  {recommendation.warnings.map((w, i) => (
                    <li key={i} className="flex items-center gap-2 text-amber-700">
                      <AlertTriangle className="w-4 h-4" />
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Assumptions */}
            <div>
              <h5 className="font-semibold text-purple-800 mb-2">فحص الافتراضات</h5>
              <div className="space-y-2">
                {recommendation.assumptions.map((a, i) => (
                  <div key={i} className={cn(
                    'flex items-center justify-between p-3 rounded-lg',
                    a.met ? 'bg-green-50' : 'bg-red-50'
                  )}>
                    <div className="flex items-center gap-2">
                      {a.met ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                      )}
                      <span className={a.met ? 'text-green-800' : 'text-red-800'}>{a.name}</span>
                    </div>
                    <span className="text-sm text-gray-600">{a.details}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <button className="mt-4 w-full py-3 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 transition-all flex items-center justify-center gap-2">
            <ArrowRight className="w-5 h-5" />
            تطبيق هذا الاختبار
          </button>
        </div>
      )}
    </div>
  );
}
