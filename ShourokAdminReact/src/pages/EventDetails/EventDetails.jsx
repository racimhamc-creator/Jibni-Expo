import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Minus, Plus, CheckCircle2 } from 'lucide-react';
import { eventsAPI } from '../../services/api';
import './EventDetails.css';

const EventDetails = () => {
  const navigate = useNavigate();
  const { eventId } = useParams();
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedTicketType, setSelectedTicketType] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (eventId) {
      loadEvent();
    }
  }, [eventId]);

  const loadEvent = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await eventsAPI.getById(eventId);
      setEvent(response.data.event || response.data);
      
      // Auto-select first ticket type if available
      if (response.data.event?.ticketTypes?.length > 0) {
        setSelectedTicketType(response.data.event.ticketTypes[0].type);
      }
    } catch (err) {
      console.error('Error loading event:', err);
      setError(err.response?.data?.message || 'Failed to load event');
    } finally {
      setLoading(false);
    }
  };

  const handleBuyNow = () => {
    if (!selectedTicketType) {
      setError('Please select a ticket type');
      return;
    }

    if (!event) {
      return;
    }

    const selectedTypeData = event.ticketTypes.find((tt) => tt.type === selectedTicketType);
    const ticketPrice = selectedTypeData?.price || 0;

    navigate('/purchase-tickets', {
      state: {
        eventId: event._id,
        eventName: event.name,
        ticketType: selectedTicketType,
        quantity: quantity,
        ticketPrice: ticketPrice,
      },
    });
  };

  const formatDate = (dateString) => {
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

  const selectedType = event?.ticketTypes?.find((tt) => tt.type === selectedTicketType);
  const totalPrice = selectedType ? selectedType.price * quantity : 0;
  const maxQuantity = selectedType?.available || 1;

  if (loading) {
    return (
      <div className="event-details-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  if (error && !event) {
    return (
      <div className="event-details-container">
        <div className="event-details-error">
          <p>{error}</p>
          <button onClick={() => navigate('/home')} className="back-button">
            <ArrowLeft size={20} />
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  if (!event) {
    return null;
  }

  return (
    <div className="event-details-container">
      <div className="event-details-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      {/* Header */}
      <div className="event-details-header">
        <button onClick={() => navigate(-1)} className="back-button">
          <ArrowLeft size={24} />
        </button>
        <h2 className="event-details-header-title">Event Details</h2>
        <div className="placeholder"></div>
      </div>

      <div className="event-details-content">
        {/* Event Image */}
        <div className="event-image-container">
          <img
            src={event.image || 'https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400'}
            alt={event.name}
            className="event-image"
          />
        </div>

        {/* Event Info */}
        <div className="event-info-section">
          <h1 className="event-title">{event.name}</h1>

          {/* Date */}
          <div className="info-row">
            <Calendar size={20} className="info-icon" />
            <span className="info-text">{formatDate(event.date)}</span>
          </div>

          {/* Location */}
          <div className="info-row">
            <MapPin size={20} className="info-icon" />
            <span className="info-text">{event.location}</span>
          </div>

          {/* Description */}
          {event.description && (
            <div className="description-section">
              <h3 className="description-title">Description</h3>
              <p className="description-text">{event.description}</p>
            </div>
          )}

          {/* Ticket Types Selection */}
          <div className="ticket-section">
            <h3 className="section-title">Select Ticket Type</h3>
            {event.ticketTypes?.map((ticketType) => (
              <button
                key={ticketType.type}
                className={`ticket-type-card ${
                  selectedTicketType === ticketType.type ? 'selected' : ''
                }`}
                onClick={() => {
                  setSelectedTicketType(ticketType.type);
                  setQuantity(1);
                }}
              >
                <div className="ticket-type-info">
                  <h4 className="ticket-type-name">{ticketType.type}</h4>
                  <p className="ticket-type-price">{ticketType.price} DA</p>
                  <p className="ticket-type-available">
                    Available: {ticketType.available}
                  </p>
                </div>
                {selectedTicketType === ticketType.type && (
                  <CheckCircle2 size={24} className="check-icon" />
                )}
              </button>
            ))}
          </div>

          {/* Quantity Selection */}
          {selectedTicketType && (
            <div className="quantity-section">
              <h3 className="section-title">Select Quantity</h3>
              <div className="quantity-controls">
                <button
                  className="quantity-button"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                >
                  <Minus size={20} />
                </button>
                <span className="quantity-text">{quantity}</span>
                <button
                  className="quantity-button"
                  onClick={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
                  disabled={quantity >= maxQuantity}
                >
                  <Plus size={20} />
                </button>
              </div>
            </div>
          )}

          {/* Total Price */}
          {selectedTicketType && (
            <div className="total-section">
              <span className="total-label">Total</span>
              <span className="total-price">{totalPrice} DA</span>
            </div>
          )}

          {/* Error Message */}
          {error && <div className="error-message">{error}</div>}

          {/* Buy Now Button */}
          <button
            className={`buy-button ${!selectedTicketType ? 'disabled' : ''}`}
            onClick={handleBuyNow}
            disabled={!selectedTicketType}
          >
            Buy Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default EventDetails;

