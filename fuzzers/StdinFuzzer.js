
const {fail,succ,warn,info,gstart,bstart,ystart,rstart,colstop} = require('../pretty.js')

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
        * Acquire next url from stdin
        */
        
        var line = this.wlistContent[this.wlistFpointer];
        this.wlistFpointer+=1
        return line
    }

    checkFinished(){
        /*
        * Check if wordlist finished
        */

        //if this thread is done
        if(this.wlistFpointer>=this.wlistContent.length){
            this.terminator.terminatedCount+=1
            this.wlistFpointer+=1
            if(this.verbose){
                outputHandler.deleteLastLine()
                console.log("Thread finished")
            }
            this.threadHandler.workerCount-=1;
            //Only terminate program if all the threads have finished, so it doesn't lose the progress on those pending requests. 
            if(this.threadHandler.workerCount==0){
                //TODO, timeout possible idle/stuck threads and terminate
                if(this.verbose){
                    outputHandler.deleteLastLine()
                    outputHandler.write('Last url checked, waiting for all threads to finish')
                }
                
                if(this.multi){
                    console.log('')
                }else{
                    this.terminator.terminate()
                }
            }
            return true;
        }
        return false;
    }

    async loadNextUrl(thread){
        /*
        * Load next url from from the wordlist
        */
        if(this.checkFinished()){
            try{
                await thread.close()
            }catch(e){};
            return;
        }
        var line = await this.acquire()
        thread.url = await replaceKeyword(this.url, line)
        thread.pld = line
        this.processURL(thread,thread.url)
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
        
        //recurses
        this.loadNextUrl(thread)
    }
}

module.exports = {
    SingleUrlFuzzer:SingleUrlFuzzer
}