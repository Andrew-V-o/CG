/* =========================================================
   ЛАБОРАТОРНАЯ РАБОТА №1 — НЕЧЕТНЫЙ ВАРИАНТ: CMYK / RGB / HLS
   ========================================================= */

let state = { r: 255, g: 0, b: 0 };
let lastCmyk = { c: 0, m: 100, y: 100, k: 0 };
let lastHls = { h: 0, s: 100, l: 50 };

// --- Математика перевода ---

function rgbToHls(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h, s, l = (max + min) / 2;

    if (max === min) {
        h = s = 0;
    } else {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }
    return {
        h: Math.round(h * 360),
        s: Math.round(s * 100),
        l: Math.round(l * 100)
    };
}

function hlsToRgb(h, s, l) {
    h /= 360; s /= 100; l /= 100;
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1/6) return p + (q - p) * 6 * t;
            if (t < 1/2) return q;
            if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1/3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1/3);
    }
    return {
        r: Math.round(r * 255),
        g: Math.round(g * 255),
        b: Math.round(b * 255)
    };
}

function rgbToCmyk(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    const k = 1 - Math.max(r, g, b);
    if (k === 1) return { c: 0, m: 0, y: 0, k: 100 };
    const c = (1 - r - k) / (1 - k);
    const m = (1 - g - k) / (1 - k);
    const y = (1 - b - k) / (1 - k);
    return {
        c: Math.round(c * 100),
        m: Math.round(m * 100),
        y: Math.round(y * 100),
        k: Math.round(k * 100)
    };
}

function cmykToRgb(c, m, y, k) {
    c /= 100; m /= 100; y /= 100; k /= 100;
    return {
        r: Math.round(255 * (1 - c) * (1 - k)),
        g: Math.round(255 * (1 - m) * (1 - k)),
        b: Math.round(255 * (1 - y) * (1 - k))
    };
}

function rgbToHex(r, g, b) {
    return "#" + [r, g, b]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('')
        .toUpperCase();
}

function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
}

// --- Конфигурация ---
const configs = {
    rgb: [
        { id: 'r', label: 'R', min: 0, max: 255 },
        { id: 'g', label: 'G', min: 0, max: 255 },
        { id: 'b', label: 'B', min: 0, max: 255 }
    ],
    cmyk: [
        { id: 'c', label: 'C', min: 0, max: 100 },
        { id: 'm', label: 'M', min: 0, max: 100 },
        { id: 'y', label: 'Y', min: 0, max: 100 },
        { id: 'k', label: 'K', min: 0, max: 100 }
    ],
    hls: [
        { id: 'h', label: 'H', min: 0, max: 360 },
        { id: 's', label: 'S', min: 0, max: 100 },
        { id: 'l', label: 'L', min: 0, max: 100 }
    ]
};

const paletteHints = {
    rgb:  'Оси: R (горизонталь) × G (вертикаль), B фиксирован',
    cmyk: 'Оси: C (горизонталь) × M (вертикаль), Y и K фиксированы',
    hls:  'Оси: S (горизонталь) × L (вертикаль), H фиксирован'
};

function cmykColor(channel) {
    const map = { c: '#00bcd4', m: '#e91e63', y: '#ffeb3b', k: '#000' };
    return map[channel];
}

function getSliderBg(model, confId) {
    if (model === 'rgb') {
        const rgb = { r: 0, g: 0, b: 0 };
        rgb[confId] = 255;
        return `linear-gradient(to right, #000, rgb(${rgb.r},${rgb.g},${rgb.b}))`;
    } else if (model === 'cmyk') {
        return `linear-gradient(to right, #fff, ${cmykColor(confId)})`;
    } else if (model === 'hls') {
        if (confId === 'h') {
            return 'linear-gradient(to right, hsl(0,100%,50%),hsl(60,100%,50%),hsl(120,100%,50%),hsl(180,100%,50%),hsl(240,100%,50%),hsl(300,100%,50%),hsl(360,100%,50%))';
        } else if (confId === 's') {
            return `linear-gradient(to right, hsl(${lastHls.h},0%,${lastHls.l}%), hsl(${lastHls.h},100%,${lastHls.l}%))`;
        } else if (confId === 'l') {
            return `linear-gradient(to right, #000, hsl(${lastHls.h},100%,50%), #fff)`;
        }
    }
    return '#ddd';
}

