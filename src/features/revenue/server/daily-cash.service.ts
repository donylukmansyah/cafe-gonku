import { prisma } from "@/server/db/prisma";
import { bumpCacheVersion } from "@/server/cache/redis";
import {
  getCafeDateKey,
  getCafeDateLabel,
  parseDateOnly,
} from "@/shared/cafe-date";
import type { DailyCashEntryInput } from "@/features/revenue/schema";

function serializeCashRecord(record: {
  id: string;
  date: Date;
  amount: number;
  notes: string | null;
  recordedBy: string | null;
  updatedAt: Date;
}) {
  const dateKey = getCafeDateKey(record.date);

  return {
    id: record.id,
    date: dateKey,
    label: getCafeDateLabel(dateKey),
    amount: record.amount,
    notes: record.notes,
    recordedBy: record.recordedBy,
    updatedAt: record.updatedAt.toISOString(),
  };
}

export class DailyCashService {
  static async getDailyEntry(dateKey = getCafeDateKey()) {
    const record = await prisma.dailyCashRecord.findUnique({
      where: {
        date: parseDateOnly(dateKey),
      },
    });

    return record ? serializeCashRecord(record) : null;
  }

  static async getRecentEntries(limit = 7) {
    const records = await prisma.dailyCashRecord.findMany({
      orderBy: {
        date: "desc",
      },
      take: limit,
      select: {
        id: true,
        date: true,
        amount: true,
        notes: true,
        recordedBy: true,
        updatedAt: true,
      },
    });

    return records.map(serializeCashRecord);
  }

  static async upsertDailyEntry(
    payload: DailyCashEntryInput & { recordedBy?: string | null },
  ) {
    const dateKey = payload.date ?? getCafeDateKey();

    const record = await prisma.dailyCashRecord.upsert({
      where: {
        date: parseDateOnly(dateKey),
      },
      update: {
        amount: payload.amount,
        notes: payload.notes ?? null,
        recordedBy: payload.recordedBy ?? null,
      },
      create: {
        date: parseDateOnly(dateKey),
        amount: payload.amount,
        notes: payload.notes ?? null,
        recordedBy: payload.recordedBy ?? null,
      },
    });

    await bumpCacheVersion("analytics");

    return serializeCashRecord(record);
  }
}
