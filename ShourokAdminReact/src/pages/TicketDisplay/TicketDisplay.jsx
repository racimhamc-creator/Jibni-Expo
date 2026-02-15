import { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { ArrowLeft, Download, Share2, Calendar, MapPin, Ticket, Hash } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { ticketsAPI } from '../../services/api';
import './TicketDisplay.css';

const TicketDisplay = () => {
  const navigate = useNavigate();
  const { ticketNumber } = useParams();
  const location = useLocation();
  const [ticket, setTicket] = useState(location.state?.ticket || null);
  const [loading, setLoading] = useState(!ticket);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (ticketNumber && !ticket) {
      loadTicket();
    }
  }, [ticketNumber]);

  const loadTicket = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ticketsAPI.getByTicketNumber(ticketNumber);
      setTicket(response.data.ticket || response.data);
    } catch (err) {
      console.error('Error loading ticket:', err);
      setError(err.response?.data?.message || 'Failed to load ticket');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
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
              <div class="ticket-title">${ticket?.eventId?.name || 'Event'}</div>
            </div>
            
            <div class="ticket-number">
              Ticket Number: ${ticket?.ticketNumber || 'N/A'}
            </div>
            
            <div class="qr-section">
              <p style="color: rgba(255, 255, 255, 0.7); font-size: 12px;">QR Code: ${ticket?.ticketNumber || 'N/A'}</p>
            </div>
            
            <div class="info-section">
              <div class="info-row">
                <span class="info-label">Event:</span>
                <span class="info-value">${ticket?.eventId?.name || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Date:</span>
                <span class="info-value">${ticket?.eventId?.date ? new Date(ticket.eventId.date).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Location:</span>
                <span class="info-value">${ticket?.eventId?.location || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Ticket Type:</span>
                <span class="info-value">${ticket?.ticketType || 'N/A'}</span>
              </div>
              <div class="info-row">
                <span class="info-label">Price:</span>
                <span class="info-value">${ticket?.price || 0} DA</span>
              </div>
              <div class="info-row">
                <span class="info-label">Purchase Date:</span>
                <span class="info-value">${ticket?.purchaseDate ? new Date(ticket.purchaseDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</span>
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
    link.download = `ticket-${ticket?.ticketNumber || 'ticket'}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share && ticket) {
      try {
        await navigator.share({
          title: `Ticket: ${ticket.ticketNumber}`,
          text: `Event: ${ticket.eventId?.name || 'Event'}\nDate: ${ticket.eventId?.date ? new Date(ticket.eventId.date).toLocaleDateString() : 'N/A'}`,
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      const text = `Ticket: ${ticket?.ticketNumber}\nEvent: ${ticket?.eventId?.name || 'Event'}\nDate: ${ticket?.eventId?.date ? new Date(ticket.eventId.date).toLocaleDateString() : 'N/A'}`;
      navigator.clipboard.writeText(text).then(() => {
        alert('Ticket information copied to clipboard!');
      });
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return (
      <div className="ticket-display-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error && !ticket) {
    return (
      <div className="ticket-display-container">
        <div className="ticket-display-error">
          <p>{error}</p>
          <button onClick={() => navigate('/home')} className="back-button">
            <ArrowLeft size={20} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!ticket) {
    return null;
  }

  return (
    <div className="ticket-display-container">
      <div className="ticket-display-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      {/* Header */}
      <div className="ticket-display-header">
        <button onClick={() => navigate('/home')} className="back-button">
          <ArrowLeft size={24} />
        </button>
        <h2 className="ticket-display-header-title">My Ticket</h2>
        <div className="placeholder"></div>
      </div>

      <div className="ticket-display-content">
        {/* Ticket Card */}
        <div className="ticket-card">
          {/* QR Code */}
          <div className="qr-code-container">
            <QRCodeSVG
              value={ticket.qrCode || ticket.ticketNumber}
              size={200}
              level="H"
              includeMargin={true}
              fgColor="#000000"
              bgColor="#FFFFFF"
            />
          </div>

          {/* Ticket Info */}
          <div className="ticket-info">
            <div className="ticket-number-section">
              <span className="ticket-number-label">Ticket Number</span>
              <span className="ticket-number-value">{ticket.ticketNumber}</span>
            </div>

            <div className="divider"></div>

            <h3 className="event-name">{ticket.eventId?.name || 'Event'}</h3>

            <div className="info-row">
              <Calendar size={18} className="info-icon" />
              <span className="info-text">{formatDate(ticket.eventId?.date)}</span>
            </div>

            <div className="info-row">
              <MapPin size={18} className="info-icon" />
              <span className="info-text">{ticket.eventId?.location || 'N/A'}</span>
            </div>

            <div className="info-row">
              <Ticket size={18} className="info-icon" />
              <span className="info-text">{ticket.ticketType}</span>
            </div>

            <div className="info-row">
              <Hash size={18} className="info-icon" />
              <span className="info-text">{ticket.price} DA</span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="actions-container">
          <button className="action-button" onClick={handleShare}>
            <Share2 size={24} />
            <span>Share</span>
          </button>

          <button className="action-button download-button" onClick={handleDownloadPDF}>
            <Download size={24} />
            <span>Download PDF</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default TicketDisplay;

