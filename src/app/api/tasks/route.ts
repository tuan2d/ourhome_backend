import { requireAuth } from '@/lib/auth';
import { db } from '@/db';
import { tasks, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';
import { ok, err } from '@/lib/response';
import { sendPushNotification } from '@/lib/push';

// GET /api/tasks?assignee=<userId>&status=pending
export async function GET(req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const { searchParams } = new URL(req.url);
    const assigneeId = searchParams.get('assignee');
    const status = searchParams.get('status') as 'pending' | 'done' | 'approved' | null;

    const conditions = [eq(tasks.familyId, user.familyId)];
    if (assigneeId) conditions.push(eq(tasks.assignedTo, assigneeId));
    if (status) conditions.push(eq(tasks.status, status));

    const rows = await db
      .select({
        task: tasks,
        assignee: { id: users.id, name: users.name, avatar: users.avatar },
      })
      .from(tasks)
      .leftJoin(users, eq(tasks.assignedTo, users.id))
      .where(and(...conditions))
      .orderBy(tasks.createdAt);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const mapped = rows.map((row) => ({
      ...row,
      task: {
        ...row.task,
        status:
          row.task.status === 'pending' && row.task.dueDate && new Date(row.task.dueDate) < today
            ? 'expired'
            : row.task.status,
      },
    }));

    return ok(mapped);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}

function generateRepeatDates(startDate: Date, repeat: string, max = 365): Date[] {
  const dates: Date[] = [];
  const start = new Date(startDate);
  start.setHours(12, 0, 0, 0);

  for (let i = 1; i <= max; i++) {
    const d = new Date(start);
    if (repeat === 'daily') {
      d.setDate(start.getDate() + i);
    } else if (repeat === 'weekly') {
      d.setDate(start.getDate() + i * 7);
    } else if (repeat === 'monthly') {
      d.setMonth(start.getMonth() + i);
    } else {
      break;
    }
    dates.push(d);
  }
  return dates;
}

// POST /api/tasks — create task, assign to multiple members
// body: { title, note?, points?, tags?, dueDate?, assigneeIds: string[], repeat? }
export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    if (!user.familyId) return err('Not in a family', 400);

    const body = await req.json();
    const { title, note, points, tags, dueDate, assigneeIds, autoApprove, repeat } = body;

    if (!title?.trim()) return err('title required');
    if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) return err('assigneeIds required');

    const isSelfOnly = assigneeIds.length === 1 && assigneeIds[0] === user.id;
    if (isSelfOnly && points && points > 0) return err('Không thể tự thưởng điểm cho bản thân', 400);

    const baseDate = dueDate ? new Date(dueDate) : null;
    const status = (autoApprove ? 'approved' : 'pending') as 'pending' | 'approved';

    // Insert template tasks (one per assignee)
    const created = await db
      .insert(tasks)
      .values(
        assigneeIds.map((assignedTo: string) => ({
          familyId: user.familyId!,
          assignedTo,
          createdBy: user.id,
          title: title.trim(),
          note: note ?? null,
          points: points ?? 0,
          tags: tags ?? [],
          dueDate: baseDate,
          repeat: repeat ?? null,
          parentTaskId: null,
          status,
        }))
      )
      .returning();

    // Generate repeat instances if repeat + dueDate provided
    if (repeat && baseDate) {
      const futureDates = generateRepeatDates(baseDate, repeat, 365);
      const instances = created.flatMap((tmpl) =>
        futureDates.map((d) => ({
          familyId: tmpl.familyId,
          assignedTo: tmpl.assignedTo,
          createdBy: tmpl.createdBy,
          title: tmpl.title,
          note: tmpl.note,
          points: tmpl.points,
          tags: tmpl.tags,
          dueDate: d,
          repeat: null,
          parentTaskId: tmpl.id,
          status: 'pending' as const,
        }))
      );

      if (instances.length > 0) {
        await db.insert(tasks).values(instances);
      }
    }

    // Notify each assignee
    for (const task of created) {
      const [assignee] = await db.select().from(users).where(eq(users.id, task.assignedTo));
      if (assignee?.pushToken) {
        await sendPushNotification(
          assignee.pushToken,
          '📋 Có việc mới!',
          `${user.name} giao cho bạn: ${title}`,
          { taskId: task.id }
        );
      }
    }

    return ok(created, 201);
  } catch (e) {
    if (e instanceof Response) return e;
    return err('Server error', 500);
  }
}
