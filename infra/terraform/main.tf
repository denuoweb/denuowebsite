locals {
  services = [
    "cloudbuild.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
    "firebase.googleapis.com",
    "firestore.googleapis.com",
    "iamcredentials.googleapis.com",
    "serviceusage.googleapis.com",
    "cloudresourcemanager.googleapis.com"
  ]

  vite_env_vars = {
    VITE_FIREBASE_API_KEY            = var.vite_firebase_api_key
    VITE_FIREBASE_AUTH_DOMAIN        = var.vite_firebase_auth_domain
    VITE_FIREBASE_PROJECT_ID         = coalesce(var.vite_firebase_project_id, var.firebase_project_id)
    VITE_FIREBASE_STORAGE_BUCKET     = var.vite_firebase_storage_bucket
    VITE_FIREBASE_MESSAGING_SENDER_ID = var.vite_firebase_messaging_sender_id
    VITE_FIREBASE_APP_ID             = var.vite_firebase_app_id
    VITE_USE_FIREBASE_EMULATORS      = var.vite_use_firebase_emulators
  }
}

resource "google_project_service" "enabled" {
  for_each           = toset(local.services)
  project            = var.project_id
  service            = each.key
  disable_on_destroy = false
}

resource "google_service_account" "deployer" {
  account_id   = "denuo-deployer"
  display_name = "Denuo Web CI/CD"
  project      = var.project_id
}

resource "google_project_iam_member" "deployer_roles" {
  for_each = toset(var.gcp_deploy_sa_roles)
  project  = var.project_id
  role     = each.key
  member   = "serviceAccount:${google_service_account.deployer.email}"
}

resource "google_service_account_key" "deployer" {
  service_account_id = google_service_account.deployer.name
}

resource "google_artifact_registry_repository" "docker" {
  repository_id = "denuo-docker"
  format        = "DOCKER"
  location      = var.region
  description   = "Container registry for Cloud Run"
  depends_on    = [google_project_service.enabled]
}

# GitHub Actions secrets
resource "github_actions_secret" "firebase_service_account" {
  repository      = var.github_repo
  secret_name     = "FIREBASE_SERVICE_ACCOUNT"
  plaintext_value = coalesce(
    var.firebase_service_account_json,
    base64decode(google_service_account_key.deployer.private_key)
  )
}

resource "github_actions_secret" "firebase_project_id" {
  repository      = var.github_repo
  secret_name     = "FIREBASE_PROJECT_ID"
  plaintext_value = var.firebase_project_id
}

resource "github_actions_secret" "gcp_project_id" {
  repository      = var.github_repo
  secret_name     = "GCP_PROJECT_ID"
  plaintext_value = var.project_id
}

resource "github_actions_secret" "gcp_region" {
  repository      = var.github_repo
  secret_name     = "GCP_REGION"
  plaintext_value = var.region
}

resource "github_actions_secret" "gcp_service_account_key" {
  repository      = var.github_repo
  secret_name     = "GCP_SERVICE_ACCOUNT_KEY"
  plaintext_value = base64decode(google_service_account_key.deployer.private_key)
}

resource "github_actions_secret" "stripe_secret_key" {
  count           = var.stripe_secret_key == null ? 0 : 1
  repository      = var.github_repo
  secret_name     = "STRIPE_SECRET_KEY"
  plaintext_value = var.stripe_secret_key
}

resource "github_actions_variable" "vite_env" {
  for_each = {
    for k, v in local.vite_env_vars :
    k => try(nonsensitive(v), v)
    if v != null
  }
  repository    = var.github_repo
  variable_name = each.key
  value         = each.value
}

output "deploy_service_account_email" {
  value = google_service_account.deployer.email
}

output "artifact_registry_repository" {
  value = google_artifact_registry_repository.docker.id
}
