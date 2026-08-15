# Entra ID–Based VS Code Marketplace Publishing Notes

## Official references

- https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- https://learn.microsoft.com/en-us/azure/devops/pipelines/library/add-devops-entra-service-connection?view=azure-devops
- https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops
- https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation

## Findings

The current VS Code publishing guide recommends Microsoft Entra ID authentication with workload identity federation and managed identities for secure automated Marketplace publishing. The `vsce` command supports `vsce publish --azure-credential` when the pipeline has obtained an Azure DevOps access token through the configured identity.

The Azure DevOps setup requires an organization, a project, permission to create service connections, and either a user-assigned managed identity or an app registration. The recommended managed-identity flow is: create a user-assigned managed identity; create an Azure DevOps service connection using Azure Resource Manager with manual workload identity federation; copy the issuer and subject identifier; add a federated credential on the managed identity using those values; grant the identity the required Azure permissions; save the service connection; authorize only the publishing pipeline; and grant the identity Contributor access to the Visual Studio Marketplace publisher account.

Microsoft Entra workload identity federation is secretless: an external workload token is exchanged for a Microsoft-issued access token after the configured issuer, subject, and audience trust values match. This avoids storing long-lived PATs. The identity still needs access to the target publisher account; Azure subscription access alone is not sufficient.

A practical Azure Pipelines outline is to use an AzureCLI task with the Azure DevOps service connection, obtain an access token for the Azure DevOps resource, then run `vsce publish --azure-credential` from the extension directory. The workflow should be tag/release gated, validate the manifest publisher (`ArkarYan`), package before publish, and never print tokens.
