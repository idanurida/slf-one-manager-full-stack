import React from 'react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { FileText, MapPin, Calendar, Clock } from 'lucide-react';

const ReportContent = ({ report, project, clientName, checklistData, photos, formatDate, formatDateTime }) => {
    const { profile } = useAuth();

    // Helper to parse application type
    const getApplicationTypeLabel = (type) => {
        if (!type) return '-';
        const parts = type.split('_');
        const mainType = parts[0];
        const subType = parts[1] || '';

        let subLabel = '';
        if (subType === 'BARU') subLabel = 'Baru';
        else if (subType === 'PERPANJANGAN') subLabel = 'Perpanjangan';
        else if (subType === 'PERUBAHAN') subLabel = 'Perubahan';

        return { mainType, subLabel };
    };

    const { mainType, subLabel } = getApplicationTypeLabel(project?.application_type);
    const specialization = profile?.specialization || 'Umum';

    // Export to Word Handler
    const handleExportDoc = () => {
        const header = "<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'><head><meta charset='utf-8'><title>Export HTML to Word Document with JavaScript</title></head><body>";
        const footer = "</body></html>";
        const printableElement = document.getElementById("printable-content");

        if (!printableElement) {
            console.error("Printable element not found");
            return;
        }

        const sourceHTML = header + printableElement.innerHTML + footer;

        const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
        const fileDownload = document.createElement("a");
        document.body.appendChild(fileDownload);
        fileDownload.href = source;
        fileDownload.download = `Laporan_SLF_${report?.id || 'Draft'}.doc`;
        fileDownload.click();
        document.body.removeChild(fileDownload);
    };

    return (
        <div className="bg-white dark:bg-slate-900 border rounded-2xl shadow-sm space-y-12 max-w-5xl mx-auto relative font-serif">

            {/* Export Button - Visible only on screen */}
            <div className="absolute top-4 right-4 print:hidden">
                <Button onClick={handleExportDoc} variant="outline" size="sm" className="gap-2">
                    <FileText className="w-4 h-4" /> Export DOC
                </Button>
            </div>

            <div className="p-8 md:p-12 space-y-8" id="printable-content">
                {/* Cover/Header */}
                <div className="text-center space-y-6 border-b pb-8">
                    <div className="flex justify-center mb-6">
                        <Image
                            src="/leaflet/images/logo-puri-dimensi.png"
                            alt="Puri Dimensi"
                            width={200}
                            height={96}
                            className="h-24 w-auto object-contain"
                            priority
                        />
                    </div>

                    <div className="space-y-3">
                        <h1 className="text-2xl md:text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white leading-tight">
                            Laporan Hasil Pemeriksaan Kelaikan Fungsi Bangunan Gedung
                        </h1>
                        <h2 className="text-xl md:text-2xl font-bold uppercase tracking-widest text-[#7c3aed]">
                            Kategori Inspeksi: {specialization}
                        </h2>
                    </div>

                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-slate-100 dark:bg-white/5 rounded-full text-xs font-bold uppercase tracking-widest text-slate-500">
                        <FileText className="w-3.5 h-3.5" />
                        No. Laporan: {report?.id?.substring(0, 8).toUpperCase() || 'DRAFT'}
                    </div>
                </div>

                {/* 1. Data Umum Bangunan Gedung */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-2 border-b-2 border-[#7c3aed] pb-2">
                        <span className="w-6 h-6 rounded-lg bg-[#7c3aed] text-white flex items-center justify-center text-[10px]">01</span>
                        Data Umum Bangunan Gedung
                    </h3>

                    <table className="w-full text-sm text-slate-700 dark:text-slate-300">
                        <tbody>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 w-1/3 font-bold">Nama Bangunan</td>
                                <td className="py-2 w-2">:</td>
                                <td className="py-2">{project?.name || '-'}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 font-bold">Alamat</td>
                                <td className="py-2 w-2">:</td>
                                <td className="py-2">{project?.location || '-'} {project?.city ? `, ${project.city}` : ''}</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 font-bold">Fungsi Bangunan</td>
                                <td className="py-2 w-2">:</td>
                                <td className="py-2 italic text-slate-400">[Fungsi Bangunan]</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 font-bold">Jumlah Lantai</td>
                                <td className="py-2 w-2">:</td>
                                <td className="py-2 italic text-slate-400">[Jumlah Lantai]</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 font-bold">Luas Bangunan</td>
                                <td className="py-2 w-2">:</td>
                                <td className="py-2 italic text-slate-400">[Luas Bangunan] m²</td>
                            </tr>
                            <tr className="border-b border-slate-100">
                                <td className="py-2 font-bold">Tahun Pembangunan</td>
                                <td className="py-2 w-2">:</td>
                                <td className="py-2 italic text-slate-400">[Tahun Pembangunan]</td>
                            </tr>
                            <tr>
                                <td className="py-2 font-bold">Nama Pemilik</td>
                                <td className="py-2 w-2">:</td>
                                <td className="py-2">{clientName || '-'}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* 2. Checklist Inspeksi Teknis */}
                <div className="space-y-4">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-2 border-b-2 border-[#7c3aed] pb-2">
                        <span className="w-6 h-6 rounded-lg bg-[#7c3aed] text-white flex items-center justify-center text-[10px]">02</span>
                        Checklist Inspeksi Teknis
                    </h3>

                    <div className="border border-slate-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                                <tr>
                                    <th className="px-4 py-3 w-12 text-center">No</th>
                                    <th className="px-4 py-3">Komponen Inspeksi</th>
                                    <th className="px-4 py-3">Aspek</th>
                                    <th className="px-4 py-3 w-32 text-center">Kondisi</th>
                                    <th className="px-4 py-3">Keterangan</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {checklistData.length > 0 ? (
                                    checklistData.map((item, index) => (
                                        <tr key={item.id} className="hover:bg-slate-50/50">
                                            <td className="px-4 py-3 text-center text-slate-500">{index + 1}</td>
                                            <td className="px-4 py-3 font-medium text-slate-900">
                                                {item.checklist_items?.item_name || item.item_id}
                                            </td>
                                            <td className="px-4 py-3 text-slate-600">
                                                {item.checklist_items?.category || item.checklist_items?.template_title || '-'}
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold uppercase ${item.status === 'completed' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                                    {item.status === 'completed' ? 'Baik' : 'Rusak'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-slate-600 italic">
                                                {item.notes ? (
                                                    <span>{item.notes}</span>
                                                ) : item.response ? (
                                                    typeof item.response === 'object' ? (
                                                        <div className="space-y-1">
                                                            {Object.entries(item.response).map(([key, value]) => (
                                                                <div key={key}>
                                                                    <span className="font-semibold capitalize">{key.replace(/_/g, ' ')}:</span> {value}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span>{item.response}</span>
                                                    )
                                                ) : (
                                                    '-'
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="5" className="px-4 py-8 text-center text-slate-400 italic">Belum ada data checklist.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* 3. Kesimpulan dan Rekomendasi */}
                <div className="space-y-4 break-inside-avoid">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-2 border-b-2 border-[#7c3aed] pb-2">
                        <span className="w-6 h-6 rounded-lg bg-[#7c3aed] text-white flex items-center justify-center text-[10px]">03</span>
                        Kesimpulan dan Rekomendasi
                    </h3>

                    <div className="space-y-6 px-2">
                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 underline">A. Kesimpulan</h4>
                            <p className="text-sm text-slate-700 leading-relaxed">
                                Berdasarkan hasil pemeriksaan visual dan teknis yang telah dilakukan, maka Bangunan Gedung <strong>{project?.name}</strong> dinyatakan:
                            </p>
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg text-center font-bold text-lg text-slate-900 my-4">
                                {report?.findings ? "TIDAK LAIK FUNGSI (Perlu Perbaikan)" : "LAIK FUNGSI"}
                            </div>
                            {report?.findings && (
                                <p className="text-sm text-slate-600 italic">
                                    *Catatan: Status Laik Fungsi dapat diberikan setelah rekomendasi perbaikan di bawah ini dipenuhi.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <h4 className="font-bold text-slate-900 underline">B. Rekomendasi</h4>
                            <p className="text-sm text-slate-700 mb-2">
                                Daftar perbaikan yang harus dipenuhi sebelum Penerbitan Sertifikat Laik Fungsi (SLF):
                            </p>
                            <div className="pl-4 border-l-2 border-slate-200">
                                {report?.recommendations ? (
                                    <div className="prose prose-sm max-w-none text-slate-700 whitespace-pre-wrap">
                                        {report.recommendations}
                                    </div>
                                ) : (
                                    <p className="text-sm text-slate-400 italic">Tidak ada rekomendasi khusus.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* 4. Lampiran */}
                <div className="space-y-4 break-before-page">
                    <h3 className="text-sm font-black uppercase tracking-widest text-[#7c3aed] flex items-center gap-2 border-b-2 border-[#7c3aed] pb-2">
                        <span className="w-6 h-6 rounded-lg bg-[#7c3aed] text-white flex items-center justify-center text-[10px]">04</span>
                        Lampiran
                    </h3>

                    <div className="space-y-6">
                        <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide border-b pb-1">4.1 Foto Dokumentasi</h4>

                        {photos.length > 0 ? (
                            <div className="border border-slate-200 rounded-lg overflow-hidden">
                                <table className="w-full text-xs">
                                    <thead className="bg-slate-100 text-slate-700 font-bold uppercase tracking-wider">
                                        <tr>
                                            <th className="px-4 py-2 w-10 text-center">No</th>
                                            <th className="px-4 py-2 w-1/4">Komponen</th>
                                            <th className="px-4 py-2 w-1/3 text-center">Foto</th>
                                            <th className="px-4 py-2">Data Teknis & Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {photos.map((photo, idx) => {
                                            // Priority 1: Use direct relationship data from photo (if fetched with join)
                                            // Priority 2: Lookup in checklistData (for backward compatibility or if join missing)
                                            const directItem = photo.checklist_items;
                                            const relatedItem = !directItem ? checklistData.find(c => c.checklist_item_id === photo.checklist_item_id) : null;

                                            const category = directItem?.category || relatedItem?.checklist_items?.category || 'Umum';
                                            const itemName = directItem?.item_name || relatedItem?.checklist_items?.item_name || relatedItem?.item_id || 'Item Tidak Dikenal';
                                            const aspect = directItem?.template_title || relatedItem?.checklist_items?.template_title || '-';

                                            return (
                                                <tr key={photo.id} className="break-inside-avoid">
                                                    <td className="px-4 py-4 text-center align-top text-slate-500">{idx + 1}</td>
                                                    <td className="px-4 py-4 align-top font-medium text-slate-900">
                                                        <div className="space-y-1">
                                                            <div className="text-[10px] font-black uppercase text-[#7c3aed]">{category}</div>
                                                            <div className="text-xs font-bold">{itemName}</div>
                                                            <div className="text-[10px] text-slate-500 italic">Aspek: {aspect}</div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-2 align-top">
                                                        <div className="w-full aspect-video bg-slate-100 rounded overflow-hidden border border-slate-200 relative">
                                                            <Image
                                                                src={photo.photo_url}
                                                                alt={photo.caption || 'Foto dokumentasi'}
                                                                fill
                                                                className="object-cover"
                                                                sizes="(max-width: 768px) 100vw, 400px"
                                                            />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4 align-top space-y-2">
                                                        <div>
                                                            <div className="font-bold text-slate-700 mb-1">Keterangan:</div>
                                                            <p className="text-slate-600 italic">"{photo.caption || 'Tanpa keterangan'}"</p>
                                                        </div>
                                                        <div className="pt-2 border-t border-slate-100 mt-2">
                                                            <div className="font-bold text-slate-700 mb-1">Geotag Data:</div>
                                                            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-mono">
                                                                <div>
                                                                    <span className="block text-slate-400">Latitude:</span>
                                                                    {photo.latitude ? photo.latitude.toFixed(7) : '-'}
                                                                </div>
                                                                <div>
                                                                    <span className="block text-slate-400">Longitude:</span>
                                                                    {photo.longitude ? photo.longitude.toFixed(7) : '-'}
                                                                </div>
                                                                <div className="col-span-2">
                                                                    <span className="block text-slate-400">Waktu Pengambilan:</span>
                                                                    {formatDateTime(photo.captured_at || photo.created_at)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <p className="text-center py-8 text-slate-400 italic border border-dashed rounded-lg">Tidak ada foto dokumentasi.</p>
                        )}

                        <div className="pt-4 page-break-inside-avoid">
                            <h4 className="font-bold text-sm text-slate-800 uppercase tracking-wide border-b pb-1 mb-4">4.2 Hasil Uji Teknis</h4>
                            <p className="text-sm text-slate-500 italic px-4">
                                (Lampirkan hasil uji laboratorium atau teknis lainnya jika ada, misalnya: Uji Kuat Tekan Beton, Uji Tarik Baja, dsb.)
                            </p>
                        </div>
                    </div>
                </div>

                {/* Identitas Pemeriksa & Waktu */}
                <div className="grid grid-cols-2 gap-8 my-8 pt-8 border-t border-slate-200 break-inside-avoid">
                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">Lokasi & Waktu Inspeksi</h4>
                        <div className="space-y-3 text-sm">
                            <div className="flex items-start gap-3">
                                <MapPin className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <span className="block font-bold text-slate-700">Lokasi:</span>
                                    <span className="text-slate-600">{project?.location || '-'} {project?.city ? `, ${project.city}` : ''}</span>
                                </div>
                            </div>
                            <div className="flex items-start gap-3">
                                <Clock className="w-4 h-4 text-slate-400 mt-0.5" />
                                <div>
                                    <span className="block font-bold text-slate-700">Waktu:</span>
                                    <span className="text-slate-600">
                                        {formatDate(report?.inspection_date || new Date())}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div>
                        <h4 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4 text-center">Inspector / Pemeriksa</h4>
                        <div className="flex flex-col items-center justify-center text-center space-y-1">
                            <div className="h-16 w-full"></div> {/* Space for signature */}
                            <div className="font-bold text-slate-900 border-b border-slate-300 pb-1 min-w-[200px]">
                                {profile?.full_name || 'Tanpa Nama'}
                            </div>
                            <div className="text-xs text-slate-500 font-mono pt-1">
                                ID: {profile?.id?.substring(0, 8).toUpperCase() || '-'}
                            </div>
                            <Badge variant="secondary" className="mt-2 text-[10px] uppercase">
                                {profile?.specialization || 'Inspector'}
                            </Badge>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="pt-8 border-t flex flex-col items-center gap-2 opacity-60">
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                        PT Puri Dimensi - SLF Manager System
                    </p>
                    <p className="text-[9px] text-slate-300">
                        Dicetak pada: {new Date().toLocaleString('id-ID')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReportContent;
