const { createClient } = require('@supabase/supabase-js');
const crypto = require('crypto');

const NEXT_PUBLIC_SUPABASE_URL = "https://riyivttdajhznrqxuwbl.supabase.co";
const NEXT_PUBLIC_SUPABASE_ANON_KEY = "sb_publishable_lGpeLaS5oDV9F756V_RNUg_Q2QB5zBc";
const SUPABASE_SERVICE_ROLE_KEY = "sb_secret_PDCyTg-phRYZt7JhFxnLDg_jozehC2R";

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testRealtime() {
    console.log(`[${new Date().toISOString()}] Connecting to Supabase Realtime...`);

    // Subscribe to kitchen-updates
    const channel = supabase
        .channel("kitchen-updates")
        .on("broadcast", { event: "refresh-orders" }, (payload) => {
            console.log(`[${new Date().toISOString()}] 🟢 RECEIVED broadcast on kitchen-updates!`);
            console.log(JSON.stringify(payload, null, 2));
            process.exit(0);
        })
        .subscribe(async (status) => {
            console.log(`[${new Date().toISOString()}] Subscription status: ${status}`);

            if (status === 'SUBSCRIBED') {
                console.log(`[${new Date().toISOString()}] Sending mock broadcast via REST API...`);

                const startTime = Date.now();
                // Send broadcast via REST (same as backend webhook)
                const endpoint = `${NEXT_PUBLIC_SUPABASE_URL}/realtime/v1/api/broadcast`;
                const response = await fetch(endpoint, {
                    method: "POST",
                    headers: {
                        "apikey": SUPABASE_SERVICE_ROLE_KEY,
                        "Authorization": `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        messages: [
                            {
                                topic: "kitchen-updates",
                                event: "refresh-orders",
                                payload: {
                                    orderId: "TEST-ORDER",
                                    status: "PAID",
                                    fullOrder: { mock: true }
                                },
                            },
                        ],
                    }),
                });

                if (response.ok) {
                    console.log(`[${new Date().toISOString()}] 📤 Broadcast sent successfully via REST api. Waiting for websocket to receive...`);
                } else {
                    console.error("Failed to send broadcast", await response.text());
                }
            }
        });
}

testRealtime();
