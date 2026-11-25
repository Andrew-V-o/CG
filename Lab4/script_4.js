'use strict';

const TOP = 1;      // b0: y > ymax
const BOTTOM = 2;   // b1: y < ymin
const RIGHT = 4;    // b2: x > xmax
const LEFT = 8;     // b3: x < xmin

const EPS = 1e-9;

const beforeCanvas = document.getElementById('beforeCanvas');
const afterCanvas = document.getElementById('afterCanvas');
const dataInput = document.getElementById('dataInput');
const clipBtn = document.getElementById('clipBtn');
const alertEl = document.getElementById('alert');

const DEFAULT_EXAMPLE = '4\n1 1 9 3\n9 3 7 9\n7 9 2 7\n2 7 1 1\n3 2 7 8';

let currentData = null;
let currentPolygon = null;

document.getElementById('buildBtn').addEventListener('click', buildScene);
clipBtn.addEventListener('click', clipScene);
document.getElementById('exampleBtn').addEventListener('click', () => {
    dataInput.value = DEFAULT_EXAMPLE;
    buildScene();
});
document.getElementById('resetBtn').addEventListener('click', resetScene);
dataInput.addEventListener('keydown', (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
        event.preventDefault();
        buildScene();
    }
});

dataInput.value = DEFAULT_EXAMPLE;
buildScene();

// 1. ПАРСИНГ ВХОДНЫХ ДАННЫХ

function parseInput(text) {
    const nums = text.trim().split(/[\s,;]+/).filter(Boolean).map(Number);

    if (nums.some(Number.isNaN)) {
        throw new Error('Во входных данных есть нечисловые значения.');
    }

    const n = nums[0];

    if (!Number.isInteger(n) || n <= 0) {
        throw new Error('Первое число — количество отрезков — должно быть целым положительным.');
    }

    if (nums.length < 1 + 4 * n + 4) {
        throw new Error('Недостаточно данных: нужны координаты отрезков и окна.');
    }

    const segments = [];

    for (let i = 0; i < n; i++) {
        const o = 1 + 4 * i;
        segments.push({
            x1: nums[o],
            y1: nums[o + 1],
            x2: nums[o + 2],
            y2: nums[o + 3]
        });
    }

    const o = 1 + 4 * n;
    const win = {
        xmin: nums[o],
        ymin: nums[o + 1],
        xmax: nums[o + 2],
        ymax: nums[o + 3]
    };

    if (win.xmin > win.xmax) [win.xmin, win.xmax] = [win.xmax, win.xmin];
    if (win.ymin > win.ymax) [win.ymin, win.ymax] = [win.ymax, win.ymin];

    return { segments, window: win };
}

// 2. СИСТЕМА КООРДИНАТ И СЕТКА

function computeViewport(data, width, height) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;

    const add = (x, y) => {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
    };

    add(data.window.xmin, data.window.ymin);
    add(data.window.xmax, data.window.ymax);

    for (const s of data.segments) {
        add(s.x1, s.y1);
        add(s.x2, s.y2);
    }

    if (maxX - minX < EPS) { minX -= 1; maxX += 1; }
    if (maxY - minY < EPS) { minY -= 1; maxY += 1; }

    const padX = (maxX - minX) * 0.1;
    const padY = (maxY - minY) * 0.1;
    minX -= padX; maxX += padX;
    minY -= padY; maxY += padY;

    const scale = Math.min(width / (maxX - minX), height / (maxY - minY));
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    return {
        scale,
        visibleMinX: centerX - width / (2 * scale),
        visibleMaxX: centerX + width / (2 * scale),
        visibleMinY: centerY - height / (2 * scale),
        visibleMaxY: centerY + height / (2 * scale),
        toCanvas(x, y) {
            return {
                x: width / 2 + (x - centerX) * scale,
                y: height / 2 - (y - centerY) * scale
            };
        }
    };
}

function niceStep(range, maxTicks) {
    const rough = range / maxTicks;
    const pow = Math.pow(10, Math.floor(Math.log10(rough)));
    for (const m of [1, 2, 5, 10]) {
        if (m * pow >= rough) return m * pow;
    }
    return 10 * pow;
}

function formatNumber(value) {
    if (Math.abs(value) < EPS) return '0';
    const abs = Math.abs(value);
    if (abs >= 1000 || abs < 0.01) return value.toPrecision(3);
    return Number(value.toFixed(2)).toString();
}

