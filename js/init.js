const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');
const consoleArea = document.getElementById('nwConsole');
const terminal = new Terminal(consoleArea);
const shell = new Shell(terminal);
const test = new Test(terminal, shell);
let tooltip = null; // object currently showing tooltip
