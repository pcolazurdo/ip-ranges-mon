//console.log('Loading event');
var aws = require('aws-sdk');
var util = require('util');
var crypto = require('crypto');
var config = require('config');
var ddb = new aws.DynamoDB({params: {TableName: config.dynamoDbTable}});
aws.config.update({region: config.region});

function hash(value) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(value);
  var d = md5sum.digest('hex');

  return d;
}

function saveS3File(fileName, value) {
  var s3 = new aws.S3({region: config.s3.region});
  try {
    var params = {
      Bucket        : config.s3.bucket_name,
      Key           : fileName,
      Body          : value,
      ACL           : "public-read",
      ContentType   : "text/plain"
    };
    s3.putObject(params, function(err, data) {
      if (err) console.log(err, err.stack); // an error occurred
      else     console.log(data);           // successful response
    });
  } catch (error)
  {
    console.log("saveS3File error:", error);
  }
}

function jsonEscape(str)  {
    //return str.replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "").replace(/\"/g,"\\\"");
    //console.log("str: ", str);
    value = str;
    //var value = str.replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "").replace(/\\n/g, "").replace(/\\/g, "");
    //var value = str.replace(/\n/g, "").replace(/\r/g, "").replace(/\t/g, "").replace(/\\n/g, "");
    //console.log("value: ", value);
    return value
}

function putNewVersion(itemParams, context, done) {
  //console.log("putNewVersion: ", util.inspect(itemParams));
  ddb.putItem(itemParams, function(err, data){
    if (err) {
      console.log("PutItem Err: ", err); // an error occurred
    }
    done();
  });
}

function getLatestVersion(done) {
  itemParams = {
    KeyConditions: {
        SnsTopicArn: {
            ComparisonOperator: 'EQ', // (EQ | NE | IN | LE | LT | GE | GT | BETWEEN |
                                      //  NOT_NULL | NULL | CONTAINS | NOT_CONTAINS | BEGINS_WITH)
            AttributeValueList: [ { S: config.SnsTopicArn }, ],
        }
    },
    Limit: 1,
    ScanIndexForward: false,
  }
  ddb.query(itemParams, function(err, data){
    if (err) {
      console.log("Query Error:", err); // an error occurred
    }
    done(data);
  });
}


exports.handler = function(event, context) {
  //console.log('Received event:', JSON.stringify(event, null, 2));
  //console.log("event.Records[0].Sns.Message: ", event.Records[0].Sns.Message);
  var message = event.Records[0].Sns.Message;
  //console.log('From SNS:', message);
  var SnsMessageId = event.Records[0].Sns.MessageId;
  var SnsPublishTime  = Math.round(+new Date()/1000).toString();
  //console.log("SnsPublishtime:", SnsPublishTime);
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
  getLatestVersion(function(data) {
    var oldItem;
    var newItem;
    newItem = jsonEscape(itemParams.Item.jsonContent.S);
    newItemHash = hash(newItem);
    oldItem = jsonEscape(data.Items[0].jsonContent.S);
    oldItemHash = hash(oldItem);
    putNewVersion(itemParams, context, function() {

      if (oldItemHash != newItemHash) {
        metadata = {
          "lastUpdate": JSON.parse(newItem).createDate,
          "oldVersion": JSON.parse(oldItem).syncToken,
          "newVersion": JSON.parse(newItem).syncToken
        }
        saveS3File("data1.txt", oldItem);
        saveS3File("data2.txt", newItem);
        saveS3File("metadata.json", JSON.stringify(metadata));
      }
      context.done(null,'');
    });
  });
};
