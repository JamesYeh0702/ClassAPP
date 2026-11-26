import type { RemainderStrategy, Student, StudentGroup } from './types';

export const SAMPLE_STUDENT_NAMES: string[] = [
  '陳柏翰',
  '林怡君',
  '黃冠宇',
  '張雅婷',
  '李承恩',
  '王品妍',
  '吳宗翰',
  '劉欣怡',
  '蔡宇軒',
  '楊千慧',
  '許哲維',
  '鄭羽彤',
  '謝明宏',
  '郭芷瑄',
  '洪家豪',
  '邱詩涵',
  '曾彥廷',
  '廖婉茹',
  '賴柏宇',
  '徐子晴',
  '周昱翔',
  '葉思穎',
  '蘇建銘',
  '江采潔',
];

export function createStudentsFromNames(names: string[]): Student[] {
  return names
    .map((raw) => raw.trim())
    .filter((name) => name.length > 0)
    .map((name, idx) => ({
      id: `stu-${idx + 1}-${Math.random().toString(36).slice(2, 8)}`,
      seatNo: idx + 1,
      name,
      present: true,
    }));
}

export function createSampleStudents(): Student[] {
  return SAMPLE_STUDENT_NAMES.map((name, idx) => ({
    id: `stu-sample-${idx + 1}`,
    seatNo: idx + 1,
    name,
    present: true,
  }));
}

export function createDeterministicGroups(
  students: Student[],
  groupSize: number
): StudentGroup[] {
  const active = students.filter((s) => s.present);
  if (active.length === 0) return [];
  const safeSize = Math.max(1, Math.min(groupSize, active.length));
  const groups: StudentGroup[] = [];
  for (let i = 0; i < active.length; i += safeSize) {
    const idx = groups.length;
    groups.push({
      id: `grp-init-${idx + 1}`,
      index: idx + 1,
      title: `第 ${idx + 1} 組`,
      colorIndex: idx % 8,
      members: active.slice(i, i + safeSize),
    });
  }
  return groups;
}

/**
 * Parse pasted raw text (newlines, commas, Chinese commas, tabs, semicolons).
 */
