require("dotenv").config();

const mysql = require("mysql2/promise");

const DB_CONFIG = {
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASS || "",
  database: process.env.DB_NAME || "chatdb",
  port: Number(process.env.DB_PORT) || 3306,

  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

const db = mysql.createPool(DB_CONFIG);

async function query(sql, params = []) {
  const [result] = await db.execute(sql, params);
  return result;
}

async function initDatabase() {

  // USERS
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      username VARCHAR(30) NOT NULL UNIQUE,
      password VARCHAR(255) NOT NULL,
      last_seen DATETIME NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);

  // CONVERSATIONS
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversations (
      id INT AUTO_INCREMENT PRIMARY KEY,
      type ENUM('direct') NOT NULL DEFAULT 'direct',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);

  // CONVERSATION MEMBERS
  await db.execute(`
    CREATE TABLE IF NOT EXISTS conversation_members (
      conversation_id INT NOT NULL,
      user_id INT NOT NULL,

      PRIMARY KEY (conversation_id, user_id),

      CONSTRAINT fk_cm_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_cm_user
        FOREIGN KEY (user_id)
        REFERENCES users(id)
        ON DELETE CASCADE
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);

  // MESSAGES
  await db.execute(`
    CREATE TABLE IF NOT EXISTS messages (
      id INT AUTO_INCREMENT PRIMARY KEY,

      conversation_id INT NOT NULL,
      sender_id INT NOT NULL,
      receiver_id INT NOT NULL,

      message TEXT NOT NULL,

      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT fk_message_conversation
        FOREIGN KEY (conversation_id)
        REFERENCES conversations(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_message_sender
        FOREIGN KEY (sender_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

      CONSTRAINT fk_message_receiver
        FOREIGN KEY (receiver_id)
        REFERENCES users(id)
        ON DELETE CASCADE,

      INDEX idx_conversation_time (
        conversation_id,
        created_at,
        id
      ),

      INDEX idx_sender (sender_id),
      INDEX idx_receiver (receiver_id)
    )
    ENGINE=InnoDB
    DEFAULT CHARSET=utf8mb4
    COLLATE=utf8mb4_unicode_ci
  `);

  console.log("✅ Database tables ready!");
}

async function startDatabase() {
  try {
    await db.query("SELECT 1");

    console.log("✅ MySQL connected successfully!");

    await initDatabase();

    return true;

  } catch (error) {

    console.error(
      "❌ MySQL connection/setup failed:",
      error.message
    );

    return false;
  }
}

module.exports = {
  db,
  query,
  initDatabase,
  startDatabase
};