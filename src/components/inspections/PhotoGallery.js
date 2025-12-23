// src/components/inspections/PhotoGallery.jsx

import React, { useState, useEffect, useMemo } from "react";
import { FiTrash2, FiMapPin, FiUser, FiInfo, FiX } from "lucide-react";
import { motion } from 'framer-motion';

// =================================================================
// 1. ENVIRONMENT/SHADCN UI MOCKS (Menggantikan Chakra UI)
// =================================================================

const cn = (...classes) => classes.filter(Boolean).join(' ');

// Mock Checkbox
const Checkbox = ({ isChecked, onChange, children, className = "" }) => (
    <label className={cn("flex items-center space-x-2 text-sm text-gray-700", className)}>
        <input
            type="checkbox"
            checked={isChecked}
            onChange={onChange}
            // Checkbox color uses slate theme
            className="h-4 w-4 rounded border-gray-300 text-slate-600 focus:ring-slate-500"
        />
        <span>{children}</span>
    </label>
);

// Mock Badge
const Badge = ({ children, className = "", colorScheme }) => {
    // Badge color scheme changed from blue to slate for the template title
    const colorClasses = colorScheme === "slate"
        ? "bg-slate-100 text-slate-700 border border-slate-300"
        : colorScheme === "red"
            ? "bg-red-100 text-red-700 border border-red-300"
            : "bg-gray-100 text-gray-700 border border-gray-300";

    return (
        <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", colorClasses, className)}>
            {children}
        </span>
    );
};

// Mock Component Adapters (replacing Chakra components)
const Box = ({ children, className = "", ...props }) => <div className={className} {...props}>{children}</div>;
const VStack = ({ children, className = "", spacing = 6, align = "stretch" }) => (
    <div
        className={cn("flex flex-col", `space-y-${spacing}`, className, align === "stretch" ? "items-stretch" : "")}
    >
        {children}
    </div>
);
const SimpleGrid = ({ children, className = "", columns, spacing = 4 }) => (
    <div
        className={cn(
            "grid",
            columns?.base === 1 ? "grid-cols-1" : "grid-cols-1", // Default to 1
            columns?.sm === 2 && "sm:grid-cols-2",
            columns?.md === 3 && "md:grid-cols-3",
            columns?.lg === 4 && "lg:grid-cols-4",
            `gap-${spacing}`,
            className
        )}
    >
        {children}
    </div>
);
const HStack = ({ children, className = "", spacing = 4, wrap }) => (
    <div className={cn("flex items-center", `space-x-${spacing}`, wrap && "flex-wrap", className)}>
        {children}
    </div>
);

// Card Mocks
const Card = ({ children, className = "", variant, ...props }) => (
    <div className={cn("rounded-xl border bg-white text-gray-800 shadow-md", className)} {...props}>
        {children}
    </div>
);
const CardBody = ({ children, className = "", p = 6 }) => <div className={cn(`p-${p}`, className)}>{children}</div>;
const Text = ({ children, className = "", fontSize, fontWeight, noOfLines, color, mt }) => {
    const sizeClass = fontSize === 'sm' ? 'text-sm' : fontSize === 'xs' ? 'text-xs' : 'text-base';
    const weightClass = fontWeight === 'bold' ? 'font-bold' : '';
    const colorClass = color ? `text-${color.replace('.', '-')}` : 'text-gray-900';
    const marginClass = mt ? `mt-${mt}` : '';

    // Simplified noOfLines for a mock, relying on Tailwind's truncate/line-clamp
    return <p className={cn(sizeClass, weightClass, colorClass, marginClass, noOfLines === 1 && "truncate", className)}>{children}</p>;
};

const Image = ({ src, alt, borderRadius, objectFit, height, width, ...props }) => (
    <img
        src={src}
        alt={alt}
        className={cn(
            "w-full",
            borderRadius === "md" && "rounded-t-xl",
            objectFit === "cover" && "object-cover",
            height ? `h-[${height}]` : "h-auto",
            width && "w-full" // Assuming width="100%"
        )}
        style={{ height: height, width: width }}
        loading="lazy"
        {...props}
    />
);

const IconButton = ({ icon: Icon, size, colorScheme, onClick, className = "", ...props }) => {
    // Red color kept for delete action
    const colorClasses = colorScheme === "red"
        ? "bg-red-500 hover:bg-red-600 text-white"
        : "bg-gray-200 hover:bg-gray-300 text-gray-700";

    return (
        <button
            onClick={onClick}
            className={cn("p-2 rounded-full transition duration-150 active:scale-[0.95]", colorClasses, className)}
            aria-label="Icon Button"
            {...props}
        >
            <Icon className={size === "xs" ? "h-3 w-3" : "h-4 w-4"} />
        </button>
    );
};

