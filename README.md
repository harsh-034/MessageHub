chat-app/
│
├── backend/
│   ├── server.js
│   ├── db.js
│   └── package.json
│
├── frontend/
│   ├── index.html
│   ├── style.css
│   └── script.js
│
└── README.md
# Chat App - Fun Friday Group

## Features
- Multi-user chat with self vs other message colors
- Auto-refresh messages every 2 seconds
- Delete own messages using trash icon
- Fully functional backend with Node.js + Express + MySQL

## Setup

### Backend
1. Go to backend folder:

2. Install dependencies:

3. Create MySQL database & table:
```sql
CREATE DATABASE chatdb;
USE chatdb;

CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) DEFAULT 'Anonymous',
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

npm start
