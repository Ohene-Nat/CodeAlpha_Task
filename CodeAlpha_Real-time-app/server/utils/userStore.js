// A tiny JSON-file backed "database" for users.
// Swap this out for a real database (Postgres/Mongo) in production —
// the interface below is the only thing the rest of the app depends on.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'users.json');

function readAll() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]', 'utf-8');
  }
  const raw = fs.readFileSync(DB_PATH, 'utf-8');
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function writeAll(users) {
  fs.writeFileSync(DB_PATH, JSON.stringify(users, null, 2), 'utf-8');
}

function findByEmail(email) {
  return readAll().find((u) => u.email.toLowerCase() === email.toLowerCase());
}

function findById(id) {
  return readAll().find((u) => u.id === id);
}

function create(user) {
  const users = readAll();
  users.push(user);
  writeAll(users);
  return user;
}

module.exports = { readAll, writeAll, findByEmail, findById, create };
