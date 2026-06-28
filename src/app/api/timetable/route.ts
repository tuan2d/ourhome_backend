import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { timetableItems } from '@/db/schema';
import { eq, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

// GET /api/timetable?userId=<id>
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');

    const conditions = [eq(timetableItems.familyId, user.familyId)];
    if (userId) conditions.push(eq(timetableItems.userId, userId));

    const rows = await db
      .select()
      .from(timetableItems)
      .where(and(...conditions))
      .orderBy(timetableItems.dayOfWeek, timetableItems.startTime);

    return ok(rows);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}

// POST /api/timetable — body: { userId?, subject, teacher?, room?, dayOfWeek, startTime }
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const body = await req.json();
    const { userId, subject, teacher, room, dayOfWeek, startTime } = body;

    if (!subject?.trim()) return err('subject required');
    if (dayOfWeek === undefined) return err('dayOfWeek required');
    if (!startTime) return err('startTime required');

    const [created] = await db
      .insert(timetableItems)
      .values({
        familyId: user.familyId,
        userId: userId ?? user.id,
        subject: subject.trim(),
        teacher: teacher ?? null,
        room: room ?? null,
        dayOfWeek,
        startTime,
      })
      .returning();

    return ok(created, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
