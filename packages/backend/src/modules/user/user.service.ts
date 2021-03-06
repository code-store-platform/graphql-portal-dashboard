import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { AuthenticationError, UserInputError } from 'apollo-server-express';
import { Model } from 'mongoose';
import { config } from 'node-config-ts';
import Roles from '../../common/enum/roles.enum';
import IUpdateUser from '../../common/interface/update-user.interface';
import IUser from '../../common/interface/user.interface';
import { LoggerService } from '../../common/logger';
import { IConfirmationCodeDocument } from '../../data/schema/confirmation-code.schema';
import { IUserDocument } from '../../data/schema/user.schema';
import { ResetPasswordEmail, ConfirmationEmail, mailService } from '../mail';
import { CodeExpirationTime, CodeTypes } from './enum';
import ITokens from './interfaces/tokens.interface';
import TokenService from './token.service';

@Injectable()
export default class UserService {
  private readonly mailService = mailService;
  private readonly defaultAdmin = {
    email: 'admin@example.com',
    password: 'Secret123!',
  };

  public constructor(
    @InjectModel('User') private userModel: Model<IUserDocument>,
    @InjectModel('ConfirmationCode')
    private codeModel: Model<IConfirmationCodeDocument>,
    private readonly logger: LoggerService,
    @Inject(forwardRef(() => TokenService))
    private readonly tokenService: TokenService
  ) {}

  private async onModuleInit(): Promise<void> {
    if (!process.env.NODE_ENV?.includes('test')) {
      await this.createDefaultUser();
    }
  }

  public async login(
    email: string,
    password: string,
    device: string
  ): Promise<ITokens> {
    const user = await this.userModel.findOne({ email });
    const { email: defaultAdminEmailEnv } = config.application.defaultAdmin;

    if (await this.isEmailNotConfirmed(email)) {
      await this.sendEmailConfirmationCode(email);
      throw new AuthenticationError(
        'Please verify your email by using a confirmation code we have sent to your email.'
      );
    }

    const isNotAdminFromEnv =
      email === this.defaultAdmin.email &&
      defaultAdminEmailEnv !== this.defaultAdmin.email;

    if (
      isNotAdminFromEnv ||
      !user ||
      user.deletedAt ||
      !user.isValidPassword(password)
    )
      throw new AuthenticationError('Wrong email or password');

    const tokens = await this.tokenService.issueTokens(user._id!, device);

    this.logger.log(
      `User with email: ${user.email} successfully logged in`,
      this.constructor.name
    );

    return tokens;
  }

  public async updateUser(
    id: string,
    data: Partial<IUpdateUser>
  ): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndUpdate(id, data, { new: true });
  }

  public async register(data: IUser): Promise<boolean> {
    const user = await this.userModel.create(data);
    user.setPassword(data.password);
    await user.save();

    await this.sendEmailConfirmationCode(user.email);

    this.logger.log(
      `Successfully created user with email: ${data.email}`,
      this.constructor.name
    );

    return true;
  }

  public async unblockUser(id: string): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      id,
      {
        deletedAt: null,
      },
      { new: true }
    );
  }

  public async blockUser(id: string): Promise<IUserDocument | null> {
    return this.userModel.findByIdAndUpdate(
      id,
      {
        deletedAt: new Date(),
      },
      { new: true }
    );
  }

  public async deleteUser(id: string): Promise<boolean> {
    await this.userModel.deleteOne({ _id: id });
    return true;
  }

  public async findById(id: string): Promise<IUserDocument | null> {
    return this.userModel.findById(id);
  }

  public async findByEmail(email: string): Promise<IUserDocument | null> {
    return this.userModel.findOne({ email });
  }

  public async createDefaultUser(): Promise<void> {
    const { email, password } = config.application.defaultAdmin;

    if (
      email === this.defaultAdmin.email ||
      password === this.defaultAdmin.password
    ) {
      this.logger.warn(
        'You are running application with default admin credentials',
        `${this.constructor.name}:${this.createDefaultUser.name}`
      );
    }

    let user = await this.userModel.findOne({ email });

    if (!user) {
      user = await this.userModel.create({
        email,
        password,
        role: Roles.ADMIN,
      });
    }
    user.setPassword(password);
    await user.save();
  }

  public async getUsers(exceptUser: string): Promise<IUserDocument[]> {
    return this.userModel.find({
      _id: { $ne: exceptUser },
    });
  }

  public async resetPasswordRequest(email: string): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user || user.deletedAt) {
      throw new UserInputError('User with such email/password does not exist');
    }

    const codeEntity = await this.createNewCodeAndDeletePrevious(
      email,
      CodeTypes.RESET_PASSWORD
    );

    const resetPasswordEmail = new ResetPasswordEmail(email, {
      firstName: user.firstName || email,
      redirectUrl: this.getResetPasswordUrl(codeEntity.code, email),
    });

    await this.mailService.send(resetPasswordEmail);

    return true;
  }

  private getResetPasswordUrl(code: string, email: string): string {
    return `${config.client.host}/reset-password?code=${code}&email=${email}`;
  }

  public async changePassword(
    email: string,
    oldPassword: string,
    newPassword: string
  ): Promise<boolean> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UserInputError('Wrong email or password');
    }
    if (!user.isValidPassword(oldPassword)) {
      throw new UserInputError('Wrong email or password');
    }

    user.setPassword(newPassword);
    await user.save();

    return true;
  }

  public async resetPassword(
    email: string,
    code: string,
    password: string
  ): Promise<boolean> {
    const isConfirmed = await this.acceptConfirmationCode(
      email,
      CodeTypes.RESET_PASSWORD,
      code
    );
    if (!isConfirmed)
      throw new UserInputError('Confirmation code has expired or is invalid');

    const user = await this.findByEmail(email);

    if (!user) {
      throw new UserInputError(`User with email: ${email} was found`);
    }

    user.setPassword(password);
    await user.save();

    return true;
  }

  public async sendEmailConfirmationCode(email: string): Promise<void> {
    const user = await this.findByEmail(email);
    if (!user) {
      throw new UserInputError('User with such email/password does not exist');
    }

    const codeEntity = await this.createNewCodeAndDeletePrevious(
      email,
      CodeTypes.EMAIL_CONFIRMATION
    );

    const confirmationEmail = new ConfirmationEmail(email, {
      firstName: user.firstName || email,
      redirectUrl: this.getConfirmationUrl(codeEntity.code, email),
    });

    await this.mailService.send(confirmationEmail);
  }

  private getConfirmationUrl(code: string, email: string): string {
    return `${config.application.publicHost}/user/confirm-email?code=${code}&email=${email}`;
  }

  public async isEmailNotConfirmed(email: string): Promise<boolean> {
    const code = await this.codeModel.findOne({
      email,
      type: CodeTypes.EMAIL_CONFIRMATION,
    });
    return Boolean(code);
  }

  private async createNewCodeAndDeletePrevious(
    email: string,
    type: CodeTypes
  ): Promise<IConfirmationCodeDocument> {
    await this.codeModel.deleteMany({
      email,
      type,
    });

    return this.codeModel.create({
      email,
      type,
      expiredAt: new Date(Date.now() + CodeExpirationTime[type]),
    });
  }

  public async acceptConfirmationCode(
    email: string,
    type: CodeTypes,
    code: string
  ): Promise<boolean> {
    const context = `${this.constructor.name}:${this.acceptConfirmationCode.name}`;
    this.logger.debug('Looking for confirmation code', context, {
      email,
      code,
      type,
    });
    const confirmationCode = await this.codeModel.findOne({
      code,
      email,
      type,
      expiredAt: {
        $gte: new Date(),
      },
    });
    if (!confirmationCode) {
      this.logger.debug('Confirmation code was not found', context, {
        email,
        code,
      });
      throw new Error('Confirmation code has expired or is invalid');
    }
    await this.codeModel.deleteMany({
      email,
      type,
    });
    return true;
  }
}