const Button = ({ children, className = "", variant, size = "sm", onClick, leftIcon: Icon, ...props }) => {
    let sizeClasses = "px-4 py-2 text-sm";
    if (size === "sm") sizeClasses = "px-3 py-1.5 text-sm";

    // FIX: Changed const to let to allow reassignment based on colorScheme
    let variantClasses = variant === "outline"
        ? // Reset button remains red for clarity
        "border border-red-500 text-red-500 hover:bg-red-50"
        : variant === "ghost"
            ? "text-slate-700 hover:bg-slate-100"
            : variant === "unstyled"
                ? ""
                : // Default primary is slate-900 (used for modal confirmation)
                "bg-slate-900 text-white hover:bg-slate-700";

    if (props.colorScheme === 'red') {
        // Explicitly red for the delete confirmation
        variantClasses = "bg-red-600 text-white hover:bg-red-700";
    }

    return (
        <button
            onClick={onClick}
            className={cn(
                "font-semibold rounded-lg transition duration-150 active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center space-x-1",
                sizeClasses,
                variantClasses,
                className
            )}
            {...props}
        >
            {Icon && <Icon className="h-4 w-4" />}
            <span>{children}</span>
        </button>
    );
};

// Input/Form Mocks
const FormControl = ({ children, className = "", minW }) => <div className={cn(minW && `min-w-[${minW}]`, className)}>{children}</div>;
const FormLabel = ({ children, className = "", fontSize }) => <label className={cn("mb-1 block text-sm font-medium text-gray-700", fontSize === 'sm' && "text-xs", className)}>{children}</label>;
const Input = ({ className = "", value, onChange, placeholder, type = 'text', size, ...props }) => {
    let sizeClass = size === 'sm' ? 'h-8' : 'h-10';
    return (
        <input
            type={type}
            // Focus color set to slate-500
            className={cn(`flex ${sizeClass} w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-colors`, className)}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            {...props}
        />
    );
};
const Select = ({ value, onValueChange, children, size, className = "" }) => {
    let sizeClass = size === 'sm' ? 'h-8' : 'h-10';
    return (
        <select
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            // Focus color set to slate-500
            className={cn(`flex ${sizeClass} w-full rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:border-slate-500 focus:ring-1 focus:ring-slate-500 outline-none transition-colors appearance-none pr-8`, className)}
        >
            {children}
        </select>
    );
};

const Skeleton = ({ className = "", height }) => <div className={cn("animate-pulse rounded-lg bg-gray-200", className)} style={{ height: height }} />;


// Mock Modal Implementation
const Modal = ({ isOpen, onClose, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.2 }}
                className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4"
            >
                {children}
            </motion.div>
        </div>
    );
};
const ModalHeader = ({ children }) => <div className="px-6 pt-6 pb-2 text-xl font-semibold text-slate-900 border-b border-gray-100">{children}</div>;
const ModalCloseButton = ({ onClick }) => (
    <button onClick={onClick} className="absolute top-4 right-4 p-1 text-gray-400 hover:text-gray-700 rounded-full transition">
        <FiX className="h-5 w-5" />
    </button>
);
const ModalBody = ({ children }) => <div className="p-6 text-gray-700">{children}</div>;
const ModalFooter = ({ children }) => <div className="px-6 py-4 flex justify-end space-x-3 border-t border-gray-100">{children}</div>;

// Mock Hooks
const useToast = () => ({ toast: ({ title, description, status }) => console.log(`[Toast: ${status}] ${title} - ${description}`) });
const useDisclosure = () => {
    const [isOpen, setIsOpen] = useState(false);
    return { isOpen, onOpen: () => setIsOpen(true), onClose: () => setIsOpen(false) };
};

// =================================================================
// 2. SUPABASE & DATA MOCKS
// =================================================================

