# Getting Started

To use this action an active NowSecure Platform account is required. If you **_are not_** an existing NowSecure Platform customer, please [contact us](https://info.nowsecure.com/github-request).

> Note: If you are upgrading from a previous version of the NowSecure Action, please see [Migrating to V3](./migrating-to-v3.md).

## Prerequisites

- Get a token from your NowSecure platform instance. More information on this can be found in the 
[NowSecure Support Portal](https://support.nowsecure.com/hc/en-us/articles/7499657262093-Creating-a-NowSecure-Platform-API-Bearer-Token)

- Identify the ID of the group in NowSecure Platform that you want your assessment to be included in. 
More information on this can be found in the 
[NowSecure Support Portal](https://support.nowsecure.com/hc/en-us/articles/38057956447757-Retrieve-Reference-and-ID-Numbers-for-API-Use-Task-ID-Group-App-and-Assessment-Ref). 

- Add a [GitHub Actions Secret](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/use-secrets) to your project named, `NS_TOKEN` and add the token created above.  

- (For GHAS integration) An active GitHub account (cloud or on-prem) with an active Advanced Security feature

## Basic Configuration

### For a New Workflow

For the easiest setup, see the [example annotated workflow](../.github/workflows/basic-example.yml).

### For an Existing Workflow

> Note: The NowSecure Action leverages ripgrep. For Ubuntu images, add a step for `apt-get install -y ripgrep`

After the stage that builds your application, create a new stage called `scan`:

```yml
scan:
  runs-on: ubuntu-latest
  outputs:
    report_id: ${{ steps.upload.outputs.report_id }}
  # The stage that builds the application.
  needs: build
  steps:
    - name: Checkout repository
      uses: actions/checkout@v5

    # Replace with whatever pulls the application file before we upload.
    - name: Download application
      uses: actions/download-artifact@v5
      with:
        name: app

    - name: Install ripgrep
      run: sudo apt-get install -y ripgrep

    - id: upload
      name: NowSecure upload app
      uses: nowsecure/nowsecure-action/upload-app@v3
      with:
        platform_token: ${{ secrets.NS_TOKEN }}
        # TODO: Replace application path.
        app_file: "example.apk"
        # TODO: Replace the Group ID.
        group_id: ${{ vars.GROUP_ID }}
```

Then introduce another stage, called `process` which retrieves the results from the NowSecure Platform and converts the results to SARIF for GHAS:

```yml
process:
  if: ${{ needs.scan.outputs.report_id }}
  runs-on: ubuntu-latest
  # The above stage we introduced.
  needs: scan
  steps:
    - name: Checkout repository
      uses: actions/checkout@v5

    - name: NowSecure download report
      uses: nowsecure/nowsecure-action/convert-sarif@v3
      timeout-minutes: 60
      with:
        report_id: ${{ needs.scan.outputs.report_id }}
        platform_token: ${{ secrets.NS_TOKEN }}
        group_id: ${{ vars.GROUP_ID }}

    - name: Upload SARIF file
      uses: github/codeql-action/upload-sarif@v3
      with:
        sarif_file: NowSecure.sarif
```
