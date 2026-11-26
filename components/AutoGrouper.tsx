'use client';

import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  Shuffle,
  Minus,
  Plus,
  LayoutGrid,
  CircleDot,
  Copy,
  Check,
  Download,
  ArrowLeftRight,
  Upload,
  Pencil,
} from 'lucide-react';
import type {
  Student,
  StudentGroup,
  RemainderStrategy,
  GroupVisualMode,
  SoundProfile,
} from '@/lib/types';
import {
  describeGroupDistribution,
  formatGroupsAsCsv,
  formatGroupsAsText,
} from '@/lib/roster';
import { playGroupShuffle, playSwapPop } from '@/lib/sound';

interface AutoGrouperProps {
  students: Student[];
  groups: StudentGroup[];
  groupSize: number;
  remainderStrategy: RemainderStrategy;
  soundProfile: SoundProfile;
  onChangeGroupSize: (size: number) => void;
  onChangeRemainderStrategy: (strategy: RemainderStrategy) => void;
  onGenerateGroups: () => void;
  onSwapStudents: (
    fromGroupId: string,
    fromStudentId: string,
    toGroupId: string,
    toStudentId: string
  ) => void;
  onRenameGroup: (groupId: string, title: string) => void;
  onOpenImport: () => void;
}

const GROUP_PALETTE = [
  {
    stripe: 'bg-[#0284C7]',
    tableBorder: 'border-[#0284C7]/35',
    tableBg: 'bg-[#0284C7]/[0.06]',
    avatarBg: 'bg-[#0284C7]/12 text-[#0369A1]',
    labelText: 'text-[#0369A1]',
  },
  {
    stripe: 'bg-[#059669]',
    tableBorder: 'border-[#059669]/35',
    tableBg: 'bg-[#059669]/[0.06]',
    avatarBg: 'bg-[#059669]/12 text-[#047857]',
    labelText: 'text-[#047857]',
  },
  {
    stripe: 'bg-[#D97706]',
    tableBorder: 'border-[#D97706]/35',
    tableBg: 'bg-[#D97706]/[0.06]',
    avatarBg: 'bg-[#D97706]/12 text-[#B45309]',
    labelText: 'text-[#B45309]',
  },
  {
    stripe: 'bg-[#4F46E5]',
    tableBorder: 'border-[#4F46E5]/35',
    tableBg: 'bg-[#4F46E5]/[0.06]',
    avatarBg: 'bg-[#4F46E5]/12 text-[#4338CA]',
    labelText: 'text-[#4338CA]',
  },
  {
    stripe: 'bg-[#E11D48]',
    tableBorder: 'border-[#E11D48]/35',
    tableBg: 'bg-[#E11D48]/[0.06]',
    avatarBg: 'bg-[#E11D48]/12 text-[#BE123C]',
    labelText: 'text-[#BE123C]',
  },
  {
    stripe: 'bg-[#0D9488]',
    tableBorder: 'border-[#0D9488]/35',
    tableBg: 'bg-[#0D9488]/[0.06]',
    avatarBg: 'bg-[#0D9488]/12 text-[#0F766E]',
    labelText: 'text-[#0F766E]',
  },
  {
    stripe: 'bg-[#7C3AED]',
    tableBorder: 'border-[#7C3AED]/35',
    tableBg: 'bg-[#7C3AED]/[0.06]',
    avatarBg: 'bg-[#7C3AED]/12 text-[#6D28D9]',
    labelText: 'text-[#6D28D9]',
  },
  {
    stripe: 'bg-[#475569]',
    tableBorder: 'border-[#475569]/35',
    tableBg: 'bg-[#475569]/[0.06]',
    avatarBg: 'bg-[#475569]/12 text-[#334155]',
    labelText: 'text-[#334155]',
  },
];

const QUICK_SIZES = [2, 3, 4, 5, 6];

