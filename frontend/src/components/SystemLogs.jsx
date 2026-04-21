import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SystemLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await axios.get('/admin/logs');
                setLogs(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchLogs();
    }, []);

    if (loading) return <div>Loading system logs...</div>;

    return (
        <section className="card">
            <div className="card-header">
                <h2 className="card-title">📜 System Logs</h2>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <a href="/admin/logs/pdf" target="_blank" rel="noreferrer" className="action-btn" style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3b82f6', border: '1px solid rgba(59, 130, 246, 0.2)', textDecoration: 'none' }}>
                        📥 Download PDF
                    </a>
                    <span className="badge badge-info">Recent: {logs.length}</span>
                </div>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Type</th>
                            <th>User</th>
                            <th>IP Address</th>
                            <th>Details</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.map((log) => (
                            <tr key={log.id}>
                                <td style={{ whiteSpace: 'nowrap' }}>
                                    {new Date(log.date).toLocaleString()}
                                </td>
                                <td>
                                    <span className={`badge ${log.type === 'LOGIN' ? 'badge-success' : 'badge-info'}`}>
                                        {log.type}
                                    </span>
                                </td>
                                <td>
                                    {log.user}
                                    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                        {log.email}
                                    </div>
                                </td>
                                <td>
                                    <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>
                                        {log.ip_address || 'N/A'}
                                    </span>
                                </td>
                                <td style={{ color: 'var(--text-secondary)' }}>
                                    {log.details}
                                </td>
                            </tr>
                        ))}
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan="5" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No system logs available.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default SystemLogs;
