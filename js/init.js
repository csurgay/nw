const canvas = document.getElementById('nwCanvas');
const ctx = canvas.getContext('2d');
const term = document.getElementById('nwConsole');
let prompt = "[root@console ~]# ";
let command = "";
term.value = prompt;
let tooltip = null; // object currently showing tooltip
