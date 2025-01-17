// @ts-check
/// <reference types="chrome"/>

// API Configuration
const API_CONFIG = {
  PROXY_URL: 'https://xhs-ebon.vercel.app/translate',
  MAX_RETRIES: 3,
  CACHE_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours cache expiry
  RETRY_DELAYS: [1000, 2000, 4000], // Incremental retry delays
  TRANSLATION_MODES: {
    AUTO: 'auto',      // Auto detect language
    CH_TO_EN: 'ch2en', // Chinese to English
    EN_TO_CH: 'en2ch'  // English to Chinese
  },
  // Common reply templates
  REPLY_TEMPLATES: {
    thanks: {
      zh: '谢谢你的评论！',
      en: 'Thank you for your comment!'
    },
    follow_back: {
      zh: '已回关，期待你的更多内容！',
      en: 'Followed back, looking forward to your content!'
    }
  },
  // Cultural explanation prompt templates
  CULTURE_PROMPTS: {
    BASIC: `You are a cultural interpreter helping international users understand Chinese social media content. 
    Explain the following text, including:
    1. Basic meaning
    2. Cultural context
    3. Current usage
    4. Similar expressions in English`,
    
    INTERNET_SLANG: `As a Chinese internet culture expert, explain this internet slang/expression:
    1. Literal meaning
    2. How it originated
    3. Current usage and variations
    4. Popular examples
    5. Cultural significance`,
    
    TREND_CONTEXT: `Explain this Chinese social media trend:
    1. What is it about
    2. Why it's popular
    3. Cultural background
    4. How international creators can participate`,
    
    SOCIAL_NORMS: `Explain these Chinese social media interaction norms:
    1. What's the appropriate way to respond
    2. Cultural expectations
    3. Common mistakes to avoid
    4. Tips for international creators`,
    
    REGIONAL: `Explain the regional context of this Chinese expression:
    1. Which region it's commonly used in
    2. Local cultural significance
    3. How it might be perceived in different regions
    4. Tips for appropriate usage`,
    
    CONTENT_TYPE: {
      BEAUTY: `Explain this beauty-related Chinese expression:
      1. Common usage in beauty community
      2. Related beauty trends
      3. Product category implications
      4. International beauty market context`,
      
      FOOD: `Explain this food-related Chinese expression:
      1. Culinary context
      2. Regional food culture
      3. Popular food trends
      4. International food scene comparison`,
      
      LIFESTYLE: `Explain this lifestyle-related Chinese expression:
      1. Modern Chinese lifestyle context
      2. Social implications
      3. Generational differences
      4. International lifestyle comparisons`
    }
  },
  // Explanation types
  EXPLANATION_TYPES: {
    SLANG: 'internet_slang',
    TREND: 'trending_topic',
    CUSTOM: 'custom_phrase',
    SOCIAL: 'social_norm'
  },
  // Usage statistics related
  STATS: {
    MAX_HISTORY: 100,    // Keep last 100 records
    SYNC_INTERVAL: 3600000 // Sync every hour
  },
  // API cost control
  COST_CONTROL: {
    MAX_INPUT_LENGTH: 1000,    // Maximum input length per request
    MAX_DAILY_TOKENS: 100000,  // Maximum daily token usage
    MAX_REQUEST_PER_MIN: 10,   // Maximum requests per minute
    CACHE_TTL: {
      TRANSLATION: 24 * 60 * 60 * 1000,     // Translation cache: 24 hours
      CULTURAL: 7 * 24 * 60 * 60 * 1000,    // Cultural explanation cache: 7 days
      TRENDING: 60 * 60 * 1000              // Trending topics cache: 1 hour
    },
    // Feature priorities
    PRIORITY: {
      TRANSLATION: 1,          // Highest priority
      CULTURAL_CONTEXT: 2,
      SENTIMENT: 3,
      TITLE_OPTIMIZATION: 4,
      COMPLIANCE: 5
    }
  },
  // Optimized prompt templates (shorter but effective)
  OPTIMIZED_PROMPTS: {
    TRANSLATION: 'Translate to {lang}:',
    CULTURAL: 'Explain Chinese {type}: meaning, context, usage.',
    SENTIMENT: 'Analyze sentiment: positive/negative/neutral, intent.',
    TITLE: 'Optimize title: SEO, tags, length.',
    COMPLIANCE: 'Check content compliance: issues, suggestions.'
  }
};

// 缓存系统
class TranslationCache {
  constructor() {
    this.cache = new Map();
    this.cleanup();
  }

