const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');
const term = document.getElementById('nwConsole');
const shell = new Shell(Shell.consolePrompt);
let tooltip = null; // object currently showing tooltip
