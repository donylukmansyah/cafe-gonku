async function main() {
const { createClient } = await import("@supabase/supabase-js");
await import("dotenv/config");

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase environment variables for payment E2E test.");
    process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function simulateCustomerPolling() {
    console.log(`[${new Date().toISOString()}] Kitchen: Subscribing to kitchen-updates...`);

    let receivedTimestamp = null;
    let paymentSuccessTimestamp = null;

    // Kitchen UI
    supabase.channel("kitchen-updates").on("broadcast", { event: "refresh-orders" }, () => {
        receivedTimestamp = Date.now();
        console.log(`[${new Date().toISOString()}] Kitchen: 🟢 RECEIVED Broadcast!`);
        if (paymentSuccessTimestamp) {
            console.log(`Latency from Payment Success -> Kitchen: ${receivedTimestamp - paymentSuccessTimestamp}ms`);
        }
        process.exit(0);
    }).subscribe();

    // Customer UI
    await new Promise(r => setTimeout(r, 2000)); // wait for sub

    console.log(`[${new Date().toISOString()}] Customer: Clicks 'Confirm Payment' on Midtrans`);
    paymentSuccessTimestamp = Date.now();

    console.log(`[${new Date().toISOString()}] Customer: Midtrans Snap closed. Starting check-payment polling loop...`);

    // Simulate the setInterval behavior exactly as it is in order-client.tsx
    let pollCount = 0;
    const intervalId = setInterval(async () => {
        pollCount++;
        console.log(`[${new Date().toISOString()}] Customer: Tick ${pollCount} (fetching check-payment)`);

        // At this point, check-payment triggers the broadcast instantly
        // Wait, for this test I will just trigger the broadcast manually to simulate check-payment hitting DB

        await fetch(`${NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`, {
            method: "POST",
            headers: {
                "apikey": SUPABASE_SERVICE_ROLE_KEY,
                "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                messages: [{
                    topic: "kitchen-updates",
                    event: "refresh-orders",
                    payload: { orderId: "TEST", status: "PAID", fullOrder: { mock: true } }
                }]
            })
        });

        clearInterval(intervalId);
    }, 5000); // 5000ms delay before first tick
}

simulateCustomerPolling();
}

main();
