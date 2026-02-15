import { useState, useEffect } from 'react';
import { Plus, Eye, Edit2, Trash2, MapPin, Calendar as CalendarIcon, Clock } from 'lucide-react';
import DataTable from '../../components/Shared/DataTable';
import { eventsAPI } from '../../services/api';
import './Events.css';

const Events = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: '',
    date: '',
    time: '',
    location: '',
    image: '',
    description: '',
    isActive: true,
    ticketTypes: [
      { type: 'VIP', price: 1000, available: 50 },
      { type: 'Premium', price: 3500, available: 100 },
      { type: 'Standard', price: 1500, available: 200 },
    ],
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await eventsAPI.getAll(true); // true = admin mode
      setEvents(response.data.events || response.data || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (eventId) => {
    if (window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      try {
        const response = await eventsAPI.delete(eventId);
        if (response.data?.success) {
          alert('Event deleted successfully');
          fetchEvents();
        } else {
          alert(response.data?.message || 'Failed to delete event');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        alert(error?.response?.data?.message || 'Error deleting event. Please try again.');
      }
    }
  };

  const openCreate = () => {
    setEditingEvent(null);
    setForm({
      name: '',
      date: '',
      time: '',
      location: '',
      image: '',
      description: '',
      isActive: true,
      ticketTypes: [
        { type: 'VIP', price: 1000, available: 50 },
        { type: 'Premium', price: 3500, available: 100 },
        { type: 'Standard', price: 1500, available: 200 },
      ],
    });
    setShowForm(true);
  };

  const openEdit = (evt) => {
    setEditingEvent(evt);
    const d = evt?.date ? new Date(evt.date) : null;
    const date = d ? d.toISOString().slice(0, 10) : '';
    const time = d ? d.toTimeString().slice(0, 5) : '';
    setForm({
      name: evt?.name || '',
      date,
      time,
      location: evt?.location || '',
      image: evt?.image || '',
      description: evt?.description || '',
      isActive: evt?.isActive !== false,
      ticketTypes: Array.isArray(evt?.ticketTypes) && evt.ticketTypes.length
        ? evt.ticketTypes.map((t) => ({
            type: t.type || 'Standard',
            price: Number(t.price || 0),
            available: Number(t.available || 0),
          }))
        : [{ type: 'Standard', price: 0, available: 0 }],
    });
    setShowForm(true);
  };

  const setTicket = (idx, patch) => {
    setForm((prev) => {
      const next = { ...prev };
      next.ticketTypes = prev.ticketTypes.map((t, i) => (i === idx ? { ...t, ...patch } : t));
      return next;
    });
  };

  const addTicket = () => {
    setForm((prev) => ({ ...prev, ticketTypes: [...prev.ticketTypes, { type: 'Standard', price: 0, available: 0 }] }));
  };

  const removeTicket = (idx) => {
    setForm((prev) => ({ ...prev, ticketTypes: prev.ticketTypes.filter((_, i) => i !== idx) }));
  };

  const submitForm = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.date || !form.location.trim()) {
      alert('Please fill: name, date, location');
      return;
    }

    try {
      setSaving(true);
      const dateTimeIso = new Date(`${form.date}T${form.time || '20:00'}:00`).toISOString();
      const payload = {
        name: form.name.trim(),
        date: dateTimeIso,
        location: form.location.trim(),
        image: form.image.trim() || null,
        description: form.description || '',
        isActive: !!form.isActive,
        ticketTypes: (form.ticketTypes || [])
          .filter((t) => t.type && t.price !== '' && t.price !== null)
          .map((t) => ({
            type: t.type,
            price: Number(t.price || 0),
            available: Number(t.available || 0),
          })),
      };

      if (editingEvent?._id) {
        await eventsAPI.update(editingEvent._id, payload);
      } else {
        await eventsAPI.create(payload);
      }

      setShowForm(false);
      fetchEvents();
    } catch (error) {
      console.error('Error saving event:', error);
      alert(error?.response?.data?.message || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'active') return event.isActive;
    if (filter === 'inactive') return !event.isActive;
    return true;
  });

  const columns = [
    {
      header: 'Event',
      render: (row) => (
        <div className="event-cell">
          <div className="event-thumb">
            {row.image ? (
              <img src={row.image} alt={row.name} />
            ) : (
              <CalendarIcon size={20} />
            )}
          </div>
          <div className="event-details">
            <span className="event-name">{row.name}</span>
            <span className="event-desc">{row.description?.slice(0, 50)}{row.description?.length > 50 ? '...' : ''}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Date & Time',
      render: (row) => (
        <div className="datetime-cell">
          <div className="datetime-row">
            <CalendarIcon size={14} />
            <span>{row.date ? new Date(row.date).toLocaleDateString() : 'TBA'}</span>
          </div>
          <div className="datetime-row">
            <Clock size={14} />
            <span>{row.date ? new Date(row.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}</span>
          </div>
        </div>
      )
    },
    {
      header: 'Location',
      render: (row) => (
        <div className="location-cell">
          <MapPin size={14} />
          <span>{row.location || 'TBA'}</span>
        </div>
      )
    },
    {
      header: 'Tickets',
      render: (row) => (
        <div className="tickets-cell">
          {row.ticketTypes?.map((ticket, index) => (
            <span key={index} className={`ticket-badge ticket-${ticket.type?.toLowerCase()}`}>
              {ticket.type}: {ticket.price} DA
            </span>
          )) || <span className="no-tickets">No tickets</span>}
        </div>
      )
    },
    {
      header: 'Status',
      width: '100px',
      render: (row) => (
        <span className={`status-badge status-badge--${row.isActive ? 'active' : 'inactive'}`}>
          {row.isActive ? 'Active' : 'Inactive'}
        </span>
      )
    },
    {
      header: 'Actions',
      width: '120px',
      render: (row) => (
        <div className="actions-cell">
          <button 
            className="action-btn"
            onClick={() => setSelectedEvent(row)}
            title="View"
          >
            <Eye size={16} />
          </button>
          <button className="action-btn" title="Edit" onClick={() => openEdit(row)}>
            <Edit2 size={16} />
          </button>
          <button 
            className="action-btn action-btn--danger"
            onClick={() => handleDelete(row._id)}
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="events-page">
      <div className="page-header">
        <div className="header-info">
          <h2>Events Management</h2>
          <p>Create and manage your events</p>
        </div>
        <button className="primary-btn" onClick={openCreate}>
          <Plus size={18} />
          <span>Add Event</span>
        </button>
      </div>

      <div className="filter-bar">
        <div className="filter-tabs">
          <button 
            className={`filter-tab ${filter === 'all' ? 'active' : ''}`}
            onClick={() => setFilter('all')}
          >
            All Events ({events.length})
          </button>
          <button 
            className={`filter-tab ${filter === 'active' ? 'active' : ''}`}
            onClick={() => setFilter('active')}
          >
            Active ({events.filter(e => e.isActive).length})
          </button>
          <button 
            className={`filter-tab ${filter === 'inactive' ? 'active' : ''}`}
            onClick={() => setFilter('inactive')}
          >
            Inactive ({events.filter(e => !e.isActive).length})
          </button>
        </div>
        <div className="filter-search">
          <input type="text" placeholder="Search events..." />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredEvents}
        loading={loading}
        emptyMessage="No events found. Create your first event!"
      />

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="modal-overlay" onClick={() => !saving && setShowForm(false)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEvent ? 'Edit Event' : 'Add Event'}</h3>
              <button className="close-btn" onClick={() => !saving && setShowForm(false)}>×</button>
            </div>
            <div className="modal-body">
              <form className="form-grid" onSubmit={submitForm}>
                <div className="form-row">
                  <label>Name *</label>
                  <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Date *</label>
                  <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Time</label>
                  <input type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Location *</label>
                  <input value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Image URL</label>
                  <input value={form.image} onChange={(e) => setForm({ ...form, image: e.target.value })} />
                </div>
                <div className="form-row">
                  <label>Status</label>
                  <select value={form.isActive ? 'active' : 'inactive'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'active' })}>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div className="form-row form-row--full">
                  <label>Description</label>
                  <textarea rows="4" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="form-row form-row--full">
                  <div className="tickets-editor-header">
                    <label>Ticket Types</label>
                    <button type="button" className="secondary-btn" onClick={addTicket}>Add ticket</button>
                  </div>
                  <div className="tickets-editor">
                    {form.ticketTypes.map((t, idx) => (
                      <div key={idx} className="ticket-edit-row">
                        <input
                          placeholder="Type (VIP/Premium/Standard)"
                          value={t.type}
                          onChange={(e) => setTicket(idx, { type: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Price"
                          value={t.price}
                          onChange={(e) => setTicket(idx, { price: e.target.value })}
                        />
                        <input
                          type="number"
                          placeholder="Available"
                          value={t.available}
                          onChange={(e) => setTicket(idx, { available: e.target.value })}
                        />
                        <button type="button" className="action-btn action-btn--danger" onClick={() => removeTicket(idx)} title="Remove">×</button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="form-actions">
                  <button type="button" className="secondary-btn" onClick={() => !saving && setShowForm(false)} disabled={saving}>
                    Cancel
                  </button>
                  <button type="submit" className="primary-btn" disabled={saving}>
                    {saving ? 'Saving...' : (editingEvent ? 'Save changes' : 'Create event')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="modal-overlay" onClick={() => setSelectedEvent(null)}>
          <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Event Details</h3>
              <button className="close-btn" onClick={() => setSelectedEvent(null)}>×</button>
            </div>
            <div className="modal-body">
              <div className="event-banner">
                {selectedEvent.image ? (
                  <img src={selectedEvent.image} alt={selectedEvent.name} />
                ) : (
                  <div className="banner-placeholder">
                    <CalendarIcon size={48} />
                  </div>
                )}
              </div>
              <h4 className="event-title">{selectedEvent.name}</h4>
              <p className="event-description">{selectedEvent.description}</p>
              
              <div className="event-meta">
                <div className="meta-item">
                  <CalendarIcon size={18} />
                  <span>{selectedEvent.date ? new Date(selectedEvent.date).toLocaleDateString() : 'TBA'}</span>
                </div>
                <div className="meta-item">
                  <Clock size={18} />
                  <span>{selectedEvent.date ? new Date(selectedEvent.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'TBA'}</span>
                </div>
                <div className="meta-item">
                  <MapPin size={18} />
                  <span>{selectedEvent.location || 'TBA'}</span>
                </div>
              </div>

              {selectedEvent.ticketTypes?.length > 0 && (
                <div className="ticket-types">
                  <h5>Ticket Types</h5>
                  <div className="ticket-grid">
                    {selectedEvent.ticketTypes.map((ticket, index) => (
                      <div key={index} className="ticket-card">
                        <span className="ticket-type">{ticket.type}</span>
                        <span className="ticket-price">${ticket.price}</span>
                        <span className="ticket-available">{ticket.available} available</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Events;
