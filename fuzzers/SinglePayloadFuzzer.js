
const {fail,succ,warn,info,gstart,bstart,ystart,rstart,colstop} = require('../pretty.js')
const fs = require('fs')
function replaceKeyword(url,pld){
    pld = pld.replace(/ /g, '%20')
    var t=url;
    t = t.replace(/FUZZ/g,pld.replace(/\n|\r/g,''))
    return t;
    
}


class SinglePayloadFuzzer{
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

    }


    async loadNextUrl(thread){
        /*
        * Load next url from from the wordlist
        */
        thread.url = this.url
        await this.processURL(thread,thread.url)
        thread.close()
    }


    async processURL(thread, url){
        /*
        * Process url, visit, try to trigger events etc.
        */
        try{
            thread.goto(thread.url)
            
            //capture window response
            const response = await thread.waitForNavigation();
    
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
    }
}

module.exports = {
    SinglePayloadFuzzer:SinglePayloadFuzzer
}