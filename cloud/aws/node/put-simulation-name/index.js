/**
 * Lambda Function, creates empty simulation
 * with empty configuration file based on Application Type
 * @module get-simulation-list
 * @author Joshua Boverhof <jrboverhof@lbl.gov>
 * @version 1.0
 * @license See LICENSE.md
 * @see https://github.com/motdotla/node-lambda-template
 */
'use strict';
'use AWS.S3'
console.log('Loading function');
const AWS = require('aws-sdk');
//const s3 = require('s3');
const fs = require('fs');
const dirPath = "./tmp";
const path = require('path');
const abspath = path.resolve(dirPath);
const s3_bucket_name = process.env.SIMULATION_BUCKET_NAME;

/*  simulation/{name}
 *  Request Structure:
 *    JSON BODY { "Application": "acm"|"aspenplus"|"foqus" }
 */
exports.handler = function(event, context, callback) {
  console.log(`Running index.handler: "${event.httpMethod}"`);
  console.log("event: " + JSON.stringify(event));
  console.log('==================================');
  const done = (err, res) => callback(null, {
      statusCode: err ? '400' : '200',
      body: err ? err.message : JSON.stringify(res),
      headers: {
          'Content-Type': 'application/json',
      },
  });
  if (event.requestContext == null) {
    context.fail("No requestContext for user mapping")
    return;
  }
  if (event.requestContext.authorizer == null) {
    console.log("API Gateway Testing");
    var content = JSON.stringify(["API Gateway Testing"]);
    callback(null, {statusCode:'200', body: content,
      headers: {'Access-Control-Allow-Origin': '*','Content-Type': 'application/json'}
    });
    return;
  }
  const user_name = event.requestContext.authorizer.principalId;
  if (event.httpMethod == "PUT") {
    var name = event.path.split('/').pop();
    var params = {
      Bucket: s3_bucket_name,
      Body: event.body,
      Key: user_name + "/" + name + "/meta.json"
    };
    var config_filename = "";
    var body = JSON.parse(event.body);
    var app = body.Application;
    if (app != null) app = app.toLowerCase();
    if (app == "foqus") {
      //config_filename = name + ".foqus";
      config_filename = "session.foqus";
    } else if (app == "acm") {
      config_filename = "acm_sinter.json";
    } else if (app == "aspenplus") {
      config_filename = "aspenplus_sinter.json";
    } else if (app == "fake-job") {
      config_filename = "fake-job.json";
    }else {
        done(new Error(`Unsupported application "${event.body}"`));
        return;
    }

    var client = new AWS.S3();
    //var client = s3.createClient(options);
    client.putObject(params, function(err, data) {
      if (err) {
        console.log(err, err.stack); // an error occurred
        done(new Error(`Failed to S3 upload meta information`));
      }
      else {
        params.Body = "{}";
        params.Key = user_name + "/" + name + "/" + config_filename;
        client.putObject(params, function(err, data) {
          if (err) {
            console.log(err, err.stack);
            done(new Error(`Failed to S3 upload application file`));
          }
          else {
            callback(null, {statusCode:'200', body: event.body,
              headers: {'Access-Control-Allow-Origin': '*','Content-Type': 'application/json'}
            });
          }
        });
      }
    });
  }
  else {
          done(new Error(`Unsupported method "${event.httpMethod}"`));
  }
  console.log('==================================');
  console.log('Stopping index.handler');
};
