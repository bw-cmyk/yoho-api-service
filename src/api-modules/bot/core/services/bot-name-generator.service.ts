import { Injectable } from '@nestjs/common';

@Injectable()
export class BotNameGeneratorService {
  private readonly firstNames: string[] = [
    'Alex',
    'Jordan',
    'Taylor',
    'Morgan',
    'Casey',
    'Riley',
    'Jamie',
    'Avery',
    'Quinn',
    'Skyler',
    'Dakota',
    'Reese',
    'Finley',
    'Hayden',
    'Emerson',
    'Blake',
    'Parker',
    'Sage',
    'Charlie',
    'River',
    'Rowan',
    'Cameron',
    'Peyton',
    'Sawyer',
    'Phoenix',
    'Logan',
    'Kai',
    'Elliot',
    'Jules',
    'Sam',
  ];

  private readonly lastNames: string[] = [
    'Smith',
    'Johnson',
    'Williams',
    'Brown',
    'Jones',
    'Garcia',
    'Miller',
    'Davis',
    'Rodriguez',
    'Martinez',
    'Hernandez',
    'Lopez',
    'Wilson',
    'Anderson',
    'Thomas',
    'Taylor',
    'Moore',
    'Jackson',
    'Martin',
    'Lee',
    'Thompson',
    'White',
    'Harris',
    'Clark',
    'Lewis',
    'Walker',
    'Hall',
    'Young',
    'King',
    'Wright',
  ];

  private readonly adjectives: string[] = [
    'Lucky',
    'Happy',
    'Sunny',
    'Bright',
    'Swift',
    'Golden',
    'Silver',
    'Magic',
    'Brave',
    'Cool',
    'Smart',
    'Quick',
    'Bold',
    'Fresh',
    'Noble',
  ];

  /**
   * 生成随机展示名称
   * 格式: FirstName LastName 或 Adjective FirstName
   */
  generateDisplayName(): string {
    const useAdjective = Math.random() > 0.5;

    if (useAdjective) {
      const adjective = this.getRandomElement(this.adjectives);
      const firstName = this.getRandomElement(this.firstNames);
      return `${adjective} ${firstName}`;
    } else {
      const firstName = this.getRandomElement(this.firstNames);
      const lastName = this.getRandomElement(this.lastNames);
      return `${firstName} ${lastName}`;
    }
  }

  /**
   * 生成随机头像 URL
   * 使用 DiceBear API 生成随机头像
   */
  generateAvatar(): string {
    const styles = [
      'avataaars',
      'bottts',
      'identicon',
      'initials',
      'shapes',
      'rings',
    ];
    const style = this.getRandomElement(styles);
    const seed = this.generateRandomSeed();

    return `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
  }

  /**
   * 生成完整的 Bot 身份信息
   */
  generateBotIdentity(): { displayName: string; displayAvatar: string } {
    return {
      displayName: this.generateDisplayName(),
      displayAvatar: this.generateAvatar(),
    };
  }

  /**
   * 从数组中随机选择一个元素
   */
  private getRandomElement<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 生成随机种子（用于头像生成）
   */
  private generateRandomSeed(): string {
    return Math.random().toString(36).substring(2, 15);
  }
}
