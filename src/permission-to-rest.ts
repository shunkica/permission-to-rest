type Constructable = { new(...args: any[]): any; };
type Item = { [key: string]: any | any[] };

export class Ability {
    constructor(
        public readonly permission: Permission,
        public readonly action: AbilityAction,
        public readonly subject: "ALL" | Constructable,
        public readonly where?: Item,
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
    readonly abilities: Ability[] = [];

    can = (action: AbilityAction, subject: "ALL" | Constructable, where?: Item, blacklist?: Array<string>) => {
        this.abilities.push(new Ability(Permission.Can, action, subject, where, blacklist));
    };

    cannot = (action: AbilityAction, subject: "ALL" | Constructable, where?: Item) => {
        this.abilities.push(new Ability(Permission.Cannot, action, subject, where));
    };
}

export class AbilityValidator {
    constructor(private readonly abilities: Array<Ability>) {
    }

    private static domainMatches(ability: Ability, action: AbilityAction, item: Item) {
        return (ability.subject === "ALL" || ability.subject === item.constructor) &&
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

    canCreate(item: Item) {
        return this.can(AbilityAction.Create, item);
    }

    canRetrieve(item: Item) {
        return this.can(AbilityAction.Retrieve, item);
    }

    canDelete(item: Item) {
        return this.can(AbilityAction.Delete, item);
    }

    canUpdate(item: Item, updatedItem: Item) {
        let can = false;
        for (let ability of this.abilities) {
            if (AbilityValidator.domainMatches(ability, AbilityAction.Update, item)) {
                switch (ability.permission) {
                    case Permission.Can:
                        if (
                            AbilityValidator.whereMatches(item, ability.where) &&
                            AbilityValidator.whereMatchesOptional(updatedItem, ability.where)
                        ) {
                            can = !AbilityValidator.isUpdateBlacklisted(ability.blacklist, item, updatedItem);
                        }
                        break;
                    case Permission.Cannot:
                        if (AbilityValidator.whereMatches(item, ability.where) || AbilityValidator.whereMatches(updatedItem, ability.where)) {
                            can = false;
                        }
                        break;
                }
            }
        }
        return can;
    }

    private can(action: AbilityAction, item: Item) {
        let can = false;
        for (let ability of this.abilities) {
            if (AbilityValidator.domainMatches(ability, action, item)) {
                switch (ability.permission) {
                    case Permission.Can:
                        if (AbilityValidator.whereMatches(item, ability.where)) {
                            can = !AbilityValidator.isBlacklisted(ability.blacklist, item);
                        }
                        break;
                    case Permission.Cannot:
                        if (AbilityValidator.whereMatches(item, ability.where)) {
                            can = false;
                        }
                        break;
                }
            }
        }
        return can;
    }
}