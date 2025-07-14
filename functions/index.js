/*
 * Copyright © 2025 Meir Livneh. All Rights Reserved.
 *
 * This software and associated documentation files (the "Software") are proprietary and confidential.
 * The Software is furnished under a license agreement and may be used or copied only in
 * accordance with the terms of the agreement.
 *
 * Unauthorized copying of this file, via any medium, is strictly prohibited.
 */
// functions/index.js - askAI כפונקציה מרכזית שקוראת להגדרות החדר

const {onCall} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {HttpsError} = require("firebase-functions/v2/https");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const https = require("https");



// Initialize Firebase Admin SDK
if (admin.apps.length === 0) {
  admin.initializeApp();
}
//
//========================= DEPLOYMENT AREA ===================================
const DEPLOY_REGION = "us-central1";
//const DEPLOY_REGION = "europe-west1";
//=============================================================================
//
// Define secrets
const geminiApiKey = defineSecret("GEMINI_API_KEY");
const claudeApiKey = defineSecret("CLAUDE_API_KEY");
const openaiApiKey = defineSecret("OPENAI_API_KEY");

/**
 * פונקציה מרכזית לכל קריאות AI - קוראת להגדרות החדר ומחליטה איזה מודל להפעיל
 */
exports.askAI = onCall({
  region: DEPLOY_REGION,
  secrets: [geminiApiKey, claudeApiKey, openaiApiKey]
}, async (request) => {
  console.log("🎯 askAI called with:", request.data);
  
  if (!request.auth) {
    console.error("❌ No authentication provided");
    throw new HttpsError("unauthenticated", "Authentication required");
  }

  let prompt = request.data.prompt;
  const roomCode = request.data.roomCode;
  const language = request.data.language;
  
  if (!prompt || !roomCode) {
    console.error("❌ No prompt or roomCode provided");
    throw new HttpsError("invalid-argument", "Prompt and roomCode are required");
  }

  // 🎯 עטיפת הפרומפט לפי שפה
  if (language === 'he') {
    prompt = `Please answer the following prompt in Hebrew:\n\n"${prompt}"`;
  } else {
    prompt = `Please answer the following prompt in English:\n\n"${prompt}"`;
  }

  try {
    const roomRef = admin.firestore().collection('rooms').doc(roomCode);
    const roomDoc = await roomRef.get();
    
    if (!roomDoc.exists) {
      console.error("❌ Room not found:", roomCode);
      throw new HttpsError("not-found", "Room not found");
    }
    
    const roomData = roomDoc.data();
    
    // 🎯 --- תחילת הלוגיקה החדשה ---
    const teacherUid = roomData.teacher_uid;
    const isTeacherRequest = request.auth.uid === teacherUid;
    const aiActive = roomData.settings?.ai_active === true;
    
    console.log(`Request Details: isTeacher=${isTeacherRequest}, aiActiveForStudents=${aiActive}`);
    
    // אם הבקשה היא לא מהמורה, וגם ה-AI כבוי לתלמידים - חסום את הבקשה.
    if (!isTeacherRequest && !aiActive) {
      console.log("🔴 AI request blocked for student (AI is off).");
      throw new HttpsError("failed-precondition", "AI is disabled for this classroom");
    }
    // 🎯 --- סוף הלוגיקה החדשה ---
    
    const selectedModel = roomData.settings?.ai_model || 'chatgpt';
    console.log(`🎯 Room ${roomCode} selected model: ${selectedModel}`);
    
    let result;
    switch (selectedModel) {
      case 'chatgpt':
        result = await callChatGPT(prompt);
        break;
      case 'claude':
        result = await callClaude(prompt);
        break;
      case 'gemini':
        result = await callGemini(prompt);
        break;
      default:
        console.log(`⚠️ Unknown model ${selectedModel}, falling back to ChatGPT`);
        result = await callChatGPT(prompt);
        break;
    }
    
    await roomRef.update({ 'last_activity': admin.firestore.FieldValue.serverTimestamp() });
    
    console.log(`✅ AI response generated successfully using ${selectedModel}`);
    return { 
      result: result.text, 
      model: result.modelName 
    };
    
  } catch (error) {
    console.error("❌ Error in askAI:", error);
    if (error instanceof HttpsError) {
      throw error;
    }
    throw new HttpsError("internal", "Internal server error");
  }
});

/**
 * פונקציה לשליחת תשובות סקר - מאפשרת לתלמידים לשלוח תשובות ללא אימות
 */
