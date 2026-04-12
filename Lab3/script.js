// массив байтов загруженного файла
let fileData = null

// имя файла
let fileName = ""

// поля ввода параметров Рабина
pInput = document.getElementById("p")
qInput = document.getElementById("q")
bInput = document.getElementById("b")

// разрешаем ввод только цифр для p
pInput.addEventListener("input", () => {
	pInput.value = pInput.value
		.replace(/[^0123456789]/g, '')
});

// разрешаем ввод только цифр для q
qInput.addEventListener("input", () => {
	qInput.value = qInput.value
		.replace(/[^0123456789]/g, '')
});

// разрешаем ввод только цифр для b
bInput.addEventListener("input", () => {
	bInput.value = bInput.value
		.replace(/[^0123456789]/g, '')
});


// алгоритм Евклида (НОД)
function gcd(a,b){
    while(b!=0){
        let t=b
        b=a%b
        a=t
    }
    return a
}


// алгоритм быстрого возведения в степень по модулю
function modPow(base, exp, mod){

    let result = 1n
    base = BigInt(base) % BigInt(mod)
    exp = BigInt(exp)
    mod = BigInt(mod)

    while(exp > 0){
        // если степень нечётная
        if(exp % 2n == 1n)
            result = (result * base) % mod

        // возводим основание в квадрат
        base = (base * base) % mod

        // делим степень на 2
        exp /= 2n
    }

    return result
}


// расширенный алгоритм Евклида
function egcd(a,b){

    let x0=1n, x1=0n
    let y0=0n, y1=1n

    a=BigInt(a)
    b=BigInt(b)

    while(b!=0n){

        let q = a/b

        let r = a%b
        a=b
        b=r

        let x2=x0-q*x1
        x0=x1
        x1=x2

        let y2=y0-q*y1
        y0=y1
        y1=y2
    }

    return {x:x0,y:y0,g:a}
}


// проверка числа на простоту
function isPrime(n){

    if(n < 2n) return false

    for(let i=2n;i*i<=n;i++){
        if(n % i == 0n) return false
    }

    return true
}


// получение и проверка параметров Рабина
function getParams(){

    let p = BigInt(pInput.value)
    let q = BigInt(qInput.value)
    let b = BigInt(bInput.value)

    // p и q должны быть разными
    if(p == q){
        alert("p и q должны быть разными")
        return null
    }

    // p должно быть простым
    if(!isPrime(p)){
        alert("p должно быть простым")
        return null
    }

    // q должно быть простым
    if(!isPrime(q)){
        alert("q должно быть простым")
        return null
    }

    // p ≡ 3 mod 4
    if(p % 4n !== 3n){
        alert("p при делении на 4 должно дать в остатке 3")
        return null
    }

    // q ≡ 3 mod 4
    if(q % 4n !== 3n){
        alert("q при делении на 4 должно дать в остатке 3")
        return null
    }

    // вычисление модуля
    let n = p*q

    // модуль должен быть больше байта
    if(n <= 256n){
        alert("p * q должно быть > 256")
        return null
    }

    // проверка диапазона b
    if(b < 0n || b >= n){
        alert("b должно быть 0 ≤ b < n")
        return null
    }

    // вывод n
    document.getElementById("info").innerText =
        "n = " + n

    return {p,q,b,n}
}


// шифрование файла алгоритмом Рабина
function encrypt(){

    if(!fileData){
        alert("Выберите файл")
        return
    }

    let params = getParams()
    if(!params) return

    let {p,q,b,n} = params

    let out = []
    let original = ""
    let result = ""

    let printed = 0
    const LIMIT = 1500

    // цикл по байтам файла
    for(let i=0;i<fileData.length;i++){

        // исходный байт
        let m = BigInt(fileData[i])

        // формула Рабина
        let c = (m * (m + b)) % n

        // запись 4 байт (big endian)
        out.push(Number((c >> 24n) & 0xFFn))
        out.push(Number((c >> 16n) & 0xFFn))
        out.push(Number((c >> 8n) & 0xFFn))
        out.push(Number(c & 0xFFn))

        // ограничение вывода
        if (printed < LIMIT) {
            original += m + " "
            result += c + " "
            printed++
        }
    }

    // вывод на экран
    document.getElementById("original").value = original
    document.getElementById("result").value = result

    // вывод ключей
    document.getElementById("key").value =
        "Открытый: \n" +  
        "    n = " + n + "\n" +
        "    b = " + b + "\n" +
        "Закрытый: \n" +  
        "    p = " + p + "\n" +
        "    q = " + q

    // сохранение файла
    make_download(new Uint8Array(out), makeName(fileName, "_enc"))
}


