import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  update,
  onChildAdded,
  onChildChanged,
  onChildRemoved,
  query,
  orderByChild,
  limitToLast,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-database.js";
import { firebaseConfig } from "./config.js";
import { generateUserId, generateRoom } from "./utils.js";
import { userStorage } from "./storage.js";
import { messagesMap, addMessageToDOM, setupVoicePlayer } from "./ui.js";
import { VoiceRecorder } from "./media.js";
import { formatDuration } from "./utils.js";

const db = getDatabase(initializeApp(firebaseConfig));
const state = {
  myUserId: null,
  myUsername: null,
  currentRoom: null,
  recorder: null,
  recType: "audio",
  replyKey: null,
};

const els = {
  messages: document.getElementById("messages"),
  input: document.getElementById("msg-input"),
  sendBtn: document.getElementById("send-btn"),
  voiceBtn: document.getElementById("voice-btn"),
  micIcon: document.getElementById("mic-icon"),
  camIcon: document.getElementById("cam-icon"),
  attachBtn: document.getElementById("attach-btn"),
  attachMenu: document.getElementById("attach-menu"),
  recOverlay: document.getElementById("recording-overlay"),
  recTimer: document.getElementById("rec-timer"),
  recProgress: document.getElementById("rec-progress-fill"),
  mediaViewer: document.getElementById("media-viewer"),
  ctxMenu: document.getElementById("context-menu"),
  settingsModal: document.getElementById("settings-modal"),
  usernameInput: document.getElementById("username-input"),
  userAvatar: document.getElementById("user-avatar"),
  roomTitle: document.getElementById("room-title"),
  roomStatus: document.getElementById("room-status"),
};

let pressTimer = null;
let isPressing = false;
let holdSessionId = 0;
let pendingStart = false;

const init = async () => {
  state.myUserId = userStorage.getId();
  if (!state.myUserId) {
    state.myUserId = generateUserId();
    userStorage.setId(state.myUserId);
  }
  state.myUsername = userStorage.getName();
  if (!state.myUsername) {
    state.myUsername = "User " + state.myUserId;
    userStorage.setName(state.myUsername);
  }

  const urlRoom = new URLSearchParams(window.location.search).get("room");
  state.currentRoom = urlRoom || userStorage.getRoom() || generateRoom();
  userStorage.setRoom(state.currentRoom);
  if (window.location.search !== "?room=" + state.currentRoom)
    history.replaceState(null, "", "?room=" + state.currentRoom);

  els.userAvatar.textContent = state.myUsername.charAt(0).toUpperCase();
  els.roomTitle.textContent = state.myUsername;
  els.roomStatus.textContent = "1 участник • 1 онлайн";
  els.usernameInput.value = state.myUsername;

  setInterval(() => {
    const users = Math.floor(Math.random() * 4) + 1;
    const on = Math.floor(Math.random() * (users - 1)) + 1;
    els.roomStatus.textContent = `${users} участник${users > 1 ? "а" : ""} • ${on} онлайн`;
  }, 8000);

  setupFirebaseListeners();
  setupEventListeners();
  updateInputState();
};

const setupFirebaseListeners = () => {
  const roomRef = ref(db, `chats/${state.currentRoom}`);
  const q = query(roomRef, orderByChild("ts"), limitToLast(100));

  onChildAdded(q, (snap) => {
    const msg = snap.val();
    if (msg) addMessageToDOM(snap.key, msg, state.myUserId);
  });
  onChildChanged(q, (snap) => {
    const msg = snap.val();
    if (msg) addMessageToDOM(snap.key, msg, state.myUserId);
  });
  onChildRemoved(q, (snap) => {
    messagesMap.delete(snap.key);
    const el = document.querySelector(`[data-key="${snap.key}"]`);
    if (el) el.remove();
  });
};

