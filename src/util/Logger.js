'use strict';

const colors = require('colors');
const flog = require('fancy-log');

colors.setTheme({
  silly: 'rainbow',
  log: 'grey',
  verbose: 'cyan',
  prompt: 'grey',
  info: 'green',
  data: 'grey',
  help: 'cyan',
  warn: 'yellow',
  debug: 'cyan',
  error: 'red',
});

const logs = ['log', 'info', 'warn', 'error', 'data', 'debug'];

class Logger extends null {}

for (const log of logs) Logger[log] = (source, msg) => flog(`${source} | ${colors[log](msg)}`);

module.exports = Logger;
