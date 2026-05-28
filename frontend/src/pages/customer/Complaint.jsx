// frontend/src/pages/customer/Complaint.jsx
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getMyOrders, createComplaint } from "../../api/api";

const CHALLENGE_STEPS = [
  {
    title: "1. Normal Meal Shot",
    instruction: "Position the meal in the center of the frame clearly showing the items."
  },
  {
    title: "2. Changed Angle Shot",
    instruction: "Tilt the camera or rotate the dish to show the side and interior details."
  },
  {
    title: "3. Packaging & Receipt",
    instruction: "Capture the receipt, label, packaging, or order context clearly."
  }
];

function Complaint() {
  const { orderId } = useParams();
  const navigate = useNavigate();

  const [order, setOrder] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(true);
  const [orderError, setOrderError] = useState("");

  const [type, setType] = useState("MISSING_ITEM");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [warningMessage, setWarningMessage] = useState("");

  // Camera and capturing state
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraError, setCameraError] = useState("");
  const [frames, setFrames] = useState([null, null, null]);
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const loadOrder = async () => {
      try {
        setLoadingOrder(true);
        const res = await getMyOrders();
        const found = (res.data.orders || []).find((o) => o.id === Number(orderId));
        
        if (!found) {
          setOrderError("Order not found or you do not have permission to view it.");
          return;
        }

        if (found.status !== "DELIVERED") {
          setOrderError("Complaints can only be filed for DELIVERED orders.");
          return;
        }

        if (found.complaint_status && found.complaint_warning_state !== "WARNING_SENT") {
          setOrderError("A complaint has already been submitted for this order.");
          return;
        }

        if (found.complaint_status && found.complaint_warning_state === "WARNING_SENT") {
          setWarningMessage(found.complaint_decision_reason || "Warning: Food mismatch detected on your previous attempt. Please upload new images matching the ordered item.");
        }

        setOrder(found);
      } catch (err) {
        console.error("Failed to load order details", err);
        setOrderError("Failed to fetch order information.");
      } finally {
        setLoadingOrder(false);
      }
    };

    loadOrder();
  }, [orderId]);

  // Start camera on activeStep change if frame not captured
  useEffect(() => {
    if (order && !frames[activeStep]) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order, activeStep, frames]);

  // Clean up camera on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const startCamera = async () => {
    setCameraError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError("Camera access (getUserMedia) is not supported in this browser. Please ensure you are using localhost or HTTPS.");
      return;
    }
    
    // Stop any existing stream tracks first
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setCameraError("Could not access your camera. Please verify camera permissions in your browser settings.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const captureFrame = () => {
    if (!videoRef.current) return;
    
    const video = videoRef.current;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
    
    const newFrames = [...frames];
    newFrames[activeStep] = dataUrl;
    setFrames(newFrames);
    stopCamera();
  };

  const retakeFrame = () => {
    const newFrames = [...frames];
    newFrames[activeStep] = null;
    setFrames(newFrames);
  };

  const dataURLtoBlob = (dataurl) => {
    const arr = dataurl.split(",");
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (frames.some((f) => !f)) {
      alert("Please capture all 3 guided frames first.");
      return;
    }

    const challengeSequence = CHALLENGE_STEPS.map((s, i) => `${i + 1}: ${s.title}`).join(" | ");
    
    const formData = new FormData();
    formData.append("order_id", orderId);
    formData.append("type", type);
    formData.append("description", description || "");
    formData.append("challenge_sequence", challengeSequence);
    formData.append("challenge_completed", "true");

    try {
      setSubmitting(true);
      setWarningMessage("");

      // Append 3 blobs
      frames.forEach((frame, index) => {
        const blob = dataURLtoBlob(frame);
        formData.append("images", blob, `frame_${index + 1}.jpg`);
      });

      const response = await createComplaint(formData);
      const complaintData = response.data || {};

      if (complaintData.warning_state === "WARNING_SENT") {
        setWarningMessage(complaintData.decision_reason || "Warning: Food mismatch. Please try again.");
        setFrames([null, null, null]);
        setActiveStep(0);
      } else if (complaintData.status === "AUTO_REJECTED") {
        alert(`Complaint Rejected: ${complaintData.decision_reason}`);
        navigate("/");
      } else {
        alert("Complaint submitted successfully and sent for verification.");
        navigate("/");
      }
    } catch (err) {
      console.error("Complaint submission error:", err);
      const msg = err?.response?.data?.message || err?.response?.data?.error || "Submission failed.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingOrder) {
    return (
      <div className="te-page page-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="te-spinner"></div>
        <p style={{ marginTop: '1rem', color: 'var(--text-secondary)' }}>Loading order details...</p>
      </div>
    );
  }

  if (orderError) {
    return (
      <div className="te-page page-fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="te-card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
          <div className="te-alert te-alert--error" style={{ marginBottom: '1.5rem', display: 'block' }}>
            <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>Access Denied</p>
            <p>{orderError}</p>
          </div>
          <button onClick={() => navigate("/")} className="te-btn te-btn--primary" style={{ width: '100%' }}>
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="te-page page-fade-in" style={{ maxWidth: "680px", margin: "0 auto" }}>
      
      {/* Top Header Section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--border-color)', paddingBottom: '1.25rem' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontFamily: 'var(--font-headings)' }}>Report an Issue</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Order #{orderId} · Restaurant #{order.restaurant_id}
          </p>
        </div>
        <button onClick={() => navigate(-1)} className="te-btn te-btn--secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.75rem' }}>
          ← Cancel
        </button>
      </div>

      {warningMessage && (
        <div className="te-alert te-alert--warning" style={{ display: 'block', lineHeight: 1.6 }}>
          <p style={{ fontWeight: 700, marginBottom: '0.25rem' }}>⚠️ Food Mismatch Warning</p>
          <p>{warningMessage}</p>
        </div>
      )}

      {/* Main Container form */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        
        {/* Form Inputs Grid */}
        <div className="te-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div className="te-input-group">
            <label className="te-label">Issue Category</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value)}
              className="te-input"
              style={{ appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'%23475569\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}
            >
              <option value="MISSING_ITEM">Missing item</option>
              <option value="QUALITY_ISSUE">Quality issue (wrong item/taste)</option>
              <option value="FOREIGN_OBJECT">Foreign object detected</option>
              <option value="OTHER">Other problems</option>
            </select>
          </div>

          <div className="te-input-group">
            <label className="te-label">Description & Comments</label>
            <textarea
              placeholder="Please provide details about the discrepancy..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="te-input"
              required
            />
          </div>
        </div>

        {/* Guided Capture Viewport Area */}
        <div className="te-card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1.5px solid rgba(217, 59, 15, 0.15)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
            <span style={{ fontFamily: 'var(--font-headings)', fontWeight: 800, color: 'var(--brand-orange)', fontSize: '1rem' }}>
              {CHALLENGE_STEPS[activeStep].title}
            </span>
            <span className="te-badge te-badge--info" style={{ fontSize: '0.65rem' }}>
              Capture Step {activeStep + 1} of 3
            </span>
          </div>

          <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {CHALLENGE_STEPS[activeStep].instruction}
          </p>

          {/* Video Viewport Container */}
          <div style={{
            position: 'relative',
            aspectRatio: '16/9',
            backgroundColor: '#0F172A',
            borderRadius: 'var(--radius-md)',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid var(--border-color)',
            boxShadow: 'inset 0 4px 12px rgba(0,0,0,0.5)'
          }}>
            {frames[activeStep] ? (
              <img
                src={frames[activeStep]}
                alt="Captured step evidence"
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                {cameraError && (
                  <div style={{
                    position: 'absolute',
                    inset: 0,
                    padding: '1.5rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    textAlign: 'center'
                  }}>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--error)', fontWeight: 600, marginBottom: '1rem' }}>
                      {cameraError}
                    </p>
                    <button
                      type="button"
                      onClick={startCamera}
                      className="te-btn te-btn--secondary"
                      style={{ fontSize: '0.75rem' }}
                    >
                      Retry Camera
                    </button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Viewport Action Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '1rem', marginTop: '0.5rem' }}>
            {frames[activeStep] ? (
              <>
                <button
                  type="button"
                  onClick={retakeFrame}
                  className="te-btn te-btn--secondary"
                  style={{ flex: 1 }}
                >
                  Retake Photo
                </button>
                {activeStep < 2 ? (
                  <button
                    type="button"
                    onClick={() => setActiveStep(activeStep + 1)}
                    className="te-btn te-btn--primary"
                    style={{ flex: 1 }}
                  >
                    Next Step →
                  </button>
                ) : (
                  <div style={{ flex: 1 }} />
                )}
              </>
            ) : (
              <button
                type="button"
                onClick={captureFrame}
                disabled={!!cameraError}
                className="te-btn te-btn--primary"
                style={{ width: '100%', backgroundColor: 'var(--success)' }}
              >
                📸 Capture Guided Frame
              </button>
            )}
          </div>
        </div>

        {/* Capturing Steps Flow Indicators */}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0 var(--space-sm)' }}>
          {CHALLENGE_STEPS.map((step, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => setActiveStep(idx)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '0.25rem',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                color: idx === activeStep ? 'var(--brand-orange)' : frames[idx] ? 'var(--success)' : 'var(--text-tertiary)',
                transition: 'color var(--transition-fast)'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8125rem',
                border: '2px solid',
                borderColor: idx === activeStep ? 'var(--brand-orange)' : frames[idx] ? 'var(--success)' : 'var(--border-color)',
                backgroundColor: idx === activeStep ? 'var(--brand-orange-light)' : frames[idx] ? 'var(--success-light)' : 'transparent',
                transition: 'all var(--transition-fast)'
              }}>
                {idx + 1}
              </div>
              <span style={{ fontSize: '0.6875rem', fontWeight: 600 }}>
                {idx === 0 ? "Meal" : idx === 1 ? "Angle" : "Receipt"}
              </span>
            </button>
          ))}
        </div>

        {/* Submit Action */}
        <button
          type="submit"
          disabled={submitting || frames.some((f) => !f)}
          className="te-btn te-btn--primary"
          style={{ width: '100%', padding: '1rem', fontSize: '1rem', borderRadius: 'var(--radius-lg)' }}
        >
          {submitting ? "Submitting Evidence..." : "Submit for Verification"}
        </button>
      </form>
    </div>
  );
}

export default Complaint;
