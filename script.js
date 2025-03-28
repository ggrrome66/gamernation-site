// GamerNation Inc. Retro Terminal Script
(function(){
  // Track current section and state flags
  let currentSection = "home";
  let videoShown = false;
  let rndStarted = false;

  // Initialize Typed.js effect on the intro text&#8203;:contentReference[oaicite:5]{index=5}
  var typed = new Typed('#intro-text', {
    strings: ['Booting GamerNation Inc...'],
    typeSpeed: 50,
    showCursor: true,
    cursorChar: '_',
    onComplete: function() {
      // Reveal navigation after intro typing finishes
      document.getElementById('nav').style.visibility = 'visible';
    }
  });

  // Function to show a section by id and hide others
  function showSection(targetId) {
    // Hide all sections and show the target section
    document.querySelectorAll('.section').forEach(sec => {
      sec.style.display = (sec.id === targetId ? 'block' : 'none');
    });
    currentSection = targetId;
    // If entering R&D section, start loading bar animation if not already started
    if (targetId === 'rnd' && !rndStarted) {
      startProgressBar();
      rndStarted = true;
    }
  }

  // Attach click events to navigation items
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      const target = item.getAttribute('data-target');
      showSection(target);
    });
  });

  // Handle "Press Enter to Watch" for Marketing video
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && currentSection === 'marketing' && !videoShown) {
      // Show the embedded video, hide the prompt
      document.getElementById('marketingVideo').style.display = 'block';
      const prompt = document.getElementById('videoPrompt');
      if (prompt) prompt.style.display = 'none';
      videoShown = true;
    }
  });
  // Also allow clicking the prompt text to trigger the video
  const videoPromptEl = document.getElementById('videoPrompt');
  if (videoPromptEl) {
    videoPromptEl.addEventListener('click', () => {
      // Simulate pressing Enter key
      document.dispatchEvent(new KeyboardEvent('keydown', {'key': 'Enter'}));
    });
  }

  // Crypto price ticker update function using CoinGecko API&#8203;:contentReference[oaicite:6]{index=6}&#8203;:contentReference[oaicite:7]{index=7}
  function updateTicker() {
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd')
      .then(response => response.json())
      .then(data => {
        const btcPrice = data.bitcoin.usd;
        const ethPrice = data.ethereum.usd;
        const tickerEl = document.getElementById('ticker');
        if (tickerEl) {
          tickerEl.textContent = `BTC: $${btcPrice.toLocaleString()} , ETH: $${ethPrice.toLocaleString()}`;
        }
      })
      .catch(err => console.error("Ticker fetch error:", err));
  }
  // Initial ticker update and then update every 60 seconds
  updateTicker();
  setInterval(updateTicker, 60000);

  // Progress bar simulation for R&D section (loading bar animation)
  function startProgressBar() {
    const barEl = document.getElementById('loading-bar');
    if (!barEl) return;
    let progress = 0;
    const barLength = 20;
    const interval = setInterval(() => {
      progress += 2; // increment progress by 2%
      if (progress > 100) progress = 100;
      // Build the bar string with '#' filled proportionally
      const filledCount = Math.round((progress / 100) * barLength);
      const barStr = '#'.repeat(filledCount) + ' '.repeat(barLength - filledCount);
      barEl.textContent = `[${barStr}] ${progress}%`;
      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 100);
  }
})();
