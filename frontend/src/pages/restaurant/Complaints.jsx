// frontend/src/pages/restaurant/Complaints.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api/api';

const statusBadgeClass = (status) => {
  if (status === 'AUTO_APPROVED' || status === 'RESOLVED') return 'te-badge--success';
  if (status === 'AUTO_REJECTED') return 'te-badge--error';
  if (status === 'ESCALATED' || status === 'PENDING') return 'te-badge--warning';
  return '';
};

const explainDecisionShort = (c) => {
  if (c.verification_decision && c.verification_decision !== 'PASS_TO_TRUST_SCORE') {
    return `REJECTED: Verification failed - ${c.verification_reason || 'Suspicious evidence detected.'}`;
  }
  if (c.image_is_ai === 1) {
    return 'REJECTED: AI flagged the uploaded evidence as AI-generated or manipulated.';
  }
  if (c.suspicious_capture === 1) {
    return 'REJECTED: Replay, screenshot, or identical frames suspected.';
  }
  if (c.status === 'AUTO_APPROVED') {
    return 'AI auto‑approved this complaint; you may choose to grant compensation automatically.';
  }
  if (c.status === 'AUTO_REJECTED') {
    return 'AI auto‑rejected this complaint as low‑confidence or inconsistent behavior.';
  }
  if (c.status === 'ESCALATED') {
    return 'AI escalated this complaint for your manual review.';
  }
  if (c.status === 'PENDING') {
    return 'Complaint is pending; AI suggests you review it.';
  }
  return 'AI decision information for this complaint.';
};

function RestaurantComplaints() {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const rawUser = localStorage.getItem('te_user');
        const user = rawUser ? JSON.parse(rawUser) : null;

        if (!user?.restaurant_id) {
          setComplaints([]);
          setLoading(false);
          return;
        }

        const res = await api.get(
          `/complaints/restaurant/${user.restaurant_id}`
        );

        setComplaints(res.data.complaints || []);
      } catch (err) {
        console.error('Failed to load restaurant complaints', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  if (loading) {
    return (
      <div className="te-page page-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="te-spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading complaints...</p>
      </div>
    );
  }

  return (
    <div className="te-page page-fade-in">
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-headings)' }}>Customer Complaints</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Overview of food classification scores, face blockers, and refund claims.
        </p>
      </div>

      {complaints.length === 0 ? (
        <div className="te-empty-state">
          <span className="te-empty-icon">📂</span>
          <p>No complaints filed yet for your restaurant.</p>
        </div>
      ) : (
        <div className="te-table-container">
          <table className="te-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Order ID</th>
                <th>Customer ID</th>
                <th>Type</th>
                <th>Status</th>
                <th>AI Score</th>
                <th>Decision Reason</th>
                <th>Created At</th>
                <th>AI Details</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map((c) => (
                <tr key={c.id}>
                  <td><strong>#{c.id}</strong></td>
                  <td>#{c.order_id}</td>
                  <td>#{c.customer_id}</td>
                  <td><span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{c.type.replace(/_/g, ' ')}</span></td>
                  <td>
                    <span className={`te-badge ${statusBadgeClass(c.status)}`}>
                      {c.status}
                    </span>
                  </td>
                  <td>
                    <strong style={{ color: 'var(--brand-orange)' }}>
                      {c.ai_score ?? '-'}
                    </strong>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{c.decision_reason || '-'}</td>
                  <td style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    {c.created_at
                      ? new Date(c.created_at).toLocaleString()
                      : '-'}
                  </td>
                  <td>
                    {(c.ai_score != null || c.decision_reason) && (
                      <button
                        type="button"
                        className="te-btn te-btn--secondary"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.7rem' }}
                        onClick={() => setSelected(c)}
                      >
                        Details
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selected && (
        <div className="te-modal-overlay" onClick={() => setSelected(null)}>
          <div className="te-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-headings)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-orange)' }}></span>
              AI Verification Details #{selected.id}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Explanation</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {explainDecisionShort(selected)}
                </p>
              </div>

              {selected.decision_reason && (
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Decision Reason</p>
                  <p style={{ fontSize: '0.8125rem', fontFamily: 'monospace', color: 'var(--text-primary)' }}>
                    {selected.decision_reason}
                  </p>
                </div>
              )}

              {/* Heuristics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Verifier Decision</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: selected.verification_decision === 'PASS_TO_TRUST_SCORE' ? 'var(--success)' : 'var(--error)' }}>
                    {selected.verification_decision || 'N/A'}
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Verifier Confidence</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selected.verification_confidence != null ? `${(selected.verification_confidence * 100).toFixed(0)}%` : 'N/A'}
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Suspicious Capture</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: selected.suspicious_capture ? 'var(--error)' : 'var(--success)' }}>
                    {selected.suspicious_capture ? 'YES' : 'NO'}
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Image Status (AI)</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: selected.image_is_ai ? 'var(--error)' : 'var(--success)' }}>
                    {selected.image_is_ai ? 'FAKE/AI' : 'AUTHENTIC'}
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Trust Score</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--success)' }}>
                    {selected.trust_score != null ? `${selected.trust_score}/100` : 'N/A'}
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Challenge Completed</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selected.challenge_completed ? 'YES' : 'NO'}
                  </p>
                </div>
              </div>

              {selected.challenge_sequence && (
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Challenge Sequence</p>
                  <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    {selected.challenge_sequence}
                  </p>
                </div>
              )}

            </div>
            
            <button
              type="button"
              className="te-btn te-btn--primary"
              style={{ width: '100%', marginTop: '1.5rem' }}
              onClick={() => setSelected(null)}
            >
              Close Details
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RestaurantComplaints;
