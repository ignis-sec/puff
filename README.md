
![npm package size](https://img.shields.io/bundlephobia/min/puff-fuzz)
![npm puppeteer package](https://img.shields.io/npm/v/puff-fuzz.svg)
[![Average time to resolve an issue](http://isitmaintained.com/badge/resolution/flameofignis/puff.svg)](http://isitmaintained.com/project/flameofignis/puff "Average time to resolve an issue")
[![Percentage of issues still open](http://isitmaintained.com/badge/open/flameofignis/puff.svg)](http://isitmaintained.com/project/flameofignis/puff "Percentage of issues still open")
![Release - Downloads](https://img.shields.io/github/downloads/flameofignis/puff/total?label=release%20downloads)
![npm](https://img.shields.io/npm/dm/puff-fuzz?label=npm%20downloads)


# PUFF
Simple clientside vulnerability fuzzer, powered by puppeteer.

** I will eventually rewrite this project. It works well, but it's not very clean and from my amateur years.**

## How does it work?
This tool uses puppeteer to open a headless browser, and then injects payloads into the page, and checks if the payload was executed. This ensures there are no false alarms as it will only report a URL if the function was already called, providing a proof-of-concept.

## Requirements
- npm

## INSTALL

```
git clone https://github.com/FlameOfIgnis/puff
cd puff
npm install
```

**OR**

If you dont have chromium:
```
npm install -g puff-fuzz
```

**If you have chromium: (Don't forget to set path via puff -c "path/to/chromium/"

windows:
```
set PUPPETEER_SKIP_DOWNLOAD=true
npm install -g puff-fuzz
```

linux:
```
export PUPPETEER_SKIP_DOWNLOAD=true
npm install -g puff-fuzz
```


**Testing**
```
Windows:
node puff.js -w .\wordlist-examples\xss.txt -u "http://www.xssgame.com/f/m4KKGHi2rVUN/?query=FUZZ"

Linux:
node puff.js -w ./wordlist-examples/xss.txt -u "http://www.xssgame.com/f/m4KKGHi2rVUN/?query=FUZZ"
```

# Help String

```
Usage: puff [options]

Options:
  -w, --wordlist <file>    wordlist to use
  -u, --url <url>          url to fuzz
  -t, --threads <tcount>   threads to run (default: 5)
  -v, --verbose            verbosity
  -o, --output <filename>  output filename
  -d, --demo               Demo mode, hides url's in output, and clears terminal when run (to hide url in cli)
  -s, --status             Show requests with unusual response codes
  -oA, --outputAll         Output all the responses
  -k, --ignoreSSL          Ignore ssl errors
  -c, --chromePath <path>  Set chromium path permenantly
  -h, --help               display help for command
```


# Alert is filtered by WAF?
Don't worry, just modify your wordlist to use `puff()`  instead of `alert()` in your payload.

# Sample runs



**Running from source:**
```
node puff.js -w xss.txt -u "http://your.url?message=FUZZ"

node puff.js -w xss.txt -u "http://your.url?message=FUZZ" -t 25

node puff.js -w xss.txt -u "http://your.url?message=FUZZ" -d
```

**installed via npm:**
```
puff -w xss.txt -u "http://your.url?message=FUZZ"

puff -w xss.txt -u "http://your.url?message=FUZZ" -t 25

puff -w xss.txt -u "http://your.url?message=FUZZ" -d
```



**Running with stdin fuzzing mode:**
```
cat urls.txt | node puff.js -w .\wordlist-examples\events.txt


cat urls.txt | puff -w .\wordlist-examples\events.txt
```
Where urls.txt is
```
http://example.com?query=FUZZ
https://another.com/page/#FUZZ
```


**Running with stdin single payload mode:**
```
cat urls.txt | node puff.js


cat urls.txt | puff
```

Where urls.txt is
```
http://example.com?query=<script>alert()</script>
http://example.com?query=javascript:alert()
https://another.com/page/#<script>alert()</script>
```


