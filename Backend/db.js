const mysql = require("mysql2");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306
});

db.connect(err => {
  if(err) console.error("Connection error:", err);
  else console.log("✅ MySQL connected successfully!");
});

module.exports = db;


// const mysql = require('mysql2');

// const db = mysql.createConnection({
//   host: "localhost",
//   user: "root",
//   password: "Harshgupta3034@", // your MySQL password
//   database: "chatdb",
//   port: 3306
// });

// db.connect((err) => {
//   if(err) console.error('Connection error:', err);
//   else console.log('MySQL connected successfully!');
// });

// module.exports = db;
