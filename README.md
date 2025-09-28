# Social Media Detox Timer 🏆

A comprehensive Chrome extension designed to help users build healthier digital habits by tracking and limiting time spent on social media platforms. Features gamification, progress tracking, and gentle nudges to encourage mindful usage.

## 🌟 Features

### ⏱️ Time Tracking & Limits
- **Real-time tracking** of time spent on major social media platforms
- **Customizable daily and session limits** for each platform
- **Visual progress indicators** with color-coded status
- **Smart notifications** at 75% and 90% of limits

### 🎯 Focus Mode
- **Temporary blocking** of all social media sites
- **Flexible duration options** (15 minutes to 4+ hours)
- **Emergency override** for genuine emergencies
- **Smooth blocking experience** with motivational content

### 🏆 Gamification & Rewards
- **Points system** for staying under limits and achieving goals
- **Badge achievements** for various milestones
- **Streak tracking** with visual progress
- **Motivational messages** and encouraging quotes

### 📊 Analytics & Insights
- **Detailed usage statistics** with daily, weekly, and monthly views
- **Platform breakdown** showing your most-used services
- **Progress tracking** with visual charts and trends
- **Export functionality** for personal data analysis

### 🎨 User Experience
- **Beautiful, modern UI** with gradient backgrounds and smooth animations
- **Dark mode support** for comfortable night viewing
- **Responsive design** that works perfectly in the popup and full-page views
- **Non-intrusive notifications** that encourage rather than punish

## 🚀 Installation

### For Development
1. **Clone or download** this repository to your computer
2. **Open Chrome** and navigate to `chrome://extensions/`
3. **Enable Developer mode** (toggle in the top-right corner)
4. **Click "Load unpacked"** and select the project folder
5. **The extension icon** will appear in your Chrome toolbar

### For Users
1. Download the extension from the Chrome Web Store *(coming soon)*
2. Click "Add to Chrome" and confirm the installation
3. The extension will automatically start tracking your usage

## 📱 Supported Platforms

The extension currently tracks and manages time on:

- **Facebook** (facebook.com)
- **Instagram** (instagram.com) 
- **Twitter/X** (twitter.com, x.com)
- **TikTok** (tiktok.com)
- **LinkedIn** (linkedin.com)
- **Reddit** (reddit.com)
- **YouTube** (youtube.com)
- **Snapchat** (snapchat.com)
- **Pinterest** (pinterest.com)

## 🛠️ How It Works

### 1. **Initial Setup**
- Install the extension and click the icon in your toolbar
- Configure which platforms you want to track
- Set your desired daily and session limits
- Choose your notification preferences

### 2. **Daily Usage**
- The extension automatically tracks time when you visit social media sites
- A subtle overlay shows your current usage and remaining time
- Gentle notifications appear as you approach your limits
- Visual indicators help you stay aware of your usage patterns

### 3. **Focus Mode**
- Click the "Start Focus Mode" button when you need to concentrate
- Choose your focus duration (15 minutes to several hours)
- All tracked social media sites will be temporarily blocked
- Access a beautiful blocked page with alternatives and motivation

### 4. **Progress & Rewards**
- Earn points for staying under your limits
- Unlock badges for various achievements
- Build daily streaks by consistently meeting your goals
- View detailed statistics to understand your habits

## 🎯 Key Components

### Background Service Worker
- Handles timer logic and data persistence
- Manages focus mode and blocking functionality
- Processes achievements and points calculation
- Coordinates between all extension components

### Content Scripts
- Inject usage tracking into social media pages
- Display real-time usage overlays
- Show warnings and motivational messages
- Handle focus mode activation and blocking

### Popup Interface
- Quick overview of today's usage across all platforms
- One-click focus mode activation
- Progress visualization with charts and stats
- Easy access to settings and detailed views

### Options/Settings Page
- Comprehensive platform configuration
- Time limit management with preset options
- Rewards and achievements dashboard
- Detailed analytics and usage statistics
- Data export and management tools

## 🔧 Technical Details

### Architecture
- **Manifest V3** Chrome extension
- **Modern JavaScript** (ES6+) with async/await
- **CSS Grid & Flexbox** for responsive layouts
- **Chrome Storage API** for data persistence
- **Chrome Notifications API** for user alerts

