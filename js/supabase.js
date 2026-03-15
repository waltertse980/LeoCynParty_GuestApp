// ==========================================
// SUPABASE INTEGRATION (For Later Stage)
// ==========================================

// 1. Initialize Supabase
let supabaseClient = null;
try {
    // Note: You will need to add the Supabase CDN script to your index.html 
    // <head> when you are ready to use this:
    // <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    
    if (typeof supabase !== 'undefined') {
        // Replace "URL" and "KEY" with your actual Supabase project credentials
        supabaseClient = supabase.createClient("URL", "KEY");
        console.log("Supabase initialized successfully.");
    }
} catch (e) {
    console.warn("Supabase not available, continuing in local mode.");
}

// 2. The Key-Only Login Function (Replaces local deriveUserIdFromKey)
async function loginWithKey(key) {
    const email = `${key}@event.local`;   
    const password = "permanent_event_password";

    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
    });

    if (error) throw error;
    return data.user;
}

// 3. Example: Using currentUserId in API calls
async function sendProgressUpdate(progress) {
    if (!currentUserId) return; // or handle anonymous case
    
    try {
        const response = await fetch("/api/progress", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId: currentUserId, progress })
        });
        return await response.json();
    } catch (err) {
        console.error("Failed to update progress:", err);
    }
}

// 4. QR Code Check-in Logic (Using Supabase RPC)
const handleUniversalScan = async (rawContent) => {
    // Parse QR JSON
    let payload;
    try {
        payload = JSON.parse(rawContent);
    } catch (e) {
        showUIFeedback("Invalid QR code.");
        return;
    }

    if (payload.action !== "CHECKIN" || !payload.station_qr) {
        showUIFeedback("Unknown QR command.");
        return;
    }

    const stationQr = payload.station_qr;

    // Ensure user is logged in via Supabase
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
        showUIFeedback("Please log in first.");
        return;
    }

    // Call RPC to update guests (uid/checkin_time/station_qr)
    const { data, error } = await supabaseClient.rpc("checkin_guest", {
        p_station_qr: stationQr
    });

    if (error) {
        console.error("Check-in failed:", error);
        showUIFeedback("Check-in failed. Try again.");
        return;
    }

    showUIFeedback(`Success! Checked in at ${stationQr}`);
};

// Placeholder for UI feedback so the code doesn't break if called
function showUIFeedback(message) {
    console.log("UI Feedback:", message);
    alert(message);
}
