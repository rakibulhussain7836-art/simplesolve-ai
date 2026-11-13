/**
 * ============================================================================
 * SimpleSolve AI - Core Client Script
 * Tagline: Simple Questions. Smart Solutions.
 * ============================================================================
 * Features:
 *  1. Multi-session Chat History with LocalStorage persistence
 *  2. Safe Mathematical Evaluator (Zero eval() / Zero Function() execution)
 *  3. Step-by-Step Problem Solving & Calculations
 *  4. Rule-based Knowledge Base for Programming (HTML, CSS, JS, C++),
 *     Artificial Intelligence (AIML), Study Skills & Everyday Problems
 *  5. Markdown & Code Block Formatter with One-Click Copy
 *  6. Responsive UI Handlers (Mobile drawer, typing indicators, auto-scroll)
 *  7. Future External AI API Integration stub (OpenAI / Gemini ready)
 * ============================================================================
 */

// Strict mode for clean, bug-free execution
'use strict';

/* ============================================================================
   1. GLOBAL CONFIGURATION & STATE
   ============================================================================ */
const CONFIG = {
  appName: 'SimpleSolve AI',
  version: '1.0.0',
  storageKey: 'simplesolve_chats_v1',
  activeChatKey: 'simplesolve_active_id_v1',
  typingDelayMs: 450, // Realistic human-like response delay in milliseconds
  // Flag for future AI API integration
  USE_EXTERNAL_API: false,
  EXTERNAL_API_KEY: '', // Enter OpenAI or Gemini API Key here when upgrading
};

// Global App State
let appState = {
  chats: [],           // Array of chat sessions: { id, title, timestamp, messages: [] }
  activeChatId: null,  // ID of current open chat session
  isTyping: false      // Prevent duplicate submissions during bot thinking
};

/* ============================================================================
   2. DOM ELEMENT SELECTORS
   ============================================================================ */
const DOM = {
  // Sidebar elements
  sidebar: document.getElementById('sidebar'),
  sidebarOverlay: document.getElementById('sidebarOverlay'),
  openSidebarBtn: document.getElementById('openSidebarBtn'),
  closeSidebarBtn: document.getElementById('closeSidebarBtn'),
  newChatBtn: document.getElementById('newChatBtn'),
  historyList: document.getElementById('historyList'),
  historyCount: document.getElementById('historyCount'),
  clearAllHistoryBtn: document.getElementById('clearAllHistoryBtn'),

  // Header & Viewport
  chatViewport: document.getElementById('chatViewport'),
  welcomeScreen: document.getElementById('welcomeScreen'),
  messagesContainer: document.getElementById('messagesContainer'),
  typingIndicator: document.getElementById('typingIndicator'),
  clearChatBtn: document.getElementById('clearChatBtn'),
  aboutBtn: document.getElementById('aboutBtn'),

  // Input & Form
  chatForm: document.getElementById('chatForm'),
  userInput: document.getElementById('userInput'),
  sendBtn: document.getElementById('sendBtn'),
  quickChips: document.getElementById('quickChips'),

  // Modals & Toast
  aboutModal: document.getElementById('aboutModal'),
  closeAboutModalBtn: document.getElementById('closeAboutModalBtn'),
  confirmAboutBtn: document.getElementById('confirmAboutBtn'),
  toastContainer: document.getElementById('toastContainer')
};

/* ============================================================================
   3. SAFE MATH PARSER & STEP-BY-STEP SOLVER (NO EVAL)
   ============================================================================
   * Implements a safe Recursive Descent Parser for standard BODMAS expressions:
   *   Grammar:
   *     Expression := Term ( ('+' | '-') Term )*
   *     Term       := Power ( ('*' | '/' | '%') Power )*
   *     Power      := Factor ( '^' Factor )*
   *     Factor     := ('+' | '-')? Primary
   *     Primary    := Number | '(' Expression ')'
   *
   * Plus support for:
   *   - Percentages ("18% of 2500")
   *   - Square roots ("sqrt(144)", "square root of 625")
   *   - Factorials ("5!", "factorial of 6")
   *   - Squares and Cubes ("square of 15", "cube of 4")
   *   - Geometric formulas (Circle, Triangle, Rectangle, Pythagoras)
   ============================================================================ */

