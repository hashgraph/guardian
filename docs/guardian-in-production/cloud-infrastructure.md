---
description: >-
  The following document describes the Infrastructure specification for
  production ready instances of Hedera Guardian and a proposal of roadmap to
  achieve the different milestones required.
---

# Cloud Infrastructure

## Cloud agnostic architecture

Cloud agnostic refers to a cloud design strategy in which applications, tools, and services are designed to migrate seamlessly between multiple cloud platforms or between on-premises and cloud in a hybrid model without disruption of service.

This requirement is the main decision factor for the conclusions exposed in this document. The final goal is to provide an out of the box solution at least for the biggest cloud providers and instructions for deployment on other cloud providers or even on On-premises or hybrid clouds

## Tools

### Container orchestration

A cloud agnostic architecture that is built on containerization and microservices can offer flexibility and portability across multiple cloud platforms. Containers provide a lightweight way to package and deploy software applications, while microservices architecture allows for the creation of independent and modular components that can be easily replaced or updated without affecting the entire system.

There are several container orchestrators available, each with its own strengths and weaknesses. Here is a brief comparison of some of the most popular container orchestrators:

**Kubernetes (k8s)** is the most widely adopted container orchestration platform. It is open source, highly customizable, and has a large community of contributors. Kubernetes offers robust features for container management, including automatic scaling, rolling updates, self-healing, and load balancing. However, it can be complex to set up and requires a significant amount of resources to manage.

Docker Swarm is a container orchestration platform that is tightly integrated with the Docker ecosystem. It is easy to set up and has a simple and intuitive interface. Docker Swarm is suitable for smaller deployments, but it lacks some of the advanced features offered by Kubernetes.

Apache Mesos is a distributed systems kernel that can manage both containers and non-container workloads. It provides a more low-level API for container management than Kubernetes, making it a more flexible option for certain use cases. However, it is less user-friendly and requires more technical expertise to set up and manage.

#### Our recommendation

**Kubernetes: it can also help to manage and automate container deployments across multiple cloud environments. In fact, Kubernetes has become the standard for services/microservices architecture and our best option for faster support on different cloud providers.**

**Almost every cloud provider has its own implementation of managed kubernetes clusters, which eases the cluster creation and management, and withdrAWS the responsibility to the final user of maintaining the control plane and the worker nodes.**

### Kubernetes packages

Kubernetes is essentially driven by manifests, files that define the desired state of Kubernetes objects, such as pods, services, deployments, or config maps. These manifests are used by Kubernetes to create and manage these objects in the cluster.

Those manifests have some limitations when it comes to distribution and therefore their templating, and that is where Helm comes in. Helm is a package manager for Kubernetes that allows you to define, install, and upgrade complex Kubernetes applications. Helm uses a packaging format called charts.

Most of the applications on the Kubernetes universe have a Helm chart that can be used to deploy them. The Helm charts are stored in a repository, and the Helm client can be used to download and install them.

An alternative to Helm is Kustomize, which is a Kubernetes native tool that allows you to parametrize Kubernetes objects without having to create a new chart for each change. The downside of Kustomize is that it is not as mature as Helm, and it is not as widely used.

#### Our recommendation

When installing Guardian, or almost any other similar project with a microservices architecture, we can differentiate between two types of services, internal services, which are part of the project, and third-party (or external) services, which are required as a dependency, like MongoDB or Hashicorp Vault. Most of these popular services have a Helm package to ease their installation.

**Helm is the most mature and widely used, but Kustomize is also a good alternative. One of the advantages of using Helm over Kustomize, is to reduce the number of tools needed to master. In other words, we’ll need Helm to install third party applications in the cluster like MongoDB or Prometheus, so it's easier for the final user to apply the same knowledge to deploy internal Guardian services than learning another technology like Kustomize.**

**Another advantage of using Helm is how straightforward it will be for an Ops guy to set up a Guardian instance, directly from the terminal without having to download the actual source code.**

#### Code example

Assuming helm is already installed and configured to access the cluster, installing a Guardian install will be as easy as executing these commands among a few others (the urls might not be live at the time of reading this document):

```
$ helm repo add guardian https://hedera-guardian.github.io/helm-charts/
$ helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
$ helm repo update
$ helm install my-nginx prometheus-community/prometheus-stack
$ helm install my-nginx guardian/guardian-stack
```

