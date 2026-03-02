import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import API from '../../api/api';
import socket from '../../sockets/socket';
import './RestaurantDashboard.css';

function RestaurantRefundStatus({ order }) {
  const {
    complaint_status,
    complaint_ai_score,
    complaint_image_is_ai,
    complaint_decision_reason,
  } = order;

  if (!complaint_status) return null;

  if (complaint_image_is_ai) {
    return (
      <p className="te-refund-status te-refund-status--rejected">
        Refund rejected: suspected AI-generated or inappropriate image.
      </p>
    );
  }

  if (complaint_status === 'AUTO_APPROVED') {
    return (
      <p className="te-refund-status te-refund-status--approved">
        Refund auto-approved
        {typeof complaint_ai_score === 'number'
          ? ` (AI score ${complaint_ai_score}/100).`
          : '.'}
      </p>
    );
  }

  if (complaint_status === 'AUTO_REJECTED') {
    return (
      <p className="te-refund-status te-refund-status--rejected">
        Refund auto-rejected
        {typeof complaint_ai_score === 'number'
          ? ` (AI score ${complaint_ai_score}/100).`
          : '.'}
      </p>
    );
  }

  if (complaint_status === 'PENDING' || complaint_status === 'ESCALATED') {
    return (
      <p className="te-refund-status te-refund-status--pending">
        Complaint under review:{' '}
        {complaint_decision_reason || 'Awaiting manual decision.'}
      </p>
    );
  }

  if (complaint_status === 'RESOLVED') {
    return (
      <p className="te-refund-status te-refund-status--resolved">
        Complaint resolved:{' '}
        {complaint_decision_reason || 'check complaint details.'}
      </p>
    );
  }

  return null;
}

