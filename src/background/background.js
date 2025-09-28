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
        await chrome.storage.local.set({ settings: defaultSettings });
      }
      
      if (!result.stats) {
        await chrome.storage.local.set({ stats: defaultStats });
      }
    } catch (error) {
      console.error('Error initializing storage:', error);
    }
  }

  setupEventListeners() {
    // Listen for tab updates
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (changeInfo.status === 'complete' && tab.url) {
        this.handleTabUpdate(tabId, tab.url);
      }
    });

    // Listen for tab activation
    chrome.tabs.onActivated.addListener(async (activeInfo) => {
      const tab = await chrome.tabs.get(activeInfo.tabId);
      if (tab.url) {
        this.handleTabActivation(activeInfo.tabId, tab.url);
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
    const platform = await this.extractPlatform(url);
    if (!platform) return;

    const { settings } = await chrome.storage.local.get('settings');
    
    if (settings.platforms[platform]?.enabled) {
      await this.startTracking(tabId, platform);
      
      // Check if in focus mode
      if (settings.focusMode && new Date() < new Date(settings.focusUntil)) {
        this.blockSite(tabId, platform);
      }
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
      switch (message.action) {
        case 'getUsageStats':
          const stats = await this.getUsageStats();
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
          
        case 'addCustomSite':
          await this.addCustomSite(message.site);
          sendResponse({ success: true });
          break;
          
        case 'removeCustomSite':
          await this.removeCustomSite(message.domain);
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

  async blockSite(tabId, platform) {
    try {
      const blockedUrl = chrome.runtime.getURL('src/content/blocked.html') + 
                        `?platform=${encodeURIComponent(platform)}&tabId=${tabId}`;
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
    } else {
      // Turn on focus mode
      settings.focusMode = true;
      settings.focusUntil = new Date(Date.now() + duration * 60 * 1000).toISOString();
      chrome.alarms.create('focusModeEnd', { delayInMinutes: duration });
      
      // Close all social media tabs
      await this.closeAllSocialMediaTabs();
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
      if (builtInMatch) return builtInMatch;
      
      // Check custom sites
      const { settings } = await chrome.storage.local.get('settings');
      if (settings?.platforms) {
        for (const [domain, config] of Object.entries(settings.platforms)) {
          if (config.isCustom && cleanHostname.includes(domain)) {
            return domain;
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
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: 'Social Media Detox Timer',
      message: `${platform}: ${message}`,
      priority: 1
    });
  }

  showRewardNotification(points, reason) {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🎉 Points Earned!',
      message: `+${points} points: ${reason}`,
      priority: 0
    });
  }

  showBadgeNotification(badge) {
    const badgeNames = {
      'first_day': 'First Day Complete! 🌟',
      'week_strong': 'Week Strong! 💪',
      'points_100': '100 Points Collector! 🏆',
      'points_500': '500 Points Master! 👑'
    };
    
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icons/icon48.png',
      title: '🏅 Badge Unlocked!',
      message: badgeNames[badge] || 'New achievement unlocked!',
      priority: 2
    });
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