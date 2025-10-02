# Advanced Configurations

The NowSecure Action supports a number of customizations and features. These are
documented here.

- [Action Configuration](#action-configuration) (recommended reading)
- [GitHub Summary Page](#github-summary-page)
- [Per-app Filters](#per-app-filters)
- [Configuring Finding IDs Generation](#configuring-finding-ids-generation)
- [SBOM Generation](#sbom-generation)
- [Custom Build Version Strings](custom-build-version-strings)
- [Saving Action Minutes](#saving-action-minutes)
- [Minimum Score Thresholds](#minimum-score-thresholds)

## Action Configuration

The NowSecure Action is further configurable via an additional file stored in the repo.
By default, it is called `.nsconfig.yml` and is placed in the root of the repo, however the name and path are configurable via the `config` and `config_path` workflow parameters.

This file allows you to configure:

- A minimum severity filter (the default configuration includes critical, high and medium NowSecure findings)
- A list of check IDs to include
- A list of check IDs to exclude
- Whether warnings should be shown

A list of check IDs is available to NowSecure customers in the [help center](https://support.nowsecure.com/hc/en-us/articles/10395931666445).

An example is provided:

```yml
minimum-severity: medium # Can be one of [critical, high, medium, low, info]
include-checks:
  - apk_hardcoded_keys
  - apk_weak_crypto_methods
exclude-checks:
  - android_janus_warn
include-warnings: true
```

## GitHub Summary Page

To view a summary of the results produced by NowSecure in the workflow, enable the top-level `summary` option in the `.nsconfig.yml`.

For example:

```yml
filter:
  example-filter:
    # ...
# Remainder of configuration...
summary: true
```

For more information on GitHub Action summaries, see GitHub's [blog post](https://github.blog/2022-05-09-supercharging-github-actions-with-job-summaries/).

## Per-app Filters

By default, filters will be applied for all invocations of the action. However, it is possible
to have different configurations for different apps via a `configs` key.

For example, the configuration from the previous example can be moved under the `example-workflow-config` key:

```yml
configs:
  example-workflow-config:
    filter:
      include-warnings: true
      minimum-severity: medium
```

The `example-workflow-config` can then be referenced by your workflow:

```yml
- name: NowSecure
  uses: nowsecure/nowsecure-action/convert-sarif@v3
  timeout-minutes: 60
  with:
    # Specify a config in .nsconfig.yml
    config: example-workflow-config
    # ...
```

Filters can either be defined inline as above or a filter can be created under the `filters:` key and then referenced within your config as shown below:

```yml
filter:
  example-filter: # Define a filter that can be used in multiple configs
    include-warnings: true
    minimum-severity: medium

configs:
  example-workflow-config:
    # use the filter defined above
    filter: example-filter
```

## Configuring Finding IDs Generation

The actions derive a persistent ID from the finding key, the platform and the package name. This key is used to deduplicate alerts in GHAS. It can be controlled by the `key` element in `.nsconfig.yml`, declared either at the root or as part of a `config` element.

> Note: This is a change from the ID derivation in v2.1.1 and prior. To continue using the old key function, set the `v1-key` to the platform and package you are assessing.

For example:

```yml
key:
  platform: false # Don't use the platform when deriving an ID
  package: false # Don't use the package when deriving an ID
  v1-key: android com.example.app # Use the old function for "com.example.app" on Android
```

## Dependency Insights Generation

To attach NowSecure SBOM data into Dependency Insights, in the `with:` section of the `convert-sarif` action, add `enable_dependencies: true`. As well, the job requires the `contents: write` permission (under the `permissions:` key in the workflow-level or job-level).

## Custom Build Version Strings

A custom version string can be attached to a build uploaded for analysis, overriding the version string contained in the package file.
The custom string will be displayed in the "Version" column of the application list in Platform.

To set a custom build version, add a `version_string` to the `with:` section of the `upload-app` action. For example, to tag the build with the
hash of the commit that triggered the action:

```yml
- id: upload
  name: NowSecure upload app
  uses: nowsecure/nowsecure-action/upload-app@v3
  with:
    version_string: ${{ github.sha }}
    platform_token: ${{ secrets.NS_TOKEN }}
    app_file: app-insecure-debug.apk
    group_id: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

## Analysis type

The `upload-app` action can specify the type of analysis to perform if a full (static + dynamic) analysis is not required.

To configure the analysis type, add an `analysis_type` input to the `with:` section of the `upload-app` action. Possible values are:

- `full`: Perform a full analysis, scanning for static and dynamic findings.
- `static`: Scan for static findings only.
- `dependencies`: Show dependencies in Insights > Dependency Graph (see [Dependency Insights Generation](#Dependency Insights Generation)).

If the input is not specified a full analysis will be run.

Static-only and dependency-only analyses do not attempt to decrypt encrypted binaries as
these analyses are intended to provide a rapid result for e.g. a CI/CD pipeline. An encrypted
binary will fail to analyze.

Please note:
The assessment status on NowSecure Platform UI does not reflect successful completion of
static-only or dependencies-only analysis. The labels in the UI will be "Partial Results"
and "Failed Dynamic Analysis" due to the lack of a dynamic analysis.

```yml
- id: upload
  name: NowSecure upload app
  uses: nowsecure/nowsecure-action/upload-app@v3
  with:
    analysis_type: static
    platform_token: ${{ secrets.NS_TOKEN }}
    app_file: app-insecure-debug.apk
    group_id: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

## Saving Action Minutes

The NowSecure Action polls the NowSecure Platform to retrieve results for app assessments. In some cases it is not desirable to run the action for prolonged periods of time because it can
incur billing overhead. However, it is possible to take advantage of GitHub Environments (available to Enterprise customers for private repos) to delay the execution of the `convert-sarif` action to save action minutes.

To enable this functionality, go to "Settings" on your repository and then click "Environments". Create a new environment with the "New environment" button and call it "nowsecure-env". Then in the configuration page, add a "Wait timer" and configure the amount of delay you would like before the NowSecure Action begins polling (make sure to click "Save protection rules").

Then in the action workflow, add an `environment:` key under the stage that runs the `convert-sarif` action. For example:

```yml
process:
  # ...
  runs-on: ubuntu-latest
  # Change the name field as needed.
  environment:
    name: nowsecure-env
  needs: scan
  # ...
```

This will delay the execution of the example `process` stage by the amount of minutes specified for the wait timer in the the "nowsecure-env" environment.

## Minimum Score Thresholds

The NowSecure Action also provides an optional `minimum_score` input which represents the score that your assessment needs to exceed.
If it does not, your pipeline will fail. This is valuable to ensure that your application's security scores do not decline as new versions are released.

If the `minimum_score` input is not set, it will not be evaluated.

Note that this input is available on both the `convert-sarif` and `create-issues` actions.

```yml
- name: NowSecure download report
  uses: nowsecure/nowsecure-action/convert-sarif@v3
  with:
    report_id: ${{ needs.scan.outputs.report_id }}
    platform_token: ${{ secrets.NS_TOKEN }}
    group_id: ${{ vars.NS_GROUP }}
    # TODO: Switch to whatever score threshold is right for your organization
    minimum_score: 40
```

```yml
- name: NowSecure download report
  uses: nowsecure/nowsecure-action/create-issues@v3
  with:
    report_id: ${{ needs.scan.outputs.report_id }}
    platform_token: ${{ secrets.NS_TOKEN }}
    group_id: ${{ vars.NS_GROUP }}
    config: "issues"
    # TODO: Switch to whatever score threshold is right for your organization
    minimum_score: 40
```
