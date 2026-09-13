// setup.js
// Простая консольная настройка приложения.

const fs = require("fs");
const readline = require("readline");

const configPath = "./config.json";

const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, resolve);
  });
}

async function main() {
  console.log("\n=== Настройка Messenger MVP ===\n");

  const appName = await ask(
    `Название приложения [${config.appName}]: `
  );

  const port = await ask(
    `Порт сервера [${config.port}]: `
  );

  if (appName.trim()) {
    config.appName = appName.trim();
  }

  if (port.trim()) {
    const parsedPort = Number(port.trim());

    if (!Number.isInteger(parsedPort) || parsedPort < 1 || parsedPort > 65535) {
      console.log("Некорректный порт. Оставляю старый.");
    } else {
      config.port = parsedPort;
    }
  }

  fs.writeFileSync(
    configPath,
    JSON.stringify(config, null, 2) + "\n",
    "utf8"
  );

  console.log("\nНастройки сохранены в config.json.");
  console.log("Запуск: npm start\n");

  rl.close();
}

main();
