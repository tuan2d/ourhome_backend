import { auth } from '@clerk/nextjs/server';
import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function requireAuth() {
  const { userId: clerkId } = await auth();
  if (!clerkId) {
    throw new Response('Unauthorized', { status: 401 });
  }

  const [user] = await db.select().from(users).where(eq(users.clerkId, clerkId));
  if (!user) {
    throw new Response('User not found — complete onboarding first', { status: 404 });
  }

  return user;
}

export async function requireParent() {
  const user = await requireAuth();
  if (user.role !== 'parent') {
    throw new Response('Forbidden — parents only', { status: 403 });
  }
  return user;
}
