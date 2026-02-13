import React, { useState, useEffect } from 'react';
import { adminAPI, User } from '../services/api';
import './Users.css';

const Users: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const data = await adminAPI.getUsers();
      setUsers(data);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch users');
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = users.filter(user =>
    (user.phoneNumber || user.phone_number || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.firstName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (user.lastName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading users...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-container">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={fetchUsers} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Users</h2>
        <p className="page-subtitle">Total: {users.length} users</p>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Search by name or phone number..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
      </div>

      <div className="table-container">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Phone Number</th>
              <th>Role</th>
              <th>City</th>
              <th>Status</th>
              <th>Has Missions</th>
              <th>Driver Request</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty-state">
                  No users found
                </td>
              </tr>
            ) : (
              filteredUsers.map((user) => (
                <tr key={user._id || user.id}>
                  <td>
                    {user.firstName || user.lastName 
                      ? `${user.firstName || ''} ${user.lastName || ''}`.trim() 
                      : 'No Name'}
                  </td>
                  <td className="phone-cell">{user.phoneNumber || user.phone_number}</td>
                  <td>
                    <span className={`badge ${user.role === 'driver' ? 'success' : ''}`}>
                      {user.role === 'driver' ? '🚗 Driver' : '👤 Client'}
                    </span>
                  </td>
                  <td>{user.city || user.wilaya || 'N/A'}</td>
                  <td>
                    <span className={`status-badge ${user.banned ? 'banned' : 'active'}`}>
                      {user.banned ? '🚫 Banned' : '✅ Active'}
                    </span>
                  </td>
                  <td>
                    {user.hasMissions ? (
                      <span className="badge success">Yes</span>
                    ) : (
                      <span className="badge">No</span>
                    )}
                  </td>
                  <td>
                    {user.isDriverRequested ? (
                      <span className="badge" style={{ backgroundColor: '#FFA500', color: 'white' }}>
                        ⏳ Pending
                      </span>
                    ) : (
                      <span className="badge">-</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default Users;
