import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { tasks, taskCompletions, users } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';
import { sendPushNotification } from '@/lib/push';

// PATCH /api/tasks/:id/complete — child marks task as done
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const [task] = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.id, id), eq(tasks.assignedTo, user.id)));
    if (!task) return err('Task not found', 404);
    if (task.status !== 'pending') return err('Task already completed', 400);

    const body = await req.json().catch(() => ({}));
    const { photoUrl } = body;

    await db
      .insert(taskCompletions)
      .values({ taskId: id, userId: user.id, photoUrl: photoUrl ?? null });

    const [updated] = await db
      .update(tasks)
      .set({ status: 'done' })
      .where(eq(tasks.id, id))
      .returning();

    // Notify parent who created the task
    if (task.createdBy) {
      const [creator] = await db.select().from(users).where(eq(users.id, task.createdBy));
      if (creator?.pushToken) {
        await sendPushNotification(
          creator.pushToken,
          '✅ Hoàn thành nhiệm vụ!',
          `${user.name} vừa hoàn thành: ${task.title}`,
          { taskId: id }
        );
      }
    }

    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
