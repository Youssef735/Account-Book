import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, doc, updateDoc, increment, serverTimestamp, query, orderBy } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.0/firebase-auth.js";

const firebaseConfig = {
    apiKey: "AIzaSyDjTDipyMX_cV-DSfR6H7KWGUbyHcMTVRw",
    authDomain: "work-accounts-71af6.firebaseapp.com",
    projectId: "work-accounts-71af6",
    storageBucket: "work-accounts-71af6.firebasestorage.app",
    messagingSenderId: "1083420951801",
    appId: "1:1083420951801:web:354eae2906d8b03afb8e28",
    measurementId: "G-BGKKCB560M"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 

let dataState = { shops: [], merchants: [] };
let currentId = { shops: null, merchants: null };
let unsubTxs = { shops: null, merchants: null };
let unsubShopsList = null;
let unsubMerchantsList = null;

// ================= نظام تسجيل الدخول =================
window.login = async function() {
    const email = document.getElementById('loginEmail').value;
    const pass = document.getElementById('loginPassword').value;
    const errorEl = document.getElementById('loginError');
    
    if(!email || !pass) {
        errorEl.innerText = "يرجى إدخال الإيميل والباسورد";
        errorEl.classList.remove('hidden');
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, pass);
        errorEl.classList.add('hidden');
    } catch (error) {
        errorEl.innerText = "بيانات الدخول غير صحيحة!";
        errorEl.classList.remove('hidden');
    }
};

window.logout = function() {
    signOut(auth);
};

onAuthStateChanged(auth, (user) => {
    if (user) {
        document.getElementById('loginScreen').classList.add('hidden');
        document.getElementById('mainApp').classList.remove('hidden');
        loadDatabaseData();
    } else {
        document.getElementById('loginScreen').classList.remove('hidden');
        document.getElementById('mainApp').classList.add('hidden');
        unloadDatabaseData();
        document.getElementById('loginEmail').value = '';
        document.getElementById('loginPassword').value = '';
    }
});

// ================= دوال سحب البيانات =================
function loadDatabaseData() {
    ['shops', 'merchants'].forEach(type => {
        const q = query(collection(db, type), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            dataState[type] = [];
            const gridEl = document.getElementById(`${type}Grid`);
            gridEl.innerHTML = '';
            
            if(snapshot.empty) {
                gridEl.innerHTML = `<p class="text-gray-500 col-span-full text-center py-4">لا يوجد ${type === 'shops' ? 'محلات' : 'تجار'} مضافة.</p>`;
            }

            snapshot.forEach((document) => {
                const item = { id: document.id, ...document.data() };
                dataState[type].push(item);
                
                const card = window.document.createElement('div');
                const isShop = type === 'shops';
                card.className = `glass-panel p-5 rounded-xl cursor-pointer transition-colors border ${isShop ? 'border-gray-700 hover:border-yellow-400' : 'border-gray-700 hover:border-blue-400'}`;
                card.onclick = () => window.openEntity(type, item.id);
                card.innerHTML = `
                    <h3 class="text-xl font-bold mb-4 ${isShop ? 'text-white' : 'text-blue-200'}">${item.name}</h3>
                    <div class="flex justify-between text-sm bg-gray-900/50 p-3 rounded">
                        <span>الذهب: <span class="${isShop ? 'gold-primary' : 'text-blue-400'} font-bold text-lg">${item.goldBalance.toFixed(2)}</span></span>
                        <span>النقدية: <span class="${isShop ? 'text-green-400' : 'text-orange-400'} font-bold text-lg">${item.cashBalance.toFixed(2)}</span></span>
                    </div>
                `;
                gridEl.appendChild(card);
            });

            if (currentId[type]) {
                const updatedItem = dataState[type].find(s => s.id === currentId[type]);
                if (updatedItem) {
                    document.getElementById(type === 'shops' ? 'currentShopGold' : 'currentMerchantGold').innerText = updatedItem.goldBalance.toFixed(2);
                    document.getElementById(type === 'shops' ? 'currentShopCash' : 'currentMerchantCash').innerText = updatedItem.cashBalance.toFixed(2);
                }
            }
            updateInventoryUI();
        });

        if (type === 'shops') unsubShopsList = unsubscribe;
        else unsubMerchantsList = unsubscribe;
    });
}

