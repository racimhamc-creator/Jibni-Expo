import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Calendar, MapPin, Ticket } from 'lucide-react';
import { eventsAPI } from '../../services/api';
import './EventsList.css';

const EventsList = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      // Get only active events for users (not admin endpoint)
      const response = await eventsAPI.getAll(false);
      const allEvents = response.data.events || response.data || [];
      // Filter only active events (backend should return only active, but filter as safety)
      const activeEvents = allEvents.filter(event => event.isActive !== false);
      setEvents(activeEvents);
    } catch (err) {
      console.error('Error loading events:', err);
      setError(err.response?.data?.message || 'Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'TBA';
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

  if (loading) {
    return (
      <div className="events-list-loading">
        <div className="loading-spinner"></div>
      </div>
    );
  }

  return (
    <div className="events-list-container">
      <div className="events-list-background">
        <div className="bg-orb bg-orb-1"></div>
        <div className="bg-orb bg-orb-2"></div>
        <div className="bg-orb bg-orb-3"></div>
      </div>

      {/* Header */}
      <div className="events-list-header">
        <button onClick={() => navigate('/home')} className="back-button">
          <ArrowLeft size={24} />
        </button>
        <h2 className="events-list-header-title">Upcoming Events</h2>
        <div className="placeholder"></div>
      </div>

      <div className="events-list-content">
        {error && <div className="error-message">{error}</div>}

        {events.length === 0 ? (
          <div className="no-events">
            <Ticket size={48} className="no-events-icon" />
            <p className="no-events-text">No upcoming events at the moment</p>
          </div>
        ) : (
          <div className="events-grid">
            {events.map((event) => (
              <div
                key={event._id}
                className="event-card"
                onClick={() => navigate(`/event/${event._id}`)}
              >
                <div className="event-card-image">
                  {event.image ? (
                    <img src={event.image} alt={event.name} />
                  ) : (
                    <div className="event-card-placeholder">
                      <Calendar size={32} />
                    </div>
                  )}
                </div>
                <div className="event-card-content">
                  <h3 className="event-card-title">{event.name}</h3>
                  <div className="event-card-info">
                    <div className="event-card-row">
                      <Calendar size={16} />
                      <span>{formatDate(event.date)}</span>
                    </div>
                    <div className="event-card-row">
                      <MapPin size={16} />
                      <span>{event.location || 'TBA'}</span>
                    </div>
                  </div>
                  {event.ticketTypes?.length > 0 && (
                    <div className="event-card-tickets">
                      <Ticket size={16} />
                      <span>
                        From {Math.min(...event.ticketTypes.map(t => t.price))} DA
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventsList;

