# SimpleSolve AI

> **Tagline:** Simple Questions. Smart Solutions.

A modern, beginner-friendly AI problem-solving chatbot website built with **HTML5, CSS3, and Vanilla JavaScript**. Designed as a college mini-project for B.Tech AIML / CSE students.

---

## 🌟 Key Highlights

- **ChatGPT-Inspired Dark Navy & Blue UI:** Clean interface with rounded message bubbles, glowing online status indicator, and mobile-friendly responsive sidebar.
- **Safe Math Engine (Zero `eval()`):** Custom recursive descent arithmetic parser supporting standard BODMAS precedence, parentheses, powers, percentages, square roots, factorials, and geometry formulas.
- **Intelligent Rule-Based Knowledge Base:** Instant answers for Programming (HTML, CSS, JavaScript, C++), Artificial Intelligence concepts (ML, Deep Learning, Overfitting, Neural Networks, NLP), and Student Productivity (Pomodoro, Exam strategy).
- **LocalStorage Multi-Chat Persistence:** Automatically saves conversation history, allows switching between past chats, and deleting individual or all sessions.
- **API-Ready Architecture:** Clean asynchronous function in `script.js` ready for future OpenAI or Google Gemini API integration.
- **Zero Frameworks & Zero Dependencies:** 100% pure vanilla web technologies.

---

## 📁 Project Structure

```text
SimpleSolve-AI/
├── index.html       # Semantic HTML layout, sidebar, welcome screen & modals
├── style.css        # Dark navy & blue theme, animations, responsive CSS
├── script.js        # Safe math parser, knowledge engine, LocalStorage & UI handlers
└── README.md        # Complete documentation & project viva guide
```

---

## 🚀 Step-by-Step VS Code Setup Instructions

### Method 1: Using VS Code Live Server (Recommended)
1. Open **Visual Studio Code**.
2. Go to **File** $\rightarrow$ **Open Folder...** and select the `SimpleSolve-AI` folder (or `joys project`).
3. If not already installed, install the **Live Server** extension by *Ritwick Dey*:
   - Press `Ctrl + Shift + X` (Extensions).
   - Search for **Live Server** and click **Install**.
4. In the VS Code file explorer, right-click on `index.html` and choose **"Open with Live Server"**.
5. Your default browser will automatically open:
   `http://127.0.0.1:5500/index.html` (or similar port).

### Method 2: Direct Browser Launch (No Extensions Needed)
1. Navigate to the `SimpleSolve-AI` folder in Windows File Explorer.
2. Double-click on `index.html`.
3. It will open instantly in Chrome, Edge, Brave, or Firefox.

---

## ⚙️ Explanation of Important Functions (`script.js`)

### 1. `SafeMathSolver.evaluate(expression)`
- **Purpose:** Solves arithmetic expressions like `(45 * 12) + (180 / 6) - 25` safely without using `eval()` or `new Function()`.
- **How it works:**
  1. Sanitizes the input to ensure only numbers, whitespace, and arithmetic characters `+ - * / % ^ ( )` exist.
  2. Breaks input into structured tokens (`NUMBER`, `OPERATOR`).
  3. Uses **Recursive Descent Parsing** based on standard operator precedence (Parentheses $\rightarrow$ Exponents $\rightarrow$ Multiplication/Division $\rightarrow$ Addition/Subtraction).
  4. Collects and returns each intermediate step for step-by-step student learning.

### 2. `SafeMathSolver.solveSpecialMath(text)`
- **Purpose:** Recognizes natural language math questions such as:
  - Percentages: `"What is 18% of 2500?"`
  - Square Roots: `"sqrt(625)"` or `"square root of 144"`
  - Factorials: `"5!"` or `"factorial of 6"`
  - Geometry: `"Area of circle with radius 7"`, `"Pythagoras with 3 and 4"`
- **How it works:** Uses regular expressions to extract parameters, applies geometric/algebraic formulas, and generates step-by-step breakdown.

