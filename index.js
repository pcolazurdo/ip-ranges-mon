//console.log('Loading event');
var aws = require('aws-sdk');
var util = require('util');
var crypto = require('crypto');
var config = require('config');
var stream = require('stream');
var https = require('https');
var ddb = new aws.DynamoDB({params: {TableName: config.dynamoDbTable}});
aws.config.update({region: config.region});

function hash(value) {
  var md5sum = crypto.createHash('md5');
  md5sum.update(value);
  var d = md5sum.digest('hex');
  //console.log("Hash value: ", d);
  return d;
}

function publishToSNS(snsMessage, cb) {
  console.log("publishToSNS snsMessage", snsMessage);
  var sns = new aws.SNS();
  var params = {
    //TargetArn: config.alertSnsTopic,
    TopicArn: config.alertSnsTopic,
    Message: snsMessage.message,
    Subject: snsMessage.subject
  }

  sns.publish(params, function(err,data){
    if (err) {
        console.log('Error sending a message', err);
    } else {
        console.log('Sent message:', data.MessageId);
    }
    cb();
  });
}

function getTextFromUrl (url, cb) {
  console.log("getFileFromUrl url ", url)

  var bufs = [];
  var request = https.get(url, function(response) {
    response.on('data', function (d) {
      //console.log("GetFileFromUrl data: ", d);
      bufs.push(d)
    });
    response.on('end', function() {
      var buf = Buffer.concat(bufs);
      var textReturn = buf.toString('utf8')
      //console.log("GetFileFromUrl finish: ", textReturn);
      cb(textReturn);
    });
  }).on('error', function(err) { // Handle errors
    console.log("getFileFromUrl.error", err.message);
    if (cb) cb(err.message);
  });
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
  var msg = JSON.parse(event.Records[0].Sns.Message);
  var urlOrig = msg.url;
  var md5Orig = msg.md5;
  var synctokenOrig = msg.synctoken;
  console.log('From SNS:', "handler event: ", util.inspect(event.Records[0].Sns));
  getTextFromUrl(urlOrig, function(text) {

    var SnsMessageId = event.Records[0].Sns.MessageId;
    var SnsPublishTime  = Math.round(+new Date()/1000).toString();
    //console.log("SnsPublishtime:", SnsPublishTime);
    var SnsTopicArn = event.Records[0].Sns.TopicArn;
    var LambdaReceiveTime = new Date().toString();
    var itemParams = {
      Item: {
        SnsTopicArn: {S: config.SnsTopicArn}, //this is a dirty trick
        SnsPublishTime: {N: SnsPublishTime},
        SnsMessageId: {S: SnsMessageId},
        LambdaReceiveTime: {S: LambdaReceiveTime},
        jsonContent: {S: text}
      }
    };
    getLatestVersion(function(data) {
      var oldItem;
      var newItem;
      newItem = jsonEscape(itemParams.Item.jsonContent.S);
      newItemHash = hash(newItem);

      console.log("getLatestVersion data", util.inspect(data));
      if (data.Items.length > 0)
      {
        // Database is not empty
        console.log("getLatestVersion database is not empty");
        oldItem = jsonEscape(data.Items[0].jsonContent.S);
      }
      else {
        console.log("getLatestVersion database is empty");
        oldItem = JSON.stringify ({
          "syncToken": "978310861",
          "createDate": "2001-01-01-01-01-01",
          "prefixes": "fake values"
        });
      }
      oldItemHash = hash(oldItem);
      putNewVersion(itemParams, context, function() {
        if (oldItemHash != newItemHash) {
          console.log("putNewVersion there are different information on previous and latest records");
          metadata = {
            "lastUpdate": JSON.parse(newItem).createDate,
            "oldVersion": JSON.parse(oldItem).syncToken,
            "newVersion": JSON.parse(newItem).syncToken
          }
          saveS3File("data1.txt", oldItem);
          saveS3File("data2.txt", newItem);
          saveS3File("metadata.json", JSON.stringify(metadata));
          publishToSNS(
            {
              subject: "There is a new version of AWS Public IP dataset",
              message: "Old Version: " + metadata.oldVersion + " - New Version: " + metadata.newVersion + "\n Please check the differences on " + config.publicUrl
            }, function() {
              context.done(null,'');
            }
          )
        }

      });
    });
  });
};
