const AWS = require('aws-sdk');
const util = require('util');

module.exports = class Database {
    constructor(config){
        this.table = config.table;
        this.documentClient = new AWS.DynamoDB.DocumentClient();
    }
    
    async Append(field,key,values){
        let results = await this.Select(field,key);
        let item = new Object();
        
        item[field]=key;
        
        if (results.Items.length>0){
            let params = {
                  TableName : this.table,
                  Item: item,
                  Key: item,
                  UpdateExpression : "SET #attrName = list_append(#attrName, :attrValue)",
                ExpressionAttributeNames : {
                  "#attrName" : values.key
                },
                ExpressionAttributeValues : {
                  ":attrValue" : values.values
                }
                };
                return this.documentClient.update(params).promise();
        } else {
            let obj = new Object();
            obj[field] = key;
            obj[values.key] = values.values;
            
            return this.Insert(obj);
        }
    }
    
    async Insert(values){
        let params = {
              TableName: this.table,
              Item: values
            };
        return this.documentClient.put(params).promise();
    }
    
    async Select(field,value){
        let expressionName = new Object();
        expressionName['#'+field] = field;
        let expressionValue = new Object();
        expressionValue[':'+field]=value;
        let params = {
            TableName : this.table,
            KeyConditionExpression: util.format("#%s = :%s",field,field),
            ExpressionAttributeNames:expressionName,
            ExpressionAttributeValues:expressionValue
        };
        return this.documentClient.query(params).promise();
    }
}