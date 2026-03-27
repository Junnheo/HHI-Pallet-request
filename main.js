import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

// ==========================================
// 💡 Firebase 설정 (Config) 삽입 위치
// 아래 firebaseConfig 객체를 본인의 Firebase 웹 앱 설정 값으로 덮어쓰세요!
// ==========================================
const firebaseConfig = {
    apiKey: "AIzaSyDTNmKGZppVPEnQydSg98n3mA_fgQAPfFQ",
    authDomain: "pallet-request.firebaseapp.com",
    projectId: "pallet-request",
    storageBucket: "pallet-request.firebasestorage.app",
    messagingSenderId: "11998640289",
    appId: "1:11998640289:web:c7cfcc302266eaeba7d8e0",
    measurementId: "G-V5YMX0D4D4"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// State Management
const STATE_KEY = 'pallet_app_data_v3';

const DEFAULT_STATE = {
    adminPassword: 'admin',
    partners: [
        { name: '동성정공', categories: ['Steel'], password: '1111' },
        { name: '동원', categories: ['Steel'], password: '1111' },
        { name: '신라', categories: ['Steel'], password: '1111' },
        { name: '화진정공', categories: ['Steel'], password: '1111' },
        { name: '진우 ENG', categories: ['Steel'], password: '1111' },
        { name: '진명', categories: ['Steel', 'SUS'], password: '2222' },
        { name: '엠큐', categories: ['SUS'], password: '2222' },
        { name: '세영 ENG', categories: ['SUS'], password: '2222' },
        { name: '태진', categories: ['SUS'], password: '2222' },
        { name: '명진TSR', categories: ['SUS', 'Poly'], password: '3333' },
        { name: '삼건세기', categories: ['Poly'], password: '3333' }
    ],
    requests: {}
};

let state = DEFAULT_STATE;

async function loadState() {
    try {
        const docRef = doc(db, "app_data", STATE_KEY);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            state = docSnap.data();

            // Migration check
            if (!state.adminPassword) {
                state.adminPassword = DEFAULT_STATE.adminPassword;
            }
            state.partners.forEach(p => {
                if (p.category) {
                    if (p.name === '진명') p.categories = ['Steel', 'SUS'];
                    else if (p.name === '명진TSR') p.categories = ['SUS', 'Poly'];
                    else p.categories = [p.category];
                    delete p.category;
                }
            });
        } else {
            await saveState(); // 최초 접속 시 초기 데이터 생성
        }
    } catch (error) {
        console.error("Firebase 데이터 로드 오류:", error);
        alert("데이터베이스 연결에 실패했습니다. Firebase 설정을 확인해주세요.");
    }
}

async function saveState() {
    try {
        await setDoc(doc(db, "app_data", STATE_KEY), state);
    } catch (error) {
        console.error("Firebase 데이터 저장 오류:", error);
        alert("데이터 저장 중 오류가 발생했습니다.");
    }
}

