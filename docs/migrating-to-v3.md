# Migrating to V3

Migrating from a previous version to V3 is straightforward. However there are two breaking changes in V3 that need to be addressed prior to migrating:

1. Change all tag references (e.g. `@v1` or `@v2`) to the latest version available.
2. Remove all usages of `token` and replace them with `platform_token` in the `with:` clause.

Additionally, if your workflow was based off of our example workflows you will
need to update the `github/codeql-action/upload-sarif` action to avoid warnings
related to use of an outdated Node.js in your workflow. See the documentation for the
CodeQL action for more details: https://github.com/github/codeql-action.

We have added a number of additional features, and it is recommended you review
them on our [Advanced Configuration](./advanced-configurations.md) page to
ensure the best experience.
