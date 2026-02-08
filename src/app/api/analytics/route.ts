import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { auth } from "@/lib/auth"
import { headers } from "next/headers"
import { startOfDay, subDays, format } from "date-fns"
import { handleApiError } from "@/lib/api-utils"

export async function GET(request: NextRequest) {
    try {
        // ... (auth check remains)
        const session = await auth.api.getSession({
            headers: await headers(),
        })

        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
        }

        const user = session.user as { role?: string }
        if (user.role !== "ADMIN") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 })
        }

        // ... (data fetching and processing remains)
        const { searchParams } = new URL(request.url)
        const days = parseInt(searchParams.get("days") || "7")

        const endDate = new Date()
        const startDate = startOfDay(subDays(endDate, days - 1))

        const orders = await prisma.order.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate,
                },
                paymentStatus: "PAID",
            },
            select: {
                createdAt: true,
                totalAmount: true,
                orderItems: {
                    select: {
                        quantity: true,
                        menu: {
                            select: {
                                name: true,
                                category: true
                            }
                        }
                    }
                }
            },
        })

        const salesByDate = new Map<string, { date: string; revenue: number; orders: number }>()
        const topMenus = new Map<string, { name: string; quantity: number; category: string }>()

        for (let i = 0; i < days; i++) {
            const date = subDays(endDate, i)
            const dateStr = format(date, "dd MMM")
            salesByDate.set(dateStr, { date: dateStr, revenue: 0, orders: 0 })
        }

        orders.forEach(order => {
            const dateStr = format(order.createdAt, "dd MMM")
            const current = salesByDate.get(dateStr) || { date: dateStr, revenue: 0, orders: 0 }

            salesByDate.set(dateStr, {
                date: dateStr,
                revenue: current.revenue + order.totalAmount,
                orders: current.orders + 1
            })

            order.orderItems.forEach(item => {
                const menuName = item.menu.name
                const currentMenu = topMenus.get(menuName) || { name: menuName, quantity: 0, category: item.menu.category }

                topMenus.set(menuName, {
                    ...currentMenu,
                    quantity: currentMenu.quantity + item.quantity
                })
            })
        })

        const dates = Array.from(salesByDate.keys()).reverse()
        const chartData = dates.map(date => salesByDate.get(date))

        const topSellingMenus = Array.from(topMenus.values())
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 5)

        return NextResponse.json({
            chartData,
            topMenus: topSellingMenus,
            totalRevenue: orders.reduce((sum, order) => sum + order.totalAmount, 0),
            totalOrders: orders.length,
        })

    } catch (error) {
        return handleApiError(error)
    }
}