// Mock Supabase Client and Data
const mockSupabase = {
    from: (table) => ({
        select: (columns) => ({
            eq: (column, value) => ({
                order: () => ({
                    async then(resolve) {
                        await new Promise(r => setTimeout(r, 800)); // Simulate delay

                        const mockPhotos = [
                            { id: 101, checklist_item_id: 'ci1', photo_url: 'https://placehold.co/400x200/505050/FFFFFF?text=Foto+Struktur', caption: 'Pemeriksaan struktur utama', latitude: -6.2, longitude: 106.8, uploaded_at: '2024-07-25T10:00:00Z', uploaded_by: { id: 'user1', full_name: 'Budi Santoso', email: 'budi@corp.com' } },
                            { id: 102, checklist_item_id: 'ci2', photo_url: 'https://placehold.co/400x200/556270/FFFFFF?text=Foto+Lantai', caption: 'Lantai keramik retak di area A', latitude: null, longitude: null, uploaded_at: '2024-07-24T14:30:00Z', uploaded_by: { id: 'user2', full_name: 'Ayu Lestari', email: 'ayu@corp.com' } },
                            { id: 103, checklist_item_id: 'ci1', photo_url: 'https://placehold.co/400x200/9099A2/FFFFFF?text=Foto+Atap', caption: 'Kondisi atap baru terpasang', latitude: -6.21, longitude: 106.81, uploaded_at: '2024-07-24T09:00:00Z', uploaded_by: { id: 'user1', full_name: 'Budi Santoso', email: 'budi@corp.com' } },
                            { id: 104, checklist_item_id: 'ci3', photo_url: 'https://placehold.co/400x200/79818A/FFFFFF?text=Foto+Kabel', caption: 'Pemasangan kabel listrik', latitude: -6.205, longitude: 106.805, uploaded_at: '2024-07-23T11:00:00Z', uploaded_by: { id: 'user3', full_name: 'Joko Purnomo', email: 'joko@corp.com' } },
                        ];

                        const data = mockPhotos.filter(p => !value || p.uploaded_by?.id === value);
                        resolve({ data: data, error: null });
                    }
                }),
            }),
        }),
    }),
    storage: {
        from: () => ({
            remove: () => ({ error: null }), // Mock success
        }),
    },
};

const supabase = mockSupabase;

// Mock Checklist Data
const checklistData = {
    checklist_templates: [
        { title: "Struktur Bangunan", subsections: [{ items: [{ id: 'ci1', item_name: 'Pondasi' }, { id: 'ci2', item_name: 'Lantai' }] }] },
        { title: "Instalasi Elektrikal", subsections: [{ items: [{ id: 'ci3', item_name: 'Kabel Utama' }] }] },
    ],
};


// =================================================================
// 3. COMPONENT LOGIC
// =================================================================

