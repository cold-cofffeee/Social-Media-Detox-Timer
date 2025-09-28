// Social Media Detox Timer - Popup JavaScript

class PopupController {
    constructor() {
        this.focusModal = null;
        this.selectedDuration = null;
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadData();
        this.setupTheme();
    }

    setupEventListeners() {
        // Settings button
        document.getElementById('settings-btn').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        // Theme toggle
        document.getElementById('theme-toggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Focus mode button
        document.getElementById('focus-mode-btn').addEventListener('click', () => {
            this.showFocusModal();
        });

        // View progress button
        document.getElementById('view-progress-btn').addEventListener('click', () => {
            chrome.runtime.openOptionsPage();
        });

        // End focus button
        document.getElementById('end-focus')?.addEventListener('click', () => {
            this.endFocusMode();
        });

        // Modal event listeners
        this.setupModalEventListeners();
    }

    setupModalEventListeners() {
        const modal = document.getElementById('focus-modal');
        const closeBtn = document.getElementById('close-modal');
        const cancelBtn = document.getElementById('cancel-focus');
        const startBtn = document.getElementById('start-focus');

        // Close modal
        [closeBtn, cancelBtn].forEach(btn => {
            btn?.addEventListener('click', () => {
                this.hideFocusModal();
            });
        });

        // Duration selection
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.duration-btn').forEach(b => {
                    b.classList.remove('selected');
                });
                btn.classList.add('selected');
                this.selectedDuration = parseInt(btn.dataset.duration);
                document.getElementById('custom-duration-input').value = '';
            });
        });

        // Custom duration input
        document.getElementById('custom-duration-input').addEventListener('input', (e) => {
            if (e.target.value) {
                document.querySelectorAll('.duration-btn').forEach(btn => {
                    btn.classList.remove('selected');
                });
                this.selectedDuration = parseInt(e.target.value);
            }
        });

        // Start focus mode
        startBtn?.addEventListener('click', () => {
            this.startFocusMode();
        });

        // Close modal on backdrop click
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideFocusModal();
            }
        });
    }

    async loadData() {
        try {
            console.log('Loading popup data...');
            // Load usage statistics
            const statsResponse = await chrome.runtime.sendMessage({
                action: 'getUsageStats'
            });
            console.log('Stats response:', statsResponse);

            // Load settings
            const settingsResponse = await chrome.runtime.sendMessage({
                action: 'getSettings'
            });
            console.log('Settings response:', settingsResponse);

            if (statsResponse.success && settingsResponse.success) {
                const stats = statsResponse.data;
                const settings = settingsResponse.data;
                
                console.log('Loaded stats:', stats);
                console.log('Loaded settings:', settings);
                
                this.updateOverviewStats(stats);
                this.updatePlatformList(stats, settings);
                this.updateFocusStatus(settings);
                this.updateRecentBadges(stats);
                this.showMotivationalMessage();
            } else {
                console.error('Failed to load data:', { statsResponse, settingsResponse });
            }
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    updateOverviewStats(stats) {
        // Calculate total time today
        const totalTimeToday = Object.values(stats.dailyUsage || {})
            .reduce((sum, time) => sum + time, 0);
        
        console.log('Daily usage raw:', stats.dailyUsage);
        console.log('Total time today (seconds):', totalTimeToday);
        console.log('Total time today (minutes):', Math.floor(totalTimeToday / 60));
        
        const totalTimeTodayElement = document.getElementById('total-time-today');
        if (totalTimeTodayElement) {
            totalTimeTodayElement.textContent = Math.floor(totalTimeToday / 60);
        }

        // Update streak
        const streakElement = document.getElementById('current-streak');
        if (streakElement) {
            streakElement.textContent = stats.currentStreak || 0;
        }

        // Update points
        const pointsElement = document.getElementById('total-points');
        if (pointsElement) {
            pointsElement.textContent = stats.totalPoints || 0;
        }
    }

    updatePlatformList(stats, settings) {
        const platformList = document.getElementById('platform-list');
        platformList.innerHTML = '';

        // Get all enabled platforms from settings (including custom ones)
        const enabledPlatforms = [];
        
        // Built-in platform display info
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
        if (settings?.platforms) {
            Object.entries(settings.platforms).forEach(([key, platformSettings]) => {
                if (platformSettings?.enabled) {
                    const platformInfo = {
                        key: key,
                        name: builtInPlatforms[key]?.name || platformSettings.name || key,
                        icon: builtInPlatforms[key]?.icon || platformSettings.icon || '🌐',
                        isCustom: platformSettings.isCustom || false
                    };
                    enabledPlatforms.push(platformInfo);
                }
            });
        }

        // Sort platforms - built-in first, then custom
        enabledPlatforms.sort((a, b) => {
            if (a.isCustom !== b.isCustom) {
                return a.isCustom ? 1 : -1;
            }
            return a.name.localeCompare(b.name);
        });

        enabledPlatforms.forEach(platform => {
            const platformSettings = settings.platforms[platform.key];
            const usage = stats.dailyUsage?.[platform.key] || 0;
            const usageMinutes = Math.floor(usage / 60);
            const limit = platformSettings.dailyLimit || 0;
            
            const item = this.createPlatformItem(
                platform, 
                usageMinutes, 
                limit
            );
            platformList.appendChild(item);
        });

        if (platformList.children.length === 0) {
            const emptyState = document.createElement('div');
            emptyState.className = 'empty-state';
            emptyState.innerHTML = `
                <div style="text-align: center; padding: 20px; color: rgba(255, 255, 255, 0.7);">
                    <div style="font-size: 32px; margin-bottom: 12px;">🚀</div>
                    <div>No platforms configured yet</div>
                    <div style="font-size: 12px; margin-top: 8px;">
                        Click Settings to get started
                    </div>
                </div>
            `;
            platformList.appendChild(emptyState);
        }
    }

    createPlatformItem(platform, usageMinutes, limit) {
        const item = document.createElement('div');
        item.className = 'platform-item';
        
        const usagePercentage = limit > 0 ? (usageMinutes / limit) : 0;
        let indicatorClass = 'usage-indicator';
        
        if (usagePercentage >= 1) {
            indicatorClass += ' danger';
        } else if (usagePercentage >= 0.75) {
            indicatorClass += ' warning';
        }

        const usageText = limit > 0 ? 
            `${usageMinutes}m / ${limit}m` : 
            `${usageMinutes}m`;

        item.innerHTML = `
            <div class="platform-info">
                <div class="platform-icon">${platform.icon}</div>
                <div class="platform-name">${platform.name}</div>
            </div>
            <div class="platform-usage">
                <div class="usage-time">${usageText}</div>
                <div class="${indicatorClass}"></div>
            </div>
        `;

        return item;
    }

    updateFocusStatus(settings) {
        const focusStatus = document.getElementById('focus-status');
        const focusBtn = document.getElementById('focus-mode-btn');

        if (settings.focusMode && settings.focusUntil) {
            const focusUntil = new Date(settings.focusUntil);
            const now = new Date();
            
            if (focusUntil > now) {
                // Focus mode is active
                focusStatus.classList.remove('hidden');
                document.getElementById('focus-until').textContent = 
                    `Until ${focusUntil.toLocaleTimeString()}`;
                
                focusBtn.innerHTML = `
                    <span class="btn-icon">🔓</span>
                    <span class="btn-text">End Focus Mode</span>
                `;
                focusBtn.onclick = () => this.endFocusMode();
            } else {
                // Focus mode expired
                focusStatus.classList.add('hidden');
                this.resetFocusButton();
            }
        } else {
            focusStatus.classList.add('hidden');
            this.resetFocusButton();
        }
    }

    resetFocusButton() {
        const focusBtn = document.getElementById('focus-mode-btn');
        focusBtn.innerHTML = `
            <span class="btn-icon">🎯</span>
            <span class="btn-text">Start Focus Mode</span>
        `;
        focusBtn.onclick = () => this.showFocusModal();
    }

    updateRecentBadges(stats) {
        const badgesContainer = document.getElementById('recent-badges');
        badgesContainer.innerHTML = '';

        const badges = stats.badges || [];
        const recentBadges = badges.slice(-3); // Show last 3 badges

        const badgeInfo = {
            'first_day': { name: 'First Day', icon: '🌟' },
            'week_strong': { name: 'Week Strong', icon: '💪' },
            'points_100': { name: '100 Points', icon: '🏆' },
            'points_500': { name: '500 Points', icon: '👑' },
            'focus_master': { name: 'Focus Master', icon: '🎯' },
            'streak_3': { name: '3 Day Streak', icon: '🔥' },
            'streak_7': { name: '7 Day Streak', icon: '⚡' }
        };

        recentBadges.forEach(badgeId => {
            const badge = badgeInfo[badgeId];
            if (badge) {
                const badgeElement = document.createElement('div');
                badgeElement.className = 'badge';
                badgeElement.innerHTML = `
                    <span class="badge-icon">${badge.icon}</span>
                    <span class="badge-name">${badge.name}</span>
                `;
                badgesContainer.appendChild(badgeElement);
            }
        });

        if (recentBadges.length === 0) {
            const emptyBadge = document.createElement('div');
            emptyBadge.className = 'badge';
            emptyBadge.innerHTML = `
                <span class="badge-icon">🎯</span>
                <span class="badge-name">Start your journey!</span>
            `;
            badgesContainer.appendChild(emptyBadge);
        }
    }

    showMotivationalMessage() {
        const messages = [
            "You're doing great! 🌟",
            "Stay focused! 💪",
            "Every minute counts! ⏰",
            "Building healthy habits! 🌱",
            "You're in control! 🎯",
            "Keep up the momentum! 🚀",
            "Progress over perfection! ✨",
            "Mindful usage rocks! 🧘‍♀️"
        ];

        const randomMessage = messages[Math.floor(Math.random() * messages.length)];
        document.getElementById('motivational-message').textContent = randomMessage;
    }

    showFocusModal() {
        const modal = document.getElementById('focus-modal');
        modal.classList.remove('hidden');
        
        // Reset selections
        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById('custom-duration-input').value = '';
        this.selectedDuration = null;
    }

    hideFocusModal() {
        const modal = document.getElementById('focus-modal');
        modal.classList.add('hidden');
    }

    async startFocusMode() {
        if (!this.selectedDuration) {
            alert('Please select a duration for focus mode.');
            return;
        }

        try {
            await chrome.runtime.sendMessage({
                action: 'toggleFocusMode',
                duration: this.selectedDuration
            });

            this.hideFocusModal();
            await this.loadData(); // Refresh the UI
            
            // Show confirmation
            this.showNotification('🎯 Focus mode activated!', 'success');
        } catch (error) {
            console.error('Error starting focus mode:', error);
            alert('Failed to start focus mode. Please try again.');
        }
    }

    async endFocusMode() {
        try {
            await chrome.runtime.sendMessage({
                action: 'toggleFocusMode',
                duration: 0
            });

            await this.loadData(); // Refresh the UI
            this.showNotification('Focus mode ended', 'info');
        } catch (error) {
            console.error('Error ending focus mode:', error);
        }
    }

    setupTheme() {
        // Check for saved theme preference or default to light mode
        const savedTheme = localStorage.getItem('detoxTimerTheme') || 'light';
        this.setTheme(savedTheme);
    }

    toggleTheme() {
        const currentTheme = document.body.classList.contains('dark-mode') ? 'dark' : 'light';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        this.setTheme(newTheme);
    }

    setTheme(theme) {
        if (theme === 'dark') {
            document.body.classList.add('dark-mode');
            document.getElementById('theme-toggle').textContent = '☀️';
        } else {
            document.body.classList.remove('dark-mode');
            document.getElementById('theme-toggle').textContent = '🌙';
        }
        
        localStorage.setItem('detoxTimerTheme', theme);
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            left: 50%;
            transform: translateX(-50%);
            background: ${type === 'success' ? '#4CAF50' : '#2196F3'};
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            font-size: 14px;
            font-weight: 500;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
            z-index: 10000;
            animation: slideDown 0.3s ease;
        `;

        document.body.appendChild(notification);

        // Remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.remove();
            }
        }, 3000);
    }
}

// Initialize popup when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new PopupController();
});

// Add slideDown animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideDown {
        from {
            opacity: 0;
            transform: translateX(-50%) translateY(-20px);
        }
        to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
    }
`;
document.head.appendChild(style);