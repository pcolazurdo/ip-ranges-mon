# ip-ranges-mon
AWS Public IP Ranges monitoring

This tool has been created as a personal exercise to try the idea of running a serverless architecture.
* It is not tested. It will fail somehow.
* It is not security proof. In fact it could create enough security holes to sink the 5th fleet.
* It is provided as-is.
* It has been done as an exercise. Treat accordingly.

Running deploy2.sh will deploy a set of AWS components to create a monitoring and diff tool 
for the AWS Public IP Ranges. AWS Charges may apply as soon as you run the script. BE CAREFUL. 

What will this script create?

* One DynamoDB Table: To host different versions of the "AWS Public IP Ranges" JSON data 
* One SNS Topic to notify on changes on the data. You could subscribe to this topic to receive notifications.
* One IAM Role to enable permissions for the Lambda function - This needs to be reviewed by your Security Team 
to be sure that it complies with the corresponding security practices. ATTENTION: This hasn't been tested enough.
* One Lambda Function which will do the heavy job
* One s3 bucket to host the static website to show the differences between the two latest versions received

How to use this script?

* Run git clone 
* Review and Modify the ipmonitoring0.json file according to your needs. As this will be executed automatically you need to change the default values for CloudFormation to use those values
* Review and Modify deploy2.sh according to your needs. Specially put special attention to tue Region and Stack Naming
* To execute deploy2.sh you will need to have the corresponding permissions to create all these resources by running AWS. This could be solved by providing the corresponding credentials file or to have the right Instance Profile where you're running this script from.
* Execute deploy2.sh
* Follow the instructions at the end of the script execution.

* If something goes wrong, just delete the CloudFormation Stack (you probably will need to delete the content of the s3 bucket to be able to delete the complete Stack as this may fail)

HAVE FUN!


