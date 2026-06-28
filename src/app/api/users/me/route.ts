import { auth, clerkClient } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS });
}

// GET /api/users/me — return current user, auto-create if first login
export async function GET() {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new Response('Unauthorized', { status: 401 });

    // Try to find existing user
    let [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));

    // Auto-create on first login (webhook may not have fired yet)
    if (!user) {
      const clerk = await clerkClient();
      const clerkUser = await clerk.users.getUser(clerkId);
      const firstName = clerkUser.firstName ?? '';
      const lastName = clerkUser.lastName ?? '';
      const name = [firstName, lastName].filter(Boolean).join(' ') || clerkUser.username || 'Người dùng';

      [user] = await db
        .insert(users)
        .values({ clerkId, name, avatar: '🧑' })
        .onConflictDoNothing()
        .returning();

      // Fallback: re-query in case of race condition
      if (!user) {
        [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
      }
    }

    if (!user) return new Response('Failed to create user', { status: 500 });

    return Response.json(user, { headers: CORS });
  } catch (e) {
    if (e instanceof Response) return e;
    return new Response('Server error', { status: 500 });
  }
}

// PATCH /api/users/me — update name, avatar, role
export async function PATCH(req: Request) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) return new Response('Unauthorized', { status: 401 });

    const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
    if (!user) return new Response('User not found', { status: 404 });

    const body = await req.json();
    const { name, avatar, role, focusBadge } = body;

    const [updated] = await db
      .update(users)
      .set({
        ...(name && { name }),
        ...(avatar && { avatar }),
        ...(role && { role }),
        ...(focusBadge !== undefined && { focusBadge }),
      })
      .where(eq(users.id, user.id))
      .returning();

    return Response.json(updated, { headers: CORS });
  } catch (e) {
    if (e instanceof Response) return e;
    return new Response('Server error', { status: 500 });
  }
}
