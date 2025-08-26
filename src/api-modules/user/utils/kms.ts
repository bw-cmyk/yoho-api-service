export const getKmsPolicy = (uid: string, region: string) => ({
  Id: 'mpc-kms-default-policy',
  Version: '2012-10-17',
  Statement: [
    {
      Sid: 'Enable IAM User Permissions',
      Effect: 'Allow',
      Principal: {
        AWS: [
          'arn:aws:iam::759542841547:user/mpc-wallet-cognito-service',
          'arn:aws:iam::759542841547:user/vince@ultiverse.io',
        ],
      },
      Action: 'kms:*',
      Resource: '*',
    },
    {
      Sid: 'Allow use of the key',
      Effect: 'Allow',
      Principal: {
        AWS: ['arn:aws:iam::759542841547:role/service-role/mpc-wallet-cognito'],
      },
      Action: [
        'kms:Encrypt',
        'kms:Decrypt',
        'kms:ReEncrypt*',
        'kms:GenerateDataKey*',
        'kms:DescribeKey',
      ],
      Resource: '*',
      Condition: {
        StringEquals: {
          'cognito-identity.amazonaws.com:sub': `${uid}`,
        },
      },
    },
  ],
});
