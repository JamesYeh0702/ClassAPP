'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  Repeat,
  CheckCircle2,
  LayoutGrid,
  Sparkles,
  Maximize2,
  Minimize2,
  Undo2,
  Upload,
  AlertTriangle,
} from 'lucide-react';
import type {
  Student,
  DrawRecord,
  SoundProfile,
  DrawAnimationMode,
} from '@/lib/types';
import { playDrawTick, playDrawReveal } from '@/lib/sound';
import ConfettiCanvas from './ConfettiCanvas';

interface RandomPickerProps {
  students: Student[];
  allowRepeat: boolean;
  onChangeAllowRepeat: (val: boolean) => void;
  soundProfile: SoundProfile;
  onChangeSoundProfile: (profile: SoundProfile) => void;
  drawHistory: DrawRecord[];
  drawnStudentIds: string[];
  onRecordDraw: (student: Student) => void;
  onReturnToPool: (recordId: string, studentId: string) => void;
  onResetRound: () => void;
  onOpenImport: () => void;
}

export default function RandomPicker({
  students,
  allowRepeat,
  onChangeAllowRepeat,
  soundProfile,
  onChangeSoundProfile,
  drawHistory,
  drawnStudentIds,
  onRecordDraw,
  onReturnToPool,
  onResetRound,
  onOpenImport,
}: RandomPickerProps) {
  const [animationMode, setAnimationMode] = useState<DrawAnimationMode>('reel');
  const [isDrawing, setIsDrawing] = useState(false);
  const [highlightedStudent, setHighlightedStudent] = useState<Student | null>(
    null
  );
  const [winnerStudent, setWinnerStudent] = useState<Student | null>(null);
  const [reelNeighbors, setReelNeighbors] = useState<{
    prev: string;
    next: string;
  }>({ prev: '', next: '' });
  const [confettiKey, setConfettiKey] = useState(0);
  const [isProjectorMode, setIsProjectorMode] = useState(false);

  const timersRef = useRef<number[]>([]);
  const soundProfileRef = useRef(soundProfile);

  useEffect(() => {
    soundProfileRef.current = soundProfile;
  }, [soundProfile]);

  const presentStudents = useMemo(
    () => students.filter((s) => s.present),
    [students]
  );

  const drawnSet = useMemo(() => new Set(drawnStudentIds), [drawnStudentIds]);

  const eligibleStudents = useMemo(() => {
    if (allowRepeat) return presentStudents;
    return presentStudents.filter((s) => !drawnSet.has(s.id));
  }, [presentStudents, allowRepeat, drawnSet]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearTimers();
  }, [clearTimers]);

  const activeHighlighted =
    presentStudents.length === 0 ? null : highlightedStudent;
  const activeWinner = presentStudents.length === 0 ? null : winnerStudent;

  const startDraw = useCallback(() => {
    if (isDrawing || eligibleStudents.length === 0) return;

    clearTimers();
    setIsDrawing(true);
    setWinnerStudent(null);

    // Choose final winner uniformly at random
    const winner =
      eligibleStudents[Math.floor(Math.random() * eligibleStudents.length)];

    // If only 1 student left and reduced motion is preferred, finish swiftly
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion || eligibleStudents.length === 1) {
      const delay = eligibleStudents.length === 1 ? 350 : 120;
      const t = window.setTimeout(() => {
        setHighlightedStudent(winner);
        setWinnerStudent(winner);
        setIsDrawing(false);
        setConfettiKey((k) => k + 1);
        playDrawReveal(soundProfileRef.current);
        onRecordDraw(winner);
      }, delay);
      timersRef.current.push(t);
      return;
    }

    // Build decelerating tick schedule (~2.25 seconds, 24 steps)
    const totalSteps = 24;
    const poolForSpin =
      eligibleStudents.length >= 4 ? eligibleStudents : presentStudents;

    let elapsed = 0;
    let lastPickedId = '';

    for (let step = 0; step < totalSteps; step += 1) {
      const progress = step / (totalSteps - 1);
      // Cubic ease-out delay curve: fast start (42ms) -> suspenseful slowdown (240ms)
      const interval = Math.round(42 + Math.pow(progress, 2.75) * 215);
      elapsed += interval;

      const isFinalStep = step === totalSteps - 1;
      let candidate: Student;

      if (isFinalStep) {
        candidate = winner;
      } else {
        // Avoid repeating the exact same name back-to-back during spin
        const choices = poolForSpin.filter((s) => s.id !== lastPickedId);
        candidate =
          choices[Math.floor(Math.random() * choices.length)] ??
          poolForSpin[0];
        lastPickedId = candidate.id;
      }

      const prevNeighbor =
        poolForSpin[Math.floor(Math.random() * poolForSpin.length)]?.name ?? '';
      const nextNeighbor =
        poolForSpin[Math.floor(Math.random() * poolForSpin.length)]?.name ?? '';

      const scheduledTime = elapsed;
      const timerId = window.setTimeout(() => {
        setHighlightedStudent(candidate);
        setReelNeighbors({ prev: prevNeighbor, next: nextNeighbor });

        if (isFinalStep) {
          setWinnerStudent(winner);
          setIsDrawing(false);
          setConfettiKey((k) => k + 1);
          playDrawReveal(soundProfileRef.current);
          onRecordDraw(winner);
        } else {
          playDrawTick(soundProfileRef.current, progress);
        }
      }, scheduledTime);

      timersRef.current.push(timerId);
    }
  }, [
    isDrawing,
    eligibleStudents,
    presentStudents,
    clearTimers,
    onRecordDraw,
  ]);

  // Keyboard shortcut: Space to draw (when not typing in an input)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (eligibleStudents.length === 0 || isDrawing) return;
      e.preventDefault();
      startDraw();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startDraw, eligibleStudents.length, isDrawing]);

  const handleReset = () => {
    clearTimers();
    setIsDrawing(false);
    setHighlightedStudent(null);
    setWinnerStudent(null);
    onResetRound();
  };

  const isExhausted =
    presentStudents.length > 0 && !allowRepeat && eligibleStudents.length === 0;

  return (
    <div
      className={
        isProjectorMode
          ? 'fixed inset-0 z-40 flex flex-col bg-[#F8FAFC] p-4 sm:p-8 overflow-y-auto'
          : 'grid grid-cols-1 gap-6 lg:grid-cols-12 items-start'
      }
    >
      {/* Left / Main Zone: Interactive Draw Stage */}
      <section
        className={`relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white ${
          isProjectorMode ? 'mx-auto flex-1 w-full max-w-5xl' : 'lg:col-span-8'
        }`}
      >
        <ConfettiCanvas burstKey={confettiKey} />

        {/* Stage Top Bar */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 px-6 py-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600 tabular-nums">
            <span className="font-semibold text-slate-900">隨機點名舞台</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            <span>出席 {presentStudents.length} 人</span>
            <span aria-hidden="true" className="text-slate-300">
              ·
            </span>
            {allowRepeat ? (
              <span>可重複抽取</span>
            ) : (
              <span
                className={
                  isExhausted
                    ? 'font-medium text-amber-700'
                    : 'font-medium text-[#0284C7]'
                }
              >
                剩餘可抽 {eligibleStudents.length} / {presentStudents.length} 人
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 p-1">
              <button
                type="button"
                onClick={() => setAnimationMode('reel')}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  animationMode === 'reel'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Sparkles className="h-3.5 w-3.5" />
                聚光燈滾輪
              </button>
              <button
                type="button"
                onClick={() => setAnimationMode('grid')}
                className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  animationMode === 'grid'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                座位掃描
              </button>
            </div>

            <button
              type="button"
              onClick={() => setIsProjectorMode((v) => !v)}
              title={isProjectorMode ? '退出投影放大' : '投影放大模式'}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap"
            >
              {isProjectorMode ? (
                <>
                  <Minimize2 className="h-3.5 w-3.5" />
                  退出投影
                </>
              ) : (
                <>
                  <Maximize2 className="h-3.5 w-3.5" />
                  投影模式
                </>
              )}
            </button>
          </div>
        </div>

        {/* Stage Content Body */}
        <div
          className={`relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-10 sm:px-10 ${
            isProjectorMode ? 'min-h-[480px]' : 'min-h-[410px]'
          }`}
        >
          {presentStudents.length === 0 ? (
            <div className="max-w-md text-center">
              <p className="text-lg font-semibold text-slate-800">
                尚無可參與抽籤的學生名單
              </p>
              <p className="mt-2 text-sm text-slate-500">
                請先匯入班級 CSV 或貼上學生姓名，即可開始隨機點名。
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
          ) : animationMode === 'reel' ? (
            <div className="flex w-full max-w-2xl flex-col items-center text-center">
              {isExhausted && !isDrawing && !activeWinner ? (
                <div className="space-y-4">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                    <AlertTriangle className="h-6 w-6" />
                  </div>
                  <h2 className="text-2xl font-semibold text-slate-900">
                    本輪所有出席學生皆已抽完
                  </h2>
                  <p className="text-sm text-slate-500">
                    目前為「不重複抽取」模式，點擊下方按鈕即可重置籤筒開始新一輪。
                  </p>
                  <button
                    type="button"
                    onClick={handleReset}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#0284C7] px-6 py-3 text-sm font-medium text-white hover:bg-[#0369A1]"
                  >
                    <RotateCcw className="h-4 w-4" />
                    重置籤筒開始新一輪
                  </button>
                </div>
              ) : (
                <>
                  {/* Subtle adjacent reel names during animation */}
                  <div className="h-8 select-none text-lg font-medium text-slate-300 transition-opacity">
                    {isDrawing ? reelNeighbors.prev : ''}
                  </div>

                  {/* Primary Spotlight Frame */}
                  <div
                    className={`my-2 flex w-full flex-col items-center justify-center rounded-2xl border px-6 py-10 transition-colors duration-200 ${
                      activeWinner && !isDrawing
                        ? 'border-[#0284C7]/40 bg-[#0284C7]/[0.04]'
                        : isDrawing
                          ? 'border-slate-300 bg-slate-50/70'
                          : 'border-slate-200 bg-slate-50/40'
                    }`}
                  >
                    <div className="mb-3 h-6 font-mono text-sm font-medium text-slate-500 tabular-nums">
                      {activeHighlighted ? (
                        <span>
                          座號 {String(activeHighlighted.seatNo).padStart(2, '0')}
                        </span>
                      ) : (
                        <span>準備就緒 · 共 {eligibleStudents.length} 位候選</span>
                      )}
                    </div>

                    <div className="flex min-h-[5.5rem] items-center justify-center sm:min-h-[6.5rem]">
                      <AnimatePresence mode="popLayout">
                        {activeHighlighted ? (
                          <motion.div
                            key={`${activeHighlighted.id}-${isDrawing ? 'spin' : 'win'}`}
                            initial={
                              isDrawing
                                ? { y: 18, opacity: 0.4 }
                                : { scale: 0.86, opacity: 0 }
                            }
                            animate={
                              isDrawing
                                ? { y: 0, opacity: 1 }
                                : { scale: 1, opacity: 1 }
                            }
                            exit={
                              isDrawing
                                ? { y: -18, opacity: 0.25 }
                                : { opacity: 0 }
                            }
                            transition={
                              isDrawing
                                ? { duration: 0.06 }
                                : {
                                    type: 'spring',
                                    stiffness: 340,
                                    damping: 22,
                                  }
                            }
                            className={`font-bold tracking-tight text-slate-900 ${
                              isProjectorMode
                                ? 'text-6xl sm:text-7xl lg:text-8xl'
                                : 'text-5xl sm:text-6xl'
                            }`}
                          >
                            {activeHighlighted.name}
                          </motion.div>
                        ) : (
                          <span className="text-3xl font-semibold text-slate-300 sm:text-4xl">
                            點擊下方開始抽籤
                          </span>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* Confirmation Status Line (Dual-coded icon + text) */}
                    <div className="mt-4 h-6 text-sm font-medium">
                      {activeWinner && !isDrawing ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          抽籤完成 · 本輪第 {drawHistory.length} 位中選
                        </span>
                      ) : isDrawing ? (
                        <span className="text-[#0284C7]">隨機抽取中…</span>
                      ) : (
                        <span className="text-slate-400">
                          按空白鍵（Space）亦可直接觸發抽籤
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="h-8 select-none text-lg font-medium text-slate-300 transition-opacity">
                    {isDrawing ? reelNeighbors.next : ''}
                  </div>
                </>
              )}
            </div>
          ) : (
            /* Classroom Seat Grid Spotlight Mode */
            <div className="w-full space-y-5">
              {activeWinner && !isDrawing && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#0284C7]/30 bg-[#0284C7]/[0.05] px-5 py-3.5"
                >
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-medium text-slate-600">
                      本次抽中：
                    </span>
                    <span className="font-mono text-sm text-slate-500 tabular-nums">
                      {String(activeWinner.seatNo).padStart(2, '0')} 號
                    </span>
                    <span className="text-2xl font-bold text-slate-900">
                      {activeWinner.name}
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-500 tabular-nums">
                    本輪第 {drawHistory.length} 抽
                  </span>
                </motion.div>
              )}

              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {presentStudents.map((student) => {
                  const isActive = activeHighlighted?.id === student.id;
                  const isWinner =
                    activeWinner?.id === student.id && !isDrawing;
                  const isAlreadyDrawn =
                    !allowRepeat && drawnSet.has(student.id) && !isWinner;

                  return (
                    <div
                      key={student.id}
                      className={`relative flex items-center gap-2.5 rounded-xl border px-3.5 py-3 transition-transform duration-100 ${
                        isWinner
                          ? 'scale-[1.03] border-[#0284C7] bg-[#0284C7] text-white shadow-md'
                          : isActive
                            ? 'scale-[1.02] border-[#0284C7] bg-[#0284C7]/12 text-[#0369A1]'
                            : isAlreadyDrawn
                              ? 'border-slate-100 bg-slate-50 text-slate-400'
                              : 'border-slate-200 bg-white text-slate-800'
                      }`}
                    >
                      <span
                        className={`font-mono text-xs tabular-nums ${
                          isWinner
                            ? 'text-sky-100'
                            : isActive
                              ? 'text-[#0284C7]'
                              : 'text-slate-400'
                        }`}
                      >
                        {String(student.seatNo).padStart(2, '0')}
                      </span>
                      <span
                        className={`truncate text-sm font-semibold ${
                          isAlreadyDrawn ? 'line-through' : ''
                        }`}
                      >
                        {student.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Stage Action Footer */}
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-4">
          <div className="flex items-center gap-3">
            {isExhausted ? (
              <button
                type="button"
                onClick={handleReset}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-xl bg-[#0284C7] px-7 py-2.5 text-base font-semibold text-white transition-colors hover:bg-[#0369A1] whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                重置籤筒
              </button>
            ) : (
              <button
                type="button"
                disabled={isDrawing || eligibleStudents.length === 0}
                onClick={startDraw}
                className="inline-flex min-h-[44px] items-center gap-2.5 rounded-xl bg-[#0284C7] px-8 py-2.5 text-base font-semibold text-white transition-all hover:bg-[#0369A1] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap"
              >
                <Play className="h-4 w-4 fill-current" />
                {isDrawing ? '抽籤進行中…' : '開始抽籤'}
              </button>
            )}

            {!allowRepeat && drawnStudentIds.length > 0 && !isExhausted && (
              <button
                type="button"
                disabled={isDrawing}
                onClick={handleReset}
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-45 whitespace-nowrap"
              >
                <RotateCcw className="h-4 w-4" />
                重置本輪
              </button>
            )}
          </div>

          {/* Progress indicator in no-repeat mode */}
          {!allowRepeat && presentStudents.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="h-2 w-28 overflow-hidden rounded-full bg-slate-200 sm:w-36">
                <div
                  className="h-full rounded-full bg-[#0284C7] transition-all duration-300"
                  style={{
                    width: `${Math.min(
                      100,
                      Math.round(
                        ((presentStudents.length - eligibleStudents.length) /
                          presentStudents.length) *
                          100
                      )
                    )}%`,
                  }}
                />
              </div>
              <span className="font-mono text-xs text-slate-500 tabular-nums whitespace-nowrap">
                已抽 {presentStudents.length - eligibleStudents.length} /{' '}
                {presentStudents.length}
              </span>
            </div>
          )}
        </div>
      </section>

      {/* Right Zone: Settings & History Deck (hidden in fullscreen projector mode) */}
      {!isProjectorMode && (
        <aside className="space-y-6 lg:col-span-4">
          {/* Control Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-5">
            <h2 className="text-base font-semibold text-slate-900">抽籤設定</h2>

            {/* Repeat Mode Toggle */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">抽取規則</span>
                <span className="text-xs text-slate-500">
                  {allowRepeat ? '抽中後保留在名單' : '每輪每人限抽一次'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  disabled={isDrawing}
                  onClick={() => onChangeAllowRepeat(false)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    !allowRepeat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <CheckCircle2 className="h-4 w-4" />
                  不重複抽取
                </button>
                <button
                  type="button"
                  disabled={isDrawing}
                  onClick={() => onChangeAllowRepeat(true)}
                  className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap ${
                    allowRepeat
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Repeat className="h-4 w-4" />
                  可重複抽取
                </button>
              </div>
            </div>

            {/* Sound Profile Selector */}
            <div className="space-y-2 border-t border-slate-100 pt-4">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-700">動畫與揭曉音效</span>
                <button
                  type="button"
                  disabled={soundProfile === 'muted'}
                  onClick={() => playDrawReveal(soundProfile)}
                  className="text-xs font-medium text-[#0284C7] hover:text-[#0369A1] disabled:text-slate-400"
                >
                  試聽音效
                </button>
              </div>
              <div className="grid grid-cols-3 gap-1 rounded-xl bg-slate-100 p-1">
                <button
                  type="button"
                  onClick={() => onChangeSoundProfile('marimba')}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    soundProfile === 'marimba'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  清脆木琴
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSoundProfile('arcade')}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    soundProfile === 'arcade'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Volume2 className="h-3.5 w-3.5" />
                  遊戲轉盤
                </button>
                <button
                  type="button"
                  onClick={() => onChangeSoundProfile('muted')}
                  className={`inline-flex items-center justify-center gap-1 rounded-lg px-2.5 py-2 text-xs font-medium transition-colors whitespace-nowrap ${
                    soundProfile === 'muted'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <VolumeX className="h-3.5 w-3.5" />
                  靜音
                </button>
              </div>
            </div>
          </div>

          {/* Draw History Panel */}
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div className="flex items-center gap-2">
                <h2 className="text-base font-semibold text-slate-900">
                  抽籤紀錄
                </h2>
                <span className="font-mono text-xs text-slate-400 tabular-nums">
                  {drawHistory.length} 筆
                </span>
              </div>
              {drawHistory.length > 0 && (
                <button
                  type="button"
                  disabled={isDrawing}
                  onClick={handleReset}
                  className="text-xs font-medium text-slate-500 transition-colors hover:text-red-600 disabled:opacity-45"
                >
                  清空並重置
                </button>
              )}
            </div>

            {drawHistory.length === 0 ? (
              <div className="px-5 py-10 text-center text-sm text-slate-400">
                尚未有抽籤紀錄，點擊「開始抽籤」即會顯示於此。
              </div>
            ) : (
              <ul className="max-h-[340px] divide-y divide-slate-100 overflow-y-auto">
                {drawHistory.map((record) => (
                  <li
                    key={record.id}
                    className="flex items-center justify-between gap-3 px-5 py-3 text-sm"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="font-mono text-xs font-medium text-slate-400 tabular-nums">
                        #{String(record.roundNumber).padStart(2, '0')}
                      </span>
                      <span className="truncate font-medium text-slate-900">
                        {record.studentName}
                      </span>
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        {String(record.seatNo).padStart(2, '0')}號
                      </span>
                    </div>

                    <div className="flex shrink-0 items-center gap-2.5">
                      <span className="font-mono text-xs text-slate-400 tabular-nums">
                        {record.drawnAt}
                      </span>
                      {!allowRepeat && drawnSet.has(record.studentId) && (
                        <button
                          type="button"
                          onClick={() =>
                            onReturnToPool(record.id, record.studentId)
                          }
                          title="將此學生放回可抽名單"
                          className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-xs font-medium text-[#0284C7] hover:bg-[#0284C7]/10 whitespace-nowrap"
                        >
                          <Undo2 className="h-3 w-3" />
                          放回
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      )}
    </div>
  );
}
