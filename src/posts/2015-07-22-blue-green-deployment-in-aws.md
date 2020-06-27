---
layout: post
title: Blue-green deployments in Amazon Web Services
summary: Implementing blue-green deployments for zero downtime production updates.
date: 2015-07-22
author:
  name: Steve Johns
  url: https://www.linkedin.com/in/stephen-johns-47a7568/
---

The rise and rise of cloud computing services has made it easy for developers to experiment with various enterprise deployment techniques. One of those techniques is [blue-green deployment][1], which involves provisioning two production environments and then toggling between them when deploying a new version of the system. The new code is first deployed to the staging environment, validated, and then that environment is made live, with the previously live environment becoming the new staging environment. Advantages include zero downtime when deploying and the ability to easily roll back a release. This post details how I implemented blue-green deployment in [Amazon Web Services][2] (AWS).

## The Web site

I implemented blue-green deployment for a theoretical Web site called _londontamed.com_. The site has two server-side components: the Web site itself and a Web service. Both components get deployed together on a Web server, with a production environment consisting of multiple instances of these Web servers. The database for the system is shared between the live and staging production environments. There is nothing of note about the site itself, rather I focused on creating a realistic build and deployment process.

## The basic components

As stated in the introduction, blue-green deployment requires two production environments. I implemented each in AWS as an [autoscaling group][4] with an appropriate [launch configuration][5] The autoscaling group handles creating and then maintaining the desired number of Web server instances, with the associated launch configuration determining the [Amazon Machine Image][6] (AMI) to use when launching new instances in the group. I used the [immutable server][7] pattern, so that when deploying a new version of the site the existing instances get discarded rather than being updated.

I used [packer.io][8] to create the AMIs. I first created a generic AMI with [nginx][22] and [Node.js][23] installed on it. (The scripts for this are in the _webserver_ directory.) Then I used this as the base AMI for generating another AMI, this one with the Web site and Web API code installed on it, with the new launch configuration referencing that AMI. I also used [ServerSpec][13] to automatically test each generated AMI. (The scripts for creating the second AMI are in the _deployment/webserver_ directory.)

I used [Elastic Load Balancing][9] (ELB) to route traffic to the instances in an environment. There are two load balancers, one for each of the two production environments (live and staging). I used [alias records][10] in [Route 53][11] to route traffic to a particular load balancer. So, for a request to the Web service or the Web site, it gets routed by Route 53 to the appropriate load balancer, which in turn forwards the request to one of the instances in the autoscaling group it balances the load for. I also made use of [SSL termination][14] in the load balancers to simplify the setup of the instances, since they then only need to handle HTTP traffic.

## Security setup

I created a private [Virtual Private Cloud][12] (VPC) for the site, rather than using the default VPC:

![](/images/2015-07-22-blue-green-deployment-in-aws/5gQrkSR.png "Setting up the VPC")

You could use the default VPC, but it is best practise to create a separate VPC for the site and use it as the means of controlling exactly who and what can access that system. Also, at the same time as creating the VPC, I created a public subnet named _londontamed-com-public-1_.

A load balancer in AWS require that you associate it with at least two subnets, so I then had to create a second subnet in my VPC:

![](/images/2015-07-22-blue-green-deployment-in-aws/4gjGMqC.png "Creating the second subnet")

I had to change the route table that is used by this second subnet to be the same as the route table used by the first subnet. I also used the EC2 Dashboard to create a security group called _londontamed-com-production_:

![](/images/2015-07-22-blue-green-deployment-in-aws/aPti0Ih.png "Creating the security group")

I set up the Inbound rules like so:

| Type   | Protocol               | Port Range |
| ------ | ---------------------- | ---------- |
| RDP    | TCP                    | 3389       |
| SSH    | TCP                    | 22         |
| HTTP   | TCP                    | 80         |
| Custom | ICMP Rule Echo Request | n/a        |
| HTTPS  | TCP                    | 443        |
| Custom | TCP                    | 3001       |