function unloadDatabaseData() {
    if(unsubShopsList) unsubShopsList();
    if(unsubMerchantsList) unsubMerchantsList();
    if(unsubTxs.shops) unsubTxs.shops();
    if(unsubTxs.merchants) unsubTxs.merchants();
    dataState = { shops: [], merchants: [] };
    currentId = { shops: null, merchants: null };
}

// ================= باقي دوال النظام =================

window.toggleCustomKarat = function() {
    const select = document.getElementById('merchantDeductKaratSelect');
    const div = document.getElementById('merchantCustomKaratDiv');
    if (select && (select.value === 'custom_750' || select.value === 'custom_875')) {
        div.classList.remove('hidden');
    } else if (div) {
        div.classList.add('hidden');
    }
};

window.switchTab = function(tabId) {
    ['shopsTab', 'merchantsTab', 'inventoryTab'].forEach(id => {
        document.getElementById(id).classList.add('hidden');
        document.getElementById('btn-' + id).classList.replace('tab-active', 'tab-inactive');
    });
    document.getElementById(tabId).classList.remove('hidden');
    document.getElementById('btn-' + tabId).classList.replace('tab-inactive', 'tab-active');
    
    if(tabId === 'inventoryTab') updateInventoryUI();
};

window.addEntity = async function(type, inputId) {
    const nameInput = document.getElementById(inputId);
    const name = nameInput.value.trim();
    if (!name) return alert('يرجى إدخال الاسم');
    
    await addDoc(collection(db, type), {
        name: name, goldBalance: 0, cashBalance: 0, createdAt: serverTimestamp()
    });
    nameInput.value = '';
};

window.openEntity = function(type, id) {
    currentId[type] = id;
    const item = dataState[type].find(s => s.id === id);
    
    const isShop = type === 'shops';
    const nameEl = isShop ? 'currentShopName' : 'currentMerchantName';
    const goldEl = isShop ? 'currentShopGold' : 'currentMerchantGold';
    const cashEl = isShop ? 'currentShopCash' : 'currentMerchantCash';
    const listEl = isShop ? 'shopsList' : 'merchantsList';
    const detailEl = isShop ? 'shopDetails' : 'merchantDetails';
    const tableBodyId = isShop ? 'shopTransactionsTableBody' : 'merchantTransactionsTableBody';

    document.getElementById(nameEl).innerText = item.name;
    document.getElementById(goldEl).innerText = item.goldBalance.toFixed(2);
    document.getElementById(cashEl).innerText = item.cashBalance.toFixed(2);
    
    if (unsubTxs[type]) unsubTxs[type]();
    
    const transactionsRef = collection(db, type, id, "transactions");
    const qTransactions = query(transactionsRef, orderBy("createdAt", "asc"));
    
    unsubTxs[type] = onSnapshot(qTransactions, (snapshot) => {
        const tbody = document.getElementById(tableBodyId);
        tbody.innerHTML = '';
        if(snapshot.empty) return tbody.innerHTML = '<tr><td colspan="4" class="px-4 py-6 text-center text-gray-500">لا توجد عمليات مسجلة</td></tr>';

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const dateStr = data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleString('ar-EG', { dateStyle: 'short', timeStyle: 'short' }) : 'لحظات...';
            const isAdd = data.type === 'add';
            
            let colorClass, typeText, rowBgClass;

            if (isShop) {
                colorClass = isAdd ? 'text-green-400' : 'text-red-500';
                rowBgClass = isAdd ? 'hover:bg-green-900/10' : 'hover:bg-red-900/10';
                const subtype = isAdd ? (data.addType === 'return' ? '(مرتجع كسر)' : '(جديد)') : '';
                typeText = isAdd ? `➕ إضافة شغل ${subtype}` : '➖ تنزيل كسر';
            } else {
                colorClass = isAdd ? 'text-blue-400' : 'text-orange-400';
                rowBgClass = isAdd ? 'hover:bg-blue-900/10' : 'hover:bg-orange-900/10';
                if (isAdd) {
                    typeText = `📥 استلام شغل`;
                } else {
                    typeText = data.addType === 'return' ? '📤 مرتجع شغل للتاجر' : '📤 تسديد كسر';
                }
            }

            let goldDisplay = data.goldAmount.toFixed(2);
            if (data.karat && data.karat !== 18) {
                const baseText = data.baseDenominator ? ` مخصوم على ${data.baseDenominator}` : '';
                goldDisplay = `${data.goldAmount.toFixed(2)} <br><span class="text-xs text-gray-500 font-normal mt-1 block">(من ${data.originalGoldAmount}ج عيار ${data.karat}${baseText})</span>`;
            }

            tbody.innerHTML += `
                <tr class="transition-colors ${rowBgClass}">
                    <td class="px-4 py-3 text-gray-400 align-middle" dir="ltr" style="text-align: right;">${dateStr}</td>
                    <td class="px-4 py-3 font-bold ${colorClass} align-middle">${typeText}</td>
                    <td class="px-4 py-3 font-bold ${colorClass} align-middle" dir="ltr" style="text-align: right;">${goldDisplay}</td>
                    <td class="px-4 py-3 font-bold ${colorClass} align-middle" dir="ltr" style="text-align: right;">${data.cashAmount.toFixed(2)}</td>
                </tr>
            `;
        });
    });

    document.getElementById(listEl).classList.add('hidden');
    document.getElementById(detailEl).classList.remove('hidden');
};

