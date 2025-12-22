import React, { useEffect, useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/utils/supabaseClient";
import { batchSaveChecklistResponses, fetchInspectionPageData } from "@/utils/checklistOptimizer";
import PhotoUploadWithGeotag from "./PhotoUploadWithGeotag";
import { cn } from "@/lib/utils"; // Utilitas untuk menggabungkan kelas Tailwind

// Impor komponen shadcn/ui
import { useToast } from "@/components/ui/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label"; // Mengganti FormLabel
import { Separator } from "@/components/ui/separator"; // Mengganti Divider
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"; // Mengganti RadioGroup & Radio
import { Loader2 } from "lucide-react"; // Ikon untuk loading
import { AlertTriangle } from "lucide-react"; // Ikon untuk error

// Mapping Motion Components (Mengganti MotionVStack, MotionHStack, MotionCard, MotionDiv)
// Di shadcn/ui, kita membungkus komponen dasar dengan motion()
const MotionDiv = motion.div;
const MotionVStack = motion.div;
const MotionHStack = motion.div;
const MotionCard = motion(Card);

// Hybrid Checklist Form Component
const HybridChecklistForm = ({ inspectorId }) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [checklistItems, setChecklistItems] = useState([]);
  const [responses, setResponses] = useState({});
  const [errors, setErrors] = useState({});
  const [sampleNumber, setSampleNumber] = useState("");

  // Fetch inspections + checklist templates from Supabase
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch inspections for this inspector
        const { data: inspections, error: inspError } = await supabase
          .from('vw_inspections_fixed')
          .select("*, checklist_items(*)")
          .eq("assigned_to", inspectorId);

        if (inspError) throw inspError;
        if (!inspections || inspections.length === 0) {
          toast({
            title: "Tidak ada inspeksi",
            description: "Menggunakan data mock (jika ada, atau kosong)",
            variant: "default", // Mengganti status: "info"
            duration: 3000,
          });
          setChecklistItems([]); // fallback kosong
        } else {
          // Flatten checklist items from inspections
          const items = inspections.flatMap(i => i.checklist_items || []);
          setChecklistItems(items);
        }
      } catch (error) {
        console.error("Error fetching inspections/checklists:", error);
        toast({
          title: "Kesalahan Ambil Data",
          description: "Gagal memuat inspeksi/checklist dari Supabase",
          variant: "destructive", // Mengganti status: "error"
          duration: 5000,
        });
        setChecklistItems([]);
      } finally {
        setLoading(false);
      }
    };

    if (inspectorId) fetchData();
  }, [inspectorId, toast]);

  const handleResponseChange = (itemId, columnName, value) => {
    setResponses(prev => ({
      ...prev,
      [itemId]: { ...prev[itemId], [columnName]: value }
    }));

    // Clear error if exists
    if (errors[itemId]?.[columnName]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        if (newErrors[itemId]) {
          delete newErrors[itemId][columnName];
          // Hapus objek item jika kosong
          if (Object.keys(newErrors[itemId]).length === 0) {
            delete newErrors[itemId];
          }
        }
        return newErrors;
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!sampleNumber.trim()) {
      newErrors.sampleNumber = "Nomor sampel wajib diisi";
    }

    checklistItems.forEach(item => {
      item.columns?.forEach(col => {
        const val = responses[item.id]?.[col.name];
        if (col.required && !val) {
          if (!newErrors[item.id]) newErrors[item.id] = {};
          newErrors[item.id][col.name] = `${col.label || col.name} wajib diisi`;
        }
      });
    });

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: "Kesalahan Validasi",
        description: "Harap isi semua kolom yang wajib diisi",
        variant: "destructive", // Mengganti status: "error"
        duration: 3000,
      });
      return;
    }

    try {
      // OPTIMIZED: Batch save all responses in single transaction
      const batchPayload = checklistItems.map(item => ({
        inspection_id: item.inspection_id,
        checklist_item_id: item.id,
        sample_number: sampleNumber,
        response: responses[item.id] || {}
      }));

      const result = await batchSaveChecklistResponses(batchPayload);

      toast({
        title: "Checklist Tersimpan",
        description: `${result.count} item checklist berhasil disimpan`,
        variant: "default",
        duration: 3000,
      });

      // Reset form
      setSampleNumber("");
      setResponses({});
    } catch (error) {
      console.error("Save Error:", error);
      toast({
        title: "Kesalahan Simpan",
        description: "Gagal menyimpan item checklist",
        variant: "destructive", // Mengganti status: "error"
        duration: 5000,
      });
    }
  };

  // Komponen untuk menampilkan pesan error di dalam FormControl
  const FormError = ({ message }) => (
    <p className="text-sm font-medium text-destructive mt-1">{message}</p>
  );

  // Komponen untuk membungkus form control (Label, Input, Error)
  const FormControlWrapper = ({ children, isRequired, isInvalid, className }) => (
    <div className={cn("space-y-2", className)}>
      {children}
    </div>
  );

  const renderColumns = (item) => {
    if (!item.columns || item.columns.length === 0) {
      // Mengganti Text color="orange.500"
      return <p className="text-sm text-orange-500">Tidak ada konfigurasi kolom</p>;
    }

    return item.columns.map(col => {
      const val = responses[item.id]?.[col.name] || "";
      const isInvalid = !!errors[item.id]?.[col.name];
      const errorMessage = errors[item.id]?.[col.name];

      switch (col.type) {
        case "radio":
          return (
            <FormControlWrapper key={col.name} isRequired={col.required} isInvalid={isInvalid} className="mb-4">
              <Label htmlFor={`${item.id}-${col.name}`} className={cn(col.required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {col.label || col.name}
              </Label>
              <RadioGroup
                id={`${item.id}-${col.name}`}
                value={val}
                onValueChange={(v) => handleResponseChange(item.id, col.name, v)}
                className="flex flex-row space-x-4 pt-1" // Mengganti Stack direction="row" spacing={4}
              >
                {col.options?.map(opt => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`${item.id}-${col.name}-${opt}`} />
                    <Label htmlFor={`${item.id}-${col.name}-${opt}`}>{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
              {isInvalid && <FormError message={errorMessage} />}
            </FormControlWrapper>
          );
        case "textarea":
          return (
            <FormControlWrapper key={col.name} isRequired={col.required} isInvalid={isInvalid} className="mb-4">
              <Label htmlFor={`${item.id}-${col.name}`} className={cn(col.required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {col.label || col.name}
              </Label>
              <Textarea
                id={`${item.id}-${col.name}`}
                value={val}
                onChange={(e) => handleResponseChange(item.id, col.name, e.target.value)}
                className={cn(isInvalid && "border-destructive focus:border-destructive")}
              />
              {isInvalid && <FormError message={errorMessage} />}
            </FormControlWrapper>
          );
        default: // case "input" atau default
          return (
            <FormControlWrapper key={col.name} isRequired={col.required} isInvalid={isInvalid} className="mb-4">
              <Label htmlFor={`${item.id}-${col.name}`} className={cn(col.required && "after:content-['*'] after:ml-0.5 after:text-red-500")}>
                {col.label || col.name}
              </Label>
              <Input
                id={`${item.id}-${col.name}`}
                value={val}
                onChange={(e) => handleResponseChange(item.id, col.name, e.target.value)}
                className={cn(isInvalid && "border-destructive focus:border-destructive")}
              />
              {isInvalid && <FormError message={errorMessage} />}
            </FormControlWrapper>
          );
      }
    });
  };

  if (loading) {
    // Mengganti VStack dan Skeleton
    return (
      <div className="flex flex-col space-y-3 p-4">
        <div className="h-10 w-4/5 animate-pulse rounded-md bg-gray-200" />
        <div className="h-72 w-full animate-pulse rounded-md bg-gray-200" />
      </div>
    );
  }

  if (checklistItems.length === 0) {
    // Mengganti Text
    return <p className="text-lg text-gray-600 p-4">Tidak ada item checklist yang ditemukan untuk inspektur ini.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {/* MotionVStack -> motion.div dengan kelas flex flex-col space-y-6 */}
      <MotionVStack className="flex flex-col space-y-6" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5 }}>
        {/* FormControl untuk Nomor Sampel */}
        <FormControlWrapper isRequired isInvalid={!!errors.sampleNumber}>
          <Label htmlFor="sampleNumber" className={cn("text-lg", !!errors.sampleNumber && "text-destructive", "after:content-['*'] after:ml-0.5 after:text-red-500")}>
            Nomor Sampel
          </Label>
          <Input
            id="sampleNumber"
            value={sampleNumber}
            onChange={(e) => setSampleNumber(e.target.value)}
            placeholder="e.g., ITEM-001, LANTAI1-RUANG01"
            className={cn(!!errors.sampleNumber && "border-destructive focus:border-destructive")}
          />
          {!!errors.sampleNumber && <FormError message={errors.sampleNumber} />}
        </FormControlWrapper>

        {checklistItems.map(item => (
          // MotionCard -> motion(Card) dengan kelas styling
          <MotionCard
            key={item.id}
            className="w-full shadow-lg border-gray-200" // variant="outline" borderRadius="lg"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
          >
            {/* CardBody -> CardContent */}
            <CardContent className="p-4">
              {/* Heading size="sm" -> h3 dengan kelas */}
              <h3 className="text-md font-semibold text-gray-800">{item.title}</h3>
              {/* Text fontSize="sm" color="gray.500" -> p dengan kelas */}
              <p className="text-sm text-gray-500">{item.description}</p>

              {/* Divider my={2} -> Separator my-2 */}
              <Separator className="my-3" />

              <div className="space-y-4">
                {renderColumns(item)}
              </div>

              {/* Photo Upload with Geotag */}
              {item.require_photo && (
                // Box mt={3} -> div mt-4
                <div className="mt-4">
                  <PhotoUploadWithGeotag
                    checklistItem={item}
                    onSave={(photoData) => {
                      console.log('📸 Photo saved via HybridChecklistForm:', photoData);
                      toast({ title: 'Foto Tersimpan', description: 'Foto dokumentasi telah diupload' });
                    }}
                    userId={inspectorId}
                    checklistFormFilled={!!responses[item.id]}
                  />
                </div>
              )}
            </CardContent>
          </MotionCard>
        ))}

        {/* MotionHStack justify="flex-end" -> motion.div flex justify-end */}
        <MotionHStack className="flex justify-end" initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ duration: 0.5, delay: 0.2 }}>
          {/* Button colorScheme="blue" -> Button variant="default" (biru default shadcn/ui) */}
          <Button type="submit">
            Simpan Semua Checklist
          </Button>
        </MotionHStack>
      </MotionVStack>
    </form>
  );
};

export default HybridChecklistForm;
