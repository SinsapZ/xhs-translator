// 基础配置
const CONFIG = {
  TARGET_LANG: 'en',
  SELECTORS: {
    TITLE: '.title span, #detail-title span, .note-content .title span',
    CONTENT: '.note-text > span',
    COMMENT: '.comment-item .note-text span'
  }
};

// 添加样式
const STYLES = `
  .translation-text {
    color: #666;
    font-size: 14px;
    margin-top: 4px;
    line-height: 1.4;
    display: block;
  }

  .title .translation-text {
    color: #666;
    font-size: 14px;
    margin-top: 4px;
    line-height: 1.4;
    font-weight: normal;
  }

  .cultural-note {
    color: #666;
    font-size: 13px;
    margin-top: 4px;
    line-height: 1.4;
    font-style: italic;
  }

  .xhs-translation-loading {
    display: inline-block;
    margin-left: 8px;
    color: #ff2442;
    animation: xhsLoadingDots 1.4s infinite;
    font-size: 12px;
  }
  
  @keyframes xhsLoadingDots {
    0%, 20% { content: 'translating.'; }
    40%, 60% { content: 'translating..'; }
    80%, 100% { content: 'translating...'; }
  }
`;

// 创建介绍卡片
function createIntroCard() {
  const card = document.createElement('div');
  card.className = 'xhs-trans-intro';
  card.innerHTML = `
    <div class="xhs-trans-intro-content">
      <div class="xhs-trans-intro-header">
        <span class="xhs-trans-intro-icon">🌏</span>
        <span class="xhs-trans-intro-title">XHS Translator</span>
      </div>
      <div class="xhs-trans-intro-text">
        Bridging Cultures<br>
        Sharing Stories<br>
        Connecting Hearts
      </div>
      <div class="xhs-trans-intro-footer">
        Made with ❤️ in China
      </div>
    </div>
  `;
  
  // 添加样式
  const style = document.createElement('style');
  style.textContent = `
    .xhs-trans-intro {
      position: fixed;
      left: 20px;
      bottom: 20px;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      opacity: 0.85;
      transition: opacity 0.3s;
    }
    
    .xhs-trans-intro:hover {
      opacity: 1;
    }
    
    .xhs-trans-intro-content {
      background: rgba(255, 255, 255, 0.95);
      border-radius: 8px;
      padding: 12px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
      border: 1px solid #ffe4e6;
      max-width: 160px;
    }
    
    .xhs-trans-intro-header {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      color: #ff2442;
    }
    
    .xhs-trans-intro-icon {
      font-size: 16px;
      margin-right: 6px;
    }
    
    .xhs-trans-intro-title {
      font-size: 14px;
      font-weight: bold;
    }
    
    .xhs-trans-intro-text {
      font-size: 12px;
      line-height: 1.4;
      color: #666;
      margin-bottom: 8px;
    }
    
    .xhs-trans-intro-footer {
      font-size: 11px;
      color: #ff2442;
      text-align: center;
    }
    
    .xhs-translation-loading {
      display: inline-block;
      margin-left: 8px;
      color: #ff2442;
      animation: xhsLoadingDots 1.4s infinite;
      font-size: 12px;
    }

    .translation-text {
      color: #666;
      font-size: 14px;
      margin-top: 4px;
      line-height: 1.4;
    }

    .cultural-note {
      color: #666;
      font-size: 13px;
      margin-top: 4px;
      line-height: 1.4;
      font-style: italic;
    }
    
    @keyframes xhsLoadingDots {
      0%, 20% { content: 'translating.'; }
      40%, 60% { content: 'translating..'; }
      80%, 100% { content: 'translating...'; }
    }
  `;
  
  document.head.appendChild(style);
  document.body.appendChild(card);
}

// 初始化样式
function initStyles() {
  const style = document.createElement('style');
  style.textContent = STYLES;
  document.head.appendChild(style);
}

// 初始化翻译功能
async function init() {
  // 初始化样式
  initStyles();
  
  // 创建介绍卡片
  createIntroCard();
  
  // 设置内容观察器
  const observer = new MutationObserver(() => {
    translateAllElements();
  });
  
  // 观察整个文档变化
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 首次执行翻译
  translateAllElements();
}