  set(key, value) {
    this.cache.set(key, {
      value,
      timestamp: Date.now()
    });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    // 检查是否过期
    if (Date.now() - item.timestamp > API_CONFIG.CACHE_EXPIRY) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  // 清理过期缓存
  cleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, item] of this.cache.entries()) {
        if (now - item.timestamp > API_CONFIG.CACHE_EXPIRY) {
          this.cache.delete(key);
        }
      }
    }, API_CONFIG.CACHE_EXPIRY);
  }
}

const translationCache = new TranslationCache();

// 添加使用统计功能
class UsageStats {
  constructor() {
    this.stats = {
      translations: 0,
      culturalExplanations: 0,
      replies: 0,
      errorCount: 0,
      lastSync: Date.now()
    };
    this.history = [];
    this.loadStats();
  }

  async loadStats() {
    const saved = await chrome.storage.local.get(['usageStats', 'usageHistory']);
    if (saved.usageStats) {
      this.stats = saved.usageStats;
    }
    if (saved.usageHistory) {
      this.history = saved.usageHistory;
    }
  }

  async saveStats() {
    await chrome.storage.local.set({
      usageStats: this.stats,
      usageHistory: this.history
    });
  }

  logUsage(type, success, details = {}) {
    // 更新计数
    if (success) {
      this.stats[type] = (this.stats[type] || 0) + 1;
    } else {
      this.stats.errorCount++;
    }

    // 添加到历史记录
    this.history.unshift({
      type,
      success,
      timestamp: Date.now(),
      details
    });

    // 保持历史记录在限定大小内
    if (this.history.length > API_CONFIG.STATS.MAX_HISTORY) {
      this.history.pop();
    }

    // 定期保存
    this.saveStats();
  }

  getStats() {
    return {
      stats: this.stats,
      recentHistory: this.history.slice(0, 10) // 返回最近10条记录
    };
  }
}

const usageStats = new UsageStats();

// 添加用户反馈功能
async function submitFeedback(feedback) {
  try {
    const response = await fetch(API_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'feedback',
        feedback
      })
    });

    if (!response.ok) {
      throw new Error('Failed to submit feedback');
    }

    return { success: true };
  } catch (error) {
    console.error('Feedback submission failed:', error);
    return { success: false, error: error.message };
  }
}

// 处理来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.type) {
    case 'translate':
      handleTranslation(request)
        .then(sendResponse)
        .catch(error => {
          console.error('Translation error:', error);
          sendResponse({ 
            error: error.message,
            code: error.code || 'UNKNOWN_ERROR'
          });
        });
      return true;
    
    case 'getTrends':
      getTrendingTopics()
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
    
    case 'checkCompliance':
      checkContentCompliance(request.content)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
    
    case 'suggestReply':
      suggestReply(request.comment)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
    
    case 'getStats':
      sendResponse(usageStats.getStats());
      return false;
    
    case 'submitFeedback':
      submitFeedback(request.feedback)
        .then(sendResponse)
        .catch(error => sendResponse({ error: error.message }));
      return true;
  }
});

// 自定义错误类
class TranslationError extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
}

// 处理翻译请求
async function handleTranslation(request) {
  // 输入验证
  if (!request.text?.trim()) {
    throw new TranslationError('Text is required', 'EMPTY_TEXT');
  }

  if (!request.targetLang) {
    throw new TranslationError('Target language is required', 'NO_TARGET_LANG');
  }

  const cacheKey = `${request.text}_${request.targetLang}`;
  
  // 检查缓存
  const cachedTranslation = translationCache.get(cacheKey);
  if (cachedTranslation) {
    return { translated: cachedTranslation };
  }

  let lastError;
  for (let i = 0; i < API_CONFIG.MAX_RETRIES; i++) {
    try {
      const translation = await translateText(request.text, request.targetLang);
      translationCache.set(cacheKey, translation);
      usageStats.logUsage('translations', true, { targetLang: request.targetLang });
      return { translated: translation };
    } catch (error) {
      lastError = error;
      if (i < API_CONFIG.MAX_RETRIES - 1) {
        // 使用递增延迟
        await new Promise(resolve => 
          setTimeout(resolve, API_CONFIG.RETRY_DELAYS[i])
        );
      }
    }
  }

  // 所有重试都失败
  throw new TranslationError(
    `Translation failed after ${API_CONFIG.MAX_RETRIES} retries: ${lastError.message}`,
    'MAX_RETRIES_EXCEEDED'
  );
}

