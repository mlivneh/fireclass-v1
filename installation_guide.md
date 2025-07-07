<div dir="rtl">
# מדריך התקנה מלא: מערכת כיתה אינטראקטיבית (גרסה 5.0)

מסמך זה מתאר את כל השלבים הנדרשים להתקנת הפרויקט מ-א' ועד ת' על סביבת Firebase חדשה ונקייה.

## שלב 0: דרישות מוקדמות

ודא שהכלים הבאים מותקנים על המחשב שלך:
* **Node.js**: כולל את מנהל החבילות `npm`.
* **Firebase CLI**: אם לא מותקן, הרץ בטרמינל: `npm install -g firebase-tools`.
* **חשבונות**: חשבון Google וחשבונות עבור ממשקי ה-API החיצוניים (OpenAI, Anthropic).

## שלב 1: יצירת פרויקט Firebase

1.  היכנס ל[מסוף Firebase](https://console.firebase.google.com/) וצור פרויקט חדש.
2.  במהלך ההקמה, תתבקש לבחור **Default GCP resource location**. בחר **`europe-west1 (Belgium)`**. זהו צעד קריטי לאיחוד כל השירותים.

## שלב 2: הפעלת שירותי ענן

בתוך הפרויקט החדש שיצרת:
* **Firestore Database**: צור מסד נתונים חדש ובחר את המיקום: **`europe-west1 (Belgium)`**.
* **Authentication**: הפעל את שיטת ההתחברות **Anonymous**.
* **Secret Manager API**: ודא שה-API מופעל ב-Google Cloud Console עבור הפרויקט שלך.

## שלב 3: יצירת מפתחות API חיצוניים

1.  צור מפתחות API עבור **Gemini, Claude ו-ChatGPT** דרך הפלטפורמות הרשמיות שלהם.
2.  שמור את שלושת המפתחות במקום בטוח וזמין.

## שלב 4: הגדרת הפרויקט המקומי

1.  צור תיקייה חדשה, העתק אליה את קבצי המקור, והרץ בה `git init`.
2.  הרץ `firebase init`, בחר **Use an existing project**, וקשר אותו לפרויקט האירופאי החדש.
3.  בהגדרות, בחר את השירותים: **Firestore**, **Functions**, ו-**Hosting**.
4.  ענה על שאלות האתחול, אך **אל תדרוס** קבצים קיימים כמו `index.html`.
5.  התקן את תלויות ה-Functions באמצעות ניווט לתיקיית `functions` (`cd functions`) והרצת `npm install`.

## שלב 5: תצורת קבצים מקומית

1.  **`firebase-config.js`**: בפרויקט ב-Firebase, גש להגדרות (`Project settings`), הוסף Web App, והעתק את אובייקט `firebaseConfig` לקובץ המקומי.
2.  **`firebase.json`**: ודא שהמיקום תחת `firestore` הוא `europe-west1` ושהגדרת `rewrites` תקינה תחת `hosting`.
3.  **`config.json` (שלב חדש וחשוב):**
    * בתיקיית `public`, ודא שקיים קובץ בשם `config.json`.
    * ודא שהמבנה שלו תקין ושהשדה `studentAppUrl` מכיל את הכתובת **הנכונה** לאפליקציית התלמיד **בפרויקט שלך**.
    * **דוגמה:**
        ```json
        {
          "studentAppUrl": "[https://your-project-id.web.app/student-app.html](https://your-project-id.web.app/student-app.html)",
          "games": [
            {
              "name": "Kahoot",
              "description": "חידון אינטראקטיבי",
              "icon": "🎯",
              "url": "[https://kahoot.it](https://kahoot.it)"
            }
          ]
        }
        ```

## שלב 6: הגדרת סודות (API Keys)

בטרמינל (בתיקייה הראשית), הרץ את שלוש הפקודות הבאות, והזן את המפתחות המתאימים:
* `firebase functions:secrets:set GEMINI_API_KEY`
* `firebase functions:secrets:set CLAUDE_API_KEY`
* `firebase functions:secrets:set OPENAI_API_KEY`

## שלב 7: פריסה ראשונית

כדי לפרוס את כל המערכת ולקשר את הפונקציות לסודות, הרץ:
```bash
firebase deploy
</div>