async function main() {
const { createClient } = await import("@supabase/supabase-js");
await import("dotenv/config");

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!NEXT_PUBLIC_SUPABASE_URL || !NEXT_PUBLIC_SUPABASE_ANON_KEY || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing Supabase environment variables for realtime test.");
    process.exit(1);
}

const supabase = createClient(NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function testRealtime() {
    console.log(`[${new Date().toISOString()}] Connecting to Supabase Realtime...`);

    // Subscribe to kitchen-updates
    supabase
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

await testRealtime();
}

main();
