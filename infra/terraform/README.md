# Terraform scaffold (Firebase + Cloud Run + GitHub secrets)

> This scaffold assumes an existing GCP/Firebase project. It enables required APIs, provisions a deploy service account, sets up an Artifact Registry repository, and pushes GitHub Actions secrets (GCP/Firebase/Stripe). Squarespace DNS is not Terraform-managed; move DNS to a Terraform-capable provider if you want full automation.

## Prereqs
- Terraform >= 1.6
- `gcloud auth application-default login` with permissions to manage IAM/Service Usage/Artifact Registry
- GitHub PAT with `repo` + `admin:repo_hook` to manage actions secrets (export `GITHUB_TOKEN`)

## Variables
- `project_id` (string) – GCP project id
- `firebase_project_id` (string) – Firebase project id (often same as `project_id`)
- `billing_account` (string, optional) – only if creating a new project
- `region` (string) – default `us-central1`
- `github_owner` / `github_repo` (string) – repo to receive secrets
- `firebase_service_account_json` (sensitive, optional) – override for Firebase Hosting deploys; defaults to the generated deployer key
- `stripe_secret_key` (sensitive, optional) – Stripe secret for invoicing API
- `gcp_deploy_sa_roles` (list) – roles for deploy SA (pre-set)

## What it creates
- Enables core APIs: Cloud Run, Cloud Build, Artifact Registry, Firebase, Firestore, IAM Credentials, Service Usage.
- Service account `denuo-deployer` + key.
- Artifact Registry repo `denuo-docker` (Docker) in `var.region`.
- GitHub Actions secrets: `FIREBASE_SERVICE_ACCOUNT`, `FIREBASE_PROJECT_ID`, `GCP_PROJECT_ID`, `GCP_REGION`, `GCP_SERVICE_ACCOUNT_KEY`, and `STRIPE_SECRET_KEY` (if provided).

## Usage
```bash
cd infra/terraform
cat > terraform.tfvars <<'VARS'
project_id              = "your-gcp-project"
firebase_project_id     = "your-firebase-project"
github_owner            = "Denuo-Web"
github_repo             = "denuowebsite"
# optional override; otherwise the generated deployer key is used for Hosting deploys
# firebase_service_account_json = file("../path/to/firebase-deploy-sa.json")
stripe_secret_key       = "sk_live_..." # optional
VARS
terraform init
terraform apply
```

## Notes
- Firebase Hosting site/app creation is not automated here; run `firebase init hosting` once or create via console/CLI. APIs are enabled for you.
- Squarespace DNS cannot be Terraform-managed; migrate DNS to Cloudflare/Route53/Google Cloud DNS for full automation and add records for Firebase Hosting/Cloud Run there.
- The deploy service account has broad roles suitable for CI; tighten as needed for production hardening.
