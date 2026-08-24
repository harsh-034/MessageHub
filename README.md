# MessageHub

MessageHub is a modern private messaging web app built with Node.js, Express, MySQL, HTML, CSS, and JavaScript.

![MessageHub](screenshot.png)

## Features

- 🔐 Login & Registration
- 💬 Private messaging
- 🟢 Online/Offline status
- 🔎 User search
- ⚡ Automatic message updates
- 🗑️ Delete messages
- 👤 Delete account
- 🔒 JWT authentication
- 🔑 Bcrypt password security
- 📱 Responsive UI

## Tech Stack

Node.js • Express • MySQL • JavaScript • HTML • CSS • JWT • Bcrypt

## Installation

```bash
npm install
node server.js

## Installation

POST   /api/register
POST   /api/login
GET    /api/me
GET    /api/users
GET    /api/messages/:receiverId
POST   /api/messages
DELETE /api/messages/:id
DELETE /api/account

## Security

MessageHub uses JWT authentication and Bcrypt password hashing. Users can only delete their own messages and account.

## License
For educational and personal use.