// SIMPLIFIED CLASSROOM SDK - 4-DIGIT ROOM CODES ONLY!

class ClassroomSDK {
    constructor() {
        try {
            this.db = firebase.firestore();
            this.auth = firebase.auth();
            this.functions = firebase.app().functions('europe-west1');
            console.log('✅ Firebase services initialized in constructor.');
        } catch (e) {
            console.error("❌ CRITICAL: Could not initialize Firebase services.", e);
            alert("Fatal Error: Could not connect to Firebase services. Please refresh.");
        } 
        

        this.playerName = null;
        this.roomCode = null; // 4-digit room code
        this.isTeacher = false;
        this.isInitialized = false;
        this.studentId = null;
        this.isAiActiveForClass = false;

        // UI components
        this.chatButton = null;
        this.chatContainer = null;
        this.chatMessages = null;
        this.chatInput = null;
        this.aiButton = null;
        this.aiContainer = null;
        this.aiMessages = null;
        this.aiInput = null;
        
        // Listeners
        this.studentsListener = null;
        this.messagesListener = null;
        this.roomListener = null;
    }

    // Anonymous authentication
    async loginAnonymously() {
        try {
            const userCredential = await this.auth.signInAnonymously();
            console.log('✅ Anonymous login successful:', userCredential.user.uid);
            return userCredential.user;
        } catch (error) {
            console.error('🔥 Anonymous login failed:', error);
            throw error;
        }
    }

    // Generate unique 4-digit room code
    async generateUniqueRoomCode() {
        let attempts = 0;
        const maxAttempts = 20; // Maximum 20 attempts
        
        while (attempts < maxAttempts) {
            // Generate random 4-digit code
            const roomCode = Math.floor(1000 + Math.random() * 9000).toString();
            
            // Check that code doesn't exist
            const roomRef = this.db.collection('rooms').doc(roomCode);
            const doc = await roomRef.get();
            
            if (!doc.exists) {
                console.log(`✅ Found unique room code: ${roomCode}`);
                return roomCode;
            }
            
            console.log(`🔄 Room code ${roomCode} exists, trying next...`);
            attempts++;
        }
        
        // If not found after 20 attempts, return random code
        const randomCode = Math.floor(1000 + Math.random() * 9000).toString();
        console.log(`✅ Generated random room code: ${randomCode}`);
        return randomCode;
    }

    // SIMPLIFIED INIT - 4-digit room codes only!
    async init(appName, userOrStudentId, playerName, roomCode = null) {
        console.log(`🚀 Initializing ${appName}...`);
        this.appName = appName;
        this.playerName = playerName;

        if (appName === 'teacher-dashboard') {
            // תהליך האתחול של המורה
            this.isTeacher = true;
            this.playerName = "Teacher";
            this.roomCode = await this.generateUniqueRoomCode();
            await this.initializeRoom(userOrStudentId.uid); // Pass the teacher's UID

        } else if (appName === 'student-app' && roomCode) {
            // תהליך האתחול של התלמיד
            this.isTeacher = false;
            this.roomCode = roomCode;
            this.studentId = userOrStudentId; // This is the student's session ID

            // ודא שהחדר קיים לפני ניסיון הצטרפות
            const roomExists = await this.checkRoomExists(roomCode);
            if (!roomExists) {
                throw new Error(`Room with code ${roomCode} does not exist.`);
            }
            await this.joinRoom(this.studentId, this.playerName);

        } else {
            throw new Error('Invalid initialization parameters.');
        }

        this.isInitialized = true;
        console.log(`✅ ${appName} initialized successfully for room: ${this.roomCode}`);
    }

    // הוסף את שתי הפונקציות האלה לקלאס
    async checkRoomExists(roomCode) {
        const roomRef = this.db.collection('rooms').doc(roomCode);
        const doc = await roomRef.get();
        return doc.exists;
    }

