import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Ticket, Download, Calendar, MapPin, User, LogOut } from 'lucide-react';
import { ticketsAPI } from '../../services/api';
import './Profile.css';

const Profile = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadUserData();
    loadTickets();
  }, []);

  const loadUserData = () => {
    const userData = localStorage.getItem('user');
    if (userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (e) {
        console.error('Error parsing user data:', e);
      }
    }
  };

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);
      const userId = localStorage.getItem('userId');
      if (!userId) {
        setError('User not found. Please log in again.');
        navigate('/login');
        return;
      }

      const response = await ticketsAPI.getByUser(userId);
      setTickets(response.data.tickets || response.data || []);
    } catch (err) {
      console.error('Error loading tickets:', err);
      setError(err.response?.data?.message || 'Failed to load tickets');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('userId');
    localStorage.removeItem('isLoggedIn');
    navigate('/login');
  };

  const handleDownloadPDF = (ticket) => {
    // Create HTML content for PDF
    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 40px;
              background: #000;
              color: #fff;
            }
            .ticket-container {
              background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
              border: 2px solid #cf8e0d;
              border-radius: 20px;
              padding: 30px;
              max-width: 600px;
              margin: 0 auto;
            }
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #cf8e0d;
              padding-bottom: 20px;
            }
            .logo {
              font-size: 32px;
              font-weight: bold;
              color: #cf8e0d;
              margin-bottom: 10px;
            }
            .ticket-title {
              font-size: 24px;
              color: #fff;
              margin: 10px 0;
            }
            .qr-section {
              text-align: center;
              margin: 30px 0;
              padding: 20px;
              background: rgba(255, 255, 255, 0.1);
              border-radius: 10px;
            }
            .info-section {
              margin: 20px 0;
            }
            .info-row {
              display: flex;
              justify-content: space-between;
              padding: 10px 0;
              border-bottom: 1px solid rgba(255, 255, 255, 0.1);
            }
            .info-label {
              color: #cf8e0d;
              font-weight: bold;
            }
            .info-value {
              color: #fff;
            }
            .ticket-number {
              font-size: 18px;
              font-weight: bold;
              color: #cf8e0d;
              text-align: center;
              margin: 20px 0;
              padding: 15px;
              background: rgba(207, 142, 13, 0.1);
              border-radius: 10px;
            }
            .footer {
              text-align: center;
              margin-top: 30px;
              padding-top: 20px;
              border-top: 2px solid #cf8e0d;
              color: rgba(255, 255, 255, 0.6);
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="ticket-container">
            <div class="header">
              <div class="logo">SHOUROK EVENT</div>
              <div class="ticket-title">${ticket.eventId?.name || 'Event'}</div>
            </div>
            
            <div class="ticket-number">
              Ticket Number: ${ticket.ticketNumber || 'N/A'}
            </div>
            
            <div class="qr-section">
              <p style="color: rgba(255, 255, 255, 0.7); font-size: 12px;">QR Code: ${ticket.ticketNumber || 'N/A'}</p>
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Event:</span>
                <span class="info-value">${ticket.eventId?.name || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${ticket.eventId?.date ? new Date(ticket.eventId.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Location:</span>
                <span class="info-value">${ticket.eventId?.location || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Ticket Type:</span>
                <span class="info-value">${ticket.ticketType || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Price:</span>
                <span class="info-value">${ticket.price || 0} DA</span>
              </div>
              <div class="info-row">
                <span class="info-label">Purchase Date:</span>
                <span class="info-value">${ticket.purchaseDate ? new Date(ticket.purchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
              </div>
            </div>
            
            <div class="footer">
              <p>This is your official ticket. Please present this at the event.</p>
              <p>Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    // Create a blob and download
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${ticket.ticketNumber || 'ticket'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="profile-container">
      <div className="profile-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      {/* Header */}
      <div className="profile-header">
        <button onClick={() => navigate('/home')} className="back-button">
          <ArrowLeft size={24} />
        </button>
        <h2 className="profile-header-title">My Profile</h2>
        <button onClick={handleLogout} className="logout-button">
          <LogOut size={20} />
        </button>
      </div>

      <div className="profile-content">
        {/* User Info */}
        {user && (
          <div className="user-info-card">
            <div className="user-avatar-large">
              {user.profileImage ? (
                <img src={user.profileImage} alt={user.username} />
              ) : (
                <User size={48} />
              )}
            </div>
            <h3 className="user-name">{user.username || user.email}</h3>
            {user.email && <p className="user-email">{user.email}</p>}
          </div>
        )}

        {/* Tickets Section */}
        <div className="tickets-section">
          <h3 className="section-title">
            <Ticket size={24} />
            My Tickets
          </h3>

          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading tickets...</p>
            </div>
          ) : error ? (
            <div className="error-state">
              <p>{error}</p>
            </div>
          ) : tickets.length === 0 ? (
            <div className="empty-state">
              <Ticket size={48} className="empty-icon" />
              <p>No tickets purchased yet</p>
              <button onClick={() => navigate('/events-list')} className="browse-events-button">
                Browse Events
              </button>
            </div>
          ) : (
            <div className="tickets-list">
              {tickets.map((ticket) => (
                <div key={ticket._id} className="ticket-card">
                  <div className="ticket-card-content">
                    <div className="ticket-info">
                      <h4 className="ticket-event-name">
                        {ticket.eventId?.name || 'Event'}
                      </h4>
                      <div className="ticket-details">
                        <div className="ticket-detail-row">
                          <Calendar size={16} />
                          <span>{formatDate(ticket.eventId?.date)}</span>
                        </div>
                        <div className="ticket-detail-row">
                          <MapPin size={16} />
                          <span>{ticket.eventId?.location || 'N/A'}</span>
                        </div>
                        <div className="ticket-detail-row">
                          <Ticket size={16} />
                          <span>{ticket.ticketType} - {ticket.price} DA</span>
                        </div>
                      </div>
                      <p className="ticket-number">Ticket #: {ticket.ticketNumber}</p>
                    </div>
                    <div className="ticket-actions">
                      <button
                        onClick={() => navigate(`/ticket/${ticket.ticketNumber}`, {
                          state: { ticket }
                        })}
                        className="view-ticket-button"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDownloadPDF(ticket)}
                        className="download-button"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;

