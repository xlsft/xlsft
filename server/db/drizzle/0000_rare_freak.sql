CREATE TABLE "canvas" (
	"coordinates" text PRIMARY KEY NOT NULL,
	"color" integer,
	"updated_at" timestamp DEFAULT now(),
	"updated_by" uuid,
	CONSTRAINT "canvas_coordinates_unique" UNIQUE("coordinates")
);
--> statement-breakpoint
CREATE TABLE "request" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text NOT NULL,
	"contact" text NOT NULL,
	"source" text NOT NULL,
	"date" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "user" (
	"uuid" uuid PRIMARY KEY NOT NULL,
	"id" bigint NOT NULL,
	"name" text NOT NULL,
	"online" boolean DEFAULT false,
	CONSTRAINT "user_uuid_unique" UNIQUE("uuid"),
	CONSTRAINT "user_id_unique" UNIQUE("id")
);
--> statement-breakpoint
ALTER TABLE "canvas" ADD CONSTRAINT "canvas_updated_by_user_uuid_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."user"("uuid") ON DELETE no action ON UPDATE no action;