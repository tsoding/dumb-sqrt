"use strict";
var _a;
let EPSILON = 1e-6;
let MAX_ITERATIONS = 10;
let MARKER_COLOR = "#FF4040";
let AXIS_COLOR = MARKER_COLOR;
let GRID_COLOR = "#4040FF90";
let GRID_STEP = 1;
let MARKER_SIZE = 5;
let MIN_X = -1.0;
let ORIG_MAX_X = 20.0;
let MAX_X = ORIG_MAX_X;
let MIN_Y = -1.0;
let ORIG_MAX_Y = 10.0;
let MAX_Y = ORIG_MAX_Y;
let STEP_Y_COUNT = 200;
let STEP_Y = (MAX_Y - MIN_Y) / STEP_Y_COUNT;
let TRACE_INTERVAL = 0.5;
// Canvas has two sizes:
// 1. *Canvas Size*. `[canvas.width, canvas.height]` which is set via the correspoding properties: `<canvas width='800' height='600'>`. This is the logical resolution of the canvas that is used by all of the drawing method of the canvas.
// 2. *Client Size*. The actual size of the DOM element. You can get this size by doing canvas.getBoundingClientRect().
// 
// All of the mouse events are in Client coordinates. This function maps the Client coordinates to Canvas coordinates.
function mapClientToCanvas(canvas, p) {
    const [x0, y0] = p;
    const rect = canvas.getBoundingClientRect();
    const x = (x0 - rect.left) / (rect.right - rect.left) * canvas.width;
    const y = (y0 - rect.top) / (rect.bottom - rect.top) * canvas.height;
    return [x, y];
}
function mapCanvasToPlot(ctx, p) {
    // x ∈ [0.0 .. ctx.canvas.width] => x ∈ [0.0 .. 1.0] => x ∈ [MIN_X .. MAX_X] 
    const [x0, y0] = p;
    const x = x0 / ctx.canvas.width * (MAX_X - MIN_X) + MIN_X;
    const y = (y0 - ctx.canvas.height) * -1.0 / ctx.canvas.height * (MAX_Y - MIN_Y) + MIN_Y;
    return [x, y];
}
function mapPlotToCanvas(ctx, p) {
    // x ∈ [MIN_X .. MAX_X] => x ∈ [0.0 .. 1.0] => x ∈ [0.0 .. ctx.canvas.width]
    const [x0, y0] = p;
    const x = (x0 - MIN_X) / (MAX_X - MIN_X) * ctx.canvas.width;
    const y = ctx.canvas.height - (y0 - MIN_Y) / (MAX_Y - MIN_Y) * ctx.canvas.height;
    return [x, y];
}
function renderGrid(ctx) {
    ctx.strokeStyle = GRID_COLOR;
    for (let x = MIN_X; x <= MAX_X; x += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(...mapPlotToCanvas(ctx, [x, MIN_Y]));
        ctx.lineTo(...mapPlotToCanvas(ctx, [x, MAX_Y]));
        ctx.stroke();
    }
    for (let y = MIN_Y; y <= MAX_Y; y += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(...mapPlotToCanvas(ctx, [MIN_X, y]));
        ctx.lineTo(...mapPlotToCanvas(ctx, [MAX_X, y]));
        ctx.stroke();
    }
}
function renderAxis(ctx) {
    ctx.strokeStyle = AXIS_COLOR;
    ctx.beginPath();
    ctx.moveTo(...mapPlotToCanvas(ctx, [MIN_X, 0.0]));
    ctx.lineTo(...mapPlotToCanvas(ctx, [MAX_X, 0.0]));
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(...mapPlotToCanvas(ctx, [0.0, MIN_Y]));
    ctx.lineTo(...mapPlotToCanvas(ctx, [0.0, MAX_Y]));
    ctx.stroke();
}
function renderMarker(ctx, p) {
    const [x, y] = mapPlotToCanvas(ctx, p);
    ctx.fillStyle = MARKER_COLOR;
    ctx.fillRect(x - MARKER_SIZE, y - MARKER_SIZE, 2 * MARKER_SIZE, 2 * MARKER_SIZE);
}
function renderPlot(ctx) {
    for (let y = 0.0; y <= MAX_Y; y += STEP_Y) {
        const x = y * y;
        renderMarker(ctx, [x, y]);
    }
}
function strokeLine(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(...p1);
    ctx.lineTo(...p2);
    ctx.stroke();
}
function renderDiagonal(ctx) {
    ctx.strokeStyle = MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(...mapPlotToCanvas(ctx, [0, 0]));
    {
        const a = Math.min(MAX_X, MAX_Y);
        ctx.lineTo(...mapPlotToCanvas(ctx, [a, a]));
    }
    ctx.stroke();
}
function renderNewtonMethod(ctx, state) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    renderGrid(ctx);
    renderAxis(ctx);
    renderPlot(ctx);
    renderDiagonal(ctx);
    let y = state.trace[state.traceIndex];
    ctx.strokeStyle = MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(...mapPlotToCanvas(ctx, [MIN_X, y]));
    ctx.lineTo(...mapPlotToCanvas(ctx, [MAX_X, y]));
    ctx.stroke();
}
function newtonMethodSqrt(a, trace) {
    let x = a;
    for (let i = 0; i < MAX_ITERATIONS && Math.abs(x * x - a) > EPSILON; ++i) {
        if (trace)
            trace(x);
        x = x - (x * x - a) / (2 * x);
    }
    if (trace)
        trace(x);
    return x;
}
function binarySearchSqrt(x, trace) {
    let y0 = 0;
    let y1 = Math.max(1.0, x);
    for (let i = 0; i < MAX_ITERATIONS && Math.abs(y1 - y0) > EPSILON; ++i) {
        if (trace)
            trace([y0, y1]);
        const ym = (y1 - y0) / 2 + y0;
        if (ym * ym > x)
            y1 = ym;
        else if (ym * ym < x)
            y0 = ym;
        else {
            y0 = ym;
            y1 = ym;
        }
    }
    if (trace)
        trace([y0, y1]);
    return y0;
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
class BinarySearchWidget {
    constructor(id, xArg) {
        this.trace = [];
        this.traceTime = 0;
        const sqrt = binarySearchSqrt;
        this.xArg = xArg;
        ;
        this.elem = document.getElementById(id);
        this.ctx = this.elem.getContext("2d");
        sqrt(this.xArg, (s) => this.trace.push(s));
        this.elem.addEventListener("click", (e) => {
            const p = mapCanvasToPlot(this.ctx, mapClientToCanvas(this.elem, [e.clientX, e.clientY]));
            this.xArg = Math.round(p[0]);
            this.trace.length = 0;
            this.traceTime = 0;
            sqrt(this.xArg, (s) => this.trace.push(s));
        });
    }
    update(dt) {
        this.traceTime = (this.traceTime + dt) % (this.trace.length * TRACE_INTERVAL);
    }
    render() {
        const index = Math.floor(this.traceTime / TRACE_INTERVAL);
        const t = this.traceTime % TRACE_INTERVAL / TRACE_INTERVAL;
        const y0 = lerp(this.trace[index][0], this.trace[(index + 1) % this.trace.length][0], t * t);
        const y1 = lerp(this.trace[index][1], this.trace[(index + 1) % this.trace.length][1], t * t);
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        renderGrid(this.ctx);
        renderAxis(this.ctx);
        renderPlot(this.ctx);
        renderDiagonal(this.ctx);
        const alpha = 100;
        this.ctx.fillStyle = "#50FF50" + alpha.toString(16).padStart(2, "0");
        const [rx0, ry0] = mapPlotToCanvas(this.ctx, [0, y1]);
        const [rx1, ry1] = mapPlotToCanvas(this.ctx, [MAX_X, y0]);
        this.ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
        const p = [this.xArg, 0];
        renderMarker(this.ctx, p);
        this.ctx.fillStyle = "white";
        this.ctx.font = "48px monospace";
        this.ctx.textBaseline = "bottom";
        this.ctx.fillText(this.xArg.toFixed(0), ...mapPlotToCanvas(this.ctx, p));
        this.ctx.textBaseline = "top";
        this.ctx.fillText(y0.toFixed(3), ...mapPlotToCanvas(this.ctx, [0, y0]));
        this.ctx.textBaseline = "bottom";
        this.ctx.fillText(y1.toFixed(3), ...mapPlotToCanvas(this.ctx, [0, y1]));
        this.ctx.strokeStyle = MARKER_COLOR;
        strokeLine(this.ctx, mapPlotToCanvas(this.ctx, [this.xArg, MIN_Y]), mapPlotToCanvas(this.ctx, [this.xArg, MAX_Y]));
    }
}
function initNewtonMethodWidget(id) {
    const newtonElem = document.getElementById(id);
    const newtonCtx = newtonElem.getContext("2d");
    const newtonState = {
        trace: [],
        traceIndex: 0,
        xArg: 9,
    };
    newtonMethodSqrt(newtonState.xArg, (s) => newtonState.trace.push(s));
    renderNewtonMethod(newtonCtx, newtonState);
}
(_a = document.getElementById("slider")) === null || _a === void 0 ? void 0 : _a.addEventListener("input", function (e) {
    let slider = e.target;
    let value = parseFloat(slider.value);
    MAX_X = value * ORIG_MAX_X;
    MAX_Y = value * ORIG_MAX_Y;
    if (value > 8) {
        GRID_STEP = 8;
    }
    else if (value < 5) {
        GRID_STEP = 1;
    }
});
let binarySearchWidget = new BinarySearchWidget("app-binary-search", 9);
initNewtonMethodWidget("app-newton-method");
let prev = null;
function loop(time) {
    if (prev !== null) {
        const deltaTime = (time - prev) * 0.001;
        binarySearchWidget.update(deltaTime);
        binarySearchWidget.render();
    }
    prev = time;
    window.requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop);
