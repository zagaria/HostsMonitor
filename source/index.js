const Checker = require('./lib/checker');
const Database = require('./lib/database');

const currentTime = Date.now();
const expireTimeInterval = (process.env['CertificateExpireTime']!=undefined ? (parseInt(process.env['CertificateExpireTime'])*1000):86400000);

const debug = true;

const responseModel = {
    host: '',
    date: 0,
    code: 0,
    httpCode: 0,
    responseTime: 0
}

const config = {
    currentTime: currentTime,
    expireTimeInterval: expireTimeInterval,
	debug: debug
}

async function main(){
	const checker = new Checker(config);
    
    let database = new Database({table:process.env['DynamoDBTable']});
    
    let hosts = [];
	
	if (process.env['HOSTS']!==undefined){
		let parts = process.env['HOSTS'].split(';');
		for (let index in parts){
			let temp = parts[index].split(':');
			let host = temp[0];
			let port = 443;
			if (temp.length>1){
				port = parseInt(temp[1]);
			}
			hosts.push({host:host,port:port});
		}
	}
    
	let results = await Promise.all(checker.Check(hosts));
    
    let response = [];
    let promiseArray = [];
    
    for (let index in results){
        let result = results[index];
        let obj = new Object();
        for (let element in responseModel){
            result['date'] = Date.now();
            obj[element] = result[element];
        }
        promiseArray.push(database.Insert(obj));
        response.push(obj);
    }
    
    let databaseResult = await Promise.all(promiseArray);
    
    return response;
}

exports.handler = async (event, context, callback) => {
    let results = await main();
    
    let response = {
        statusCode: 200,
        body: JSON.stringify({"status":"success"})
    };
      
    callback(null,response);
}