const setupEventListeners = () => {
  els.input.addEventListener("input", updateInputState);
  els.input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  els.sendBtn.addEventListener("click", sendMessage);

  els.attachBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    els.attachMenu.classList.toggle("show");
  });
  document.addEventListener("click", () =>
    els.attachMenu.classList.remove("show"),
  );

  document
    .getElementById("attach-photo")
    .addEventListener("click", () =>
      document.getElementById("file-photo").click(),
    );
  document
    .getElementById("file-photo")
    .addEventListener("change", (e) =>
      handleFile(
        e,
        e.target.files[0]?.type.startsWith("video") ? "video_circle" : "image",
      ),
    );
  document
    .getElementById("attach-file")
    .addEventListener("click", () =>
      document.getElementById("file-general").click(),
    );
  document
    .getElementById("file-general")
    .addEventListener("change", (e) => handleFile(e, "file"));

  // Запись: разделение клика и зажатия + защита от "черного кружка" при быстром отпускании
  const startHold = (e) => {
    e.preventDefault();
    holdSessionId += 1;
    isPressing = true;

    const session = holdSessionId;
    pendingStart = true;

    pressTimer = setTimeout(async () => {
      // если отпустили раньше — игнорируем
      if (!pendingStart || session !== holdSessionId || !isPressing) return;
      pendingStart = false;
      await startRecording();
    }, 300);
  };

  const endHold = (e) => {
    e.preventDefault();
    isPressing = false;
    pendingStart = false;
    clearTimeout(pressTimer);

    if (state.recorder) endRecording();
  };

  els.voiceBtn.addEventListener("mousedown", startHold);
  els.voiceBtn.addEventListener("touchstart", startHold, { passive: false });
  els.voiceBtn.addEventListener("mouseup", endHold);
  els.voiceBtn.addEventListener("touchend", endHold);
  els.voiceBtn.addEventListener("click", (e) => {
    if (!state.recorder) toggleMode();
  });

  els.recOverlay.addEventListener("mousemove", (e) =>
    state.recorder?.handleMove(e.clientY),
  );
  els.recOverlay.addEventListener(
    "touchmove",
    (e) => state.recorder?.handleMove(e.touches[0].clientY),
    { passive: false },
  );
  document
    .getElementById("rec-cancel")
    .addEventListener("click", () => endRecording("cancel"));
  document
    .getElementById("rec-send")
    .addEventListener("click", () => endRecording("send"));
  document
    .getElementById("rec-flip")
    .addEventListener("click", () => state.recorder?.flipCamera());

  els.mediaViewer.addEventListener("click", (e) => {
    if (e.target === els.mediaViewer) els.mediaViewer.classList.remove("show");
  });
  document
    .getElementById("viewer-close")
    .addEventListener("click", () => els.mediaViewer.classList.remove("show"));

  els.ctxMenu.addEventListener("click", handleContextMenu);
  document.addEventListener("click", () =>
    els.ctxMenu.classList.remove("show"),
  );

  els.userAvatar.addEventListener("click", () =>
    els.settingsModal.classList.add("show"),
  );
  document
    .getElementById("cancel-settings")
    .addEventListener("click", () =>
      els.settingsModal.classList.remove("show"),
    );
  document.getElementById("save-settings").addEventListener("click", () => {
    const n = els.usernameInput.value.trim();
    if (n) {
      state.myUsername = n;
      userStorage.setName(n);
      els.roomTitle.textContent = n;
      els.userAvatar.textContent = n[0];
      els.settingsModal.classList.remove("show");
    }
  });
  els.settingsModal.addEventListener("click", (e) => {
    if (e.target === els.settingsModal)
      els.settingsModal.classList.remove("show");
  });

  document
    .getElementById("copy-link-btn")
    .addEventListener("click", async () => {
      await navigator.clipboard.writeText(window.location.href);
      const b = document.getElementById("copy-link-btn");
      b.textContent = "✓";
      setTimeout(
        () =>
          (b.innerHTML =
            '<svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>'),
        2000,
      );
    });
  document.getElementById("new-chat-btn").addEventListener("click", () => {
    if (confirm("Создать новый чат?"))
      location.href = "?room=" + generateRoom();
  });

  // Контекстное меню (ПКМ/long-press): делаем глобально, чтобы 100% ловилось на любом месте пузыря.
  const openCtxMenuByMsgEl = (msgEl, x, y) => {
    if (!msgEl || !msgEl.dataset?.key) return;
    const key = msgEl.dataset.key;
    if (!messagesMap.has(key)) return;
    els.ctxMenu.dataset.key = key;
    els.ctxMenu.style.left = Math.min(x, window.innerWidth - 180) + "px";
    els.ctxMenu.style.top = Math.min(y, window.innerHeight - 150) + "px";
    els.ctxMenu.classList.add("show");
  };

  document.addEventListener('contextmenu', (e) => {
    const msgEl = e.target.closest('.msg');
    if (!msgEl) return;
    e.preventDefault();
    openCtxMenuByMsgEl(msgEl, e.clientX, e.clientY);
  });

  // long-press на тач/мобилках (и как fallback на ПК)
  let pressCtxTimer = null;
  let pressCtxActive = false;

  const startCtxPress = (e) => {
    // только если клик/тач начался на .msg
    const msgEl = e.target.closest('.msg');
    if (!msgEl) return;

    pressCtxActive = true;
    const sessionTarget = msgEl;

    pressCtxTimer = setTimeout(() => {
      if (!pressCtxActive) return;
      // координаты: берем из события
      const clientX = e.touches?.[0]?.clientX ?? e.clientX;
      const clientY = e.touches?.[0]?.clientY ?? e.clientY;
      openCtxMenuByMsgEl(sessionTarget, clientX, clientY);
    }, 550);
  };

  const endCtxPress = () => {
    pressCtxActive = false;
    clearTimeout(pressCtxTimer);
  };

  // pointerdown/up покрывает mouse и touch
  document.addEventListener('pointerdown', startCtxPress);
  document.addEventListener('pointerup', endCtxPress);
  document.addEventListener('pointercancel', endCtxPress);

  // Прячем меню, если кликнули вне
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#context-menu')) els.ctxMenu.classList.remove('show');
  });
};

