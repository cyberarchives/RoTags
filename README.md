
<div align="center">
  <img width="500" height="500" alt="ChatGPT_Image_Jul_25__2025__03_26_48_PM-removebg-preview" src="https://github.com/user-attachments/assets/7cc99ad3-6b8e-486e-acf4-fc10de4a1bdb" />
</div>

# 🏷 Roblox User Tags - Enhanced Profile Customization
A beautiful and feature-rich userscript that allows you to add custom tags with icons to Roblox user profiles. Create personalized tags with stunning gradient backgrounds, custom icons, and smooth animations to make profiles stand out!

![Roblox User Tags Demo](https://img.shields.io/badge/Version-3.0-blue?style=for-the-badge) ![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Required-green?style=for-the-badge) ![Roblox](https://img.shields.io/badge/Platform-Roblox-red?style=for-the-badge)

<img width="1115" height="427" alt="image" src="https://github.com/user-attachments/assets/6381a44b-2cdb-4b4e-98c2-0aa85c064dcb" />

## ✨ Features

### 🎨 **Beautiful Design**
- **8 Stunning Color Schemes**: Ocean, Sunset, Forest, Fire, Night, Royal, Gold, and Cyber gradients
- **Custom Icons**: Upload PNG, JPG, GIF, or WebP icons for your tags
- **Smooth Animations**: Slide-in effects, hover animations, and loading states
- **Glass Morphism Effects**: Modern UI with backdrop blur and gradient overlays

### 🔒 **Security & Privacy**
- **Profile Owner Only**: Only you can add/delete tags on your own profile
- **Secure API Integration**: All data stored safely on your backend server
- **CSP Bypass**: Uses Tampermonkey's built-in permissions to bypass browser restrictions

### 🚀 **User Experience**
- **Staggered Loading**: Tags appear with smooth staggered animations
- **Right-Click Deletion**: Easy tag management with confirmation prompts
- **Error Handling**: Graceful fallbacks and user-friendly error messages
- **Responsive Design**: Works seamlessly across different screen sizes

### 🛠️ **Technical Features**
- **Direct API Communication**: No CORS proxy needed thanks to GM_xmlhttpRequest
- **Base64 Icon Conversion**: Automatically converts uploaded icons to bypass CSP restrictions
- **Real-time Validation**: Instant feedback on tag creation and management
- **Offline Fallback**: Continues working even if API is temporarily unavailable

## 📋 Prerequisites

Before installing this userscript, make sure you have:

1. **Tampermonkey Browser Extension** installed:
   - [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - [Microsoft Edge Add-ons](https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd)

2. **Backend API Server** running (your ro-tags.replit.app server)

## 🚀 Installation

### Step 1: Install the Userscript

1. **Copy the userscript code** from the provided JavaScript file
2. **Open Tampermonkey Dashboard** (click the Tampermonkey icon → Dashboard)
3. **Click the "+" tab** to create a new userscript
4. **Replace the default code** with the Roblox User Tags code
5. **Save the script** (Ctrl+S or Cmd+S)

### Step 2: Grant Required Permissions

When you first visit a Roblox profile page, Tampermonkey will show a permission request:

![Permission Request](https://github.com/user-attachments/assets/6d877177-a16f-42c3-8c20-1e0b953f6658)

**🔴 IMPORTANT: Click "Always Allow" when prompted for GM_xmlhttpRequest permissions!**

This is required because:
- The script needs to bypass Roblox's Content Security Policy (CSP)
- It allows direct communication with your API server
- Without this permission, the script cannot load or save tags

### Step 3: Configure Your API URL

Make sure your API server is running and accessible at:
```
https://ro-tags.replit.app/api
```

If you're using a different URL, update the `API_BASE_URL` constant in the script:
```javascript
const API_BASE_URL = 'https://your-api-server.com/api';
```

## 🎯 Usage Guide

### Adding Tags to Your Profile

1. **Visit your own Roblox profile** (`https://www.roblox.com/users/YOUR_USER_ID/profile`)
2. **Look for the "Add Tag" button** below your username
3. **Click "Add Tag"** to open the creation modal

### Creating a New Tag

1. **Enter Tag Name**: Type your desired tag text
2. **Choose Icon** (optional):
   - Click "Choose Icon" button
   - Select an image file (PNG, JPG, GIF, WebP)
   - Preview appears instantly
3. **Select Color Scheme**: Click on one of the 8 gradient options
4. **Click "Create Tag"** to save

### Managing Existing Tags

- **View Tags**: All tags display automatically on profiles
- **Delete Tags**: Right-click any tag on your own profile and confirm deletion
- **Edit Tags**: Currently not supported (planned for future update)

### Viewing Other Users' Tags

- Visit any Roblox profile to see their custom tags
- Tags are read-only on other users' profiles
- No "Add Tag" button appears on profiles you don't own

## 🎨 Available Color Schemes

| Scheme | Description | Preview |
|--------|-------------|---------|
| **Ocean** | Blue to purple gradient | 🌊 #667eea → #764ba2 |
| **Sunset** | Pink to red gradient | 🌅 #f093fb → #f5576c |
| **Forest** | Teal to green gradient | 🌲 #4ecdc4 → #44a08d |
| **Fire** | Pink to light pink gradient | 🔥 #ff9a9e → #fecfef |
| **Night** | Dark gray to black gradient | 🌙 #434343 → #000000 |
| **Royal** | Purple to teal gradient | 👑 #8360c3 → #2ebf91 |
| **Gold** | Gold to blue gradient | ✨ #ffd89b → #19547b |
| **Cyber** | Dark blue to red gradient | 🤖 #0f3460 → #e94560 |

## 🔧 Troubleshooting

### Common Issues

**❌ "Failed to load tags" error**
- Check if your API server is running
- Verify the API_BASE_URL is correct
- Check browser console for detailed error messages

**❌ "Add Tag" button not appearing**
- Make sure you're on your own profile page
- Check that you're logged into Roblox
- Refresh the page and wait a few seconds

**❌ Icons not loading**
- This is normal due to Roblox's CSP - the script converts them to base64
- Wait a moment for the conversion to complete
- Check that your icon file is under 5MB

**❌ Permission denied errors**
- Make sure you clicked "Always Allow" for GM_xmlhttpRequest
- Go to Tampermonkey Dashboard → Settings → Security and check permissions

### Debug Information

Enable debug logging by opening browser console (F12) and checking for:
- Permission logs showing current user vs profile user
- Color selection logs when creating tags
- API request/response information

### Reset Instructions

If something goes wrong:
1. **Disable the userscript** in Tampermonkey Dashboard
2. **Clear browser cache** for roblox.com
3. **Re-enable the userscript** and grant permissions again

## 🛡️ Security & Privacy

### Data Storage
- All tag data is stored on your backend API server
- No data is stored locally in your browser
- Icons are converted to base64 and stored securely

### Permissions
- Script only runs on Roblox profile pages
- Only profile owners can modify their tags
- All API calls are authenticated and validated

### Content Security Policy (CSP)
- Uses Tampermonkey's GM_xmlhttpRequest to bypass Roblox's CSP
- Converts external images to base64 data URLs
- No external resources loaded that could compromise security

## 🔄 API Endpoints

Your backend server should implement these endpoints:

```http
GET    /api/users/:userId/tags          # Get user's tags
POST   /api/users/:userId/tags          # Create new tag
PUT    /api/users/:userId/tags/:tagId   # Update existing tag
DELETE /api/users/:userId/tags/:tagId   # Delete tag
POST   /api/upload/icon                 # Upload tag icon
```

## 🎯 Browser Compatibility

| Browser | Status | Notes |
|---------|--------|-------|
| Chrome | ✅ Fully Supported | Best performance |
| Firefox | ✅ Fully Supported | Works great |
| Edge | ✅ Fully Supported | Chromium-based |
| Safari | ⚠️ Limited | Tampermonkey required |
| Opera | ✅ Fully Supported | Works well |

## 📝 Changelog

### Version 3.0 (Current)
- ✨ Added GM_xmlhttpRequest for direct API communication
- 🎨 Implemented 8 beautiful gradient color schemes
- 🖼️ Added custom icon upload with base64 conversion
- 🔒 Added profile owner-only tag management
- 🎭 Enhanced UI with glass morphism effects
- 🚀 Improved animations and loading states

### Version 2.0
- 🌐 Added CORS proxy support
- 📡 Implemented backend API integration
- 🎨 Basic color customization

### Version 1.0
- 🏷️ Basic tag functionality
- 💾 Local storage only

## 🤝 Contributing

Want to improve the userscript? Here's how:

1. **Fork the project**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**
