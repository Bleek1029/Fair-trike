/**
 * Migration template for node-pg-migrate
 * Generated migration files should export up and down functions
 */

export async function up(pgm) {
  // Write migration UP logic here
  // Example:
  // pgm.createTable('table_name', {
  //   id: { type: 'serial', primaryKey: true },
  //   name: { type: 'varchar(255)', notNull: true },
  //   created_at: { type: 'timestamptz', notNull: true, default: pgm.func('NOW()') },
  // });
}

export async function down(pgm) {
  // Write migration DOWN logic here (reverse of up)
  // Example:
  // pgm.dropTable('table_name');
}