// 通过代理服务器请求翻译
async function translateText(text, targetLang) {
  try {
    const response = await fetch(API_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type: 'translate',
        text,
        targetLang
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.translated;
  } catch (error) {
    console.error('Translation request failed:', error);
    throw new Error('Translation request failed: ' + error.message);
  }
}

// 监听安装事件
chrome.runtime.onInstalled.addListener(() => {
  // 清除旧缓存
  translationCache.cache.clear();
});

// 增强的文化解释功能
async function enhancedCulturalContext(text, context = {}) {
  // 创建解释缓存键
  const cacheKey = `culture_${text}_${context.type || 'basic'}`;
  
  // 检查缓存
  const cachedExplanation = translationCache.get(cacheKey);
  if (cachedExplanation) {
    return cachedExplanation;
  }

  // 确定解释类型
  const explanationType = determineExplanationType(text, context);
  
  // 构建提示词
  const prompt = buildCulturePrompt(text, explanationType, context);
  
  try {
    // 调用AI获取解释
    const explanation = await getAIExplanation(prompt);
    
    // 处理和格式化结果
    const formattedExplanation = formatCulturalExplanation(explanation, explanationType);
    
    // 缓存结果
    translationCache.set(cacheKey, formattedExplanation);
    
    return formattedExplanation;
  } catch (error) {
    console.error('Cultural explanation error:', error);
    // 降级到基本解释
    return getBasicExplanation(text);
  }
}

// 确定解释类型
function determineExplanationType(text, context) {
  // 检查是否是已知的网络用语
  if (isInternetSlang(text)) {
    return API_CONFIG.EXPLANATION_TYPES.SLANG;
  }
  
  // 检查是否是热门话题
  if (isTrendingTopic(text)) {
    return API_CONFIG.EXPLANATION_TYPES.TREND;
  }
  
  // 检查是否是社交规范相关
  if (isSocialNorm(text)) {
    return API_CONFIG.EXPLANATION_TYPES.SOCIAL;
  }
  
  return API_CONFIG.EXPLANATION_TYPES.CUSTOM;
}

// 构建文化解释提示词
function buildCulturePrompt(text, type, context) {
  let basePrompt = API_CONFIG.CULTURE_PROMPTS.BASIC;
  
  switch (type) {
    case API_CONFIG.EXPLANATION_TYPES.SLANG:
      basePrompt = API_CONFIG.CULTURE_PROMPTS.INTERNET_SLANG;
      break;
    case API_CONFIG.EXPLANATION_TYPES.TREND:
      basePrompt = API_CONFIG.CULTURE_PROMPTS.TREND_CONTEXT;
      break;
    case API_CONFIG.EXPLANATION_TYPES.SOCIAL:
      basePrompt = API_CONFIG.CULTURE_PROMPTS.SOCIAL_NORMS;
      break;
  }
  
  // 添加上下文信息
  return `${basePrompt}\n\nText: ${text}\nContext: ${JSON.stringify(context)}`;
}

// 调用AI获取解释
async function getAIExplanation(prompt) {
  const response = await fetch(API_CONFIG.PROXY_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      type: 'culture_explanation',
      prompt: prompt
    })
  });

  if (!response.ok) {
    throw new Error('Failed to get AI explanation');
  }

  return response.json();
}

// 格式化文化解释
function formatCulturalExplanation(explanation, type) {
  return {
    type,
    brief: explanation.brief,
    detailed: explanation.detailed,
    examples: explanation.examples,
    tips: explanation.tips,
    relatedTopics: explanation.related,
    timestamp: Date.now()
  };
}

// 获取基本解释（降级方案）
function getBasicExplanation(text) {
  return {
    type: API_CONFIG.EXPLANATION_TYPES.CUSTOM,
    brief: `Expression: ${text}`,
    detailed: 'Basic translation and context',
    examples: [],
    tips: ['Consider asking native speakers for more context'],
    timestamp: Date.now()
  };
}

// 添加智能回复建议
async function suggestReply(comment) {
  const sentiment = await analyzeSentiment(comment);
  const suggestions = [];
  
  if (sentiment.isPositive) {
    suggestions.push(API_CONFIG.REPLY_TEMPLATES.thanks);
  }
  if (sentiment.isFollowRequest) {
    suggestions.push(API_CONFIG.REPLY_TEMPLATES.follow_back);
  }
  
  return suggestions;
}

// 标题优化建议
async function optimizeTitle(title, targetLang) {
  const translation = await translateText(title, targetLang);
  const suggestions = await analyzeTitleSEO(translation);
  
  return {
    translation,
    suggestions: {
      seo: suggestions.seoTips,
      trending: suggestions.trendingTags,
      length: suggestions.lengthOptimization
    }
  };
}