// Date Helpers
function getISOWeek(date) {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getWeekMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

function formatWeekLabel(date) {
    const weekNum = getISOWeek(date);
    const monday = getWeekMonday(date);
    const friday = new Date(monday);
    friday.setDate(monday.getDate() + 4);

    const mStr = `${monday.getMonth() + 1}/${monday.getDate()}`;
    const fStr = `${friday.getMonth() + 1}/${friday.getDate()}`;

    return `${weekNum}주 (${mStr} ~ ${fStr})`;
}

// DOM Elements
const partnerView = document.getElementById('partner-view');
const adminView = document.getElementById('admin-view');
const btnPartner = document.getElementById('btn-partner');
const btnAdmin = document.getElementById('btn-admin');
const submissionForm = document.getElementById('submission-form');
const weekSelect = document.getElementById('week-select');
const partnerSelect = document.getElementById('partner-select');
const partnerPasswordInput = document.getElementById('partner-password');
const tableBody = document.getElementById('table-body');
const tableFoot = document.querySelector('#consolidation-table tfoot');
const tableTitle = document.getElementById('table-title');
const numberInputs = document.querySelectorAll('input[type="number"]');

// Modal Elements
const adminModal = document.getElementById('admin-login-modal');
const adminPassInput = document.getElementById('admin-password-input');
const btnAdminLogin = document.getElementById('btn-admin-login');
const btnAdminCancel = document.getElementById('btn-admin-cancel');

let weekDatesMap = {};

// Initialize Week Options
function initWeekSelector() {
    weekSelect.innerHTML = '';
    weekDatesMap = {};
    const today = new Date();

    // Create options for: 1 week ahead (default), current week, and 3 weeks back
    for (let i = 1; i >= -3; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() + (i * 7));
        const weekNum = getISOWeek(d);
        weekDatesMap[weekNum] = getWeekMonday(d);
        let label = formatWeekLabel(d);
        if (i === 0) label = label.replace('주 ', '주 (현재 주차) ');
        else if (i === 1) label = label.replace('주 ', '주 (차주) ');

        const option = document.createElement('option');
        option.value = weekNum;
        option.textContent = label;
        if (i === 1) option.selected = true; // Auto-select next week
        weekSelect.appendChild(option);
    }
}

// Initialize Partner List
function initPartnerSelector() {
    const pwPartnerSelect = document.getElementById('pw-partner-select');

    state.partners.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.name;
        opt.textContent = p.name;
        partnerSelect.appendChild(opt);

        if (pwPartnerSelect) {
            const pwOpt = document.createElement('option');
            pwOpt.value = p.name;
            pwOpt.textContent = p.name;
            pwPartnerSelect.appendChild(pwOpt);
        }
    });
}

// View Switching with Auth
btnAdmin.addEventListener('click', () => {
    adminModal.classList.remove('hidden');
    adminPassInput.focus();
    window.scrollTo(0, 0);
});

btnAdminLogin.addEventListener('click', () => {
    console.log('Login attempt with:', adminPassInput.value);
    console.log('Current state admin pass:', state.adminPassword);

    if (adminPassInput.value === state.adminPassword) {
        console.log('Login success');
        adminModal.classList.add('hidden');
        adminView.classList.remove('hidden');
        partnerView.classList.add('hidden');
        btnAdmin.classList.add('active');
        btnPartner.classList.remove('active');
        renderAdminDashboard();
        adminPassInput.value = '';
        window.scrollTo(0, 0);
    } else {
        console.log('Login failed');
        alert('관리자 비밀번호가 틀렸습니다.');
    }
});

adminPassInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') btnAdminLogin.click();
});

btnAdminCancel.addEventListener('click', () => {
    adminModal.classList.add('hidden');
    adminPassInput.value = '';
});

btnPartner.addEventListener('click', () => {
    partnerView.classList.remove('hidden');
    adminView.classList.add('hidden');
    btnPartner.classList.add('active');
    btnAdmin.classList.remove('active');
    window.scrollTo(0, 0);
});

// Input interaction: Select all text on focus
numberInputs.forEach(input => {
    input.addEventListener('focus', () => input.select());
});

// Pre-fill form
function prefillForm() {
    const partnerName = partnerSelect.value;
    const week = weekSelect.value;
    if (!partnerName || !week) return;

    document.querySelectorAll('#submission-form input[type="number"]').forEach(input => input.value = 0);

    const partnerData = (state.requests[week] && state.requests[week][partnerName]) || {};

    const sections = document.querySelectorAll('.pallet-type-section');
    sections.forEach(section => {
        const type = section.dataset.type;
        if (partnerData[type]) {
            const typeData = partnerData[type];
            const inputs = section.querySelectorAll('input');
            inputs.forEach(input => {
                input.value = typeData[input.dataset.day] ?? 0;
            });
        }
    });
}

