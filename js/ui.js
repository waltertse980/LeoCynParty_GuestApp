// --- GENERAL LOGIC
async function populateUIWithGuestData() {
    if (!guestData) return;

    //
    // === --- GENERAL --- ===
    //

    setupMemoryLane();

    // --- PROFILE ---
    
    // - Dynamic Greeting
    const isZhLang = document.body.classList.contains('lang-zh');
    const givenName = (guestData.givenname && guestData.givenname !== "NULL") ? guestData.givenname : "";
    const chiName = (guestData.chinese_name && guestData.chinese_name !== "NULL") ? guestData.chinese_name : givenName; 
    
    const profileTitleEl = document.getElementById('lbl-profile-title');
    if (profileTitleEl) {
        if (isZhLang) {
            profileTitleEl.textContent = chiName ? `嗨${chiName}~` : "嗨~";
        } else {
            profileTitleEl.textContent = givenName ? `Hello ${givenName} :)` : "Hello :)";
        }
    }

    // - UBER MATCH LOGIC
    const uberToggleWrapper = document.getElementById('btn-uber-toggle'); 
    const uberToggleText = document.getElementById('uber-toggle-text'); 
    const uberToggleKnob = document.getElementById('uber-toggle-knob'); 
    const uberBox = document.getElementById('uber-match-list');
    const uberModal = document.getElementById('uber-modal');
    const confirmUberBtn = document.getElementById('btn-confirm-uber');
    const districtSelect = document.getElementById('uber-district-select');
    const uberHint = document.getElementById('uber-hint'); 

    // Safely parse the uber_match state (handles null, undefined, boolean, and strings)
    const rawUber = guestData.uber_match || guestData.ubermatch || "FALSE"; 
    const isUber = String(rawUber).toUpperCase() === 'TRUE';

    if (uberToggleWrapper && uberBox && uberToggleText && uberToggleKnob) {
        
        const fullClickArea = uberToggleWrapper.parentElement;
        
        if (!isUber) {
            // STATE: INACTIVE
            const isZh = document.body.classList.contains('lang-zh');
            uberToggleText.textContent = isZh ? "未登記" : "INACTIVE";
            uberToggleText.style.color = "#B32A19"; 
            uberToggleWrapper.style.backgroundColor = "rgba(179, 42, 25, 0.5)"; 
            uberToggleKnob.style.transform = "translateX(0px)";
            uberBox.innerHTML = ``; 
            
            if (uberHint) uberHint.classList.remove('hidden'); 

            const lastDistrict = guestData.uber_district || guestData.uberdistrict;
            if (lastDistrict && lastDistrict !== "NULL" && lastDistrict.trim() !== "") {
                districtSelect.value = lastDistrict;
            } else {
                districtSelect.selectedIndex = 0;
            }

            // Click opens the District selection modal to opt-in
            fullClickArea.onclick = function() {
                if(uberModal) {
                    uberModal.classList.remove('hidden');
                    uberModal.classList.add('flex');
                }
            };
        } else {
            // STATE: ACTIVE 
            const isZh = document.body.classList.contains('lang-zh');
            uberToggleText.textContent = isZh ? "已登記" : "ACTIVE";
            uberToggleText.style.color = "#16a34a"; 
            uberToggleWrapper.style.backgroundColor = "rgba(22, 163, 74, 0.5)"; 
            uberToggleKnob.style.transform = "translateX(24px)";
            
            if (uberHint) uberHint.classList.add('hidden'); 

            // Click opens the opt-out modal
            fullClickArea.onclick = function() {
                const disableModal = document.getElementById('uber-disable-modal');
                if (disableModal) {
                    disableModal.classList.remove('hidden');
                    disableModal.classList.add('flex');
                }
            };

            const myDistrictRaw = guestData.uber_district || guestData.uberdistrict || "NULL";
            const myDistrict = myDistrictRaw.trim();

            if (myDistrict === "NULL" || myDistrict === "") {
                uberBox.innerHTML = `<div class="text-[10px] font-bold text-gray-500 uppercase mb-2">where will you drop off?</div>`;
            } else {
                const isZhMatch = document.body.classList.contains('lang-zh');
                const headingPrefix = isZhMatch ? "目的地: " : "Heading to: ";
                const displayDist = getLocalizedDistrictName(myDistrict, isZhMatch);

                // Show loading state
                uberBox.innerHTML = `
                    <div class="text-[10px] font-bold text-green-700 uppercase mb-2">Heading to ${myDistrict}</div>
                    <div class="text-[10px] font-mono text-gray-400 mt-2">Loading latest matches...</div>
                `;

                // Fetch matches asynchronously
                (async () => {
                    const { data: allUsers } = await db.from('status').select('*');
                    const { data: allProfiles } = await db.from('profile').select('*');

                    let exactMatches = [];
                    let routeMatches = [];

                    if (typeof window.findUberMatches === 'function' && allUsers && allProfiles) {
                        const matchResults = window.findUberMatches(myDistrict, allUsers, guestData.uid);
                        exactMatches = matchResults.exactMatches;
                        routeMatches = matchResults.routeMatches;
                    }

                    let htmlContent = `<div class="text-[10px] font-bold text-green-700 uppercase mb-2">${headingPrefix}${displayDist}</div>`;
                    
                    if (exactMatches.length === 0 && routeMatches.length === 0) {
                        const emptyText = isZhMatch ? "暫時未有順路嘅泥鯭...主動出擊搵人夾Uber啦!" : "no potential Uber buddies at the moment...";
                        htmlContent += `<div class="text-[10px] font-mono text-gray-400 mt-2" data-i18n="uber_match_empty">${emptyText}</div>`;
                    } else {
                        const renderUserRow = (match) => {
                            let matchName = match.uid;
                            let bgColor = "#f97316"; 
                            
                            const profile = allProfiles.find(p => p.uid === match.uid);
                            if (profile) {
                                if (profile.givenname) matchName = profile.givenname;
                                if (profile.squad_colour && profile.squad_colour.trim() !== "NULL") {
                                    const rawColor = profile.squad_colour.trim();
                                    bgColor = rawColor.startsWith("#") ? rawColor : `#${rawColor}`;
                                }
                            }
                            
                            const initial = matchName.charAt(0).toUpperCase();
                            return `
                                <div class="flex items-center gap-3 mb-2">
                                    <div class="w-8 h-8 rounded-full border border-black flex items-center justify-center font-bold text-white text-xs shadow-sm" style="background-color: ${bgColor};">${initial}</div>
                                    <div class="font-bold text-xs">${matchName}</div>
                                </div>
                            `;
                        };

                        if (exactMatches.length > 0) {
                            const exactText = isZhMatch ? "目的地同您相近:" : "Destinations close to yours:";
                            htmlContent += `<div class="text-[9px] font-mono text-gray-500 mt-3 mb-1" data-i18n="uber_match_exact">${exactText}</div>`;
                            exactMatches.forEach(match => { htmlContent += renderUserRow(match); });
                        }

                        if (routeMatches.length > 0) {
                            const routeTitleText = isZhMatch ? "順路嘅潛在泥鯭友:" : "Potential co-riders sharing the same route:";
                            htmlContent += `<div class="text-[9px] font-mono text-gray-500 mt-3 mb-1">${routeTitleText}</div>`;
                            routeMatches.forEach(match => { htmlContent += renderUserRow(match); });
                        }
                    }
                    uberBox.innerHTML = htmlContent;
                })();
            }
        }
    }

    // Move modal confirmation listeners OUTSIDE of the toggle logic so they always exist
    if (confirmUberBtn && !confirmUberBtn.dataset.listenerAttached) {
        confirmUberBtn.dataset.listenerAttached = "true"; // Prevent duplicate listeners
        confirmUberBtn.addEventListener('click', async function() {
            const selected = districtSelect.value;
            const errorMsg = document.getElementById('uber-error-msg');
            
            if (!selected) {
                if(errorMsg) errorMsg.classList.remove('hidden');
                return;
            }
            if(errorMsg) errorMsg.classList.add('hidden');

            // Update local state
            guestData.uber_match = 'TRUE';
            guestData.uber_district = selected;
            
            // Supabase Update
            console.log(`DB Update: Writing uber_match=TRUE, uber_district=${selected}`);
            await db.from('status').update({ uber_match: 'TRUE', uber_district: selected }).eq('uid', guestData.uid);
            
            if (uberModal) {
                uberModal.classList.add('hidden');
                uberModal.classList.remove('flex');
            }
            
            // Redraw UI
            populateUIWithGuestData();
        });
    }

    const disableConfirmBtn = document.getElementById('btn-confirm-uber-disable');
    if (disableConfirmBtn && !disableConfirmBtn.dataset.listenerAttached) {
        disableConfirmBtn.dataset.listenerAttached = "true";
        disableConfirmBtn.addEventListener('click', async function() {
            guestData.uber_match = 'FALSE';
            
            console.log("DB Update: Writing uber_match=FALSE.");
            await db.from('status').update({ uber_match: 'FALSE' }).eq('uid', guestData.uid);
            
            const disableModal = document.getElementById('uber-disable-modal');
            if (disableModal) {
                disableModal.classList.add('hidden');
                disableModal.classList.remove('flex');
            }
            populateUIWithGuestData();
        });
    }

    // Drunk Pick-up
    const btnSaveDrunk = document.getElementById('btn-save');
    if (btnSaveDrunk) {
        btnSaveDrunk.onclick = async function() {
            const name = document.getElementById('input-name').value.trim();
            const phone = document.getElementById('input-phone').value.trim();
            const addr = document.getElementById('input-addr').value.trim();
            const errorEl = document.getElementById('drunk-error');

            if (!name || !phone || !addr) {
                errorEl.classList.remove('hidden');
                return;
            }
            errorEl.classList.add('hidden');

            // SUPABASE:
            await db.from('status').update({
                em_name: name,
                em_number: phone,
                em_address: addr
            }).eq('uid', guestData.uid);
            
            // GUI Success Feedback
            btnSaveDrunk.textContent = "SAVED!";
            
            // Remove old message if user clicks multiple times
            const oldMsg = document.getElementById('drunk-success-msg');
            if (oldMsg) oldMsg.remove();
            
            // Create grey text message
            const successMsg = document.createElement('div');
            successMsg.id = 'drunk-success-msg';
            successMsg.className = 'text-xs text-gray-500 mt-2 text-center font-semibold';
            successMsg.textContent = 'Contact saved successfully.';
            
            // Insert right after the save button
            btnSaveDrunk.parentNode.insertBefore(successMsg, btnSaveDrunk.nextSibling);

            setTimeout(() => {
                btnSaveDrunk.textContent = "SAVE";
                if (successMsg) successMsg.remove();
            }, 3000);
        };
    }

    // 
    // === --- PRE-EVENT --- ===
    //

    // --- HOME ---
    // Submission of Quick Survey to Database:
    const btnSubmitSurvey = document.getElementById('btn-submit-survey');
    if (btnSubmitSurvey) {
        btnSubmitSurvey.onclick = async function() {
            const payload = {
                uid: guestData.uid,
                allergy: document.getElementById('sv-allergy-cb').checked,
                allergy_type: document.getElementById('sv-allergy-text').value.trim(),
                veg: document.getElementById('sv-veg').checked,    // REMOVED -cb
                halal: document.getElementById('sv-halal').checked, // REMOVED -cb
                eta: document.getElementById('sv-arrival-select').value,
                notes: document.getElementById('sv-notes').value.trim()
            };

            console.log("DB Update: Inserting into Survey table:", payload);
            // SUPABASE:
            // Use upsert to allow them to overwrite their survey if they submit again
            await db.from('survey').upsert(payload, { onConflict: 'uid' });
            
            
            // Close modal
            document.getElementById('survey-modal').classList.add('hidden');
            document.getElementById('survey-modal').classList.remove('flex');
        };
    }
    
    //
    // === --- EVENT MODE TRIGGER --- ===
    //

    const rawCheckin = (guestData.checkin_time) ? String(guestData.checkin_time).trim() : "";
    const isCheckedIn = rawCheckin !== "" && rawCheckin.toUpperCase() !== "NULL";
    
    // Explicitly call to switch home tab layouts
    if (typeof updateHomeTabLayout === 'function') {
        updateHomeTabLayout(isCheckedIn);
    }

    //
    // === --- EVENT --- ===
    //

    // --- GENERAL ---

    // - SQUAD COLOUR LOGICS
    let squadColour = '#777777'; // Fallback grey
    if (guestData.squad_colour && guestData.squad_colour !== "NULL") {
        squadColour = guestData.squad_colour.startsWith('#')
            ? guestData.squad_colour
            : `#${guestData.squad_colour}`;
    }

    const squadLbl = document.getElementById("lbl-squad");
    if (squadLbl) squadLbl.textContent = (guestData.squad_name || "Unassigned").toString().toUpperCase();

    const teamBg = document.getElementById("team-bg");
    if (teamBg) teamBg.style.backgroundColor = squadColour;

    // - FETCH GAME DATA
    // Must be declared and awaited BEFORE drinkSlots calculation and renderMissions
    let gameData = null;
    const squadName = guestData.squad_name;

    if (squadName && squadName.toUpperCase() !== "UNASSIGNED") {
        try {
            const { data: fetchedGame, error: gameError } = await db
                .from('game')
                .select('*')
                .eq('squad_name', squadName)
                .single();
            if (!gameError && fetchedGame) {
                gameData = fetchedGame;
            } else if (gameError) {
                console.warn("game fetch warning:", gameError.message);
            }
        } catch (e) {
            console.error("Error fetching game data:", e);
        }
    }

    // --- MISSION ---

    // - CALCULATE DRINK SLOTS
    let drinkSlots = 3;
    let isPenalty = false;
    const gamesList = ['1_buy', '2_iq', '3_pose', '4_lyrics', '5_photo'];

    if (gameData) {
        let emptyCount = 0;
        gamesList.forEach(g => {
            if (gameData[g] === null || gameData[g] === undefined || gameData[g] === "") emptyCount++;
        });
        drinkSlots += emptyCount;

        const now = new Date();
        const penaltyTime = new Date('2026-03-28T20:30:00+08:00');
        if (now >= penaltyTime && emptyCount === 5) {
            isPenalty = true;
        } else {
            isPenalty = gameData.penalty === true;
        }
    } else {
        // No game row found — assume all tasks empty
        drinkSlots = 8;
        const now = new Date();
        const penaltyTime = new Date('2026-03-28T20:30:00+08:00');
        if (now >= penaltyTime) isPenalty = true;
    }

    if (isPenalty) drinkSlots += 6;

    // - RENDER MISSION CARDS
    if (typeof renderMissions === 'function') {
        renderMissions(gameData, squadColour, drinkSlots);
    }     

    // - WRITE DRINK SLOTS TO UI
    const homeDrinkNumber = document.querySelector("#tab-home .text-5xl.font-black.handwritten");
    if (homeDrinkNumber) homeDrinkNumber.textContent = String(drinkSlots);

    const profileDrinkNumber = document.querySelector("#tab-profile #lbl-drink-slots-mini")
        ?.parentElement?.querySelector(".font-bold.text-var--red.text-xl.handwritten");
    if (profileDrinkNumber) profileDrinkNumber.textContent = String(drinkSlots);

    const penaltyText = document.getElementById("txt-penalty");
    if (penaltyText) {
        if (isPenalty) penaltyText.classList.remove("hidden");
        else penaltyText.classList.add("hidden");
    }

    // --- SQUAD ---
    
    // - FETCH TEAMMATES
    const teamMembersList = document.getElementById("team-members-list");
    if (teamMembersList) {
        teamMembersList.innerHTML = `<div class="text-xs font-mono text-white/70"><i class="fa-solid fa-spinner fa-spin"></i></div>`;

        if (squadName && squadName.toUpperCase() !== "UNASSIGNED") {
            try {
                const { data: teammates, error: teamError } = await db
                    .from('profile')
                    .select('uid, givenname, chinese_name')
                    .eq('squad_name', squadName);

                if (teamError) throw teamError;

                if (teammates && teammates.length > 0) {
                    const isZhMatch = document.body.classList.contains('lang-zh');

                    // Exclude guest_000 and guest_088 to guest_097
                    const filtered = teammates.filter(member => {
                        if (!member.uid || !member.uid.startsWith('guest_')) return false;
                        const num = parseInt(member.uid.replace('guest_', ''), 10);
                        return num !== 0 && !(num >= 88 && num <= 97);
                    });

                    if (filtered.length === 0) {
                        teamMembersList.innerHTML = `<div class="bg-black/20 p-6 w-full max-w-xs shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] flex flex-col gap-3 backdrop-blur-sm text-center"><div class="text-xs font-mono text-white/70">Only you so far!</div></div>`;
                    } else {
                        let listHtml = `<div class="bg-black/20 p-6 w-full max-w-xs shadow-[4px_4px_0_0_rgba(0,0,0,0.5)] flex flex-col gap-3 backdrop-blur-sm text-center">`;

                        filtered.forEach(member => {
                            const displayName = (member.givenname && member.givenname !== "NULL")
                                ? member.givenname
                                : member.uid;

                            const isMe = member.uid === guestData.uid;
                            const meBadge = isMe ? (isZhMatch ? " (我)" : " (Me)") : "";
                            const nameStyle = isMe
                                ? "font-black text-white text-lg tracking-wide drop-shadow-[2px_2px_0_#000]"
                                : "font-mono font-bold text-white/90 text-sm";

                            listHtml += `<div class="${nameStyle}">${displayName}${meBadge}</div>`;
                        });

                        listHtml += `</div>`;
                        teamMembersList.innerHTML = listHtml;
                    }
                } else {
                    teamMembersList.innerHTML = '';
                }
            } catch (e) {
                console.error("Error fetching teammates:", e);
                teamMembersList.innerHTML = '';
            }
        } else {
            teamMembersList.innerHTML = '';
        }
    }

    // ADD THESE TWO LINES AT THE VERY END
    updateStatusCard();
    if (typeof setRandomTip === 'function') setRandomTip();
    setupNoticeAdmin();
    loadNotices();
    subscribeToGameUpdates();
}

