# GitHub Issues Integration

For users of the action who do not have a GitHub Advanced Security license, it is possible to have NowSecure alerts appear in the "Issues" tab on GitHub.

See the [Getting Started](./getting-started.md) guide for prerequisites.

## For a New Workflow

For the easiest setup, see our [example annotated issues workflow](../workflows/issues.yml).

## For an Existing Workflow

After the stage that builds your application (e.g. called `build`), create a new stage called `scan`:

```yml
scan:
  runs-on: ubuntu-latest
  outputs:
    report_id: ${{ steps.upload.outputs.report_id }}
  # The stage that builds the application.
  needs: build
  steps:
    - name: Checkout repository
      uses: actions/checkout@v2

    # Replace with whatever pulls the application file before we upload.
    - name: Download application
      uses: actions/download-artifact@v2
      with:
        # Generated in the "build" stage.
        name: app

    - id: upload
      name: NowSecure Upload App
      uses: nowsecure/nowsecure-action/upload-app@v3
      with:
        platform_token: ${{ secrets.NS_TOKEN }}
        # TODO: Replace application path.
        app_file: "example.apk"
        # TODO: Replace the Group ID.
        group_id: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX"
```

Then introduce another stage, called `process` which retrieves the results from the NowSecure Platform and converts the results to GitHub Issues:

```yml
process:
  if: ${{ needs.scan.outputs.report_id }}
  runs-on: ubuntu-latest
  # The above stage we introduced.
  needs: scan
  steps:
    - name: Checkout repository
      uses: actions/checkout@v2

  - id: createIssues
    name: Create NowSecure issues
    uses: nowsecure/nowsecure-action/create-issues@v3
    timeout-minutes: 60
    with:
      report_id: ${{ needs.scan.outputs.report_id }}
      platform_token: ${{ secrets.NS_TOKEN }}
      config: "issues"
```
