const SCALE = 25; // размер одного логического пикселя
const canvas = document.getElementById('mainCanvas');
const ctx = canvas.getContext('2d');
const OX = canvas.width / 2;
const OY = canvas.height / 2;

function clearCanvas() {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
}

function drawGrid() {
    ctx.strokeStyle = '#ddd';
    ctx.lineWidth = 1;
    // вертикальные линии
    for (let x = -Math.floor(OX / SCALE); x <= Math.floor(OX / SCALE); x++) {
        const sx = OX + x * SCALE;
        ctx.beginPath(); ctx.moveTo(sx, 0); ctx.lineTo(sx, canvas.height); ctx.stroke();
    }
    // горизонтальные линии
    for (let y = -Math.floor(OY / SCALE); y <= Math.floor(OY / SCALE); y++) {
        const sy = OY - y * SCALE;
        ctx.beginPath(); ctx.moveTo(0, sy); ctx.lineTo(canvas.width, sy); ctx.stroke();
    }
    // оси
    ctx.strokeStyle = '#333'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(0, OY); ctx.lineTo(canvas.width, OY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(OX, 0); ctx.lineTo(OX, canvas.height); ctx.stroke();
    // подписи
    ctx.fillStyle = '#333'; ctx.font = '11px sans-serif';
    for (let x = -Math.floor(OX / SCALE); x <= Math.floor(OX / SCALE); x++) {
        if (x === 0) continue;
        ctx.fillText(x, OX + x * SCALE - 4, OY + 12);
    }
    for (let y = -Math.floor(OY / SCALE); y <= Math.floor(OY / SCALE); y++) {
        if (y === 0) continue;
        ctx.fillText(y, OX + 4, OY - y * SCALE + 4);
    }
    ctx.fillText('0', OX + 4, OY + 12);
}

// отрисовка одного логического пикселя квадратом scale×scale
function putPixel(x, y, color = '#000') {
    const sx = OX + x * SCALE;
    const sy = OY - y * SCALE;
    ctx.fillStyle = color;
    ctx.fillRect(sx, sy, SCALE, SCALE);
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.strokeRect(sx, sy, SCALE, SCALE);
}

// пиксель с прозрачностью (для алгоритма Ву)
function putPixelAlpha(x, y, alpha, color = [0, 0, 0]) {
    const sx = OX + x * SCALE;
    const sy = OY - y * SCALE;
    ctx.fillStyle = `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;
    ctx.fillRect(sx, sy, SCALE, SCALE);
}

// 1. ПОШАГОВЫЙ АЛГОРИТМ
function stepAlgorithm(x1, y1, x2, y2) {
    const points = [], steps = [];
    const dx = x2 - x1, dy = y2 - y1;
    const steep = Math.abs(dy) > Math.abs(dx);
    if (steep) { [x1, y1, x2, y2] = [y1, x1, y2, x2]; }
    if (x1 > x2) { [x1, x2] = [x2, x1];[y1, y2] = [y2, y1]; }
    const dxN = x2 - x1, dyN = y2 - y1;
    const k = dxN === 0 ? 0 : dyN / dxN;
    let y = y1;
    for (let x = x1; x <= x2; x++) {
        const rx = steep ? Math.round(y) : x;
        const ry = steep ? x : Math.round(y);
        points.push({ x: rx, y: ry });
        steps.push({
            x: rx, y: ry, k: k.toFixed(4), yFloat: y.toFixed(4),
            decision: `y = kx+b = ${y.toFixed(3)} → ${Math.round(y)}`
        });
        y += k;
    }
    return { points, steps };
}

// 2. ЦДА (симметричный)
function ddaAlgorithm(x1, y1, x2, y2) {
    const points = [], steps = [];
    let dx = x2 - x1, dy = y2 - y1;
    const L = Math.max(Math.abs(dx), Math.abs(dy));
    if (L === 0) { points.push({ x: x1, y: y1 }); return { points, steps }; }
    const sx = dx / L, sy = dy / L;
    let x = x1, y = y1;
    for (let i = 0; i <= L; i++) {
        const px = Math.round(x), py = Math.round(y);
        points.push({ x: px, y: py });
        steps.push({
            i, x: px, y: py, xFloat: x.toFixed(3), yFloat: y.toFixed(3),
            dx: sx.toFixed(3), dy: sy.toFixed(3)
        });
        x += sx; y += sy;
    }
    return { points, steps };
}

// 3. БРЕЗЕНХЭМ (линия) — целочисленный, все 8 октантов
function bresenhamLine(x1, y1, x2, y2) {
    const points = [], steps = [];
    const dx = Math.abs(x2 - x1), dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    const steep = dy > dx;

    // приводим к I октанту для логики ошибки
    let err = (steep ? 2 * dx : 2 * dy) - (steep ? dy : dx);
    let x = x1, y = y1;
    let stepN = 0;

    while (true) {
        points.push({ x, y });
        steps.push({ step: stepN, x, y, err, decision: err >= 0 ? 'E≥0 → диагональ' : 'E<0 → по основной оси' });
        if (x === x2 && y === y2) break;
        const e2 = err;
        if (steep) {
            // основная ось — Y
            if (e2 >= 0) { x += sx; err -= 2 * dy; }
            y += sy; err += 2 * dx;
        } else {
            // основная ось — X
            if (e2 >= 0) { y += sy; err -= 2 * dx; }
            x += sx; err += 2 * dy;
        }
        stepN++;
    }
    return { points, steps };
}

// 4. БРЕЗЕНХЭМ (окружность) — 8-way симметрия
function bresenhamCircle(xc, yc, R) {
    const points = [], steps = [];
    let x = 0, y = R;
    let E = 3 - 2 * R;

    const plot8 = (x, y) => {
        const arr = [
            [x, y], [x, -y], [-x, y], [-x, -y],
            [y, x], [y, -x], [-y, x], [-y, -x]
        ];
        arr.forEach(([dx, dy]) => points.push({ x: xc + dx, y: yc + dy }));
    };

    plot8(x, y);
    steps.push({ step: 0, x, y, E, decision: 'старт' });
    let stepN = 1;

    while (x < y) {
        if (E >= 0) {
            E = E + 4 * (x - y) + 10;
            x++; y--;
            steps.push({ step: stepN, x, y, E, decision: 'E≥0 → диагональ (x+1, y−1)' });
        } else {
            E = E + 4 * x + 6;
            x++;
            steps.push({ step: stepN, x, y, E, decision: 'E<0 → горизонталь (x+1, y)' });
        }
        plot8(x, y);
        stepN++;
    }
    return { points, steps };
}

// 5. КАСТЛ-ПИТВЕЙ (на основе алгоритма Евклида)
function castlePitway(x1, y1, x2, y2) {
    const points = [], steps = [];
    let a = Math.abs(x2 - x1), b = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    const steep = b > a;
    if (steep) { [a, b] = [b, a]; }

    // канонический случай: a >= b >= 0
    let X = a - b, Y = b;
    let m1 = 's', m2 = 'd';
    let stepN = 0;
    steps.push({ step: stepN++, x: X, y: Y, m1, m2, decision: 'инициализация' });

    while (X !== Y) {
        if (X > Y) {
            X = X - Y;
            m2 = m1 + '~' + m2;
            steps.push({ step: stepN++, x: X, y: Y, m1, m2, decision: 'X>Y → X:=X−Y, m2:=m1~m2' });
        } else {
            Y = Y - X;
            m1 = m2 + '~' + m1;
            steps.push({ step: stepN++, x: X, y: Y, m1, m2, decision: 'Y>X → Y:=Y−X, m1:=m2~m1' });
        }
    }
    // теперь X-кратная последовательность m2~m1 задаёт отрезок
    const pattern = m2 + '~' + m1;
    let cx = 0, cy = 0;
    points.push({ x: x1, y: y1 });
    for (let i = 0; i < X; i++) {
        for (const ch of pattern.split('~')) {
            if (ch === 's') { cx++; }
            else if (ch === 'd') { cx++; cy++; }
            const px = steep ? cy : cx;
            const py = steep ? cx : cy;
            points.push({ x: x1 + px * sx, y: y1 + py * sy });
        }
    }
    return { points, steps };
}

// 6. АЛГОРИТМ ВУ (сглаженные линии)
function wuLine(x1, y1, x2, y2) {
    const points = [], steps = [];
    const dx = x2 - x1, dy = y2 - y1;
    const steep = Math.abs(dy) > Math.abs(dx);
    if (steep) { [x1, y1, x2, y2] = [y1, x1, y2, x2]; }
    if (x1 > x2) { [x1, x2] = [x2, x1];[y1, y2] = [y2, y1]; }
    const dxN = x2 - x1, dyN = y2 - y1;
    const grad = dxN === 0 ? 1 : dyN / dxN;

    // конечные точки — с интенсивностью 1
    const plot = (x, y, c) => {
        const rx = steep ? y : x, ry = steep ? x : y;
        points.push({ x: Math.round(rx), y: Math.round(ry), alpha: c });
    };

    let x = x1, y = y1;
    let fpart = y - Math.floor(y);
    plot(x, Math.floor(y), 1 - fpart);
    plot(x, Math.floor(y) + 1, fpart);
    steps.push({ step: 0, x, y: y.toFixed(3), fpart: fpart.toFixed(3) });

    x++;
    let rfpart = y;
    let stepN = 1;
    while (x <= x2) {
        rfpart += grad;
        const ipart = Math.floor(rfpart);
        fpart = rfpart - ipart;
        plot(x, ipart, 1 - fpart);
        plot(x, ipart + 1, fpart);
        steps.push({ step: stepN++, x, y: rfpart.toFixed(3), fpart: fpart.toFixed(3) });
        x++;
    }
    return { points, steps };
}

function renderResult(result, isWu) {
    clearCanvas();
    drawGrid();
    result.points.forEach(p => {
        if (isWu) putPixelAlpha(p.x, p.y, p.alpha ?? 1);
        else putPixel(p.x, p.y, '#1e57b5');
    });
}

function renderSteps(steps) {
    const box = document.getElementById('stepsBox');
    if (!steps || steps.length === 0) { box.innerHTML = '—'; return; }
    // ограничим вывод, чтобы не тормозило
    const limit = 80;
    const keys = Object.keys(steps[0]);
    let html = '<table id="stepsTable"><tr>';
    keys.forEach(k => html += `<th>${k}</th>`);
    html += '</tr>';
    const show = steps.length > limit ? steps.slice(0, limit) : steps;
    show.forEach(s => {
        html += '<tr>';
        keys.forEach(k => html += `<td>${s[k]}</td>`);
        html += '</tr>';
    });
    if (steps.length > limit) {
        html += `<tr><td colspan="${keys.length}">… показано ${limit} из ${steps.length} шагов</td></tr>`;
    }
    html += '</table>';
    box.innerHTML = html;
}

// Переключение полей ввода в зависимости от алгоритма
function updateInputs() {
    const algo = document.getElementById('algo').value;
    const isCircle = (algo === 'bresenhamCircle');
    document.getElementById('lineInputs').style.display = isCircle ? 'none' : 'block';
    document.getElementById('circleInputs').style.display = isCircle ? 'block' : 'none';
}

function build() {
    const algo = document.getElementById('algo').value;
    const x1 = +document.getElementById('x1').value;
    const y1 = +document.getElementById('y1').value;
    const x2 = +document.getElementById('x2').value;
    const y2 = +document.getElementById('y2').value;
    const xc = +document.getElementById('xc').value;
    const yc = +document.getElementById('yc').value;
    const R = +document.getElementById('r').value;

    const ITERATIONS = 10000; // количество повторений для замера
    let result;

    // Первый запуск — для получения результата и таблицы шагов
    const t0 = performance.now();
    switch (algo) {
        case 'step': result = stepAlgorithm(x1, y1, x2, y2); break;
        case 'dda': result = ddaAlgorithm(x1, y1, x2, y2); break;
        case 'bresenhamLine': result = bresenhamLine(x1, y1, x2, y2); break;
        case 'bresenhamCircle': result = bresenhamCircle(xc, yc, R); break;
        case 'castle': result = castlePitway(x1, y1, x2, y2); break;
        case 'wu': result = wuLine(x1, y1, x2, y2); break;
    }
    const t1 = performance.now();

    // Замер времени на 10000 итерациях
    const t2 = performance.now();
    for (let i = 0; i < ITERATIONS; i++) {
        switch (algo) {
            case 'step': stepAlgorithm(x1, y1, x2, y2); break;
            case 'dda': ddaAlgorithm(x1, y1, x2, y2); break;
            case 'bresenhamLine': bresenhamLine(x1, y1, x2, y2); break;
            case 'bresenhamCircle': bresenhamCircle(xc, yc, R); break;
            case 'castle': castlePitway(x1, y1, x2, y2); break;
            case 'wu': wuLine(x1, y1, x2, y2); break;
        }
    }
    const t3 = performance.now();

    const totalTime = (t3 - t2) * 1000; // мкс
    const avgTime = totalTime / ITERATIONS; // среднее время на одну итерацию

    renderResult(result, algo === 'wu');
    renderSteps(result.steps);
    document.getElementById('timeBox').textContent =
        avgTime.toFixed(3) + ' мкс (среднее за ' + ITERATIONS + ' итераций)';
}

document.getElementById('buildBtn').addEventListener('click', build);

document.getElementById('algo').addEventListener('change', updateInputs);
updateInputs();
build();