'use client';

import { useState, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Upload,
  ClipboardPaste,
  FileSpreadsheet,
  AlertCircle,
  Check,
  Users,
} from 'lucide-react';
import {
  parseCsvContent,
  parsePastedNames,
  SAMPLE_STUDENT_NAMES,
  type ParsedCsvTable,
} from '@/lib/roster';

interface RosterImportModalProps {
  isOpen: boolean;
  existingCount: number;
  onClose: () => void;
  onImport: (names: string[], mode: 'replace' | 'append') => void;
}

export default function RosterImportModal({
  isOpen,
  existingCount,
  onClose,
  onImport,
}: RosterImportModalProps) {
  const [sourceTab, setSourceTab] = useState<'csv' | 'paste'>('csv');
  const [pasteText, setPasteText] = useState('');
  const [deduplicate, setDeduplicate] = useState(true);
  const [importMode, setImportMode] = useState<'replace' | 'append'>('replace');
  const [isDragging, setIsDragging] = useState(false);
  const [csvFileName, setCsvFileName] = useState<string | null>(null);
  const [csvError, setCsvError] = useState<string | null>(null);
  const [parsedCsv, setParsedCsv] = useState<ParsedCsvTable | null>(null);
  const [selectedCol, setSelectedCol] = useState(0);
  const [skipFirstRow, setSkipFirstRow] = useState(true);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const handleFile = async (file: File) => {
    setCsvError(null);
    if (!file.name.match(/\.(csv|txt|tsv)$/i)) {
      setCsvError('請上傳 .csv 或 .txt 格式的名單檔案。');
      return;
    }

    try {
      const buffer = await file.arrayBuffer();
      // Try UTF-8 strictly first; fallback to Big5 for legacy Taiwan Excel CSV exports
      let decoded = '';
      try {
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        decoded = utf8Decoder.decode(buffer);
      } catch {
        try {
          const big5Decoder = new TextDecoder('big5');
          decoded = big5Decoder.decode(buffer);
        } catch {
          decoded = new TextDecoder('utf-8').decode(buffer);
        }
      }

      const table = parseCsvContent(decoded);
      if (table.rows.length === 0 && table.headers.length === 0) {
        setCsvError('檔案內容為空，請確認檔案內有學生姓名資料。');
        return;
      }

      setCsvFileName(file.name);
      setParsedCsv(table);
      setSelectedCol(table.suggestedNameCol);
      setSkipFirstRow(table.hasHeaderRow);
    } catch {
      setCsvError('無法讀取檔案內容，請確認檔案編碼為 UTF-8 或 Big5。');
    }
  };

  const previewResult = useMemo(() => {
    if (sourceTab === 'paste') {
      return parsePastedNames(pasteText, deduplicate);
    }

    if (!parsedCsv) {
      return { names: [] as string[], duplicateCount: 0 };
    }

    const effectiveRows =
      skipFirstRow && parsedCsv.hasHeaderRow
        ? parsedCsv.rows
        : skipFirstRow && !parsedCsv.hasHeaderRow
          ? parsedCsv.rows.slice(1)
          : !skipFirstRow && parsedCsv.hasHeaderRow
            ? [parsedCsv.headers, ...parsedCsv.rows]
            : parsedCsv.rows;

    const extracted = effectiveRows
      .map((row) => (row[selectedCol] ?? '').trim())
      .filter((name) => name.length > 0);

    if (!deduplicate) {
      return { names: extracted, duplicateCount: 0 };
    }

    const seen = new Set<string>();
    const unique: string[] = [];
    let duplicateCount = 0;

    for (const name of extracted) {
      if (seen.has(name)) {
        duplicateCount += 1;
      } else {
        seen.add(name);
        unique.push(name);
      }
    }

    return { names: unique, duplicateCount };
  }, [sourceTab, pasteText, deduplicate, parsedCsv, selectedCol, skipFirstRow]);

  const handleConfirm = () => {
    if (previewResult.names.length === 0) return;
    onImport(previewResult.names, importMode);
    onClose();
  };

  const handleFillSamplePaste = () => {
    setSourceTab('paste');
    setPasteText(SAMPLE_STUDENT_NAMES.join('\n'));
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="import-modal-title"
        >
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.16 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[2px]"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: 8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div>
                <h2
                  id="import-modal-title"
                  className="text-lg font-semibold text-slate-900"
                >
                  匯入學生名單
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  上傳班級 CSV 檔案，或直接貼上姓名清單（每行一位或以逗號分隔）
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="關閉視窗"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Source Switcher */}
            <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-1 rounded-lg bg-slate-200/70 p-1">
                  <button
                    type="button"
                    onClick={() => setSourceTab('csv')}
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      sourceTab === 'csv'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Upload className="h-4 w-4" />
                    上傳 CSV 檔案
                  </button>
                  <button
                    type="button"
                    onClick={() => setSourceTab('paste')}
                    className={`inline-flex items-center gap-2 whitespace-nowrap rounded-md px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      sourceTab === 'paste'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ClipboardPaste className="h-4 w-4" />
                    直接貼上名單
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleFillSamplePaste}
                  className="text-sm font-medium text-[#0284C7] transition-colors hover:text-[#0369A1] whitespace-nowrap"
                >
                  填入 24 人範例名單
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
              {sourceTab === 'csv' ? (
                <div className="space-y-4">
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setIsDragging(true);
                    }}
                    onDragLeave={() => setIsDragging(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setIsDragging(false);
                      const file = e.dataTransfer.files?.[0];
                      if (file) void handleFile(file);
                    }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 text-center transition-colors ${
                      isDragging
                        ? 'border-[#0284C7] bg-[#0284C7]/5'
                        : 'border-slate-300 bg-slate-50/50 hover:border-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".csv,.txt,.tsv,text/csv,text/plain"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleFile(file);
                        e.target.value = '';
                      }}
                    />
                    <FileSpreadsheet className="h-9 w-9 text-[#0284C7]" />
                    <p className="mt-3 text-sm font-semibold text-slate-900">
                      {csvFileName
                        ? `已選擇檔案：${csvFileName}`
                        : '點擊選擇檔案，或將 CSV 檔案拖曳至此處'}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      支援 Excel 匯出的 CSV（UTF-8 與 Big5 編碼），自動偵測姓名欄位
                    </p>
                  </div>

                  {csvError && (
                    <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                      <span>{csvError}</span>
                    </div>
                  )}

                  {parsedCsv && parsedCsv.headers.length > 0 && (
                    <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <label
                            htmlFor="csv-col-select"
                            className="text-sm font-medium text-slate-700 whitespace-nowrap"
                          >
                            姓名所在欄位：
                          </label>
                          <select
                            id="csv-col-select"
                            value={selectedCol}
                            onChange={(e) => setSelectedCol(Number(e.target.value))}
                            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-900 focus:border-[#0284C7] focus:outline-none"
                          >
                            {parsedCsv.headers.map((header, idx) => (
                              <option key={`${header}-${idx}`} value={idx}>
                                第 {idx + 1} 欄：{header}
                              </option>
                            ))}
                          </select>
                        </div>

                        <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                          <input
                            type="checkbox"
                            checked={skipFirstRow}
                            onChange={(e) => setSkipFirstRow(e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 accent-[#0284C7]"
                          />
                          首列為標題列（略過第一列）
                        </label>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  <label
                    htmlFor="paste-roster-textarea"
                    className="block text-sm font-medium text-slate-700"
                  >
                    貼上或輸入學生姓名
                  </label>
                  <textarea
                    id="paste-roster-textarea"
                    rows={8}
                    value={pasteText}
                    onChange={(e) => setPasteText(e.target.value)}
                    placeholder={'陳柏翰\n林怡君\n黃冠宇\n張雅婷\n\n（也可直接從 Excel 複製整欄貼上，或以逗號、頓號分隔）'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 focus:outline-none"
                  />
                </div>
              )}

              {/* Import Options */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-4">
                <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={deduplicate}
                    onChange={(e) => setDeduplicate(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#0284C7]"
                  />
                  自動過濾重複姓名
                </label>

                {existingCount > 0 && (
                  <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
                    <button
                      type="button"
                      onClick={() => setImportMode('replace')}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        importMode === 'replace'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      取代現有名單
                    </button>
                    <button
                      type="button"
                      onClick={() => setImportMode('append')}
                      className={`whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                        importMode === 'append'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      附加到現有名單
                    </button>
                  </div>
                )}
              </div>

              {/* Live Preview */}
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-600">
                  <div className="flex items-center gap-2 font-medium text-slate-800">
                    <Users className="h-4 w-4 text-[#0284C7]" />
                    <span className="tabular-nums">
                      預覽結果：共偵測到 {previewResult.names.length} 位學生
                    </span>
                  </div>
                  {previewResult.duplicateCount > 0 && (
                    <span className="text-amber-700 tabular-nums">
                      已自動略過 {previewResult.duplicateCount} 筆重複資料
                    </span>
                  )}
                </div>

                {previewResult.names.length > 0 ? (
                  <div className="mt-3 max-h-36 overflow-y-auto text-sm leading-7 text-slate-700">
                    {previewResult.names.slice(0, 60).map((name, idx) => (
                      <span key={`${name}-${idx}`} className="inline-block mr-3">
                        <span className="mr-1 font-mono text-xs text-slate-400 tabular-nums">
                          {String(idx + 1).padStart(2, '0')}
                        </span>
                        {name}
                      </span>
                    ))}
                    {previewResult.names.length > 60 && (
                      <span className="text-xs text-slate-500">
                        …另包含 {previewResult.names.length - 60} 位學生
                      </span>
                    )}
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-slate-400">
                    尚未解析到任何學生姓名，請上傳檔案或輸入名單。
                  </p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 border-t border-slate-200 bg-slate-50/60 px-6 py-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
              >
                取消
              </button>
              <button
                type="button"
                disabled={previewResult.names.length === 0}
                onClick={handleConfirm}
                className="inline-flex items-center gap-2 rounded-lg bg-[#0284C7] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0369A1] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
              >
                <Check className="h-4 w-4" />
                確認匯入（{previewResult.names.length} 人）
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
