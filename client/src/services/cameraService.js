// FILE: services/cameraService.js
import { getChecklistPhotoRequirements } from '../utils/checklistTemplates';

export class CameraService {
  static async capturePhotoWithGeotag(checklistId, itemId) {
    const photoRequirements = getChecklistPhotoRequirements(checklistId, itemId);
    
    try {
      // Attempt to get GPS location with timeout
      const location = await this.getCurrentPositionWithTimeout(30000);
      
      if (location && this.isLocationAccurate(location)) {
        return await this.capturePhotoWithLocation(location);
      } else {
        // Fallback to manual location if GPS not available or inaccurate
        return await this.capturePhotoWithManualLocation(photoRequirements);
      }
    } catch (error) {
      console.warn('GPS acquisition failed:', error);
      return await this.capturePhotoWithManualLocation(photoRequirements);
    }
  }

  static async getCurrentPositionWithTimeout(timeout = 30000) {
    return new Promise((resolve, reject) => {
      const options = {
        enableHighAccuracy: true,
        timeout: timeout,
        maximumAge: 60000
      };

      const timeoutId = setTimeout(() => {
        reject(new Error('GPS_TIMEOUT'));
      }, timeout);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString()
          });
        },
        (error) => {
          clearTimeout(timeoutId);
          reject(error);
        },
        options
      );
    });
  }

  static isLocationAccurate(location) {
    return location.accuracy <= 50; // meters
  }

  static async capturePhotoWithLocation(location) {
    // Implementation using device camera API
    const imageData = await this.captureImageFromCamera();
    
    return {
      ...imageData,
      geotag: location,
      hasGeotag: true,
      verification: 'gps_automatic'
    };
  }

  static async capturePhotoWithManualLocation(photoRequirements) {
    // Show manual location input dialog
    const manualLocation = await this.showManualLocationDialog();
    
    const imageData = await this.captureImageFromCamera();
    
    return {
      ...imageData,
      geotag: manualLocation,
      hasGeotag: true,
      verification: 'manual_input',
      requiresReview: true,
      manualLocationDescription: manualLocation.description
    };
  }

  static async showManualLocationDialog() {
    // Implementation using your UI framework
    return new Promise((resolve) => {
      // Show modal/dialog for manual location input
      const locationData = {
        latitude: null,
        longitude: null,
        description: '',
        timestamp: new Date().toISOString(),
        accuracy: null,
        method: 'manual'
      };
      
      // Resolve with manual location data
      resolve(locationData);
    });
  }

  static async captureImageFromCamera() {
    // Implementation using device camera
    // This will vary based on your framework (React Native, Capacitor, etc.)
    return {
      uri: 'path/to/captured/image.jpg',
      width: 1920,
      height: 1080,
      size: 1024000,
      timestamp: new Date().toISOString()
    };
  }
}