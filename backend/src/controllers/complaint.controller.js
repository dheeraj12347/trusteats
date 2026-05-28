const ComplaintModel = require('../models/complaint.model');
const OrderModel = require('../models/order.model');
const UserModel = require('../models/user.model');
const ComplaintAiService = require('../services/complaintAi.service');
const ComplaintDecisionService = require('../services/complaintDecision.service');
const { getExpectedFoodLabels } = require('../config/foodMapping');
const { pool } = require('../config/db');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');

const CLOSED_STATUSES = ['RESOLVED', 'AUTO_APPROVED', 'AUTO_REJECTED'];

function getFileHash(filePath) {
  try {
    const fileBuffer = fs.readFileSync(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  } catch (err) {
    console.error('Error generating file hash:', err);
    return null;
  }
}

const ComplaintController = {
  // POST /api/complaints
  async create(req, res) {
    try {
      const customer_id = req.user.id;
      const { order_id, type, description, challenge_sequence, challenge_completed } = req.body;

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

      // STRICT BUSINESS RULE: Complaint allowed only if order.status === "DELIVERED"
      if (order.status !== 'DELIVERED') {
        return res
          .status(400)
          .json({ message: 'Complaints can only be created for delivered orders.' });
      }

      // prevent duplicate complaints on same order, except if it is a retry after food mismatch warning
      const existing = await ComplaintModel.findByOrderId(order_id, customer_id);
      let isRetry = false;
      if (existing) {
        if (existing.warning_state === 'WARNING_SENT' && existing.mismatch_attempts === 1) {
          isRetry = true;
        } else {
          return res
            .status(400)
            .json({ message: 'Complaint already exists for this order' });
        }
      }

      // STRICT BACKEND VALIDATION: Exactly 3 images required
      if (!req.files || !Array.isArray(req.files) || req.files.length !== 3) {
        return res
          .status(400)
          .json({ message: 'Exactly 3 camera evidence images are required for verification.' });
      }

      // Check mime types
      const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/gif', 'image/webp'];
      for (const file of req.files) {
        if (!allowedMimeTypes.includes(file.mimetype)) {
          return res.status(400).json({ message: 'Only images (jpeg, png, gif, webp) are allowed.' });
        }
      }

      const image_path = path.join(__dirname, '..', '..', 'uploads', 'complaints', req.files[0].filename);
      const image_path_2 = path.join(__dirname, '..', '..', 'uploads', 'complaints', req.files[1].filename);
      const image_path_3 = path.join(__dirname, '..', '..', 'uploads', 'complaints', req.files[2].filename);

      // Calculate SHA-256 hashes of all 3 images
      const image_hash = getFileHash(image_path);
      const image_hash_2 = getFileHash(image_path_2);
      const image_hash_3 = getFileHash(image_path_3);

      // Query the menu items ordered
      const [orderItems] = await pool.query(
        `SELECT m.item_name FROM order_items oi
         JOIN menu m ON oi.menu_id = m.id
         WHERE oi.order_id = ?`,
        [order_id]
      );
      
      const expectedLabelsSet = new Set();
      for (const item of orderItems) {
        const labels = getExpectedFoodLabels(item.item_name);
        labels.forEach(l => expectedLabelsSet.add(l));
      }
      const expectedLabels = [...expectedLabelsSet];
      const expectedLabelsStr = expectedLabels.join(',');

      // VERIFICATION FIRST FLOW
      console.log('DEBUG: calling verifyImage for order', order.id, 'expected labels:', expectedLabelsStr);
      const verification = await ComplaintAiService.verifyImage(
        image_path,
        image_path_2,
        image_path_3,
        challenge_sequence,
        expectedLabelsStr
      );
      console.log('DEBUG: verification result =', verification);

      // Evaluate the complaint decision (including status, warning state, attempts, etc.)
      const decisionResult = ComplaintDecisionService.evaluateComplaint({
        verifierResult: verification,
        existingComplaint: isRetry ? existing : null
      });

      let finalStatus = decisionResult.status;
      let decision_reason = decisionResult.reason;
      let aiResult = null;

      // Run trust scoring only if the decision status is PENDING (meaning verification passed or is uncertain)
      if (finalStatus === 'PENDING') {
        const customer = await UserModel.findById(customer_id);
        const [restStatsRows] = await pool.query(
          `SELECT COUNT(*) AS total_issues FROM complaints 
           WHERE restaurant_id = ? AND status = 'AUTO_APPROVED'`,
          [order.restaurant_id]
        );
        const restaurantStats = {
          total_issues: restStatsRows?.[0]?.total_issues ?? 0,
        };

        const risk_score = typeof order.risk_score === 'number' ? order.risk_score : null;

        aiResult = await ComplaintAiService.scoreComplaint({
          complaint: { type, description, image_path },
          user: customer,
          order: { id: order.id, total_price: order.total_price },
          restaurantStats,
          risk_score,
          image_is_ai: verification.is_ai_generated ? 1 : 0,
        });

        // FORCE finalStatus to PENDING (strictly no auto-approvals based on model prediction or trust scores)
        finalStatus = 'PENDING';
      }

      const customer = await UserModel.findById(customer_id);

      const complaintData = {
        order_id,
        customer_id,
        restaurant_id: order.restaurant_id,
        type,
        description,
        image_path,
        image_path_2,
        image_path_3,
        image_hash,
        image_hash_2,
        image_hash_3,
        challenge_sequence: challenge_sequence || null,
        challenge_completed: (challenge_completed === 'true' || challenge_completed === true) ? 1 : 0,
        suspicious_capture: (verification.suspicious_capture || verification.decision === 'REJECT') ? 1 : 0,
        image_is_ai: verification.is_ai_generated ? 1 : 0,
        verification_confidence: verification.confidence ?? null,
        verification_reason: verification.reason || null,
        verification_decision: verification.decision || null,
        status: finalStatus,
        ai_score: aiResult ? aiResult.ai_score : 0,
        trust_score: customer ? customer.trust_score : null,
        decision_reason,
        predicted_label: verification.predicted_label || null,
        prediction_confidence: verification.prediction_confidence ?? null,
        face_detected: verification.face_detected ? 1 : 0,
        expected_labels: expectedLabelsStr || null,
        verifier_decision: verification.decision || null,
        verifier_reason: verification.reason || null,
        mismatch_attempts: decisionResult.mismatch_attempts ?? 0,
        warning_state: decisionResult.warning_state || null,
        raw_verifier_response: JSON.stringify(verification)
      };

      let complaintId;
      if (isRetry) {
        complaintId = existing.id;
        await ComplaintModel.updateComplaint(complaintId, complaintData);
      } else {
        const result = await ComplaintModel.create(complaintData);
        complaintId = result.id;
      }

      const fullComplaint = await ComplaintModel.findById(complaintId);

      console.log(
        'AI_COMPLAINT_EVENT',
        JSON.stringify({
          complaint_id: complaintId,
          customer_id,
          restaurant_id: order.restaurant_id,
          type,
          description,
          ai_score: aiResult ? aiResult.ai_score : 0,
          ai_decision: aiResult ? aiResult.ai_decision : 'REJECT',
          reasons: aiResult ? aiResult.reasons : ['verification_failed'],
          final_status: finalStatus,
          image_is_ai: verification.is_ai_generated ? 1 : 0,
          created_at: new Date().toISOString(),
        })
      );

      const io = req.app.get('io');
      if (io) {
        io.emit('complaintCreated', fullComplaint);
      }

      return res.status(201).json({
        message: decisionResult.warning_state === 'WARNING_SENT' ? 'Warning: Food mismatch' : 'Complaint submitted',
        complaint_id: complaintId,
        status: finalStatus,
        decision_reason,
        ai_score: aiResult ? aiResult.ai_score : 0,
        ai_decision: aiResult ? aiResult.ai_decision : 'REJECT',
        image_path,
        image_is_ai: verification.is_ai_generated ? 1 : 0,
        ...fullComplaint,
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
      if (io) {
        io.emit('complaintUpdated', {
          complaint_id: Number(id),
          status,
          ai_score,
        });
      }

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
      if (io) {
        io.emit('complaintUpdated', {
          complaint_id: Number(id),
          status,
        });
      }

      return res.json({ message: 'Complaint updated', status });
    } catch (err) {
      console.error('Manual complaint decision error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};

module.exports = ComplaintController;
