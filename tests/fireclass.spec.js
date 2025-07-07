// קובץ: tests/fireclass.spec.js

import { test, expect } from '@playwright/test';

// הגדרת כתובות האפליקציה במקום אחד לנוחות
const TEACHER_URL = 'https://class-board-ad64e.web.app/index.html';
const STUDENT_URL_BASE = 'https://class-board-ad64e.web.app/student-app.html';

test('Full fireClass Scenario: Teacher creates room, student joins and receives a message', async ({ browser }) => {
  // --- שלב 1: פתיחת מסך המורה וקבלת קוד החדר ---
  const teacherContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  await teacherPage.goto(TEACHER_URL);
  console.log('Teacher page opened.');

  // ממתין שקוד החדר יופיע (שהוא לא יהיה ברירת המחדל '...')
  const roomCodeElement = teacherPage.locator('#header-room-code');
  await expect(roomCodeElement).not.toHaveText('...');
  const roomCode = await roomCodeElement.textContent();
  console.log(`Room code obtained: ${roomCode}`);

  // --- שלב 2: פתיחת מסך התלמיד והתחברות ---
  const studentContext = await browser.newContext();
  const studentPage = await studentContext.newPage();
  const studentUrl = `${STUDENT_URL_BASE}?classroom=${roomCode}`;
  await studentPage.goto(studentUrl);
  console.log('Student page opened.');

  // התלמיד ממלא את פרטי ההתחברות
  await studentPage.locator('#player-name').fill('Robo-Student');
  await studentPage.locator('#teacher-uid').fill(roomCode);
  await studentPage.locator('button[type="submit"]').click();

  // וידוא שההתחברות הצליחה והתלמיד עבר למסך הראשי
  await expect(studentPage.locator('#main-container')).toBeVisible({ timeout: 10000 });
  console.log('Student successfully logged in.');

  // --- שלב 3: המורה שולח הודעה ---
  const testMessage = `Hello from your automated teacher! The time is ${new Date().toLocaleTimeString()}`;
  await teacherPage.locator('#chat-input').fill(testMessage);
  await teacherPage.locator('#chat-form button[type="submit"]').click();
  console.log('Teacher sent a message.');

  // --- שלב 4: וידוא (Assertion) - החלק החשוב ביותר ---
  const studentChatMessages = studentPage.locator('#classroom-chat-messages');
  
  // המבחן יצליח רק אם הטקסט של ההודעה יופיע באזור הצ'אט של התלמיד
  await expect(studentChatMessages).toContainText(testMessage);
  console.log('Test successful: Student received the teacher\'s message.');
});