"use client"

import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface MenuFiltersProps {
    searchQuery: string
    onSearchChange: (value: string) => void
    selectedCategory: string
    onCategoryChange: (value: string) => void
}

const categories = [
    { value: "all", label: "Semua Kategori" },
    { value: "FOOD", label: "Makanan" },
    { value: "DRINK", label: "Minuman" },
    { value: "SNACK", label: "Cemilan" },
    { value: "DESSERT", label: "Dessert" },
]

export function MenuFilters({
    searchQuery,
    onSearchChange,
    selectedCategory,
    onCategoryChange,
}: MenuFiltersProps) {
    return (
        <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1 group">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Cari menu..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 bg-zinc-900/40 border-white/5 focus:border-primary/30 focus:ring-primary/20 transition-all rounded-xl"
                />
            </div>
            <div className="w-full md:w-64">
                <Select value={selectedCategory} onValueChange={onCategoryChange}>
                    <SelectTrigger className="bg-zinc-900/40 border-white/5 focus:border-primary/30 focus:ring-primary/20 transition-all rounded-xl text-zinc-300 cursor-pointer">
                        <SelectValue placeholder="Pilih Kategori" />
                    </SelectTrigger>
                    <SelectContent className="bg-zinc-900 border-white/10 text-zinc-300">
                        {categories.map((cat) => (
                            <SelectItem
                                key={cat.value}
                                value={cat.value}
                                className="focus:bg-white/5 focus:text-white cursor-pointer"
                            >
                                {cat.label}
                            </SelectItem>
                        ))}
                    </SelectContent>
                </Select>
            </div>
        </div>
    )
}
