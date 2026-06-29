import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { tasks, taskCompletions } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// PATCH /api/tasks/:id/revert — revert done task back to pending
// Child: can revert their own task (unmark completion)
// Parent: can revert any family task (reject)
export async function PATCH(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const [task] = await db.select().from(tasks).where(eq(tasks.id, id));
    if (!task) return err('Task not found', 404);
    if (task.familyId !== user.familyId) return err('Not found', 404);
    if (task.status !== 'done') return err('Chỉ có thể huỷ việc đang chờ duyệt', 400);

    // Child can only revert their own task; parent can revert any
    if (user.role === 'child' && task.assignedTo !== user.id) {
      return err('Không có quyền', 403);
    }

    // Remove completion record
    await db.delete(taskCompletions).where(eq(taskCompletions.taskId, id));

    const [updated] = await db
      .update(tasks)
      .set({ status: 'pending' })
      .where(eq(tasks.id, id))
      .returning();

    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
