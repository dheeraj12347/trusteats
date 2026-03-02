// frontend/src/pages/restaurant/Complaints.jsx
import React, { useEffect, useState } from 'react';
import api from '../../api/api';

const statusBadgeClass = (status) => {
  if (status === 'AUTO_APPROVED') return 'bg-emerald-100 text-emerald-700';
  if (status === 'AUTO_REJECTED') return 'bg-rose-100 text-rose-700';
  if (status === 'ESCALATED' || status === 'PENDING')
    return 'bg-amber-100 text-amber-700';
  return 'bg-slate-100 text-slate-700';
};

const explainDecisionShort = (c) => {
  if (c.status === 'AUTO_APPROVED') {
    return 'AI auto‑approved this complaint; you may choose to grant compensation automatically.';
  }
  if (c.status === 'AUTO_REJECTED') {
    return 'AI auto‑rejected this complaint as low‑confidence or inconsistent with past behavior.';
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

  if (loading) return <div>Loading complaints...</div>;

  return (
    <div className="te-page">
      <h2>Customer complaints</h2>
      {complaints.length === 0 ? (
        <p>No complaints yet.</p>
      ) : (
        <table className="te-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Order</th>
              <th>Customer</th>
              <th>Type</th>
              <th>Status</th>
              <th>AI score</th>
              <th>Decision reason</th>
              <th>Created at</th>
              <th>AI details</th>
            </tr>
          </thead>
          <tbody>
            {complaints.map((c) => (
              <tr key={c.id}>
                <td>{c.id}</td>
                <td>{c.order_id}</td>
                <td>{c.customer_id}</td>
                <td>{c.type}</td>
                <td>
                  <span className={`px-2 py-1 rounded-full text-xs ${statusBadgeClass(c.status)}`}>
                    {c.status}
                  </span>
                </td>
                <td>{c.ai_score ?? '-'}</td>
                <td>{c.decision_reason || '-'}</td>
                <td>
                  {c.created_at
                    ? new Date(c.created_at).toLocaleString()
                    : '-'}
                </td>
                <td>
                  {(c.ai_score != null || c.decision_reason) && (
                    <button
                      type="button"
                      className="text-xs text-sky-700 underline underline-offset-2"
                      onClick={() => setSelected(c)}
                    >
                      Why?
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-4 max-w-md w-full mx-4">
            <h2 className="text-sm font-semibold mb-2">
              AI decision for complaint #{selected.id}
            </h2>
            <p className="text-xs text-slate-700 mb-2">
              {explainDecisionShort(selected)}
            </p>
            {selected.ai_score != null && (
              <p className="text-xs text-slate-700">
                AI score:{' '}
                <span className="font-semibold">{selected.ai_score}</span>
              </p>
            )}
            {selected.decision_reason && (
              <p className="text-xs text-slate-700 mt-1">
                Decision reason:{' '}
                <span className="font-semibold">
                  {selected.decision_reason}
                </span>
              </p>
            )}
            <button
              type="button"
              className="mt-3 text-xs text-slate-800 px-3 py-1 rounded border border-slate-400"
              onClick={() => setSelected(null)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default RestaurantComplaints;
