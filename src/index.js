// @flow

/// # Version Aware Coding
/// the goal: effortless(less-effort) migration between software version
/// collateral effects:
///   - enforce that you api remain always retrocompatible
///   - hotreload code keeping in memory data
///   - safe data migration
/// why you need it: "Move fast, don't break things"
/// keep reading, we will get to a viable automated solution (eventually)(for node at least)

/// as first we declare the contract our program will have with external world

type v1Api = {
  getPerson(id: string): v1Person,
  addPerson(person: v1Person): void
};

type v1Person = { id: string, name: string, age: number };

/// let's see what happens if we add some capability to our api

type v2Api = {
  getPerson(id: string): v2Person,
  addPerson(person: v2Person): void,
  allPerson(): Array<v2Person>
};

type v2Person = v1Person;

/// let's leverage the typechecker (compiler in compiled typed languages) to check if our api is retrocompatible
/// trying to assign an instance of the new version to the old will do the trick 1*

declare var v1ApiControlIntance: v1Api;
declare var v2ApiControlIntance: v2Api;

v1ApiControlIntance = v2ApiControlIntance;

/// let's break the api and see how the compiler can be useful detecting the incompatibilities

type v3Api = {
  getPerson(id: string): v3Person,
  addPerson(person: v3Person): void
};

type v3Person = v2Person; // 2*

declare var v3ApiControlInstance: v3Api;

/// you can see here how the compiler complains
// $ExpectError - erase this line to see the error
v2ApiControlIntance = v3ApiControlInstance; // 'property `allPerson` (Property not found in object type)'

/// lets'see how we can retain runtime data reloading

const v1ApiInstance: v1Api & { people: { [key: string]: v1Person } } = {
  people: {},
  getPerson(id: string): v1Person {
    return this.people[id];
  },
  addPerson(person: v1Person): void {
    this.people[person.id] = person;
  }
};

const v2ApiInstance: v2Api & { people: { [key: string]: v2Person } } = {
  people: Object.assign({}, v1ApiInstance.people), // migration here 3*
  getPerson(id: string): v1Person {
    return this.people[id];
  },
  addPerson(person: v1Person): void {
    this.people[person.id] = person;
  },
  allPerson(): Array<v2Person> {
    return this.people;
  }
};

// example workflow
let entryPoint: any; // 4*
entryPoint = v1ApiInstance; // deployed version 1
(entryPoint: v1Api).addPerson({ id: '1', name: 'fred', age: 23 }); // using version 1
entryPoint = v2ApiInstance; // deployed version 2
(entryPoint: v2Api).allPerson(); // using version 2

/// let's see how we can achieve safe data migration

// first we need our v3 api instance

const v3ApiInstance: v3Api & { people: { [key: string]: v3Person } } = {
  people: {},
  getPerson(id: string): v3Person {
    return this.people[id];
  },
  addPerson(person: v3Person): void {
    this.people[person.id] = person;
  }
};

// then declare v4 api type

type v4Person = { id: string, name: string, age: number, birth: Date };

type v4Api = {
  getPerson(id: string): v4Person,
  // $ExpectError
  addPerson(person: v4Person): void // the error is reported here because v3Person is not compatible with v4Person
};

declare var v4ApiControlInstance: v4Api;
// the error is reported on the v4Api declaration
v3ApiControlInstance = v4ApiControlInstance;

const v4ApiInstance: v4Api & { people: { [key: string]: v4Person } } = {
  // here is our simple migration method that iterates our previous repository and populates the new one
  people: Object.keys(v3ApiInstance.people).reduce((people: { [key: string]: v4Person }, id) => {
    people[id] = v3PersonTov4Person(v3ApiInstance.people[id]);
    return people;
  }, {}),
  getPerson(id: string): v4Person {
    return this.people[id];
  },
  addPerson(person: v4Person): void {
    this.people[person.id] = person;
  }
};

// our adapter function
function v3PersonTov4Person(person: v3Person): v4Person {
  return Object.assign({}, person, { birth: new Date(new Date() - 10 * 60 * 60 * 24 * 365) });
}


/// ## Considerations
/// 1. the target programming language must be typed and support structural typing.
///     For example java will need some tweaks to make work the typechecking between multiple versions of the same interface
/// 2. previous version of code could be pulled automagically from git history and the files with control instances generated in a temporary dir and checked type-checker/compiler
/// 3. if our repository is managed by an orm, a simple copy of the object could do the job
/// 4. we need an central entrypoint somewhere where we can trigger the version change, in node it could be a middleware, in java a servlet coupled with osgi
