let currentUserId = null;
let guestData = null; // Store the full row for the logged-in guest

// 1. Fetch and merge data from Supabase
async function loadGuestsFromCSV() {
    try {
        // Fetch all three tables concurrently for speed
        const [
            { data: profiles, error: profilesError },
            { data: statuses, error: statusesError },
            { data: games, error: gamesError }
        ] = await Promise.all([
            db.from('profile').select('*'),
            db.from('status').select('*'),
        ]);

        if (profilesError) throw profilesError;
        if (statusesError) throw statusesError;
        if (gamesError) throw gamesError;

        // Fallbacks in case tables are empty
        const safeProfiles = profiles || [];
        const safeStatuses = statuses || [];
        const safeGames = games || [];

        // Merge them into a single guest list based on UID
        const mergedGuests = safeProfiles.map(profile => {
            const cleanUid = profile.uid; 
            
            const status = safeStatuses.find(s => s.uid === cleanUid) || {};
            const game = safeGames.find(g => g.uid === cleanUid) || {};
            
            // Combine all properties into one unified guest row
            return { ...profile, ...status, ...game };
        });

        // Apply any local storage patches
        const patched = mergedGuests.map(applyPatchToGuestRow);
        return patched;

    } catch (err) {
        console.error("Error loading from Supabase:", err);
        throw err;
    }
}

// 2. Validate key against Supabase data directly
async function deriveUserIdFromKey(key) {
    const trimmedKey = key.trim();
    
    try {
        // 1. Find profile by auth_id
        const { data: profileMatch, error: profileError } = await db
            .from('profile')
            .select('uid, auth_id')
            .eq('auth_id', trimmedKey)
            .single();

        if (profileError || !profileMatch) {
            console.log('No profile found for key:', trimmedKey);
            return null;
        }

        const uid = profileMatch.uid;
        console.log('Found UID:', uid, 'for key:', trimmedKey);

        // 2. Fetch full data (separate queries, no .catch chaining)
        let profileData = {};
        let statusData = {};
        
        try {
            const profileRes = await db.from('profile').select('*').eq('uid', uid).single();
            profileData = profileRes.data || {};
        } catch (pErr) {
            console.warn('Profile fetch failed:', pErr);
        }
        
        try {
            const statusRes = await db.from('status').select('*').eq('uid', uid).single();
            statusData = statusRes.data || {};
        } catch (sErr) {
            console.warn('Status fetch failed:', sErr);
        }

        // Merge into global guestData
        guestData = { 
            ...profileData, 
            ...statusData, 
            ...getLocalPatchMap(guestData?.uid || uid) 
        };

        return uid;

    } catch (err) {
        console.error("deriveUserIdFromKey error:", err);
        return null;
    }
}

function getLocalPatchMap() {
    try { return JSON.parse(localStorage.getItem("guestPatchMap") || "{}"); }
    catch (e) { return {}; }
}

function setLocalPatch(uid, patch) {
    const m = getLocalPatchMap();
    m[uid] = Object.assign({}, m[uid] || {}, patch);
    localStorage.setItem("guestPatchMap", JSON.stringify(m));
}

function applyPatchToGuestRow(row) {
    if (!row || !row.uid) return row;
    const m = getLocalPatchMap();
    const patch = m[row.uid];
    return patch ? Object.assign({}, row, patch) : row;
}
