## Configure the Azure provider
terraform {
  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "3.6.0"
    }
  }

  # Store state in azure blob storage
  backend "azurerm" {
    resource_group_name  = "monument-terraform"
    storage_account_name = "monumenttfstorage"
    container_name       = "monument-terraform-state"
    key                  = "monument-plwd-prod.tfstate"
  }
}

provider "azurerm" {
  features {}
}

module "auth0" {
  source = "../../modules/auth0"

  AUTH0_TENANT            = var.AUTH0_TENANT
  AUTH0_M2M_DOMAIN        = var.AUTH0_M2M_DOMAIN
  AUTH0_M2M_CLIENT_ID     = var.AUTH0_M2M_CLIENT_ID
  AUTH0_M2M_CLIENT_SECRET = var.AUTH0_M2M_CLIENT_SECRET
  LOGIN_CALLBACK_URLS     = [module.frontdoor.FRONTDOOR_URL]
  WEB_ORIGINS             = [module.frontdoor.FRONTDOOR_URL]
  LOGOUT_URLS             = [module.frontdoor.FRONTDOOR_URL]
}

module "resource-group" {
  source = "../../modules/resource-group"

  NAME     = var.RESOURCE_GROUP_NAME
  LOCATION = var.LOCATION
}

resource "random_password" "postgres-password" {
  length           = 20
  lower            = true
  min_lower        = 2
  min_numeric      = 2
  min_special      = 2
  min_upper        = 2
  numeric          = true
  override_special = "_%@"
  special          = true
  upper            = true
}

module "postgres" {
  source = "../../modules/postgres"

  NAME                    = "monument-plwd--postgres-${var.ENVIRONMENT}"
  ENVIRONMENT             = var.ENVIRONMENT
  RESOURCE_GROUP          = module.resource-group.name
  POSTGRES_ADMIN_PASSWORD = random_password.postgres-password.result

  POSTGRES_SKU_NAME              = "GP_Gen5_2"
  POSTGRES_BACKUP_RETENTION_DAYS = 35
}

module "frontend" {
  source = "../../modules/static-web-app"

  NAME           = "monument-plwd-${var.ENVIRONMENT}"
  LOCATION       = var.LOCATION
  RESOURCE_GROUP = module.resource-group.name
}

module "backend" {
  source = "../../modules/backend"

  RESOURCE_GROUP = module.resource-group.name

  ENVIRONMENT = var.ENVIRONMENT
  LOCATION    = var.LOCATION

  NAME = "monument-backend-${var.ENVIRONMENT}"

  FRONTDOOR_ID_HEADERS = [module.frontdoor.FRONTDOOR_ID]

  LOG_LEVEL                  = var.LOG_LEVEL
  MONUMENT_ACTIVITY_BASE_URL = var.MONUMENT_ACTIVITY_BASE_URL

  AUTH0_JWT_AUDIENCE = module.auth0.AUTH0_AUDIENCE
  AUTH0_JWT_DOMAIN   = module.auth0.AUTH0_DOMAIN

  AUTH0_M2M_AUDIENCE      = var.AUTH0_M2M_AUDIENCE
  AUTH0_M2M_BASE_URL      = var.AUTH0_M2M_BASE_URL
  AUTH0_M2M_CLIENT_ID     = var.AUTH0_M2M_CLIENT_ID
  AUTH0_M2M_CLIENT_SECRET = var.AUTH0_M2M_CLIENT_SECRET
  AUTH0_M2M_DOMAIN        = var.AUTH0_M2M_DOMAIN
  AUTH0_M2M_TOKEN_URL     = var.AUTH0_M2M_TOKEN_URL

  POSTGRES_CONNECTION_STRING = module.postgres.POSTGRES_CONNECTION_STRING

