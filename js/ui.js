import {
  formatTime,
  formatDate,
  formatDuration,
  formatFileSize,
  escapeHtml,
} from "./utils.js";

export const messagesMap = new Map();
let lastDateAdded = "";

export const addMessageToDOM = (key, msg, myUserId, prepend = false) => {
  if (msg.deleted) {
    const existing = document.querySelector(`[data-key="${key}"]`);
    if (existing) {
      existing.style.transition = "opacity 0.3s, transform 0.3s";
      existing.style.opacity = "0";
      existing.style.transform = "scale(0.8)";
      setTimeout(() => existing.remove(), 300);
    }
    return;
  }

  const existing = document.querySelector(`[data-key="${key}"]`);
  if (existing) {
    existing.replaceWith(createMsgElement(key, msg, myUserId));
    return;
  }

  addDateDivider(msg.ts);
  const div = createMsgElement(key, msg, myUserId);
  const messagesEl = document.getElementById("messages");
  if (prepend) messagesEl.prepend(div);
  else messagesEl.appendChild(div);

  if (!prepend) messagesEl.scrollTop = messagesEl.scrollHeight;
  setupVoicePlayer();
  setupVideoCirclePlayer();
};

const createMsgElement = (key, msg, myUserId) => {
  const isMine = msg.sender === myUserId;
  const div = document.createElement("div");
  div.className = `msg ${isMine ? "mine" : "other"}${msg.edited ? " edited" : ""}`;
  div.dataset.key = key;

  let content = "";
  if (msg.username && !isMine)
    content += `<span class="sender-name">${escapeHtml(msg.username)}</span>`;

  if (msg.replyTo && messagesMap.has(msg.replyTo)) {
    const r = messagesMap.get(msg.replyTo);
    content += `<div class="reply-preview">
      <div style="font-weight: 600; margin-bottom: 2px;">${r.username || "Пользователь"}</div>
      <div>${escapeHtml(r.text?.substring(0, 40) || "Медиа")}</div>
    </div>`;
  }

  if (msg.type === "image") {
    content += `<div class="msg-media" data-media-key="${key}" onclick="window.viewMedia('${msg.url}', 'image', '${key}')"><img src="${msg.url}" loading="lazy"></div>`;
  } else if (msg.type === "video_circle") {
    content += `
      <div class="msg-video-circle" data-video-url="${msg.url}">
        <button class="video-play" type="button" aria-label="Play">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
        </button>
        <video class="video-el" src="${msg.url}" loop muted playsinline preload="metadata"></video>
      </div>`;
  } else if (msg.type === "voice") {
    content += `<div class="msg-voice">
      <button class="voice-play" data-url="${msg.url}"><svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg></button>
      <div class="voice-wave">${Array(16)
        .fill(0)
        .map(
          () =>
            `<div class="voice-bar" style="height:${Math.random() * 18 + 6}px"></div>`,
        )
        .join("")}</div>
      <div class="voice-duration">${formatDuration(msg.duration || 0)}</div>
    </div>`;
  } else if (msg.type === "file") {
    content += `<div class="msg-media" onclick="window.downloadFile('${msg.url}', '${escapeHtml(msg.fileName)}')">
      <div style="display:flex;align-items:center;gap:10px;padding:8px;background:rgba(0,0,0,0.03);border-radius:10px;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="#3390ec"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
        <div><div style="font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:150px;">${escapeHtml(msg.fileName)}</div><div style="font-size:12px;color:#777;">${formatFileSize(msg.fileSize)}</div></div>
      </div>
    </div>`;
  } else {
    content += escapeHtml(msg.text || "");
  }

  if (msg.caption)
    content += `<div style="margin-top:6px;font-size:13px;color:var(--secondary);">${escapeHtml(msg.caption)}</div>`;
  content += `<div class="time">${formatTime(msg.ts)}${msg.edited ? " (ред.)" : ""}</div>`;
  div.innerHTML = content;
  return div;
};

export const addDateDivider = (ts) => {
  const current = formatDate(ts);
  if (current === lastDateAdded) return;
  lastDateAdded = current;

  const messagesEl = document.getElementById("messages");
  const d = document.createElement("div");
  d.className = "date-divider";
  d.dataset.date = current;
  d.textContent = current;
  messagesEl.appendChild(d);
};

const getMessagesInViewOrder = () => {
  const container = document.getElementById("messages");
  return Array.from(container.querySelectorAll(".msg"))
    .map((el) => el.dataset.key)
    .filter(Boolean);
};

