(() => {
  "use strict";

  const root = document.querySelector("[data-vist-root]");
  const data = window.VIST_DATA;
  if (!root || !data) return;

  const one = (selector) => root.querySelector(selector);
  const video = one("[data-vist-video]");
  const picker = one("[data-vist-picker]");
  const pickerTrigger = one("[data-vist-cell-trigger]");
  const pickerDropdown = one("[data-vist-cell-dropdown]");
  const pickerList = one("[data-vist-cell-list]");
  const pickerOptions = [...root.querySelectorAll("[data-vist-cell-option]")];
  const timeline = one("[data-vist-timeline]");
  const play = one("[data-vist-play]");
  const target = one("[data-vist-target]");
  const prediction = one("[data-vist-prediction]");
  const reveal = one("[data-vist-reveal]");
  const head = one("[data-vist-playhead]");
  const dot = one("[data-vist-dot]");
  const rfOverlay = one("[data-vist-rf]");
  const rfToggle = one("[data-vist-rf-toggle]");
  const rfData = window.VIST_RF;
  const assetBase = new URL(root.dataset.assetBase || "./vist/", document.baseURI);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const scores = {
    movie2: { vist: 0.334, i3d: 0.108, dino: 0.101, train: 1, test: 2 },
    movie1: { vist: 0.281, i3d: 0.074, dino: 0.100, train: 2, test: 1 },
  };
  const state = { movie: "movie2", cell: "77", frame: 0, yMin: 0, yMax: 1, scrubbing: false, resumeAfterScrub: false };
  const currentMovie = () => data.movies[state.movie];
  const currentCell = () => currentMovie().cells[state.cell];
  const xAt = (index) => 35 + (index / (currentMovie().frameCount - 1)) * 685;
  const yAt = (value) => 205 - ((value - state.yMin) / (state.yMax - state.yMin)) * 190;
  const fmtFrame = (n) => String(n).padStart(3, "0");
  const fmtTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainder = seconds - minutes * 60;
    return `${String(minutes).padStart(2, "0")}:${remainder.toFixed(1).padStart(4, "0")}`;
  };

  function chartPath(values) {
    return values.map((value, index) => `${index ? "L" : "M"}${xAt(index).toFixed(2)},${yAt(value).toFixed(2)}`).join(" ");
  }

  function drawChart() {
    const cell = currentCell();
    const values = cell.measured.concat(cell.predicted);
    state.yMin = Math.min(0, ...values);
    state.yMax = Math.max(1, ...values);
    const padding = (state.yMax - state.yMin) * 0.04;
    state.yMin -= padding;
    state.yMax += padding;
    const measuredPath = chartPath(cell.measured);
    const predictedPath = chartPath(cell.predicted);
    target.setAttribute("d", measuredPath);
    prediction.setAttribute("d", predictedPath);
    one("[data-vist-target-ghost]").setAttribute("d", measuredPath);
    one("[data-vist-prediction-ghost]").setAttribute("d", predictedPath);
    one("[data-vist-ymax]").textContent = state.yMax.toFixed(0);
    one("[data-vist-ymid]").textContent = ((state.yMin + state.yMax) / 2).toFixed(0);
    one("[data-vist-ymin]").textContent = state.yMin.toFixed(0);
    one("[data-vist-cell-cc]").textContent = cell.paperCC.toFixed(4);
    renderFrame(state.frame);
  }

  function drawReceptiveField() {
    if (!rfData || !rfOverlay || !rfData.masks[state.cell]) return;
    const context = rfOverlay.getContext("2d");
    if (!context) return;
    const color = getComputedStyle(root).getPropertyValue("--prediction-rgb").split(",").map((value) => Number(value.trim()));
    const bytes = atob(rfData.masks[state.cell]);
    const image = context.createImageData(rfData.width, rfData.height);
    for (let i = 0; i < bytes.length; i += 1) {
      image.data[i * 4] = color[0];
      image.data[i * 4 + 1] = color[1];
      image.data[i * 4 + 2] = color[2];
      image.data[i * 4 + 3] = Math.round(bytes.charCodeAt(i) * 0.56);
    }
    context.putImageData(image, 0, 0);
  }

  function renderFrame(frame) {
    state.frame = Math.max(0, Math.min(currentMovie().frameCount - 1, Math.floor(frame)));
    const x = xAt(state.frame);
    timeline.value = String(state.frame);
    timeline.setAttribute("aria-valuetext", `Frame ${state.frame} of ${currentMovie().frameCount - 1}, ${fmtTime(state.frame / data.fps)}`);
    one("[data-vist-frame]").textContent = `FRAME ${fmtFrame(state.frame)} / ${currentMovie().frameCount - 1}`;
    one("[data-vist-frame-compact]").textContent = `${fmtFrame(state.frame)} / ${currentMovie().frameCount - 1}`;
    one("[data-vist-time]").textContent = fmtTime(state.frame / data.fps);
    reveal.setAttribute("width", String(Math.max(0, x - 35 + 1)));
    head.setAttribute("x1", String(x));
    head.setAttribute("x2", String(x));
    dot.setAttribute("cx", String(x));
    dot.setAttribute("cy", String(yAt(currentCell().measured[state.frame])));
  }

  function syncPlayButton() {
    const paused = video.paused || video.ended;
    play.setAttribute("aria-label", paused ? "Play video" : "Pause video");
    one("[data-vist-play-icon]").textContent = paused ? "▶" : "Ⅱ";
  }

  function startPlayback() {
    const promise = video.play();
    if (promise && typeof promise.catch === "function") promise.catch(syncPlayButton);
  }

  function beginScrub() {
    if (state.scrubbing) return;
    state.scrubbing = true;
    state.resumeAfterScrub = !video.paused && !video.ended;
    if (!video.paused) video.pause();
  }

  function endScrub() {
    if (!state.scrubbing) return;
    const resume = state.resumeAfterScrub;
    const frame = Number(timeline.value);
    video.currentTime = frame / data.fps;
    renderFrame(frame);
    state.scrubbing = false;
    state.resumeAfterScrub = false;
    if (resume) startPlayback();
  }

  function updateComparison() {
    const s = scores[state.movie];
    root.querySelectorAll("[data-vist-direction]").forEach((button) => {
      button.setAttribute("aria-pressed", String(button.dataset.vistDirection === state.movie));
    });
    one("[data-vist-big-score]").textContent = s.vist.toFixed(3);
    one("[data-vist-score-direction]").replaceChildren(
      document.createTextNode(`Train on Movie ${s.train}.`),
      document.createElement("br"),
      document.createTextNode(`Test on Movie ${s.test}.`),
    );
    for (const name of ["vist", "i3d", "dino"]) {
      one(`[data-vist-value="${name}"]`).textContent = s[name].toFixed(3);
      one(`[data-vist-bar="${name}"]`).style.setProperty("--width", `${s[name] / 0.4 * 100}%`);
    }
    one("[data-vist-direction-label]").textContent = `TRAIN MOVIE ${s.train} → TEST MOVIE ${s.test}`;
    one("[data-vist-movie-label]").textContent = `MOVIE ${s.test}`;
    updateCellPicker();
  }

  function updateCellPicker() {
    one("[data-vist-cell-current]").textContent = state.cell;
    pickerTrigger.setAttribute("aria-label", `Choose retinal ganglion cell, currently RGC ${state.cell}`);
    pickerOptions.forEach((option) => {
      const cellId = option.dataset.vistCellOption;
      const cell = currentMovie().cells[cellId];
      option.setAttribute("aria-selected", String(cellId === state.cell));
      option.disabled = !cell;
      if (cell) {
        option.querySelector("[data-vist-option-cc]").textContent = cell.paperCC.toFixed(4);
        option.setAttribute("aria-label", `RGC ${cellId}, paper example correlation ${cell.paperCC.toFixed(4)}`);
      }
    });
  }

  function closeCellPicker(restoreFocus = false) {
    pickerDropdown.hidden = true;
    pickerTrigger.setAttribute("aria-expanded", "false");
    if (restoreFocus) pickerTrigger.focus();
  }

  function openCellPicker() {
    pickerDropdown.hidden = false;
    pickerTrigger.setAttribute("aria-expanded", "true");
    const selected = pickerOptions.find((option) => option.dataset.vistCellOption === state.cell);
    if (selected) selected.focus({ preventScroll: true });
  }

  function setMovie(movie) {
    if (!data.movies[movie] || movie === state.movie) return;
    endScrub();
    const resume = !video.paused;
    state.movie = movie;
    state.frame = 0;
    timeline.disabled = true;
    const source = new URL(`${movie}.mp4`, assetBase).href;
    video.src = source;
    video.poster = new URL(`${movie}-poster.jpg`, assetBase).href;
    video.load();
    timeline.max = String(currentMovie().frameCount - 1);
    one("[data-vist-duration]").textContent = `${(currentMovie().frameCount / data.fps).toFixed(1)} SEC`;
    updateComparison();
    drawChart();
    if (resume) startPlayback();
    else syncPlayButton();
  }

  pickerTrigger.addEventListener("click", () => {
    if (pickerDropdown.hidden) openCellPicker();
    else closeCellPicker();
  });
  pickerTrigger.addEventListener("keydown", (event) => {
    if ((event.key === "ArrowDown" || event.key === "ArrowUp") && pickerDropdown.hidden) {
      event.preventDefault();
      openCellPicker();
    }
  });
  pickerList.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      closeCellPicker(true);
      return;
    }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const enabled = pickerOptions.filter((option) => !option.disabled);
    const index = enabled.indexOf(document.activeElement);
    let next = index;
    if (event.key === "Home") next = 0;
    else if (event.key === "End") next = enabled.length - 1;
    else next = Math.max(0, Math.min(enabled.length - 1, index + (event.key === "ArrowDown" ? 1 : -1)));
    enabled[next]?.focus();
  });
  pickerOptions.forEach((option) => option.addEventListener("click", () => {
    state.cell = option.dataset.vistCellOption;
    updateCellPicker();
    drawChart();
    drawReceptiveField();
    closeCellPicker(true);
  }));
  picker.addEventListener("focusout", (event) => {
    if (!event.relatedTarget || !picker.contains(event.relatedTarget)) closeCellPicker();
  });
  document.addEventListener("pointerdown", (event) => {
    if (!picker.contains(event.target)) closeCellPicker();
  });

  const provenance = one("#vist-provenance");
  const openProvenanceFromHash = () => { if (window.location.hash === "#vist-provenance") provenance.open = true; };
  root.querySelectorAll('a[href="#vist-provenance"]').forEach((link) => link.addEventListener("click", () => { provenance.open = true; }));
  window.addEventListener("hashchange", openProvenanceFromHash);
  openProvenanceFromHash();

  const ablation = one("[data-vist-ablation]");
  if (ablation) {
    const cases = [...ablation.querySelectorAll("[data-vist-ablation-case]")];
    const regions = [...ablation.querySelectorAll("[data-ablation-region]")];
    const inspector = one("[data-vist-ablation-inspector]");
    const baseline = Number(cases.find((button) => button.dataset.vistAblationCase === "baseline").dataset.cc);
    const selectAblation = (button) => {
      const { cc, scope, change, label, description, maskLabel } = button.dataset;
      cases.forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
      inspector.dataset.change = change;
      inspector.style.setProperty("--ablation-color", button.style.getPropertyValue("--ablation-color"));
      regions.forEach((region) => {
        const active = region.dataset.ablationRegion === scope;
        region.classList.toggle("is-active", active);
        if (active) region.querySelector("[data-ablation-mask-label]").textContent = maskLabel;
      });
      one("[data-vist-ablation-name]").textContent = label;
      one("[data-vist-ablation-description]").textContent = description;
      one("[data-vist-ablation-score]").textContent = `≈${Number(cc).toFixed(4)}`;
      const delta = Number(cc) - baseline;
      const deltaText = Math.abs(delta) < 0.00005 ? "0.0000" : `${delta < 0 ? "−" : "+"}${Math.abs(delta).toFixed(4)}`;
      one("[data-vist-ablation-delta]").textContent = deltaText;
      one("[data-vist-ablation-formula]").setAttribute("aria-label", `Change in correlation from the baseline: ${deltaText}`);
    };
    cases.forEach((button) => button.addEventListener("click", () => selectAblation(button)));
    selectAblation(cases[0]);
  }

  const citation = one("[data-vist-bibtex]");
  const copyCitation = one("[data-vist-copy-bibtex]");
  const copyStatus = one("[data-vist-copy-status]");
  let copyStatusTimeout;
  if (citation && copyCitation && copyStatus) {
    copyCitation.addEventListener("click", async () => {
      const text = citation.textContent;
      let copied = false;
      try {
        if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(text);
          copied = true;
        }
      } catch { /* Try the selection-based fallback below. */ }
      if (!copied) {
        const field = document.createElement("textarea");
        field.value = text;
        field.readOnly = true;
        field.style.cssText = "position:fixed;left:-9999px;top:0";
        document.body.append(field);
        field.select();
        try { copied = document.execCommand("copy"); } catch { /* Select the visible text instead. */ }
        field.remove();
      }
      clearTimeout(copyStatusTimeout);
      if (copied) {
        copyCitation.textContent = "Copied";
        copyStatus.textContent = "BibTeX copied to clipboard.";
        copyStatusTimeout = setTimeout(() => { copyCitation.textContent = "Copy BibTeX"; copyStatus.textContent = ""; }, 2500);
      } else {
        const selection = window.getSelection();
        const range = document.createRange();
        range.selectNodeContents(citation);
        selection.removeAllRanges();
        selection.addRange(range);
        copyStatus.textContent = "Selected — copy with Ctrl+C or ⌘C.";
      }
    });
  }
  if (rfToggle && rfOverlay) {
    if (!rfData) {
      rfToggle.disabled = true;
      rfToggle.textContent = "Receptive field unavailable";
    } else {
      rfToggle.addEventListener("click", () => {
        const visible = rfToggle.getAttribute("aria-pressed") === "true";
        rfToggle.setAttribute("aria-pressed", String(!visible));
        rfOverlay.hidden = visible;
        rfToggle.lastChild.textContent = visible ? " Receptive field: off" : " Receptive field: on";
      });
    }
  }
  timeline.addEventListener("pointerdown", beginScrub);
  window.addEventListener("pointerup", endScrub);
  window.addEventListener("pointercancel", endScrub);
  const seekKeys = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"]);
  timeline.addEventListener("keydown", (event) => { if (seekKeys.has(event.key)) beginScrub(); });
  timeline.addEventListener("keyup", (event) => { if (seekKeys.has(event.key)) endScrub(); });
  timeline.addEventListener("blur", endScrub);
  timeline.addEventListener("input", () => {
    const frame = Number(timeline.value);
    video.currentTime = frame / data.fps;
    renderFrame(frame);
  });
  play.addEventListener("click", () => video.paused ? startPlayback() : video.pause());
  root.querySelectorAll("[data-vist-direction]").forEach((button) => {
    button.addEventListener("click", () => setMovie(button.dataset.vistDirection));
  });
  video.addEventListener("play", syncPlayButton);
  video.addEventListener("pause", syncPlayButton);
  video.addEventListener("loadedmetadata", () => { timeline.disabled = false; });
  video.addEventListener("seeked", () => { if (!state.scrubbing) renderFrame(Math.floor(video.currentTime * data.fps + .001)); });
  video.addEventListener("timeupdate", () => { if (!state.scrubbing && !video.seeking) renderFrame(Math.floor(video.currentTime * data.fps + .001)); });
  video.addEventListener("error", () => {
    timeline.disabled = false;
    one(".vist-chart-note").textContent = "The video could not be loaded. Check that the local media files are present.";
  });
  video.controls = false;
  video.loop = true;
  timeline.disabled = video.readyState < 1;
  timeline.max = String(currentMovie().frameCount - 1);
  updateComparison();
  drawChart();
  drawReceptiveField();
  syncPlayButton();

  if (typeof video.requestVideoFrameCallback === "function") {
    const onFrame = (_, metadata) => {
      if (!state.scrubbing && !video.seeking) renderFrame(Math.floor(metadata.mediaTime * data.fps + .001));
      video.requestVideoFrameCallback(onFrame);
    };
    video.requestVideoFrameCallback(onFrame);
  } else {
    const tick = () => {
      if (!state.scrubbing && !video.paused && !video.seeking) renderFrame(Math.floor(video.currentTime * data.fps + .001));
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }
  if (!reducedMotion.matches) startPlayback();
})();
