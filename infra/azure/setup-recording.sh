#!/usr/bin/env bash
# Provision Azure Blob storage + an Entra app that Tavus can federate into to store
# VisaDrill recordings. Requires the Azure CLI logged in (`az login`).
#
# Tavus authenticates via Entra workload-identity federation:
#   issuer   = https://recording-copy.tavus.io
#   subject  = your Tavus Workspace ID (Tavus platform -> profile)
#   audience = api://AzureADTokenExchange
#
# Usage:
#   STORAGE_ACCOUNT=visadrillrec RESOURCE_GROUP=visadrill-rg \
#   WORKSPACE_ID=<your-tavus-workspace-id> ./infra/azure/setup-recording.sh
#
# Then paste the printed lines into visa-drill/.env.
set -euo pipefail

: "${STORAGE_ACCOUNT:?set STORAGE_ACCOUNT (3-24 lowercase letters/numbers, globally unique)}"
: "${RESOURCE_GROUP:?set RESOURCE_GROUP}"
: "${WORKSPACE_ID:?set WORKSPACE_ID (your Tavus Workspace ID)}"
CONTAINER="${CONTAINER:-conversation-recordings}"
LOCATION="${LOCATION:-eastus}"
APP_NAME="${APP_NAME:-Tavus Recording Storage}"

SUB_ID=$(az account show --query id -o tsv)
TENANT_ID=$(az account show --query tenantId -o tsv)

echo "==> Resource group + storage account + container"
az group create --name "$RESOURCE_GROUP" --location "$LOCATION" >/dev/null
az storage account create --name "$STORAGE_ACCOUNT" --resource-group "$RESOURCE_GROUP" \
  --location "$LOCATION" --sku Standard_LRS >/dev/null 2>&1 || true
az storage container create --name "$CONTAINER" --account-name "$STORAGE_ACCOUNT" \
  --auth-mode login >/dev/null 2>&1 || \
  echo "   (could not create container via CLI; create '$CONTAINER' in the portal if missing)"

echo "==> Entra app registration"
APP_ID=$(az ad app list --display-name "$APP_NAME" --query "[0].appId" -o tsv)
if [ -z "${APP_ID:-}" ]; then
  APP_ID=$(az ad app create --display-name "$APP_NAME" --query appId -o tsv)
fi
az ad sp create --id "$APP_ID" >/dev/null 2>&1 || true

echo "==> Federated credential trusting Tavus (subject = workspace id)"
cat > /tmp/tavus-fic.json <<JSON
{
  "name": "tavus-recording-copy",
  "issuer": "https://recording-copy.tavus.io",
  "subject": "${WORKSPACE_ID}",
  "audiences": ["api://AzureADTokenExchange"]
}
JSON
az ad app federated-credential create --id "$APP_ID" --parameters @/tmp/tavus-fic.json >/dev/null 2>&1 || \
  echo "   (federated credential may already exist; continuing)"

echo "==> Role assignment: Storage Blob Data Contributor at container scope"
SCOPE="/subscriptions/${SUB_ID}/resourceGroups/${RESOURCE_GROUP}/providers/Microsoft.Storage/storageAccounts/${STORAGE_ACCOUNT}/blobServices/default/containers/${CONTAINER}"
az role assignment create --assignee "$APP_ID" \
  --role "Storage Blob Data Contributor" --scope "$SCOPE" >/dev/null 2>&1 || \
  echo "   (role assignment may already exist; continuing)"

cat <<EOF

Done. Add these to visa-drill/.env, then restart the backend:

ENABLE_RECORDING=true
RECORDING_PROVIDER=azure_blob
RECORDING_AZURE_STORAGE_ACCOUNT=$STORAGE_ACCOUNT
RECORDING_AZURE_CONTAINER=$CONTAINER
RECORDING_AZURE_TENANT_ID=$TENANT_ID
RECORDING_AZURE_CLIENT_ID=$APP_ID
EOF