export default function AutoGrouper({
  students,
  groups,
  groupSize,
  remainderStrategy,
  soundProfile,
  onChangeGroupSize,
  onChangeRemainderStrategy,
  onGenerateGroups,
  onSwapStudents,
  onRenameGroup,
  onOpenImport,
}: AutoGrouperProps) {
  const [visualMode, setVisualMode] = useState<GroupVisualMode>('cards');
  const [shuffleSeq, setShuffleSeq] = useState(0);
  const [copied, setCopied] = useState(false);
  const [selectedForSwap, setSelectedForSwap] = useState<{
    groupId: string;
    groupTitle: string;
    student: Student;
  } | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const presentCount = useMemo(
    () => students.filter((s) => s.present).length,
    [students]
  );

  const maxSize = Math.max(2, presentCount);

  const distributionPreview = useMemo(
    () => describeGroupDistribution(presentCount, groupSize, remainderStrategy),
    [presentCount, groupSize, remainderStrategy]
  );

  const handleGenerate = () => {
    setSelectedForSwap(null);
    onGenerateGroups();
    setShuffleSeq((s) => s + 1);
    playGroupShuffle(soundProfile);
  };

  const handleStudentClick = (group: StudentGroup, student: Student) => {
    if (!selectedForSwap) {
      setSelectedForSwap({
        groupId: group.id,
        groupTitle: group.title,
        student,
      });
      return;
    }

    if (selectedForSwap.student.id === student.id) {
      setSelectedForSwap(null);
      return;
    }

    onSwapStudents(
      selectedForSwap.groupId,
      selectedForSwap.student.id,
      group.id,
      student.id
    );
    playSwapPop(soundProfile);
    setSelectedForSwap(null);
  };

  const handleCopyText = async () => {
    if (groups.length === 0) return;
    try {
      await navigator.clipboard.writeText(formatGroupsAsText(groups));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard fallback ignored silently
    }
  };

  const handleDownloadCsv = () => {
    if (groups.length === 0) return;
    const csv = formatGroupsAsCsv(groups);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '班級自動分組名單.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const commitRename = (groupId: string) => {
    const trimmed = editingTitle.trim();
    if (trimmed) {
      onRenameGroup(groupId, trimmed);
    }
    setEditingGroupId(null);
  };

  return (
    <div className="space-y-6">
      {/* Control Deck */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
                自動隨機分組
              </h1>
              <p className="mt-1 text-sm text-slate-500 tabular-nums">
                出席 {presentCount} 人 · {distributionPreview}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-6">
              {/* Group Size Stepper & Presets */}
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-500">
                  設定每組人數
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-xl border border-slate-200 bg-slate-50/70 p-1">
                    <button
                      type="button"
                      disabled={groupSize <= 2}
                      onClick={() =>
                        onChangeGroupSize(Math.max(2, groupSize - 1))
                      }
                      aria-label="減少每組人數"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-35"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3.25rem] text-center font-mono text-base font-semibold text-slate-900 tabular-nums">
                      {groupSize} 人
                    </span>
                    <button
                      type="button"
                      disabled={groupSize >= maxSize}
                      onClick={() =>
                        onChangeGroupSize(Math.min(maxSize, groupSize + 1))
                      }
                      aria-label="增加每組人數"
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-white hover:text-slate-900 disabled:opacity-35"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                    {QUICK_SIZES.map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        disabled={presentCount > 0 && preset > presentCount}
                        onClick={() => onChangeGroupSize(preset)}
                        className={`rounded-lg px-2.5 py-1.5 font-mono text-xs font-medium transition-colors tabular-nums whitespace-nowrap ${
                          groupSize === preset
                            ? 'bg-white text-slate-900 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 disabled:opacity-35'
                        }`}
                      >
                        {preset}人
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Remainder Strategy */}
              <div className="space-y-1.5">
                <span className="block text-xs font-medium text-slate-500">
                  人數未整除時
                </span>
                <div className="inline-flex items-center gap-1 rounded-xl bg-slate-100 p-1">
                  <button
                    type="button"
                    onClick={() => onChangeRemainderStrategy('balanced')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      remainderStrategy === 'balanced'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    平均分散各組
                  </button>
                  <button
                    type="button"
                    onClick={() => onChangeRemainderStrategy('separate')}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                      remainderStrategy === 'separate'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    獨立成最後一組
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Primary Shuffle + Export Actions */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              disabled={presentCount === 0}
              onClick={handleGenerate}
              className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0284C7] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#0369A1] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
            >
              <Shuffle className="h-4 w-4" />
              {groups.length > 0 ? '重新隨機分組' : '產生視覺化分組'}
            </button>

            {groups.length > 0 && (
              <>
                <button
                  type="button"
                  onClick={() => void handleCopyText()}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-600" />
                      已複製文字
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      複製結果
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDownloadCsv}
                  className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
                >
                  <Download className="h-4 w-4" />
                  匯出 CSV
                </button>
              </>
            )}
          </div>
        </div>
      </section>

      {/* View Switcher & Swap Guidance Bar */}
      {presentCount > 0 && groups.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
            <button
              type="button"
              onClick={() => setVisualMode('cards')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                visualMode === 'cards'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              分組卡片牆
            </button>
            <button
              type="button"
              onClick={() => setVisualMode('tables')}
              className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                visualMode === 'tables'
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <CircleDot className="h-4 w-4" />
              教室圓桌圖
            </button>
          </div>

          {selectedForSwap ? (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-[#0284C7]/35 bg-[#0284C7]/[0.06] px-4 py-2 text-sm text-[#0369A1]">
              <ArrowLeftRight className="h-4 w-4 shrink-0" />
              <span>
                已選取「{selectedForSwap.student.name}」（
                {selectedForSwap.groupTitle}），請點擊另一位學生進行組別互換
              </span>
              <button
                type="button"
                onClick={() => setSelectedForSwap(null)}
                className="font-semibold underline underline-offset-2 hover:text-slate-900"
              >
                取消選取
              </button>
            </div>
          ) : (
            <p className="text-xs text-slate-500">
              微調提示：點擊任意兩位學生可手動交換組別；點擊組名可自訂小隊名稱。
            </p>
          )}
        </div>
      )}

      {/* Visualized Group Output */}
      {presentCount === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-800">
            目前沒有可參與分組的學生名單
          </p>
          <p className="mt-1.5 text-sm text-slate-500">
            請先匯入 CSV 或貼上學生姓名，系統即可自動完成視覺化分組。
          </p>
          <button
            type="button"
            onClick={onOpenImport}
            className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0284C7] px-5 py-2.5 text-sm font-medium text-white hover:bg-[#0369A1]"
          >
            <Upload className="h-4 w-4" />
            匯入學生名單
          </button>
        </div>
      ) : groups.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
          <p className="text-base font-semibold text-slate-800">
            準備進行視覺化分組
          </p>
          <p className="mt-1.5 text-sm text-slate-500 tabular-nums">
            已設定每組 {groupSize} 人（{distributionPreview}）
          </p>
          <button
            type="button"
            onClick={handleGenerate}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#0284C7] px-6 py-3 text-sm font-semibold text-white hover:bg-[#0369A1]"
          >
            <Shuffle className="h-4 w-4" />
            立即隨機分組
          </button>
        </div>
      ) : visualMode === 'cards' ? (
        /* Visual Mode 1: Group Cards Wall */
        <div
          key={`cards-${shuffleSeq}`}
          className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3"
        >
          {groups.map((group, idx) => {
            const palette = GROUP_PALETTE[group.colorIndex % GROUP_PALETTE.length];
            return (
              <motion.article
                key={group.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.24,
                  delay: Math.min(idx * 0.04, 0.3),
                  ease: [0.16, 1, 0.3, 1],
                }}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
              >
                {/* Clean top accent bar */}
                <div className={`h-1.5 w-full ${palette.stripe}`} />

                <div className="p-5">
                  {/* Group Header */}
                  <div className="flex items-center justify-between gap-2 pb-4 border-b border-slate-100">
                    {editingGroupId === group.id ? (
                      <input
                        type="text"
                        autoFocus
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={() => commitRename(group.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitRename(group.id);
                          if (e.key === 'Escape') setEditingGroupId(null);
                        }}
                        className="w-40 rounded-md border border-[#0284C7] px-2 py-0.5 text-base font-semibold text-slate-900 focus:outline-none"
                      />
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingGroupId(group.id);
                          setEditingTitle(group.title);
                        }}
                        className="group/title inline-flex items-center gap-1.5 text-left text-base font-semibold text-slate-900 hover:text-[#0284C7]"
                      >
                        <span>{group.title}</span>
                        <Pencil className="h-3.5 w-3.5 text-slate-300 transition-colors group-hover/title:text-[#0284C7]" />
                      </button>
                    )}

                    <span
                      className={`font-mono text-xs font-semibold tabular-nums ${palette.labelText}`}
                    >
                      {group.members.length} 人
                    </span>
                  </div>

                  {/* Member Rows */}
                  <ul className="mt-3 space-y-2">
                    {group.members.map((member) => {
                      const isSelected =
                        selectedForSwap?.student.id === member.id;
                      return (
                        <li key={member.id}>
                          <button
                            type="button"
                            onClick={() => handleStudentClick(group, member)}
                            className={`flex w-full items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-colors ${
                              isSelected
                                ? 'border-[#0284C7] bg-[#0284C7]/10 ring-2 ring-[#0284C7]/20'
                                : 'border-slate-100 bg-slate-50/70 hover:border-slate-300 hover:bg-white'
                            }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${palette.avatarBg}`}
                              >
                                {member.name.slice(0, 1)}
                              </span>
                              <span className="truncate text-sm font-medium text-slate-900">
                                {member.name}
                              </span>
                            </div>
                            <span className="font-mono text-xs text-slate-400 tabular-nums">
                              {String(member.seatNo).padStart(2, '0')}
                            </span>
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </motion.article>
            );
          })}
        </div>
      ) : (
        /* Visual Mode 2: Classroom Spatial Table Map */
        <div
          key={`tables-${shuffleSeq}`}
          className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8"
        >
          {/* Classroom Front Orientation Bar */}
          <div className="mx-auto mb-10 flex max-w-md flex-col items-center">
            <div className="h-2 w-full rounded-full bg-slate-800" />
            <span className="mt-2 text-xs font-medium tracking-wider text-slate-500">
              講台與黑板方向
            </span>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 xl:grid-cols-3">
            {groups.map((group, idx) => {
              const palette =
                GROUP_PALETTE[group.colorIndex % GROUP_PALETTE.length];
              const count = group.members.length;
              const radius = count <= 4 ? 104 : count <= 6 ? 114 : 122;

              return (
                <motion.div
                  key={group.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{
                    duration: 0.25,
                    delay: Math.min(idx * 0.045, 0.35),
                    ease: [0.16, 1, 0.3, 1],
                  }}
                  className="flex flex-col items-center justify-center rounded-2xl border border-slate-100 bg-slate-50/50 p-4"
                >
                  <div className="relative flex h-[290px] w-full max-w-[320px] items-center justify-center">
                    {/* Visual Round Discussion Table */}
                    <div
                      className={`flex h-28 w-28 flex-col items-center justify-center rounded-full border-2 text-center shadow-xs ${palette.tableBorder} ${palette.tableBg}`}
                    >
                      <span className="max-w-[92px] truncate text-sm font-bold text-slate-900">
                        {group.title}
                      </span>
                      <span
                        className={`mt-0.5 font-mono text-xs font-medium tabular-nums ${palette.labelText}`}
                      >
                        {count} 人桌
                      </span>
                    </div>

                    {/* Radial Student Seat Nodes */}
                    {group.members.map((member, mIdx) => {
                      const angle =
                        (mIdx / Math.max(1, count)) * Math.PI * 2 - Math.PI / 2;
                      const x = Math.cos(angle) * radius;
                      const y = Math.sin(angle) * (radius * 0.88);
                      const isSelected =
                        selectedForSwap?.student.id === member.id;

                      return (
                        <button
                          key={member.id}
                          type="button"
                          onClick={() => handleStudentClick(group, member)}
                          style={{
                            transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`,
                          }}
                          className={`absolute flex flex-col items-center justify-center rounded-xl border px-3 py-1.5 text-center shadow-xs transition-colors ${
                            isSelected
                              ? 'z-20 border-[#0284C7] bg-[#0284C7] text-white'
                              : 'z-10 border-slate-200 bg-white text-slate-900 hover:border-[#0284C7] hover:text-[#0369A1]'
                          }`}
                        >
                          <span className="max-w-[80px] truncate text-xs font-semibold leading-tight">
                            {member.name}
                          </span>
                          <span
                            className={`font-mono text-[10px] tabular-nums ${
                              isSelected ? 'text-sky-100' : 'text-slate-400'
                            }`}
                          >
                            {String(member.seatNo).padStart(2, '0')}號
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
