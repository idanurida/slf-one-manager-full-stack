# Workflow Dokumen SLF/PBG

## Flow Diagram

```
┌─────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CLIENT    │────▶│  ADMIN TEAM  │────▶│  ADMIN LEAD  │────▶│   APPROVED   │
│   Upload    │     │   Verifikasi │     │   Approve    │     │              │
└─────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
      │                    │                    │
      │                    │                    │
      ▼                    ▼                    ▼
   pending            verified             approved
                          │                    │
                          ▼                    ▼
                   revision_needed         rejected
                          │
                          ▼
                   Client re-upload
```

## Status Dokumen

| Status | Deskripsi | Siapa yang Set |
|--------|-----------|----------------|
| `pending` | Baru diupload, menunggu verifikasi | Client (otomatis) |
| `verified` | Sudah diverifikasi, menunggu approval | Admin Team |
| `approved` | Sudah disetujui | Admin Lead |
| `rejected` | Ditolak permanen | Admin Lead |
| `revision_needed` | Perlu direvisi oleh client | Admin Team / Admin Lead |

## Kolom Baru pada Tabel `documents`

### Kolom Verifikasi (Admin Team)
- `verified_by_id` - UUID user yang memverifikasi
- `verified_at` - Timestamp verifikasi
- `verification_notes` - Catatan verifikasi

### Kolom Approval (Admin Lead)
- `approved_by_id` - UUID user yang meng-approve
- `approved_at` - Timestamp approval
- `approval_notes` - Catatan approval

### Kolom Rejection
- `rejected_by_id` - UUID user yang menolak
- `rejected_at` - Timestamp penolakan
- `rejection_reason` - Alasan penolakan

### Kolom Revision
- `revision_requested` - Boolean apakah perlu revisi
- `revision_notes` - Catatan untuk revisi
- `revision_count` - Berapa kali sudah direvisi

## Tabel Baru: `document_history`

Tabel untuk audit trail perubahan status dokumen:
- `document_id` - Referensi ke dokumen
- `action` - Aksi yang dilakukan (uploaded, verified, approved, rejected, revision_requested, resubmitted)
- `old_status` - Status sebelumnya
- `new_status` - Status baru
- `performed_by` - User yang melakukan aksi
- `notes` - Catatan
- `metadata` - Data tambahan (JSONB)
- `created_at` - Timestamp

## Notifikasi Otomatis

Trigger `notify_document_status_change` akan mengirim notifikasi:

1. **Document Uploaded (pending)**
   - Notifikasi ke: Admin Team
   - Pesan: "Dokumen baru telah diupload dan menunggu verifikasi"

2. **Document Verified**
   - Notifikasi ke: Admin Lead + Client
   - Pesan: "Dokumen telah diverifikasi dan menunggu approval"

3. **Document Approved**
   - Notifikasi ke: Client
   - Pesan: "Dokumen telah disetujui oleh Admin Lead"

4. **Document Rejected / Revision Needed**
   - Notifikasi ke: Client
   - Pesan: Termasuk alasan penolakan/catatan revisi

## Cara Menjalankan Script

1. Buka Supabase Dashboard
2. Pergi ke SQL Editor
3. Jalankan script `setup-rls-policies.sql` terlebih dahulu (jika belum)
4. Jalankan script `update-documents-workflow.sql`

## Halaman yang Terlibat

### Client
- `/dashboard/client/upload` - Upload dokumen baru

### Admin Team
- `/dashboard/admin-team/documents` - Verifikasi dokumen (pending → verified)

### Admin Lead
- `/dashboard/admin-lead/pending-documents` - Melihat dokumen tanpa project
- `/dashboard/admin-lead/documents` - Approve dokumen (verified → approved)

## Function SQL

### `update_document_status(document_id, new_status, action, notes, metadata)`

Function untuk update status dokumen dengan otomatis:
- Update field yang sesuai (verified_by, approved_by, dll)
- Insert record ke document_history
- Return TRUE jika berhasil

Contoh penggunaan:
```sql
SELECT update_document_status(
  'document-uuid',
  'verified',
  'verified',
  'Dokumen sudah lengkap dan valid'
);
```

## View

### `document_statistics`

View untuk statistik dokumen per project:
- total_documents
- pending_count
- verified_count
- approved_count
- rejected_count
- revision_needed_count
- unassigned_count
