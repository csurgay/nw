const nwCanvas = document.getElementById('nwCanvas');
const ctx = nwCanvas.getContext('2d');
const consoleArea = document.getElementById('nwConsole');
const terminal = new Terminal(consoleArea);
const shell = new Shell(terminal);
const test = new Test(terminal, shell);
let tooltip = null; // object currently showing tooltip
