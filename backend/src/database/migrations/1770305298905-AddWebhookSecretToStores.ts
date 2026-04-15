import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddWebhookSecretToStores1770305298905 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add webhookSecret column
        await queryRunner.addColumn('shopify_stores', new TableColumn({
            name: 'webhookSecret',
            type: 'varchar',
            isNullable: true,
        }));

        // Add lastSyncedAt column
        await queryRunner.addColumn('shopify_stores', new TableColumn({
            name: 'lastSyncedAt',
            type: 'timestamp',
            isNullable: true,
        }));

        // Add lastOrderFetchedAt column
        await queryRunner.addColumn('shopify_stores', new TableColumn({
            name: 'lastOrderFetchedAt',
            type: 'timestamp',
            isNullable: true,
        }));

        // Add initialSyncCompleted column
        await queryRunner.addColumn('shopify_stores', new TableColumn({
            name: 'initialSyncCompleted',
            type: 'boolean',
            default: false,
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn('shopify_stores', 'webhookSecret');
        await queryRunner.dropColumn('shopify_stores', 'lastSyncedAt');
        await queryRunner.dropColumn('shopify_stores', 'lastOrderFetchedAt');
        await queryRunner.dropColumn('shopify_stores', 'initialSyncCompleted');
    }
}
