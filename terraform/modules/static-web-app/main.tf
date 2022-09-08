variable NAME {}
variable RESOURCE_GROUP {}
variable LOCATION {}


resource "azurerm_static_site" "swa" {
  name                = var.NAME
  resource_group_name = var.RESOURCE_GROUP
  location            = var.LOCATION
}

output "URL" {
  value = azurerm_static_site.swa.default_host_name
}

output "DEPLOYMENT_TOKEN" {
  value = azurerm_static_site.swa.api_key
}

output FRONTEND_HOST {
  value = azurerm_static_site.swa.default_host_name
}