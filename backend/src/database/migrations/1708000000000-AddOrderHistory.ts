import { MigrationInterface, QueryRunner, Table, TableIndex, TableForeignKey } from 'typeorm';

export class AddOrderHistory1708000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'order_history',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'orderId',
            type: 'uuid',
          },
          {
            name: 'type',
            type: 'enum',
            enum: [
              'status_change',
              'note_added',
              'driver_assigned',
              'driver_unassigned',
              'field_updated',
              'supplement_added',
              'supplement_removed',
            ],
          },
          {
            name: 'userId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'oldStatus',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'newStatus',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'fieldName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'oldValue',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'newValue',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'note',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'driverId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'driverName',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'supplementId',
            type: 'uuid',
            isNullable: true,
          },
          {
            name: 'supplementLabel',
            type: 'varchar',
            isNullable: true,
          },
          {
            name: 'supplementAmount',
            type: 'decimal',
            precision: 10,
            scale: 2,
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            default: "'{}'",
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    // Create indexes
    await queryRunner.createIndex(
      'order_history',
      new TableIndex({
        name: 'IDX_order_history_orderId',
        columnNames: ['orderId'],
      }),
    );

    await queryRunner.createIndex(
      'order_history',
      new TableIndex({
        name: 'IDX_order_history_orderId_createdAt',
        columnNames: ['orderId', 'createdAt'],
      }),
    );

    await queryRunner.createIndex(
      'order_history',
      new TableIndex({
        name: 'IDX_order_history_type',
        columnNames: ['type'],
      }),
    );

    // Create foreign keys
    await queryRunner.createForeignKey(
      'order_history',
      new TableForeignKey({
        columnNames: ['orderId'],
        referencedTableName: 'orders',
        referencedColumnNames: ['id'],
        onDelete: 'CASCADE',
      }),
    );

    await queryRunner.createForeignKey(
      'order_history',
      new TableForeignKey({
        columnNames: ['userId'],
        referencedTableName: 'users',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropTable('order_history');
  }
}