"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useForm, useFieldArray, Controller, type Control, type UseFormRegister } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { createMenuSchema, type CreateMenuInput } from "@/validations/menu"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react"
import { toast } from "sonner"
import Image from "next/image"
import { formatNumber } from "@/lib/utils"

type MenuFormProps = {
    initialData?: CreateMenuInput & { id?: string }
    isEdit?: boolean
}

const categories = [
    { value: "FOOD", label: "Makanan" },
    { value: "DRINK", label: "Minuman" },
    { value: "SNACK", label: "Cemilan" },
    { value: "DESSERT", label: "Dessert" },
]

export function MenuForm({ initialData, isEdit = false }: MenuFormProps) {
    const router = useRouter()
    const [isLoading, setIsLoading] = useState(false)
    const [isUploading, setIsUploading] = useState(false)
    const [imagePreview, setImagePreview] = useState<string | null>(
        initialData?.imageUrl || null
    )

    // Price display state
    const [displayPrice, setDisplayPrice] = useState("")

    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        formState: { errors },
    } = useForm({
        resolver: zodResolver(createMenuSchema),
        defaultValues: initialData || {
            name: "",
            description: "",
            price: 0,
            category: "FOOD",
            isAvailable: true,
            menuOptions: [],
        },
    })

    // Initialize display price
    useEffect(() => {
        if (initialData?.price) {
            setDisplayPrice(formatNumber(initialData.price))
        }
    }, [initialData])

    const {
        fields: optionFields,
        append: appendOption,
        remove: removeOption,
    } = useFieldArray({
        control,
        name: "menuOptions",
    })

    const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value.replace(/\./g, "")
        if (value === "" || /^\d+$/.test(value)) {
            const numericValue = value === "" ? 0 : parseInt(value, 10)
            setValue("price", numericValue, { shouldValidate: true }) // Update form value
            setDisplayPrice(value === "" ? "" : formatNumber(numericValue)) // Update display
        }
    }

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        setIsUploading(true)
        try {
            const formData = new FormData()
            formData.append("file", file)

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Upload failed")
            }

            const data = await res.json()
            setValue("imageUrl", data.url)
            setImagePreview(data.url)
            toast.success("Gambar berhasil diupload")
        } catch (error) {
            toast.error(error instanceof Error ? error.message : "Gagal upload gambar")
        } finally {
            setIsUploading(false)
        }
    }

    const onSubmit = async (data: CreateMenuInput) => {
        setIsLoading(true)
        try {
            const url = isEdit ? `/api/menus/${initialData?.id}` : "/api/menus"
            const method = isEdit ? "PATCH" : "POST"

            const res = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            })

            if (!res.ok) {
                const error = await res.json()
                throw new Error(error.error || "Failed to save")
            }

            toast.success(isEdit ? "Menu berhasil diupdate" : "Menu berhasil dibuat")
            router.push("/admin/menus") // Corrected path
            router.refresh()
        } catch (error) {
            console.error(error)
            toast.error(error instanceof Error ? error.message : "Gagal menyimpan menu")
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
                {/* Basic Info */}
                <Card className="bg-zinc-900/40 backdrop-blur-sm border-white/5 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white">Informasi Menu</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nama Menu *</Label>
                            <Input
                                id="name"
                                placeholder="Contoh: Nasi Goreng Spesial"
                                {...register("name")}
                            />
                            {errors.name && (
                                <p className="text-sm text-red-500">{errors.name.message}</p>
                            )}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="description">Deskripsi</Label>
                            <Textarea
                                id="description"
                                placeholder="Deskripsi singkat menu..."
                                {...register("description")}
                            />
                        </div>

                        <div className="grid gap-4 grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="price">Harga (Rp) *</Label>
                                <Input
                                    id="price"
                                    type="text"
                                    placeholder="25.000"
                                    value={displayPrice}
                                    onChange={handlePriceChange}
                                />
                                {errors.price && (
                                    <p className="text-sm text-red-500">{errors.price.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label>Kategori *</Label>
                                <Controller
                                    control={control}
                                    name="category"
                                    render={({ field }) => (
                                        <Select
                                            value={field.value}
                                            onValueChange={field.onChange}
                                        >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {categories.map((cat) => (
                                                    <SelectItem key={cat.value} value={cat.value}>
                                                        {cat.label}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                                <Label>Tersedia</Label>
                                <p className="text-sm text-muted-foreground">
                                    Menu ditampilkan ke customer
                                </p>
                            </div>
                            <Controller
                                control={control}
                                name="isAvailable"
                                render={({ field }) => (
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* Image Upload */}
                <Card className="bg-zinc-900/40 backdrop-blur-sm border-white/5 shadow-xl">
                    <CardHeader>
                        <CardTitle className="text-white">Gambar Menu</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {imagePreview ? (
                                <div className="relative aspect-video rounded-lg overflow-hidden bg-gray-100 group">
                                    <Image
                                        src={imagePreview}
                                        alt="Preview"
                                        fill
                                        className="object-cover"
                                    />
                                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                        <Button
                                            type="button"
                                            variant="destructive"
                                            size="sm"
                                            onClick={() => {
                                                setImagePreview(null)
                                                setValue("imageUrl", undefined)
                                            }}
                                        >
                                            <Trash2 className="w-4 h-4 mr-2" />
                                            Hapus Gambar
                                        </Button>
                                    </div>
                                </div>
                            ) : (
                                <label className={`flex flex-col items-center justify-center aspect-video border-2 border-dashed border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                        disabled={isUploading}
                                    />
                                    {isUploading ? (
                                        <div className="flex flex-col items-center">
                                            <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                                            <p className="text-sm text-zinc-400">Mengupload...</p>
                                        </div>
                                    ) : (
                                        <>
                                            <Upload className="w-8 h-8 text-zinc-400 mb-2" />
                                            <p className="text-sm text-zinc-400">
                                                Klik untuk upload gambar
                                            </p>
                                            <p className="text-xs text-zinc-500 mt-1">
                                                Max 5MB (JPEG, PNG, WebP)
                                            </p>
                                        </>
                                    )}
                                </label>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Menu Options */}
            <Card className="bg-zinc-900/40 backdrop-blur-sm border-white/5 shadow-xl">
                <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-white">Opsi Menu (Opsional)</CardTitle>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                            appendOption({
                                name: "",
                                isRequired: true,
                                values: [{ label: "", priceAdjust: 0 }],
                            })
                        }
                    >
                        <Plus className="w-4 h-4 mr-2" />
                        Tambah Opsi
                    </Button>
                </CardHeader>
                <CardContent>
                    {optionFields.length === 0 ? (
                        <p className="text-center py-8 text-muted-foreground">
                            Belum ada opsi. Tambahkan opsi seperti "Level Pedas" atau "Ukuran".
                        </p>
                    ) : (
                        <div className="space-y-6">
                            {optionFields.map((option, optionIndex) => (
                                <OptionField
                                    key={option.id}
                                    index={optionIndex}
                                    control={control}
                                    register={register}
                                    onRemove={() => removeOption(optionIndex)}
                                />
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Actions */}
            <div className="flex justify-end gap-4">
                <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    disabled={isLoading}
                >
                    Batal
                </Button>
                <Button
                    type="submit"
                    className="bg-primary hover:bg-primary/90 text-black font-bold"
                    disabled={isLoading}
                >
                    {isLoading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : isEdit ? (
                        "Simpan Perubahan"
                    ) : (
                        "Buat Menu"
                    )}
                </Button>
            </div>
        </form>
    )
}

// Option Field Component
function OptionField({
    index,
    control,
    register,
    onRemove,
}: {
    index: number
    control: Control<CreateMenuInput>
    register: UseFormRegister<CreateMenuInput>
    onRemove: () => void
}) {
    const {
        fields: valueFields,
        append: appendValue,
        remove: removeValue,
    } = useFieldArray({
        control,
        name: `menuOptions.${index}.values`,
    })

    return (
        <div className="border border-white/10 rounded-lg p-4 space-y-4 bg-zinc-950/20">
            <div className="flex items-start justify-between gap-4">
                <input type="hidden" {...register(`menuOptions.${index}.id`)} />
                <div className="flex-1 grid gap-4 grid-cols-2">
                    <div className="space-y-2">
                        <Label>Nama Opsi</Label>
                        <Input
                            placeholder="Contoh: Level Pedas"
                            {...register(`menuOptions.${index}.name`)}
                        />
                    </div>
                    <div className="flex items-center gap-4 pt-8">
                        <Controller
                            control={control}
                            name={`menuOptions.${index}.isRequired`}
                            render={({ field }) => (
                                <div className="flex items-center gap-2">
                                    <Switch
                                        checked={field.value}
                                        onCheckedChange={field.onChange}
                                    />
                                    <Label className="text-sm">Wajib dipilih</Label>
                                </div>
                            )}
                        />
                    </div>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                    onClick={onRemove}
                >
                    <Trash2 className="w-4 h-4" />
                </Button>
            </div>

            {/* Values */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <Label className="text-sm text-zinc-400">Pilihan</Label>
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => appendValue({ label: "", priceAdjust: 0 })}
                    >
                        <Plus className="w-3 h-3 mr-1" />
                        Tambah
                    </Button>
                </div>
                <div className="space-y-2">
                    {valueFields.map((value, valueIndex) => (
                        <div key={value.id} className="flex items-center gap-2">
                            <input type="hidden" {...register(`menuOptions.${index}.values.${valueIndex}.id`)} />
                            <Input
                                placeholder="Label (contoh: Level 5)"
                                className="flex-1"
                                {...register(`menuOptions.${index}.values.${valueIndex}.label`)}
                            />
                            {/* Option Price Adjustment */}
                            <Controller
                                control={control}
                                name={`menuOptions.${index}.values.${valueIndex}.priceAdjust`}
                                render={({ field: { value, onChange } }) => (
                                    <div className="relative w-24">
                                        <Input
                                            type="text"
                                            placeholder="+0"
                                            value={value ? formatNumber(value) : ""}
                                            onChange={(e) => {
                                                const val = e.target.value.replace(/\./g, "")
                                                if (val === "" || /^\d+$/.test(val)) {
                                                    onChange(val === "" ? 0 : parseInt(val, 10))
                                                }
                                            }}
                                            className="pr-8"
                                        />
                                    </div>
                                )}
                            />
                            <span className="text-sm text-muted-foreground w-8">Rp</span>
                            {valueFields.length > 1 && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => removeValue(valueIndex)}
                                >
                                    <X className="w-4 h-4" />
                                </Button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
