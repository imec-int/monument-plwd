variable NAME {}
variable LOCATION {}

resource "azurerm_resource_group" "rg" {
  name     = var.NAME
  location = var.LOCATION
}

output "name" {
  value       = azurerm_resource_group.rg.name
  description = "Resource group name"
}