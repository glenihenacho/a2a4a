CREATE TYPE "public"."agent_status" AS ENUM('evaluation', 'live', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."aio_pos" AS ENUM('none', 'mentioned', 'cited', 'featured');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('USDC', 'USD');--> statement-breakpoint
CREATE TYPE "public"."escrow_state" AS ENUM('pending', 'locked', 'released', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."intent_status" AS ENUM('bidding', 'engaged', 'milestone', 'completed');--> statement-breakpoint
CREATE TYPE "public"."job_status" AS ENUM('created', 'executing', 'completed', 'failed', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."signal_status" AS ENUM('live', 'warming', 'cooling');--> statement-breakpoint
CREATE TYPE "public"."txn_status" AS ENUM('pending', 'settled');--> statement-breakpoint
CREATE TYPE "public"."txn_type" AS ENUM('clearing', 'milestone', 'refund', 'escrow_lock', 'escrow_release', 'cpe_bid');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('smb', 'builder');--> statement-breakpoint
CREATE TYPE "public"."vertical" AS ENUM('SEO', 'AIO');--> statement-breakpoint
CREATE TYPE "public"."waitlist_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "account" (
	"id" text PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
CREATE TABLE "agents" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"created_by" text,
	"name" varchar(100) NOT NULL,
	"avatar" varchar(4) NOT NULL,
	"version" varchar(20) NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	"signed_at" timestamp with time zone,
	"status" "agent_status" DEFAULT 'evaluation' NOT NULL,
	"verticals" jsonb NOT NULL,
	"description" text NOT NULL,
	"capabilities" jsonb NOT NULL,
	"input_schema" jsonb NOT NULL,
	"output_schema" jsonb NOT NULL,
	"tool_requirements" jsonb NOT NULL,
	"sla" jsonb NOT NULL,
	"policy" jsonb NOT NULL,
	"eval_claims" jsonb NOT NULL,
	"total_runs" integer DEFAULT 0 NOT NULL,
	"success_rate" real DEFAULT 0 NOT NULL,
	"avg_runtime" varchar(20) NOT NULL,
	"avg_cost" varchar(20) NOT NULL,
	"active_contracts" integer DEFAULT 0 NOT NULL,
	"reputation" integer DEFAULT 0 NOT NULL,
	"monthly_rev" integer DEFAULT 0 NOT NULL,
	"wins" integer DEFAULT 0 NOT NULL,
	"stripe_account_id" varchar(64),
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "escrow" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"job_id" varchar(16) NOT NULL,
	"state" "escrow_state" DEFAULT 'pending' NOT NULL,
	"amount_cents" integer NOT NULL,
	"currency" "currency" DEFAULT 'USD' NOT NULL,
	"platform_fee_cents" integer DEFAULT 0 NOT NULL,
	"agent_payout_cents" integer,
	"refund_amount_cents" integer,
	"refund_tier" varchar(20),
	"stripe_payment_intent_id" varchar(64),
	"stripe_transfer_id" varchar(64),
	"stripe_refund_id" varchar(64),
	"locked_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_categories" (
	"name" varchar(60) PRIMARY KEY NOT NULL,
	"count" integer NOT NULL,
	"avg_aio" integer NOT NULL,
	"avg_vol" integer NOT NULL,
	"color" varchar(10) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_market" (
	"id" integer PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"vol" integer NOT NULL,
	"vol_trend" jsonb NOT NULL,
	"aio_rate" integer NOT NULL,
	"ctr" integer NOT NULL,
	"ctr_delta" integer NOT NULL,
	"competition" integer NOT NULL,
	"category" varchar(60) NOT NULL,
	"opportunity" integer NOT NULL,
	"vertical" "vertical" NOT NULL,
	"aio_cited" integer NOT NULL,
	"avg_pos" real NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intents" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"user_id" text,
	"business" varchar(100) NOT NULL,
	"vertical" "vertical" NOT NULL,
	"status" "intent_status" DEFAULT 'bidding' NOT NULL,
	"queries" text NOT NULL,
	"url" varchar(255) NOT NULL,
	"bids" integer DEFAULT 0 NOT NULL,
	"created" varchar(20) NOT NULL,
	"budget" varchar(30) NOT NULL,
	"agent" varchar(100),
	"milestone" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jobs" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"user_id" text,
	"intent_id" varchar(16) NOT NULL,
	"agent_id" varchar(16) NOT NULL,
	"status" "job_status" DEFAULT 'created' NOT NULL,
	"vertical" "vertical" NOT NULL,
	"sla_template_id" varchar(16),
	"budget_cents" integer NOT NULL,
	"cost_actual_cents" integer,
	"milestones_total" integer DEFAULT 0 NOT NULL,
	"milestones_hit" integer DEFAULT 0 NOT NULL,
	"sla_target" integer,
	"sla_achieved" integer,
	"sla_report" jsonb,
	"artifacts" jsonb,
	"started_at" timestamp with time zone,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "revenue_months" (
	"month" varchar(10) PRIMARY KEY NOT NULL,
	"clearing" integer NOT NULL,
	"milestones" integer NOT NULL,
	"total" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "session" (
	"id" text PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL,
	CONSTRAINT "session_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "signals" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"query" text NOT NULL,
	"vertical" "vertical" NOT NULL,
	"status" "signal_status" DEFAULT 'live' NOT NULL,
	"rank" integer NOT NULL,
	"prev_rank" integer NOT NULL,
	"aio_pos" "aio_pos" DEFAULT 'none' NOT NULL,
	"avg_spend" integer DEFAULT 0 NOT NULL,
	"top_bid" integer DEFAULT 0 NOT NULL,
	"agents" integer DEFAULT 0 NOT NULL,
	"impressions" integer DEFAULT 0 NOT NULL,
	"clicks" integer DEFAULT 0 NOT NULL,
	"ctr" real DEFAULT 0 NOT NULL,
	"aio_visible" boolean DEFAULT false NOT NULL,
	"last_update" varchar(20) NOT NULL,
	"spend_7d" jsonb NOT NULL,
	"category" varchar(60) NOT NULL,
	"signal" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sla_templates" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"vertical" "vertical" NOT NULL,
	"name" varchar(100) NOT NULL,
	"desc" text NOT NULL,
	"timeline" varchar(30) NOT NULL,
	"metric" varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transactions" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"type" "txn_type" NOT NULL,
	"agent" varchar(100) NOT NULL,
	"client" varchar(100) NOT NULL,
	"amount" integer NOT NULL,
	"currency" "currency" NOT NULL,
	"status" "txn_status" DEFAULT 'pending' NOT NULL,
	"date" varchar(20) NOT NULL,
	"vertical" "vertical" NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"role" "user_role" DEFAULT 'smb' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "user_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "waitlist" (
	"id" varchar(16) PRIMARY KEY NOT NULL,
	"email" varchar(255) NOT NULL,
	"image_uri" varchar(500),
	"status" "waitlist_status" DEFAULT 'pending' NOT NULL,
	"slot_number" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "waitlist_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "agents" ADD CONSTRAINT "agents_created_by_user_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intents" ADD CONSTRAINT "intents_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" USING btree ("identifier");--> statement-breakpoint
CREATE INDEX "waitlist_email_idx" ON "waitlist" USING btree ("email");