/**
 * script.js
 * Logika frontend untuk AI Chatbot Website
 * - Auth (login username / guest)
 * - Sidebar & chat session management
 * - Kirim/terima pesan + markdown & syntax highlighting
 * - LocalStorage untuk menyimpan sesi user aktif
 */

(() => {
  "use strict";

  // ---------- State ----------
  const state = {
    userId: null,
    username: null,
    userType: null,
    activeChatId: null,
    isSending: false,
  };

  const STORAGE_KEY = "ai_chatbot_session";

  // ---------- DOM Elements ----------
  const authScreen = document.getElementById("auth-screen");
  const appScreen = document.getElementById("app-screen");

  const authChoice = document.getElementById("auth-choice");
  const authLoginForm = document.getElementById("auth-login");
  const btnShowLogin = document.getElementById("btn-show-login");
  const btnGuest = document.getElementById("btn-guest");
  const btnBack = document.getElementById("btn-back");
  const usernameInput = document.getElementById("username-input");
  const loginError = document.getElementById("login-error");

  const sidebar = document.getElementById("sidebar");
  const sidebarOverlay = document.getElementById("sidebar-overlay");
  const btnOpenSidebar = document.getElementById("btn-open-sidebar");
  const btnCloseSidebar = document.getElementById("btn-close-sidebar");
  const btnNewChat = document.getElementById("btn-new-chat");
  const btnLogout = document.getElementById("btn-logout");
  const chatHistoryList = document.getElementById("chat-history-list");

  const userAvatar = document.getElementById("user-avatar");
  const sidebarUsername = document.getElementById("sidebar-username");
  const sidebarUsertype = document.getElementById("sidebar-usertype");

  const chatTitle = document.getElementById("chat-title");
  const chatMessages = document.getElementById("chat-messages");
  const emptyState = document.getElementById("empty-state");
  const typingIndicator = document.getElementById("typing-indicator");

  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const btnSend = document.getElementById("btn-send");

  // ---------- Markdown config ----------
  if (window.marked) {
    marked.setOptions({
      breaks: true,
      gfm: true,
    });
  }

  // ==================================================================
  // INIT
  // ==================================================================

  function init() {
    bindAuthEvents();
    bindAppEvents();
    restoreSession();
    autoResizeTextarea();
  }

  function restoreSession() {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const session = JSON.parse(saved);
        if (session.userId && session.username) {
          state.userId = session.userId;
          state.username = session.username;
          state.userType = session.userType;
          enterApp();
          return;
        }
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY);
      }
    }
    showAuthScreen();
  }

  function saveSession() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        userId: state.userId,
        username: state.username,
        userType: state.userType,
      })
    );
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ==================================================================
  // AUTH SCREEN LOGIC
  // ==================================================================

  function bindAuthEvents() {
    btnShowLogin.addEventListener("click", () => {
      authChoice.classList.add("hidden");
      authLoginForm.classList.remove("hidden");
      usernameInput.focus();
    });

    btnBack.addEventListener("click", () => {
      authLoginForm.classList.add("hidden");
      authChoice.classList.remove("hidden");
      hideLoginError();
      usernameInput.value = "";
    });

    btnGuest.addEventListener("click", async () => {
      btnGuest.disabled = true;
      btnGuest.textContent = "Membuat sesi...";
      try {
        const res = await fetch("/api/guest", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Gagal membuat sesi guest.");

        state.userId = data.userId;
        state.username = data.username;
        state.userType = data.type;
        saveSession();
        enterApp();
      } catch (err) {
        alert(err.message);
      } finally {
        btnGuest.disabled = false;
        btnGuest.textContent = "Lanjut sebagai Guest";
      }
    });

    authLoginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      hideLoginError();

      const username = usernameInput.value.trim();
      if (!username) return;

      const submitBtn = authLoginForm.querySelector('button[type="submit"]');
      submitBtn.disabled = true;
      submitBtn.textContent = "Memproses...";

      try {
        const res = await fetch("/api/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Login gagal.");

        state.userId = data.userId;
        state.username = data.username;
        state.userType = data.type;
        saveSession();
        enterApp();
      } catch (err) {
        showLoginError(err.message);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "Masuk";
      }
    });
  }

  function showLoginError(msg) {
    loginError.textContent = msg;
    loginError.classList.remove("hidden");
  }

  function hideLoginError() {
    loginError.classList.add("hidden");
    loginError.textContent = "";
  }

  function showAuthScreen() {
    authScreen.classList.remove("hidden");
    appScreen.classList.add("hidden");
  }

  // ==================================================================
  // APP SCREEN LOGIC
  // ==================================================================

  function bindAppEvents() {
    btnOpenSidebar.addEventListener("click", () => toggleSidebar(true));
    btnCloseSidebar.addEventListener("click", () => toggleSidebar(false));
    sidebarOverlay.addEventListener("click", () => toggleSidebar(false));

    btnNewChat.addEventListener("click", createNewChat);
    btnLogout.addEventListener("click", logout);

    chatForm.addEventListener("submit", handleSendMessage);

    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatForm.requestSubmit();
      }
    });

    chatInput.addEventListener("input", autoResizeTextarea);
  }

  function autoResizeTextarea() {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + "px";
  }

  function toggleSidebar(open) {
    sidebar.classList.toggle("open", open);
    sidebarOverlay.classList.toggle("visible", open);
  }

  async function enterApp() {
    authScreen.classList.add("hidden");
    appScreen.classList.remove("hidden");

    sidebarUsername.textContent = state.username;
    sidebarUsertype.textContent =
      state.userType === "guest" ? "Guest" : "Terdaftar";
    userAvatar.textContent = state.username.charAt(0).toUpperCase();

    await loadChatList({ autoOpenFirst: true });
  }

  function logout() {
    clearSession();
    state.userId = null;
    state.username = null;
    state.userType = null;
    state.activeChatId = null;
    chatHistoryList.innerHTML = "";
    resetChatView();
    usernameInput.value = "";
    authLoginForm.classList.add("hidden");
    authChoice.classList.remove("hidden");
    showAuthScreen();
  }

  // ==================================================================
  // CHAT SESSION (SIDEBAR)
  // ==================================================================

  async function loadChatList({ autoOpenFirst = false } = {}) {
    try {
      const res = await fetch(`/api/chats/${state.userId}`);
      const data = await res.json();
      renderChatList(data.chats || []);

      if (autoOpenFirst) {
        if (data.chats && data.chats.length > 0) {
          openChat(data.chats[0].id);
        } else {
          await createNewChat();
        }
      }
    } catch (err) {
      console.error("Gagal memuat daftar chat:", err);
    }
  }

  function renderChatList(chats) {
    chatHistoryList.innerHTML = "";

    if (chats.length === 0) {
      const empty = document.createElement("div");
      empty.className = "chat-history-empty";
      empty.textContent = "Belum ada riwayat chat.";
      chatHistoryList.appendChild(empty);
      return;
    }

    chats.forEach((chat) => {
      const item = document.createElement("div");
      item.className = "chat-history-item";
      if (chat.id === state.activeChatId) item.classList.add("active");
      item.dataset.chatId = chat.id;

      const label = document.createElement("span");
      label.className = "item-label";
      label.textContent = chat.title || "Chat Baru";

      const deleteBtn = document.createElement("button");
      deleteBtn.className = "delete-chat-btn";
      deleteBtn.innerHTML = "✕";
      deleteBtn.title = "Hapus chat";
      deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        deleteChat(chat.id);
      });

      item.appendChild(label);
      item.appendChild(deleteBtn);

      item.addEventListener("click", () => {
        openChat(chat.id);
        if (window.innerWidth <= 768) toggleSidebar(false);
      });

      chatHistoryList.appendChild(item);
    });
  }

  async function createNewChat() {
    try {
      const res = await fetch(`/api/chats/${state.userId}`, {
        method: "POST",
      });
      const chat = await res.json();
      await loadChatList();
      openChat(chat.id);
      if (window.innerWidth <= 768) toggleSidebar(false);
    } catch (err) {
      console.error("Gagal membuat chat baru:", err);
    }
  }

  async function deleteChat(chatId) {
    if (!confirm("Hapus chat ini? Riwayat percakapan akan hilang permanen.")) {
      return;
    }
    try {
      await fetch(`/api/chats/${state.userId}/${chatId}`, {
        method: "DELETE",
      });

      if (state.activeChatId === chatId) {
        state.activeChatId = null;
      }
      await loadChatList({ autoOpenFirst: true });
    } catch (err) {
      console.error("Gagal menghapus chat:", err);
    }
  }

  async function openChat(chatId) {
    state.activeChatId = chatId;

    // update highlight aktif
    document.querySelectorAll(".chat-history-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.chatId === chatId);
    });

    try {
      const res = await fetch(`/api/chats/${state.userId}/${chatId}`);
      const chat = await res.json();

      chatTitle.textContent = chat.title || "Chat Baru";
      renderMessages(chat.messages || []);
    } catch (err) {
      console.error("Gagal membuka chat:", err);
    }
  }

  function resetChatView() {
    chatMessages.innerHTML = "";
    chatMessages.appendChild(emptyState);
    emptyState.classList.remove("hidden");
    chatTitle.textContent = "Chat Baru";
  }

  // ==================================================================
  // MESSAGES RENDERING
  // ==================================================================

  function renderMessages(messages) {
    chatMessages.innerHTML = "";

    if (!messages || messages.length === 0) {
      chatMessages.appendChild(emptyState);
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");
    messages.forEach((msg) => appendMessageBubble(msg));
    scrollToBottom();
  }

  function appendMessageBubble(msg) {
    emptyState.classList.add("hidden");

    const wrapper = document.createElement("div");
    wrapper.className = `message ${msg.role === "user" ? "user" : "assistant"}`;

    const avatar = document.createElement("div");
    avatar.className = "message-avatar";
    avatar.textContent = msg.role === "user" ? initials(state.username) : "AI";

    const body = document.createElement("div");
    body.className = "message-body";

    const bubble = document.createElement("div");
    bubble.className = "message-bubble";

    if (msg.role === "assistant") {
      bubble.innerHTML = renderMarkdown(msg.content);
      enhanceCodeBlocks(bubble);
    } else {
      bubble.textContent = msg.content;
    }

    const time = document.createElement("div");
    time.className = "message-timestamp";
    time.textContent = formatTime(msg.timestamp);

    body.appendChild(bubble);
    body.appendChild(time);

    wrapper.appendChild(avatar);
    wrapper.appendChild(body);

    chatMessages.appendChild(wrapper);
  }

  function initials(name) {
    return (name || "?").charAt(0).toUpperCase();
  }

  function formatTime(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function renderMarkdown(text) {
    if (window.marked) {
      return marked.parse(text || "");
    }
    // fallback sederhana jika marked gagal dimuat
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }

  function enhanceCodeBlocks(container) {
    const preBlocks = container.querySelectorAll("pre");

    preBlocks.forEach((pre) => {
      const codeEl = pre.querySelector("code");
      if (!codeEl) return;

      // Syntax highlighting
      if (window.hljs) {
        hljs.highlightElement(codeEl);
      }

      // Deteksi bahasa dari class hljs / language-xxx
      let lang = "text";
      const classMatch = codeEl.className.match(/language-(\w+)/);
      if (classMatch) lang = classMatch[1];

      // Bungkus pre dengan wrapper + header + tombol copy
      const wrapper = document.createElement("div");
      wrapper.className = "code-block-wrapper";

      const header = document.createElement("div");
      header.className = "code-block-header";

      const langLabel = document.createElement("span");
      langLabel.className = "code-block-lang";
      langLabel.textContent = lang;

      const copyBtn = document.createElement("button");
      copyBtn.className = "copy-code-btn";
      copyBtn.innerHTML = "⧉ Copy";
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(codeEl.textContent).then(() => {
          copyBtn.innerHTML = "✓ Copied";
          copyBtn.classList.add("copied");
          setTimeout(() => {
            copyBtn.innerHTML = "⧉ Copy";
            copyBtn.classList.remove("copied");
          }, 1800);
        });
      });

      header.appendChild(langLabel);
      header.appendChild(copyBtn);

      pre.parentNode.insertBefore(wrapper, pre);
      wrapper.appendChild(header);
      wrapper.appendChild(pre);
    });
  }

  function scrollToBottom() {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  // ==================================================================
  // SEND MESSAGE
  // ==================================================================

  async function handleSendMessage(e) {
    e.preventDefault();

    const message = chatInput.value.trim();
    if (!message || state.isSending) return;

    if (!state.activeChatId) {
      await createNewChat();
    }

    // Tampilkan pesan user langsung (optimistic UI)
    appendMessageBubble({
      role: "user",
      content: message,
      timestamp: new Date().toISOString(),
    });
    scrollToBottom();

    chatInput.value = "";
    autoResizeTextarea();

    setSending(true);
    showTyping(true);

    try {
      const res = await fetch(`/api/chat/${state.userId}/${state.activeChatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Gagal mengirim pesan.");

      appendMessageBubble(data.reply);
      scrollToBottom();

      if (data.chatTitle) {
        chatTitle.textContent = data.chatTitle;
      }

      await loadChatList(); // refresh sidebar (judul & urutan bisa berubah)
    } catch (err) {
      appendMessageBubble({
        role: "assistant",
        content: `⚠️ ${err.message}`,
        timestamp: new Date().toISOString(),
      });
      scrollToBottom();
    } finally {
      setSending(false);
      showTyping(false);
    }
  }

  function setSending(isSending) {
    state.isSending = isSending;
    btnSend.disabled = isSending;
  }

  function showTyping(show) {
    typingIndicator.classList.toggle("hidden", !show);
    if (show) scrollToBottom();
  }

  // ---------- Start ----------
  init();
})();
