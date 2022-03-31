declare type Constructable = {
    new (...args: any[]): any;
};
declare type Item = {
    [key: string]: any | any[];
};
export declare class Ability {
    readonly permission: Permission;
    readonly action: AbilityAction;
    readonly subject: "ALL" | Constructable;
    readonly where?: Item | undefined;
    readonly blacklist?: string[] | undefined;
    constructor(permission: Permission, action: AbilityAction, subject: "ALL" | Constructable, where?: Item | undefined, blacklist?: string[] | undefined);
}
export declare enum AbilityAction {
    Manage = "MANAGE",
    Create = "CREATE",
    Retrieve = "RETRIEVE",
    Update = "UPDATE",
    Delete = "DELETE"
}
declare enum Permission {
    Can = "CAN",
    Cannot = "CANNOT"
}
export declare class AbilityBuilder {
    readonly abilities: Ability[];
    can: (action: AbilityAction, subject: "ALL" | Constructable, where?: Item | undefined, blacklist?: string[] | undefined) => void;
    cannot: (action: AbilityAction, subject: "ALL" | Constructable, where?: Item | undefined) => void;
}
export declare class AbilityValidator {
    private readonly abilities;
    constructor(abilities: Array<Ability>);
    private static domainMatches;
    private static whereMatchesOptional;
    private static whereMatches;
    private static isBlacklisted;
    private static isUpdateBlacklisted;
    canCreate(item: Item): boolean;
    canRetrieve(item: Item): boolean;
    canDelete(item: Item): boolean;
    canUpdate(item: Item, updatedItem: Item): boolean;
    private can;
}
export {};
