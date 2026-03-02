const ComplaintModel = require('../models/complaint.model');
const OrderModel = require('../models/order.model');
const UserModel = require('../models/user.model');
const ComplaintAiService = require('../services/complaintAi.service');
const { pool } = require('../config/db');
const path = require('path');

const CLOSED_STATUSES = ['RESOLVED', 'AUTO_APPROVED', 'AUTO_REJECTED'];

const ComplaintController = {
  // POST /api/complaints
  async create(req, res) {
    try {
      const customer_id = req.user.id;
      const { order_id, type, description } = req.body;

      if (!order_id || !type) {
        return res
          .status(400)
          .json({ message: 'order_id and type are required' });
      }

      const allowedTypes = [
        'MISSING_ITEM',
        'QUALITY_ISSUE',
        'FOREIGN_OBJECT',
        'OTHER',
      ];
      if (!allowedTypes.includes(type)) {
        return res.status(400).json({ message: 'Invalid complaint type' });
      }

      // ensure order belongs to this customer
      const orders = await OrderModel.getOrdersForCustomer(customer_id);
      const order = orders.find((o) => o.id === Number(order_id));
      if (!order) {
        return res
          .status(404)
          .json({ message: 'Order not found for this customer' });
      }

      // prevent duplicate complaints on same order
      const existing = await ComplaintModel.findByOrderId(order_id, customer_id);
      if (existing) {
        return res
          .status(400)
          .json({ message: 'Complaint already exists for this order' });
      }

      // image handling: stored by multer in /uploads/complaints/...
      // Use absolute path so verify_image.py can read the file
      const image_path = req.file
        ? path.join(
            __dirname,
            '..',
            '..',
            'uploads',
            'complaints',
            req.file.filename
          )
        : null;

      // gather customer and restaurant stats for AI factors
      const customer = await UserModel.findById(customer_id);

      const [restStatsRows] = await pool.query(
        `SELECT COUNT(*) AS total_issues FROM complaints 
         WHERE restaurant_id = ? AND status = 'AUTO_APPROVED'`,
        [order.restaurant_id]
      );
      const restaurantStats = {
        total_issues: restStatsRows?.[0]?.total_issues ?? 0,
      };

      const risk_score =
        typeof order.risk_score === 'number' ? order.risk_score : null;

      // Multi-factor AI scoring (includes image check)
      console.log('DEBUG: calling scoreComplaint for order', order.id);

      const aiResult = await ComplaintAiService.scoreComplaint({
        complaint: { type, description, image_path },
        user: customer,
        order: { id: order.id, total_price: order.total_price },
        restaurantStats,
        risk_score,
      });

      console.log('DEBUG: aiResult =', aiResult);

      const image_is_ai = aiResult.image_is_ai || 0;

      let finalStatus = 'PENDING';
      let decision_reason = `AI decision: ${aiResult.ai_decision} (${aiResult.ai_score}/100) - ${aiResult.reasons.join(
        ', '
      )}`;

      // Base decision from text + trust + restaurant + order risk
      if (aiResult.ai_decision === 'APPROVE') {
        finalStatus = 'AUTO_APPROVED';
      } else if (aiResult.ai_decision === 'REJECT') {
        finalStatus = 'AUTO_REJECTED';
      }

      // HARD OVERRIDE: if image is AI-generated/manipulated, always reject
      if (image_is_ai === 1) {
        finalStatus = 'AUTO_REJECTED';
        decision_reason =
          'Rejected automatically: uploaded image flagged as AI-generated or manipulated.';
      }

      const complaint = await ComplaintModel.create({
        order_id,
        customer_id,
        restaurant_id: order.restaurant_id,
        type,
        description,
        image_path,
        image_is_ai,
        status: finalStatus,
        ai_score: aiResult.ai_score,
        decision_reason,
      });

      console.log(
        'AI_COMPLAINT_EVENT',
        JSON.stringify({
          complaint_id: complaint.id,
          customer_id,
          restaurant_id: order.restaurant_id,
          type,
          description,
          ai_score: aiResult.ai_score,
          ai_decision: aiResult.ai_decision,
          reasons: aiResult.reasons,
          final_status: finalStatus,
          image_is_ai,
          created_at: new Date().toISOString(),
        })
      );

      const io = req.app.get('io');
      io.emit('complaintCreated', {
        complaint_id: complaint.id,
        order_id,
        customer_id,
        restaurant_id: order.restaurant_id,
        status: finalStatus,
        ai_score: aiResult.ai_score,
        ai_decision: aiResult.ai_decision,
      });

      return res.status(201).json({
        message: 'Complaint submitted',
        complaint_id: complaint.id,
        status: finalStatus,
        decision_reason,
        ai_score: aiResult.ai_score,
        ai_decision: aiResult.ai_decision,
        image_path,
        image_is_ai,
      });
    } catch (err) {
      console.error('Create complaint error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/complaints/my
  async listForCustomer(req, res) {
    try {
      const customer_id = req.user.id;
      const complaints = await ComplaintModel.listForCustomer(customer_id);
      return res.json({ complaints });
    } catch (err) {
      console.error('List complaints customer error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/complaints/restaurant/:restaurantId
  async listForRestaurant(req, res) {
    try {
      const { restaurantId } = req.params;
      const complaints = await ComplaintModel.listForRestaurant(restaurantId);
      return res.json({ complaints });
    } catch (err) {
      console.error('List complaints restaurant error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/complaints/admin
  async listForAdmin(req, res) {
    try {
      const complaints = await ComplaintModel.listForAdmin();
      return res.json({ complaints });
    } catch (err) {
      console.error('List complaints admin error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET /api/complaints/admin/unprocessed
  async listUnprocessedForAI(req, res) {
    try {
      const [rows] = await pool.query(
        `SELECT * FROM complaints
          WHERE ai_score IS NULL AND status = 'PENDING'
          ORDER BY created_at DESC
          LIMIT 100`
      );
      return res.json({ complaints: rows });
    } catch (err) {
      console.error('List unprocessed complaints for AI error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // PATCH /api/complaints/:id/ai
  async updateAIFields(req, res) {
    try {
      const { id } = req.params;
      const { ai_score, status, decision_reason, image_is_ai } = req.body;

      await pool.query(
        `UPDATE complaints
          SET 
            ai_score = ?,
            status = COALESCE(?, status),
            decision_reason = COALESCE(?, decision_reason),
            image_is_ai = COALESCE(?, image_is_ai)
          WHERE id = ?`,
        [ai_score, status, decision_reason, image_is_ai, id]
      );

      const io = req.app.get('io');
      io.emit('complaintUpdated', {
        complaint_id: Number(id),
        status,
        ai_score,
      });

      return res.json({ message: 'Complaint AI fields updated' });
    } catch (err) {
      console.error('Update complaint AI fields error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // PUT /api/complaints/:id/manual-decision
  async manualDecision(req, res) {
    try {
      const { id } = req.params;
      const { status, decision_reason } = req.body;

      const allowed = [
        'AUTO_APPROVED',
        'AUTO_REJECTED',
        'ESCALATED',
        'RESOLVED',
      ];
      if (!allowed.includes(status)) {
        return res
          .status(400)
          .json({ message: 'Invalid status for manual decision' });
      }

      const complaint = await ComplaintModel.findById(id);
      if (!complaint) {
        return res.status(404).json({ message: 'Complaint not found' });
      }

      await ComplaintModel.updateStatus(id, status, decision_reason);

      const io = req.app.get('io');
      io.emit('complaintUpdated', {
        complaint_id: Number(id),
        status,
      });

      return res.json({ message: 'Complaint updated', status });
    } catch (err) {
      console.error('Manual complaint decision error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = ComplaintController;
