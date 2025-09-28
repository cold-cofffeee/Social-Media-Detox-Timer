// Content script for Social Media Detox Timer
class SocialMediaDetoxContent {
  constructor() {
    this.platform = this.detectPlatform();
    this.isBlocked = false;
    this.overlay = null;
    this.timeDisplay = null;
    this.warningShown = false;
    
    if (this.platform) {
      this.init();
    }
  }

  async init() {
    // Wait for page to be fully loaded
    if (document.readyState !== 'complete') {
      window.addEventListener('load', () => this.setup());
    } else {
      this.setup();
    }
  }

  async setup() {
    // Create overlay UI
    this.createOverlay();
    
    // Setup message listener
    this.setupMessageListener();
    
    // Request initial usage data
    await this.requestUsageUpdate();
    
    // Setup visibility change handler for tab switching
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        this.requestUsageUpdate();
      }
    });
  }

  detectPlatform() {
    const hostname = window.location.hostname.toLowerCase().replace(/^www\./, '');
    
    const platforms = {
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram', 
      'twitter.com': 'Twitter',
      'x.com': 'X (Twitter)',
      'tiktok.com': 'TikTok',
      'linkedin.com': 'LinkedIn',
      'reddit.com': 'Reddit',
      'youtube.com': 'YouTube',
      'snapchat.com': 'Snapchat',
      'pinterest.com': 'Pinterest'
    };
    
    for (const [domain, name] of Object.entries(platforms)) {
      if (hostname.includes(domain)) {
        return { domain: domain, name: name };
      }
    }
    
    return null;
  }

  createOverlay() {
    // Create modern draggable overlay
    this.timeDisplay = document.createElement('div');
    this.timeDisplay.id = 'detox-timer-display';
    this.timeDisplay.classList.add('detox-fade-in');
    
    // Get saved position or use default
    const savedPosition = this.getSavedPosition();
    if (savedPosition) {
      this.timeDisplay.style.top = savedPosition.top + 'px';
      this.timeDisplay.style.left = savedPosition.left + 'px';
      this.timeDisplay.style.right = 'auto';
    }
    
    this.timeDisplay.innerHTML = `
      <!-- Header with drag handle -->
      <div class="detox-timer-header" id="detox-drag-handle">
        <div class="detox-timer-brand">
          <span class="icon">⏱️</span>
          <span>Detox Timer</span>
        </div>
        <div class="detox-timer-controls">
          <button id="detox-minimize-btn" class="detox-control-btn" title="Minimize">➖</button>
          <button id="detox-close-btn" class="detox-control-btn" title="Hide">✕</button>
        </div>
      </div>
      
      <!-- Main Content -->
      <div class="detox-timer-main">
        <!-- Time Display -->
        <div class="detox-time-display">
          <div class="detox-current-time" id="detox-session-time">0m</div>
          <div class="detox-platform-name">${this.platform.name} Session</div>
        </div>
        
        <!-- Progress Section -->
        <div class="detox-progress-section">
          <div class="detox-progress-label">
            <span>Daily Progress</span>
            <span id="detox-daily-time">0m / 60m</span>
          </div>
          <div class="detox-progress-bar">
            <div class="detox-progress-fill" id="detox-daily-progress" style="width: 0%"></div>
          </div>
        </div>
        
        <!-- Stats Grid -->
        <div class="detox-stats-grid">
          <div class="detox-stat-item">
            <div class="detox-stat-value" id="detox-today-total">0m</div>
            <div class="detox-stat-label">Today</div>
          </div>
          <div class="detox-stat-item">
            <div class="detox-stat-value" id="detox-session-total">0m</div>
            <div class="detox-stat-label">Session</div>
          </div>
        </div>
        
        <!-- Action Buttons -->
        <div class="detox-actions">
          <button id="detox-focus-btn" class="detox-action-btn primary">
            🎯 Focus Mode
          </button>
          <button id="detox-break-btn" class="detox-action-btn secondary">
            ☕ Take Break
          </button>
        </div>
      </div>
      
      <!-- Mini Mode (hidden by default) -->
      <div class="detox-timer-mini" id="detox-mini-mode" title="Click to expand • Right-click to expand • Ctrl+Shift+E to expand">
        <div class="detox-mini-content">
          <span id="detox-mini-time">0m</span>
          <span class="detox-expand-icon">⤢</span>
        </div>
      </div>
    `;
    
    // Setup drag and drop
    this.setupDragAndDrop();
    
    // Add event listeners
    this.setupEventListeners();
    
    document.body.appendChild(this.timeDisplay);
  }

  setupDragAndDrop() {
    const dragHandle = this.timeDisplay.querySelector('#detox-drag-handle');
    const overlay = this.timeDisplay;
    let isDragging = false;
    let startX, startY, initialX, initialY;

    dragHandle.addEventListener('mousedown', (e) => {
      if (e.target.classList.contains('detox-control-btn')) return;
      
      isDragging = true;
      overlay.classList.add('dragging');
      
      startX = e.clientX;
      startY = e.clientY;
      
      const rect = overlay.getBoundingClientRect();
      initialX = rect.left;
      initialY = rect.top;
      
      e.preventDefault();
    });

    document.addEventListener('mousemove', (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      let newX = initialX + deltaX;
      let newY = initialY + deltaY;
      
      // Keep within viewport bounds
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const overlayWidth = overlay.offsetWidth;
      const overlayHeight = overlay.offsetHeight;
      
      newX = Math.max(0, Math.min(newX, viewportWidth - overlayWidth));
      newY = Math.max(0, Math.min(newY, viewportHeight - overlayHeight));
      
      overlay.style.left = newX + 'px';
      overlay.style.top = newY + 'px';
      overlay.style.right = 'auto';
    });

    document.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        overlay.classList.remove('dragging');
        
        // Save position
        const rect = overlay.getBoundingClientRect();
        this.savePosition({ left: rect.left, top: rect.top });
      }
    });
  }

  setupEventListeners() {
    this.timeDisplay.addEventListener('click', (e) => {
      const target = e.target;
      
      if (target.id === 'detox-focus-btn') {
        this.toggleFocusMode();
      } else if (target.id === 'detox-minimize-btn') {
        this.toggleMinimize();
      } else if (target.id === 'detox-close-btn') {
        this.hideOverlay();
      } else if (target.id === 'detox-break-btn') {
        this.takeBreak();
      } else if (target.id === 'detox-mini-mode' || target.closest('#detox-mini-mode')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleMinimize();
        console.log('Mini mode clicked - expanding');
      }
    });

    // Add double-click listener for extra reliability
    this.timeDisplay.addEventListener('dblclick', (e) => {
      if (this.timeDisplay.classList.contains('minimized')) {
        e.preventDefault();
        e.stopPropagation();
        this.toggleMinimize();
        console.log('Mini mode double-clicked - expanding');
      }
    });

    // Add keyboard shortcut (Ctrl+Shift+E to expand when minimized)
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.shiftKey && e.key === 'E' && this.timeDisplay.classList.contains('minimized')) {
        e.preventDefault();
        this.toggleMinimize();
        console.log('Keyboard shortcut used - expanding');
      }
    });

    // Add right-click context for mini mode
    this.timeDisplay.addEventListener('contextmenu', (e) => {
      if (this.timeDisplay.classList.contains('minimized')) {
        e.preventDefault();
        this.toggleMinimize();
        console.log('Right-click on mini mode - expanding');
      }
    });
  }

  getSavedPosition() {
    const saved = localStorage.getItem('detox-overlay-position');
    return saved ? JSON.parse(saved) : null;
  }

  savePosition(position) {
    localStorage.setItem('detox-overlay-position', JSON.stringify(position));
  }

  setupMessageListener() {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.action) {
        case 'updateUsage':
          this.updateTimeDisplay(message);
          break;
        case 'showWarning':
          this.showWarning(message.message);
          break;
        case 'focusModeChanged':
          this.handleFocusModeChange(message);
          break;
      }
    });
  }

  async requestUsageUpdate() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: 'getUsageStats'
      });
      
      if (response.success) {
        const stats = response.data;
        const sessionTime = Math.floor((stats.sessionUsage[this.platform.domain] || 0) / 60);
        const dailyTime = Math.floor((stats.dailyUsage[this.platform.domain] || 0) / 60);
        
        // Get settings for limits
        const settingsResponse = await chrome.runtime.sendMessage({
          action: 'getSettings'
        });
        
        if (settingsResponse.success) {
          const settings = settingsResponse.data;
          const platformSettings = settings.platforms[this.platform.domain];
          
          this.updateTimeDisplay({
            sessionTime,
            dailyTime,
            sessionLimit: platformSettings?.sessionLimit || 0,
            dailyLimit: platformSettings?.dailyLimit || 0
          });
        }
      }
    } catch (error) {
      console.error('Error requesting usage update:', error);
    }
  }

  updateTimeDisplay(data) {
    if (!this.timeDisplay) return;
    
    const { sessionTime = 0, dailyTime = 0, sessionLimit = 0, dailyLimit = 0 } = data;
    
    // Update main session time display
    const sessionTimeEl = this.timeDisplay.querySelector('#detox-session-time');
    if (sessionTimeEl) {
      sessionTimeEl.textContent = `${sessionTime}m`;
      
      // Add pulse effect if approaching limit
      if (sessionLimit > 0 && (sessionTime / sessionLimit) >= 0.8) {
        sessionTimeEl.classList.add('detox-pulse');
      } else {
        sessionTimeEl.classList.remove('detox-pulse');
      }
    }
    
    // Update daily time with limit
    const dailyTimeEl = this.timeDisplay.querySelector('#detox-daily-time');
    if (dailyTimeEl) {
      const limitText = dailyLimit > 0 ? ` / ${dailyLimit}m` : '';
      dailyTimeEl.textContent = `${dailyTime}m${limitText}`;
    }
    
    // Update stats grid
    const todayTotal = this.timeDisplay.querySelector('#detox-today-total');
    const sessionTotal = this.timeDisplay.querySelector('#detox-session-total');
    
    if (todayTotal) todayTotal.textContent = `${dailyTime}m`;
    if (sessionTotal) sessionTotal.textContent = `${sessionTime}m`;
    
    // Update mini mode
    const miniTime = this.timeDisplay.querySelector('#detox-mini-time');
    if (miniTime) miniTime.textContent = `${sessionTime}m`;
    
    // Update progress bar
    const progressBar = this.timeDisplay.querySelector('#detox-daily-progress');
    if (progressBar && dailyLimit > 0) {
      const percentage = Math.min((dailyTime / dailyLimit) * 100, 100);
      progressBar.style.width = `${percentage}%`;
      
      // Change progress bar color based on usage
      const progressFill = progressBar;
      if (percentage >= 90) {
        progressFill.style.background = 'linear-gradient(90deg, #f44336 0%, #d32f2f 100%)';
      } else if (percentage >= 75) {
        progressFill.style.background = 'linear-gradient(90deg, #ff9800 0%, #f57c00 100%)';
      } else {
        progressFill.style.background = 'linear-gradient(90deg, #4CAF50 0%, #81C784 100%)';
      }
    }
    
    // Show warning if approaching limit
    if (dailyLimit > 0 && dailyTime >= dailyLimit * 0.9 && !this.warningShown) {
      this.showWarning(`⚠️ You're approaching your daily limit! ${dailyTime}/${dailyLimit} minutes used.`);
      this.warningShown = true;
    }
  }

  updateVisualState(sessionTime, dailyTime, sessionLimit, dailyLimit) {
    // Add classes based on usage levels
    const container = this.timeDisplay;
    
    container.classList.remove('usage-low', 'usage-medium', 'usage-high', 'usage-exceeded');
    
    const dailyPercentage = dailyLimit > 0 ? (dailyTime / dailyLimit) : 0;
    
    if (dailyPercentage >= 1) {
      container.classList.add('usage-exceeded');
    } else if (dailyPercentage >= 0.75) {
      container.classList.add('usage-high');
    } else if (dailyPercentage >= 0.5) {
      container.classList.add('usage-medium');
    } else {
      container.classList.add('usage-low');
    }
  }

  showWarning(message) {
    // Create warning overlay
    const warningOverlay = document.createElement('div');
    warningOverlay.className = 'detox-warning-overlay';
    warningOverlay.innerHTML = `
      <div class="detox-warning-content">
        <div class="detox-warning-icon">⚠️</div>
        <div class="detox-warning-message">${message}</div>
        <div class="detox-warning-actions">
          <button class="detox-btn detox-btn-primary" id="detox-warning-ok">OK</button>
          <button class="detox-btn detox-btn-secondary" id="detox-warning-focus">Start Focus Mode</button>
        </div>
      </div>
    `;
    
    warningOverlay.addEventListener('click', (e) => {
      if (e.target.id === 'detox-warning-ok') {
        warningOverlay.remove();
      } else if (e.target.id === 'detox-warning-focus') {
        this.toggleFocusMode();
        warningOverlay.remove();
      }
    });
    
    document.body.appendChild(warningOverlay);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      if (warningOverlay.parentNode) {
        warningOverlay.remove();
      }
    }, 5000);
  }

  async toggleFocusMode() {
    try {
      // Show focus mode dialog
      const duration = await this.showFocusModeDialog();
      if (duration) {
        await chrome.runtime.sendMessage({
          action: 'toggleFocusMode',
          duration: duration
        });
      }
    } catch (error) {
      console.error('Error toggling focus mode:', error);
    }
  }

  showFocusModeDialog() {
    return new Promise((resolve) => {
      const dialog = document.createElement('div');
      dialog.className = 'detox-focus-dialog';
      dialog.innerHTML = `
        <div class="detox-focus-content">
          <h3>🎯 Focus Mode</h3>
          <p>Block all social media sites for:</p>
          <div class="detox-focus-options">
            <button class="detox-focus-option" data-duration="15">15 minutes</button>
            <button class="detox-focus-option" data-duration="30">30 minutes</button>
            <button class="detox-focus-option" data-duration="60">1 hour</button>
            <button class="detox-focus-option" data-duration="120">2 hours</button>
          </div>
          <div class="detox-focus-actions">
            <button class="detox-btn detox-btn-secondary" id="detox-focus-cancel">Cancel</button>
          </div>
        </div>
      `;
      
      dialog.addEventListener('click', (e) => {
        if (e.target.classList.contains('detox-focus-option')) {
          const duration = parseInt(e.target.dataset.duration);
          dialog.remove();
          resolve(duration);
        } else if (e.target.id === 'detox-focus-cancel') {
          dialog.remove();
          resolve(null);
        }
      });
      
      document.body.appendChild(dialog);
    });
  }

  toggleMinimize() {
    this.timeDisplay.classList.toggle('minimized');
  }

  handleFocusModeChange(message) {
    if (message.focusMode) {
      this.showFocusActiveNotification(message.focusUntil);
    }
  }

  showFocusActiveNotification(focusUntil) {
    const notification = document.createElement('div');
    notification.className = 'detox-focus-notification';
    notification.innerHTML = `
      <div class="detox-focus-notification-content">
        <div class="detox-focus-notification-icon">🎯</div>
        <div class="detox-focus-notification-text">
          <strong>Focus Mode Active</strong><br>
          All social media sites are blocked until ${new Date(focusUntil).toLocaleTimeString()}
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 3000);
  }

  showMotivationalMessage() {
    const messages = [
      "🌟 Great job staying mindful of your time!",
      "💪 You're building healthier habits!",
      "🎯 Focus brings you closer to your goals!",
      "✨ Every mindful moment counts!",
      "🚀 You're in control of your digital life!",
      "🧘 Taking breaks helps you stay refreshed!",
      "🎉 Celebrate your progress!",
      "💎 Quality time is better than quantity!",
      "🌱 You're growing stronger every day!",
      "🏆 Self-control is a superpower!"
    ];
    
    const randomMessage = messages[Math.floor(Math.random() * messages.length)];
    
    const messageEl = document.createElement('div');
    messageEl.className = 'detox-motivational-message';
    messageEl.textContent = randomMessage;
    
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.remove();
      }
    }, 4000);
  }

  toggleMinimize() {
    this.timeDisplay.classList.toggle('minimized');
  }

  hideOverlay() {
    if (this.timeDisplay) {
      this.timeDisplay.style.display = 'none';
    }
  }

  takeBreak() {
    // Close current tab and show motivational message
    this.showMotivationalMessage();
    setTimeout(() => {
      window.close();
    }, 2000);
  }
}

// Initialize the content script
if (document.readyState !== 'loading') {
  new SocialMediaDetoxContent();
} else {
  document.addEventListener('DOMContentLoaded', () => {
    new SocialMediaDetoxContent();
  });
}