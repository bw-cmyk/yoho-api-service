export class LoginParams {
  readonly username: string;

  readonly password: string;

  readonly address: string;

  readonly signature: string;
}

export class LoginResponse {
  access_token: string;

  uid: string;
}

export class BotIMLoginParams {
  readonly accessToken: string;

  readonly refreshToken: string;
}
