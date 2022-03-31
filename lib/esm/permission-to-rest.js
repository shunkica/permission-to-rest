export class Ability {
    constructor(permission, action, subject, where, blacklist) {
        this.permission = permission;
        this.action = action;
        this.subject = subject;
        this.where = where;
        this.blacklist = blacklist;
    }
}
export var AbilityAction;
(function (AbilityAction) {
    AbilityAction["Manage"] = "MANAGE";
    AbilityAction["Create"] = "CREATE";
    AbilityAction["Retrieve"] = "RETRIEVE";
    AbilityAction["Update"] = "UPDATE";
    AbilityAction["Delete"] = "DELETE";
})(AbilityAction || (AbilityAction = {}));
var Permission;
(function (Permission) {
    Permission["Can"] = "CAN";
    Permission["Cannot"] = "CANNOT";
})(Permission || (Permission = {}));
export class AbilityBuilder {
    constructor() {
        this.abilities = [];
        this.can = (action, subject, where, blacklist) => {
            this.abilities.push(new Ability(Permission.Can, action, subject, where, blacklist));
        };
        this.cannot = (action, subject, where) => {
            this.abilities.push(new Ability(Permission.Cannot, action, subject, where));
        };
    }
}
export class AbilityValidator {
    constructor(abilities) {
        this.abilities = abilities;
    }
    static domainMatches(ability, action, item) {
        return (ability.subject === "ALL" || ability.subject === item.constructor) &&
            (ability.action === AbilityAction.Manage || ability.action === action);
    }
    static whereMatchesOptional(item, where) {
        if (!where)
            return true;
        let sharedProperties = {};
        for (const [prop, value] of Object.entries(where)) {
            if (!item.hasOwnProperty(prop))
                continue;
            sharedProperties[prop] = value;
        }
        return this.whereMatches(item, sharedProperties);
    }
    static whereMatches(item, where) {
        if (!where)
            return true;
        for (const [prop, value] of Object.entries(where)) {
            if (value instanceof Array) {
                let didMatch = false;
                for (const val of value) {
                    if (!item.hasOwnProperty(prop)) {
                        if (val === undefined) {
                            didMatch = true;
                            break;
                        }
                    }
                    else if (item[prop] === val) {
                        didMatch = true;
                        break;
                    }
                }
                if (!didMatch)
                    return false;
            }
            else {
                if (item.hasOwnProperty(prop)) {
                    if (item[prop] !== value)
                        return false;
                }
                else {
                    if (value !== undefined)
                        return false;
                }
            }
        }
        return true;
    }
    static isBlacklisted(blacklist, item) {
        if (!blacklist)
            return false;
        for (let prop of blacklist) {
            if (item.hasOwnProperty(prop))
                return true;
        }
        return false;
    }
    static isUpdateBlacklisted(blacklist, item, updatedItem) {
        if (!blacklist)
            return false;
        for (let prop of blacklist) {
            if (updatedItem.hasOwnProperty(prop)) {
                if (!item.hasOwnProperty(prop)) {
                    return true;
                }
                else if (item[prop] !== updatedItem[prop]) {
                    return true;
                }
            }
        }
        return false;
    }
    canCreate(item) {
        return this.can(AbilityAction.Create, item);
    }
    canRetrieve(item) {
        return this.can(AbilityAction.Retrieve, item);
    }
    canDelete(item) {
        return this.can(AbilityAction.Delete, item);
    }
    canUpdate(item, updatedItem) {
        let can = false;
        for (let ability of this.abilities) {
            if (AbilityValidator.domainMatches(ability, AbilityAction.Update, item)) {
                switch (ability.permission) {
                    case Permission.Can:
                        if (AbilityValidator.whereMatches(item, ability.where) &&
                            AbilityValidator.whereMatchesOptional(updatedItem, ability.where)) {
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
    can(action, item) {
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
