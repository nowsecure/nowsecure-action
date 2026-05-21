# `nowsecure-action`

The `nowsecure-action` delivers fast, accurate, automated security analysis of iOS and Android apps coded in any language.

> Note: The version listed on the Marketplace is old. Please refer to the "Releases" tab on the GitHub page for more information.

**Features**:

- Integrates with [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security) (GHAS) to display issues and remediation information inside of GitHub code scanning alerts
- Run scans for each commit, or on a schedule
- Show alerts inside of GitHub issues
- And more!

## Configuration

All sub-actions accept an `api_url` input (default: `https://api.nowsecure.com`) that controls the single API endpoint used for all requests — both binary uploads and GraphQL queries.

The `lab_api_url` input is accepted for backward compatibility but is **ignored**. If you have it set in an existing workflow, it can be safely removed.

## Documentation

To configure the action, see our [documentation](./docs).

Example workflows can be found in the [workflows](./workflows) folder.

## License

This project is released under the [MIT License](https://github.com/nowsecure/nowsecure-action/blob/master/LICENSE).

NowSecure Platform, used in this action, has separate [Terms and Conditions](https://www.nowsecure.com/terms-and-conditions/) and requires a valid license to function.
