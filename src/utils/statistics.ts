// Statistical utility functions - Enhanced Version
import jStat from 'jstat';

// ============================================
// DESCRIPTIVE STATISTICS
// ============================================

export function mean(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  if (valid.length === 0) return 0;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

export function median(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  return valid.length % 2 !== 0 ? valid[mid] : (valid[mid - 1] + valid[mid]) / 2;
}

export function mode(arr: number[]): number[] {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  if (valid.length === 0) return [];
  
  const counts: Record<number, number> = {};
  let maxCount = 0;
  
  valid.forEach(val => {
    counts[val] = (counts[val] || 0) + 1;
    maxCount = Math.max(maxCount, counts[val]);
  });
  
  return Object.entries(counts)
    .filter(([, count]) => count === maxCount)
    .map(([val]) => parseFloat(val));
}

export function variance(arr: number[], sample = true): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  if (valid.length < 2) return 0;
  
  const m = mean(valid);
  const squaredDiffs = valid.map(x => Math.pow(x - m, 2));
  const divisor = sample ? valid.length - 1 : valid.length;
  return squaredDiffs.reduce((a, b) => a + b, 0) / divisor;
}

export function std(arr: number[], sample = true): number {
  return Math.sqrt(variance(arr, sample));
}

export function skewness(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  if (valid.length < 3) return 0;
  
  const m = mean(valid);
  const s = std(valid);
  if (s === 0) return 0;
  
  const n = valid.length;
  const sum = valid.reduce((acc, x) => acc + Math.pow((x - m) / s, 3), 0);
  return (n / ((n - 1) * (n - 2))) * sum;
}

export function kurtosis(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  if (valid.length < 4) return 0;
  
  const m = mean(valid);
  const s = std(valid);
  if (s === 0) return 0;
  
  const n = valid.length;
  const sum = valid.reduce((acc, x) => acc + Math.pow((x - m) / s, 4), 0);
  const excess = ((n * (n + 1)) / ((n - 1) * (n - 2) * (n - 3))) * sum;
  return excess - (3 * Math.pow(n - 1, 2)) / ((n - 2) * (n - 3));
}

export function percentile(arr: number[], p: number): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  
  const index = (p / 100) * (valid.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  
  if (lower === upper) return valid[lower];
  return valid[lower] + (index - lower) * (valid[upper] - valid[lower]);
}

export function quartiles(arr: number[]): { q1: number; q2: number; q3: number } {
  return {
    q1: percentile(arr, 25),
    q2: percentile(arr, 50),
    q3: percentile(arr, 75)
  };
}

export function iqr(arr: number[]): number {
  const q = quartiles(arr);
  return q.q3 - q.q1;
}

export function sem(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  return std(valid) / Math.sqrt(valid.length);
}

export function coefficientOfVariation(arr: number[]): number {
  const m = mean(arr);
  if (m === 0) return 0;
  return (std(arr) / m) * 100;
}

export function geometricMean(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined && x > 0);
  if (valid.length === 0) return 0;
  const logSum = valid.reduce((acc, x) => acc + Math.log(x), 0);
  return Math.exp(logSum / valid.length);
}

export function harmonicMean(arr: number[]): number {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined && x !== 0);
  if (valid.length === 0) return 0;
  const reciprocalSum = valid.reduce((acc, x) => acc + 1 / x, 0);
  return valid.length / reciprocalSum;
}

// ============================================
// PARAMETRIC TESTS
// ============================================

// Z-Test for one sample
export function zTestOneSample(arr: number[], mu: number = 0, sigma: number): { z: number; pValue: number } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  const n = valid.length;
  const m = mean(valid);
  const z = (m - mu) / (sigma / Math.sqrt(n));
  const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));
  return { z, pValue };
}

// One-sample T-Test
export function tTestOneSample(arr: number[], mu: number = 0): { t: number; pValue: number; df: number; ci: { lower: number; upper: number } } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  const n = valid.length;
  const m = mean(valid);
  const s = std(valid);
  const se = s / Math.sqrt(n);
  const t = (m - mu) / se;
  const df = n - 1;
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
  
  const tCritical = jStat.studentt.inv(0.975, df);
  const ci = {
    lower: m - tCritical * se,
    upper: m + tCritical * se
  };
  
  return { t, pValue, df, ci };
}

