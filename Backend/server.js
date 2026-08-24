require("dotenv").config();

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("./db");

const app = express();

const PORT = 5000;

const JWT_SECRET =
  process.env.JWT_SECRET ||
  "messagehub_secret_change_this";

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json());

app.use(
  express.static(
    path.join(__dirname, "../frontend")
  )
);

// =====================================================
// HELPERS
// =====================================================

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      username: user.username
    },
    JWT_SECRET,
    {
      expiresIn: "7d"
    }
  );
}

// =====================================================
// AUTH MIDDLEWARE
// =====================================================

function auth(req, res, next) {
  const header =
    req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      error: "Authentication required"
    });
  }

  const token = header.substring(7);

  try {
    const decoded =
      jwt.verify(token, JWT_SECRET);

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired session"
    });
  }
}

// =====================================================
// FRONTEND
// =====================================================

app.get("/", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "../frontend/index.html"
    )
  );
});

// =====================================================
// REGISTER
// =====================================================

app.post("/api/register", async (req, res) => {
  try {
    const username = String(
      req.body.username || ""
    ).trim();

    const password = String(
      req.body.password || ""
    );

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error:
          "Username and password are required"
      });
    }

    if (username.length < 2) {
      return res.status(400).json({
        success: false,
        error:
          "Username must contain at least 2 characters"
      });
    }

    if (username.length > 30) {
      return res.status(400).json({
        success: false,
        error:
          "Username cannot exceed 30 characters"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error:
          "Password must contain at least 6 characters"
      });
    }

    const [existing] =
      await db.db.query(
        `
        SELECT id
        FROM users
        WHERE username = ?
        LIMIT 1
        `,
        [username]
      );

    if (existing.length > 0) {
      return res.status(409).json({
        success: false,
        error: "Username already exists"
      });
    }

    const hashedPassword =
      await bcrypt.hash(password, 10);

    const [result] =
      await db.db.query(
        `
        INSERT INTO users
        (
          username,
          password,
          last_seen
        )
        VALUES (?, ?, NOW())
        `,
        [
          username,
          hashedPassword
        ]
      );

    const user = {
      id: result.insertId,
      username
    };

    const token =
      createToken(user);

    return res.status(201).json({
      success: true,
      token,
      user
    });

  } catch (error) {
    console.error(
      "Register error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Registration failed"
    });
  }
});

// =====================================================
// LOGIN
// =====================================================

app.post("/api/login", async (req, res) => {
  try {
    const username = String(
      req.body.username || ""
    ).trim();

    const password = String(
      req.body.password || ""
    );

    if (!username || !password) {
      return res.status(400).json({
        success: false,
        error:
          "Username and password are required"
      });
    }

    const [rows] =
      await db.db.query(
        `
        SELECT
          id,
          username,
          password
        FROM users
        WHERE username = ?
        LIMIT 1
        `,
        [username]
      );

    if (rows.length === 0) {
      return res.status(401).json({
        success: false,
        error:
          "Invalid username or password"
      });
    }

    const user = rows[0];

    const valid =
      await bcrypt.compare(
        password,
        user.password
      );

    if (!valid) {
      return res.status(401).json({
        success: false,
        error:
          "Invalid username or password"
      });
    }

    await db.db.query(
      `
      UPDATE users
      SET last_seen = NOW()
      WHERE id = ?
      `,
      [user.id]
    );

    const cleanUser = {
      id: user.id,
      username: user.username
    };

    const token =
      createToken(cleanUser);

    return res.json({
      success: true,
      token,
      user: cleanUser
    });

  } catch (error) {
    console.error(
      "Login error:",
      error
    );

    return res.status(500).json({
      success: false,
      error: "Login failed"
    });
  }
});

// =====================================================
// CURRENT USER
// =====================================================

