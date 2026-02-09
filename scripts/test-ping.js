async function testPing() {
    console.log("Testing /api/ping...");
    try {
        const res = await fetch("http://localhost:3000/api/ping");
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text);
    } catch (e) {
        console.log("Error:", e.message);
    }
}
testPing();
