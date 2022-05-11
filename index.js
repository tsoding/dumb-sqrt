"use strict";
let EPSILON = 1e-6;
let MAX_ITERATIONS = 15;
let MARKER_COLOR = "#FF4040";
let AXIS_COLOR = MARKER_COLOR;
let GRID_COLOR = "#6778FF";
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
function mapCanvasToPlot(canvas, p) {
    // x ∈ [0.0 .. ctx.canvas.width] => x ∈ [0.0 .. 1.0] => x ∈ [MIN_X .. MAX_X] 
    const [x0, y0] = p;
    const x = x0 / canvas.width * (MAX_X - MIN_X) + MIN_X;
    const y = (y0 - canvas.height) * -1.0 / canvas.height * (MAX_Y - MIN_Y) + MIN_Y;
    return [x, y];
}
function mapPlotToCanvas(canvas, p) {
    // x ∈ [MIN_X .. MAX_X] => x ∈ [0.0 .. 1.0] => x ∈ [0.0 .. ctx.canvas.width]
    const [x0, y0] = p;
    const x = (x0 - MIN_X) / (MAX_X - MIN_X) * canvas.width;
    const y = canvas.height - (y0 - MIN_Y) / (MAX_Y - MIN_Y) * canvas.height;
    return [x, y];
}
function strokeLine(ctx, p1, p2) {
    ctx.beginPath();
    ctx.moveTo(...mapPlotToCanvas(ctx.canvas, p1));
    ctx.lineTo(...mapPlotToCanvas(ctx.canvas, p2));
    ctx.stroke();
}
function renderGrid(ctx) {
    ctx.strokeStyle = GRID_COLOR;
    for (let x = MIN_X; x <= MAX_X; x += GRID_STEP) {
        strokeLine(ctx, [x, MIN_Y], [x, MAX_Y]);
    }
    for (let y = MIN_Y; y <= MAX_Y; y += GRID_STEP) {
        strokeLine(ctx, [MIN_X, y], [MAX_X, y]);
    }
}
function renderAxis(ctx) {
    ctx.strokeStyle = AXIS_COLOR;
    strokeLine(ctx, [MIN_X, 0.0], [MAX_X, 0.0]);
    strokeLine(ctx, [0.0, MIN_Y], [0.0, MAX_Y]);
}
function renderMarker(ctx, p) {
    const [x, y] = mapPlotToCanvas(ctx.canvas, p);
    ctx.fillStyle = MARKER_COLOR;
    ctx.fillRect(x - MARKER_SIZE, y - MARKER_SIZE, 2 * MARKER_SIZE, 2 * MARKER_SIZE);
}
function renderPlot(ctx) {
    for (let y = 0.0; y <= MAX_Y; y += STEP_Y) {
        const x = y * y;
        renderMarker(ctx, [x, y]);
    }
}
function renderDiagonal(ctx) {
    ctx.strokeStyle = MARKER_COLOR;
    const a = Math.min(MAX_X, MAX_Y);
    strokeLine(ctx, [0, 0], [a, a]);
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
function prepareSliders() {
    let sliders = document.getElementsByClassName("slider");
    for (let i = 0; i < sliders.length; ++i) {
        sliders[i].addEventListener("change", function (e) {
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
            for (let i = 0; i < sliders.length; ++i) {
                sliders[i].value = slider.value;
            }
        });
    }
}
function prepareThemePickers() {
    let pickers = document.getElementsByClassName("theme-picker");
    for (let i = 0; i < pickers.length; ++i) {
        pickers[i].addEventListener("change", function (e) {
            let picker = e.target;
            if (picker.id === "marker-picker") {
                MARKER_COLOR = picker.value;
            }
            else if (picker.id === "grid-picker") {
                GRID_COLOR = picker.value;
            }
            else {
                throw new Error("Unknown theme picker: " + picker.id);
            }
        });
        // Sets default values
        if (pickers[i].id === "marker-picker") {
            pickers[i].value = MARKER_COLOR;
        }
        else if (pickers[i].id === "grid-picker") {
            pickers[i].value = GRID_COLOR;
        }
        else {
            throw new Error("Unknown theme picker: " + pickers[i].id);
        }
    }
}
function lerp(a, b, t) {
    return a + (b - a) * t;
}
class NewtonMethodWidget {
    constructor(id, xArg) {
        this.trace = [];
        this.traceTime = 0;
        this.elem = document.getElementById(id);
        this.ctx = this.elem.getContext("2d");
        this.xArg = xArg;
        newtonMethodSqrt(this.xArg, (s) => this.trace.push(s));
        this.elem.addEventListener("click", (e) => {
            const p = mapCanvasToPlot(this.elem, mapClientToCanvas(this.elem, [e.clientX, e.clientY]));
            this.xArg = Math.round(p[0]);
            this.trace.length = 0;
            this.traceTime = 0;
            newtonMethodSqrt(this.xArg, (s) => this.trace.push(s));
        });
    }
    update(dt) {
        this.traceTime = (this.traceTime + dt) % (this.trace.length * TRACE_INTERVAL);
    }
    render() {
        const index = Math.floor(this.traceTime / TRACE_INTERVAL);
        const t = this.traceTime % TRACE_INTERVAL / TRACE_INTERVAL;
        this.ctx.clearRect(0, 0, this.ctx.canvas.width, this.ctx.canvas.height);
        renderGrid(this.ctx);
        renderAxis(this.ctx);
        renderPlot(this.ctx);
        renderDiagonal(this.ctx);
        const p = [this.xArg, 0];
        renderMarker(this.ctx, p);
        let y = lerp(this.trace[index], this.trace[(index + 1) % this.trace.length], t * t);
        this.ctx.strokeStyle = MARKER_COLOR;
        this.ctx.lineWidth = 5;
        strokeLine(this.ctx, [MIN_X, y], [MAX_X, y]);
        this.ctx.lineWidth = 1;
        this.ctx.fillStyle = "white";
        this.ctx.font = "48px monospace";
        this.ctx.textBaseline = "bottom";
        this.ctx.fillText(this.xArg.toFixed(0), ...mapPlotToCanvas(this.elem, p));
        this.ctx.textBaseline = "top";
        this.ctx.fillText(y.toFixed(3), ...mapPlotToCanvas(this.elem, [0, y]));
        this.ctx.strokeStyle = MARKER_COLOR;
        strokeLine(this.ctx, [this.xArg, MIN_Y], [this.xArg, MAX_Y]);
    }
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
            const p = mapCanvasToPlot(this.elem, mapClientToCanvas(this.elem, [e.clientX, e.clientY]));
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
        this.ctx.fillStyle = "#50FF5064";
        const [rx0, ry0] = mapPlotToCanvas(this.elem, [0, y1]);
        const [rx1, ry1] = mapPlotToCanvas(this.elem, [MAX_X, y0]);
        this.ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
        const p = [this.xArg, 0];
        renderMarker(this.ctx, p);
        this.ctx.fillStyle = "white";
        this.ctx.font = "48px monospace";
        this.ctx.textBaseline = "bottom";
        this.ctx.fillText(this.xArg.toFixed(0), ...mapPlotToCanvas(this.elem, p));
        this.ctx.textBaseline = "top";
        this.ctx.fillText(y0.toFixed(3), ...mapPlotToCanvas(this.elem, [0, y0]));
        this.ctx.textBaseline = "bottom";
        this.ctx.fillText(y1.toFixed(3), ...mapPlotToCanvas(this.elem, [0, y1]));
        this.ctx.strokeStyle = MARKER_COLOR;
        strokeLine(this.ctx, [this.xArg, MIN_Y], [this.xArg, MAX_Y]);
    }
}
let widgets = [
    new BinarySearchWidget("app-binary-search", 9),
    new NewtonMethodWidget("app-newton-method", 9)
];
let prevTime = null;
function loop(time) {
    if (prevTime !== null) {
        const deltaTime = (time - prevTime) * 0.001;
        for (let widget of widgets) {
            widget.update(deltaTime);
            widget.render();
        }
    }
    prevTime = time;
    window.requestAnimationFrame(loop);
}
window.requestAnimationFrame(loop);
prepareSliders();
prepareThemePickers();
