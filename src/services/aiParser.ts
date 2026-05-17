import type { ArrangementItem, MergeSuggestion } from "@/types/arrangement";

export interface AiParseResult {
  success: boolean;
  title?: string;
  note?: string;
  scheduledAt?: number;
  people?: string[];
  location?: string;
  confidence: number;
  rawContent: string;
}

const datePatterns = [
  /(今天|今日)/i,
  /(明天|明日)/i,
  /(后天)/i,
  /(大后天)/i,
  /(\d+)天后/i,
  /(\d+)天以后/i,
  /(\d+)日/i,
  /(\d+)号/i,
  /(\d+)月(\d+)日?/i,
  /(\d+)月(\d+)号?/i,
  /下(周一|周二|周三|周四|周五|周六|周日)/i,
  /本周(一|二|三|四|五|六|日)/i,
];

const timePatterns = [
  /(\d+):(\d+)/,
  /(\d+)点(\d+)?分?/,
  /(\d+)时(\d+)?分?/,
];

const locationPatterns = [
  /在(.+?)[做|去|见]/i,
  /去(.+?)[做|办|见]/i,
  /到(.+?)[去|做|办]/i,
  /地点[是|:](.+)/i,
  /地址[是|:](.+)/i,
];

const peoplePatterns = [
  /和(.+?)[一起|见面|聊]/i,
  /跟(.+?)[一起|见面|聊]/i,
  /见(.+?)([。，、])/i,
  /帮(.+?)[做|办]/i,
  /给(.+?)[带|送]/i,
];

function parseDate(text: string): number | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      const date = new Date(today);

      if (pattern.test("今天")) {
        return date.getTime();
      } else if (pattern.test("明天")) {
        date.setDate(date.getDate() + 1);
        return date.getTime();
      } else if (pattern.test("后天")) {
        date.setDate(date.getDate() + 2);
        return date.getTime();
      } else if (pattern.test("大后天")) {
        date.setDate(date.getDate() + 3);
        return date.getTime();
      } else if (match[1] && !isNaN(parseInt(match[1]))) {
        const days = parseInt(match[1]);
        date.setDate(date.getDate() + days);
        return date.getTime();
      } else if (match[1] && match[2]) {
        const month = parseInt(match[1]) - 1;
        const day = parseInt(match[2]);
        const result = new Date(date.getFullYear(), month, day);
        return result.getTime();
      } else if (match[1]) {
        const weekdays = ["周一", "周二", "周三", "周四", "周五", "周六", "周日"];
        const weekdayMap: Record<string, number> = {
          "周一": 1, "周二": 2, "周三": 3, "周四": 4, "周五": 5, "周六": 6, "周日": 0,
        };
        const targetDay = weekdayMap[match[1]];
        if (targetDay !== undefined) {
          const currentDay = date.getDay();
          let daysToAdd = targetDay - currentDay;
          if (daysToAdd <= 0) daysToAdd += 7;
          date.setDate(date.getDate() + daysToAdd);
          return date.getTime();
        }
      }
    }
  }
  return undefined;
}

function parseTime(text: string): { hours: number; minutes: number } | undefined {
  for (const pattern of timePatterns) {
    const match = text.match(pattern);
    if (match) {
      const hours = parseInt(match[1]) || 0;
      const minutes = parseInt(match[2]) || 0;
      return { hours: Math.min(23, hours), minutes: Math.min(59, minutes) };
    }
  }
  return undefined;
}

function parseLocation(text: string): string | undefined {
  for (const pattern of locationPatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }
  return undefined;
}

function parsePeople(text: string): string[] {
  const people: string[] = [];
  for (const pattern of peoplePatterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      const name = match[1].trim();
      if (name && !people.includes(name)) {
        people.push(name);
      }
    }
  }
  return people;
}

