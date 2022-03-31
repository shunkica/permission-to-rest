import {Ability, AbilityAction, AbilityBuilder, AbilityValidator} from "../src/permission-to-rest"

class Foo {
    constructor(public id: number = 1, public name: string | undefined = undefined, public isActive: boolean = true) {
    }
}

class Bar {
    constructor(public id: number = 1, public name: string | undefined = undefined, public isActive: boolean = true) {
    }
}

describe("abilityvalidator tests", () => {
    const {Manage, Create, Update, Retrieve, Delete} = AbilityAction;
    const All = "ALL";
    let can: any, cannot: any, abilities: any;
    let ab: AbilityBuilder;

    beforeEach(() => {
        ab = new AbilityBuilder();
        can = ab.can;
        cannot = ab.cannot;
        abilities = ab.abilities;
    });

    describe("abilityvalidator domain test", () => {
        it("forbids all if no rules", () => {
            testAbilities(abilities, false, false, false, false);
        });

        it("allows all", () => {
            can(Manage, All);
            testAbilities(abilities, true, true, true, true);
        });

        it("allows only retrieve", () => {
            can(Retrieve, All);
            testAbilities(abilities, false, true, false, false);
        });

        it("allows only update", () => {
            can(Update, All);
            testAbilities(abilities, false, false, true, false);
        });

        it("allows only create", () => {
            can(Create, All);
            testAbilities(abilities, true, false, false, false);
        });

        it("allows only delete", () => {
            can(Delete, All);
            testAbilities(abilities, false, false, false, true);
        });

        it("does not apply rule for Foo subject to plain item", () => {
            can(Manage, Foo);
            testAbilities(abilities, false, false, false, false);
        });

        it("does apply rule for Foo subject to Foo item", () => {
            can(Manage, Foo);
            testAbilities(abilities, true, true, true, true, new Foo());
        });

        it("does not apply rule for Bar subject to Foo item", () => {
            can(Manage, Bar);
            testAbilities(abilities, false, false, false, false, new Foo());
        });
    });

    describe("abilityvalidator where test", () => {

        it("ignores where if where is null", () => {
            can(Manage, All, null);
            testAbilities(abilities, true, true, true, true);
        });

        it("ignores where if where is undefined", () => {
            can(Manage, All, undefined);
            testAbilities(abilities, true, true, true, true);
        });

        it("ignores where if where is an empty object", () => {
            can(Manage, All, {});
            testAbilities(abilities, true, true, true, true);
        });

        it("allows manage plain if where matches", () => {
            can(Manage, All, {id: 1});
            testAbilities(abilities, true, true, true, true, {id: 1});
        });

        it("forbids manage plain if where does not match", () => {
            can(Manage, All, {id: 2});
            testAbilities(abilities, false, false, false, false, {id: 1});
        });

        it("allows manage Foo if where matches", () => {
            can(Manage, Foo, {id: 1});
            testAbilities(abilities, true, true, true, true, new Foo());
        });

        it("forbids manage Foo if where does not match", () => {
            can(Manage, Foo, {id: 2});
            testAbilities(abilities, false, false, false, false, new Foo());
        });

        it("allows manage Foo if where array matches", () => {
            can(Manage, Foo, {id: [1, 2]});
            testAbilities(abilities, true, true, true, true, new Foo());
        });

        it("forbids manage Foo if where array does not match", () => {
            can(Manage, Foo, {id: [2, 3]});
            testAbilities(abilities, false, false, false, false, new Foo());
        });

        it("ignores non existing properties if undefined", () => {
            can(Manage, Foo, {doesnotexist: undefined});
            testAbilities(abilities, true, true, true, true, new Foo());
        });

        it("does not ignore non existing properties if defined", () => {
            can(Manage, Foo, {doesnotexist: "foo"});
            testAbilities(abilities, false, false, false, false, new Foo());
        });

        it("matches against multiple properties", () => {
            can(Manage, Foo, {id: 1, isActive: true});
            testAbilities(abilities, true, true, true, true, new Foo());
        });

        it("does not match if all properties do not match", () => {
            can(Manage, Foo, {id: 1, isActive: false});
            testAbilities(abilities, false, false, false, false, new Foo());
        });

    });

    describe("abilityvalidator update test", () => {

        it("allows update based on where", () => {
            can(Update, Foo, {id: 1});
            testAbilities(abilities, false, false, true, false, new Foo(), {name: "foo"});
        });

        it("forbids update based on where", () => {
            can(Update, Foo, {id: 1});
            testAbilities(abilities, false, false, false, false, new Foo(), {id: 2});
        });

        it("forbids update based on blacklist", () => {
            can(Update, Foo, {id: 1}, ["name"]);
            testAbilities(abilities, false, false, false, false, new Foo(), {name: "foo"});
        });

        it("allows update based on blacklist if the property in question did not change from original item", () => {
            can(Update, Foo, {id: 1}, ["name"]);
            testAbilities(abilities, false, false, true, false, new Foo(), {name: undefined});
        });

    });

    describe("abilityvalidator blacklist test", () => {

        it("forbids all if blacklist matches", () => {
            can(Manage, All, null, ["id"]);
            // we need to pass a different id to updateItem than the source item, otherwise update will pass
            testAbilities(abilities, false, false, false, false, new Foo(), {id: 2});
        });

        it("forbids all if at least one of the items in the blacklist matches", () => {
            can(Manage, All, null, ["id", "doesNotExist"]);
            // we need to pass a different id to updateItem than the source item, otherwise update will pass
            testAbilities(abilities, false, false, false, false, new Foo(), {id: 2});
        });

        it("allows all if blacklist doesn't match", () => {
            can(Manage, All, null, ["doesNotExist"]);
            testAbilities(abilities, true, true, true, true, new Foo());
        });

    });
});

function testAbilities(abilities: Ability[], canCreate: boolean, canRetrieve: boolean, canUpdate: boolean, canDelete: boolean, item = {}, updateItem = {}) {
    const ability = new AbilityValidator(abilities);
    expect(ability.canCreate(item)).toEqual(canCreate);
    expect(ability.canRetrieve(item)).toEqual(canRetrieve);
    expect(ability.canUpdate(item, updateItem)).toEqual(canUpdate);
    expect(ability.canDelete(item)).toEqual(canDelete);
}