// Independent samples T-Test (Welch's)
export function tTestIndependent(arr1: number[], arr2: number[]): { t: number; pValue: number; df: number; meanDiff: number; ci: { lower: number; upper: number } } {
  const valid1 = arr1.filter(x => !isNaN(x) && x !== null && x !== undefined);
  const valid2 = arr2.filter(x => !isNaN(x) && x !== null && x !== undefined);
  
  const n1 = valid1.length;
  const n2 = valid2.length;
  const m1 = mean(valid1);
  const m2 = mean(valid2);
  const v1 = variance(valid1);
  const v2 = variance(valid2);
  
  const meanDiff = m1 - m2;
  const pooledSE = Math.sqrt((v1 / n1) + (v2 / n2));
  const t = meanDiff / pooledSE;
  
  // Welch's degrees of freedom
  const df = Math.pow((v1 / n1) + (v2 / n2), 2) /
    (Math.pow(v1 / n1, 2) / (n1 - 1) + Math.pow(v2 / n2, 2) / (n2 - 1));
  
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), df));
  
  const tCritical = jStat.studentt.inv(0.975, df);
  const ci = {
    lower: meanDiff - tCritical * pooledSE,
    upper: meanDiff + tCritical * pooledSE
  };
  
  return { t, pValue, df, meanDiff, ci };
}

// Paired samples T-Test
export function tTestPaired(arr1: number[], arr2: number[]): { t: number; pValue: number; df: number; meanDiff: number; ci: { lower: number; upper: number } } {
  const differences = arr1.map((x, i) => x - arr2[i]).filter(x => !isNaN(x));
  const result = tTestOneSample(differences, 0);
  return {
    ...result,
    meanDiff: mean(differences)
  };
}

// One-way ANOVA
export function anovaOneWay(groups: number[][]): { 
  f: number; pValue: number; dfBetween: number; dfWithin: number;
  ssBetween: number; ssWithin: number; ssTotal: number;
  msBetween: number; msWithin: number;
  etaSquared: number; omegaSquared: number;
} {
  const validGroups = groups.map(g => g.filter(x => !isNaN(x) && x !== null && x !== undefined));
  const k = validGroups.length;
  const allValues = validGroups.flat();
  const grandMean = mean(allValues);
  const n = allValues.length;
  
  // Between-group sum of squares
  let ssBetween = 0;
  validGroups.forEach(g => {
    const groupMean = mean(g);
    ssBetween += g.length * Math.pow(groupMean - grandMean, 2);
  });
  
  // Within-group sum of squares
  let ssWithin = 0;
  validGroups.forEach(g => {
    const groupMean = mean(g);
    g.forEach(x => {
      ssWithin += Math.pow(x - groupMean, 2);
    });
  });
  
  const ssTotal = ssBetween + ssWithin;
  const dfBetween = k - 1;
  const dfWithin = n - k;
  
  const msBetween = ssBetween / dfBetween;
  const msWithin = ssWithin / dfWithin;
  
  const f = msBetween / msWithin;
  const pValue = 1 - jStat.centralF.cdf(f, dfBetween, dfWithin);
  
  // Effect sizes
  const etaSquared = ssBetween / ssTotal;
  const omegaSquared = (ssBetween - dfBetween * msWithin) / (ssTotal + msWithin);
  
  return { f, pValue, dfBetween, dfWithin, ssBetween, ssWithin, ssTotal, msBetween, msWithin, etaSquared, omegaSquared };
}

// Two-way ANOVA (simplified)
export function anovaTwoWay(data: { value: number; factor1: string; factor2: string }[]): {
  fFactor1: number; pFactor1: number;
  fFactor2: number; pFactor2: number;
  fInteraction: number; pInteraction: number;
} {
  const factor1Levels = [...new Set(data.map(d => d.factor1))];
  const factor2Levels = [...new Set(data.map(d => d.factor2))];
  
  const grandMean = mean(data.map(d => d.value));
  const n = data.length;
  
  // Factor 1 means
  const factor1Means: Record<string, number> = {};
  factor1Levels.forEach(level => {
    const values = data.filter(d => d.factor1 === level).map(d => d.value);
    factor1Means[level] = mean(values);
  });
  
  // Factor 2 means
  const factor2Means: Record<string, number> = {};
  factor2Levels.forEach(level => {
    const values = data.filter(d => d.factor2 === level).map(d => d.value);
    factor2Means[level] = mean(values);
  });
  
  // Cell means
  const cellMeans: Record<string, number> = {};
  factor1Levels.forEach(f1 => {
    factor2Levels.forEach(f2 => {
      const values = data.filter(d => d.factor1 === f1 && d.factor2 === f2).map(d => d.value);
      cellMeans[`${f1}_${f2}`] = mean(values);
    });
  });
  
  // Sum of squares
  let ssFactor1 = 0;
  factor1Levels.forEach(level => {
    const ni = data.filter(d => d.factor1 === level).length;
    ssFactor1 += ni * Math.pow(factor1Means[level] - grandMean, 2);
  });
  
  let ssFactor2 = 0;
  factor2Levels.forEach(level => {
    const ni = data.filter(d => d.factor2 === level).length;
    ssFactor2 += ni * Math.pow(factor2Means[level] - grandMean, 2);
  });
  
  let ssWithin = 0;
  data.forEach(d => {
    const cellMean = cellMeans[`${d.factor1}_${d.factor2}`];
    ssWithin += Math.pow(d.value - cellMean, 2);
  });
  
  const ssTotal = data.reduce((acc, d) => acc + Math.pow(d.value - grandMean, 2), 0);
  const ssInteraction = ssTotal - ssFactor1 - ssFactor2 - ssWithin;
  
  const dfFactor1 = factor1Levels.length - 1;
  const dfFactor2 = factor2Levels.length - 1;
  const dfInteraction = dfFactor1 * dfFactor2;
  const dfWithin = n - factor1Levels.length * factor2Levels.length;
  
  const msFactor1 = ssFactor1 / dfFactor1;
  const msFactor2 = ssFactor2 / dfFactor2;
  const msInteraction = ssInteraction / dfInteraction;
  const msWithin = ssWithin / dfWithin;
  
  const fFactor1 = msFactor1 / msWithin;
  const fFactor2 = msFactor2 / msWithin;
  const fInteraction = msInteraction / msWithin;
  
  return {
    fFactor1, pFactor1: 1 - jStat.centralF.cdf(fFactor1, dfFactor1, dfWithin),
    fFactor2, pFactor2: 1 - jStat.centralF.cdf(fFactor2, dfFactor2, dfWithin),
    fInteraction, pInteraction: 1 - jStat.centralF.cdf(fInteraction, dfInteraction, dfWithin)
  };
}

