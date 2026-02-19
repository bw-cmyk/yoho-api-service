import { Injectable } from '@nestjs/common';
import { faker } from '@faker-js/faker';

@Injectable()
export class BotNameGeneratorService {
  private readonly maleNames = [
    'Ahmed',
    'Mohammed',
    'Ali',
    'Omar',
    'Khalid',
    'Hassan',
    'Ibrahim',
    'Youssef',
    'Saeed',
    'Faisal',
    'Sultan',
    'Rashid',
    'Hamad',
    'Nasser',
    'Tariq',
    'Waleed',
    'Majed',
    'Fahad',
    'Abdulrahman',
    'Mansour',
    'Saleh',
    'Karim',
    'Zayed',
    'Hamza',
    'Rami',
    'Khaled',
    'Bilal',
    'Sami',
    'Adel',
    'Mazen',
    'Younis',
    'Ammar',
    'Hadi',
    'Nabil',
    'Bashar',
    'Idris',
    'Jamal',
    'Murad',
    'Aws',
    'Zain',
  ];

  private readonly femaleNames = [
    'Fatima',
    'Aisha',
    'Maryam',
    'Sara',
    'Layla',
    'Nour',
    'Huda',
    'Reem',
    'Dana',
    'Lina',
    'Noura',
    'Amira',
    'Hana',
    'Yasmin',
    'Salma',
    'Dina',
    'Rana',
    'Mai',
    'Maha',
    'Asma',
    'Dalal',
    'Ghada',
    'Lubna',
    'Samira',
    'Rania',
    'Wafa',
    'Abeer',
    'Shahd',
    'Joud',
    'Malak',
  ];

  private readonly lastNames = [
    'Al-Rashid',
    'Al-Saud',
    'Al-Khalifa',
    'Al-Thani',
    'Al-Maktoum',
    'Al-Nahyan',
    'Al-Sabah',
    'Al-Hassan',
    'Al-Farsi',
    'Al-Ameri',
    'Khan',
    'Hussain',
    'Rahman',
    'Qureshi',
    'Malik',
    'Haddad',
    'Naji',
    'Khoury',
    'Saleh',
    'Mansouri',
    'Bakr',
    'Darwish',
    'Essa',
    'Ghanem',
    'Hashemi',
  ];

  // Arabizi 缩写风格 (用数字替代阿拉伯字母)
  private readonly arabiziNames = [
    '3bood',
    '7amad',
    'a7med',
    '5aled',
    'mo7ammed',
    '3ali',
    '7asan',
    '3omar',
    'na9er',
    '6ariq',
    'fa6ma',
    '3aisha',
    'mar9am',
    'la9la',
    '5adija',
  ];

  private pick<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private randomNum(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private getFirstName(): string {
    return Math.random() < 0.6
      ? this.pick(this.maleNames)
      : this.pick(this.femaleNames);
  }

  /**
   * 生成随机展示名称
   * 中东风格为主，混合部分英文用户名
   */
  generateDisplayName(): string {
    const style = Math.random();
    let name: string;

    // 25% - 名字 + 数字 (e.g. "ahmed92", "Fatima_07")
    if (style < 0.25) {
      const first = this.getFirstName();
      const num = this.randomNum(1, 999);
      const sep = this.pick(['', '_', '.', '']);
      name = `${first}${sep}${num}`;
    }
    // 20% - 名字 + 姓 (e.g. "Omar Al-Rashid", "khalid.hussain")
    else if (style < 0.45) {
      const first = this.getFirstName();
      const last = this.pick(this.lastNames);
      const sep = this.pick([' ', '_', '.', '-']);
      name = `${first}${sep}${last}`;
    }
    // 10% - Abu/Um + 名字 (e.g. "Abu_Khalid", "Um_Sara")
    else if (style < 0.55) {
      const prefix = Math.random() < 0.7 ? 'Abu' : 'Um';
      const child = this.getFirstName();
      const sep = this.pick(['_', '.', '-', '']);
      name = `${prefix}${sep}${child}`;
    }
    // 10% - Arabizi 风格 (e.g. "3bood_99", "7amad")
    else if (style < 0.65) {
      const base = this.pick(this.arabiziNames);
      if (Math.random() < 0.5) {
        name = `${base}${this.pick(['_', ''])}${this.randomNum(1, 99)}`;
      } else {
        name = base;
      }
    }
    // 10% - 仅名字 (e.g. "Khalid", "layla")
    else if (style < 0.75) {
      name = this.getFirstName();
    }
    // 15% - 英文用户名 (混合一些非中东用户)
    else if (style < 0.9) {
      name = faker.internet.userName();
    }
    // 10% - 英文名字 + 数字
    else {
      const first = faker.person.firstName();
      const num = this.randomNum(1, 999);
      name = `${first}${this.pick(['', '_', '.'])}${num}`;
    }

    return this.randomizeCase(name);
  }

  /**
   * 随机变换大小写风格
   */
  private randomizeCase(name: string): string {
    const r = Math.random();

    // 40% - 保持原样
    if (r < 0.4) return name;
    // 35% - 全部小写
    if (r < 0.75) return name.toLowerCase();
    // 10% - 全部大写
    if (r < 0.85) return name.toUpperCase();
    // 15% - 首字母大写其余小写
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  /**
   * 生成随机头像 URL
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
    const style = this.pick(styles);
    const seed = faker.string.alphanumeric(12);
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
}
