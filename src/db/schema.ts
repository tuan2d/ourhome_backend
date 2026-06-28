import {
  pgTable, text, integer, boolean, timestamp, pgEnum, uuid
} from 'drizzle-orm/pg-core';

// ── Enums ──────────────────────────────────────────────────────────────────

export const roleEnum = pgEnum('role', ['parent', 'child']);
export const taskStatusEnum = pgEnum('task_status', ['pending', 'done', 'approved']);
export const pointTypeEnum = pgEnum('point_type', ['earn', 'spend']);

// ── Tables ─────────────────────────────────────────────────────────────────

export const families = pgTable('families', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: text('name').notNull(),
  inviteCode: text('invite_code').notNull().unique(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  clerkId: text('clerk_id').notNull().unique(),
  familyId: uuid('family_id').references(() => families.id),
  name: text('name').notNull(),
  avatar: text('avatar').notNull().default('🧒'),
  role: roleEnum('role').notNull().default('child'),
  totalPoints: integer('total_points').notNull().default(0),
  weeklyPoints: integer('weekly_points').notNull().default(0),
  focusBadge: text('focus_badge').notNull().default('Thành viên mới'),
  pushToken: text('push_token'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const tasks = pgTable('tasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id),
  assignedTo: uuid('assigned_to').notNull().references(() => users.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  title: text('title').notNull(),
  note: text('note'),
  tags: text('tags').array().notNull().default([]),
  points: integer('points').notNull().default(0),
  status: taskStatusEnum('status').notNull().default('pending'),
  dueDate: timestamp('due_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const taskCompletions = pgTable('task_completions', {
  id: uuid('id').defaultRandom().primaryKey(),
  taskId: uuid('task_id').notNull().references(() => tasks.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  completedAt: timestamp('completed_at').defaultNow().notNull(),
  photoUrl: text('photo_url'),
  approvedBy: uuid('approved_by').references(() => users.id),
  approvedAt: timestamp('approved_at'),
});

export const pointTransactions = pgTable('point_transactions', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id),
  familyId: uuid('family_id').notNull().references(() => families.id),
  amount: integer('amount').notNull(),
  type: pointTypeEnum('type').notNull(),
  taskId: uuid('task_id').references(() => tasks.id),
  rewardId: uuid('reward_id'),
  note: text('note'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const scheduleItems = pgTable('schedule_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  title: text('title').notNull(),
  note: text('note'),
  time: text('time').notNull(), // "HH:MM"
  date: text('date').notNull(), // "YYYY-MM-DD"
  reminder: boolean('reminder').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const timetableItems = pgTable('timetable_items', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id),
  userId: uuid('user_id').notNull().references(() => users.id),
  subject: text('subject').notNull(),
  teacher: text('teacher'),
  room: text('room'),
  dayOfWeek: text('day_of_week').notNull(), // "T2", "T3", ...
  startTime: text('start_time').notNull(), // "HH:MM"
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const rewards = pgTable('rewards', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id),
  title: text('title').notNull(),
  costPoints: integer('cost_points').notNull(),
  emoji: text('emoji').notNull().default('🎁'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  familyId: uuid('family_id').notNull().references(() => families.id),
  title: text('title').notNull(),
  note: text('note'),
  targetValue: integer('target_value').notNull().default(100),
  currentValue: integer('current_value').notNull().default(0),
  deadline: timestamp('deadline'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