const SafeMathSolver = {
  /**
   * Evaluates an arithmetic expression safely using recursive descent parsing.
   * Under NO condition does it use eval() or new Function().
   * Returns: { result: number, steps: string[] } or throws an error.
   */
  evaluate(rawExpr) {
    // 1. Sanitize expression: allow only numbers, whitespace, and valid math operators
    let cleanExpr = rawExpr
      .replace(/x/gi, '*')
      .replace(/÷/g, '/')
      .replace(/–|—/g, '-') // replace unicode dashes
      .trim();

    // Check for illegal characters (letters, dangerous symbols)
    if (!/^[0-9+\-*/().%^\s]+$/.test(cleanExpr)) {
      throw new Error('Expression contains invalid characters. Only numbers and +, -, *, /, %, ^, ( ) are allowed.');
    }

    // 2. Tokenize string into numbers, operators, and parentheses
    const tokens = [];
    let i = 0;
    while (i < cleanExpr.length) {
      const char = cleanExpr[i];

      if (/\s/.test(char)) {
        i++;
        continue;
      }

      if (/[0-9.]/.test(char)) {
        let numStr = '';
        while (i < cleanExpr.length && /[0-9.]/.test(cleanExpr[i])) {
          numStr += cleanExpr[i];
          i++;
        }
        tokens.push({ type: 'NUMBER', value: parseFloat(numStr) });
        continue;
      }

      if ('+-*/%^()'.includes(char)) {
        tokens.push({ type: 'OPERATOR', value: char });
        i++;
        continue;
      }

      throw new Error(`Unexpected character: ${char}`);
    }

    if (tokens.length === 0) {
      throw new Error('Empty expression');
    }

    // 3. Recursive Descent Parser implementation
    let tokenIndex = 0;
    const steps = [];

    function peek() {
      return tokens[tokenIndex];
    }

    function consume(expectedValue) {
      const token = tokens[tokenIndex];
      if (!token) throw new Error('Unexpected end of expression');
      if (expectedValue && token.value !== expectedValue) {
        throw new Error(`Expected '${expectedValue}' but found '${token.value}'`);
      }
      tokenIndex++;
      return token;
    }

    function parsePrimary() {
      const token = peek();
      if (!token) throw new Error('Unexpected end of input');

      if (token.type === 'NUMBER') {
        consume();
        return token.value;
      }

      if (token.type === 'OPERATOR' && token.value === '(') {
        consume('(');
        const subResult = parseExpression();
        consume(')');
        return subResult;
      }

      throw new Error(`Invalid syntax near '${token.value}'`);
    }

    function parseFactor() {
      const token = peek();
      if (token && token.type === 'OPERATOR' && (token.value === '+' || token.value === '-')) {
        const sign = consume().value;
        const value = parsePrimary();
        return sign === '-' ? -value : value;
      }
      return parsePrimary();
    }

    function parsePower() {
      let left = parseFactor();
      while (tokenIndex < tokens.length && peek() && peek().value === '^') {
        consume('^');
        const right = parseFactor();
        const res = Math.pow(left, right);
        steps.push(`Exponents: ${left} ^ ${right} = ${res}`);
        left = res;
      }
      return left;
    }

    function parseTerm() {
      let left = parsePower();
      while (tokenIndex < tokens.length && peek() && ['*', '/', '%'].includes(peek().value)) {
        const op = consume().value;
        const right = parsePower();
        if (op === '/' && right === 0) {
          throw new Error('Division by zero is undefined');
        }
        let res;
        if (op === '*') res = left * right;
        else if (op === '/') res = left / right;
        else if (op === '%') res = left % right;

        // Round intermediate floating points to 4 decimal places if needed
        res = Math.round(res * 10000) / 10000;
        steps.push(`Operation: ${left} ${op} ${right} = ${res}`);
        left = res;
      }
      return left;
    }

    function parseExpression() {
      let left = parseTerm();
      while (tokenIndex < tokens.length && peek() && ['+', '-'].includes(peek().value)) {
        const op = consume().value;
        const right = parseTerm();
        let res;
        if (op === '+') res = left + right;
        else if (op === '-') res = left - right;

        res = Math.round(res * 10000) / 10000;
        steps.push(`Operation: ${left} ${op} ${right} = ${res}`);
        left = res;
      }
      return left;
    }

    const finalResult = parseExpression();

    if (tokenIndex < tokens.length) {
      throw new Error(`Extra token '${tokens[tokenIndex].value}' in expression`);
    }

    return {
      expression: cleanExpr,
      result: Math.round(finalResult * 10000) / 10000,
      steps: steps.length > 0 ? steps : [`Direct evaluation = ${finalResult}`]
    };
  },

  /**
   * Detects special mathematical word problems (percentage, square roots, factorials, geometry)
   */
  solveSpecialMath(text) {
    const lower = text.toLowerCase().trim();

    // 1. Percentage: "what is 15% of 850", "20 percent of 500", "15% of 800"
    const percentMatch = lower.match(/(?:what\s+is\s+)?([0-9.]+)\s*(?:%|percent)\s+of\s+([0-9.]+)/i);
    if (percentMatch) {
      const p = parseFloat(percentMatch[1]);
      const total = parseFloat(percentMatch[2]);
      const result = (p / 100) * total;
      return {
        title: `Percentage Calculation: ${p}% of ${total}`,
        formula: `Formula: (Percentage / 100) × Total Value`,
        steps: [
          `Step 1: Convert percentage to fraction: ${p} / 100 = ${p / 100}`,
          `Step 2: Multiply by total value: ${p / 100} × ${total} = ${result}`
        ],
        result: `${p}% of ${total} = **${result}**`
      };
    }

    // 2. Square Root: "sqrt(144)", "square root of 625"
    const sqrtMatch = lower.match(/(?:sqrt\(?\s*([0-9.]+)\s*\)?)|(?:square\s+root\s+of\s+([0-9.]+))/i);
    if (sqrtMatch) {
      const val = parseFloat(sqrtMatch[1] || sqrtMatch[2]);
      if (val < 0) return { error: 'Square root of a negative number is an imaginary number (i).' };
      const res = Math.sqrt(val);
      return {
        title: `Square Root of ${val}`,
        formula: `Formula: √${val}`,
        steps: [
          `Step 1: Identify number = ${val}`,
          `Step 2: Compute principal square root: √${val} = ${res}`
        ],
        result: `√${val} = **${res}**`
      };
    }

    // 3. Factorial: "factorial of 5", "5!"
    const factMatch = lower.match(/(?:factorial\s+of\s+([0-9]+))|(?:([0-9]+)\s*!)/i);
    if (factMatch) {
      const n = parseInt(factMatch[1] || factMatch[2], 10);
      if (n > 100) return { error: 'Number too large for factorial display (exceeds safe limits).' };
      let fact = 1;
      const stepArr = [];
      for (let i = n; i >= 1; i--) {
        fact *= i;
        stepArr.push(i);
      }
      return {
        title: `Factorial of ${n} (${n}!)`,
        formula: `Formula: n! = n × (n - 1) × ... × 1`,
        steps: [
          `Step 1: Expand expression: ${n}! = ${stepArr.join(' × ')}`,
          `Step 2: Multiply step-by-step: Result = ${fact}`
        ],
        result: `${n}! = **${fact}**`
      };
    }

    // 4. Square / Cube of a number
    const squareMatch = lower.match(/(?:square\s+of\s+([0-9.]+))/i);
    if (squareMatch) {
      const n = parseFloat(squareMatch[1]);
      return {
        title: `Square of ${n}`,
        formula: `Formula: n² = n × n`,
        steps: [`Step: ${n} × ${n} = ${n * n}`],
        result: `${n}² = **${n * n}**`
      };
    }

    const cubeMatch = lower.match(/(?:cube\s+of\s+([0-9.]+))/i);
    if (cubeMatch) {
      const n = parseFloat(cubeMatch[1]);
      return {
        title: `Cube of ${n}`,
        formula: `Formula: n³ = n × n × n`,
        steps: [`Step: ${n} × ${n} × ${n} = ${n * n * n}`],
        result: `${n}³ = **${n * n * n}**`
      };
    }

    // 5. Area of Circle: "area of circle with radius 7"
    const circleMatch = lower.match(/area\s+of\s+(?:a\s+)?circle.*?(?:radius|r)\s*(?:=|is)?\s*([0-9.]+)/i);
    if (circleMatch) {
      const r = parseFloat(circleMatch[1]);
      const area = Math.PI * r * r;
      return {
        title: `Area of Circle (Radius = ${r})`,
        formula: `Formula: A = π × r² (using π ≈ 3.14159)`,
        steps: [
          `Step 1: Square the radius: ${r}² = ${r * r}`,
          `Step 2: Multiply by π: 3.14159 × ${r * r} = ${area.toFixed(4)}`
        ],
        result: `Area = **${area.toFixed(4)} sq units**`
      };
    }

    // 6. Area of Triangle: "area of triangle with base 10 and height 5"
    const triangleMatch = lower.match(/area\s+of\s+(?:a\s+)?triangle.*?base\s*(?:=|is)?\s*([0-9.]+).*?height\s*(?:=|is)?\s*([0-9.]+)/i);
    if (triangleMatch) {
      const b = parseFloat(triangleMatch[1]);
      const h = parseFloat(triangleMatch[2]);
      const area = 0.5 * b * h;
      return {
        title: `Area of Triangle (Base = ${b}, Height = ${h})`,
        formula: `Formula: A = (1/2) × Base × Height`,
        steps: [
          `Step 1: Multiply base and height: ${b} × ${h} = ${b * h}`,
          `Step 2: Multiply by 0.5: 0.5 × ${b * h} = ${area}`
        ],
        result: `Area = **${area} sq units**`
      };
    }

    // 7. Area of Rectangle: "area of rectangle with length 10 and width 5"
    const rectMatch = lower.match(/area\s+of\s+(?:a\s+)?rectangle.*?length\s*(?:=|is)?\s*([0-9.]+).*?(?:width|breadth)\s*(?:=|is)?\s*([0-9.]+)/i);
    if (rectMatch) {
      const l = parseFloat(rectMatch[1]);
      const w = parseFloat(rectMatch[2]);
      return {
        title: `Area of Rectangle (Length = ${l}, Width = ${w})`,
        formula: `Formula: A = Length × Width`,
        steps: [`Step: ${l} × ${w} = ${l * w}`],
        result: `Area = **${l * w} sq units**`
      };
    }

    // 8. Pythagoras Theorem: "pythagoras with a = 3 and b = 4", "hypotenuse of 3 and 4"
    const pythagMatch = lower.match(/(?:pythagoras|hypotenuse).*?([0-9.]+).*?(?:and|,).*?([0-9.]+)/i);
    if (pythagMatch) {
      const a = parseFloat(pythagMatch[1]);
      const b = parseFloat(pythagMatch[2]);
      const c = Math.sqrt(a * a + b * b);
      return {
        title: `Pythagoras Theorem: Hypotenuse Calculation (a = ${a}, b = ${b})`,
        formula: `Formula: c = √(a² + b²)`,
        steps: [
          `Step 1: Compute square of side a: ${a}² = ${a * a}`,
          `Step 2: Compute square of side b: ${b}² = ${b * b}`,
          `Step 3: Add squares: ${a * a} + ${b * b} = ${a * a + b * b}`,
          `Step 4: Take square root: √(${a * a + b * b}) = ${c.toFixed(4)}`
        ],
        result: `Hypotenuse c = **${c.toFixed(4)}**`
      };
    }

    return null;
  }
};

/* ============================================================================
   4. KNOWLEDGE BASE (AIML, PROGRAMMING, STUDY & GENERAL)
   ============================================================================ */
