// ==UserScript==
// @name         RoTags
// @namespace    http://tampermonkey.net/
// @version      3.0
// @description  Add beautiful custom tags to Roblox user profiles with backend storage
// @author       HazFox
// @match        https://www.roblox.com/users/*/profile*
// @grant        GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    // Configuration - Direct API access (no proxy needed with GM_xmlhttpRequest)
    const API_BASE_URL = 'https://ro-tags.replit.app/api';

    // Inject custom CSS for animations and effects
    const style = document.createElement('style');
    style.textContent = `
        @keyframes tagSlideIn {
            from {
                opacity: 0;
                transform: translateY(-10px) scale(0.95);
            }
            to {
                opacity: 1;
                transform: translateY(0) scale(1);
            }
        }

        @keyframes tagPulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        @keyframes shimmer {
            0% { background-position: -200px 0; }
            100% { background-position: 200px 0; }
        }

        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }

        .user-tag {
            animation: tagSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .user-tag:hover {
            animation: tagPulse 0.6s ease-in-out;
        }

        .loading-spinner {
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-radius: 50%;
            border-top-color: #fff;
            animation: spin 1s linear infinite;
        }

        .add-tag-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.6s ease;
        }

        .add-tag-btn:hover::before {
            left: 100%;
        }

        .error-message {
            color: #ef4444;
            font-size: 12px;
            margin-top: 4px;
            font-weight: 500;
            animation: tagSlideIn 0.3s ease;
        }

        .success-message {
            color: #10b981;
            font-size: 12px;
            margin-top: 4px;
            font-weight: 500;
            animation: tagSlideIn 0.3s ease;
        }
    `;
    document.head.appendChild(style);

    // API Helper Functions
    const api = {
        async request(endpoint, options = {}) {
            return new Promise((resolve, reject) => {
                const url = `${API_BASE_URL}${endpoint}`;

                GM_xmlhttpRequest({
                    method: options.method || 'GET',
                    url: url,
                    headers: {
                        'Content-Type': 'application/json',
                        ...options.headers
                    },
                    data: options.body,
                    onload: function(response) {
                        try {
                            const data = JSON.parse(response.responseText);

                            if (response.status >= 200 && response.status < 300) {
                                resolve(data);
                            } else {
                                reject(new Error(data.error || 'API request failed'));
                            }
                        } catch (error) {
                            reject(new Error('Failed to parse response: ' + error.message));
                        }
                    },
                    onerror: function(error) {
                        reject(new Error('Network error: ' + error.error));
                    },
                    ontimeout: function() {
                        reject(new Error('Request timeout'));
                    },
                    timeout: 10000 // 10 second timeout
                });
            });
        },

        async getTags(userId) {
            return this.request(`/users/${userId}/tags`);
        },

        async createTag(userId, tagData) {
            return this.request(`/users/${userId}/tags`, {
                method: 'POST',
                body: JSON.stringify(tagData)
            });
        },

        async updateTag(userId, tagId, tagData) {
            return this.request(`/users/${userId}/tags/${tagId}`, {
                method: 'PUT',
                body: JSON.stringify(tagData)
            });
        },

        async deleteTag(userId, tagId) {
            return this.request(`/users/${userId}/tags/${tagId}`, {
                method: 'DELETE'
            });
        },

        async uploadIcon(file) {
            return new Promise((resolve, reject) => {
                const formData = new FormData();
                formData.append('icon', file);

                GM_xmlhttpRequest({
                    method: 'POST',
                    url: `${API_BASE_URL}/upload/icon`,
                    data: formData,
                    onload: function(response) {
                        try {
                            const data = JSON.parse(response.responseText);
                            if (response.status >= 200 && response.status < 300) {
                                resolve(data);
                            } else {
                                reject(new Error(data.error || 'Upload failed'));
                            }
                        } catch (error) {
                            reject(new Error('Failed to parse upload response'));
                        }
                    },
                    onerror: function(error) {
                        reject(new Error('Upload network error: ' + error.error));
                    }
                });
            });
        }
    };

    // Get user ID from URL
    function getUserId() {
        const match = window.location.pathname.match(/\/users\/(\d+)/);
        return match ? match[1] : null;
    }

    // Get current logged-in user ID
    function getCurrentUserId() {
        // Try to get from Roblox's global user data
        if (window.Roblox && window.Roblox.config && window.Roblox.config.CurrentUser) {
            return window.Roblox.config.CurrentUser.userId?.toString();
        }

        // Fallback: try to get from meta tag
        const userDataMeta = document.querySelector('meta[name="user-data"]');
        if (userDataMeta) {
            try {
                const userData = JSON.parse(userDataMeta.getAttribute('data-userid'));
                return userData?.toString();
            } catch (e) {
                console.warn('Could not parse user data from meta tag');
            }
        }

        // Another fallback: check for authentication cookie or other indicators
        const authCookie = document.cookie.split(';').find(cookie =>
            cookie.trim().startsWith('.ROBLOSECURITY=')
        );

        if (!authCookie) {
            return null; // User is not logged in
        }

        // If we can't determine the user ID but they're logged in,
        // we'll need to make an API call to Roblox to get it
        return 'unknown';
    }

    // Check if current user can manage tags for this profile
    function canManageTags(profileUserId) {
        const currentUserId = getCurrentUserId();

        if (!currentUserId) {
            console.log('User not logged in');
            return false;
        }

        if (currentUserId === 'unknown') {
            console.warn('Could not determine current user ID');
            return false;
        }

        const canManage = currentUserId === profileUserId;
        console.log(`Current user: ${currentUserId}, Profile user: ${profileUserId}, Can manage: ${canManage}`);

        return canManage;
    }

    // Predefined beautiful color schemes
    const colorSchemes = {
        'ocean': { bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', border: '#667eea' },
        'sunset': { bg: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', border: '#f093fb' },
        'forest': { bg: 'linear-gradient(135deg, #4ecdc4 0%, #44a08d 100%)', border: '#4ecdc4' },
        'fire': { bg: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)', border: '#ff9a9e' },
        'night': { bg: 'linear-gradient(135deg, #434343 0%, #000000 100%)', border: '#434343' },
        'royal': { bg: 'linear-gradient(135deg, #8360c3 0%, #2ebf91 100%)', border: '#8360c3' },
        'gold': { bg: 'linear-gradient(135deg, #ffd89b 0%, #19547b 100%)', border: '#ffd89b' },
        'cyber': { bg: 'linear-gradient(135deg, #0f3460 0%, #e94560 100%)', border: '#0f3460' }
    };

    // Show notification
    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            font-size: 14px;
            z-index: 10001;
            animation: tagSlideIn 0.3s ease;
            max-width: 300px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        `;

        switch (type) {
            case 'success':
                notification.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
                break;
            case 'error':
                notification.style.background = 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
                break;
            default:
                notification.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        }

        notification.textContent = message;
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    // Create enhanced tag element
    function createTagElement(tag, userId, canManage = false) {
        const tagElement = document.createElement('div');
        tagElement.className = 'user-tag';
        tagElement.dataset.tagId = tag.id;

        // Debug log to see what color we're getting
        console.log('Tag color:', tag.color, 'Available schemes:', Object.keys(colorSchemes));

        // Use predefined color scheme or create a custom one
        let colorScheme;
        if (colorSchemes[tag.color]) {
            colorScheme = colorSchemes[tag.color];
        } else if (tag.color && tag.color.startsWith('#')) {
            // Handle hex colors
            colorScheme = {
                bg: `linear-gradient(135deg, ${tag.color} 0%, ${adjustColor(tag.color, -20)} 100%)`,
                border: tag.color
            };
        } else {
            // Fallback to ocean if color is invalid
            console.warn('Unknown color scheme:', tag.color, 'falling back to ocean');
            colorScheme = colorSchemes.ocean;
        }

        tagElement.style.cssText = `
            display: inline-flex;
            align-items: center;
            background: ${colorScheme.bg};
            color: white;
            height: 28px;
            margin: 3px 6px 3px 0;
            font-size: 12px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            cursor: pointer;
            border: 1.5px solid ${colorScheme.border}40;
            border-radius: 20px;
            padding: 0 12px;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1);
            backdrop-filter: blur(10px);
            text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
            letter-spacing: 0.02em;
            user-select: none;
        `;

        // Add glass effect overlay
        const glassOverlay = document.createElement('div');
        glassOverlay.style.cssText = `
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 50%;
            background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%);
            border-radius: 20px 20px 0 0;
            pointer-events: none;
        `;
        tagElement.appendChild(glassOverlay);

        // Create content container
        const content = document.createElement('div');
        content.style.cssText = `
            display: flex;
            align-items: center;
            position: relative;
            z-index: 1;
            gap: 6px;
        `;

        // Add icon if provided
        if (tag.icon) {
            const iconContainer = document.createElement('div');
            iconContainer.style.cssText = `
                width: 18px;
                height: 18px;
                overflow: hidden;
                display: flex;
                align-items: center;
                justify-content: center;
            `;

            const icon = document.createElement('img');

            // If it's already a data URL, use it directly
            if (tag.icon.startsWith('data:')) {
                icon.src = tag.icon;
                icon.style.cssText = `
                    width: 100%;
                    height: 100%;
                    object-fit: cover;
                `;
                iconContainer.appendChild(icon);
                content.appendChild(iconContainer);
            } else {
                // Convert external URL to base64 data URL using GM_xmlhttpRequest
                const iconUrl = tag.icon.startsWith('http') ? tag.icon :
                               `${API_BASE_URL.replace('/api', '')}${tag.icon}`;

                GM_xmlhttpRequest({
                    method: 'GET',
                    url: iconUrl,
                    responseType: 'blob',
                    onload: function(response) {
                        const reader = new FileReader();
                        reader.onload = function() {
                            icon.src = reader.result;
                            icon.style.cssText = `
                                width: 100%;
                                height: 100%;
                                object-fit: cover;
                            `;
                            iconContainer.appendChild(icon);
                        };
                        reader.readAsDataURL(response.response);
                    },
                    onerror: function() {
                        // Fallback: show container without image
                        iconContainer.innerHTML = '🏷️';
                        iconContainer.style.fontSize = '10px';
                    }
                });
                content.appendChild(iconContainer);
            }
        }

        // Add text with enhanced styling
        const textSpan = document.createElement('span');
        textSpan.textContent = tag.text;
        textSpan.style.cssText = `
            line-height: 1;
            font-weight: 600;
        `;
        content.appendChild(textSpan);

        tagElement.appendChild(content);

        // Enhanced hover effects
        tagElement.addEventListener('mouseenter', () => {
            tagElement.style.transform = 'translateY(-2px) scale(1.05)';
            tagElement.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)';
            tagElement.style.filter = 'brightness(1.1) saturate(1.2)';
            tagElement.style.borderColor = colorScheme.border + '80';
        });

        tagElement.addEventListener('mouseleave', () => {
            tagElement.style.transform = 'translateY(0) scale(1)';
            tagElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)';
            tagElement.style.filter = 'brightness(1) saturate(1)';
            tagElement.style.borderColor = colorScheme.border + '40';
        });

        // Right-click to delete with API call (only if user can manage tags)
        if (canManage) {
            tagElement.addEventListener('contextmenu', async (e) => {
                e.preventDefault();

                if (confirm(`🗑️ Delete tag "${tag.text}"?`)) {
                    try {
                        // Add loading state
                        tagElement.style.opacity = '0.5';
                        tagElement.style.pointerEvents = 'none';

                        await api.deleteTag(userId, tag.id);

                        // Animate removal
                        tagElement.style.animation = 'tagSlideIn 0.3s reverse';
                        setTimeout(() => tagElement.remove(), 300);

                        showNotification('Tag deleted successfully', 'success');
                    } catch (error) {
                        tagElement.style.opacity = '1';
                        tagElement.style.pointerEvents = 'auto';
                        showNotification('Failed to delete tag: ' + error.message, 'error');
                    }
                }
            });
        } else {
            // Add a subtle visual indication that tags aren't manageable
            tagElement.style.cursor = 'default';
        }

        return tagElement;
    }

    // Helper function to adjust color brightness
    function adjustColor(color, amount) {
        const usePound = color[0] === '#';
        color = color.slice(usePound ? 1 : 0);

        const num = parseInt(color, 16);
        let r = (num >> 16) + amount;
        let g = (num >> 8 & 0x00FF) + amount;
        let b = (num & 0x0000FF) + amount;

        r = r > 255 ? 255 : r < 0 ? 0 : r;
        g = g > 255 ? 255 : g < 0 ? 0 : g;
        b = b > 255 ? 255 : b < 0 ? 0 : b;

        return (usePound ? '#' : '') + (r << 16 | g << 8 | b).toString(16).padStart(6, '0');
    }

    // Create enhanced add tag button
    function createAddTagButton(userId, container) {
        const addButton = document.createElement('button');
        addButton.className = 'add-tag-btn';
        addButton.innerHTML = `
            <span style="display: flex; align-items: center; gap: 4px; position: relative; z-index: 1;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Tag
            </span>
        `;

        addButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: 1.5px solid #667eea40;
            padding: 0 14px;
            margin: 3px 6px 3px 0;
            border-radius: 20px;
            height: 28px;
            font-size: 12px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(102, 126, 234, 0.25), 0 1px 3px rgba(0, 0, 0, 0.1);
            letter-spacing: 0.02em;
            position: relative;
            overflow: hidden;
            outline: none;
            backdrop-filter: blur(10px);
            user-select: none;
        `;

        addButton.addEventListener('mouseenter', () => {
            addButton.style.transform = 'translateY(-2px) scale(1.05)';
            addButton.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15)';
            addButton.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
            addButton.style.borderColor = '#667eea80';
        });

        addButton.addEventListener('mouseleave', () => {
            addButton.style.transform = 'translateY(0) scale(1)';
            addButton.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.25), 0 1px 3px rgba(0, 0, 0, 0.1)';
            addButton.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            addButton.style.borderColor = '#667eea40';
        });

        addButton.addEventListener('click', () => {
            const modal = createModal(userId, container, addButton);
            document.body.appendChild(modal);
            setTimeout(() => modal.style.opacity = '1', 10);
        });

        return addButton;
    }

    function createModal(userId, container, addButton) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.85);
            backdrop-filter: blur(12px);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;

        const modalContent = document.createElement('div');
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d30 100%);
            border-radius: 16px;
            padding: 24px;
            min-width: 420px;
            max-width: 500px;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.08);
            position: relative;
            overflow: hidden;
        `;

        modalContent.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <div style="width: 8px; height: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 50%; box-shadow: 0 0 12px rgba(102, 126, 234, 0.4);"></div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Create New Tag</h3>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #b4b4b4; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Tag Name</label>
                <input type="text" id="tagNameInput" placeholder="Enter tag name..." style="width: 100%; padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; font-size: 14px; transition: all 0.2s ease; box-sizing: border-box; font-family: inherit; color: #ffffff;" />
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #b4b4b4; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Choose Icon</label>
                <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 16px;">
                    <input type="file" id="iconInput" accept="image/png,image/jpg,image/jpeg,image/gif,image/webp" style="display: none;" />
                    <button id="iconBtn" style="padding: 8px 16px; background: rgba(255, 255, 255, 0.08); border: 1px solid rgba(255, 255, 255, 0.12); border-radius: 6px; color: #b4b4b4; font-size: 12px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; font-family: inherit;">Choose Icon</button>
                    <div id="iconPreview" style="width: 32px; height: 32px; border-radius: 6px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); display: none; align-items: center; justify-content: center; overflow: hidden;"></div>
                    <button id="removeIcon" style="display: none; padding: 6px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 4px; color: #ef4444; font-size: 12px; cursor: pointer; transition: all 0.2s ease;">×</button>
                </div>
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 12px; font-weight: 500; color: #b4b4b4; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Color Scheme</label>
                <div id="colorOptions" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;"></div>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancelBtn" style="padding: 10px 20px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.05); border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; font-family: inherit; color: #b4b4b4; font-size: 14px;">Cancel</button>
                <button id="createBtn" style="padding: 10px 20px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit; font-size: 14px;">Create Tag</button>
            </div>
        `;

        // Add color options
        const colorContainer = modalContent.querySelector('#colorOptions');
        Object.entries(colorSchemes).forEach(([name, scheme], index) => {
            const colorOption = document.createElement('div');
            colorOption.style.cssText = `
                width: 80px;
                height: 32px;
                background: ${scheme.bg};
                border-radius: 6px;
                cursor: pointer;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.2s ease;
                position: relative;
                display: flex;
                align-items: center;
                justify-content: center;
                font-size: 10px;
                font-weight: 500;
                color: white;
                text-shadow: 0 1px 2px rgba(0,0,0,0.4);
                text-transform: capitalize;
            `;
            colorOption.textContent = name;
            colorOption.dataset.color = name;

            // Set ocean as default selection
            if (name === 'ocean') {
                colorOption.style.borderColor = '#667eea';
                colorOption.style.transform = 'scale(1.05)';
                colorOption.style.boxShadow = '0 0 12px rgba(102, 126, 234, 0.4)';
                colorOption.setAttribute('data-selected', 'true');
            }

            colorOption.addEventListener('click', () => {
                // Remove selection from all options
                document.querySelectorAll('#colorOptions > div').forEach(el => {
                    el.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    el.style.transform = 'scale(1)';
                    el.style.boxShadow = 'none';
                    el.removeAttribute('data-selected');
                });

                // Mark this option as selected
                colorOption.style.borderColor = '#667eea';
                colorOption.style.transform = 'scale(1.05)';
                colorOption.style.boxShadow = '0 0 12px rgba(102, 126, 234, 0.4)';
                colorOption.setAttribute('data-selected', 'true');

                console.log('Selected color:', name); // Debug log
            });

            colorContainer.appendChild(colorOption);
        });

        // Icon handling
        const iconBtn = modalContent.querySelector('#iconBtn');
        const iconInput = modalContent.querySelector('#iconInput');
        const iconPreview = modalContent.querySelector('#iconPreview');
        const removeIcon = modalContent.querySelector('#removeIcon');
        let selectedIconFile = null;
        let selectedIconUrl = null;

        iconBtn.addEventListener('click', () => iconInput.click());

        iconBtn.addEventListener('mouseenter', () => {
            iconBtn.style.background = 'rgba(255, 255, 255, 0.12)';
            iconBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            iconBtn.style.color = '#ffffff';
        });

        iconBtn.addEventListener('mouseleave', () => {
            iconBtn.style.background = 'rgba(255, 255, 255, 0.08)';
            iconBtn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            iconBtn.style.color = '#b4b4b4';
        });

        iconInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                selectedIconFile = file;
                const reader = new FileReader();
                reader.onload = (event) => {
                    selectedIconUrl = event.target.result;
                    iconPreview.innerHTML = `<img src="${selectedIconUrl}" style="width: 100%; height: 100%; object-fit: cover;" />`;
                    iconPreview.style.display = 'flex';
                    removeIcon.style.display = 'block';
                };
                reader.readAsDataURL(file);
            }
        });

        removeIcon.addEventListener('click', () => {
            selectedIconFile = null;
            selectedIconUrl = null;
            iconPreview.style.display = 'none';
            removeIcon.style.display = 'none';
            iconInput.value = '';
        });

        removeIcon.addEventListener('mouseenter', () => {
            removeIcon.style.background = 'rgba(239, 68, 68, 0.2)';
        });

        removeIcon.addEventListener('mouseleave', () => {
            removeIcon.style.background = 'rgba(239, 68, 68, 0.1)';
        });

        // Event listeners
        const nameInput = modalContent.querySelector('#tagNameInput');
        const cancelBtn = modalContent.querySelector('#cancelBtn');
        const createBtn = modalContent.querySelector('#createBtn');

        nameInput.addEventListener('focus', () => {
            nameInput.style.borderColor = 'rgba(102, 126, 234, 0.6)';
            nameInput.style.boxShadow = '0 0 0 2px rgba(102, 126, 234, 0.1)';
            nameInput.style.background = 'rgba(255, 255, 255, 0.08)';
        });

        nameInput.addEventListener('blur', () => {
            nameInput.style.borderColor = 'rgba(255, 255, 255, 0.1)';
            nameInput.style.boxShadow = 'none';
            nameInput.style.background = 'rgba(255, 255, 255, 0.05)';
        });

        cancelBtn.addEventListener('mouseenter', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.08)';
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.2)';
            cancelBtn.style.color = '#ffffff';
        });

        cancelBtn.addEventListener('mouseleave', () => {
            cancelBtn.style.background = 'rgba(255, 255, 255, 0.05)';
            cancelBtn.style.borderColor = 'rgba(255, 255, 255, 0.12)';
            cancelBtn.style.color = '#b4b4b4';
        });

        createBtn.addEventListener('mouseenter', () => {
            createBtn.style.background = 'linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%)';
            createBtn.style.transform = 'translateY(-1px)';
        });

        createBtn.addEventListener('mouseleave', () => {
            createBtn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
            createBtn.style.transform = 'translateY(0)';
        });

        cancelBtn.addEventListener('click', () => closeModal());

        createBtn.addEventListener('click', async () => {
            const tagText = nameInput.value.trim();
            const selectedColorElement = document.querySelector('#colorOptions > div[data-selected="true"]');

            // Clear previous error messages
            const existingError = modalContent.querySelector('.error-message');
            if (existingError) existingError.remove();

            if (!tagText) {
                nameInput.style.borderColor = '#ef4444';
                nameInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';

                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Tag name is required!';
                nameInput.parentNode.appendChild(errorMsg);
                nameInput.focus();
                return;
            }

            const colorScheme = selectedColorElement ? selectedColorElement.dataset.color : 'ocean';

            // Show loading state
            createBtn.innerHTML = '<div class="loading-spinner"></div>';
            createBtn.disabled = true;

            try {
                let iconUrl = null;

                // Upload icon if selected
                if (selectedIconFile) {
                    const uploadResult = await api.uploadIcon(selectedIconFile);
                    if (uploadResult.success) {
                        iconUrl = uploadResult.data.iconUrl;
                    } else {
                        throw new Error('Failed to upload icon');
                    }
                }

                // Create tag
                const tagData = {
                    text: tagText,
                    color: colorScheme,
                    icon: iconUrl
                };

                console.log('Sending tag data:', tagData); // Debug log

                const result = await api.createTag(userId, tagData);

                if (result.success) {
                    const tagElement = createTagElement(result.data, userId);
                    container.insertBefore(tagElement, addButton);
                    showNotification('Tag created successfully!', 'success');
                    closeModal();
                } else {
                    throw new Error(result.error || 'Failed to create tag');
                }
            } catch (error) {
                createBtn.innerHTML = 'Create Tag';
                createBtn.disabled = false;

                if (error.message.includes('already exists')) {
                    nameInput.style.borderColor = '#ef4444';
                    nameInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';

                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Tag already exists!';
                    nameInput.parentNode.appendChild(errorMsg);
                } else {
                    showNotification('Failed to create tag: ' + error.message, 'error');
                }
            }
        });

        function closeModal() {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });

        modal.appendChild(modalContent);
        return modal;
    }

    // Main function to add tags section
    async function addTagsSection() {
        const userId = getUserId();
        if (!userId) return;

        const profileHeaderDetails = document.querySelector('.profile-header-details');
        const usernameElement = document.querySelector('.profile-header-username');

        if (!profileHeaderDetails || !usernameElement) {
            setTimeout(addTagsSection, 1000);
            return;
        }

        if (document.querySelector('.user-tags-container')) return;

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'user-tags-container';
        tagsContainer.style.cssText = `
            margin-top: 12px;
            margin-bottom: 8px;
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 2px;
        `;

        // Check if current user can manage tags for this profile
        const canManage = canManageTags(userId);

        try {
            // Load tags from API
            const response = await api.getTags(userId);
            const tags = response.data.tags || [];

            // Add staggered animation for existing tags
            tags.forEach((tag, index) => {
                setTimeout(() => {
                    const tagElement = createTagElement(tag, userId, canManage);
                    tagsContainer.appendChild(tagElement);
                }, index * 100);
            });

            // Only add the "Add Tag" button if user can manage tags
            if (canManage) {
                setTimeout(() => {
                    const addButton = createAddTagButton(userId, tagsContainer);
                    tagsContainer.appendChild(addButton);
                }, tags.length * 100 + 200);
            } else {
                console.log('User cannot manage tags for this profile - Add Tag button hidden');
            }

        } catch (error) {
            console.error('Failed to load tags:', error);
            showNotification('Failed to load tags. Using offline mode.', 'error');

            // Only add button if user can manage tags, even if API fails
            if (canManage) {
                const addButton = createAddTagButton(userId, tagsContainer);
                tagsContainer.appendChild(addButton);
            }
        }

        usernameElement.parentNode.insertBefore(tagsContainer, usernameElement.nextSibling);
    }

    // Initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', addTagsSection);
    } else {
        addTagsSection();
    }

    // Handle navigation changes (for single-page app behavior)
    let currentUrl = window.location.href;
    setInterval(() => {
        if (window.location.href !== currentUrl) {
            currentUrl = window.location.href;
            setTimeout(addTagsSection, 500);
        }
    }, 1000);

})();
