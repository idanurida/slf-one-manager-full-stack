// FILE: src/components/MapComponent.js
"use client";

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: '/leaflet/images/marker-icon-2x.png',
  iconUrl: '/leaflet/images/marker-icon.png',
  shadowUrl: '/leaflet/images/marker-shadow.png',
});

// Component to update map view when coordinates change
const MapUpdater = ({ lat, lng }) => {
  const map = useMap();
  
  useEffect(() => {
    if (lat && lng) {
      map.setView([lat, lng], map.getZoom());
    }
  }, [lat, lng, map]);
  
  return null;
};

const MapComponent = ({ lat, lng, zoom = 15, popupText = null }) => {
  if (!lat || !lng) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-slate-100 dark:bg-slate-800">
        <p className="text-slate-500 dark:text-slate-400 text-sm">Lokasi tidak tersedia</p>
      </div>
    );
  }

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={zoom}
      style={{ height: '100%', width: '100%' }}
      scrollWheelZoom={false}
      zoomControl={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      />
      <Marker position={[lat, lng]}>
        <Popup>
          {popupText || (
            <>
              Lokasi foto diambil<br />
              {lat.toFixed(6)}, {lng.toFixed(6)}
            </>
          )}
        </Popup>
      </Marker>
      <MapUpdater lat={lat} lng={lng} />
    </MapContainer>
  );
};

export default MapComponent;
