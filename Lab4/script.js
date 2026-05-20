// ==================== Глобальные переменные ====================
let signFileData = null;
let signFileName = "";
let signedFileData = null;
let signedFileName = "";

let verifyFileData = null;

let currentParams = {
    p: null, q: null, h: null, g: null, x: null, y: null, k: null, h0: null
};

let currentSignature = { r: null, s: null };
let currentHash = null;
let currentMode = 'sign';

// ==================== ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ ====================

function switchMode(mode) {
    currentMode = mode;
    
    // Обновляем активную кнопку и слайдер
    const container = document.getElementById('modeSwitchContainer');
    const btns = document.querySelectorAll('.mode-btn');
    const slider = document.querySelector('.mode-slider');
    
    btns.forEach(btn => {
        if (btn.getAttribute('data-mode') === mode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    // Перемещаем слайдер вручную (без :has, для надёжности)
    if (mode === 'sign') {
        slider.style.transform = 'translateX(0)';
    } else {
        slider.style.transform = 'translateX(100%)';
    }
    
    // Показываем/скрываем поля
    const signFields = document.getElementById('sign-mode-fields');
    const verifyFields = document.getElementById('verify-mode-fields');
    const signResult = document.getElementById('sign-result');
    const verifyResult = document.getElementById('verify-result');
    const actionBtn = document.getElementById('actionBtn');
    
    if (mode === 'sign') {
        signFields.style.display = 'block';
        verifyFields.style.display = 'none';
        signResult.style.display = 'block';
        verifyResult.style.display = 'none';
        actionBtn.innerHTML = '✍️ Подписать файл';
        actionBtn.style.background = '#5c7aff';
    } else {
        signFields.style.display = 'none';
        verifyFields.style.display = 'block';
        signResult.style.display = 'none';
        verifyResult.style.display = 'block';
        actionBtn.innerHTML = '🔍 Проверить подпись';
        actionBtn.style.background = '#10b981';
    }
}

// Обработчик кнопки действия
function onActionClick() {
    if (currentMode === 'sign') {
        signFile();
    } else {
        verifyFile();
    }
}

// ==================== ОБРАБОТЧИК ФАЙЛОВ ====================

let currentFileData = null;
let currentFileName = "";

function setupFileHandler() {
    const drop = document.getElementById('drop-file');
    const fileInput = document.getElementById('file-input');
    const fileInfo = document.getElementById('fileinfo');
    
    fileInput.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = () => {
            currentFileData = new Uint8Array(reader.result);
            currentFileName = file.name;
            fileInfo.innerHTML = `📄 ${file.name} (${file.size} bytes)`;
            
            // Для режима подписи
            signFileData = currentFileData;
            signFileName = currentFileName;
            
            // Для режима проверки
            verifyFileData = currentFileData;
        };
        reader.readAsArrayBuffer(file);
    };
    
    drop.ondragover = (e) => {
        e.preventDefault();
        drop.style.borderColor = '#5c7aff';
        drop.style.background = '#f0f4ff';
    };
    
    drop.ondragleave = (e) => {
        drop.style.borderColor = '#cbd5e1';
        drop.style.background = '#fafcff';
    };
    
    drop.ondrop = (e) => {
        e.preventDefault();
        drop.style.borderColor = '#cbd5e1';
        drop.style.background = '#fafcff';
        
        const file = e.dataTransfer.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = () => {
            currentFileData = new Uint8Array(reader.result);
            currentFileName = file.name;
            fileInfo.innerHTML = `📄 ${file.name} (${file.size} bytes)`;
            
            signFileData = currentFileData;
            signFileName = currentFileName;
            verifyFileData = currentFileData;
        };
        reader.readAsArrayBuffer(file);
    };
    
    drop.onclick = () => {
        fileInput.click();
    };
}

// ==================== Вспомогательные функции ====================

function gcd(a, b) {
    a = BigInt(a);
    b = BigInt(b);
    while (b !== 0n) {
        let t = b;
        b = a % b;
        a = t;
    }
    return a;
}

function modPow(base, exp, mod) {
    let result = 1n;
    base = BigInt(base) % BigInt(mod);
    exp = BigInt(exp);
    mod = BigInt(mod);
    
    while (exp > 0n) {
        if (exp % 2n === 1n) {
            result = (result * base) % mod;
        }
        base = (base * base) % mod;
        exp >>= 1n;
    }
    return result;
}

function isPrime(n) {
    n = BigInt(n);
    if (n < 2n) return false;
    if (n === 2n) return true;
    if (n % 2n === 0n) return false;
    
    for (let i = 3n; i * i <= n; i += 2n) {
        if (n % i === 0n) return false;
    }
    return true;
}

function modInverse(a, q) {
    return modPow(a, BigInt(q) - 2n, q);
}

function hashFunction(data, q, h0Big) {
    let H = h0Big;
    q = BigInt(q);
    
    for (let i = 0; i < data.length; i++) {
        let Mi = BigInt(data[i]);
        H = (H + Mi) ** 2n % q;
    }
    return H;
}

async function getTextFromFile(data) {
    let decoder = new TextDecoder('windows-1251');
    let text = decoder.decode(data);
    text = text.replace(/\0+$/, '');
    return text;
}

function stringToBytes(str) {
    let bytes = [];
    for (let i = 0; i < str.length; i++) {
        bytes.push(str.charCodeAt(i));
    }
    return bytes;
}

function updateParamsDisplay() {
    let html = `=== ПАРАМЕТРЫ DSA ===<br>`;
    html += `q = ${currentParams.q?.toString() || '—'}<br>`;
    html += `p = ${currentParams.p?.toString() || '—'}<br>`;
    html += `h = ${currentParams.h?.toString() || '—'}<br>`;
    html += `g = ${currentParams.g?.toString() || '—'}<br>`;
    html += `x = ${currentParams.x?.toString() || '—'}<br>`;
    html += `y = ${currentParams.y?.toString() || '—'}<br>`;
    html += `k = ${currentParams.k?.toString() || '—'}<br>`;
    html += `H₀ = ${currentParams.h0?.toString() || '—'}<br>`;
    const paramsInfo = document.getElementById("paramsInfo");
    if (paramsInfo) paramsInfo.innerHTML = html;
}

// ==================== Шаг 1: Вычисление g ====================
function calculateG() {
    let q = document.getElementById("q").value.trim();
    let p = document.getElementById("p").value.trim();
    let h = document.getElementById("h").value.trim();
    
    if (!q || !p || !h) {
        alert("Заполните все поля для вычисления g");
        return;
    }
    
    let qBig = BigInt(q);
    let pBig = BigInt(p);
    let hBig = BigInt(h);
    
    if (!isPrime(qBig)) {
        alert("q должно быть простым числом");
        return;
    }
    
    if (!isPrime(pBig)) {
        alert("p должно быть простым числом");
        return;
    }
    
    if ((pBig - 1n) % qBig !== 0n) {
        alert("(p-1) должно делиться на q без остатка");
        return;
    }
    
    if (hBig <= 1n || hBig >= pBig - 1n) {
        alert("h должно быть в диапазоне 1 < h < p-1");
        return;
    }
    
    let exponent = (pBig - 1n) / qBig;
    let g = modPow(hBig, exponent, pBig);
    
    if (g <= 1n) {
        alert("Вычисленное g <= 1. Попробуйте другое значение h");
        return;
    }
    
    currentParams.q = qBig;
    currentParams.p = pBig;
    currentParams.h = hBig;
    currentParams.g = g;
    
    document.getElementById("g").value = g.toString();
    updateParamsDisplay();
}

// ==================== Шаг 2: Вычисление y ====================
function calculateY() {
    if (!currentParams.g || !currentParams.p || !currentParams.q) {
        alert("Сначала вычислите g (заполните поля q, p, h и нажмите 'Вычислить g')");
        return;
    }
    
    let x = document.getElementById("x").value.trim();
    if (!x) {
        alert("Введите x (закрытый ключ)");
        return;
    }
    
    let xBig = BigInt(x);
    let qBig = currentParams.q;
    let pBig = currentParams.p;
    let gBig = currentParams.g;
    
    if (xBig <= 0n || xBig >= qBig) {
        alert("x должно быть в диапазоне 0 < x < q");
        return;
    }
    
    let y = modPow(gBig, xBig, pBig);
    
    currentParams.x = xBig;
    currentParams.y = y;
    
    document.getElementById("y").value = y.toString();
    updateParamsDisplay();
}

// ==================== Шаг 3: Подпись файла ====================
async function signFile() {
    if (!currentParams.g || !currentParams.y || !currentParams.x || !currentParams.q || !currentParams.p) {
        alert("Сначала выполните шаги 1 и 2 (вычислите g и y)");
        return;
    }
    
    if (!signFileData) {
        alert("Выберите файл для подписи");
        return;
    }
    
    let k = document.getElementById("k").value.trim();
    if (!k) {
        alert("Введите k (0 < k < q)");
        return;
    }

    let h0 = document.getElementById("h0").value.trim();
    if (!h0) {
        alert("Введите H₀");
        return;
    }
    
    let h0Big = BigInt(h0);
    currentParams.h0 = h0Big;
    
    let kBig = BigInt(k);
    let qBig = currentParams.q;
    
    if (kBig <= 0n || kBig >= qBig) {
        alert("k должно быть в диапазоне 0 < k < q");
        return;
    }
    
    if (gcd(kBig, qBig) !== 1n) {
        alert("k и q должны быть взаимно простыми (НОД(k, q) = 1)");
        return;
    }
    
    currentParams.k = kBig;
    updateParamsDisplay();
    
    let hash = hashFunction(signFileData, currentParams.q, h0Big);
    currentHash = hash;
    
    document.getElementById("hashValue").innerHTML = hash.toString();
    
    let r = null;
    let s = null;
    let attempts = 0;
    let currentK = kBig;
    
    while (attempts < 10) {
        let gkModP = modPow(currentParams.g, currentK, currentParams.p);
        r = gkModP % currentParams.q;
        
        if (r === 0n) {
            attempts++;
            currentK = (currentK + 1n) % currentParams.q;
            if (currentK === 0n) currentK = 1n;
            continue;
        }
        
        let kInverse = modInverse(currentK, currentParams.q);
        let hashPlusXr = (hash + currentParams.x * r) % currentParams.q;
        s = (kInverse * hashPlusXr) % currentParams.q;
        
        if (s !== 0n) {
            break;
        }
        
        attempts++;
        currentK = (currentK + 1n) % currentParams.q;
        if (currentK === 0n) currentK = 1n;
    }
    
    if (r === 0n || s === 0n) {
        alert("Не удалось получить ненулевые r и s. Попробуйте другое значение k");
        return;
    }
    
    currentSignature = { r: r, s: s };
    
    document.getElementById("signatureResult").innerHTML = `
        <strong>ЭЦП:</strong><br>
        r = ${r}<br>
        s = ${s}
    `;
    
    document.getElementById("statusBox").innerHTML = `
        ✅ Подпись сформирована успешно!<br>
        Хеш сообщения: ${hash}<br>
        r = ${r}, s = ${s}
    `;
    document.getElementById("statusBox").style.background = "#d4edda";
    document.getElementById("statusBox").style.color = "#155724";
    
    let text = await getTextFromFile(signFileData);
    let signedContent = text + "\n" + r.toString() + "\n" + s.toString();
    let encoder = new TextEncoder();
    signedFileData = encoder.encode(signedContent);
    signedFileName = makeName(signFileName, "_signed");
    
    let btn = document.getElementById("btnDownload");
    btn.classList.remove("h");
    btn.classList.add("bounce");
    setTimeout(() => btn.classList.remove("bounce"), 400);
    
    makeDownload(signedFileData, signedFileName);
}

// ==================== Проверка подписи ====================
async function verifyFile() {
    if (!verifyFileData) {
        alert("Выберите файл с подписью для проверки");
        return;
    }
    
    let q = document.getElementById("vq").value.trim();
    let p = document.getElementById("vp").value.trim();
    let h = document.getElementById("vh").value.trim();
    let y = document.getElementById("vy").value.trim();
    let h0 = document.getElementById("vh0").value.trim();
    
    if (!q || !p || !h || !y || !h0) {
        alert("Введите все параметры DSA (q, p, g, y, H₀)");
        return;
    }
    
    let qBig = BigInt(q);
    let pBig = BigInt(p);
    let hBig = BigInt(h);
    let yBig = BigInt(y);
    let h0Big = BigInt(h0);

    let exponent = (pBig - 1n) / qBig;
    let g = modPow(hBig, exponent, pBig);
    let gBig = BigInt(g);
    
    let decoder = new TextDecoder('windows-1251');
    let content = decoder.decode(verifyFileData);
    content = content.replace(/\0+$/, '');
    
    let lines = content.split('\n');
    
    while (lines.length > 0 && lines[lines.length - 1].trim() === "") {
        lines.pop();
    }
    
    if (lines.length < 2) {
        document.getElementById("verifyResultBox").innerHTML = "❌ ОШИБКА: Файл слишком короткий, не найдена подпись";
        document.getElementById("verifyResultBox").className = "verify-result-box fail";
        document.getElementById("calcDetails").innerHTML = "Файл должен содержать подпись в последних двух строках (r и s)";
        return;
    }
    
    let lastLine = lines[lines.length - 1].trim();
    let secondLastLine = lines[lines.length - 2].trim();
    
    let r, s;
    try {
        let rMatch = secondLastLine.match(/\d+/);
        let sMatch = lastLine.match(/\d+/);
        
        if (!rMatch || !sMatch) {
            throw new Error("Не найдены числа в последних строках");
        }
        
        r = BigInt(rMatch[0]);
        s = BigInt(sMatch[0]);
    } catch (err) {
        document.getElementById("verifyResultBox").innerHTML = "❌ ОШИБКА: Не удалось извлечь числа r и s";
        document.getElementById("verifyResultBox").className = "verify-result-box fail";
        document.getElementById("calcDetails").innerHTML = `Последние строки: "${secondLastLine}" и "${lastLine}"`;
        return;
    }
    
    let messageLines = lines.slice(0, -2);
    let message = messageLines.join('\n');
    
    document.getElementById("verifySignatureBox").innerHTML = `
        <strong>Извлечённая подпись:</strong><br>
        r = ${r}<br>
        s = ${s}
    `;
    
    if (r <= 0n || r >= qBig) {
        document.getElementById("verifyResultBox").innerHTML = `❌ ПОДПИСЬ НЕВЕРНА: r вне диапазона`;
        document.getElementById("verifyResultBox").className = "verify-result-box fail";
        return;
    }
    
    if (s <= 0n || s >= qBig) {
        document.getElementById("verifyResultBox").innerHTML = `❌ ПОДПИСЬ НЕВЕРНА: s вне диапазона`;
        document.getElementById("verifyResultBox").className = "verify-result-box fail";
        return;
    }
    
    let bytes = stringToBytes(message);
    let hash = hashFunction(bytes, qBig, h0Big);
    document.getElementById("verifyHashValue").innerHTML = hash.toString();
    
    let w = modInverse(s, qBig);
    let u1 = (hash * w) % qBig;
    let u2 = (r * w) % qBig;
    let gu1 = modPow(gBig, u1, pBig);
    let yu2 = modPow(yBig, u2, pBig);
    let v = (gu1 * yu2) % pBig % qBig;
    
    let isValid = (v === r);
    
    let resultDiv = document.getElementById("verifyResultBox");
    let calcDiv = document.getElementById("calcDetails");
    
    if (isValid) {
        resultDiv.innerHTML = "✅ ПОДПИСЬ ВЕРНА! Документ подлинный.";
        resultDiv.className = "verify-result-box success";
    } else {
        resultDiv.innerHTML = "❌ ПОДПИСЬ НЕВЕРНА! Документ был изменен или подпись подделана.";
        resultDiv.className = "verify-result-box fail";
    }
    
    calcDiv.innerHTML = `
        <strong>Вычисленные значения:</strong><br>
        Хеш сообщения h(M) = ${hash}<br>
        w = s^(-1) mod q = ${w}<br>
        u1 = h(M) * w mod q = ${u1}<br>
        u2 = r * w mod q = ${u2}<br>
        v = ((g^u1 * y^u2) mod p) mod q = ${v}<br>
        r (из подписи) = ${r}<br>
        ${isValid ? '✅ v == r → Подпись верна' : '❌ v != r → Подпись неверна'}
    `;
}

// ==================== Общие функции ====================

function makeName(name, suffix) {
    let dotIndex = name.lastIndexOf(".");
    if (dotIndex === -1) return name + suffix;
    let base = name.slice(0, dotIndex);
    let ext = name.slice(dotIndex);
    return base + suffix + ext;
}

function makeDownload(data, name) {
    let blob = new Blob([data], { type: "application/octet-stream" });
    let link = document.getElementById("downloadLink");
    link.href = URL.createObjectURL(blob);
    link.download = name;
}

function downloadSigned() {
    document.getElementById("downloadLink").click();
}

// ==================== Инициализация ====================
setupFileHandler();

// Ограничение ввода только цифр
let numericInputs = ["q", "p", "h", "x", "k", "vq", "vp", "vg", "vy"];
numericInputs.forEach(id => {
    let input = document.getElementById(id);
    if (input) {
        input.addEventListener("input", () => {
            input.value = input.value.replace(/[^0-9]/g, '');
        });
    }
});

// Автоматическая установка значений по умолчанию
/*
window.addEventListener("DOMContentLoaded", () => {
    document.getElementById("q").value = "107";
    document.getElementById("p").value = "643";
    document.getElementById("h").value = "2";
    document.getElementById("x").value = "45";
    document.getElementById("k").value = "31";
    document.getElementById("h0").value = "100";
    
    document.getElementById("vq").value = "107";
    document.getElementById("vp").value = "643";
    document.getElementById("vh").value = "2";
    document.getElementById("vy").value = "181";
    document.getElementById("vh0").value = "100";
});
*/