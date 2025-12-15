// FILE: src/pages/dashboard/admin-lead/clients/new.js
// Form Buat Client Baru
import React, { useState } from "react";
import { useRouter } from "next/router";
import { toast } from "sonner";

// UI Components
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Icons
import { ArrowLeft, Save, Building, User, Mail, Phone, MapPin, AlertCircle, Loader2 } from "lucide-react";

// Utils & Context
import DashboardLayout from "@/components/layouts/DashboardLayout";
import { supabase } from "@/utils/supabaseClient";
import { useAuth } from "@/context/AuthContext";

export default function NewClientPage() {
    const router = useRouter();
    const { user, loading: authLoading, isAdminLead } = useAuth();

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        company_name: '',
        address: '',
        city: '',
        npwp: ''
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        // Basic validation
        if (!formData.name || !formData.email) {
            setError('Nama dan Email wajib diisi');
            setLoading(false);
            return;
        }

        try {
            const { data, error: insertError } = await supabase
                .from('clients')
                .insert({
                    ...formData,
                    // managed_by: user.id // Future: if we add managed_by column
                })
                .select()
                .single();

            if (insertError) throw insertError;

            toast.success('Client berhasil dibuat!');

            // Redirect back to clients list or new project page if referred
            if (router.query.returnUrl) {
                router.push(router.query.returnUrl);
            } else {
                router.push('/dashboard/admin-lead/clients');
            }

        } catch (err) {
            console.error('Error creating client:', err);
            setError(err.message || 'Gagal membuat client');
            toast.error('Gagal membuat client');
        } finally {
            setLoading(false);
        }
    };

    // Auth check
    if (authLoading) {
        return (
            <DashboardLayout title="Client Baru">
                <div className="p-6 space-y-4">
                    <Skeleton className="h-8 w-64" />
                    <Skeleton className="h-96 w-full" />
                </div>
            </DashboardLayout>
        );
    }

    if (!isAdminLead) {
        return (
            <DashboardLayout title="Client Baru">
                <Alert variant="destructive" className="m-6">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Akses Ditolak</AlertTitle>
                    <AlertDescription>Anda tidak memiliki izin untuk halaman ini.</AlertDescription>
                </Alert>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout title="Client Baru">
            <div className="p-4 md:p-6 max-w-2xl mx-auto space-y-6">

                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">Tambah Client Baru</h1>
                        <p className="text-muted-foreground">Isi data lengkap client untuk keperluan proyek</p>
                    </div>
                </div>

                {error && (
                    <Alert variant="destructive">
                        <AlertCircle className="h-4 w-4" />
                        <AlertTitle>Error</AlertTitle>
                        <AlertDescription>{error}</AlertDescription>
                    </Alert>
                )}

                <form onSubmit={handleSubmit}>
                    <Card>
                        <CardHeader>
                            <CardTitle>Informasi Client</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">

                            <div className="space-y-2">
                                <Label htmlFor="name">Nama Lengkap / PIC *</Label>
                                <div className="relative">
                                    <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="name"
                                        name="name"
                                        placeholder="Nama Client"
                                        className="pl-9"
                                        value={formData.name}
                                        onChange={handleChange}
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="company_name">Nama Perusahaan (Opsional)</Label>
                                <div className="relative">
                                    <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        id="company_name"
                                        name="company_name"
                                        placeholder="PT. Contoh Indonesia"
                                        className="pl-9"
                                        value={formData.company_name}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email *</Label>
                                    <div className="relative">
                                        <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="email"
                                            name="email"
                                            type="email"
                                            placeholder="email@example.com"
                                            className="pl-9"
                                            value={formData.email}
                                            onChange={handleChange}
                                            required
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="phone">Nomor Telepon</Label>
                                    <div className="relative">
                                        <Phone className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            id="phone"
                                            name="phone"
                                            placeholder="0812..."
                                            className="pl-9"
                                            value={formData.phone}
                                            onChange={handleChange}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="address">Alamat Lengkap</Label>
                                <div className="relative">
                                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Textarea
                                        id="address"
                                        name="address"
                                        placeholder="Jl. Raya..."
                                        className="pl-9"
                                        value={formData.address}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="grid gap-4 md:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="city">Kota/Kabupaten</Label>
                                    <Input
                                        id="city"
                                        name="city"
                                        placeholder="Jakarta Selatan"
                                        value={formData.city}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="npwp">NPWP (Opsional)</Label>
                                    <Input
                                        id="npwp"
                                        name="npwp"
                                        placeholder="00.000.000..."
                                        value={formData.npwp}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                        </CardContent>
                    </Card>

                    <div className="flex justify-end mt-6 gap-4">
                        <Button type="button" variant="outline" onClick={() => router.back()}>
                            Batal
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700">
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Menyimpan...
                                </>
                            ) : (
                                <>
                                    <Save className="mr-2 h-4 w-4" />
                                    Simpan Client
                                </>
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </DashboardLayout>
    );
}
