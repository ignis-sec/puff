//responsible for writing request output




class ResponseWriter{
    /*
    * This class is responsible for outputting the http request responses to the terminal.
    * 
    */
    constructor(demo,oa){
        this.bLastOutputImportant=true;
        this.demo = demo;
        this.oa=oa;
    }

    write(message, clamp=process.stdout.columns-2){
        /*
        * write the message, delete last line if it was marked not important.
        * Clamp to the length of second parameter if passed.
        */
        
        //if message is longer than the clamp length, clamp it and append ...
        if(message.length >=clamp)
            message = (message.substring(0, clamp - 3) + "...")
        
        //if demo mode is activated, hide base url
        if(this.demo){
            message = message.replace(/http(s)?:\/\/.*?\//, "https://[REDACTED]/")
        }
    
        //output all mode, write every response, even normal ones
        if(this.oa){
            process.stdout.write("\n" + message)
        }else{
            //if last output wasn't registered as important, delete the last line
            if(!this.bLastOutputImportant){
                this.deleteLastLine(true)
                process.stdout.write(message)
            }else{
                process.stdout.write("\n" + message)
            }
        }
    }

    deleteLastLine(force=false){
        if(!force && this.bLastOutputImportant) return
        process.stdout.write("\r\x1b[K")
    }
}

module.exports ={
    OutputHandler: ResponseWriter
}