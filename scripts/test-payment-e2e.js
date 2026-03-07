const { createClient } = require('@supabase/supabase-js');

const NEXT_PUBLIC_SUPABASE_URL = "https://riyivttdajhznrqxuwbl.supabase.co";
const NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_lGpeLaS5oDV9F756V_RNUg_Q2QB5zBc";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function simulateCustomerPolling() {
    console.log(`[${new Date().toISOString()}] Kitchen: Subscribing to kitchen-updates...`);

    let receivedTimestamp = null;
    let paymentSuccessTimestamp = null;

    // Kitchen UI
    supabase.channel("kitchen-updates").on("broadcast", { event: "refresh-orders" }, (payload) => {
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

        const SUPABASE_SERVICE_ROLE_KEY = "sb_secret_PDCyTg-phRYZt7JhFxnLDg_jozehC2R";
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
