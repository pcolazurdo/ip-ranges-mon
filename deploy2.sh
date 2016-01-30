#!/bin/bash
echo Have you customized your ipmonitoring0.json as per your preferences?
echo You have 60 seconds to do that before this scripts run with the values in it
sleep 30
echo Are you sure you don\'t want to cancel this?
sleep 30
echo Starting ...
sleep 5
# Variable Definitions - CHANGE as YOU NEED!!!
STACKNAME=IpMonitoring1
STACKREGION=eu-west-1
# End of Variable Definitions
STACKARN=`aws cloudformation create-stack --stack-name $STACKNAME --template-body file://ipmonitoring0.json --capabilities CAPABILITY_IAM --region $STACKREGION | jq '.StackId' | cut -d\" -f2`

echo Creating $STACKNAME : $STACKARN
echo ...
sleep 30

while [ "$(aws cloudformation describe-stacks --stack-name $STACKARN --region $STACKREGION | jq '.Stacks[0].StackStatus' | cut -d\" -f2)" == "CREATE_IN_PROGRESS" ];
do
  echo Waiting on CloudFormation to create the $STACKNAME stack - Check Progress in CloudFormation logs
  sleep 10
done

LAMBDAFUNCTIONNAME=`aws cloudformation describe-stack-resource --stack-name $STACKARN --region $STACKREGION --logical-resource-id LambdaIpMonitoringFunction | jq '.StackResourceDetail.PhysicalResourceId' | cut -d\" -f2`
S3REPO=`aws cloudformation describe-stack-resource --stack-name $STACKARN --region $STACKREGION --logical-resource-id S3Bucket | jq '.StackResourceDetail.PhysicalResourceId' | cut -d\" -f2`
DYNAMODBTABLE=`aws cloudformation describe-stack-resource --stack-name $STACKARN --region $STACKREGION --logical-resource-id DynamoDBTable | jq '.StackResourceDetail.PhysicalResourceId' | cut -d\" -f2`
SNSALERTNAME=`aws cloudformation describe-stack-resource --stack-name $STACKARN --region $STACKREGION --logical-resource-id SNSTopicAlert | jq '.StackResourceDetail.PhysicalResourceId' | cut -d\" -f2`
S3PUBLICURL=https://s3-$STACKREGION.amazonaws.com/$S3REPO/index.html

sleep 60

echo $LAMBDAFUNCTIONNAME
echo $S3REPO
echo $DYNAMODBTABLE
echo $SNSALERTNAME
echo $S3PUBLICURL
#exit


echo "{" >config.json
echo "  \"s3\": {" >>config.json
echo "    \"region\" : \"$STACKREGION\"," >>config.json
echo "    \"bucket_name\": \"$S3REPO\"" >>config.json
echo "  }," >>config.json
echo "  \"region\" : \"$STACKREGION\"," >>config.json
echo "  \"SnsTopicArn\": \"arn:aws:sns:us-east-1:806199016981:AmazonIpSpaceChanged\"," >>config.json
echo "  \"dynamoDbTable\": \"$DYNAMODBTABLE\"," >>config.json
echo "  \"alertSnsTopic\": \"$SNSALERTNAME\"," >>config.json
echo "  \"publicUrl\": \"$S3PUBLICURL\"" >>config.json
echo "}" >>config.json

echo Packaging Code into temp
rm /tmp/lambda_SNSMessages.zip
zip  /tmp/lambda_SNSMessages.zip *
echo Updating $LAMBDAFUNCTIONNAME code
aws lambda update-function-code --function $LAMBDAFUNCTIONNAME --region $STACKREGION --zip fileb:///tmp/lambda_SNSMessages.zip
echo Copying static website to s3://$S3REPO
aws s3 cp static/ s3://$S3REPO/ --recursive --include "*" --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers --region $STACKREGION


echo Automatic Tasks Completed!
echo Now you still have to end a few Manual Tasks:
echo   1\) Go to AWS Lambda Console.
echo   2\) Select the Lambda Function
echo   3\) Go to Event Sources and add arn:aws:sns:us-east-1:806199016981:AmazonIpSpaceChanged
echo   4\) Enable It
echo You are done!
