import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// GET /api/families/:id/members
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id: familyId } = await params;
    const user = await requireAuth();
    if (user.familyId !== familyId) return err('Forbidden', 403);

    const members = await db.select().from(users).where(eq(users.familyId, familyId));
    return ok(members);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