const PhotoGallery = ({
    userId: initialUserId = 'user1', // Defaulting to 'user1' for mock
    checklistItemId: initialChecklistItemId = null,
}) => {
    const toast = useToast();
    const { isOpen, onOpen, onClose } = useDisclosure();

    const [photos, setPhotos] = useState([]);
    const [filteredPhotos, setFilteredPhotos] = useState([]);
    const [loading, setLoading] = useState(true);

    // Filter states
    const [selectedUserId, setSelectedUserId] = useState(initialUserId || "");
    const [selectedChecklistId, setSelectedChecklistId] = useState(initialChecklistItemId || "");
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [withLocation, setWithLocation] = useState(false);

    const [photoToDelete, setPhotoToDelete] = useState(null);

    // Deduplicate checklist items
    const allChecklistItems = useMemo(() => {
        const items = [];
        const seenIds = new Set();

        checklistData.checklist_templates.forEach((template) => {
            const source = template.subsections || [{ items: template.items }];
            source.forEach((sub) => {
                sub.items?.forEach((item) => {
                    if (!seenIds.has(item.id)) {
                        items.push({ ...item, template_title: template.title });
                        seenIds.add(item.id);
                    }
                });
            });
        });
        return items;
    }, []);

    // ✅ Fetch photos from Supabase with relation fix
    useEffect(() => {
        const fetchPhotos = async () => {
            setLoading(true);
            try {
                let query = supabase
                    .from("inspection_photos")
                    .select(`
                        id,
                        checklist_item_id,
                        photo_url,
                        caption,
                        latitude,
                        longitude,
                        created_at,
                        uploaded_by:uploaded_by (id, full_name, email)
                    `)
                    .order("created_at", { ascending: false });

                if (initialUserId) {
                    // This filter is applied only on initial load based on prop
                    query = query.eq("uploaded_by", initialUserId);
                }

                // In the mock, we only run the .then() once
                const { data, error } = await query;
                if (error) throw error;

                // For the purpose of demonstration, ensure mock data includes all unique users
                const allUsers = [...new Set(data.map(p => p.uploaded_by))];
                setPhotos(data || []);
            } catch (err) {
                console.error("Gagal mengambil foto:", err);
                toast({
                    title: "Gagal memuat galeri foto (Mock)",
                    description: err.message,
                    status: "error",
                    duration: 4000,
                });
            } finally {
                setLoading(false);
            }
        };

        fetchPhotos();
    }, [initialUserId, toast]);

    // 🔍 Apply filters
    useEffect(() => {
        let result = photos;

        if (selectedUserId) {
            result = result.filter((p) => p.uploaded_by?.id === selectedUserId);
        }

        if (selectedChecklistId) {
            result = result.filter((p) => p.checklist_item_id === selectedChecklistId);
        }

        if (startDate) {
            result = result.filter((p) => new Date(p.uploaded_at) >= new Date(startDate));
        }

        if (endDate) {
            // Include photos uploaded up to the end of the selected day
            const endOfDay = new Date(endDate);
            endOfDay.setHours(23, 59, 59, 999);
            result = result.filter((p) => new Date(p.created_at || p.captured_at) <= endOfDay);
        }

        if (withLocation) {
            result = result.filter((p) => p.latitude && p.longitude);
        }

        setFilteredPhotos(result);
    }, [photos, selectedUserId, selectedChecklistId, startDate, endDate, withLocation]);

    // 🗑️ Delete photo
    const handleDeleteClick = (photo) => {
        setPhotoToDelete(photo);
        onOpen();
    };

    const confirmDelete = async () => {
        if (!photoToDelete) return;

        try {
            const filePath = photoToDelete.photo_url.split("/").pop();

            // Mock: Delete file from storage
            const { error: storageError } = await supabase.storage
                .from("inspection_photos")
                .remove([`photos/${filePath}`]);
            if (storageError) throw storageError;

            // Mock: Delete record from DB
            const { error: dbError } = await supabase
                .from("inspection_photos")
                .delete()
                .eq("id", photoToDelete.id);
            if (dbError) throw dbError;

            // Update local state
            setPhotos((prev) => prev.filter((p) => p.id !== photoToDelete.id));
            toast({
                title: "Foto berhasil dihapus (Mock)",
                status: "success",
                duration: 2000,
            });
        } catch (err) {
            console.error("Gagal menghapus foto:", err);
            toast({
                title: "Gagal menghapus foto (Mock)",
                description: err.message,
                status: "error",
                duration: 4000,
            });
        } finally {
            onClose();
            setPhotoToDelete(null);
        }
    };

    const resetFilters = () => {
        setSelectedUserId(initialUserId || "");
        setSelectedChecklistId(initialChecklistItemId || "");
        setStartDate("");
        setEndDate("");
        setWithLocation(false);
    };

    // ⏳ Loading state
    if (loading) {
        return (
            <Box className="p-6">
                <Skeleton height="40px" className="mb-4" />
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
                    {[...Array(8)].map((_, i) => (
                        <Skeleton key={i} height="200px" />
                    ))}
                </SimpleGrid>
            </Box>
        );
    }

    // Extract all unique users from photos for the User filter
    const uniqueUsers = useMemo(() => {
        const userMap = new Map();
        photos.forEach(p => {
            if (p.uploaded_by?.id) {
                userMap.set(p.uploaded_by.id, p.uploaded_by);
            }
        });
        return Array.from(userMap.values());
    }, [photos]);


    // 🖼️ Main render
    return (
        <VStack spacing={6} align="stretch" className="p-4 sm:p-6 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">Galeri Foto Inspeksi</h1>
            <Text className="text-gray-600">Telusuri dan saring semua foto yang diunggah.</Text>

            {/* Filter Controls */}
            <Card className="shadow-lg">
                <CardBody p={4}>
                    <HStack spacing={4} wrap="wrap">

                        {/* Filter User */}
                        <FormControl minW="200px">
                            <FormLabel fontSize="sm">Filter User</FormLabel>
                            <Select
                                size="sm"
                                value={selectedUserId}
                                onValueChange={setSelectedUserId}
                            >
                                <option value="">Semua User</option>
                                {/* Display users from fetched data */}
                                {uniqueUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.full_name || user.email || user.id}
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Filter Item Checklist */}
                        <FormControl minW="200px">
                            <FormLabel fontSize="sm">Filter Item Checklist</FormLabel>
                            <Select
                                size="sm"
                                value={selectedChecklistId}
                                onValueChange={setSelectedChecklistId}
                            >
                                <option value="">Semua Item</option>
                                {allChecklistItems.map((item) => (
                                    <option key={item.id} value={item.id}>
                                        {item.item_name} ({item.template_title})
                                    </option>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Tanggal Awal */}
                        <FormControl minW="150px">
                            <FormLabel fontSize="sm">Tanggal Awal</FormLabel>
                            <Input size="sm" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        </FormControl>

                        {/* Tanggal Akhir */}
                        <FormControl minW="150px">
                            <FormLabel fontSize="sm">Tanggal Akhir</FormLabel>
                            <Input size="sm" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                        </FormControl>

                        {/* Lokasi Checkbox */}
                        <Box className="flex flex-col justify-end pt-5">
                            <Checkbox
                                isChecked={withLocation}
                                onChange={(e) => setWithLocation(e.target.checked)}
                            >
                                Dengan GPS
                            </Checkbox>
                        </Box>

                        {/* Reset Button (Red border/text kept for action clarity) */}
                        <Box className="flex flex-col justify-end pt-5">
                            <Button
                                leftIcon={FiX}
                                size="sm"
                                variant="outline"
                                onClick={resetFilters}
                                // Tailored to use red outline theme
                                className="border-red-500 text-red-500 hover:bg-red-50"
                            >
                                Reset Filter
                            </Button>
                        </Box>
                    </HStack>
                </CardBody>
            </Card>

            {/* Photo Grid */}
            {filteredPhotos.length === 0 ? (
                <Box className="text-center py-10">
                    <FiInfo size="48" className="inline-block text-gray-400" />
                    <Text fontSize="lg" color="gray.500" mt={4}>
                        Tidak ada foto yang cocok dengan filter.
                    </Text>
                </Box>
            ) : (
                <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={4}>
                    {filteredPhotos.map((photo) => {
                        const checklistItem = allChecklistItems.find((item) => item.id === photo.checklist_item_id);
                        return (
                            <Card key={photo.id} className="overflow-hidden">
                                <CardBody p={0}>
                                    <Image
                                        src={photo.photo_url}
                                        alt={photo.caption || "Foto inspeksi"}
                                        borderRadius="md"
                                        objectFit="cover"
                                        height="200px"
                                        width="100%"
                                        className="h-48 w-full"
                                    />
                                    <Box p={3}>
                                        <Text fontSize="sm" fontWeight="bold" noOfLines={1} className="text-slate-900">
                                            {photo.caption || "Tanpa keterangan"}
                                        </Text>
                                        <Text fontSize="xs" color="gray.600" noOfLines={1} className="text-gray-600">
                                            {checklistItem?.item_name || photo.checklist_item_id}
                                        </Text>

                                        {/* Meta: Location */}
                                        <HStack fontSize="xs" className="text-gray-500 mt-1" spacing={1}>
                                            <FiMapPin className="h-3 w-3" />
                                            <Text fontSize="xs">
                                                {photo.latitude && photo.longitude
                                                    ? `${photo.latitude.toFixed(5)}, ${photo.longitude.toFixed(5)}`
                                                    : "Lokasi tidak tersedia"}
                                            </Text>
                                        </HStack>

                                        {/* Meta: User */}
                                        <HStack fontSize="xs" className="text-gray-500 mt-1" spacing={1}>
                                            <FiUser className="h-3 w-3" />
                                            <Text fontSize="xs" className="text-gray-500">
                                                {photo.uploaded_by?.full_name || photo.uploaded_by?.email || "Tidak dikenal"}
                                            </Text>
                                        </HStack>

                                        <HStack justify="space-between" className="mt-2">
                                            {/* Badge color uses slate theme */}
                                            <Badge colorScheme="slate" fontSize="xs">
                                                {checklistItem?.template_title || "N/A"}
                                            </Badge>
                                            <IconButton
                                                icon={FiTrash2}
                                                size="xs"
                                                colorScheme="red"
                                                onClick={() => handleDeleteClick(photo)}
                                                aria-label="Hapus Foto"
                                            />
                                        </HStack>
                                    </Box>
                                </CardBody>
                            </Card>
                        );
                    })}
                </SimpleGrid>
            )}

            {/* Modal Konfirmasi Hapus */}
            <Modal isOpen={isOpen} onClose={onClose}>
                <ModalHeader>Hapus Foto</ModalHeader>
                <ModalCloseButton onClick={onClose} />
                <ModalBody>
                    <Text className="text-base text-gray-700">
                        Apakah kamu yakin ingin menghapus foto ini?
                        <br />
                        <strong className="font-semibold text-slate-900">{photoToDelete?.caption || "Tanpa keterangan"}</strong>
                    </Text>
                </ModalBody>
                <ModalFooter>
                    <Button variant="outline" onClick={onClose} className="border-gray-300 text-gray-700 hover:bg-gray-100">
                        Batal
                    </Button>
                    <Button colorScheme="red" onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                        Hapus
                    </Button>
                </ModalFooter>
            </Modal>
        </VStack>
    );
};

export default PhotoGallery;
