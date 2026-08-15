from pathlib import Path

path = Path('/home/ubuntu/onekit-js/azure-pipelines/okjs-marketplace.yml')
text = path.read_text()
required = [
    'trigger:',
    'okjs-v*',
    'AzureCLI@3',
    'connectionType: azureDevOps',
    'azureDevOpsServiceConnection:',
    'npx vsce publish --azure-credential',
    'publisher must be ArkarYan',
]
missing = [item for item in required if item not in text]
if missing:
    raise SystemExit(f'missing pipeline markers: {missing}')
if 'az account get-access-token' in text:
    raise SystemExit('pipeline must not print or manually handle an access token')
print('ENTRA_PIPELINE_STATIC_VALIDATION=PASS')
