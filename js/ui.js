// 3. UI Updates after successful login

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
    const isTestAdmin = (guestData.uid === 'admin_003' 
        || guestData.uid === 'guest_000'
    );

    // 3. Time Logic
    if (now < revealDate && !isTestAdmin) {
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

async function populateUIWithGuestData() {
    if (!window.guestData) return;
    const guestData = window.guestData;

    setupMemoryLane();

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
    
    // --- NEW: Dynamic Profile Greeting ---
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
    // -------------------------------------

    // 4) Squad label format: "Squad TOPAZ"
    // 改良版Team Tab顏色及名稱設定
    function updateTeamTabUI() {
        if (!guestData) return false; // 如無數據則退出

        // 1. 更新Squad名稱
        const rawSquad = (guestData.squad_name || "Unassigned").toString().trim();
        const displaySquad = rawSquad === "NULL" ? "UNASSIGNED" : rawSquad.toUpperCase();
        const squadLabel = document.getElementById("lbl-squad");
        
        if (squadLabel) {
            squadLabel.textContent = "Squad " + displaySquad;
            console.log(`Set squad name to: ${displaySquad}`);
        } else {
            console.error("Squad label element not found");
        }

        // 2. 更新背景顏色
        const teamTabBg = document.querySelector("#tab-team .absolute.inset-0");
        if (!teamTabBg) {
            console.error("Team tab background element not found");
            return false;
        }

        let squadColor = guestData.squad_colour || "";
        squadColor = squadColor.trim();
        
        // 檢查顏色值是否有效
        if (squadColor && squadColor !== "NULL") {
            try {
                // 確保顏色格式正確（加上#前綴如果沒有）
                const hexColor = squadColor.startsWith("#") ? squadColor : ("#" + squadColor);
                // 簡單驗證十六進制顏色格式
                if (/^#[0-9A-F]{3,6}$/i.test(hexColor)) {
                    teamTabBg.style.backgroundColor = hexColor;
                    console.log(`Applied team color: ${hexColor}`);
                } else {
                    console.warn(`Invalid color format: ${squadColor}, using default`);
                    teamTabBg.style.backgroundColor = "#888888"; // 默認灰色
                }
            } catch (err) {
                console.error("Error setting team color:", err);
                teamTabBg.style.backgroundColor = "#888888"; // 出錯時使用默認灰色
            }
        } else {
            // 無顏色或顏色為"NULL"時使用默認值
            teamTabBg.style.backgroundColor = "#888888";
            console.log("No valid squad color, using default");
        }
        
        return true;
    }

    // 2) Base Drink Slots from squad_drinkslot
    let drinkSlots = parseInt(guestData.squad_drinkslot || "0", 10);
    if (Number.isNaN(drinkSlots)) drinkSlots = 0;

    // 3) +1 penalty if now is 90 mins past checkin_time and no mission completion
    const penaltyText = document.getElementById("txt-penalty");
    if (penaltyText) penaltyText.classList.add("hidden"); // Hide by default
    
    if (guestData.checkin_time) {
        const checkinDate = new Date(guestData.checkin_time);
        const minsPast = (Date.now() - checkinDate.getTime()) / 90000;
        const taskPt = parseInt(guestData.ind_taskpt || "0", 10);
        // If 60+ minutes have passed and no points
        if (minsPast >= 60 && taskPt === 0) {
            drinkSlots += 1;
            if (penaltyText) penaltyText.classList.remove("hidden"); // Show penalty phrase
        }
    }

    // Write drink slots to BOTH places (Home big number + Profile mini card)
    // Home: the big number currently has no id, so we add minimal targeting.
    const homeDrinkNumber = document.querySelector("#tab-home .text-5xl.font-black.handwritten");
    if (homeDrinkNumber) homeDrinkNumber.textContent = String(drinkSlots);

    const profileDrinkNumber = document.querySelector("#tab-profile #lbl-drink-slots-mini")
        ?.parentElement?.querySelector(".font-bold.text-var--red.text-xl.handwritten");
    if (profileDrinkNumber) profileDrinkNumber.textContent = String(drinkSlots);

    // Also keep the title text consistent
    document.getElementById("lbl-drink-slots").textContent = "Drink Slots";

    // --- UBER MATCH LOGIC ---
    const uberToggleWrapper = document.getElementById('btn-uber-toggle'); 
    const uberToggleText = document.getElementById('uber-toggle-text'); 
    const uberToggleKnob = document.getElementById('uber-toggle-knob'); 
    const uberBox = document.getElementById('uber-match-list');
    const uberModal = document.getElementById('uber-modal');
    const confirmUberBtn = document.getElementById('btn-confirm-uber');
    const districtSelect = document.getElementById('uber-district-select');
    const uberHint = document.getElementById('uber-hint'); 

    // 1. Safely parse the uber_match state (handles null, undefined, boolean, and strings)
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

    // Saving the Drunk Pick-up Form:
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




    // ADD THESE TWO LINES AT THE VERY END
    updateStatusCard(); 
    setRandomTip();
    
    // Initialize Notice logic and check admin rights
    setupNoticeAdmin();
    loadNotices();
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

function updateHomeTabLayout(isCheckedIn) {
    const preHeader = document.getElementById("home-precheckin-header");
    const transportBtn = document.getElementById("btn-transport");
    const surveyBtn = document.getElementById("btn-survey");
    
    const drinkCard = document.getElementById("home-drink-card");
    const wifiCard = document.getElementById("home-wifi-card");
    const tipsCard = document.getElementById("home-tips-card");

    if (isCheckedIn) {
        // Hide "Before" elements
        if (preHeader) preHeader.classList.add("hidden");
        if (transportBtn) transportBtn.classList.add("hidden");
        if (surveyBtn) surveyBtn.classList.add("hidden");
        
        // Show "After" elements
        if (drinkCard) drinkCard.classList.remove("hidden");
        if (wifiCard) wifiCard.classList.remove("hidden");
        if (tipsCard) tipsCard.classList.remove("hidden");
        
        // Show correct Nav Tabs
        toggleNavTabs(true);
    } else {
        // Show "Before" elements
        if (preHeader) preHeader.classList.remove("hidden");
        if (transportBtn) transportBtn.classList.remove("hidden");
        if (surveyBtn) surveyBtn.classList.remove("hidden");
        
        // Hide "After" elements
        if (drinkCard) drinkCard.classList.add("hidden");
        if (wifiCard) wifiCard.classList.add("hidden");
        if (tipsCard) tipsCard.classList.add("hidden");
        
        // Show correct Nav Tabs
        toggleNavTabs(false);
    }
}

function toggleNavTabs(isCheckedIn) {
    if (!guestData || !guestData.uid) return;
    
    // Run the role-based routing
    setRBACNav(guestData.uid, isCheckedIn);

    // Safety fallback: If they are looking at a tab that is now hidden, force them to Home
    const currentActive = document.querySelector('.nav-item.active');
    if (currentActive && currentActive.classList.contains('hidden')) {
        nav('home');
    }
}

function nav(tabId) {
    // 1. Hide all tabs and remove active state from ALL nav buttons
    document.querySelectorAll('.iphone-container').forEach(el => {
        el.classList.add('hidden-tab');
    });
    
    // Select all nav items and remove active class
    document.querySelectorAll('.nav-item').forEach(el => {
        el.classList.remove('active');
        // Reset text color for inactive state (we use specific colors for admin tabs)
        el.classList.remove('text-black');
        el.classList.add('text-gray-400');
    });

    // 2. Show the selected tab
    const selectedTab = document.getElementById('tab-' + tabId);
    if (selectedTab) {
        selectedTab.classList.remove('hidden-tab');
    }

    // 3. Make the selected nav button active
    const selectedNav = document.getElementById('nav-' + tabId);
    if (selectedNav) {
        selectedNav.classList.add('active');
        selectedNav.classList.remove('text-gray-400');
        
        // Restore specific colors based on the active tab
        if (tabId === 'broadcast') selectedNav.classList.add('text-var--red');
        else if (tabId === 'squad-dashboard') selectedNav.classList.add('text-blue-600');
        else if (tabId === 'master-dashboard') selectedNav.classList.add('text-purple-600');
        else if (tabId === 'mission-approval') selectedNav.classList.add('text-green-600');
        else selectedNav.classList.add('text-black'); // Default active color
    }

    // 4. --- Stop Camera if leaving the Camera tab ---
    if (tabId !== 'camera') {
        if (window.currentStream) {
            window.currentStream.getTracks().forEach(track => track.stop());
            window.currentStream = null;
        }
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
            btnOpenCamera.textContent = document.body.classList.contains('lang-zh') ? '開啟相機' : 'Open Camera';
            btnOpenCamera.classList.remove('opacity-50', 'cursor-not-allowed');
        }
    }
}

function setRBACNav(uid, isCheckedIn) {
    // 1. Get all nav elements
    const nNotice = document.getElementById('nav-notice');
    const nCamera = document.getElementById('nav-camera');
    const nMissions = document.getElementById('nav-missions');
    const nTeam = document.getElementById('nav-team'); // 'Squad' Tab
    const nProfile = document.getElementById('nav-profile');
    
    // Admin elements
    const nBroadcast = document.getElementById('nav-broadcast');
    const nSquadDash = document.getElementById('nav-squad-dashboard');
    const nMasterDash = document.getElementById('nav-master-dashboard');
    const nApproval = document.getElementById('nav-mission-approval');

    // Helper function to hide all restricted tabs (Home is always visible so we don't hide it)
    const hideAllRestricted = () => {
        [nNotice, nCamera, nMissions, nTeam, nProfile, nBroadcast, nSquadDash, nMasterDash, nApproval].forEach(el => {
            if(el) el.classList.add('hidden');
        });
    };

    hideAllRestricted(); // Reset to blank slate

    // Define roles
    const coreAdmins = ['admin_001', 'admin_002', 'admin_010'];
    const isCoreAdmin = coreAdmins.includes(uid);
    const isOpsAdmin = uid.startsWith('admin_00') && !isCoreAdmin; // Admins 003-009

    // --- ROLE 1: CORE ADMINS ---
    if (isCoreAdmin) {
        if (!isCheckedIn) {
            // Before Event
            if(nNotice) nNotice.classList.remove('hidden');
            if(nCamera) nCamera.classList.remove('hidden');
            if(nMasterDash) nMasterDash.classList.remove('hidden');
        } else {
            // From Event Start
            if(nBroadcast) nBroadcast.classList.remove('hidden');
            if(nSquadDash) nSquadDash.classList.remove('hidden');
            if(nMasterDash) nMasterDash.classList.remove('hidden');
        }
        return;
    }

    // --- ROLE 2: OPS ADMINS ---
    if (isOpsAdmin) {
        if (!isCheckedIn) {
            // Before Event
            if(nNotice) nNotice.classList.remove('hidden');
            if(nCamera) nCamera.classList.remove('hidden');
            if(nProfile) nProfile.classList.remove('hidden');
        } else {
            // From Event Start
            if(nApproval) nApproval.classList.remove('hidden');
            if(nSquadDash) nSquadDash.classList.remove('hidden');
            if(nProfile) nProfile.classList.remove('hidden');
        }
        return;
    }

    // --- ROLE 3: GUESTS ---
    if (uid.startsWith('guest')) {
        if (!isCheckedIn) {
            // Before Event
            if(nNotice) nNotice.classList.remove('hidden');
            if(nCamera) nCamera.classList.remove('hidden');
            if(nProfile) nProfile.classList.remove('hidden');
        } else {
            // From Event Start
            if(nMissions) nMissions.classList.remove('hidden');
            if(nTeam) nTeam.classList.remove('hidden');
            if(nProfile) nProfile.classList.remove('hidden');
        }
    }
}

const targetDate = new Date(2026, 2, 28, 18, 30, 0); 

function updateCountdown() {
    const now = new Date();
    let diff = targetDate.getTime() - now.getTime();
    if (diff <= 0) {
        document.getElementById('cd-days').textContent = '00';
        document.getElementById('cd-hours').textContent = '00';
        document.getElementById('cd-mins').textContent = '00';
        return;
    }
    const msInMinute = 60 * 1000, msInHour = 60 * msInMinute, msInDay = 24 * msInHour;
    const days = Math.floor(diff / msInDay); diff -= days * msInDay;
    const hours = Math.floor(diff / msInHour); diff -= hours * msInHour;
    const mins = Math.floor(diff / msInMinute);
    document.getElementById('cd-days').textContent = String(days).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('cd-mins').textContent = String(mins).padStart(2, '0');
}

const PARTY_TIPS = [
    "Say hi to someone from a different group—instant new friend.",
    "Drink water between rounds. Your future self will thank you.",
    "Use Uber matching if you’re heading the same way.",
    "Set your Drunk Pick-up Contact before you need it."
];

function setRandomTip() {
    const el = document.getElementById("txt-party-tip");
    if (!el) return;
    el.textContent = PARTY_TIPS[Math.floor(Math.random() * PARTY_TIPS.length)];
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