### File Structure
```
Social-Media-Detox-Timer/
├── manifest.json                 # Extension manifest
├── src/
│   ├── background/
│   │   └── background.js         # Service worker
│   ├── content/
│   │   ├── content.js           # Content script
│   │   ├── content.css          # Content styles
│   │   └── blocked.html         # Blocked page
│   ├── popup/
│   │   ├── popup.html           # Popup interface
│   │   ├── popup.css            # Popup styles
│   │   └── popup.js             # Popup logic
│   ├── options/
│   │   ├── options.html         # Settings page
│   │   ├── options.css          # Settings styles
│   │   └── options.js           # Settings logic
│   └── utils/
│       └── utils.js             # Shared utilities
├── icons/                       # Extension icons
└── README.md                   # This file
```

### Key Features Implementation
- **Real-time tracking**: Uses Chrome alarms API with 1-second intervals
- **Data persistence**: Chrome Storage Local API for settings and statistics
- **Cross-tab coordination**: Background service worker manages all tabs
- **Responsive UI**: CSS Grid and Flexbox with mobile-first approach
- **Performance optimization**: Debounced events and efficient DOM updates

## 🎨 Design Philosophy

### User-Centered Approach
- **Encouraging, not punitive**: Focus on positive reinforcement
- **Gradual behavior change**: Support users in building sustainable habits
- **Transparency**: Clear visibility into usage patterns and progress
- **Flexibility**: Customizable limits and emergency override options

### Visual Design
- **Modern aesthetic**: Clean lines, smooth gradients, and thoughtful typography
- **Intuitive navigation**: Clear information hierarchy and logical flow
- **Consistent theming**: Cohesive color scheme and visual language
- **Accessibility**: High contrast ratios and readable font sizes

## 🔒 Privacy & Security

### Data Handling
- **Local storage only**: All data stays on your device
- **No external servers**: No data is sent to third parties
- **Export control**: Users can export their data anytime
- **Transparent permissions**: Only requests necessary Chrome permissions

### Permissions Explained
- **Active Tab**: To detect when you're on social media sites
- **Storage**: To save your settings and usage statistics
- **Notifications**: To send helpful reminders and achievements
- **Host Permissions**: To inject tracking scripts only on social media sites

## 🤝 Contributing

We welcome contributions to make this extension even better! Here's how you can help:

### Development Setup
1. **Fork this repository** and clone it locally
2. **Make your changes** following the existing code style
3. **Test thoroughly** with the Chrome extension developer tools
4. **Submit a pull request** with a clear description of your changes

### Areas for Contribution
- **New platform support**: Add tracking for additional social media sites
- **UI improvements**: Enhance the visual design and user experience
- **Feature additions**: Implement new gamification elements or analytics
- **Performance optimization**: Improve efficiency and reduce resource usage
- **Accessibility**: Make the extension more accessible to all users

## 📈 Future Roadmap

### Upcoming Features
- **Calendar integration**: Sync focus sessions with your schedule
- **Advanced analytics**: Weekly and monthly trend analysis
- **Custom challenges**: Set and track personal improvement goals
- **Social features**: Share progress with friends (optional)
- **Mobile companion**: Extend tracking to mobile browsers

### Platform Expansion
- **Additional social networks**: Support for emerging platforms
- **Productivity sites**: Optional tracking for news and entertainment sites
- **Custom site management**: Add any website to your tracking list

## 📞 Support & Feedback

### Getting Help
- **GitHub Issues**: Report bugs and request features
- **Documentation**: Check this README for detailed information
- **Developer Console**: Use browser dev tools for troubleshooting

### Contact Information
- **Project Repository**: [GitHub Link]
- **Developer**: [Your Contact Information]
- **License**: MIT License (see LICENSE file)

## 🙏 Acknowledgments

### Inspiration
This extension was created to address the growing need for digital wellness tools that help users build healthier relationships with social media while maintaining the benefits of staying connected.

### Technologies Used
- **Chrome Extension APIs**: Storage, Notifications, Alarms, Tabs
- **Modern Web Standards**: HTML5, CSS3, ES6+ JavaScript
- **Design Tools**: CSS Grid, Flexbox, CSS Variables
- **Development Tools**: Chrome Developer Tools, Git

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

**Built with ❤️ for digital wellness and mindful technology use.**

*Remember: The goal isn't to eliminate social media entirely, but to use it more intentionally and maintain a healthy balance in your digital life.*
