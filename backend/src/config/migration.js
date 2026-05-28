const { pool } = require('./db');

async function runMigration() {
  console.log('Starting MySQL database migration...');
  const conn = await pool.getConnection();

  try {
    // 1. Check duplicate complaints
    console.log('Checking for duplicate complaints per order...');
    const [duplicates] = await conn.query(
      `SELECT order_id, COUNT(*) as count FROM complaints GROUP BY order_id HAVING count > 1`
    );

    if (duplicates.length > 0) {
      console.log(`Found ${duplicates.length} orders with duplicate complaints. Cleaning up duplicates, keeping only the latest...`);
      await conn.query(`
        DELETE FROM complaints WHERE id NOT IN (
          SELECT max_id FROM (
            SELECT MAX(id) AS max_id FROM complaints GROUP BY order_id
          ) AS tmp
        )
      `);
      console.log('Duplicate complaints cleaned.');
    } else {
      console.log('No duplicate complaints found.');
    }

    // 2. Add Unique Index on order_id if it doesn't exist
    const [indexes] = await conn.query(`
      SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = 'trusteats_db' AND TABLE_NAME = 'complaints' AND INDEX_NAME = 'unique_order_id'
    `);

    if (indexes.length === 0) {
      console.log('Adding UNIQUE index on order_id to complaints table...');
      await conn.query(`ALTER TABLE complaints ADD UNIQUE INDEX unique_order_id (order_id)`);
      console.log('UNIQUE index added successfully.');
    } else {
      console.log('UNIQUE index on order_id already exists.');
    }

    // 3. Add new columns if they do not exist
    const [columns] = await conn.query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'trusteats_db' AND TABLE_NAME = 'complaints'
    `);

    const existingColumns = columns.map(c => c.COLUMN_NAME.toLowerCase());

    const columnsToAdd = [
      { name: 'image_path_2', definition: 'VARCHAR(255) NULL' },
      { name: 'image_path_3', definition: 'VARCHAR(255) NULL' },
      { name: 'image_hash', definition: 'VARCHAR(64) NULL' },
      { name: 'image_hash_2', definition: 'VARCHAR(64) NULL' },
      { name: 'image_hash_3', definition: 'VARCHAR(64) NULL' },
      { name: 'challenge_sequence', definition: 'VARCHAR(255) NULL' },
      { name: 'challenge_completed', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'suspicious_capture', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'verification_confidence', definition: 'FLOAT NULL' },
      { name: 'verification_reason', definition: 'TEXT NULL' },
      { name: 'verification_decision', definition: 'VARCHAR(50) NULL' },
      { name: 'trust_score', definition: 'INT NULL' },
      { name: 'predicted_label', definition: 'VARCHAR(255) NULL' },
      { name: 'prediction_confidence', definition: 'FLOAT NULL' },
      { name: 'face_detected', definition: 'TINYINT(1) DEFAULT 0' },
      { name: 'expected_labels', definition: 'VARCHAR(255) NULL' },
      { name: 'verifier_decision', definition: 'VARCHAR(50) NULL' },
      { name: 'verifier_reason', definition: 'TEXT NULL' },
      { name: 'mismatch_attempts', definition: 'INT DEFAULT 0' },
      { name: 'warning_state', definition: 'VARCHAR(50) NULL' },
      { name: 'raw_verifier_response', definition: 'TEXT NULL' },
      { name: 'updated_at', definition: 'TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP' }
    ];

    for (const col of columnsToAdd) {
      if (!existingColumns.includes(col.name.toLowerCase())) {
        console.log(`Adding column ${col.name}...`);
        await conn.query(`ALTER TABLE complaints ADD COLUMN ${col.name} ${col.definition}`);
        console.log(`Column ${col.name} added.`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }

    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
  } finally {
    conn.release();
    process.exit(0);
  }
}

runMigration();
