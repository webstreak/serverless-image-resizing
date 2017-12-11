'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
  signatureVersion: 'v4',
});
const Sharp = require('sharp');

const BUCKET = process.env.BUCKET;
const URL = process.env.URL;

const maxAge = 14 * 24 * 60 * 60;


exports.handler = function(event, context, callback) {

  var redirectBack = function(){
    callback(null, {
      statusCode: '301',
      headers: {'location': `${URL}/${key}`},
      body: ''
    })
  };
  var notFound = function(){
    callback(null, {
      statusCode: '404',
      body: ''
    })
  };

  const key = event.queryStringParameters.key;
  var match = key.match(/(\d+|null)x(\d+|null)\/(.*)/);

  if (match === null){
    notFound();
    return false;
  }

  var width = parseInt(match[1], 10);
  var height = parseInt(match[2], 10);
  const originalKey = match[3];

  if (isNaN(width)){ width = null }
  if (isNaN(height)){ height = null }

  var format = match[3].split('.');
  format = format[format.length - 1];
  if (format == 'jpg') {
    format = 'jpeg';
  }

  var contentType = 'image/jpeg';
  if(format == 'png') {
     contentType = 'image/png';
  }

  if (!['png', 'jpeg', 'gif'].includes(format)){
    notFound();
    return false;
  }

  S3.getObject({Bucket: BUCKET, Key: originalKey}).promise()
    .then(data => Sharp(data.Body)
      .resize(width, height)
      .max()
      .toFormat(format)
      .toBuffer()
    )
    .then(buffer => S3.putObject({
        Body: buffer,
        Bucket: BUCKET,
        ContentType: contentType,
        CacheControl: `max-age=${maxAge}`,
        Key: key,
      }).promise()
    )
    .then(() => redirectBack())
    .catch(err => callback(err))
}
