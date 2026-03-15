/**
 * uber-matcher.js
 * Logic for grouping and matching Uber rides from Causeway Bay 
 * based on geographic routing and directional drop-offs.
 */

/**
 * Returns an object containing two arrays of matched users.
 * Route matches are sorted by proximity (nearest drop-off first).
 * 
 * @param {string} myDistrict - The district the current user selected
 * @param {Array} allUsers - Array of user objects from the database/CSV
 * @param {string} myUid - The current user's UID to exclude themselves
 * @returns {Object} - { exactMatches: [], routeMatches: [] }
 */
function findUberMatches(myDistrict, allUsers, myUid) {
    let exactMatches = [];
    let routeMatches = [];

    if (!myDistrict || myDistrict === "NULL" || myDistrict === "") {
        return { exactMatches, routeMatches };
    }
    
    // 1. The Highway Routes 
    // Define the directional paths based EXACTLY on the flow chart drawing.
    // Index 0 is the start point (closest to CWB). The arrays branch outwards.
    const routePaths = [
        // --- Island West & Coast ---
        ["Wan Chai / Admiralty", "Central", "Mid-Levels", "Kennedy Town / HKU / Shek Tong Tsui", "Pok Fu Lam / Cyberport"],
        ["Wan Chai / Admiralty", "Central", "Sheung Wan / Sai Ying Pun", "Kennedy Town / HKU / Shek Tong Tsui", "Pok Fu Lam / Cyberport"],

        // --- Western Harbour Crossing (WHC) & NT West ---
        ["Wan Chai / Admiralty", "Central", "Sheung Wan / Sai Ying Pun", "Tai Kok Tsui / Olympic", "Sham Shui Po / Cheung Sha Wan", "Mei Foo / Lai Chee Kok", "Kwai Chung", "Tsuen Wan", "Tsing Yi", "Lantau Island"],
        ["Wan Chai / Admiralty", "Central", "Sheung Wan / Sai Ying Pun", "Tai Kok Tsui / Olympic", "Sham Shui Po / Cheung Sha Wan", "Mei Foo / Lai Chee Kok", "Kwai Chung", "Tsuen Wan", "Tuen Mun", "Tin Shui Wai", "Yuen Long"],
        ["Wan Chai / Admiralty", "Central", "Sheung Wan / Sai Ying Pun", "Tai Kok Tsui / Olympic", "Sham Shui Po / Cheung Sha Wan", "Mei Foo / Lai Chee Kok", "Kwai Chung", "Tsuen Wan", "Yuen Long", "Tin Shui Wai"],
        ["Wan Chai / Admiralty", "Central", "Sheung Wan / Sai Ying Pun", "Tai Kok Tsui / Olympic", "Sham Shui Po / Cheung Sha Wan", "Mei Foo / Lai Chee Kok", "Kwai Chung", "Tsuen Wan", "Tuen Mun", "Yuen Long", "Kam Tin", "Fanling / Sheung Shui"],

        // --- Island East & Eastern Harbour Crossing (EHC) ---
        ["Happy Valley / Wong Nai Chung", "Tai Hang / Tin Hau / Fortress Hill", "North Point", "Quarry Bay / Tai Koo / Sai Wan Ho", "Shau Kei Wan / Heng Fa Chuen", "Chai Wan / Siu Sai Wan"],
        ["Happy Valley / Wong Nai Chung", "Tai Hang / Tin Hau / Fortress Hill", "North Point", "Quarry Bay / Tai Koo / Sai Wan Ho", "Yau Tong / Lam Tin", "Tseung Kwan O / LOHAS", "Sai Kung"],

        // --- Cross-Harbour Tunnel (CHT) & Kowloon/NT East ---
        ["Hung Hom / Whampoa", "To Kwa Wan", "Kowloon City", "Wong Tai Sin / Diamond Hill", "Kowloon Bay / Kwun Tong"],
        ["Hung Hom / Whampoa", "Ho Man Tin", "Kowloon Tong", "Tai Wai / Sha Tin / Fo Tan", "Tai Po", "Fanling / Sheung Shui"],
        ["Hung Hom / Whampoa", "Ho Man Tin", "Kowloon Tong", "Tai Wai / Sha Tin / Fo Tan", "Ma On Shan / Wu Kai Sha", "Sai Kung"],
        ["TST / Jordan / Yau Ma Tei", "Mong Kok / Prince Edward", "Sham Shui Po / Cheung Sha Wan"],
        ["TST / Jordan / Yau Ma Tei", "Mong Kok / Prince Edward", "Shek Kip Mei", "Kowloon Tong"],

        // --- Direct South Island ---
        ["Happy Valley / Wong Nai Chung"],
        ["Wong Chuk Hang / Shouson Hill", "Aberdeen", "Ap Lei Chau"],
        ["Wong Chuk Hang / Shouson Hill", "Repulse Bay / Stanley"],
        ["Wong Chuk Hang / Shouson Hill", "Aberdeen", "Pok Fu Lam / Cyberport"]
    ];

    // --- NEW: The Lateral Adjacency Dictionary ---
    // Link locations that are physically close but split by different highway branches.
    const adjacentDistricts = {
        "Sham Shui Po / Cheung Sha Wan": ["Shek Kip Mei"],
        "Shek Kip Mei": ["Sham Shui Po / Cheung Sha Wan"],
        
        "Mong Kok / Prince Edward": ["Tai Kok Tsui / Olympic", "Ho Man Tin"],
        "Tai Kok Tsui / Olympic": ["Mong Kok / Prince Edward"],
        "Ho Man Tin": ["Mong Kok / Prince Edward"],

        "Kowloon Tong": ["Wong Tai Sin / Diamond Hill"],
        "Wong Tai Sin / Diamond Hill": ["Kowloon Tong"]
    };

    let bestDistances = {};

    // 2. Build Highway Route Distances
    routePaths.forEach(path => {
        const myIndex = path.indexOf(myDistrict);
        if (myIndex !== -1) {
            for (let i = 0; i < myIndex; i++) {
                const dropOff = path[i];
                const distance = myIndex - i;
                
                if (!bestDistances[dropOff] || distance < bestDistances[dropOff]) {
                    bestDistances[dropOff] = distance;
                }
            }
        }
    });

    // --- NEW: Inject Adjacent Neighbors ---
    // If MY district has a neighbor, add them with a distance of 1
    if (adjacentDistricts[myDistrict]) {
        adjacentDistricts[myDistrict].forEach(neighbor => {
            if (!bestDistances[neighbor] || 1 < bestDistances[neighbor]) {
                bestDistances[neighbor] = 1;
            }
        });
    }

    // If any district on my ROUTE has a neighbor, add them with a +1 detour penalty
    Object.keys(bestDistances).forEach(routeStop => {
        const currentDistance = bestDistances[routeStop];
        
        if (adjacentDistricts[routeStop]) {
            adjacentDistricts[routeStop].forEach(neighbor => {
                const detourDistance = currentDistance + 1;
                // Add the neighbor if it isn't already handled, or if this detour is shorter
                if (!bestDistances[neighbor] || detourDistance < bestDistances[neighbor]) {
                    bestDistances[neighbor] = detourDistance;
                }
            });
        }
    });
    // --------------------------------------

    let rawRouteMatches = [];

    // 3. Evaluate Users
    allUsers.forEach(user => {
        const isNotMe = user.uid !== myUid;
        const isMatchActive = String(user.uber_match || user.ubermatch).toUpperCase() === 'TRUE';
        const rawCheckin = user.checkin_time || "";
        const hasCheckedIn = rawCheckin.trim() !== "" && rawCheckin.toUpperCase() !== "NULL";
        
        if (isMatchActive && hasCheckedIn && isNotMe) {
            const targetDistrict = (user.uber_district || user.uberdistrict || "").trim();
            if (!targetDistrict || targetDistrict === "NULL") return;
            
            if (targetDistrict === myDistrict) {
                exactMatches.push(user);
            } else if (bestDistances[targetDistrict] !== undefined) {
                rawRouteMatches.push({
                    user: user,
                    distance: bestDistances[targetDistrict]
                });
            }
        }
    });

    // 4. Sort by nearest drop-off (smallest distance first)
    rawRouteMatches.sort((a, b) => a.distance - b.distance);
    routeMatches = rawRouteMatches.map(item => item.user);

    return { exactMatches, routeMatches };
}

// Export for global access in the browser
window.findUberMatches = findUberMatches;
