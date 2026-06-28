import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { pointTransactions, users } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// GET /api/points/:userId — balance + transaction history
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;
    const user = await requireAuth();

    // Only the user themselves or a parent in the same family can view
    const isSelf = user.id === userId;
    const isParent = user.role === 'parent';
    if (!isSelf && !isParent) return err('Forbidden', 403);

    const [target] = await db.select().from(users).where(eq(users.id, userId));
    if (!target) return err('User not found', 404);
    if (target.familyId !== user.familyId) return err('Forbidden', 403);

    const history = await db
      .select()
      .from(pointTransactions)
      .where(eq(pointTransactions.userId, userId))
      .orderBy(desc(pointTransactions.createdAt))
      .limit(50);

    return ok({
      totalPoints: target.totalPoints ?? 0,
      weeklyPoints: target.weeklyPoints ?? 0,
      history,
    });
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
