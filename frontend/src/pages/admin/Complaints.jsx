import React, { useEffect, useState } from 'react';

const statusOptions = ['PENDING', 'AUTO_APPROVED', 'AUTO_REJECTED', 'ESCALATED', 'RESOLVED'];

const statusClasses = (status) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'AUTO_APPROVED':
    case 'RESOLVED':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
    case 'AUTO_REJECTED':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    case 'ESCALATED':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    default:
      return 'bg-slate-800 text-slate-200 border-slate-600';
  }
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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading complaints...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-6">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-semibold mb-4">All complaints</h1>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {complaints.length === 0 ? (
          <p className="text-sm text-slate-400">No complaints found.</p>
        ) : (
          <div className="space-y-3">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-4"
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm text-slate-300">
                      Order <span className="font-medium">#{c.order_id}</span> · Customer:{' '}
                      <span className="font-medium">{c.customer_name || c.customer_id}</span>
                    </p>
                    <p className="text-xs text-slate-400">
                      Type: <span className="text-slate-200">{c.type}</span>
                    </p>
                    <span className="inline-flex items-center mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-800 text-slate-200">
                      {complaintsCountLabel(c.complaints_count)}
                    </span>
                  </div>
                  <span
                    className={
                      'text-xs px-2 py-1 rounded-full border ' +
                      statusClasses(c.status)
                    }
                  >
                    {c.status}
                  </span>
                </div>

                {c.description && (
                  <p className="text-xs text-slate-400 mb-1">{c.description}</p>
                )}

                {c.ai_score != null && (
                  <p className="text-[11px] text-slate-400 mb-2">
                    AI decision: {c.ai_score}/100
                    {c.decision_reason ? ` · ${c.decision_reason}` : ''}
                  </p>
                )}

                <div className="flex flex-wrap gap-2 mt-2">
                  {statusOptions.map((status) => (
                    <button
                      key={status}
                      onClick={() => handleStatusChange(c.id, status)}
                      disabled={updatingId === c.id}
                      className={`px-3 py-1.5 rounded-full text-[11px] font-medium border transition-colors ${
                        c.status === status
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400'
                          : 'bg-slate-900 text-slate-200 border-slate-700 hover:border-emerald-400'
                      }`}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                <p className="text-[11px] text-slate-500 mt-2">
                  Created at: {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ComplaintsAdmin;
