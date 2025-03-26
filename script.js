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

function showSection(sectionId, asciiArt) {
  document.querySelectorAll('.section').forEach(sec => {
    sec.style.display = 'none';
  });
  const section = document.getElementById(sectionId);
  const header = document.getElementById('ascii-header');
  if (section) section.style.display = 'block';
  if (header) header.textContent = asciiArt;
}

const marketingArt = `
  __  __                 _             _   _             
 |  \/  |               | |           | | (_)            
 | \  / | ___  _ __ ___ | |__   ___   | |_ _  ___  _ __  
 | |\/| |/ _ \| '__/ _ \| '_ \ / _ \  | __| |/ _ \| '_ \ 
 | |  | | (_) | | | (_) | |_) | (_) | | |_| | (_) | | | |
 |_|  |_|\___/|_|  \___/|_.__/ \___/   \__|_|\___/|_| |_|
`;

const droneArt = `
  ____                        ____  _             _       
 |  _ \ _ __ ___   ___ ___  |  _ \(_)_ __   __ _| |_ ___ 
 | | | | '__/ _ \ / __/ _ \ | | | | | '_ \ / _\` | __/ _ \
 | |_| | | | (_) | (_|  __/ | |_| | | | | | (_| | ||  __/
 |____/|_|  \___/ \___\___| |____/|_|_| |_|\__,_|\__\___|
`;

const manufacturingArt = `
  __  __                 _                      _   _             
 |  \/  |               | |                    | | (_)            
 | \  / | ___  _ __ ___ | |__   ___  _   _  ___| |_ _  ___  _ __  
 | |\/| |/ _ \| '__/ _ \| '_ \ / _ \| | | |/ __| __| |/ _ \| '_ \ 
 | |  | | (_) | | | (_) | |_) | (_) | |_| | (__| |_| | (_) | | | |
 |_|  |_|\___/|_|  \___/|_.__/ \___/ \__,_|\___|\__|_|\___/|_| |_|
`;

const investingArt = `
  _____                 _           _             
 |_   _|               | |         (_)            
   | |  _ __  ___  ___ | |__   __ _ _ _ __   __ _ 
   | | | '_ \/ __|/ _ \| '_ \ / _\` | | '_ \ / _\` |
  _| |_| | | \__ \ (_) | |_) | (_| | | | | | (_| |
 |_____|_| |_|___/\___/|_.__/ \__, |_|_| |_|\__, |
                               __/ |         __/ |
                              |___/         |___/ 
`;

const rndArt = `
  _____                 _                         _   _           
 |  __ \               | |                       | | (_)          
 | |__) |___  __ _  ___| |_ ___  _ __   ___ _ __ | |_ _  ___  ___ 
 |  _  // _ \/ _\` |/ __| __/ _ \| '_ \ / _ \ '_ \| __| |/ _ \/ __|
 | | \ \  __/ (_| | (__| || (_) | | | |  __/ | | | |_| |  __/\__ \
 |_|  \_\___|\__,_|\___|\__\___/|_| |_|\___|_| |_|\__|_|\___||___/
`;
