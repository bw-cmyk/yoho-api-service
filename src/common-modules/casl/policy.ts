import { Action } from './Action';
import { AppAbility } from './casl-ability.factory';
import { IPolicyHandler } from './PoliciesGuard';

export class WritePolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Write, 'all');
  }
}

export class AdminPolicyHandler implements IPolicyHandler {
  handle(ability: AppAbility) {
    return ability.can(Action.Admin, 'all');
  }
}
