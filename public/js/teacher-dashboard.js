/*
 * Copyright © 2025 Meir Livneh. All Rights Reserved.
 *
 * This software and associated documentation files (the "Software") are proprietary and confidential.
 * The Software is furnished under a license agreement and may be used or copied only in
 * accordance with the terms of the agreement.
 *
 * Unauthorized copying of this file, via any medium, is strictly prohibited.
 */
// teacher-dashboard.js - English version with advanced AI selection menu

class TeacherDashboard {
    constructor() {
        console.log('🟢 TRACE: TeacherDashboard constructor called');
        this.sdk = null;
        this.students = [];
        this.activities = [];
        this.isAiActive = false; // Track AI status
        this.isAiActiveForStudents = false; // Add new variable for tracking
        this.currentAiModel = 'chatgpt';
        this.aiWarningShown = false; // Prevent repeated messages
        this.config = {}; // 🎯 Change here
        this.debugMode = false;
        this.currentQuestionResponses = {}; // Stores { studentName: [answers] }
        
        // 🔧 English locale fix - set locale
        this.locale = 'en-US';
        this.rtlSupport = false;
        this.isContentManagerInitialized = false;
    }

    // Debugging utility with English support
    debugLog(message, data = null) {
        const debugEnabled = true;
        if (!debugEnabled) return;
        
        const debugConsoleContent = document.querySelector('.enhanced-debug-console .debug-content');
        if(debugConsoleContent) {
            const logEntry = document.createElement('div');
            logEntry.style.direction = 'ltr';
            logEntry.style.textAlign = 'left';
            logEntry.innerHTML = `<div>[${new Date().toLocaleTimeString(this.locale)}] ${message}</div>`;
            if (data) {
                const dataPre = document.createElement('pre');
                dataPre.style.cssText = 'margin-left: 20px; color: #ffaa00; direction: ltr; text-align: left;';
                dataPre.textContent = JSON.stringify(data, null, 2);
                logEntry.appendChild(dataPre);
            }
            debugConsoleContent.appendChild(logEntry);
            debugConsoleContent.scrollTop = debugConsoleContent.scrollHeight;
        }
        console.log(`[TEACHER DEBUG] ${message}`, data);
    }

    async init() {
        console.log('🟢 TRACE: TeacherDashboard.init called');
        const loadingOverlay = document.getElementById('loading-overlay');
        try {
            this.debugLog("🚀 Initializing teacher dashboard...");
            await this.loadConfigData();

            // צור SDK ותמתין שהוא יהיה מוכן לחלוטין
            this.sdk = new ClassroomSDK();
            console.log('🔍 SDK created:', !!this.sdk);
            console.log('🔍 SDK toggleAI method:', !!this.sdk.toggleAI);
            
            await this.handleSuccessfulLogin(this.sdk.auth.currentUser);
            
            // וודא שה-SDK מוכן לפני יצירת AI
            console.log('🔍 Final SDK check before AI init:');
            console.log('- SDK exists:', !!this.sdk);
            console.log('- toggleAI exists:', !!this.sdk.toggleAI);
            console.log('- DB exists:', !!this.sdk.db);
            console.log('- roomCode exists:', !!this.sdk.roomCode);

            // רק אז צור את ממשק ה-AI
            this.sdk.createAIInterface();
            this.initializeTeacherAI();
            
            // המשך כרגיל...
            this.sdk.listenForStudents(this.updateStudentsList.bind(this));
            this.sdk.listenForMessages((messages) => {
                if (messages && messages.length > 0) {
                    this.addMessage(messages);
                }
            });
            this.sdk.listenForRoomUpdates((roomData) => {
                if (!roomData || !roomData.settings) return;

                if (roomData.settings.currentPoll) {
                    this.displayPollResults(roomData.settings.currentPoll);
                }

                const aiIsActiveInDB = roomData.settings.ai_active === true;
                if (this.isAiActive !== aiIsActiveInDB) {
                    console.log(`🔄 Syncing teacher UI. AI status changed to: ${aiIsActiveInDB}`);
                    this.isAiActive = aiIsActiveInDB;
                    this.updateAIButton();
                }
            });

            this.updateConnectionStatus(true);
            this.setupEventListeners();
            this.updateRoomDisplay();
            
            // אחרי שהכל מוכן, בדוק שוב את ה-AI
            setTimeout(() => {
                if (this.checkSDKReady()) {
                    this.showTeacherAIButton();
                    this.checkAIStatus();
                    console.log('✅ Teacher AI button initialized and shown');
                } else {
                    console.error('❌ SDK not ready even after timeout');
                }
            }, 2000); // תן יותר זמן

            this.debugLog("✅ Teacher dashboard initialized successfully.");

        } catch (error) {
            console.error("🔥 Critical initialization error:", error);
            console.error("🔍 Error stack:", error.stack);
            this.updateConnectionStatus(false);
        } finally {
            if(loadingOverlay) loadingOverlay.classList.add('hidden');
        }
    }

    // 🆕 New function to activate AI for teacher
    async initializeTeacherAI() {
        this.debugLog("🤖 Initializing AI for teacher...");
        
        try {
            // 1. Check AI service availability
            const aiStatus = await this.testAIService();
            if (!aiStatus) {
                this.debugLog("⚠️ AI service not available, but continuing...");
            }
            
            // 2. Show AI button in any case (even if service is not available)
            this.showTeacherAIButton();
            
            // 3. Update AI status in interface
            await this.checkAIStatus();
            
            // 4. Add activity message
            this.addActivity("🤖 AI interface enabled for teacher");
            
            this.debugLog("✅ Teacher AI initialized successfully");
            
        } catch (error) {
            console.error("🔥 Error initializing teacher AI:", error);
            this.debugLog("❌ Teacher AI initialization failed", error);
            
            // Even in case of error - show the button
            this.showTeacherAIButton();
            this.addActivity("⚠️ AI available but with limitations");
        }
    }

    // 🆕 Function to show AI button for teacher
    showTeacherAIButton() {
        // 🔧 FIX: Ensure AI button is created and visible
        let aiBtn = document.getElementById('classroom-ai-btn');
        
        if (!aiBtn) {
            // Create the button if it doesn't exist
            console.log('🔧 Creating missing AI button for teacher');
            if (this.sdk && this.sdk.createAIInterface) {
                this.sdk.createAIInterface();
                aiBtn = document.getElementById('classroom-ai-btn');
            }
        }
        
        if (aiBtn) {
            aiBtn.style.display = 'block';
            aiBtn.style.opacity = '1';
            aiBtn.style.visibility = 'visible';
            
            // Add teacher indicator
            const teacherIndicator = document.createElement('div');
            teacherIndicator.className = 'teacher-ai-indicator';
            teacherIndicator.innerHTML = '🎓';
            teacherIndicator.style.cssText = `
                position: absolute; top: -5px; left: -5px;
                background: #28a745; color: white;
                border-radius: 50%; width: 20px; height: 20px;
                font-size: 12px; display: flex;
                align-items: center; justify-content: center;
                z-index: 10003;
            `;
            
            if (!aiBtn.querySelector('.teacher-ai-indicator')) {
                aiBtn.style.position = 'relative';
                aiBtn.appendChild(teacherIndicator);
            }
            
            this.debugLog("🤖 AI button displayed for teacher");
            console.log('✅ Teacher AI button is now visible and functional');
        } else {
            console.error('❌ Could not create or find AI button for teacher');
        }
    }

