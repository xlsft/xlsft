ALTER TABLE "canvas" DROP CONSTRAINT "canvas_updated_by_user_uuid_fk";
--> statement-breakpoint
ALTER TABLE "canvas" ADD CONSTRAINT "canvas_updated_by_user_uuid_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("uuid") ON DELETE cascade ON UPDATE cascade;