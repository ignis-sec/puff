


class Terminator{
    constructor(process,program){
        this.terminatedCount=0;
        this.terminated=false;
        //register signal handlers
        process.once('SIGINT', function (code) {
            Terminator.prototype.graceful()
        });
        
        process.once('SIGTERM', function (code) {
            Terminator.prototype.graceful()
        });

        this.outputfile = program.output
        this.url = program.url
    }

    terminate(){
        this.graceful(false);
        if(!this.terminated){
            this.terminated=true
            this.browser.close()
        }
    }

    graceful(bTerminate=true){
        console.log('\nExiting....')
        if(this.outputfile){
            if(!pendingOutput.length){
                console.log('No vulnerabilities found, not creating an output file.')
                if(bTerminate){
                    process.exit(1)
                }else{
                    return
                }
            }
    
            //there were results and output pending, write it in json format
            var result = {}
            baseUrl = this.url.replace(/^http(s)?:\/\//, '')
            baseUrl = baseUrl.replace(/\/.*$/, '')
        
            result.host = baseUrl
            result.fuzzTarget = this.url
            result.host_ip = remoteAddr
            result.port = remotePort
            result.source = 'puff-fuzzer'
            result.found = []
            for(var i=0;i<pendingOutput.length;i++){
                result.found.push(pendingOutput[i])
            }
        
            var data = JSON.stringify(result);
            fs.writeFileSync(this.outputfile, data);
        }
    
        if(bTerminate){
            process.exit(1)
        }else{
            return
        }
    }
}



module.exports = {
        Terminator:Terminator
}
