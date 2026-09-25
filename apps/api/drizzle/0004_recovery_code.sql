ALTER TABLE "users" ADD COLUMN "recovery_code_hash" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "recovery_code_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_recovery_code_hash_unique" UNIQUE("recovery_code_hash");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_recovery_code_pair" CHECK (("users"."recovery_code_hash" is null) = ("users"."recovery_code_created_at" is null));