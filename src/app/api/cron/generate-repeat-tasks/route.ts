import { db } from '@/db';
import { tasks } from '@/db/schema';
import { eq, isNull, isNotNull, and } from 'drizzle-orm';
import { ok, err } from '@/lib/response';

const DAYS_AHEAD = 7;

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(d: Date) {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

function nextOccurrences(repeat: string, from: Date, upTo: Date): Date[] {
  const dates: Date[] = [];
  const cur = new Date(from);
  cur.setHours(12, 0, 0, 0);

  while (cur <= upTo) {
    if (repeat === 'daily') {
      dates.push(new Date(cur));
    } else if (repeat === 'weekly') {
      if (cur.getDay() === from.getDay()) dates.push(new Date(cur));
    } else if (repeat === 'monthly') {
      if (cur.getDate() === from.getDate()) dates.push(new Date(cur));
    }
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

// POST /api/cron/generate-repeat-tasks
// Called by Vercel Cron daily at 00:01 UTC
export async function POST(req: Request) {
  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return err('Unauthorized', 401);
  }

  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const upTo = addDays(today, DAYS_AHEAD);

    // Find all template tasks (have repeat, no parentTaskId)
    const templates = await db
      .select()
      .from(tasks)
      .where(and(isNotNull(tasks.repeat), isNull(tasks.parentTaskId)));

    let created = 0;

    for (const tmpl of templates) {
      if (!tmpl.repeat || !tmpl.dueDate) continue;

      const occurrences = nextOccurrences(tmpl.repeat, tmpl.dueDate, upTo);

      // Find existing instances for this template
      const existing = await db
        .select({ dueDate: tasks.dueDate })
        .from(tasks)
        .where(eq(tasks.parentTaskId, tmpl.id));

      const existingDates = new Set(existing.map((r) => r.dueDate ? toDateStr(r.dueDate) : ''));

      const toInsert = occurrences.filter((d) => {
        const ds = toDateStr(d);
        // Skip the original template date and already-created instances
        if (ds === toDateStr(tmpl.dueDate!)) return false;
        if (existingDates.has(ds)) return false;
        // Skip past dates (expired)
        if (d < today) return false;
        return true;
      });

      if (toInsert.length === 0) continue;

      await db.insert(tasks).values(
        toInsert.map((dueDate) => ({
          familyId: tmpl.familyId,
          assignedTo: tmpl.assignedTo,
          createdBy: tmpl.createdBy,
          title: tmpl.title,
          note: tmpl.note,
          tags: tmpl.tags,
          points: tmpl.points,
          status: 'pending' as const,
          dueDate,
          repeat: null,
          parentTaskId: tmpl.id,
        }))
      );

      created += toInsert.length;
    }

    return ok({ message: `Generated ${created} repeat task instances`, templates: templates.length });
  } catch (e) {
    console.error(e);
    return err('Server error', 500);
  }
}
