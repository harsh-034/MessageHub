const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const db = require("./db");

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Get all messages
app.get("/messages", (req, res) => {
  db.query("SELECT * FROM messages ORDER BY timestamp ASC", (err, results) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(results);
  });
});

// Send message
app.post("/send", (req, res) => {
  const { username, message } = req.body;
  const sql = "INSERT INTO messages (username, message) VALUES (?, ?)";
  db.query(sql, [username || "Anonymous", message], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true, id: result.insertId });
  });
});

// Delete message
app.delete("/delete/:id", (req, res) => {
  const { id } = req.params;
  db.query("DELETE FROM messages WHERE id = ?", [id], (err, result) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ success: true });
  });
});

app.listen(5000, () => {
  console.log("🚀 Server running on http://localhost:5000");
});
