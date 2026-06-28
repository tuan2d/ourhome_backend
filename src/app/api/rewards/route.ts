import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { rewards } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// GET /api/rewards
export async function GET(_req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const rows = await db
      .select()
      .from(rewards)
      .where(eq(rewards.familyId, user.familyId));

    return ok(rows);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}

// POST /api/rewards — body: { title, costPoints, emoji? }
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.role !== 'parent') return err('Only parents can create rewards', 403);
    if (!user.familyId) return err('Not in a family', 400);

    const { title, costPoints, emoji } = await req.json();
    if (!title?.trim()) return err('title required');
    if (!costPoints || costPoints < 1) return err('costPoints must be >= 1');

    const [created] = await db
      .insert(rewards)
      .values({
        familyId: user.familyId,
        title: title.trim(),
        costPoints,
        emoji: emoji ?? '🎁',
      })
      .returning();

    return ok(created, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
