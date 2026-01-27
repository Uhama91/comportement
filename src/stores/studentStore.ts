import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';
import type { StudentWithSanctions, WeekSummary, ExportData, Student } from '../types';
import { getCurrentWeek, shouldResetWarnings, markResetDone } from '../utils/date';

interface StudentStore {
  students: StudentWithSanctions[];
  isLoading: boolean;
  error: string | null;

  // Actions
  loadStudents: () => Promise<void>;
  addStudent: (firstName: string) => Promise<boolean>;
  updateStudent: (id: number, firstName: string) => Promise<void>;
  deleteStudent: (id: number) => Promise<void>;
  addWarning: (studentId: number) => Promise<void>;
  removeWarning: (studentId: number) => Promise<void>;
  addSanction: (studentId: number, reason?: string) => Promise<void>;
  removeSanction: (studentId: number) => Promise<void>;
  resetAllWarnings: () => Promise<void>;

  // Export & History
  getWeeklySummary: (weekNumber?: number, year?: number) => Promise<WeekSummary | null>;
  getHistory: (weeks?: number) => Promise<WeekSummary[]>;
  exportToJSON: () => Promise<string>;
}

const MAX_STUDENTS = 30;

async function getDb() {
  return await Database.load('sqlite:comportement.db');
}

export const useStudentStore = create<StudentStore>((set, get) => ({
  students: [],
  isLoading: false,
  error: null,

  loadStudents: async () => {
    set({ isLoading: true, error: null });
    try {
      const db = await getDb();

      // Check for automatic warning reset at 16:30
      if (shouldResetWarnings()) {
        await db.execute('UPDATE students SET warnings = 0');
        markResetDone();
        console.log('Avertissements réinitialisés automatiquement (16h30)');
      }

      const { week, year } = getCurrentWeek();

      // Load students with their current week sanction count
      const students = await db.select<any[]>(`
        SELECT
          s.id,
          s.first_name as firstName,
          s.warnings,
          s.created_at as createdAt,
          COALESCE(COUNT(sa.id), 0) as weekSanctionCount
        FROM students s
        LEFT JOIN sanctions sa ON s.id = sa.student_id
          AND sa.week_number = $1
          AND sa.year = $2
        GROUP BY s.id
        ORDER BY
          weekSanctionCount DESC,
          CASE WHEN weekSanctionCount > 0 THEN 0 ELSE 1 END,
          s.first_name ASC
      `, [week, year]);

      const studentsWithSanctions: StudentWithSanctions[] = students.map(s => ({
        ...s,
        sanctions: [],
      }));

      set({ students: studentsWithSanctions, isLoading: false });
    } catch (error) {
      console.error('Error loading students:', error);
      set({ error: String(error), isLoading: false });
    }
  },

  addStudent: async (firstName: string) => {
    const trimmedName = firstName.trim();
    if (!trimmedName) {
      set({ error: 'Le prénom ne peut pas être vide' });
      return false;
    }

    const { students } = get();
    if (students.length >= MAX_STUDENTS) {
      set({ error: `Limite de ${MAX_STUDENTS} élèves atteinte` });
      return false;
    }

    try {
      const db = await getDb();
      await db.execute(
        'INSERT INTO students (first_name, warnings) VALUES ($1, 0)',
        [trimmedName]
      );
      await get().loadStudents();
      return true;
    } catch (error) {
      console.error('Error adding student:', error);
      set({ error: String(error) });
      return false;
    }
  },

  updateStudent: async (id: number, firstName: string) => {
    const trimmedName = firstName.trim();
    if (!trimmedName) {
      set({ error: 'Le prénom ne peut pas être vide' });
      return;
    }

    try {
      const db = await getDb();
      await db.execute(
        'UPDATE students SET first_name = $1 WHERE id = $2',
        [trimmedName, id]
      );
      await get().loadStudents();
    } catch (error) {
      console.error('Error updating student:', error);
      set({ error: String(error) });
    }
  },

  deleteStudent: async (id: number) => {
    try {
      const db = await getDb();
      await db.execute('DELETE FROM students WHERE id = $1', [id]);
      await get().loadStudents();
    } catch (error) {
      console.error('Error deleting student:', error);
      set({ error: String(error) });
    }
  },

  addWarning: async (studentId: number) => {
    try {
      const { students } = get();
      const student = students.find(s => s.id === studentId);
      if (!student || student.warnings >= 3) return;

      const db = await getDb();
      const newWarnings = student.warnings + 1;

      if (newWarnings === 3) {
        // 3rd warning converts to sanction
        const { week, year } = getCurrentWeek();
        await db.execute(
          'UPDATE students SET warnings = 0 WHERE id = $1',
          [studentId]
        );
        await db.execute(
          'INSERT INTO sanctions (student_id, reason, week_number, year) VALUES ($1, $2, $3, $4)',
          [studentId, '3 avertissements', week, year]
        );
      } else {
        await db.execute(
          'UPDATE students SET warnings = $1 WHERE id = $2',
          [newWarnings, studentId]
        );
      }

      await get().loadStudents();
    } catch (error) {
      console.error('Error adding warning:', error);
      set({ error: String(error) });
    }
  },

  removeWarning: async (studentId: number) => {
    try {
      const { students } = get();
      const student = students.find(s => s.id === studentId);
      if (!student || student.warnings <= 0) return;

      const db = await getDb();
      await db.execute(
        'UPDATE students SET warnings = $1 WHERE id = $2',
        [student.warnings - 1, studentId]
      );
      await get().loadStudents();
    } catch (error) {
      console.error('Error removing warning:', error);
      set({ error: String(error) });
    }
  },

  addSanction: async (studentId: number, reason?: string) => {
    try {
      const db = await getDb();
      const { week, year } = getCurrentWeek();

      // Reset warnings to 0 when adding a direct sanction
      await db.execute(
        'UPDATE students SET warnings = 0 WHERE id = $1',
        [studentId]
      );

      await db.execute(
        'INSERT INTO sanctions (student_id, reason, week_number, year) VALUES ($1, $2, $3, $4)',
        [studentId, reason || null, week, year]
      );
      await get().loadStudents();
    } catch (error) {
      console.error('Error adding sanction:', error);
      set({ error: String(error) });
    }
  },

  removeSanction: async (studentId: number) => {
    try {
      const db = await getDb();
      const { week, year } = getCurrentWeek();

      // Remove the most recent sanction for this student this week
      await db.execute(
        `DELETE FROM sanctions
         WHERE id = (
           SELECT id FROM sanctions
           WHERE student_id = $1 AND week_number = $2 AND year = $3
           ORDER BY created_at DESC LIMIT 1
         )`,
        [studentId, week, year]
      );
      await get().loadStudents();
    } catch (error) {
      console.error('Error removing sanction:', error);
      set({ error: String(error) });
    }
  },

  resetAllWarnings: async () => {
    try {
      const db = await getDb();
      await db.execute('UPDATE students SET warnings = 0');
      await get().loadStudents();
    } catch (error) {
      console.error('Error resetting warnings:', error);
      set({ error: String(error) });
    }
  },

  getWeeklySummary: async (weekNumber?: number, year?: number) => {
    try {
      const db = await getDb();
      const { week: currentWeek, year: currentYear } = getCurrentWeek();
      const targetWeek = weekNumber ?? currentWeek;
      const targetYear = year ?? currentYear;

      const results = await db.select<any[]>(`
        SELECT
          s.id,
          s.first_name as firstName,
          COUNT(sa.id) as sanctionCount
        FROM students s
        LEFT JOIN sanctions sa ON s.id = sa.student_id
          AND sa.week_number = $1
          AND sa.year = $2
        GROUP BY s.id
        ORDER BY sanctionCount DESC, s.first_name ASC
      `, [targetWeek, targetYear]);

      const totalSanctions = results.reduce((sum, r) => sum + r.sanctionCount, 0);

      return {
        weekNumber: targetWeek,
        year: targetYear,
        students: results.map(r => ({
          id: r.id,
          firstName: r.firstName,
          sanctionCount: r.sanctionCount,
        })),
        totalSanctions,
      };
    } catch (error) {
      console.error('Error getting weekly summary:', error);
      return null;
    }
  },

  getHistory: async (weeks: number = 36) => {
    try {
      const db = await getDb();

      // Get all sanctions grouped by week
      const allSanctions = await db.select<any[]>(`
        SELECT
          sa.week_number as weekNumber,
          sa.year,
          s.id as studentId,
          s.first_name as firstName,
          COUNT(sa.id) as sanctionCount
        FROM sanctions sa
        JOIN students s ON s.id = sa.student_id
        GROUP BY sa.week_number, sa.year, s.id
        ORDER BY sa.year DESC, sa.week_number DESC
      `);

      // Group by week
      const weekMap = new Map<string, WeekSummary>();

      for (const row of allSanctions) {
        const key = `${row.year}-${row.weekNumber}`;
        if (!weekMap.has(key)) {
          weekMap.set(key, {
            weekNumber: row.weekNumber,
            year: row.year,
            students: [],
            totalSanctions: 0,
          });
        }
        const summary = weekMap.get(key)!;
        summary.students.push({
          id: row.studentId,
          firstName: row.firstName,
          sanctionCount: row.sanctionCount,
        });
        summary.totalSanctions += row.sanctionCount;
      }

      // Convert to array and limit to requested weeks
      const sortedHistory = Array.from(weekMap.values())
        .sort((a, b) => {
          if (a.year !== b.year) return b.year - a.year;
          return b.weekNumber - a.weekNumber;
        })
        .slice(0, weeks);

      return sortedHistory;
    } catch (error) {
      console.error('Error getting history:', error);
      return [];
    }
  },

  exportToJSON: async () => {
    try {
      const db = await getDb();
      const { week, year } = getCurrentWeek();

      // Get all students
      const students = await db.select<Student[]>(`
        SELECT id, first_name as firstName, warnings, created_at as createdAt
        FROM students
        ORDER BY first_name ASC
      `);

      // Get history
      const weeklyHistory = await get().getHistory(36);

      const exportData: ExportData = {
        exportDate: new Date().toISOString(),
        currentWeek: { week, year },
        students,
        weeklyHistory,
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      console.error('Error exporting to JSON:', error);
      throw error;
    }
  },
}));
