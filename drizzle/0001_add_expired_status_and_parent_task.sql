ALTER TYPE "public"."task_status" ADD VALUE 'expired';--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "parent_task_id" uuid;