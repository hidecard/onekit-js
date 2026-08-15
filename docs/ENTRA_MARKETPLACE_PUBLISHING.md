# PAT မသုံးဘဲ OneKit VS Code Extension Publish လုပ်ခြင်း

ဤ guide သည် `extensions/vscode-okjs` ကို Azure DevOps Personal Access Token မသုံးဘဲ Microsoft Entra ID workload identity federation ဖြင့် Visual Studio Marketplace သို့ publish လုပ်ရန် ရည်ရွယ်သည်။ VS Code official publishing guide သည် long-lived PAT များအစား managed identity နှင့် workload identity federation ကို အကြံပြုထားသည် [1]။

> **အရေးကြီးသော အဓိပ္ပာယ်** — Azure subscription permission တစ်ခုတည်းဖြင့် extension publish မလုပ်နိုင်ပါ။ Managed identity ကို `ArkarYan` Visual Studio Marketplace publisher account ထဲသို့ ထည့်ပြီး **Contributor** role ပေးရပါမည် [1]။

## Architecture

```text
Azure Pipelines job
        │
        │ Azure DevOps workload identity service connection
        ▼
User-assigned Microsoft Entra managed identity
        │
        │ Federated credential: issuer + subject + audience
        ▼
Azure DevOps access token
        │
        │ vsce publish --azure-credential
        ▼
Visual Studio Marketplace publisher: ArkarYan
```

Workload identity federation သည် external workload token ကို trusted issuer/subject/audience တိုက်ဆိုင်မှုဖြင့် Microsoft-issued access token အဖြစ် exchange လုပ်ပြီး secret/PAT သိမ်းရန် မလိုအပ်စေသည် [3]။

## Prerequisites

အောက်ပါ access များ လိုအပ်ပါသည်။

| လိုအပ်ချက် | ဘာကြောင့်လိုသလဲ |
|---|---|
| Azure DevOps organization နှင့် project | Service connection ဖန်တီးရန် |
| Azure subscription | User-assigned managed identity ဖန်တီးရန် |
| Azure account permission | Managed Identity Contributor သို့မဟုတ် federated credential ပြင်နိုင်သော role |
| Azure DevOps permission | Service connection Creator/Administrator permission |
| Marketplace publisher | `ArkarYan` publisher account ကို manage လုပ်နိုင်ခြင်း |
| Node.js | `vsce` နှင့် package validation run ရန် |

## Step 1: Managed identity ဖန်တီးခြင်း

Azure Portal တွင် **Managed Identities → Create → User Assigned Managed Identity** ကိုရွေးပါ။ Subscription၊ resource group၊ region နှင့် အမည်ကို ဖြည့်ပါ။ ဥပမာ—

```text
Name: onekit-okjs-marketplace
```

ဖန်တီးပြီးနောက် အောက်ပါ values များကို သိမ်းထားပါ။

```text
Client ID
Tenant ID
Subscription ID
Resource ID
```

Azure documentation အရ federated credential ထည့်ရန် managed identity ကို update လုပ်နိုင်သော permission လိုအပ်သည် [2]။

## Step 2: Azure DevOps service connection draft ဖန်တီးခြင်း

Azure DevOps project ထဲတွင်—

```text
Project settings
→ Service connections
→ New service connection
→ Azure Resource Manager
→ App registration or Managed identity (manual)
→ Workload identity federation
```

Service connection name ကို ဥပမာအနေဖြင့် သတ်မှတ်ပါ။

```text
onekit-okjs-marketplace
```

Managed identity ၏ Application/Client ID နှင့် Directory/Tenant ID ကို ဖြည့်ပါ။ Azure DevOps က ထုတ်ပေးသော **Issuer** နှင့် **Subject identifier** ကို copy လုပ်ပြီး connection ကို draft အဖြစ် သိမ်းပါ။ Azure DevOps docs အရ issuer နှင့် subject values များကို managed identity ၏ federated credential ထဲသို့ ပြန်ထည့်ရပါမည် [2]။

## Step 3: Federated credential ထည့်ခြင်း

Azure Portal တွင် managed identity သို့ ပြန်ဝင်ပြီး—

```text
Settings → Federated credentials → Add credential
```

Credential type တွင် **Other issuer** ကိုရွေးပြီး Azure DevOps service connection draft မှ copy လုပ်ထားသော values များကို ဖြည့်ပါ။

| Field | Value |
|---|---|
| Issuer | Azure DevOps service connection မှရသော issuer |
| Subject | Azure DevOps service connection မှရသော subject identifier |
| Audience | Azure DevOps documentation/service connection က ပေးထားသော audience |

Issuer၊ subject နှင့် audience များသည် token ထဲရှိ values နှင့် case-sensitive အတိအကျ တူရပါမည် [3]။

ထို့နောက် Azure DevOps service connection သို့ ပြန်သွားပြီး **Verify and save** လုပ်ပါ။

## Step 4: Marketplace publisher authorization