// --- Отрисовка палитры ---
function drawPalette(model) {
    const canvas = document.getElementById('color-canvas');
    const ctx = canvas.getContext('2d');
    const w = canvas.width, h = canvas.height;
    const img = ctx.createImageData(w, h);
    const data = img.data;

    if (model === 'hls') {
        const fixedH = lastHls.h;
        for (let y = 0; y < h; y++) {
            const l = 100 - (y / h) * 100;
            for (let x = 0; x < w; x++) {
                const s = (x / w) * 100;
                const rgb = hlsToRgb(fixedH, s, l);
                const idx = (y * w + x) * 4;
                data[idx] = rgb.r;
                data[idx+1] = rgb.g;
                data[idx+2] = rgb.b;
                data[idx+3] = 255;
            }
        }
    } else if (model === 'rgb') {
        const fixedB = state.b;
        for (let y = 0; y < h; y++) {
            const g = Math.round(255 - (y / h) * 255);
            for (let x = 0; x < w; x++) {
                const r = Math.round((x / w) * 255);
                const idx = (y * w + x) * 4;
                data[idx] = r;
                data[idx+1] = g;
                data[idx+2] = fixedB;
                data[idx+3] = 255;
            }
        }
    } else if (model === 'cmyk') {
        const fixedY = lastCmyk.y;
        const fixedK = lastCmyk.k;
        for (let y = 0; y < h; y++) {
            const m = Math.round(100 - (y / h) * 100);
            for (let x = 0; x < w; x++) {
                const c = Math.round((x / w) * 100);
                const rgb = cmykToRgb(c, m, fixedY, fixedK);
                const idx = (y * w + x) * 4;
                data[idx] = rgb.r;
                data[idx+1] = rgb.g;
                data[idx+2] = rgb.b;
                data[idx+3] = 255;
            }
        }
    }

    ctx.putImageData(img, 0, 0);
}

// --- Клик и перетаскивание по палитре ---
function setupCanvasClicks() {
    const canvas = document.getElementById('color-canvas');
    let isDragging = false;

    const handlePick = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const w = canvas.width, h = canvas.height;

        const activeModel = document.querySelector('.tab-btn.active').dataset.model;

        if (activeModel === 'hls') {
            const s = Math.round((x / w) * 100);
            const l = Math.round(100 - (y / h) * 100);
            lastHls.s = clamp(s, 0, 100);
            lastHls.l = clamp(l, 0, 100);
            state = hlsToRgb(lastHls.h, lastHls.s, lastHls.l);
            lastCmyk = rgbToCmyk(state.r, state.g, state.b);
        } else if (activeModel === 'rgb') {
            const r = Math.round((x / w) * 255);
            const g = Math.round(255 - (y / h) * 255);
            state = { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: state.b };
            lastCmyk = rgbToCmyk(state.r, state.g, state.b);
            lastHls = rgbToHls(state.r, state.g, state.b);
        } else if (activeModel === 'cmyk') {
            const c = Math.round((x / w) * 100);
            const m = Math.round(100 - (y / h) * 100);
            lastCmyk.c = clamp(c, 0, 100);
            lastCmyk.m = clamp(m, 0, 100);
            state = cmykToRgb(lastCmyk.c, lastCmyk.m, lastCmyk.y, lastCmyk.k);
            lastHls = rgbToHls(state.r, state.g, state.b);
        }
        updateUI();
    };

    canvas.addEventListener('mousedown', (e) => { isDragging = true; handlePick(e); });
    canvas.addEventListener('mousemove', (e) => { if (isDragging) handlePick(e); });
    window.addEventListener('mouseup', () => { isDragging = false; });
}

