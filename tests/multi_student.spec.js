// קובץ: tests/multi_student.spec.js (גרסה מתוקנת עם בוררים ספציפיים)

import { test, expect } from '@playwright/test';

const TEACHER_URL = 'https://class-board-ad64e.web.app/index.html';
const STUDENT_URL_BASE = 'https://class-board-ad64e.web.app/student-app.html';

test('Multi-Student Scenario: Yes/No poll with two students', async ({ browser }) => {
  // --- שלב 1: הגדרת מורה ו-2 תלמידים ---

  const teacherContext = await browser.newContext();
  const teacherPage = await teacherContext.newPage();
  await teacherPage.goto(TEACHER_URL);
  console.log('Teacher page opened.');

  const roomCodeElement = teacherPage.locator('#header-room-code');
  await expect(roomCodeElement).not.toHaveText('...');
  const roomCode = await roomCodeElement.textContent();
  console.log(`Room code obtained: ${roomCode}`);

  const studentNames = ['Student-Alpha', 'Student-Beta'];
  const studentPages = [];

  for (const name of studentNames) {
    const studentContext = await browser.newContext();
    const page = await studentContext.newPage();
    await page.goto(`${STUDENT_URL_BASE}?classroom=${roomCode}`);
    await page.locator('#player-name').fill(name);
    await page.locator('#teacher-uid').fill(roomCode);
    await page.locator('button[type="submit"]').click();
    studentPages.push(page);
  }

  await Promise.all(studentPages.map(page => 
    expect(page.locator('#main-container')).toBeVisible({ timeout: 10000 })
  ));
  console.log(`${studentNames.length} students successfully logged in.`);

  await expect(teacherPage.locator('.student-item')).toHaveCount(2, { timeout: 10000 });
  console.log('Teacher sees both students in the dashboard.');

  // --- שלב 2: המורה שולח סקר כן/לא ---

  console.log('--- Testing Yes/No Poll ---');
  await teacherPage.locator('li.nav-item:has-text("Polls")').hover();
  await teacherPage.locator('a:has-text("Start New Poll")').click();
  await teacherPage.locator('button[data-type="yes_no"]').click();

  await expect(teacherPage.locator('#poll-section')).toBeVisible();
  console.log('Teacher started a Yes/No poll.');

  // --- שלב 3: התלמידים עונים במקביל ---

  await Promise.all(studentPages.map(page =>
    expect(page.locator('#classroom-poll-container')).toBeVisible()
  ));

  await studentPages[0].locator('#classroom-poll-content-area button', { hasText: 'Yes' }).click();
  await studentPages[1].locator('#classroom-poll-content-area button', { hasText: 'No' }).click();
  console.log('Both students have answered the poll.');

  // --- שלב 4: וידוא התוצאות אצל המורה ---

  const resultsContainer = teacherPage.locator('#poll-results-container');

  // === THIS IS THE FIX: Using more specific locators ===
  // Find the specific container div for the "Yes" result row
  const yesResultRow = resultsContainer.locator('div:has(> div > strong:has-text("Yes"))');

  // Find the specific container div for the "No" result row
  const noResultRow = resultsContainer.locator('div:has(> div > strong:has-text("No"))');

  // Now, assert the text content within those specific, unique rows
  await expect(yesResultRow).toContainText('1 votes (50.0%)', { timeout: 10000 });
  await expect(noResultRow).toContainText('1 votes (50.0%)');
  // ========================================================

  console.log('Success: Teacher sees the correct aggregated poll results.');

  // --- שלב 5: סיום הסקר ---

  await teacherPage.locator('#stop-poll-btn').click();
  await expect(studentPages[0].locator('#classroom-poll-container')).not.toBeVisible();
  console.log('Success: Poll ended and student UI was cleared.');
});