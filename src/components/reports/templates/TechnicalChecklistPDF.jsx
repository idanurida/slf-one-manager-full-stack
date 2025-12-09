// client/src/components/reports/templates/TechnicalChecklistPDF.jsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 30, fontFamily: 'Helvetica', fontSize: 9 },
  header: { fontSize: 12, fontWeight: 'bold', textAlign: 'center', marginBottom: 10 },
  subheader: { textAlign: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 11, fontWeight: 'bold', marginTop: 12, marginBottom: 6 },
  item: { marginBottom: 4, flexDirection: 'row' },
  itemLabel: { width: '30%', fontWeight: 'bold' },
  itemValue: { width: '70%' },
  footer: { marginTop: 20, textAlign: 'right', fontSize: 10 },
  dataUmum: { marginBottom: 15 },
  dataUmumItem: { flexDirection: 'row', marginBottom: 2 },
  dataUmumLabel: { width: '35%', fontWeight: 'bold' },
  dataUmumValue: { width: '65%' },
});

// Mapping section_code ke nama lengkap
const SECTION_NAMES = {
  A: 'Penutup Atap',
  B: 'List Plang',
  C: 'Talang',
  D: 'Kerangka Atap',
  E: 'Langit-langit / Plafon',
  F: 'Dinding Luar',
  G: 'Dinding Dalam / Partisi',
  H: 'Pintu dan Jendela',
  I: 'Tangga',
  J: 'Lantai',
  K: 'Kolom dan Balok',
  L: 'Plat',
  M: 'Pondasi',
  N: 'Unit Penghantar Udara (AHU/AC)',
  O: 'Pompa (Sumur)',
  P: 'Pipa Air',
  Q: 'Pipa Air Kotor',
  R: 'Sistem Instalasi Listrik / Penerangan',
  S: 'RTH Privat',
  T: 'IPAL / Septic Tank',
};

const TechnicalChecklistPDF = ({ project, responses, inspector, inspectionDate }) => {
  // Kelompokkan respons berdasarkan section_code
  const grouped = responses.reduce((acc, resp) => {
    // Asumsi `resp.item` adalah objek dari `simak_items`
    const item = resp.item;
    const sectionCode = item.section_code;
    if (!acc[sectionCode]) acc[sectionCode] = [];
    acc[sectionCode].push(resp);
    return acc;
  }, {});

  // Ambil data umum dari project
  const buildingFunction = project.building_function || '-';
  const imbNumber = project.imb_number || '-';
  const location = project.location || '-';
  const clientVillage = project.client_village || '-';
  const clientDistrict = project.client_district || '-';
  const landArea = project.land_area ? `${project.land_area} m²` : '-';
  const buildingArea = project.building_area ? `${project.building_area} m²` : '-';
  const floors = project.floors || '-';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>DAFTAR SIMAK KELAIKAN FUNGSI BANGUNAN GEDUNG</Text>
        <Text style={styles.subheader}>Diperiksa oleh OPD yang membidangi</Text>
        <Text style={styles.subheader}>Tanggal: {inspectionDate || new Date().toLocaleDateString('id-ID')}</Text>
        <Text style={styles.subheader}>Nomor: ...</Text>

        <View style={styles.dataUmum}>
          <Text style={styles.sectionTitle}>DATA UMUM BANGUNAN</Text>
          <View style={styles.dataUmumItem}>
            <Text style={styles.dataUmumLabel}>1. Fungsi Bangunan:</Text>
            <Text style={styles.dataUmumValue}>{buildingFunction}</Text>
          </View>
          <View style={styles.dataUmumItem}>
            <Text style={styles.dataUmumLabel}>2. Nomor IMB:</Text>
            <Text style={styles.dataUmumValue}>{imbNumber}</Text>
          </View>
          <View style={styles.dataUmumItem}>
            <Text style={styles.dataUmumLabel}>3. Alamat:</Text>
            <Text style={styles.dataUmumValue}>{location}</Text>
          </View>
          <View style={styles.dataUmumItem}>
            <Text style={styles.dataUmumLabel}></Text>
            <Text style={styles.dataUmumValue}>Kelurahan {clientVillage} Kecamatan {clientDistrict} Kota PATI</Text>
          </View>
          <View style={styles.dataUmumItem}>
            <Text style={styles.dataUmumLabel}>4. Luas tanah:</Text>
            <Text style={styles.dataUmumValue}>{landArea} Luas bangunan: {buildingArea}</Text>
          </View>
          <View style={styles.dataUmumItem}>
            <Text style={styles.dataUmumLabel}>5. Tipe konstruksi:</Text>
            <Text style={styles.dataUmumValue}>beton</Text>
          </View>
          <View style={styles.dataUmumItem}>
            <Text style={styles.dataUmumLabel}>6. Jumlah lantai:</Text>
            <Text style={styles.dataUmumValue}>{floors}</Text>
          </View>
          {/* Tambahkan field lain sesuai LAMP jika diperlukan */}
        </View>

        {/* Render setiap bagian */}
        {Object.keys(grouped)
          .sort() // Urutkan A-Z
          .map((sectionCode) => (
            <View key={sectionCode} style={{ breakInside: 'avoid' }}>
              <Text style={styles.sectionTitle}>
                {sectionCode}. DAFTAR SIMAK {SECTION_NAMES[sectionCode] || sectionCode}
              </Text>
              {grouped[sectionCode].map((resp) => {
                const item = resp.item;
                // Ambil nilai respons dari objek JSONB
                const value = resp.response_value;
                return (
                  <View key={resp.id} style={styles.item}>
                    <Text style={styles.itemLabel}>
                      {item.item_number}. {item.item_label}:
                    </Text>
                    <Text style={styles.itemValue}>
                      {/* Tampilkan nilai respons */}
                      {typeof value === 'object' ? JSON.stringify(value) : value?.toString() || '-'}
                    </Text>
                  </View>
                );
              })}
              {/* Tanda tangan Pemeriksa di akhir setiap bagian */}
              <Text style={styles.footer}>
                Pemeriksa: {inspector?.name || '...'} (tanda tangan) Tanggal: {inspectionDate || new Date().toLocaleDateString('id-ID')}
              </Text>
            </View>
          ))}
      </Page>
    </Document>
  );
};

export default TechnicalChecklistPDF;