function RestaurantDashboard() {
  const [orders, setOrders] = useState([]);
  const [complaints, setComplaints] = useState([]); // New state for complaints
  const [message, setMessage] = useState('');

  const user = JSON.parse(localStorage.getItem('te_user') || '{}');
  const restaurantId = user.restaurant_id || 1;

  const loadData = useCallback(async () => {
    try {
      const orderRes = await API.get(`/orders/restaurant/${restaurantId}`);
      setOrders(orderRes.data.orders);

      const complaintRes = await API.get(`/complaints/restaurant/${restaurantId}`);
      setComplaints(complaintRes.data.complaints);
    } catch {
      setMessage('Failed to load dashboard data');
    }
  }, [restaurantId]);

  useEffect(() => {
    loadData();

    socket.emit('joinRestaurantRoom', { restaurantId });

    socket.on('orderStatusUpdated', (updatedOrder) => {
      if (Number(updatedOrder.restaurant_id) !== Number(restaurantId)) return;
      setOrders(prev =>
        prev.map(o => (o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o))
      );
    });

    socket.on('orderPlaced', () => {
      loadData();
    });

    // Listen for new AI-processed complaints
    socket.on('complaintCreated', () => {
      loadData();
    });

    return () => {
      socket.emit('leaveRestaurantRoom', { restaurantId });
      socket.off('orderStatusUpdated');
      socket.off('orderPlaced');
      socket.off('complaintCreated');
    };
  }, [restaurantId, loadData]);

  const updateStatus = async (orderId, status) => {
    setMessage('');
    try {
      const res = await API.put(`/orders/${orderId}/status`, { status });
      setMessage(res.data.message);
      setOrders(prev =>
        prev.map(o =>
          o.id === orderId ? { ...o, status } : o
        )
      );
    } catch (err) {
      setMessage(err.response?.data?.message || 'Update failed');
    }
  };

  const formatTime = (ts) => {
    if (!ts) return '';
    return new Date(ts).toLocaleString();
  };

  const statusColor = (status) => {
    const map = {
      PLACED: '#38bdf8',
      PREPARING: '#facc15',
      OUT_FOR_DELIVERY: '#f97316',
      DELIVERED: '#22c55e',
      CANCELLED: '#ef4444',
      AUTO_APPROVED: '#22c55e',
      AUTO_REJECTED: '#ef4444',
    };
    return map[status] || '#9ca3af';
  };

  const riskLabel = (score) => {
    if (score == null) return 'Unknown';
    if (score >= 25) return 'High';
    if (score >= 10) return 'Medium';
    return 'Low';
  };

  const riskColorClass = (score) => {
    if (score == null) return 'te-risk-unknown';
    if (score >= 25) return 'te-risk-high';
    if (score >= 10) return 'te-risk-medium';
    return 'te-risk-low';
  };

  return (
    <div className="te-page">
      {message && <div className="te-banner">{message}</div>}

      {/* COMPLAINTS SECTION (Automated Verification) */}
      <section className="te-section" style={{ marginBottom: '40px' }}>
        <h2 style={{ color: '#ef4444' }}>Urgent Complaints (AI Verified)</h2>
        <div className="te-orders-grid">
          {complaints.length === 0 && (
            <p className="te-empty">No active complaints.</p>
          )}
          {complaints.map((c, index) => (
            <motion.article 
              key={c.id} 
              className="te-order-card" 
              style={{ borderLeft: `4px solid ${statusColor(c.status)}` }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
            >
              <header className="te-order-header">
                <div>
                  <span className="te-order-id">Complaint #{c.id} (Order #{c.order_id})</span>
                  <span className="te-order-status" style={{ backgroundColor: statusColor(c.status) }}>
                    {c.status}
                  </span>
                </div>
                {c.image_is_ai === 1 && (
                  <span className="te-risk-badge te-risk-high">⚠️ FAKE IMAGE DETECTED</span>
                )}
              </header>
              <div className="te-order-body">
                <p><strong>Type:</strong> {c.type}</p>
                <p className="text-xs text-slate-400 italic">"{c.description}"</p>
                <p className="te-order-total" style={{ marginTop: '10px' }}>
                  AI Trust Score: {c.ai_score}/100
                </p>
                <p className="text-[10px] text-slate-500">{c.decision_reason}</p>
                <p className="text-[10px] text-slate-500">
                  Created at: {formatTime(c.created_at)}
                </p>
              </div>
            </motion.article>
          ))}
        </div>
      </section>

      {/* INCOMING ORDERS SECTION */}
      <section className="te-section">
        <h2>Incoming Orders</h2>
        <div className="te-orders-grid">
          {orders.length === 0 && (
            <p className="te-empty">No active orders right now.</p>
          )}
          {orders.map((o, index) => (
            <motion.article
              key={o.id}
              className="te-order-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
            >
              <header className="te-order-header">
                <div>
                  <span className="te-order-id">Order #{o.id}</span>
                  <span
                    className="te-order-status"
                    style={{ backgroundColor: statusColor(o.status) }}
                  >
                    {o.status}
                  </span>
                </div>
                <div className="te-order-header-right">
                  <span className={`te-risk-badge ${riskColorClass(o.risk_score)}`}>
                    Risk: {riskLabel(o.risk_score)}
                  </span>
                  <span className="te-order-time">
                    {formatTime(o.created_at || o.createdAt)}
                  </span>
                </div>
              </header>

              <div className="te-order-body">
                <p className="te-order-restaurant">
                  Customer: {o.customer_name || `#${o.customer_id}`}
                </p>
                {Array.isArray(o.items) && o.items.length > 0 && (
                  <ul className="te-order-items">
                    {o.items.map(item => (
                      <li key={item.id}>
                        {item.name} × {item.quantity}
                      </li>
                    ))}
                  </ul>
                )}
                {o.total_price && (
                  <p className="te-order-total">
                    Total: ₹{o.total_price}
                  </p>
                )}
              </div>

              {/* Refund / complaint AI status for this order */}
              <RestaurantRefundStatus order={o} />

              <footer className="te-order-footer te-order-footer-actions">
                <button
                  className="te-chip-btn"
                  onClick={() => updateStatus(o.id, 'PREPARING')}
                >
                  Preparing
                </button>
                <button
                  className="te-chip-btn"
                  onClick={() => updateStatus(o.id, 'OUT_FOR_DELIVERY')}
                >
                  Out for delivery
                </button>
                <button
                  className="te-chip-btn"
                  onClick={() => updateStatus(o.id, 'DELIVERED')}
                >
                  Delivered
                </button>
              </footer>
            </motion.article>
          ))}
        </div>
      </section>
    </div>
  );
}

export default RestaurantDashboard;