// --- HOME LOGIC ---
function updateHomeTabLayout(isCheckedIn) {
    const preHeader = document.getElementById("home-precheckin-header");
    const transportBtn = document.getElementById("btn-transport");
    const surveyBtn = document.getElementById("btn-survey");
    
    // We now toggle the section inside the status card
    const tipsSection = document.getElementById("home-tips-section");

    if (isCheckedIn) {
        if (preHeader) preHeader.classList.add("hidden");
        if (transportBtn) transportBtn.classList.add("hidden");
        if (surveyBtn) surveyBtn.classList.add("hidden");
        
        if (tipsSection) tipsSection.classList.remove("hidden");
        toggleNavTabs(true);
    } else {
        if (preHeader) preHeader.classList.remove("hidden");
        if (transportBtn) transportBtn.classList.remove("hidden");
        if (surveyBtn) surveyBtn.classList.remove("hidden");
        
        if (tipsSection) tipsSection.classList.add("hidden");
        toggleNavTabs(false);
    }
}

function updateStatusCard() {
    const now = new Date();
    const eventStart = new Date("2026-03-28T18:30:00");
    const textEl = document.getElementById("status-text");
    const subEl  = document.getElementById("status-subtext");
    const iconWrap = document.getElementById("status-icon");
    const icon   = document.getElementById("status-icon-icon");

    // --- NEW: Stop i18n from overriding our dynamic status text! ---
    if (textEl) textEl.removeAttribute("data-i18n");
    if (subEl) subEl.removeAttribute("data-i18n");

    // Detect language state
    const isZh = document.body.classList.contains('lang-zh');

    // 1. Correctly detect if checked in from CSV data
    const rawCheckin = (guestData && guestData.checkin_time) ? String(guestData.checkin_time).trim() : "";
    const isCheckedIn = rawCheckin !== "" && rawCheckin.toUpperCase() !== "NULL";

    if (isCheckedIn) {
        // STATE: Checked In
        textEl.textContent = isZh ? "歡迎，你已經成功報到！" : "Welcome to the party!";
        subEl.textContent = isZh ? "盡情玩啦！" : "Enjoy the chaos...";
        iconWrap.className = "w-10 h-10 bg-green-100 rounded-full border-2 border-black flex items-center justify-center";
        icon.className = "fa-solid fa-check text-green-700";
    } else if (now < eventStart) {
        // STATE: Before event
        textEl.textContent = isZh ? "敬請期待..." : "Coming soon...";
        subEl.textContent = isZh ? "2026年3月28日 18:30 恭候" : "\"Doors open at 18:30, 28 Mar 2026.\"";
        iconWrap.className = "w-10 h-10 bg-yellow-100 rounded-full border-2 border-black flex items-center justify-center";
        icon.className = "fa-solid fa-clock text-yellow-700";
    } else {
        // STATE: Event started but not checked in
        textEl.textContent = isZh ? "快啲嚟啦!!! \\ w /" : "Hurry up!!! \\ w /";
        subEl.textContent = isZh ? "去接待處報到啦！" : "Scan your QR code to check in.";
        iconWrap.className = "w-10 h-10 bg-red-100 rounded-full border-2 border-black flex items-center justify-center";
        icon.className = "fa-solid fa-person-running text-red-700";
    }
}