const KNOWLEDGE_BASE = [
  // --------------------------------------------------------------------------
  // A. ARTIFICIAL INTELLIGENCE & MACHINE LEARNING (AIML)
  // --------------------------------------------------------------------------
  {
    id: 'ai_definition',
    keywords: ['what is ai', 'artificial intelligence', 'define ai', 'branches of ai', 'types of ai'],
    response: `### 🤖 What is Artificial Intelligence (AI)?

**Artificial Intelligence** refers to the simulation of human intelligence in machines that are programmed to think, learn, and solve problems like humans.

#### 🌟 The 3 Main Stages of AI:
1. **Narrow AI (ANI):** Specialized in one specific task (e.g., Siri, Google Search, Chess engines, ChatGPT). *This is the only type existing today.*
2. **General AI (AGI):** Hypothetical AI with human-level cognitive flexibility across any domain.
3. **Super AI (ASI):** Theoretical AI surpassing human capability in all creative and intellectual fields.

#### 💡 Core Subfields of AI:
- **Machine Learning (ML):** Learning patterns from data.
- **Deep Learning (DL):** Multi-layered neural networks inspired by human brain.
- **Computer Vision (CV):** Understanding images and video.
- **Natural Language Processing (NLP):** Understanding and generating human language.`
  },
  {
    id: 'ml_vs_dl',
    keywords: ['machine learning vs deep learning', 'difference between ml and dl', 'ml vs deep learning', 'deep learning vs machine learning'],
    response: `### 🧠 Machine Learning vs. Deep Learning

Here is a quick comparison for exams and interviews:

| Feature | Machine Learning (ML) | Deep Learning (DL) |
| :--- | :--- | :--- |
| **Data Requirement** | Works well on small to medium datasets | Requires large amounts of data to excel |
| **Feature Engineering** | Manual feature extraction needed | Automatically learns features via hidden layers |
| **Hardware** | Can run on standard CPUs | Requires high-performance GPUs / TPUs |
| **Algorithms** | Linear Regression, Decision Trees, SVM, Random Forest | Multi-layer Perceptron (MLP), CNN, RNN, Transformers |
| **Execution Time** | Minutes to a few hours | Days to weeks for training large models |

> **Key Rule of Thumb:** All Deep Learning is Machine Learning, but not all Machine Learning is Deep Learning.`
  },
  {
    id: 'supervised_learning',
    keywords: ['supervised learning', 'unsupervised learning', 'reinforcement learning', 'types of machine learning', 'types of ml'],
    response: `### 📚 The 3 Types of Machine Learning

Machine Learning models learn patterns in three primary ways:

#### 1. Supervised Learning (Learning with a Teacher)
- **Concept:** The model is trained on labeled data *(Input $X$ $\\rightarrow$ Known Label $Y$)*.
- **Tasks:**
  - **Regression:** Predict continuous numbers (e.g., predicting house prices, stock values).
  - **Classification:** Predict discrete categories (e.g., spam vs not spam, cat vs dog).
- **Popular Algorithms:** Linear Regression, Logistic Regression, Random Forest, SVM.

#### 2. Unsupervised Learning (Finding Hidden Patterns)
- **Concept:** Model is given raw unlabeled data and discovers clusters or patterns on its own.
- **Tasks:** Clustering (Customer segmentation), Dimensionality Reduction (PCA).
- **Popular Algorithms:** K-Means, Hierarchical Clustering, PCA.

#### 3. Reinforcement Learning (Learning by Trial and Reward)
- **Concept:** An agent interacts with an environment, receives rewards for positive actions and penalties for negative ones.
- **Examples:** Self-driving cars, Game AI (AlphaGo, Chess), Robotics.`
  },
  {
    id: 'overfitting',
    keywords: ['overfitting', 'underfitting', 'bias variance tradeoff', 'how to prevent overfitting', 'overfitting in machine learning'],
    response: `### 🎯 Overfitting vs. Underfitting in Machine Learning

#### 1. What is Overfitting?
Overfitting occurs when a model learns the training data **too well**, including its noise and random fluctuations.
- **Symptom:** High training accuracy (e.g., 99%), but poor testing/validation accuracy (e.g., 65%).
- **Characteristics:** **High Variance, Low Bias**.

#### 2. What is Underfitting?
Underfitting occurs when a model is too simple to capture underlying patterns.
- **Symptom:** Low accuracy on both training and test data.
- **Characteristics:** **High Bias, Low Variance**.

#### 🛠️ How to Prevent Overfitting:
1. **Cross-Validation:** Use $K$-fold cross-validation to assess generalizability.
2. **Collect More Data:** Larger diverse datasets reduce sample bias.
3. **Regularization:** Apply L1 (Lasso) or L2 (Ridge) penalty to shrink feature weights.
4. **Dropout (in Neural Networks):** Randomly deactivate neurons during training.
5. **Early Stopping:** Stop training when validation loss begins to rise.`
  },
  {
    id: 'neural_networks',
    keywords: ['neural network', 'how neural networks work', 'ann', 'artificial neural network', 'perceptron'],
    response: `### 🕸️ How Artificial Neural Networks (ANN) Work

An Artificial Neural Network is inspired by biological neurons in the human brain.

#### 🏗️ Architecture:
1. **Input Layer:** Receives input features (e.g., pixel intensities, house attributes).
2. **Hidden Layer(s):** Contains artificial neurons that extract abstract patterns.
3. **Output Layer:** Produces final prediction (class label or numerical value).

#### 🔢 Mathematical Formula for a Neuron:
\`\`\`text
Output = Activation( Σ(Weight × Input) + Bias )
y = f( w1*x1 + w2*x2 + ... + wn*xn + b )
\`\`\`

#### 🔄 The Learning Process:
- **Forward Propagation:** Inputs pass through layers to produce a prediction.
- **Loss Calculation:** Loss function calculates the difference between prediction and actual target.
- **Backpropagation:** The error gradient is sent backward using the Chain Rule.
- **Gradient Descent:** Weights and biases are updated to minimize the loss.`
  },
  {
    id: 'activation_functions',
    keywords: ['activation function', 'relu', 'sigmoid', 'softmax', 'tanh'],
    response: `### ⚡ Activation Functions in Deep Learning

Activation functions introduce **non-linearity** into neural networks, allowing them to learn complex non-linear patterns.

#### Popular Activation Functions:
1. **ReLU (Rectified Linear Unit):**
   - Formula: \`f(x) = max(0, x)\`
   - **Why use it:** Fast, avoids vanishing gradient for positive values; default choice for hidden layers.
2. **Sigmoid:**
   - Formula: \`f(x) = 1 / (1 + e^-x)\`
   - Output range: \`(0, 1)\`
   - **Why use it:** Great for binary classification output layers.
3. **Softmax:**
   - Converts raw logits into probability distribution that sums to 1.
   - **Why use it:** Standard for multi-class classification output layer.
4. **Tanh (Hyperbolic Tangent):**
   - Output range: \`(-1, 1)\`
   - Zero-centered, generally preferred over Sigmoid in hidden layers.`
  },
  {
    id: 'nlp_transformers',
    keywords: ['nlp', 'natural language processing', 'llm', 'large language model', 'transformers', 'gpt', 'tokenization'],
    response: `### 💬 NLP & Large Language Models (LLMs)

**Natural Language Processing (NLP)** enables computers to understand, interpret, and generate human languages.

#### Key Steps in NLP:
1. **Tokenization:** Splitting text into words, subwords, or characters.
2. **Stop-word Removal & Lemmatization:** Normalizing text into base forms.
3. **Embeddings:** Converting words into dense numerical vectors (e.g., Word2Vec, GloVe).

#### 🚀 The Transformer Revolution:
Introduced in the seminal 2017 paper *"Attention Is All You Need"*, the **Transformer** replaced sequential RNNs with a **Self-Attention Mechanism**.
- **Self-Attention:** Lets the model weigh the relevance of every word in a sentence relative to every other word simultaneously.
- **LLMs (ChatGPT, Claude, Gemini):** Multi-billion parameter transformer models trained on massive text corpora to predict the next token.`
  },

  // --------------------------------------------------------------------------
  // B. WEB DEVELOPMENT (HTML, CSS, JAVASCRIPT)
  // --------------------------------------------------------------------------
  {
    id: 'css_flexbox_vs_grid',
    keywords: ['flexbox vs grid', 'css flexbox vs grid', 'difference between flexbox and grid', 'flexbox or grid'],
    response: `### 🎨 CSS Flexbox vs. CSS Grid

The golden rule for modern CSS layout:

- **Flexbox is One-Dimensional (1D):** Manages items in a **single direction** (either row OR column).
- **CSS Grid is Two-Dimensional (2D):** Manages items in **both rows AND columns** simultaneously.

#### When to use which:
- Use **Flexbox** for: Navigation bars, centering elements, aligning buttons, responsive chip lists.
- Use **Grid** for: Overall page layouts, image galleries, complex multi-column dashboards.

#### 💻 Code Comparison:
\`\`\`css
/* Flexbox Example: Centering elements easily */
.flex-container {
  display: flex;
  justify-content: center; /* horizontal alignment */
  align-items: center;     /* vertical alignment */
  gap: 12px;
}

/* Grid Example: 3-Column Responsive Layout */
.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
}
\`\`\``
  },
  {
    id: 'center_div',
    keywords: ['how to center a div', 'center div in css', 'centering a div'],
    response: `### 🎯 How to Center a Div in CSS (3 Best Modern Ways)

#### Method 1: Modern CSS Grid (Easiest & Shortest)
\`\`\`css
.parent {
  display: grid;
  place-items: center;
  height: 100vh; /* or any height */
}
\`\`\`

#### Method 2: Flexbox (Most Popular)
\`\`\`css
.parent {
  display: flex;
  justify-content: center; /* Horizontally */
  align-items: center;     /* Vertically */
  height: 100vh;
}
\`\`\`

#### Method 3: Absolute Position & Transform (Classic)
\`\`\`css
.child {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}
\`\`\``
  },
  {
    id: 'html_semantic',
    keywords: ['semantic html', 'semantic tags', 'what is semantic html', 'html tags'],
    response: `### 🏷️ Semantic HTML & Why It Matters

**Semantic HTML** means using tags that convey the meaning of the content, rather than just how it looks visually.

#### Key Semantic Elements:
- \`<header>\`: Introductory content or navigational links.
- \`<nav>\`: Set of navigation links.
- \`<main>\`: Dominant content unique to the document.
- \`<article>\`: Self-contained, independently redistributable piece of content (e.g., blog post).
- \`<section>\`: Standalone thematic grouping of content.
- \`<aside>\`: Secondary content tangentially related (e.g., sidebar).
- \`<footer>\`: Author, copyright, or footer links.

#### 🌟 3 Big Benefits:
1. **Accessibility (a11y):** Screen readers navigate landmarks effortlessly for visually impaired users.
2. **SEO (Search Engine Optimization):** Search bots index content structure and headers accurately.
3. **Readability & Maintainability:** Clean code makes team collaboration seamless.`
  },
  {
    id: 'div_vs_span',
    keywords: ['div vs span', 'difference between div and span', 'div and span'],
    response: `### 📦 Difference Between \`<div>\` and \`<span>\`

| Feature | \`<div>\` | \`<span>\` |
| :--- | :--- | :--- |
| **Display Type** | Block-level element | Inline element |
| **Line Break** | Starts on a new line and takes full width | Stays within current text flow without line break |
| **Width & Height** | Can set custom width, height, margin, padding | Cannot set width or height; size equals its content |
| **Common Use** | Section containers, layout wrappers, cards | Styling words or phrases inside paragraphs |

#### Example:
\`\`\`html
<!-- Block Level Wrapper -->
<div class="card">
  <p>Learn to code with <span class="highlight">SimpleSolve AI</span> today!</p>
</div>
\`\`\``
  },
  {
    id: 'js_variables',
    keywords: ['var let const', 'difference between var let and const', 'var vs let vs const', 'let const var'],
    response: `### ⚡ JavaScript: \`var\` vs \`let\` vs \`const\`

| Feature | \`var\` (Old ES5) | \`let\` (Modern ES6) | \`const\` (Modern ES6) |
| :--- | :--- | :--- | :--- |
| **Scope** | Function scoped | Block scoped \`{ }\` | Block scoped \`{ }\` |
| **Re-declaration** | Allowed | Syntax Error | Syntax Error |
| **Re-assignment** | Allowed | Allowed | Not Allowed |
| **Hoisting** | Hoisted with \`undefined\` | Hoisted into Temporal Dead Zone | Hoisted into Temporal Dead Zone |

#### Best Practice Rule:
- Use **\`const\`** by default for all variables, arrays, and objects.
- Use **\`let\`** only when you know the variable value needs to change (e.g., loop counter).
- **Avoid \`var\`** in modern JavaScript to eliminate scope bugs.`
  },
  {
    id: 'js_arrow_functions',
    keywords: ['arrow functions', 'regular functions vs arrow functions', 'arrow function in javascript', 'fat arrow'],
    response: `### 🏹 Arrow Functions vs. Regular Functions in JavaScript

Arrow functions were introduced in ES6 to provide concise syntax and lexical scoping.

\`\`\`javascript
// 1. Regular Function
function add(a, b) {
  return a + b;
}

// 2. Arrow Function (Concise syntax)
const add = (a, b) => a + b;
\`\`\`

#### Key Differences:
1. **\`this\` Binding:** Arrow functions do not have their own \`this\`. They inherit \`this\` from the surrounding lexical scope.
2. **Arguments Object:** Regular functions have access to \`arguments\`, arrow functions do not (use rest parameters \`...args\` instead).
3. **Constructors:** Regular functions can be used as constructors with \`new\`; arrow functions throw a \`TypeError\` if used with \`new\`.`
  },
  {
    id: 'js_async_promises',
    keywords: ['promises', 'async await', 'javascript promises', 'async await vs promise', 'asynchronous javascript'],
    response: `### ⏳ Promises & Async/Await in JavaScript

JavaScript is single-threaded. Asynchronous operations (like API calls or timers) are handled via the **Event Loop**.

#### 1. Using Promises:
\`\`\`javascript
fetchData()
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error("Error:", error));
\`\`\`

#### 2. Using Modern \`async\` / \`await\` (Cleaner syntax):
\`\`\`javascript
async function loadData() {
  try {
    const response = await fetch('https://api.example.com/data');
    const data = await response.json();
    console.log(data);
  } catch (error) {
    console.error("Failed to fetch:", error);
  }
}
\`\`\`
> **Tip:** \`async/await\` is syntactic sugar built on top of Promises that makes asynchronous code look synchronous and readable!`
  },
  {
    id: 'js_array_methods',
    keywords: ['map filter reduce', 'javascript array methods', 'map vs filter vs reduce'],
    response: `### 🔁 Array Methods: \`map()\`, \`filter()\`, and \`reduce()\`

These three functional methods do NOT mutate the original array:

\`\`\`javascript
const numbers = [1, 2, 3, 4, 5];

// 1. map(): Transforms every element into a new array
const doubled = numbers.map(num => num * 2);
// Result: [2, 4, 6, 8, 10]

// 2. filter(): Keeps only elements matching condition
const evens = numbers.filter(num => num % 2 === 0);
// Result: [2, 4]

// 3. reduce(): Accumulates all elements into a single value
const sum = numbers.reduce((accumulator, current) => accumulator + current, 0);
// Result: 15
\`\`\``
  },

  // --------------------------------------------------------------------------
  // C. C++ PROGRAMMING
  // --------------------------------------------------------------------------
  {
    id: 'cpp_oop',
    keywords: ['oop in c++', 'oop concepts', '4 pillars of oop', 'object oriented programming c++'],
    response: `### 🏛️ The 4 Pillars of OOP in C++

Object-Oriented Programming (OOP) organizes code into reusable classes and objects.

#### 1. Encapsulation (Data Hiding)
Wrapping data variables and member functions together inside a class and restricting direct access using access specifiers (\`private\`, \`protected\`, \`public\`).

#### 2. Abstraction (Hiding Complexity)
Showing only essential features to the outside world while hiding internal background details (achieved via Abstract Classes & Interfaces).

#### 3. Inheritance (Reusability)
Deriving a new class (child/derived) from an existing class (parent/base) to reuse properties and methods.

#### 4. Polymorphism (Many Forms)
- **Compile-Time:** Function Overloading & Operator Overloading.
- **Run-Time:** Virtual Functions (\`virtual\` keyword) & Method Overriding.

\`\`\`cpp
#include <iostream>
using namespace std;

// Base Class
class Animal {
public:
    virtual void speak() { cout << "Animal sound" << endl; }
};

// Derived Class demonstrating Polymorphism & Inheritance
class Dog : public Animal {
public:
    void speak() override { cout << "Woof! Woof!" << endl; }
};

int main() {
    Animal* a = new Dog();
    a->speak(); // Outputs: Woof! Woof!
    delete a;
    return 0;
}
\`\`\``
  },
  {
    id: 'cpp_pointers',
    keywords: ['pointers in c++', 'pointers vs references', 'cpp pointers', 'c++ pointers'],
    response: `### 📍 Pointers vs References in C++

#### 1. Pointer (\`*\`)
A pointer is a variable that stores the memory address of another variable.
\`\`\`cpp
int x = 42;
int* ptr = &x; // ptr holds the address of x
cout << *ptr;  // Dereference: prints 42
\`\`\`
- Can be \`nullptr\`.
- Can be reassigned to point to different addresses.
- Can perform pointer arithmetic.

#### 2. Reference (\`&\`)
A reference is an alias (alternative nickname) for an existing variable.
\`\`\`cpp
int x = 42;
int& ref = x;  // ref is an alias for x
ref = 50;      // x is now 50
\`\`\`
- Cannot be null.
- Must be initialized when declared.
- Cannot be changed to refer to another variable.`
  },
  {
    id: 'cpp_vectors_vs_arrays',
    keywords: ['vector vs array', 'cpp vector vs array', 'std::vector in c++'],
    response: `### 📊 C++: \`std::vector\` vs Built-in Arrays

| Feature | Built-in Array (\`int arr[10]\`) | \`std::vector<int>\` |
| :--- | :--- | :--- |
| **Size** | Fixed size defined at compile-time | Dynamically resizable at runtime |
| **Memory Allocation** | Stack memory | Heap memory (elements managed dynamically) |
| **Functions** | No built-in methods | Rich API (\`push_back()\`, \`pop_back()\`, \`size()\`) |
| **Boundary Check** | No bounds checking (unsafe) | Supports bounds check with \`.at(index)\` |

\`\`\`cpp
#include <iostream>
#include <vector>

int main() {
    std::vector<int> nums = {10, 20, 30};
    nums.push_back(40); // Dynamically adds 40 to end
    std::cout << "Size: " << nums.size() << std::endl;
    return 0;
}
\`\`\``
  },

  // --------------------------------------------------------------------------
  // D. STUDY SKILLS & EVERYDAY PROBLEM SOLVING
  // --------------------------------------------------------------------------
  {
    id: 'pomodoro',
    keywords: ['pomodoro', 'pomodoro technique', 'study technique', 'how to study effectively'],
    response: `### ⏱️ The Pomodoro Technique for Students

The **Pomodoro Technique** is a time-management method designed to maintain high focus and eliminate mental burnout.

#### 🔄 How the Cycle Works:
1. **Choose 1 specific task** (e.g., Learn CSS Flexbox, solve 5 Math problems).
2. **Set a timer for 25 minutes** (1 Pomodoro). Work with zero distractions.
3. **When timer rings, take a 5-minute break** (Walk, drink water, stretch—*no social media*).
4. **Repeat 4 cycles.**
5. **After 4 Pomodoros, reward yourself with a long 20–30 minute break.**

#### 💡 Why it Works for Engineering Students:
- Breaks large intimidating assignments into bite-sized, approachable sprints.
- Trains your brain to focus without procrastination.
- Keeps mental stamina fresh for long exam revision sessions.`
  },
  {
    id: 'exam_prep',
    keywords: ['exam prep', 'how to prepare for semester exams', 'study for exams', 'exam tips'],
    response: `### 📝 7-Day B.Tech Semester Exam Preparation Strategy

Here is a tested study framework to maximize marks:

1. **Syllabus & Weightage Audit (Day 1):**
   - Check previous 3–5 years question papers (PYQs). Identify repeated units and frequently asked 10-mark questions.
2. **Active Recall over Passive Reading (Days 2–4):**
   - Don't just re-read slides. Close your book and explain the concept aloud, or write down key derivations/diagrams from memory.
3. **Master Key Diagrams & Formulas (Day 5):**
   - In technical exams, clean labeled diagrams and equations earn immediate bonus impressions from evaluators.
4. **Solve 2 Past Year Papers under Timed Conditions (Day 6):**
   - Tests your speed and question selection strategy.
5. **Rest and Light Revision (Day 7):**
   - Review your summary formula sheet and ensure 7–8 hours of restful sleep before exam day!`
  },
  {
    id: 'coding_logic',
    keywords: ['how to improve coding logic', 'improve problem solving', 'coding logic', 'logic building'],
    response: `### 🚀 5 Proven Steps to Improve Coding Logic

1. **Pen & Paper First (Never code immediately):**
   - Read the problem statement twice. Write down inputs, expected outputs, edge cases, and manually trace through a test example on paper.
2. **Break Down into Sub-Problems:**
   - Divide a big task into smaller steps: *(1) Read input $\\rightarrow$ (2) Clean data $\\rightarrow$ (3) Sort $\\rightarrow$ (4) Filter $\\rightarrow$ (5) Return output*.
3. **Master Fundamental Data Structures:**
   - 80% of problems resolve when you pick the right tool:
     - Need key-value lookup in $O(1)$? Use **Hash Map / Object**.
     - Need LIFO order (Undo, balanced brackets)? Use **Stack**.
     - Need sliding window / ordered elements? Use **Two Pointers / Vector**.
4. **Dry Run with Edge Cases:**
   - Check array size 0, array size 1, negative numbers, duplicates, and boundary limits.
5. **Consistency Over Intensity:**
   - Solve 1 to 2 problems daily on LeetCode / HackerRank rather than 20 problems in one chaotic weekend.`
  },
  {
    id: 'procrastination',
    keywords: ['procrastination', 'stop procrastinating', 'time management', 'how to focus'],
    response: `### 🎯 Overcoming Procrastination: The 2-Minute Rule

Procrastination is rarely a laziness problem—it is usually an **emotional barrier** to starting a daunting task.

#### ⚡ The 2-Minute Rule:
> *"When you start a new habit or task, it should take less than two minutes to do."*

- Instead of: *"I need to write a 30-page lab report."*
- Reframe to: *"I will just open the document and type the title."*
- Instead of: *"I need to solve 10 calculus problems."*
- Reframe to: *"I will just write down the formula for Problem 1."*

Once the physical barrier of starting is broken, momentum takes over and continuing becomes dramatically easier!`
  },

  // --------------------------------------------------------------------------
  // E. CONVERSATIONAL & GENERAL KNOWLEDGE
  // --------------------------------------------------------------------------
  {
    id: 'greeting',
    keywords: ['hello', 'hi', 'hey', 'greetings', 'good morning', 'good evening', 'good afternoon', 'sup', 'yo'],
    response: `👋 Hello! Welcome to **SimpleSolve AI**.

I am your friendly, client-side intelligent assistant. Here is what I can do for you:
- 🧮 **Solve arithmetic & calculations** step-by-step *(without eval!)*
- 💻 **Explain programming concepts** in HTML, CSS, JavaScript, and C++
- 🤖 **Explain AI & Machine Learning** concepts clearly
- 📚 **Share study strategies** and productivity techniques

How can I help you today? Feel free to ask a problem or pick a suggested prompt!`
  },
  {
    id: 'about_bot',
    keywords: ['who are you', 'what are you', 'about simplesolve', 'what can you do', 'help'],
    response: `### 🤖 About SimpleSolve AI
**Tagline:** *Simple Questions. Smart Solutions.*

I am an interactive problem-solving chatbot website designed as a complete college mini-project for students.

#### ✨ Features:
- **Zero-Dependency Math Engine:** Pure JavaScript arithmetic evaluator adhering to BODMAS order without using \`eval()\`.
- **Structured Explanations:** Clean markdown with bullet points, comparison tables, and copyable code snippets.
- **LocalStorage History:** Automatically saves and restores your chat sessions across browser visits.
- **Dark Navy Design:** Modern, ChatGPT-inspired user interface optimized for desktop and mobile.

> **Note:** This version runs entirely in your browser using an intelligent rule-based knowledge engine. The code is modularly structured to connect to external generative AI APIs (like Gemini or OpenAI) whenever you wish!`
  },
  {
    id: 'sky_blue',
    keywords: ['why is the sky blue', 'sky blue'],
    response: `### ☀️ Why is the Sky Blue?

The sky is blue because of a phenomenon called **Rayleigh Scattering**:

1. Sunlight looks white, but it is actually made up of all the colors of the rainbow (different wavelengths).
2. Red and yellow light have longer wavelengths, so they travel straight through Earth's atmosphere without bumping into many air molecules.
3. Blue light has much shorter, smaller wavelengths.
4. When sunlight reaches Earth's atmosphere, blue light is scattered in every direction by gases and particles in the air.
5. Because blue light scatters more than other colors, our eyes perceive the daylight sky as blue!`
  },
  {
    id: 'bye',
    keywords: ['bye', 'goodbye', 'see you', 'thank you', 'thanks'],
    response: `You're very welcome! 😊

Best of luck with your studies and problem-solving. Whenever you have another question or calculation, I'm right here. Have a productive day!`
  }
];

