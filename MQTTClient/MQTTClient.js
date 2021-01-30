const mqtt = require('mqtt');
class MQTTClient {
	constructor(props){
		this.config = {
			host:null,
			port:null,
			username:null,
			password:null
		}
		this.state={
			connecting:false,
			connected:false,
			subscribedTopicList:[],
			queues:{
				onConnect:[]
			}
		}
		Object.keys(props).forEach(key=>this.config[key]=props[key]);
		this.startup()
	}
	set_connected(value){
		if (this.state.connected !== value){
			this.state.connected = value;
			if ( this.state.connected)
				this.set_connecting(false)
		}
	}
	set_connecting(value){
		if (this.state.connecting !== value)
			this.state.connecting = value;
	}
	startup() {
		const {host,port,username,password}=this.config;
		this.state.client = mqtt.connect({host,port},{username,password});
		this.sta
	}
	check_connection(){
		return new Promise((resolve,reject)=>this.state.connected ? resolve() : this.wait_connection({resolve,reject}))
	}
	wait_connection({resolve,reject}){
		if (this.state.connecting){
			this.state.queues.onConnect.push({resolve,reject})
		else
			this.connect()
	}
	connect(){
		const {host,port,username,password}=this.config;
		this.set_connecting(true)
		this.state.client = mqtt.connect({host,port},{username,password});
		this.set_timeout("connect");
		this.state.client.on("connect",(err)=>{
			if (err){
			}else{
			}
		})
	}
	publish({topic,message="",qos=0}){
		return new Promise((resolve,reject)=>
			this.check_connection().then(()=>{
				this.state.client.publish(topic,message,{qos},err=>err?reject(err) : resolve());
			})
		)
	}

}
module.exports = { MQTTClient };

var client  = mqtt.connect('mqtt://test.mosquitto.org')

client.on('connect', function () {
  client.subscribe('presence', function (err) {
    if (!err) {
      client.publish('presence', 'Hello mqtt')
    }
  })
})

client.on('message', function (topic, message) {
  // message is Buffer
  console.log(message.toString())
  client.end()
})
