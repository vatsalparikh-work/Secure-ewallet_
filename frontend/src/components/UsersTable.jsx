import React, { useState, useEffect } from 'react';
import axios from 'axios';

const UsersTable = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [modalConfig, setModalConfig] = useState({ isOpen: false, title: '', message: '', onConfirm: null, confirmType: '' });

    const fetchUsers = async () => {
        try {
            const res = await axios.get('/admin/users');
            setUsers(res.data.data);
            setLoading(false);
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const closeMenu = () => {
        setModalConfig({ ...modalConfig, isOpen: false });
    };

    const confirmAction = async () => {
        if (modalConfig.onConfirm) {
            await modalConfig.onConfirm();
        }
        closeMenu();
    };

    const handleFreeze = (userId, currentStatus) => {
        setModalConfig({
            isOpen: true,
            title: currentStatus ? 'Unfreeze User' : 'Freeze User',
            message: `Are you sure you want to ${currentStatus ? 'unfreeze' : 'freeze'} this user?`,
            confirmType: currentStatus ? 'btn-success' : 'btn-warning',
            onConfirm: async () => {
                try {
                    await axios.put(`/admin/users/${userId}/freeze`);
                    fetchUsers();
                } catch (err) {
                    alert(err.response?.data?.message || 'Error updating user.');
                }
            }
        });
    };

    const handleDelete = (userId) => {
        setModalConfig({
            isOpen: true,
            title: 'Delete User',
            message: 'Are you ABSOLUTELY sure you want to delete this user? This action cannot be undone.',
            confirmType: 'btn-danger',
            onConfirm: async () => {
                try {
                    await axios.delete(`/admin/users/${userId}`);
                    fetchUsers();
                } catch (err) {
                    alert(err.response?.data?.message || 'Error deleting user.');
                }
            }
        });
    };

    if (loading) return <div>Loading users...</div>;

    return (
        <section className="card">
            <div className="card-header">
                <h2 className="card-title">👥 User Management</h2>
                <span className="badge badge-info">Total: {users.length}</span>
            </div>

            <div className="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Balance</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.id}>
                                <td>#{user.id}</td>
                                <td style={{ fontWeight: 500 }}>{user.name}</td>
                                <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                                <td style={{ fontFamily: 'monospace', fontSize: '1rem' }}>₹{parseFloat(user.wallet_balance).toFixed(2)}</td>
                                <td>
                                    <span className={`badge ${user.role === 'admin' ? 'badge-warning' : 'badge-info'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td>
                                    {user.is_frozen ? (
                                        <span className="badge badge-danger">Frozen</span>
                                    ) : (
                                        <span className="badge badge-success">Active</span>
                                    )}
                                </td>
                                <td>
                                    <div className="flex-actions">
                                        <button
                                            onClick={() => handleFreeze(user.id, user.is_frozen)}
                                            className={`action-btn ${user.is_frozen ? 'btn-success' : 'btn-warning'}`}
                                        >
                                            {user.is_frozen ? 'Unfreeze' : 'Freeze'}
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id)}
                                            className="action-btn btn-danger"
                                        >
                                            Delete
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="7" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                                    No users found.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Custom Modal */}
            {modalConfig.isOpen && (
                <div className="modal-overlay" onClick={closeMenu}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">{modalConfig.title}</h3>
                        </div>
                        <div className="modal-body">
                            {modalConfig.message}
                        </div>
                        <div className="modal-footer">
                            <button className="action-btn btn-cancel" onClick={closeMenu}>
                                Cancel
                            </button>
                            <button className={`action-btn ${modalConfig.confirmType}`} onClick={confirmAction}>
                                Confirm
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </section>
    );
};

export default UsersTable;
