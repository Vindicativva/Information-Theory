/* 
=========================================================
   КОНСТАНТЫ
========================================================= 
*/

const alphabet = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ";

const $ = (id) => document.getElementById(id);


/* 
=========================================================
   ПЕРЕКЛЮЧЕНИЕ РЕЖИМОВ
========================================================= 
*/

const modeButtons = document.querySelectorAll(".mode-btn");
const indicator = document.querySelector(".switch-indicator");

modeButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {

        modeButtons.forEach(b => b.classList.remove("active"));
        btn.classList.add("active");

        indicator.style.left = index === 0 ? "0%" : "50%";

        $("textMode").classList.toggle("hidden", index !== 0);
        $("fileMode").classList.toggle("hidden", index !== 1);
    });
});


/* 
=========================================================
   ОБЩИЕ УТИЛИТЫ
========================================================= 
*/

function clean(text) {
    return text
        .toUpperCase()
        .split("")
        .filter(c => alphabet.includes(c))
        .join("");
}


/* 
=========================================================
   СТОЛБЦОВЫЙ МЕТОД
========================================================= 
*/

function columnEncrypt(text, key) {

    text = clean(text);
    key = clean(key);

    let cols = key.length;
    let rows = Math.ceil(text.length / cols);
    let matrix = Array.from({ length: rows }, () => Array(cols).fill(""));

    for (let i = 0; i < text.length; i++) {
        matrix[Math.floor(i / cols)][i % cols] = text[i];
    }

    let order = key
        .split("")
        .map((c, i) => ({ c, i }))
        .sort((a, b) => a.c.localeCompare(b.c, "ru") || a.i - b.i);

    let raw = "";

    order.forEach(o => {
        for (let r = 0; r < rows; r++) {
            if (matrix[r][o.i]) raw += matrix[r][o.i];
        }
    });

    return raw ? raw.match(/.{1,5}/g).join(" ") : "";
}


function columnDecrypt(cipher, key) {

    cipher = clean(cipher);
    key = clean(key);

    let cols = key.length;
    let rows = Math.ceil(cipher.length / cols);
    let matrix = Array.from({ length: rows }, () => Array(cols).fill(""));

    let order = key
        .split("")
        .map((c, i) => ({ c, i }))
        .sort((a, b) => a.c.localeCompare(b.c, "ru") || a.i - b.i);

    let fullCells = cipher.length % cols;
    if (fullCells === 0) fullCells = cols;

    let colLengths = [];

    for (let c = 0; c < cols; c++) {
        colLengths[c] = (c < fullCells) ? rows : rows - 1;
    }

    let index = 0;

    order.forEach(o => {
        for (let r = 0; r < colLengths[o.i]; r++) {
            matrix[r][o.i] = cipher[index++];
        }
    });

    let result = "";

    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (matrix[r][c]) result += matrix[r][c];
        }
    }

    return result;
}


/* 
=========================================================
   ВИЖЕНЕР (САМОГЕНЕРИРУЮЩИЙСЯ КЛЮЧ)
========================================================= 
*/

function vigenereEncrypt(text, key) {

    let cleanText = clean(text);
    key = clean(key);

    let result = "";
    let fullKey = key;
    let num = 0;

    for (let i = 0; i < text.length; i++) {

        let char = text[i].toUpperCase();

        if (alphabet.includes(char)) {

            if (num >= key.length) {
                fullKey += cleanText[num - key.length];
            }

            let m = alphabet.indexOf(char);
            let k = alphabet.indexOf(fullKey[num]);

            result += alphabet[(m + k) % 33];
            num++;

        } else {
            result += text[i];
        }
    }

    return result;
}


function vigenereDecrypt(text, key) {

    key = clean(key);

    let result = "";
    let fullKey = key;
    let num = 0;

    for (let i = 0; i < text.length; i++) {

        let char = text[i].toUpperCase();

        if (alphabet.includes(char)) {

            let c = alphabet.indexOf(char);
            let k = alphabet.indexOf(fullKey[num]);

            let decryptedIndex = (c - k + 33) % 33;
            let decryptedChar = alphabet[decryptedIndex];

            result += decryptedChar;
            fullKey += decryptedChar;
            num++;

        } else {
            result += text[i];
        }
    }

    return result;
}


/* 
=========================================================
   ОБРАБОТКА ТЕКСТА
========================================================= 
*/

