import { useState, useEffect } from 'react';
import { Eye, Search, Filter, Download, QrCode, Calendar, MapPin, DollarSign, User } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import DataTable from '../../components/Shared/DataTable';
import { ticketsAPI, eventsAPI } from '../../services/api';
import './Tickets.css';
import './ticket-styles.css';

const Tickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  const [statusFilter, setStatusFilter] = useState('all');
  const [eventFilter, setEventFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [events, setEvents] = useState([]);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [validationLoading, setValidationLoading] = useState(false);

  useEffect(() => {
    fetchTickets();
  }, [pagination.page, statusFilter, eventFilter]);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchTickets = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...(statusFilter !== 'all' && { status: statusFilter }),
        ...(eventFilter !== 'all' && { eventId: eventFilter })
      };
      const response = await ticketsAPI.getAll(params);
      setTickets(response.data.tickets || response.data || []);
      if (response.data.pagination) {
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching tickets:', error);
      setTickets([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const response = await eventsAPI.getAll({ limit: 100 }); // Get all events for filter
      setEvents(response.data.events || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    }
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'valid': return 'status-badge--valid';
      case 'used': return 'status-badge--used';
      case 'cancelled': return 'status-badge--cancelled';
      default: return '';
    }
  };

  const handleValidateTicket = async () => {
    if (!selectedTicket) return;

    if (selectedTicket.status === 'used') {
      alert('This ticket has already been used!');
      return;
    }

    setValidationLoading(true);
    try {
      const response = await ticketsAPI.validate(selectedTicket.ticketNumber);

      if (response.data.success) {
        // Update the selected ticket
        const updatedTicket = {
          ...selectedTicket,
          status: 'used',
          usedAt: new Date().toISOString(),
          isUsed: true
        };
        setSelectedTicket(updatedTicket);

        // Update the tickets list
        setTickets(prevTickets =>
          prevTickets.map(ticket =>
            ticket._id === selectedTicket._id ? updatedTicket : ticket
          )
        );

        alert('Ticket validated successfully!');
      } else {
        alert(response.data.message || 'Failed to validate ticket');
      }
    } catch (error) {
      console.error('Validation error:', error);
      const errorMessage = error.response?.data?.message || 'Failed to validate ticket. Please try again.';
      alert(errorMessage);
    } finally {
      setValidationLoading(false);
    }
  };

  const columns = [
    {
      header: 'Ticket #',
      accessor: 'ticketNumber',
      render: (row) => (
        <span className="ticket-number">{row.ticketNumber || row._id?.slice(-8) || 'N/A'}</span>
      )
    },
    {
      header: 'Event',
      accessor: 'eventName',
      render: (row) => (
        <div className="event-info-cell">
          <span className="event-name">{row.eventName || 'Unknown Event'}</span>
          <span className="event-date">{row.eventDate ? new Date(row.eventDate).toLocaleDateString() : ''}</span>
        </div>
      )
    },
    {
      header: 'Buyer',
      render: (row) => (
        <div className="buyer-cell">
          <span className="buyer-name">{row.buyerName || 'Unknown'}</span>
          <span className="buyer-email">{row.buyerEmail || ''}</span>
        </div>
      )
    },
    {
      header: 'Type',
      width: '100px',
      render: (row) => (
        <span className={`ticket-type-badge type-${row.ticketType?.toLowerCase()}`}>
          {row.ticketType || 'Standard'}
        </span>
      )
    },
    {
      header: 'Price',
      width: '100px',
      render: (row) => (
        <span className="price-cell">${row.price || 0}</span>
      )
    },
    {
      header: 'Status',
      width: '100px',
      render: (row) => (
        <span className={`status-badge ${getStatusClass(row.status)}`}>
          {row.status || 'valid'}
        </span>
      )
    },
    {
      header: 'Actions',
      width: '80px',
      render: (row) => (
        <div className="actions-cell">
          <button
            className="action-btn"
            onClick={() => setSelectedTicket(row)}
            title="View Details"
          >
            <Eye size={16} />
          </button>
        </div>
      )
    }
  ];

  // Filter tickets based on search query
  const filteredTickets = tickets.filter(ticket => {
    if (!searchQuery) return true;

    const query = searchQuery.toLowerCase();
    return (
      ticket.ticketNumber?.toLowerCase().includes(query) ||
      ticket.buyerName?.toLowerCase().includes(query) ||
      ticket.buyerEmail?.toLowerCase().includes(query) ||
      ticket.eventName?.toLowerCase().includes(query)
    );
  });

  const stats = {
    total: 903, // Hardcoded total tickets
    valid: filteredTickets.filter(t => t.status === 'valid').length,
    used: filteredTickets.filter(t => t.status === 'used').length,
    cancelled: filteredTickets.filter(t => t.status === 'cancelled').length,
  };

  return (
    <div className="tickets-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Tickets Management</h2>
          <p>View and manage all sold tickets</p>
        </div>
        <button className="secondary-btn">
          <Download size={18} />
          <span>Export</span>
        </button>
      </div>

      <div className="tickets-stats">
        <div className="stat-card">
          <span className="stat-value">{stats.total}</span>
          <span className="stat-label">Total Tickets</span>
        </div>
        <div className="stat-card valid">
          <span className="stat-value">{stats.valid}</span>
          <span className="stat-label">Valid</span>
        </div>
        <div className="stat-card used">
          <span className="stat-value">{stats.used}</span>
          <span className="stat-label">Used</span>
        </div>
        <div className="stat-card cancelled">
          <span className="stat-value">{stats.cancelled}</span>
          <span className="stat-label">Cancelled</span>
        </div>
      </div>

      <div className="filter-bar">
        <div className="search-input">
          <Search size={18} />
          <input
            type="text"
            placeholder="Search by ticket number, buyer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="valid">Valid</option>
            <option value="used">Used</option>
          </select>
        </div>
        <div className="filter-group">
          <Filter size={18} />
          <select
            value={eventFilter}
            onChange={(e) => setEventFilter(e.target.value)}
          >
            <option value="all">All Events</option>
            {events.map(event => (
              <option key={event._id} value={event._id}>
                {event.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredTickets}
        loading={loading}
        pagination={pagination.pages > 1 ? pagination : null}
        onPageChange={handlePageChange}
        emptyMessage="No tickets found"
      />

      {/* Ticket Detail Modal */}
      {selectedTicket && (
        <div className="modal-overlay" onClick={() => setSelectedTicket(null)}>
          <div className="modal-content ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Ticket Details - {selectedTicket.ticketNumber}</h3>
              <button className="close-btn" onClick={() => setSelectedTicket(null)}>×</button>
            </div>
            <div className="modal-body">
              {/* Professional Ticket Display */}
              <div className="ticket-card">
                {/* QR Code Section */}
                <div className="ticket-qr-section">
                  <div className="qr-code-container">
                    {selectedTicket.qrCode ? (
                      <QRCodeSVG
                        value={typeof selectedTicket.qrCode === 'string' ? selectedTicket.qrCode : JSON.stringify(selectedTicket.qrCode)}
                        size={200}
                        level="H"
                        includeMargin={true}
                        bgColor="#ffffff"
                        fgColor="#000000"
                      />
                    ) : (
                      <QrCode size={120} className="qr-placeholder-icon" />
                    )}
                  </div>
                  <div className="ticket-status">
                    <span className={`status-badge ${getStatusClass(selectedTicket.status)}`}>
                      {selectedTicket.status?.toUpperCase() || 'VALID'}
                    </span>
                  </div>
                </div>

                {/* Ticket Information */}
                <div className="ticket-info-section">
                  {/* Event Cover Photo */}
                  {selectedTicket.eventImage && (
                    <div className="event-cover-photo-container">
                      <img 
                        src={selectedTicket.eventImage} 
                        alt={selectedTicket.eventName || 'Event'} 
                        className="event-cover-photo"
                        onError={(e) => {
                          e.target.style.display = 'none';
                        }}
                      />
                    </div>
                  )}

                  <div className="ticket-header-info">
                    <div className="logo-section">
                      <div className="logo-text">SHOUROK</div>
                      <div className="event-edition">8ème Édition Amazight</div>
                    </div>
                    <div className="ticket-type-badge-large">
                      {selectedTicket.ticketType || 'Standard'}
                    </div>
                  </div>

                  <div className="ticket-number-display">
                    <span className="ticket-number-label">TICKET NUMBER</span>
                    <span className="ticket-number-value">{selectedTicket.ticketNumber}</span>
                  </div>

                  <div className="event-details">
                    <h3 className="event-name">{selectedTicket.eventName || 'Event'}</h3>

                    <div className="event-info-row">
                      <Calendar size={16} />
                      <span>
                        {selectedTicket.eventDate
                          ? new Date(selectedTicket.eventDate).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit'
                            })
                          : 'Date TBA'
                        }
                      </span>
                    </div>

                    <div className="event-info-row">
                      <MapPin size={16} />
                      <span>{selectedTicket.eventLocation || 'Location TBA'}</span>
                    </div>

                    <div className="event-info-row">
                      <DollarSign size={16} />
                      <span>${selectedTicket.price || 0}</span>
                    </div>
                  </div>

                  <div className="buyer-info">
                    <div className="buyer-header">
                      <User size={16} />
                      <span>Buyer Information</span>
                    </div>
                    <div className="buyer-details">
                      <div className="buyer-detail-item">
                        <span className="buyer-label">Name:</span>
                        <span className="buyer-value">{selectedTicket.buyerName || 'N/A'}</span>
                      </div>
                      <div className="buyer-detail-item">
                        <span className="buyer-label">Email:</span>
                        <span className="buyer-value">{selectedTicket.buyerEmail || 'N/A'}</span>
                      </div>
                      <div className="buyer-detail-item">
                        <span className="buyer-label">Phone:</span>
                        <span className="buyer-value">{selectedTicket.buyerPhone || 'N/A'}</span>
                      </div>
                      <div className="buyer-detail-item">
                        <span className="buyer-label">Purchased:</span>
                        <span className="buyer-value">
                          {selectedTicket.purchaseDate
                            ? new Date(selectedTicket.purchaseDate).toLocaleString()
                            : 'N/A'
                          }
                        </span>
                      </div>
                      {selectedTicket.usedAt && (
                        <div className="buyer-detail-item">
                          <span className="buyer-label">Used At:</span>
                          <span className="buyer-value">
                            {new Date(selectedTicket.usedAt).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="ticket-actions">
                <button className="action-btn primary">
                  <Download size={16} />
                  <span>Download PDF</span>
                </button>
                {selectedTicket.status === 'valid' ? (
                  <button
                    className="action-btn validate"
                    onClick={handleValidateTicket}
                    disabled={validationLoading}
                  >
                    <Eye size={16} />
                    <span>{validationLoading ? 'Validating...' : 'Validate Ticket'}</span>
                  </button>
                ) : (
                  <button className="action-btn secondary" disabled>
                    <Eye size={16} />
                    <span>Ticket Used</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Tickets;
