variable NAME {

}
variable ENVIRONMENT {

}
variable RESOURCE_GROUP {

}

resource "azurerm_frontdoor_firewall_policy" "waf_policy" {
  name = var.NAME
  resource_group_name = var.RESOURCE_GROUP
  enabled = true
  mode = "Detection"
  # Change from Detection to Prevention to log without blocking.
  custom_block_response_status_code = 403

  managed_rule {
    type = "DefaultRuleSet"
    version = "1.0"
  }
}

output WAF_POLICY {
  #Solving an irritating issue with Azure
  value = replace(
  replace(azurerm_frontdoor_firewall_policy.waf_policy.id,
  "frontdoorwebapplicationfirewallpolicies",
  "frontDoorWebApplicationFirewallPolicies"
  ),
  "resourcegroups",
  "resourceGroups",
  )
}