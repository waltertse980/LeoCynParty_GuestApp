let currentUserId = null;

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
            db.from('game').select('*') // Ensure you created a 'game' table!
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
        // 1. Check if the auth_id exists in the profile table
        const { data: profileMatch, error } = await db
            .from('profile')
            .select('uid, auth_id')
            .eq('auth_id', trimmedKey)
            .maybeSingle();

        // If no user is found, return null
        if (error || !profileMatch) {
            return null;
        }

        const uid = profileMatch.uid;

        // 2. Fetch all their unified data (so window.guestData is fully populated for ui.js)
        const [
            { data: profileData },
            { data: statusData },
            { data: gameData }
        ] = await Promise.all([
            db.from('profile').select('*').eq('uid', uid).maybeSingle(),
            db.from('status').select('*').eq('uid', uid).maybeSingle(),
            db.from('game').select('*').eq('uid', uid).maybeSingle()
        ]);

        // Merge it all into the global window.guestData variable
        window.guestData = { 
            ...(profileData || {}), 
            ...(statusData || {}), 
            ...(gameData || {}) 
        };

        // Apply local storage patch
        window.guestData = applyPatchToGuestRow(window.guestData);

        return uid;

    } catch (err) {
        console.error("Error verifying auth key:", err);
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