  GEOFENCE_RADIUS                                          = var.GEOFENCE_RADIUS
  MAX_TIME_BETWEEN_LAST_LOCATION_TIMESTAMP_AND_EVENT_START = var.MAX_TIME_BETWEEN_LAST_LOCATION_TIMESTAMP_AND_EVENT_START
  NOTIFICATION_TRIGGER_DELAY                               = var.NOTIFICATION_TRIGGER_DELAY


  SENDGRID_API_KEY = var.SENDGRID_API_KEY
  SENDGRID_ENABLE  = var.SENDGRID_ENABLE
  SENDGRID_FROM    = var.SENDGRID_FROM

  TWILIO_ACCOUNT_SID     = var.TWILIO_ACCOUNT_SID
  TWILIO_AUTH_TOKEN      = var.TWILIO_AUTH_TOKEN
  TWILIO_SMS_ENABLE      = var.TWILIO_SMS_ENABLE
  TWILIO_SMS_FROM        = var.TWILIO_SMS_FROM
  TWILIO_WHATSAPP_ENABLE = var.TWILIO_WHATSAPP_ENABLE
  TWILIO_WHATSAPP_FROM   = var.TWILIO_WHATSAPP_FROM

  ENABLE_KOMPY_WATCH_CLIENT_API = var.ENABLE_KOMPY_WATCH_CLIENT_API
  KOMPY_AUTH_PASSWORD           = var.KOMPY_AUTH_PASSWORD
  KOMPY_AUTH_USER               = var.KOMPY_AUTH_USER
}

module "log-analytics" {
  source = "../../modules/log-analytics"

  NAME           = "monument-plwd-${var.ENVIRONMENT}"
  LOCATION       = var.LOCATION
  RESOURCE_GROUP = module.resource-group.name
}

module "web-application-firewall" {
  source = "../../modules/web-application-firewall"

  NAME           = "monumentplwdprod"
  ENVIRONMENT    = var.ENVIRONMENT
  RESOURCE_GROUP = module.resource-group.name
}

module "frontdoor" {
  source = "../../modules/frontdoor"

  NAME = "monument-plwd-frontdoor"

  ENVIRONMENT    = var.ENVIRONMENT
  RESOURCE_GROUP = module.resource-group.name

  FRONTEND_HOST = module.frontend.FRONTEND_HOST
  BACKEND_HOST  = "monument-backend-${var.ENVIRONMENT}.azurewebsites.net"

  WAF_POLICY                 = module.web-application-firewall.WAF_POLICY
  LOG_ANALYTICS_WORKSPACE_ID = module.log-analytics.ID
}

module "function_app_service_plan" {
  source = "../../modules/app-service-plan"

  ENVIRONMENT           = var.ENVIRONMENT
  LOCATION              = var.LOCATION
  RESOURCE_GROUP        = var.RESOURCE_GROUP_NAME
  SERVICE_PLAN_SKU_NAME = "B1"

  AUTH0_AUDIENCE                  = var.AUTH0_AUDIENCE
  AUTH0_BASE_URL                  = var.AUTH0_BASE_URL
  AUTH0_CLIENT_ID                 = var.AUTH0_CLIENT_ID
  AUTH0_CLIENT_SECRET             = var.AUTH0_CLIENT_SECRET
  AUTH0_DOMAIN                    = var.AUTH0_DOMAIN
  AUTH0_ISSUER_BASE_URL           = var.AUTH0_ISSUER_BASE_URL
  AUTH0_SECRET                    = var.AUTH0_SECRET
  AUTH0_SESSION_ABSOLUTE_DURATION = var.AUTH0_SESSION_ABSOLUTE_DURATION

  DOCKER_REGISTRY_SERVER_PASSWORD = var.DOCKER_REGISTRY_SERVER_PASSWORD
  DOCKER_REGISTRY_SERVER_URL      = var.DOCKER_REGISTRY_SERVER_URL
  DOCKER_REGISTRY_SERVER_USERNAME = var.DOCKER_REGISTRY_SERVER_USERNAME

  API_BASE_URL = module.backend.BACKEND_URL
  LOG_LEVEL    = var.LOG_LEVEL
}
