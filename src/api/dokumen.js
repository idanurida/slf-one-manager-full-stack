// FILE: src/api/dokumen.js
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Konfigurasi upload file
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const projectId = req.body.project_id;
    const uploadPath = path.join(__dirname, '../uploads', projectId);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
  fileFilter: (req, file, cb) => {
    const allowedFormats = ['.pdf', '.jpg', '.jpeg', '.png', '.dwg', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedFormats.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Format file tidak didukung'));
    }
  }
});

// Endpoint: Upload dokumen oleh client
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { dokumen_id, project_id, user_id } = req.body;
    
    // Simpan informasi dokumen ke database
    const dokumen = await prisma.dokumen_project.create({
      data: {
        project_id,
        dokumen_id,
        nama_file: req.file.filename,
        path_file: req.file.path,
        ukuran_file: req.file.size,
        status: 'terupload',
        diupload_oleh: user_id,
        tanggal_upload: new Date(),
        jenis_dokumen: req.body.jenis_dokumen,
        versi: 1
      }
    });

    // Update progress project
    await updateProjectProgress(project_id);

    // Kirim notifikasi ke admin team
    await sendNotificationToAdminTeam(project_id, 'dokumen_baru', {
      dokumen_id,
      nama_dokumen: req.body.nama_dokumen,
      diupload_oleh: user_id
    });

    res.json({
      success: true,
      message: 'Dokumen berhasil diupload',
      data: dokumen
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal mengupload dokumen',
      error: error.message
    });
  }
});

// Endpoint: Verifikasi dokumen oleh admin team
router.post('/verify', async (req, res) => {
  try {
    const { dokumen_id, status, catatan, verified_by } = req.body;

    const dokumen = await prisma.dokumen_project.update({
      where: { id: dokumen_id },
      data: {
        status: status, // 'diverifikasi' atau 'ditolak'
        catatan_admin: catatan,
        diverifikasi_oleh: verified_by,
        tanggal_verifikasi: new Date(),
        versi: { increment: 1 }
      }
    });

    // Jika dokumen ditolak, kirim notifikasi ke client untuk revisi
    if (status === 'ditolak') {
      await sendNotificationToClient(dokumen.project_id, 'dokumen_ditolak', {
        dokumen_id,
        catatan
      });
    }

    // Jika semua dokumen wajib sudah diverifikasi, update status project
    if (status === 'diverifikasi') {
      await checkAllDocumentsVerified(dokumen.project_id);
    }

    res.json({
      success: true,
      message: `Dokumen ${status === 'diverifikasi' ? 'berhasil diverifikasi' : 'ditolak'}`,
      data: dokumen
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal memverifikasi dokumen',
      error: error.message
    });
  }
});

// Endpoint: Approval final oleh admin lead
router.post('/approve', async (req, res) => {
  try {
    const { project_id, approved_by, catatan } = req.body;

    // Cek apakah semua dokumen sudah diverifikasi admin team
    const allVerified = await checkAllDocumentsVerified(project_id);
    
    if (!allVerified) {
      return res.status(400).json({
        success: false,
        message: 'Belum semua dokumen diverifikasi oleh admin team'
      });
    }

    // Update status project menjadi approved
    const project = await prisma.project.update({
      where: { id: project_id },
      data: {
        status: 'dokumen_lengkap',
        disetujui_oleh: approved_by,
        tanggal_persetujuan: new Date(),
        catatan_persetujuan: catatan
      }
    });

    // Kirim notifikasi ke semua pihak
    await sendNotificationToAll(project_id, 'project_approved', {
      approved_by,
      tanggal: new Date()
    });

    res.json({
      success: true,
      message: 'Semua dokumen telah disetujui',
      data: project
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Gagal menyetujui dokumen',
      error: error.message
    });
  }
});

// Helper function: Update progress project
async function updateProjectProgress(projectId) {
  const totalWajib = await prisma.dokumen_project.count({
    where: {
      project_id: projectId,
      dokumen: { wajib: true }
    }
  });

  const sudahDiupload = await prisma.dokumen_project.count({
    where: {
      project_id: projectId,
      status: { in: ['terupload', 'diverifikasi', 'disetujui'] },
      dokumen: { wajib: true }
    }
  });

  const progress = Math.round((sudahDiupload / totalWajib) * 100);

  await prisma.project.update({
    where: { id: projectId },
    data: { progress_dokumen: progress }
  });

  return progress;
}

// Helper function: Cek semua dokumen sudah diverifikasi
async function checkAllDocumentsVerified(projectId) {
  const dokumenBelumDiverifikasi = await prisma.dokumen_project.findFirst({
    where: {
      project_id: projectId,
      dokumen: { wajib: true },
      status: { not: 'diverifikasi' }
    }
  });

  return !dokumenBelumDiverifikasi;
}

module.exports = router;