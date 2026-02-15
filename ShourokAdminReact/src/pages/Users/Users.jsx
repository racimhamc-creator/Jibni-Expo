import { useState, useEffect } from 'react';
import { Eye, Mail, Phone, Calendar } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import { authAPI } from '../../services/api';
import './Users.css';

const Users = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 1000, total: 0, pages: 1 });

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (page = 1) => {
    try {
      setLoading(true);
      const response = await authAPI.getUsers(1000, page);
      setUsers(response.data.users || response.data || []);
      
      // Update pagination info if available
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    {
      header: 'User',
      accessor: 'username',
      render: (row) => (
        <div className="user-cell">
          <div className="user-avatar">
            {row.profileImage ? (
              <img src={row.profileImage} alt={row.username || row.firstName} />
            ) : (
              <span>{(row.username || row.firstName || row.email || 'U').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="user-details">
            <span className="user-name">{row.username || `${row.firstName || ''} ${row.lastName || ''}`.trim() || 'Unknown'}</span>
            <span className="user-id">ID: {row._id?.slice(-6) || row.id?.slice(-6) || 'N/A'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Email',
      accessor: 'email',
      render: (row) => (
        <div className="email-cell">
          <Mail size={14} />
          <span>{row.email || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Phone',
      accessor: 'phoneNumber',
      render: (row) => (
        <div className="phone-cell">
          <Phone size={14} />
          <span>{row.phoneNumber || row.phone || 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Joined',
      accessor: 'createdAt',
      render: (row) => (
        <div className="date-cell">
          <Calendar size={14} />
          <span>{row.createdAt ? new Date(row.createdAt).toLocaleDateString() : 'N/A'}</span>
        </div>
      )
    },
    {
      header: 'Actions',
      width: '100px',
      render: (row) => (
        <div className="actions-cell">
          <button 
            className="action-btn"
            onClick={() => setSelectedUser(row)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="users-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Users Management</h2>
          <p>View and manage all registered users</p>
        </div>
        <div className="header-stats">
          <div className="stat-item">
            <span className="stat-value">{users.length}</span>
            <span className="stat-label">Total Users</span>
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        loading={loading}
        emptyMessage="No users found"
      />

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="modal-overlay" onClick={() => setSelectedUser(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>User Details</h3>
              <button className="close-btn" onClick={() => setSelectedUser(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="user-profile">
                <div className="profile-avatar">
                  {selectedUser.profileImage ? (
                    <img src={selectedUser.profileImage} alt={selectedUser.username} />
                  ) : (
                    <span>{(selectedUser.username || selectedUser.firstName || selectedUser.email || 'U').charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <h4>{selectedUser.username || `${selectedUser.firstName || ''} ${selectedUser.lastName || ''}`.trim()}</h4>
              </div>
              <div className="detail-grid">
                <div className="detail-item">
                  <label>Email</label>
                  <span>{selectedUser.email || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Phone</label>
                  <span>{selectedUser.phoneNumber || selectedUser.phone || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Birthday</label>
                  <span>{selectedUser.birthday || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <label>Joined</label>
                  <span>{selectedUser.createdAt ? new Date(selectedUser.createdAt).toLocaleDateString() : 'N/A'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
