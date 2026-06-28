import { MigrationInterface, QueryRunner } from 'typeorm';

export class SummaryAndTasks1730100000000 implements MigrationInterface {
  name = 'SummaryAndTasks1730100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "meeting_summaries" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "meeting_id" uuid NOT NULL,
        "status" character varying(16) NOT NULL DEFAULT 'pending',
        "content_markdown" text,
        "model" character varying(64),
        "processing_time_sec" double precision,
        "error_message" text,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_summaries" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_meeting_summaries_meeting" UNIQUE ("meeting_id"),
        CONSTRAINT "FK_meeting_summaries_meeting" FOREIGN KEY ("meeting_id")
          REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "meeting_tasks" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "meeting_id" uuid NOT NULL,
        "summary_id" uuid,
        "title" text NOT NULL,
        "assignee" character varying(200),
        "due_date" date,
        "completed" boolean NOT NULL DEFAULT false,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_meeting_tasks" PRIMARY KEY ("id"),
        CONSTRAINT "FK_meeting_tasks_meeting" FOREIGN KEY ("meeting_id")
          REFERENCES "meetings"("id") ON DELETE CASCADE ON UPDATE NO ACTION,
        CONSTRAINT "FK_meeting_tasks_summary" FOREIGN KEY ("summary_id")
          REFERENCES "meeting_summaries"("id") ON DELETE CASCADE ON UPDATE NO ACTION
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_meeting_tasks_meeting_id"
      ON "meeting_tasks" ("meeting_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_meeting_tasks_meeting_id"`);
    await queryRunner.query(`DROP TABLE "meeting_tasks"`);
    await queryRunner.query(`DROP TABLE "meeting_summaries"`);
  }
}