function updateFormDateLabels() {
    const weekNum = weekSelect.value;
    const monday = weekDatesMap[weekNum];
    if (!monday) return;

    const days = ['mon', 'tue', 'wed', 'thu', 'fri'];
    const koDays = ['월', '화', '수', '목', '금'];

    document.querySelectorAll('.pallet-type-section').forEach(section => {
        days.forEach((day, index) => {
            const input = section.querySelector(`input[data-day="${day}"]`);
            if (input) {
                const label = input.previousElementSibling;
                if (label && label.tagName === 'LABEL') {
                    const d = new Date(monday);
                    d.setDate(monday.getDate() + index);
                    label.textContent = `${koDays[index]}(${d.getDate()})`;
                }
            }
        });
    });

    // Update Admin Dashboard Table Headers
    const theadRow = document.querySelector('#consolidation-table thead tr');
    if (theadRow) {
        const thElements = theadRow.querySelectorAll('th');
        if (thElements.length >= 7) {
            days.forEach((day, index) => {
                const d = new Date(monday);
                d.setDate(monday.getDate() + index);
                thElements[index + 2].textContent = `${d.getDate()}(${koDays[index]})`;
            });
        }
    }
}

partnerSelect.addEventListener('change', prefillForm);
weekSelect.addEventListener('change', () => {
    tableTitle.textContent = `${weekSelect.value}주 사외 협력사 팔레트 필요 수량`;
    updateFormDateLabels();
    prefillForm();
    if (!adminView.classList.contains('hidden')) renderAdminDashboard();
});

// Form Submission with Password Check
submissionForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const partnerName = partnerSelect.value;
    const week = weekSelect.value;
    const password = partnerPasswordInput.value;

    const partner = state.partners.find(p => p.name === partnerName);
    if (!partner) return;

    if (password !== partner.password) {
        alert('업체 비밀번호가 일치하지 않습니다.');
        return;
    }

    if (!state.requests[week]) state.requests[week] = {};
    if (!state.requests[week][partnerName]) state.requests[week][partnerName] = {};

    const sections = document.querySelectorAll('.pallet-type-section');
    sections.forEach(section => {
        const type = section.dataset.type;
        const inputs = section.querySelectorAll('input');
        const data = {};
        inputs.forEach(input => {
            data[input.dataset.day] = parseInt(input.value) || 0;
        });
        state.requests[week][partnerName][type] = data;
    });

    await saveState();
    alert(`${partnerName} 업체의 ${week}주차 소요량이 접수되었습니다.`);
    partnerPasswordInput.value = '';
});

