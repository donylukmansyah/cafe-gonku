import { prisma } from "@/lib/prisma";
import crypto from "crypto";
import { cookies } from "next/headers";

export class OrderAccessError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "OrderAccessError";
    this.status = status;
  }
}

const ORDER_TOKEN_COOKIE = "gonku-order-token";
const COOKIE_MAX_AGE = 60 * 60 * 24;

export function generateOrderAccessToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

export async function setOrderTokenCookie(orderCode: string, token: string) {
  const cookieStore = await cookies();
  cookieStore.set(`${ORDER_TOKEN_COOKIE}:${orderCode}`, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: COOKIE_MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  });
}

export function extractOrderToken(request: Request): string | null {
  return request.headers.get("x-order-token");
}

async function extractOrderTokenFromCookie(orderCode: string): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    return cookieStore.get(`${ORDER_TOKEN_COOKIE}:${orderCode}`)?.value ?? null;
  } catch {
    return null;
  }
}

function timingSafeTokenCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function validateOrderAccess(request: Request, idOrCode: string) {
  const headerToken = extractOrderToken(request);

  const order = await prisma.order.findFirst({
    where: {
      OR: [
        { id: idOrCode },
        { orderCode: idOrCode },
      ],
    },
    select: {
      id: true,
      orderCode: true,
      accessToken: true,
    },
  });

  if (!order) {
    throw new OrderAccessError("Order not found", 404);
  }

  const cookieToken = await extractOrderTokenFromCookie(order.orderCode);
  const token = headerToken || cookieToken;

  if (!token) {
    throw new OrderAccessError("Missing access token", 401);
  }

  if (!timingSafeTokenCompare(order.accessToken, token)) {
    throw new OrderAccessError("Invalid access token", 403);
  }

  return order;
}