// ============================================
// NON-PARAMETRIC TESTS
// ============================================

// Mann-Whitney U Test
export function mannWhitneyU(x: number[], y: number[]): { u: number; z: number; pValue: number; r: number } {
  const validX = x.filter(v => !isNaN(v) && v !== null && v !== undefined);
  const validY = y.filter(v => !isNaN(v) && v !== null && v !== undefined);
  
  const combined = [
    ...validX.map(v => ({ v, group: 'x' })),
    ...validY.map(v => ({ v, group: 'y' }))
  ].sort((a, b) => a.v - b.v);
  
  // Assign ranks with tie handling
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].v === combined[i].v) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) (combined[k] as any).rank = avgRank;
    i = j;
  }
  
  const r1 = combined.filter(c => c.group === 'x').reduce((acc, c) => acc + (c as any).rank, 0);
  const n1 = validX.length;
  const n2 = validY.length;
  
  const u1 = r1 - (n1 * (n1 + 1)) / 2;
  const u2 = n1 * n2 - u1;
  const u = Math.min(u1, u2);
  
  // Normal approximation with continuity correction
  const mu = (n1 * n2) / 2;
  const sigma = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
  const z = (u - mu) / sigma;
  const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));
  
  // Effect size r
  const r = z / Math.sqrt(n1 + n2);
  
  return { u, z, pValue, r: Math.abs(r) };
}

// Wilcoxon Signed-Rank Test
export function wilcoxonSignedRank(x: number[], y: number[]): { w: number; z: number; pValue: number; r: number } {
  const differences = x.map((xi, i) => xi - y[i]).filter(d => !isNaN(d) && d !== 0);
  const n = differences.length;
  
  const ranked = differences.map(d => ({ d, abs: Math.abs(d), sign: d > 0 ? 1 : -1 }))
    .sort((a, b) => a.abs - b.abs);
  
  // Assign ranks
  let i = 0;
  while (i < ranked.length) {
    let j = i;
    while (j < ranked.length && ranked[j].abs === ranked[i].abs) j++;
    const avgRank = (i + j + 1) / 2;
    for (let k = i; k < j; k++) (ranked[k] as any).rank = avgRank;
    i = j;
  }
  
  const wPlus = ranked.filter(r => r.sign > 0).reduce((acc, r) => acc + (r as any).rank, 0);
  const wMinus = ranked.filter(r => r.sign < 0).reduce((acc, r) => acc + (r as any).rank, 0);
  const w = Math.min(wPlus, wMinus);
  
  // Normal approximation
  const mu = n * (n + 1) / 4;
  const sigma = Math.sqrt(n * (n + 1) * (2 * n + 1) / 24);
  const z = (w - mu) / sigma;
  const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));
  
  const r = z / Math.sqrt(n);
  
  return { w, z, pValue, r: Math.abs(r) };
}

