#!/usr/bin/env bash
# Provision an S3 bucket + IAM role that Tavus can assume to store VisaDrill recordings.
# Requires the AWS CLI configured with credentials that can create S3 buckets and IAM roles.
#
# Usage:
#   BUCKET=my-visadrill-recordings REGION=us-east-1 ./infra/aws/setup-recording.sh
#
# Then paste the printed lines into visa-drill/.env.
set -euo pipefail

: "${BUCKET:?set BUCKET=<globally-unique-bucket-name>}"
REGION="${REGION:-us-east-1}"
ROLE_NAME="${ROLE_NAME:-visadrill-tavus-recording}"

# Tavus assumes this role from its own AWS account using a fixed external id.
TAVUS_ACCOUNT_ID="291871421005"
EXTERNAL_ID="tavus"
MAX_SESSION_SECONDS=43200 # 12h; the recording service requests 12h sessions (1h default fails).

echo "==> Creating bucket s3://$BUCKET in $REGION"
if [ "$REGION" = "us-east-1" ]; then
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" 2>/dev/null || true
else
  aws s3api create-bucket --bucket "$BUCKET" --region "$REGION" \
    --create-bucket-configuration LocationConstraint="$REGION" 2>/dev/null || true
fi

TRUST=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Principal": { "AWS": "arn:aws:iam::${TAVUS_ACCOUNT_ID}:root" },
    "Action": "sts:AssumeRole",
    "Condition": { "StringEquals": { "sts:ExternalId": "${EXTERNAL_ID}" } }
  }]
}
JSON
)

echo "==> Creating IAM role $ROLE_NAME (12h max session)"
if aws iam get-role --role-name "$ROLE_NAME" >/dev/null 2>&1; then
  aws iam update-assume-role-policy --role-name "$ROLE_NAME" --policy-document "$TRUST"
  aws iam update-role --role-name "$ROLE_NAME" --max-session-duration "$MAX_SESSION_SECONDS"
else
  aws iam create-role \
    --role-name "$ROLE_NAME" \
    --assume-role-policy-document "$TRUST" \
    --max-session-duration "$MAX_SESSION_SECONDS" >/dev/null
fi

PERMS=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Effect": "Allow",
    "Action": [
      "s3:PutObject", "s3:GetObject", "s3:GetObjectVersion",
      "s3:ListBucket", "s3:ListBucketVersions", "s3:ListBucketMultipartUploads",
      "s3:ListMultipartUploadParts", "s3:AbortMultipartUpload"
    ],
    "Resource": ["arn:aws:s3:::${BUCKET}", "arn:aws:s3:::${BUCKET}/*"]
  }]
}
JSON
)

echo "==> Attaching bucket write policy"
aws iam put-role-policy --role-name "$ROLE_NAME" \
  --policy-name visadrill-s3-write --policy-document "$PERMS"

ROLE_ARN=$(aws iam get-role --role-name "$ROLE_NAME" --query 'Role.Arn' --output text)

cat <<EOF

Done. Add these to visa-drill/.env, then restart the backend:

ENABLE_RECORDING=true
RECORDING_PROVIDER=s3
RECORDING_BUCKET=$BUCKET
RECORDING_REGION=$REGION
RECORDING_ROLE_ARN=$ROLE_ARN
EOF
