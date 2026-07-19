"use client";

const COOKIE_NAME = "cafe-gonku-order";
const TABLE_COOKIE_NAME = "cafe-gonku-table";
const MAX_AGE = 60 * 60 * 24;

interface OrderCookieData {
    orderCode: string;
    accessToken: string;
}

export function setOrderCookie(orderCode: string, accessToken: string) {
    const value = JSON.stringify({ orderCode, accessToken });
    document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function getOrderCookie(): OrderCookieData | null {
    const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${COOKIE_NAME}=`));
    if (!match) return null;
    try {
        const raw = decodeURIComponent(match.split("=").slice(1).join("="));
        const parsed = JSON.parse(raw);
        if (parsed?.orderCode && parsed?.accessToken) return parsed;
        return null;
    } catch {
        return null;
    }
}

export function clearOrderCookie() {
    document.cookie = `${COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
}

export function setTableCookie(qrCode: string) {
    document.cookie = `${TABLE_COOKIE_NAME}=${encodeURIComponent(qrCode)}; path=/; max-age=${MAX_AGE}; SameSite=Lax`;
}

export function getTableCookie() {
    const match = document.cookie
        .split("; ")
        .find((row) => row.startsWith(`${TABLE_COOKIE_NAME}=`));

    return match ? decodeURIComponent(match.split("=").slice(1).join("=")) : null;
}
