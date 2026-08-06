// Tiny JSON-file backed metadata store for uploaded files.
// The actual (encrypted) file bytes live in server/uploads/;
// this just tracks who uploaded what, to which room.

const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'data', 'files.json');

function readAll() {
  if (!fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, '[]', 'utf-8');
  }
  try {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

function writeAll(files) {
  fs.writeFileSync(DB_PATH, JSON.stringify(files, null, 2), 'utf-8');
}

function add(fileMeta) {
  const files = readAll();
  files.push(fileMeta);
  writeAll(files);
  return fileMeta;
}

function listByRoom(room) {
  return readAll()
    .filter((f) => f.room === room)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

function findById(id) {
  return readAll().find((f) => f.id === id);
}

module.exports = { readAll, writeAll, add, listByRoom, findById };