export function parsePastedNames(
  rawText: string,
  deduplicate: boolean
): { names: string[]; duplicateCount: number } {
  const cleaned = rawText
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n');

  const tokens = cleaned
    .split(/[\n,，、;\t]+/)
    .map((item) => item.trim().replace(/^["']|["']$/g, '').trim())
    .filter((item) => item.length > 0);

  if (!deduplicate) {
    return { names: tokens, duplicateCount: 0 };
  }

  const seen = new Set<string>();
  const unique: string[] = [];
  let duplicateCount = 0;

  for (const name of tokens) {
    if (seen.has(name)) {
      duplicateCount += 1;
    } else {
      seen.add(name);
      unique.push(name);
    }
  }

  return { names: unique, duplicateCount };
}

export interface ParsedCsvTable {
  headers: string[];
  rows: string[][];
  hasHeaderRow: boolean;
  suggestedNameCol: number;
}

const HEADER_KEYWORDS = [
  '姓名',
  '名字',
  '學生姓名',
  '學生',
  'name',
  'student',
  'full name',
  'student name',
  '座號',
  '編號',
  '學號',
  'no',
  'id',
  '班級',
  'class',
];

const NAME_COLUMN_KEYWORDS = [
  '學生姓名',
  '姓名',
  '名字',
  'student name',
  'full name',
  'name',
  '學生',
];

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if ((ch === ',' || ch === '\t') && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Parse a CSV string into columns and intelligently detect header & name column.
 */
export function parseCsvContent(rawCsv: string): ParsedCsvTable {
  const withoutBom = rawCsv.replace(/^\uFEFF/, '');
  const lines = withoutBom
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [], hasHeaderRow: false, suggestedNameCol: 0 };
  }

  const parsedLines = lines.map(splitCsvLine);
  const colCount = Math.max(...parsedLines.map((row) => row.length));
  const normalized = parsedLines.map((row) => {
    const padded = [...row];
    while (padded.length < colCount) padded.push('');
    return padded;
  });

  const firstRow = normalized[0];
  const looksLikeHeader = firstRow.some((cell) => {
    const lower = cell.toLowerCase();
    return HEADER_KEYWORDS.some((kw) => lower === kw || lower.includes(kw));
  });

  const headers = looksLikeHeader
    ? firstRow.map((h, i) => h || `欄位 ${i + 1}`)
    : firstRow.map((_, i) => `欄位 ${i + 1}`);

  const rows = looksLikeHeader ? normalized.slice(1) : normalized;

  // Detect best column for student names
  let suggestedNameCol = 0;
  if (looksLikeHeader) {
    const exactMatch = headers.findIndex((h) => {
      const lower = h.toLowerCase();
      return NAME_COLUMN_KEYWORDS.some((kw) => lower === kw || lower.includes(kw));
    });
    if (exactMatch >= 0) {
      suggestedNameCol = exactMatch;
    }
  } else if (colCount > 1 && rows.length > 0) {
    // If column 0 is purely numeric (like seat numbers 1, 2, 3), prefer column 1
    const col0NumericRatio =
      rows.filter((r) => /^\d+$/.test(r[0])).length / rows.length;
    if (col0NumericRatio > 0.7) {
      suggestedNameCol = 1;
    }
  }

  return {
    headers,
    rows,
    hasHeaderRow: looksLikeHeader,
    suggestedNameCol,
  };
}

/**
 * Unbiased Fisher-Yates shuffle.
 */
export function shuffleArray<T>(items: T[]): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Generate visual student groups with balanced or strict remainder distribution.
 */
export function generateGroups(
  students: Student[],
  groupSize: number,
  strategy: RemainderStrategy
): StudentGroup[] {
  const activeStudents = students.filter((s) => s.present);
  if (activeStudents.length === 0) return [];

  const safeSize = Math.max(1, Math.min(groupSize, activeStudents.length));
  const shuffled = shuffleArray(activeStudents);

  if (strategy === 'separate' || activeStudents.length <= safeSize) {
    const groups: StudentGroup[] = [];
    for (let i = 0; i < shuffled.length; i += safeSize) {
      const idx = groups.length;
      groups.push({
        id: `grp-${idx + 1}-${Math.random().toString(36).slice(2, 7)}`,
        index: idx + 1,
        title: `第 ${idx + 1} 組`,
        colorIndex: idx % 8,
        members: shuffled.slice(i, i + safeSize),
      });
    }
    return groups;
  }

  // Balanced strategy: avoid tiny leftover groups (like 1 person alone)
  const remainder = shuffled.length % safeSize;
  let numGroups: number;

  if (remainder === 0) {
    numGroups = shuffled.length / safeSize;
  } else {
    // Choose floor(N / size) if distributing remainder keeps groups close to target size,
    // otherwise ceil(N / size) when remainder is at least half the target size.
    const floorGroups = Math.max(1, Math.floor(shuffled.length / safeSize));
    const ceilGroups = Math.ceil(shuffled.length / safeSize);
    numGroups = remainder >= Math.ceil(safeSize / 2) ? ceilGroups : floorGroups;
  }

  const buckets: Student[][] = Array.from({ length: numGroups }, () => []);
  shuffled.forEach((student, idx) => {
    buckets[idx % numGroups].push(student);
  });

  return buckets.map((members, idx) => ({
    id: `grp-${idx + 1}-${Math.random().toString(36).slice(2, 7)}`,
    index: idx + 1,
    title: `第 ${idx + 1} 組`,
    colorIndex: idx % 8,
    members,
  }));
}

export function describeGroupDistribution(
  total: number,
  groupSize: number,
  strategy: RemainderStrategy
): string {
  if (total === 0) return '目前沒有可參與分組的學生';
  const safeSize = Math.max(1, Math.min(groupSize, total));
  const remainder = total % safeSize;

  if (remainder === 0) {
    const count = total / safeSize;
    return `共分成 ${count} 組，每組 ${safeSize} 人`;
  }

  if (strategy === 'separate') {
    const fullGroups = Math.floor(total / safeSize);
    return `共分成 ${fullGroups + 1} 組（${fullGroups} 組各 ${safeSize} 人，最後 1 組 ${remainder} 人）`;
  }

  const floorGroups = Math.max(1, Math.floor(total / safeSize));
  const ceilGroups = Math.ceil(total / safeSize);
  const numGroups = remainder >= Math.ceil(safeSize / 2) ? ceilGroups : floorGroups;
  const baseSize = Math.floor(total / numGroups);
  const extraCount = total % numGroups;

  if (extraCount === 0) {
    return `共分成 ${numGroups} 組，每組 ${baseSize} 人`;
  }
  return `共分成 ${numGroups} 組（${extraCount} 組 ${baseSize + 1} 人、${numGroups - extraCount} 組 ${baseSize} 人）`;
}

export function formatGroupsAsText(groups: StudentGroup[]): string {
  return groups
    .map(
      (g) =>
        `${g.title}（${g.members.length}人）：${g.members
          .map((m) => `${String(m.seatNo).padStart(2, '0')} ${m.name}`)
          .join('、')}`
    )
    .join('\n');
}

export function formatGroupsAsCsv(groups: StudentGroup[]): string {
  const header = '組別,組別名稱,座號,學生姓名';
  const rows: string[] = [];
  groups.forEach((group) => {
    group.members.forEach((member) => {
      const escapedTitle = `"${group.title.replace(/"/g, '""')}"`;
      const escapedName = `"${member.name.replace(/"/g, '""')}"`;
      rows.push(`${group.index},${escapedTitle},${member.seatNo},${escapedName}`);
    });
  });
  return `\uFEFF${header}\n${rows.join('\n')}`;
}
