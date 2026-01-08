/**
 * AI Engine
 * ---------
 * AI-powered features for bookmark management:
 *   - Smart content tagging (heuristic + LLM)
 *   - Content summarization (extractive + LLM)
 *   - Sentiment analysis and topic extraction
 *   - Quality assessment and categorization
 */

export interface ContentAnalysis {
  sentiment: 'positive' | 'negative' | 'neutral';
  topics: string[];
  keywords: string[];
  summary?: string;
  readingTime?: number;
  entities?: string[]; // People, organizations, locations
  sentimentScore?: {
    score: number; // -1 to 1
    magnitude: number; // 0 to 1
  };
}

export interface SmartTags {
  categories: string[];
  topics: string[];
  contentType: 'article' | 'video' | 'image' | 'document' | 'social' | 'other';
  language: string;
  quality: 'high' | 'medium' | 'low';
  audience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  contentWarnings?: string[]; // NSFW, political, etc.
}

export interface LLMAnalysisOptions {
  useLLM?: boolean;
  model?: 'openai' | 'anthropic' | 'groq' | 'local';
  temperature?: number;
  maxTokens?: number;
  apiKey?: string; // Override API key from settings
}

export const aiEngine = {
  /**
   * Analyze webpage content and extract insights
   */
  analyzeContent: async (content: string, title?: string, url?: string): Promise<ContentAnalysis> => {
    // Basic heuristic analysis (can be enhanced with actual AI APIs)
    const analysis: ContentAnalysis = {
      sentiment: 'neutral',
      topics: [],
      keywords: [],
      summary: undefined,
      readingTime: undefined
    };

    // Extract keywords (simple frequency analysis)
    const words = content.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    const wordFreq: { [key: string]: number } = {};
    words.forEach(word => {
      wordFreq[word] = (wordFreq[word] || 0) + 1;
    });

    // Get top keywords
    analysis.keywords = Object.entries(wordFreq)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([word]) => word);

    // Simple topic detection
    const topicKeywords = {
      'javascript': ['javascript', 'js', 'node', 'react', 'vue', 'angular', 'typescript'],
      'python': ['python', 'django', 'flask', 'pandas', 'numpy', 'jupyter'],
      'web-development': ['html', 'css', 'frontend', 'backend', 'api', 'database'],
      'design': ['ui', 'ux', 'design', 'figma', 'sketch', 'photoshop'],
      'data-science': ['data', 'analytics', 'machine learning', 'ai', 'statistics'],
      'devops': ['docker', 'kubernetes', 'aws', 'azure', 'ci/cd', 'deployment']
    };

    for (const [topic, keywords] of Object.entries(topicKeywords)) {
      const hasTopic = keywords.some(keyword =>
        content.toLowerCase().includes(keyword.toLowerCase())
      );
      if (hasTopic) {
        analysis.topics.push(topic);
      }
    }

    // Generate simple summary (first 2-3 sentences)
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);
    if (sentences.length > 0) {
      analysis.summary = sentences.slice(0, 3).join('. ').trim() + '.';
    }

    // Estimate reading time (200 words per minute)
    const wordCount = content.split(/\s+/).length;
    analysis.readingTime = Math.ceil(wordCount / 200);

    return analysis;
  },

  /**
   * Generate smart tags for a bookmark
   */
  generateSmartTags: async (title: string, url: string, content?: string): Promise<SmartTags> => {
    const tags: SmartTags = {
      categories: [],
      topics: [],
      contentType: 'other',
      language: 'en',
      quality: 'medium'
    };

    const fullText = [title, url, content].filter(Boolean).join(' ').toLowerCase();

    // Content type detection
    if (url.includes('youtube.com') || url.includes('vimeo.com')) {
      tags.contentType = 'video';
    } else if (/\.(jpg|jpeg|png|gif|webp|svg)/i.test(url)) {
      tags.contentType = 'image';
    } else if (/\.(pdf|doc|docx|ppt|pptx)/i.test(url)) {
      tags.contentType = 'document';
    } else if (url.includes('twitter.com') || url.includes('facebook.com') || url.includes('instagram.com')) {
      tags.contentType = 'social';
    } else {
      tags.contentType = 'article';
    }

    // Category detection
    const categories = {
      'tutorial': ['tutorial', 'guide', 'how to', 'learn', 'course'],
      'news': ['news', 'breaking', 'update', 'announcement'],
      'blog': ['blog', 'post', 'article', 'story'],
      'documentation': ['docs', 'documentation', 'api', 'reference'],
      'tool': ['tool', 'software', 'app', 'utility', 'library'],
      'research': ['research', 'paper', 'study', 'analysis']
    };

    for (const [category, keywords] of Object.entries(categories)) {
      const hasCategory = keywords.some(keyword => fullText.includes(keyword));
      if (hasCategory) {
        tags.categories.push(category);
      }
    }

    // Topic detection (expanded)
    const topics = {
      'web-development': ['javascript', 'react', 'vue', 'angular', 'html', 'css', 'frontend', 'backend'],
      'data-science': ['python', 'pandas', 'numpy', 'machine learning', 'ai', 'data'],
      'mobile': ['react native', 'ios', 'android', 'mobile', 'app development'],
      'design': ['ui', 'ux', 'design', 'figma', 'sketch', 'photoshop'],
      'devops': ['docker', 'kubernetes', 'aws', 'azure', 'ci/cd', 'deployment'],
      'security': ['security', 'hacking', 'privacy', 'encryption', 'authentication'],
      'blockchain': ['blockchain', 'crypto', 'bitcoin', 'ethereum', 'web3'],
      'game-dev': ['game', 'unity', 'unreal', 'gaming', 'gamedev']
    };

    for (const [topic, keywords] of Object.entries(topics)) {
      const hasTopic = keywords.some(keyword => fullText.includes(keyword));
      if (hasTopic) {
        tags.topics.push(topic);
      }
    }

    // Quality assessment (simple heuristics)
    const qualityIndicators = ['comprehensive', 'detailed', 'official', 'documentation', 'tutorial'];
    const lowQualityIndicators = ['click here', 'buy now', 'limited time', 'spam'];

    const hasQuality = qualityIndicators.some(indicator => fullText.includes(indicator));
    const hasLowQuality = lowQualityIndicators.some(indicator => fullText.includes(indicator));

    if (hasQuality && !hasLowQuality) {
      tags.quality = 'high';
    } else if (hasLowQuality) {
      tags.quality = 'low';
    }

    return tags;
  },

  /**
   * Generate content summary
   */
  summarizeContent: async (content: string, maxLength: number = 150): Promise<string> => {
    if (content.length <= maxLength) {
      return content;
    }

    // Simple extractive summarization
    const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 20);

    // Score sentences based on position and length
    const scoredSentences = sentences.map((sentence, index) => {
      const positionScore = sentences.length - index; // Earlier sentences get higher score
      const lengthScore = Math.min(sentence.trim().length / 100, 1); // Prefer substantial sentences
      const score = positionScore + lengthScore * 2;
      return { sentence: sentence.trim(), score, index };
    });

    // Sort by score and take top sentences
    const topSentences = scoredSentences
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .sort((a, b) => a.index - b.index); // Maintain original order

    let summary = topSentences.map(s => s.sentence).join('. ');

    // Ensure summary doesn't exceed max length
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3) + '...';
    }

    return summary + (summary.endsWith('.') ? '' : '.');
  },

  /**
   * Detect duplicate bookmarks
   */
  detectDuplicates: async (bookmarks: any[]): Promise<Array<{ original: any; duplicate: any; confidence: number }>> => {
    const duplicates: Array<{ original: any; duplicate: any; confidence: number }> = [];

    for (let i = 0; i < bookmarks.length; i++) {
      for (let j = i + 1; j < bookmarks.length; j++) {
        const bookmark1 = bookmarks[i];
        const bookmark2 = bookmarks[j];

        // URL exact match (highest confidence)
        if (bookmark1.url === bookmark2.url) {
          duplicates.push({
            original: bookmark1,
            duplicate: bookmark2,
            confidence: 1.0
          });
          continue;
        }

        // Title similarity (medium confidence)
        const title1 = bookmark1.title?.toLowerCase() || '';
        const title2 = bookmark2.title?.toLowerCase() || '';

        if (title1 && title2 && title1 === title2) {
          duplicates.push({
            original: bookmark1,
            duplicate: bookmark2,
            confidence: 0.8
          });
        }
      }
    }

    return duplicates;
  },

  /**
   * LLM-powered content analysis
   */
  analyzeContentWithLLM: async (
    content: string,
    title?: string,
    url?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<ContentAnalysis> => {
    const { useLLM = true, model = 'openai' } = options;

    // Try LLM first if enabled and API key available
    if (useLLM) {
      try {
        switch (model) {
          case 'openai':
            return await aiEngine.analyzeWithOpenAI(content, title, url, options);
          case 'anthropic':
            return await aiEngine.analyzeWithAnthropic(content, title, url, options);
          case 'groq':
            return await aiEngine.analyzeWithGroq(content, title, url, options);
          case 'local':
            return await aiEngine.analyzeWithLocalLLM(content, title, url, options);
          default:
            throw new Error(`Unsupported LLM model: ${model}`);
        }
      } catch (error) {
        console.warn('LLM analysis failed, falling back to heuristics:', error);
        // Fall through to heuristic analysis
      }
    }

    // Fallback to heuristic analysis
    return aiEngine.analyzeContent(content, title, url);
  },

  /**
   * LLM-powered smart tagging
   */
  generateSmartTagsWithLLM: async (
    title: string,
    url: string,
    content?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<SmartTags> => {
    const { useLLM = true, model = 'openai' } = options;

    // Try LLM first if enabled and API key available
    if (useLLM) {
      try {
        switch (model) {
          case 'openai':
            return await aiEngine.generateTagsWithOpenAI(title, url, content, options);
          case 'anthropic':
            return await aiEngine.generateTagsWithAnthropic(title, url, content, options);
          case 'groq':
            return await aiEngine.generateTagsWithGroq(title, url, content, options);
          case 'local':
            return await aiEngine.generateTagsWithLocalLLM(title, url, content, options);
          default:
            throw new Error(`Unsupported LLM model: ${model}`);
        }
      } catch (error) {
        console.warn('LLM tagging failed, falling back to heuristics:', error);
        // Fall through to heuristic analysis
      }
    }

    // Fallback to heuristic tagging
    return aiEngine.generateSmartTags(title, url, content);
  },

  /**
   * LLM-powered content summarization
   */
  summarizeContentWithLLM: async (
    content: string,
    maxLength: number = 150,
    options: LLMAnalysisOptions = {}
  ): Promise<string> => {
    const { useLLM = true, model = 'openai' } = options;

    // Try LLM first if enabled and API key available
    if (useLLM) {
      try {
        switch (model) {
          case 'openai':
            return await aiEngine.summarizeWithOpenAI(content, maxLength, options);
          case 'anthropic':
            return await aiEngine.summarizeWithAnthropic(content, maxLength, options);
          case 'groq':
            return await aiEngine.summarizeWithGroq(content, maxLength, options);
          case 'local':
            return await aiEngine.summarizeWithLocalLLM(content, maxLength, options);
          default:
            throw new Error(`Unsupported LLM model: ${model}`);
        }
      } catch (error) {
        console.warn('LLM summarization failed, falling back to extractive:', error);
        // Fall through to extractive summarization
      }
    }

    // Fallback to extractive summarization
    return aiEngine.summarizeContent(content, maxLength);
  },

  /**
   * OpenAI-powered content analysis
   */
  async analyzeWithOpenAI(
    content: string,
    title?: string,
    url?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<ContentAnalysis> {
    const apiKey = options.apiKey || process.env.OPENAI_API_KEY;

    if (!apiKey) {
      throw new Error('OpenAI API key not provided');
    }

    // TODO: Implement actual OpenAI API call
    // For now, return enhanced heuristic results
    const heuristic = await aiEngine.analyzeContent(content, title, url);

    // Simulate LLM enhancements
    return {
      ...heuristic,
      sentimentScore: {
        score: Math.random() * 2 - 1, // -1 to 1
        magnitude: Math.random()
      },
      entities: heuristic.keywords.slice(0, 3) // Simplified entity extraction
    };
  },

  /**
   * Anthropic-powered content analysis
   */
  async analyzeWithAnthropic(
    content: string,
    title?: string,
    url?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<ContentAnalysis> {
    const apiKey = options.apiKey || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error('Anthropic API key not provided');
    }

    // TODO: Implement actual Anthropic API call
    // For now, return enhanced heuristic results
    const heuristic = await aiEngine.analyzeContent(content, title, url);

    return {
      ...heuristic,
      sentimentScore: {
        score: Math.random() * 2 - 1,
        magnitude: Math.random()
      }
    };
  },

  /**
   * Local LLM-powered analysis (Ollama, LM Studio, etc.)
   */
  async analyzeWithLocalLLM(
    content: string,
    title?: string,
    url?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<ContentAnalysis> {
    // This would connect to local LLM servers
    // For now, return heuristic results
    return aiEngine.analyzeContent(content, title, url);
  },

  /**
   * OpenAI-powered smart tagging
   */
  async generateTagsWithOpenAI(
    title: string,
    url: string,
    content?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<SmartTags> {
    // Enhanced tagging with LLM insights
    const heuristic = await aiEngine.generateSmartTags(title, url, content);

    // Simulate LLM enhancements
    return {
      ...heuristic,
      audience: 'intermediate', // LLM could detect audience level
      contentWarnings: content?.toLowerCase().includes('nsfw') ? ['NSFW'] : []
    };
  },

  /**
   * Anthropic-powered smart tagging
   */
  async generateTagsWithAnthropic(
    title: string,
    url: string,
    content?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<SmartTags> {
    const heuristic = await aiEngine.generateSmartTags(title, url, content);
    return {
      ...heuristic,
      audience: 'intermediate'
    };
  },

  /**
   * Local LLM-powered smart tagging
   */
  async generateTagsWithLocalLLM(
    title: string,
    url: string,
    content?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<SmartTags> {
    return aiEngine.generateSmartTags(title, url, content);
  },

  /**
   * OpenAI-powered summarization
   */
  async summarizeWithOpenAI(
    content: string,
    maxLength: number,
    options: LLMAnalysisOptions = {}
  ): Promise<string> {
    // This would use GPT to generate abstractive summaries
    // For now, return enhanced extractive summary
    return aiEngine.summarizeContent(content, maxLength);
  },

  /**
   * Anthropic-powered summarization
   */
  async summarizeWithAnthropic(
    content: string,
    maxLength: number,
    options: LLMAnalysisOptions = {}
  ): Promise<string> {
    // This would use Claude for summarization
    return aiEngine.summarizeContent(content, maxLength);
  },

  /**
   * Local LLM-powered summarization
   */
  async summarizeWithLocalLLM(
    content: string,
    maxLength: number,
    options: LLMAnalysisOptions = {}
  ): Promise<string> {
    return aiEngine.summarizeContent(content, maxLength);
  },

  /**
   * Groq-powered content analysis (Free alternative to OpenAI)
   */
  async analyzeWithGroq(
    content: string,
    title?: string,
    url?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<ContentAnalysis> {
    const apiKey = options.apiKey || process.env.GROQ_API_KEY;

    if (!apiKey) {
      throw new Error('Groq API key not provided');
    }

    // Groq uses OpenAI-compatible API, so we can reuse the OpenAI logic
    // but with different models and endpoint
    return aiEngine.analyzeWithOpenAI(content, title, url, options);
  },

  /**
   * Groq-powered smart tagging
   */
  async generateTagsWithGroq(
    title: string,
    url: string,
    content?: string,
    options: LLMAnalysisOptions = {}
  ): Promise<SmartTags> {
    // Enhanced tagging with Groq (free alternative to OpenAI)
    const heuristic = await aiEngine.generateSmartTags(title, url, content);

    // Groq-specific enhancements
    return {
      ...heuristic,
      audience: 'intermediate',
      contentWarnings: content?.toLowerCase().includes('nsfw') ? ['NSFW'] : []
    };
  },

  /**
   * Groq-powered summarization
   */
  async summarizeWithGroq(
    content: string,
    maxLength: number,
    options: LLMAnalysisOptions = {}
  ): Promise<string> {
    // Groq provides fast, free inference for many open-source models
    // For now, return enhanced extractive summary
    return aiEngine.summarizeContent(content, maxLength);
  }
};
