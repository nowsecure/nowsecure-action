# NowSecure Action v2
  
The primary advantage of migrating from v1 to v2 is flexibility. It is possible to perform operations with the created Report ID, as well as utilize GitHub Environments to reduce billable minutes.
  
Given a configuration similar to:

```yaml
- name: NowSecure
  uses: nowsecure/nowsecure-action@v1
  timeout-minutes: 60
  with:
    token: ${{ secrets.NS_TOKEN }}
    app_file: YOUR_APP_FILE
    group_id: YOUR_GROUP_ID
  
- name: Upload SARIF file
  uses: github/codeql-action/upload-sarif@v1
  with:
    sarif_file: NowSecure.sarif
```

Rewrite your configuration as follows:

```yaml
- id: upload
  name: NowSecure Upload App
  uses: nowsecure/nowsecure-action/upload-app@v2
  with:
    token: ${{ secrets.NS_TOKEN }}
    app_file: YOUR_APP_FILE
    group_id: YOUR_GROUP_ID
  
- id: pull_report
  name: NowSecure Convert SARIF
  uses: nowsecure/nowsecure-action/convert-sarif@v2
  timeout-minutes: 60
  with:
   report_id: ${{ steps.upload.outputs.report_id }}
   token: ${{ secrets.NS_TOKEN }}
   group_id: YOUR_GROUP_ID
  
- name: Upload SARIF file
  uses: github/codeql-action/upload-sarif@v1
  with:
    sarif_file: NowSecure.sarif

```