// 翻译所有元素
async function translateAllElements() {
  // 翻译标题
  document.querySelectorAll(CONFIG.SELECTORS.TITLE).forEach(element => {
    if (!element.classList.contains('xhs-translated')) {
      translateElement(element, 'title');
    }
  });
  
  // 翻译正文
  document.querySelectorAll(CONFIG.SELECTORS.CONTENT).forEach(element => {
    if (!element.classList.contains('xhs-translated')) {
      translateElement(element, 'content');
    }
  });
  
  // 翻译评论
  document.querySelectorAll(CONFIG.SELECTORS.COMMENT).forEach(element => {
    if (!element.classList.contains('xhs-translated')) {
      translateElement(element, 'comment');
    }
  });
}

// 翻译单个元素
async function translateElement(element, type) {
  // 提取原文
  const originalText = element.innerText.trim();
  if (!originalText) return;

  // 标记为已处理
  element.classList.add('xhs-translated');
  
  // 添加加载提示
  const loadingDiv = document.createElement('div');
  loadingDiv.className = 'xhs-translation-loading';
  loadingDiv.textContent = 'translating...';
  
  if (type === 'title') {
    const titleLink = element.closest('a.title');
    if (titleLink) {
      const translationContainer = document.createElement('div');
      translationContainer.appendChild(loadingDiv);
      titleLink.appendChild(translationContainer);
    } else {
      element.parentNode.insertBefore(loadingDiv, element.nextSibling);
    }
  } else {
  element.parentNode.insertBefore(loadingDiv, element.nextSibling);
  }
  
  try {
    // 发送翻译请求，添加更详细的prompt
      const response = await chrome.runtime.sendMessage({
        type: 'translate',
        text: originalText,
      targetLang: CONFIG.TARGET_LANG,
        prompt: `You are a cultural translator specializing in Chinese social media content.
              Your task is to translate Chinese text with deep cultural understanding:

              1. For Internet slang and cultural terms (like "留子" meaning overseas Chinese students):
                 - Keep the original term
                 - Add a clear explanation in parentheses
                 Example: "留子" -> "Liuzi (Chinese students studying abroad)"

              2. For cultural references:
                 - Explain the context briefly
                 - Use equivalent Western concepts if applicable
                 Example: "杨超越" -> "Yang Chaoyue (a popular Chinese idol who rose to fame...)"

              3. For wordplay or puns:
                 - Translate the meaning
                 - Explain the wordplay in parentheses
                 Example: "yyds" -> "GOAT (Chinese internet slang for 'Greatest of All Time')"

              4. Format your response as:
                 [Main translation with explanations in parentheses]
                 
              Remember: Your goal is to help non-Chinese speakers fully understand both the meaning AND the cultural context.

                Text to translate: ${originalText}`
      });

      if (response.error) {
      console.error('Translation error:', response.error);
      loadingDiv.remove();
      return;
    }
    
    // 处理翻译结果
    const translatedParts = response.translated.split(/Cultural Notes?:/i);
    const mainTranslation = translatedParts[0].replace(/^Translation:\s*/i, '').trim();
    const culturalNote = translatedParts[1]?.trim();

    if (type === 'title') {
      const titleLink = element.closest('a.title');
      if (titleLink) {
        const translationDiv = document.createElement('div');
        translationDiv.className = 'translation-text';
        translationDiv.textContent = mainTranslation;
        
        // 如果有文化注释，添加到提示中
        if (culturalNote) {
          translationDiv.title = culturalNote;
        }
        
        loadingDiv.parentNode.replaceWith(translationDiv);
      } else {
        const translationDiv = document.createElement('div');
        translationDiv.className = 'translation-text';
        translationDiv.textContent = mainTranslation;
        loadingDiv.replaceWith(translationDiv);
      }
    } else {
      const container = document.createElement('div');
      const translationDiv = document.createElement('div');
      translationDiv.className = 'translation-text';
      translationDiv.textContent = mainTranslation;
      container.appendChild(translationDiv);
      
      if (culturalNote) {
        const noteDiv = document.createElement('div');
        noteDiv.className = 'cultural-note';
        noteDiv.textContent = culturalNote;
        container.appendChild(noteDiv);
      }
      
      loadingDiv.replaceWith(container);
    }

  } catch (error) {
    console.error('Translation failed:', error);
    element.classList.remove('xhs-translated');
    loadingDiv.remove();
  }
}

// 启动翻译功能
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
} 