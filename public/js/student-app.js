// ================== START OF FILE: public/js/student-app.js (COMPLETE AND FIXED) ==================
const App = {
    classroom: null,
    currentPollId: null, // Variable to track the currently displayed poll

    getOrCreateStudentId: function() {
        let studentId = sessionStorage.getItem('studentId');
        if (!studentId) {
            studentId = 'student_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            sessionStorage.setItem('studentId', studentId);
        }
        return studentId;
    },

    init: function() {
        this.loadRoomCodeFromURL();
        document.getElementById('login-form')?.addEventListener('submit', this.handleLogin.bind(this));
    },

    loadRoomCodeFromURL: function() {
        const params = new URLSearchParams(window.location.search);
        const roomCode = params.get('classroom');
        if (roomCode) {
            const input = document.getElementById('teacher-uid');
            if(input) input.value = roomCode;
        }
    },

    handleLogin: async function(event) {
        event.preventDefault();
        const playerName = document.getElementById('player-name').value.trim();
        const roomCode = document.getElementById('teacher-uid').value.trim();
        const loginButton = event.target.querySelector('button');
        if (!playerName || !/^\d{4}$/.test(roomCode)) {
            alert('Name and a 4-digit room code are required!');
            return;
        }

        loginButton.textContent = 'Joining...';
        loginButton.disabled = true;

        try {
            this.classroom = new ClassroomSDK();
            const studentId = this.getOrCreateStudentId();
            await this.classroom.init('student-app', studentId, playerName, roomCode);

            document.getElementById('login-container').style.display = 'none';
            document.getElementById('main-container').style.display = 'block';

            this.classroom.createChatInterface();
            this.classroom.createAIInterface();
            this.classroom.createPollInterface();
            this.classroom.listenForRoomUpdates(this.stateManager.bind(this));

            this.classroom.listenForMessages((messages) => {
                const chatContainer = document.getElementById('classroom-chat-container');
                const isChatHidden = !chatContainer || chatContainer.style.display === 'none';

                messages.forEach(msg => {
                    this.classroom.addChatMessage(msg.sender, msg.content, msg);

                    if (isChatHidden && msg.is_teacher) {
                        this.classroom.toggleChat();
                    }
                });
            });

        } catch (error) {
            console.error("❌ Failed to initialize student app:", error);
            alert(`Failed to join the room: ${error.message}\nPlease check the room code and try again.`);
            loginButton.textContent = 'Join Lesson';
            loginButton.disabled = false;
        }
    },

    // The new central State Manager function
    stateManager: function(roomData) {
        if (!roomData || !roomData.settings) return;

        const settings = roomData.settings;
        const pollData = settings.currentPoll;
        const command = settings.current_command;

        // --- AI State Management ---
        // ** THE MAIN FIX IS HERE **
        // We no longer hide the AI button. Instead, we update the SDK's internal state.
        // The SDK's sendAIMessage function will now handle the logic of checking if AI is active.
        this.classroom.isAiActiveForClass = settings.ai_active === true;

        // --- Poll State Management ---
        const pollContainer = document.getElementById('classroom-poll-container');
        const pollBadge = document.getElementById('poll-badge');
        const pollIsActive = pollData && pollData.isActive;

        if (pollBadge && pollContainer) {
            pollContainer.dataset.active = pollIsActive ? 'true' : 'false';
            pollBadge.style.display = pollIsActive ? 'block' : 'none';
        }

        if (pollIsActive) {
            // If a new poll has arrived, render its content and OPEN the window
            if (this.currentPollId !== pollData.id) {
                this.currentPollId = pollData.id;
                this.renderPollInterface(pollData); // This function will also make the window visible
            }
        } else {
            // If the poll has been stopped by the teacher, force-close the window
            if (this.currentPollId !== null) {
                this.clearPollInterface(); // This function now closes the window
                this.currentPollId = null;
            }
        }

        // --- Content Command Management ---
        if (command && command.command === 'LOAD_CONTENT') {
            const iframe = document.getElementById('content-frame');
            const newUrl = command.payload.url || 'about:blank';
            if (iframe && iframe.src !== newUrl) {
                iframe.src = newUrl;
            }
        }
    },

    renderPollInterface: function(pollData) {
        const pollContainer = document.getElementById('classroom-poll-container');
        const pollContentArea = document.getElementById('classroom-poll-content-area');
        if (!pollContainer || !pollContentArea) return;

        // Show the poll window and render content inside it
        pollContainer.style.display = 'block';

        // Build the poll UI based on its type
        if (pollData.type === 'open_text') {
            pollContentArea.innerHTML = `
                <p style="margin-top:0; margin-bottom:15px; font-weight:500;">The teacher is asking a question. Please type your answer below.</p>
                <textarea id="open-answer-input" placeholder="Write your answer here..." style="width: 100%; height: 80px; padding: 10px; border-radius: 6px; border: 1px solid #ccc; box-sizing: border-box;"></textarea>
                <button id="submit-open-answer" style="width: 100%; padding: 12px; margin-top: 10px; border: none; background: #007bff; color: white; border-radius: 6px; cursor: pointer;">Submit Answer</button>
            `;
            document.getElementById('submit-open-answer').onclick = (event) => {
                const answerInput = document.getElementById('open-answer-input');
                const answer = answerInput.value.trim();
                const submitBtn = event.currentTarget;

                if (answer) {
                    this.classroom.submitPollAnswer(answer);
                    answerInput.value = '';
                    submitBtn.textContent = '✅ Answer Sent!';
                    submitBtn.disabled = true;

                    setTimeout(() => {
                        submitBtn.textContent = 'Submit Answer';
                        submitBtn.disabled = false;
                    }, 2000);
                }
            };
        } else { 
            const labels = (pollData.type === 'yes_no') ? ['Yes', 'No'] : ['1', '2', '3', '4'];
            pollContentArea.innerHTML = `<p style="margin-top:0; margin-bottom:15px; font-weight:500;">The teacher is asking a quick question:</p>`;

            const buttonsWrapper = document.createElement('div');
            buttonsWrapper.style.cssText = 'display: flex; gap: 10px; flex-wrap: wrap;';

            for (let i = 1; i <= pollData.options; i++) {
                const button = document.createElement('button');
                button.textContent = labels[i-1];
                button.style.cssText = 'flex-grow: 1; padding: 12px; border: 1px solid #ccc; background: #f0f0f0; border-radius: 6px; cursor: pointer;';
                button.onclick = () => {
                    this.classroom.submitPollAnswer(i);
                    pollContentArea.innerHTML = '<p style="text-align:center; font-weight: bold; color: #28a745;">Thank you for your answer!</p>';
                };
                buttonsWrapper.appendChild(button);
            }
            pollContentArea.appendChild(buttonsWrapper);
        }
    },

    clearPollInterface: function() {
        const pollContainer = document.getElementById('classroom-poll-container');
        const pollContentArea = document.getElementById('classroom-poll-content-area');

        if (pollContainer) {
            pollContainer.style.display = 'none'; // Hide the window
            pollContainer.dataset.active = 'false';
        }
        if (pollContentArea) {
            pollContentArea.innerHTML = ''; // Clear its content for the next poll
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
// ================== END OF FILE ==================