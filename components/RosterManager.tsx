'use client';

import { useState, useMemo } from 'react';
import {
  UserPlus,
  Upload,
  Search,
  Trash2,
  UserCheck,
  UserX,
  RotateCcw,
  Download,
} from 'lucide-react';
import type { Student } from '@/lib/types';

interface RosterManagerProps {
  students: Student[];
  onAddStudent: (name: string) => void;
  onTogglePresent: (id: string) => void;
  onRemoveStudent: (id: string) => void;
  onMarkAllPresent: () => void;
  onLoadSample: () => void;
  onClearAll: () => void;
  onOpenImport: () => void;
}

export default function RosterManager({
  students,
  onAddStudent,
  onTogglePresent,
  onRemoveStudent,
  onMarkAllPresent,
  onLoadSample,
  onClearAll,
  onOpenImport,
}: RosterManagerProps) {
  const [newName, setNewName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const presentCount = useMemo(
    () => students.filter((s) => s.present).length,
    [students]
  );
  const absentCount = students.length - presentCount;

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return students;
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) || String(s.seatNo).includes(q)
    );
  }, [students, searchQuery]);

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newName.trim();
    if (!trimmed) return;
    onAddStudent(trimmed);
    setNewName('');
  };

  const handleExportRosterCsv = () => {
    if (students.length === 0) return;
    const header = '座號,姓名,出席狀態';
    const rows = students.map(
      (s) =>
        `${s.seatNo},"${s.name.replace(/"/g, '""')}",${s.present ? '出席' : '請假'}`
    );
    const csv = `\uFEFF${header}\n${rows.join('\n')}`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '班級學生名單.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Summary & Primary Controls Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            班級學生名單
          </h1>
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-slate-500 tabular-nums">
            <span>共 {students.length} 位學生</span>
            <span aria-hidden="true">·</span>
            <span className="text-emerald-700 font-medium">
              出席參與 {presentCount} 位
            </span>
            {absentCount > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-700 font-medium">
                  請假暫停 {absentCount} 位
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenImport}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#0369A1] whitespace-nowrap"
          >
            <Upload className="h-4 w-4" />
            上傳 CSV / 貼上名單
          </button>
          <button
            type="button"
            onClick={onLoadSample}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
          >
            載入範例班級
          </button>
          <button
            type="button"
            disabled={students.length === 0}
            onClick={handleExportRosterCsv}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-45 whitespace-nowrap"
          >
            <Download className="h-4 w-4" />
            匯出 CSV
          </button>
        </div>
      </div>

      {/* Add Student + Search Toolbar */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        <form
          onSubmit={handleAddSubmit}
          className="flex gap-2.5 lg:col-span-6"
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="輸入單一學生姓名快速新增…"
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 focus:outline-none"
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 transition-colors hover:border-[#0284C7] hover:text-[#0284C7] disabled:opacity-45 whitespace-nowrap"
          >
            <UserPlus className="h-4 w-4" />
            新增
          </button>
        </form>

        <div className="flex flex-wrap items-center justify-end gap-3 lg:col-span-6">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute top-1/2 left-3.5 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜尋座號或姓名"
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-4 pl-10 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0284C7] focus:ring-2 focus:ring-[#0284C7]/15 focus:outline-none"
            />
          </div>

          {absentCount > 0 && (
            <button
              type="button"
              onClick={onMarkAllPresent}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              <RotateCcw className="h-4 w-4" />
              全班恢復出席
            </button>
          )}

          {students.length > 0 &&
            (confirmClear ? (
              <div className="inline-flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    onClearAll();
                    setConfirmClear(false);
                  }}
                  className="rounded-xl bg-red-600 px-3.5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-red-700 whitespace-nowrap"
                >
                  確認清空
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50 whitespace-nowrap"
                >
                  取消
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-red-600 transition-colors hover:border-red-200 hover:bg-red-50 whitespace-nowrap"
              >
                <Trash2 className="h-4 w-4" />
                清空名單
              </button>
            ))}
        </div>
      </div>

      {/* Student Roster Grid */}
      {students.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-base font-medium text-slate-800">
            目前尚未建立學生名單
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            請上傳 CSV 檔案、直接貼上學生姓名，或載入範例班級開始體驗。
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenImport}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0284C7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0369A1]"
            >
              <Upload className="h-4 w-4" />
              立即匯入名單
            </button>
            <button
              type="button"
              onClick={onLoadSample}
              className="rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              載入 24 人範例班級
            </button>
          </div>
        </div>
      ) : filteredStudents.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center text-sm text-slate-500">
          找不到符合「{searchQuery}」的學生。
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50/70 px-6 py-3 text-xs text-slate-500">
            提示：點擊學生右側的狀態按鈕可切換「請假」，請假學生將自動不參與抽籤與分組。
          </div>
          <div className="grid grid-cols-1 divide-y divide-slate-100 sm:grid-cols-2 sm:divide-y-0 lg:grid-cols-3 xl:grid-cols-4">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className={`flex items-center justify-between gap-3 border-b border-r border-slate-100 px-5 py-3.5 transition-colors ${
                  student.present ? 'bg-white hover:bg-slate-50/70' : 'bg-slate-50/90'
                }`}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="font-mono text-xs font-medium text-slate-400 tabular-nums">
                    {String(student.seatNo).padStart(2, '0')}
                  </span>
                  <span
                    className={`truncate text-sm font-medium ${
                      student.present
                        ? 'text-slate-900'
                        : 'text-slate-400 line-through'
                    }`}
                  >
                    {student.name}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => onTogglePresent(student.id)}
                    title={student.present ? '標記為請假' : '恢復出席'}
                    className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      student.present
                        ? 'text-emerald-700 hover:bg-emerald-50'
                        : 'text-amber-700 hover:bg-amber-50'
                    }`}
                  >
                    {student.present ? (
                      <>
                        <UserCheck className="h-3.5 w-3.5" />
                        出席
                      </>
                    ) : (
                      <>
                        <UserX className="h-3.5 w-3.5" />
                        請假
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => onRemoveStudent(student.id)}
                    aria-label={`移除 ${student.name}`}
                    className="flex h-8 w-8 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
