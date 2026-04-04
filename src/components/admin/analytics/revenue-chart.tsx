"use client";

import { memo } from "react";
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

type RevenueChartDatum = {
    date: string;
    onlineRevenue: number;
    cashRevenue: number;
    totalRevenue: number;
    orders: number;
};

interface RevenueChartProps {
    data: RevenueChartDatum[];
}

export const RevenueChart = memo(function RevenueChart({ data }: RevenueChartProps) {
    return (
        <Card className="bg-zinc-900 shadow-2xl border-white/5 overflow-hidden group">
            <CardHeader className="pb-2">
                <CardTitle className="text-xl text-white">Revenue Analysis</CardTitle>
                <CardDescription className="text-zinc-500">
                    Tren pendapatan kotor selama periode yang dipilih.
                </CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <defs>
                            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="oklch(0.4 0 0)" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="oklch(0.4 0 0)" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                        <XAxis
                            dataKey="date"
                            stroke="#52525b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            dy={10}
                        />
                        <YAxis
                            stroke="#52525b"
                            fontSize={12}
                            tickLine={false}
                            axisLine={false}
                            tickFormatter={(value) => `Rp ${value.toLocaleString()}`}
                        />
                        <Tooltip
                            contentStyle={{
                                backgroundColor: "#18181b",
                                border: "1px solid rgba(255,255,255,0.1)",
                                borderRadius: "12px",
                                color: "#fff"
                            }}
                            formatter={(_, __, item: { payload?: RevenueChartDatum }) => {
                                if (!item?.payload) return [];

                                return [
                                    `Rp ${item.payload.totalRevenue.toLocaleString("id-ID")}`,
                                    "Total Income",
                                ];
                            }}
                            labelFormatter={(label, payload) => {
                                const point = payload?.[0]?.payload as RevenueChartDatum | undefined;
                                const labelText =
                                    typeof label === "string" || typeof label === "number"
                                        ? String(label)
                                        : "";

                                if (!point) return labelText || label;

                                return `${labelText} • QR Rp ${point.onlineRevenue.toLocaleString("id-ID")} • Cash Rp ${point.cashRevenue.toLocaleString("id-ID")} • ${point.orders} order`;
                            }}
                        />
                        <Area
                            type="monotone"
                            dataKey="totalRevenue"
                            stroke="oklch(0.4 0 0)"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorRevenue)"
                            animationDuration={1500}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    );
});
