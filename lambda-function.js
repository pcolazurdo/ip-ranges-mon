console.log('Loading event');
var aws = require('aws-sdk');
aws.config.update({region: 'eu-west-1'});
var ddb = new aws.DynamoDB({params: {TableName: 'SNSMessages'}});
var jsondiff = require('json-diff');



exports.handler = function(event, context) {
  console.log('Received event:', JSON.stringify(event, null, 2));
  var message = event.Records[0].Sns.Message;
  console.log('From SNS:', message);
  var SnsMessageId = event.Records[0].Sns.MessageId;
  var SnsPublishTime  = Math.round(+new Date()/1000).toString();
  console.log("SnsPublistime:", SnsPublishTime);
  var SnsTopicArn = event.Records[0].Sns.TopicArn;
  var LambdaReceiveTime = new Date().toString();
  var itemParams = {
    Item: {
      SnsTopicArn: {S: SnsTopicArn},
      SnsPublishTime: {N: SnsPublishTime},
      SnsMessageId: {S: SnsMessageId},
      LambdaReceiveTime: {S: LambdaReceiveTime},
      jsonContent: {S: message}
    }
  };
  //var oldItem = getLastVersion();
  putNewVersion(itemParams, context);
  var diff = jsondiff.diff( JSON.parse(message), JSON.parse({ "Message":"Wrong"}));
  console.log("Difference", diff);
  context.done(null,'');
};

function putNewVersion(itemParams, context) {
  ddb.putNewVersion(itemParams, function(err, data){
    if (err) {
      console.log(err); // an error occurred
    } else {
      console.log(data); // successful response
    }
  });
}