// Kruskal-Wallis Test
export function kruskalWallis(groups: number[][]): { h: number; df: number; pValue: number; etaSquared: number } {
  const validGroups = groups.map(g => g.filter(x => !isNaN(x) && x !== null && x !== undefined));
  const k = validGroups.length;
  
  const combined: { value: number; group: number; rank?: number }[] = [];
  validGroups.forEach((g, gi) => {
    g.forEach(v => combined.push({ value: v, group: gi }));
  });
  
  combined.sort((a, b) => a.value - b.value);
  
  // Assign ranks
  let i = 0;
  while (i < combined.length) {
    let j = i;
    while (j < combined.length && combined[j].value === combined[i].value) j++;
    const avgRank = (i + j + 1) / 2;
    for (let l = i; l < j; l++) combined[l].rank = avgRank;
    i = j;
  }
  
  const N = combined.length;
  const groupRankSums = validGroups.map((_, gi) => {
    return combined.filter(c => c.group === gi).reduce((acc, c) => acc + (c.rank || 0), 0);
  });
  
  let h = 0;
  validGroups.forEach((g, gi) => {
    h += Math.pow(groupRankSums[gi], 2) / g.length;
  });
  h = (12 / (N * (N + 1))) * h - 3 * (N + 1);
  
  const df = k - 1;
  const pValue = 1 - jStat.chisquare.cdf(h, df);
  
  // Effect size
  const etaSquared = (h - k + 1) / (N - k);
  
  return { h, df, pValue, etaSquared: Math.max(0, etaSquared) };
}

// Friedman Test
export function friedmanTest(groups: number[][]): { chi2: number; df: number; pValue: number } {
  const k = groups.length; // number of conditions
  const n = groups[0].length; // number of subjects
  
  // Rank within each subject
  const ranks: number[][] = [];
  for (let i = 0; i < n; i++) {
    const values = groups.map(g => g[i]);
    const sorted = values.map((v, j) => ({ v, j })).sort((a, b) => a.v - b.v);
    const r = new Array(k);
    sorted.forEach((s, rank) => r[s.j] = rank + 1);
    ranks.push(r);
  }
  
  // Sum of ranks for each condition
  const rankSums = groups.map((_, gi) => ranks.reduce((acc, r) => acc + r[gi], 0));
  
  const chi2 = (12 / (n * k * (k + 1))) * rankSums.reduce((acc, rs) => acc + rs * rs, 0) - 3 * n * (k + 1);
  const df = k - 1;
  const pValue = 1 - jStat.chisquare.cdf(chi2, df);
  
  return { chi2, df, pValue };
}

// Sign Test
export function signTest(x: number[], y: number[]): { nPos: number; nNeg: number; pValue: number } {
  const differences = x.map((xi, i) => xi - y[i]).filter(d => !isNaN(d) && d !== 0);
  const nPos = differences.filter(d => d > 0).length;
  const nNeg = differences.filter(d => d < 0).length;
  const n = nPos + nNeg;
  
  // Binomial test
  const smaller = Math.min(nPos, nNeg);
  let pValue = 0;
  for (let k = 0; k <= smaller; k++) {
    pValue += binomialCoefficient(n, k) * Math.pow(0.5, n);
  }
  pValue *= 2; // Two-tailed
  
  return { nPos, nNeg, pValue: Math.min(1, pValue) };
}

function binomialCoefficient(n: number, k: number): number {
  if (k < 0 || k > n) return 0;
  if (k === 0 || k === n) return 1;
  let result = 1;
  for (let i = 0; i < k; i++) {
    result = result * (n - i) / (i + 1);
  }
  return result;
}

// ============================================
// CORRELATION TESTS
// ============================================

export function pearsonCorrelation(x: number[], y: number[]): { r: number; pValue: number; t: number; ci: { lower: number; upper: number } } {
  const pairs = x.map((xi, i) => [xi, y[i]])
    .filter(([a, b]) => !isNaN(a) && !isNaN(b) && a !== null && b !== null);
  
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  
  const n = pairs.length;
  if (n < 3) return { r: 0, pValue: 1, t: 0, ci: { lower: -1, upper: 1 } };
  
  const mx = mean(xs);
  const my = mean(ys);
  
  let num = 0, denX = 0, denY = 0;
  pairs.forEach(([xi, yi]) => {
    num += (xi - mx) * (yi - my);
    denX += Math.pow(xi - mx, 2);
    denY += Math.pow(yi - my, 2);
  });
  
  const r = num / Math.sqrt(denX * denY);
  const t = r * Math.sqrt((n - 2) / (1 - r * r));
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 2));
  
  // Fisher transformation for CI
  const zr = 0.5 * Math.log((1 + r) / (1 - r));
  const se = 1 / Math.sqrt(n - 3);
  const zLower = zr - 1.96 * se;
  const zUpper = zr + 1.96 * se;
  const ci = {
    lower: (Math.exp(2 * zLower) - 1) / (Math.exp(2 * zLower) + 1),
    upper: (Math.exp(2 * zUpper) - 1) / (Math.exp(2 * zUpper) + 1)
  };
  
  return { r: isNaN(r) ? 0 : r, pValue: isNaN(pValue) ? 1 : pValue, t, ci };
}

