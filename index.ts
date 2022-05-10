type Color = string

let EPSILON: number = 1e-6;
let MAX_ITERATIONS: number = 32;
let MARKER_COLOR: Color = "#FF4040";
let AXIS_COLOR: Color = MARKER_COLOR;
let GRID_COLOR: Color = "#4040FF90"
let GRID_STEP: number = 1;
let MARKER_SIZE: number = 5
let MIN_X: number = -1.0;
let MAX_X: number =  20.0;
let MIN_Y: number = -1.0;
let MAX_Y: number =  10.0;
let STEP_Y_COUNT: number = 200
let STEP_Y: number = (MAX_Y - MIN_Y)/STEP_Y_COUNT;

type Point = [number, number];

// Canvas has two sizes:
// 1. *Canvas Size*. `[canvas.width, canvas.height]` which is set via the correspoding properties: `<canvas width='800' height='600'>`. This is the logical resolution of the canvas that is used by all of the drawing method of the canvas.
// 2. *Client Size*. The actual size of the DOM element. You can get this size by doing canvas.getBoundingClientRect().
// 
// All of the mouse events are in Client coordinates. This function maps the Client coordinates to Canvas coordinates.
function mapClientToCanvas(canvas: HTMLCanvasElement, x0: number, y0: number): Point {
    const rect = canvas.getBoundingClientRect();
    const x = (x0 - rect.left) / (rect.right - rect.left) * canvas.width;
    const y = (y0 - rect.top) / (rect.bottom - rect.top) * canvas.height;
    return [x, y];
}

function mapCanvasToWorld(ctx: CanvasRenderingContext2D, x0: number, y0: number): Point {
    // x ∈ [0.0 .. ctx.canvas.width] => x ∈ [0.0 .. 1.0] => x ∈ [MIN_X .. MAX_X] 
    const x = x0 / ctx.canvas.width * (MAX_X - MIN_X) + MIN_X;
    const y = (y0 - ctx.canvas.height) * -1.0 / ctx.canvas.height * (MAX_Y - MIN_Y) + MIN_Y;
    return [x, y];
}

function mapWorldToCanvas(ctx: CanvasRenderingContext2D, x0: number, y0: number): [number, number] {
    // x ∈ [MIN_X .. MAX_X] => x ∈ [0.0 .. 1.0] => x ∈ [0.0 .. ctx.canvas.width]
    const x = (x0 - MIN_X) / (MAX_X - MIN_X) * ctx.canvas.width;
    const y = ctx.canvas.height - (y0 - MIN_Y) / (MAX_Y - MIN_Y) * ctx.canvas.height;
    return [x, y];
}

function renderGrid(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = GRID_COLOR;

    for (let x = MIN_X; x <= MAX_X; x += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(...mapWorldToCanvas(ctx, x, MIN_Y));
        ctx.lineTo(...mapWorldToCanvas(ctx, x, MAX_Y));
        ctx.stroke();
    }

    for (let y = MIN_Y; y <= MAX_Y; y += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(...mapWorldToCanvas(ctx, MIN_X, y));
        ctx.lineTo(...mapWorldToCanvas(ctx, MAX_X, y));
        ctx.stroke();
    }
}

function renderAxis(ctx: CanvasRenderingContext2D) {
    ctx.strokeStyle = AXIS_COLOR;

    ctx.beginPath();
    ctx.moveTo(...mapWorldToCanvas(ctx, MIN_X, 0.0));
    ctx.lineTo(...mapWorldToCanvas(ctx, MAX_X, 0.0));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(...mapWorldToCanvas(ctx, 0.0, MIN_Y));
    ctx.lineTo(...mapWorldToCanvas(ctx, 0.0, MAX_Y));
    ctx.stroke();
}

function renderPlot(ctx: CanvasRenderingContext2D) {
    for (let y = 0.0; y <= MAX_Y; y += STEP_Y) {
        const x = y*y;
        renderMarker(ctx, x, y);
    }
}

function strokeLine(ctx: CanvasRenderingContext2D, p1: Point, p2: Point)
{
    ctx.beginPath();
    ctx.moveTo(...p1);
    ctx.lineTo(...p2);
    ctx.stroke();
}

function renderDiagonal(ctx: CanvasRenderingContext2D)
{
    ctx.strokeStyle = MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(...mapWorldToCanvas(ctx, 0, 0));
    {
        const a = Math.min(MAX_X, MAX_Y);
        ctx.lineTo(...mapWorldToCanvas(ctx, a, a));
    }
    ctx.stroke();
}