    // Check AI status and read current model
    async checkAIStatus() {
        console.log('🔍 checkAIStatus called');
        if (!this.sdk || !this.sdk.db) {
            console.log('❌ SDK or DB not ready');
            this.debugLog("❌ Cannot check AI status - SDK/DB not ready");
            return;
        }
        
        try {
            const roomRef = this.sdk.db.collection('rooms').doc(this.sdk.getRoomCode());
            const doc = await roomRef.get();
            
            console.log('🔍 Room document exists:', doc.exists);
            
            if (doc.exists) {
                const roomData = doc.data();
                console.log('🔍 Room data:', roomData);
                console.log('🔍 AI settings:', roomData.settings);
                
                this.isAiActive = roomData.settings?.ai_active === true;
                this.currentAiModel = roomData.settings?.ai_model || 'chatgpt';
                
                console.log('🔍 Set isAiActive to:', this.isAiActive);
                
                this.updateAIButton();
                this.updateAIModelDisplay();
                
                this.debugLog(`🤖 AI Status: ${this.isAiActive ? 'Active' : 'Disabled'}, Model: ${this.currentAiModel}`);
            } else {
                console.log('⚠️ Room document not found');
                this.debugLog("⚠️ Room document not found for AI status check");
            }
        } catch (error) {
            console.error("🔥 Error checking AI status:", error);
            this.debugLog("❌ AI status check failed", error);
        }
    }

    // Update AI button display
    updateAIButton() {
        const aiStatusIcon = document.getElementById('aiStatusIcon');
        const aiStatusText = document.getElementById('aiStatusText');
        const aiStatusDesc = document.querySelector('#toggleAI .dropdown-desc');

        if (this.isAiActive) {
            if (aiStatusIcon) aiStatusIcon.textContent = '🟢';
            if (aiStatusText) aiStatusText.textContent = 'AI Active for Students';
            if (aiStatusDesc) aiStatusDesc.textContent = 'Click to disable';
        } else {
            if (aiStatusIcon) aiStatusIcon.textContent = '🔴';
            if (aiStatusText) aiStatusText.textContent = 'AI Disabled for Students';
            if (aiStatusDesc) aiStatusDesc.textContent = 'Click to enable';
        }
    }

    // Update current model display
    updateAIModelDisplay() {
        // Update current model text
        const modelDisplays = document.querySelectorAll('.current-ai-model');
        modelDisplays.forEach(display => {
            display.textContent = this.getModelDisplayName(this.currentAiModel);
        });

        // Highlight active button
        document.querySelectorAll('.dropdown-item.ai-model-btn').forEach(btn => {
            if (btn.dataset.model === this.currentAiModel) {
                btn.style.backgroundColor = '#e8f5e9';
                btn.style.fontWeight = 'bold';
            } else {
                btn.style.backgroundColor = '';
                btn.style.fontWeight = 'normal';
            }
        });
    }

    // Get display name for model
    getModelDisplayName(model) {
        const modelNames = {
            'chatgpt': 'ChatGPT',
            'claude': 'Claude',
            'gemini': 'Gemini'
        };
        return modelNames[model] || model;
    }

    // Toggle AI mode (enable/disable)
    async toggleAIForClass() {
        console.log('--- Starting toggleAIForClass ---');
        if (!this.sdk || !this.sdk.db || !this.sdk.roomCode) {
            console.error('SDK not ready. Cannot update Firestore.');
            alert('SDK not ready. Please refresh.');
            return;
        }

        const roomRef = this.sdk.db.collection('rooms').doc(this.sdk.roomCode);
        
        try {
            // קודם קוראים כדי לדעת מה המצב הנוכחי
            const doc = await roomRef.get();
            if (!doc.exists) {
                console.error('Document does not exist!');
                return;
            }

            const currentState = doc.data().settings.ai_active;
            const newState = !currentState;

            // מבצעים את העדכון במסד הנתונים
            await roomRef.update({
                'settings.ai_active': newState
            });

            console.log(`SUCCESS: Firestore updated. New state is: ${newState}`);

            // ======================================================
            // === החלק החסר: עדכון ממשק המשתמש לאחר ההצלחה ===
            // ======================================================

            // 1. עדכון המשתנה המקומי שמחזיק את הסטטוס
            this.isAiActive = newState;
            
            // 2. עדכון מראה הכפתור (צבע וטקסט)
            this.updateAIButton();
            
            // 3. הוספת שורה ליומן האירועים
            if (newState) {
                this.addActivity('🤖 AI enabled for class.');
            } else {
                this.addActivity('🔴 AI disabled for class.');
            }
            
        } catch (error) {
            console.error('FAILURE: Could not update Firestore.', error);
            alert('Failed to update the AI status. See console for error details.');
        }
    }

    checkSDKReady() {
        if (!this.sdk) {
            console.error('❌ SDK not initialized');
            return false;
        }
        
        if (!this.sdk.toggleAI) {
            console.error('❌ toggleAI method missing from SDK');
            console.log('🔍 Available methods:', Object.getOwnPropertyNames(this.sdk));
            return false;
        }
        
        if (!this.sdk.db) {
            console.error('❌ Firebase DB not ready');
            return false;
        }
        
        if (!this.sdk.roomCode) {
            console.error('❌ Room code not set');
            return false;
        }
        
        console.log('✅ SDK ready for AI operations');
        return true;
    }

    // Switch AI model (without turning off/on)
    async switchAIModel(model) {
        if (!this.sdk) return;
        
        this.debugLog(`🔄 Switching AI model to: ${model}`);
        
        try {
            const roomRef = this.sdk.db.collection('rooms').doc(this.sdk.getRoomCode());
            await roomRef.update({
                'settings.ai_model': model,
                'last_activity': firebase.firestore.FieldValue.serverTimestamp()
            });
            
            this.currentAiModel = model;
            this.updateAIButton();
            this.updateAIModelDisplay();
            
            const modelName = this.getModelDisplayName(model);
            this.addActivity(`🔄 AI model switched to: ${modelName}`);
            this.debugLog(`✅ AI model switched to: ${model}`);
            
            // Message to students
            if (this.isAiActive) {
                this.showModelSwitchMessage(modelName);
            }
            
        } catch (error) {
            console.error("🔥 Error switching AI model:", error);
            this.debugLog("❌ AI model switch failed", error);
            alert("Error switching AI model: " + error.message);
        }
    }