// расшифрование файла алгоритмом Рабина
function decrypt(){

    if(!fileData){
        alert("Выберите файл")
        return
    }

    let params = getParams()
    if(!params) return

    let {p,q,b,n} = params

    // коэффициенты CRT
    let eg = egcd(p,q)
    let yp = eg.x
    let yq = eg.y

    let out = []
    let original = ""
    let result = ""

    let printed = 0
    const LIMIT = 1500

    // чтение по 4 байта
    for(let i=0;i<fileData.length;i+=4){

        // сборка числа (big endian)
        let c =
            ((i < fileData.length)   ? (BigInt(fileData[i])   << 24n) : 0n) |
            ((i+1 < fileData.length) ? (BigInt(fileData[i+1]) << 16n) : 0n) |
            ((i+2 < fileData.length) ? (BigInt(fileData[i+2]) << 8n)  : 0n) |
            ((i+3 < fileData.length) ?  BigInt(fileData[i+3])         : 0n)

        // дискриминант
        let D = (b*b + 4n*c) % n

        // квадратные корни
        let mp = modPow(D,(p+1n)/4n,p)
        let mq = modPow(D,(q+1n)/4n,q)

        // четыре корня Рабина
        let d1 = (yp*p*mq + yq*q*mp) % n
        let d2 = n - d1
        let d3 = (yp*p*mq - yq*q*mp) % n
        let d4 = n - d3

        let dRoots = [d1,d2,d3,d4]
        let mRoots = []

        // получение возможных m
        for(let d of dRoots) {
            if ((d - b) % 2n === 0n) {
                mRoots.push( ((-b + d) / 2n) % n );
            } else {
                mRoots.push( ((-b + n + d) / 2n) % n );
            }
        }

        let m = 0n

        // выбор корректного корня
        for (let candidate of mRoots) {
            if(candidate >= 0 && candidate < 256n){
                m = candidate
                break
            }
        }

        out.push(Number(m))

        if (printed < LIMIT) {
            original += c + " "
            result += m + " "
            printed++
        }
    }

    document.getElementById("original").value = original
    document.getElementById("result").value = result

    document.getElementById("key").value =
        "Открытый: \n" +  
        "    n = " + n + "\n" +
        "    b = " + b + "\n" +
        "Закрытый: \n" +  
        "    p = " + p + "\n" +
        "    q = " + q

    make_download(new Uint8Array(out), makeName(fileName,"_dec"))
}


// формирование имени файла
function makeName(name, suffix) {

	let dotIndex = name.lastIndexOf(".");

	if (dotIndex === -1)
		return name + suffix;

	let base = name.slice(0, dotIndex);
	let ext = name.slice(dotIndex);

	return base + suffix + ext;
}


// создание файла для скачивания
function make_download(data,name){

    const btn=document.getElementById("btnDownload")
    btn.classList.remove("h");
    btn.classList.remove("bounce");
    void btn.offsetWidth;
    btn.classList.add("bounce");

    let blob=new Blob([data])
    let link=document.getElementById("downloadLink")

    link.href=URL.createObjectURL(blob)
    link.download=name
}


// скачивание файла
function download(){
    document.getElementById("downloadLink").click()
}


// выбор файла
document.getElementById("file").onchange=e=>{

    let file=e.target.files[0]
    fileName=file.name

    let reader=new FileReader()

    reader.onload=()=>{
        fileData=new Uint8Array(reader.result)
    }

    reader.readAsArrayBuffer(file)

    document.getElementById("fileinfo").innerText =
        file.name + " (" + file.size + " bytes)"
}


// drag & drop
let drop=document.getElementById("drop")

drop.ondragover=e=>{
    e.preventDefault()
}

drop.ondrop=e=>{

    e.preventDefault()

    let file=e.dataTransfer.files[0]
    fileName=file.name

    let reader=new FileReader()

    reader.onload=()=>{
        fileData=new Uint8Array(reader.result)
    }

    reader.readAsArrayBuffer(file)

    document.getElementById("fileinfo").innerText =
        file.name + " (" + file.size + " bytes)"
}


// клик по области загрузки
drop.onclick=()=>{
    document.getElementById("file").click()
}