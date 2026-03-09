CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'system', 'webhook', 'agent');--> statement-breakpoint
CREATE TYPE "public"."audit_severity" AS ENUM('info', 'warn', 'critical');--> statement-breakpoint
CREATE TABLE "audit_log" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "audit_log_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"actor_type" "audit_actor_type" NOT NULL,
	"actor_id" text,
	"event_type" varchar(100) NOT NULL,
	"entity_type" varchar(50),
	"entity_id" varchar(64),
	"request_id" varchar(64),
	"session_id" varchar(64),
	"job_id" varchar(16),
	"escrow_id" varchar(16),
	"stripe_event_id" varchar(64),
	"severity" "audit_severity" DEFAULT 'info' NOT NULL,
	"metadata" jsonb,
	"ip_hash" varchar(16),
	"user_agent" varchar(500)
);
--> statement-breakpoint
CREATE INDEX "audit_log_event_type_idx" ON "audit_log" USING btree ("event_type");--> statement-breakpoint
CREATE INDEX "audit_log_entity_idx" ON "audit_log" USING btree ("entity_type","entity_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_at_idx" ON "audit_log" USING btree ("created_at");