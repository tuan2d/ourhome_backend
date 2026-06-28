import { requireAuth } from '@/lib/auth';

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
import { db } from '@/db';
import { users, families } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// GET /api/users/me — return current user + family info
export async function GET() {
  try {
    const user = await requireAuth();
    let family = null;
    if (user.familyId) {
      const [f] = await db.select().from(families).where(eq(families.id, user.familyId));
      family = f ?? null;
    }
    return ok({ user, family });
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}

// PATCH /api/users/me — update name, avatar, role
export async function PATCH(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { name, avatar, role, focusBadge } = body;

    const [updated] = await db
      .update(users)
      .set({
        ...(name && { name }),
        ...(avatar && { avatar }),
        ...(role && { role }),
        ...(focusBadge && { focusBadge }),
      })
      .where(eq(users.id, user.id))
      .returning();

    return ok(updated);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
