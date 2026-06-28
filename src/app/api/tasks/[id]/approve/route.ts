import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { tasks, taskCompletions, pointTransactions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';
import { sendPushNotification } from '@/lib/push';

// PATCH /api/tasks/:id/approve — parent approves done task, adds points
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (user.role !== 'parent') return err('Only parents can approve tasks', 403);

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return err('Task not found', 404);
    if (task.familyId !== user.familyId) return err('Forbidden', 403);
    if (task.status !== 'done') return err('Task not yet completed', 400);

    // Mark approved
    const [updated] = await db
      .update(tasks)
      .set({ status: 'approved' })
      .where(eq(tasks.id, id))
      .returning();

    // Update completion record
    await db
      .update(taskCompletions)
      .set({ approvedBy: user.id, approvedAt: new Date() })
      .where(eq(taskCompletions.taskId, id));

    // Add points to assignee
    const points = task.points ?? 0;
    if (points > 0 && task.assignedTo) {
      await db.insert(pointTransactions).values({
        userId: task.assignedTo,
        familyId: task.familyId,
        amount: points,
        type: 'earn',
        taskId: id,
        note: `Hoàn thành: ${task.title}`,
      });

      // Update user total + weekly points
      const [assignee] = await db.select().from(users).where(eq(users.id, task.assignedTo));
      if (assignee) {
        await db
          .update(users)
          .set({
            totalPoints: (assignee.totalPoints ?? 0) + points,
            weeklyPoints: (assignee.weeklyPoints ?? 0) + points,
          })
          .where(eq(users.id, task.assignedTo));

        if (assignee.pushToken) {
          await sendPushNotification(
            assignee.pushToken,
            `🌟 +${points} điểm!`,
            `${user.name} đã duyệt: ${task.title}`,
            { taskId: id, points }
          );
        }
      }
    }

    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