/* ============================================================================
   5. RESPONSE MATCHING & INTELLIGENCE ENGINE
   ============================================================================ */

/**
 * Main response dispatcher:
 * 1. Checks for arithmetic or math word problems
 * 2. Matches knowledge base intents with score weighting
 * 3. Fallbacks with intelligent topic recommendations
 */
async function generateBotResponse(userInputText) {
  // If user enabled external API integration in future:
  if (CONFIG.USE_EXTERNAL_API && CONFIG.EXTERNAL_API_KEY) {
    return await fetchFromExternalAI(userInputText);
  }

  const raw = userInputText.trim();
  const lower = raw.toLowerCase();

  // --------------------------------------------------------------------------
  // Check 1: Special Math Functions (Percentage, Sqrt, Factorial, Geometry)
  // --------------------------------------------------------------------------
  const specialMath = SafeMathSolver.solveSpecialMath(raw);
  if (specialMath) {
    if (specialMath.error) {
      return `⚠️ **Math Notice:** ${specialMath.error}`;
    }
    let html = `### 🧮 ${specialMath.title}\n\n`;
    if (specialMath.formula) html += `> **${specialMath.formula}**\n\n`;
    html += `#### 📋 Step-by-Step Solution:\n`;
    specialMath.steps.forEach(step => {
      html += `- ${step}\n`;
    });
    html += `\n**Final Result:**\n${specialMath.result}`;
    return html;
  }

  // --------------------------------------------------------------------------
  // Check 2: Direct Arithmetic Expression (e.g. "45 * 12 + 10", "calculate (100 - 20) / 4")
  // --------------------------------------------------------------------------
  // Strip common lead-in phrases
  const mathClean = raw
    .replace(/^(?:calculate|solve|what\s+is|evaluate|compute)\s+/i, '')
    .replace(/[?=\s]+$/, '')
    .trim();

  // If the cleaned text looks like a math expression with operators and digits
  if (/^[0-9+\-*/().%^\s]+$/.test(mathClean) && /[0-9]/.test(mathClean) && /[+\-*/%^]/.test(mathClean)) {
    try {
      const mathResult = SafeMathSolver.evaluate(mathClean);
      let out = `### 🧮 Step-by-Step Arithmetic Solution\n\n`;
      out += `> **Expression:** \`${mathResult.expression}\`\n\n`;
      out += `#### 📋 Order of Operations (BODMAS/PEMDAS):\n`;
      mathResult.steps.forEach((step, idx) => {
        out += `${idx + 1}. ${step}\n`;
      });
      out += `\n**Final Calculated Result:** \`${mathResult.result}\``;
      return out;
    } catch (err) {
      // If parsing failed, fall through to knowledge base
    }
  }

  // --------------------------------------------------------------------------
  // Check 3: Knowledge Base Matching with Keyword Scoring
  // --------------------------------------------------------------------------
  let bestMatch = null;
  let highestScore = 0;

  for (const item of KNOWLEDGE_BASE) {
    let score = 0;
    for (const kw of item.keywords) {
      if (lower === kw) {
        score += 100; // Exact match
      } else if (lower.includes(kw)) {
        score += kw.length * 2; // Longer keyword match earns higher weight
      } else {
        // Token match
        const tokens = kw.split(' ');
        const matchedTokens = tokens.filter(t => lower.includes(t));
        if (matchedTokens.length === tokens.length) {
          score += tokens.length * 4;
        }
      }
    }

    if (score > highestScore) {
      highestScore = score;
      bestMatch = item;
    }
  }

  // If a confident match is found
  if (bestMatch && highestScore >= 6) {
    return bestMatch.response;
  }

  // --------------------------------------------------------------------------
  // Check 4: Intelligent Contextual Fallback
  // --------------------------------------------------------------------------
  return generateFallbackResponse(raw);
}