    // עדכון קל לפונקציית initializeRoom
    async initializeRoom(teacherUid) {
        const roomRef = this.db.collection('rooms').doc(this.roomCode);
        await roomRef.set({
            room_code: this.roomCode,
            created_at: firebase.firestore.FieldValue.serverTimestamp(),
            teacher_uid: teacherUid,
            settings: {
                ai_active: false,
                ai_model: 'chatgpt',
                current_command: null,
                currentPoll: { isActive: false }
            }
        });
    }

    // עדכון קל לפונקציית joinRoom
    async joinRoom(studentId, playerName) {
        const studentRef = this.db.collection('rooms').doc(this.roomCode)
                                 .collection('students').doc(studentId);
        await studentRef.set({
            uid: studentId,
            name: playerName,
            joined_at: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // Listen for students
    listenForStudents(callback) {
        if (!this.roomCode) return;
        
        const studentsCollection = this.db.collection('rooms').doc(this.roomCode)
                                         .collection('students');
        
        this.studentsListener = studentsCollection.onSnapshot(snapshot => {
            const students = [];
            snapshot.forEach(doc => {
                students.push(doc.data());
            });
            console.log('👨‍🎓 Students updated:', students.length);
            
            if (typeof callback === 'function') {
                callback(students);
            }
        }, error => {
            console.error("🔥 Error listening for students:", error);
        });
    }

    // Listen for messages
    listenForMessages(callback) {
        if (!this.roomCode) return;

        const messagesCollection = this.db.collection('rooms').doc(this.roomCode)
                                         .collection('messages')
                                         .orderBy('timestamp');

        this.messagesListener = messagesCollection.onSnapshot(snapshot => {
            const newMessages = [];
            snapshot.docChanges().forEach(change => {
                if (change.type === "added") {
                    const msg = change.doc.data();
                    const currentUserId = this.isTeacher ? this.auth.currentUser?.uid : this.studentId;
                    const isPrivate = msg.is_private === true;
                    const isRecipient = msg.recipient_uid === currentUserId;
                    const isSender = msg.sender_uid === currentUserId;

                    if (!isPrivate || this.isTeacher || isRecipient || isSender) {
                        newMessages.push(msg);
                    }
                }
            });

            if (newMessages.length > 0 && typeof callback === 'function') {
                callback(newMessages);
            }
        }, error => {
            console.error("🔥 Error listening for messages:", error);
        });
    }

    // Listen for room updates (commands, AI, etc.)
    listenForRoomUpdates(callback) {
        if (!this.roomCode) return;
        const roomRef = this.db.collection('rooms').doc(this.roomCode);

        this.roomListener = roomRef.onSnapshot(doc => {
            if (doc.exists && typeof callback === 'function') {
                // שלב קריטי: שלח את כל אובייקט הנתונים, ותן לאפליקציה להחליט
                callback(doc.data());
            }
        }, error => {
            console.error("🔥 Error listening for room updates:", error);
        });
    }

    // Send message
    async sendMessage(content) {
        if (!content || !content.trim() || !this.roomCode) return;

        try {
            const messagesCollection = this.db.collection('rooms').doc(this.roomCode)
                                             .collection('messages');
            await messagesCollection.add({
                sender: this.playerName || "Teacher",
                sender_uid: this.isTeacher ? this.auth.currentUser?.uid : this.studentId,
                content: content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                is_teacher: this.isTeacher
            });
        } catch (error) {
            console.error('🔥 Error sending message:', error);
            throw error;
        }
    }

    // Send command (teacher only)
    async sendCommand(commandName, payload = {}) {
        const roomRef = this.db.collection('rooms').doc(this.roomCode);
        await roomRef.update({
            'settings.current_command': {
                command: commandName,
                payload: payload,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            },
            'last_activity': firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // Toggle AI mode (teacher only)
    async toggleAI() {
        console.log('[DIAGNOSTIC] 1. toggleAI function started.');
        const roomRef = this.db.collection('rooms').doc(this.roomCode);

        try {
            const doc = await roomRef.get();
            const currentAI = doc.exists ? doc.data().settings?.ai_active : false;
            console.log(`[DIAGNOSTIC] 2. Read from DB. currentAI is: ${currentAI}`);

            const newValue = !currentAI;
            console.log(`[DIAGNOSTIC] 3. Value to be written to DB is: ${newValue}`);

            await roomRef.update({
                'settings.ai_active': newValue
            });

            console.log('[DIAGNOSTIC] 4. SUCCESS: roomRef.update command finished without error.');
            return newValue;

        } catch (error) {
            // אם תהיה שגיאה כלשהי בפעולת הכתיבה, נראה אותה כאן
            console.error('[DIAGNOSTIC] 5. CRITICAL FAILURE: Error during toggleAI process.', error);
            // זרוק את השגיאה הלאה כדי שהקוד שקרא לפונקציה ידע שהיא נכשלה
            throw error;
        }
    }

    // Cleanup
    cleanup() {
        if (this.studentsListener) {
            this.studentsListener();
            this.studentsListener = null;
        }
        if (this.messagesListener) {
            this.messagesListener();
            this.messagesListener = null;
        }
        if (this.roomListener) {
            this.roomListener();
            this.roomListener = null;
        }
        if (this.roomListener_Polls) {
            this.roomListener_Polls();
            this.roomListener_Polls = null;
        }
    }

    // Returns room code
    getRoomCode() {
        return this.roomCode;
    }

    // ========== CHAT INTERFACE ==========
    createChatInterface() {
        // Show chat interface only for students
        if (this.isTeacher) {
            console.log("Teacher view: Floating chat interface disabled.");
            return; 
        }

        if (document.getElementById('classroom-chat-btn')) return;
        
        this.chatButton = document.createElement('button');
        this.chatButton.id = 'classroom-chat-btn';
        this.chatButton.innerHTML = '💬';
        this.chatButton.style.cssText = 'position: fixed; bottom: 20px; right: 20px; width: 60px; height: 60px; border-radius: 50%; background: #007bff; color: white; border: none; font-size: 24px; cursor: grab; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 1000;';
        this.chatButton.onclick = () => this.toggleChat();
        this.makeDraggable(this.chatButton);
        document.body.appendChild(this.chatButton);

        this.chatContainer = document.createElement('div');
        this.chatContainer.id = 'classroom-chat-container';
        this.chatContainer.style.cssText = 'position: fixed; bottom: 100px; right: 20px; width: 350px; height: 400px; background: white; border-radius: 15px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); z-index: 999; display: none; overflow: hidden;';
        
        const chatHeader = document.createElement('div');
        chatHeader.style.cssText = 'background: #007bff; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; cursor: grab;';
        chatHeader.innerHTML = `
            <span>💬 Class Chat</span>
            <button id="chat-minimize-btn" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 5px;">−</button>
        `;
        
        this.makeDraggable(this.chatContainer, chatHeader);
        
        chatHeader.querySelector('#chat-minimize-btn').onclick = (e) => {
            e.stopPropagation();
            // Use App's close function to ensure state is updated
            if (window.App && window.App.closeChat) {
                window.App.closeChat();
            } else {
                this.toggleChat();
            }
        };
        
        this.chatContainer.appendChild(chatHeader);
        
        const chatContent = document.createElement('div');
        chatContent.style.cssText = 'height: calc(100% - 60px); display: flex; flex-direction: column;';
        
        this.chatMessages = document.createElement('div');
        this.chatMessages.id = 'classroom-chat-messages';
        this.chatMessages.style.cssText = 'flex: 1; padding: 15px; overflow-y: auto; background: #f8f9fa;';
        this.chatMessages.innerHTML = '<div style="text-align: center; color: #999; font-style: italic;">No messages sent yet</div>';
        
        const chatInputArea = document.createElement('div');
        chatInputArea.style.cssText = 'padding: 15px; border-top: 1px solid #eee; background: white;';
        
        this.chatInput = document.createElement('input');
        this.chatInput.type = 'text';
        this.chatInput.placeholder = 'Type a message...';
        this.chatInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; font-size: 14px;';
        
        this.chatInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const messageContent = this.chatInput.value.trim();
                if (messageContent) {
                    this.sendMessage(messageContent);
                    this.chatInput.value = '';
                }
            }
        };
        
        chatInputArea.appendChild(this.chatInput);
        chatContent.appendChild(this.chatMessages);
        chatContent.appendChild(chatInputArea);
        this.chatContainer.appendChild(chatContent);
        document.body.appendChild(this.chatContainer);
    }

    enableChat() {
        if (this.chatButton) {
            this.chatButton.style.display = 'block';
        }
    }

    toggleChat() {
        if (!this.chatContainer) return;
        
        // Use the App's state management functions
        if (window.App) {
            if (window.App.isChatOpen) {
                window.App.closeChat();
            } else {
                window.App.openChat();
                if (this.chatInput) {
                    this.chatInput.focus();
                }
            }
        } else {
            // Fallback for direct usage
            const isVisible = this.chatContainer.style.display !== 'none';
            this.chatContainer.style.display = isVisible ? 'none' : 'block';
            
            if (!isVisible && this.chatInput) {
                this.chatInput.focus();
            }
        }
    }

    addChatMessage(sender, content, messageObj) {
        if (!this.chatMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = 'margin-bottom: 10px; padding: 8px 12px; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1);';
        
        const senderSpan = document.createElement('div');
        senderSpan.style.cssText = 'font-weight: bold; color: #007bff; font-size: 12px; margin-bottom: 4px;';
        senderSpan.textContent = sender;
        
        const contentSpan = document.createElement('div');
        contentSpan.style.cssText = 'color: #333; line-height: 1.4;';
        contentSpan.textContent = content;
        
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(contentSpan);
        
        // Remove first message if it's "No messages sent yet"
        if (this.chatMessages.children.length === 1 && 
            this.chatMessages.children[0].textContent.includes('No messages sent yet')) {
            this.chatMessages.innerHTML = '';
        }
        
        this.chatMessages.appendChild(messageDiv);
        this.chatMessages.scrollTop = this.chatMessages.scrollHeight;
    }

    // ========== AI INTERFACE ==========
    createAIInterface() {
        if (document.getElementById('classroom-ai-btn')) return;

        this.aiButton = document.createElement('button');
        this.aiButton.id = 'classroom-ai-btn';
        this.aiButton.innerHTML = '🤖';
        // Button is now always visible
        this.aiButton.style.cssText = `position: fixed; bottom: 20px; right: 90px; width: 60px; height: 60px; border-radius: 50%; background: #4caf50; color: white; border: none; font-size: 24px; cursor: grab; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; display: block;`;

        this.aiButton.onclick = () => this.toggleAI();
        this.makeDraggable(this.aiButton);
        document.body.appendChild(this.aiButton);

        // The rest of the function remains the same for creating the container...
        this.aiContainer = document.createElement('div');
        this.aiContainer.id = 'classroom-ai-container';
        this.aiContainer.style.cssText = 'position: fixed; bottom: 100px; right: 20px; width: 400px; height: 500px; background: white; border-radius: 15px; box-shadow: 0 8px 30px rgba(0,0,0,0.2); z-index: 999; display: none; overflow: hidden;';

        const aiHeader = document.createElement('div');
        aiHeader.style.cssText = 'background: #4caf50; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; cursor: grab;';
        aiHeader.innerHTML = `<span>🤖 AI Assistant</span><button style="background:none;border:none;color:white;font-size:18px;cursor:pointer;">−</button>`;

        this.makeDraggable(this.aiContainer, aiHeader);

        aiHeader.querySelector('button').onclick = (e) => {
            e.stopPropagation();
            this.toggleAI();
        };

        this.aiContainer.appendChild(aiHeader);

        const aiContent = document.createElement('div');
        aiContent.style.cssText = 'height: calc(100% - 60px); display: flex; flex-direction: column;';

        this.aiMessages = document.createElement('div');
        this.aiMessages.id = 'classroom-ai-messages';
        this.aiMessages.style.cssText = 'flex: 1; padding: 15px; overflow-y: auto; background: #f8f9fa;';
        this.aiMessages.innerHTML = '<div style="text-align: center; color: #999; font-style: italic;">Ask the AI assistant...</div>';

        const aiInputArea = document.createElement('div');
        aiInputArea.style.cssText = 'padding: 15px; border-top: 1px solid #eee; background: white;';

        this.aiInput = document.createElement('input');
        this.aiInput.type = 'text';
        this.aiInput.placeholder = 'Ask a question...';
        this.aiInput.style.cssText = 'width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 20px; outline: none; font-size: 14px;';
        this.aiInput.onkeypress = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const prompt = this.aiInput.value.trim();
                if (prompt) {
                    const lang = document.documentElement.lang || 'en';
                    this.sendAIMessage(prompt, lang);
                    this.aiInput.value = '';
                }
            }
        };

        aiInputArea.appendChild(this.aiInput);
        aiContent.appendChild(this.aiMessages);
        aiContent.appendChild(aiInputArea);
        this.aiContainer.appendChild(aiContent);
        document.body.appendChild(this.aiContainer);
    }

    toggleAI() {
        if (!this.aiContainer) return;
        
        const isVisible = this.aiContainer.style.display !== 'none';
        this.aiContainer.style.display = isVisible ? 'none' : 'block';
        
        if (!isVisible && this.aiInput) {
            this.aiInput.focus();
        }
    }

    getInterfaceLanguage() {
        return document.documentElement.lang || 'en';
    }

    async sendAIMessage(prompt, language) {
        // Check if AI is disabled for students
        if (!this.isTeacher && !this.isAiActiveForClass) {
            this.addAIMessage("🤖", "AI is not available at the moment.", false);
            return;
        }

        if (!language) language = this.getInterfaceLanguage();

        if (!this.functions) {
            this.addAIMessage("🤖", "Error: AI service not initialized", false);
            return;
        }
        this.addAIMessage(this.playerName || "You", prompt, true);

        try {
            const askAIFunction = this.functions.httpsCallable('askAI');
            const result = await askAIFunction({ prompt, roomCode: this.roomCode, language });
            const senderName = result.data.model ? `🤖 (${result.data.model})` : "🤖";
            this.addAIMessage(senderName, result.data.result, false);
        } catch (error) {
            console.error("🔥 Error calling askAI:", error);
            let errorMsg = "An error occurred with the AI service.";
            if (error.code === 'functions/unauthenticated') {
                errorMsg = "Authentication error. Please reconnect.";
            }
            this.addAIMessage("🤖", errorMsg, false);
        }
    }

    addAIMessage(sender, content, isUser) {
        if (!this.aiMessages) return;
        
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `margin-bottom: 10px; padding: 8px 12px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); ${isUser ? 'background: #007bff; color: white; margin-left: 20px;' : 'background: white; color: #333; margin-right: 20px;'}`;
        
        const senderSpan = document.createElement('div');
        senderSpan.style.cssText = `font-weight: bold; font-size: 12px; margin-bottom: 4px; ${isUser ? 'color: rgba(255,255,255,0.8);' : 'color: #28a745;'}`;
        senderSpan.textContent = sender;
        
        const contentSpan = document.createElement('div');
        contentSpan.style.cssText = 'line-height: 1.4;';
        contentSpan.textContent = content;
        
        messageDiv.appendChild(senderSpan);
        messageDiv.appendChild(contentSpan);
        
        // Remove first message if it's "Ask the AI assistant..."
        if (this.aiMessages.children.length === 1 && 
            this.aiMessages.children[0].textContent.includes('Ask the AI assistant')) {
            this.aiMessages.innerHTML = '';
        }
        
        this.aiMessages.appendChild(messageDiv);
        this.aiMessages.scrollTop = this.aiMessages.scrollHeight;
    }

    // ========== UTILITY FUNCTIONS ==========
    makeDraggable(element, dragHandle = null) {
        const handle = dragHandle || element;
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            let startX = e.clientX - element.offsetLeft;
            let startY = e.clientY - element.offsetTop;
            if (element.style.right) {
                element.style.left = element.offsetLeft + 'px';
                element.style.right = ''; 
            }
            const handleMouseMove = (me) => {
                element.style.left = (me.clientX - startX) + 'px';
                element.style.top = (me.clientY - startY) + 'px';
            };
            const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
            };
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
    }

    showGameNotification(message) {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; padding: 15px 25px; border-radius: 25px;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2); z-index: 10000;
            font-weight: bold; font-size: 16px; animation: slideDown 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideUp 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
        
        // Add CSS for animations
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideDown { from { transform: translateX(-50%) translateY(-100%); opacity: 0; } to { transform: translateX(-50%) translateY(0); opacity: 1; } }
                @keyframes slideUp { from { transform: translateX(-50%) translateY(0); opacity: 1; } to { transform: translateX(-50%) translateY(-100%); opacity: 0; } }
            `;
            document.head.appendChild(style);
        }
    }

    // Send private message (teacher only)
    async sendPrivateMessage(content, recipientUid) {
        if (!content || !content.trim() || !this.roomCode || !recipientUid) return;

        try {
            const messagesCollection = this.db.collection('rooms').doc(this.roomCode)
                                             .collection('messages');
            await messagesCollection.add({
                sender: this.playerName || "Teacher",
                sender_uid: this.isTeacher ? this.auth.currentUser?.uid : this.studentId,
                recipient_uid: recipientUid,
                content: content,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                is_teacher: this.isTeacher,
                is_private: true
            });
        } catch (error) {
            console.error('🔥 Error sending private message:', error);
            throw error;
        }
    }

    // Test AI service availability
    async testAIService() {
        if (!this.functions) {
            return { available: false, error: "Firebase Functions not initialized", code: "functions/not-initialized" };
        }

        // Ensure user is authenticated before calling cloud function
        let user = this.auth.currentUser;
        if (!user) {
            try {
                const userCredential = await this.auth.signInAnonymously();
                user = userCredential.user;
            } catch (authError) {
                return { available: false, error: "Authentication failed", code: "auth-failed" };
            }
        }

        if (!user || !user.uid) {
            return { available: false, error: "User not authenticated", code: "auth-missing" };
        }
        
        try {
            const askChatGPTFunction = this.functions.httpsCallable('askChatGPT');
            const result = await askChatGPTFunction({ prompt: "Hello" });

            return { available: true, result: result.data.result, code: "success" };
        } catch (error) {
            return { available: false, error: error.message, code: error.code || "unknown" };
        }
    }

    // Poll management functions
    async startPoll(pollConfig) {
        if (!this.isTeacher) return;
        
        console.log("📊 Starting poll", pollConfig);
        
        const newPoll = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9), // New unique ID
            type: pollConfig.type,
            question: pollConfig.question || '', // Add question field
            options: pollConfig.options,
            isActive: true,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            responses: {}
        };

        await this.db.collection('rooms').doc(this.roomCode).update({
            'settings.currentPoll': newPoll
        });
        
        console.log("✅ Poll started successfully");
    }

    async stopPoll() {
        if (!this.isTeacher) return;
        
        console.log("📊 Stopping poll");
        
        await this.db.collection('rooms').doc(this.roomCode).update({
            'settings.currentPoll.isActive': false
        });
        
        console.log("✅ Poll stopped successfully");
    }

    async submitPollAnswer(answer) {
        if (!this.functions) {
            console.error("Firebase Functions is not initialized.");
            return;
        }
        try {
            const submitAnswerFunction = this.functions.httpsCallable('submitPollAnswer');
            await submitAnswerFunction({
                roomCode: this.roomCode,
                studentId: this.studentId,
                playerName: this.playerName,
                answer: answer
            });
            console.log("✅ Poll answer successfully sent via Cloud Function.");
        } catch (error) {
            console.error("🔥 Error calling submitPollAnswer cloud function:", error);
        }
    }

    listenForPollUpdates(callback) {
        this.roomListener_Polls = this.db.collection('rooms').doc(this.roomCode)
            .onSnapshot(doc => {
                const pollData = doc.data()?.settings?.currentPoll;
                this.lastKnownPollData = pollData;
                console.log("📊 Poll update received", pollData);
                if (typeof callback === 'function') {
                    callback(pollData);
                }
            });
    }

    getCurrentPollData() {
        return this.lastKnownPollData;
    }

    getStudentId() {
        return this.studentId;
    }

    // Function to save question history
    async saveQuestionToHistory(pollData) {
        if (!this.isTeacher || !pollData) return;
        const historyRef = this.db.collection('rooms').doc(this.roomCode)
            .collection('questionHistory').doc(pollData.id);
        await historyRef.set({
            ...pollData,
            closedAt: firebase.firestore.FieldValue.serverTimestamp()
        });
    }

    // ========== POLL INTERFACE ==========
    createPollInterface() {
        if (this.isTeacher || document.getElementById('classroom-poll-btn')) return;

        // 1. Create the permanent floating button
        this.pollButton = document.createElement('button');
        this.pollButton.id = 'classroom-poll-btn';
        this.pollButton.innerHTML = '📊<div id="poll-badge" style="position:absolute; top:-2px; right:-2px; width:12px; height:12px; border-radius:50%; background:red; display:none; border: 2px solid white;"></div>';
        this.pollButton.style.cssText = 'position: fixed; bottom: 20px; right: 160px; width: 60px; height: 60px; border-radius: 50%; background: #607d8b; color: white; border: none; font-size: 24px; cursor: pointer; box-shadow: 0 4px 12px rgba(0,0,0,0.3); z-index: 10000; display: block;'; // Always visible

        this.pollButton.onclick = () => {
            if (this.pollContainer && this.pollContainer.dataset.active === 'true') {
                const isVisible = this.pollContainer.style.display !== 'none';
                this.pollContainer.style.display = isVisible ? 'none' : 'block';
            }
        };

        // *** ADD THIS LINE TO MAKE THE BUTTON DRAGGABLE ***
        this.makeDraggable(this.pollButton);

        document.body.appendChild(this.pollButton);

        // 2. Create the draggable container
        this.pollContainer = document.createElement('div');
        this.pollContainer.id = 'classroom-poll-container';
        this.pollContainer.dataset.active = 'false'; // Custom attribute to track state
        this.pollContainer.style.cssText = 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 450px; min-height: 200px; background: white; border-radius: 15px; box-shadow: 0 8px 40px rgba(0,0,0,0.25); z-index: 10001; display: none; overflow: hidden;';

        const pollHeader = document.createElement('div');
        pollHeader.style.cssText = 'background: #ff9800; color: white; padding: 15px; display: flex; justify-content: space-between; align-items: center; font-weight: bold; cursor: grab;';
        pollHeader.innerHTML = '<span>📊 Poll / Question</span><button id="poll-minimize-btn" style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 5px;">−</button>';

        this.makeDraggable(this.pollContainer, pollHeader);

        pollHeader.querySelector('#poll-minimize-btn').onclick = (e) => {
            e.stopPropagation();
            this.pollContainer.style.display = 'none';
        };

        const pollContentArea = document.createElement('div');
        pollContentArea.id = 'classroom-poll-content-area';
        pollContentArea.style.cssText = 'padding: 20px;';

        this.pollContainer.appendChild(pollHeader);
        this.pollContainer.appendChild(pollContentArea);
        document.body.appendChild(this.pollContainer);
    }
}