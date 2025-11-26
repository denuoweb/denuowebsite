variable "project_id" {
  description = "GCP project id"
  type        = string
}

variable "billing_account" {
  description = "Billing account id (required if creating a new project)"
  type        = string
  default     = null
}

variable "region" {
  description = "Default region for Cloud Run and Artifact Registry"
  type        = string
  default     = "us-central1"
}

variable "github_owner" {
  description = "GitHub org/user name"
  type        = string
}

variable "github_repo" {
  description = "GitHub repo name"
  type        = string
}

variable "firebase_service_account_json" {
  description = "Service account JSON for Firebase Hosting deploys"
  type        = string
  sensitive   = true
  default     = null
}

variable "gcp_deploy_sa_roles" {
  description = "Roles to grant the deploy service account"
  type        = list(string)
  default     = [
    "roles/run.admin",
    "roles/iam.serviceAccountUser",
    "roles/cloudbuild.builds.editor",
    "roles/artifactregistry.admin",
    "roles/storage.admin",
    "roles/firebasehosting.admin",
    "roles/firebaserules.admin",
    "roles/serviceusage.serviceUsageAdmin"
  ]
}

variable "stripe_secret_key" {
  description = "Stripe secret key for invoicing API"
  type        = string
  sensitive   = true
  default     = null
}

variable "firebase_project_id" {
  description = "Firebase project id (often same as project_id)"
  type        = string
}
