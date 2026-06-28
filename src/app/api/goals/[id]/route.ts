import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { goals } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// PATCH /api/goals/:id — update progress or details
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const body = await req.json();
    const { title, note, currentValue, targetValue, deadline } = body;

    const updates: Record<string, unknown> = {};
    if (title !== undefined) updates.title = title;
    if (note !== undefined) updates.note = note;
    if (currentValue !== undefined) updates.currentValue = currentValue;
    if (targetValue !== undefined) updates.targetValue = targetValue;
    if (deadline !== undefined) updates.deadline = deadline ? new Date(deadline) : null;

    const [updated] = await db
      .update(goals)
      .set(updates)
      .where(and(eq(goals.id, id), eq(goals.familyId, user.familyId)))
      .returning();

    if (!updated) return err('Goal not found', 404);
    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
