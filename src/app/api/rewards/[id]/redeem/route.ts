import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { rewards, pointTransactions, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// POST /api/rewards/:id/redeem
export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await requireAuth();

    const [reward] = await db.select().from(rewards).where(eq(rewards.id, id));
    if (!reward) return err('Reward not found', 404);
    if (reward.familyId !== user.familyId) return err('Forbidden', 403);

    const currentPoints = user.totalPoints ?? 0;
    if (currentPoints < reward.costPoints) return err('Không đủ điểm', 400);

    // Deduct points
    await db.insert(pointTransactions).values({
      userId: user.id,
      familyId: user.familyId!,
      amount: -reward.costPoints,
      type: 'spend',
      rewardId: id,
      note: `Đổi thưởng: ${reward.title}`,
    });

    const newTotal = currentPoints - reward.costPoints;
    await db
      .update(users)
      .set({ totalPoints: newTotal })
      .where(eq(users.id, user.id));

    return ok({ reward, remainingPoints: newTotal });
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