const buildImageGroup = (startKey) => {
  // берем ближайшие сообщения с type=image вокруг на основе DOM-порядка
  const order = getMessagesInViewOrder();
  const startIdx = order.indexOf(startKey);
  if (startIdx === -1) return [startKey];

  const collect = [];
  const pushIfImage = (k) => {
    const m = messagesMap.get(k);
    if (m && m.type === "image" && m.url) collect.push(k);
  };

  // сначала текущая
  pushIfImage(startKey);

  // затем соседи по DOM
  let left = startIdx - 1;
  let right = startIdx + 1;
  while (collect.length < 12 && (left >= 0 || right < order.length)) {
    if (left >= 0) {
      pushIfImage(order[left]);
      if (collect.length >= 12) break;
      left--;
    }
    if (right < order.length) {
      pushIfImage(order[right]);
      if (collect.length >= 12) break;
      right++;
    }
  }

  // убираем дубли, сохраняя порядок
  return Array.from(new Set(collect));
};

const openImageCarouselViewer = (keys, startIndex) => {
  const v = document.getElementById("media-viewer");
  const c = document.getElementById("viewer-content");

  // keys может быть массивом url (если вызвали без startKey) или массивом message keys
  const photos = keys
    .map((k) => {
      // если передали URL напрямую
      if (typeof k === "string" && k.startsWith("data:")) return k;
      // иначе считаем что это ключ сообщения
      return messagesMap.get(k)?.url;
    })
    .filter(Boolean);

  if (!photos.length) {
    // важно: не показывать "нет изображения" если viewer вызван с url, который не попал в keys
    v.classList.add("show");
    c.innerHTML = `<div class="system">Нет изображения</div>`;
    return;
  }


  let idx = startIndex;
  let scale = 1;
  let minScale = 1;
  let maxScale = 4;
  let x = 0;
  let y = 0;

  const setPhoto = (nextIdx) => {
    idx = nextIdx;
    scale = 1;
    x = 0;
    y = 0;

    const url = photos[idx];
    c.querySelector("img.viewer-photo").src = url;

    const activeThumb = c.querySelectorAll(".viewer-thumb")[idx];
    c.querySelectorAll(".viewer-thumb").forEach((t, i) =>
      t.classList.toggle("active", i === idx),
    );
  };

  c.innerHTML = `
    <div class="viewer-controls">
      <button class="viewer-ctl" id="viewer-prev" aria-label="Назад">‹</button>
      <button class="viewer-ctl" id="viewer-next" aria-label="Вперед">›</button>
    </div>

    <div class="viewer-pan-viewport">
      <img class="viewer-photo" src="${photos[idx]}" style="opacity:0" draggable="false" />
    </div>

    ${
      photos.length > 1
        ? `
      <div class="viewer-thumbs">
        ${photos.map((u, i) => `<div class="viewer-thumb ${i === idx ? "active" : ""}" data-i="${i}"><img src="${u}"></div>`).join("")}
      </div>
    `
        : ""
    }

    <div class="viewer-zoom-bar">
      <button class="viewer-zoom-btn" id="viewer-zoom-out" aria-label="Уменьшить">−</button>
      <div class="viewer-zoom-label" id="viewer-zoom-label">${Math.round(scale * 100)}%</div>
      <button class="viewer-zoom-btn" id="viewer-zoom-in" aria-label="Увеличить">+</button>
    </div>
  `;

  v.classList.add("show");
  requestAnimationFrame(() => c.classList.add("loaded"));

  const imgEl = c.querySelector("img.viewer-photo");
  const viewport = c.querySelector(".viewer-pan-viewport");
  const zoomLabel = c.querySelector("#viewer-zoom-label");

  const applyTransform = () => {
    imgEl.style.transform = `translate(${x}px, ${y}px) scale(${scale})`;
    if (zoomLabel) zoomLabel.textContent = `${Math.round(scale * 100)}%`;
  };

  let dragging = false;
  let startX = 0;
  let startY = 0;

  const onPointerDown = (e) => {
    if (scale <= 1.001) {
      // при масштабе 1 — не тащим, а разрешаем свайп/скролл
    }
    dragging = true;
    imgEl.classList.add("grabbing");
    imgEl.setPointerCapture?.(e.pointerId);
    startX = e.clientX;
    startY = e.clientY;
  };

  const onPointerMove = (e) => {
    if (!dragging) return;
    if (scale <= 1.001) return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;
    startX = e.clientX;
    startY = e.clientY;
    x += dx;
    y += dy;
    applyTransform();
  };

  const onPointerUp = () => {
    dragging = false;
    imgEl.classList.remove("grabbing");
  };

  imgEl.addEventListener("pointerdown", onPointerDown);
  imgEl.addEventListener("pointermove", onPointerMove);
  imgEl.addEventListener("pointerup", onPointerUp);
  imgEl.addEventListener("pointercancel", onPointerUp);

  // zoom wheel
  c.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      const delta = e.deltaY;
      const step = delta > 0 ? -0.15 : 0.15;
      scale = Math.min(maxScale, Math.max(minScale, scale + step));
      applyTransform();
    },
    { passive: false },
  );

  c.querySelector("#viewer-zoom-in")?.addEventListener("click", () => {
    scale = Math.min(maxScale, scale + 0.25);
    applyTransform();
  });
  c.querySelector("#viewer-zoom-out")?.addEventListener("click", () => {
    scale = Math.max(minScale, scale - 0.25);
    applyTransform();
  });

  c.querySelectorAll(".viewer-thumb")?.forEach((t) => {
    t.addEventListener("click", () => {
      const next = Number(t.dataset.i);
      setPhoto(next);
      c.querySelectorAll(".viewer-thumb").forEach((tt, i) =>
        tt.classList.toggle("active", i === next),
      );
    });
  });

  const prevBtn = c.querySelector("#viewer-prev");
  const nextBtn = c.querySelector("#viewer-next");
  prevBtn?.addEventListener("click", () => {
    if (idx > 0) setPhoto(idx - 1);
  });
  nextBtn?.addEventListener("click", () => {
    if (idx < photos.length - 1) setPhoto(idx + 1);
  });

  applyTransform();
};

