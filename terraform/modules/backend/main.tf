variable "ENVIRONMENT" {}
variable "RESOURCE_GROUP" {}
variable "LOCATION" {
  default = "westeurope"
}
variable "NAME" {}

variable "SERVICE_PLAN_SKU_TIER" {
  default = "PremiumV2"
}
variable "SERVICE_PLAN_SKU_SIZE" {
  default = "P1v2"
}

variable "NODE_ENV" {
  default = "PRODUCTION"
}
variable "PORT" {
  default = 8080
}

variable "WEBSITE_ENABLE_SYNC_UPDATE_SITE" {
  default = true
}
variable "WEBSITE_NODE_DEFAULT_VERSION" {
  default = "12.8.0"
}
variable "WEBSITE_RUN_FROM_PACKAGE" {
  default = 1
}
variable "FRONTDOOR_ID_HEADERS" {}

# Auth0 configuration
variable "AUTH0_JWT_AUDIENCE" {}
variable "AUTH0_JWT_DOMAIN" {}
variable "AUTH0_M2M_AUDIENCE" {}
variable "AUTH0_M2M_BASE_URL" {}
variable "AUTH0_M2M_CLIENT_ID" {}
variable "AUTH0_M2M_CLIENT_SECRET" {}
variable "AUTH0_M2M_DOMAIN" {}
variable "AUTH0_M2M_TOKEN_URL" {}

# Postgres configuration
variable "POSTGRES_CONNECTION_STRING" {}

variable "MONUMENT_ACTIVITY_BASE_URL" {}
variable "LOG_LEVEL" {}

variable "SENDGRID_API_KEY" {}
variable "SENDGRID_ENABLE" {}
variable "SENDGRID_FROM" {}

variable "GEOFENCE_RADIUS" {}
variable "MAX_TIME_BETWEEN_LAST_LOCATION_TIMESTAMP_AND_EVENT_START" {}
variable "NOTIFICATION_TRIGGER_DELAY" {}

variable "TWILIO_ACCOUNT_SID" {}
variable "TWILIO_AUTH_TOKEN" {}
variable "TWILIO_SMS_ENABLE" {}
variable "TWILIO_SMS_FROM" {}
variable "TWILIO_WHATSAPP_ENABLE" {}
variable "TWILIO_WHATSAPP_FROM" {}

variable "ENABLE_KOMPY_WATCH_CLIENT_API" {}
variable "KOMPY_AUTH_USER" {}
variable "KOMPY_AUTH_PASSWORD" {}

resource "azurerm_app_service_plan" "backend-app-service-plan" {
  name                = var.NAME
  resource_group_name = var.RESOURCE_GROUP
  location            = var.LOCATION
  kind                = "linux"
  reserved            = true
  sku {
    capacity = 1
    size     = var.SERVICE_PLAN_SKU_SIZE
    tier     = var.SERVICE_PLAN_SKU_TIER
  }
}

resource "azurerm_app_service" "backend-app-service" {
  name                = var.NAME
  resource_group_name = var.RESOURCE_GROUP
  app_service_plan_id = azurerm_app_service_plan.backend-app-service-plan.id
  location            = azurerm_app_service_plan.backend-app-service-plan.location

  app_settings = {
    WEBSITES_ENABLE_APP_SERVICE_STORAGE = "false"

    WEBSITE_ENABLE_SYNC_UPDATE_SITE = var.WEBSITE_ENABLE_SYNC_UPDATE_SITE
    WEBSITE_NODE_DEFAULT_VERSION    = var.WEBSITE_NODE_DEFAULT_VERSION
    WEBSITE_RUN_FROM_PACKAGE        = var.WEBSITE_RUN_FROM_PACKAGE

    PORT     = var.PORT
    NODE_ENV = var.NODE_ENV

    LOG_LEVEL                  = var.LOG_LEVEL
    MONUMENT_ACTIVITY_BASE_URL = var.MONUMENT_ACTIVITY_BASE_URL

    AUTH0_JWT_AUDIENCE = var.AUTH0_JWT_AUDIENCE
    AUTH0_JWT_DOMAIN   = var.AUTH0_JWT_DOMAIN

    AUTH0_M2M_AUDIENCE      = var.AUTH0_M2M_AUDIENCE
    AUTH0_M2M_BASE_URL      = var.AUTH0_M2M_BASE_URL
    AUTH0_M2M_CLIENT_ID     = var.AUTH0_M2M_CLIENT_ID
    AUTH0_M2M_CLIENT_SECRET = var.AUTH0_M2M_CLIENT_SECRET
    AUTH0_M2M_DOMAIN        = var.AUTH0_M2M_DOMAIN
    AUTH0_M2M_TOKEN_URL     = var.AUTH0_M2M_TOKEN_URL

    POSTGRES_CONNECTION_STRING = var.POSTGRES_CONNECTION_STRING

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
    KOMPY_AUTH_USER               = var.KOMPY_AUTH_USER
    KOMPY_AUTH_PASSWORD           = var.KOMPY_AUTH_PASSWORD
  }

  logs {
    http_logs {
      file_system {
        retention_in_days = 30
        retention_in_mb   = 35
      }
    }
  }

  site_config {
    dotnet_framework_version = "v4.0"
    linux_fx_version         = "NODE|16-lts"
    health_check_path        = "/"

    app_command_line = "node dist/index.js"
    always_on        = true

    dynamic "ip_restriction" {
      for_each = length(var.FRONTDOOR_ID_HEADERS) > 0 ? [1] : []
      content {
        name        = "frontdoor"
        service_tag = "AzureFrontDoor.Backend"
        priority    = 300
        headers {
          x_azure_fdid = var.FRONTDOOR_ID_HEADERS
        }
      }
    }
  }
}

output "BACKEND_URL" {
  value = "https://${azurerm_app_service.backend-app-service.default_site_hostname}"
}