/**
 * Intelligent Fallback Handler
 */
function generateFallbackResponse(userQuery) {
  return `### 🤖 SimpleSolve AI Assistant

I am currently running in **Rule-Based Mode (v1.0)**, and I couldn't find an exact predefined answer for:
> *"${escapeHtml(userQuery)}"*

#### 💡 Here is what I can answer right now:
1. **Math & Calculations:** Try typing any calculation like \`(45 * 12) + 30\`, \`18% of 2500\`, \`sqrt(625)\`, or \`factorial of 5\`.
2. **AI & Machine Learning:** Ask *"What is Overfitting?"*, *"Explain Neural Networks"*, or *"Machine Learning vs Deep Learning"*.
3. **Web Development:** Ask *"Flexbox vs Grid"*, *"How to center a div"*, or *"var vs let vs const"*.
4. **C++ Programming:** Ask *"4 pillars of OOP in C++"* or *"Pointers vs References"*.
5. **Study Skills:** Ask *"How to use Pomodoro"* or *"Tips to prepare for semester exams"*.

*Tip: You can click any suggested question on the welcome screen or the quick chips below!*`;
}

/**
 * Future API Integration Stub (OpenAI / Gemini)
 * To enable: set CONFIG.USE_EXTERNAL_API = true and provide CONFIG.EXTERNAL_API_KEY.
 */