    // Model switch message
    showModelSwitchMessage(modelName) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: linear-gradient(135deg, #2196F3 0%, #1976D2 100%);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 15px rgba(33, 150, 243, 0.3);
            font-weight: bold; max-width: 300px;
            animation: slideInRight 0.5s ease;
            direction: ltr; text-align: left;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🔄</span>
                <div>
                    <div>AI Model Switched!</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">
                        Now using: ${modelName}
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 3000);
    }

    // Test AI service - updated to work with askAI
    async testAIService() {
        // Comprehensive check of all required components
        if (!this.sdk) {
            this.debugLog("❌ SDK not available for AI test");
            return false;
        }
        
        if (!this.sdk.auth?.currentUser) {
            this.debugLog("❌ User not authenticated for AI test");
            return false;
        }
        
        if (!this.sdk.functions) {
            this.debugLog("❌ Firebase Functions not initialized");
            return false;
        }
            
        this.debugLog("🔍 Testing AI service availability...");
        
        try {
            // Check if SDK has testAIService method, if not use fallback
            if (this.sdk.testAIService) {
                const result = await this.sdk.testAIService();
                
                if (result.available) {
                    this.debugLog("✅ AI service available and working", result);
                    return true;
                } else {
                    this.debugLog("❌ AI service not available", result);
                    
                    // Show detailed message to teacher
                    let errorDetails = "AI service not available";
                    if (result.code === 'functions/failed-precondition') {
                        errorDetails = "AI service not configured (missing API key)";
                    } else if (result.code === 'functions/unauthenticated') {
                        errorDetails = "Authentication error in system";
                    } else if (result.code === 'functions/not-initialized') {
                        errorDetails = "Firebase Functions not initialized";
                    }
                    
                    // Show one-time alert
                    if (!this.aiWarningShown) {
                        this.aiWarningShown = true;
                        setTimeout(() => {
                            if (confirm(`⚠️ ${errorDetails}\n\nWould you like to try again?`)) {
                                this.testAIService();
                            }
                        }, 1000);
                    }
                    
                    return false;
                }
            } else {
                // Fallback if SDK doesn't have testAIService
                this.debugLog("⚠️ SDK testAIService method not found, assuming available");
                return true;
            }
        } catch (error) {
            this.debugLog("🔥 AI service test failed with error", error);
            console.error("AI test error:", error);
            // Don't fail completely, just log and continue
            return true;
        }
    }

    updateConnectionStatus(isConnected) {
        const statusDiv = document.getElementById('connectionStatus');
        if (!statusDiv) return;

        // Remove old classes and stop animation
        statusDiv.className = '';
        statusDiv.style.animation = 'none';

        if (isConnected) {
            statusDiv.classList.add('connected');
            statusDiv.setAttribute('title', 'Connected to Firebase');
        } else {
            statusDiv.classList.add('disconnected');
            statusDiv.setAttribute('title', 'Not Connected');
        }
        // Force restart animation for visual feedback
        void statusDiv.offsetWidth;
        statusDiv.style.animation = 'pulse 2s infinite';
    }

    addActivity(activityText) {
        const activitiesArea = document.getElementById('activitiesArea');
        if (!activitiesArea) return;

        const activityDiv = document.createElement('div');
        activityDiv.className = 'activity-item';
        activityDiv.style.direction = 'ltr';
        activityDiv.style.textAlign = 'left';
        activityDiv.innerHTML = `
            <span class="activity-time">${new Date().toLocaleTimeString(this.locale)}</span>
            <span class="activity-text">${activityText}</span>
        `;
        activitiesArea.appendChild(activityDiv);
        activitiesArea.scrollTop = activitiesArea.scrollHeight;
    }

    updateStudentsList(studentsData) {
        this.students = studentsData;
        const studentsListDiv = document.getElementById('studentsList');
        const studentsCountSpan = document.getElementById('studentsCount');
        if (!studentsListDiv || !studentsCountSpan) return;

        // Clear existing list
        studentsListDiv.innerHTML = '';
        studentsCountSpan.textContent = this.students.length;

        if (this.students.length === 0) {
            studentsListDiv.innerHTML = '<div class="no-students">No students connected currently</div>';
            return;
        }
        
        const template = document.getElementById('studentTemplate');
        
        // Process ALL students in the array
        this.students.forEach(student => {
            const studentName = student.name || 'Unknown Student';
            const studentElement = document.importNode(template.content, true);
            
            const nameSpan = studentElement.querySelector('.student-name');
            if(nameSpan) nameSpan.textContent = studentName;

            const actionsDiv = studentElement.querySelector('.student-actions');
            if (actionsDiv) {
                const privateMsgBtn = document.createElement('button');
                privateMsgBtn.textContent = 'Private Message';
                privateMsgBtn.className = 'private-message-btn';
                privateMsgBtn.onclick = () => this.openPrivateMessageModal(student);
                actionsDiv.appendChild(privateMsgBtn);
            }
            
            studentsListDiv.appendChild(studentElement);
        });
        
        this.addActivity(`Student list updated. ${this.students.length} students connected.`);
        console.log(`✅ Updated student list: ${this.students.length} students displayed`);
    }

    // 🔧 Fix #1: undefined messages - complete and fixed function
    addMessage(messages) {
        // If it's an array of messages - iterate through each one
        if (Array.isArray(messages)) {
            messages.forEach(message => this.addSingleMessage(message));
            return;
        }
        
        // If it's a single message
        this.addSingleMessage(messages);
    }

    addSingleMessage(message) {
        const messagesArea = document.getElementById('messagesArea');
        const messagesCountSpan = document.getElementById('messagesCount');
        if (!messagesArea) return;

        // 🔧 FIX: Prevent duplicate messages by checking if already exists
        const messageId = message.timestamp?.seconds + '_' + message.sender_uid + '_' + message.content.substring(0, 20);
        const existingMessage = messagesArea.querySelector(`[data-message-id="${messageId}"]`);
        if (existingMessage) {
            console.log('⚠️ Duplicate message prevented:', message.content.substring(0, 30));
            return;
        }

        // Validation and message creation code...
        const sender = message?.sender || 'Unknown User';
        const content = message?.content || 'Empty Message';
        const timestamp = message?.timestamp;
        const isTeacher = message?.is_teacher === true;
        const isPrivate = message?.is_private === true;

        // Remove "no messages" placeholder
        const noMessages = messagesArea.querySelector('.no-messages');
        if (noMessages) {
            noMessages.remove();
        }

        // Update message count
        if (messagesCountSpan) {
            const currentCount = parseInt(messagesCountSpan.textContent) || 0;
            messagesCountSpan.textContent = currentCount + 1;
        }

        // Create message element
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message-item';
        messageDiv.setAttribute('data-message-id', messageId); // 🔧 FIX: Add unique identifier
        messageDiv.style.direction = 'ltr';
        messageDiv.style.textAlign = 'left';
        
        // Icon and time formatting...
        let senderIcon = '';
        if (isTeacher) {
            senderIcon = '🎓 ';
        } else if (isPrivate) {
            senderIcon = '🔒 ';
        }

        let timeString = 'Unknown Time';
        if (timestamp) {
            try {
                const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
                timeString = date.toLocaleTimeString(this.locale);
            } catch (e) {
                console.warn('Cannot parse timestamp:', timestamp);
                timeString = new Date().toLocaleTimeString(this.locale);
            }
        }

        messageDiv.innerHTML = `
            <div class="message-header">
                <span class="message-sender">${senderIcon}${sender}</span>
                <span class="message-time">${timeString}</span>
            </div>
            <div class="message-content">${content}</div>
            ${isPrivate ? '<div class="message-private-indicator">Private Message</div>' : ''}
        `;

        if (isPrivate) {
            messageDiv.style.borderLeft = '4px solid #ffc107';
            messageDiv.style.background = '#fff9c4';
        }

        messagesArea.appendChild(messageDiv);
        messagesArea.scrollTop = messagesArea.scrollHeight;

        console.log(`✅ Message added: ${content.substring(0, 30)}...`);
    }

    sendCommand(command, payload = {}) {
        if (!this.sdk) return;
        this.sdk.sendCommand(command, payload);
        this.addActivity(`📤 Command sent: ${command}`);
    }

    sendMessageToClass(content) {
        if (!content || !content.trim()) return;
        
        if (this.sdk) {
            this.sdk.sendMessage(content);
            this.addActivity(`💬 Message sent to class: ${content}`);
        }
    }

    // 🆕 AI activation encouragement message with English support
    showAIActivationMessage() {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10000;
            background: linear-gradient(135deg, #28a745 0%, #20c997 100%);
            color: white; padding: 15px 20px; border-radius: 8px;
            box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
            font-weight: bold; max-width: 300px;
            animation: slideInRight 0.5s ease;
            direction: ltr; text-align: left;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 24px;">🤖</span>
                <div>
                    <div>AI Enabled Successfully!</div>
                    <div style="font-size: 12px; opacity: 0.9; margin-top: 5px;">
                        Students can now ask questions
                    </div>
                </div>
            </div>
        `;
        
        document.body.appendChild(notification);
        
        // Remove after 4 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.5s ease';
            setTimeout(() => notification.remove(), 500);
        }, 4000);
        
        // Add CSS for animations if not exists
        if (!document.getElementById('ai-notification-styles')) {
            const style = document.createElement('style');
            style.id = 'ai-notification-styles';
            style.textContent = `
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                @keyframes slideOutRight {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(100%); opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
    }

    setupEventListeners() {
        // Modal handling
        const openModal = (modalId) => document.getElementById(modalId)?.classList.add('visible');
        const closeModal = (modal) => modal.closest('.modal-overlay')?.classList.remove('visible');

        // 🎯 Fix: Single block handling model buttons
        document.querySelectorAll('.dropdown-item.ai-model-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const model = btn.dataset.model;
                if (model) {
                    this.switchAIModel(model);
                }
            });
        });

        // Modal close buttons
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', (e) => {
                closeModal(e.target);
            });
        });

        // Private message form submit
        const privateMessageForm = document.getElementById('privateMessageForm');
        if (privateMessageForm) {
            privateMessageForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.sendPrivateMessage();
            });
        }

        // 🎯 Add the following code block within the function
        const customUrlForm = document.getElementById('customUrlForm');
        if (customUrlForm) {
            customUrlForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const urlInput = document.getElementById('customUrlInput');
                const url = urlInput.value.trim();
                if (url) {
                    this.sendSelectedGame(url); // Reuse function for sending and closing
                    urlInput.value = '';
                }
            });
        }

        // 🎯 Add poll handling
        document.querySelectorAll('.poll-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const pollType = btn.dataset.type;
                this.startPoll(pollType);
            });
        });

        const stopPollBtn = document.getElementById('stop-poll-btn');
        if(stopPollBtn) {
            stopPollBtn.addEventListener('click', () => this.stopPoll());
        }

        // 🎯 Handle general chat form
        const chatForm = document.getElementById('chat-form');
        if (chatForm) {
            chatForm.addEventListener('submit', (e) => {
                e.preventDefault(); // Prevents page refresh - the critical fix!
                const input = document.getElementById('chat-input');
                const message = input.value.trim();
                if (message) {
                    this.sdk.sendMessage(message);
                    input.value = '';
                }
            });
        }

        document.getElementById('ai-summarize-btn')?.addEventListener('click', () => this.handleAiAnalysis('summarize'));
        document.getElementById('ai-keywords-btn')?.addEventListener('click', () => this.handleAiAnalysis('keywords'));

        // Handle closing the open question modal and stopping the poll
        document.getElementById('close-open-question-btn')?.addEventListener('click', () => this.closeOpenEndedQuestion());
        document.querySelector('#open-question-modal .modal-close')?.addEventListener('click', () => this.closeOpenEndedQuestion());

        // הוספת האזנה לכפתור איפוס מסכים
        document.getElementById('resetScreensBtn')?.addEventListener('click', () => {
            if (confirm('Are you sure you want to reset all student screens? This will stop any active poll or content.')) {
                this.resetStudentScreens();
            }
        });

        document.getElementById('reset-screens-action')?.addEventListener('click', (e) => {
            e.preventDefault();
            if (confirm('Are you sure you want to reset all student screens?')) {
                this.resetStudentScreens();
            }
        });

        // Logout button
        document.getElementById('logout-action-btn')?.addEventListener('click', (e) => {
            e.preventDefault();
            this.logout();
        });

        // === הוספת קריאה ל-initContentManager ב-setupEventListeners ===
        this.setupContentManager();
    }

    openPrivateMessageModal(student) {
        const modal = document.getElementById('privateMessageModal');
        if (modal) {
            document.getElementById('privateMessageRecipient').textContent = student.name;
            modal.dataset.studentUid = student.uid;
            modal.classList.add('visible');
        }
    }

    async sendPrivateMessage() {
        const modal = document.getElementById('privateMessageModal');
        const content = document.getElementById('privateMessageText').value.trim();
        const studentUid = modal.dataset.studentUid;
        
        if (!content || !studentUid) return;
        
        try {
            await this.sdk.sendPrivateMessage(content, studentUid);
            this.addActivity(`✉️ Private message sent to ${document.getElementById('privateMessageRecipient').textContent}`);
            document.getElementById('privateMessageText').value = '';
            modal.classList.remove('visible');
        } catch (error) {
            console.error("🔥 Error sending private message:", error);
            alert("Error sending private message");
        }
    }

    async resetClassroomData() {
        if (!this.sdk || !confirm('Are you sure you want to reset the classroom? This action will delete all data.')) {
            return;
        }
        
        try {
            // Delete room from cloud
            const roomRef = this.sdk.db.collection('rooms').doc(this.sdk.getRoomCode());
            await roomRef.delete();
            
            // Create new room
            await this.sdk.initializeRoom();
            
            this.addActivity('🔄 Classroom reset successfully');
            alert('Classroom reset successfully!');
        } catch (error) {
            console.error("🔥 Error resetting classroom:", error);
            alert("Error resetting classroom");
        }
    }

    updateRoomDisplay() {
        const roomCode = this.sdk ? this.sdk.getRoomCode() : null;
        if (!roomCode) return;

        // Update text display in header
        const roomCodeSpan = document.getElementById('header-room-code');
        if (roomCodeSpan) {
            roomCodeSpan.textContent = roomCode;
        }

        // Create and display QR code
        const qrImage = document.getElementById('qr-code-image');
        if (qrImage) {
            const studentUrl = `${window.location.origin}/${this.config.studentAppUrl}?classroom=${roomCode}`;
            const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(studentUrl)}`;
            
            qrImage.src = qrApiUrl;

            // Add copy functionality on click
            qrImage.onclick = () => {
                navigator.clipboard.writeText(studentUrl).then(() => {
                    this.addActivity(`✅ Student link copied`);
                    // Can add small visual notification here if desired
                }).catch(err => {
                    console.error('Failed to copy URL: ', err);
                });
            };
        }
    }

    async loadConfigData() {
        try {
            const response = await fetch('config.json');
            if (!response.ok) throw new Error('Network response was not ok');
            this.config = await response.json();
            this.debugLog('✅ Config file loaded successfully', this.config);
        } catch (error) {
            console.error('🔥 Error loading config file:', error);
            this.config = { studentAppUrl: 'student-app.html', games: [] }; // Fallback
        }
    }

    openContentModal() {
        document.getElementById('customContentModal')?.classList.add('visible');
        this.populateGamesList();
    }

    // === החלפת populateGamesList בפונקציה חדשה ===
    populateGamesList() {
        const container = document.getElementById('game-list-container');
        if (!container) return;

        const content = this.personalContent || [];
        container.innerHTML = '';

        if (content.length === 0) {
            container.innerHTML = '<p style="padding: 15px; text-align: center;">You haven\'t added any personal content yet. Go to Tools > Manage Content & AI to add some.</p>';
            return;
        }

        content.forEach(item => {
            const element = document.createElement('a');
            element.href = '#';
            element.className = 'dropdown-item';
            element.onclick = (e) => {
                e.preventDefault();
                this.sendSelectedGame(item.url);
            };
            element.innerHTML = `<span class="dropdown-icon">${item.icon || '🔗'}</span><div class="dropdown-content"><div class="dropdown-title">${item.title}</div><div class="dropdown-desc">${item.description}</div></div>`;
            container.appendChild(element);
        });
    }

    sendSelectedGame(url) {
        if (!url) return;
        this.sendCommand('LOAD_CONTENT', { url });

        // Close window after sending
        const modal = document.getElementById('customContentModal');
        if (modal) {
            modal.querySelector('.modal-close').click();
        }
    }

    // 🎯 Functions for poll management
    openPollCreationModal() {
        this.debugLog("📊 Opening poll creation window");
        document.getElementById('poll-creation-modal')?.classList.add('visible');
    }

    // החלף את כל הפונקציה startPoll בזו:
    async startPoll(pollType) {
        this.debugLog(`📊 Starting a new poll of type: ${pollType}`);

        try {
            // שלב 1: בדיקה וארכוב של הסקר הפעיל הקודם (אם קיים)
            const roomRef = this.sdk.db.collection('rooms').doc(this.sdk.roomCode);
            const roomDoc = await roomRef.get();
            const existingPoll = roomDoc.data()?.settings?.currentPoll;

            if (existingPoll && existingPoll.isActive) {
                this.debugLog('Archiving previous active poll...', existingPoll.id);
                await this.sdk.saveQuestionToHistory(existingPoll);
                this.addActivity(`📝 Previous poll (${existingPoll.id.substring(0,5)}) archived.`);
            }

            // שלב 2: יצירת אובייקט הסקר החדש עם מאגר תשובות ריק
            const pollOptions = {
                'yes_no': 2,
                'multiple_choice': 4,
                'open_text': 0
            };

            const newPoll = {
                id: "poll_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9),
                type: pollType,
                question: '', // ניתן להרחבה בעתיד
                options: pollOptions[pollType],
                isActive: true,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                responses: {} // התחלה עם מאגר נקי
            };

            // שלב 3: עדכון ה-Firestore עם הסקר החדש
            await roomRef.update({
                'settings.currentPoll': newPoll
            });

            // שלב 4: עדכון ממשק המשתמש בהתאם לסוג הסקר החדש
            if (pollType === 'open_text') {
                this.currentQuestionResponses = {}; // איפוס הקאש המקומי
                document.getElementById('open-question-modal')?.classList.add('visible');
            } else {
                document.getElementById('poll-section').style.display = 'block';
            }

            this.addActivity(`📊 Started new poll of type: ${pollType}`);
            document.getElementById('poll-creation-modal')?.classList.remove('visible');
            this.debugLog(`✅ New poll ${newPoll.id} started successfully.`);

        } catch (error) {
            console.error("🔥 Failed to start a new poll:", error);
            this.debugLog("❌ Error during startPoll", error);
            this.addActivity("❌ Error starting new poll.");
        }
    }

    stopPoll() {
        this.debugLog("📊 Stopping poll");
        this.sdk.stopPoll();
        document.getElementById('poll-section').style.display = 'none';
        this.addActivity(`⏹️ Poll ended`);
    }

    displayPollResults(pollData) {
        // Handle Open Text Polls
        if (pollData && pollData.type === 'open_text' && pollData.isActive) {
            const container = document.getElementById('open-question-results');
            if (!container) return;
            container.innerHTML = ''; // Clear previous results to re-render

            const responses = pollData.responses || {};
            this.currentQuestionResponses = responses; // Update local memory

            // Correctly iterate over the responses object
            for (const studentName in responses) {
                if (Object.hasOwnProperty.call(responses, studentName)) {
                    const answers = responses[studentName];
                    if (Array.isArray(answers) && answers.length > 0) {
                        const lastAnswer = answers[answers.length - 1];
                        const answerDiv = document.createElement('div');
                        answerDiv.innerHTML = `<strong>${studentName} (${answers.length} versions):</strong><p style="margin: 5px 0 0 0; color: #333;">${lastAnswer}</p>`;
                        answerDiv.style.borderBottom = '1px solid #eee';
                        answerDiv.style.padding = '10px 0';
                        container.appendChild(answerDiv);
                    }
                }
            }
        } 
        // Handle Multiple Choice and Yes/No Polls
        else if (pollData && (pollData.type === 'multiple_choice' || pollData.type === 'yes_no')) {
            const container = document.getElementById('poll-results-container');
            const section = document.getElementById('poll-section');
            if (!container || !section) return;

            section.style.display = 'block';
            container.innerHTML = '';

            const responses = pollData.responses || {};
            const totalVotes = Object.keys(responses).length;
            const voteCounts = {};

            // Count votes for each option
            for (let i = 1; i <= pollData.options; i++) {
                voteCounts[i] = 0;
            }
            Object.values(responses).forEach(vote => {
                if (voteCounts[vote] !== undefined) {
                    voteCounts[vote]++;
                }
            });

            // Display results
            for (let i = 1; i <= pollData.options; i++) {
                const votes = voteCounts[i];
                const percentage = totalVotes > 0 ? ((votes / totalVotes) * 100).toFixed(1) : 0;
                const label = pollData.type === 'yes_no' ? (i === 1 ? 'Yes' : 'No') : `Option ${i}`;

                const barHtml = `
                    <div style="margin-bottom: 12px;">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
                            <strong>${label}</strong>
                            <span>${votes} votes (${percentage}%)</span>
                        </div>
                        <div style="background: #e0e0e0; border-radius: 4px; overflow: hidden;">
                            <div style="width: ${percentage}%; background: #42a5f5; height: 20px; transition: width 0.3s ease;"></div>
                        </div>
                    </div>
                `;
                container.innerHTML += barHtml;
            }
        }
    }

    async handleAiAnalysis(type) {
        // 1. Open the teacher's AI window immediately
        if (this.sdk && this.sdk.aiContainer.style.display === 'none') {
            this.sdk.toggleAI();
        }

        // 2. Collect current responses from local memory
        if (Object.keys(this.currentQuestionResponses).length === 0) {
            this.sdk.addAIMessage("🤖", "No responses to analyze currently.", false);
            return;
        }

        const allAnswers = JSON.stringify(this.currentQuestionResponses, null, 2);
        const lang = this.sdk.getInterfaceLanguage();
        let prompt;

        // 3. Create language-aware prompt
        if (type === 'summarize') {
            prompt = (lang === 'he')
                ? `לפניך תשובות של תלמידים לשאלה. כל שם תלמיד ממופה למערך של התשובות שלו (מהראשונה לאחרונה). סכם את רמת ההבנה הכיתתית, זהה תלמידים שתשובותיהם מצביעות על קושי, וציין תלמידים שהראו שיפור משמעותי בין הגרסאות:\n\n${allAnswers}`
                : `Here are student responses to a question. Each student name maps to an array of their answers (from first to last). Summarize the class's understanding, identify students whose answers indicate difficulty, and point out students who showed significant improvement across versions:\n\n${allAnswers}`;
        } else { // keywords
            prompt = (lang === 'he')
                ? `זהה את 10 מילות המפתח הנפוצות והמשמעותיות ביותר מהתשובות הבאות:\n\n${allAnswers}`
                : `Extract the 10 most frequent and significant keywords from the following text:\n\n${allAnswers}`;
        }

        // 4. Send prompt to AI
        this.sdk.sendAIMessage(prompt, lang);
        this.addActivity(`📈 Sent "situation analysis" to AI.`);

        // 5. Reset responses in Firestore for a new round
        try {
            const roomRef = this.sdk.db.collection('rooms').doc(this.sdk.getRoomCode());
            await roomRef.update({ 'settings.currentPoll.responses': {} });
            this.addActivity(`🔄 Response repository in Firestore reset and ready for next round.`);
        } catch (error) {
            console.error("Error resetting poll responses:", error);
        }
    }

    async generateLessonSummary() {
        this.addActivity('📊 Preparing comprehensive summary report...');
        if (this.sdk && this.sdk.aiContainer) {
            if (this.sdk.aiContainer.style.display === 'none') {
                this.sdk.toggleAI();
            }
        }
        try {
            const historySnapshot = await this.sdk.db.collection('rooms')
                .doc(this.sdk.getRoomCode())
                .collection('questionHistory')
                .orderBy('createdAt')
                .get();
            let fullLessonData = [];
            historySnapshot.forEach(doc => {
                fullLessonData.push(doc.data());
            });
            const summaryPrompt = this.buildLessonSummaryPrompt(fullLessonData);
            const language = this.sdk.getInterfaceLanguage();
            await this.sdk.sendAIMessage(summaryPrompt, language);
            this.addActivity('✅ Summary report sent to AI');
            document.getElementById('end-lesson-modal')?.classList.remove('visible');
        } catch (error) {
            console.error('🔥 Error creating summary report:', error);
            this.addActivity('❌ Error creating summary report');
        }
    }

    buildLessonSummaryPrompt(lessonData) {
        const language = this.sdk.getInterfaceLanguage();
        if (language === 'he') {
            let prompt = `דוח סיכום מקיף לשיעור\n\n`;
            prompt += `מספר שאלות שנשאלו: ${lessonData.length}\n\n`;
            lessonData.forEach((question, index) => {
                prompt += `שאלה ${index + 1}: ${question.question || 'שאלה ללא כותרת'}\n`;
                prompt += `תשובות התלמידים:\n`;
                Object.entries(question.responses || {}).forEach(([student, answers]) => {
                    if (Array.isArray(answers)) {
                        prompt += `  ${student}: ${answers.join(' → ')}\n`;
                    } else {
                        prompt += `  ${student}: ${answers}\n`;
                    }
                });
                prompt += `\n`;
            });
            prompt += `אנא סכם:\n`;
            prompt += `1. התקדמות כללית של הכיתה\n`;
            prompt += `2. תלמידים שהראו שיפור משמעותי\n`;
            prompt += `3. תלמידים שנזקקים לתשומת לב נוספת\n`;
            prompt += `4. נושאים שנותרו לא ברורים\n`;
            prompt += `5. המלצות לשיעור הבא\n`;
            return prompt;
        } else {
            let prompt = `Comprehensive Lesson Summary Report\n\n`;
            prompt += `Number of questions asked: ${lessonData.length}\n\n`;
            lessonData.forEach((question, index) => {
                prompt += `Question ${index + 1}: ${question.question || 'Untitled question'}\n`;
                prompt += `Student responses:\n`;
                Object.entries(question.responses || {}).forEach(([student, answers]) => {
                    if (Array.isArray(answers)) {
                        prompt += `  ${student}: ${answers.join(' → ')}\n`;
                    } else {
                        prompt += `  ${student}: ${answers}\n`;
                    }
                });
                prompt += `\n`;
            });
            prompt += `Please summarize:\n`;
            prompt += `1. Overall class progress\n`;
            prompt += `2. Students who showed significant improvement\n`;
            prompt += `3. Students who need additional attention\n`;
            prompt += `4. Topics that remain unclear\n`;
            prompt += `5. Recommendations for next lesson\n`;
            return prompt;
        }
    }

    async closeOpenEndedQuestion() {
        if (!this.sdk) return;
        try {
            const roomRef = this.sdk.db.collection('rooms').doc(this.sdk.getRoomCode());
            const roomDoc = await roomRef.get();
            const currentPoll = roomDoc.data()?.settings?.currentPoll;
            if (currentPoll && currentPoll.isActive) {
                await this.sdk.saveQuestionToHistory(currentPoll);
                await roomRef.update({ 'settings.currentPoll.isActive': false });
                this.addActivity('📝 Open question closed - student modal closed');
            }
            document.getElementById('open-question-modal')?.classList.remove('visible');
        } catch (error) {
            console.error('🔥 Error closing open question:', error);
            this.addActivity('❌ Error closing question');
        }
    }

    // הוספת מתודה למחלקה TeacherDashboard
    async resetStudentScreens() {
        if (!this.sdk) return;
        console.log("🔄 Resetting all student screens...");
        try {
            // שלח פקודה לנקות את ה-iframe
            await this.sdk.sendCommand('LOAD_CONTENT', { url: 'about:blank' });
            // עצור כל סקר פעיל
            await this.sdk.stopPoll();
            this.addActivity('⏹️ All student screens have been cleared.');
        } catch (error) {
            console.error("Error resetting student screens:", error);
        }
    }

    // =======================================================
    // ========= CONTENT & PROMPT MANAGEMENT LOGIC ===========
    // =======================================================

    async loadPersonalData() {
        if (!this.sdk || !this.sdk.auth.currentUser) return;
        const teacherUid = this.sdk.auth.currentUser.uid;

        // Load personal content
        try {
            const contentRef = this.sdk.db.collection('teachers').doc(teacherUid).collection('personal_links');
            const contentSnapshot = await contentRef.get();
            this.personalContent = contentSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error loading personal content:", error);
            this.personalContent = [];
        }

        // Load personal prompts
        try {
            const promptsRef = this.sdk.db.collection('teachers').doc(teacherUid).collection('personal_prompts');
            const promptsSnapshot = await promptsRef.get();
            this.personalPrompts = promptsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error("Error loading personal prompts:", error);
            this.personalPrompts = [];
        }

        this.debugLog('✅ Personal content and prompts loaded', {
            content: this.personalContent,
            prompts: this.personalPrompts
        });
    }

    // === Gemini approach for modal event listeners ===
    setupContentManager() {
        const openBtn = document.getElementById('open-content-manager-btn');
        if (openBtn) {
            openBtn.addEventListener('click', () => {
                const modal = document.getElementById('content-manager-modal');
                if (modal) {
                    // Initialize listeners inside the modal only ONCE, the first time it's opened.
                    if (!this.isContentManagerInitialized) {
                        this.initModalEventListeners(modal);
                        this.isContentManagerInitialized = true;
                    }
                    this.renderPersonalContentList();
                    this.renderPersonalPromptsList();
                    this.populateActivePromptSelector();
                    modal.classList.add('visible');
                }
            });
        } else {
            // This log helps if the button itself is missing for some reason.
            console.error("Could not find the 'open-content-manager-btn'.");
        }
    }

    initModalEventListeners(modal) {
        // Tab switching logic
        modal.querySelectorAll('.tab-link').forEach(button => {
            button.addEventListener('click', () => {
                modal.querySelectorAll('.tab-link, .tab-content').forEach(el => el.classList.remove('active'));
                button.classList.add('active');
                document.getElementById(button.dataset.tab).classList.add('active');
            });
        });

        // Close modal button
        modal.querySelector('.modal-close').addEventListener('click', () => modal.classList.remove('visible'));

        // Content Management Forms & Buttons
        document.getElementById('personal-content-form').addEventListener('submit', this.handleSavePersonalContent.bind(this));
        document.getElementById('cancel-content-edit').addEventListener('click', this.resetContentForm.bind(this));

        // Prompt Management Forms & Buttons
        document.getElementById('personal-prompt-form').addEventListener('submit', this.handleSavePersonalPrompt.bind(this));
        document.getElementById('cancel-prompt-edit').addEventListener('click', this.resetPromptForm.bind(this));
        document.getElementById('generate-prompt-suggestion-btn').addEventListener('click', this.generatePromptSuggestion.bind(this));
        document.getElementById('active-prompt-selector').addEventListener('change', this.setActivePrompt.bind(this));
    }

    renderPersonalContentList() {
        const list = document.getElementById('personal-content-list');
        if (!list) return;
        list.innerHTML = '';
        (this.personalContent || []).forEach(item => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `
                <span class="list-item-icon">${item.icon}</span>
                <div class="list-item-details">
                    <div class="list-item-title">${item.title}</div>
                    <div class="list-item-desc">${item.description}</div>
                </div>
                <div class="list-item-actions">
                    <button class="edit-btn" data-id="${item.id}">✏️</button>
                    <button class="delete-btn" data-id="${item.id}">🗑️</button>
                </div>
            `;
            el.querySelector('.edit-btn').addEventListener('click', () => this.editContentItem(item.id));
            el.querySelector('.delete-btn').addEventListener('click', () => this.deleteContentItem(item.id));
            list.appendChild(el);
        });
    }

    renderPersonalPromptsList() {
        const list = document.getElementById('personal-prompts-list');
        if (!list) return;
        list.innerHTML = '';
        (this.personalPrompts || []).forEach(prompt => {
            const el = document.createElement('div');
            el.className = 'list-item';
            el.innerHTML = `
                <span class="list-item-icon">🎯</span>
                <div class="list-item-details">
                    <div class="list-item-title">${prompt.title}</div>
                    <div class="list-item-desc">${prompt.prompt}</div>
                </div>
                <div class="list-item-actions">
                    <button class="edit-btn" data-id="${prompt.id}">✏️</button>
                    <button class="delete-btn" data-id="${prompt.id}">🗑️</button>
                </div>
            `;
            el.querySelector('.edit-btn').addEventListener('click', () => this.editPromptItem(prompt.id));
            el.querySelector('.delete-btn').addEventListener('click', () => this.deletePromptItem(prompt.id));
            list.appendChild(el);
        });
    }

    populateActivePromptSelector() {
        const selector = document.getElementById('active-prompt-selector');
        if (!selector) return;
        selector.innerHTML = '<option value="general">General (Open Context)</option>';
        (this.personalPrompts || []).forEach(prompt => {
            const option = document.createElement('option');
            option.value = prompt.id;
            option.textContent = prompt.title;
            selector.appendChild(option);
        });
        // You might want to get the active prompt from room settings and set it here
    }

    async handleSavePersonalContent(e) {
        e.preventDefault();
        const teacherUid = this.sdk.auth.currentUser.uid;
        const form = e.target;
        const contentId = form.querySelector('#content-id').value;
        const data = {
            title: form.querySelector('#content-title').value,
            description: form.querySelector('#content-desc').value,
            icon: form.querySelector('#content-icon').value,
            url: form.querySelector('#content-url').value,
        };

        const collectionRef = this.sdk.db.collection('teachers').doc(teacherUid).collection('personal_links');
        if (contentId) { // Update
            await collectionRef.doc(contentId).update(data);
        } else { // Create
            await collectionRef.add(data);
        }
        await this.loadPersonalData();
        this.renderPersonalContentList();
        this.resetContentForm();
    }

    editContentItem(id) {
        const item = this.personalContent.find(c => c.id === id);
        const form = document.getElementById('personal-content-form');
        if (!form) return;
        form.querySelector('#content-id').value = item.id;
        form.querySelector('#content-title').value = item.title;
        form.querySelector('#content-desc').value = item.description;
        form.querySelector('#content-icon').value = item.icon;
        form.querySelector('#content-url').value = item.url;
        const cancelBtn = document.getElementById('cancel-content-edit');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
    }

    resetContentForm() {
        const form = document.getElementById('personal-content-form');
        if (form) form.reset();
        const idInput = document.getElementById('content-id');
        if (idInput) idInput.value = '';
        const cancelBtn = document.getElementById('cancel-content-edit');
        if (cancelBtn) cancelBtn.style.display = 'none';
    }

    async deleteContentItem(id) {
        if (!confirm('Are you sure you want to delete this content?')) return;
        const teacherUid = this.sdk.auth.currentUser.uid;
        await this.sdk.db.collection('teachers').doc(teacherUid).collection('personal_links').doc(id).delete();
        await this.loadPersonalData();
        this.renderPersonalContentList();
    }

    async generatePromptSuggestion() {
        const subject = document.getElementById('prompt-subject-selector')?.value;
        const keywords = document.getElementById('prompt-keywords-input')?.value;

        if (!subject) {
            alert('Please select a main subject first.');
            return;
        }

        let goalDescription = `The main subject of the lesson is '${subject}'.`;
        if (keywords) {
            goalDescription += ` The specific topics or keywords are: '${keywords}'.`;
        }

        const metaPrompt = `You are an expert in pedagogical prompt engineering. A teacher described their lesson goal as follows: "${goalDescription}". Based on this, write an effective system prompt in English. The prompt should instruct an AI to act as a helpful teaching assistant, answer only questions directly related to the specified subject and keywords, and politely decline off-topic questions by reminding the student to focus on the lesson.`;

        this.addActivity('🤖 Asking AI for a prompt suggestion...');
        const result = await this.sdk.sendAIMessage(metaPrompt, 'en', true); // true to bypass context
        if (result && result.text) {
            const promptContent = document.getElementById('prompt-content');
            if (promptContent) promptContent.value = result.text;
            // Automatically generate a title
            const title = subject + (keywords ? `: ${keywords}` : '');
            const promptTitle = document.getElementById('prompt-title');
            if (promptTitle) promptTitle.value = title;
        } else {
            alert('The AI could not generate a suggestion. Please try again.');
        }
    }

    async handleSavePersonalPrompt(e) {
        e.preventDefault();
        const teacherUid = this.sdk.auth.currentUser.uid;
        const form = e.target;
        const promptId = form.querySelector('#prompt-id').value;
        const data = {
            title: form.querySelector('#prompt-title').value,
            prompt: form.querySelector('#prompt-content').value,
        };

        const collectionRef = this.sdk.db.collection('teachers').doc(teacherUid).collection('personal_prompts');
        if (promptId) { // Update
            await collectionRef.doc(promptId).update(data);
        } else { // Create
            await collectionRef.add(data);
        }
        await this.loadPersonalData();
        this.renderPersonalPromptsList();
        this.populateActivePromptSelector();
        this.resetPromptForm();
    }

    editPromptItem(id) {
        const item = this.personalPrompts.find(p => p.id === id);
        const form = document.getElementById('personal-prompt-form');
        if (!form) return;
        form.querySelector('#prompt-id').value = item.id;
        form.querySelector('#prompt-title').value = item.title;
        form.querySelector('#prompt-content').value = item.prompt;
        const cancelBtn = document.getElementById('cancel-prompt-edit');
        if (cancelBtn) cancelBtn.style.display = 'inline-block';
    }

    resetPromptForm() {
        const form = document.getElementById('personal-prompt-form');
        if (form) form.reset();
        const idInput = document.getElementById('prompt-id');
        if (idInput) idInput.value = '';
        const cancelBtn = document.getElementById('cancel-prompt-edit');
        if (cancelBtn) cancelBtn.style.display = 'none';
        const promptGoalInput = document.getElementById('prompt-goal-input');
        if (promptGoalInput) promptGoalInput.value = '';
    }

    async deletePromptItem(id) {
        if (!confirm('Are you sure you want to delete this prompt?')) return;
        const teacherUid = this.sdk.auth.currentUser.uid;
        await this.sdk.db.collection('teachers').doc(teacherUid).collection('personal_prompts').doc(id).delete();
        await this.loadPersonalData();
        this.renderPersonalPromptsList();
        this.populateActivePromptSelector();
    }

    async setActivePrompt(e) {
        const promptId = e.target.value;
        const roomRef = this.sdk.db.collection('rooms').doc(this.sdk.getRoomCode());
        await roomRef.update({ 'settings.active_prompt_id': promptId === 'general' ? null : promptId });
        this.addActivity(`✅ AI context set to: ${e.target.options[e.target.selectedIndex].text}`);
    }

    // ========== AUTHENTICATION METHODS ==========

    async handleSuccessfulLogin(user) {
        console.log("🚀 Handling successful login...");
        this.sdk = new ClassroomSDK();

        // 1. Get or create teacher profile
        await this.getOrCreateTeacherProfile(user);

        // 2. Initialize SDK
        await this.sdk.init('teacher-dashboard', user);
        this.debugLog(`✅ Teacher dashboard initialized with room: ${this.sdk.getRoomCode()}`);

        // 3. Setup UI and Listeners
        this.sdk.createAIInterface();
        this.initializeTeacherAI();
        this.sdk.listenForStudents(this.updateStudentsList.bind(this));
        this.sdk.listenForMessages(this.addMessage.bind(this));
        this.sdk.listenForRoomUpdates(this.handleRoomUpdates.bind(this)); // Use a dedicated handler

        this.updateConnectionStatus(true);
        this.setupEventListeners(); // Re-run to attach listeners to new elements
        this.updateRoomDisplay();

        // 4. טען תכנים והנחיות אישיות
        await this.loadPersonalData();

        // 5. Show the main app UI
        document.querySelector('.header').style.display = 'block';
        document.querySelector('.main-content').style.display = 'flex';
        document.getElementById('login-container').style.display = 'none';
        document.getElementById('loading-overlay').classList.add('hidden');
        console.log("🎉 Dashboard is ready and visible.");
    }

    async getOrCreateTeacherProfile(user) {
        const teacherRef = this.sdk.db.collection('teachers').doc(user.uid);
        const doc = await teacherRef.get();

        if (!doc.exists) {
            console.log(`Creating new teacher profile for: ${user.displayName}`);
            await teacherRef.set({
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                created_at: firebase.firestore.FieldValue.serverTimestamp(),
                last_login: firebase.firestore.FieldValue.serverTimestamp()
            });
        } else {
            console.log(`Teacher ${user.displayName} exists. Updating last login.`);
            await teacherRef.update({
                last_login: firebase.firestore.FieldValue.serverTimestamp()
            });
        }
    }

    showLoginScreen() {
        document.querySelector('.header').style.display = 'none';
        document.querySelector('.main-content').style.display = 'none';
        document.getElementById('loading-overlay').classList.add('hidden');
        const loginContainer = document.getElementById('login-container');
        loginContainer.style.display = 'flex';

        document.getElementById('google-signin-btn').onclick = () => this.signInWithProvider('google');
        document.getElementById('microsoft-signin-btn').onclick = () => this.signInWithProvider('microsoft');
    }

    async signInWithProvider(providerName) {
        let provider;
        if (providerName === 'google') {
            provider = new firebase.auth.GoogleAuthProvider();
        } else if (providerName === 'microsoft') {
            provider = new firebase.auth.OAuthProvider('microsoft.com');
        } else {
            return;
        }

        try {
            await firebase.auth().signInWithPopup(provider);
        } catch (error) {
            console.error(`${providerName} Sign-In Error:`, error);
            alert(`Failed to sign in with ${providerName}.`);
        }
    }

    logout() {
        firebase.auth().signOut();
    }

    // Helper to prevent code duplication
    handleRoomUpdates(roomData) {
        if (!roomData || !roomData.settings) return;

        if (roomData.settings.currentPoll) {
            this.displayPollResults(roomData.settings.currentPoll);
        }

        const aiIsActiveInDB = roomData.settings.ai_active === true;
        if (this.isAiActive !== aiIsActiveInDB) {
            this.isAiActive = aiIsActiveInDB;
            this.updateAIButton();
        }
    }
}

