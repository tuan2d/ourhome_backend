import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

export async function PATCH(req: Request) {
  try {
    const user = await requireAuth();
    const { token } = await req.json();
    if (!token) return err('token required');

    await db.update(users).set({ pushToken: token }).where(eq(users.id, user.id));
    return ok({ success: true });
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
