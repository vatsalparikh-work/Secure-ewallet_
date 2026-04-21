import React, { useState, useEffect } from 'react';
import axios from 'axios';
import UsersTable from './UsersTable';
import SuspiciousTransactions from './SuspiciousTransactions';
import SystemLogs from './SystemLogs';

const AdminDashboard = () => {
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);

    // We consider auth handled via cookies. If any request returns 401/403, we redirect to login.
    useEffect(() => {
        // Intercept axios responses globally
        const interceptor = axios.interceptors.response.use(
            response => response,
            error => {
                if (error.response && (error.response.status === 401 || error.response.status === 403)) {
                    window.location.href = '/auth/login'; // Redirect to main app login
                }
                return Promise.reject(error);
            }
        );

        // Initial check (simulate by fetching users)
        axios.get('/admin/users')
            .then(() => setLoading(false))
            .catch((err) => {
                setError(err.response?.data?.message || 'Failed to load dashboard.');
                setLoading(false);
            });

        return () => axios.interceptors.response.eject(interceptor);
    }, []);

    const handleLogout = async () => {
        window.location.href = '/auth/logout';
    };

    if (loading) {
        return (
            <div className="dashboard-container">
                <div className="loading-spinner">
                    <h2>Loading Admin Dashboard...</h2>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container">
            <header className="dashboard-header">
                <h1>Secure eWallet Admin</h1>
                <button onClick={handleLogout} className="logout-btn">
                    🚪 Logout
                </button>
            </header>

            <main className="dashboard-content">
                {error && <div className="error-message">{error}</div>}

                <UsersTable />
                <SuspiciousTransactions />
                <SystemLogs />
            </main>
        </div>
    );
};

export default AdminDashboard;
