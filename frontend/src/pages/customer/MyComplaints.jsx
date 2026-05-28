import React, { useEffect, useState } from 'react';

const statusBadgeClass = (status) => {
  switch (status) {
    case 'PENDING':
      return 'te-badge--warning';
    case 'AUTO_APPROVED':
    case 'RESOLVED':
      return 'te-badge--success';
    case 'AUTO_REJECTED':
      return 'te-badge--error';
    case 'ESCALATED':
      return 'te-badge--info';
    default:
      return '';
  }
};

const explainDecisionShort = (c) => {
  if (c.verification_decision && c.verification_decision !== 'PASS_TO_TRUST_SCORE') {
    return `REJECTED: Verification failed - ${c.verification_reason || 'Suspicious evidence detected.'}`;
  }
  if (c.image_is_ai === 1) {
    return 'REJECTED: Our AI detected that the uploaded image is generated or modified. Refund denied.';
  }
  if (c.suspicious_capture === 1) {
    return 'REJECTED: Replay, screenshot, or identical frames suspected. Refund denied.';
  }
  if (c.status === 'AUTO_APPROVED') {
    return 'SUCCESS: AI verified your trust score and restaurant history. Refund has been initiated!';
  }
  if (c.status === 'AUTO_REJECTED') {
    return 'REJECTED: AI analysis indicated a low trust score or inconsistent details.';
  }
  if (c.status === 'ESCALATED') {
    return 'AI escalated this complaint for manual review by our team.';
  }
  if (c.status === 'PENDING') {
    return 'Complaint is pending; AI is currently verifying trust factors.';
  }
  return 'AI decision information for this complaint.';
};

const MyComplaints = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selected, setSelected] = useState(null);

  const token = localStorage.getItem('te_token');

  useEffect(() => {
    const fetchComplaints = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/complaints/my', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.message || 'Failed to load complaints');
        }

        setComplaints(data.complaints || []);
      } catch (err) {
        setError(err.message || 'Failed to load complaints');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchComplaints();
    } else {
      setError('Not authenticated');
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="te-page page-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="te-spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading complaints...</p>
      </div>
    );
  }

  return (
    <div className="te-page page-fade-in" style={{ maxWidth: '800px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-headings)' }}>My Complaints & Refunds</h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Track verification state and neural network outputs for your orders.
          </p>
        </div>
      </div>

      {error && (
        <div className="te-alert te-alert--error" style={{ marginBottom: '1.5rem' }}>
          <span>{error}</span>
        </div>
      )}

      {complaints.length === 0 ? (
        <div className="te-empty-state">
          <span className="te-empty-icon">📂</span>
          <p>You have not submitted any complaints yet.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {complaints.map((c) => (
            <div key={c.id} className="te-card te-card--hover">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    Order <span style={{ color: 'var(--brand-orange)' }}>#{c.order_id}</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.15rem' }}>
                    Submitted: {new Date(c.created_at).toLocaleString()}
                  </p>
                </div>
                <span className={`te-badge ${statusBadgeClass(c.status)}`}>
                  {c.status === 'AUTO_APPROVED' ? 'REFUND ISSUED' : c.status}
                </span>
              </div>

              {/* Status Banner */}
              <div className="te-alert te-alert--success" style={{
                padding: '0.75rem 1rem',
                backgroundColor: c.status === 'AUTO_REJECTED' ? 'var(--error-light)' : c.status === 'PENDING' ? 'var(--warning-light)' : 'var(--success-light)',
                borderColor: c.status === 'AUTO_REJECTED' ? 'var(--error-border)' : c.status === 'PENDING' ? 'var(--warning-border)' : 'var(--success-border)',
                color: c.status === 'AUTO_REJECTED' ? 'var(--error-text)' : c.status === 'PENDING' ? 'var(--warning-text)' : 'var(--success-text)',
                margin: '0.5rem 0',
                display: 'block'
              }}>
                <span style={{ fontWeight: 700, display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.03em', marginBottom: '0.15rem' }}>
                  AI Verification Reason:
                </span>
                <p style={{ fontSize: '0.8125rem', lineHeight: 1.4 }}>
                  {explainDecisionShort(c)}
                </p>
              </div>

              <div style={{ display: 'flex', gap: '2rem', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
                <p>Category: <strong style={{ color: 'var(--text-primary)' }}>{c.type.replace(/_/g, ' ')}</strong></p>
                {c.description && <p style={{ flex: 1 }}>Details: <span style={{ fontStyle: 'italic' }}>"{c.description}"</span></p>}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-color)' }}>
                <button
                  type="button"
                  className="te-btn te-btn--secondary"
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}
                  onClick={() => setSelected(c)}
                >
                  View Details & Heuristics
                </button>
                {c.image_is_ai === 1 && (
                  <span className="te-badge te-badge--error" style={{ fontSize: '0.65rem' }}>
                    ⚠️ IMAGE AUTHENTICITY FAILED
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL FOR AI TRUST BREAKDOWN */}
      {selected && (
        <div className="te-modal-overlay" onClick={() => setSelected(null)}>
          <div className="te-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '520px' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '1.25rem', fontFamily: 'var(--font-headings)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--brand-orange)' }}></span>
              Verification Breakdown #{selected.id}
            </h2>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              
              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Final Status</p>
                <span className={`te-badge ${statusBadgeClass(selected.status)}`}>
                  {selected.status === 'AUTO_APPROVED' ? 'REFUND ISSUED' : selected.status}
                </span>
              </div>

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Decision Explanation</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {selected.decision_reason || explainDecisionShort(selected)}
                </p>
              </div>

              <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Verifier Decision & Details</p>
                <p style={{ fontSize: '0.8125rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                  Decision: <span style={{ color: selected.verification_decision === 'PASS_TO_TRUST_SCORE' ? 'var(--success)' : 'var(--error)' }}>{selected.verification_decision || 'UNKNOWN'}</span>
                </p>
                {selected.verification_reason && (
                  <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                    "{selected.verification_reason}"
                  </p>
                )}
              </div>

              {/* Heuristics Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Verifier Confidence</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                    {selected.verification_confidence != null ? `${(selected.verification_confidence * 100).toFixed(0)}%` : '-'}
                  </p>
                </div>
                
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Suspicious Capture</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: selected.suspicious_capture ? 'var(--error)' : 'var(--success)' }}>
                    {selected.suspicious_capture ? 'YES' : 'NO'}
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Authenticity (AI)</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: selected.image_is_ai ? 'var(--error)' : 'var(--success)' }}>
                    {selected.image_is_ai ? 'FAKE/AI' : 'AUTHENTIC'}
                  </p>
                </div>

                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '0.75rem 1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.15rem' }}>Customer Trust Score</p>
                  <p style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--success)' }}>
                    {selected.trust_score != null ? `${selected.trust_score}/100` : 'N/A'}
                  </p>
                </div>
              </div>

              {selected.challenge_sequence && (
                <div style={{ backgroundColor: 'var(--bg-primary)', padding: '1rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                  <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Challenge Metadata</p>
                  <p style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: 'var(--text-secondary)' }}>
                    Sequence: {selected.challenge_sequence}
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                    Completed: <strong style={{ color: 'var(--success)' }}>{selected.challenge_completed ? 'YES' : 'NO'}</strong>
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
};

export default MyComplaints;