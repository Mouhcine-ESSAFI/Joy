import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCustomers1770400000000 implements MigrationInterface {
  name = 'AddCustomers1770400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "customers" (
        "id"                UUID NOT NULL DEFAULT uuid_generate_v4(),
        "shopifyCustomerId" character varying,
        "firstName"         character varying,
        "lastName"          character varying,
        "email"             character varying,
        "phone"             character varying,
        "country"           character varying,
        "city"              character varying,
        "totalOrders"       integer NOT NULL DEFAULT 0,
        "totalSpent"        numeric(10,2) NOT NULL DEFAULT '0',
        "storeId"           character varying,
        "storeDomain"       character varying,
        "createdAt"         TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt"         TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_customers" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customers_shopifyCustomerId" ON "customers" ("shopifyCustomerId")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customers_email" ON "customers" ("email")`);
    await queryRunner.query(`CREATE INDEX IF NOT EXISTS "IDX_customers_storeId" ON "customers" ("storeId")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_storeId"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_email"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_customers_shopifyCustomerId"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "customers"`);
  }
}
