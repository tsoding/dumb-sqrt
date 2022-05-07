let app = document.getElementById("app");
let ctx = app.getContext("2d");

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

function mapToScreen(x0, y0) {
    // x ∈ [MIN_X .. MAX_X] => x ∈ [0.0 .. 1.0] => x ∈ [0.0 .. app.width]
    const x = (x0 - MIN_X) / (MAX_X - MIN_X) * app.width;
    const y = app.height - (y0 - MIN_Y) / (MAX_Y - MIN_Y) * app.height;
    return [x, y];
}

function renderGrid() {
    ctx.strokeStyle = GRID_COLOR;

    for (let x = MIN_X; x <= MAX_X; x += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(...mapToScreen(x, MIN_Y));
        ctx.lineTo(...mapToScreen(x, MAX_Y));
        ctx.stroke();
    }

    for (let y = MIN_Y; y <= MAX_Y; y += GRID_STEP) {
        ctx.beginPath();
        ctx.moveTo(...mapToScreen(MIN_X, y));
        ctx.lineTo(...mapToScreen(MAX_X, y));
        ctx.stroke();
    }
}

function renderAxis() {
    ctx.strokeStyle = AXIS_COLOR;

    ctx.beginPath();
    ctx.moveTo(...mapToScreen(MIN_X, 0.0));
    ctx.lineTo(...mapToScreen(MAX_X, 0.0));
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(...mapToScreen(0.0, MIN_Y));
    ctx.lineTo(...mapToScreen(0.0, MAX_Y));
    ctx.stroke();
}

function renderMarker(x0, y0) {
    const [x, y] = mapToScreen(x0, y0);
    ctx.fillStyle = MARKER_COLOR;
    ctx.fillRect(x - MARKER_SIZE, y - MARKER_SIZE, 2*MARKER_SIZE, 2*MARKER_SIZE);
}

const trace = [];
let trace_index = 0;

function render() {
    ctx.clearRect(0, 0, app.width, app.height);

    renderGrid();
    renderAxis();
    for (let y = 0.0; y <= MAX_Y; y += STEP_Y) {
        const x = y*y;
        renderMarker(x, y);
    }

    ctx.strokeStyle = MARKER_COLOR;
    ctx.beginPath();
    ctx.moveTo(...mapToScreen(0, 0));
    {
        const a = Math.min(MAX_X, MAX_Y);
        ctx.lineTo(...mapToScreen(a, a));
    }
    ctx.stroke();

    ctx.fillStyle = "#50FF5030";
    let [y0, y1] = trace[trace_index];
    {
        let [rx0, ry0] = mapToScreen(0, y1);
        let [rx1, ry1] = mapToScreen(MAX_X, y0);
        ctx.fillRect(rx0, ry0, rx1 - rx0, ry1 - ry0);
    }
    renderMarker(0, y0);
    renderMarker(0, y1);
    renderMarker(xArg, 0);
}

function myDumbSqrt(x, trace)
{
    let y0 = 0;
    let y1 = Math.max(1.0, x);
    const EPSILON = 1e-6;

    for (let i = 0; i < 1000 && (y1 - y0) > EPSILON; ++i) {
        if (trace) trace(y0, y1);
        const ym = (y1 - y0)/2 + y0;
        if (ym*ym > x) y1 = ym;
        else if (ym*ym < x) y0 = ym;
        else {
            y0 = ym;
            y1 = ym;
        }
    }
    if (trace) trace(y0, y1);
    return y0;
}
let xArg = 9;
myDumbSqrt(xArg, (y0, y1) => trace.push([y0, y1]));

console.log(trace);

render();

document.addEventListener("keydown", (e) => {
    switch (e.key) {
    case "ArrowLeft": {
        if (trace_index > 0) trace_index -= 1;
        render();
    } break;
    case "ArrowRight": {
        if (trace_index < trace.length - 1) trace_index += 1;
        render();
    } break;
    case "ArrowUp": {
        if (xArg < MAX_Y * MAX_Y) {
            xArg += 1;
            trace.length = 0;
            myDumbSqrt(xArg, (y0, y1) => trace.push([y0, y1]));
            trace_index = 0;
            render();
        }
    } break;
    case "ArrowDown": {
        if (xArg > 0) {
            xArg -= 1;
            trace.length = 0;
            myDumbSqrt(xArg, (y0, y1) => trace.push([y0, y1]));
            trace_index = 0;
            render();
        }
    } break;
    }
})