// 内容合规检查
async function checkContentCompliance(content) {
  const analysis = await analyzeContent(content);
  return {
    isCompliant: analysis.compliant,
    warnings: analysis.warnings,
    suggestions: analysis.suggestions
  };
}

// 热门话题推荐
async function getTrendingTopics() {
  const trends = await fetchTrendingTopics();
  return {
    topics: trends.map(topic => ({
      chinese: topic.name,
      english: topic.translation,
      popularity: topic.score,
      description: topic.explanation
    }))
  };
}

// 网络用语检测
function isInternetSlang(text) {
  // 常见网络用语特征
  const slangPatterns = [
    /[0-9]{2,}/,           // 数字梗，如666
    /[A-Za-z]+[0-9]+/,     // 字母数字组合
    /[啊哦噢]{3,}/,        // 修复：重复语气词
    /[?!？！]{2,}/,        // 重复标点
    /[xX]+/,               // 笑的变体
  ];

  // 特殊词汇列表
  const slangWords = [
    '神器', '爆款', '真香', '奈斯', '稳', '秒杀',
    '带货', '冲', '破防', '上头', '绝绝子', '无语'
  ];

  // 检查模式匹配
  const hasPattern = slangPatterns.some(pattern => pattern.test(text));
  // 检查特殊词汇
  const hasSlangWord = slangWords.some(word => text.includes(word));

  return hasPattern || hasSlangWord;
}

// 热门话题检测
function isTrendingTopic(text) {
  // 话题标记特征
  const topicPatterns = [
    /#[\u4e00-\u9fa5a-zA-Z0-9]+#/, // 话题标签
    /@[\u4e00-\u9fa5a-zA-Z0-9]+/,  // @提及
    /【[\u4e00-\u9fa5]+】/,         // 标题格式
  ];

  // 热门话题关键词
  const trendingKeywords = [
    '挑战', '活动', '潮流', '新品',
    '种草', '测评', '首发', '探店'
  ];

  return topicPatterns.some(pattern => pattern.test(text)) ||
         trendingKeywords.some(keyword => text.includes(keyword));
}

// 社交规范相关检测
function isSocialNorm(text) {
  // 社交互动关键词
  const socialKeywords = [
    '感谢', '谢谢', '抱歉', '不好意思',
    '请问', '建议', '回复', '私信'
  ];

  // 礼貌用语模式
  const politenessPatterns = [
    /[请您]/,
    /[谢感]/,
    /[问询]/
  ];

  return socialKeywords.some(keyword => text.includes(keyword)) ||
         politenessPatterns.some(pattern => pattern.test(text));
}

// 情感分析
async function analyzeSentiment(text) {
  const prompt = `Analyze the sentiment and intent of this Chinese social media comment:
  "${text}"
  
  Consider:
  1. Overall sentiment (positive/negative/neutral)
  2. User intent (question/compliment/complaint/suggestion)
  3. If it's a follow request
  4. If it needs immediate response
  5. Cultural context implications`;

  try {
    const response = await fetch(API_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'sentiment_analysis',
        prompt: prompt,
        text: text
      })
    });

    const analysis = await response.json();
    return {
      isPositive: analysis.sentiment === 'positive',
      isFollowRequest: analysis.intent.includes('follow'),
      needsResponse: analysis.needsResponse,
      sentiment: analysis.sentiment,
      intent: analysis.intent
    };
  } catch (error) {
    console.error('Sentiment analysis failed:', error);
    // 返回默认值
    return {
      isPositive: false,
      isFollowRequest: false,
      needsResponse: true,
      sentiment: 'neutral',
      intent: 'unknown'
    };
  }
}

// 标题SEO分析
async function analyzeTitleSEO(title) {
  const prompt = `Analyze this Chinese social media title for optimization:
  "${title}"
  
  Provide:
  1. SEO suggestions
  2. Popular related hashtags
  3. Length optimization
  4. Engagement potential
  5. Cultural sensitivity check`;

  try {
    const response = await fetch(API_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'title_analysis',
        prompt: prompt,
        title: title
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Title analysis failed:', error);
    return {
      seoTips: ['Keep the title clear and concise'],
      trendingTags: [],
      lengthOptimization: 'Title length is acceptable'
    };
  }
}

// 内容合规性分析
async function analyzeContent(content) {
  const prompt = `Check this Chinese social media content for compliance:
  "${content}"
  
  Check for:
  1. Prohibited content
  2. Sensitive topics
  3. Cultural appropriateness
  4. Platform guidelines
  5. Best practices`;

  try {
    const response = await fetch(API_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'compliance_check',
        prompt: prompt,
        content: content
      })
    });

    return await response.json();
  } catch (error) {
    console.error('Compliance check failed:', error);
    return {
      compliant: true,
      warnings: [],
      suggestions: ['Unable to perform detailed compliance check']
    };
  }
}

