import { create } from 'zustand';
import Database from '@tauri-apps/plugin-sql';
import type { StudentWithSanctions, WeekSummary, ExportData, Student, Sanction, DailyReward, Absence } from '../types';
import { getCurrentWeek, shouldResetWarnings, markResetDone, shouldResetSanctions, markSanctionResetDone, getCurrentWorkDay, getResetKey } from '../utils/date';

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
  updateSanctionReason: (sanctionId: number, reason: string) => Promise<void>;
  resetAllWarnings: () => Promise<void>;
  toggleAbsence: (studentId: number) => Promise<void>;

  // Rewards
  triggerDailyRewards: () => Promise<void>;
  getStudentWeeklyRewards: (studentId: number) => DailyReward[];

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

      // Check for weekly reset on Monday (new week = fresh start)
      if (shouldResetSanctions()) {
        // Reset all warnings for the new week
        await db.execute('UPDATE students SET warnings = 0');
        markSanctionResetDone();
        console.log('Nouvelle semaine : avertissements réinitialisés (lundi)');
      }

      // Check for automatic warning reset at 16:30
      if (shouldResetWarnings()) {
        await db.execute('UPDATE students SET warnings = 0');
        markResetDone();
        console.log('Avertissements réinitialisés automatiquement (16h30)');
      }

      const { week, year } = getCurrentWeek();

      // Load students with their current week sanction count
      // FR22: Tri alphabétique fixe (ne change jamais)
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
        ORDER BY s.first_name ASC
      `, [week, year]);

      // Load sanctions for current week with details
      const sanctions = await db.select<any[]>(`
        SELECT
          id,
          student_id as studentId,
          reason,
          week_number as weekNumber,
          year,
          created_at as createdAt
        FROM sanctions
        WHERE week_number = $1 AND year = $2
        ORDER BY created_at ASC
      `, [week, year]);

      // Map sanctions to students
      const sanctionsByStudent = new Map<number, Sanction[]>();
      for (const s of sanctions) {
        if (!sanctionsByStudent.has(s.studentId)) {
          sanctionsByStudent.set(s.studentId, []);
        }
        sanctionsByStudent.get(s.studentId)!.push(s);
      }

      // Load rewards for current week
      const rewards = await db.select<any[]>(`
        SELECT
          id,
          student_id as studentId,
          day_of_week as dayOfWeek,
          week_number as weekNumber,
          year,
          reward_type as rewardType,
          cancelled,
          cancelled_by_sanction_id as cancelledBySanctionId,
          created_at as createdAt
        FROM daily_rewards
        WHERE week_number = $1 AND year = $2
        ORDER BY day_of_week ASC
      `, [week, year]);

      // Map rewards to students
      const rewardsByStudent = new Map<number, DailyReward[]>();
      for (const r of rewards) {
        if (!rewardsByStudent.has(r.studentId)) {
          rewardsByStudent.set(r.studentId, []);
        }
        rewardsByStudent.get(r.studentId)!.push({
          ...r,
          cancelled: Boolean(r.cancelled),
        });
      }

      // Load absences for current week
      const absences = await db.select<any[]>(`
        SELECT
          id,
          student_id as studentId,
          date,
          week_number as weekNumber,
          year
        FROM absences
        WHERE week_number = $1 AND year = $2
        ORDER BY date ASC
      `, [week, year]);

      // Map absences to students
      const absencesByStudent = new Map<number, Absence[]>();
      for (const a of absences) {
        if (!absencesByStudent.has(a.studentId)) {
          absencesByStudent.set(a.studentId, []);
        }
        absencesByStudent.get(a.studentId)!.push(a);
      }

      const today = getResetKey(); // YYYY-MM-DD

      const studentsWithSanctions: StudentWithSanctions[] = students.map(s => {
        const studentAbsences = absencesByStudent.get(s.id) || [];
        return {
          ...s,
          sanctions: sanctionsByStudent.get(s.id) || [],
          weeklyRewards: rewardsByStudent.get(s.id) || [],
          absences: studentAbsences,
          todayAbsent: studentAbsences.some(a => a.date === today),
        };
      });

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

  toggleAbsence: async (studentId: number) => {
    try {
      const db = await getDb();
      const { week, year } = getCurrentWeek();
      const today = getResetKey();

      const { students } = get();
      const student = students.find(s => s.id === studentId);
      if (!student) return;

      if (student.todayAbsent) {
        // Remove absence
        await db.execute(
          'DELETE FROM absences WHERE student_id = $1 AND date = $2',
          [studentId, today]
        );
      } else {
        // Add absence
        await db.execute(
          'INSERT OR IGNORE INTO absences (student_id, date, week_number, year) VALUES ($1, $2, $3, $4)',
          [studentId, today, week, year]
        );
      }

      await get().loadStudents();
    } catch (error) {
      console.error('Error toggling absence:', error);
      set({ error: String(error) });
    }
  },

  addWarning: async (studentId: number) => {
    try {
      const { students } = get();
      const student = students.find(s => s.id === studentId);
      if (!student || student.warnings >= 3 || student.todayAbsent) return;

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
      const { students } = get();
      const student = students.find(s => s.id === studentId);
      if (student?.todayAbsent) return;

      const db = await getDb();
      const { week, year } = getCurrentWeek();

      // Reset warnings to 0 when adding a direct sanction
      await db.execute(
        'UPDATE students SET warnings = 0 WHERE id = $1',
        [studentId]
      );

      // Insert the sanction
      const result = await db.execute(
        'INSERT INTO sanctions (student_id, reason, week_number, year) VALUES ($1, $2, $3, $4)',
        [studentId, reason || null, week, year]
      );
      const sanctionId = result.lastInsertId;

      // Cancel the most recent uncancelled reward (partial first, then full)
      // Priority: 'partial' rewards are cancelled first
      const rewardToCancel = await db.select<any[]>(`
        SELECT id, reward_type as rewardType FROM daily_rewards
        WHERE student_id = $1
          AND week_number = $2
          AND year = $3
          AND cancelled = 0
        ORDER BY
          CASE WHEN reward_type = 'partial' THEN 0 ELSE 1 END,
          day_of_week DESC
        LIMIT 1
      `, [studentId, week, year]);

      if (rewardToCancel.length > 0) {
        await db.execute(
          'UPDATE daily_rewards SET cancelled = 1, cancelled_by_sanction_id = $1 WHERE id = $2',
          [sanctionId, rewardToCancel[0].id]
        );
      }

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

  updateSanctionReason: async (sanctionId: number, reason: string) => {
    try {
      const db = await getDb();
      await db.execute(
        'UPDATE sanctions SET reason = $1 WHERE id = $2',
        [reason.trim() || null, sanctionId]
      );
      await get().loadStudents();
    } catch (error) {
      console.error('Error updating sanction reason:', error);
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

  triggerDailyRewards: async () => {
    try {
      const db = await getDb();
      const { week, year } = getCurrentWeek();
      const dayOfWeek = getCurrentWorkDay();

      // Only trigger on work days (1=Mon, 2=Tue, 4=Thu, 5=Fri)
      if (dayOfWeek === -1) {
        console.log('Not a work day, skipping daily rewards');
        return;
      }

      const { students } = get();

      for (const student of students) {
        // Skip absent students
        if (student.todayAbsent) {
          continue;
        }

        // Check if reward already exists for this day
        const existing = await db.select<any[]>(`
          SELECT id FROM daily_rewards
          WHERE student_id = $1 AND day_of_week = $2 AND week_number = $3 AND year = $4
        `, [student.id, dayOfWeek, week, year]);

        if (existing.length > 0) {
          continue; // Already has a reward for today
        }

        // Check if student had a sanction today
        const todaySanctions = await db.select<any[]>(`
          SELECT id FROM sanctions
          WHERE student_id = $1
            AND week_number = $2
            AND year = $3
            AND DATE(created_at) = DATE('now', 'localtime')
        `, [student.id, week, year]);

        if (todaySanctions.length > 0) {
          continue; // No reward if had a sanction today
        }

        // Determine reward type based on current warnings
        // 0 warnings = full (😊), 1-2 warnings = partial (🙂)
        const rewardType = student.warnings === 0 ? 'full' : 'partial';

        await db.execute(
          `INSERT INTO daily_rewards (student_id, day_of_week, week_number, year, reward_type)
           VALUES ($1, $2, $3, $4, $5)`,
          [student.id, dayOfWeek, week, year, rewardType]
        );
      }

      await get().loadStudents();
      console.log('Daily rewards triggered for day', dayOfWeek);
    } catch (error) {
      console.error('Error triggering daily rewards:', error);
      set({ error: String(error) });
    }
  },

  getStudentWeeklyRewards: (studentId: number) => {
    const { students } = get();
    const student = students.find(s => s.id === studentId);
    return student?.weeklyRewards || [];
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

      // Get all sanctions grouped by week (for counts)
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

      // Get individual sanction details (with reasons)
      const sanctionDetails = await db.select<any[]>(`
        SELECT
          sa.id,
          sa.student_id as studentId,
          sa.reason,
          sa.week_number as weekNumber,
          sa.year,
          sa.created_at as createdAt
        FROM sanctions sa
        ORDER BY sa.created_at ASC
      `);

      // Index sanction details by student+week
      const detailsByStudentWeek = new Map<string, { id: number; reason: string | null; createdAt: string }[]>();
      for (const d of sanctionDetails) {
        const key = `${d.year}-${d.weekNumber}-${d.studentId}`;
        if (!detailsByStudentWeek.has(key)) {
          detailsByStudentWeek.set(key, []);
        }
        detailsByStudentWeek.get(key)!.push({ id: d.id, reason: d.reason, createdAt: d.createdAt });
      }

      // Get absences grouped by student+week
      const allAbsences = await db.select<any[]>(`
        SELECT student_id as studentId, date, week_number as weekNumber, year
        FROM absences
        ORDER BY date ASC
      `);

      const absencesByStudentWeek = new Map<string, string[]>();
      for (const a of allAbsences) {
        const key = `${a.year}-${a.weekNumber}-${a.studentId}`;
        if (!absencesByStudentWeek.has(key)) {
          absencesByStudentWeek.set(key, []);
        }
        absencesByStudentWeek.get(key)!.push(a.date);
      }

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
        const detailKey = `${row.year}-${row.weekNumber}-${row.studentId}`;
        summary.students.push({
          id: row.studentId,
          firstName: row.firstName,
          sanctionCount: row.sanctionCount,
          sanctions: detailsByStudentWeek.get(detailKey) || [],
          absences: absencesByStudentWeek.get(detailKey) || [],
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
