# Azure DevOps PAT Menu Troubleshooting Notes

## Official sources

- https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/use-personal-access-tokens-to-authenticate?view=azure-devops
- https://code.visualstudio.com/api/working-with-extensions/publishing-extension
- https://learn.microsoft.com/en-us/azure/devops/organizations/accounts/manage-pats-with-policies-for-administrators?view=azure-devops

## Findings

Microsoft Learn's current PAT guide says the normal path is to sign in to an Azure DevOps organization at `https://dev.azure.com/{organization}`, open profile/user settings, and select **Personal access tokens**. The documented prerequisites include permission to manage user settings, at least Basic access, and compliance with organization PAT policies. Administrators can restrict PAT creation or allow-list users, and some scopes may be unavailable.

The direct URL `https://app.vssps.visualstudio.com/_details/security/tokens` returns a 404 in the current environment, so it should not be recommended as the primary route. The user should enter an actual organization first at `https://dev.azure.com/{organization}` and use the profile menu there.

For VS Code Marketplace publishing, the token needs the Marketplace Manage scope according to the VS Code publishing guide. PATs should be treated as passwords and copied only once into a secure password manager. Microsoft recommends Entra ID/workload identity federation or managed identity for longer-term automation, and the current VS Code documentation states that global Azure DevOps PATs are scheduled for retirement on December 1, 2026.
