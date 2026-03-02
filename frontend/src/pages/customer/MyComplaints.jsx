import React, { useEffect, useState } from 'react';

const statusClasses = (status) => {
  switch (status) {
    case 'PENDING':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
    case 'AUTO_APPROVED':
    case 'RESOLVED':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold';
    case 'AUTO_REJECTED':
      return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    case 'ESCALATED':
      return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
    default:
      return 'bg-slate-800 text-slate-200 border-slate-600';
  }
};

const explainDecisionShort = (c) => {
  // STRAIGHT AWAY REJECT RULE: Check if image was flagged as AI
  if (c.image_is_ai === 1) {
    return 'REJECTED: Our AI detected that the uploaded image is generated or modified. Refund denied.';
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
      <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
        <p className="text-sm text-slate-300">Loading complaints...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-2xl font-semibold mb-6">Track Your Complaints & Refunds</h1>

        {error && <p className="mb-3 text-sm text-red-400">{error}</p>}

        {complaints.length === 0 ? (
          <p className="text-sm text-slate-400">
            You have not submitted any complaints yet.
          </p>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div
                key={c.id}
                className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-lg flex flex-col gap-2 transition-all hover:border-slate-700"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm text-slate-300">
                      Order <span className="font-medium">#{c.order_id}</span>
                    </p>
                    <p className="text-[10px] text-slate-500">
                      Submitted: {new Date(c.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={
                      'text-[10px] px-3 py-1 rounded-full border uppercase tracking-wider ' +
                      statusClasses(c.status)
                    }
                  >
                    {c.status === 'AUTO_APPROVED' ? 'REFUND ISSUED' : c.status}
                  </span>
                </div>

                <div className="bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 my-1">
                  <p className="text-[11px] font-medium text-sky-400 mb-1">AI Verification Status:</p>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {explainDecisionShort(c)}
                  </p>
                </div>

                <div className="flex flex-col gap-1">
                  <p className="text-xs text-slate-400">
                    Type: <span className="text-slate-200">{c.type}</span>
                  </p>
                  {c.description && (
                    <p className="text-xs text-slate-400">
                      Details: <span className="italic">"{c.description}"</span>
                    </p>
                  )}
                </div>

                <div className="mt-2 flex items-center gap-4">
                  <button
                    type="button"
                    className="text-[11px] text-sky-400 hover:text-sky-300 transition-colors underline underline-offset-4"
                    onClick={() => setSelected(c)}
                  >
                    Why this decision?
                  </button>
                  {c.image_is_ai === 1 && (
                    <span className="text-[10px] text-rose-400 font-bold">
                      ⚠️ IMAGE AUTHENTICITY FAILED
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL FOR AI TRUST BREAKDOWN */}
      {selected && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-500 animate-pulse"></span>
              AI Verification Details #{selected.id}
            </h2>
            
            <div className="space-y-4">
              <div className="bg-slate-800/50 p-3 rounded-xl">
                <p className="text-[10px] text-slate-500 uppercase mb-1">Decision Reason</p>
                <p className="text-xs text-slate-200 leading-snug">
                  {selected.decision_reason || explainDecisionShort(selected)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Trust Score</p>
                  <p className="text-sm font-mono text-emerald-400">{selected.ai_score}/100</p>
                </div>
                <div className="bg-slate-800/50 p-3 rounded-xl">
                  <p className="text-[10px] text-slate-500 uppercase mb-1">Image Status</p>
                  <p className={`text-sm font-bold ${selected.image_is_ai ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {selected.image_is_ai ? 'FAKE/AI' : 'AUTHENTIC'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="w-full mt-6 bg-slate-800 hover:bg-slate-700 text-white py-2 rounded-xl text-xs font-medium transition-colors border border-slate-700"
              onClick={() => setSelected(null)}
            >
              Close Breakdown
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyComplaints;