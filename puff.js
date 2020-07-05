#!/usr/bin/env node


// dependecies
const puppeteer = require('puppeteer');
const { program } = require('commander');
const fs = require('fs')
const path = require('path')


//config wizard and io handlers
const {setChromePath,resolveChromiumPath} = require('./configwiz.js')
const {OutputHandler} = require('./io.js')
outputHandler = new OutputHandler(program.demo, program.outputAll)

// page callbacks and pretty output headers
const {TriggerHandler} = require('./callbacks.js')
cbHandler = new TriggerHandler(outputHandler)
const {fail,succ,warn,info,gstart,bstart,ystart,rstart,colstop} = require('./pretty.js')

// graceful termination
const {Terminator} = require('./terminator.js')
var terminator = new Terminator(process, program);

// threading
const {ThreadHandler} = require('./threading.js')

/////////////////////////////////////////
//SET CLI PARAMETERS
program
.option('-w, --wordlist <file>', '[required] wordlist to use')
.option('-u, --url <url>', '[required] url to fuzz')
.option('-t, --threads <tcount>', 'threads to run', 5)
.option('-v, --verbose', 'verbosity')
.option('-o, --output <filename>', 'output filename')
.option('-d, --demo', 'Demo mode, hides url\'s in output, and clears terminal when run (to hide url in cli)')
.option('-s, --status', 'Show requests with unusual response codes')
.option('-oA, --outputAll', 'Output all the responses')
.option('-k, --ignoreSSL', 'Ignore ssl errors')
.option('-c, --chromePath <path>', 'Set chromium path permenantly')
program.parse(process.argv);

//parse cli params to variables
var verbose = program.verbose || false
var wordlist=program.wordlist
var workerCount=program.threads
var browser = false
var sslIgnore = program.ignoreSSL|| false
var threads = []



var config = require(path.join(__dirname,'/config.json'))

//if -c is passed, set new chrome path
if(program.chromePath){
    setChromePath(program.chromePath)
}

//resolve ch
var chromium_path = resolveChromiumPath(config);

//check if required parameters were given
if(!(program.wordlist || program.url)){
    console.log('Wordlist and url are required parameters.')
    process.exit()
}



//init tool
(async () => {
    try{
        browser = await puppeteer.launch({executablePath:chromium_path,args: ['--no-sandbox', '--disable-setuid-sandbox'], ignoreHTTPSErrors: sslIgnore});
    }catch(e){
        console.log(`${fail} Failed to launch chromium browser. `)
        console.log(e)
        process.exit(1)
    }
    terminator.browser = browser;
    threadHandler = new ThreadHandler(browser)

    
    const {SingleUrlFuzzer} = require('./SingleUrlFuzzer.js')
    var suFuzzer = new SingleUrlFuzzer(program.url, cbHandler, threadHandler, terminator, wordlist, verbose);


    //initialize threads
    for(var i=0;i<workerCount;i++){
        var newThread = threadHandler.newThread(browser, suFuzzer, cbHandler);
        console.log('New thread created')
        threads.push(newThread)
    }

})();