[Visual Studio Marketplace publisher management](https://marketplace.visualstudio.com/manage) ထဲတွင် `ArkarYan` publisher ကို ဖွင့်ပါ။ Managed identity ကို publisher member အဖြစ်ထည့်ပြီး **Contributor** role ပေးပါ။ VS Code publishing guide တွင် identity ကို publisher account ထဲသို့ ထည့်ပြီး Contributor role ပေးရန် ဖော်ပြထားသည် [1]။

ဤ permission မရှိပါက Azure authentication အောင်မြင်သော်လည်း Marketplace publish အဆင့်တွင် `403` သို့မဟုတ် publisher authorization error ရပါမည်။

## Step 5: Pipeline permission ကန့်သတ်ခြင်း

Service connection တွင် **Grant access permission to all pipelines** ကို မရွေးသင့်ပါ။ Publishing pipeline တစ်ခုတည်းကိုသာ authorize လုပ်ပါ။ ထိုနည်းသည် service connection ကို အခြား pipeline များ မသုံးနိုင်အောင် ကာကွယ်ပေးသည် [2]။

## Step 6: Repository workflow

Repository တွင် အောက်ပါ pipeline template ထည့်ထားပါသည်။

```text
azure-pipelines/okjs-marketplace.yml
```

Pipeline variables တွင် placeholder ကို သင်ဖန်တီးထားသော service connection name နှင့် ပြောင်းပါ။

```yaml
variables:
  extensionDirectory: extensions/vscode-okjs
  azureDevOpsServiceConnection: onekit-okjs-marketplace
```

Pipeline သည် `okjs-v*` tag များကိုသာ trigger လုပ်ပြီး—

1. Node.js 22 သုံးမည်။
2. Extension dependencies install လုပ်မည်။
3. Publisher ID ကို `ArkarYan` ဟု စစ်မည်။
4. Tag version နှင့် `package.json` version တူ/မတူ စစ်မည်။
5. VSIX package build နှင့် archive integrity စစ်မည်။
6. AzureCLI task မှ Azure DevOps service connection သုံးမည်။
7. `npx vsce publish --azure-credential` ဖြင့် publish လုပ်မည်။

## Release procedure

ဥပမာ package version သည် `0.1.1` ဖြစ်ပါက—

```bash
cd /path/to/onekit-js
npm version 0.1.1 --no-git-tag-version --prefix extensions/vscode-okjs
npm install --package-lock-only --prefix extensions/vscode-okjs
git add extensions/vscode-okjs/package.json extensions/vscode-okjs/package-lock.json
git commit -m "chore(vscode): prepare okjs extension v0.1.1"
git push origin V3
git tag okjs-v0.1.1
git push origin okjs-v0.1.1
```

Tag push ပြီးနောက် Azure Pipeline သည် validation နှင့် publish ကို လုပ်ပါမည်။ Version mismatch ဖြစ်ပါက publish မလုပ်ဘဲ pipeline fail ဖြစ်မည်။

## Troubleshooting

| Error | အဓိပ္ပာယ် | စစ်ဆေးရန် |
|---|---|---|
| `publisher ... should match ArkarYan` | VSIX manifest publisher မကိုက် | `package.json` တွင် `"publisher": "ArkarYan"` ဖြစ်ရမည် |
| `401` from Azure DevOps | Service connection/token exchange မအောင်မြင် | Issuer၊ subject၊ audience နှင့် managed identity trust စစ်ပါ |
| `403` from Marketplace | Identity သည် publisher member မဟုတ် | `ArkarYan` publisher တွင် Contributor role စစ်ပါ |
| Service connection cannot save | Identity/org permission မလုံလောက် | Service connection Creator နှင့် managed identity permissions စစ်ပါ |
| Pipeline cannot use connection | Pipeline authorization မရှိ | သက်ဆိုင်ရာ pipeline ကို service connection သုံးခွင့်ပေးပါ |
| `vsce --azure-credential` unavailable | vsce version ဟောင်း | `npx vsce --version` စစ်ပြီး current `@vscode/vsce` သုံးပါ |

## Security policy

PAT သို့မဟုတ် access token ကို GitHub secrets၊ YAML output၊ logs သို့ မရေးပါနှင့်။ Workload identity federation ၏ အားသာချက်မှာ long-lived credential မသိမ်းဘဲ short-lived access token ရရှိခြင်းဖြစ်သည် [3]။ Pipeline log တွင် `az account get-access-token` output ကို print မလုပ်သင့်ပါ။

### References

[1]: https://code.visualstudio.com/api/working-with-extensions/publishing-extension "VS Code — Publishing Extensions"
[2]: https://learn.microsoft.com/en-us/azure/devops/pipelines/release/configure-workload-identity?view=azure-devops "Microsoft Learn — Configure workload identity service connection"
[3]: https://learn.microsoft.com/en-us/entra/workload-id/workload-identity-federation "Microsoft Learn — Workload identity federation concepts"
