const https = require('https');
const util = require('util');

/* Error codes */

/*

1 - certificate expired
2 - invalid host (CN)
3 - certificate expired and invalid host #
5 - invalid certificate start date
8 - 

*/

module.exports = class Checker {
    constructor(config){
        this.template = "%d. %s \n";
	    this.errors = {
            expired:{code:1,message:"Certificate expired!"},
            invalidHost:{code:2,message:"Common Name is different from real host!"},
            invalidStartDate:{code:5,message:"Certificate start date is earlier than the current date!"}
        };
	    this.currentTime = config.currentTime;
	    this.expireTimeInterval = config.expireTimeInterval;
	    this.debug = config.debug;
	}
	
	__Debug(data){
	    if (this.debug) {
	        console.log(data);
	    }
    }
	
	__ArraySum(array){
		let sum = 0;
		
		for (let index in array){
			sum = sum + array[index];
		}
		
		return sum;
	}
	
	Check(hosts){
		let promiseArray = [];
        
	    for (let index in hosts){
			promiseArray.push(this.__request(hosts[index].host,hosts[index].port));
		}
			
		return promiseArray;
	}
	
	async __request(host,port){
		
		let options = {
			host: host,
			port: port,
			method: 'get',
			path: '/',
			rejectUnauthorized: false,
			agent: false
		}
		
		let cert = {
			host: host,
			port: port,
			valid_from: '',
			valid_to: '',
			CN: '',
			httpCode: 0,
			responseTime: 0,
			message: '',
			code: 0
		}
		
		this.__Debug(options);
		
		
		return new Promise((resolve,reject) => {
			let time = Date.now();
			let isChecked = false;
			let req = https.request(options,(result) => {
				
				let errorsCodes = [];
				let message = '';
				let certResult = result.socket.getPeerCertificate();
				
				cert.httpCode = result.statusCode;
				cert.responseTime = Date.now()-time;
				
				cert.CN = certResult.subject.CN;
				cert.valid_from = certResult.valid_from;
				cert.valid_to = certResult.valid_to;
				
				let validFrom = Date.parse(cert.valid_from);
				let validTo = Date.parse(cert.valid_to);
				
				errorsCodes.push(((validTo-this.currentTime)>this.expireTimeInterval) ? 0:this.errors.expired.code);
				errorsCodes.push((cert.CN==host) ? 0:this.errors.invalidHost.code);
				errorsCodes.push(((this.currentTime-validFrom)>0) ? 0:this.errors.invalidStartDate.code);
				
				let messageRender = (errorIndex,data) => { return util.format(this.template,errorIndex,data); }
				
				let count = 0;
				
				for (let index in errorsCodes){
					let code = errorsCodes[index];
					for (let messageIndex in this.errors){
						if (this.errors[messageIndex].code==code){
							count = count + 1;
							message = message + messageRender(count,this.errors[messageIndex].message);
						}
					}
				}
				
				cert.message = message;
				cert.code = this.__ArraySum(errorsCodes);
				isChecked = true;
				resolve(cert);
			});
			
			req.setTimeout(5000);

			req.on('timeout', () => { req.destroy();  
			    if (isChecked==false) {
				cert.code=-2;
				alreadyCheck = true;
			        resolve(cert)};
			     }
			);

			req.on('error', (result) => {

				console.log(cert);
				if (isChecked==false){
				    cert.message = result.code;
				    cert.code = -1;
				    isChecked = true;
				    resolve(cert)};
			 });
			
			req.on('error',(result)=>{
				cert.message = result.code;
				cert.code = -1;
				resolve(cert);
			});
			
			req.end();
		});
		
	}	
}
