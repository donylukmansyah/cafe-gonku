import { MenuForm } from "@/features/menus/components/owner/menu-form"

export default function NewMenuPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Tambah Menu Baru</h1>
                <p className="text-muted-foreground">
                    Buat menu makanan atau minuman baru
                </p>
            </div>

            <MenuForm />
        </div>
    )
}