function setRandomTip() {
    const el = document.getElementById("txt-party-tip");
    if (!el) return;
    const tip = PARTY_TIPS[Math.floor(Math.random() * PARTY_TIPS.length)];
    el.textContent = `"${tip}"`;
}

function toggleAllergyInput() {
    const cb = document.getElementById('sv-allergy-cb');
    const input = document.getElementById('sv-allergy-text');
    if (cb.checked) {
        input.classList.remove('hidden');
        input.focus();
    } else {
        input.classList.add('hidden');
        input.value = ""; // Clear if unchecked
    }
}

function generateArrivalOptions() {
    const select = document.getElementById('sv-arrival-select');
    if (!select) return;
    
    select.innerHTML = ""; 
    
    let currentHour = 18;
    let currentMin = 30;

    // Loop stops once we exceed 20:00
    while (currentHour < 20 || (currentHour === 20 && currentMin === 0)) {
        const displayHour = currentHour.toString().padStart(2, '0');
        const displayMin = currentMin.toString().padStart(2, '0');
        const timeStr = `${displayHour}:${displayMin}`;
        
        const opt = document.createElement('option');
        opt.value = timeStr;
        opt.textContent = timeStr;
        select.appendChild(opt);

        // Stop exactly at 20:00
        if (currentHour === 20 && currentMin === 0) break;

        // Increment by 15 mins
        currentMin += 15;
        if (currentMin >= 60) {
            currentHour += 1;
            currentMin = 0;
        }
    }
}