[The security group inbound rules]

The HTTP rule needs to be for all sources, so _0.0.0.0/0_. The other rules should have a source setting that locks the rule down to the IP addresses of whoever needs access. The custom port 3001 rule allows the load balancer access to a non-SSL health check port on an instance.

Finally, I created an [Identity and Access Management][15] (IAM) role called _webserver_ with the _AmazonEC2FullAccess_ managed policy, and I created a key pair in EC2 called _londontamed-com-production_.

## Setting up load balancing

I used the EC2 Dashboard to create two load balancers. The name of the first load balancer is _londontamed-com-production-1_ and the security group is _londontamed-com-production_:

![](/images/2015-07-22-blue-green-deployment-in-aws/yfyP0Nc.png "Creating the first load balancer")

By default the load balancer gets configured with the HTTP protocol. You can add HTTPS as well if you supply an SSL certificate. The HTTPS protocol is configured by default to forward to port 80 (i.e., it implements [SSL termination][14]).

## Setting up Route 53

As mentioned in the introduction, the site is called _londontamed.com_. On the live environment, the Web site is accessible as _www.londontamed.com_ and the Web service is accessible as _api.londontamed.com_. On the staging environment, the equivalent domain names are _www-staging.londontamed.com_ and _api-staging.londontamed.com_.

The live environment was configured in Route 53 as a public hosted zone with domain name _londontamed.com._ (note the trailing period). The zone contains two record sets, both alias records. The first is an A record for _www.londontamed.com._, with an alias target of the _londontamed-com-production-1_ load balancer as selected from the alias target dropdown menu. The second is an A record for _api.londontamed.com._, with the same alias target:

![](/images/2015-07-22-blue-green-deployment-in-aws/nah2MJn.png "Creating an A record")

The staging environment was configured as a private hosted zone with a domain name of _londontamed.com._ (note the trailing period). The VPC for this zone is set to the _londontamed-com_ VPC. This zone also contains two alias record sets. The first is an A record for _www-staging.londontamed.com._, with an alias target of the _londontamed-com-production-2_ load balancer. The second is an A record for _api-staging.londontamed.com._, with the same alias target.

Note that the alias target dropdown does not have any useful entries in it when you are setting up a private hosted zone. You can get the hostname for the second load balancer by temporarily setting the alias target for one of the public hosted zone A record sets to the second load balancer, then copying and pasting the name.

While I set this up so that the public hosted zone points to the first load balancer and the private hosted zone to the second load balancer, this is just the initial order. The load balancer that the record sets for each zone point to will swap over each time you go through the deployment process.

## Deploying to the Staging environment

The setup is now complete, so lets start deploying some code the blue-green way! I decided that I needed three distinct steps to the deployment process:

1. Deploying the new code to the staging environment (deploy to staging).
2. Altering the alias records in Route 53 to switch the live and staging environments (switch live and staging).
3. Removing the old code from the old live environment (clean staging).

I decided to do the scripting in Python using [Boto3][16], the AWS client for Python. I preferred this approach to, say, using the AWS CLI (command line interface) as it allowed me to easily create robust, cross-platform deployment scripts. ~~The scripts are included in my teamcity GitHub repository, in the _scripts_ directory.~~

To run these scripts, you need to set up your AWS credentials on the machine that you will use. The [quickstart guide][19] on the Boto3 Web site includes instructions on how to do this. Also, to simplify the scripts and the number of parameters that they require, I used convention over configuration regarding the naming of the various AWS objects. For example, the convention I use for naming the VPC is as per the domain name, but with periods replaced by hyphens, so _londontamed-com_. The result is that I have to pass far fewer parameters through to the scripts.

### Deploy to Staging

This script is called _deploy-to-staging.py_. It creates a new launch configuration, uses it to create a new autoscaling group, and associates the autoscaling group with the staging load balancer.