// --- Генерация контролов ---
function renderControls(model) {
    const container = document.getElementById('controls-container');
    container.innerHTML = '';
    container.dataset.currentModel = model;

    let values;
    if (model === 'rgb') {
        values = { r: state.r, g: state.g, b: state.b };
    } else if (model === 'cmyk') {
        values = { ...lastCmyk };
    } else if (model === 'hls') {
        values = { ...lastHls };
    }

    configs[model].forEach(conf => {
        const val = values[conf.id];
        if (val === undefined || val === null || isNaN(val)) return;

        const row = document.createElement('div');
        row.className = 'control-row';
        const bg = getSliderBg(model, conf.id);

        row.innerHTML = `
            <label>${conf.label}</label>
            <input type="range" min="${conf.min}" max="${conf.max}" value="${val}"
                   data-id="${conf.id}" style="background: ${bg}">
            <input type="number" min="${conf.min}" max="${conf.max}" value="${val}"
                   data-id="${conf.id}">
        `;
        container.appendChild(row);
    });

    // Обработчики событий ввода
    container.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val)) return;

            const conf = configs[model].find(c => c.id === e.target.dataset.id);
            val = clamp(val, conf.min, conf.max);

            // Синхронизация ползунка и числового поля
            container.querySelectorAll(`input[data-id="${e.target.dataset.id}"]`)
                .forEach(i => {
                    if (document.activeElement !== i) {
                        i.value = val;
                    }
                });

            if (model === 'rgb') {
                state = { ...state, [e.target.dataset.id]: val };
                lastCmyk = rgbToCmyk(state.r, state.g, state.b);
                lastHls = rgbToHls(state.r, state.g, state.b);
            } else if (model === 'cmyk') {
                lastCmyk[e.target.dataset.id] = val;
                state = cmykToRgb(lastCmyk.c, lastCmyk.m, lastCmyk.y, lastCmyk.k);
                lastHls = rgbToHls(state.r, state.g, state.b);
            } else if (model === 'hls') {
                lastHls[e.target.dataset.id] = val;
                state = hlsToRgb(lastHls.h, lastHls.s, lastHls.l);
                lastCmyk = rgbToCmyk(state.r, state.g, state.b);
            }

            drawPalette(model);
            updateColorPanel();
        });
    });
}

// --- Обновление цветной панели и значении модели ---
function updateColorPanel() {
    const panel = document.getElementById('color-info-panel');
    panel.style.backgroundColor = `rgb(${state.r},${state.g},${state.b})`;

    const luminance = (0.299 * state.r + 0.587 * state.g + 0.114 * state.b) / 255;
    panel.style.color = luminance > 0.55 ? '#000' : '#fff';

    const hex = rgbToHex(state.r, state.g, state.b);

    document.getElementById('info-rgb').textContent = `${state.r}, ${state.g}, ${state.b}`;
    document.getElementById('info-cmyk').textContent = `${lastCmyk.c}%, ${lastCmyk.m}%, ${lastCmyk.y}%, ${lastCmyk.k}%`;
    document.getElementById('info-hls').textContent = `${lastHls.h}°, ${lastHls.s}%, ${lastHls.l}%`;
    document.getElementById('info-hex').textContent = hex;
    document.getElementById('hex-value').textContent = hex;
}

// --- Главная функция обновления UI ---
function updateUI() {
    const activeModel = document.querySelector('.tab-btn.active').dataset.model;
    renderControls(activeModel);
    drawPalette(activeModel);
    updateColorPanel();
    document.getElementById('palette-hint').textContent = paletteHints[activeModel];
}

// --- Переключение вкладок ---
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const model = e.target.dataset.model;
        if (model === 'cmyk') {
            lastCmyk = rgbToCmyk(state.r, state.g, state.b);
        } else if (model === 'hls') {
            lastHls = rgbToHls(state.r, state.g, state.b);
        }

        updateUI();
    });
});

// --- Инициализация ---
setupCanvasClicks();
lastCmyk = rgbToCmyk(state.r, state.g, state.b);
lastHls = rgbToHls(state.r, state.g, state.b);
updateUI();