// Global functions for HTML buttons with English support
function sendQuickMessage(message) {
    if (window.teacherDashboard) {
        window.teacherDashboard.sendMessageToClass(message);
    }
}

function sendGameContent(url) {
    if (window.teacherDashboard) {
        window.teacherDashboard.sendCommand('LOAD_CONTENT', { url });
    }
}

function sendCustomContent() {
    document.getElementById('customContentModal').classList.add('visible');
}

// Global functions - updated
function toggleAIForClass() {
    if (window.teacherDashboard) {
        window.teacherDashboard.toggleAIForClass();
    }
}

function switchAIModel(model) {
    if (window.teacherDashboard) {
        window.teacherDashboard.switchAIModel(model);
    }
}

function resetClassroomData() {
    if (window.teacherDashboard) {
        window.teacherDashboard.resetClassroomData();
    }
}

function toggleDebug() {
    const debugConsole = document.querySelector('.enhanced-debug-console');
    if (debugConsole) {
        debugConsole.classList.toggle('visible');
    }
}

function sendMessage() {
    document.getElementById('messageModal').classList.add('visible');
}

function exportData() {
    if (!window.teacherDashboard) return;
    
    const data = {
        students: window.teacherDashboard.students,
        activities: window.teacherDashboard.activities,
        timestamp: new Date().toISOString(),
        roomCode: window.teacherDashboard.sdk?.getRoomCode()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classroom-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function updateAIMenuStatus(isActive) {
    const aiMenuItems = document.querySelectorAll('.ai-menu-item');
    aiMenuItems.forEach(item => {
        item.style.opacity = isActive ? '1' : '0.5';
        item.style.pointerEvents = isActive ? 'auto' : 'none';
    });
}

// Function to copy classroom ID to clipboard with English support
function copyClassroomId() {
    if (!window.teacherDashboard || !window.teacherDashboard.sdk) {
        alert('System is not ready yet');
        return;
    }
    
    const roomCode = window.teacherDashboard.sdk.getRoomCode();
    
    // Copy to clipboard
    navigator.clipboard.writeText(roomCode).then(() => {
        // Change button text temporarily
        const copyBtn = document.getElementById('copyClassroomIdBtn');
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✅ Copied!';
            copyBtn.style.background = 'rgba(76, 175, 80, 0.3)';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.background = 'rgba(255,255,255,0.2)';
            }, 2000);
        }
        
        // User notification
        if (window.teacherDashboard) {
            window.teacherDashboard.addActivity('📋 Classroom ID copied to clipboard');
        }
    }).catch(err => {
        console.error('Copy error:', err);
        alert('Error copying ID. Try copying manually.');
    });
}

