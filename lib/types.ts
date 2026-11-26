export interface Student {
  id: string;
  seatNo: number;
  name: string;
  present: boolean;
}

export interface DrawRecord {
  id: string;
  studentId: string;
  studentName: string;
  seatNo: number;
  drawnAt: string;
  roundNumber: number;
}

export interface StudentGroup {
  id: string;
  index: number;
  title: string;
  colorIndex: number;
  members: Student[];
}

export type ActiveTab = 'picker' | 'grouper' | 'roster';

export type SoundProfile = 'marimba' | 'arcade' | 'muted';

export type DrawAnimationMode = 'reel' | 'grid';

export type RemainderStrategy = 'balanced' | 'separate';

export type GroupVisualMode = 'cards' | 'tables';
