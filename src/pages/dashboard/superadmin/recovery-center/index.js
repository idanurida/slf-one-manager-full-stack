import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, RefreshCw, AlertTriangle, CheckCircle2, Loader2, Wrench } from "lucide-react";
import { useRouter } from "next/router";
import { supabase } from "@/utils/supabaseClient";
import { errorRecommendations } from "@/utils/errorRecommendations";
import { recoveryActions } from "@/utils/recoveryActions";

const RecoveryCenter = () => {
  const router = useRouter();
  const { toast } = useToast();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [applyingFix, setApplyingFix] = useState(null);

  const fetchLogs = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("logs")
      .select("*")
      .order("timestamp", { ascending: false })
      .limit(50);
    if (!error) setLogs(data || []);
    setLoading(false);
  };

  const findRecommendation = (message) => {
    return errorRecommendations.find((rec) => rec.match.test(message));
  };

  const handleApplyFix = async (actionKey, logId) => {
    setApplyingFix(logId);
    try {
      if (recoveryActions[actionKey]) {
        await recoveryActions[actionKey]();
        toast({
          title: "Perbaikan berhasil diterapkan",
          description: "Aksi perbaikan otomatis telah dijalankan.",
          variant: "default",
        });
        await fetchLogs();
      } else {
        toast({
          title: "Aksi tidak tersedia",
          description: "Tidak ada aksi fix otomatis untuk error ini.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Gagal menerapkan perbaikan",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setApplyingFix(null);
    }
  };

  const getErrorStats = () => {
    const errorCount = logs.filter(log => log.type === 'error').length;
    const criticalCount = logs.filter(log => log.type === 'critical').length;
    const warningCount = logs.filter(log => log.type === 'warning').length;
    const fixableCount = logs.filter(log => findRecommendation(log.message || "")).length;

    return { errorCount, criticalCount, warningCount, fixableCount };
  };

  const getBadgeVariant = (type) => {
    switch (type) {
      case 'critical': return 'destructive';
      case 'error': return 'destructive';
      case 'warning': return 'outline';
      default: return 'secondary';
    }
  };

  const stats = getErrorStats();

  useEffect(() => {
    fetchLogs();
  }, []);

  const handleBack = () => {
    router.back();
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      {/* Action Buttons */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Kembali
        </Button>
        <Button onClick={fetchLogs} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-red-50 border-red-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-red-600">Critical Errors</p>
                <p className="text-2xl font-bold text-red-700">{stats.criticalCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-orange-50 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-orange-600">Errors</p>
                <p className="text-2xl font-bold text-orange-700">{stats.errorCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-yellow-600">Warnings</p>
                <p className="text-2xl font-bold text-yellow-700">{stats.warningCount}</p>
              </div>
              <AlertTriangle className="h-8 w-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-green-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-green-600">Fixable Issues</p>
                <p className="text-2xl font-bold text-green-700">{stats.fixableCount}</p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <CardTitle>Error Log & Recovery Actions</CardTitle>
          <CardDescription>
            {logs.length > 0 
              ? `Menampilkan ${logs.length} log error terbaru. ${stats.fixableCount} issue dapat diperbaiki otomatis.`
              : 'Tidak ada log error yang tercatat.'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-12 w-12 animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-600">Memuat log error...</p>
              </div>
            </div>
          ) : logs.length === 0 ? (
            <Alert>
              <CheckCircle2 className="h-4 w-4" />
              <AlertDescription>
                Sistem berjalan dengan baik. Tidak ada error yang perlu ditangani.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead className="w-[180px]">Waktu</TableHead>
                    <TableHead className="w-[100px]">Tipe</TableHead>
                    <TableHead>Pesan Error</TableHead>
                    <TableHead className="w-[300px]">Rekomendasi Perbaikan</TableHead>
                    <TableHead className="w-[120px] text-right">Aksi</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const rec = findRecommendation(log.message || "");
                    return (
                      <TableRow key={log.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          <div className="flex flex-col">
                            <span className="text-sm">
                              {new Date(log.timestamp).toLocaleDateString('id-ID')}
                            </span>
                            <span className="text-xs text-slate-500">
                              {new Date(log.timestamp).toLocaleTimeString('id-ID')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getBadgeVariant(log.type)} className="capitalize">
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="text-sm font-medium">{log.message}</p>
                            {log.context && (
                              <p className="text-xs text-slate-500">Context: {log.context}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {rec ? (
                            <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
                              <div className="flex items-start gap-2">
                                <Wrench className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                                <div>
                                  <p className="font-medium text-sm text-blue-900">{rec.title}</p>
                                  <p className="text-xs text-blue-700 mt-1">{rec.description}</p>
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
                              <p className="text-slate-400 text-sm text-center">
                                Tidak ada rekomendasi otomatis
                              </p>
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {rec ? (
                            <Button
                              onClick={() => handleApplyFix(rec.fixAction, log.id)}
                              size="sm"
                              className="gap-2 w-full"
                              disabled={applyingFix === log.id}
                            >
                              {applyingFix === log.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <Wrench className="h-3 w-3" />
                              )}
                              {applyingFix === log.id ? 'Memperbaiki...' : 'Perbaiki'}
                            </Button>
                          ) : (
                            <Button size="sm" variant="outline" disabled className="w-full">
                              Manual
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default RecoveryCenter;