export function spearmanCorrelation(x: number[], y: number[]): { rho: number; pValue: number; t: number } {
  const pairs = x.map((xi, i) => [xi, y[i]])
    .filter(([a, b]) => !isNaN(a) && !isNaN(b) && a !== null && b !== null);
  
  if (pairs.length < 3) return { rho: 0, pValue: 1, t: 0 };
  
  const rank = (arr: number[]): number[] => {
    const sorted = [...arr].map((v, i) => ({ v, i })).sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    
    let i = 0;
    while (i < sorted.length) {
      let j = i;
      while (j < sorted.length && sorted[j].v === sorted[i].v) j++;
      const avgRank = (i + j + 1) / 2;
      for (let k = i; k < j; k++) ranks[sorted[k].i] = avgRank;
      i = j;
    }
    return ranks;
  };
  
  const xRanks = rank(pairs.map(p => p[0]));
  const yRanks = rank(pairs.map(p => p[1]));
  
  const result = pearsonCorrelation(xRanks, yRanks);
  return { rho: result.r, pValue: result.pValue, t: result.t };
}

export function kendallTau(x: number[], y: number[]): { tau: number; pValue: number; z: number } {
  const pairs = x.map((xi, i) => [xi, y[i]])
    .filter(([a, b]) => !isNaN(a) && !isNaN(b) && a !== null && b !== null);
  
  const n = pairs.length;
  if (n < 3) return { tau: 0, pValue: 1, z: 0 };
  
  let concordant = 0;
  let discordant = 0;
  
  for (let i = 0; i < n - 1; i++) {
    for (let j = i + 1; j < n; j++) {
      const xDiff = pairs[i][0] - pairs[j][0];
      const yDiff = pairs[i][1] - pairs[j][1];
      
      if (xDiff * yDiff > 0) concordant++;
      else if (xDiff * yDiff < 0) discordant++;
    }
  }
  
  const tau = (concordant - discordant) / (n * (n - 1) / 2);
  
  // Normal approximation
  const sigma = Math.sqrt((2 * (2 * n + 5)) / (9 * n * (n - 1)));
  const z = tau / sigma;
  const pValue = 2 * (1 - jStat.normal.cdf(Math.abs(z), 0, 1));
  
  return { tau, pValue, z };
}

// Partial correlation
export function partialCorrelation(x: number[], y: number[], z: number[]): { r: number; pValue: number } {
  const rxy = pearsonCorrelation(x, y).r;
  const rxz = pearsonCorrelation(x, z).r;
  const ryz = pearsonCorrelation(y, z).r;
  
  const r = (rxy - rxz * ryz) / (Math.sqrt(1 - rxz * rxz) * Math.sqrt(1 - ryz * ryz));
  
  const n = x.filter((xi, i) => !isNaN(xi) && !isNaN(y[i]) && !isNaN(z[i])).length;
  const t = r * Math.sqrt((n - 3) / (1 - r * r));
  const pValue = 2 * (1 - jStat.studentt.cdf(Math.abs(t), n - 3));
  
  return { r: isNaN(r) ? 0 : r, pValue: isNaN(pValue) ? 1 : pValue };
}

// ============================================
// NORMALITY TESTS
// ============================================

export function shapiroWilk(arr: number[]): { w: number; pValue: number } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined).sort((a, b) => a - b);
  const n = valid.length;
  
  if (n < 3 || n > 5000) return { w: 0, pValue: 1 };
  
  // Simplified approximation using skewness and kurtosis
  const skew = Math.abs(skewness(valid));
  const kurt = Math.abs(kurtosis(valid));
  
  // W approximation
  const w = 1 - 0.5 * (skew * skew / 6 + kurt * kurt / 24);
  const pValue = Math.max(0.001, Math.min(0.999, 1 - Math.pow(1 - Math.max(0, w), n / 10)));
  
  return { w: Math.max(0, Math.min(1, w)), pValue };
}

export function kolmogorovSmirnov(arr: number[]): { d: number; pValue: number } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined).sort((a, b) => a - b);
  const n = valid.length;
  
  if (n < 3) return { d: 0, pValue: 1 };
  
  const m = mean(valid);
  const s = std(valid);
  
  let dPlus = 0;
  let dMinus = 0;
  
  valid.forEach((x, i) => {
    const empirical = (i + 1) / n;
    const theoretical = jStat.normal.cdf(x, m, s);
    dPlus = Math.max(dPlus, empirical - theoretical);
    dMinus = Math.max(dMinus, theoretical - (i / n));
  });
  
  const d = Math.max(dPlus, dMinus);
  
  // Approximation for p-value
  const sqrtN = Math.sqrt(n);
  const lambda = (sqrtN + 0.12 + 0.11 / sqrtN) * d;
  let pValue = 0;
  for (let j = 1; j <= 100; j++) {
    pValue += 2 * Math.pow(-1, j + 1) * Math.exp(-2 * j * j * lambda * lambda);
  }
  
  return { d, pValue: Math.max(0, Math.min(1, pValue)) };
}