function process(decrypt = false) {

    const algo = $("algorithm").value;
    const text = $("inputText").value;
    const key1 = $("key1").value;
    const key2 = $("key2").value;

    if (!key1) return;

    let result = "";

    if (algo === "column") {

        if (!key2) return;

        result = decrypt
            ? columnDecrypt(columnDecrypt(text, key2), key1)
            : columnEncrypt(columnEncrypt(text, key1), key2);

    } else {

        result = decrypt
            ? vigenereDecrypt(text, key1)
            : vigenereEncrypt(text, key1);
    }

    $("outputText").value = result;
}


/* 
=========================================================
   ОЧИСТКА
========================================================= 
*/

function animateClear(fields) {

    fields.forEach(field => {

        if (!field || !field.value.trim()) return;

        field.classList.add("fade-clear");

        setTimeout(() => field.value = "", 150);
        setTimeout(() => field.classList.remove("fade-clear"), 300);
    });
}


function cleanInfo() {

    animateClear([
        $("key1"),
        $("key2"),
        $("inputText"),
        $("outputText")
    ]);
}


function cleanFileInfo() {

    fileInput.value = "";
    fileName.textContent = "";
    fileWrapper.classList.remove("active");
    $("downloadLink").classList.add("h");

    animateClear([
        $("key1"),
        $("key2")
    ]);
}


/* 
=========================================================
   ФАЙЛЫ
========================================================= 
*/

function processFile(decrypt = false) {

    const file = $("fileInput").files[0];
    if (!file) return;

    const reader = new FileReader();

    reader.onload = e => {

        const text = e.target.result;
        const algo = $("algorithm").value;
        const key1 = $("key1").value;
        const key2 = $("key2").value;

        if (!key1) return;
        if (algo === "column" && !key2) return;

        let result = (algo === "column")
            ? (decrypt
                ? columnDecrypt(columnDecrypt(text, key2), key1)
                : columnEncrypt(columnEncrypt(text, key1), key2))
            : (decrypt
                ? vigenereDecrypt(text, key1)
                : vigenereEncrypt(text, key1));

        const blob = new Blob([result], { type: "text/plain" });
        const linkA = $("downloadLinkA");

        linkA.href = URL.createObjectURL(blob);
        linkA.download = "result.txt";

        const link = $("downloadLink");
        link.classList.remove("h");
        link.classList.remove("bounce");
        void link.offsetWidth;
        link.classList.add("bounce");
    };

    reader.readAsText(file);
}


/* 
=========================================================
   FILE INPUT
========================================================= 
*/

const fileInput = $("fileInput");
const fileName = $("fileName");
const fileWrapper = $("fileWrapper");

fileInput.addEventListener("change", function () {

    if (this.files.length > 0) {
        fileName.textContent = this.files[0].name;
        fileWrapper.classList.add("active");
    } else {
        fileName.textContent = "";
        fileWrapper.classList.remove("active");
    }
});


/* 
=========================================================
   СОБЫТИЯ
========================================================= 
*/

$("encryptBtn").onclick = () => process(false);
$("decryptBtn").onclick = () => process(true);
$("cleanBtn").onclick = cleanInfo;

$("encryptFileBtn").onclick = () => processFile(false);
$("decryptFileBtn").onclick = () => processFile(true);
$("cleanfileBtn").onclick = cleanFileInfo;

$("algorithm").addEventListener("change", toggleKey2);


/* 
=========================================================
   UI
========================================================= 
*/

function toggleKey2() {
    const wrapper = $("key2");
    const algo = $("algorithm").value;

    if (algo === "vigenere") {
        wrapper.classList.add("h");
    } else {
        wrapper.classList.remove("h");
    }
}

toggleKey2();


/* =========================================================
   КАСТОМНЫЙ SELECT
========================================================= */

const customSelect = $("customSelect");
const selectSelected = $("selectSelected");
const selectDropdown = $("selectDropdown");
const selectItems = document.querySelectorAll(".select-item");
const hiddenInput = $("algorithm");

selectSelected.addEventListener("click", () => {
    customSelect.classList.toggle("open");
    selectDropdown.classList.toggle("hidden");
});

selectItems.forEach(item => {

    item.addEventListener("click", () => {

        selectItems.forEach(i => i.classList.remove("active"));
        item.classList.add("active");

        selectSelected.childNodes[0].nodeValue = item.innerText + " ";

        hiddenInput.value = item.dataset.value;

        customSelect.classList.remove("open");
        selectDropdown.classList.add("hidden");

        toggleKey2();
    });
});

document.addEventListener("click", (e) => {
    if (!customSelect.contains(e.target)) {
        customSelect.classList.remove("open");
        selectDropdown.classList.add("hidden");
    }
});