function updateCountdown() {
    const targetDate = new Date("2026-03-28T18:30:00+08:00"); // Standardized to HK Time
    const now = new Date();
    let diff = targetDate.getTime() - now.getTime();
    
    // Stop at 00 00 00 and prevent negative values
    if (diff <= 0) {
        const dEl = document.getElementById("cd-days");
        const hEl = document.getElementById("cd-hours");
        const mEl = document.getElementById("cd-mins");
        if (dEl) dEl.textContent = "00";
        if (hEl) hEl.textContent = "00";
        if (mEl) mEl.textContent = "00";
        return; 
    }
    
    const msInMinute = 60 * 1000, msInHour = 60 * msInMinute, msInDay = 24 * msInHour;
    const days = Math.floor(diff / msInDay);
    diff -= days * msInDay;
    const hours = Math.floor(diff / msInHour);
    diff -= hours * msInHour;
    const mins = Math.floor(diff / msInMinute);
    
    document.getElementById("cd-days").textContent = String(days).padStart(2, "0");
    document.getElementById("cd-hours").textContent = String(hours).padStart(2, "0");
    document.getElementById("cd-mins").textContent = String(mins).padStart(2, "0");
}

const PARTY_TIPS = [
    "Save water, drink beer",
    "A party without alcohol is just a meeting",
    "When life gives you lemons, add vodka",
    "According to chemistry, alcohol is a solution",
    "Size does matter - no one wants a small glass of wine"
];

