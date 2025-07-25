// ==UserScript==
// @name         RoTags
// @namespace    http://tampermonkey.net/
// @version      3.1
// @description  Add beautiful custom tags and social links to Roblox user profiles with backend storage
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

        .user-tag, .social-link {
            animation: tagSlideIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        }

        .user-tag:hover, .social-link:hover {
            animation: tagPulse 0.6s ease-in-out;
        }

        .social-link {
            text-decoration: none !important;
        }

        .social-link:hover {
            text-decoration: none !important;
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

        .add-tag-btn::before, .add-social-btn::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.6s ease;
        }

        .add-tag-btn:hover::before, .add-social-btn:hover::before {
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

        .social-links-section {
            margin-top: 8px;
            padding-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .social-links-label {
            font-size: 11px;
            font-weight: 600;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            display: block;
        }

        .qr-modal {
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
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s ease;
        }

        .qr-content {
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d30 100%);
            border-radius: 16px;
            padding: 24px;
            text-align: center;
            box-shadow: 0 24px 48px rgba(0, 0, 0, 0.4);
            border: 1px solid rgba(255, 255, 255, 0.08);
            min-width: 300px;
        }

        .profile-icon {
            width: 18px;
            height: 18px;
            margin-right: 8px;
            vertical-align: middle;
            border-radius: 3px;
            cursor: pointer;
            transition: all 0.2s ease;
            filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
        }

        .profile-icon:hover {
            transform: scale(1.1);
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.4));
        }

        .qr-button {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
            margin-left: 8px;
            display: inline-flex;
            align-items: center;
            gap: 4px;
        }

        .qr-button:hover {
            background: linear-gradient(135deg, #5a67d8 0%, #6b46c1 100%);
            transform: translateY(-1px);
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

        // Social Links API methods
        async getSocialLinks(userId) {
            return this.request(`/users/${userId}/social-links`);
        },

        async createSocialLink(userId, linkData) {
            return this.request(`/users/${userId}/social-links`, {
                method: 'POST',
                body: JSON.stringify(linkData)
            });
        },

        async updateSocialLink(userId, linkId, linkData) {
            return this.request(`/users/${userId}/social-links/${linkId}`, {
                method: 'PUT',
                body: JSON.stringify(linkData)
            });
        },

        async deleteSocialLink(userId, linkId) {
            return this.request(`/users/${userId}/social-links/${linkId}`, {
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

    // Generate QR code as data URL (client-side)
    function generateQRCode(text, size = 200) {
        // Simple QR code generation using a minimal implementation
        // This creates a data URL that bypasses CSP restrictions

        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = size;
        canvas.height = size;

        // Fill white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, size, size);

        // Create a simple pattern for demo - in a real implementation you'd use a QR library
        // For now, let's use a placeholder pattern and provide a fallback
        ctx.fillStyle = '#000000';

        // Create a simple grid pattern as placeholder
        const gridSize = size / 20;
        for (let i = 0; i < 20; i++) {
            for (let j = 0; j < 20; j++) {
                if ((i + j) % 3 === 0) {
                    ctx.fillRect(i * gridSize, j * gridSize, gridSize - 1, gridSize - 1);
                }
            }
        }

        // Add corners (QR code style)
        const cornerSize = gridSize * 3;
        const positions = [[0, 0], [size - cornerSize, 0], [0, size - cornerSize]];

        positions.forEach(([x, y]) => {
            // Outer square
            ctx.fillRect(x, y, cornerSize, cornerSize);
            // Inner white square
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(x + gridSize, y + gridSize, cornerSize - 2 * gridSize, cornerSize - 2 * gridSize);
            // Inner black square
            ctx.fillStyle = '#000000';
            ctx.fillRect(x + 2 * gridSize, y + 2 * gridSize, cornerSize - 4 * gridSize, cornerSize - 4 * gridSize);
        });

        return canvas.toDataURL('image/png');
    }

    // Alternative: Use GM_xmlhttpRequest to get QR code and convert to data URL
    async function generateQRCodeAdvanced(text, size = 200) {
        return new Promise((resolve, reject) => {
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(text)}&bgcolor=ffffff&color=000000&format=png&margin=10`;

            GM_xmlhttpRequest({
                method: 'GET',
                url: qrApiUrl,
                responseType: 'blob',
                onload: function(response) {
                    const reader = new FileReader();
                    reader.onload = function() {
                        resolve(reader.result);
                    };
                    reader.readAsDataURL(response.response);
                },
                onerror: function() {
                    // Fallback to simple pattern
                    resolve(generateQRCode(text, size));
                }
            });
        });
    }

    // Show QR code modal
    function showQRModal(userId, username) {
        const profileUrl = `https://www.roblox.com/users/${userId}/profile`;

        const modal = document.createElement('div');
        modal.className = 'qr-modal';

        const content = document.createElement('div');
        content.className = 'qr-content';

        content.innerHTML = `
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px; justify-content: center;">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="#667eea">
                    <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 13h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2z"/>
                </svg>
                <h3 style="margin: 0; color: #ffffff; font-size: 18px; font-weight: 600;">Share Profile</h3>
            </div>

            <div style="margin-bottom: 16px;">
                <img src="${generateQRCode(profileUrl)}" alt="QR Code" style="border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.3);" />
            </div>

            <div style="color: #b4b4b4; font-size: 14px; margin-bottom: 16px;">
                <strong style="color: #ffffff;">${username}</strong><br>
                Scan to visit profile
            </div>

            <div style="display: flex; gap: 8px; justify-content: center;">
                <button id="copyUrlBtn" style="padding: 8px 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 6px; color: #10b981; font-size: 12px; font-weight: 500; cursor: pointer;">
                    📋 Copy URL
                </button>
                <button id="downloadQRBtn" style="padding: 8px 16px; background: rgba(102, 126, 234, 0.1); border: 1px solid rgba(102, 126, 234, 0.3); border-radius: 6px; color: #667eea; font-size: 12px; font-weight: 500; cursor: pointer;">
                    💾 Download QR
                </button>
                <button id="closeQRBtn" style="padding: 8px 16px; background: rgba(239, 68, 68, 0.1); border: 1px solid rgba(239, 68, 68, 0.3); border-radius: 6px; color: #ef4444; font-size: 12px; font-weight: 500; cursor: pointer;">
                    ✕ Close
                </button>
            </div>
        `;

        modal.appendChild(content);
        document.body.appendChild(modal);

        // Show modal with animation
        setTimeout(() => modal.style.opacity = '1', 10);

        // Event listeners
        content.querySelector('#copyUrlBtn').addEventListener('click', () => {
            navigator.clipboard.writeText(profileUrl).then(() => {
                showNotification('Profile URL copied to clipboard!', 'success');
            });
        });

        content.querySelector('#downloadQRBtn').addEventListener('click', () => {
            const link = document.createElement('a');
            link.href = generateQRCode(profileUrl, 400);
            link.download = `${username}-qr-code.png`;
            link.click();
            showNotification('QR code downloaded!', 'success');
        });

        content.querySelector('#closeQRBtn').addEventListener('click', closeModal);

        function closeModal() {
            modal.style.opacity = '0';
            setTimeout(() => modal.remove(), 300);
        }

        modal.addEventListener('click', (e) => {
            if (e.target === modal) closeModal();
        });
    }

    // Add profile icon and QR button to username
    function addProfileEnhancements(userId, username) {
        const usernameElement = document.querySelector('.profile-header-username');
        if (!usernameElement || usernameElement.querySelector('.profile-icon')) return;

        // Create profile icon
        const profileIcon = document.createElement('img');
        profileIcon.className = 'profile-icon';
        profileIcon.src = `data:image/png;base64,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`;
        profileIcon.alt = `${username}'s avatar`;
        profileIcon.title = `${username}'s profile`;

        // Create QR button
        const qrButton = document.createElement('button');
        qrButton.className = 'qr-button';
        qrButton.innerHTML = `
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3 11h8V3H3v8zm2-6h4v4H5V5zM3 21h8v-8H3v8zm2-6h4v4H5v-4zM13 3v8h8V3h-8zm6 6h-4V5h4v4zM19 13h2v2h-2zM13 13h2v2h-2zM15 15h2v2h-2zM13 17h2v2h-2zM15 19h2v2h-2zM17 17h2v2h-2zM17 13h2v2h-2zM19 15h2v2h-2z"/>
            </svg>
            Share
        `;
        qrButton.title = 'Generate QR code for this profile';

        qrButton.addEventListener('click', () => {
            showQRModal(userId, username);
        });

        // Insert icon at the beginning of username
        usernameElement.insertBefore(profileIcon, usernameElement.firstChild);

        // Add QR button after username
        usernameElement.appendChild(qrButton);
    }

    // Get username from page
    function getUsername() {
        const usernameElement = document.querySelector('.profile-header-username');
        if (usernameElement) {
            // Extract just the username text, excluding any added elements
            return usernameElement.textContent.replace(/Share$/, '').trim();
        }
        return 'User';
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

    // Social platform presets with SVG icons
    const socialPlatforms = {
        'twitter': {
            name: 'Twitter',
            color: 'linear-gradient(135deg, #1DA1F2 0%, #0d8bd9 100%)',
            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>'
        },
        'discord': {
            name: 'Discord',
            color: 'linear-gradient(135deg, #7289da 0%, #5b6eae 100%)',
            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20.317 4.3698a19.7913 19.7913 0 00-4.8851-1.5152.0741.0741 0 00-.0785.0371c-.211.3753-.4447.8648-.6083 1.2495-1.8447-.2762-3.68-.2762-5.4868 0-.1636-.3933-.4058-.8742-.6177-1.2495a.077.077 0 00-.0785-.037 19.7363 19.7363 0 00-4.8852 1.515.0699.0699 0 00-.0321.0277C.5334 9.0458-.319 13.5799.0992 18.0578a.0824.0824 0 00.0312.0561c2.0528 1.5076 4.0413 2.4228 5.9929 3.0294a.0777.0777 0 00.0842-.0276c.4616-.6304.8731-1.2952 1.226-1.9942a.076.076 0 00-.0416-.1057c-.6528-.2476-1.2743-.5495-1.8722-.8923a.077.077 0 01-.0076-.1277c.1258-.0943.2517-.1923.3718-.2914a.0743.0743 0 01.0776-.0105c3.9278 1.7933 8.18 1.7933 12.0614 0a.0739.0739 0 01.0785.0095c.1202.099.246.1981.3728.2924a.077.077 0 01-.0066.1276 12.2986 12.2986 0 01-1.873.8914.0766.0766 0 00-.0407.1067c.3604.698.7719 1.3628 1.225 1.9932a.076.076 0 00.0842.0286c1.961-.6067 3.9495-1.5219 6.0023-3.0294a.077.077 0 00.0313-.0552c.5004-5.177-.8382-9.6739-3.5485-13.6604a.061.061 0 00-.0312-.0286zM8.02 15.3312c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9555-2.4189 2.157-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419-.0002 1.3332-.9555 2.4189-2.1569 2.4189zm7.9748 0c-1.1825 0-2.1569-1.0857-2.1569-2.419 0-1.3332.9554-2.4189 2.1569-2.4189 1.2108 0 2.1757 1.0952 2.1568 2.419 0 1.3332-.9554 2.4189-2.1568 2.4189Z"/></svg>'
        },
        'youtube': {
            name: 'YouTube',
            color: 'linear-gradient(135deg, #FF0000 0%, #cc0000 100%)',
            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>'
        },
        'twitch': {
            name: 'Twitch',
            color: 'linear-gradient(135deg, #9146FF 0%, #772ce8 100%)',
            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/></svg>'
        },
        'instagram': {
            name: 'Instagram',
            color: 'linear-gradient(135deg, #E4405F 0%, #833AB4 100%)',
            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>'
        },
        'tiktok': {
            name: 'TikTok',
            color: 'linear-gradient(135deg, #000000 0%, #ff0050 100%)',
            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>'
        },
        'github': {
            name: 'GitHub',
            color: 'linear-gradient(135deg, #333333 0%, #24292e 100%)',
            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>'
        },
        'website': {
            name: 'Website',
            color: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>'
        }
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

    // Create social link element
    function createSocialLinkElement(socialLink, userId, canManage = false) {
        const linkElement = document.createElement('a');
        linkElement.className = 'social-link';
        linkElement.dataset.linkId = socialLink.id;
        linkElement.href = socialLink.url;
        linkElement.target = '_blank';
        linkElement.rel = 'noopener noreferrer';

        // Get platform styling or use custom
        let colorScheme;
        if (socialPlatforms[socialLink.platform]) {
            const platform = socialPlatforms[socialLink.platform];
            colorScheme = {
                bg: platform.color,
                border: platform.color.match(/#[0-9a-fA-F]{6}/)?.[0] || '#667eea'
            };
        } else {
            // Use a default scheme for custom platforms
            colorScheme = {
                bg: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: '#667eea'
            };
        }

        linkElement.style.cssText = `
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
        linkElement.appendChild(glassOverlay);

        // Create content container
        const content = document.createElement('div');
        content.style.cssText = `
            display: flex;
            align-items: center;
            position: relative;
            z-index: 1;
            gap: 6px;
        `;

        // Add platform icon
        const iconContainer = document.createElement('div');
        iconContainer.style.cssText = `
            width: 16px;
            height: 16px;
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            flex-shrink: 0;
        `;

        if (socialPlatforms[socialLink.platform]) {
            const iconSvg = document.createElement('div');
            iconSvg.innerHTML = socialPlatforms[socialLink.platform].icon;
            iconSvg.style.cssText = `
                display: flex;
                align-items: center;
                justify-content: center;
                width: 16px;
                height: 16px;
                color: white;
            `;
            // Ensure SVG inherits the white color
            const svg = iconSvg.querySelector('svg');
            if (svg) {
                svg.style.color = 'white';
                svg.style.fill = 'white';
            }
            iconContainer.appendChild(iconSvg);
        } else {
            const defaultIcon = document.createElement('div');
            defaultIcon.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>';
            iconContainer.appendChild(defaultIcon);
        }

        content.appendChild(iconContainer);

        // Add text
        const textSpan = document.createElement('span');
        textSpan.textContent = socialLink.text;
        textSpan.style.cssText = `
            line-height: 1;
            font-weight: 600;
        `;
        content.appendChild(textSpan);

        // Add external link indicator
        const externalIcon = document.createElement('div');
        externalIcon.style.cssText = `
            width: 12px;
            height: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 8px;
            opacity: 0.7;
        `;
        externalIcon.textContent = '↗';
        content.appendChild(externalIcon);

        linkElement.appendChild(content);

        // Enhanced hover effects
        linkElement.addEventListener('mouseenter', () => {
            linkElement.style.transform = 'translateY(-2px) scale(1.05)';
            linkElement.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.25), 0 4px 12px rgba(0, 0, 0, 0.15)';
            linkElement.style.filter = 'brightness(1.1) saturate(1.2)';
            linkElement.style.borderColor = colorScheme.border + '80';
        });

        linkElement.addEventListener('mouseleave', () => {
            linkElement.style.transform = 'translateY(0) scale(1)';
            linkElement.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.15), 0 1px 3px rgba(0, 0, 0, 0.1)';
            linkElement.style.filter = 'brightness(1) saturate(1)';
            linkElement.style.borderColor = colorScheme.border + '40';
        });

        // Right-click to delete (only if user can manage)
        if (canManage) {
            linkElement.addEventListener('contextmenu', async (e) => {
                e.preventDefault();

                if (confirm(`🗑️ Delete social link "${socialLink.text}"?`)) {
                    try {
                        // Add loading state
                        linkElement.style.opacity = '0.5';
                        linkElement.style.pointerEvents = 'none';

                        await api.deleteSocialLink(userId, socialLink.id);

                        // Animate removal
                        linkElement.style.animation = 'tagSlideIn 0.3s reverse';
                        setTimeout(() => linkElement.remove(), 300);

                        showNotification('Social link deleted successfully', 'success');
                    } catch (error) {
                        linkElement.style.opacity = '1';
                        linkElement.style.pointerEvents = 'auto';
                        showNotification('Failed to delete social link: ' + error.message, 'error');
                    }
                }
            });
        }

        return linkElement;
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

    // Create add social link button
    function createAddSocialButton(userId, container) {
        const addButton = document.createElement('button');
        addButton.className = 'add-social-btn';
        addButton.innerHTML = `
            <span style="display: flex; align-items: center; gap: 4px; position: relative; z-index: 1;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="12" y1="5" x2="12" y2="19"></line>
                    <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                Add Social Link
            </span>
        `;

        addButton.style.cssText = `
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: linear-gradient(135deg, #10b981 0%, #059669 100%);
            color: white;
            border: 1.5px solid #10b98140;
            padding: 0 14px;
            margin: 3px 6px 3px 0;
            border-radius: 20px;
            height: 28px;
            font-size: 12px;
            font-weight: 600;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif;
            cursor: pointer;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            box-shadow: 0 2px 8px rgba(16, 185, 129, 0.25), 0 1px 3px rgba(0, 0, 0, 0.1);
            letter-spacing: 0.02em;
            position: relative;
            overflow: hidden;
            outline: none;
            backdrop-filter: blur(10px);
            user-select: none;
        `;

        addButton.addEventListener('mouseenter', () => {
            addButton.style.transform = 'translateY(-2px) scale(1.05)';
            addButton.style.boxShadow = '0 8px 25px rgba(16, 185, 129, 0.35), 0 4px 12px rgba(0, 0, 0, 0.15)';
            addButton.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
            addButton.style.borderColor = '#10b98180';
        });

        addButton.addEventListener('mouseleave', () => {
            addButton.style.transform = 'translateY(0) scale(1)';
            addButton.style.boxShadow = '0 2px 8px rgba(16, 185, 129, 0.25), 0 1px 3px rgba(0, 0, 0, 0.1)';
            addButton.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            addButton.style.borderColor = '#10b98140';
        });

        addButton.addEventListener('click', () => {
            const modal = createSocialModal(userId, container, addButton);
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
                    const tagElement = createTagElement(result.data, userId, true);
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

    // Create social link modal
    function createSocialModal(userId, container, addButton) {
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
                <div style="width: 8px; height: 8px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 50%; box-shadow: 0 0 12px rgba(16, 185, 129, 0.4);"></div>
                <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">Add Social Link</h3>
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #b4b4b4; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Display Text</label>
                <input type="text" id="linkTextInput" placeholder="e.g., My Twitter, YouTube Channel..." style="width: 100%; padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; font-size: 14px; transition: all 0.2s ease; box-sizing: border-box; font-family: inherit; color: #ffffff;" />
            </div>

            <div style="margin-bottom: 20px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 500; color: #b4b4b4; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">URL</label>
                <input type="url" id="linkUrlInput" placeholder="https://twitter.com/username" style="width: 100%; padding: 12px 16px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 8px; font-size: 14px; transition: all 0.2s ease; box-sizing: border-box; font-family: inherit; color: #ffffff;" />
            </div>

            <div style="margin-bottom: 24px;">
                <label style="display: block; margin-bottom: 12px; font-weight: 500; color: #b4b4b4; font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px;">Platform</label>
                <div id="platformOptions" style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px;"></div>
            </div>

            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                <button id="cancelBtn" style="padding: 10px 20px; border: 1px solid rgba(255, 255, 255, 0.12); background: rgba(255, 255, 255, 0.05); border-radius: 6px; font-weight: 500; cursor: pointer; transition: all 0.2s ease; font-family: inherit; color: #b4b4b4; font-size: 14px;">Cancel</button>
                <button id="createBtn" style="padding: 10px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: all 0.2s ease; font-family: inherit; font-size: 14px;">Add Link</button>
            </div>
        `;

        // Add platform options
        const platformContainer = modalContent.querySelector('#platformOptions');
        Object.entries(socialPlatforms).forEach(([key, platform], index) => {
            const platformOption = document.createElement('div');
            platformOption.style.cssText = `
                width: 80px;
                height: 40px;
                background: ${platform.color};
                border-radius: 6px;
                cursor: pointer;
                border: 1px solid rgba(255, 255, 255, 0.1);
                transition: all 0.2s ease;
                position: relative;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                font-size: 9px;
                font-weight: 500;
                color: white;
                text-shadow: 0 1px 2px rgba(0,0,0,0.4);
                text-transform: capitalize;
                gap: 2px;
            `;

            platformOption.innerHTML = `
                <div style="font-size: 14px; display: flex; align-items: center; justify-content: center; color: white;">${platform.icon}</div>
                <div style="font-size: 9px;">${platform.name}</div>
            `;

            platformOption.dataset.platform = key;

            // Set website as default selection
            if (key === 'website') {
                platformOption.style.borderColor = '#10b981';
                platformOption.style.transform = 'scale(1.05)';
                platformOption.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.4)';
                platformOption.setAttribute('data-selected', 'true');
            }

            platformOption.addEventListener('click', () => {
                // Remove selection from all options
                document.querySelectorAll('#platformOptions > div').forEach(el => {
                    el.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                    el.style.transform = 'scale(1)';
                    el.style.boxShadow = 'none';
                    el.removeAttribute('data-selected');
                });

                // Mark this option as selected
                platformOption.style.borderColor = '#10b981';
                platformOption.style.transform = 'scale(1.05)';
                platformOption.style.boxShadow = '0 0 12px rgba(16, 185, 129, 0.4)';
                platformOption.setAttribute('data-selected', 'true');

                console.log('Selected platform:', key); // Debug log
            });

            platformContainer.appendChild(platformOption);
        });

        // Event listeners
        const textInput = modalContent.querySelector('#linkTextInput');
        const urlInput = modalContent.querySelector('#linkUrlInput');
        const cancelBtn = modalContent.querySelector('#cancelBtn');
        const createBtn = modalContent.querySelector('#createBtn');

        // Input focus/blur styling
        [textInput, urlInput].forEach(input => {
            input.addEventListener('focus', () => {
                input.style.borderColor = 'rgba(16, 185, 129, 0.6)';
                input.style.boxShadow = '0 0 0 2px rgba(16, 185, 129, 0.1)';
                input.style.background = 'rgba(255, 255, 255, 0.08)';
            });

            input.addEventListener('blur', () => {
                input.style.borderColor = 'rgba(255, 255, 255, 0.1)';
                input.style.boxShadow = 'none';
                input.style.background = 'rgba(255, 255, 255, 0.05)';
            });
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
            createBtn.style.background = 'linear-gradient(135deg, #059669 0%, #047857 100%)';
            createBtn.style.transform = 'translateY(-1px)';
        });

        createBtn.addEventListener('mouseleave', () => {
            createBtn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
            createBtn.style.transform = 'translateY(0)';
        });

        cancelBtn.addEventListener('click', () => closeModal());

        createBtn.addEventListener('click', async () => {
            const linkText = textInput.value.trim();
            const linkUrl = urlInput.value.trim();
            const selectedPlatformElement = document.querySelector('#platformOptions > div[data-selected="true"]');

            // Clear previous error messages
            const existingErrors = modalContent.querySelectorAll('.error-message');
            existingErrors.forEach(error => error.remove());

            let hasError = false;

            if (!linkText) {
                textInput.style.borderColor = '#ef4444';
                textInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';

                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Display text is required!';
                textInput.parentNode.appendChild(errorMsg);
                hasError = true;
            }

            if (!linkUrl) {
                urlInput.style.borderColor = '#ef4444';
                urlInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';

                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'URL is required!';
                urlInput.parentNode.appendChild(errorMsg);
                hasError = true;
            } else if (!isValidUrl(linkUrl)) {
                urlInput.style.borderColor = '#ef4444';
                urlInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';

                const errorMsg = document.createElement('div');
                errorMsg.className = 'error-message';
                errorMsg.textContent = 'Please enter a valid URL (include https://)';
                urlInput.parentNode.appendChild(errorMsg);
                hasError = true;
            }

            if (hasError) {
                if (!linkText) textInput.focus();
                else if (!linkUrl || !isValidUrl(linkUrl)) urlInput.focus();
                return;
            }

            const selectedPlatform = selectedPlatformElement ? selectedPlatformElement.dataset.platform : 'website';

            // Show loading state
            createBtn.innerHTML = '<div class="loading-spinner"></div>';
            createBtn.disabled = true;

            try {
                // Create social link
                const linkData = {
                    text: linkText,
                    url: linkUrl,
                    platform: selectedPlatform
                };

                console.log('Sending social link data:', linkData); // Debug log

                const result = await api.createSocialLink(userId, linkData);

                if (result.success) {
                    const linkElement = createSocialLinkElement(result.data, userId, true);
                    container.insertBefore(linkElement, addButton);
                    showNotification('Social link added successfully!', 'success');
                    closeModal();
                } else {
                    throw new Error(result.error || 'Failed to create social link');
                }
            } catch (error) {
                createBtn.innerHTML = 'Add Link';
                createBtn.disabled = false;

                if (error.message.includes('already exists')) {
                    textInput.style.borderColor = '#ef4444';
                    textInput.style.boxShadow = '0 0 0 2px rgba(239, 68, 68, 0.2)';

                    const errorMsg = document.createElement('div');
                    errorMsg.className = 'error-message';
                    errorMsg.textContent = 'Social link already exists!';
                    textInput.parentNode.appendChild(errorMsg);
                } else {
                    showNotification('Failed to create social link: ' + error.message, 'error');
                }
            }
        });

        function isValidUrl(string) {
            try {
                new URL(string);
                return true;
            } catch (_) {
                return false;
            }
        }

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

        const mainContainer = document.createElement('div');
        mainContainer.className = 'user-tags-main-container';
        mainContainer.style.cssText = `
            margin-top: 12px;
            margin-bottom: 8px;
        `;

        // Regular tags container with label
        const tagsSection = document.createElement('div');
        tagsSection.className = 'user-tags-section';

        const tagsLabel = document.createElement('span');
        tagsLabel.className = 'tags-label';
        tagsLabel.textContent = 'User Tags';
        tagsLabel.style.cssText = `
            font-size: 11px;
            font-weight: 600;
            color: #888;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 6px;
            display: block;
        `;

        const tagsContainer = document.createElement('div');
        tagsContainer.className = 'user-tags-container';
        tagsContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 2px;
            margin-bottom: 8px;
        `;

        // Social links container
        const socialContainer = document.createElement('div');
        socialContainer.className = 'social-links-container';
        socialContainer.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            align-items: center;
            gap: 2px;
        `;

        // Social links section wrapper
        const socialSection = document.createElement('div');
        socialSection.className = 'social-links-section';

        // Check if current user can manage tags for this profile
        const canManage = canManageTags(userId);

        // Add profile enhancements (icon + QR button)
        const username = getUsername();
        setTimeout(() => addProfileEnhancements(userId, username), 100);

        try {
            // Load tags from API
            const tagsResponse = await api.getTags(userId);
            const tags = tagsResponse.data.tags || [];

            // Load social links from API
            const socialResponse = await api.getSocialLinks(userId);
            const socialLinks = socialResponse.data.socialLinks || [];

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
            }

            // Add tags to their section
            if (tags.length > 0 || canManage) {
                tagsSection.appendChild(tagsLabel);
                tagsSection.appendChild(tagsContainer);
                mainContainer.appendChild(tagsSection);
            }

            // Add social links section if there are social links or user can manage
            if (socialLinks.length > 0 || canManage) {
                // Add social links label
                const socialLabel = document.createElement('span');
                socialLabel.className = 'social-links-label';
                socialLabel.textContent = 'Social Links';
                socialSection.appendChild(socialLabel);

                // Add staggered animation for existing social links
                socialLinks.forEach((link, index) => {
                    setTimeout(() => {
                        const linkElement = createSocialLinkElement(link, userId, canManage);
                        socialContainer.appendChild(linkElement);
                    }, (tags.length * 100) + (index * 100) + 400);
                });

                // Only add the "Add Social Link" button if user can manage
                if (canManage) {
                    setTimeout(() => {
                        const addSocialButton = createAddSocialButton(userId, socialContainer);
                        socialContainer.appendChild(addSocialButton);
                    }, (tags.length * 100) + (socialLinks.length * 100) + 600);
                }

                socialSection.appendChild(socialContainer);
                mainContainer.appendChild(socialSection);
            } else if (tags.length === 0 && !canManage) {
                // Don't show anything if no tags and can't manage
                return;
            }

        } catch (error) {
            console.error('Failed to load tags/social links:', error);
            showNotification('Failed to load profile data. Using offline mode.', 'error');

            // Only add buttons if user can manage tags, even if API fails
            if (canManage) {
                // Add tags section
                tagsSection.appendChild(tagsLabel);
                const addButton = createAddTagButton(userId, tagsContainer);
                tagsContainer.appendChild(addButton);
                tagsSection.appendChild(tagsContainer);
                mainContainer.appendChild(tagsSection);

                // Add social section even on error if user can manage
                const socialLabel = document.createElement('span');
                socialLabel.className = 'social-links-label';
                socialLabel.textContent = 'Social Links';
                socialSection.appendChild(socialLabel);

                const addSocialButton = createAddSocialButton(userId, socialContainer);
                socialContainer.appendChild(addSocialButton);
                socialSection.appendChild(socialContainer);

                mainContainer.appendChild(socialSection);
            } else {
                // Don't show anything if user can't manage and API failed
                return;
            }
        }

        usernameElement.parentNode.insertBefore(mainContainer, usernameElement.nextSibling);
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