### 3. `generateBotResponse(userInputText)`
- **Purpose:** Master controller that processes user queries and decides how to answer.
- **Workflow:**
  1. Checks if external API mode is enabled (`CONFIG.USE_EXTERNAL_API`).
  2. Passes query to `SafeMathSolver` for special math or direct arithmetic.
  3. Checks `KNOWLEDGE_BASE` for keyword matches across Programming, AIML, and Study topics.
  4. If no exact match is found, provides a structured **fallback response** with suggested topics.

### 4. `formatMarkdown(text)`
- **Purpose:** Formats bot responses dynamically into clean HTML.
- **Features:** Renders code blocks with syntax highlighting headers, one-click "Copy Code" button, bold/italics, bullet lists, blockquotes, and Markdown tables.

### 5. `saveStorageData()` & `loadStorageData()`
- **Purpose:** Manages persistent chat sessions using the browser's `localStorage` API.
- **Data Model:**
  ```javascript
  {
    id: "chat_1710000000_abcde",
    title: "Calculate (45 * 12)...",
    timestamp: "2026-11-13T22:00:00.000Z",
    messages: [
      { sender: "user", text: "...", timestamp: "..." },
      { sender: "bot", text: "...", timestamp: "..." }
    ]
  }
  ```

---

## 🧪 Testing Instructions

Test these queries to verify all features:

| Category | Input Query | Expected Behavior |
| :--- | :--- | :--- |
| **Arithmetic** | `Calculate (45 * 12) + (180 / 6) - 25` | Shows BODMAS order of operations & result `545` |
| **Percentage** | `What is 18% of 2500?` | Shows formula `(18/100) * 2500` & result `450` |
| **Square Root** | `sqrt(625)` | Shows formula `√625` & result `25` |
| **Factorial** | `5!` or `factorial of 5` | Shows expansion `5 × 4 × 3 × 2 × 1 = 120` |
| **Geometry** | `Area of circle with radius 7` | Shows `π × r²` & result `153.9380` |
| **AI Concept** | `What is the difference between ML and Deep Learning?` | Displays structured comparison table |
| **AIML Concept** | `Explain overfitting and how to prevent it` | Explains bias-variance tradeoff & prevention |
| **Web Dev** | `Explain CSS Flexbox vs Grid with an example` | Shows 1D vs 2D explanation + copyable CSS code |
| **C++ OOP** | `Explain OOP concepts in C++ with examples` | Details 4 pillars + C++ code block |
| **Study Skills** | `What is the Pomodoro technique?` | Details 25/5-minute study intervals |
| **New Chat** | Click `+ New Chat` in sidebar | Clears message area & starts fresh session |
| **Clear History** | Click `Clear All History` | Prompts confirmation and resets LocalStorage |
| **Responsive** | Resize browser below 768px | Hamburger menu opens slide-out drawer smoothly |

---

## 🎓 College Viva / Project Presentation Q&A

**Q1: Why did you not use `eval()` for math evaluation?**  
*Answer:* In JavaScript, `eval()` executes arbitrary code with the privileges of the caller. Passing user input to `eval()` is a critical security vulnerability (Cross-Site Scripting / XSS). SimpleSolve AI implements a custom **Recursive Descent Parser / Tokenizer** that only parses mathematical operators (`+`, `-`, `*`, `/`, `%`, `^`) safely.

**Q2: How does the rule-based engine work?**  
*Answer:* The engine tokenizes user input and performs weighted keyword matching against an offline domain knowledge base. For calculations, it uses regular expression extraction and grammar parsing.

**Q3: How can this project be upgraded to use real generative AI?**  
*Answer:* In `script.js`, set `CONFIG.USE_EXTERNAL_API = true` and provide your API Key (e.g., Google Gemini API or OpenAI API). The `fetchFromExternalAI()` asynchronous function handles the REST request and feeds streaming or JSON responses directly into the message renderer.
