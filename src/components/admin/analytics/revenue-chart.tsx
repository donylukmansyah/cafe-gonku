"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts"

interface RevenueChartProps {
    data: {
        date: string
        revenue: number
        orders: number
    }[]
}

export function RevenueChart({ data }: RevenueChartProps) {
    return (
        <Card className="bg-zinc-900/40 backdrop-blur-md border-white/5 shadow-2xl overflow-hidden ring-1 ring-white/5">
            <CardHeader className="border-b border-white/[0.02] pb-6">
                <CardTitle className="text-white text-lg font-bold">Trend Pendapatan</CardTitle>
                <CardDescription className="text-zinc-500 text-sm">Visualisasi pendapatan harian</CardDescription>
            </CardHeader>
            <CardContent className="pt-8">
                <div className="h-[340px] w-full pr-4">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" />
                            <XAxis
                                dataKey="date"
                                stroke="#52525b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#71717a' }}
                                dy={10}
                            />
                            <YAxis
                                stroke="#52525b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fill: '#71717a' }}
                                tickFormatter={(value) => `Rp${value >= 1000 ? (value / 1000) + 'k' : value}`}
                            />
                            <Tooltip
                                formatter={(value?: number) => [`Rp ${value?.toLocaleString("id-ID") ?? "0"}`, "Pendapatan"]}
                                cursor={{ fill: "rgba(255, 255, 255, 0.03)" }}
                                contentStyle={{
                                    backgroundColor: "rgba(9, 9, 11, 0.95)", // zinc-950 deep
                                    borderColor: "rgba(255, 255, 255, 0.1)",
                                    borderRadius: "16px",
                                    color: "#fff",
                                    backdropFilter: "blur(12px)",
                                    boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)",
                                    border: "1px solid rgba(255,255,255,0.05)",
                                    padding: "12px 16px"
                                }}
                                itemStyle={{ color: "#2EFE3C", fontWeight: "bold" }}
                                labelStyle={{ color: "#71717a", marginBottom: "4px", fontSize: "12px", fontWeight: "bold" }}
                            />
                            <Bar
                                dataKey="revenue"
                                fill="url(#barGradient)"
                                radius={[6, 6, 0, 0]}
                                barSize={40}
                            />
                            <defs>
                                <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#2EFE3C" stopOpacity={0.8} />
                                    <stop offset="100%" stopColor="#2EFE3C" stopOpacity={0.2} />
                                </linearGradient>
                            </defs>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}
