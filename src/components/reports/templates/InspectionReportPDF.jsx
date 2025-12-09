// client/src/components/reports/templates/InspectionReportPDF.jsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  body: { fontSize: 10, lineHeight: 1.4 },
  section: { marginBottom: 15 },
  title: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  dataItem: { flexDirection: 'row', marginBottom: 3 },
  dataLabel: { width: '30%', fontWeight: 'bold' },
  dataValue: { width: '70%' },
  conclusionItem: { flexDirection: 'row', marginBottom: 3 },
  conclusionLabel: { width: '40%', fontWeight: 'bold' },
  conclusionValue: { width: '60%' },
});

const InspectionReportPDF = ({ project, adminResponses, technicalResponses, inspector, inspectionDate }) => {
  // --- Contoh logika untuk mengambil kesimpulan dari data ---
  // Anda perlu menyesuaikan ini dengan struktur `adminResponses` dan `technicalResponses` Anda.
  // Misalnya, `adminResponses` berasal dari `checklist_responses` dan `technicalResponses` dari `simak_responses`.

  // Contoh sederhana: Ambil kesimpulan dari kolom 'kesesuaian' di admin responses
  const adminConclusion = adminResponses?.reduce((acc, r) => {
    if (r.response?.kesesuaian) acc.push(r.response.kesesuaian);
    return acc;
  }, []).join(', ') || 'Tidak Ada Data';

  // Contoh sederhana: Ambil kesimpulan dari item 'Kesimpulan' di technical responses
  // Asumsi `technicalResponses` adalah array dari `{ item: {...}, response_value: {...} }`
  const techConclusions = technicalResponses?.filter(r => r.item.item_label === 'Kesimpulan').map(r => r.response_value) || [];
  const techConclusion = techConclusions.join(', ') || 'Tidak Ada Data';

  // Data bangunan
  const buildingName = project.name || '-';
  const buildingFunction = project.building_function || '-';
  const buildingArea = project.building_area ? `${project.building_area} m²` : '-';
  const floors = project.floors || '-';
  const buildingHeight = project.building_height ? `${project.building_height} m` : '-';
  const location = project.location || '-';
  const clientVillage = project.client_village || '-';
  const clientDistrict = project.client_district || '-';
  const imbNumber = project.imb_number || '-';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>BERITA ACARA PEMERIKSAAN KELAIKAN FUNGSI BANGUNAN</Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>Nomor: ...</Text>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>Tanggal: {inspectionDate || new Date().toLocaleDateString('id-ID')}</Text>

        <Text style={styles.body}>
          Pada hari ini, {new Date().toLocaleDateString('id-ID', { weekday: 'long' })}, tanggal {new Date().getDate()}, bulan {new Date().toLocaleDateString('id-ID', { month: 'long' })}, tahun {new Date().getFullYear()}, yang bertanda tangan di bawah ini, Nama Petugas: {inspector?.name || '...'} telah melaksanakan pemeriksaan kelaikan fungsi bangunan gedung pada
        </Text>

        <View style={styles.section}>
          <Text style={styles.title}>1. Bangunan Gedung</Text>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>a. Bangunan:</Text>
            <Text style={styles.dataValue}>{buildingName}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>b. Fungsi Bangunan:</Text>
            <Text style={styles.dataValue}>{buildingFunction}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>c. Luas Bangunan:</Text>
            <Text style={styles.dataValue}>{buildingArea}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>d. Jumlah Lantai:</Text>
            <Text style={styles.dataValue}>{floors}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>e. Tinggi Bangunan:</Text>
            <Text style={styles.dataValue}>{buildingHeight}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>f. Lokasi Bangunan:</Text>
            <Text style={styles.dataValue}>{location}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}></Text>
            <Text style={styles.dataValue}>: Desa/Kelurahan {clientVillage}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}></Text>
            <Text style={styles.dataValue}>Kecamatan {clientDistrict} Kabupaten Pati</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>IMB:</Text>
            <Text style={styles.dataValue}>Nomor: {imbNumber}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.title}>Dengan ini menyatakan bahwa</Text>
          <View style={styles.conclusionItem}>
            <Text style={styles.conclusionLabel}>1. Persyaratan administratif:</Text>
            <Text style={styles.conclusionValue}>{adminConclusion}</Text>
          </View>
          <View style={styles.conclusionItem}>
            <Text style={styles.conclusionLabel}>2. Persyaratan teknis:</Text>
            <Text style={styles.conclusionValue}>{techConclusion}</Text>
          </View>
          <Text style={{ marginTop: 10 }}>
            Sesuai dengan kesimpulan berdasarkan analisis terhadap Daftar Simak Pemeriksaan Kelaikan Fungsi Bangunan Gedung terlampir.
          </Text>
        </View>

        <Text style={{ marginTop: 20 }}>
          Berita Acara ini berlaku sepanjang tidak ada perubahan yang dilakukan pemilik/pengguna yang mengubah sistem dan/atau spesifikasi teknis, atau gangguan penyebab lainnya yang dibuktikan kemudian.
        </Text>
        <Text style={{ marginTop: 10 }}>
          Selanjutnya pemilik/pengguna bangunan gedung dapat mengurus permohonan Sertifikat Laik Fungsi bangunan gedung.
        </Text>

        <Text style={{ marginTop: 40, textAlign: 'right' }}>
          Pati, {inspectionDate || new Date().toLocaleDateString('id-ID')}
        </Text>
        <Text style={{ textAlign: 'right', marginTop: 40 }}>
          Petugas
        </Text>
        <Text style={{ textAlign: 'right' }}>
          ({inspector?.name || '...'})
        </Text>
      </Page>
    </Document>
  );
};

export default InspectionReportPDF;
