import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { tasks, users, pointTransactions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// POST /api/tasks/approve-all — parent approves all 'done' tasks in family
export async function POST() {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);
    if (user.role !== 'parent') return err('Only parents can approve tasks', 403);

    const doneTasks = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.familyId, user.familyId), eq(tasks.status, 'done')));

    if (doneTasks.length === 0) return ok({ approved: 0 });

    // Approve all and award points
    for (const task of doneTasks) {
      await db
        .update(tasks)
        .set({ status: 'approved' })
        .where(eq(tasks.id, task.id));

      if (task.points > 0) {
        await db
          .update(users)
          .set({
            totalPoints: (await db.select({ p: users.totalPoints }).from(users).where(eq(users.id, task.assignedTo)))[0].p + task.points,
            weeklyPoints: (await db.select({ p: users.weeklyPoints }).from(users).where(eq(users.id, task.assignedTo)))[0].p + task.points,
          })
          .where(eq(users.id, task.assignedTo));

        await db.insert(pointTransactions).values({
          userId: task.assignedTo,
          familyId: task.familyId,
          amount: task.points,
          type: 'earn',
          taskId: task.id,
          note: `Hoàn thành: ${task.title}`,
        });
      }
    }

    return ok({ approved: doneTasks.length });
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
