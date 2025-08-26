import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  ExtractSubjectType,
  InferSubjects,
} from '@casl/ability';
import { Injectable } from '@nestjs/common';
import { Role, User } from '../../api-modules/user/entity/user.entity';
import {
  Action,
  HOLDER_ACTIONS,
  INNER_PRODUCT_ACTIONS,
  VA_ACTIONS,
} from './Action';

type Subjects = InferSubjects<typeof User> | 'all';

export type AppAbility = Ability<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  createForUser(user: User) {
    const { can, cannot, build } = new AbilityBuilder<
      Ability<[Action, Subjects]>
    >(Ability as AbilityClass<AppAbility>);

    if (user.role >= Role.INNER) {
      INNER_PRODUCT_ACTIONS.forEach((action) => can(action, 'all'));
    }

    if (user.role >= Role.LP) {
      VA_ACTIONS.forEach((action) => can(action, 'all'));
    } else {
      can(Action.Read, 'all'); // read-only access to everything
    }

    if (user.role >= Role.HOLDER) {
      HOLDER_ACTIONS.forEach((action) => can(action, 'all'));
      can(Action.Write, 'all');
    }

    // can(Action.Withdraw, Article, { authorId: user.id });
    // cannot(Action.Delete, Article, { isPublished: true });

    return build({
      // Read https://casl.js.org/v6/en/guide/subject-type-detection#use-classes-as-subject-types for details
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
