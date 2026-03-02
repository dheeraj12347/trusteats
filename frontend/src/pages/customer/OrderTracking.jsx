import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import API from '../../api/api';
import socket from '../../sockets/socket';
import './OrderTracking.css';

const STATUS_STEPS = [
  'PLACED',
  'PREPARING',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];

function OrderTracking() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    API.get(`/orders/my`)
      .then(res => {
        const found = res.data.orders.find(o => String(o.id) === String(orderId));
        if (found) setOrder(found);
      })
      .catch(() => {});

    const user = JSON.parse(localStorage.getItem('te_user') || '{}');
    const customerId = user.id;
    if (!customerId) return;

    socket.emit('joinCustomerRoom', { customerId });

    socket.on('orderStatusUpdated', (updatedOrder) => {
      if (String(updatedOrder.id) === String(orderId)) {
        setOrder(updatedOrder);
      }
    });

    return () => {
      socket.emit('leaveCustomerRoom', { customerId });
      socket.off('orderStatusUpdated');
    };
  }, [orderId]);

  if (!order) {
    return (
      <div className="ot-page">
        <button className="te-secondary-btn" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <p className="te-empty">Loading order details...</p>
      </div>
    );
  }

  const currentIndex = STATUS_STEPS.indexOf(order.status);

  return (
    <div className="ot-page">
      <button className="te-secondary-btn" onClick={() => navigate(-1)}>
        ← Back
      </button>

      <section className="te-section">
        <h2>Order #{order.id} tracking</h2>
        <p className="ot-subtitle">
          Restaurant #{order.restaurant_id}
        </p>
      </section>

      <section className="ot-timeline-wrapper">
        {STATUS_STEPS.map((status, idx) => {
          const isActive = idx <= currentIndex;
          return (
            <div key={status} className="ot-step">
              <div className={`ot-step-indicator ${isActive ? 'ot-step-indicator-active' : ''}`}>
                {isActive ? '✓' : idx + 1}
              </div>
              <div className="ot-step-content">
                <div className="ot-step-title">{status.replace(/_/g, ' ')}</div>
                <div className="ot-step-desc">
                  {status === 'PLACED' && 'We have received your order.'}
                  {status === 'PREPARING' && 'Restaurant is preparing your food.'}
                  {status === 'OUT_FOR_DELIVERY' && 'Your food is on the way.'}
                  {status === 'DELIVERED' && 'Order has been delivered.'}
                </div>
              </div>
              {idx < STATUS_STEPS.length - 1 && (
                <div className={`ot-step-connector ${idx < currentIndex ? 'ot-step-connector-active' : ''}`} />
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}

export default OrderTracking;
