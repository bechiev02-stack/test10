// server.js
// Сервер Messenger MVP: Express + Socket.io.
// Данные хранятся только в оперативной памяти.

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const fs = require("fs");

const config = JSON.parse(
  fs.readFileSync("./config.json", "utf8")
);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = config.port || 3000;

// ---------------------------------------------
// Временная база данных
// ---------------------------------------------

const users = [];
const messages = [];

// ---------------------------------------------
// Middleware
// ---------------------------------------------

app.use(express.json());
app.use(express.static("public"));

// ---------------------------------------------
// Вспомогательные функции
// ---------------------------------------------

function normalizeUsername(value) {
  return String(value || "").trim().toLowerCase();
}

function validUsername(username) {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

// ---------------------------------------------
// Регистрация / вход
// ---------------------------------------------

app.post("/api/register", (req, res) => {
  const username = normalizeUsername(req.body.username);

  if (!validUsername(username)) {
    return res.status(400).json({
      error: "Username: 3-20 символов, только буквы, цифры и _."
    });
  }

  const existingUser = users.find(
    (user) => user.username === username
  );

  if (existingUser) {
    return res.status(409).json({
      error: "Такой username уже зарегистрирован."
    });
  }

  const user = {
    username,
    createdAt: new Date().toISOString()
  };

  users.push(user);

  res.status(201).json({
    success: true,
    user
  });
});

// ---------------------------------------------
// Поиск пользователей
// ---------------------------------------------

app.get("/api/users/search", (req, res) => {
  const search = normalizeUsername(req.query.username);

  if (!search) {
    return res.json({ users: [] });
  }

  const result = users.filter((user) =>
    user.username.includes(search)
  );

  res.json({ users: result });
});

// ---------------------------------------------
// История сообщений между двумя пользователями
// ---------------------------------------------

app.get("/api/messages/:username/:otherUsername", (req, res) => {
  const username = normalizeUsername(req.params.username);
  const otherUsername = normalizeUsername(req.params.otherUsername);

  const result = messages.filter((message) => {
    return (
      (message.from === username && message.to === otherUsername) ||
      (message.from === otherUsername && message.to === username)
    );
  });

  res.json({ messages: result });
});

// ---------------------------------------------
// Socket.io
// ---------------------------------------------

io.on("connection", (socket) => {
  console.log(`Socket подключён: ${socket.id}`);

  socket.on("login", (username) => {
    const normalizedUsername = normalizeUsername(username);

    const userExists = users.some(
      (user) => user.username === normalizedUsername
    );

    if (!userExists) {
      socket.emit("server_error", {
        error: "Пользователь не зарегистрирован."
      });
      return;
    }

    socket.username = normalizedUsername;

    // Личная комната пользователя.
    socket.join(`user:${normalizedUsername}`);

    socket.emit("login_success", {
      username: normalizedUsername
    });

    console.log(
      `@${normalizedUsername} подключился`
    );
  });

  socket.on("send_message", (data) => {
    if (!socket.username) {
      socket.emit("server_error", {
        error: "Сначала войдите в аккаунт."
      });
      return;
    }

    const from = socket.username;
    const to = normalizeUsername(data.to);
    const text = String(data.text || "").trim();

    if (!to || !text) {
      socket.emit("server_error", {
        error: "Укажите получателя и текст сообщения."
      });
      return;
    }

    if (text.length > 2000) {
      socket.emit("server_error", {
        error: "Сообщение слишком длинное."
      });
      return;
    }

    const recipientExists = users.some(
      (user) => user.username === to
    );

    if (!recipientExists) {
      socket.emit("server_error", {
        error: "Получатель не найден."
      });
      return;
    }

    const message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from,
      to,
      text,
      createdAt: new Date().toISOString()
    };

    messages.push(message);

    // Отправляем сообщение всем открытым соединениям
    // отправителя и получателя.
    io.to(`user:${from}`)
      .to(`user:${to}`)
      .emit("new_message", message);

    console.log(`@${from} -> @${to}: ${text}`);
  });

  socket.on("disconnect", () => {
    console.log(`Socket отключён: ${socket.id}`);
  });
});

// ---------------------------------------------
// Запуск
// ---------------------------------------------

server.listen(PORT, "0.0.0.0", () => {
  console.log("");
  console.log("==================================");
  console.log(config.appName);
  console.log("==================================");
  console.log(`Локально: http://localhost:${PORT}`);
  console.log("==================================");
  console.log("");
});