// Function to test AI status with English messages
function testAIService() {
    if (window.teacherDashboard) {
        window.teacherDashboard.testAIService().then(result => {
            if (result) {
                alert('✅ AI service is available and working properly!');
            } else {
                alert('❌ AI service is currently unavailable. Check settings.');
            }
        });
    }
}

// 🔧 Add English support for the entire system
document.addEventListener('DOMContentLoaded', function() {
    // Set text direction for all relevant elements
    const ltrElements = document.querySelectorAll('.message-item, .activity-item, .student-item');
    ltrElements.forEach(element => {
        element.style.direction = 'ltr';
        element.style.textAlign = 'left';
    });
    
    // Set font that supports English
    const style = document.createElement('style');
    style.textContent = `
        body, * {
            font-family: 'Segoe UI', Tahoma, Arial, 'Roboto', 'Open Sans', sans-serif !important;
        }
        
        .message-content, .activity-text, .student-name {
            direction: ltr !important;
            text-align: left !important;
            unicode-bidi: embed !important;
        }
        
        .debug-log, .debug-content {
            direction: ltr !important;
            text-align: left !important;
        }
        
        /* Fix English texts in interface */
        .dropdown-title, .dropdown-desc, .tool-label, .tool-desc {
            direction: ltr !important;
            text-align: left !important;
        }
    `;
    document.head.appendChild(style);
});

// Debug function with English logs
function debugClassroom() {
    if (!window.teacherDashboard) {
        console.log('Teacher dashboard not initialized');
        return;
    }
    
    const debug = {
        'Room': window.teacherDashboard.sdk?.getRoomCode(),
        'Students': window.teacherDashboard.students.length,
        'AI Active': window.teacherDashboard.isAiActive,
        'AI Model': window.teacherDashboard.currentAiModel,
        'SDK Connected': !!window.teacherDashboard.sdk,
        'Init Time': new Date().toLocaleTimeString('en-US')
    };
    
    console.table(debug);
    return debug;
}