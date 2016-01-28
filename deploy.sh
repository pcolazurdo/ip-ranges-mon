#!/bin/bash
LambdaFunction=lambda_SNSMessages
S3Repo=pabcol.lambda
Region=eu-west-1
rm /tmp/lambda_SNSMessages.zip
zip  /tmp/lambda_SNSMessages.zip *
aws lambda update-function-code --function $LambdaFunction --region $Region --zip fileb:///tmp/lambda_SNSMessages.zip
aws s3 cp  static/ s3://$S3Repo/ --recursive --include "*" --grants read=uri=http://acs.amazonaws.com/groups/global/AllUsers --region $Region
