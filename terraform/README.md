# monument-plwd-terraform
This repo contains the terraform script to set up the infrastructure for Monument PLWD.

Before applying the terraform setup, make sure you have read [../README.md]() and understand the software setup. 

This setup relies on following services:
* Azure
* Azure container registry
* Twilio
* Sendgrid
* [https://www.safetytracer.eu/](Kompy) 

We are assuming you are familiar with terraform. 

This is by no means an easy solution. It only serves as a guideline for other deployments.

# Get started
We need a couple of CLIs to achieve this goal: `az` and `terraform` must be installed. 

See [Terraform documentation for Azure](https://learn.hashicorp.com/tutorials/terraform/azure-build?in=terraform/azure-get-started)
and [Azure CLI](https://docs.microsoft.com/en-us/cli/azure/manage-azure-subscriptions-azure-cli)
to get started.

## Terraform state
We will be storing our terraform state in Azure. See [https://docs.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage?tabs=azure-cli]() for instructions on how to actually do that.

# Applying terraform
First you need to fill in some variables.

In the folder(s) `environments/prod`, copy the .env.template file to .env and fill in the variable `ARM_ACCESS_KEY`. 
You find the Azure Blob Storage access key with the following command (replacing the ). This information can also be found [here](https://docs.microsoft.com/en-us/azure/developer/terraform/store-state-in-azure-storage?tabs=azure-cli)

```
az storage account keys list --resource-group xxxxxresourcegroupxxxxx --account-name xxxxstoragexxxx --query '[0].value' -o tsv
```

Once that's done, make sure your Azure current subscription is correctly configured:
```
az login
az account set --subscription xxxxxxxxxxxxxx
```

Use the following commands to plan:
```
cd environments/prod
terraform init
cp terraform.tfvars.template terraform.tfvars
# Edit terraform.tfvars using your favorite editor. Fill in the values according to the documentation (README.md in root folder)
terraform plan #and/or terraform apply
```
