// Background service worker for Social Media Detox Timer
class DetoxTimer {
  constructor() {
    this.initializeStorage();
    this.setupEventListeners();
    this.startDailyReset();
  }

  async initializeStorage() {
    const defaultSettings = {
      platforms: {
        'facebook.com': { enabled: true, dailyLimit: 30, sessionLimit: 15, isCustom: false },
        'instagram.com': { enabled: true, dailyLimit: 45, sessionLimit: 20, isCustom: false },
        'twitter.com': { enabled: true, dailyLimit: 30, sessionLimit: 15, isCustom: false },
        'x.com': { enabled: true, dailyLimit: 30, sessionLimit: 15, isCustom: false },
        'tiktok.com': { enabled: true, dailyLimit: 60, sessionLimit: 30, isCustom: false },
        'linkedin.com': { enabled: true, dailyLimit: 60, sessionLimit: 30, isCustom: false },
        'reddit.com': { enabled: true, dailyLimit: 45, sessionLimit: 20, isCustom: false },
        'youtube.com': { enabled: true, dailyLimit: 120, sessionLimit: 60, isCustom: false },
        'snapchat.com': { enabled: true, dailyLimit: 30, sessionLimit: 15, isCustom: false },
        'pinterest.com': { enabled: true, dailyLimit: 45, sessionLimit: 20, isCustom: false }
      },
      customSites: [],
      focusMode: false,
      focusUntil: null,
      darkMode: false,
      notificationsEnabled: true,
      motivationalMessages: true,
      emergencyOverride: false
    };

    const defaultStats = {
      dailyUsage: {},
      sessionUsage: {},
      totalPoints: 0,
      currentStreak: 0,
      longestStreak: 0,
      badges: [],
      lastResetDate: new Date().toDateString()
    };

    try {
      const result = await chrome.storage.local.get(['settings', 'stats']);
      
      if (!result.settings) {
        console.log('Initializing default settings');
        await chrome.storage.local.set({ settings: defaultSettings });
      }
      
      if (!result.stats) {
        console.log('Initializing default stats');
        await chrome.storage.local.set({ stats: defaultStats });
      }
      
      console.log('Storage initialized successfully');
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  setupEventListeners() {
    // Listen for tab updates - block immediately on URL change
    chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
      // Block as soon as URL changes (loading state) if in focus mode
      if (changeInfo.url || (changeInfo.status === 'loading' && tab.url)) {
        const url = changeInfo.url || tab.url;
        await this.checkAndBlockIfNeeded(tabId, url);
      }
      
      // Continue with normal handling when complete
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab.url);
      }
    });

    // Listen for tab activation
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url) {
        await this.checkAndBlockIfNeeded(activeInfo.tabId, tab.url);
        this.handleTabActivation(activeInfo.tabId, tab.url);
      }
    });

    // Listen for new tabs created
    chrome.tabs.onCreated.addListener(async (tab) => {
      if (tab.url && tab.url !== 'chrome://newtab/') {
        await this.checkAndBlockIfNeeded(tab.id, tab.url);
      }
    });

    // Listen for navigation attempts (before page loads)
    chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
      if (details.frameId === 0) { // Main frame only
        await this.checkAndBlockIfNeeded(details.tabId, details.url);
      }
    });

    // Additional safety net for committed navigation
    chrome.webNavigation.onCommitted.addListener(async (details) => {
      if (details.frameId === 0) { // Main frame only
        await this.checkAndBlockIfNeeded(details.tabId, details.url);
      }
    });

    // Listen for messages from content scripts
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      this.handleMessage(message, sender, sendResponse);
      return true; // Keep message channel open for async response
    });

    // Listen for alarms
    chrome.alarms.onAlarm.addListener((alarm) => {
      this.handleAlarm(alarm);
    });

    // Handle browser startup
    chrome.runtime.onStartup.addListener(() => {
      this.resetSessionUsage();
    });
  }

  async handleTabUpdate(tabId, url) {
    console.log(`Tab update: ${url} (tab ${tabId})`);
    const platform = await this.extractPlatform(url);
    console.log(`Extracted platform: ${platform}`);
    
    if (!platform) {
      console.log('No platform detected, skipping tracking');
      return;
    }

    const { settings } = await chrome.storage.local.get('settings');
    
    if (settings.platforms[platform]?.enabled) {
      console.log(`Platform enabled: ${platform}. Starting tracking for tab ${tabId}`);
      await this.startTracking(tabId, platform);
      
      // Check if in focus mode
      if (settings.focusMode && new Date() < new Date(settings.focusUntil)) {
        console.log(`Focus mode active, blocking ${platform}`);
        this.blockSite(tabId, platform);
      }
    } else {
      console.log(`Platform disabled or not found in settings: ${platform}`);
    }
  }

  async handleTabActivation(tabId, url) {
    // Stop tracking on previously active tabs
    await this.stopAllTracking();
    
    const platform = await this.extractPlatform(url);
    if (platform) {
      await this.handleTabUpdate(tabId, url);
    }
  }

  async handleMessage(message, sender, sendResponse) {
    try {
      console.log('Received message:', message.action);
      switch (message.action) {
        case 'getUsageStats':
          const stats = await this.getUsageStats();
          console.log('Sending stats:', stats);
          sendResponse({ success: true, data: stats });
          break;
          
        case 'getSettings':
          const { settings } = await chrome.storage.local.get('settings');
          sendResponse({ success: true, data: settings });
          break;
          
        case 'updateSettings':
          await chrome.storage.local.set({ settings: message.data });
          sendResponse({ success: true });
          break;

        case 'addCustomSite':
          try {
            await this.addCustomSite(message.siteData);
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;

        case 'removeCustomSite':
          try {
            await this.removeCustomSite(message.domain);
            sendResponse({ success: true });
          } catch (error) {
            sendResponse({ success: false, error: error.message });
          }
          break;
          
        case 'toggleFocusMode':
          await this.toggleFocusMode(message.duration);
          sendResponse({ success: true });
          break;
          
        case 'emergencyOverride':
          await this.activateEmergencyOverride(sender.tab.id);
          sendResponse({ success: true });
          break;
          
        case 'timeWarning':
          await this.handleTimeWarning(message.platform, message.timeSpent, message.limit);
          sendResponse({ success: true });
          break;
          
        case 'awardPoints':
          await this.awardPoints(message.points, message.reason);
          sendResponse({ success: true });
          break;
          
        default:
          sendResponse({ success: false, error: 'Unknown action' });
      }
    } catch (error) {
      console.error('Error handling message:', error);
      sendResponse({ success: false, error: error.message });
    }
  }

  async startTracking(tabId, platform) {
    console.log(`Starting tracking for ${platform} (tab ${tabId})`);
    const { stats } = await chrome.storage.local.get('stats');
    
    // Initialize usage tracking
    if (!stats.sessionUsage[platform]) {
      stats.sessionUsage[platform] = 0;
    }
    
    if (!stats.dailyUsage[platform]) {
      stats.dailyUsage[platform] = 0;
    }

    // Start timer
    chrome.alarms.create(`track_${tabId}_${platform}`, { periodInMinutes: 1/60 }); // Every second
    console.log(`Created alarm: track_${tabId}_${platform}`);
    
    await chrome.storage.local.set({ stats });
  }

  async stopAllTracking() {
    const alarms = await chrome.alarms.getAll();
    for (const alarm of alarms) {
      if (alarm.name.startsWith('track_')) {
        chrome.alarms.clear(alarm.name);
      }
    }
  }

  async handleAlarm(alarm) {
    if (alarm.name.startsWith('track_')) {
      const [, tabId, platform] = alarm.name.split('_');
      await this.incrementUsage(parseInt(tabId), platform);
    } else if (alarm.name === 'dailyReset') {
      await this.resetDailyUsage();
    } else if (alarm.name === 'focusModeEnd') {
      await this.endFocusMode();
    }
  }

  async incrementUsage(tabId, platform) {
    try {
      const tab = await chrome.tabs.get(tabId);
      const currentPlatform = await this.extractPlatform(tab.url);
      
      // Only increment if still on the same platform
      if (currentPlatform !== platform) {
        chrome.alarms.clear(`track_${tabId}_${platform}`);
        return;
      }

      const { stats, settings } = await chrome.storage.local.get(['stats', 'settings']);
      
      // Increment usage
      stats.sessionUsage[platform] = (stats.sessionUsage[platform] || 0) + 1;
      stats.dailyUsage[platform] = (stats.dailyUsage[platform] || 0) + 1;
      
      console.log(`Usage incremented for ${platform}: session=${stats.sessionUsage[platform]}s, daily=${stats.dailyUsage[platform]}s`);
      
      await chrome.storage.local.set({ stats });
      
      // Check limits
      const platformSettings = settings.platforms[platform];
      const sessionMinutes = Math.floor(stats.sessionUsage[platform] / 60);
      const dailyMinutes = Math.floor(stats.dailyUsage[platform] / 60);
      
      // Send usage update to content script
      chrome.tabs.sendMessage(tabId, {
        action: 'updateUsage',
        platform,
        sessionTime: sessionMinutes,
        dailyTime: dailyMinutes,
        sessionLimit: platformSettings.sessionLimit,
        dailyLimit: platformSettings.dailyLimit
      });
      
      // Check for warnings and limits
      await this.checkLimits(tabId, platform, sessionMinutes, dailyMinutes, platformSettings);
      
    } catch (error) {
      // Tab might be closed, clear alarm
      chrome.alarms.clear(`track_${tabId}_${platform}`);
    }
  }

  async checkLimits(tabId, platform, sessionMinutes, dailyMinutes, platformSettings) {
    const { settings } = await chrome.storage.local.get('settings');
    
    // Check for warnings at 75% and 90%
    if (dailyMinutes === Math.floor(platformSettings.dailyLimit * 0.75)) {
      this.showWarningNotification(platform, '75% of daily limit reached');
    } else if (dailyMinutes === Math.floor(platformSettings.dailyLimit * 0.9)) {
      this.showWarningNotification(platform, '90% of daily limit reached');
    }
    
    // Block if limits exceeded (unless emergency override)
    if (!settings.emergencyOverride) {
      if (sessionMinutes >= platformSettings.sessionLimit || dailyMinutes >= platformSettings.dailyLimit) {
        this.blockSite(tabId, platform);
        await this.awardPoints(5, 'Respected time limit');
      }
    }
  }

  async checkAndBlockIfNeeded(tabId, url) {
    try {
      const { settings } = await chrome.storage.local.get('settings');
      
      // Check if focus mode is active
      if (!settings.focusMode || !settings.focusUntil) return;
      
      // Check if focus mode has expired
      if (new Date() > new Date(settings.focusUntil)) {
        await this.endFocusMode();
        return;
      }
      
      // Check if URL is a social media platform
      const platform = await this.extractPlatform(url);
      if (platform && settings.platforms[platform]?.enabled) {
        console.log(`Focus mode active: Blocking ${platform} on tab ${tabId}`);
        await this.blockSite(tabId, platform);
        return true;
      }
    } catch (error) {
      console.error('Error checking focus mode block:', error);
    }
    return false;
  }

  async blockSite(tabId, platform) {
    try {
      const blockedUrl = chrome.runtime.getURL('src/content/blocked.html') + 
                        `?platform=${encodeURIComponent(platform)}&tabId=${tabId}&reason=focus`;
      await chrome.tabs.update(tabId, { url: blockedUrl });
    } catch (error) {
      console.error('Error blocking site:', error);
    }
  }

  async toggleFocusMode(duration = 60) {
    const { settings } = await chrome.storage.local.get('settings');
    
    if (settings.focusMode) {
      // Turn off focus mode
      settings.focusMode = false;
      settings.focusUntil = null;
      chrome.alarms.clear('focusModeEnd');
      
      // Show end notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: '🎯 Focus Mode Ended',
        message: 'Focus mode has been turned off. You can now access social media sites.',
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('Focus end notification error:', chrome.runtime.lastError);
        }
      });
    } else {
      // Turn on focus mode
      settings.focusMode = true;
      settings.focusUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
      chrome.alarms.create('focusModeEnd', { delayInMinutes: duration });
      
      // Close all social media tabs immediately
      await this.closeAllSocialMediaTabs();
      
      // Show start notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: '🎯 Focus Mode Activated!',
        message: `All social media sites are now blocked for ${duration} minutes. Stay focused!`,
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('Focus start notification error:', chrome.runtime.lastError);
        }
      });
    }
    
    await chrome.storage.local.set({ settings });
    
    // Notify all tabs of focus mode change
    const tabs = await chrome.tabs.query({});
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, {
        action: 'focusModeChanged',
        focusMode: settings.focusMode,
        focusUntil: settings.focusUntil
      });
    });
  }

  async endFocusMode() {
    const { settings } = await chrome.storage.local.get('settings');
    
    if (settings.focusMode) {
      settings.focusMode = false;
      settings.focusUntil = null;
      
      await chrome.storage.local.set({ settings });
      
      // Clear the alarm
      chrome.alarms.clear('focusModeEnd');
      
      // Show completion notification
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: '✅ Focus Session Complete!',
        message: 'Great job! Your focus session has ended. You can now access social media sites.',
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('Focus completion notification error:', chrome.runtime.lastError);
        }
      });
      
      // Notify all tabs
      const tabs = await chrome.tabs.query({});
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, {
          action: 'focusModeChanged',
          focusMode: false,
          focusUntil: null
        });
      });
    }
  }

  async closeAllSocialMediaTabs() {
    const { settings } = await chrome.storage.local.get('settings');
    const tabs = await chrome.tabs.query({});
    
    for (const tab of tabs) {
      const platform = await this.extractPlatform(tab.url);
      if (platform && settings.platforms[platform]?.enabled) {
        chrome.tabs.remove(tab.id);
      }
    }
  }

  async activateEmergencyOverride(tabId) {
    const { settings } = await chrome.storage.local.get('settings');
    settings.emergencyOverride = true;
    await chrome.storage.local.set({ settings });
    
    // Set timer to disable override after 1 hour
    chrome.alarms.create('disableOverride', { delayInMinutes: 60 });
    
    // Refresh the tab to unblock it
    chrome.tabs.reload(tabId);
  }

  async awardPoints(points, reason) {
    const { stats } = await chrome.storage.local.get('stats');
    stats.totalPoints = (stats.totalPoints || 0) + points;
    
    // Check for new badges
    await this.checkBadges(stats);
    
    await chrome.storage.local.set({ stats });
    
    if (points > 0) {
      this.showRewardNotification(points, reason);
    }
  }

  async checkBadges(stats) {
    const badges = stats.badges || [];
    const newBadges = [];
    
    // First Day badge
    if (!badges.includes('first_day') && stats.totalPoints >= 10) {
      newBadges.push('first_day');
    }
    
    // Week Strong badge
    if (!badges.includes('week_strong') && stats.currentStreak >= 7) {
      newBadges.push('week_strong');
    }
    
    // Point Collector badges
    if (!badges.includes('points_100') && stats.totalPoints >= 100) {
      newBadges.push('points_100');
    }
    
    if (!badges.includes('points_500') && stats.totalPoints >= 500) {
      newBadges.push('points_500');
    }
    
    // Add new badges
    if (newBadges.length > 0) {
      stats.badges = [...badges, ...newBadges];
      
      // Show notification for new badges
      newBadges.forEach(badge => {
        this.showBadgeNotification(badge);
      });
    }
  }

  async resetDailyUsage() {
    const { stats } = await chrome.storage.local.get('stats');
    const today = new Date().toDateString();
    
    if (stats.lastResetDate !== today) {
      // Award streak points if user was under limits yesterday
      const wasUnderLimits = await this.checkIfUnderLimitsYesterday(stats);
      
      if (wasUnderLimits) {
        stats.currentStreak = (stats.currentStreak || 0) + 1;
        stats.longestStreak = Math.max(stats.longestStreak || 0, stats.currentStreak);
        await this.awardPoints(20, 'Daily streak maintained');
      } else {
        stats.currentStreak = 0;
      }
      
      // Reset daily usage
      stats.dailyUsage = {};
      stats.lastResetDate = today;
      
      await chrome.storage.local.set({ stats });
    }
  }

  async checkIfUnderLimitsYesterday(stats) {
    const { settings } = await chrome.storage.local.get('settings');
    
    for (const [platform, usage] of Object.entries(stats.dailyUsage)) {
      const platformSettings = settings.platforms[platform];
      if (platformSettings?.enabled) {
        const minutes = Math.floor(usage / 60);
        if (minutes >= platformSettings.dailyLimit) {
          return false;
        }
      }
    }
    
    return true;
  }

  resetSessionUsage() {
    chrome.storage.local.get('stats').then(({ stats }) => {
      stats.sessionUsage = {};
      chrome.storage.local.set({ stats });
    });
  }

  startDailyReset() {
    // Create alarm for daily reset at midnight
    chrome.alarms.create('dailyReset', { 
      when: this.getNextMidnight(),
      periodInMinutes: 24 * 60
    });
  }

  getNextMidnight() {
    const now = new Date();
    const midnight = new Date(now);
    midnight.setHours(24, 0, 0, 0);
    return midnight.getTime();
  }

  async extractPlatform(url) {
    if (!url) return null;
    
    try {
      const hostname = new URL(url).hostname.toLowerCase();
      
      // Remove 'www.' prefix
      const cleanHostname = hostname.replace(/^www\./, '');
      
      // Check against our supported platforms first
      const builtInPlatforms = [
        'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
        'tiktok.com', 'linkedin.com', 'reddit.com', 'youtube.com',
        'snapchat.com', 'pinterest.com'
      ];
      
      const builtInMatch = builtInPlatforms.find(platform => cleanHostname.includes(platform));
      if (builtInMatch) {
        console.log(`Built-in platform detected: ${builtInMatch} from ${url}`);
        return builtInMatch;
      }
      
      // Check custom sites
      const { settings } = await chrome.storage.local.get('settings');
      if (settings?.platforms) {
        for (const [domain, config] of Object.entries(settings.platforms)) {
          if (config.isCustom) {
            // More precise domain matching
            const customDomain = domain.replace(/^www\./, '');
            if (cleanHostname === customDomain || cleanHostname.endsWith('.' + customDomain)) {
              console.log(`Custom platform detected: ${domain} from ${url}`);
              return domain;
            }
          }
        }
      }
      
      return null;
    } catch (error) {
      return null;
    }
  }

  async getUsageStats() {
    const { stats } = await chrome.storage.local.get('stats');
    return stats;
  }

  showWarningNotification(platform, message) {
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: 'Social Media Detox Timer',
        message: `${platform}: ${message}`,
        priority: 1
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('Notification error:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.error('Failed to show warning notification:', error);
    }
  }

  showRewardNotification(points, reason) {
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: '🎉 Points Earned!',
        message: `+${points} points: ${reason}`,
        priority: 0
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('Notification error:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.error('Failed to show reward notification:', error);
    }
  }

  showBadgeNotification(badge) {
    const badgeNames = {
      'first_day': 'First Day Complete! 🌟',
      'week_strong': 'Week Strong! 💪',
      'points_100': '100 Points Collector! 🏆',
      'points_500': '500 Points Master! 👑'
    };
    
    try {
      chrome.notifications.create({
        type: 'basic',
        iconUrl: chrome.runtime.getURL('icons/icon48.png'),
        title: '🏅 Badge Unlocked!',
        message: badgeNames[badge] || 'New achievement unlocked!',
        priority: 2
      }, (notificationId) => {
        if (chrome.runtime.lastError) {
          console.error('Notification error:', chrome.runtime.lastError);
        }
      });
    } catch (error) {
      console.error('Failed to show badge notification:', error);
    }
  }

  async addCustomSite(siteData) {
    try {
      const { settings } = await chrome.storage.local.get('settings');
      
      // Validate domain
      const domain = this.normalizeDomain(siteData.domain);
      if (!domain) {
        throw new Error('Invalid domain');
      }
      
      // Check if already exists
      if (settings.platforms[domain]) {
        throw new Error('Site already exists');
      }
      
      // Add to platforms
      settings.platforms[domain] = {
        enabled: true,
        dailyLimit: siteData.dailyLimit || 60,
        sessionLimit: siteData.sessionLimit || 30,
        isCustom: true,
        name: siteData.name || domain,
        icon: siteData.icon || '🌐'
      };
      
      await chrome.storage.local.set({ settings });
      
      // Add to manifest host permissions dynamically if possible
      this.updateContentScriptPermissions(domain);
      
    } catch (error) {
      console.error('Error adding custom site:', error);
      throw error;
    }
  }

  async removeCustomSite(domain) {
    try {
      const { settings } = await chrome.storage.local.get('settings');
      
      if (settings.platforms[domain]?.isCustom) {
        delete settings.platforms[domain];
        await chrome.storage.local.set({ settings });
        
        // Clean up stats for this domain
        const { stats } = await chrome.storage.local.get('stats');
        if (stats.dailyUsage[domain]) delete stats.dailyUsage[domain];
        if (stats.sessionUsage[domain]) delete stats.sessionUsage[domain];
        await chrome.storage.local.set({ stats });
      }
      
    } catch (error) {
      console.error('Error removing custom site:', error);
      throw error;
    }
  }

  normalizeDomain(input) {
    try {
      // Handle different input formats
      let url = input;
      if (!input.startsWith('http')) {
        url = 'https://' + input;
      }
      
      const urlObj = new URL(url);
      return urlObj.hostname.toLowerCase().replace(/^www\./, '');
    } catch (error) {
      return null;
    }
  }

  updateContentScriptPermissions(domain) {
    // Note: In Manifest V3, we can't dynamically add host permissions
    // The custom sites will work for tracking but won't inject content scripts
    // Users would need to manually add permissions or we use activeTab
    console.log(`Custom site added: ${domain}. Content scripts require manual permission grant.`);
  }
}

// Initialize the detox timer
const detoxTimer = new DetoxTimer();