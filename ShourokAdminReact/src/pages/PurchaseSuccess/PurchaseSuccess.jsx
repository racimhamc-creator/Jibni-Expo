import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import { ticketsAPI } from '../../services/api';
import './PurchaseSuccess.css';

const PurchaseSuccess = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, failed
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const paymentStatus = searchParams.get('status');
    const ticketNumber = searchParams.get('ticketNumber');
    const errorMessage = searchParams.get('error');

    if (paymentStatus === 'success' && ticketNumber) {
      // Payment successful - load ticket
      loadTicket(ticketNumber);
    } else if (paymentStatus === 'failed' || errorMessage) {
      // Payment failed
      setStatus('failed');
      setError(errorMessage || 'Payment was canceled or failed. Please try again.');
    } else {
      // Unknown status
      setStatus('failed');
      setError('Unable to verify payment status. Please check your profile or contact support.');
    }
  }, [searchParams]);

  const loadTicket = async (ticketNumber) => {
    try {
      const response = await ticketsAPI.getByTicketNumber(ticketNumber);
      if (response.data.ticket || response.data) {
        setTicket(response.data.ticket || response.data);
        setStatus('success');
      } else {
        setStatus('failed');
        setError('Ticket not found. Please check your profile.');
      }
    } catch (err) {
      console.error('Error loading ticket:', err);
      setStatus('failed');
      setError('Failed to load ticket. Please check your profile.');
    }
  };


  const handleViewTicket = () => {
    if (ticket) {
      navigate(`/ticket/${ticket.ticketNumber}`, {
        state: { ticket },
      });
    }
  };

  const handleGoToProfile = () => {
    navigate('/profile');
  };

  return (
    <div className="purchase-success-container">
      <div className="purchase-success-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      <div className="purchase-success-content">
        {status === 'processing' && (
          <div className="status-card processing">
            <Loader size={64} className="status-icon" />
            <h2>Processing Payment...</h2>
            <p>Please wait while we confirm your payment.</p>
          </div>
        )}

        {status === 'success' && (
          <div className="status-card success">
            <CheckCircle size={64} className="status-icon" />
            <h2>Payment Successful!</h2>
            <p>Your tickets have been purchased successfully.</p>
            <div className="action-buttons">
              <button onClick={handleViewTicket} className="primary-button">
                View Ticket
              </button>
              <button onClick={handleGoToProfile} className="secondary-button">
                Go to Profile
              </button>
            </div>
          </div>
        )}

        {status === 'failed' && (
          <div className="status-card failed">
            <XCircle size={64} className="status-icon" />
            <h2>Payment Failed</h2>
            <p>{error || 'Something went wrong with your payment.'}</p>
            <div className="action-buttons">
              <button onClick={() => navigate('/home')} className="primary-button">
                Go to Home
              </button>
              <button onClick={() => navigate(-1)} className="secondary-button">
                Try Again
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PurchaseSuccess;

