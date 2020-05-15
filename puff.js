const puppeteer = require('puppeteer');
const { program } = require('commander');
const fs = require('fs')
//pretty colors
var fail="[\033[91m+\033[0m]"
var succ="[\033[92m+\033[0m]"
var warn="[\033[93m+\033[0m]"
var info="[\033[94m+\033[0m]"
var gstart =  "\033[92m"
var bstart =  "\033[94m"
var ystart =  "\033[93m"
var rstart =  "\033[91m"
var colstop = "\033[0m"

/////////////////////////////////////////
//SET CLI PARAMETERS
program
.requiredOption('-w, --wordlist <file>', 'wordlist to use')
.requiredOption('-u, --url <url>', 'url to fuzz')
.option('-T, --timeout <ms>', 'timeout for each worker to wait until js code finishes in milliseconds', 500)
.option('-t, --threads <tcount>', 'threads to run', 5)
.option('-v, --verbose', 'verbosity')
.option('-W, --window', 'show window')
.option('-m, --manual', 'manual mode');
program.parse(process.argv);

console.log(process.argv)
//parse cli params to variables
var verbose = program.verbose || false
var url=program.url
var wordlist=program.wordlist
var workerCount=program.threads
var timeoutLen=program.timeout //deprecated
var window = program.window || false
var browser = false

var wlistContent = false
var preloadFile;

function xssCallback(){

}

async function makeNewThread(browser, callback){
    const page = await browser.newPage();
    await page.evaluateOnNewDocument(preloadFile);
    await page.exposeFunction('xssCallback', (href)=>{
        catchXSS(href)
    })
    if(verbose) console.log("Created thread")
    callback(page)
    return page
}


async function loadURL(thread, url){
    thread.goto(url)
    const response = await thread.waitForNavigation();
    thread.status = response.status();
    catchNormal(thread)
    return loadNextUrl(thread)
}

terminated = false
function terminateProgram(){
    if(!terminated){
        terminated=true
        browser.close()
    }
}

async function loadNextUrl(thread){

    //if this thread is done
    if(wlistFpointer>=wlistContent.length){ 
        terminateProgram()        
    }else{

        var line = wlistContent[wlistFpointer]

        //create fuzz target
        var t = url.replace("FUZZ",(line))
        thread.url = t
        
        //increment file pointer counter
        wlistFpointer+=1;
        //if its manual mode, update menu
        return await loadURL(thread,t)
    }   
}


//Callbacks from different types of events
function initCallback(type){
    if(url.length>150) url = (url.substring(0, 150) + "...")
    if(type=='normal'){
        bLastOutputImportant=false;
    }
}

function catchRedirect(thread){
    initCallback('redirect')
    console.log(`${ystart}[${thread.status}]  [REDIRECT]--> ${thread.toUrl}\n\t ${thread.pld} ${colstop}`)
}

function catchXSS(href){
    initCallback('xss')
    console.log(`${rstart}[${200}]  [XSS]  ${href} ${colstop}`)
}

function catchLoadFailure(thread){
    initCallback('fail')
    console.log(`${bstart}[${thread.status}]  [FAILURE]  ${thread.pld} ${colstop}`)
}

function catchNormal(thread){
    initCallback('normal')
    if(thread.status==200){
        console.log(`${gstart}[${thread.status}] ${colstop} ${thread.url}`)
    }else{
        console.log(`${rstart}[${thread.status}] ${colstop} ${thread.url}`)
    }
    return
}
















(async () => {
    browser = await puppeteer.launch({});
    preloadFile = await fs.readFileSync('./preload.js', 'utf8');
    //read wordlist
    if(verbose) console.log(`${warn} Reading Wordlist`)
    wlistContent = await fs.readFileSync(wordlist).toString().split("\n")
   
    if(verbose) console.log(`${succ} Wordlist loaded, ${wlistContent.length} lines.`)
    wlistFpointer=0;
    

    //initialize threads
    var threads = []
    for(var i=0;i<workerCount;i++){
        var newThread = makeNewThread(browser, loadNextUrl);
        threads.push(newThread)
    }

})();