window.viewMedia = (url, type, startKey = null) => {
  const v = document.getElementById("media-viewer");
  const c = document.getElementById("viewer-content");

  if (type === "image") {
    const keys = startKey ? buildImageGroup(startKey) : [url].filter(Boolean);
    const startIndex = startKey ? Math.max(0, keys.indexOf(startKey)) : 0;
    // если startKey не передан, открываем карусель по одному элементу (url)
    if (!startKey) {
      openImageCarouselViewer([url], 0);
    } else {
      // если по startKey собрать группу не получилось (бывает из-за очередности загрузки/кэша),
      // гарантируем показ хотя бы текущего url
      const safeKeys = keys.length ? keys : [url].filter(Boolean);
      openImageCarouselViewer(safeKeys, safeKeys.length ? startIndex : 0);
    }
    return;
  }

  // видео — пока оставляем старую модалку
  c.innerHTML = `<video src="${url}" controls playsinline style="max-width:400px;border-radius:50%;"></video>`;
  v.classList.add("show");
  setTimeout(() => c.classList.add("loaded"), 20);
};

window.downloadFile = (url, filename) => {
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
};

export const setupVoicePlayer = () => {
  document.querySelectorAll(".voice-play").forEach((btn) => {
    if (btn.dataset.setup) return;
    btn.dataset.setup = "1";
    const audio = new Audio(btn.dataset.url);
    let isPlaying = false;
    btn.onclick = () => {
      isPlaying ? audio.pause() : audio.play();
      isPlaying = !isPlaying;
      btn.innerHTML = isPlaying
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    };
    audio.onended = () => {
      isPlaying = false;
      btn.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    };
  });
};

const setupVideoCirclePlayer = () => {
  document.querySelectorAll(".msg-video-circle").forEach((wrap) => {
    if (wrap.dataset.setup) return;
    wrap.dataset.setup = "1";

    const btn = wrap.querySelector(".video-play");
    const video = wrap.querySelector(".video-el");
    if (!btn || !video) return;

    let isPlaying = false;

    const setIcon = () => {
      btn.innerHTML = isPlaying
        ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>'
        : '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
    };

    btn.addEventListener("click", async (e) => {
      e.stopPropagation();
      try {
        if (isPlaying) {
          video.pause();
          isPlaying = false;
        } else {
          video.muted = true;
          video.playsInline = true;
          video.currentTime = 0;
          await video.play();
          isPlaying = true;
        }
        setIcon();
      } catch {
        // если браузер не дал play по жесту — просто игнор
      }
    });

    video.addEventListener("ended", () => {
      isPlaying = false;
      setIcon();
    });

    setIcon();
  });
};

// setupVoicePlayerAndVideo оставляем для совместимости, но текущая логика вызывает оба плеера напрямую.
export const setupVoicePlayerAndVideo = () => {
  setupVoicePlayer();
  setupVideoCirclePlayer();
};
