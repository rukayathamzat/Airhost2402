# Product Requirements Document (PRD)

## Project: Airhost2402 – AI Chat Enhancement

### Overview
This project aims to enhance the Airhost2402 chat application with advanced AI-driven features, including integrated AI-suggested responses, emergency detection, and an auto-pilot mode for automated guest communication. The implementation will ensure a seamless, responsive user experience and maintain flexibility for future improvements.

---

## 1. Objectives

- **Integrate AI-suggested answers directly into the chat window.**
- **Implement AI-based emergency detection and unknown response flagging.**
- **Develop an auto-pilot mode for automated guest responses, configurable per conversation and property.**
- **Ensure the app remains responsive and user-friendly.**
- **Refactor authentication to use Supabase if beneficial.**
- **Maintain a clean development workflow with feature branches and code reviews.**

---

## 2. Features & Requirements

### 2.1. AI-Suggested Answers Integration

**Goal:**  
Display a single AI-generated suggested answer directly within the chat window, styled as per the provided design.

**Requirements:**
- A single, editable AI suggestion should appear in the chat interface when a new message is received from the guest.
- The suggestion should appear as a conversation bubble within the chat window (not as a separate pop-up).
- The suggestion box should only appear when a new message is received, allowing hosts to quickly respond.
- The suggestion should be editable by the host before sending.
- The suggestion should be easily sendable with a single click.
- The UI/UX should match the provided reference images.
- The suggestion should be contextually relevant to the guest's message.
- One AI suggestion is sufficient; hosts can manually edit if needed.

---

### 2.2. Emergency & Unknown Response Detection

**Goal:**  
Automatically analyze guest messages to detect emergencies or unknown queries using AI analysis.

**Requirements:**
- Use GPT-4 or similar AI model to analyze the entire conversation for each guest.
- Emergency detection should be based on AI analysis, not keyword matching.
- Emergency cases must be configurable by the host through a dedicated emergency cases tab in the settings:
  - Hosts should be able to define custom emergency scenarios (e.g., missing laundry, blocked door)
  - Each emergency case should be configurable per apartment
  - Emergency cases should be testable through a testing interface
  - Emergency cases should be manageable (add, edit, delete) by hosts
- When an emergency is detected:
  - Auto-pilot mode is automatically deactivated for that conversation
  - The host receives a push notification and an email alert
  - The emergency case is clearly marked in the chat interface
- Emergency detection should be testable through a dedicated testing interface
- If the AI cannot answer a question, flag it as "unknown" and notify the host using the existing notification service
- Emergency and unknown detection logic should be extensible for future scenarios

---

### 2.3. Auto-Pilot Mode

**Goal:**  
Allow the AI to automatically respond to guests when enabled.

**Requirements:**
- Add a clearly visible "Auto-Pilot" button/toggle next to each guest's name in the chat window header
- The auto-pilot button should be prominently displayed and easily accessible
- When enabled, AI answers are sent directly to the guest
- When disabled, AI answers are shown as suggestions only
- Auto-pilot can be toggled per conversation and at the property level
- UI should clearly indicate the current auto-pilot status with visual feedback
- Ensure manual override is always possible for the host
- The auto-pilot status should be clearly visible in the chat interface

---

### 2.4. Responsiveness & UX

**Goal:**  
Maintain a responsive, mobile-friendly interface after all enhancements.

**Requirements:**
- All new features must be fully responsive.
- Test on various devices and screen sizes.
- Follow best practices for accessibility and usability.

---

### 2.5. Authentication & Database

**Goal:**  
Evaluate and potentially migrate authentication to Supabase for consistency.

**Requirements:**
- Assess current Firebase authentication usage.
- If feasible, migrate to Supabase Auth for unified backend management.
- Optionally, set up a separate test database/environment for development.

---

### 2.6. Development Workflow

**Goal:**  
Maintain a clean, collaborative development process.

**Requirements:**
- Use the `recette` branch as the production branch.
- Create a new feature branch (e.g., `feature/ai-chat-enhancements`) for development.
- Submit changes via pull requests for review and merging.
- Write clear commit messages and document major changes.

---

## 3. Implementation Plan

### 3.1. Branching & Setup

- Create a new branch from `recette` for development.
- Set up a test environment/database if needed.

### 3.2. Feature Development

1. **Integrate AI Suggestions:**
   - Refactor chat UI to embed suggestions.
   - Style suggestions per design.
   - Connect to AI backend for real-time suggestions.

2. **Emergency & Unknown Detection:**
   - Implement GPT-based analysis for each conversation.
   - Build configuration UI for emergency scenarios.
   - Set up notification (push/email) system for emergencies.

3. **Auto-Pilot Mode:**
   - Add toggle controls in UI (per conversation/property).
   - Implement logic to send AI answers automatically when enabled.
   - Ensure proper fallback and manual override.

4. **Responsiveness:**
   - Test and adjust layouts for all new features.
   - Ensure mobile and desktop compatibility.

5. **Authentication Refactor (if needed):**
   - Evaluate and migrate to Supabase Auth.
   - Update frontend and backend logic accordingly.

### 3.3. Testing

- Unit and integration tests for new features.
- Manual testing on multiple devices.
- User acceptance testing with host feedback.

### 3.4. Documentation

- Update README and in-app help as needed.
- Document emergency configuration and auto-pilot usage.

### 3.5. Deployment

- Merge feature branch into `recette` after review.
- Monitor for issues post-deployment.

---

## 4. Success Criteria

- AI suggestions are visible and usable in the chat window.
- Emergency and unknown cases are reliably detected and notified.
- Auto-pilot mode works as intended, with clear UI controls.
- The app remains fully responsive and user-friendly.
- Authentication is consistent and secure.
- All code changes are reviewed and merged cleanly.

---

## 5. Open Questions

- What are the specific emergency scenarios that should be pre-configured by default?
- Should the emergency configuration UI be accessible to all hosts or only admins?
- What email service should be used for notifications?
- What is the preferred design for the auto-pilot button placement and appearance?
- What testing interface should be provided for emergency detection?
- How should we handle the transition between multiple suggestions and a single editable suggestion?

---

**Next Steps:**  
- Review and approve this PRD.
- Begin implementation by creating the feature branch and setting up the development environment. 