terraform {
  required_providers {
    auth0 = {
      source  = "alexkappa/auth0"
      version = "0.26.2"
    }
  }
}


variable "AUTH0_TENANT" {}
variable "AUTH0_M2M_DOMAIN" {}
variable "AUTH0_M2M_CLIENT_ID" {}
variable "AUTH0_M2M_CLIENT_SECRET" {}

variable "WEBAPI_IDENTIFIER" {
  default = "https://proto.monument.be"
}

variable "LOGIN_CALLBACK_URLS" {}
variable "LOGOUT_URLS" {}
variable "WEB_ORIGINS" {}

provider "auth0" {
  domain        = var.AUTH0_M2M_DOMAIN
  client_id     = var.AUTH0_M2M_CLIENT_ID
  client_secret = var.AUTH0_M2M_CLIENT_SECRET
}

variable "BACKEND_APPLICATION_NAME" {
  default = "Monument backend"
}

variable "FRONTEND_APPLICATION_NAME" {
  default = "Monument PLWD frontend"
}

variable "TRACKER_APP_APPLICATION_NAME" {
  default = "Monument Tracker App"
}

variable "TRACKER_APP_LOGIN_CALLBACK_URLS" {
  default = []
}

variable "BACKEND_API_NAME" {
  default = "Monument PLWD API"
}


resource "auth0_client" "frontend_auth0_client" {
  name                       = var.FRONTEND_APPLICATION_NAME
  description                = "Frontend app for Monument PLWD"
  app_type                   = "spa"
  callbacks                  = var.LOGIN_CALLBACK_URLS
  allowed_logout_urls        = var.LOGOUT_URLS
  web_origins                = var.WEB_ORIGINS
  oidc_conformant            = true
  token_endpoint_auth_method = "none"
  grant_types = [
    "implicit",
    "authorization_code",
  "refresh_token"]

  jwt_configuration {
    alg                 = "RS256"
    lifetime_in_seconds = 36000
  }
}

resource "auth0_client" "tracker_app_auth0_client" {
  name                       = var.TRACKER_APP_APPLICATION_NAME
  description                = "Tracker app for Monument prototype"
  app_type                   = "native"
  callbacks                  = var.TRACKER_APP_LOGIN_CALLBACK_URLS
  oidc_conformant            = true
  token_endpoint_auth_method = "none"
  grant_types = [
    "implicit",
    "authorization_code",
  "refresh_token"]

  jwt_configuration {
    alg                 = "RS256"
    lifetime_in_seconds = 36000
  }
}

resource "auth0_resource_server" "backend_auth0_user_api" {
  name                                            = var.BACKEND_API_NAME
  identifier                                      = var.WEBAPI_IDENTIFIER
  signing_alg                                     = "RS256"
  token_lifetime                                  = 86400
  skip_consent_for_verifiable_first_party_clients = true
  token_dialect                                   = "access_token_authz"
  enforce_policies                                = true
  allow_offline_access                            = true

  scopes {
    description = "Read the locations"
    value       = "read:locations"
  }
}

resource "auth0_client" "backend_m2m" {
  name                       = var.BACKEND_APPLICATION_NAME
  description                = "Backend client"
  app_type                   = "non_interactive"
  oidc_conformant            = true
  token_endpoint_auth_method = "client_secret_post"

  grant_types = ["client_credentials"]

  jwt_configuration {
    alg                 = "RS256"
    lifetime_in_seconds = 36000
  }
}

output "AUTH0_AUDIENCE" {
  value = auth0_resource_server.backend_auth0_user_api.identifier
}

output "AUTH0_DOMAIN" {
  value = var.AUTH0_TENANT
}

output "AUTH0_FRONTEND_CLIENT_ID" {
  value = auth0_client.frontend_auth0_client.id
}