function drawGrid(ctx, vp, width, height) {
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, width, height);

    const stepX = niceStep(vp.visibleMaxX - vp.visibleMinX, 12);
    const stepY = niceStep(vp.visibleMaxY - vp.visibleMinY, 10);

    ctx.font = '11px monospace';

    for (let x = Math.ceil(vp.visibleMinX / stepX) * stepX; x <= vp.visibleMaxX + EPS; x += stepX) {
        const p = vp.toCanvas(x, 0);
        const isAxis = Math.abs(x) < EPS;
        ctx.strokeStyle = isAxis ? '#555' : '#e7e7e7';
        ctx.lineWidth = isAxis ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(p.x + 0.5, 0);
        ctx.lineTo(p.x + 0.5, height);
        ctx.stroke();
        ctx.fillStyle = '#777';
        ctx.fillText(formatNumber(x), p.x + 3, height - 5);
    }

    for (let y = Math.ceil(vp.visibleMinY / stepY) * stepY; y <= vp.visibleMaxY + EPS; y += stepY) {
        const p = vp.toCanvas(0, y);
        const isAxis = Math.abs(y) < EPS;
        ctx.strokeStyle = isAxis ? '#555' : '#e7e7e7';
        ctx.lineWidth = isAxis ? 1.5 : 1;
        ctx.beginPath();
        ctx.moveTo(0, p.y + 0.5);
        ctx.lineTo(width, p.y + 0.5);
        ctx.stroke();
        ctx.fillStyle = '#777';
        ctx.fillText(formatNumber(y), 4, p.y - 3);
    }

    ctx.fillStyle = '#333';
    ctx.font = 'bold 12px sans-serif';
    if (vp.visibleMinY <= 0 && vp.visibleMaxY >= 0) {
        ctx.fillText('X', width - 16, vp.toCanvas(0, 0).y - 5);
    }
    if (vp.visibleMinX <= 0 && vp.visibleMaxX >= 0) {
        ctx.fillText('Y', vp.toCanvas(0, 0).x + 5, 12);
    }
}

function clearCanvas(canvas) {
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
}

// 3. ЧАСТЬ 1. АЛГОРИТМ САЗЕРЛЕНДА-КОЭНА

function outcode(x, y, win) {
    let code = 0;
    if (y > win.ymax) code |= TOP;
    if (y < win.ymin) code |= BOTTOM;
    if (x > win.xmax) code |= RIGHT;
    if (x < win.xmin) code |= LEFT;
    return code;
}

function lineCoefficients(x1, y1, x2, y2) {
    return {
        A: y2 - y1,
        B: x1 - x2,
        C: x2 * y1 - x1 * y2
    };
}

function boundariesFromCode(code) {
    const result = [];
    if (code & TOP) result.push('top');
    if (code & BOTTOM) result.push('bottom');
    if (code & RIGHT) result.push('right');
    if (code & LEFT) result.push('left');
    return result;
}

function intersectLineWithBoundary(line, boundary, win) {
    switch (boundary) {
        case 'top':
            if (Math.abs(line.A) < EPS) return null;
            return { x: -(line.B * win.ymax + line.C) / line.A, y: win.ymax };
        case 'bottom':
            if (Math.abs(line.A) < EPS) return null;
            return { x: -(line.B * win.ymin + line.C) / line.A, y: win.ymin };
        case 'right':
            if (Math.abs(line.B) < EPS) return null;
            return { x: win.xmax, y: -(line.A * win.xmax + line.C) / line.B };
        case 'left':
            if (Math.abs(line.B) < EPS) return null;
            return { x: win.xmin, y: -(line.A * win.xmin + line.C) / line.B };
        default:
            return null;
    }
}

function cohenSutherlandClip(segment, win) {
    let x1 = segment.x1, y1 = segment.y1;
    let x2 = segment.x2, y2 = segment.y2;

    const line = lineCoefficients(x1, y1, x2, y2);
    let code1 = outcode(x1, y1, win);
    let code2 = outcode(x2, y2, win);

    for (let i = 0; i < 20; i++) {
        // Полностью видим
        if (code1 === 0 && code2 === 0) {
            return { visible: true, x1, y1, x2, y2 };
        }

        // Полностью невидим
        if ((code1 & code2) !== 0) {
            return { visible: false };
        }

        // Частично видим: отсекаем внешнюю точку
        const codeOut = code1 !== 0 ? code1 : code2;

        let p = null;
        for (const boundary of boundariesFromCode(codeOut)) {
            p = intersectLineWithBoundary(line, boundary, win);
            if (p) break;
        }
        if (!p) return { visible: false };

        if (codeOut === code1) {
            x1 = p.x; y1 = p.y;
            code1 = outcode(x1, y1, win);
        } else {
            x2 = p.x; y2 = p.y;
            code2 = outcode(x2, y2, win);
        }
    }

    return { visible: false };
}

// 4. ЧАСТЬ 2. АЛГОРИТМ САЗЕРЛЕНДА-ХОДЖМАНА

function isInsideSide(x, y, side, win) {
    switch (side) {
        case 'left': return x >= win.xmin - EPS;
        case 'right': return x <= win.xmax + EPS;
        case 'bottom': return y >= win.ymin - EPS;
        case 'top': return y <= win.ymax + EPS;
        default: return false;
    }
}

