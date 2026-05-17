import { describe, it, expect } from 'vitest';
import { 
  calculateSimilarity, 
  calculateStringSimilarity, 
  lcs,
  generateTopicTags,
  findSimilarArrangements,
  parseMessageForArrangement,
  createDraftArrangement,
  parseGroupChatForArrangements,
  detectCompletion,
  batchParseMessages
} from './aiParser';
import type { ArrangementItem } from '../types/arrangement';

describe('AI Parser - 消息解析', () => {
  it('parseMessageForArrangement 应该正确解析带时间的消息', async () => {
    const result = await parseMessageForArrangement('明天下午3点去医院');
    expect(result.success).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.5);
    expect(result.location).toBe('医院');
  });

  it('parseMessageForArrangement 应该正确解析带人物的消息', async () => {
    const result = await parseMessageForArrangement('帮张三带早餐');
    expect(result.success).toBe(true);
    expect(result.people).toContain('张三');
  });

  it('parseMessageForArrangement 对无意义消息返回失败', async () => {
    const result = await parseMessageForArrangement('～～');
    expect(result.success).toBe(false);
  });

  it('createDraftArrangement 应该创建草稿安排', async () => {
    const result = await createDraftArrangement('明天去医院', 'conv-1', 'msg-1', '张三');
    expect(result).not.toBeNull();
    expect(result?.title).toBe('明天去医院');
    expect(result?.isDraft).toBe(true);
    expect(result?.source).toBe('ai');
  });
});

describe('AI Parser - 群聊上下文识别', () => {
  it('parseGroupChatForArrangements 应该识别群聊中的安排', async () => {
    const context = {
      conversationId: 'group-1',
      participants: [
        { id: 'user1', name: '张三' },
        { id: 'user2', name: '李四' },
        { id: 'user3', name: '王五' },
      ],
      messages: [
        { id: 'm1', senderId: 'user1', senderName: '张三', content: '李四，帮我带个早餐', timestamp: Date.now() },
        { id: 'm2', senderId: 'user2', senderName: '李四', content: '好的', timestamp: Date.now() + 1000 },
      ],
    };

    const result = await parseGroupChatForArrangements(context, 'user2');
    expect(result.success).toBe(true);
    expect(result.arrangements.length).toBe(1);
    expect(result.arrangements[0].targetPersonName).toBe('张三');
  });

  it('parseGroupChatForArrangements 应该识别连续对话中的多个任务', async () => {
    const context = {
      conversationId: 'group-1',
      participants: [
        { id: 'user1', name: '张三' },
        { id: 'user2', name: '李四' },
      ],
      messages: [
        { id: 'm1', senderId: 'user1', senderName: '张三', content: '李四帮我带A', timestamp: Date.now() },
        { id: 'm2', senderId: 'user2', senderName: '李四', content: '好的', timestamp: Date.now() + 1000 },
        { id: 'm3', senderId: 'user1', senderName: '张三', content: '再帮我带B', timestamp: Date.now() + 2000 },
        { id: 'm4', senderId: 'user2', senderName: '李四', content: '没问题', timestamp: Date.now() + 3000 },
      ],
    };

    const result = await parseGroupChatForArrangements(context, 'user2');
    expect(result.success).toBe(true);
    expect(result.arrangements.length).toBe(2);
  });
});

describe('AI Parser - 自动完成检测', () => {
  it('detectCompletion 应该检测到完成状态', () => {
    const arrangement: ArrangementItem = {
      id: '1',
      title: '去医院检查',
      note: '明天去医院体检',
      status: 'pending',
      priority: 'medium',
      scheduledAt: Date.now() - 1000,
      people: ['王医生'],
      location: '口腔医院',
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      snoozedAt: null,
      contexts: [],
      relatedIds: [],
      reminderAt: null,
      isRepeating: false,
      repeatPattern: null,
      isDraft: false,
      aiConfidence: 0.8,
      origin: null,
      topicTags: ['医疗'],
      mergedWith: null,
      mergeSuggestions: [],
    };

    const messages = [
      { content: '我今天上午去医院体检了', timestamp: Date.now() },
      { content: '身体没啥情况', timestamp: Date.now() + 1000 },
    ];

    const result = detectCompletion(arrangement, messages);
    expect(result.isCompleted).toBe(true);
    expect(result.confidence).toBeGreaterThan(0.6);
  });

  it('detectCompletion 不应该误判未完成的安排', () => {
    const arrangement: ArrangementItem = {
      id: '1',
      title: '去医院检查',
      note: '明天去医院体检',
      status: 'pending',
      priority: 'medium',
      scheduledAt: Date.now() + 86400000,
      people: ['王医生'],
      location: '口腔医院',
      source: 'manual',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      snoozedAt: null,
      contexts: [],
      relatedIds: [],
      reminderAt: null,
      isRepeating: false,
      repeatPattern: null,
      isDraft: false,
      aiConfidence: 0.8,
      origin: null,
      topicTags: ['医疗'],
      mergedWith: null,
      mergeSuggestions: [],
    };

    const messages = [
      { content: '明天天气不错', timestamp: Date.now() },
      { content: '记得带伞', timestamp: Date.now() + 1000 },
    ];

    const result = detectCompletion(arrangement, messages);
    expect(result.isCompleted).toBe(false);
    expect(result.confidence).toBeLessThan(0.6);
  });
});

