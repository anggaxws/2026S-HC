const path = require('path');
const express = require('express');
const http = require('http');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const socketIo = require('socket.io');

const SERIAL_PORT = process.env.SERIAL_PORT || 'COM8';
const SERIAL_BAUD = parseInt(process.env.SERIAL_BAUD || '9600', 10);
const HTTP_PORT = parseInt(process.env.PORT || '3000', 10);
const MIN_ANGLE = 15;
const MAX_ANGLE = 180;
const MIN_DISTANCE = 1;
const MAX_DISTANCE = 300;

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

app.use(express.static(path.join(__dirname, 'public')));

let serialPort;
let parser;

function openSerialPort() {
  serialPort = new SerialPort({ path: SERIAL_PORT, baudRate: SERIAL_BAUD, autoOpen: false });
  parser = serialPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

  serialPort.open((err) => {
    if (err) {
      console.error(`Failed to open serial port ${SERIAL_PORT}:`, err.message);
      io.emit('status', { connected: false, message: err.message });
      return;
    }
    console.log(`Serial port ${SERIAL_PORT} opened at ${SERIAL_BAUD} baud.`);
    io.emit('status', { connected: true, message: `Terhubung ke ${SERIAL_PORT}` });
  });

  serialPort.on('error', (err) => {
    console.error('Serial port error:', err.message);
    io.emit('status', { connected: false, message: err.message });
  });

  parser.on('data', (line) => {
    const trimmed = line.trim().replace(/\.$/, '');
    if (!trimmed) return;

    const parts = trimmed.split(',').map((value) => value.trim());
    if (parts.length < 2) {
      console.warn('Unrecognized serial line:', trimmed);
      return;
    }

    const angle = parseFloat(parts[0]);
    const distance = parseFloat(parts[1]);
    if (Number.isNaN(angle) || Number.isNaN(distance)) {
      console.warn('Invalid serial data:', trimmed);
      return;
    }

    const valid =
      angle >= MIN_ANGLE &&
      angle <= MAX_ANGLE &&
      distance >= MIN_DISTANCE &&
      distance <= MAX_DISTANCE;

    const reading = { angle, distance, valid, raw: trimmed, timestamp: Date.now() };
    io.emit('reading', reading);
  });
}

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.emit('status', { connected: serialPort?.isOpen ?? false, message: `Port: ${SERIAL_PORT}` });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

server.listen(HTTP_PORT, () => {
  console.log(`Dashboard server running at http://localhost:${HTTP_PORT}`);
  openSerialPort();
});
