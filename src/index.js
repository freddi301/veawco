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
  getPerson(id: string): v1Person;
  addPerson(person: v1Person): void;
};

type v1Person = { id: string, name: string, age: number };

/// let's see what happens if we add some capability to our api

type v2Api = {
  getPerson(id: string): v2Person;
  addPerson(person: v2Person): void;
  allPerson(): Array<v2Person>;
}

type v2Person = v1Person;

/// let's leverage the typechecker (compiler in compiled typed languages) to check if our api is retrocompatible
/// trying to assign an instance of the new version to the old will do the trick

declare var v1ApiControlIntance: v1Api;
declare var v2ApiControlIntance: v2Api;

v1ApiControlIntance = v2ApiControlIntance;

/// let's break the api and see how the compiler can be useful detecting the incompatibilities

type v3Api = {
  getPerson(id: string): v3Person;
  addPerson(person: v3Person): void;
}

type v3Person = v2Person;

declare var v3ApiControlInstance: v3Api;

/// you can see here how the compiler complains
// $ExpectError - erase this line to see the error
v2ApiControlIntance = v3ApiControlInstance; // 'property `allPerson` (Property not found in object type)'
