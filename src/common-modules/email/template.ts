export default {
  login: `
      <div style="font-size:16px;font-weight:100;color:#000;background:#f6f6f6;padding: 40px;">
      <div style="margin:auto;width:600px;background:#fff;border: 1px solid #e9e9e9;border-radius:3px;padding:40px 60px;">
        <div style="padding-top: 10px; margin-top: 10px;">
        copy and paste this code: $\{ctx.verifyCode\}
        </div>
        <div style="color: #ccc; border-top: solid 1px #ddd; padding-top: 40px; margin-top: 40px;">
          If you did not request the email verification, or if the time not match, please ignore thie email. If you are concerned about your account's safety. please get in touch with us.
        </div>
      </div>
      </div>
  `,
};
