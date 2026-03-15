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

		// очищаем ввод
		seed = cleanSeed(seed);

		// если seed меньше 31 бит — дополняем единицами
		if (seed.length < 31)
			seed = seed.padEnd(31, '1');

		// создаём массив бит регистра
		this.reg = seed.slice(0, 31).split('').map(Number);
        //console.log("OLD: " + this.reg.join(""));
	}

	// -------------------------------------------------
	// Генерация следующего бита ключевой последовательности
	// Полином: x^31 + x^3 + 1
	// -------------------------------------------------
	nextBit() {

		// выходной бит — первый слева
		let out = this.reg[0];

		// вычисляем бит обратной связи
		let fb = this.reg[0] ^ this.reg[28];

        //let var1 = this.reg[0];
        //let var2 = this.reg[28];
        //let var3 = this.reg[14];
        //let var4 = this.reg[0];

		// сдвиг регистра влево
		for (let i = 0; i < 30; i++) {
			this.reg[i] = this.reg[i + 1];
		}

		// записываем новый бит справа
		this.reg[30] = fb;

        //console.log("NEW: " + this.reg.join("") + "  " + var1 + " ^ " + var2 + " = " + fb);

		return out;
	}
}


// =====================================================
// Преобразование массива байтов в массив бит
// =====================================================
function bytesToBits(bytes) {

	let bits = [];

	for (let b of bytes) {

		for (let i = 7; i >= 0; i--) {
			bits.push((b >> i) & 1);
		}

	}

	return bits;
}


// =====================================================
// Преобразование массива бит обратно в байты
// =====================================================
function bitsToBytes(bits) {

	let bytes = [];

	for (let i = 0; i < bits.length; i += 8) {

		let byte = 0;

		for (let j = 0; j < 8; j++) {
			byte = (byte << 1) | (bits[i + j] || 0);
		}

		bytes.push(byte);
	}

	return new Uint8Array(bytes);
}


// =====================================================
// Основная функция обработки (шифрование / дешифрование)
// =====================================================
function process(seed) {

	// создаём генератор LFSR
	let lfsr = new LFSR(seed);

	// переводим файл в битовую последовательность
	let bits = bytesToBits(fileData);

	let key = [];
	let result = [];

	// XOR исходного бита с битом ключа
	for (let b of bits) {

		let k = lfsr.nextBit();

		key.push(k);
		result.push(b ^ k);

	}

	// вывод первых бит на экран
	document.getElementById("original").value = bits.join("").slice(0, 1500);
	document.getElementById("key").value = key.join("").slice(0, 1500);
	document.getElementById("result").value = result.join("").slice(0, 1500);

	// возвращаем результат как байты
	return bitsToBytes(result);
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