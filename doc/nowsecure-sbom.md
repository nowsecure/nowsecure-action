## About NowSecure SBOM and GitHub Dependabot

NowSecure GitHub Action supports GitHub Dependency Graph, which aids developers and GitHub Dependabot to surface third-party mobile app libraries and provides visibility into out-of-date and insecure dependencies. This new capability enables teams to configure the NowSecure GitHub Action to populate a mobile Software Bill of Materials (SBOM) for each app.

  
**Note**: Learn more about Github Dependabot API [here](https://docs.github.com/en/code-security/supply-chain-security/understanding-your-software-supply-chain/using-the-dependency-submission-api).

## Value of the GitHub Action

Configuring your NowSecure GitHub action with this option enables you to:

-   Generate an SBOM for your mobile app inside your GitHub Workflow
-   Populate GitHub Dependabot Graph with mobile details
-   Gain visibility into components, third-party libraries and frameworks
-   Ensure proper version, security, and privacy

## How it Works

The NowSecure Action generates a Mobile SBOM for an application and submits it to the Dependency submission API by:

-   Integrating with GitHub's Dependency submission API to display mobile dependencies inside of GitHub Dependabot alerts
-   Running scans for each commit, or periodically


## Prerequisites

See  [README.md](https://github.com/nowsecure/nowsecure-action/blob/main/README.md#prerequisites)

## GitHub Marketplace Config (Recommended)

Go to the  [GitHub Marketplace](https://github.com/marketplace?type=&verification=&query=NowSecure+Mobile+SBOM+)  and select the  **NowSecure Mobile SBOM**  action, then select  **Use latest version**  and follow the annotated workflow.


## Setup

**For an  _existing_  workflow:**

The action must be run on an  `ubuntu-latest`  GitHub Action runner. After the application build step, run the NowSecure Mobile SBOM action:

```yaml
- name: NowSecure upload app
  uses: nowsecure/nowsecure-sbom-action@v1
  timeout-minutes: 60
  with:
    token: ${{ secrets.NS_TOKEN }}
    app_file: $APPLICATION_PATH # REPLACE: The path to an .ipa or .apk
    group_id: $GROUP_ID         # REPLACE: NowSecure Group ID
```

**For a  _new_  workflow:**

Add a new file called  `nowsecure-sbom.yml`  in your  `.github/workflows`  folder and review the NowSecure  [example](https://github.com/nowsecure/nowsecure-sbom-action/blob/main/workflows/nowsecure-sbom.yml).

## Results

Developers can configure a repo to automatically populate dependency graphs with NowSecure Platform assessment results that identify third-party libraries listed in NowSecure SBOM. This includes transitive dependencies found while running an app dynamically.

Once the GitHub dependency graph is populated, GitHub tooling and automation can be applied such as:

-   GitHub automatically generating alerts and update pull requests for older mobile libraries found by NowSecure
-   GitHub automatically detecting security issue in libraries found by NowSecure via the existing GitHub integration with National Vulnerability Database
