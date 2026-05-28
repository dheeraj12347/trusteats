import React, { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import API from '../../api/api';
import socket from '../../sockets/socket';
import './CustomerDashboard.css';

function RefundStatus({ order }) {
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
        Refund rejected: uploaded image appears AI-generated or inappropriate.
      </p>
    );
  }

  if (complaint_status === 'AUTO_APPROVED') {
    return (
      <p className="te-refund-status te-refund-status--approved">
        Refund approved automatically by AI
        {typeof complaint_ai_score === 'number'
          ? ` (score ${complaint_ai_score}/100).`
          : '.'}
      </p>
    );
  }

  if (complaint_status === 'AUTO_REJECTED') {
    return (
      <p className="te-refund-status te-refund-status--rejected">
        Refund rejected automatically by AI
        {typeof complaint_ai_score === 'number'
          ? ` (score ${complaint_ai_score}/100).`
          : '.'}
      </p>
    );
  }

  if (complaint_status === 'PENDING' || complaint_status === 'ESCALATED') {
    return (
      <p className="te-refund-status te-refund-status--pending">
        Refund under review:{' '}
        {complaint_decision_reason || 'Waiting for manual decision.'}
      </p>
    );
  }

  if (complaint_status === 'RESOLVED') {
    return (
      <p className="te-refund-status te-refund-status--resolved">
        Complaint resolved:{' '}
        {complaint_decision_reason || 'resolution recorded.'}
      </p>
    );
  }

  return null;
}

function CustomerDashboard() {
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurant, setSelectedRestaurant] = useState(null);
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [message, setMessage] = useState('');

  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem('te_user') || '{}');
  const customerId = user.id;

  useEffect(() => {
    API.get('/restaurants')
      .then(res => setRestaurants(res.data.restaurants))
      .catch(() => setMessage('Failed to load restaurants'));

    if (customerId) {
      API.get('/orders/my')
        .then(res => setOrders(res.data.orders))
        .catch(() => {});
    }

    if (customerId) {
      socket.emit('joinCustomerRoom', { customerId });

      socket.on('orderStatusUpdated', (updatedOrder) => {
        setOrders(prev =>
          prev.map(o => (o.id === updatedOrder.id ? { ...o, status: updatedOrder.status } : o))
        );
      });

      return () => {
        socket.emit('leaveCustomerRoom', { customerId });
        socket.off('orderStatusUpdated');
      };
    }
  }, [customerId]);

  const loadMenu = async (id) => {
    setMessage('');
    try {
      const res = await API.get(`/restaurants/${id}/menu`);
      setSelectedRestaurant(id);
      setMenu(res.data.menu);
    } catch {
      setMessage('Failed to load menu');
    }
  };

  const placeOrder = async (menuId) => {
    setMessage('');
    try {
      const body = {
        restaurant_id: selectedRestaurant,
        items: [{ menu_id: menuId, quantity: 1 }],
      };
      const res = await API.post('/orders', body);
      setMessage(`Order placed (ID: ${res.data.order_id})`);

      const newOrder = {
        id: res.data.order_id,
        status: 'PLACED',
        restaurant_id: selectedRestaurant,
        created_at: new Date().toISOString(),
      };
      setOrders(prev => [newOrder, ...prev]);
    } catch (err) {
      setMessage(err.response?.data?.message || 'Order failed');
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
    };
    return map[status] || '#9ca3af';
  };

  return (
    <div className="te-page">
      {message && <div className="te-banner">{message}</div>}

      <section className="te-section">
        <h2>Your Orders</h2>
        <div className="te-orders-grid">
          {orders.length === 0 && (
            <p className="te-empty">
              No orders yet. Start by picking something tasty below.
            </p>
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
                <span className="te-order-time">
                  {formatTime(o.created_at || o.createdAt)}
                </span>
              </header>
              <div className="te-order-body">
                <p className="te-order-restaurant">
                  Restaurant #{o.restaurant_id}
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
              </div>

              {/* Refund / complaint AI status, if any */}
              <RefundStatus order={o} />

              <footer className="te-order-footer">
                <button
                  className="te-secondary-btn"
                  onClick={() => navigate(`/track/${o.id}`)}
                >
                  Track order
                </button>


                {o.status === 'DELIVERED' && (!o.complaint_status || o.complaint_warning_state === 'WARNING_SENT') && (
                  <Link
                    to={`/complaint/${o.id}`}
                    className="te-secondary-btn"
                    style={{ marginLeft: '0.5rem' }}
                  >
                    {o.complaint_warning_state === 'WARNING_SENT' ? 'Retry report' : 'Report issue'}
                  </Link>
                )}
              </footer>
            </motion.article>
          ))}
        </div>
      </section>

      <section className="te-section">
        <h2>Restaurants</h2>
        <div className="te-restaurants-grid">
          {restaurants.map((r, index) => (
            <motion.article
              key={r.id}
              className="te-restaurant-card"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: index * 0.04 }}
            >
              <h3>{r.name}</h3>
              <p className="te-restaurant-subtitle">
                {r.cuisine || 'Multi-cuisine'}
              </p>
              <button
                className="te-primary-btn"
                onClick={() => loadMenu(r.id)}
              >
                View menu
              </button>

              <Link
                to={`/customer/restaurants/${r.id}`}
                className="te-secondary-btn"
                style={{
                  marginLeft: '0.5rem',
                  marginTop: '0.5rem',
                  display: 'inline-block',
                }}
              >
                View details & reviews
              </Link>
            </motion.article>
          ))}
        </div>
      </section>

      {selectedRestaurant && (
        <section className="te-section">
          <h2>Menu for restaurant #{selectedRestaurant}</h2>
          <div className="te-menu-grid">
            {menu.map((item, index) => (
              <motion.article
                key={item.id}
                className="te-menu-card"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.25, delay: index * 0.04 }}
              >
                <h3>{item.item_name}</h3>
                <p className="te-menu-price">₹{item.price}</p>
                <button
                  className="te-primary-btn"
                  onClick={() => placeOrder(item.id)}
                >
                  Order
                </button>
              </motion.article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

export default CustomerDashboard;
