import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushSubscriptionFK1770400001000 implements MigrationInterface {
  name = 'AddPushSubscriptionFK1770400001000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add updatedAt column if not present
    await queryRunner.query(`
      ALTER TABLE "push_subscriptions"
        ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP NOT NULL DEFAULT now()
    `);

    // Make userId nullable (subscriptions can exist without a valid user reference)
    await queryRunner.query(`
      ALTER TABLE "push_subscriptions"
        ALTER COLUMN "userId" DROP NOT NULL
    `).catch(() => {
      // Column may already be nullable — ignore
    });

    // Add foreign key with CASCADE delete (safe — only removes subscription when user is deleted)
    await queryRunner.query(`
      ALTER TABLE "push_subscriptions"
        ADD CONSTRAINT "FK_push_subscriptions_userId"
        FOREIGN KEY ("userId") REFERENCES "users"("id")
        ON DELETE CASCADE
        ON UPDATE NO ACTION
    `).catch(() => {
      // FK may already exist — ignore
    });
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "push_subscriptions"
        DROP CONSTRAINT IF EXISTS "FK_push_subscriptions_userId"
    `);
    await queryRunner.query(`
      ALTER TABLE "push_subscriptions"
        DROP COLUMN IF EXISTS "updatedAt"
    `);
  }
}
