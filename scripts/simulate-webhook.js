const crypto = require('crypto');

// Config from user's .env (manually verifying what's likely there)
const SERVER_KEY = "Mid-server-wcv5cI8oAWJsGUeqXt3oPVGX";
const ORDER_ID = "GONKU-260209-NC4"; // From user screenshot
const AMOUNT = "15000"; // Integers string
const STATUS_CODE = "200";

// Generate Signature
const input = ORDER_ID + STATUS_CODE + AMOUNT + SERVER_KEY;
const signature = crypto.createHash('sha512').update(input).digest('hex');

console.log("-----------------------------------------");
console.log("Simulating Webhook for Order:", ORDER_ID);
console.log("Server Key used:", SERVER_KEY);
console.log("Signature Input:", input);
console.log("Generated Signature:", signature);
console.log("-----------------------------------------");

async function run() {
    try {
        console.log("Testing GET /api/webhooks/midtrans...");
        const resGet = await fetch("http://localhost:3000/api/webhooks/midtrans");
        console.log("GET Status:", resGet.status);
        try {
            console.log("GET Body:", await resGet.json());
        } catch (e) {
            console.log("GET Body is not JSON");
        }

        const payload = {
            order_id: ORDER_ID,
            status_code: STATUS_CODE,
            gross_amount: AMOUNT,
            signature_key: signature,
            transaction_status: "settlement",
            fraud_status: "accept",
            payment_type: "qris"
        };

        console.log("Sending Payload:", JSON.stringify(payload, null, 2));

        const res = await fetch("http://localhost:3000/api/webhooks/midtrans", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        const text = await res.text();
        console.log("Response Status:", res.status);
        try {
            const data = JSON.parse(text);
            console.log("Response Body:", data);
        } catch (e) {
            const titleMatch = text.match(/<title>(.*?)<\/title>/);
            const title = titleMatch ? titleMatch[1] : "No Title Found";
            console.log("Response Text (Not JSON). Title:", title);
            // console.log("Full Text:", text.substring(0, 500)); 
        }

    } catch (err) {
        console.error("Error:", err);
    }
}

run();
