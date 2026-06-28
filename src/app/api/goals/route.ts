import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { goals } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// GET /api/goals
export async function GET(_req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const rows = await db
      .select()
      .from(goals)
      .where(eq(goals.familyId, user.familyId));

    return ok(rows);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}

// POST /api/goals — body: { title, note?, targetValue, deadline? }
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const { title, note, targetValue, deadline } = await req.json();
    if (!title?.trim()) return err('title required');
    if (!targetValue || targetValue < 1) return err('targetValue required');

    const [created] = await db
      .insert(goals)
      .values({
        familyId: user.familyId,
        title: title.trim(),
        note: note ?? null,
        targetValue,
        currentValue: 0,
        deadline: deadline ? new Date(deadline) : null,
      })
      .returning();

    return ok(created, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
