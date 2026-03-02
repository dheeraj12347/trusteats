// frontend/src/pages/customer/Complaint.jsx
import React, { useState, useEffect } from "react";
import { getMyOrders, createComplaint } from "../../api/api";

function Complaint() {
  const [orders, setOrders] = useState([]);
  const [orderId, setOrderId] = useState("");
  const [type, setType] = useState("MISSING_ITEM");
  const [description, setDescription] = useState("");
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const loadOrders = async () => {
      try {
        const res = await getMyOrders();
        setOrders(res.data.orders || []);
      } catch (err) {
        console.error("Failed to load orders", err);
        alert("Failed to load your orders. Please refresh.");
      }
    };
    loadOrders();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Frontend validation – prevents most 400s
    if (!orderId) {
      alert("Please select an order first.");
      return;
    }

    const allowedTypes = [
      "MISSING_ITEM",
      "QUALITY_ISSUE",
      "FOREIGN_OBJECT",
      "OTHER",
    ];
    if (!type || !allowedTypes.includes(type)) {
      alert("Please select a valid complaint type.");
      return;
    }

    const formData = new FormData();
    formData.append("order_id", orderId);
    formData.append("type", type);
    formData.append("description", description || "");
    if (image) {
      formData.append("image", image);
    }

    // Optional: debug what is being sent
    console.log("Submitting complaint with:", {
      order_id: orderId,
      type,
      description,
      image,
    });

    try {
      setSubmitting(true);
      await createComplaint(formData);

      alert("Complaint submitted successfully.");

      // Reset form
      setOrderId("");
      setType("MISSING_ITEM");
      setDescription("");
      setImage(null);
      e.target.reset(); // clears file input
    } catch (err) {
      console.error("Failed to submit complaint", err);

      // Try to show backend message if present
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        "Server rejected the complaint (400). Please check required fields.";
      alert(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h2>Report an Issue</h2>

      <form onSubmit={handleSubmit} encType="multipart/form-data">
        <label>
          Order:
          <select
            value={orderId}
            onChange={(e) => setOrderId(e.target.value)}
          >
            <option value="">Select order</option>
            {orders.map((o) => (
              <option key={o.id} value={o.id}>
                #{o.id} - {o.restaurant_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Issue type:
          <select
            value={type}
            onChange={(e) => setType(e.target.value)}
          >
            <option value="MISSING_ITEM">Missing item</option>
            <option value="QUALITY_ISSUE">Quality issue</option>
            <option value="FOREIGN_OBJECT">Foreign object</option>
            <option value="OTHER">Other</option>
          </select>
        </label>

        <label>
          Description:
          <textarea
            placeholder="Describe the issue..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label>
          Evidence image (optional):
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0] || null)}
          />
        </label>

        <button type="submit" disabled={submitting}>
          {submitting ? "Submitting..." : "Submit complaint"}
        </button>
      </form>
    </div>
  );
}

export default Complaint;
