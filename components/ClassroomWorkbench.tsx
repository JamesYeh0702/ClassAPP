'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Upload } from 'lucide-react';
import type {
  ActiveTab,
  DrawRecord,
  RemainderStrategy,
  SoundProfile,
  Student,
  StudentGroup,
} from '@/lib/types';
import {
  createDeterministicGroups,
  createSampleStudents,
  createStudentsFromNames,
  generateGroups,
} from '@/lib/roster';
import RandomPicker from './RandomPicker';
import AutoGrouper from './AutoGrouper';
import RosterManager from './RosterManager';
import RosterImportModal from './RosterImportModal';

const STORAGE_KEY = 'classroom-workbench-state-v1';

interface PersistedState {
  students: Student[];
  allowRepeat: boolean;
  soundProfile: SoundProfile;
  groupSize: number;
  remainderStrategy: RemainderStrategy;
}

export default function ClassroomWorkbench() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('picker');
  const [students, setStudents] = useState<Student[]>(() =>
    createSampleStudents()
  );
  const [hydrated, setHydrated] = useState(false);

  // Picker state
  const [allowRepeat, setAllowRepeat] = useState(false);
  const [soundProfile, setSoundProfile] = useState<SoundProfile>('marimba');
  const [drawHistory, setDrawHistory] = useState<DrawRecord[]>([]);
  const [drawnStudentIds, setDrawnStudentIds] = useState<string[]>([]);

  // Grouper state
  const [groupSize, setGroupSize] = useState(4);
  const [remainderStrategy, setRemainderStrategy] =
    useState<RemainderStrategy>('balanced');
  const [groups, setGroups] = useState<StudentGroup[]>(() =>
    createDeterministicGroups(createSampleStudents(), 4)
  );

  // Modal state
  const [isImportOpen, setIsImportOpen] = useState(false);

  // Restore saved state from localStorage once on mount
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw) as Partial<PersistedState>;
          if (Array.isArray(parsed.students)) {
            setStudents(parsed.students);
            const restoredSize =
              typeof parsed.groupSize === 'number' && parsed.groupSize >= 2
                ? parsed.groupSize
                : 4;
            const restoredStrategy: RemainderStrategy =
              parsed.remainderStrategy === 'separate' ? 'separate' : 'balanced';
            setGroupSize(restoredSize);
            setRemainderStrategy(restoredStrategy);
            setGroups(
              createDeterministicGroups(parsed.students, restoredSize)
            );
          }
          if (typeof parsed.allowRepeat === 'boolean') {
            setAllowRepeat(parsed.allowRepeat);
          }
          if (
            parsed.soundProfile === 'marimba' ||
            parsed.soundProfile === 'arcade' ||
            parsed.soundProfile === 'muted'
          ) {
            setSoundProfile(parsed.soundProfile);
          }
        }
      } catch {
        // Ignore storage read errors
      } finally {
        setHydrated(true);
      }
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  // Persist core settings & roster to localStorage
  useEffect(() => {
    if (!hydrated) return;
    try {
      const payload: PersistedState = {
        students,
        allowRepeat,
        soundProfile,
        groupSize,
        remainderStrategy,
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, [
    hydrated,
    students,
    allowRepeat,
    soundProfile,
    groupSize,
    remainderStrategy,
  ]);

  const applyNewStudents = useCallback(
    (nextStudents: Student[]) => {
      setStudents(nextStudents);
      setDrawHistory([]);
      setDrawnStudentIds([]);
      setGroups(generateGroups(nextStudents, groupSize, remainderStrategy));
    },
    [groupSize, remainderStrategy]
  );

  const handleImportNames = useCallback(
    (names: string[], mode: 'replace' | 'append') => {
      if (mode === 'replace') {
        applyNewStudents(createStudentsFromNames(names));
      } else {
        const startSeat =
          students.reduce((max, s) => Math.max(max, s.seatNo), 0) + 1;
        const appended: Student[] = names.map((name, idx) => ({
          id: `stu-${startSeat + idx}-${Math.random().toString(36).slice(2, 8)}`,
          seatNo: startSeat + idx,
          name,
          present: true,
        }));
        const merged = [...students, ...appended];
        setStudents(merged);
        setGroups(generateGroups(merged, groupSize, remainderStrategy));
      }
    },
    [students, applyNewStudents, groupSize, remainderStrategy]
  );

  const handleAddStudent = useCallback(
    (name: string) => {
      const nextSeat =
        students.reduce((max, s) => Math.max(max, s.seatNo), 0) + 1;
      const updated: Student[] = [
        ...students,
        {
          id: `stu-${nextSeat}-${Math.random().toString(36).slice(2, 8)}`,
          seatNo: nextSeat,
          name,
          present: true,
        },
      ];
      setStudents(updated);
      setGroups(generateGroups(updated, groupSize, remainderStrategy));
    },
    [students, groupSize, remainderStrategy]
  );

  const handleTogglePresent = useCallback(
    (id: string) => {
      const updated = students.map((s) =>
        s.id === id ? { ...s, present: !s.present } : s
      );
      setStudents(updated);
      setGroups(generateGroups(updated, groupSize, remainderStrategy));
    },
    [students, groupSize, remainderStrategy]
  );

  const handleRemoveStudent = useCallback(
    (id: string) => {
      const updated = students.filter((s) => s.id !== id);
      setStudents(updated);
      setDrawnStudentIds((prev) => prev.filter((sid) => sid !== id));
      setGroups(generateGroups(updated, groupSize, remainderStrategy));
    },
    [students, groupSize, remainderStrategy]
  );

  const handleMarkAllPresent = useCallback(() => {
    const updated = students.map((s) => ({ ...s, present: true }));
    setStudents(updated);
    setGroups(generateGroups(updated, groupSize, remainderStrategy));
  }, [students, groupSize, remainderStrategy]);

  const handleLoadSample = useCallback(() => {
    applyNewStudents(createSampleStudents());
  }, [applyNewStudents]);

  const handleClearAll = useCallback(() => {
    applyNewStudents([]);
  }, [applyNewStudents]);

  const handleRecordDraw = useCallback((student: Student) => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    setDrawHistory((prev) => [
      {
        id: `draw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        studentId: student.id,
        studentName: student.name,
        seatNo: student.seatNo,
        drawnAt: `${hh}:${mm}:${ss}`,
        roundNumber: prev.length + 1,
      },
      ...prev,
    ]);

    setDrawnStudentIds((prev) =>
      prev.includes(student.id) ? prev : [...prev, student.id]
    );
  }, []);

  const handleReturnToPool = useCallback(
    (recordId: string, studentId: string) => {
      setDrawnStudentIds((prev) => prev.filter((id) => id !== studentId));
      setDrawHistory((prev) => prev.filter((r) => r.id !== recordId));
    },
    []
  );

  const handleResetRound = useCallback(() => {
    setDrawHistory([]);
    setDrawnStudentIds([]);
  }, []);

  const handleGenerateGroups = useCallback(() => {
    setGroups(generateGroups(students, groupSize, remainderStrategy));
  }, [students, groupSize, remainderStrategy]);

  const handleChangeGroupSize = useCallback(
    (nextSize: number) => {
      setGroupSize(nextSize);
      setGroups(generateGroups(students, nextSize, remainderStrategy));
    },
    [students, remainderStrategy]
  );

  const handleChangeRemainderStrategy = useCallback(
    (nextStrategy: RemainderStrategy) => {
      setRemainderStrategy(nextStrategy);
      setGroups(generateGroups(students, groupSize, nextStrategy));
    },
    [students, groupSize]
  );

  const handleSwapStudents = useCallback(
    (
      fromGroupId: string,
      fromStudentId: string,
      toGroupId: string,
      toStudentId: string
    ) => {
      setGroups((prev) => {
        const fromGroup = prev.find((g) => g.id === fromGroupId);
        const toGroup = prev.find((g) => g.id === toGroupId);
        if (!fromGroup || !toGroup) return prev;

        const fromStudent = fromGroup.members.find(
          (m) => m.id === fromStudentId
        );
        const toStudent = toGroup.members.find((m) => m.id === toStudentId);
        if (!fromStudent || !toStudent) return prev;

        if (fromGroupId === toGroupId) {
          return prev.map((g) => {
            if (g.id !== fromGroupId) return g;
            return {
              ...g,
              members: g.members.map((m) =>
                m.id === fromStudentId
                  ? toStudent
                  : m.id === toStudentId
                    ? fromStudent
                    : m
              ),
            };
          });
        }

        return prev.map((g) => {
          if (g.id === fromGroupId) {
            return {
              ...g,
              members: g.members.map((m) =>
                m.id === fromStudentId ? toStudent : m
              ),
            };
          }
          if (g.id === toGroupId) {
            return {
              ...g,
              members: g.members.map((m) =>
                m.id === toStudentId ? fromStudent : m
              ),
            };
          }
          return g;
        });
      });
    },
    []
  );

  const handleRenameGroup = useCallback((groupId: string, title: string) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, title } : g))
    );
  }, []);

  const navItems: { id: ActiveTab; label: string }[] = [
    { id: 'picker', label: '隨機抽籤' },
    { id: 'grouper', label: '自動分組' },
    { id: 'roster', label: '學生名單' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC] text-[#0F172A]">
      {/* Top Bar Contract: Single Row, 3 Zones */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3.5 sm:gap-8 sm:px-6 lg:px-8">
          {/* Zone 1: Single Text Brand Wordmark */}
          <button
            type="button"
            onClick={() => setActiveTab('picker')}
            className="text-base sm:text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
          >
            課堂抽籤分組台
          </button>

          {/* Zone 2: Clean Single-Line Text Navigation Links */}
          <nav
            aria-label="主要功能切換"
            className="flex items-center gap-4 sm:gap-8"
          >
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`relative py-1 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                    isActive
                      ? 'text-[#0284C7]'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {item.label}
                  {isActive && (
                    <motion.span
                      layoutId="nav-active-underline"
                      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                      className="absolute right-0 -bottom-[15px] left-0 h-0.5 bg-[#0284C7]"
                    />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: Single Primary Action */}
          <div className="shrink-0">
            <button
              type="button"
              onClick={() => setIsImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[#0369A1] whitespace-nowrap shrink-0"
            >
              <Upload className="h-4 w-4" />
              匯入名單
            </button>
          </div>
        </div>
      </header>

      {/* Main Workspace Container */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <AnimatePresence mode="wait">
          {activeTab === 'picker' && (
            <motion.div
              key="tab-picker"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <RandomPicker
                students={students}
                allowRepeat={allowRepeat}
                onChangeAllowRepeat={setAllowRepeat}
                soundProfile={soundProfile}
                onChangeSoundProfile={setSoundProfile}
                drawHistory={drawHistory}
                drawnStudentIds={drawnStudentIds}
                onRecordDraw={handleRecordDraw}
                onReturnToPool={handleReturnToPool}
                onResetRound={handleResetRound}
                onOpenImport={() => setIsImportOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'grouper' && (
            <motion.div
              key="tab-grouper"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <AutoGrouper
                students={students}
                groups={groups}
                groupSize={groupSize}
                remainderStrategy={remainderStrategy}
                soundProfile={soundProfile}
                onChangeGroupSize={handleChangeGroupSize}
                onChangeRemainderStrategy={handleChangeRemainderStrategy}
                onGenerateGroups={handleGenerateGroups}
                onSwapStudents={handleSwapStudents}
                onRenameGroup={handleRenameGroup}
                onOpenImport={() => setIsImportOpen(true)}
              />
            </motion.div>
          )}

          {activeTab === 'roster' && (
            <motion.div
              key="tab-roster"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
            >
              <RosterManager
                students={students}
                onAddStudent={handleAddStudent}
                onTogglePresent={handleTogglePresent}
                onRemoveStudent={handleRemoveStudent}
                onMarkAllPresent={handleMarkAllPresent}
                onLoadSample={handleLoadSample}
                onClearAll={handleClearAll}
                onOpenImport={() => setIsImportOpen(true)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Quiet Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 py-4 text-xs text-slate-500 sm:px-6 lg:px-8">
          <span>所有學生名單僅儲存於您的瀏覽器本機，不會上傳至外部伺服器。</span>
          <span className="tabular-nums">
            目前名單：{students.length} 位學生
          </span>
        </div>
      </footer>

      {/* Import Modal */}
      <RosterImportModal
        isOpen={isImportOpen}
        existingCount={students.length}
        onClose={() => setIsImportOpen(false)}
        onImport={handleImportNames}
      />
    </div>
  );
}
