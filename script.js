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

function toggleVideo() {
  const panel = document.getElementById('videoPanel');
  panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
}

function showSection(sectionId, titleText) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(sec => {
    sec.style.display = 'none';
  });

  // Show selected section
  const section = document.getElementById(sectionId);
  if (section) section.style.display = 'block';

  // Update header title
  const title = document.getElementById('title');
  title.textContent = 'GAMERNATION INC. — ' + titleText;
}
