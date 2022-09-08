variable "NAME" {}
variable "ENVIRONMENT" {}
variable "RESOURCE_GROUP" {}
variable "LOCATION" {
  default = "westeurope"
}
variable "POSTGRES_ADMIN_USERNAME" {
  default = "monument"
}
variable "POSTGRES_ADMIN_PASSWORD" {}

variable "POSTGRES_SKU_NAME" {
  default = "B_Gen5_1"
}

variable "POSTGRES_VERSION" {
  default = "11"
}

variable "POSTGRES_BACKUP_RETENTION_DAYS" {
  default = 7
}

resource "azurerm_postgresql_server" "postgres" {
  name                = var.NAME
  location            = var.LOCATION
  resource_group_name = var.RESOURCE_GROUP

  administrator_login          = var.POSTGRES_ADMIN_USERNAME
  administrator_login_password = var.POSTGRES_ADMIN_PASSWORD

  sku_name = var.POSTGRES_SKU_NAME
  version  = var.POSTGRES_VERSION

  backup_retention_days        = var.POSTGRES_BACKUP_RETENTION_DAYS
  geo_redundant_backup_enabled = false
  auto_grow_enabled            = false

  public_network_access_enabled    = true
  ssl_enforcement_enabled          = false
  ssl_minimal_tls_version_enforced = "TLSEnforcementDisabled"

  tags = {
    "tier" = var.ENVIRONMENT
  }
}

resource "azurerm_postgresql_firewall_rule" "postgres-firewall-rule-azure" {
  name                = "azure-services"
  resource_group_name = var.RESOURCE_GROUP
  server_name         = azurerm_postgresql_server.postgres.name
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}

resource "azurerm_postgresql_firewall_rule" "postgres-firewall-rule-koen" {
  name                = "koen-ongena-home"
  resource_group_name = var.RESOURCE_GROUP
  server_name         = azurerm_postgresql_server.postgres.name
  start_ip_address    = "78.22.147.195"
  end_ip_address      = "78.22.147.195"
}

resource "azurerm_postgresql_firewall_rule" "postgres-firewall-rule-de-krook" {
  name                = "imec-dekrook-office"
  resource_group_name = var.RESOURCE_GROUP
  server_name         = azurerm_postgresql_server.postgres.name
  start_ip_address    = "193.191.7.130"
  end_ip_address      = "193.191.7.130"
}

resource "azurerm_postgresql_database" "postgres-database" {
  name                = "monument"
  resource_group_name = var.RESOURCE_GROUP
  server_name         = azurerm_postgresql_server.postgres.name
  charset             = "UTF8"
  collation           = "English_United States.1252"
}

output "POSTGRES_CONNECTION_STRING" {
  value     = "postgresql://${azurerm_postgresql_server.postgres.administrator_login}@${azurerm_postgresql_server.postgres.name}:${azurerm_postgresql_server.postgres.administrator_login_password}@${azurerm_postgresql_server.postgres.fqdn}:5432/${azurerm_postgresql_database.postgres-database.name}?ssl=true"
  sensitive = true
}
