import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// PATCH /api/tasks/:id — update title, note, tags, points, dueDate
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const body = await req.json();
    const { title, note, tags, points, dueDate } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (note !== undefined) updates.note = note;
    if (tags !== undefined) updates.tags = tags;
    if (points !== undefined) updates.points = points;
    if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null;

    const [updated] = await db
      .update(tasks)
      .set(updates)
      .where(and(eq(tasks.id, id), eq(tasks.familyId, user.familyId)))
      .returning();

    if (!updated) return err('Task not found', 404);
    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
