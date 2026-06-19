import { type Control, type UseFormRegister, useFieldArray, Controller } from "react-hook-form"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Plus, Trash2, X } from "lucide-react"
import { formatNumber } from "@/lib/utils"
import type { CreateMenuFormInput } from "@/validations/menu"

export function OptionField({
    index,
    control,
    register,
    onRemove,
}: {
    index: number
    control: Control<CreateMenuFormInput>
    register: UseFormRegister<CreateMenuFormInput>
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
