/** Saisie OTP — focus auto, collage, validation (4 chiffres par défaut). */

const DEFAULT_CODE_LENGTH = 4;

/** Champ unique — fiable sur mobile (iOS autofill one-time-code). */
export function initCodeInput(input, { onComplete, onChange, length = DEFAULT_CODE_LENGTH } = {}) {
  if (!input) return null;

  let locked = false;

  function value() {
    return input.value.replace(/\D/g, "").slice(0, length);
  }

  function setError(hasError) {
    input.classList.toggle("is-error", hasError);
  }

  function clear() {
    locked = false;
    input.value = "";
    input.classList.remove("is-error");
    input.focus();
  }

  function applyDigits(raw) {
    const clean = String(raw).replace(/\D/g, "").slice(0, length);
    input.value = clean;
    input.classList.remove("is-error");
    onChange?.(clean);
    if (clean.length === length && !locked) {
      locked = true;
      onComplete?.(clean);
    }
  }

  input.addEventListener("input", () => applyDigits(input.value));
  input.addEventListener("paste", (event) => {
    event.preventDefault();
    applyDigits(event.clipboardData?.getData("text") ?? "");
  });
  input.addEventListener("focus", () => input.select());

  input.focus();

  return { value, clear, setError, unlock: () => { locked = false; } };
}

export function initOtpInput(root, { onComplete, onChange, length = DEFAULT_CODE_LENGTH } = {}) {
  const cells = [...root.querySelectorAll(".auth-otp__cell")];
  if (cells.length !== length) return null;

  let locked = false;

  function value() {
    return cells.map((cell) => cell.value.replace(/\D/g, "")).join("");
  }

  function setError(hasError) {
    cells.forEach((cell) => cell.classList.toggle("is-error", hasError));
  }

  function clear() {
    locked = false;
    cells.forEach((cell) => {
      cell.value = "";
      cell.classList.remove("is-filled", "is-error");
    });
    cells[0]?.focus();
  }

  function fillDigits(digits) {
    const clean = String(digits).replace(/\D/g, "").slice(0, length);
    cells.forEach((cell, index) => {
      cell.value = clean[index] ?? "";
      cell.classList.toggle("is-filled", Boolean(cell.value));
    });
    const nextIndex = Math.min(clean.length, length - 1);
    cells[nextIndex]?.focus();
    onChange?.(value());
    if (clean.length === length && !locked) {
      locked = true;
      onComplete?.(clean);
    }
  }

  cells.forEach((cell, index) => {
    cell.addEventListener("input", () => {
      const raw = cell.value.replace(/\D/g, "");
      if (raw.length > 1) {
        fillDigits(raw);
        return;
      }
      const digit = raw.slice(-1);
      cell.value = digit;
      cell.classList.toggle("is-filled", Boolean(digit));
      cell.classList.remove("is-error");
      if (digit && index < cells.length - 1) {
        cells[index + 1].focus();
      }
      const code = value();
      onChange?.(code);
      if (code.length === length && !locked) {
        locked = true;
        onComplete?.(code);
      }
    });

    cell.addEventListener("keydown", (event) => {
      if (event.key === "Backspace" && !cell.value && index > 0) {
        cells[index - 1].focus();
        cells[index - 1].value = "";
        cells[index - 1].classList.remove("is-filled");
        locked = false;
      }
      if (event.key === "ArrowLeft" && index > 0) {
        event.preventDefault();
        cells[index - 1].focus();
      }
      if (event.key === "ArrowRight" && index < cells.length - 1) {
        event.preventDefault();
        cells[index + 1].focus();
      }
    });

    cell.addEventListener("paste", (event) => {
      event.preventDefault();
      fillDigits(event.clipboardData?.getData("text") ?? "");
    });

    cell.addEventListener("focus", () => cell.select());
  });

  cells[0]?.focus();

  return { value, clear, setError, fillDigits, unlock: () => { locked = false; } };
}

export function startResendCooldown(button, seconds, onTick) {
  let remaining = seconds;
  button.disabled = true;
  const label = button.dataset.label || button.textContent.trim();

  const tick = () => {
    if (remaining <= 0) {
      button.disabled = false;
      button.textContent = label;
      onTick?.(0);
      return;
    }
    button.textContent = `${label} (${remaining}s)`;
    onTick?.(remaining);
    remaining -= 1;
    window.setTimeout(tick, 1000);
  };

  tick();
}
