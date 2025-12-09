// FILE: components/GPSStatus.js
import React, { useState, useEffect } from 'react';

const GPSStatus = () => {
  const [gpsStatus, setGpsStatus] = useState('checking');
  const [lastLocation, setLastLocation] = useState(null);

  useEffect(() => {
    checkGPSStatus();
    const interval = setInterval(checkGPSStatus, 30000); // Check every 30 seconds
    
    return () => clearInterval(interval);
  }, []);

  const checkGPSStatus = async () => {
    try {
      const position = await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 30000
        });
      });

      setGpsStatus('available');
      setLastLocation({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
        accuracy: position.coords.accuracy
      });
    } catch (error) {
      setGpsStatus('unavailable');
      setLastLocation(null);
    }
  };

  const getStatusColor = () => {
    switch (gpsStatus) {
      case 'available': return '#10B981'; // green
      case 'unavailable': return '#EF4444'; // red
      default: return '#6B7280'; // gray
    }
  };

  const getStatusText = () => {
    switch (gpsStatus) {
      case 'available': return 'GPS Tersedia';
      case 'unavailable': return 'GPS Tidak Tersedia';
      default: return 'Memeriksa GPS...';
    }
  };

  return (
    <div className="gps-status" style={{ 
      padding: '8px 12px', 
      backgroundColor: getStatusColor() + '20',
      border: `1px solid ${getStatusColor()}`,
      borderRadius: '6px',
      fontSize: '12px',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    }}>
      <div style={{
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        backgroundColor: getStatusColor()
      }}></div>
      <span>{getStatusText()}</span>
      {lastLocation && (
        <span style={{ fontSize: '10px', opacity: 0.8 }}>
          Akurasi: {Math.round(lastLocation.accuracy)}m
        </span>
      )}
    </div>
  );
};

export default GPSStatus;