window.goBack = function(type) {
    currentId[type] = null;
    if (unsubTxs[type]) { unsubTxs[type](); unsubTxs[type] = null; }
    document.getElementById(type === 'shops' ? 'shopsList' : 'merchantsList').classList.remove('hidden');
    document.getElementById(type === 'shops' ? 'shopDetails' : 'merchantDetails').classList.add('hidden');
};

window.processTransaction = async function(type, actionType) {
    if (!currentId[type]) return;
    const prefix = type === 'shops' ? 'shop' : 'merchant';
    
    const goldInput = document.getElementById(actionType === 'add' ? `${prefix}AddGoldInput` : `${prefix}DeductGoldInput`);
    const cashInput = document.getElementById(actionType === 'add' ? `${prefix}AddCashInput` : `${prefix}DeductCashInput`);

    const goldVal = parseFloat(goldInput.value) || 0;
    const cashVal = parseFloat(cashInput.value) || 0;

    if (goldVal === 0 && cashVal === 0) return alert('يرجى إدخال قيمة الذهب أو النقدية');

    goldInput.value = ''; cashInput.value = '';

    let calculatedGoldVal = goldVal;
    let karat = 18;
    let addType = null;
    let baseDenominator = null; 

    if (type === 'shops') {
        if (actionType === 'add') {
            addType = document.getElementById('shopAddTypeSelect').value;
        } else if (actionType === 'deduct') {
            const k = document.getElementById('shopDeductKaratSelect').value;
            if (k === '21') { karat = 21; calculatedGoldVal = goldVal * (7 / 6); }
        }
    } 
    else if (type === 'merchants') {
        if (actionType === 'deduct') {
            addType = document.getElementById('merchantDeductTypeSelect').value; 
            
            const k = document.getElementById('merchantDeductKaratSelect').value;
            if (k === '21') { 
                karat = 21; 
                calculatedGoldVal = goldVal * (875 / 750); 
            } else if (k === 'custom_750' || k === 'custom_875') {
                const customKarat = parseFloat(document.getElementById('merchantCustomKaratInput').value);
                if (!customKarat || customKarat <= 0) return alert('يرجى إدخال عيار السبيكة الصحيح');
                karat = customKarat;
                baseDenominator = k === 'custom_750' ? 750 : 875;
                calculatedGoldVal = (goldVal * customKarat) / baseDenominator;
                document.getElementById('merchantCustomKaratInput').value = ''; 
            }
        }
    }

    const goldChange = actionType === 'add' ? calculatedGoldVal : -calculatedGoldVal;
    const cashChange = actionType === 'add' ? cashVal : -cashVal;

    const docRef = doc(db, type, currentId[type]);
    const txsRef = collection(db, type, currentId[type], "transactions");
    
    await Promise.all([
        updateDoc(docRef, { goldBalance: increment(goldChange), cashBalance: increment(cashChange) }),
        addDoc(txsRef, {
            type: actionType, goldAmount: calculatedGoldVal, originalGoldAmount: goldVal,
            karat: karat, baseDenominator: baseDenominator, addType: addType, cashAmount: cashVal, createdAt: serverTimestamp()
        })
    ]);
};

