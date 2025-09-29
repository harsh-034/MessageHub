const chatBox = document.getElementById("chat-box");
const sendBtn = document.getElementById("sendBtn");
const messageInput = document.getElementById("message");
const usernameInput = document.getElementById("username");

// Load messages
async function loadMessages() {
  try {
    const res = await fetch("http://localhost:5000/messages");
    const messages = await res.json();

    chatBox.innerHTML = "";

    const currentUser = usernameInput.value.trim() || "Anonymous";

    messages.forEach(msg => {
      const div = document.createElement("div");
      div.classList.add("message");

      // Self or other
      div.classList.add(msg.username === currentUser ? "self" : "other");

      div.innerHTML = `
        <b>${msg.username}:</b> ${msg.message}
        <span class="time">${new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
      `;

      // Delete button for self messages
      if (msg.username === currentUser) {
        const delBtn = document.createElement("button");
        delBtn.classList.add("delete-btn");
        delBtn.innerHTML = "❌";
        delBtn.onclick = async () => {
          if(confirm("Are you sure to delete this message?")) {
            await fetch(`http://localhost:5000/delete/${msg.id}`, { method: "DELETE" });
            loadMessages();
          }
        };
        div.appendChild(delBtn);
      }

      chatBox.appendChild(div);
    });

    chatBox.scrollTop = chatBox.scrollHeight;
  } catch (err) {
    console.error("Error loading messages:", err);
  }
}

// Send message
sendBtn.addEventListener("click", async () => {
  const message = messageInput.value.trim();
  const username = usernameInput.value.trim() || "Anonymous";

  if (!message) return;

  await fetch("http://localhost:5000/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, message })
  });

  messageInput.value = "";
  loadMessages();
});

// Auto refresh every 2 seconds
setInterval(loadMessages, 2000);
loadMessages();
