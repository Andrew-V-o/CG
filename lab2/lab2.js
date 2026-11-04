let currentImageData = null;
let savedUploadedImage = null;

// Загрузка изображения из файла
document.getElementById('fileInput').addEventListener('change', function(e) {
    const file = e.target.files[0];
    if (file) {
        const img = new Image();
        img.onload = () => {
            savedUploadedImage = img;
            const btn = document.getElementById('savedBtn');
            btn.style.display = 'inline-block';
            btn.style.background = '#2e7d32';
            processImage(img);
        };
        img.src = URL.createObjectURL(file);
    }
});

// Возврат к загруженному изображению
function loadSaved() {
    if (savedUploadedImage) {
        const btn = document.getElementById('savedBtn');
        btn.style.background = '#1b5e20';
        processImage(savedUploadedImage);
        setTimeout(() => { btn.style.background = '#2e7d32'; }, 300);
    } else {
        alert('Сначала загрузите изображение');
    }
}

// Загрузка демо-изображения из папки images
function loadDemo(filename) {
    const img = new Image();
    img.onload = () => processImage(img);
    img.onerror = () => alert('Не удалось загрузить изображение: images/' + filename);
    img.src = 'images/' + filename;
}

// Основная обработка
function processImage(img) {
    const size = 400;
    const canvas = document.getElementById('origCanvas1');
    canvas.width = size;
    canvas.height = size * (img.height / img.width);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    currentImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

    // 1. Поэлементные операции и контрастирование
    const linearData = linearContrast(currentImageData);
    drawResult('linearCanvas', linearData);

    const invertData = invertImage(currentImageData);
    drawResult('invertCanvas', invertData);

    const gammaData = gammaCorrection(currentImageData, 0.5);
    drawResult('gammaCanvas', gammaData);

    // 2. Гистограммы и эквализация
    drawResult('origCanvas2', currentImageData);
    drawHistogram('origHist', currentImageData);

    // Линейное контрастирование во второй блок для наглядного сравнения
    drawResult('linearCanvas2', linearData);
    drawHistogram('linearHist2', linearData);

    const rgbData = equalizeHistogramRGB(currentImageData);
    drawResult('rgbCanvas', rgbData);
    drawHistogram('rgbHist', rgbData);

    const hslData = equalizeHistogramHSL(currentImageData);
    drawResult('hslCanvas', hslData);
    drawHistogram('hslHist', hslData);
}

// Линейное контрастирование
function linearContrast(imgData) {
    const data = imgData.data;
    const result = new ImageData(imgData.width, imgData.height);
    const res = result.data;

    let minVal = 255, maxVal = 0;
    for (let i = 0; i < data.length; i += 4) {
        const lum = 0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2];
        if (lum < minVal) minVal = lum;
        if (lum > maxVal) maxVal = lum;
    }

    const range = maxVal - minVal;
    if (range === 0) return imgData;

    for (let i = 0; i < data.length; i += 4) {
        res[i]   = Math.max(0, Math.min(255, (data[i]   - minVal) / range * 255));
        res[i+1] = Math.max(0, Math.min(255, (data[i+1] - minVal) / range * 255));
        res[i+2] = Math.max(0, Math.min(255, (data[i+2] - minVal) / range * 255));
        res[i+3] = 255;
    }
    return result;
}

// Инверсия
function invertImage(imgData) {
    const data = imgData.data;
    const result = new ImageData(imgData.width, imgData.height);
    const res = result.data;
    for (let i = 0; i < data.length; i += 4) {
        res[i]   = 255 - data[i];
        res[i+1] = 255 - data[i+1];
        res[i+2] = 255 - data[i+2];
        res[i+3] = 255;
    }
    return result;
}

// Гамма-коррекция
function gammaCorrection(imgData, gamma) {
    const data = imgData.data;
    const result = new ImageData(imgData.width, imgData.height);
    const res = result.data;
    for (let i = 0; i < data.length; i += 4) {
        res[i]   = Math.round(255 * Math.pow(data[i]   / 255, gamma));
        res[i+1] = Math.round(255 * Math.pow(data[i+1] / 255, gamma));
        res[i+2] = Math.round(255 * Math.pow(data[i+2] / 255, gamma));
        res[i+3] = 255;
    }
    return result;
}

