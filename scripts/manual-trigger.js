const crypto = require('crypto');

// Configuration
const PORT = 3000; // Matches your running server
const ORDER_ID = "GONKU-260209-7TD"; // The order from your screenshot
const SERVER_KEY = "Mid-server-wcv5cI8oAWJsGUeqXt3oPVGX"; // Your Server Key

async function triggerPaid() {
    console.log(`Targeting: http://localhost:${PORT}/api/webhooks/midtrans`);

    // Generate valid signature
    // order_id + status_code + gross_amount + ServerKey
    const signatureInput = `${ORDER_ID}20015000${SERVER_KEY}`;
    const signature = crypto.createHash("sha512").update(signatureInput).digest("hex");

    const payload = {
        order_id: ORDER_ID,
        status_code: "200",
        gross_amount: "15000",
        signature_key: signature,
        transaction_status: "settlement",
        fraud_status: "accept",
        payment_type: "qris"
    };

    try {
        const res = await fetch(`http://localhost:${PORT}/api/webhooks/midtrans`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        console.log("Status:", res.status);
        const text = await res.text();
        try {
            const data = JSON.parse(text);
            console.log("Response:", data);
            if (res.status === 200) {
                console.log("\n✅ SUKSES! Order harusnya sudah update jadi PAID di database.");
                console.log("Silakan refresh dashboard kitchen/admin.");
            }
        } catch (e) {
            console.log("Response is NOT JSON.");
            console.log("Preview:", text.substring(0, 500));
            console.log("\n❌ GAGAL: Endpoint mereturn HTML, bukan JSON. Masalah routing/middleware.");
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
        console.log("\n❌ GAGAL: Server tidak bisa dihubungi. Pastikan pnpm dev jalan di port " + PORT);
    }
}

triggerPaid();