app.get(
  "/api/me",
  auth,
  async (req, res) => {
    try {
      await db.db.query(
        `
        UPDATE users
        SET last_seen = NOW()
        WHERE id = ?
        `,
        [req.user.id]
      );

      const [rows] =
        await db.db.query(
          `
          SELECT
            id,
            username,
            last_seen
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [req.user.id]
        );

      if (rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }

      return res.json({
        success: true,
        user: rows[0]
      });

    } catch (error) {
      console.error(
        "Current user error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to load current user"
      });
    }
  }
);

// =====================================================
// USERS
// =====================================================

app.get(
  "/api/users",
  auth,
  async (req, res) => {
    try {
      await db.db.query(
        `
        UPDATE users
        SET last_seen = NOW()
        WHERE id = ?
        `,
        [req.user.id]
      );

      const [users] =
        await db.db.query(
          `
          SELECT
            id,
            username,
            last_seen,

            CASE
              WHEN last_seen >=
                DATE_SUB(
                  NOW(),
                  INTERVAL 45 SECOND
                )
              THEN 1
              ELSE 0
            END AS online

          FROM users

          WHERE id <> ?

          ORDER BY username ASC
          `,
          [req.user.id]
        );

      return res.json({
        success: true,
        users
      });

    } catch (error) {
      console.error(
        "Users error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to load users"
      });
    }
  }
);

// =====================================================
// FIND OR CREATE DIRECT CONVERSATION
// =====================================================

async function getOrCreateConversation(
  userA,
  userB
) {
  const [rows] =
    await db.db.query(
      `
      SELECT
        c.id

      FROM conversations c

      JOIN conversation_members cm1
        ON cm1.conversation_id = c.id

      JOIN conversation_members cm2
        ON cm2.conversation_id = c.id

      WHERE
        c.type = 'direct'
        AND cm1.user_id = ?
        AND cm2.user_id = ?

      LIMIT 1
      `,
      [
        userA,
        userB
      ]
    );

  if (rows.length > 0) {
    return rows[0].id;
  }

  const connection =
    await db.db.getConnection();

  try {
    await connection.beginTransaction();

    const [conversation] =
      await connection.query(
        `
        INSERT INTO conversations
        (
          type
        )
        VALUES
        ('direct')
        `
      );

    const conversationId =
      conversation.insertId;

    await connection.query(
      `
      INSERT INTO conversation_members
      (
        conversation_id,
        user_id
      )
      VALUES
      (?, ?),
      (?, ?)
      `,
      [
        conversationId,
        userA,
        conversationId,
        userB
      ]
    );

    await connection.commit();

    return conversationId;

  } catch (error) {
    await connection.rollback();
    throw error;

  } finally {
    connection.release();
  }
}

// =====================================================
// GET MESSAGES
// =====================================================

app.get(
  "/api/messages/:receiverId",
  auth,
  async (req, res) => {
    try {
      const receiverId =
        Number(
          req.params.receiverId
        );

      if (
        !Number.isInteger(receiverId) ||
        receiverId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid receiver"
        });
      }

      if (
        receiverId ===
        Number(req.user.id)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "You cannot message yourself"
        });
      }

      const [receiver] =
        await db.db.query(
          `
          SELECT
            id
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [receiverId]
        );

      if (receiver.length === 0) {
        return res.status(404).json({
          success: false,
          error:
            "Receiver not found"
        });
      }

      const conversationId =
        await getOrCreateConversation(
          Number(req.user.id),
          receiverId
        );

      const [member] =
        await db.db.query(
          `
          SELECT
            user_id

          FROM conversation_members

          WHERE
            conversation_id = ?
            AND user_id = ?

          LIMIT 1
          `,
          [
            conversationId,
            req.user.id
          ]
        );

      if (member.length === 0) {
        return res.status(403).json({
          success: false,
          error:
            "You are not a member of this conversation"
        });
      }

      const [messages] =
        await db.db.query(
          `
          SELECT
            m.id,
            m.sender_id,
            m.receiver_id,
            m.message,
            m.created_at,
            u.username

          FROM messages m

          JOIN users u
            ON u.id = m.sender_id

          WHERE
            m.conversation_id = ?

          ORDER BY
            m.created_at ASC,
            m.id ASC
          `,
          [conversationId]
        );

      return res.json({
        success: true,
        messages
      });

    } catch (error) {
      console.error(
        "Messages error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to load messages"
      });
    }
  }
);

// =====================================================
// SEND MESSAGE
// =====================================================

