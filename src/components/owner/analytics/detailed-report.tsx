"use client";

import { memo, useMemo } from "react";

interface DetailedReportProps {
    allMenuSales: {
        name: string;
        quantity: number;
        category: string;
    }[];
}

export const DetailedReport = memo(function DetailedReport({ allMenuSales }: DetailedReportProps) {
    const totalItemsSold = useMemo(() => {
        return allMenuSales.reduce((acc, item) => acc + item.quantity, 0);
    }, [allMenuSales]);

    if (!allMenuSales || allMenuSales.length === 0) {
        return null;
    }

    const categoryMap: Record<string, string> = {
        FOOD: "Makanan",
        DRINK: "Minuman",
        SNACK: "Cemilan",
        DESSERT: "Dessert",
    };

    return (
        <div className="print-detailed-report">
            {/* Section Header */}
            <div style={{ borderBottom: "3px solid black", paddingBottom: "6px", marginBottom: "10px" }}>
                <h2 style={{ fontSize: "16px", fontWeight: 800, margin: 0, letterSpacing: "-0.01em" }}>
                    Detail Penjualan Menu
                </h2>
                <p style={{ fontSize: "10px", color: "#777", margin: "2px 0 0 0" }}>
                    Rincian seluruh menu yang terjual pada periode laporan
                </p>
            </div>
            
            <table style={{ width: "100%", textAlign: "left", fontSize: "11px", borderCollapse: "collapse" }}>
                <thead>
                    <tr style={{ borderBottom: "2px solid black", backgroundColor: "#f9f9f9" }}>
                        <th style={{ padding: "7px 8px", fontWeight: 700, width: "35px", textAlign: "center" }}>No</th>
                        <th style={{ padding: "7px 8px", fontWeight: 700 }}>Nama Menu</th>
                        <th style={{ padding: "7px 8px", fontWeight: 700, width: "90px" }}>Kategori</th>
                        <th style={{ padding: "7px 8px", fontWeight: 700, textAlign: "right", width: "80px" }}>Qty</th>
                    </tr>
                </thead>
                <tbody>
                    {allMenuSales.map((item, index) => (
                        <tr 
                            key={item.name} 
                            style={{ 
                                borderBottom: "1px solid #e5e5e5",
                                backgroundColor: index % 2 === 1 ? "#fafafa" : "transparent"
                            }}
                        >
                            <td style={{ padding: "5px 8px", textAlign: "center", color: "#999", fontSize: "10px" }}>{index + 1}</td>
                            <td style={{ padding: "5px 8px", fontWeight: 500 }}>{item.name}</td>
                            <td style={{ padding: "5px 8px" }}>
                                <span style={{ 
                                    backgroundColor: "#eee", 
                                    padding: "1px 6px", 
                                    borderRadius: "3px", 
                                    fontSize: "9px",
                                    fontWeight: 600,
                                    textTransform: "uppercase",
                                    letterSpacing: "0.03em"
                                }}>
                                    {categoryMap[item.category] ?? item.category}
                                </span>
                            </td>
                            <td style={{ padding: "5px 8px", textAlign: "right", fontWeight: 700, fontSize: "12px" }}>{item.quantity}</td>
                        </tr>
                    ))}
                </tbody>
                <tfoot>
                    <tr style={{ borderTop: "2px solid black", backgroundColor: "#f5f5f5" }}>
                        <td colSpan={3} style={{ padding: "8px", textAlign: "right", fontWeight: 700, fontSize: "10px", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                            Total Item Terjual
                        </td>
                        <td style={{ padding: "8px", textAlign: "right", fontWeight: 900, fontSize: "15px" }}>
                            {totalItemsSold}
                        </td>
                    </tr>
                </tfoot>
            </table>
        </div>
    );
});