function intersectSegmentWithSide(s, p, side, win) {
    const dx = p.x - s.x;
    const dy = p.y - s.y;

    switch (side) {
        case 'left':
            if (Math.abs(dx) < EPS) return null;
            return { x: win.xmin, y: s.y + ((win.xmin - s.x) * dy) / dx };
        case 'right':
            if (Math.abs(dx) < EPS) return null;
            return { x: win.xmax, y: s.y + ((win.xmax - s.x) * dy) / dx };
        case 'bottom':
            if (Math.abs(dy) < EPS) return null;
            return { x: s.x + ((win.ymin - s.y) * dx) / dy, y: win.ymin };
        case 'top':
            if (Math.abs(dy) < EPS) return null;
            return { x: s.x + ((win.ymax - s.y) * dx) / dy, y: win.ymax };
        default:
            return null;
    }
}

function clipPolygonBySide(polygon, side, win) {
    const output = [];
    const n = polygon.length;

    for (let i = 0; i < n; i++) {
        const current = polygon[i];
        const previous = polygon[(i - 1 + n) % n];

        const currentInside = isInsideSide(current.x, current.y, side, win);
        const previousInside = isInsideSide(previous.x, previous.y, side, win);

        if (previousInside && currentInside) {
            output.push(current);
        } else if (previousInside && !currentInside) {
            const p = intersectSegmentWithSide(previous, current, side, win);
            if (p) output.push(p);
        } else if (!previousInside && currentInside) {
            const p = intersectSegmentWithSide(previous, current, side, win);
            if (p) output.push(p);
            output.push(current);
        }
    }

    return output;
}

function sutherlandHodgman(polygon, win) {
    let result = polygon.slice();

    for (const side of ['left', 'right', 'bottom', 'top']) {
        if (result.length === 0) break;
        result = clipPolygonBySide(result, side, win);
    }

    return result;
}
// 5. ОТРИСОВКА

function drawBefore() {
    const ctx = beforeCanvas.getContext('2d');
    const vp = computeViewport(currentData, beforeCanvas.width, beforeCanvas.height);
    drawGrid(ctx, vp, beforeCanvas.width, beforeCanvas.height);

    const win = currentData.window;

    // Окно отсечения — красный
    const a = vp.toCanvas(win.xmin, win.ymax);
    const b = vp.toCanvas(win.xmax, win.ymin);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 4]);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.setLineDash([]);

    // Исходные отрезки
    ctx.strokeStyle = 'blue';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (const s of currentData.segments) {
        const p = vp.toCanvas(s.x1, s.y1);
        const q = vp.toCanvas(s.x2, s.y2);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();
}

function drawAfter(clippedSegments, clippedPolygon) {
    const ctx = afterCanvas.getContext('2d');
    const vp = computeViewport(currentData, afterCanvas.width, afterCanvas.height);
    drawGrid(ctx, vp, afterCanvas.width, afterCanvas.height);

    const win = currentData.window;

    // Окно отсечения — красный
    const a = vp.toCanvas(win.xmin, win.ymax);
    const b = vp.toCanvas(win.xmax, win.ymin);
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.setLineDash([7, 4]);
    ctx.strokeRect(a.x, a.y, b.x - a.x, b.y - a.y);
    ctx.setLineDash([]);

    // Видимые части отрезков — зелёный
    ctx.strokeStyle = 'green';
    ctx.lineWidth = 3;
    ctx.beginPath();
    for (const r of clippedSegments) {
        if (!r.visible) continue;
        const p = vp.toCanvas(r.x1, r.y1);
        const q = vp.toCanvas(r.x2, r.y2);
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(q.x, q.y);
    }
    ctx.stroke();

    // Отсечённый многоугольник — зелёный
    if (clippedPolygon.length >= 3) {
        ctx.beginPath();
        clippedPolygon.forEach((point, i) => {
            const q = vp.toCanvas(point.x, point.y);
            if (i === 0) ctx.moveTo(q.x, q.y);
            else ctx.lineTo(q.x, q.y);
        });
        ctx.closePath();
        ctx.fillStyle = 'rgba(0, 180, 0, 0.15)';
        ctx.fill();
        ctx.stroke();
    }
}

// 6. УПРАВЛЕНИЕ СЦЕНОЙ

function setStatus(message) {
    alertEl.hidden = !message;
    alertEl.textContent = message || '';
}

function buildScene() {
    try {
        currentData = parseInput(dataInput.value);
        currentPolygon = currentData.segments.map(s => ({ x: s.x1, y: s.y1 }));

        clipBtn.disabled = false;
        setStatus('');
        drawBefore();
        clearCanvas(afterCanvas);
    } catch (error) {
        currentData = null;
        currentPolygon = null;
        clipBtn.disabled = true;
        setStatus(error.message);
        clearCanvas(beforeCanvas);
        clearCanvas(afterCanvas);
    }
}

function clipScene() {
    if (!currentData) return;

    const clippedSegments = currentData.segments.map(
        s => cohenSutherlandClip(s, currentData.window)
    );
    const clippedPolygon = sutherlandHodgman(currentPolygon, currentData.window);

    drawAfter(clippedSegments, clippedPolygon);
}

function resetScene() {
    currentData = null;
    currentPolygon = null;
    dataInput.value = '';
    clipBtn.disabled = true;
    setStatus('');
    clearCanvas(beforeCanvas);
    clearCanvas(afterCanvas);
}