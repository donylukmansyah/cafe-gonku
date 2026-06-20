# Manual Test Checklist

Use this before demo/deploy. Test with fresh browser session and kitchen/owner logged in.

## 1. Customer menu

- Open table QR URL: `/t/[qrCode]`
- Confirm first menus load.
- Click `Load More`.
- Search menu name.
- Filter category.
- Confirm skeleton appears while filter/search loads.
- Confirm archived menu does not appear.
- Confirm long menu names clamp to max 2 lines.

Expected:

- Menu list correct.
- No blank/error state.
- Search/filter results come from server.

## 2. Owner menu

- Open `/owner/menus`.
- Confirm pagination works.
- Search menu.
- Filter category/status.
- Delete/archive one menu.
- Confirm menu disappears from default owner menu list.
- Confirm same menu disappears from customer menu.
- Optional: filter `INACTIVE` to see archived menu.

Expected:

- Delete means soft archive: `isActive=false`, `isAvailable=false`.
- Order history stays safe.

## 3. Customer checkout normal payment

- Add menu to cart.
- Checkout.
- Confirm Doku checkout opens.
- Complete payment in sandbox.
- Return to app.

Expected:

- Customer tracking becomes paid/lunas.
- Kitchen gets new paid order.
- Owner dashboard order/revenue updates after cache refresh.

## 4. Payment fallback

- Pay order, then return to app quickly.
- Keep customer tracking open.

Expected:

- If webhook is delayed, `check-payment` fallback updates payment.
- No duplicate paid status.

## 5. Kitchen order flow

- Open `/kitchen` as KITCHEN/OWNER.
- Confirm paid order appears.
- Move status: `PAID -> PREPARING -> READY -> SERVED`.

Expected:

- Kitchen UI updates.
- Customer tracking receives status updates.
- Served order leaves active queue / appears in history according to UI.

## 6. Cancel pending order

- Create order but do not pay.
- Open tracking sheet.
- Click cancel.

Expected:

- Order becomes cancelled.
- Kitchen does not receive unpaid order.
- Customer can create new order.

## 7. Expired payment UI

Use SQL/dev DB for faster test:

```sql
update orders
set "paymentExpiresAt" = now() - interval '1 minute'
where "orderCode" = 'GONKU-...';
```

- Open customer tracking.

Expected:

- Expired warning appears.
- `Bayar Sekarang` disabled.
- Button text becomes `Waktu Habis`.

## 8. Late payment guard

Simulate gateway/check-payment returning paid after expiry, or test with gateway sandbox if possible.

Expected:

- Order does not become `PAID`.
- No kitchen broadcast.
- `OrderLog` contains `Late payment ignored...`.
- Owner dashboard shows `Late Payment Alert`.

## 9. Realtime fallback

- Temporarily block/interrupt Supabase connection if possible, or just observe normal flow.
- Trigger payment/status update.

Expected:

- Realtime updates when connected.
- Polling/refetch catches up if realtime misses event.

## 10. Rate limit sanity

- Try checkout from different tables on same network.

Expected:

- Different tables should not block each other quickly.
- Same table rapid repeated checkout should be limited/guarded.

## 11. Error log check

Watch terminal/server logs while testing.

Expected:

- No unexpected `500`.
- No Prisma field errors.
- No repeated payment sync failures except expected gateway sandbox errors.
