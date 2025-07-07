# QA Strategy - fireClass Control

## Introduction: The Testing Philosophy

The goal of testing in the fireClass system extends beyond finding bugs; it is to ensure a **stable, reliable, and fluid pedagogical experience**. Because the system operates in real-time and involves multiple users, our strategy is based on automated End-to-End (E2E) tests that simulate real and complex classroom scenarios.

## Current Automated Test Coverage

As of now, the automated testing suite (based on Playwright) includes three core scenarios that cover the system's main functionalities:

### 1. Basic Flow (`fireclass.spec.js`)

* **Description:** A teacher creates a room, a single student joins, and the teacher sends a chat message.
* **Purpose:** To verify the most fundamental functionality: room creation, student login, and basic real-time communication. This serves as the system's "Sanity Check."

### 2. Advanced Features (`advanced_features.spec.js`)

* **Description:** A sequential scenario that tests launching an external application, running an open-ended poll, submitting and verifying an answer, and finally, testing the full enable/disable cycle of the AI.
* **Purpose:** To validate the integration of complex, state-changing features and ensure that transitioning between them is seamless and does not break the system.

### 3. Multi-Student Interaction (`multi_student.spec.js`)

* **Description:** A teacher and two students join a room. The teacher launches a yes/no poll, and both students answer simultaneously.
* **Purpose:** This is the most critical test. Its goal is to detect "race conditions," verify that data aggregation from multiple sources works correctly, and ensure the system is stable under a more realistic load.

## Regression Testing: Our Safety Net

### What is it?

Regression testing is the process of re-running existing tests after every code change. The goal is to ensure that the new change (e.g., a bug fix or a new feature) has not accidentally broken existing features that previously worked.

### How do we do it?

The process is now very simple. After any significant code change, you just need to run one command in the terminal:

```bash
npx playwright test
```

* If **all 3 tests pass**, you can have high confidence that your change did not create new problems.
* If **a test fails**, you know immediately which functionality was broken and can fix it *before* deploying the version to production.

## Future QA Roadmap

The foundation we've built is excellent. To achieve full coverage, these are the recommended next steps:

### Phase 1: Expanding Core Coverage (High Priority)

* **Test All Poll Types**: Add a test for `multiple_choice` polls.
* **Test Private Messaging**: A scenario where a teacher sends a private message to Student A, and we verify that Student B does **not** receive it.
* **Test Error Handling**: A scenario where a student attempts to join with an invalid room code and we verify that the correct error message is displayed.

### Phase 2: Testing Teacher Actions (Medium Priority)

* Test the **"Clear Screens"** button.
* Test the **end-of-lesson workflow** and the generation of a summary report.
* Test a scenario where a **student disconnects and reconnects** in the middle of an activity.

### Phase 3: Full Automation (CI/CD)

* **The Ultimate Goal**: Integrate the tests with a system like **GitHub Actions**. This would cause the entire test suite to run automatically in the cloud every time you push new code, providing an email report if anything breaks. This is the highest professional standard for quality assurance.

## Overall QA Strategy

In addition to the automated E2E tests, a complete strategy includes:

* **Manual Testing**: There will always be a need for human testing of the user experience (UI/UX), visual appeal, and for "exploratory testing" where one tries to "break" the system in unexpected ways.
* **Performance Testing (Future)**: If the system grows, tests with a large number of simulated users (e.g., 50+) can be run to check server load and response times.