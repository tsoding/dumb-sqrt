let EPSILON = 1e-6;
let MAX_ITERATIONS = 1000;
let MARKER_COLOR = "#FF4040"
let AXIS_COLOR = MARKER_COLOR;
let GRID_COLOR = "#4040FF90"
let GRID_STEP = 1;
let MARKER_SIZE = 5
let MIN_X = -1.0;
let MAX_X =  20.0;
let MIN_Y = -1.0;
let MAX_Y =  10.0;
let STEP_Y_COUNT = 200
let STEP_Y = (MAX_Y - MIN_Y)/STEP_Y_COUNT;

function mapToScreen(ctx, x0, y0) {
    // x ∈ [MIN_X .. MAX_X] => x ∈ [0.0 .. 1.0] => x ∈ [0.0 .. ctx.canvas.width]
    const x = (x0 - MIN_X) / (MAX_X - MIN_X) * ctx.canvas.width;
    const y = ctx.canvas.height - (y0 - MIN_Y) / (MAX_Y - MIN_Y) * ctx.canvas.height;
    return [x, y];
}

function renderGrid(ctx) {
    ctx.strokeStyle = GRID_COLOR;

    for (let x = MIN_X; x <= MAX_X; x += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(...mapToScreen(ctx, x, MIN_Y));
        ctx.lineTo(...mapToScreen(ctx, x, MAX_Y));
        ctx.stroke();
    }

    for (let y = MIN_Y; y <= MAX_Y; y += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(...mapToScreen(ctx, MIN_X, y));
        ctx.lineTo(...mapToScreen(ctx, MAX_X, y));
        ctx.stroke();
    }
}

function renderAxis(ctx) {
    ctx.strokeStyle = AXIS_COLOR;

    ctx.beginPath();
    ctx.moveTo(...mapToScreen(ctx, MIN_X, 0.0));
    ctx.lineTo(...mapToScreen(ctx, MAX_X, 0.0));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(...mapToScreen(ctx, 0.0, MIN_Y));
    ctx.lineTo(...mapToScreen(ctx, 0.0, MAX_Y));
    ctx.stroke();
}

function renderPlot(ctx) {
    for (let y = 0.0; y <= MAX_Y; y += STEP_Y) {
        const x = y*y;
        renderMarker(ctx, x, y);
    }
}

function renderDiagonal(ctx) {
    ctx.strokeStyle = MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(...mapToScreen(ctx, 0, 0));
    {
        const a = Math.min(MAX_X, MAX_Y);
        ctx.lineTo(...mapToScreen(ctx, a, a));
    }
    ctx.stroke();
}

function renderMarker(ctx, x0, y0) {
    const [x, y] = mapToScreen(ctx, x0, y0);
    ctx.fillStyle = MARKER_COLOR;
    ctx.fillRect(x - MARKER_SIZE, y - MARKER_SIZE, 2*MARKER_SIZE, 2*MARKER_SIZE);
}

function renderBinarySearch(ctx, state) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    renderGrid(ctx);
    renderAxis(ctx);
    renderPlot(ctx);
    renderDiagonal(ctx);

    ctx.fillStyle = "#50FF5030";
    let [y0, y1] = state.trace[state.traceIndex];
    {
        let [rx0, ry0] = mapToScreen(ctx, 0, y1);
        let [rx1, ry1] = mapToScreen(ctx, MAX_X, y0);
        ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }
    renderMarker(ctx, 0, y0);
    renderMarker(ctx, 0, y1);
    renderMarker(ctx, state.xArg, 0);
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
    ctx.moveTo(...mapToScreen(ctx, MIN_X, y));
    ctx.lineTo(...mapToScreen(ctx, MAX_X, y));
    ctx.stroke();
}

function newtonMethodSqrt(a, trace)
{
    let x = a;
    for (let i = 0; i < MAX_ITERATIONS && Math.abs(x*x - a) > EPSILON; ++i) {
        if (trace) trace(x);
        x = x - (x*x - a)/(2*x);
    }
    if (trace) trace(x);
    return x;
}

function binarySearchSqrt(x, trace)
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

let binaryCtx = document.getElementById("app-binary-search").getContext("2d");
let binaryState = {
    trace: [],
    traceIndex: 0,
    xArg: 9,
};
binarySearchSqrt(binaryState.xArg, (s) => binaryState.trace.push(s));
renderBinarySearch(binaryCtx, binaryState);

let newtonCtx = document.getElementById("app-newton-method").getContext("2d");
let newtonState = {
    trace: [],
    traceIndex: 0,
    xArg: 9,
};
newtonMethodSqrt(newtonState.xArg, (s) => newtonState.trace.push(s))
renderNewtonMethod(newtonCtx, newtonState);

console.log(newtonMethodSqrt(newtonState.xArg));
console.log(newtonState.trace);
console.log(binaryState.trace);

document.addEventListener("keydown", (e) => {
    const ctx = binaryCtx;
    const render = renderBinarySearch;
    const state = binaryState;
    const sqrt = binarySearchSqrt;

    // const ctx = newtonCtx;
    // const render = renderNewtonMethod;
    // const state = newtonState;
    // const sqrt = newtonMethodSqrt;

    switch (e.key) {
    case "ArrowUp": {
        if (state.traceIndex > 0) {
            state.traceIndex -= 1;
            render(ctx, state);
        }
    } break;
    case "ArrowDown": {
        if (state.traceIndex < state.trace.length - 1) {
            state.traceIndex += 1;
            render(ctx, state);
        }
    } break;
    case "ArrowRight": {
        if (state.xArg < MAX_Y * MAX_Y) {
            state.xArg += 1;
            state.trace.length = 0;
            sqrt(state.xArg, (s) => state.trace.push(s));
            state.traceIndex = 0;
            render(ctx, state);
        }
    } break;
    case "ArrowLeft": {
        if (state.xArg > 0) {
            state.xArg -= 1;
            state.trace.length = 0;
            sqrt(state.xArg, (s) => state.trace.push(s));
            state.traceIndex = 0;
            render(ctx, state);
        }
    } break;
    }
})