export async function parseMessageForArrangement(
  message: string,
  apiKey?: string,
  provider?: string
): Promise<AiParseResult> {
  const hasDate = datePatterns.some(p => p.test(message));
  const hasTime = timePatterns.some(p => p.test(message));
  const hasLocation = locationPatterns.some(p => p.test(message));
  const hasPeople = peoplePatterns.some(p => p.test(message));

  const hasArrangementKeywords = /(去|做|办|见|预约|挂号|开会|会议|吃饭|聚餐|送|带)/i.test(message);

  const baseConfidence = hasArrangementKeywords ? 0.3 : 0;
  const dateConfidence = hasDate ? 0.25 : 0;
  const timeConfidence = hasTime ? 0.15 : 0;
  const locationConfidence = hasLocation ? 0.15 : 0;
  const peopleConfidence = hasPeople ? 0.15 : 0;

  const totalConfidence = baseConfidence + dateConfidence + timeConfidence + locationConfidence + peopleConfidence;

  if (totalConfidence < 0.3) {
    return {
      success: false,
      confidence: totalConfidence,
      rawContent: message,
    };
  }

  let scheduledAt = parseDate(message);
  if (scheduledAt && hasTime) {
    const time = parseTime(message);
    if (time) {
      const date = new Date(scheduledAt);
      date.setHours(time.hours, time.minutes, 0, 0);
      scheduledAt = date.getTime();
    }
  }

  const location = parseLocation(message);
  const people = parsePeople(message);

  let title = message.replace(/[。，、！？]/g, "").trim();
  if (title.length > 50) {
    title = title.substring(0, 50) + "...";
  }

  return {
    success: true,
    title,
    note: message,
    scheduledAt,
    people,
    location,
    confidence: totalConfidence,
    rawContent: message,
  };
}

export async function createDraftArrangement(
  message: string,
  conversationId?: string,
  messageId?: string,
  senderName?: string
): Promise<Partial<ArrangementItem> | null> {
  const result = await parseMessageForArrangement(message);

  if (!result.success) {
    return null;
  }

  return {
    title: result.title || message,
    note: result.note || "",
    scheduledAt: result.scheduledAt || null,
    people: result.people || [],
    location: result.location || "",
    source: "ai",
    isDraft: true,
    aiConfidence: result.confidence,
    origin: {
      type: "message",
      conversationId,
      messageId,
      senderName,
      rawContent: message,
    },
    status: "pending",
    priority: result.confidence > 0.7 ? "high" : result.confidence > 0.5 ? "medium" : "low",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    snoozedAt: null,
    contexts: conversationId ? [{
      conversationId,
      messageIds: messageId ? [messageId] : [],
      snippet: message.substring(0, 100),
    }] : [],
    relatedIds: [],
    reminderAt: null,
    isRepeating: false,
    repeatPattern: null,
  };
}

export function isCommitmentPattern(messages: Array<{ content: string; senderId: string }>, currentUserId: string): boolean {
  if (messages.length < 2) return false;

  const lastMessage = messages[messages.length - 1];
  const prevMessage = messages[messages.length - 2];

  if (lastMessage.senderId !== currentUserId) return false;

  const requestPatterns = [
    /帮我/i,
    /请你/i,
    /能.*吗/i,
    /可以.*吗/i,
    /麻烦你/i,
    /能不能/i,
    /方便.*吗/i,
  ];

  const confirmPatterns = [
    /好的/i,
    /没问题/i,
    /可以/i,
    /行/i,
    /好/i,
    /知道了/i,
    /明白/i,
    /收到/i,
    /OK/i,
  ];

  const isRequest = requestPatterns.some(p => p.test(prevMessage.content));
  const isConfirm = confirmPatterns.some(p => p.test(lastMessage.content));

  return isRequest && isConfirm;
}

export async function parseChatForArrangement(
  messages: Array<{ content: string; senderId: string; senderName?: string }>,
  currentUserId: string
): Promise<Partial<ArrangementItem> | null> {
  if (!isCommitmentPattern(messages, currentUserId)) {
    return null;
  }

  const lastMessage = messages[messages.length - 1];
  const prevMessage = messages[messages.length - 2];

  let title = prevMessage.content.replace(/[。，、！？]/g, "").trim();
  if (title.length > 50) {
    title = title.substring(0, 50) + "...";
  }

  if (prevMessage.senderName) {
    title = `帮${prevMessage.senderName}${title.replace(/帮我|请你/g, "")}`;
  }

  const result = await parseMessageForArrangement(prevMessage.content);

  return {
    title,
    note: prevMessage.content + "\n\n" + lastMessage.content,
    scheduledAt: result.scheduledAt || null,
    people: prevMessage.senderName ? [prevMessage.senderName] : [],
    location: result.location || "",
    source: "ai",
    isDraft: true,
    aiConfidence: Math.min(0.9, result.confidence + 0.2),
    origin: {
      type: "message",
      rawContent: prevMessage.content,
      senderName: prevMessage.senderName,
    },
    status: "pending",
    priority: "medium",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    snoozedAt: null,
    contexts: [],
    relatedIds: [],
    reminderAt: null,
    isRepeating: false,
    repeatPattern: null,
  };
}