### Infrastructure as code - IaC

Infrastructure as Code (IaC) is a process of managing and provisioning infrastructure through code instead of manual processes.

IaC can help to improve infrastructure management by reducing manual work, improving consistency, enabling version control, enhancing scalability, and increasing portability. This can lead to better reliability, security, and cost-effectiveness for organizations that adopt IaC.

This is a brief comparison of some popular cloud agnostic IaC tools:

**Terraform** is a popular open-source tool that allows users to define infrastructure as code using a declarative language. It supports multiple cloud providers and infrastructure types, including AWS, Azure, GCP, and on-premises infrastructure. Terraform is known for its ability to manage complex infrastructure deployments, and its module system allows for easy reuse of code across projects.

Pulumi is a relatively new tool that allows users to define infrastructure as code using familiar programming languages such as Python, TypeScript, and Go. Pulumi provides a high level of flexibility and is a good choice for organizations that prefer to use programming languages for infrastructure management.

Chef Infra is a configuration management tool that allows users to write code to define and manage infrastructure. Chef Infra can be used to manage infrastructure across multiple cloud providers, as well as on-premises infrastructure.

#### Our recommendation

**Terraform. It is a popular choice for managing complex infrastructure deployments on multiple cloud providers, it has the biggest provider library, with great integration with Kubernetes.**

**Is our best option to build the cluster and the elements surrounding it. Including networks, permissions, configurations, secrets, initial deployments, connection credentials and so on.**

#### Alternative approach

There are other tools out there that eases the creation of a kubernetes cluster and they work seamlessly on big cloud providers.

Rancher is one of those powerful tools to create and maintain Kubernetes clusters on any infrastructure, including on-premises data centers, public cloud, and hybrid environments. These kinds of tools could be used by clients that require some setup not covered by our IaC and could be listed/detailed on the user guide before the actual IaC codebase milestone is reached.

The reason not to choose one of these tools as the preferred solution for creating a kubernetes cluster is that we want to have full control over the cluster creation process, be able to customize it to our needs and make the process easily reproducible by using infrastructure as code. Another important reason is to keep the project and all the tools used on the open source ecosystem.

## Roadmap Proposal

Below is a proposal for the roadmap of the infrastructure part of the project. The idea is to have a clear path to follow and to be able to track the progress of the project. In this way we'll be able to predict the next features to be delivered to the clients and the most important, we can add to project documentation next steps, so a potential client can know what to expect from the project and decide to wait for the next release if it fits their requirements and plans.

### Milestones

### Guardian deployment inside of k8s cluster

Create the charts for the different services and document the complete setup process starting when the client already has its own cluster previously deployed.

Determine which elements of the infrastructure are likely to be replaced by the client and which are likely to be reused. For example, the client may want to use their own database provider, outside of the cluster or even in a different provider (DBaaS), or they may want to have a dedicated security or SRE team monitoring the application using enterprise level tools. This is defined in more detail in the[ **Independent Packaged Deployment**](independent-packaged-deployment.md) section.

Define the infrastructure variables required for deploying the infrastructure templates. This includes variables for the cloud provider, region, and other configuration parameters.

Define and document the deployment pipeline: in this stage we should define the steps to deploy the application to the cluster, and the steps to upgrade the application to a new version. We could also recommend some tools to automate the deployment process or to create the cluster itself, like rancher, kubespray, kops, eksctl, anthos, etc.

**Subtasks:**

