export function initSignaturePad(canvas) {
  const ctx = canvas.getContext("2d");
  let drawing = false;
  let hasStroke = false;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#0f172a";
  }

  function getPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const source = event.touches?.[0] ?? event;
    return {
      x: source.clientX - rect.left,
      y: source.clientY - rect.top,
    };
  }

  function start(event) {
    event.preventDefault();
    drawing = true;
    const point = getPoint(event);
    ctx.beginPath();
    ctx.moveTo(point.x, point.y);
  }

  function draw(event) {
    if (!drawing) return;
    event.preventDefault();
    hasStroke = true;
    const point = getPoint(event);
    ctx.lineTo(point.x, point.y);
    ctx.stroke();
  }

  function stop() {
    drawing = false;
  }

  resize();
  window.addEventListener("resize", resize);

  canvas.addEventListener("mousedown", start);
  canvas.addEventListener("mousemove", draw);
  canvas.addEventListener("mouseup", stop);
  canvas.addEventListener("mouseleave", stop);
  canvas.addEventListener("touchstart", start, { passive: false });
  canvas.addEventListener("touchmove", draw, { passive: false });
  canvas.addEventListener("touchend", stop);

  return {
    clear() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      hasStroke = false;
      resize();
    },
    isEmpty() {
      return !hasStroke;
    },
    toDataURL() {
      return hasStroke ? canvas.toDataURL("image/png") : "";
    },
  };
}
