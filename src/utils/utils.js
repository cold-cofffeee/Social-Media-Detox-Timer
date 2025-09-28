// Shared utility functions for Social Media Detox Timer

class DetoxUtils {
    // Format time from seconds to human readable string
    static formatTime(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }

    // Format time to just minutes
    static formatMinutes(seconds) {
        return Math.floor(seconds / 60);
    }

    // Get platform name from hostname
    static getPlatformName(hostname) {
        const platformMap = {
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

        const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');
        return platformMap[cleanHostname] || cleanHostname;
    }

    // Get platform icon
    static getPlatformIcon(hostname) {
        const iconMap = {
            'facebook.com': '📘',
            'instagram.com': '📷',
            'twitter.com': '🐦',
            'x.com': '❌',
            'tiktok.com': '🎵',
            'linkedin.com': '💼',
            'reddit.com': '🤖',
            'youtube.com': '📺',
            'snapchat.com': '👻',
            'pinterest.com': '📌'
        };

        const cleanHostname = hostname.toLowerCase().replace(/^www\./, '');
        return iconMap[cleanHostname] || '🌐';
    }

    // Calculate usage percentage
    static calculateUsagePercentage(used, limit) {
        if (limit === 0) return 0;
        return Math.min((used / limit) * 100, 100);
    }

    // Get usage status (low, medium, high, exceeded)
    static getUsageStatus(used, limit) {
        const percentage = this.calculateUsagePercentage(used, limit);
        
        if (percentage >= 100) return 'exceeded';
        if (percentage >= 75) return 'high';
        if (percentage >= 50) return 'medium';
        return 'low';
    }

    // Generate motivational messages
    static getMotivationalMessage(category = 'general') {
        const messages = {
            general: [
                "You're doing great! 🌟",
                "Stay focused! 💪",
                "Every minute counts! ⏰",
                "Building healthy habits! 🌱",
                "You're in control! 🎯",
                "Keep up the momentum! 🚀",
                "Progress over perfection! ✨",
                "Mindful usage rocks! 🧘‍♀️"
            ],
            warning: [
                "Time to take a break! 🛑",
                "Remember your goals! 🎯",
                "How about a walk instead? 🚶‍♀️",
                "Your future self will thank you! 💫",
                "Quality over quantity! 💎",
                "Stay strong! 💪",
                "Almost at your limit! ⚠️"
            ],
            achievement: [
                "Amazing progress! 🎉",
                "You've earned this! 🏆",
                "Consistency is key! 🔑",
                "Well done! 👏",
                "Keep it up! 🌟",
                "You're on fire! 🔥",
                "Fantastic work! ✨"
            ],
            streak: [
                "Streak master! 🔥",
                "Consistency champion! 🏆",
                "On a roll! 🎳",
                "Unstoppable! 🚀",
                "Building momentum! ⚡",
                "Day by day! 📅",
                "Habit hero! 🦸‍♀️"
            ]
        };

        const categoryMessages = messages[category] || messages.general;
        return categoryMessages[Math.floor(Math.random() * categoryMessages.length)];
    }

    // Generate random encouraging quote
    static getEncouragingQuote() {
        const quotes = [
            {
                text: "The time you enjoy wasting is not wasted time.",
                author: "Marthe Troly-Curtin"
            },
            {
                text: "Focus on being productive instead of busy.",
                author: "Tim Ferriss"
            },
            {
                text: "Quality is not an act, it is a habit.",
                author: "Aristotle"
            },
            {
                text: "The key is not to prioritize what's on your schedule, but to schedule your priorities.",
                author: "Stephen Covey"
            },
            {
                text: "Progress, not perfection, is the goal.",
                author: "Unknown"
            },
            {
                text: "Small daily improvements are the key to staggering long-term results.",
                author: "Robin Sharma"
            },
            {
                text: "You are never too old to set another goal or to dream a new dream.",
                author: "C.S. Lewis"
            }
        ];

        return quotes[Math.floor(Math.random() * quotes.length)];
    }

    // Validate time limit input
    static validateTimeLimit(minutes) {
        const min = parseInt(minutes);
        return !isNaN(min) && min >= 1 && min <= 1440; // 1 minute to 24 hours
    }

    // Get next milestone for gamification
    static getNextMilestone(currentPoints) {
        const milestones = [50, 100, 250, 500, 1000, 2500, 5000, 10000];
        return milestones.find(milestone => milestone > currentPoints) || 10000;
    }

    // Calculate points for different actions
    static calculatePoints(action, data = {}) {
        const pointsMap = {
            'under_daily_limit': 10,
            'under_session_limit': 5,
            'focus_mode_completed': 25,
            'streak_milestone': (days) => Math.min(days * 2, 100),
            'first_time_setup': 20,
            'week_completion': 50,
            'month_completion': 100
        };

        if (typeof pointsMap[action] === 'function') {
            return pointsMap[action](data.value || 0);
        }

        return pointsMap[action] || 0;
    }

    // Check if it's a new day
    static isNewDay(lastDate) {
        if (!lastDate) return true;
        
        const last = new Date(lastDate);
        const now = new Date();
        
        return last.toDateString() !== now.toDateString();
    }

    // Generate color based on usage level
    static getUsageColor(percentage) {
        if (percentage >= 100) return '#f44336'; // Red
        if (percentage >= 75) return '#FF5722';  // Deep Orange
        if (percentage >= 50) return '#FF9800';  // Orange
        if (percentage >= 25) return '#FFC107';  // Amber
        return '#4CAF50'; // Green
    }

    // Debounce function for performance
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for performance
    static throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Storage helpers
    static async getStorageData(keys) {
        try {
            return await chrome.storage.local.get(keys);
        } catch (error) {
            console.error('Error getting storage data:', error);
            return {};
        }
    }

    static async setStorageData(data) {
        try {
            await chrome.storage.local.set(data);
            return true;
        } catch (error) {
            console.error('Error setting storage data:', error);
            return false;
        }
    }

    // URL and domain helpers
    static extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.toLowerCase().replace(/^www\./, '');
        } catch (error) {
            return null;
        }
    }

    static isSocialMediaSite(url) {
        const domain = this.extractDomain(url);
        const socialDomains = [
            'facebook.com', 'instagram.com', 'twitter.com', 'x.com',
            'tiktok.com', 'linkedin.com', 'reddit.com', 'youtube.com',
            'snapchat.com', 'pinterest.com'
        ];
        
        return socialDomains.some(socialDomain => 
            domain && domain.includes(socialDomain)
        );
    }

    // Animation helpers
    static fadeIn(element, duration = 300) {
        element.style.opacity = '0';
        element.style.display = 'block';
        
        const start = performance.now();
        
        const fade = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = progress;
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            }
        };
        
        requestAnimationFrame(fade);
    }

    static fadeOut(element, duration = 300) {
        const start = performance.now();
        const startOpacity = parseFloat(element.style.opacity) || 1;
        
        const fade = (currentTime) => {
            const elapsed = currentTime - start;
            const progress = Math.min(elapsed / duration, 1);
            
            element.style.opacity = startOpacity * (1 - progress);
            
            if (progress < 1) {
                requestAnimationFrame(fade);
            } else {
                element.style.display = 'none';
            }
        };
        
        requestAnimationFrame(fade);
    }

    // Notification helpers
    static createNotification(title, message, type = 'basic') {
        if (!chrome.notifications) {
            console.warn('Notifications API not available');
            return;
        }

        const notificationOptions = {
            type: type,
            iconUrl: 'icons/icon48.png',
            title: title,
            message: message,
            priority: 1
        };

        chrome.notifications.create('', notificationOptions);
    }

    // Badge helpers
    static setBadgeText(text) {
        if (chrome.action && chrome.action.setBadgeText) {
            chrome.action.setBadgeText({ text: text.toString() });
        }
    }

    static setBadgeColor(color) {
        if (chrome.action && chrome.action.setBadgeBackgroundColor) {
            chrome.action.setBadgeBackgroundColor({ color: color });
        }
    }

    // Date and time helpers
    static getTimeUntilMidnight() {
        const now = new Date();
        const midnight = new Date(now);
        midnight.setHours(24, 0, 0, 0);
        return midnight.getTime() - now.getTime();
    }

    static formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    }

    static formatTime12Hour(date) {
        return new Intl.DateTimeFormat('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        }).format(new Date(date));
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = DetoxUtils;
} else if (typeof window !== 'undefined') {
    window.DetoxUtils = DetoxUtils;
}