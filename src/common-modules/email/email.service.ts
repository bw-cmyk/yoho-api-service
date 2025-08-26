import {
  BadRequestException,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Email } from './email.entity';
import { template } from 'lodash';
import * as moment from 'moment';
import EMAIL_TEMPLATE from './template';
import * as nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: 'smtp.larksuite.com',
  port: 465,
  secure: true, // true for port 465, false for other ports
  auth: {
    user: 'no-reply@steadyhash.ai',
    pass: 'nRZYL8UQHWb9feDa',
  },
});

@Injectable()
export class EmailService {
  constructor(
    private readonly configService: ConfigService,

    @InjectRepository(Email)
    private readonly emailRepository: Repository<Email>,
  ) {}

  async sendRawEmail(
    email: string,
    subject: string,
    text: string,
    content: string,
    cc: string[],
    attachments?: { content: Buffer; filename: string }[],
  ) {
    await transporter.sendMail({
      from: `"Steadyhash"<${this.configService.get('EDM_ADDRESS')}>`, // sender address
      to: email,
      subject,
      text,
      html: content,
      cc: cc.join(','),
      attachments,
    });
  }

  async sendEmail(email: string, type: string) {
    // throw new BadRequestException(
    //   'The email system is undergoing maintenance. We kindly ask you to consider registering through an alternative method.',
    // );

    const emailEntity = await this.emailRepository.findOne({
      where: {
        receiver: email,
        type,
      },
      order: {
        id: 'DESC',
      },
    });

    if (
      emailEntity &&
      !moment(emailEntity.createdAt).add(1, 'minute').isBefore(moment())
    ) {
      throw new ForbiddenException('Too many request, try later');
    }

    const verifyCode = this.generateVerifyCode(6);

    const ctx = {
      verifyCode,
      toAddress: email,
      fromAddress: this.configService.get('EDM_ADDRESS'),
    };

    await this.emailRepository.save({
      receiver: ctx.toAddress,
      sender: ctx.fromAddress,
      type,
      verifyCode,
    });

    const content = template(EMAIL_TEMPLATE[type])({ ctx });

    await transporter.sendMail({
      from: `"Steadyhash"<${this.configService.get('EDM_ADDRESS')}>`, // sender address
      to: email,
      subject: 'Verify Your Email', // Subject line
      text: 'Verify Your Email', // plain text body
      html: content, // html body
    });
  }

  async verify(receiver: string, type: string, verifyCode: string) {
    const email = await this.emailRepository.findOne({
      where: {
        receiver,
        type,
        verifyCode,
      },
      order: {
        id: 'DESC',
      },
    });

    if (!email) {
      throw new BadRequestException('Wrong verified code');
    }

    if (moment(email.createdAt).add(10, 'minute').isBefore(moment())) {
      throw new BadRequestException('Verified code has been expired');
    }

    return email.receiver;
  }

  generateVerifyCode(length: number) {
    let result = '';
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < length) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return result;
  }
}
