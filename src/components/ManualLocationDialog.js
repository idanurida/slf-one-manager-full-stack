// FILE: components/ManualLocationDialog.js
import React, { useState } from 'react';

const ManualLocationDialog = ({ isOpen, onConfirm, onCancel }) => {
  const [locationDescription, setLocationDescription] = useState('');
  const [selectedVerification, setSelectedVerification] = useState('');

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!locationDescription.trim()) {
      alert('Deskripsi lokasi wajib diisi');
      return;
    }

    onConfirm({
      description: locationDescription,
      verificationMethod: selectedVerification,
      timestamp: new Date().toISOString(),
      method: 'manual'
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Input Lokasi Manual</h3>
        <p>GPS tidak tersedia. Silakan deskripsikan lokasi pengambilan foto.</p>
        
        <div className="form-group">
          <label>Deskripsi Lokasi *</label>
          <textarea
            value={locationDescription}
            onChange={(e) => setLocationDescription(e.target.value)}
            placeholder="Contoh: Ruang server lantai 3, sebelah tangga darurat..."
            rows={3}
          />
        </div>

        <div className="form-group">
          <label>Metode Verifikasi</label>
          <select 
            value={selectedVerification} 
            onChange={(e) => setSelectedVerification(e.target.value)}
          >
            <option value="">Pilih metode verifikasi</option>
            <option value="witness_signature">Tanda tangan saksi</option>
            <option value="timestamp_verification">Verifikasi timestamp</option>
            <option value="site_sketch">Sketsa lokasi</option>
          </select>
        </div>

        <div className="modal-actions">
          <button onClick={onCancel} className="btn-secondary">
            Batal
          </button>
          <button onClick={handleSubmit} className="btn-primary">
            Konfirmasi
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManualLocationDialog;
