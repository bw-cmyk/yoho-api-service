export enum Action {
  Admin = 'admin',
  ReadInnerProducts = 'readInnerProducts',
  CreateVa = 'createVa',
  AllocateQuota = 'allocateQuota',
  AssumeRole = 'assumeRole',
  DistributeShare = 'distributeShare',
  ReadVa = 'readVa',
  Write = 'write',
  Withdraw = 'withdraw',

  Read = 'read',
  Manage = 'manage',
  Create = 'create',
  Update = 'update',
  Delete = 'delete',
  Deposit = 'deposit',
}

export const HOLDER_ACTIONS = [Action.Deposit, Action.Withdraw];

export const VA_ACTIONS = [
  Action.ReadVa,
  Action.CreateVa,
  Action.AllocateQuota,
  Action.AssumeRole,
  Action.DistributeShare,
];

export const INNER_PRODUCT_ACTIONS = [Action.Admin, Action.ReadInnerProducts];
