import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { families } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

export async function GET() {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 404);
    const [family] = await db.select().from(families).where(eq(families.id, user.familyId));
    if (!family) return err('Family not found', 404);
    return ok(family);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
