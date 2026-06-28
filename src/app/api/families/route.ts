import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { families, users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

// POST /api/families — create new family (parent)
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (user.familyId) return err('Already in a family', 400);

    const { name } = await req.json();
    if (!name?.trim()) return err('Family name required');

    const [family] = await db
      .insert(families)
      .values({ name: name.trim(), inviteCode: randomCode() })
      .returning();

    // set user as parent of this family
    await db
      .update(users)
      .set({ familyId: family.id, role: 'parent' })
      .where(eq(users.id, user.id));

    return ok(family, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