describe('AI Parser - 批量解析', () => {
  it('batchParseMessages 应该批量解析消息', async () => {
    const messages = [
      { id: 'm1', content: '明天去医院', senderId: 'user1', senderName: '张三', conversationId: 'conv-1', timestamp: Date.now() },
      { id: 'm2', content: '～～', senderId: 'user1', senderName: '张三', conversationId: 'conv-1', timestamp: Date.now() + 1000 },
      { id: 'm3', content: '后天下午开会', senderId: 'user2', senderName: '李四', conversationId: 'conv-1', timestamp: Date.now() + 2000 },
    ];

    const result = await batchParseMessages(messages, 'user1');
    expect(result.length).toBe(2);
    expect(result[0].confidence).toBeGreaterThan(result[1].confidence);
  });
});

describe('AI Parser - 字符串相似度', () => {
  it('lcs 应该正确计算最长公共子序列', () => {
    expect(lcs('abcde', 'ace')).toBe(3);
    expect(lcs('abc', 'def')).toBe(0);
    expect(lcs('产品规划会议', '产品评审会')).toBe(3);
  });

  it('calculateStringSimilarity 应该返回正确的相似度分数', () => {
    expect(calculateStringSimilarity('产品规划会议', '产品规划会议')).toBe(1);
    expect(calculateStringSimilarity('产品规划会议', '产品评审会')).toBeGreaterThan(0.5);
    expect(calculateStringSimilarity('会议', '产品规划会议')).toBeGreaterThan(0);
    expect(calculateStringSimilarity('abc', 'def')).toBe(0);
  });
});

describe('AI Parser - 主题标签生成', () => {
  it('应该根据标题生成正确的主题标签', () => {
    expect(generateTopicTags('产品规划会议')).toContain('工作');
    expect(generateTopicTags('产品规划会议')).toContain('会议');
    expect(generateTopicTags('约医生看牙')).toContain('医疗');
    expect(generateTopicTags('健身训练')).toContain('健康');
    expect(generateTopicTags('和朋友聚餐')).toContain('社交');
  });
});

describe('AI Parser - 相似安排检测', () => {
  const now = Date.now();
  
  const arrangements: ArrangementItem[] = [
    {
      id: '1',
      title: '产品规划会议',
      note: '讨论Q2产品路线图',
      status: 'pending',
      priority: 'high',
      scheduledAt: now + 2 * 60 * 60 * 1000,
      people: ['张三', '李四'],
      location: '会议室A',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      snoozedAt: null,
      contexts: [],
      relatedIds: [],
      reminderAt: null,
      isRepeating: false,
      repeatPattern: null,
      isDraft: false,
      aiConfidence: 0,
      origin: null,
      topicTags: ['工作', '会议'],
      mergedWith: null,
      mergeSuggestions: []
    },
    {
      id: '2',
      title: '产品评审会',
      note: '评审新功能设计稿',
      status: 'pending',
      priority: 'high',
      scheduledAt: now + 3 * 60 * 60 * 1000,
      people: ['张三', '李四'],
      location: '会议室A',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      snoozedAt: null,
      contexts: [],
      relatedIds: [],
      reminderAt: null,
      isRepeating: false,
      repeatPattern: null,
      isDraft: false,
      aiConfidence: 0,
      origin: null,
      topicTags: ['工作', '会议'],
      mergedWith: null,
      mergeSuggestions: []
    },
    {
      id: '3',
      title: '约医生看牙',
      note: '定期检查',
      status: 'pending',
      priority: 'medium',
      scheduledAt: now + 24 * 60 * 60 * 1000,
      people: ['王医生'],
      location: '口腔医院',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      snoozedAt: null,
      contexts: [],
      relatedIds: [],
      reminderAt: null,
      isRepeating: false,
      repeatPattern: null,
      isDraft: false,
      aiConfidence: 0,
      origin: null,
      topicTags: ['医疗'],
      mergedWith: null,
      mergeSuggestions: []
    }
  ];

  it('calculateSimilarity 应该正确计算两个安排的相似度', () => {
    const result = calculateSimilarity(arrangements[0], arrangements[1]);
    expect(result.score).toBeGreaterThan(0.5);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  it('findSimilarArrangements 应该找到相似的安排', () => {
    const suggestions = findSimilarArrangements(arrangements[0], arrangements);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0].arrangementId).toBe('2');
    expect(suggestions[0].similarityScore).toBeGreaterThan(0.5);
  });

  it('findSimilarArrangements 不应该找到不相似的安排', () => {
    const suggestions = findSimilarArrangements(arrangements[2], arrangements);
    expect(suggestions.length).toBe(0);
  });
});