// --- MISSION LOGIC ---
function renderMissions(gameData, squadColour, drinkSlots) {
    const isZh = document.body.classList.contains('lang-zh');

    const header = document.getElementById("mission-header");
    // Explicitly update background colour if squadColour is provided
    if (header && squadColour) {
        header.style.backgroundColor = squadColour;
    }

    // Translate Header Title
    const titleEl = document.getElementById("lbl-missions-title");
    if (titleEl) titleEl.textContent = isZh ? "任務" : "Mission";
    
    // Update progress label
    const progressLblEl = document.getElementById("lbl-progress");
    if (progressLblEl) {
        const currentProgress = document.getElementById("mission-progress-text")?.textContent || "0%";
        progressLblEl.innerHTML = `${isZh ? "進度:" : "Progress:"} <span id="mission-progress-text">${currentProgress}</span>`;
    }

    // --- DRINK SLOT MEMO STICKER ---
    // Fetch total drink slots sum asynchronously and inject the sticker
    const stickerContainer = document.getElementById("mission-drink-sticker");
    if (stickerContainer && drinkSlots !== undefined) {
        (async () => {
            let totalSlots = "?";
            try {
                const { data } = await db.from('game').select('drink_slot');
                if (data && data.length > 0) {
                    totalSlots = data.reduce((sum, row) => {
                        const val = parseInt(row.drink_slot, 10);
                        return sum + (isNaN(val) ? 0 : val);
                    }, 0);
                }
            } catch (e) {
                console.error("Error fetching total drink slots:", e);
            }

            const label = isZh ? "轉盤位置" : "Wheel";
            stickerContainer.innerHTML = `
                <div class="bg-yellow-200 border border-yellow-400 shadow-[3px_3px_0_0_rgba(0,0,0,0.3)] px-3 py-2 rotate-[1.5deg] text-center min-w-[80px]"
                     style="font-family: 'Architects Daughter', cursive;">
                    <div class="text-[8px] font-bold text-yellow-800 uppercase tracking-widest mb-1">${label}</div>
                    <div class="text-sm font-black text-black leading-none">${drinkSlots}<span class="text-[10px] font-normal text-gray-600">/${totalSlots}</span></div>
                </div>
            `;
        })();
    }

    const games = [
        { 
            id: '1_buy', 
            title: '很想到無邊搜索', 
            admins: '阿水, Ella',
            instruction: '內容:<br/>按搞事人指示，喺限時內交出指量數目嘅物品'
        },
        { 
            id: '2_iq', 
            title: '愛也單純到 會忘掉智商', 
            admins: '肥鴨',
            instruction: '內容:<br/>喺搞事人手中抽一份時事常識問答比賽題目作答，答啱50%先合格。可以喺小隊入面一齊討論，答題期間唔可以上網或者用電話。每組只可以挑戰一次。'
        },
        { 
            id: '3_pose', 
            title: '忘記 美不美', 
            admins: '蔡頭',
            instruction: '內容:<br/>根據搞事人提供嘅圖片，合作還原圖中嘅情境，由搞事人影相確認完成'
        },
        { 
            id: '4_lyrics', 
            title: '由我來獨唱', 
            admins: '曹Hei',
            instruction: '內容:<br/>由音樂情人曹Hei出題，考驗小隊成員嘅粵語音樂素養'
        },
        { 
            id: '5_photo', 
            title: '吊在漁網上娛賓', 
            admins: '一對新人',
            instruction: '內容:<br/>交出一張【全組成員】同一對新人嘅合照'
        }
    ];
    
    const adminLabel = "負責搞事:";
    const marksLabel = isZh ? "20分" : "20 marks";

    let completedCount = 0;
    let cardsHtml = '';
    
    games.forEach(g => {
        const isCompleted = gameData && gameData[g.id] !== null && gameData[g.id] !== "";
        if (isCompleted) completedCount++;
        
        // Design state
        const headerBg = isCompleted ? 'bg-green-600' : 'bg-gray-400';
        const checkboxContent = isCompleted 
            ? '<i class="fa-solid fa-check text-green-600 text-lg"></i>' 
            : '';
            
        cardsHtml += `
            <div class="card-sketch border-2 border-black bg-white overflow-hidden shadow-[4px_4px_0_0_#000] mb-4">
                <div class="${headerBg} text-white p-4 flex justify-between items-center cursor-pointer active:brightness-90 transition" onclick="this.nextElementSibling.classList.toggle('hidden')">
                    <h4 class="font-bold text-sm uppercase mono tracking-widest">${g.title}</h4>
                    <i class="fa-solid fa-chevron-down"></i>
                </div>
                <div class="hidden flex-col bg-white text-black">
                    <!-- INSTRUCTION SECTION NEW -->
                    <div class="p-4 pb-2 text-xs font-mono text-gray-800 leading-relaxed">
                        ${g.instruction}
                    </div>
                    
                    <!-- ADMIN SECTION -->
                    <div class="px-4 pb-4 text-xs font-mono text-gray-500 leading-relaxed">
                        ${adminLabel} <br/>${g.admins}
                    </div>
                    
                    <div class="border-t border-gray-300 mx-4"></div>
                    <div class="p-4 flex justify-between items-center">
                        <span class="font-bold text-xs">${marksLabel}</span>
                        <div class="w-6 h-6 border-2 border-black flex items-center justify-center bg-gray-50 shadow-[2px_2px_0_0_#000]">
                            ${checkboxContent}
                        </div>
                    </div>
                </div>
            </div>
        `;
    });

    const container = document.getElementById("mission-cards-container");
    if (container) container.innerHTML = cardsHtml;
    
    const progress = (completedCount / 5) * 100;
    const progressText = document.getElementById("mission-progress-text");
    const progressBar = document.getElementById("mission-progress-bar");
    if (progressText) progressText.textContent = `${progress}%`;
    if (progressBar) progressBar.style.width = `${progress}%`;
}

function subscribeToGameUpdates() {
    if (!guestData || !guestData.squad_name || guestData.squad_name.toUpperCase() === "UNASSIGNED") return;

    // Prevent duplicate subscriptions on re-renders
    if (window._gameSubscription) {
        window._gameSubscription.unsubscribe();
    }

    window._gameSubscription = db
        .channel('game-updates')
        .on(
            'postgres_changes',
            {
                event: '*', // INSERT, UPDATE, DELETE
                schema: 'public',
                table: 'game',
                filter: `squad_name=eq.${guestData.squad_name}`
            },
            (payload) => {
                console.log("Game table updated:", payload);
                const updatedGameData = payload.new;

                // Re-read current squad colour from guestData
                let squadColour = '#777777';
                if (guestData.squad_colour && guestData.squad_colour !== "NULL") {
                    squadColour = guestData.squad_colour.startsWith('#')
                        ? guestData.squad_colour
                        : `#${guestData.squad_colour}`;
                }

                // Recalculate drink slots from the fresh payload
                const gamesList = ['1_buy', '2_iq', '3_pose', '4_lyrics', '5_photo'];
                let updatedDrinkSlots = 3;
                gamesList.forEach(g => {
                    if (updatedGameData[g] === null || updatedGameData[g] === "") updatedDrinkSlots++;
                });
                if (updatedGameData.penalty === true) updatedDrinkSlots += 6;

                if (typeof renderMissions === 'function') {
                    renderMissions(updatedGameData, squadColour, updatedDrinkSlots);
                }
            }
        )
        .subscribe();
}