// Enhanced Rendering Admin Dashboard
function renderAdminDashboard() {
    const week = weekSelect.value;
    const weekRequests = state.requests[week] || {};

    tableBody.innerHTML = '';

    // Category-wise totals per day
    const catTotals = {
        Steel: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, week: 0 },
        SUS: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, week: 0 },
        Poly: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, week: 0 }
    };

    state.partners.forEach(partner => {
        const partnerData = weekRequests[partner.name] || {};

        ['Steel', 'SUS', 'Poly'].forEach(cat => {
            const typeData = partnerData[cat] || { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 };
            const rowTotal = Object.values(typeData).reduce((a, b) => a + b, 0);

            if (rowTotal > 0 || partner.categories.includes(cat)) {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${partner.name}</td>
                    <td class="category-cell">${cat}</td>
                    <td>${typeData.mon}</td>
                    <td>${typeData.tue}</td>
                    <td>${typeData.wed}</td>
                    <td>${typeData.thu}</td>
                    <td>${typeData.fri}</td>
                    <td class="total-cell">${rowTotal}</td>
                    <td contenteditable="true"></td>
                `;
                tableBody.appendChild(row);

                // Add to category totals
                ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
                    catTotals[cat][day] += typeData[day] || 0;
                });
                catTotals[cat].week += rowTotal;
            }
        });
    });

    const grandTotals = {
        mon: catTotals.Steel.mon + catTotals.SUS.mon + catTotals.Poly.mon,
        tue: catTotals.Steel.tue + catTotals.SUS.tue + catTotals.Poly.tue,
        wed: catTotals.Steel.wed + catTotals.SUS.wed + catTotals.Poly.wed,
        thu: catTotals.Steel.thu + catTotals.SUS.thu + catTotals.Poly.thu,
        fri: catTotals.Steel.fri + catTotals.SUS.fri + catTotals.Poly.fri,
        week: catTotals.Steel.week + catTotals.SUS.week + catTotals.Poly.week
    };

    // Render footer with Category subtotals
    tableFoot.innerHTML = `
        <tr class="subtotal-row">
            <td colspan="2" class="subtotal-label">Steel 소계</td>
            <td>${catTotals.Steel.mon}</td><td>${catTotals.Steel.tue}</td><td>${catTotals.Steel.wed}</td><td>${catTotals.Steel.thu}</td><td>${catTotals.Steel.fri}</td>
            <td>${catTotals.Steel.week}</td><td></td>
        </tr>
        <tr class="subtotal-row">
            <td colspan="2" class="subtotal-label">SUS 소계</td>
            <td>${catTotals.SUS.mon}</td><td>${catTotals.SUS.tue}</td><td>${catTotals.SUS.wed}</td><td>${catTotals.SUS.thu}</td><td>${catTotals.SUS.fri}</td>
            <td>${catTotals.SUS.week}</td><td></td>
        </tr>
        <tr class="subtotal-row">
            <td colspan="2" class="subtotal-label">Poly 소계</td>
            <td>${catTotals.Poly.mon}</td><td>${catTotals.Poly.tue}</td><td>${catTotals.Poly.wed}</td><td>${catTotals.Poly.thu}</td><td>${catTotals.Poly.fri}</td>
            <td>${catTotals.Poly.week}</td><td></td>
        </tr>
        <tr>
            <td colspan="2" class="total-row-label">일 총합 (전체)</td>
            <td>${grandTotals.mon}</td>
            <td>${grandTotals.tue}</td>
            <td>${grandTotals.wed}</td>
            <td>${grandTotals.thu}</td>
            <td>${grandTotals.fri}</td>
            <td class="grand-total-bg" style="background:#f59e0b; color:#000;">${grandTotals.week}</td>
            <td></td>
        </tr>
    `;

    document.getElementById('total-steel').textContent = catTotals.Steel.week;
    document.getElementById('total-sus').textContent = catTotals.SUS.week;
    document.getElementById('total-poly').textContent = catTotals.Poly.week;
    document.getElementById('total-grand').textContent = grandTotals.week;
}

// Initialization
async function initializeAppUI() {
    await loadState();

    initWeekSelector();
    initPartnerSelector();
    tableTitle.textContent = `${weekSelect.options[weekSelect.selectedIndex].text} 사외 협력사 팔레트 필요 수량`;
    updateFormDateLabels();
}

initializeAppUI();

// Export & Clear logic
document.getElementById('btn-export').addEventListener('click', () => {
    const week = weekSelect.value;
    const weekRequests = state.requests[week] || {};
    let csv = '\uFEFF';

    // Get Dates for Headers
    const monday = weekDatesMap[week];
    const koDays = ['월', '화', '수', '목', '금'];
    const dateHeaders = koDays.map((ko, index) => {
        if (!monday) return ko;
        const d = new Date(monday);
        d.setDate(monday.getDate() + index);
        return `${d.getDate()}(${ko})`;
    });

    csv += `업체명,구분,${dateHeaders[0]},${dateHeaders[1]},${dateHeaders[2]},${dateHeaders[3]},${dateHeaders[4]},주 총합\n`;

    const catTotals = {
        Steel: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, week: 0 },
        SUS: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, week: 0 },
        Poly: { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0, week: 0 }
    };

    state.partners.forEach(partner => {
        const partnerData = weekRequests[partner.name] || {};
        ['Steel', 'SUS', 'Poly'].forEach(cat => {
            const typeData = partnerData[cat] || { mon: 0, tue: 0, wed: 0, thu: 0, fri: 0 };
            const rowTotal = Object.values(typeData).reduce((a, b) => a + b, 0);

            if (rowTotal > 0 || partner.categories.includes(cat)) {
                csv += `${partner.name},${cat},${typeData.mon},${typeData.tue},${typeData.wed},${typeData.thu},${typeData.fri},${rowTotal}\n`;

                ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
                    catTotals[cat][day] += typeData[day] || 0;
                });
                catTotals[cat].week += rowTotal;
            }
        });
    });

    const grandTotals = {
        mon: catTotals.Steel.mon + catTotals.SUS.mon + catTotals.Poly.mon,
        tue: catTotals.Steel.tue + catTotals.SUS.tue + catTotals.Poly.tue,
        wed: catTotals.Steel.wed + catTotals.SUS.wed + catTotals.Poly.wed,
        thu: catTotals.Steel.thu + catTotals.SUS.thu + catTotals.Poly.thu,
        fri: catTotals.Steel.fri + catTotals.SUS.fri + catTotals.Poly.fri,
        week: catTotals.Steel.week + catTotals.SUS.week + catTotals.Poly.week
    };

    csv += `\n`;
    ['Steel', 'SUS', 'Poly'].forEach(cat => {
        csv += `${cat} 소계,,${catTotals[cat].mon},${catTotals[cat].tue},${catTotals[cat].wed},${catTotals[cat].thu},${catTotals[cat].fri},${catTotals[cat].week}\n`;
    });
    csv += `일 총합 (전체),,${grandTotals.mon},${grandTotals.tue},${grandTotals.wed},${grandTotals.thu},${grandTotals.fri},${grandTotals.week}\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `pallet_requests_week_${week}.csv`;
    link.click();
});

document.getElementById('btn-clear').addEventListener('click', async () => {
    if (confirm('모든 데이터를 초기화하시겠습니까?')) {
        state.requests = {};
        await saveState();
        location.reload();
    }
});

// Password Management Logic
document.getElementById('btn-change-admin-pw').addEventListener('click', async () => {
    const currentPw = document.getElementById('admin-current-pw').value;
    const newPw = document.getElementById('admin-new-pw').value;

    if (currentPw !== state.adminPassword) {
        alert('현재 관리자 비밀번호가 일치하지 않습니다.');
        return;
    }
    if (!newPw) {
        alert('새 비밀번호를 입력해주세요.');
        return;
    }

    state.adminPassword = newPw;
    await saveState();
    alert('관리자 비밀번호가 성공적으로 변경되었습니다.');
    document.getElementById('admin-current-pw').value = '';
    document.getElementById('admin-new-pw').value = '';
});

document.getElementById('btn-change-partner-pw').addEventListener('click', async () => {
    const partnerName = document.getElementById('pw-partner-select').value;
    const newPw = document.getElementById('partner-new-pw').value;

    if (!partnerName) {
        alert('업체를 선택해주세요.');
        return;
    }
    if (!newPw) {
        alert('새 비밀번호를 입력해주세요.');
        return;
    }

    const partner = state.partners.find(p => p.name === partnerName);
    if (partner) {
        partner.password = newPw;
        await saveState();
        alert(`${partnerName} 업체의 비밀번호가 성공적으로 변경되었습니다.`);
        document.getElementById('partner-new-pw').value = '';
    }
});

const pwPartnerSelect = document.getElementById('pw-partner-select');
if (pwPartnerSelect) {
    pwPartnerSelect.addEventListener('change', (e) => {
        const partner = state.partners.find(p => p.name === e.target.value);
        if (partner) {
            document.getElementById('partner-new-pw').value = partner.password;
        }
    });
}
