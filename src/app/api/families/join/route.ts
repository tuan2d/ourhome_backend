import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { families, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// POST /api/families/join — join via invite code
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.familyId) return err('Already in a family', 400);

    const { inviteCode, role } = await req.json();
    if (!inviteCode) return err('inviteCode required');

    const [family] = await db.select().from(families).where(eq(families.inviteCode, inviteCode.toUpperCase()));
    if (!family) return err('Invalid invite code', 404);

    await db
      .update(users)
      .set({ familyId: family.id, role: role === 'parent' ? 'parent' : 'child' })
      .where(eq(users.id, user.id));

    return ok({ family, role: role ?? 'child' });
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
