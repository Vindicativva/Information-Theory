// Хранит байтовые данные выбранного файла
let fileData = null;
let fileName = "";

// Получаем поле ввода начального состояния регистра
const seedInput = document.getElementById("seed");
const seedCounter = document.getElementById("seedCounter");


// -----------------------------------------------------
// Ограничение ввода: разрешаем только символы 0 и 1
// -----------------------------------------------------
seedInput.addEventListener("input", () => {
	seedInput.value = seedInput.value
		.replace(/[^01]/g, '')
		.slice(0, 31);

    seedCounter.textContent = "Количество бит: " + seedInput.value.length + " / 31";
});


// -----------------------------------------------------
// Очистка строки seed от любых символов кроме 0 и 1
// -----------------------------------------------------
function cleanSeed(s) {
	return s.replace(/[^01]/g, '');
}


// =====================================================
// Класс LFSR (Linear Feedback Shift Register)
// Генератор псевдослучайной последовательности
// =====================================================

class LFSR {
    constructor(seed) {
        seed = cleanSeed(seed).padEnd(31, '0');
        this.reg = parseInt(seed, 2);
    }

    nextBit() {
        let out = (this.reg >> 30) & 1;

        let fb = ((this.reg >> 30) ^ (this.reg >> 2)) & 1;

        this.reg = ((this.reg << 1) & 0x7FFFFFFF) | fb;

        return out;
    }

    nextByte() {
        let byte = 0;

        for (let i = 0; i < 8; i++) {
            byte = (byte << 1) | this.nextBit();
        }

        return byte;
    }
}

// =====================================================
// Основная функция обработки (шифрование / дешифрование)
// =====================================================
function process(seed) {

    let lfsr = new LFSR(seed);

    let result = new Uint8Array(fileData.length);

    let original_str = "";
    let key_str = "";
    let result_str = "";

    let bitsCollected = 0;
    const LIMIT = 1600;

    for (let i = 0; i < fileData.length; i++) {

        let keyByte = lfsr.nextByte(); 
        let resByte = fileData[i] ^ keyByte;

        result[i] = resByte;

        if (bitsCollected < LIMIT) {

            let origStr = fileData[i].toString(2).padStart(8, '0');
            let keyStr  = keyByte.toString(2).padStart(8, '0');
            let resStr  = resByte.toString(2).padStart(8, '0');

            for (let j = 0; j < 8 && bitsCollected < LIMIT; j++) {
                original_str += origStr[j];
                key_str += keyStr[j];
                result_str += resStr[j];
                bitsCollected++;
            }
        }
    }

    // вывод в поля
    document.getElementById("original").value = original_str;
    document.getElementById("key").value = key_str;
    document.getElementById("result").value = result_str;

    return result;
}

// =====================================================
// Скачивание результата на диск
// =====================================================
function make_download(data, name) {

    const btn = document.getElementById("btnDownload");
    btn.classList.remove("h");
    btn.classList.remove("bounce");
    void btn.offsetWidth;
    btn.classList.add("bounce");

	let blob = new Blob([data]);

	let link = document.getElementById("downloadLink");

	link.href = URL.createObjectURL(blob);
	link.download = name;
}

function download() {
    let link = document.getElementById("downloadLink");
    link.click();
}

// =====================================================
// Создание нового имени файла
// =====================================================

function makeName(name, suffix) {

	let dotIndex = name.lastIndexOf(".");

	if (dotIndex === -1)
		return name + suffix;

	let base = name.slice(0, dotIndex);
	let ext = name.slice(dotIndex);

	return base + suffix + ext;
}


// =====================================================
// Шифрование и дешифрование файла
// =====================================================

function EncDec(type) {

    if (!fileData) {
		alert("Выберите файл");
		return;
	}

	let seed = document.getElementById("seed").value;

	let out = process(seed);
    
	make_download(out, makeName(fileName, type === "encrypt" ? "_enc" : "_dec"));
}

// =====================================================
// Обработка выбора файла через стандартный диалог
// =====================================================
document.getElementById("file").onchange = e => {

	let file = e.target.files[0];

    fileName = file.name;

	let reader = new FileReader();

	reader.onload = () => {
		fileData = new Uint8Array(reader.result);
	};

	reader.readAsArrayBuffer(file);

	document.getElementById("fileinfo").innerText =
		"Файл: " + file.name + " (" + file.size + " bytes)";
};


// =====================================================
// Drag & Drop обработчики
// =====================================================
let drop = document.getElementById("drop");

drop.ondragover = e => {
	e.preventDefault();
	drop.classList.add("drag");
};

drop.ondragleave = e => {
	drop.classList.remove("drag");
};

drop.ondrop = e => {

	e.preventDefault();

	drop.classList.remove("drag");

	let file = e.dataTransfer.files[0];

	let reader = new FileReader();

	reader.onload = () => {
		fileData = new Uint8Array(reader.result);
	};

	reader.readAsArrayBuffer(file);

	document.getElementById("fileinfo").innerText =
		"Файл: " + file.name + " (" + file.size + " bytes)";
};


// =====================================================
// Клик по зоне загрузки открывает окно выбора файла
// =====================================================
const dropZone = document.getElementById("drop");
const fileInput = document.getElementById("file");

dropZone.addEventListener("click", () => {

	// кратковременная подсветка блока
	dropZone.classList.add("clicked");

	setTimeout(() => {
		dropZone.classList.remove("clicked");
	}, 200);

	// открываем диалог выбора файла
	fileInput.click();

});