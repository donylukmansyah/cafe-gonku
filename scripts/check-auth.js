async function checkAuth() {
    console.log("Checking Auth Endpoint...");
    try {
        // Better Auth typically exposes /api/auth/get-session or similar
        // Let's try to hit the base auth route or a known endpoint
        const res = await fetch("http://localhost:3000/api/auth/get-session");
        console.log("Status:", res.status);
        const text = await res.text();
        console.log("Body:", text.substring(0, 500));
    } catch (e) {
        console.log("Fetch Error on localhost:3000:", e.message);
    }
}
checkAuth();
