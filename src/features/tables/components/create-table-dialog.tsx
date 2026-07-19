"use client"

import { Loader2 } from "lucide-react"
import { type Resolver, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form"

const formSchema = z.object({
    tableNumber: z.coerce
        .number()
        .min(1, "Nomor meja harus lebih dari 0")
        .int("Nomor meja harus bilangan bulat"),
    capacity: z.coerce
        .number()
        .min(1, "Kapasitas minimal 1 orang")
        .int()
        .default(4),
})

type FormValues = z.infer<typeof formSchema>

interface CreateTableDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSubmit: (values: FormValues) => Promise<void>
    existingTables: { tableNumber: number }[]
}

export function CreateTableDialog({
    open,
    onOpenChange,
    onSubmit,
    existingTables,
}: CreateTableDialogProps) {
    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema) as unknown as Resolver<FormValues>,
        defaultValues: {
            tableNumber: 0,
            capacity: 4,
        },
    })

    const handleFormSubmit = async (values: FormValues) => {
        const isDuplicate = existingTables.some((t) => t.tableNumber === values.tableNumber)

        if (isDuplicate) {
            form.setError("tableNumber", {
                type: "manual",
                message: `Meja nomor ${values.tableNumber} sudah ada.`,
            })
            return
        }

        await onSubmit(values)
        form.reset()
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="bg-zinc-900 border-white/10 text-zinc-300">
                <DialogHeader>
                    <DialogTitle className="text-white text-xl">Tambah Meja Baru</DialogTitle>
                    <DialogDescription className="text-zinc-500">
                        QR code akan digenerate otomatis untuk pelanggan scan.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 pt-4">
                        <FormField
                            control={form.control}
                            name="tableNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-zinc-400">Nomor Meja</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Contoh: 11"
                                            className="bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl h-11"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-400" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="capacity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-zinc-400">Kapasitas (orang)</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="Contoh: 4"
                                            className="bg-black/40 border-white/10 focus:border-primary/50 focus:ring-primary/20 transition-all rounded-xl h-11"
                                            {...field}
                                            onChange={(e) => field.onChange(e.target.valueAsNumber)}
                                            value={field.value || ''}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-red-400" />
                                </FormItem>
                            )}
                        />

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                className="border-white/10 hover:bg-white/5 hover:text-white rounded-xl h-11 flex-1 cursor-pointer"
                                onClick={() => onOpenChange(false)}
                            >
                                Batal
                            </Button>
                            <Button
                                type="submit"
                                className="bg-primary hover:bg-primary/90 text-black font-bold rounded-xl h-11 flex-1 shadow-[0_0_20px_rgba(53,183,24,0.2)] cursor-pointer"
                                disabled={form.formState.isSubmitting}
                            >
                                {form.formState.isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Buat Meja"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}