### Switch Live and Staging

This script is called _switch-live-and-staging.py_. It is run once you are happy with the new code on the staging environment and you want to make it live. It updates the alias records in Route 53 to do this, making the staging environment into the live environment and the live environment into the staging environment. You can also run this script to roll back a failed switch to live.

### Clean Staging

This script is called _clean-staging.py_. It can be run once the new code is live and you are happy with the result. It deletes the launch configuration and the autoscaling group that is associated with the staging environment. It checks that both are not in use elsewhere in your AWS account. It is not necessary to run this script, but doing so means that you will have no unnecessary instances running and costing you money.

## Alternative approaches to blue-green deployment

There are a few different ways to implement blue-green deployment in AWS.

### Alias record updating

In this post, I have taken the approach of creating a new autoscaling group for the new code, associating the staging load balancer with it and then, when all instances in the group are ready and healthy, I alter the appropriate alias records in Route 53 to make it the new live environment.

I like this approach because, once the autoscaling group is up and running and the appropriate load balancer has been changed to point to it, you do not touch the group or the load balancer again; the switch to live happens within a different AWS system. This seems to me to be a very robust approach. A downside is that which load balancer is live and which is staging changes on each deployment, so it is possible that a mistake could be made and the wrong environment altered at some point. I deal with this in the scripts I created by validating the state of the AWS system at each stage in the deployment process.

### Autoscaling group switching

An alternative approach is to have a live load balancer and a staging load balancer, and switch the new and existing autoscaling groups between them when you wish to make the new code live.

### Autoscaling group updating

Yet another approach is to alter the existing autoscaling groups, rather than creating new ones. In this way there is a live autoscaling group which is always handled by the live load balancer, and a staging autoscaling group which is always handled by the staging load balancer. Deployment works as follows: first the IDs of the existing instances in the staging group are noted and the launch configuration for this group is changed to the new launch configuration. Those existing instances are then terminated one by one, with the changed launch configuration meaning that the new instances that get created in order to maintain the desired number of servers in the group are instances with the new code. The process is repeated on the live environment once the new code is validated on the staging environment.

An advantage of this approach is that any monitoring you have on the autoscaling groups does not need to be recreated on deployment, since you are altering the existing groups rather than replacing them with new ones. A major disadvantage is that switching environments takes much longer, since you have to wait for the new instances to be ready, plus an instance might fail to launch or the load balancer could report the group as unhealthy at some point during the change.

## Conclusion

Blue-green deployment is a great way to create an automated and robust deployment process. AWS supports the technique well and allows for complete scripting of the process of deploying new code.

[1]: https://martinfowler.com/bliki/BlueGreenDeployment.html
[2]: https://aws.amazon.com/
[3]: https://en.wikipedia.org/wiki/Single-page_application
[4]: https://aws.amazon.com/autoscaling/
[5]: https://docs.aws.amazon.com/autoscaling/ec2/userguide/LaunchConfiguration.html
[6]: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/AMIs.html
[7]: https://martinfowler.com/bliki/ImmutableServer.html
[8]: https://www.packer.io/
[9]: https://aws.amazon.com/elasticloadbalancing/
[10]: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-creating.html
[11]: https://aws.amazon.com/route53/
[12]: https://aws.amazon.com/vpc/
[13]: https://serverspec.org/
[14]: https://aws.amazon.com/blogs/aws/elastic-load-balancer-support-for-ssl-termination/
[15]: https://aws.amazon.com/iam/
[16]: https://aws.amazon.com/sdk-for-python/
[17]: https://aws.amazon.com/cli/
[19]: https://boto3.amazonaws.com/v1/documentation/api/latest/guide/quickstart.html
[20]: https://github.com/stevejay/londontamed-example
[21]: https://github.com/stevejay/aws-ami
[22]: https://www.nginx.com/resources/wiki/
[23]: https://nodejs.org/en/