export function andersonDarling(arr: number[]): { a2: number; pValue: number } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined).sort((a, b) => a - b);
  const n = valid.length;
  
  if (n < 3) return { a2: 0, pValue: 1 };
  
  const m = mean(valid);
  const s = std(valid);
  
  let sum = 0;
  valid.forEach((x, i) => {
    const z = (x - m) / s;
    const F = jStat.normal.cdf(z, 0, 1);
    const clampedF = Math.max(0.00001, Math.min(0.99999, F));
    sum += (2 * (i + 1) - 1) * (Math.log(clampedF) + Math.log(1 - jStat.normal.cdf((valid[n - 1 - i] - m) / s, 0, 1)));
  });
  
  const a2 = -n - sum / n;
  const a2Star = a2 * (1 + 0.75 / n + 2.25 / (n * n));
  
  // Critical values approximation
  let pValue;
  if (a2Star >= 0.6) pValue = Math.exp(1.2937 - 5.709 * a2Star + 0.0186 * a2Star * a2Star);
  else if (a2Star >= 0.34) pValue = Math.exp(0.9177 - 4.279 * a2Star - 1.38 * a2Star * a2Star);
  else if (a2Star >= 0.2) pValue = 1 - Math.exp(-8.318 + 42.796 * a2Star - 59.938 * a2Star * a2Star);
  else pValue = 1 - Math.exp(-13.436 + 101.14 * a2Star - 223.73 * a2Star * a2Star);
  
  return { a2, pValue: Math.max(0, Math.min(1, pValue)) };
}

// Levene's test for homogeneity of variance
export function leveneTest(groups: number[][]): { w: number; pValue: number; df1: number; df2: number } {
  const validGroups = groups.map(group => group.filter(x => !isNaN(x) && x !== null && x !== undefined));
  const k = validGroups.length;
  const N = validGroups.reduce((acc, grp) => acc + grp.length, 0);
  
  // Calculate deviations from group medians
  const deviations = validGroups.map(grp => {
    const med = median(grp);
    return grp.map(x => Math.abs(x - med));
  });
  
  const allDeviations = deviations.flat();
  const grandMean = mean(allDeviations);
  
  const groupMeans = deviations.map(devs => mean(devs));
  
  let ssBetween = 0;
  deviations.forEach((dev, i) => {
    ssBetween += dev.length * Math.pow(groupMeans[i] - grandMean, 2);
  });
  
  let ssWithin = 0;
  deviations.forEach((devGroup, i) => {
    devGroup.forEach(x => {
      ssWithin += Math.pow(x - groupMeans[i], 2);
    });
  });
  
  const df1 = k - 1;
  const df2 = N - k;
  
  const msBetween = ssBetween / df1;
  const msWithin = ssWithin / df2;
  
  const w = msBetween / msWithin;
  const pValue = 1 - jStat.centralF.cdf(w, df1, df2);
  
  return { w, pValue, df1, df2 };
}

// ============================================
// INDEPENDENCE TESTS
// ============================================

export function chiSquareTest(observed: number[][]): { chi2: number; pValue: number; df: number; cramersV: number } {
  const rows = observed.length;
  const cols = observed[0].length;
  
  const rowTotals = observed.map(row => row.reduce((a, b) => a + b, 0));
  const colTotals = observed[0].map((_, j) => observed.reduce((acc, row) => acc + row[j], 0));
  const total = rowTotals.reduce((a, b) => a + b, 0);
  
  let chi2 = 0;
  for (let i = 0; i < rows; i++) {
    for (let j = 0; j < cols; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / total;
      if (expected > 0) {
        chi2 += Math.pow(observed[i][j] - expected, 2) / expected;
      }
    }
  }
  
  const df = (rows - 1) * (cols - 1);
  const pValue = 1 - jStat.chisquare.cdf(chi2, df);
  
  const cramersV = Math.sqrt(chi2 / (total * Math.min(rows - 1, cols - 1)));
  
  return { chi2, pValue, df, cramersV };
}

export function chiSquareGoodnessFit(observed: number[], expected: number[]): { chi2: number; pValue: number; df: number } {
  let chi2 = 0;
  for (let i = 0; i < observed.length; i++) {
    if (expected[i] > 0) {
      chi2 += Math.pow(observed[i] - expected[i], 2) / expected[i];
    }
  }
  
  const df = observed.length - 1;
  const pValue = 1 - jStat.chisquare.cdf(chi2, df);
  
  return { chi2, pValue, df };
}

export function fisherExact(table: [[number, number], [number, number]]): { pValue: number; oddsRatio: number } {
  const [[a, b], [c, d]] = table;
  const n = a + b + c + d;
  
  // Hypergeometric probability
  const hypergeom = (a: number, b: number, c: number, d: number): number => {
    return (binomialCoefficient(a + b, a) * binomialCoefficient(c + d, c)) / binomialCoefficient(n, a + c);
  };
  
  const pObserved = hypergeom(a, b, c, d);
  let pValue = 0;
  
  // Sum probabilities of all tables as or more extreme
  const rowSum1 = a + b;
  const colSum1 = a + c;
  
  for (let i = 0; i <= Math.min(rowSum1, colSum1); i++) {
    const j = rowSum1 - i;
    const k = colSum1 - i;
    const l = n - i - j - k;
    if (j >= 0 && k >= 0 && l >= 0) {
      const p = hypergeom(i, j, k, l);
      if (p <= pObserved + 1e-10) {
        pValue += p;
      }
    }
  }
  
  const oddsRatio = (b * c !== 0) ? (a * d) / (b * c) : Infinity;
  
  return { pValue: Math.min(1, pValue), oddsRatio };
}

