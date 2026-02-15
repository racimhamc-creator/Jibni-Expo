import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Info, CreditCard } from 'lucide-react';
import { eventsAPI } from '../../services/api';
import './PurchaseTickets.css';

const PurchaseTickets = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Get purchase data from navigation state
  const purchaseData = location.state || {};
  const { eventId, eventName, ticketType, quantity, ticketPrice } = purchaseData;

  useEffect(() => {
    // Redirect if no purchase data
    if (!eventId || !ticketType || !quantity) {
      navigate('/home');
    }
  }, [eventId, ticketType, quantity, navigate]);

  const handleConfirmPurchase = async () => {
    try {
      setLoading(true);
      setError(null);

      const userId = localStorage.getItem('userId');
      const userData = localStorage.getItem('user');
      
      if (!userId) {
        setError('Please log in to purchase tickets');
        navigate('/login');
        return;
      }

      // Parse user data for email
      let userEmail = 'customer@example.com';
      let userName = 'Customer';
      try {
        if (userData) {
          const user = JSON.parse(userData);
          userEmail = user.email || userEmail;
          userName = user.username || user.firstName || userName;
        }
      } catch (e) {
        console.error('Error parsing user data:', e);
      }

      // Call backend to create Chargily checkout
      const response = await eventsAPI.createCheckout(eventId, {
        userId,
        ticketType,
        quantity: parseInt(quantity),
        userEmail,
        userName,
      });

      if (response.data.success && response.data.checkout_url) {
        // Redirect to Chargily payment page
        window.location.href = response.data.checkout_url;
      } else {
        setError(response.data.message || 'Failed to create payment session');
        setLoading(false);
      }
    } catch (err) {
      console.error('Payment initiation error:', err);
      setError(err.response?.data?.message || 'Failed to initiate payment. Please try again.');
      setLoading(false);
    }
  };

  const totalPrice = ticketPrice ? ticketPrice * quantity : 0;

  if (!eventId || !ticketType || !quantity) {
    return null;
  }

  return (
    <div className="purchase-tickets-container">
      <div className="purchase-tickets-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      {/* Header */}
      <div className="purchase-tickets-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ArrowLeft size={24} />
        </button>
        <h2 className="purchase-tickets-header-title">Purchase Tickets</h2>
        <div className="placeholder"></div>
      </div>

      <div className="purchase-tickets-content">
        {/* Purchase Summary */}
        <div className="summary-card">
          <div className="summary-row">
            <span className="summary-label">Event</span>
            <span className="summary-value">{eventName || 'Event'}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Ticket Type</span>
            <span className="summary-value">{ticketType}</span>
          </div>
          <div className="summary-row">
            <span className="summary-label">Quantity</span>
            <span className="summary-value">{quantity}</span>
          </div>
          <div className="summary-row total-row">
            <span className="total-label">Total</span>
            <span className="total-value">
              {totalPrice > 0 ? `${totalPrice} DA` : 'Calculating...'}
            </span>
          </div>
        </div>

        {/* Payment Info */}
        <div className="payment-info-card">
          <CreditCard size={24} className="info-icon" />
          <p className="payment-info-text">
            You will be redirected to Chargily secure payment page. Payment is processed securely via EDAHABIA or CIB.
          </p>
        </div>

        {/* Error Message */}
        {error && <div className="error-message">{error}</div>}

        {/* Confirm Button */}
        <button
          className={`confirm-button ${loading ? 'loading' : ''}`}
          onClick={handleConfirmPurchase}
          disabled={loading}
        >
          {loading ? 'Processing...' : 'Confirm Purchase'}
        </button>
      </div>
    </div>
  );
};

export default PurchaseTickets;