// Эквализация RGB
function equalizeHistogramRGB(imgData) {
    const data = imgData.data;
    const result = new ImageData(imgData.width, imgData.height);
    const res = result.data;
    const totalPixels = imgData.width * imgData.height;

    const histR = new Array(256).fill(0);
    const histG = new Array(256).fill(0);
    const histB = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
        histR[data[i]]++; histG[data[i+1]]++; histB[data[i+2]]++;
    }

    const lutR = buildLUT(histR, totalPixels);
    const lutG = buildLUT(histG, totalPixels);
    const lutB = buildLUT(histB, totalPixels);

    for (let i = 0; i < data.length; i += 4) {
        res[i]   = lutR[data[i]];
        res[i+1] = lutG[data[i+1]];
        res[i+2] = lutB[data[i+2]];
        res[i+3] = 255;
    }
    return result;
}

// Эквализация HSL
function equalizeHistogramHSL(imgData) {
    const data = imgData.data;
    const result = new ImageData(imgData.width, imgData.height);
    const res = result.data;
    const totalPixels = imgData.width * imgData.height;

    const hsl = [];
    const histL = new Array(256).fill(0);

    for (let i = 0; i < data.length; i += 4) {
        const [h, s, l] = rgbToHsl(data[i], data[i+1], data[i+2]);
        hsl.push([h, s, l]);
        histL[l]++;
    }

    const lutL = buildLUT(histL, totalPixels);

    for (let i = 0; i < data.length; i += 4) {
        const [h, s, l] = hsl[i / 4];
        const newL = lutL[l];
        const [r, g, b] = hslToRgb(h, s, newL);
        res[i] = r; res[i+1] = g; res[i+2] = b; res[i+3] = 255;
    }
    return result;
}

// Построение LUT для эквализации
function buildLUT(hist, totalPixels) {
    const lut = new Array(256);
    let sum = 0;
    const cdfMin = hist.find(v => v > 0) || 1;
    for (let i = 0; i < 256; i++) {
        sum += hist[i];
        lut[i] = Math.max(0, Math.min(255,
            Math.round((sum - cdfMin) / (totalPixels - cdfMin) * 255)));
    }
    return lut;
}

// Конвертация RGB → HSL
function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const d = max - min;
    let h, s, l = (max + min) / 2;

    if (d < 1e-4) {
        h = s = 0;
    } else {
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
            case g: h = ((b - r) / d + 2) / 6; break;
            case b: h = ((r - g) / d + 4) / 6; break;
        }
    }
    return [h, s, Math.round(l * 255)];
}

// Конвертация HSL → RGB
function hslToRgb(h, s, l) {
    l /= 255;
    if (s === 0) {
        const v = Math.round(l * 255);
        return [v, v, v];
    }
    const hue2rgb = (p, q, t) => {
        if (t < 0) t += 1; if (t > 1) t -= 1;
        if (t < 1/6) return p + (q - p) * 6 * t;
        if (t < 1/2) return q;
        if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
        return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    return [
        Math.round(hue2rgb(p, q, h + 1/3) * 255),
        Math.round(hue2rgb(p, q, h) * 255),
        Math.round(hue2rgb(p, q, h - 1/3) * 255)
    ];
}

// Отрисовка изображения
function drawResult(canvasId, imgData) {
    const canvas = document.getElementById(canvasId);
    canvas.width = imgData.width;
    canvas.height = imgData.height;
    canvas.getContext('2d').putImageData(imgData, 0, 0);
}

// Отрисовка гистограммы
function drawHistogram(canvasId, imgData) {
    const canvas = document.getElementById(canvasId);
    const ctx = canvas.getContext('2d');
    canvas.width = canvas.offsetWidth * 2;
    canvas.height = 200;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const hist = new Array(256).fill(0);
    const data = imgData.data;
    for (let i = 0; i < data.length; i += 4) {
        const lum = Math.round(0.299 * data[i] + 0.587 * data[i+1] + 0.114 * data[i+2]);
        hist[lum]++;
    }

    const maxVal = Math.max(...hist);
    const barWidth = canvas.width / 256;
    ctx.fillStyle = '#4CAF50';
    for (let i = 0; i < 256; i++) {
        const barHeight = (hist[i] / maxVal) * canvas.height * 0.9;
        ctx.fillRect(i * barWidth, canvas.height - barHeight, barWidth, barHeight);
    }
}

// Загрузка демо при старте
window.onload = () => loadDemo('Малоконтрастное.jpg');