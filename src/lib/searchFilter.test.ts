import { describe, it, expect } from 'vitest';
import { 
  filterArrangements, 
  extractAllTags,
  getOverdueArrangements,
  getTodayArrangements,
  getUpcomingArrangements
} from './searchFilter';
import type { ArrangementItem } from '../types/arrangement';

describe('搜索过滤功能', () => {
  const now = Date.now();
  
  const arrangements: ArrangementItem[] = [
    {
      id: '1',
      title: '产品规划会议',
      note: '讨论Q2产品路线图和新功能规划',
      status: 'pending',
      priority: 'high',
      scheduledAt: now + 2 * 60 * 60 * 1000,
      people: ['张三', '李四', '王五'],
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
      note: '定期检查，最近牙齿有点痛',
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
    },
    {
      id: '4',
      title: '和朋友聚餐',
      note: '庆祝小明生日，好久没聚了',
      status: 'snoozed',
      priority: 'low',
      scheduledAt: now - 2 * 24 * 60 * 60 * 1000,
      people: ['小明', '小红', '小华'],
      location: '海底捞',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      snoozedAt: now - 24 * 60 * 60 * 1000,
      contexts: [],
      relatedIds: [],
      reminderAt: null,
      isRepeating: false,
      repeatPattern: null,
      isDraft: false,
      aiConfidence: 0,
      origin: null,
      topicTags: ['社交'],
      mergedWith: null,
      mergeSuggestions: []
    },
    {
      id: '5',
      title: '健身训练',
      note: '每周三次，不能偷懒',
      status: 'done',
      priority: 'medium',
      scheduledAt: now - 3 * 60 * 60 * 1000,
      people: [],
      location: '健身房',
      source: 'manual',
      createdAt: now,
      updatedAt: now,
      snoozedAt: null,
      contexts: [],
      relatedIds: [],
      reminderAt: null,
      isRepeating: true,
      repeatPattern: 'weekly',
      isDraft: false,
      aiConfidence: 0,
      origin: null,
      topicTags: ['健康'],
      mergedWith: null,
      mergeSuggestions: []
    }
  ];

  describe('filterArrangements - 搜索功能', () => {
    it('搜索标题应该返回匹配的安排', () => {
      const result = filterArrangements(arrangements, '会议', 'all', 'all', 'all');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });

    it('搜索备注应该返回匹配的安排', () => {
      const result = filterArrangements(arrangements, '生日', 'all', 'all', 'all');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('4');
    });

    it('搜索人物应该返回匹配的安排', () => {
      const result = filterArrangements(arrangements, '张三', 'all', 'all', 'all');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });

    it('搜索地点应该返回匹配的安排', () => {
      const result = filterArrangements(arrangements, '会议室', 'all', 'all', 'all');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });

    it('空搜索应该返回所有安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'all', 'all');
      expect(result.length).toBe(5);
    });

    it('搜索不存在的内容应该返回空数组', () => {
      const result = filterArrangements(arrangements, '不存在的内容', 'all', 'all', 'all');
      expect(result.length).toBe(0);
    });

    it('搜索应该忽略大小写', () => {
      const result = filterArrangements(arrangements, 'HUI YI', 'all', 'all', 'all');
      expect(result.length).toBe(2);
    });
  });

  describe('filterArrangements - 优先级过滤', () => {
    it('过滤高优先级应该返回正确的安排', () => {
      const result = filterArrangements(arrangements, '', 'high', 'all', 'all');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });

    it('过滤中优先级应该返回正确的安排', () => {
      const result = filterArrangements(arrangements, '', 'medium', 'all', 'all');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['3', '5']);
    });

    it('过滤低优先级应该返回正确的安排', () => {
      const result = filterArrangements(arrangements, '', 'low', 'all', 'all');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('4');
    });

    it('all 优先级应该返回所有安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'all', 'all');
      expect(result.length).toBe(5);
    });
  });

  describe('filterArrangements - 状态过滤', () => {
    it('过滤待处理应该返回正确的安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'pending', 'all');
      expect(result.length).toBe(3);
      expect(result.map(r => r.id)).toEqual(['1', '2', '3']);
    });

    it('过滤已完成应该返回正确的安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'done', 'all');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('5');
    });

    it('过滤以后再说应该返回正确的安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'snoozed', 'all');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('4');
    });

    it('all 状态应该返回所有安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'all', 'all');
      expect(result.length).toBe(5);
    });
  });

  describe('filterArrangements - 标签过滤', () => {
    it('过滤工作标签应该返回正确的安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'all', '工作');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });

    it('过滤医疗标签应该返回正确的安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'all', '医疗');
      expect(result.length).toBe(1);
      expect(result[0].id).toBe('3');
    });

    it('all 标签应该返回所有安排', () => {
      const result = filterArrangements(arrangements, '', 'all', 'all', 'all');
      expect(result.length).toBe(5);
    });
  });

  describe('filterArrangements - 组合过滤', () => {
    it('搜索+优先级过滤应该返回正确的结果', () => {
      const result = filterArrangements(arrangements, '会议', 'high', 'all', 'all');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });

    it('搜索+状态过滤应该返回正确的结果', () => {
      const result = filterArrangements(arrangements, '会议', 'all', 'pending', 'all');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });

    it('所有过滤条件组合应该返回正确的结果', () => {
      const result = filterArrangements(arrangements, '产品', 'high', 'pending', '工作');
      expect(result.length).toBe(2);
      expect(result.map(r => r.id)).toEqual(['1', '2']);
    });
  });

  describe('extractAllTags', () => {
    it('应该提取所有唯一的标签', () => {
      const tags = extractAllTags(arrangements);
      expect(tags).toContain('工作');
      expect(tags).toContain('会议');
      expect(tags).toContain('医疗');
      expect(tags).toContain('社交');
      expect(tags).toContain('健康');
      expect(tags.length).toBe(5);
    });
  });

  describe('时间相关过滤', () => {
    it('getOverdueArrangements 应该返回过期的安排', () => {
      const overdue = getOverdueArrangements(arrangements);
      expect(overdue.length).toBe(0);
    });

    it('getTodayArrangements 应该返回今天的安排', () => {
      const today = getTodayArrangements(arrangements);
      expect(today.length).toBe(2);
      expect(today.map(t => t.id)).toEqual(['1', '2']);
    });

    it('getUpcomingArrangements 应该返回即将到来的安排', () => {
      const upcoming = getUpcomingArrangements(arrangements);
      expect(upcoming.length).toBe(1);
      expect(upcoming[0].id).toBe('3');
    });
  });
});
