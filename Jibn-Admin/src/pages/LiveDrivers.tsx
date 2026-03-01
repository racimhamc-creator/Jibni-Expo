import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import { RefreshCw, Car, User, Phone, Navigation, Loader2, MapPin, Clock } from 'lucide-react';
import { adminAPI, OnlineDriver } from '../services/api';
import 'leaflet/dist/leaflet.css';
import './LiveDrivers.css';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

const createDriverIcon = (isBusy: boolean) => {
  return L.divIcon({
    className: 'custom-driver-marker',
    html: `
      <div class="driver-marker ${isBusy ? 'busy' : 'available'}">
        <div class="driver-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.3c-.5-.-2.24-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
            <circle cx="7" cy="17" r="2"/>
            <circle cx="17" cy="17" r="2"/>
          </svg>
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
    popupAnchor: [0, -20],
  });
};

const ALGERIA_CENTER: [number, number] = [28.0339, 1.6596];

const LiveDrivers: React.FC = () => {
  const [drivers, setDrivers] = useState<OnlineDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<OnlineDriver | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const mapRef = useRef<any>(null);
  const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchDrivers = async () => {
    try {
      const data = await adminAPI.getOnlineDrivers();
      setDrivers(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError('Failed to fetch driver locations');
      console.error('Error fetching drivers:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDrivers();
    
    refreshIntervalRef.current = setInterval(fetchDrivers, 5000);
    
    return () => {
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current);
      }
    };
  }, []);

  const formatTimestamp = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    return date.toLocaleTimeString();
  };

  const availableDrivers = drivers.filter(d => !d.isBusy);
  const busyDrivers = drivers.filter(d => d.isBusy);

  if (loading && drivers.length === 0) {
    return (
      <div className="live-drivers-container">
        <div className="loading-container">
          <Loader2 className="spinner" size={48} />
          <p>Loading driver locations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="live-drivers-container">
      <div className="live-drivers-header">
        <div className="stats-row">
          <div className="stat-card total">
            <Car size={24} />
            <div className="stat-info">
              <span className="stat-value">{drivers.length}</span>
              <span className="stat-label">Total Online</span>
            </div>
          </div>
          <div className="stat-card available">
            <Navigation size={24} />
            <div className="stat-info">
              <span className="stat-value">{availableDrivers.length}</span>
              <span className="stat-label">Available</span>
            </div>
          </div>
          <div className="stat-card busy">
            <User size={24} />
            <div className="stat-info">
              <span className="stat-value">{busyDrivers.length}</span>
              <span className="stat-label">On Trip</span>
            </div>
          </div>
          <button className="refresh-btn" onClick={fetchDrivers}>
            <RefreshCw size={18} />
            Refresh
          </button>
        </div>
        {lastUpdated && (
          <div className="last-updated">
            <Clock size={14} />
            Last updated: {lastUpdated.toLocaleTimeString()}
          </div>
        )}
      </div>

      {error && (
        <div className="error-banner">
          {error}
          <button onClick={fetchDrivers}>Retry</button>
        </div>
      )}

      <div className="map-wrapper">
        <MapContainer
          center={ALGERIA_CENTER}
          zoom={6}
          className="drivers-map"
          ref={mapRef}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          {drivers.map((driver) => (
            <Marker
              key={driver.driverId}
              position={[driver.location.lat, driver.location.lng]}
              icon={createDriverIcon(driver.isBusy)}
              eventHandlers={{
                click: () => setSelectedDriver(driver),
              }}
            >
              <Popup>
                <div className="driver-popup">
                  <h4>{driver.name}</h4>
                  <p><Phone size={12} /> {driver.phoneNumber}</p>
                  <p className={`status ${driver.isBusy ? 'busy' : 'available'}`}>
                    {driver.isBusy ? 'On Trip' : 'Available'}
                  </p>
                  <p className="vehicle">{driver.vehicleType}</p>
                  <p className="timestamp">
                    <Clock size={10} /> {formatTimestamp(driver.location.timestamp)}
                  </p>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {drivers.length === 0 && !loading && (
          <div className="no-drivers-overlay">
            <MapPin size={48} />
            <h3>No Drivers Online</h3>
            <p>There are currently no drivers online. Check back later.</p>
          </div>
        )}
      </div>

      {selectedDriver && (
        <div className="driver-details-panel">
          <div className="panel-header">
            <h3>Driver Details</h3>
            <button className="close-btn" onClick={() => setSelectedDriver(null)}>×</button>
          </div>
          <div className="panel-content">
            <div className="detail-row">
              <User size={18} />
              <div>
                <label>Name</label>
                <span>{selectedDriver.name}</span>
              </div>
            </div>
            <div className="detail-row">
              <Phone size={18} />
              <div>
                <label>Phone</label>
                <span>{selectedDriver.phoneNumber}</span>
              </div>
            </div>
            <div className="detail-row">
              <Car size={18} />
              <div>
                <label>Vehicle Type</label>
                <span>{selectedDriver.vehicleType}</span>
              </div>
            </div>
            <div className="detail-row">
              <MapPin size={18} />
              <div>
                <label>Current Location</label>
                <span>
                  {selectedDriver.location.lat.toFixed(6)}, {selectedDriver.location.lng.toFixed(6)}
                </span>
              </div>
            </div>
            <div className="detail-row">
              <Clock size={18} />
              <div>
                <label>Last Update</label>
                <span>{formatTimestamp(selectedDriver.location.timestamp)}</span>
              </div>
            </div>
            <div className={`status-badge ${selectedDriver.isBusy ? 'busy' : 'available'}`}>
              {selectedDriver.isBusy ? 'On Trip' : 'Available'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveDrivers;