app.post(
  "/api/messages",
  auth,
  async (req, res) => {
    try {
      const receiverId =
        Number(
          req.body.receiverId
        );

      const message =
        String(
          req.body.message || ""
        ).trim();

      if (
        !Number.isInteger(receiverId) ||
        receiverId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid receiver"
        });
      }

      if (!message) {
        return res.status(400).json({
          success: false,
          error:
            "Message cannot be empty"
        });
      }

      if (message.length > 5000) {
        return res.status(400).json({
          success: false,
          error:
            "Message is too long"
        });
      }

      if (
        receiverId ===
        Number(req.user.id)
      ) {
        return res.status(400).json({
          success: false,
          error:
            "You cannot message yourself"
        });
      }

      const [receiver] =
        await db.db.query(
          `
          SELECT
            id
          FROM users
          WHERE id = ?
          LIMIT 1
          `,
          [receiverId]
        );

      if (receiver.length === 0) {
        return res.status(404).json({
          success: false,
          error:
            "Receiver not found"
        });
      }

      const conversationId =
        await getOrCreateConversation(
          Number(req.user.id),
          receiverId
        );

      const [result] =
        await db.db.query(
          `
          INSERT INTO messages
          (
            conversation_id,
            sender_id,
            receiver_id,
            message
          )
          VALUES (?, ?, ?, ?)
          `,
          [
            conversationId,
            Number(req.user.id),
            receiverId,
            message
          ]
        );

      await db.db.query(
        `
        UPDATE users
        SET last_seen = NOW()
        WHERE id = ?
        `,
        [Number(req.user.id)]
      );

      return res.status(201).json({
        success: true,
        messageId:
          result.insertId,
        conversationId
      });

    } catch (error) {
      console.error(
        "Send message error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to send message"
      });
    }
  }
);

// =====================================================
// DELETE MESSAGE
// =====================================================

app.delete(
  "/api/messages/:id",
  auth,
  async (req, res) => {
    try {
      const messageId =
        Number(
          req.params.id
        );

      if (
        !Number.isInteger(messageId) ||
        messageId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error:
            "Invalid message ID"
        });
      }

      const [result] =
        await db.db.query(
          `
          DELETE FROM messages

          WHERE
            id = ?
            AND sender_id = ?
          `,
          [
            messageId,
            req.user.id
          ]
        );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error:
            "Message not found or not owned by you"
        });
      }

      return res.json({
        success: true,
        message:
          "Message deleted successfully"
      });

    } catch (error) {
      console.error(
        "Delete message error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to delete message"
      });
    }
  }
);

// =====================================================
// DELETE CURRENT USER
// =====================================================

app.delete(
  "/api/me",
  auth,
  async (req, res) => {
    try {
      const userId =
        Number(req.user.id);

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {
        return res.status(400).json({
          success: false,
          error: "Invalid user ID"
        });
      }

      // Delete user's messages
      await db.db.query(
        `
        DELETE FROM messages
        WHERE sender_id = ?
        OR receiver_id = ?
        `,
        [
          userId,
          userId
        ]
      );

      // Delete user's conversation memberships
      await db.db.query(
        `
        DELETE FROM conversation_members
        WHERE user_id = ?
        `,
        [userId]
      );

      // Delete user
      const [result] =
        await db.db.query(
          `
          DELETE FROM users
          WHERE id = ?
          `,
          [userId]
        );

      if (result.affectedRows === 0) {
        return res.status(404).json({
          success: false,
          error: "User not found"
        });
      }

      return res.json({
        success: true,
        message:
          "User deleted successfully"
      });

    } catch (error) {
      console.error(
        "Delete user error:",
        error
      );

      return res.status(500).json({
        success: false,
        error:
          "Failed to delete user"
      });
    }
  }
);

// =====================================================
// START SERVER
// =====================================================

async function startServer() {
  try {
    const databaseReady =
      await db.startDatabase();

    if (!databaseReady) {
      console.error(
        "❌ Server stopped because database is unavailable."
      );

      process.exit(1);
    }

    app.listen(
      PORT,
      () => {
        console.log("");
        console.log(
          "🚀 MessageHub server running"
        );

        console.log(
          `👉 http://localhost:${PORT}`
        );

        console.log("");
      }
    );

  } catch (error) {
    console.error(
      "❌ Server startup failed:",
      error
    );

    process.exit(1);
  }
}

startServer();