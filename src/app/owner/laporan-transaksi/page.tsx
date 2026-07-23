import { OwnerReportsPage, type OwnerReportTab } from "@/features/analytics/components/owner-reports-page";

export default async function ReportsAndTransactionsPage({
    searchParams,
}: {
    searchParams: Promise<{ tab?: string }>;
}) {
    const { tab } = await searchParams;
    const initialTab: OwnerReportTab = tab === "riwayat" ? "riwayat" : "laporan";

    return <OwnerReportsPage initialTab={initialTab} />;
}