export function calculateSimilarity(a: ArrangementItem, b: ArrangementItem): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const titleSimilarity = calculateStringSimilarity(a.title, b.title);
  if (titleSimilarity > 0.5) {
    score += titleSimilarity * 0.4;
    reasons.push("标题相似");
  }

  const peopleIntersection = a.people.filter(p => b.people.includes(p));
  if (peopleIntersection.length > 0) {
    const peopleScore = peopleIntersection.length / Math.max(a.people.length, b.people.length);
    score += peopleScore * 0.25;
    reasons.push(`涉及相同人物: ${peopleIntersection.join(", ")}`);
  }

  if (a.location && b.location && calculateStringSimilarity(a.location, b.location) > 0.5) {
    score += 0.2;
    reasons.push("地点相同");
  }

  if (a.scheduledAt && b.scheduledAt) {
    const timeDiff = Math.abs(a.scheduledAt - b.scheduledAt);
    const oneDay = 24 * 60 * 60 * 1000;
    const threeDays = 3 * oneDay;
    
    if (timeDiff <= oneDay) {
      score += 0.3;
      reasons.push("时间相同");
    } else if (timeDiff <= threeDays) {
      score += 0.15;
      reasons.push("时间相近");
    }
  }

  const contextSimilarity = calculateContextSimilarity(a, b);
  if (contextSimilarity > 0.3) {
    score += contextSimilarity * 0.15;
    reasons.push("来源对话相关");
  }

  return { score: Math.min(1, score), reasons };
}

function calculateStringSimilarity(s1: string, s2: string): number {
  const longer = s1.length > s2.length ? s1 : s2;
  const shorter = s1.length > s2.length ? s2 : s1;
  
  if (longer.length === 0) return 1.0;
  
  const longerLower = longer.toLowerCase();
  const shorterLower = shorter.toLowerCase();
  
  const lcsLength = lcs(longerLower, shorterLower);
  return (2 * lcsLength) / (longer.length + shorter.length);
}

