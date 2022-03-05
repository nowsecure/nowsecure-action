# Contributing

To contribute to this repository, please first
ensure that the change does not already have an issue.
If an issue exists please assign it to yourself.

It is not required to open an issue before creating a Pull Request.
However, if your change is a larger feature feel free to open one
and discuss.

## Developing

When making a contribution from outside the [Nowsecure Organization][]
please fork the repository and begin work on the fork.

### Requirements

- Nodejs `> 17`
- Typescript `> 4`
- Yarn `> 1`

### Build

To build run the following:

```bash
yarn install
yarn build
```

To publish please run:

```bash
yarn prepare-release
```

This will bundle all node_modules.

### Testing

This action tests itself, in order to have all tests run and pass
the following variables must be added to the action secrets:

- `NS_TOKEN` - Nowsecure Platform Token
- `NS_GROUP_ID` - Group ID for the application in Platform

### Checking In

- Do check-in source (src)
- Do check-in build output (dist)

[Nowsecure Organization]: https://github.com/nowsecure