exports.submitPollAnswer = onCall({
  region: DEPLOY_REGION,
  allow: "all" // מאפשר קריאות ממשתמשים לא מאומתים (תלמידים)
}, async (request) => {
  const { roomCode, studentId, playerName, answer } = request.data;

  if (!roomCode || !studentId || !playerName || answer === undefined) {
    throw new HttpsError("invalid-argument", "Missing required fields.");
  }

  const db = admin.firestore();
  const roomRef = db.collection("rooms").doc(roomCode);

  try {
    await db.runTransaction(async (transaction) => {
      const roomDoc = await transaction.get(roomRef);
      if (!roomDoc.exists) {
        throw new HttpsError("not-found", `Room ${roomCode} does not exist.`);
      }

      const currentPoll = roomDoc.data().settings.currentPoll;
      if (!currentPoll || !currentPoll.isActive) {
        return; // No active poll to answer
      }

      const updateData = {
        'settings.last_poll_activity': admin.firestore.FieldValue.serverTimestamp()
      };

      if (currentPoll.type === 'open_text') {
        const studentIdentifier = playerName.replace(/[.#$[\]]/g, '_');
        const responseField = `settings.currentPoll.responses.${studentIdentifier}`;
        updateData[responseField] = admin.firestore.FieldValue.arrayUnion(answer);
      } else {
        const responseField = `settings.currentPoll.responses.${studentId}`;
        updateData[responseField] = answer;
      }

      transaction.update(roomRef, updateData);
    });

    return { success: true };

  } catch (error) {
    console.error(`Error in submitPollAnswer for room ${roomCode}:`, error);
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Failed to submit answer.");
  }
});

/**
 * פונקציית עזר לקריאה ל-ChatGPT
 */
async function callChatGPT(prompt) {
  const apiKey = openaiApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "OpenAI API key not configured");
  }

  console.log("🤖 Calling ChatGPT...");

  const requestBody = JSON.stringify({
    model: "gpt-4",
    messages: [{
      role: "user",
      content: prompt
    }],
    max_tokens: 1000
  });

  return new Promise((resolve, reject) => {
    const req = https.request("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      }
    }, (res) => {
      console.log("📨 ChatGPT response status:", res.statusCode);
      
      let responseBody = "";
      res.on("data", (chunk) => responseBody += chunk);
      res.on("end", () => {
        try {
          const response = JSON.parse(responseBody);
          if (response.error) {
            console.error("❌ ChatGPT API error:", response.error);
            reject(new HttpsError("internal", `ChatGPT error: ${response.error.message}`));
            return;
          }
          
          const text = response.choices?.[0]?.message?.content;
          if (!text) {
            console.error("❌ Invalid ChatGPT response format:", response);
            reject(new HttpsError("internal", "Invalid ChatGPT response format"));
            return;
          }
          
          console.log("✅ ChatGPT response success, length:", text.length);
          resolve({ text, modelName: "ChatGPT" });
        } catch (e) {
          console.error("❌ Failed to parse ChatGPT response:", e);
          reject(new HttpsError("internal", "Failed to parse ChatGPT response"));
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ ChatGPT request error:", error);
      reject(new HttpsError("internal", "Failed to connect to ChatGPT"));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * פונקציית עזר לקריאה ל-Claude
 */
async function callClaude(prompt) {
  const apiKey = claudeApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Claude API key not configured");
  }

  console.log("🤖 Calling Claude...");

  const requestBody = JSON.stringify({
    model: "claude-3-sonnet-20240229",
    max_tokens: 1000,
    messages: [{
      role: "user",
      content: prompt
    }]
  });

  return new Promise((resolve, reject) => {
    const req = https.request("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01"
      }
    }, (res) => {
      console.log("📨 Claude response status:", res.statusCode);
      
      let responseBody = "";
      res.on("data", (chunk) => responseBody += chunk);
      res.on("end", () => {
        try {
          const response = JSON.parse(responseBody);
          if (response.error) {
            console.error("❌ Claude API error:", response.error);
            reject(new HttpsError("internal", `Claude error: ${response.error.message}`));
            return;
          }
          
          const text = response.content?.[0]?.text;
          if (!text) {
            console.error("❌ Invalid Claude response format:", response);
            reject(new HttpsError("internal", "Invalid Claude response format"));
            return;
          }
          
          console.log("✅ Claude response success, length:", text.length);
          resolve({ text, modelName: "Claude" });
        } catch (e) {
          console.error("❌ Failed to parse Claude response:", e);
          reject(new HttpsError("internal", "Failed to parse Claude response"));
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ Claude request error:", error);
      reject(new HttpsError("internal", "Failed to connect to Claude"));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * פונקציית עזר לקריאה ל-Gemini
 */
async function callGemini(prompt) {
  const apiKey = geminiApiKey.value();
  if (!apiKey) {
    throw new HttpsError("failed-precondition", "Gemini API key not configured");
  }

  console.log("🤖 Calling Gemini using v1beta endpoint...");

  const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${apiKey}`;
  
  const requestBody = JSON.stringify({
    contents: [{parts: [{text: prompt}]}],
  });

  return new Promise((resolve, reject) => {
    const req = https.request(geminiUrl, {
      method: "POST",
      headers: {"Content-Type": "application/json"}
    }, (res) => {
      console.log("📨 Gemini response status:", res.statusCode);
      
      let responseBody = "";
      res.on("data", (chunk) => responseBody += chunk);
      res.on("end", () => {
        try {
          const response = JSON.parse(responseBody);
          if (response.error) {
            console.error("❌ Gemini API error:", response.error);
            reject(new HttpsError("internal", `Gemini error: ${response.error.message}`));
            return;
          }
          
          const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) {
            console.error("❌ Invalid Gemini response format:", response);
            reject(new HttpsError("internal", "Invalid Gemini response format"));
            return;
          }
          
          console.log("✅ Gemini response success, length:", text.length);
          resolve({ text, modelName: "Gemini" });
        } catch (e) {
          console.error("❌ Failed to parse Gemini response:", e);
          reject(new HttpsError("internal", "Failed to parse Gemini response"));
        }
      });
    });

    req.on("error", (error) => {
      console.error("❌ Gemini request error:", error);
      reject(new HttpsError("internal", "Failed to connect to Gemini"));
    });

    req.write(requestBody);
    req.end();
  });
}

/**
 * הפונקציות הישנות - עדיין נשארות לתאימות לאחור (אם צריך לבדיקות)
 * אבל הClient לא אמור לקרוא להן ישירות יותר
 */
exports.askGemini = onCall({
  region: DEPLOY_REGION,
  secrets: [geminiApiKey]
}, async (request) => {
  console.log("🔍 askGemini called directly (deprecated, use askAI instead)");
  const prompt = request.data.prompt;
  if (!prompt) {
    throw new HttpsError("invalid-argument", "Prompt is required");
  }
  const result = await callGemini(prompt);
  return { result: result.text, model: result.modelName };
});

exports.askClaude = onCall({
  region: DEPLOY_REGION,
  secrets: [claudeApiKey]
}, async (request) => {
  console.log("🔍 askClaude called directly (deprecated, use askAI instead)");
  const prompt = request.data.prompt;
  if (!prompt) {
    throw new HttpsError("invalid-argument", "Prompt is required");
  }
  const result = await callClaude(prompt);
  return { result: result.text, model: result.modelName };
});

exports.askChatGPT = onCall({
  region: DEPLOY_REGION,
  secrets: [openaiApiKey]
}, async (request) => {
  console.log("🔍 askChatGPT called directly (deprecated, use askAI instead)");
  const prompt = request.data.prompt;
  if (!prompt) {
    throw new HttpsError("invalid-argument", "Prompt is required");
  }
  const result = await callChatGPT(prompt);
  return { result: result.text, model: result.modelName };
});

/**
 * Scheduled function to clean up old classrooms.
 * Runs every day at 2:00 AM Israel time.
 */
exports.cleanupOldClassrooms = onSchedule({
  schedule: "0 2 * * *",
  timeZone: "Asia/Jerusalem",
  region: DEPLOY_REGION
}, async (event) => {
  console.log("🧹 Starting cleanup of old classrooms...");
  
  const db = admin.firestore();

  const oneWeekAgo = new Date();
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

  console.log("🔍 Looking for rooms older than:", oneWeekAgo);

  const query = db.collection("rooms")
      .where("last_activity", "<", oneWeekAgo);

  const oldRoomsSnapshot = await query.get();
  let deletedCount = 0;

  if (oldRoomsSnapshot.empty) {
    console.log("✅ No old rooms to delete.");
    return {deletedCount: 0};
  }

  const deletePromises = [];
  oldRoomsSnapshot.forEach((doc) => {
    console.log(`🗑️ Scheduling deletion for room: ${doc.id}`);
    deletePromises.push(doc.ref.delete());
    deletedCount++;
  });

  await Promise.all(deletePromises);
  console.log(`✅ Cleanup completed. Deleted ${deletedCount} old rooms.`);
  return {deletedCount};
});