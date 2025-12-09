// src/hooks/useGeolocation.js
import { useState, useEffect } from 'react';

const useGeolocation = () => {
  const [location, setLocation] = useState({
    latitude: null,
    longitude: null,
    error: null,
    timestamp: null
  });

  useEffect(() => {
    if (!navigator.geolocation) {
      setLocation(prev => ({ ...prev, error: 'Geolocation is not supported by your browser' }));
      return;
    }

    const handleSuccess = (position) => {
      setLocation({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        error: null,
        timestamp: new Date(position.timestamp).toISOString()
      });
    };

    const handleError = (error) => {
      setLocation(prev => ({ ...prev, error: error.message }));
    };

    // Opsi untuk mendapatkan posisi yang lebih akurat
    const options = {
      enableHighAccuracy: true,
      timeout: 10000, // 10 detik
      maximumAge: 300000 // 5 menit
    };

    navigator.geolocation.getCurrentPosition(handleSuccess, handleError, options);
  }, []);

  return location;
};

export default useGeolocation;
