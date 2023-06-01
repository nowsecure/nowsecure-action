/** @type {import('ts-jest/dist/types').InitialOptionsTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/lib/"],
};

// Used in tests which utilize the @actions/github module
process.env.GITHUB_REPOSITORY = "exampleOwner/exampleRepo";
process.env.GITHUB_SHA = "exampleSHA";
