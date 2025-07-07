// File: tests/advanced_features.spec.js (Final and Robust Version)

import { test, expect } from '@playwright/test';

const TEACHER_URL = 'https://class-board-ad64e.web.app/index.html';
const STUDENT_URL_BASE = 'https://class-board-ad64e.web.app/student-app.html';

test('Advanced Scenarios: External App, Open Poll, and AI Control', async ({ browser }) => {
  // --- Step 1: Initial Setup ---
  const teacherContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  await teacherPage.goto(TEACHER_URL);
  const roomCodeElement = teacherPage.locator('#header-room-code');
  await expect(roomCodeElement).not.toHaveText('...');
  const roomCode = await roomCodeElement.textContent();

  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  await studentPage.goto(`${STUDENT_URL_BASE}?classroom=${roomCode}`);
  await studentPage.locator('#player-name').fill('Advanced Robo-Student');
  await studentPage.locator('#teacher-uid').fill(roomCode);
  await studentPage.locator('button[type="submit"]').click();
  await expect(studentPage.locator('#main-container')).toBeVisible({ timeout: 10000 });
  console.log('Setup complete');

  // --- Scenario 1: Launch External App ---
  console.log('--- Testing External App Launch ---');
  await teacherPage.locator('a[onclick*="openContentModal"]').click();
  await expect(teacherPage.locator('#customContentModal')).toBeVisible();
  const homerAppButton = teacherPage.locator('.dropdown-item', { hasText: 'AI Model Training' });
  await homerAppButton.click();
  console.log('Teacher sent "AI Model Training" application.');

  const studentIframe = studentPage.locator('#content-frame');
  await expect(studentIframe).toHaveAttribute('src', 'https://meir.world/face-recognition/', { timeout: 10000 });
  console.log('Success: Student iframe loaded the correct application.');

  // --- Scenario 2: Open-Ended Poll ---
  console.log('--- Testing Open-Ended Poll ---');
  await teacherPage.locator('li.nav-item:has-text("Polls")').hover();
  await teacherPage.locator('a:has-text("Start New Poll")').click();
  await teacherPage.locator('button[data-type="open_text"]').click();
  await expect(teacherPage.locator('#open-question-modal')).toBeVisible();

  const studentPollWindow = studentPage.locator('#classroom-poll-container');
  await expect(studentPollWindow).toBeVisible();

  const studentAnswer = "My strategy is to use recursive thinking.";
  await studentPage.locator('#open-answer-input').fill(studentAnswer);
  await studentPage.locator('#submit-open-answer').click();
  console.log('Student submitted an answer.');

  await expect(async () => {
    const teacherResultsHTML = await teacherPage.locator('#open-question-results').innerHTML();
    expect(teacherResultsHTML).toContain('Advanced Robo-Student');
  }).toPass({ timeout: 10000 });
  console.log('Success: Teacher received the open-ended answer.');

  await teacherPage.locator('#close-open-question-btn').click();
  await expect(teacherPage.locator('#open-question-modal')).not.toBeVisible();
  console.log('Success: Teacher stopped the poll.');

  // --- Scenario 3: AI Control ---
  console.log('--- Testing AI Control ---');
  const studentAiButton = studentPage.locator('#classroom-ai-btn');
  const studentAiMessages = studentPage.locator('#classroom-ai-messages');
  await studentAiButton.click();
  await studentPage.locator('#classroom-ai-container input[type="text"]').fill('Can I ask something?');
  await studentPage.keyboard.press('Enter');

  await expect(studentAiMessages).toContainText('AI is not available at the moment.');
  console.log('Success: Student correctly sees "AI not available".');

  await teacherPage.locator('#aiMenuLink').hover();
  await teacherPage.locator('#toggleAI').click();

  await expect(teacherPage.locator('#aiStatusText')).toHaveText('AI Active for Students');
  console.log('Teacher enabled AI.');

  const studentAiPrompt = 'Now that AI is active, what is recursion?';

  // === THIS IS THE FINAL FIX IN THE TEST SCRIPT ===
  // This block will retry the "send and check" action until it succeeds,
  // giving the student's app time to receive the real-time "AI is active" update.
  await expect(async () => {
    // Student tries to send the prompt again
    await studentPage.locator('#classroom-ai-container input[type="text"]').fill(studentAiPrompt);
    await studentPage.keyboard.press('Enter');

    // We check if the prompt *itself* appears in the message list,
    // which proves the "send" action was successful.
    await expect(studentAiMessages).toContainText(studentAiPrompt);
  }).toPass({ timeout: 10000 }); // Retry for up to 10 seconds

  console.log('Success: Student sent a prompt while AI was active.');
});