function lcs(s1: string, s2: string): number {
  const dp: number[][] = Array(s1.length + 1).fill(null).map(() => Array(s2.length + 1).fill(0));
  
  for (let i = 1; i <= s1.length; i++) {
    for (let j = 1; j <= s2.length; j++) {
      if (s1[i - 1] === s2[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp[s1.length][s2.length];
}

function calculateContextSimilarity(a: ArrangementItem, b: ArrangementItem): number {
  if (a.contexts.length === 0 || b.contexts.length === 0) return 0;
  
  let maxSimilarity = 0;
  
  for (const ctxA of a.contexts) {
    for (const ctxB of b.contexts) {
      if (ctxA.conversationId === ctxB.conversationId) {
        maxSimilarity = Math.max(maxSimilarity, 0.5 + calculateStringSimilarity(ctxA.snippet, ctxB.snippet) * 0.5);
      } else {
        const snippetSim = calculateStringSimilarity(ctxA.snippet, ctxB.snippet);
        maxSimilarity = Math.max(maxSimilarity, snippetSim * 0.3);
      }
    }
  }
  
  return maxSimilarity;
}

export function generateTopicTags(title: string, note: string): string[] {
  const text = (title + " " + note).toLowerCase();
  const tags: string[] = [];
  
  const topicKeywords: Record<string, string[]> = {
    "医疗": ["医院", "看病", "挂号", "体检", "医生", "就诊", "复诊", "手术"],
    "工作": ["会议", "开会", "汇报", "项目", "任务", "加班", "出差"],
    "社交": ["吃饭", "聚餐", "见面", "聚会", "约会", "拜访"],
    "购物": ["买", "购物", "超市", "商场", "快递", "取件"],
    "出行": ["出差", "旅游", "飞机", "高铁", "火车", "出发"],
    "学习": ["上课", "学习", "考试", "培训", "讲座"],
    "家务": ["打扫", "整理", "买菜", "做饭", "洗衣"],
  };
  
  for (const [tag, keywords] of Object.entries(topicKeywords)) {
    if (keywords.some(k => text.includes(k))) {
      tags.push(tag);
    }
  }
  
  return tags;
}

export function findSimilarArrangements(
  target: ArrangementItem,
  allArrangements: ArrangementItem[],
  threshold: number = 0.5
): MergeSuggestion[] {
  const suggestions: MergeSuggestion[] = [];
  
  for (const arrangement of allArrangements) {
    if (arrangement.id === target.id || arrangement.status === "done") continue;
    
    const { score, reasons } = calculateSimilarity(target, arrangement);
    
    if (score >= threshold) {
      suggestions.push({
        arrangementId: arrangement.id,
        similarityScore: score,
        reason: reasons.join("；"),
      });
    }
  }
  
  return suggestions.sort((a, b) => b.similarityScore - a.similarityScore);
}

export interface GroupChatContext {
  conversationId: string;
  participants: Array<{ id: string; name: string }>;
  messages: Array<{
    id: string;
    senderId: string;
    senderName?: string;
    content: string;
    timestamp: number;
  }>;
}

export interface GroupChatParseResult {
  success: boolean;
  arrangements: Array<{
    arrangement: Partial<ArrangementItem>;
    relatedMessageIds: string[];
    targetPersonId?: string;
    targetPersonName?: string;
  }>;
  confidence: number;
}

export async function parseGroupChatForArrangements(
  context: GroupChatContext,
  currentUserId: string
): Promise<GroupChatParseResult> {
  const arrangements: GroupChatParseResult['arrangements'] = [];
  let totalConfidence = 0;

  const actionPatterns = [
    /(帮|给|替|为)\s*([^，。！？]+?)\s*(带|拿|取|送|做|办)/i,
    /([^，。！？]+?)\s*(需要|要|得)\s*(带|拿|取|送|做|办)/i,
    /(记得|别忘了|别忘)\s*(带|拿|取|做|办)/i,
  ];

  const commitmentPatterns = [
    /好的/i,
    /没问题/i,
    /可以/i,
    /行/i,
    /我来/i,
    /我负责/i,
    /交给我/i,
  ];

  for (let i = 0; i < context.messages.length; i++) {
    const currentMsg = context.messages[i];
    const isCurrentUser = currentMsg.senderId === currentUserId;

    for (const pattern of actionPatterns) {
      const match = currentMsg.content.match(pattern);
      if (match) {
        let targetPersonName = match[2] || match[1];
        let action = match[3] || match[2] || match[1];
        
        if (/我/.test(targetPersonName)) {
          targetPersonName = currentMsg.senderName || '对方';
        }

        let relatedMessageIds = [currentMsg.id];
        let confidence = 0.4;

        for (let j = i + 1; j < Math.min(i + 5, context.messages.length); j++) {
          const nextMsg = context.messages[j];
          if (commitmentPatterns.some(p => p.test(nextMsg.content))) {
            relatedMessageIds.push(nextMsg.id);
            confidence += 0.3;
            
            if (nextMsg.senderId !== currentMsg.senderId) {
              confidence += 0.2;
            }
            break;
          }
        }

        if (confidence >= 0.5) {
          const parseResult = await parseMessageForArrangement(currentMsg.content);
          
          arrangements.push({
            arrangement: {
              title: `${targetPersonName}${action}`,
              note: context.messages
                .filter((_, idx) => idx >= i && idx < i + 3)
                .map(m => `${m.senderName || '未知'}: ${m.content}`)
                .join('\n'),
              scheduledAt: parseResult.scheduledAt || null,
              people: [targetPersonName],
              location: parseResult.location || "",
              source: "ai",
              isDraft: true,
              aiConfidence: confidence,
              origin: {
                type: "group_chat",
                conversationId: context.conversationId,
                rawContent: currentMsg.content,
                senderName: currentMsg.senderName,
              },
              status: "pending",
              priority: confidence > 0.8 ? "high" : "medium",
              createdAt: Date.now(),
              updatedAt: Date.now(),
              snoozedAt: null,
              contexts: [{
                conversationId: context.conversationId,
                messageIds: relatedMessageIds,
                snippet: currentMsg.content.substring(0, 100),
              }],
              relatedIds: [],
              reminderAt: null,
              isRepeating: false,
              repeatPattern: null,
            },
            relatedMessageIds,
            targetPersonId: context.participants.find(p => p.name === targetPersonName)?.id,
            targetPersonName,
          });

          totalConfidence += confidence;
        }
      }
    }
  }

  return {
    success: arrangements.length > 0,
    arrangements,
    confidence: arrangements.length > 0 ? totalConfidence / arrangements.length : 0,
  };
}

export interface CompletionDetectionResult {
  isCompleted: boolean;
  confidence: number;
  evidence: string[];
}

export function detectCompletion(
  arrangement: ArrangementItem,
  latestMessages: Array<{ content: string; timestamp: number }>
): CompletionDetectionResult {
  const evidence: string[] = [];
  let confidence = 0;

  const arrangementText = (arrangement.title + " " + arrangement.note).toLowerCase();

  const completionKeywords = [
    { pattern: /(已经|已|完成|做完|搞定|办好|结束)/i, weight: 0.3, reason: "包含完成关键词" },
    { pattern: /(去了|去过|到了|到过)/i, weight: 0.25, reason: "包含行动完成关键词" },
    { pattern: /(顺利|成功|没问题|搞定了)/i, weight: 0.2, reason: "包含成功关键词" },
    { pattern: /(汇报|报告|告知|通知)/i, weight: 0.15, reason: "包含汇报关键词" },
  ];

  const locationKeywords: Record<string, string[]> = {
    "医院": ["医院", "诊所", "医生", "看病", "检查"],
    "公司": ["公司", "办公室", "上班", "开会"],
    "学校": ["学校", "上课", "教室", "考试"],
    "家里": ["家", "家里", "回家", "到家"],
  };

  for (const msg of latestMessages.slice(-10)) {
    const msgLower = msg.content.toLowerCase();

    for (const { pattern, weight, reason } of completionKeywords) {
      if (pattern.test(msgLower)) {
        const titlePattern = new RegExp(arrangement.title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        if (titlePattern.test(msg.content) || 
            arrangement.people.some(p => msgLower.includes(p.toLowerCase())) ||
            (arrangement.location && msgLower.includes(arrangement.location.toLowerCase()))) {
          confidence += weight;
          evidence.push(reason);
        }
      }
    }

    if (arrangement.location) {
      for (const [location, keywords] of Object.entries(locationKeywords)) {
        if (arrangement.location.includes(location) && keywords.some(k => msgLower.includes(k))) {
          confidence += 0.15;
          evidence.push(`提到地点相关内容`);
        }
      }
    }

    if (arrangement.people.length > 0) {
      if (arrangement.people.some(p => msgLower.includes(p.toLowerCase()))) {
        confidence += 0.1;
      }
    }
  }

  confidence = Math.min(1, confidence);

  return {
    isCompleted: confidence >= 0.6,
    confidence,
    evidence: [...new Set(evidence)],
  };
}

export async function batchParseMessages(
  messages: Array<{
    id: string;
    content: string;
    senderId: string;
    senderName?: string;
    conversationId: string;
    timestamp: number;
  }>,
  currentUserId: string
): Promise<Array<{
  messageId: string;
  arrangement: Partial<ArrangementItem>;
  confidence: number;
}>> {
  const results: Array<{
    messageId: string;
    arrangement: Partial<ArrangementItem>;
    confidence: number;
  }> = [];

  for (const msg of messages) {
    const result = await parseMessageForArrangement(msg.content);
    
    if (result.success && result.confidence >= 0.4) {
      const arrangement = await createDraftArrangement(
        msg.content,
        msg.conversationId,
        msg.id,
        msg.senderName
      );
      
      if (arrangement) {
        results.push({
          messageId: msg.id,
          arrangement,
          confidence: result.confidence,
        });
      }
    }
  }

  return results.sort((a, b) => b.confidence - a.confidence);
}
