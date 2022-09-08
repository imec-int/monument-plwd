variable "ENVIRONMENT" {}
variable "LOCATION" {}
variable "RESOURCE_GROUP" {}
variable "SERVICE_PLAN_SKU_NAME" {}

variable "DOCKER_ENABLE_CI" {
  default = true
}
variable "DOCKER_REGISTRY_SERVER_URL" {}
variable "DOCKER_REGISTRY_SERVER_USERNAME" {}
variable "DOCKER_REGISTRY_SERVER_PASSWORD" {}

variable "AUTH0_AUDIENCE" {}
variable "AUTH0_BASE_URL" {}
variable "AUTH0_CLIENT_ID" {}
variable "AUTH0_CLIENT_SECRET" {}
variable "AUTH0_DOMAIN" {}
variable "AUTH0_ISSUER_BASE_URL" {}
variable "AUTH0_SECRET" {}
variable "AUTH0_SESSION_ABSOLUTE_DURATION" {}

variable "API_BASE_URL" {}
variable "LOG_LEVEL" {}

resource "azurerm_service_plan" "monument_activity_service_plan" {
  name                = "${var.RESOURCE_GROUP}-service-plan"
  resource_group_name = var.RESOURCE_GROUP
  location            = var.LOCATION
  os_type             = "Linux"
  sku_name            = var.SERVICE_PLAN_SKU_NAME

  tags = {
    tier = var.ENVIRONMENT
  }
}

resource "azurerm_linux_web_app" "monument_activity_linux_web_app" {
  name                = "${var.RESOURCE_GROUP}-web-app"
  resource_group_name = var.RESOURCE_GROUP
  location            = var.LOCATION
  service_plan_id     = azurerm_service_plan.monument_activity_service_plan.id

  site_config {
    http2_enabled = true
    always_on     = true
    # application_stack {
    #   docker_image     = "monumentactivity.azurecr.io/monument-activity-web-app"
    #   docker_image_tag = "34278"
    # }
  }

  logs {
    detailed_error_messages = false
    failed_request_tracing  = false

    http_logs {
      file_system {
        retention_in_days = 7
        retention_in_mb   = 35
      }
    }
  }

  app_settings = {
    "AUTH0_AUDIENCE"                  = var.AUTH0_AUDIENCE
    "AUTH0_BASE_URL"                  = var.AUTH0_BASE_URL
    "AUTH0_CLIENT_ID"                 = var.AUTH0_CLIENT_ID
    "AUTH0_CLIENT_SECRET"             = var.AUTH0_CLIENT_SECRET
    "AUTH0_DOMAIN"                    = var.AUTH0_DOMAIN
    "AUTH0_ISSUER_BASE_URL"           = var.AUTH0_ISSUER_BASE_URL
    "AUTH0_SECRET"                    = var.AUTH0_SECRET
    "AUTH0_SESSION_ABSOLUTE_DURATION" = var.AUTH0_SESSION_ABSOLUTE_DURATION

    "DOCKER_ENABLE_CI"                = var.DOCKER_ENABLE_CI
    "DOCKER_REGISTRY_SERVER_PASSWORD" = var.DOCKER_REGISTRY_SERVER_PASSWORD
    "DOCKER_REGISTRY_SERVER_URL"      = var.DOCKER_REGISTRY_SERVER_URL
    "DOCKER_REGISTRY_SERVER_USERNAME" = var.DOCKER_REGISTRY_SERVER_USERNAME

    "API_BASE_URL" = var.API_BASE_URL
    "LOG_LEVEL"    = var.LOG_LEVEL

    "WEBSITES_ENABLE_APP_SERVICE_STORAGE" = false
  }

  lifecycle {
    ignore_changes = [
      # deployments are made outside of Terraform
      site_config.0.linux_fx_version,
    ]
  }

  tags = {
    tier = var.ENVIRONMENT
  }
}
