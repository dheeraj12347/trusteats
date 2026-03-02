const cron = require('node-cron');
const { pool } = require('../config/db');

function startOrderCleanupJob() {
  // Run every minute
  cron.schedule('* * * * *', async () => {
    try {
      // 1) Delivered + AI has given a final decision (AUTO_APPROVED / AUTO_REJECTED) → archive
      await pool.query(
        `UPDATE orders o
         JOIN complaints c ON c.order_id = o.id
         SET o.is_archived = 1
         WHERE o.status = 'DELIVERED'
           AND o.is_archived = 0
           AND c.status IN ('AUTO_APPROVED', 'AUTO_REJECTED')`
      );

      // 2) Delivered, no complaint at all, older than 30 minutes → archive
      await pool.query(
        `UPDATE orders o
         LEFT JOIN complaints c ON c.order_id = o.id
         SET o.is_archived = 1
         WHERE o.status = 'DELIVERED'
           AND o.is_archived = 0
           AND c.id IS NULL
           AND o.delivered_at IS NOT NULL
           AND o.delivered_at < (NOW() - INTERVAL 30 MINUTE)`
      );
    } catch (err) {
      console.error('Order cleanup job error:', err);
    }
  });
}

module.exports = { startOrderCleanupJob };