// 获取热门话题
async function fetchTrendingTopics() {
  try {
    const response = await fetch(API_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'trending_topics'
      })
    });

    const data = await response.json();
    return data.topics.map(topic => ({
      name: topic.name,
      translation: topic.translation,
      score: topic.popularity,
      explanation: topic.description
    }));
  } catch (error) {
    console.error('Failed to fetch trending topics:', error);
    return [];
  }
}

// 添加Token计数器
class TokenCounter {
  constructor() {
    this.dailyCount = 0;
    this.lastReset = Date.now();
    this.loadCount();
  }

  async loadCount() {
    const saved = await chrome.storage.local.get(['tokenCount', 'lastReset']);
    if (saved.tokenCount && saved.lastReset) {
      // 检查是否需要重置（新的一天）
      if (this.isNewDay(saved.lastReset)) {
        this.resetCount();
      } else {
        this.dailyCount = saved.tokenCount;
        this.lastReset = saved.lastReset;
      }
    }
  }

  async saveCount() {
    await chrome.storage.local.set({
      tokenCount: this.dailyCount,
      lastReset: this.lastReset
    });
  }

  isNewDay(timestamp) {
    const date1 = new Date(timestamp);
    const date2 = new Date();
    return date1.getUTCDate() !== date2.getUTCDate();
  }

  resetCount() {
    this.dailyCount = 0;
    this.lastReset = Date.now();
    this.saveCount();
  }

  async addTokens(count) {
    if (await this.checkLimit(count)) {
      this.dailyCount += count;
      this.saveCount();
      return true;
    }
    return false;
  }

  async checkLimit(additionalTokens = 0) {
    await this.loadCount(); // 确保数据最新
    return (this.dailyCount + additionalTokens) <= API_CONFIG.COST_CONTROL.MAX_DAILY_TOKENS;
  }

  getEstimatedTokens(text) {
    // 简单估算：中文每字算2token，英文每单词算1token
    const chineseLength = (text.match(/[\u4e00-\u9fa5]/g) || []).length * 2;
    const englishWords = (text.match(/[a-zA-Z]+/g) || []).length;
    return chineseLength + englishWords;
  }
}

const tokenCounter = new TokenCounter();

// 请求队列管理
class RequestQueue {
  constructor() {
    this.queue = [];
    this.processing = false;
    this.requestsThisMinute = 0;
    this.lastMinuteReset = Date.now();
  }

  async add(request) {
    // 检查频率限制
    if (this.checkRateLimit()) {
      this.queue.push(request);
      if (!this.processing) {
        this.processQueue();
      }
    } else {
      throw new Error('Rate limit exceeded');
    }
  }

  checkRateLimit() {
    const now = Date.now();
    if (now - this.lastMinuteReset >= 60000) {
      this.requestsThisMinute = 0;
      this.lastMinuteReset = now;
    }
    return this.requestsThisMinute < API_CONFIG.COST_CONTROL.MAX_REQUEST_PER_MIN;
  }

  async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const request = this.queue.shift();
    
    try {
      // 估算token数量
      const estimatedTokens = tokenCounter.getEstimatedTokens(request.text);
      
      // 检查是否超出每日限额
      if (!await tokenCounter.checkLimit(estimatedTokens)) {
        throw new Error('Daily token limit exceeded');
      }

      // 处理请求
      const result = await this.processRequest(request);
      
      // 更新token计数
      await tokenCounter.addTokens(estimatedTokens);
      
      request.resolve(result);
    } catch (error) {
      request.reject(error);
    }

    // 处理下一个请求
    setTimeout(() => this.processQueue(), 100);
  }

  async processRequest(request) {
    // 根据请求类型和优先级处理
    switch (request.type) {
      case 'translate':
        return this.handleTranslation(request);
      case 'cultural':
        // 直接调用外部函数而不是类方法
        return enhancedCulturalContext(request.text, request.context);
      default:
        throw new Error('Unsupported request type');
    }
  }

  async handleTranslation(request) {
    const response = await fetch(API_CONFIG.PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'translate',
        text: request.text,
        targetLang: request.targetLang
      })
    });

    if (!response.ok) {
      throw new Error('Translation request failed');
    }

    const data = await response.json();
    return data.translated;
  }
}

const requestQueue = new RequestQueue(); 