function updateInventoryUI() {
    let totalShopGold = 0, totalShopCash = 0;
    let totalMerchantGold = 0, totalMerchantCash = 0;

    const shopBody = document.getElementById('inventoryShopsBody');
    const merchantBody = document.getElementById('inventoryMerchantsBody');
    shopBody.innerHTML = ''; merchantBody.innerHTML = '';

    dataState.shops.forEach(s => {
        totalShopGold += s.goldBalance; totalShopCash += s.cashBalance;
        shopBody.innerHTML += `<tr>
            <td class="px-4 py-2 font-bold text-white">${s.name}</td>
            <td class="px-4 py-2 text-green-400 font-bold" dir="ltr" style="text-align: right;">${s.goldBalance.toFixed(2)}</td>
            <td class="px-4 py-2 text-green-400 font-bold" dir="ltr" style="text-align: right;">${s.cashBalance.toFixed(2)}</td>
        </tr>`;
    });

    dataState.merchants.forEach(m => {
        totalMerchantGold += m.goldBalance; totalMerchantCash += m.cashBalance;
        merchantBody.innerHTML += `<tr>
            <td class="px-4 py-2 font-bold text-white">${m.name}</td>
            <td class="px-4 py-2 text-red-400 font-bold" dir="ltr" style="text-align: right;">${m.goldBalance.toFixed(2)}</td>
            <td class="px-4 py-2 text-red-400 font-bold" dir="ltr" style="text-align: right;">${m.cashBalance.toFixed(2)}</td>
        </tr>`;
    });

    const netGold = totalShopGold - totalMerchantGold;
    const netCash = totalShopCash - totalMerchantCash;

    document.getElementById('invTotalShopGold').innerText = totalShopGold.toFixed(2);
    document.getElementById('invTotalShopCash').innerText = totalShopCash.toFixed(2);
    document.getElementById('invTotalMerchantGold').innerText = totalMerchantGold.toFixed(2);
    document.getElementById('invTotalMerchantCash').innerText = totalMerchantCash.toFixed(2);

    const netGoldEl = document.getElementById('invNetGold');
    const netCashEl = document.getElementById('invNetCash');
    const netStatus = document.getElementById('netStatus');
    
    netGoldEl.innerText = Math.abs(netGold).toFixed(2);
    netCashEl.innerText = Math.abs(netCash).toFixed(2);

    if (netGold >= 0 && netCash >= 0) {
        netGoldEl.className = 'text-2xl text-green-400'; netCashEl.className = 'text-2xl text-green-400';
        netStatus.innerHTML = '✅ وضع الميزانية آمن (الأرصدة في السوق تغطي ديون التجار)';
        netStatus.className = 'text-sm mt-2 text-green-400';
    } else {
        netGoldEl.className = 'text-2xl text-red-500'; netCashEl.className = 'text-2xl text-red-500';
        netStatus.innerHTML = '⚠️ انتبه: الديون المستحقة للتجار أكبر من الأرصدة المتوفرة بالمحلات';
        netStatus.className = 'text-sm mt-2 text-red-500 font-bold';
    }
}