#!/bin/bash
# Variable Definitions - CHANGE as YOU NEED!!!
STACKNAME=IpMonitoring3
STACKREGION=eu-west-1
# End of Variable Definitions
STACKARN=`aws cloudformation create-stack --stack-name $STACKNAME --template-body file://ipmonitoring0.json --capabilities CAPABILITY_IAM --region $STACKREGION | jq '.StackId' | cut -d\" -f2`

echo Creating $STACKNAME : $STACKARN
sleep 30

while [ "$(aws cloudformation describe-stacks --stack-name $STACKARN --region $STACKREGION | jq '.Stacks[0].StackStatus' | cut -d\" -f2)" == "CREATE_IN_PROGRESS" ];
do
  echo Waiting on CloudFormation to create the $STACKNAME stack - Check Progress in CloudFormation logs
  sleep 60
done

aws cloudformation describe-stacks --stack-name $STACKARN --region $STACKREGION --logical-resource-id LambdaIpMonitoringFunction 



sleep 60


#LambdaFunction=arn:aws:lambda:eu-west-1:276631003671:function:IPMonitoring7-LambdaIpMonitoringFunction-12016C6UUV47V
#S3Repo=myipmonitoring
#Region=eu-west-1
#rm /tmp/lambda_SNSMessages.zip
#zip  /tmp/lambda_SNSMessages.zip *
#aws lambda update-function-code --function $LambdaFunction --region $Region --zip fileb:///tmp/lambda_SNSMessages.zip
#aws s3 cp  static/ s3://$S3Repo/ --recursive --include "*" --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers --region $Region
