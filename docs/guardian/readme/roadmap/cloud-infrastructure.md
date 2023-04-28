# ☁ Cloud Infrastructure

Below you can see a list of the immediate milestones we're planning for Guardian to reach in terms of production ready cloud infrastructure. The dates are approximate but we'll push hard to meet them. Detailed documentation with all the implementation details will be published for each milestone once it's reached. Following this link you can find more details and updates [https://app.zenhub.com/workspaces/guardian-618c27c08661c0001461263a/issues/gh/hashgraph/guardian/1745](https://app.zenhub.com/workspaces/guardian-618c27c08661c0001461263a/issues/gh/hashgraph/guardian/1745)

### June 2023: Support for standard kubernetes cluster

Creation of the manifests and charts for the different services and document the complete setup process starting when the cluster is ready and accessible.

Definition and documentation for the deployment pipeline: definition for the steps to deploy the application to the cluster, and the steps to upgrade the application to a new version. Some tools could be recommended at this stage based on our experience to build the cluster.

### July 2023: Support for AWS EKS

Add the fully automated workflow to deploy the infrastructure to AWS using terraform. This includes the creation of the cluster, the deployment of the services, and the configuration of the security groups and network policies.

### September 2023: Support for GCP GKE

Add the fully automated workflow to deploy the infrastructure to GCP using terraform. This includes the creation of the cluster, the deployment of the services, and the configuration of the security groups and network policies.

### October 2023: Support for Azure AKS

Add the fully automated workflow to deploy the infrastructure to Azure using terraform. This includes the creation of the cluster, the deployment of the services, and the configuration of the security groups and network policies.
