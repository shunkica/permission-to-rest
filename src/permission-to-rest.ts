type Constructable = { new(...args: any[]): any; };
type Item = { [key: string]: any | any[] };
type AbilitySubject = "ALL" | Constructable;
type AbilityWhere = Item | Item[];
type RuleResult = { rule: Ability | undefined, result: boolean };

class Ability {
    constructor(
        public readonly permission: Permission,
        public readonly action: AbilityAction,
        public readonly subject: AbilitySubject,
        public readonly where?: AbilityWhere,
        public readonly blacklist?: Array<string>) {
    }
}

export enum AbilityAction {
    Manage = "MANAGE",
    Create = "CREATE",
    Retrieve = "RETRIEVE",
    Update = "UPDATE",
    Delete = "DELETE"
}

enum Permission {
    Can = "CAN",
    Cannot = "CANNOT"
}

export class AbilityBuilder {
    private abilities: Array<Ability> = [];

    can = (action: AbilityAction, subject: AbilitySubject, where?: AbilityWhere, blacklist?: Array<string>) => {
        this.abilities.push(new Ability(Permission.Can, action, subject, where, blacklist));
    };

    cannot = (action: AbilityAction, subject: AbilitySubject, where?: AbilityWhere) => {
        this.abilities.push(new Ability(Permission.Cannot, action, subject, where));
    };

    create = () => {
        return new AbilityValidator(this.abilities);
    }
}

export class AbilityValidator {
    constructor(private readonly abilities: Array<Ability>) {
    }

    private static domainMatches(ability: Ability, action: AbilityAction, item: Item, subject?: Constructable) {
        if (!subject) subject = item.constructor as Constructable;
        return (ability.subject === "ALL" || ability.subject === subject) &&
            (ability.action === AbilityAction.Manage || ability.action === action);
    }

    private static whereMatchesOptional(item: Item, where?: Item): boolean {
        if (!where) return true;
        let sharedProperties: { [key: string]: any } = {};
        for (const [prop, value] of Object.entries(where)) {
            if (!item.hasOwnProperty(prop)) continue;
            sharedProperties[prop] = value;
        }
        return this.whereMatches(item, sharedProperties);
    }

    private static anyWhereMatches(item: Item, where?: AbilityWhere, matchAll: boolean = true): boolean {
        if (!where) return true;
        if (where instanceof Array) {
            for (let singleWhere of where) {
                if (matchAll ?
                    AbilityValidator.whereMatches(item, singleWhere) :
                    AbilityValidator.whereMatchesOptional(item, singleWhere)
                ) {
                    return true;
                }
            }
            return false;
        } else {
            return matchAll ?
                AbilityValidator.whereMatches(item, where) :
                AbilityValidator.whereMatchesOptional(item, where);
        }
    }

    private static whereMatches(item: Item, where?: Item): boolean {
        if (!where) return true;
        for (const [prop, value] of Object.entries(where)) {
            if (value instanceof Array) {
                let didMatch = false;
                for (const val of value) {
                    if (!item.hasOwnProperty(prop)) {
                        if (val === undefined) {
                            didMatch = true;
                            break;
                        }
                    } else if (item[prop] === val) {
                        didMatch = true;
                        break;
                    }
                }
                if (!didMatch) return false;
            } else {
                if (item.hasOwnProperty(prop)) {
                    if (item[prop] !== value) return false;
                } else {
                    if (value !== undefined) return false;
                }
            }
        }
        return true;
    }

    private static isBlacklisted(blacklist: Array<string> | undefined, item: Item): boolean {
        if (!blacklist) return false;
        for (let prop of blacklist) {
            if (item.hasOwnProperty(prop)) return true;
        }
        return false;
    }

    private static isUpdateBlacklisted(blacklist: Array<string> | undefined, item: Item, updatedItem: Item): boolean {
        if (!blacklist) return false;
        for (let prop of blacklist) {
            if (updatedItem.hasOwnProperty(prop)) {
                if (!item.hasOwnProperty(prop)) {
                    return true;
                } else if (item[prop] !== updatedItem[prop]) {
                    return true;
                }
            }
        }
        return false;
    }

    getRuleFor(action: AbilityAction, item: Item, updatedItem?: Item, subject?: Constructable): RuleResult {
        switch (action) {
            case AbilityAction.Create:
            case AbilityAction.Retrieve:
            case AbilityAction.Delete:
                return this.can(action, item, subject);
            case AbilityAction.Update:
                if (!updatedItem) {
                    throw Error("You must provide the updatedItem with the Update action.");
                }
                return this.canModify(action, item, updatedItem, subject);
            case AbilityAction.Manage:
                throw Error("You can not check the rule for manage. Manage is a shortcut for all other abilities.");
        }
    }

    canCreate(item: Item, subject?: Constructable): boolean {
        return this.can(AbilityAction.Create, item, subject).result;
    }

    canRetrieve(item: Item, subject?: Constructable): boolean {
        return this.can(AbilityAction.Retrieve, item, subject).result;
    }

    canDelete(item: Item, subject?: Constructable): boolean {
        return this.can(AbilityAction.Delete, item, subject).result;
    }

    canUpdate(item: Item, updatedItem: Item, subject?: Constructable): boolean {
        return this.canModify(AbilityAction.Update, item, updatedItem, subject).result;
    }

    private canModify(action: AbilityAction, item: Item, updatedItem: Item, subject?: Constructable): RuleResult {
        let can = false;
        let finalRule = undefined;
        for (let ability of this.abilities) {
            if (AbilityValidator.domainMatches(ability, action, item, subject)) {
                switch (ability.permission) {
                    case Permission.Can:
                        if (
                            AbilityValidator.anyWhereMatches(item, ability.where) &&
                            AbilityValidator.anyWhereMatches(updatedItem, ability.where, false)
                        ) {
                            finalRule = ability;
                            can = !AbilityValidator.isUpdateBlacklisted(ability.blacklist, item, updatedItem);
                        }
                        break;
                    case Permission.Cannot:
                        if (AbilityValidator.anyWhereMatches(item, ability.where) || AbilityValidator.anyWhereMatches(updatedItem, ability.where)) {
                            finalRule = ability;
                            can = false;
                        }
                        break;
                }
            }
        }
        return {rule: finalRule, result: can}
    }

    private can(action: AbilityAction, item: Item, subject?: Constructable): RuleResult {
        let can = false;
        let finalRule = undefined;
        for (let ability of this.abilities) {
            if (AbilityValidator.domainMatches(ability, action, item, subject)) {
                switch (ability.permission) {
                    case Permission.Can:
                        if (AbilityValidator.anyWhereMatches(item, ability.where)) {
                            finalRule = ability;
                            can = !AbilityValidator.isBlacklisted(ability.blacklist, item);
                        }
                        break;
                    case Permission.Cannot:
                        if (AbilityValidator.anyWhereMatches(item, ability.where)) {
                            finalRule = ability;
                            can = false;
                        }
                        break;
                }
            }
        }
        return {rule: finalRule, result: can};
    }
}