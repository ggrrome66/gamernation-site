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

function toggleDrone() {
  const droneSection = document.getElementById('drone');
  droneSection.style.display = droneSection.style.display === 'none' ? 'block' : 'none';
}

function toggleVideo() {
  const panel = document.getElementById('videoPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}
