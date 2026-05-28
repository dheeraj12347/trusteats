import React, { useEffect, useState } from 'react';

const statusOptions = ['PENDING', 'AUTO_APPROVED', 'AUTO_REJECTED', 'ESCALATED', 'RESOLVED'];

const statusBadgeClass = (status) => {
  if (status === 'AUTO_APPROVED' || status === 'RESOLVED') return 'te-badge--success';
  if (status === 'AUTO_REJECTED') return 'te-badge--error';
  if (status === 'ESCALATED' || status === 'PENDING') return 'te-badge--warning';
  return 'te-badge--info';
};

const ComplaintsAdmin = () => {
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updatingId, setUpdatingId] = useState(null);

  const token = localStorage.getItem('te_token');

  const loadComplaints = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('http://localhost:5000/api/complaints', {
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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      const res = await fetch(`http://localhost:5000/api/complaints/${id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update status');
      }

      await loadComplaints();
    } catch (err) {
      alert(err.message);
    } finally {
      setUpdatingId(null);
    }
  };

  const complaintsCountLabel = (count) => {
    if (count == null) return '0 complaints';
    if (count === 1) return '1 complaint';
    return `${count} complaints`;
  };

  if (loading) {
    return (
      <div className="te-page page-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="te-spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>Loading complaints...</p>
      </div>
    );
  }

  return (
    <div className="te-page page-fade-in">
      <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-headings)' }}>Admin Control Panel</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
          Manage customer disputes, view AI verification heuristic scores, and override complaint statuses.
        </p>
      </div>

      {error && (
        <div className="te-alert te-alert--error" style={{ marginBottom: '1.5rem' }}>
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      {complaints.length === 0 ? (
        <div className="te-empty-state">
          <span className="te-empty-icon">📂</span>
          <p>No complaints found in the system.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {complaints.map((c) => (
            <div
              key={c.id}
              className="te-card te-card--hover"
              style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>
                    Order <span style={{ color: 'var(--brand-orange)' }}>#{c.order_id}</span> · Customer:{' '}
                    <span style={{ color: 'var(--text-secondary)' }}>{c.customer_name || c.customer_id}</span>
                  </p>
                  <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                    Type: <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{c.type.replace(/_/g, ' ')}</span>
                  </p>
                  <span className="te-badge te-badge--info" style={{ marginTop: '6px', fontSize: '0.7rem' }}>
                    {complaintsCountLabel(c.complaints_count)}
                  </span>
                </div>
                <span className={`te-badge ${statusBadgeClass(c.status)}`}>
                  {c.status}
                </span>
              </div>

              {c.description && (
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', fontStyle: 'italic', paddingLeft: '8px', borderLeft: '2px solid var(--border-color)' }}>
                  "{c.description}"
                </div>
              )}

              {c.verification_decision && (
                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '12px 16px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8125rem'
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
                    Evidence Verification Details
                  </span>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 16px' }}>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Decision: <span style={{ fontWeight: 700, color: c.verification_decision === 'PASS_TO_TRUST_SCORE' ? 'var(--success)' : 'var(--error)' }}>{c.verification_decision}</span>
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Confidence: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.verification_confidence != null ? `${(c.verification_confidence * 100).toFixed(0)}%` : 'N/A'}</span>
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Suspicious Capture: <span style={{ fontWeight: 700, color: c.suspicious_capture ? 'var(--error)' : 'var(--success)' }}>{c.suspicious_capture ? 'YES' : 'NO'}</span>
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Image Status (AI): <span style={{ fontWeight: 700, color: c.image_is_ai ? 'var(--error)' : 'var(--success)' }}>{c.image_is_ai ? 'FAKE' : 'AUTHENTIC'}</span>
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Trust Score: <span style={{ fontWeight: 700, color: 'var(--success)' }}>{c.trust_score != null ? `${c.trust_score}/100` : 'N/A'}</span>
                    </p>
                    <p style={{ color: 'var(--text-secondary)' }}>
                      Challenge Completed: <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{c.challenge_completed ? 'YES' : 'NO'}</span>
                    </p>
                  </div>
                  {c.verification_reason && (
                    <p style={{ marginTop: '8px', fontStyle: 'italic', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '8px' }}>
                      Reason: "{c.verification_reason}"
                    </p>
                  )}
                  {c.challenge_sequence && (
                    <p style={{ marginTop: '4px', fontSize: '0.7rem', color: 'var(--text-tertiary)', fontFamily: 'monospace' }}>
                      Sequence: {c.challenge_sequence}
                    </p>
                  )}
                </div>
              )}

              {!c.verification_decision && c.ai_score != null && (
                <div style={{
                  backgroundColor: 'var(--bg-primary)',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.8125rem',
                  color: 'var(--text-secondary)'
                }}>
                  <strong>AI score:</strong> {c.ai_score}/100 {c.decision_reason ? ` · ${c.decision_reason}` : ''}
                </div>
              )}

              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '4px' }}>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                  Update Decision Status
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {statusOptions.map((status) => {
                    const isActive = c.status === status;
                    return (
                      <button
                        key={status}
                        onClick={() => handleStatusChange(c.id, status)}
                        disabled={updatingId === c.id}
                        className="te-chip-btn"
                        style={isActive ? {
                          backgroundColor: 'var(--brand-orange-light)',
                          borderColor: 'var(--brand-orange)',
                          color: 'var(--brand-orange)',
                          fontWeight: 700
                        } : {}}
                      >
                        {status.replace(/_/g, ' ')}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Filed: {new Date(c.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ComplaintsAdmin;