1. Create helm manifests for each internal Guardian service in a /charts folder, with some basic set of configuration variables. We should take the current docker compose implementation as reference for the customization allowed at this stage.
2. Host the Helm repository using free github pages (more details in this guide [https://medium.com/@gerkElznik/provision-a-free-personal-helm-chart-repo-using-github-583b668d9ba4](https://medium.com/@gerkElznik/provision-a-free-personal-helm-chart-repo-using-github-583b668d9ba4)).
3. Create a “stack” chart to install all the services in a single command, this stack will include the global configuration settings and is a key piece for customization and independent package deployment.
   * Stack charts (often named umbrella charts) are a common practice to group several charts into one. A great example of this could be Prometheus stack [https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
4. Create a documentation page for the whole install process, starting detailing how to install all required third party services using also their helm charts provided by their communities. Add also links to their webpages for detailed tuning.
   * During the process we may find there is no helm chart for some of the packages, or the provider is not reliable enough (lack of maintenance, an individual instead of a company with only few likes, etc). Given that case we could write/host a chart for that package too.
5. Modify CI scripts to update chart versions on each new release in a similar way new docker images are pushed to the registry. This github action can help on the process [https://helm.sh/docs/howto/chart\_releaser\_action/](https://helm.sh/docs/howto/chart\_releaser\_action/)
6. Update project definition of done, to ensure, in the future, every new developed feature, includes chart update if needed. In other words, we don’t want someone in the future adding, for example, a required configuration item on one of the services, and breaking the deployment because they forgot to update the corresponding chart before creating the release.

### Improve deployment using Terraform

This milestone will consist of improving the deployment process using terraform. Automating some of the steps defined in the previous milestone. This would still require the user to have a previous cluster deployed, but it would be a more automated process.

**Subtasks:**

* Create a terraform project using the command below in /terraform/helm folder in the Guardian repository.

`$ terraform init;`

* Create the required manifests to, providing a kubeconfig file, orchestrate the install steps of the previous milestone outcome into a single command. This is a sample of how the main.tf file of this project would look like:

```
provider "helm" {
  kubernetes {
    host                   = module.eks_cluster.cluster_endpoint
    cluster_ca_certificate = base64decode(module.eks_cluster.cluster_ca_certificate)
    token                  = module.eks_cluster.cluster_token
  }
}
  
resource "helm_release" "vault" {
  count        = var.vault_config.self_host ? 1 : 0
  name         = "vault"
  chart        = "vault"
  repository   = "https://helm.releases.hashicorp.com"
  reuse_values = true
}

resource "helm_release" "mongodb" {
  count        = var.mongo_config.self_host ? 1 : 0
  name         = "mongodb"
  chart        = "mongodb"
  repository   = "https://raw.githubusercontent.com/bitnami/charts/archive-full-index/bitnami"
  version      = "10.30.0"
}

resource "helm_release" "guardian-stack" {
    name = "guardian-stack"
    chart = "./charts/guardian-stack"
}
```

* Add the documentation page with instructions to use this installation method.

### Add support to AWS EKS with terraform

Add the fully automated workflow to deploy the infrastructure to AWS EKS using terraform. This includes the creation of the cluster, the deployment of the services, and the configuration of the security groups, user permissions and network policies. Terraform has an official guide to deploy to EKS that can be taken as [reference](https://developer.hashicorp.com/terraform/tutorials/kubernetes/eks).

#### **Subtasks:**

* Create the terraform project under /terraform/aws folder in the Guardian repository.
* Add the required manifests to deploy a complete kubernetes cluster to AWS.
* Write a gitbook documentation page with instructions to use this installation method.

#### **Considerations:**

* AWS is the cloud provider with more complexity when it comes to handling permissions to access the cluster. Roles and policies must be created and attached to the different resources.

1. AmazonEKSWorkerNodePolicy
2. AmazonEC2ContainerRegistryReadOnly
3. AmazonEKSClusterPolicy
4. AmazonEKSFargatePodExecutionRolePolicy
5. AmazonEKS\_CNI\_Policy

* Consider using AWS maintained terraform modules like VPC, EKS or Blueprints to simplify the resources creation.
* EBS plugin must be enabled to allow persistence on EBS disks for the database.
* There are projects like karpenter, to simplify node scaling without the need of having auto-scaling groups with complex rules.

Some resource tags and metadata are used internally by Kubernetes as decision makers.

```
tags = {
    Name = "private-subnet-a"
    "kubernetes.io/role/internal-elb" = "1"
    "kubernetes.io/cluster/eks-cluster" = "owned"
  }
```

### Add support to GCP GKE with terraform

Add the fully automated workflow to deploy the infrastructure to GCP GKE using terraform. This includes the creation of the cluster, the deployment of the services, and the configuration of the security groups, user permissions and network policies. Terraform has an official guide to deploy to GKE that can be taken as [reference](https://developer.hashicorp.com/terraform/tutorials/kubernetes/gke).

#### **Subtasks:**

* Create the terraform project under /terraform/gcp folder in the Guardian repository.
* Add the required manifests to deploy a complete kubernetes cluster to GCP.
* Write a gitbook documentation page with instructions to use this installation method.

#### **Considerations:**

* Permissions model is simpler in GKE, but still needed to be integrated with their IAM permissions system.
* Control plane and worker nodes are fully managed by GPC, but due to the direct VPC internal IPs allocation on each pod, it’s a bit trickier to set up. Bigger IP ranges must be available in the subnets to avoid running out of ips when scaling out the services.
* GKE has a native Ingress controller that leverages Google Cloud Load Balancer.
* For workloads with attached storage, shall be considered implementing Pod Disruption Budgets (PDBs) to ensure a minimum number or percentage of pods with the same label selector are up and running at any given time.

### Add support to Azure AKS with terraform

Add the fully automated workflow to deploy the infrastructure to Azure AKS using terraform. This includes the creation of the cluster, the deployment of the services, and the configuration of the security groups, user permissions and network policies. Terraform has an official guide to deploy to AKS that can be taken as [reference](https://developer.hashicorp.com/terraform/tutorials/kubernetes/aks).

#### **Subtasks:**

* Create the terraform project under /terraform/azure folder in the Guardian repository.
* Add the required manifests to deploy a complete kubernetes cluster to Azure.
* Write a gitbook documentation page with instructions to use this installation method.

#### **Considerations:**

* AKS creates a virtual network (VNet) for your Kubernetes cluster, and the cluster networking must be configured to work with a VNet. Additionally, there is the need to configure network security groups and subnet settings to enable inbound and outbound traffic to the cluster.
* AKS supports Azure Active Directory (AAD) authentication and authorization for Kubernetes clusters. We’ll need to set up AAD roles and policies to control access to cluster resources.
* Every AKS cluster in Azure must belong to a resource group. Those resource groups must be defined in terraform and will ease resources deletion when decommissioning by deleting the resource group itself. This is a simple snippet for its declaration:

```
resource "azurerm_resource_group" "example" {
  name     = "example-resources"
  location = "West Europe"
}

```

Usage of kubenet CNI is the preferred choice at this stage because of its simplicity, even though in future iterations Azure CNI could provide a better integration with other Azure services.

## Other considerations and caveats

### Migrations when the next milestone or provider is available

We should consider the possibility of having to migrate the infrastructure to the next milestone. Let me put an example: if we have a client using the current deployment process, and we release the terraform support, we could consider to provide a way to migrate the infrastructure to the new deployment workflow. Same applies if the client decides to migrate to a different cloud provider.

This is definitely not an easy task, and it would require a lot of work, but worth mentioning here.

### Time to spend on each milestone

Each milestone its a project on its own, we can spend months refining only a single cloud provider, including options to use as much as their services as we want: automated backups, external load balancers, hosted database, advanced monitoring and alerting, reporting, budgeting control, replication and resilience, improved security, etc.

For the scope of this document we’re assuming we’ll provide a simple integration with the cloud providers mentioned above, but it’s important to keep in mind, and properly warn about it in the final client documentation, that terraform is a declarative tool, so changes done manually on the cloud resources after the execution of the supported terraform manifests might be reverted if \`terraform apply\` is executed again after doing those changes.

## Wrap up

Hedera Guardian will be built using a cloud-agnostic microservices architecture, which will enable the potential clients to deploy and manage the application across different cloud providers. Kubernetes, preferably the managed service of each provider, will be used as the orchestration platform to manage the containers and ensure high availability and scalability.

We will use Infrastructure as Code (IaC) to automate the deployment of the infrastructure resources, and Terraform will be used as the primary tool for managing the infrastructure. We will also leverage open-source tools such as Helm to simplify the deployment and management of the Kubernetes clusters.

The infrastructure roadmap includes the initial setup of the cloud infrastructure, including the basic networking elements and permissions, and also deploy and configure the Kubernetes clusters, again, using Terraform. Additionally, we will implement monitoring and logging, to ensure the reliability and security of the infrastructure and application.

All this, putting strong emphasis on documentation, to guide potential clients through the deployment process, and to ensure that the application is easy to maintain and extend.