// TODO: try to refactor renderMarker to accept a single point
function renderMarker(ctx: CanvasRenderingContext2D, x0: number, y0: number) {
    const [x, y] = mapWorldToCanvas(ctx, x0, y0);
    ctx.fillStyle = MARKER_COLOR;
    ctx.fillRect(x - MARKER_SIZE, y - MARKER_SIZE, 2*MARKER_SIZE, 2*MARKER_SIZE);
}

interface BinarySearchState {
    trace: Array<Point>,
    xArg: number,
}

function renderBinarySearch(ctx: CanvasRenderingContext2D, state: BinarySearchState) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    renderGrid(ctx);
    renderAxis(ctx);
    renderPlot(ctx);
    renderDiagonal(ctx);

    for (let i = 0; i < state.trace.length; ++i) {
        const alpha = Math.floor(1/state.trace.length*(i + 1)*255);
        ctx.fillStyle = "#50FF50"+alpha.toString(16).padStart(2, "0");
        const [y0, y1] = state.trace[i];
        const [rx0, ry0] = mapWorldToCanvas(ctx, 0, y1);
        const [rx1, ry1] = mapWorldToCanvas(ctx, MAX_X, y0);
        ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }

    renderMarker(ctx, state.xArg, 0);
    ctx.strokeStyle = MARKER_COLOR;
    strokeLine(ctx, mapWorldToCanvas(ctx, state.xArg, MIN_Y), mapWorldToCanvas(ctx, state.xArg, MAX_Y));
}

interface NewtonMethodState {
    trace: Array<number>,
    traceIndex: number,
    xArg: number,
}

function renderNewtonMethod(ctx: CanvasRenderingContext2D, state: NewtonMethodState) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    renderGrid(ctx);
    renderAxis(ctx);
    renderPlot(ctx);
    renderDiagonal(ctx);

    let y = state.trace[state.traceIndex];
    ctx.strokeStyle = MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(...mapWorldToCanvas(ctx, MIN_X, y));
    ctx.lineTo(...mapWorldToCanvas(ctx, MAX_X, y));
    ctx.stroke();
}

function newtonMethodSqrt(a: number, trace?: (x: number) => void)
{
    let x = a;
    for (let i = 0; i < MAX_ITERATIONS && Math.abs(x*x - a) > EPSILON; ++i) {
        if (trace) trace(x);
        x = x - (x*x - a)/(2*x);
    }
    if (trace) trace(x);
    return x;
}

function binarySearchSqrt(x: number, trace?: (p: Point) => void)
{
    let y0 = 0;
    let y1 = Math.max(1.0, x);

    for (let i = 0; i < MAX_ITERATIONS && Math.abs(y1 - y0) > EPSILON; ++i) {
        if (trace) trace([y0, y1]);
        const ym = (y1 - y0)/2 + y0;
        if (ym*ym > x) y1 = ym;
        else if (ym*ym < x) y0 = ym;
        else {
            y0 = ym;
            y1 = ym;
        }
    }
    if (trace) trace([y0, y1]);
    return y0;
}

function initBinarySearchWidget(id: string) {
    const sqrt = binarySearchSqrt;
    const render = renderBinarySearch;
    const elem = <HTMLCanvasElement>document.getElementById(id);
    const ctx = <CanvasRenderingContext2D>elem.getContext("2d");
    const state: BinarySearchState = {
        trace: [],
        xArg: 9,
    };
    elem.addEventListener("click", (e) => {
        const p = mapCanvasToWorld(ctx, 
            ...mapClientToCanvas(elem, e.clientX, e.clientY)
        );
        state.xArg = p[0];
        state.trace.length = 0;
        sqrt(state.xArg, (s) => state.trace.push(s));
        render(ctx, state);
    });
    sqrt(state.xArg, (s) => state.trace.push(s));
    render(ctx, state);
}

function initNewtonMethodWidget(id: string) {
    const newtonElem = <HTMLCanvasElement>document.getElementById(id);
    const newtonCtx = <CanvasRenderingContext2D>newtonElem.getContext("2d");
    const newtonState: NewtonMethodState = {
        trace: [],
        traceIndex: 0,
        xArg: 9,
    };
    newtonMethodSqrt(newtonState.xArg, (s) => newtonState.trace.push(s))
    renderNewtonMethod(newtonCtx, newtonState);
}

initBinarySearchWidget("app-binary-search");
initNewtonMethodWidget("app-newton-method");
