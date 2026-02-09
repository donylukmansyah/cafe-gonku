const crypto = require('crypto');

async function testUrl(label, url, method = "GET", body = null) {
    console.log(`\n--- Testing ${label} (${url}) ---`);
    try {
        const options = {
            method,
            headers: { "Content-Type": "application/json" }
        };
        if (body) options.body = JSON.stringify(body);

        const res = await fetch(url, options);
        console.log("Status:", res.status);

        const text = await res.text();
        try {
            const data = JSON.parse(text);
            console.log("Body (JSON):", JSON.stringify(data, null, 2).substring(0, 200) + "...");
            return true;
        } catch (e) {
            const titleMatch = text.match(/<title>(.*?)<\/title>/);
            const title = titleMatch ? titleMatch[1] : "No Title Found";
            console.log("Body (HTML/Text). Title:", title);
            // console.log("Snippet:", text.substring(0, 200));
            return false;
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
        return false;
    }
}

async function run() {
    // 1. Test Orders API (Should work)
    await testUrl("Orders API", "http://localhost:3000/api/orders");

    // 2. Test Webhook API (Standard Port)
    const payload = {
        order_id: "GONKU-260209-7TD",
        status_code: "200",
        gross_amount: "15000",
        signature_key: "34c736a0d175c859e44a2ea2a8797900c99cd46f5675c0be16f5b4727216dc46f7de2506241253540a44992fcc5462541c250d1da7d2b4e1e39840cfa7dde384",
        transaction_status: "settlement",
        fraud_status: "accept",
        payment_type: "qris"
    };

    await testUrl("Webhook (3000)", "http://localhost:3000/api/webhooks/midtrans", "POST", payload);

    // 3. Test Webhook API (Alternative Port)
    await testUrl("Webhook (3001)", "http://localhost:3001/api/webhooks/midtrans", "POST", payload);
}

run();
