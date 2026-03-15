const translations = {
    en: {
        address: "Shop H01, G/F, Fashion Walk, 9 Kingston St, Causeway Bay",
        days: "Days",
        hours: "Hrs",
        mins: "Mins",
        statusSoon: "Status: Coming Soon...",
        statusSub: "Doors open at 18:30, 28 Mar 2026.",
        statusChecked: "Status: Checked In",
        statusCheckedSub: "Enjoy the chaos.",
        statusNotChecked: "Status: Not Checked In",
        statusNotCheckedSub: "Scan your QR code to check in.",
        transport: "TRANSPORTATION GUIDE",
        drinkSlots: "Drink Slots",
        penalty: "⚠️ Penalty Active: 'Chase Progress'",
        missions: "Missions",
        progress: "Progress",
        upload: "UPLOAD",
        squad: "Your Squad",
        teamHint: "Find this color in the crowd.",
        profile: "Profile",
        memory: "our precious moment",        
        active: "ACTIVE",
        uber: "Potential Uber Matches",
        save: "SAVE",
        phName: "Contact Name",
        phPhone: "Phone Number",
        phAddr: "Drop-off Address",
        navHome: "Home",
        navMissions: "Missions",
        navTeam: "Team",
        navProfile: "Profile"
    },
    zh: {
        address: "銅鑼灣京士頓街9號Fashion Walk地下H01號舖",
        days: "日",
        hours: "小時",
        mins: "分鐘",
        statusSoon: "狀態：敬請期待...",
        statusSub: "2026年3月28日 18:30 開放入場",
        statusChecked: "狀態：已簽到",
        statusCheckedSub: "「盡情狂歡！」",
        statusNotChecked: "狀態：快啲嚟！",
        statusNotCheckedSub: "請掃描您嘅二維碼簽到。",
        transport: "交通指引",
        drinkSlots: "飲酒額度",
        penalty: "⚠️ 懲罰執行中：「追進度」",
        missions: "任務清單",
        progress: "當前進度",
        upload: "上傳照片",
        squad: "你的小隊",
        teamHint: "在人群中尋找這個顏色。",
        profile: "個人檔案",
        memory: "我們的那年那天",
        active: "已開啟",
        uber: "潛在 Uber 隊友",
        save: "儲存",
        phName: "聯絡人姓名",
        phPhone: "電話號碼",
        phAddr: "接送地址",
        navHome: "首頁",
        navMissions: "任務",
        navTeam: "小隊",
        navProfile: "檔案"
    }
};

let currentLang = 'zh';
let hasCheckedIn = false;

function setLanguage(lang) {
    currentLang = lang;
    document.body.className = 'lang-' + lang;
    
    // Safely update toggle buttons
    const btnEn = document.getElementById('btn-en');
    const btnZh = document.getElementById('btn-zh');
    if (btnEn) btnEn.classList.toggle('active', lang === 'en');
    if (btnZh) btnZh.classList.toggle('active', lang === 'zh');

    const t = translations[lang];

    // Helper function to safely set textContent
    const safelySetText = (id, text) => {
        const el = document.getElementById(id);
        if (el && text) el.textContent = text;
    };

    // Home Tab
    safelySetText('txt-incoming', t.incoming);
    safelySetText('txt-address', t.address);
    safelySetText('lbl-days', t.days);
    safelySetText('lbl-hours', t.hours);
    safelySetText('lbl-mins', t.mins);
    safelySetText('lbl-drink-slots', t.drinkSlots);
    safelySetText('txt-penalty', t.penalty);
    const btnTransport = document.getElementById('btn-transport');
    if (btnTransport && btnTransport.querySelector('span')) {
        btnTransport.querySelector('span').textContent = t.transport;
    }

    // Missions
    safelySetText('lbl-missions-title', t.missions);
    // Note: If you hardcoded "25%" into progress, keep it, or use the translation
    safelySetText('lbl-progress', `${t.progress}: 25%`);
    safelySetText('btn-upload', t.upload);

    // Team
    safelySetText('lbl-squad', t.squad);
    safelySetText('txt-team-hint', t.teamHint);

    // Profile
    safelySetText('lbl-profile-title', t.profile);
    safelySetText('txt-memory', t.memory);
    safelySetText('lbl-uber', t.uber);
    safelySetText('btn-save', t.save);

    // Placeholders
    const inputName = document.getElementById('input-name');
    if (inputName) inputName.placeholder = t.phName;
    const inputPhone = document.getElementById('input-phone');
    if (inputPhone) inputPhone.placeholder = t.phPhone;
    const inputAddr = document.getElementById('input-addr');
    if (inputAddr) inputAddr.placeholder = t.phAddr;

    // Nav
    safelySetText('nav-lbl-home', t.navHome);
    safelySetText('nav-lbl-missions', t.navMissions);
    safelySetText('nav-lbl-team', t.navTeam);
    safelySetText('nav-lbl-profile', t.navProfile);

    if (typeof updateStatusCard === 'function') {
        updateStatusCard();
    }
}



