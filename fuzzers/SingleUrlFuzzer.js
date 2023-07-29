
const {fail,succ,warn,info,gstart,bstart,ystart,rstart,colstop} = require('../pretty.js')
const fs = require('fs')
function replaceKeyword(url,pld){
    pld = pld.replace(/ /g, '%20')
    var t=url;
    t = t.replace(/FUZZ/g,pld.replace(/\n|\r/g,''))
    return t;
    
}


class SingleUrlFuzzer{
    /*
    * Fuzzer for when both wordlist and url parameter is supplied.
    * Read url from the parameter, and read 
    * 
    */
    constructor(url,cbhandler, threadHandler, terminator, wordlist, verbose, multi=false){
        this.url = url
        this.wlistFpointer=0;
        this.cbHandler=cbhandler
        this.terminator = terminator
        this.verbose = verbose
        this.threadHandler = threadHandler;
        this.wordlist = wordlist;
        this.multi = multi;

        //read wordlist
        if(this.verbose) console.log(`${warn} Reading Wordlist`)
        try{
            this.wlistContent = fs.readFileSync(wordlist).toString().split("\n")
        }catch(e){
            console.log(`${fail} Wordlist file was not found`)
            console.log(e)
            process.exit(1)
        }
        if(this.verbose) console.log(`${succ} Wordlist loaded, ${this.wlistContent.length} lines.`)

    }

    async acquire(){
        /*
        * Acquire next url from wordlist
        */
       
        this.wlistFpointer+=1
        if(this.wlistFpointer<this.wlistContent.length){
            let line = this.wlistContent[this.wlistFpointer];
            return line
        }else{
            this.terminator.terminatedCount+=1
            return -1
        }
        
    }

    checkFinished(){

        if(this.terminator.terminatedCount == this.terminator.workerCount){
            return true;
        }
        return false;
    }

    async loadNextUrl(thread){
        /*
        * Load next url from from the wordlist
        */

        var line = await this.acquire()
        if(this.checkFinished()){
            await this.terminator.terminate();
            process.exit(0);
        }
        if(line == -1){
            try{
                return await thread.close()
            }catch(e){};
            return;
        }
        if(line != ""){
            thread.url = await replaceKeyword(this.url, line)
            thread.pld = line
            this.processURL(thread,thread.url)
        }else{
            this.loadNextUrl(thread)
        }

    }


    async processURL(thread, url){
        /*
        * Process url, visit, try to trigger events etc.
        */
        try{
            let gotoFailed=false;
            thread.goto(thread.url).catch(err=>{
                gotoFailed=true;
            })
            
            if(gotoFailed) throw new Error();
            //capture window response
            let timeout = false;
            const response = await thread.waitForNavigation().catch(err=>{
                timeout = true;
            })
            
            if(timeout) throw new Error();
            //acquire possible redirect chain
            var chain = (response.request().redirectChain())
            
            //get http response 
            thread.status = response.status();
            
            //if there was a redirect chain, output it. If not, its a normal response
            if(chain.length){
                thread.wasHTTPRedirect = true;
                this.cbHandler.catchRedirect(thread, chain)
            }else{
                this.cbHandler.catchNormal(thread)
            }
        }catch(e){
            //Not properly implemented yet, dom-errors, http timeouts
            this.cbHandler.catchLoadFailure(thread)
        }
        
        //recurses
        this.loadNextUrl(thread)
    }
}

module.exports = {
    SingleUrlFuzzer:SingleUrlFuzzer
}