// McNemar's Test
export function mcNemarTest(table: [[number, number], [number, number]]): { chi2: number; pValue: number } {
  const [[, b], [c, ]] = table;
  
  const chi2 = Math.pow(Math.abs(b - c) - 1, 2) / (b + c);
  const pValue = 1 - jStat.chisquare.cdf(chi2, 1);
  
  return { chi2, pValue };
}

// ============================================
// REGRESSION
// ============================================

export function linearRegression(x: number[], y: number[]): {
  slope: number;
  intercept: number;
  rSquared: number;
  adjustedRSquared: number;
  stdError: number;
  predictions: number[];
  residuals: number[];
  slopeStdError: number;
  interceptStdError: number;
  tSlope: number;
  tIntercept: number;
  pSlope: number;
  pIntercept: number;
} {
  const pairs = x.map((xi, i) => [xi, y[i]])
    .filter(([a, b]) => !isNaN(a) && !isNaN(b) && a !== null && b !== null);
  
  const xs = pairs.map(p => p[0]);
  const ys = pairs.map(p => p[1]);
  const n = pairs.length;
  
  if (n < 2) {
    return { slope: 0, intercept: 0, rSquared: 0, adjustedRSquared: 0, stdError: 0, predictions: [], residuals: [], slopeStdError: 0, interceptStdError: 0, tSlope: 0, tIntercept: 0, pSlope: 1, pIntercept: 1 };
  }
  
  const mx = mean(xs);
  const my = mean(ys);
  
  let ssXY = 0, ssXX = 0, ssYY = 0;
  pairs.forEach(([xi, yi]) => {
    ssXY += (xi - mx) * (yi - my);
    ssXX += Math.pow(xi - mx, 2);
    ssYY += Math.pow(yi - my, 2);
  });
  
  const slope = ssXX !== 0 ? ssXY / ssXX : 0;
  const intercept = my - slope * mx;
  
  const predictions = xs.map(xi => intercept + slope * xi);
  const residuals = ys.map((yi, i) => yi - predictions[i]);
  
  const ssRes = residuals.reduce((acc, r) => acc + r * r, 0);
  const rSquared = ssYY !== 0 ? 1 - ssRes / ssYY : 0;
  const adjustedRSquared = 1 - (1 - rSquared) * (n - 1) / (n - 2);
  const stdError = Math.sqrt(ssRes / (n - 2));
  
  const slopeStdError = stdError / Math.sqrt(ssXX);
  const interceptStdError = stdError * Math.sqrt(1 / n + mx * mx / ssXX);
  
  const tSlope = slope / slopeStdError;
  const tIntercept = intercept / interceptStdError;
  
  const pSlope = 2 * (1 - jStat.studentt.cdf(Math.abs(tSlope), n - 2));
  const pIntercept = 2 * (1 - jStat.studentt.cdf(Math.abs(tIntercept), n - 2));
  
  return { slope, intercept, rSquared, adjustedRSquared, stdError, predictions, residuals, slopeStdError, interceptStdError, tSlope, tIntercept, pSlope, pIntercept };
}

// ============================================
// OUTLIER DETECTION
// ============================================

export function detectOutliersZScore(arr: number[], threshold = 3): { indices: number[]; scores: number[] } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  const m = mean(valid);
  const s = std(valid);
  
  const indices: number[] = [];
  const scores: number[] = [];
  
  arr.forEach((x, i) => {
    if (!isNaN(x) && x !== null && x !== undefined && s !== 0) {
      const z = Math.abs((x - m) / s);
      scores.push(z);
      if (z > threshold) indices.push(i);
    } else {
      scores.push(0);
    }
  });
  
  return { indices, scores };
}

export function detectOutliersIQR(arr: number[], k = 1.5): { indices: number[]; bounds: { lower: number; upper: number } } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  const q = quartiles(valid);
  const iqrVal = q.q3 - q.q1;
  
  const lower = q.q1 - k * iqrVal;
  const upper = q.q3 + k * iqrVal;
  
  const indices: number[] = [];
  arr.forEach((x, i) => {
    if (!isNaN(x) && x !== null && x !== undefined) {
      if (x < lower || x > upper) indices.push(i);
    }
  });
  
  return { indices, bounds: { lower, upper } };
}

