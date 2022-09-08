variable "NAME" {}
variable "ENVIRONMENT" {}
variable "RESOURCE_GROUP" {}

variable "BACKEND_HOST" {}
variable "FRONTEND_HOST" {}

variable "WAF_POLICY" {}

variable "LOG_ANALYTICS_WORKSPACE_ID" {}

locals {
  name = "${var.NAME}-${var.ENVIRONMENT}"

  health_probe_backend  = "healthProbeSettings-1629806558610"
  health_probe_frontend = "healthProbeSettings-1629806841833"

  load_balancing_backend  = "loadBalancingSettings-1629806558610"
  load_balancing_frontend = "loadBalancingSettings-1629806841833"

  frontend_endpoint_frontdoor_name = replace("${var.NAME}-${var.ENVIRONMENT}.azurefd.net", ".", "-")
  frontend_endpoint_frontdoor_host = "${var.NAME}-${var.ENVIRONMENT}.azurefd.net"
}

resource "azurerm_frontdoor" "frontdoor" {
  name                = local.name
  friendly_name       = local.name
  resource_group_name = var.RESOURCE_GROUP

  backend_pool {
    health_probe_name   = local.health_probe_frontend
    load_balancing_name = local.load_balancing_frontend
    name                = "web"

    backend {
      enabled     = true
      address     = var.FRONTEND_HOST
      host_header = var.FRONTEND_HOST
      http_port   = 80
      https_port  = 443
    }
  }

  backend_pool {
    health_probe_name   = local.health_probe_backend
    load_balancing_name = local.load_balancing_backend
    name                = "api"

    backend {
      enabled     = true
      address     = var.BACKEND_HOST
      host_header = var.BACKEND_HOST
      http_port   = 80
      https_port  = 443
      priority    = 1
      weight      = 50
    }
  }

  backend_pool_settings {
    enforce_backend_pools_certificate_name_check = true
    backend_pools_send_receive_timeout_seconds   = 30
  }

  backend_pool_health_probe {
    name                = local.health_probe_backend
    path                = "/health"
    interval_in_seconds = 30
    probe_method        = "HEAD"
    protocol            = "Https"
  }

  backend_pool_health_probe {
    name                = local.health_probe_frontend
    path                = "/"
    interval_in_seconds = 30
    probe_method        = "HEAD"
    protocol            = "Https"
  }

  routing_rule {
    name = "to-api"
    accepted_protocols = [
    "Https"]
    patterns_to_match = [
    "/api/*"]
    frontend_endpoints = [
    local.frontend_endpoint_frontdoor_name]

    forwarding_configuration {
      custom_forwarding_path = "/"
      forwarding_protocol    = "HttpsOnly"
      backend_pool_name      = "api"
    }
  }

  # Routing rule to redirect all HTTP traffic to HTTPS endpoint
  routing_rule {
    name = "to-web"
    accepted_protocols = [
    "Https"]
    patterns_to_match = [
    "/*"]
    frontend_endpoints = [
    local.frontend_endpoint_frontdoor_name]

    forwarding_configuration {
      forwarding_protocol = "HttpsOnly"
      backend_pool_name   = "web"
    }
  }

  routing_rule {
    name = "HttpToHttps"
    accepted_protocols = [
    "Http"]
    patterns_to_match = [
    "/*"]
    frontend_endpoints = [
    local.frontend_endpoint_frontdoor_name]

    redirect_configuration {
      redirect_protocol = "HttpsOnly"
      redirect_type     = "PermanentRedirect"
    }
  }

  backend_pool_load_balancing {
    name                            = local.load_balancing_frontend
    additional_latency_milliseconds = 0
    sample_size                     = 4
    successful_samples_required     = 2

  }

  backend_pool_load_balancing {
    name = local.load_balancing_backend

    additional_latency_milliseconds = 0

    sample_size                 = 4
    successful_samples_required = 2
  }

  frontend_endpoint {
    name      = local.frontend_endpoint_frontdoor_name
    host_name = local.frontend_endpoint_frontdoor_host

    web_application_firewall_policy_link_id = var.WAF_POLICY
  }
}

resource "azurerm_monitor_diagnostic_setting" "diagnostics" {
  count                      = var.LOG_ANALYTICS_WORKSPACE_ID != "" ? 1 : 0
  name                       = "diagnostics"
  target_resource_id         = replace(azurerm_frontdoor.frontdoor.id, "frontDoors", "frontdoors")
  log_analytics_workspace_id = replace(replace(var.LOG_ANALYTICS_WORKSPACE_ID, "microsoft.operationalinsights", "Microsoft.OperationalInsights"), "resourcegroups", "resourceGroups")

  log {
    category = "FrontdoorAccessLog"
    enabled  = true

    retention_policy {
      days    = 0
      enabled = false
    }
  }
  log {
    category = "FrontdoorWebApplicationFirewallLog"
    enabled  = true

    retention_policy {
      days    = 0
      enabled = false
    }
  }

  metric {
    category = "AllMetrics"

    retention_policy {
      enabled = false
    }
  }
}

output "FRONTDOOR_ID" {
  value = azurerm_frontdoor.frontdoor.header_frontdoor_id
}

output "FRONTDOOR_URL" {
  value = "https://${local.frontend_endpoint_frontdoor_host}"
}
