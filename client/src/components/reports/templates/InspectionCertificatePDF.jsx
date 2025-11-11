// client/src/components/reports/templates/InspectionCertificatePDF.jsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { fontSize: 14, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  subheader: { textAlign: 'center', marginBottom: 20 },
  body: { fontSize: 10, lineHeight: 1.4, marginBottom: 10 },
  section: { marginBottom: 10 },
  title: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 },
  dataItem: { flexDirection: 'row', marginBottom: 3 },
  dataLabel: { width: '40%', fontWeight: 'bold' },
  dataValue: { width: '60%' },
  conclusion: { textAlign: 'center', fontSize: 12, fontWeight: 'bold', marginTop: 20, marginBottom: 20 },
  signature: { marginTop: 60, textAlign: 'center' },
  signatureTitle: { fontWeight: 'bold' },
  signatureName: { marginTop: 40, fontWeight: 'bold' },
});

const InspectionCertificatePDF = ({ project, inspectionReport, inspector, inspectionDate }) => {
  // --- Contoh logika untuk menentukan kesimpulan ---
  // Anda perlu menentukan `isCompliant` dan `complianceDetail` berdasarkan data `inspectionReport`
  // Contoh: dari `inspectionReport.compliance_status` atau dari kesimpulan di `technicalResponses`
  const isCompliant = inspectionReport?.compliance_status === 'compliant'; // Contoh field
  const complianceDetail = isCompliant ? 'seluruhnya' : 'sebagian'; // atau 'tidak laik'
  const buildingFunction = project.building_function || '-';
  const imbNumber = project.imb_number || '-';
  const location = project.location || '-';
  const clientVillage = project.client_village || '-';
  const clientDistrict = project.client_district || '-';
  const clientName = project.client_name || '-';

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>SURAT KETERANGAN</Text>
        <Text style={styles.header}>HASIL PEMERIKSAAN KELAIKAN BANGUNAN GEDUNG</Text>
        <Text style={styles.subheader}>NOMOR: ...</Text>
        <Text style={styles.subheader}>Lembaga/ OPD ...</Text>

        <Text style={styles.body}>
          Berdasarkan: Berita Acara hasil pemeriksaan kelaikan bangunan gedung,
        </Text>
        <Text style={styles.body}>
          Nomor: ... Tanggal: {inspectionDate || new Date().toLocaleDateString('id-ID')}
        </Text>

        <View style={styles.section}>
          <Text style={styles.title}>Menerangkan bahwa:</Text>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>- Fungsi Bangunan:</Text>
            <Text style={styles.dataValue}>{buildingFunction}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>- Nomor IMB:</Text>
            <Text style={styles.dataValue}>{imbNumber}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>- Pemilik Bangunan:</Text>
            <Text style={styles.dataValue}>{clientName}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}>- Lokasi Bangunan:</Text>
            <Text style={styles.dataValue}>{location}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}></Text>
            <Text style={styles.dataValue}>Desa/Kelurahan {clientVillage} Kecamatan {clientDistrict}</Text>
          </View>
          <View style={styles.dataItem}>
            <Text style={styles.dataLabel}></Text>
            <Text style={styles.dataValue}>Kabupaten PATI</Text>
          </View>
        </View>

        <Text style={styles.conclusion}>
          DINYATAKAN:
        </Text>
        <Text style={styles.conclusion}>
          {isCompliant ? 'LAIK FUNGSI' : 'TIDAK LAIK FUNGSI'}
        </Text>
        <Text style={styles.conclusion}>
          {complianceDetail}
        </Text>

        <Text style={{ marginTop: 20 }}>
          Surat Keterangan ini berlaku sampai dengan ... (....) tahun sejak diterbitkan.
        </Text>

        <Text style={styles.signature}>
          PATI, {inspectionDate || new Date().toLocaleDateString('id-ID')}
        </Text>
        <Text style={styles.signatureTitle}>
          KEPALA DINAS
        </Text>
        <Text style={styles.signatureName}>
          {inspector?.name || '...'} {/* Nama Kepala Dinas */}
        </Text>
      </Page>
    </Document>
  );
};

export default InspectionCertificatePDF;