export function detectOutliersMAD(arr: number[], threshold = 3.5): { indices: number[]; scores: number[] } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  const med = median(valid);
  const absDeviations = valid.map(x => Math.abs(x - med));
  const mad = median(absDeviations);
  const k = 1.4826; // Consistency constant for normal distribution
  
  const indices: number[] = [];
  const scores: number[] = [];
  
  arr.forEach((x, i) => {
    if (!isNaN(x) && x !== null && x !== undefined && mad !== 0) {
      const modifiedZ = 0.6745 * (x - med) / (k * mad);
      scores.push(Math.abs(modifiedZ));
      if (Math.abs(modifiedZ) > threshold) indices.push(i);
    } else {
      scores.push(0);
    }
  });
  
  return { indices, scores };
}

// ============================================
// EFFECT SIZE
// ============================================

export function cohensD(group1: number[], group2: number[]): number {
  const valid1 = group1.filter(x => !isNaN(x) && x !== null && x !== undefined);
  const valid2 = group2.filter(x => !isNaN(x) && x !== null && x !== undefined);
  
  const m1 = mean(valid1);
  const m2 = mean(valid2);
  const s1 = std(valid1);
  const s2 = std(valid2);
  const n1 = valid1.length;
  const n2 = valid2.length;
  
  const pooledStd = Math.sqrt(((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2));
  
  return pooledStd !== 0 ? (m1 - m2) / pooledStd : 0;
}

export function hedgesG(group1: number[], group2: number[]): number {
  const d = cohensD(group1, group2);
  const n1 = group1.filter(x => !isNaN(x)).length;
  const n2 = group2.filter(x => !isNaN(x)).length;
  const df = n1 + n2 - 2;
  const correction = 1 - 3 / (4 * df - 1);
  return d * correction;
}

export function glasssDelta(treatment: number[], control: number[]): number {
  const mt = mean(treatment.filter(x => !isNaN(x)));
  const mc = mean(control.filter(x => !isNaN(x)));
  const sc = std(control.filter(x => !isNaN(x)));
  return sc !== 0 ? (mt - mc) / sc : 0;
}

// ============================================
// CONFIDENCE INTERVALS
// ============================================

export function confidenceInterval(arr: number[], confidence = 0.95): { lower: number; upper: number; mean: number; margin: number } {
  const valid = arr.filter(x => !isNaN(x) && x !== null && x !== undefined);
  const n = valid.length;
  const m = mean(valid);
  const se = std(valid) / Math.sqrt(n);
  const alpha = 1 - confidence;
  const tCritical = jStat.studentt.inv(1 - alpha / 2, n - 1);
  const margin = tCritical * se;
  
  return {
    lower: m - margin,
    upper: m + margin,
    mean: m,
    margin
  };
}

export function confidenceIntervalProportion(successes: number, n: number, confidence = 0.95): { lower: number; upper: number; proportion: number } {
  const p = successes / n;
  const z = jStat.normal.inv(1 - (1 - confidence) / 2, 0, 1);
  const margin = z * Math.sqrt(p * (1 - p) / n);
  
  return {
    lower: Math.max(0, p - margin),
    upper: Math.min(1, p + margin),
    proportion: p
  };
}

// ============================================
// POWER ANALYSIS
// ============================================

export function statisticalPower(effectSize: number, sampleSize: number, alpha = 0.05): number {
  const criticalZ = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const z = effectSize * Math.sqrt(sampleSize) - criticalZ;
  return jStat.normal.cdf(z, 0, 1);
}

export function sampleSizeCalculation(effectSize: number, power = 0.8, alpha = 0.05): number {
  const zAlpha = jStat.normal.inv(1 - alpha / 2, 0, 1);
  const zBeta = jStat.normal.inv(power, 0, 1);
  return Math.ceil(Math.pow((zAlpha + zBeta) / effectSize, 2));
}

// ============================================
// TIME SERIES
// ============================================

export function movingAverage(arr: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < arr.length; i++) {
    if (i < window - 1) {
      result.push(NaN);
    } else {
      const slice = arr.slice(i - window + 1, i + 1);
      result.push(mean(slice.filter(x => !isNaN(x))));
    }
  }
  return result;
}

export function exponentialSmoothing(arr: number[], alpha: number): number[] {
  const valid = arr.filter(x => !isNaN(x));
  if (valid.length === 0) return [];
  
  const result: number[] = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    result.push(alpha * valid[i] + (1 - alpha) * result[i - 1]);
  }
  return result;
}

export function autocorrelation(arr: number[], lag: number): number {
  const valid = arr.filter(x => !isNaN(x));
  const n = valid.length;
  const m = mean(valid);
  
  let num = 0;
  let den = 0;
  
  for (let i = 0; i < n; i++) {
    den += Math.pow(valid[i] - m, 2);
    if (i >= lag) {
      num += (valid[i] - m) * (valid[i - lag] - m);
    }
  }
  
  return num / den;
}
