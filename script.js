const terminal = document.getElementById('terminal');
const lines = [
  '> Initializing system...',
  '> Loading divisions...',
  '> Establishing uplink...',
  '> Welcome to GamerNation Inc.',
  '',
  '> Select a division below to continue:'
];

let i = 0;

function typeLine() {
  if (i < lines.length) {
    terminal.innerHTML += lines[i] + '\n';
    i++;
    setTimeout(typeLine, 300);
  }
}

window.onload = typeLine;
