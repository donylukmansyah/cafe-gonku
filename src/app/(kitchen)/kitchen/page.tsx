"use client";

import { Suspense } from "react";
import { KitchenPageSkeleton } from "@/app/(kitchen)/kitchen/_components/kitchen-skeleton";
import { KitchenDashboardContent } from "@/app/(kitchen)/kitchen/_components/kitchen-dashboard";

export default function KitchenPage() {
    return (
        <Suspense fallback={<KitchenPageSkeleton />}>
            <KitchenDashboardContent />
        </Suspense>
    );
}
