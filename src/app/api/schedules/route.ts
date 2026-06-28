import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { scheduleItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// GET /api/schedules?date=YYYY-MM-DD&userId=<id>
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const userId = searchParams.get('userId');

    const conditions = [eq(scheduleItems.familyId, user.familyId)];
    if (date) conditions.push(eq(scheduleItems.date, date));
    if (userId) conditions.push(eq(scheduleItems.userId, userId));

    const rows = await db
      .select()
      .from(scheduleItems)
      .where(and(...conditions))
      .orderBy(scheduleItems.time);

    return ok(rows);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}

// POST /api/schedules — body: { userId?, title, note?, time, date, reminder? }
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const body = await req.json();
    const { userId, title, note, time, date, reminder } = body;

    if (!title?.trim()) return err('title required');
    if (!time) return err('time required');
    if (!date) return err('date required');

    const [created] = await db
      .insert(scheduleItems)
      .values({
        familyId: user.familyId,
        userId: userId ?? user.id,
        title: title.trim(),
        note: note ?? null,
        time,
        date,
        reminder: reminder ?? false,
      })
      .returning();

    return ok(created, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
