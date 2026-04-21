import React, { useState, useEffect } from 'react';
import axios from 'axios';

const SuspiciousTransactions = () => {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchSuspicious = async () => {
            try {
                const res = await axios.get('/admin/suspicious-transactions');
                setTransactions(res.data.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSuspicious();
    }, []);

    if (loading) return <div>Loading suspicious transactions...</div>;

    return (
        <section className="card">
            <div className="card-header">
                <h2 className="card-title">🚨 Suspicious Transactions</h2>
                <span className="badge badge-danger">Flagged: {transactions.length}</span>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Date</th>
                            <th>Sender</th>
                            <th>Receiver</th>
                            <th>Amount</th>
                            <th>Risk Flag</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.map(tx => {
                            const amount = parseFloat(tx.amount);
                            // Simply determine reason based on amount for display
                            const isHighValue = amount > 500;

                            return (
                                <tr key={`suspicious-${tx.id}`}>
                                    <td>#{tx.id}</td>
                                    <td>{new Date(tx.createdAt).toLocaleString()}</td>
                                    <td>
                                        {tx.Sender ? tx.Sender.name : 'Unknown'}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {tx.Sender ? tx.Sender.email : ''}
                                        </div>
                                    </td>
                                    <td>
                                        {tx.Receiver ? tx.Receiver.name : 'Unknown'}
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                                            {tx.Receiver ? tx.Receiver.email : ''}
                                        </div>
                                    </td>
                                    <td style={{ color: 'var(--danger-color)', fontWeight: 600 }}>
                                        ₹{amount.toFixed(2)}
                                    </td>
                                    <td>
                                        <span className="badge badge-warning">
                                            {isHighValue ? 'High Value (> ₹500)' : 'High Frequency'}
                                        </span>
                                    </td>
                                </tr>
                            );
                        })}
                        {transactions.length === 0 && (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No suspicious transactions found. All good! 🛡️
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </section>
    );
};

export default SuspiciousTransactions;