async function fetchFromExternalAI(prompt) {
  try {
    // Example implementation for Gemini API:
    /*
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${CONFIG.EXTERNAL_API_KEY}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
    */
    return "External API configuration placeholder. Insert API key in script.js to activate.";
  } catch (err) {
    return `⚠️ Error connecting to external AI API: ${err.message}`;
  }
}

/* ============================================================================
   6. MARKDOWN & CODE FORMATTER (CLIENT-SIDE)
   ============================================================================ */

/**
 * Converts markdown-style text (headers, bold, lists, tables, code blocks) to safe HTML.
 */
function formatMarkdown(text) {
  if (!text) return '';

  let html = text;

  // 1. Code blocks with ```language ... ```
  html = html.replace(/```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g, (match, lang, code) => {
    const language = lang || 'code';
    const escapedCode = escapeHtml(code.trim());
    return `<div class="code-block-container">
      <div class="code-header">
        <span>${language}</span>
        <button class="btn-copy-code" onclick="copyCodeSnippet(this)" title="Copy Code">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
          <span>Copy</span>
        </button>
      </div>
      <pre><code>${escapedCode}</code></pre>
    </div>`;
  });

  // 2. Inline code `code`
  html = html.replace(/`([^`]+)`/g, (match, code) => {
    return `<code class="inline-code">${escapeHtml(code)}</code>`;
  });

  // 3. Headers: ### Header 3
  html = html.replace(/^### (.*$)/gim, '<h3 style="color:#38bdf8; margin:12px 0 6px; font-size:1.05rem;">$1</h3>');
  html = html.replace(/^#### (.*$)/gim, '<h4 style="color:#60a5fa; margin:10px 0 4px; font-size:0.95rem;">$1</h4>');

  // 4. Blockquotes: > quote
  html = html.replace(/^\> (.*$)/gim, '<blockquote style="border-left:3px solid #38bdf8; padding-left:12px; margin:8px 0; color:#94a3b8; font-style:italic;">$1</blockquote>');

  // 5. Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // 6. Simple Tables (Markdown tables)
  html = html.replace(/\n\|(.+)\|\n\|[-:| ]+\|\n((?:\|.*\|\n?)*)/g, (match, header, body) => {
    const headers = header.split('|').map(h => h.trim()).filter(Boolean);
    const rows = body.trim().split('\n').map(row => {
      return row.split('|').map(c => c.trim()).filter(Boolean);
    });

    let tableHtml = '<div style="overflow-x:auto; margin:10px 0;"><table style="width:100%; border-collapse:collapse; font-size:0.85rem;"><thead><tr style="border-bottom:1px solid #1e2f4c; background:#0f172a;">';
    headers.forEach(h => {
      tableHtml += `<th style="padding:8px 10px; text-align:left; color:#38bdf8;">${h}</th>`;
    });
    tableHtml += '</tr></thead><tbody>';
    rows.forEach(r => {
      tableHtml += '<tr style="border-bottom:1px solid #16233d;">';
      r.forEach(c => {
        tableHtml += `<td style="padding:6px 10px; color:#cbd5e1;">${c}</td>`;
      });
      tableHtml += '</tr>';
    });
    tableHtml += '</tbody></table></div>';
    return tableHtml;
  });

  // 7. Unordered Lists: - item or * item
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li>$1</li>');
  html = html.replace(/(<li>[\s\S]*?<\/li>)/gim, '<ul>$1</ul>');
  // Clean adjacent <ul> tags
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // 8. Numbered Lists: 1. item
  html = html.replace(/^\s*([0-9]+)\.\s+(.*)$/gim, '<li>$2</li>');

  // 9. Line breaks to paragraphs
  const paragraphs = html.split(/\n{2,}/);
  html = paragraphs.map(p => {
    p = p.trim();
    if (!p) return '';
    // If paragraph is already a block element, do not wrap in <p>
    if (/^<(h3|h4|div|blockquote|ul|ol|table)/i.test(p)) {
      return p;
    }
    return `<p>${p.replace(/\n/g, '<br>')}</p>`;
  }).join('');

  return html;
}

/**
 * Escapes unsafe HTML characters to prevent XSS.
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Copies a code snippet to clipboard with visual feedback.
 */
window.copyCodeSnippet = function(buttonEl) {
  const container = buttonEl.closest('.code-block-container');
  const codeEl = container.querySelector('pre code');
  if (!codeEl) return;

  const codeText = codeEl.innerText;
  navigator.clipboard.writeText(codeText).then(() => {
    const span = buttonEl.querySelector('span');
    const oldText = span.innerText;
    span.innerText = 'Copied!';
    buttonEl.style.color = '#10b981';
    showToast('Code copied to clipboard!', 'success');

    setTimeout(() => {
      span.innerText = oldText;
      buttonEl.style.color = '';
    }, 2000);
  }).catch(() => {
    showToast('Failed to copy code', 'error');
  });
};

/* ============================================================================
   7. STORAGE & CHAT SESSION MANAGEMENT
   ============================================================================ */

/**
 * Loads chat sessions from browser LocalStorage
 */
function loadStorageData() {
  try {
    const raw = localStorage.getItem(CONFIG.storageKey);
    if (raw) {
      appState.chats = JSON.parse(raw);
    } else {
      appState.chats = [];
    }

    const savedActiveId = localStorage.getItem(CONFIG.activeChatKey);
    if (savedActiveId && appState.chats.some(c => c.id === savedActiveId)) {
      appState.activeChatId = savedActiveId;
    } else if (appState.chats.length > 0) {
      appState.activeChatId = appState.chats[0].id;
    } else {
      createNewChatSession(false);
    }
  } catch (e) {
    console.error('Error loading LocalStorage:', e);
    appState.chats = [];
    createNewChatSession(false);
  }
}

/**
 * Saves all chat sessions to browser LocalStorage
 */
function saveStorageData() {
  try {
    localStorage.setItem(CONFIG.storageKey, JSON.stringify(appState.chats));
    if (appState.activeChatId) {
      localStorage.setItem(CONFIG.activeChatKey, appState.activeChatId);
    }
  } catch (e) {
    console.error('Failed to save chat data:', e);
  }
}

/**
 * Creates a brand new chat session
 */
function createNewChatSession(shouldRender = true) {
  const newChat = {
    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    title: 'New Conversation',
    timestamp: new Date().toISOString(),
    messages: []
  };

  appState.chats.unshift(newChat);
  appState.activeChatId = newChat.id;
  saveStorageData();

  if (shouldRender) {
    renderHistoryList();
    renderActiveChat();
    showToast('Started a new conversation');
    // On mobile, close sidebar after clicking New Chat
    closeMobileSidebar();
  }

  return newChat;
}

/**
 * Returns the currently active chat session object
 */
function getActiveChat() {
  return appState.chats.find(c => c.id === appState.activeChatId);
}

/**
 * Deletes a specific chat session by ID
 */
function deleteChatSession(chatId, event) {
  if (event) event.stopPropagation();

  const index = appState.chats.findIndex(c => c.id === chatId);
  if (index === -1) return;

  appState.chats.splice(index, 1);

  if (appState.activeChatId === chatId) {
    if (appState.chats.length > 0) {
      appState.activeChatId = appState.chats[0].id;
    } else {
      createNewChatSession(false);
    }
  }

  saveStorageData();
  renderHistoryList();
  renderActiveChat();
  showToast('Chat deleted');
}

/**
 * Clears all chat history
 */
function clearAllHistory() {
  if (appState.chats.length === 0) {
    showToast('Chat history is already empty');
    return;
  }

  if (confirm('Are you sure you want to delete ALL chat sessions? This cannot be undone.')) {
    appState.chats = [];
    createNewChatSession(false);
    saveStorageData();
    renderHistoryList();
    renderActiveChat();
    showToast('All chat history cleared');
  }
}

/**
 * Clears messages in the active chat session
 */
function clearCurrentChat() {
  const chat = getActiveChat();
  if (!chat || chat.messages.length === 0) {
    showToast('Current chat has no messages to clear');
    return;
  }

  if (confirm('Clear messages in this conversation?')) {
    chat.messages = [];
    chat.title = 'New Conversation';
    saveStorageData();
    renderHistoryList();
    renderActiveChat();
    showToast('Conversation cleared');
  }
}

/* ============================================================================
   8. UI RENDERING FUNCTIONS
   ============================================================================ */

/**
 * Renders the sidebar chat history list
 */
function renderHistoryList() {
  DOM.historyList.innerHTML = '';
  DOM.historyCount.innerText = appState.chats.length;

  if (appState.chats.length === 0) {
    DOM.historyList.innerHTML = `
      <div class="history-empty">
        <span>No saved chats yet.<br>Click <strong>+ New Chat</strong> to start!</span>
      </div>
    `;
    return;
  }

  appState.chats.forEach(chat => {
    const item = document.createElement('div');
    item.className = `history-item ${chat.id === appState.activeChatId ? 'active' : ''}`;
    item.title = chat.title;

    item.innerHTML = `
      <div class="history-title-wrap">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
        </svg>
        <span class="history-title">${escapeHtml(chat.title)}</span>
      </div>
      <button class="history-del-btn" title="Delete chat" aria-label="Delete chat">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px; height:13px;">
          <polyline points="3 6 5 6 21 6"></polyline>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
        </svg>
      </button>
    `;

    // Click to switch active chat
    item.addEventListener('click', () => {
      if (appState.activeChatId !== chat.id) {
        appState.activeChatId = chat.id;
        saveStorageData();
        renderHistoryList();
        renderActiveChat();
        closeMobileSidebar();
      }
    });

    // Delete single chat button
    const delBtn = item.querySelector('.history-del-btn');
    delBtn.addEventListener('click', (e) => {
      deleteChatSession(chat.id, e);
    });

    DOM.historyList.appendChild(item);
  });
}

/**
 * Renders the active chat messages and toggles the welcome screen
 */
function renderActiveChat() {
  const chat = getActiveChat();
  DOM.messagesContainer.innerHTML = '';

  if (!chat || chat.messages.length === 0) {
    // Show welcome screen, empty message list
    DOM.welcomeScreen.style.display = 'flex';
    DOM.messagesContainer.style.display = 'none';
  } else {
    // Hide welcome screen, render message bubbles
    DOM.welcomeScreen.style.display = 'none';
    DOM.messagesContainer.style.display = 'flex';

    chat.messages.forEach(msg => {
      appendMessageToDOM(msg.sender, msg.text, msg.timestamp, false);
    });

    scrollToBottom();
  }
}

/**
 * Injects a single message bubble into the chat DOM
 */
function appendMessageToDOM(sender, text, timestamp = null, animate = true) {
  // Ensure message container is visible
  DOM.welcomeScreen.style.display = 'none';
  DOM.messagesContainer.style.display = 'flex';

  const timeStr = timestamp
    ? new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const row = document.createElement('div');
  row.className = `message-row ${sender}`;
  if (!animate) {
    row.style.animation = 'none';
  }

  // User message
  if (sender === 'user') {
    row.innerHTML = `
      <div class="message-avatar" title="You">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </div>
      <div class="message-bubble-wrapper">
        <div class="message-bubble">
          ${escapeHtml(text).replace(/\n/g, '<br>')}
        </div>
        <span class="message-meta">You • ${timeStr}</span>
      </div>
    `;
  } else {
    // Bot message (Formatted with Markdown)
    const formattedHtml = formatMarkdown(text);
    row.innerHTML = `
      <div class="message-avatar" title="SimpleSolve AI">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
        </svg>
      </div>
      <div class="message-bubble-wrapper">
        <div class="message-bubble">
          ${formattedHtml}
        </div>
        <span class="message-meta">SimpleSolve AI • ${timeStr}</span>
      </div>
    `;
  }

  DOM.messagesContainer.appendChild(row);
  scrollToBottom();
}

/**
 * Smoothly scrolls viewport to the bottom
 */
function scrollToBottom() {
  requestAnimationFrame(() => {
    DOM.chatViewport.scrollTop = DOM.chatViewport.scrollHeight;
  });
}

/**
 * Displays a subtle temporary toast alert
 */
function showToast(message, type = 'normal') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  DOM.toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(8px)';
    toast.style.transition = 'all 0.25s ease';
    setTimeout(() => toast.remove(), 250);
  }, 2600);
}

/* ============================================================================
   9. USER INTERACTION & MESSAGE SUBMISSION
   ============================================================================ */

/**
 * Handles sending a message from the input form
 */
async function handleSendMessage(overrideText = null) {
  if (appState.isTyping) return;

  const text = (overrideText || DOM.userInput.value).trim();
  if (!text) return;

  let chat = getActiveChat();
  if (!chat) {
    chat = createNewChatSession(false);
  }

  // Auto-set title for new conversations based on first user query
  if (chat.messages.length === 0) {
    chat.title = text.length > 28 ? text.substring(0, 28) + '...' : text;
  }

  // 1. Record user message
  const userMsgObj = {
    sender: 'user',
    text: text,
    timestamp: new Date().toISOString()
  };
  chat.messages.push(userMsgObj);
  saveStorageData();
  renderHistoryList();

  // 2. Render user message in DOM
  appendMessageToDOM('user', text);

  // 3. Reset input field
  DOM.userInput.value = '';
  adjustTextareaHeight();
  DOM.sendBtn.disabled = true;

  // 4. Show typing animation
  appState.isTyping = true;
  DOM.typingIndicator.classList.add('active');
  scrollToBottom();

  // 5. Generate AI Response with simulated typing delay
  setTimeout(async () => {
    try {
      const botResponseText = await generateBotResponse(text);

      // Record bot message
      const botMsgObj = {
        sender: 'bot',
        text: botResponseText,
        timestamp: new Date().toISOString()
      };
      chat.messages.push(botMsgObj);
      saveStorageData();

      // Render bot message in DOM
      DOM.typingIndicator.classList.remove('active');
      appendMessageToDOM('bot', botResponseText);
    } catch (error) {
      DOM.typingIndicator.classList.remove('active');
      appendMessageToDOM('bot', `⚠️ An unexpected error occurred: ${error.message}`);
    } finally {
      appState.isTyping = false;
      DOM.userInput.focus();
    }
  }, CONFIG.typingDelayMs);
}

/**
 * Auto-adjusts textarea height based on content
 */
function adjustTextareaHeight() {
  DOM.userInput.style.height = 'auto';
  DOM.userInput.style.height = Math.min(DOM.userInput.scrollHeight, 160) + 'px';
}

/* ============================================================================
   10. MOBILE SIDEBAR & MODAL HANDLERS
   ============================================================================ */

function openMobileSidebar() {
  DOM.sidebar.classList.add('open');
  DOM.sidebarOverlay.classList.add('active');
}

function closeMobileSidebar() {
  DOM.sidebar.classList.remove('open');
  DOM.sidebarOverlay.classList.remove('active');
}

function openAboutModal() {
  DOM.aboutModal.classList.add('active');
}

function closeAboutModal() {
  DOM.aboutModal.classList.remove('active');
}

/* ============================================================================
   11. EVENT LISTENERS INITIALIZATION
   ============================================================================ */

function initEventListeners() {
  // Input Typing & Button State
  DOM.userInput.addEventListener('input', () => {
    DOM.sendBtn.disabled = DOM.userInput.value.trim().length === 0;
    adjustTextareaHeight();
  });

  // Enter sends message, Shift+Enter makes newline
  DOM.userInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (!DOM.sendBtn.disabled) {
        handleSendMessage();
      }
    }
  });

  // Form submit
  DOM.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!DOM.sendBtn.disabled) {
      handleSendMessage();
    }
  });

  // New Chat Button
  DOM.newChatBtn.addEventListener('click', () => {
    createNewChatSession(true);
  });

  // Clear Active Chat Button
  DOM.clearChatBtn.addEventListener('click', clearCurrentChat);

  // Clear All History Button
  DOM.clearAllHistoryBtn.addEventListener('click', clearAllHistory);

  // Mobile drawer controls
  DOM.openSidebarBtn.addEventListener('click', openMobileSidebar);
  DOM.closeSidebarBtn.addEventListener('click', closeMobileSidebar);
  DOM.sidebarOverlay.addEventListener('click', closeMobileSidebar);

  // About Modal
  DOM.aboutBtn.addEventListener('click', openAboutModal);
  DOM.closeAboutModalBtn.addEventListener('click', closeAboutModal);
  DOM.confirmAboutBtn.addEventListener('click', closeAboutModal);
  DOM.aboutModal.addEventListener('click', (e) => {
    if (e.target === DOM.aboutModal) closeAboutModal();
  });

  // Suggested Prompt Cards (Welcome Screen)
  document.querySelectorAll('.suggestion-card').forEach(card => {
    card.addEventListener('click', () => {
      const prompt = card.getAttribute('data-prompt');
      if (prompt) {
        handleSendMessage(prompt);
      }
    });
  });

  // Quick Chips (Above Input)
  DOM.quickChips.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      const prompt = chip.getAttribute('data-prompt');
      if (prompt) {
        handleSendMessage(prompt);
      }
    }
  });

  // Esc key closes modal & mobile sidebar
  window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeAboutModal();
      closeMobileSidebar();
    }
  });
}

/* ============================================================================
   12. APPLICATION ENTRY POINT
   ============================================================================ */

document.addEventListener('DOMContentLoaded', () => {
  // Load saved chat data or create initial session
  loadStorageData();

  // Setup DOM listeners
  initEventListeners();

  // Render sidebar and initial view
  renderHistoryList();
  renderActiveChat();

  // Auto-focus input
  DOM.userInput.focus();
  console.log(`${CONFIG.appName} v${CONFIG.version} initialized successfully.`);
});

// Expose core modules on window for testing in Developer Tools / Viva presentation
if (typeof window !== 'undefined') {
  window.SafeMathSolver = SafeMathSolver;
  window.generateBotResponse = generateBotResponse;
  window.KNOWLEDGE_BASE = KNOWLEDGE_BASE;
}
