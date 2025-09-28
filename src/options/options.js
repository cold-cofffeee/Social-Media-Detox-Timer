// Social Media Detox Timer - Options Page JavaScript

class OptionsController {
    constructor() {
        this.currentSettings = null;
        this.currentStats = null;
        this.currentTab = 'platforms';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.initializeTabs();
        this.setupTheme();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Platform toggles
        document.querySelectorAll('.platform-toggle').forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                this.handlePlatformToggle(e);
            });
        });

        // Preset buttons
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.applyPreset(e.target.dataset.preset);
            });
        });

        // Settings toggles
        document.getElementById('dark-mode-toggle')?.addEventListener('change', () => {
            this.toggleDarkMode();
        });

        document.getElementById('notifications-toggle')?.addEventListener('change', (e) => {
            this.updateSetting('notificationsEnabled', e.target.checked);
        });

        document.getElementById('motivational-toggle')?.addEventListener('change', (e) => {
            this.updateSetting('motivationalMessages', e.target.checked);
        });

        document.getElementById('emergency-toggle')?.addEventListener('change', (e) => {
            this.updateSetting('emergencyOverride', e.target.checked);
        });

        // Data management buttons
        document.getElementById('export-data')?.addEventListener('click', () => {
            this.exportData();
        });

        document.getElementById('export-stats')?.addEventListener('click', () => {
            this.exportStatistics();
        });

        document.getElementById('clear-history')?.addEventListener('click', () => {
            this.clearHistory();
        });

        document.getElementById('reset-data')?.addEventListener('click', () => {
            this.resetAllData();
        });

        // Save settings
        document.getElementById('save-settings')?.addEventListener('click', () => {
            this.saveAllSettings();
        });

        // Stats period selector
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchStatsPeriod(e.target.dataset.period);
            });
        });

        // Custom sites event listeners
        document.getElementById('add-custom-site')?.addEventListener('click', () => {
            this.addCustomSite();
        });
    }

    initializeTabs() {
        // Show first tab by default
        this.switchTab(this.currentTab);
    }

    switchTab(tabName) {
        // Update nav tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Update tab panes
        document.querySelectorAll('.tab-pane').forEach(pane => {
            pane.classList.toggle('active', pane.id === `${tabName}-tab`);
        });

        this.currentTab = tabName;

        // Load tab-specific data
        switch (tabName) {
            case 'platforms':
                this.loadCustomSites();
                break;
            case 'limits':
                this.loadLimitsTab();
                break;
            case 'rewards':
                this.loadRewardsTab();
                break;
            case 'stats':
                this.loadStatsTab();
                break;
            case 'settings':
                this.loadSettingsTab();
                break;
        }
    }

    async loadData() {
        try {
            const [settingsResponse, statsResponse] = await Promise.all([
                chrome.runtime.sendMessage({ action: 'getSettings' }),
                chrome.runtime.sendMessage({ action: 'getUsageStats' })
            ]);

            if (settingsResponse.success) {
                this.currentSettings = settingsResponse.data;
            }

            if (statsResponse.success) {
                this.currentStats = statsResponse.data;
            }

            this.updateUI();
        } catch (error) {
            console.error('Error loading data:', error);
            this.showNotification('Failed to load data', 'error');
        }
    }

    updateUI() {
        this.updatePlatformToggles();
        this.updateSettingsToggles();
    }

    updatePlatformToggles() {
        document.querySelectorAll('.platform-card').forEach(card => {
            const platform = card.dataset.platform;
            const toggle = card.querySelector('.platform-toggle');
            const isEnabled = this.currentSettings?.platforms?.[platform]?.enabled || false;
            
            if (toggle) {
                toggle.checked = isEnabled;
            }
        });
    }

    updateSettingsToggles() {
        if (!this.currentSettings) return;

        const toggles = {
            'dark-mode-toggle': this.currentSettings.darkMode,
            'notifications-toggle': this.currentSettings.notificationsEnabled,
            'motivational-toggle': this.currentSettings.motivationalMessages,
            'emergency-toggle': this.currentSettings.emergencyOverride
        };

        Object.entries(toggles).forEach(([id, value]) => {
            const toggle = document.getElementById(id);
            if (toggle) {
                toggle.checked = value || false;
            }
        });
    }

    handlePlatformToggle(event) {
        const card = event.target.closest('.platform-card');
        const platform = card.dataset.platform;
        const enabled = event.target.checked;

        if (!this.currentSettings.platforms[platform]) {
            this.currentSettings.platforms[platform] = {
                enabled: false,
                dailyLimit: 60,
                sessionLimit: 30
            };
        }

        this.currentSettings.platforms[platform].enabled = enabled;
        this.markAsModified();
    }

    loadLimitsTab() {
        const limitsGrid = document.getElementById('limits-grid');
        if (!limitsGrid) return;

        limitsGrid.innerHTML = '';

        // Get all platforms from settings (including custom ones)
        const allPlatforms = [];
        
        // Add built-in platforms with their display info
        const builtInPlatforms = {
            'facebook.com': { name: 'Facebook', icon: '📘' },
            'instagram.com': { name: 'Instagram', icon: '📷' },
            'twitter.com': { name: 'Twitter', icon: '🐦' },
            'x.com': { name: 'X', icon: '❌' },
            'tiktok.com': { name: 'TikTok', icon: '🎵' },
            'linkedin.com': { name: 'LinkedIn', icon: '💼' },
            'reddit.com': { name: 'Reddit', icon: '🤖' },
            'youtube.com': { name: 'YouTube', icon: '📺' },
            'pinterest.com': { name: 'Pinterest', icon: '📌' },
            'snapchat.com': { name: 'Snapchat', icon: '👻' }
        };

        // Process all platforms in settings
        if (this.currentSettings?.platforms) {
            Object.entries(this.currentSettings.platforms).forEach(([key, platformSettings]) => {
                if (platformSettings?.enabled) {
                    const platformInfo = {
                        key: key,
                        name: builtInPlatforms[key]?.name || platformSettings.name || key,
                        icon: builtInPlatforms[key]?.icon || platformSettings.icon || '🌐',
                        isCustom: platformSettings.isCustom || false
                    };
                    allPlatforms.push(platformInfo);
                }
            });
        }

        // Sort platforms - built-in first, then custom
        allPlatforms.sort((a, b) => {
            if (a.isCustom !== b.isCustom) {
                return a.isCustom ? 1 : -1;
            }
            return a.name.localeCompare(b.name);
        });

        allPlatforms.forEach(platform => {
            const platformSettings = this.currentSettings.platforms[platform.key];
            const card = this.createLimitCard(platform, platformSettings);
            limitsGrid.appendChild(card);
        });

        if (limitsGrid.children.length === 0) {
            limitsGrid.innerHTML = `
                <div class="empty-state" style="text-align: center; padding: 40px; color: rgba(255, 255, 255, 0.7);">
                    <div style="font-size: 48px; margin-bottom: 16px;">🎯</div>
                    <h3 style="color: white; margin-bottom: 12px;">No Platforms Enabled</h3>
                    <p>Enable platforms in the Platforms tab to set time limits.</p>
                </div>
            `;
        }
    }

    createLimitCard(platform, platformSettings) {
        const card = document.createElement('div');
        card.className = 'limit-card';
        card.innerHTML = `
            <div class="limit-info">
                <div class="platform-icon">${platform.icon}</div>
                <div class="limit-details">
                    <h4>${platform.name}</h4>
                    <p>${platform.key}</p>
                </div>
            </div>
            <div class="limit-controls">
                <div class="limit-input-group">
                    <label>Daily Limit (min)</label>
                    <input type="number" class="limit-input daily-limit" 
                           value="${platformSettings.dailyLimit || 60}" 
                           min="1" max="1440"
                           data-platform="${platform.key}" 
                           data-type="dailyLimit">
                </div>
                <div class="limit-input-group">
                    <label>Session Limit (min)</label>
                    <input type="number" class="limit-input session-limit" 
                           value="${platformSettings.sessionLimit || 30}" 
                           min="1" max="720"
                           data-platform="${platform.key}" 
                           data-type="sessionLimit">
                </div>
            </div>
        `;

        // Add event listeners for limit inputs
        card.querySelectorAll('.limit-input').forEach(input => {
            input.addEventListener('change', (e) => {
                this.updateLimit(e.target.dataset.platform, e.target.dataset.type, parseInt(e.target.value));
            });
        });

        return card;
    }

    updateLimit(platform, limitType, value) {
        if (!this.currentSettings.platforms[platform]) return;

        this.currentSettings.platforms[platform][limitType] = value;
        this.markAsModified();
    }

    applyPreset(preset) {
        const presets = {
            minimal: { dailyLimit: 30, sessionLimit: 15 },
            balanced: { dailyLimit: 60, sessionLimit: 30 },
            relaxed: { dailyLimit: 120, sessionLimit: 60 }
        };

        if (!presets[preset]) return;

        // Update active preset button
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.preset === preset);
        });

        // Apply preset to all enabled platforms
        Object.keys(this.currentSettings.platforms).forEach(platform => {
            if (this.currentSettings.platforms[platform].enabled) {
                this.currentSettings.platforms[platform].dailyLimit = presets[preset].dailyLimit;
                this.currentSettings.platforms[platform].sessionLimit = presets[preset].sessionLimit;
            }
        });

        // Refresh the limits tab
        this.loadLimitsTab();
        this.markAsModified();
        this.showNotification(`Applied ${preset} preset to all platforms`, 'success');
    }

    loadRewardsTab() {
        this.updateRewardsStats();
        this.updateBadgesGrid();
        this.updateAchievementsList();
    }

    updateRewardsStats() {
        if (!this.currentStats) return;

        document.getElementById('total-points-display').textContent = this.currentStats.totalPoints || 0;
        document.getElementById('current-streak-display').textContent = this.currentStats.currentStreak || 0;
        document.getElementById('badges-count-display').textContent = (this.currentStats.badges || []).length;
    }

    updateBadgesGrid() {
        const badgesGrid = document.getElementById('badges-grid');
        if (!badgesGrid) return;

        const allBadges = {
            'first_day': { name: 'First Day Complete', icon: '🌟', description: 'Complete your first day under limits' },
            'week_strong': { name: 'Week Strong', icon: '💪', description: 'Stay under limits for 7 days' },
            'points_100': { name: '100 Points', icon: '🏆', description: 'Earn your first 100 points' },
            'points_500': { name: '500 Points', icon: '👑', description: 'Reach 500 total points' },
            'focus_master': { name: 'Focus Master', icon: '🎯', description: 'Use focus mode 10 times' },
            'streak_3': { name: '3 Day Streak', icon: '🔥', description: 'Maintain a 3 day streak' },
            'streak_7': { name: '7 Day Streak', icon: '⚡', description: 'Maintain a 7 day streak' }
        };

        const earnedBadges = this.currentStats?.badges || [];

        badgesGrid.innerHTML = '';
        Object.entries(allBadges).forEach(([badgeId, badge]) => {
            const isEarned = earnedBadges.includes(badgeId);
            const badgeElement = document.createElement('div');
            badgeElement.className = `badge-item ${isEarned ? 'earned' : ''}`;
            badgeElement.innerHTML = `
                <div class="badge-icon">${badge.icon}</div>
                <div class="badge-name">${badge.name}</div>
                <div class="badge-description">${badge.description}</div>
            `;
            badgesGrid.appendChild(badgeElement);
        });
    }

    updateAchievementsList() {
        const achievementsList = document.getElementById('achievements-list');
        if (!achievementsList) return;

        const achievements = [
            {
                icon: '🎯',
                name: 'Daily Goal',
                description: 'Stay under your daily limits',
                progress: this.calculateDailyGoalProgress(),
                maxProgress: 1
            },
            {
                icon: '📱',
                name: 'Platform Master',
                description: 'Configure limits for all platforms',
                progress: this.calculatePlatformProgress(),
                maxProgress: 9
            },
            {
                icon: '🏃‍♂️',
                name: 'Streak Runner',
                description: 'Build a 30-day streak',
                progress: Math.min(this.currentStats?.currentStreak || 0, 30),
                maxProgress: 30
            }
        ];

        achievementsList.innerHTML = '';
        achievements.forEach(achievement => {
            const progressPercentage = (achievement.progress / achievement.maxProgress) * 100;
            const achievementElement = document.createElement('div');
            achievementElement.className = 'achievement-item';
            achievementElement.innerHTML = `
                <div class="achievement-icon">${achievement.icon}</div>
                <div class="achievement-info">
                    <div class="achievement-name">${achievement.name}</div>
                    <div class="achievement-description">${achievement.description}</div>
                </div>
                <div class="achievement-progress">
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                    </div>
                    <div class="progress-text">${achievement.progress}/${achievement.maxProgress}</div>
                </div>
            `;
            achievementsList.appendChild(achievementElement);
        });
    }

    calculateDailyGoalProgress() {
        // Check if user is under limits today
        if (!this.currentStats?.dailyUsage || !this.currentSettings?.platforms) return 0;

        for (const [platform, usage] of Object.entries(this.currentStats.dailyUsage)) {
            const platformSettings = this.currentSettings.platforms[platform];
            if (platformSettings?.enabled) {
                const minutes = Math.floor(usage / 60);
                if (minutes >= platformSettings.dailyLimit) {
                    return 0;
                }
            }
        }
        return 1;
    }

    calculatePlatformProgress() {
        if (!this.currentSettings?.platforms) return 0;
        return Object.values(this.currentSettings.platforms).filter(p => p.enabled).length;
    }

    loadStatsTab() {
        this.updateStatsOverview();
        this.updateUsageChart();
        this.updatePlatformBreakdown();
    }

    updateStatsOverview() {
        if (!this.currentStats) return;

        // Calculate most used platform
        const dailyUsage = this.currentStats.dailyUsage || {};
        let mostUsedPlatform = 'None';
        let mostUsedTime = 0;

        Object.entries(dailyUsage).forEach(([platform, usage]) => {
            const minutes = Math.floor(usage / 60);
            if (minutes > mostUsedTime) {
                mostUsedTime = minutes;
                // Get proper display name from settings
                const platformSettings = this.currentSettings?.platforms?.[platform];
                if (platformSettings) {
                    mostUsedPlatform = platformSettings.name || platform.replace('.com', '').replace(/^./, str => str.toUpperCase());
                } else {
                    mostUsedPlatform = platform.replace('.com', '').replace(/^./, str => str.toUpperCase());
                }
            }
        });

        document.getElementById('most-used-platform').textContent = mostUsedPlatform;
        document.getElementById('most-used-time').textContent = `${mostUsedTime} minutes`;

        // Calculate average usage
        const totalMinutes = Object.values(dailyUsage).reduce((sum, usage) => sum + Math.floor(usage / 60), 0);
        document.getElementById('average-usage').textContent = `${totalMinutes} min`;

        // Update other stats
        document.getElementById('best-streak').textContent = `${this.currentStats.longestStreak || 0} days`;
    }

    updateUsageChart() {
        const chartBars = document.getElementById('usage-chart');
        if (!chartBars) return;

        // Generate sample chart data (last 7 days)
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const sampleData = [45, 32, 28, 55, 38, 62, 30]; // Sample minutes per day

        chartBars.innerHTML = '';
        days.forEach((day, index) => {
            const height = (sampleData[index] / Math.max(...sampleData)) * 100;
            const bar = document.createElement('div');
            bar.className = 'chart-bar';
            bar.style.height = `${height}%`;
            bar.style.minHeight = '20px';
            bar.innerHTML = `<div style="transform: rotate(-90deg); font-size: 10px;">${day}</div>`;
            bar.title = `${day}: ${sampleData[index]} minutes`;
            chartBars.appendChild(bar);
        });
    }

    updatePlatformBreakdown() {
        const breakdown = document.getElementById('platform-breakdown');
        if (!breakdown) return;

        const dailyUsage = this.currentStats?.dailyUsage || {};
        
        // Get platform info from settings (includes custom sites)
        const getPlatformInfo = (platform) => {
            const platformSettings = this.currentSettings?.platforms?.[platform];
            if (platformSettings) {
                return {
                    name: platformSettings.name || platform.replace('.com', '').replace(/^./, str => str.toUpperCase()),
                    icon: platformSettings.icon || '🌐'
                };
            }
            
            // Fallback for built-in platforms if not in settings
            const builtInPlatforms = {
                'facebook.com': { name: 'Facebook', icon: '📘' },
                'instagram.com': { name: 'Instagram', icon: '📷' },
                'twitter.com': { name: 'Twitter', icon: '🐦' },
                'x.com': { name: 'X', icon: '❌' },
                'youtube.com': { name: 'YouTube', icon: '📺' },
                'tiktok.com': { name: 'TikTok', icon: '🎵' },
                'linkedin.com': { name: 'LinkedIn', icon: '💼' },
                'reddit.com': { name: 'Reddit', icon: '🤖' }
            };
            return builtInPlatforms[platform] || { name: platform, icon: '🌐' };
        };

        breakdown.innerHTML = '';
        Object.entries(dailyUsage)
            .sort(([,a], [,b]) => b - a) // Sort by usage descending
            .slice(0, 5) // Top 5 platforms
            .forEach(([platform, usage]) => {
                const minutes = Math.floor(usage / 60);
                const platformInfo = getPlatformInfo(platform);
                
                const item = document.createElement('div');
                item.className = 'breakdown-item';
                item.innerHTML = `
                    <div class="breakdown-platform">
                        <div class="platform-icon">${platformInfo.icon}</div>
                        <span>${platformInfo.name}</span>
                    </div>
                    <div class="breakdown-time">${minutes}m</div>
                `;
                breakdown.appendChild(item);
            });

        if (breakdown.children.length === 0) {
            breakdown.innerHTML = `
                <div style="text-align: center; color: rgba(255, 255, 255, 0.7); padding: 20px;">
                    No usage data available yet
                </div>
            `;
        }
    }

    switchStatsPeriod(period) {
        document.querySelectorAll('.period-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.period === period);
        });
        
        // Update stats based on period
        this.loadStatsTab();
    }

    loadSettingsTab() {
        // Settings are already loaded and updated in updateUI()
    }

    updateSetting(key, value) {
        if (!this.currentSettings) return;
        this.currentSettings[key] = value;
        this.markAsModified();
    }

    toggleDarkMode() {
        const isDarkMode = document.getElementById('dark-mode-toggle').checked;
        document.body.classList.toggle('dark-mode', isDarkMode);
        this.updateSetting('darkMode', isDarkMode);
        localStorage.setItem('detoxTimerTheme', isDarkMode ? 'dark' : 'light');
    }

    setupTheme() {
        const savedTheme = localStorage.getItem('detoxTimerTheme') || 'light';
        const isDarkMode = savedTheme === 'dark' || this.currentSettings?.darkMode;
        
        document.body.classList.toggle('dark-mode', isDarkMode);
        
        const toggle = document.getElementById('dark-mode-toggle');
        if (toggle) {
            toggle.checked = isDarkMode;
        }
    }

    markAsModified() {
        const saveBtn = document.getElementById('save-settings');
        if (saveBtn && !saveBtn.classList.contains('modified')) {
            saveBtn.classList.add('modified');
            saveBtn.textContent = '💾 Save Changes';
            saveBtn.style.background = 'linear-gradient(135deg, #FF9800, #F57C00)';
        }
    }

    async saveAllSettings() {
        try {
            await chrome.runtime.sendMessage({
                action: 'updateSettings',
                data: this.currentSettings
            });

            const saveBtn = document.getElementById('save-settings');
            saveBtn.classList.remove('modified');
            saveBtn.textContent = '✅ Saved!';
            saveBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';

            setTimeout(() => {
                saveBtn.textContent = '💾 Save All Settings';
                saveBtn.style.background = 'linear-gradient(135deg, #4CAF50, #45a049)';
            }, 2000);

            this.showNotification('Settings saved successfully!', 'success');
        } catch (error) {
            console.error('Error saving settings:', error);
            this.showNotification('Failed to save settings', 'error');
        }
    }

    exportData() {
        const data = {
            settings: this.currentSettings,
            stats: this.currentStats,
            exportDate: new Date().toISOString()
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `detox-timer-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showNotification('Data exported successfully!', 'success');
    }

    exportStatistics() {
        const statsData = {
            ...this.currentStats,
            exportDate: new Date().toISOString(),
            summary: this.generateStatsSummary()
        };

        const blob = new Blob([JSON.stringify(statsData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `detox-timer-stats-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
        this.showNotification('Statistics exported successfully!', 'success');
    }

    generateStatsSummary() {
        const dailyUsage = this.currentStats?.dailyUsage || {};
        const totalMinutes = Object.values(dailyUsage).reduce((sum, usage) => sum + Math.floor(usage / 60), 0);
        
        return {
            totalTimeToday: totalMinutes,
            platformCount: Object.keys(dailyUsage).length,
            totalPoints: this.currentStats?.totalPoints || 0,
            currentStreak: this.currentStats?.currentStreak || 0,
            badgesEarned: (this.currentStats?.badges || []).length
        };
    }

    async clearHistory() {
        const confirmed = confirm(
            'This will permanently delete all usage history and statistics.\n\n' +
            'Your settings and badges will be preserved.\n\n' +
            'Are you sure you want to continue?'
        );

        if (confirmed) {
            try {
                // Reset only usage stats, preserve settings and badges
                const clearedStats = {
                    dailyUsage: {},
                    sessionUsage: {},
                    totalPoints: this.currentStats?.totalPoints || 0,
                    currentStreak: 0,
                    longestStreak: this.currentStats?.longestStreak || 0,
                    badges: this.currentStats?.badges || [],
                    lastResetDate: new Date().toDateString()
                };

                await chrome.storage.local.set({ stats: clearedStats });
                this.currentStats = clearedStats;
                
                this.updateUI();
                this.showNotification('Usage history cleared successfully!', 'success');
            } catch (error) {
                console.error('Error clearing history:', error);
                this.showNotification('Failed to clear history', 'error');
            }
        }
    }

    async resetAllData() {
        const confirmed = confirm(
            'This will permanently delete ALL data including:\n' +
            '• Settings and platform configurations\n' +
            '• Usage statistics and history\n' +
            '• Badges and achievements\n' +
            '• Points and streaks\n\n' +
            'This action cannot be undone!\n\n' +
            'Are you sure you want to continue?'
        );

        if (confirmed) {
            try {
                await chrome.storage.local.clear();
                this.showNotification('All data reset successfully! Reloading page...', 'success');
                
                // Reload page after 2 seconds
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            } catch (error) {
                console.error('Error resetting data:', error);
                this.showNotification('Failed to reset data', 'error');
            }
        }
    }

    showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        
        const colors = {
            success: '#4CAF50',
            error: '#f44336',
            info: '#2196F3',
            warning: '#FF9800'
        };
        
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${colors[type] || colors.info};
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            z-index: 10000;
            max-width: 300px;
            animation: slideInRight 0.3s ease;
        `;

        document.body.appendChild(notification);

        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOutRight 0.3s ease';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }

    // Custom Sites Management
    async loadCustomSites() {
        const customSitesList = document.getElementById('custom-sites-list');
        if (!customSitesList) return;

        const customSites = Object.entries(this.currentSettings.platforms)
            .filter(([domain, config]) => config.isCustom)
            .map(([domain, config]) => ({ domain, ...config }));

        customSitesList.innerHTML = '';

        if (customSites.length === 0) {
            customSitesList.innerHTML = `
                <div style="text-align: center; color: rgba(255, 255, 255, 0.8); padding: 40px;">
                    <div style="font-size: 48px; margin-bottom: 16px;">🌐</div>
                    <h3>No custom sites added yet</h3>
                    <p>Add your own websites to track and monitor above</p>
                </div>
            `;
            return;
        }

        customSites.forEach(site => {
            const siteCard = this.createCustomSiteCard(site);
            customSitesList.appendChild(siteCard);
        });
    }

    createCustomSiteCard(site) {
        const card = document.createElement('div');
        card.className = 'custom-site-card';
        card.innerHTML = `
            <div class="custom-site-header">
                <div class="custom-site-info">
                    <div class="custom-site-icon">${site.icon || '🌐'}</div>
                    <div class="custom-site-details">
                        <h4>${site.name}</h4>
                        <p>${site.domain}</p>
                    </div>
                </div>
                <div class="custom-site-controls">
                    <button class="edit-site-btn" data-domain="${site.domain}" title="Edit site">✏️</button>
                    <button class="remove-site-btn" data-domain="${site.domain}" title="Remove site">🗑️</button>
                </div>
            </div>
            <div class="custom-site-stats">
                <span>Daily Limit: ${site.dailyLimit}min</span>
                <span>Session Limit: ${site.sessionLimit || 30}min</span>
            </div>
        `;

        // Add event listeners
        card.querySelector('.remove-site-btn').addEventListener('click', () => {
            this.removeCustomSite(site.domain);
        });

        card.querySelector('.edit-site-btn').addEventListener('click', () => {
            this.editCustomSite(site.domain);
        });

        return card;
    }

    async addCustomSite() {
        const nameInput = document.getElementById('site-name');
        const domainInput = document.getElementById('site-domain');
        const iconInput = document.getElementById('site-icon');
        const dailyLimitInput = document.getElementById('site-daily-limit');

        const siteData = {
            name: nameInput.value.trim(),
            domain: domainInput.value.trim(),
            icon: iconInput.value.trim() || '🌐',
            dailyLimit: parseInt(dailyLimitInput.value) || 60,
            sessionLimit: 30
        };

        // Validation
        if (!siteData.name) {
            this.showNotification('Please enter a site name', 'error');
            return;
        }

        if (!siteData.domain) {
            this.showNotification('Please enter a domain', 'error');
            return;
        }

        try {
            // Send message to background script to add custom site
            const response = await chrome.runtime.sendMessage({
                action: 'addCustomSite',
                siteData: siteData
            });

            if (response.success) {
                // Clear form
                nameInput.value = '';
                domainInput.value = '';
                iconInput.value = '';
                dailyLimitInput.value = '60';

                // Reload data and refresh UI
                await this.loadData();
                this.loadCustomSites();
                this.showNotification('Custom site added successfully!', 'success');
            } else {
                this.showNotification(response.error || 'Failed to add custom site', 'error');
            }
        } catch (error) {
            console.error('Error adding custom site:', error);
            this.showNotification('Error adding custom site', 'error');
        }
    }

    async removeCustomSite(domain) {
        if (!confirm(`Are you sure you want to remove ${domain}?`)) {
            return;
        }

        try {
            const response = await chrome.runtime.sendMessage({
                action: 'removeCustomSite',
                domain: domain
            });

            if (response.success) {
                await this.loadData();
                this.loadCustomSites();
                this.showNotification('Custom site removed successfully!', 'success');
            } else {
                this.showNotification(response.error || 'Failed to remove custom site', 'error');
            }
        } catch (error) {
            console.error('Error removing custom site:', error);
            this.showNotification('Error removing custom site', 'error');
        }
    }

    editCustomSite(domain) {
        const site = this.currentSettings.platforms[domain];
        if (!site) return;

        // Fill form with current values
        document.getElementById('site-name').value = site.name;
        document.getElementById('site-domain').value = domain;
        document.getElementById('site-icon').value = site.icon;
        document.getElementById('site-daily-limit').value = site.dailyLimit;

        // Remove existing site first, then user can re-add with new values
        this.removeCustomSite(domain);

        // Scroll to form
        document.getElementById('site-name').scrollIntoView({ behavior: 'smooth' });
        document.getElementById('site-name').focus();
    }
}

// Initialize options page when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new OptionsController();
});

// Add animations
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }
    
    @keyframes slideOutRight {
        from {
            opacity: 1;
            transform: translateX(0);
        }
        to {
            opacity: 0;
            transform: translateX(100%);
        }
    }
`;
document.head.appendChild(style);