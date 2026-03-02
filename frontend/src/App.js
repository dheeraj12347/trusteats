import React, { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import CustomerDashboard from './pages/customer/Dashboard';
import RestaurantDashboard from './pages/restaurant/Dashboard';
import ComplaintsAdmin from './pages/admin/Complaints';
import OrderTracking from './pages/customer/OrderTracking';
import Navbar from './components/Navbar';

import ComplaintForm from './pages/customer/Complaint';
import MyComplaints from './pages/customer/MyComplaints';
import RestaurantDetailsWrapper from './pages/customer/RestaurantDetailsWrapper';
import RestaurantComplaints from './pages/restaurant/Complaints';

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('te_user');
    if (saved) {
      setUser(JSON.parse(saved));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('te_token');
    localStorage.removeItem('te_user');
    setUser(null);
  };

  // Unauthenticated routes: login + register
  if (!user) {
    return (
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Login onLogin={setUser} />} />
          <Route path="/login" element={<Login onLogin={setUser} />} />
          <Route path="/register" element={<Register />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    );
  }

  // Authenticated routes based on role
  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={handleLogout} />
      <main style={{ maxWidth: 1200, margin: '1.25rem auto', padding: '0 1rem' }}>
        <Routes>
          {user.role === 'CUSTOMER' && (
            <>
              <Route path="/" element={<CustomerDashboard />} />
              <Route path="/track/:orderId" element={<OrderTracking />} />
              <Route path="/complaint/:orderId" element={<ComplaintForm />} />
              <Route path="/customer/complaints" element={<MyComplaints />} />
              <Route
                path="/customer/restaurants/:id"
                element={<RestaurantDetailsWrapper />}
              />
            </>
          )}

          {user.role === 'RESTAURANT' && (
            <>
              <Route path="/" element={<RestaurantDashboard />} />
              <Route
                path="/restaurant/complaints"
                element={<RestaurantComplaints />}
              />
            </>
          )}

          {user.role === 'ADMIN' && (
            <>
              <Route path="/" element={<ComplaintsAdmin />} />
            </>
          )}

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </main>
    </BrowserRouter>
  );
}

export default App;
