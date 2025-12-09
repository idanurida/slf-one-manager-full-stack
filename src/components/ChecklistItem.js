// FILE: components/ChecklistItem.js
import React from 'react';
import { CameraService } from '../services/cameraService';
import { itemRequiresPhotogeotag } from '../utils/checklistTemplates';

const ChecklistItem = ({ item, templateId, onPhotoCapture }) => {
  const requiresPhotoGeotag = itemRequiresPhotogeotag(templateId, item.id);

  const handleAddPhoto = async () => {
    try {
      const photoData = await CameraService.capturePhotoWithGeotag(templateId, item.id);
      
      onPhotoCapture({
        itemId: item.id,
        templateId: templateId,
        photoData: photoData,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error('Photo capture failed:', error);
      // Show error message to user
    }
  };

  return (
    <div className="checklist-item">
      <div className="item-header">
        <h4>{item.item_name}</h4>
        {requiresPhotoGeotag && (
          <button 
            className="btn-photo-capture"
            onClick={handleAddPhoto}
            title="Ambil foto dengan lokasi"
          >
            📷 Ambil Foto
          </button>
        )}
      </div>
      
      {/* Render item columns */}
      <div className="item-columns">
        {item.columns.map(column => (
          <div key={column.name} className="column">
            <label>{column.name}</label>
            {/* Render appropriate input based on column.type */}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChecklistItem;