// --- NOTICE BOARD LOGIC ---
async function loadNotices() {
    const listEl = document.getElementById('notice-list');
    if(!listEl) return;

    // Fetch from Supabase 'notices' table
    const { data: notices, error } = await db.from('notice').select('*');
    
    if (error) {
        console.error("Error loading notices:", error);
        listEl.innerHTML = '<div class="text-center text-xs text-red-500 font-mono mt-4">Failed to load notices</div>';
        return;
    }

    const now = new Date();
            
            // Helper function to parse "YYYYMMDDhhmmss" into a real JS Date object
            const parseCustomDate = (str) => {
                if (!str || str.length < 14) return new Date(0);
                const YYYY = parseInt(str.substring(0, 4), 10);
                const MM = parseInt(str.substring(4, 6), 10) - 1; // JS months are 0-11
                const DD = parseInt(str.substring(6, 8), 10);
                const hh = parseInt(str.substring(8, 10), 10);
                const mm = parseInt(str.substring(10, 12), 10);
                const ss = parseInt(str.substring(12, 14), 10);
                return new Date(YYYY, MM, DD, hh, mm, ss);
            };

            // 1. Filter: Only show if current time is >= notice datetime
            let validNotices = notices.filter(n => {
                if (!n.datetime) return false;
                const nDate = parseCustomDate(String(n.datetime));
                return now >= nDate;
            });

            // 2. Sort: Most recent on top
            validNotices.sort((a, b) => parseCustomDate(String(b.datetime)) - parseCustomDate(String(a.datetime)));

            if (validNotices.length === 0) {
                listEl.innerHTML = `<div class="text-center text-xs text-gray-500 font-mono mt-4">No updates at the moment...</div>`;
                return;
            }

            // 3. Render Minimal Cards for Pop-up Logic
            const storageKey = `readNotices_${guestData ? guestData.uid : 'guest'}`;
            let readNotices = [];
            try {
                readNotices = JSON.parse(localStorage.getItem(storageKey)) || [];
            } catch(e) {}

            listEl.innerHTML = validNotices.map(n => {
                const noticeId = String(n.datetime).trim();
                const nDate = parseCustomDate(noticeId);
                const dateStr = nDate.toLocaleString('en-GB', { day: 'numeric', month: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', '');
                
                const isNew = !readNotices.includes(noticeId);
                
                // Encode quotes safely so they don't break the HTML data attributes
                const safeSubject = String(n.subject).replace(/"/g, '&quot;');
                const safeContent = String(n.content).replace(/"/g, '&quot;');

                // Determine Language state for the "NEW" badge (This MUST be OUTSIDE the return block!)
                const isZh = document.body.classList.contains('lang-zh');
                const newText = isZh ? "未讀" : "NEW";
                
                return `
                <div class="card-sketch p-5 bg-white relative cursor-pointer group notice-card active:scale-[0.98] transition-transform" 
                     data-id="${noticeId}" 
                     data-subject="${safeSubject}" 
                     data-content="${safeContent}" 
                     data-date="${dateStr}">
                     
                    <div class="notice-new-badge absolute -top-3 -right-3 bg-[var(--red)] text-white text-xs font-bold px-2 py-1 rotate-3 border-2 border-black ${isNew ? '' : 'hidden'}">${newText}</div>
                    
                    <!-- Header Only Preview -->
                    <div class="flex justify-between items-center">
                        <h3 class="font-bold text-sm uppercase group-active:text-[var(--red)] transition-colors pr-4 truncate">${n.subject}</h3>
                        <div class="text-[10px] text-gray-400 whitespace-nowrap ml-2">${dateStr}</div>
                    </div>
                </div>
                `;
            }).join("");

            // 4. Attach Click Listeners to Open the Reader Modal
            const cards = listEl.querySelectorAll('.notice-card');
            cards.forEach(card => {
                card.onclick = function() {
                    const nId = this.getAttribute('data-id');
                    const nSubject = this.getAttribute('data-subject');
                    const nContent = this.getAttribute('data-content');
                    const nDate = this.getAttribute('data-date');
                    const badge = this.querySelector('.notice-new-badge');

                    // Populate the modal fields
                    document.getElementById('nr-subject').textContent = nSubject;
                    document.getElementById('nr-datetime').textContent = nDate;
                    document.getElementById('nr-content').textContent = nContent;

                    // Open the modal
                    const readModal = document.getElementById('notice-read-modal');
                    if (readModal) {
                        readModal.classList.remove('hidden');
                        readModal.classList.add('flex');
                    }
                    
                    // Mark as read in local storage
                    if (!readNotices.includes(nId)) {
                        readNotices.push(nId);
                        localStorage.setItem(storageKey, JSON.stringify(readNotices));
                        
                        // Hide the NEW badge instantly on the card
                        if (badge) badge.classList.add('hidden');
                    }
                };
            });
}

function setupNoticeAdmin() {
    const adminBtn = document.getElementById("btn-admin-add-notice");
    const addModal = document.getElementById("notice-add-modal");
    const confirmModal = document.getElementById("notice-confirm-modal");
    const nowCb = document.getElementById("nt-now-cb");
    const dtGroup = document.getElementById("nt-datetime-group");
    const ddSelect = document.getElementById("nt-dd");
    const hhSelect = document.getElementById("nt-hh");
    const mmSelect = document.getElementById("nt-mm");

    // 1. Setup Admin UI Permissions
    const authorizedAdmins = ["admin_001", "admin_002", "admin_003"];
    if (adminBtn && typeof guestData !== "undefined" && guestData && authorizedAdmins.includes(guestData.uid)) {
        adminBtn.classList.remove("hidden");
    }

    // 2. Populate Dropdowns dynamically
    if (ddSelect && ddSelect.options.length === 0) {
        for(let i=1; i<=31; i++) ddSelect.add(new Option(i.toString().padStart(2, '0'), i.toString().padStart(2, '0')));
        for(let i=0; i<=23; i++) hhSelect.add(new Option(i.toString().padStart(2, '0'), i.toString().padStart(2, '0')));
        for(let i=0; i<=59; i++) mmSelect.add(new Option(i.toString().padStart(2, '0'), i.toString().padStart(2, '0')));
    }

    if (!adminBtn) return; // Stop if elements missing

    // 3. Interactions
    adminBtn.onclick = () => {
        if(addModal) {
            addModal.classList.remove("hidden");
            addModal.classList.add("flex");
        }
    };

    if (nowCb) {
        nowCb.onchange = (e) => {
            const isNow = e.target.checked;
            [ddSelect, hhSelect, mmSelect].forEach(sel => {
                if(sel) {
                    sel.disabled = isNow;
                    isNow ? sel.classList.add("bg-gray-100") : sel.classList.remove("bg-gray-100");
                }
            });
            if (dtGroup) isNow ? dtGroup.classList.add("opacity-50") : dtGroup.classList.remove("opacity-50");
        };
    }

    let pendingNoticeData = null;

    // SAFEGUARD: Only attach if button exists
    const btnSubmitNotice = document.getElementById("btn-submit-notice");
    if (btnSubmitNotice) {
        btnSubmitNotice.onclick = () => {
            const subjEl = document.getElementById("nt-subject");
            const contEl = document.getElementById("nt-content");
            const subject = subjEl ? subjEl.value.trim() : "";
            const content = contEl ? contEl.value.trim() : "";
            
            let finalDateStr;
            if (nowCb && nowCb.checked) {
                const n = new Date();
                const p = num => String(num).padStart(2, '0');
                // Format strictly as YYYYMMDDhhmmss
                finalDateStr = `${n.getFullYear()}${p(n.getMonth()+1)}${p(n.getDate())}${p(n.getHours())}${p(n.getMinutes())}00`;
            } else if (ddSelect && hhSelect && mmSelect) {
                // Hardcode 202603 for your event, and pull DD/HH/MM from dropdowns
                finalDateStr = `202603${ddSelect.value}${hhSelect.value}${mmSelect.value}00`;
            }


            pendingNoticeData = { subject, content, datetime: finalDateStr };
            
            if(addModal) {
                addModal.classList.add("hidden");
                addModal.classList.remove("flex");
            }
            if(confirmModal) {
                confirmModal.classList.remove("hidden");
                confirmModal.classList.add("flex");
            }
        };
    }

    // SAFEGUARD: Only attach if button exists
    const btnFinalConfirm = document.getElementById("btn-final-confirm-notice");
    if (btnFinalConfirm) {
        btnFinalConfirm.onclick = async () => {
            console.log("DB Update: Writing to notice", pendingNoticeData);
            await db.from('notice').insert([ pendingNoticeData ]);

            const subjEl = document.getElementById("nt-subject");
            const contEl = document.getElementById("nt-content");
            if (subjEl) subjEl.value = "";
            if (contEl) contEl.value = "";
            
            if(nowCb) {
                nowCb.checked = true;
                nowCb.dispatchEvent(new Event("change"));
            }

            if(confirmModal) {
                confirmModal.classList.add("hidden");
                confirmModal.classList.remove("flex");
            }
            
            loadNotices(); // Refresh view
        };
    }
}

// --- PROFILE LOGIC
async function setupMemoryLane() {
    const memoryCard = document.getElementById('memory-card');
    const memoryImg = document.getElementById('memory-img');
    const memoryLock = document.getElementById('memory-lock');
    const txtMemory = document.getElementById('txt-memory');

    if (!memoryCard || !guestData) return;

    const hasImage = guestData.iconExist === true || guestData.iconExist === 'true' || guestData.iconExist === 'TRUE';
    
    if (!hasImage || !guestData.icon_filename || guestData.icon_filename === 'NULL') {
        memoryCard.classList.add('hidden');
        return; 
    }

    memoryCard.classList.remove('hidden');

    const revealDate = new Date("2026-03-25T18:30:00+08:00");
    const now = new Date();

    // 3. Time Logic
    if (now < revealDate) {
        // --- LOCKED STATE (BEFORE TIME IS UP) ---
        memoryLock.classList.remove('hidden'); 
        memoryImg.style.backgroundImage = 'none'; 
        
        // Remove blur classes just to be safe
        memoryImg.classList.remove('filter', 'blur-[15px]', 'scale-110');
        
        txtMemory.textContent = "REVEALS MAR 25, 18:30";
        memoryCard.onclick = null; 
        return; 
    }

    // --- UNLOCKED STATE (TIME IS UP!) ---
    const SUPABASE_PROJECT_ID = "oobjykyxsxhuvspnngbu"; 
    const targetFileName = guestData.icon_filename.trim();
    const validUrl = `https://${SUPABASE_PROJECT_ID}.supabase.co/storage/v1/object/public/memory/${targetFileName}`;

    memoryLock.classList.add('hidden'); 
    memoryImg.style.backgroundImage = `url('${validUrl}')`; 
    
    // 🔥 1. Remove the grayscale class so the color comes back!
    memoryImg.classList.remove('grayscale');

    // 🔥 You can adjust 'blur-[10px]' to 'blur-[5px]' or 'blur-[15px]' right here:
    memoryImg.classList.add('filter', 'blur-[15px]', 'scale-110');
    
    const isZh = document.body.classList.contains('lang-zh');
    txtMemory.textContent = isZh ? "精選照片" : "carefully selected photo";

    // Setup fullscreen popup
    const dialog = document.getElementById('image-modal');
    const fullImg = document.getElementById('full-memory-img');
    const closeBtn = document.getElementById('btn-close-image');
    const downloadBtn = document.getElementById('btn-download-image');

    if (dialog && fullImg) {
        memoryCard.onclick = () => {
            fullImg.src = validUrl;
            
            if (downloadBtn) {
                // 1. Dynamic Filename Logic (HK Time)
                const eventStart = new Date("2026-03-28T18:30:00+08:00").getTime();
                const now = new Date().getTime();
                const givenName = (guestData.givenname && guestData.givenname !== "NULL") ? guestData.givenname.trim() : "";
                
                // Extract the extension from the image URL (e.g., .jpg, .png)
                const extMatch = validUrl.match(/\.([a-zA-Z0-9]+)(?:[\?#]|$)/);
                const ext = extMatch ? extMatch[1] : "jpg";
                
                const prefix = now < eventStart ? "SeeYouAtTheParty" : "ThankYouForComing";
                const customFileName = `${prefix}${givenName}.${ext}`;

                // 2. Set the fallback download behavior
                // Forces Supabase to download with our custom filename if the user insists on a file
                downloadBtn.href = `${validUrl}?download=${encodeURIComponent(customFileName)}`;

                // 3. Intercept the click to attempt "Save to Photos" via native Share Sheet
                downloadBtn.onclick = async (e) => {
                    try {
                        const response = await fetch(validUrl);
                        const blob = await response.blob();
                        const file = new File([blob], customFileName, { type: blob.type });
                        
                        // If the device supports Web Share (iOS/Android), open the share sheet
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            e.preventDefault(); // Stop the default file download
                            await navigator.share({
                                files: [file],
                                title: 'Memory Lane Photo'
                            });
                        }
                    } catch (err) {
                        console.log("Web share cancelled or unsupported, falling back to standard file download.", err);
                        // It will silently fail and let the <a> tag download the file normally
                    }
                };
            }
            
            dialog.showModal();
        };
        
        if (closeBtn) closeBtn.onclick = () => dialog.close();
        dialog.onclick = (e) => {
            // Close if clicking outside the image boundaries
            if (e.target === dialog || e.target.tagName === 'DIV') dialog.close();
        };
    }
}

// --- NAV BAR LOGIC
function toggleNavTabs(isPostCheckin) {
    const navMissions = document.getElementById("nav-missions");
    const navTeam = document.getElementById("nav-team");
    const navNotice = document.getElementById("nav-notice");
    const navCamera = document.getElementById("nav-camera");

    if (isPostCheckin) {
        if (navMissions) navMissions.classList.remove("hidden");
        if (navTeam) navTeam.classList.remove("hidden");
        if (navNotice) navNotice.classList.add("hidden");
        if (navCamera) navCamera.classList.add("hidden");
        // If user is currently looking at a hidden tab, force them to Home
        const currentActive = document.querySelector('.nav-item.active');
        if (currentActive && (currentActive.id === 'nav-notice' || currentActive.id === 'nav-camera')) {
            nav('home');
        }                
    } else {
        if (navMissions) navMissions.classList.add("hidden");
        if (navTeam) navTeam.classList.add("hidden");
        if (navNotice) navNotice.classList.remove("hidden");
        if (navCamera) navCamera.classList.remove("hidden");
        // If user is currently looking at a hidden tab, force them to Home
        const currentActive = document.querySelector('.nav-item.active');
        if (currentActive && (currentActive.id === 'nav-missions' || currentActive.id === 'nav-team')) {
            nav('home');
        }                
    }
}

function nav(tabId) {
    // 1. Hide all tabs and remove active state from all nav buttons
    document.querySelectorAll('.iphone-container > div[id^="tab-"]').forEach(el => el.classList.add('hidden-tab'));
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
    
    // 2. Show the selected tab and make its nav button active
    document.getElementById('tab-' + tabId).classList.remove('hidden-tab');
    document.getElementById('nav-' + tabId).classList.add('active');

    // 3. --- NEW LOGIC: Stop Camera if leaving the Camera tab ---
    // If we are NOT navigating to the camera tab, kill any active video streams
    if (tabId !== 'camera') {
        if (window.currentStream) {
            // Stop all hardware tracks (turns off the green light)
            window.currentStream.getTracks().forEach(track => track.stop());
            window.currentStream = null;
            
            // Reset the UI elements
            const videoFeed = document.getElementById('camera-feed');
            const scanAnimation = document.getElementById('scan-animation');
            const cameraPlaceholder = document.getElementById('camera-placeholder');
            const btnOpenCamera = document.getElementById('btn-open-camera');
            
            if (videoFeed) {
                videoFeed.srcObject = null;
                videoFeed.classList.add('hidden');
            }
            if (scanAnimation) scanAnimation.classList.add('hidden');
            if (cameraPlaceholder) cameraPlaceholder.classList.remove('hidden');
            
            if (btnOpenCamera) {
                btnOpenCamera.textContent = document.body.classList.contains('lang-zh') ? "打開相機" : "Open Camera";
                btnOpenCamera.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }
    if (tabId === 'home') {
        if (typeof setRandomTip === 'function') setRandomTip();
    }
}

// --- SETTINGS & PERMISSIONS LOGIC ---

// Safe Camera Authorization Request
const camBtn = document.getElementById('btn-auth-camera');
if (camBtn) {
    camBtn.addEventListener('click', async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            alert("Camera access granted successfully!");
            stream.getTracks().forEach(track => track.stop()); 
        } catch (err) {
            alert("Camera access denied or unavailable. Check your device settings.");
        }
    });
}

// Safe Notification Authorization Request
const notifBtn = document.getElementById('btn-auth-notif');
if (notifBtn) {
    notifBtn.addEventListener('click', async () => {
        if (!("Notification" in window)) {
            alert("This browser does not support push notifications.");
            return;
        }
        try {
            const permission = await Notification.requestPermission();
            if (permission === "granted") {
                alert("Notifications enabled successfully!");
            } else {
                alert("Notification access denied.");
            }
        } catch (err) {
            console.error("Error requesting notification permission:", err);
        }
    });
}

// Helper to extract localized district name
function getLocalizedDistrictName(districtVal, isZh) {
    const opt = document.querySelector(`#uber-district-select option[value="${districtVal}"]`);
    if (!opt) return districtVal;
    
    const match = opt.textContent.match(/^(.*?)\s*\((.*?)\)$/);
    if (match) {
        const p1 = match[1].trim();
        const p2 = match[2].trim();
        const p1HasZh = /[\u4e00-\u9fa5]/.test(p1);
        
        if (isZh) return p1HasZh ? p1 : p2; 
        return p1HasZh ? p2 : p1;           
    }
    return districtVal;
}

nav('home');