const updateInputState = () => {
  const hasText = els.input.value.trim().length > 0;
  els.sendBtn.style.display = hasText ? "flex" : "none";
};

const sendMessage = async () => {
  const text = els.input.value.trim();
  if (!text) return;
  const data = {
    text,
    sender: state.myUserId,
    username: state.myUsername,
    ts: Date.now(),
    type: "text",
    edited: false,
    replyTo: state.replyKey || null,
  };
  await push(ref(db, `chats/${state.currentRoom}`), data);
  els.input.value = "";
  state.replyKey = null;
  els.input.placeholder = "Сообщение";
  updateInputState();
};

const handleFile = async (e, type) => {
  const file = e.target.files[0];
  if (!file || file.size > 4 * 1024 * 1024)
    return alert("Файл слишком большой. Максимум 4МБ");

  const reader = new FileReader();
  reader.onload = async () => {
    const data = {
      url: reader.result,
      sender: state.myUserId,
      username: state.myUsername,
      ts: Date.now(),
      type,
      fileName: file.name,
      fileSize: file.size,
      edited: false,
      replyTo: state.replyKey || null,
    };
    await push(ref(db, `chats/${state.currentRoom}`), data);
  };
  reader.readAsDataURL(file);
  e.target.value = "";
  els.attachMenu.classList.remove("show");
};

const startRecording = async () => {
  state.recorder = new VoiceRecorder(async (file, dur) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const data = {
        url: reader.result,
        sender: state.myUserId,
        username: state.myUsername,
        ts: Date.now(),
        type: state.recType === "video" ? "video_circle" : "voice",
        duration: dur,
        fileName: file.name,
        fileSize: file.size,
        edited: false,
        replyTo: state.replyKey || null,
      };
      await push(ref(db, `chats/${state.currentRoom}`), data);
      hideRecordingUI();
    };
    reader.readAsDataURL(file);
  });

  try {
    await state.recorder.init(state.recType);
    els.recOverlay.classList.add("show");
    els.recProgress.style.width = "0%";
    document.getElementById("rec-hint").textContent = "Зажмите кнопку записи";
    state.recorder.start((sec) => {
      els.recTimer.textContent = formatDuration(sec); // ✅ Исправлен баг с таймером
      els.recProgress.style.width = (sec / 60) * 100 + "%";
    });
  } catch (err) {
    alert("Ошибка доступа к микрофону/камере");
    hideRecordingUI();
  }
};

const endRecording = (forceAction = null) => {
  if (!state.recorder) return;
  const action = forceAction || state.recorder.getAction();
  state.recorder.stop(action);
  if (action === "cancel") hideRecordingUI();
};

const hideRecordingUI = () => {
  els.recOverlay.classList.remove("show");
  state.recorder = null;
};

const toggleMode = () => {
  if (state.recType === "audio") {
    state.recType = "video";
    els.micIcon.style.display = "none";
    els.camIcon.style.display = "block";
  } else {
    state.recType = "audio";
    els.micIcon.style.display = "block";
    els.camIcon.style.display = "none";
  }
};

const handleContextMenu = async (e) => {
  const act = e.target.closest(".ctx-item")?.dataset.action;
  const key = els.ctxMenu.dataset.key;
  if (!act || !key || !messagesMap.has(key)) return;

  const msg = messagesMap.get(key);
  const roomRef = ref(db, `chats/${state.currentRoom}/${key}`);

  if (act === "reply") {
    state.replyKey = key;
    els.input.placeholder = `Ответ на: ${msg.text?.substring(0, 20) || "Медиа"}`;
    els.input.focus();
  } else if (act === "edit") {
    const newText = prompt(
      "Редактировать текст/подпись:",
      msg.text || msg.caption || "",
    );
    if (
      newText !== null &&
      newText.trim() !== (msg.text || msg.caption || "")
    ) {
      await update(roomRef, { text: newText.trim(), edited: true });
    }
  } else if (act === "delete") {
    if (confirm("Удалить сообщение?")) {
      await update(roomRef, { deleted: true });
    }
  }
  els.ctxMenu.classList.remove("show");
};

init();
