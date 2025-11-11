// client/src/components/reports/templates/FinalReportPDF.jsx
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { textAlign: 'center', marginBottom: 20 },
  body: { fontSize: 10, lineHeight: 1.4 },
  section: { marginBottom: 15 },
  title: { fontSize: 12, fontWeight: 'bold', marginBottom: 6 }
});

const FinalReportPDF = ({ project, checklistResponses }) => {
  const isRenewal = project.request_type === 'renewal';
  const isSpecial = project.is_special_function;
  const isCompliant = project.compliance_status === 'compliant';
  const regionName = project.region?.name || project.region_name || 'Wilayah';
  const authorityTitle = project.region?.authority_title || project.authority_title || 'Bupati/Walikota';
  const departmentName = project.region?.department_name || project.department_name || 'Dinas Terkait';

  return (
    <Document>
      {/* Halaman 1: Formulir Permohonan */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>
          FORMULIR PERMOHONAN {isRenewal ? 'PERPANJANGAN ' : ''}SERTIFIKAT LAIK FUNGSI
        </Text>

        <Text style={styles.body}>
          Kepada Yth. {authorityTitle} {regionName} Cq. Kepala {departmentName} di {regionName}
        </Text>

        <View style={styles.section}>
          <Text>Yang bertanda tangan di bawah ini:</Text>
          <Text>a. Nama (orang/badan): {project.client_name || '...'}</Text>
          <Text>b. Alamat: {project.location || '...'}</Text>
        </View>

        <View style={styles.section}>
          <Text>Dengan ini kami mengajukan permohonan {isRenewal ? 'perpanjangan ' : ''}SLF untuk:</Text>
          <Text>a. Bangunan: {project.name}</Text>
          <Text>b. Fungsi Bangunan: {project.building_function}</Text>
          <Text>c. Jumlah Lantai: {project.floors}</Text>
          <Text>d. Nomor IMB: {project.imb_number || '...'}</Text>
          {isRenewal && (
            <Text>e. Nomor SLF Sebelumnya: {project.previous_slf_number || '...'}</Text>
          )}
        </View>

        <Text style={{ marginTop: 20, fontSize: 10 }}>
          Bersama ini kami lampirkan:
        </Text>
        <Text style={{ fontSize: 10 }}>1. Fotocopy KTP</Text>
        <Text style={{ fontSize: 10 }}>2. Fotocopy IMB dan lampirannya</Text>
        {isRenewal && <Text style={{ fontSize: 10 }}>3. Fotocopy SLF terakhir</Text>}
        <Text style={{ fontSize: 10 }}>{isRenewal ? '4' : '3'}. Surat Keterangan Hasil Pemeriksaan Kelaikan Bangunan Gedung</Text>
        {isSpecial && <Text style={{ fontSize: 10 }}>{isRenewal ? '5' : '4'}. Rekomendasi dari instansi teknis</Text>}
      </Page>

      {/* Halaman 2: Surat Keterangan Hasil Pemeriksaan */}
      <Page size="A4" style={styles.page}>
        <Text style={styles.header}>SURAT KETERANGAN HASIL PEMERIKSAAN KELAIKAN BANGUNAN GEDUNG</Text>
        <Text style={{ textAlign: 'center', marginTop: 10, fontSize: 12 }}>Nomor: ...</Text>

        <View style={styles.section}>
          <Text>Berdasarkan Berita Acara hasil pemeriksaan kelaikan bangunan gedung,</Text>
          <Text>Nomor: ... Tanggal: ...</Text>
        </View>

        <View style={styles.section}>
          <Text>- Fungsi Bangunan: {project.building_function}</Text>
          <Text>- Nomor IMB: {project.imb_number}</Text>
          <Text>- Pemilik Bangunan: {project.client_name}</Text>
          <Text>- Lokasi Bangunan: {project.location}, {regionName}</Text>
        </View>

        <Text style={{ marginTop: 20, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
          DINYATAKAN:
        </Text>
        <Text style={{
          fontSize: 14,
          fontWeight: 'bold',
          textAlign: 'center',
          color: isCompliant ? 'green' : 'red'
        }}>
          {isCompliant ? 'LAIK FUNGSI' : 'TIDAK LAIK FUNGSI'}
        </Text>
        <Text style={{ textAlign: 'center', fontSize: 11 }}>
          {isCompliant ? 'seluruhnya' : 'sebagian'}
        </Text>

        <Text style={{ marginTop: 30, textAlign: 'right' }}>
          {regionName}, {new Date().toLocaleDateString('id-ID')}
        </Text>
        <Text style={{ textAlign: 'right', marginTop: 40 }}>
          KEPALA {departmentName}
        </Text>
      </Page>
    </Document>
  );
};

export default FinalReportPDF;