# `nowsecure-action`

The `nowsecure-action` delivers fast, accurate, automated security analysis of iOS and Android apps coded in any language.

**Features**:

- Integrates with [GitHub Advanced Security](https://docs.github.com/en/get-started/learning-about-github/about-github-advanced-security) (GHAS) to display issues and remediation information inside of GitHub code scanning alerts,
- Optionally break builds that introduce new alerts,
- Run scans for each commit, or periodically,
- And more;

### Prerequisites

- To use this action an active NowSecure Platform account is required. If you **_are not_** an existing NowSecure Platform customer, please [contact us](https://info.nowsecure.com/github-request).
- An active GitHub account (cloud or on-prem) with an active Advanced Security feature

### GitHub Marketplace Setup (recommended)

Click the "Security" tab in your repository (GHAS must be enabled) then "Set up code scanning" then select the NowSecure action from the marketplace and follow the listed instructions.

### Setting up this Action

- First, generate your NowSecure platform token.
  - To generate a token, in the UI, go to the "Profile & Preferences" page and click “Create Token”
- Then, In the repository settings, set up a new NS_TOKEN token by clicking "Secrets" and then "New repository secret"
- Next, copy the group ID for the group you would like to pull from
  - To find your group ID, in the UI, go to your app’s “Package Details” page and copy the Group ID by hovering over the group name
- Lastly, enable scanning alerts in GitHub.
  - Click the "Security" tab in your repository (GHAS must be enabled) then "Set up code scanning" then select the NowSecure action from the marketplace and follow the listed instructions.

### Required Configuration

For an _existing_ workflow,

The action must be run on an `ubuntu-latest` GitHub Action runner.

> Note: For line-of-code identification, `ripgrep` must be available in the runner. For Ubuntu images, add a step for `apt-get install -y ripgrep`.

After the application build step run the NowSecure action and upload the SARIF to GHAS:

```yml
- name: NowSecure
  uses: nowsecure/nowsecure-action/convert-sarif@v3
  timeout-minutes: 60
  with:
    platform_token: ${{ secrets.NS_TOKEN }}
    app_file: $APPLICATION_PATH # REPLACE: The path to an .ipa or .apk
    group_id: $GROUP_ID # REPLACE: NowSecure Group ID

- name: Upload SARIF file
  uses: github/codeql-action/upload-sarif@v1
  with:
    path: NowSecure.sarif
```

### Custom Configuration (Optional)

An `.nsconfig.yml` file in the root of the repo allows you to configure a minimum-severity filter (the default is medium which includes critical, high, and medium findings), a list of [checkIds](src/utils/config-types.ts) to include, as well as a list of [checkIds](https://github.com/nowsecure/nowsecure-action/blob/main/workflows/nowsecure.yml) to exclude from the code scanning alerts, and whether to include warnings.

```yml
minimum-severity: medium # Can be one of [critical, high, medium, low, info]
include-checks:
  - apk_hardcoded_keys
  - apk_weak_crypto_methods
exclude-checks:
  - android_janus_warn
include-warnings: true
```

A filter defined in this way will be used for all jobs.

To specify a different filter for each job, add a key in `.nsconfig.yml` under the `configs` key, reference that config in the workflow definition using the `config:` key in the `with:` section

`workflow.yml`:

```yml
jobs:
  # ... build and upload the app to NowSecure

  # Pulls the NowSecure report, converts it to SARIF and uploads it.
  process:
    if: ${{ needs.scan.outputs.report_id }}
    runs-on: ubuntu-latest
    environment:
      name: nowsecure-env
    needs: scan
    steps:
      - name: Checkout repository
        uses: actions/checkout@v2

      - name: NowSecure download report
        uses: nowsecure/nowsecure-action/convert-sarif@v3
        timeout-minutes: 60
        with:
          # Specify a config in .nsconfig.yml
          config: example-workflow-config
          report_id: ${{ needs.scan.outputs.report_id }}
          platform_token: ${{ secrets.NS_TOKEN }}
```

`.nsconfig.yml`

```yml
configs:
  # define example-workflow-config for use in workflow.yml
  example-workflow-config:
    filter:
      include-warnings: true
      minimum-severity: medium
```

Filters can either be defined inline as above, or defined by references to a named filter defined under the `filters:` key

```yml
filter:
  example-filter: # define a filter that can be used in multiple configs
    include-warnings: true
    minimum-severity: medium

configs:
  example-workflow-config:
    # use the filter defined above
    filter: example-filter
```

For a _new_ workflow,

Add a new file called `nowsecure.yml` in your `.github/workflows` folder and review the [example](https://github.com/nowsecure/nowsecure-action/blob/main/workflows/nowsecure.yml).

### Finding IDs

The actions derive a persistent ID from the finding key, the platform and the package name. This can be controlled by the `key` element in `.nsconfig.yml`,
declared either at the root or as part of a `config` element.

NB: This is a change from the ID derivation in v2.1.1 and prior. To continue using the old key function, set the v1-key to the platform and package you are assessing.

```yml
key:
  platform: false # Don't use the platform when deriving an ID
  package: false # Don't use the package when deriving an ID
  v1-key: android com.example.app # use the old key function for com.example.app on android
```

## License

This project is released under the [MIT License](https://github.com/nowsecure/nowsecure-action/blob/master/LICENSE).

NowSecure Platform, used in this action, has separate [Terms and Conditions](https://www.nowsecure.com/terms-and-conditions/) and requires a valid license to function.
