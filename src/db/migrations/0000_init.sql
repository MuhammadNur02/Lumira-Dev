CREATE SCHEMA IF NOT EXISTS "app";
--> statement-breakpoint
CREATE TYPE "app"."actor_type" AS ENUM('buyer', 'admin', 'system', 'cli', 'registry');--> statement-breakpoint
CREATE TYPE "app"."checkout_status" AS ENUM('initiated', 'completed', 'abandoned', 'expired');--> statement-breakpoint
CREATE TYPE "app"."discord_link_status" AS ENUM('active', 'revoked');--> statement-breakpoint
CREATE TYPE "app"."discount_status" AS ENUM('active', 'expired', 'deleted');--> statement-breakpoint
CREATE TYPE "app"."download_channel" AS ENUM('dashboard', 'success_page', 'email_link', 'admin');--> statement-breakpoint
CREATE TYPE "app"."download_status" AS ENUM('granted', 'denied', 'rate_limited');--> statement-breakpoint
CREATE TYPE "app"."email_status" AS ENUM('pending', 'sent', 'delivered', 'failed', 'bounced', 'complained');--> statement-breakpoint
CREATE TYPE "app"."entitlement_kind" AS ENUM('license', 'all_access', 'comp');--> statement-breakpoint
CREATE TYPE "app"."entitlement_status" AS ENUM('active', 'suspended', 'revoked');--> statement-breakpoint
CREATE TYPE "app"."instance_source" AS ENUM('cli', 'registry', 'dashboard', 'external');--> statement-breakpoint
CREATE TYPE "app"."job_kind" AS ENUM('license_keys_fetch', 'license_key_disable', 'license_key_enable', 'discord_grant', 'discord_revoke', 'analytics_capture', 'release_notify');--> statement-breakpoint
CREATE TYPE "app"."job_status" AS ENUM('pending', 'done', 'failed');--> statement-breakpoint
CREATE TYPE "app"."license_event_type" AS ENUM('issued', 'activated', 'deactivated', 'validated', 'validation_failed', 'disabled', 'enabled', 'revealed', 'limit_changed');--> statement-breakpoint
CREATE TYPE "app"."license_key_status" AS ENUM('inactive', 'active', 'expired', 'disabled');--> statement-breakpoint
CREATE TYPE "app"."license_tier" AS ENUM('personal', 'team', 'extended', 'all_access');--> statement-breakpoint
CREATE TYPE "app"."order_status" AS ENUM('pending', 'failed', 'paid', 'refunded', 'partial_refund');--> statement-breakpoint
CREATE TYPE "app"."payment_event_type" AS ENUM('payment_failed', 'payment_recovered', 'payment_refunded');--> statement-breakpoint
CREATE TYPE "app"."product_line" AS ENUM('boilerplate', 'ui_kit', 'template');--> statement-breakpoint
CREATE TYPE "app"."release_status" AS ENUM('draft', 'published', 'yanked');--> statement-breakpoint
CREATE TYPE "app"."subscription_status" AS ENUM('on_trial', 'active', 'paused', 'past_due', 'unpaid', 'cancelled', 'expired');--> statement-breakpoint
CREATE TYPE "app"."user_role" AS ENUM('buyer', 'admin');--> statement-breakpoint
CREATE TYPE "app"."webhook_source" AS ENUM('lemonsqueezy', 'clerk', 'sanity', 'resend');--> statement-breakpoint
CREATE TYPE "app"."webhook_status" AS ENUM('received', 'processed', 'failed', 'ignored');--> statement-breakpoint
CREATE TABLE "app"."audit_log" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_user_id" text NOT NULL,
	"action" text NOT NULL,
	"target_type" text NOT NULL,
	"target_id" text NOT NULL,
	"before" jsonb,
	"after" jsonb,
	"reason" text,
	"ip_hash" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."checkout_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"email" text,
	"ls_variant_id" bigint NOT NULL,
	"ls_checkout_id" text,
	"status" "app"."checkout_status" DEFAULT 'initiated' NOT NULL,
	"discount_code" text,
	"utm" jsonb,
	"ph_distinct_id" text,
	"ip_hash" text,
	"order_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."discord_links" (
	"user_id" text PRIMARY KEY NOT NULL,
	"discord_user_id" text NOT NULL,
	"discord_username" text,
	"status" "app"."discord_link_status" DEFAULT 'active' NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app"."discounts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ls_discount_id" bigint NOT NULL,
	"code" text NOT NULL,
	"name" text NOT NULL,
	"amount" integer NOT NULL,
	"amount_type" text NOT NULL,
	"duration" text,
	"duration_in_months" integer,
	"variant_ids" bigint[] DEFAULT '{}'::bigint[] NOT NULL,
	"max_redemptions" integer,
	"starts_at" timestamp with time zone,
	"expires_at" timestamp with time zone,
	"status" "app"."discount_status" DEFAULT 'active' NOT NULL,
	"test_mode" boolean DEFAULT false NOT NULL,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."download_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"release_id" uuid NOT NULL,
	"user_id" text,
	"customer_email" text,
	"entitlement_id" uuid,
	"channel" "app"."download_channel" NOT NULL,
	"status" "app"."download_status" NOT NULL,
	"deny_reason" text,
	"ip_hash" text,
	"country" text,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."download_tokens" (
	"jti" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"product_id" text NOT NULL,
	"release_id" uuid,
	"max_uses" integer DEFAULT 5 NOT NULL,
	"uses" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."email_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"template" text NOT NULL,
	"to" text NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "app"."email_status" DEFAULT 'pending' NOT NULL,
	"resend_id" text,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"sent_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."entitlements" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" text,
	"customer_email" text NOT NULL,
	"kind" "app"."entitlement_kind" NOT NULL,
	"product_id" text,
	"tier" "app"."license_tier",
	"max_major" integer,
	"source_order_item_id" uuid,
	"source_subscription_id" uuid,
	"status" "app"."entitlement_status" DEFAULT 'active' NOT NULL,
	"valid_from" timestamp with time zone DEFAULT now() NOT NULL,
	"valid_until" timestamp with time zone,
	"granted_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."job_outbox" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"kind" "app"."job_kind" NOT NULL,
	"payload" jsonb NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" "app"."job_status" DEFAULT 'pending' NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"next_attempt_at" timestamp with time zone DEFAULT now() NOT NULL,
	"last_error" text,
	"done_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."license_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"license_key_id" uuid NOT NULL,
	"type" "app"."license_event_type" NOT NULL,
	"actor" "app"."actor_type" NOT NULL,
	"actor_user_id" text,
	"instance_id" uuid,
	"ip_hash" text,
	"country" text,
	"user_agent" text,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."license_instances" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ls_instance_id" text NOT NULL,
	"license_key_id" uuid NOT NULL,
	"name" text NOT NULL,
	"source" "app"."instance_source" NOT NULL,
	"last_validated_at" timestamp with time zone,
	"deactivated_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."license_keys" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ls_license_key_id" bigint NOT NULL,
	"ls_order_id" bigint NOT NULL,
	"ls_order_item_id" bigint NOT NULL,
	"ls_product_id" bigint NOT NULL,
	"order_id" uuid,
	"subscription_id" uuid,
	"user_id" text,
	"customer_email" text NOT NULL,
	"key_ciphertext" text NOT NULL,
	"key_hash" text NOT NULL,
	"key_short" text NOT NULL,
	"status" "app"."license_key_status" NOT NULL,
	"activation_limit" integer,
	"instances_count" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."mrr_snapshots" (
	"date" date PRIMARY KEY NOT NULL,
	"mrr_cents" integer NOT NULL,
	"active_subscriptions" integer NOT NULL,
	"new_cents" integer NOT NULL,
	"expansion_cents" integer NOT NULL,
	"contraction_cents" integer NOT NULL,
	"churned_cents" integer NOT NULL,
	"reactivated_cents" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."mrr_subscription_days" (
	"subscription_id" uuid NOT NULL,
	"date" date NOT NULL,
	"mrr_cents" integer NOT NULL,
	CONSTRAINT "mrr_subscription_days_subscription_id_date_pk" PRIMARY KEY("subscription_id","date")
);
--> statement-breakpoint
CREATE TABLE "app"."order_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"order_id" uuid NOT NULL,
	"ls_order_item_id" bigint NOT NULL,
	"ls_variant_id" bigint NOT NULL,
	"price_usd" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."orders" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ls_order_id" bigint NOT NULL,
	"order_number" integer NOT NULL,
	"user_id" text,
	"customer_email" text NOT NULL,
	"status" "app"."order_status" NOT NULL,
	"currency" text NOT NULL,
	"subtotal_usd" integer NOT NULL,
	"discount_usd" integer DEFAULT 0 NOT NULL,
	"tax_usd" integer DEFAULT 0 NOT NULL,
	"total_usd" integer NOT NULL,
	"discount_code" text,
	"receipt_url" text,
	"checkout_session_id" uuid,
	"test_mode" boolean DEFAULT false NOT NULL,
	"refunded_at" timestamp with time zone,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."payment_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"type" "app"."payment_event_type" NOT NULL,
	"user_id" text,
	"subscription_id" uuid,
	"order_id" uuid,
	"amount_usd" integer,
	"attempt" integer,
	"ls_invoice_id" bigint,
	"meta" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."products" (
	"id" text PRIMARY KEY NOT NULL,
	"slug" text NOT NULL,
	"name" text NOT NULL,
	"line" "app"."product_line" NOT NULL,
	"in_all_access" boolean DEFAULT true NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."releases" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"product_id" text NOT NULL,
	"semver" text NOT NULL,
	"major" integer NOT NULL,
	"minor" integer NOT NULL,
	"patch" integer NOT NULL,
	"r2_key" text NOT NULL,
	"size_bytes" bigint NOT NULL,
	"sha256" text NOT NULL,
	"status" "app"."release_status" DEFAULT 'draft' NOT NULL,
	"sanity_release_id" text,
	"published_at" timestamp with time zone,
	"created_by" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."subscription_invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ls_invoice_id" bigint NOT NULL,
	"subscription_id" uuid NOT NULL,
	"status" text NOT NULL,
	"billing_reason" text NOT NULL,
	"subtotal_usd" integer NOT NULL,
	"discount_usd" integer DEFAULT 0 NOT NULL,
	"tax_usd" integer NOT NULL,
	"total_usd" integer NOT NULL,
	"test_mode" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."subscriptions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ls_subscription_id" bigint NOT NULL,
	"ls_order_id" bigint NOT NULL,
	"user_id" text,
	"customer_email" text NOT NULL,
	"ls_variant_id" bigint NOT NULL,
	"status" "app"."subscription_status" NOT NULL,
	"interval" text NOT NULL,
	"unit_price_usd" integer NOT NULL,
	"card_brand" text,
	"card_last_four" text,
	"renews_at" timestamp with time zone,
	"ends_at" timestamp with time zone,
	"trial_ends_at" timestamp with time zone,
	"past_due_since" timestamp with time zone,
	"test_mode" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"role" "app"."user_role" DEFAULT 'buyer' NOT NULL,
	"ls_customer_id" bigint,
	"release_emails" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"email_bounced_at" timestamp with time zone,
	"deleted_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."variants" (
	"ls_variant_id" bigint PRIMARY KEY NOT NULL,
	"ls_product_id" bigint NOT NULL,
	"product_id" text,
	"tier" "app"."license_tier" NOT NULL,
	"activation_limit" integer,
	"price_cents" integer NOT NULL,
	"interval" text,
	"bundle_product_ids" text[] DEFAULT '{}'::text[] NOT NULL,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app"."webhook_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"source" "app"."webhook_source" NOT NULL,
	"event_name" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"payload" jsonb NOT NULL,
	"status" "app"."webhook_status" DEFAULT 'received' NOT NULL,
	"error" text,
	"attempts" integer DEFAULT 1 NOT NULL,
	"duration_ms" integer,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL,
	"processed_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "app"."audit_log" ADD CONSTRAINT "audit_log_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_sessions" ADD CONSTRAINT "checkout_sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."checkout_sessions" ADD CONSTRAINT "checkout_sessions_ls_variant_id_variants_ls_variant_id_fk" FOREIGN KEY ("ls_variant_id") REFERENCES "app"."variants"("ls_variant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."discord_links" ADD CONSTRAINT "discord_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."discounts" ADD CONSTRAINT "discounts_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_events" ADD CONSTRAINT "download_events_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "app"."releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_events" ADD CONSTRAINT "download_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_events" ADD CONSTRAINT "download_events_entitlement_id_entitlements_id_fk" FOREIGN KEY ("entitlement_id") REFERENCES "app"."entitlements"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_tokens" ADD CONSTRAINT "download_tokens_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_tokens" ADD CONSTRAINT "download_tokens_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."download_tokens" ADD CONSTRAINT "download_tokens_release_id_releases_id_fk" FOREIGN KEY ("release_id") REFERENCES "app"."releases"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."entitlements" ADD CONSTRAINT "entitlements_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."entitlements" ADD CONSTRAINT "entitlements_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."entitlements" ADD CONSTRAINT "entitlements_source_order_item_id_order_items_id_fk" FOREIGN KEY ("source_order_item_id") REFERENCES "app"."order_items"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."entitlements" ADD CONSTRAINT "entitlements_source_subscription_id_subscriptions_id_fk" FOREIGN KEY ("source_subscription_id") REFERENCES "app"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."license_events" ADD CONSTRAINT "license_events_license_key_id_license_keys_id_fk" FOREIGN KEY ("license_key_id") REFERENCES "app"."license_keys"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."license_events" ADD CONSTRAINT "license_events_instance_id_license_instances_id_fk" FOREIGN KEY ("instance_id") REFERENCES "app"."license_instances"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."license_instances" ADD CONSTRAINT "license_instances_license_key_id_license_keys_id_fk" FOREIGN KEY ("license_key_id") REFERENCES "app"."license_keys"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."license_keys" ADD CONSTRAINT "license_keys_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."license_keys" ADD CONSTRAINT "license_keys_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "app"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."license_keys" ADD CONSTRAINT "license_keys_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."mrr_subscription_days" ADD CONSTRAINT "mrr_subscription_days_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "app"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_items" ADD CONSTRAINT "order_items_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."order_items" ADD CONSTRAINT "order_items_ls_variant_id_variants_ls_variant_id_fk" FOREIGN KEY ("ls_variant_id") REFERENCES "app"."variants"("ls_variant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."orders" ADD CONSTRAINT "orders_checkout_session_id_checkout_sessions_id_fk" FOREIGN KEY ("checkout_session_id") REFERENCES "app"."checkout_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_events" ADD CONSTRAINT "payment_events_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_events" ADD CONSTRAINT "payment_events_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "app"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."payment_events" ADD CONSTRAINT "payment_events_order_id_orders_id_fk" FOREIGN KEY ("order_id") REFERENCES "app"."orders"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."releases" ADD CONSTRAINT "releases_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."releases" ADD CONSTRAINT "releases_created_by_users_id_fk" FOREIGN KEY ("created_by") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subscription_invoices" ADD CONSTRAINT "subscription_invoices_subscription_id_subscriptions_id_fk" FOREIGN KEY ("subscription_id") REFERENCES "app"."subscriptions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subscriptions" ADD CONSTRAINT "subscriptions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "app"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."subscriptions" ADD CONSTRAINT "subscriptions_ls_variant_id_variants_ls_variant_id_fk" FOREIGN KEY ("ls_variant_id") REFERENCES "app"."variants"("ls_variant_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app"."variants" ADD CONSTRAINT "variants_product_id_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "app"."products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "audit_log_target_idx" ON "app"."audit_log" USING btree ("target_type","target_id");--> statement-breakpoint
CREATE INDEX "audit_log_created_idx" ON "app"."audit_log" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "checkout_sessions_status_created_idx" ON "app"."checkout_sessions" USING btree ("status","created_at");--> statement-breakpoint
CREATE INDEX "checkout_sessions_ip_created_idx" ON "app"."checkout_sessions" USING btree ("ip_hash","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "discord_links_discord_uq" ON "app"."discord_links" USING btree ("discord_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discounts_ls_uq" ON "app"."discounts" USING btree ("ls_discount_id");--> statement-breakpoint
CREATE UNIQUE INDEX "discounts_code_live_uq" ON "app"."discounts" USING btree ("code") WHERE status <> 'deleted';--> statement-breakpoint
CREATE INDEX "download_events_user_created_idx" ON "app"."download_events" USING btree ("user_id","created_at");--> statement-breakpoint
CREATE INDEX "download_events_release_idx" ON "app"."download_events" USING btree ("release_id");--> statement-breakpoint
CREATE INDEX "download_events_created_idx" ON "app"."download_events" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "download_tokens_order_idx" ON "app"."download_tokens" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "email_outbox_idem_uq" ON "app"."email_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "email_outbox_due_idx" ON "app"."email_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "email_outbox_resend_idx" ON "app"."email_outbox" USING btree ("resend_id");--> statement-breakpoint
CREATE INDEX "email_outbox_to_idx" ON "app"."email_outbox" USING btree ("to");--> statement-breakpoint
CREATE INDEX "entitlements_user_idx" ON "app"."entitlements" USING btree ("user_id","status");--> statement-breakpoint
CREATE INDEX "entitlements_email_idx" ON "app"."entitlements" USING btree ("customer_email");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_item_product_uq" ON "app"."entitlements" USING btree ("source_order_item_id","product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "entitlements_subscription_uq" ON "app"."entitlements" USING btree ("source_subscription_id") WHERE source_subscription_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "job_outbox_idem_uq" ON "app"."job_outbox" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "job_outbox_due_idx" ON "app"."job_outbox" USING btree ("status","next_attempt_at");--> statement-breakpoint
CREATE INDEX "license_events_key_created_idx" ON "app"."license_events" USING btree ("license_key_id","created_at");--> statement-breakpoint
CREATE INDEX "license_events_type_created_idx" ON "app"."license_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "license_instances_ls_uq" ON "app"."license_instances" USING btree ("ls_instance_id");--> statement-breakpoint
CREATE INDEX "license_instances_key_idx" ON "app"."license_instances" USING btree ("license_key_id");--> statement-breakpoint
CREATE UNIQUE INDEX "license_keys_ls_uq" ON "app"."license_keys" USING btree ("ls_license_key_id");--> statement-breakpoint
CREATE UNIQUE INDEX "license_keys_hash_uq" ON "app"."license_keys" USING btree ("key_hash");--> statement-breakpoint
CREATE INDEX "license_keys_user_idx" ON "app"."license_keys" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "license_keys_ls_order_idx" ON "app"."license_keys" USING btree ("ls_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "order_items_ls_uq" ON "app"."order_items" USING btree ("ls_order_item_id");--> statement-breakpoint
CREATE INDEX "order_items_order_idx" ON "app"."order_items" USING btree ("order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "orders_ls_order_id_uq" ON "app"."orders" USING btree ("ls_order_id");--> statement-breakpoint
CREATE INDEX "orders_user_idx" ON "app"."orders" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "orders_email_idx" ON "app"."orders" USING btree ("customer_email");--> statement-breakpoint
CREATE INDEX "orders_created_idx" ON "app"."orders" USING btree ("created_at");--> statement-breakpoint
CREATE INDEX "payment_events_type_created_idx" ON "app"."payment_events" USING btree ("type","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "payment_events_invoice_type_uq" ON "app"."payment_events" USING btree ("ls_invoice_id","type") WHERE ls_invoice_id is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "products_slug_uq" ON "app"."products" USING btree ("slug");--> statement-breakpoint
CREATE UNIQUE INDEX "releases_product_semver_uq" ON "app"."releases" USING btree ("product_id","semver");--> statement-breakpoint
CREATE UNIQUE INDEX "releases_r2_key_uq" ON "app"."releases" USING btree ("r2_key");--> statement-breakpoint
CREATE INDEX "releases_product_published_idx" ON "app"."releases" USING btree ("product_id","published_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscription_invoices_ls_uq" ON "app"."subscription_invoices" USING btree ("ls_invoice_id");--> statement-breakpoint
CREATE INDEX "subscription_invoices_created_idx" ON "app"."subscription_invoices" USING btree ("created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "subscriptions_ls_uq" ON "app"."subscriptions" USING btree ("ls_subscription_id");--> statement-breakpoint
CREATE INDEX "subscriptions_status_idx" ON "app"."subscriptions" USING btree ("status");--> statement-breakpoint
CREATE INDEX "subscriptions_user_idx" ON "app"."subscriptions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "subscriptions_ls_order_idx" ON "app"."subscriptions" USING btree ("ls_order_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "app"."users" USING btree ("email");--> statement-breakpoint
CREATE INDEX "variants_ls_product_idx" ON "app"."variants" USING btree ("ls_product_id");--> statement-breakpoint
CREATE UNIQUE INDEX "webhook_events_idem_uq" ON "app"."webhook_events" USING btree ("idempotency_key");--> statement-breakpoint
CREATE INDEX "webhook_events_source_received_idx" ON "app"."webhook_events" USING btree ("source","received_at");