variable "NAME" {}
variable "RESOURCE_GROUP" {}
variable "LOCATION" {}

resource "azurerm_log_analytics_workspace" "default" {
  name                = var.NAME
  location            = var.LOCATION
  resource_group_name = var.RESOURCE_GROUP
  sku                 = "PerGB2018"
  retention_in_days   = 30
}

output "ID" {
  value = azurerm_log_analytics_workspace.default.id
}
