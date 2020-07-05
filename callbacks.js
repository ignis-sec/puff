

const {fail,succ,warn,info,gstart,bstart,ystart,rstart,colstop} = require('./pretty.js')


class TriggerHandler{
    /*
    * This class contains and handles events triggered by the document. 
    * catchRedirect, catchRedirectJS, catchXSS, catchLoadFailure, catchNormal 
    * 
    */
    constructor(oHandler){
        this.outputHandler = oHandler
    }

    catchRedirect(thread, chain){
        this.outputHandler.write(`${ystart}[${thread.status}]  [REDIRECT-HTTP] ${thread.url}${thread.pld}`)
        for(var i=0;i<chain.length;i++){
            this.outputHandler.write(`       ${"    ".repeat(i)}|--> ${chain[i].response().url()}`)
        }
        this.outputHandler.write(colstop)
        this.outputHandler.bLastOutputImportant=true
        
    }

    //not implemented yet, lost when refactoring from electron to puppeteer
    catchRedirectJS(thread, target){
        return
        if(thread.wasHTTPRedirect){
            thread.wasHTTPRedirect=false;
            return
        }
        initCallback('redirect-js')
        this.outputHandler.write(`${bstart}[200]  [REDIRECT-JS] ${thread.url}${thread.pld}`)
        this.outputHandler.write(`       |--> ${target}`)
        this.outputHandler.write(colstop)
        
    }


    catchXSS(thread, href){
        this.outputHandler.write(`${rstart}[${thread.id}][${200}]  [XSS]  ${thread.url} ${colstop}`)
        this.outputHandler.bLastOutputImportant=true
        pendingOutput.push({
            url:thread.url,
            payload:thread.pld
        })
    
        //xss windows tend to get load looped, but not sure if needed
        thread.evaluate(() => window.stop());
    }

    catchLoadFailure(thread){
        this.outputHandler.write(`${bstart}[${thread.status}]  [FAILURE]  ${thread.pld} ${colstop}`, 5000)
        this.outputHandler.bLastOutputImportant=true
    }

    catchNormal(thread){
    
        if(thread.justRedirected){
            thread.justRedirected=false
            return
        }
        this.outputHandler.write(`${gstart}[${thread.id}][${thread.status}] ${colstop} ${thread.url}`)
        if(thread.status==200){
            this.outputHandler.bLastOutputImportant=false
        }else{
            if(status)this.outputHandler.bLastOutputImportant=true
            else this.outputHandler.bLastOutputImportant=false
        }
        return
    }
}


module.exports ={
    TriggerHandler: TriggerHandler
}
