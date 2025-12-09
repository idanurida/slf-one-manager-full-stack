// src/utils/generateChecklistItems.js

import checklistData from '../../json.txt'; 

const mapTemplateToSpecialization = (title, category) => {
  // Jika kategori administrative → pasti dokumen
  if (category === 'administrative') return 'dokumen';

  // Mapping berdasarkan judul template
  if (title.includes('Sistem Struktur')) return 'struktur';
  if (title.includes('Proteksi Kebakaran')) return 'kebakaran';
  if (title.includes('Sistem Proteksi Kebakaran Pasif')) return 'kebakaran';
  if (title.includes('Sistem Lift')) return 'mekanikal';
  if (title.includes('Sistem Proteksi dan Pencegahan Bahaya Petir')) return 'elektrikal';
  if (title.includes('Sistem Proteksi dan Pencegahan Bahaya Gempa Bumi')) return 'struktur';
  if (title.includes('Kualitas Udara Dalam')) return 'tata_udara';
  if (title.includes('Kebisingan')) return 'akustik';
  if (title.includes('Getaran')) return 'struktur';
  if (title.includes('Pencahayaan Buatan')) return 'elektrikal';
  if (title.includes('Sistem Tata Udara')) return 'tata_udara';
  if (title.includes('Sistem Air Minum dan Air Bersih')) return 'lingkungan';
  if (title.includes('Penggunaan Bahan Bangunan')) return 'material';
  if (title.includes('Sistem Gas Medik')) return 'mekanikal';
  if (title.includes('Ruang Gerak Dalam')) return 'arsitektur';
  if (title.includes('Ruang Gerak Luar')) return 'arsitektur';
  if (title.includes('Kenyamanan Termal')) return 'tata_udara';
  if (title.includes('Kenyamanan Visual')) return 'elektrikal';
  if (title.includes('Kenyamanan Akustik')) return 'akustik';
  if (title.includes('Aksesibilitas')) return 'arsitektur';
  if (title.includes('Sistem Tata Air Kotor')) return 'lingkungan';
  if (title.includes('Kelengkapan Prasarana dan Sarana')) return 'arsitektur';

  // Tata Bangunan → umumnya arsitektur
  if (category === 'tata_bangunan') return 'arsitektur';

  // Keandalan → bisa bervariasi, fallback ke keandalan
  if (category === 'keandalan') return 'keandalan';

  return 'umum';
};

export const generateChecklistItems = () => {
  const items = [];
  checklistData.checklist_templates.forEach(template => {
    const specialization = mapTemplateToSpecialization(template.title, template.category);
    if (template.subsections) {
      template.subsections.forEach(sub => {
        sub.items.forEach(item => {
          items.push({
            ...item,
            category: template.category,
            specialization,
            template_id: template.id,
            template_title: template.title,
          });
        });
      });
    } else if (template.items) {
      template.items.forEach(item => {
        items.push({
          ...item,
          category: template.category,
          specialization,
          template_id: template.id,
          template_title: template.title,
        });
      });
    }
  });
  return items;
};
