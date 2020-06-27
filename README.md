# PUFF
Simple clientside vulnerability fuzzer, powered by puppeteer.

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

**If you have chromium: (Don't forget to set its path in config.json)**

windows:
```
set PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install -g puff-fuzz
```

linux:
```
export PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
npm install -g puff-fuzz
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
  -h, --help               display help for command
```


# Alert is filtered by WAF?
Don't worry, just modify your wordlist to use `puff()`  instead of `alert()` in your payload.

# Sample runs


Running from source:
```
node puff.js -w xss.txt -u "http://your.url?message=FUZZ"

node puff.js -w xss.txt -u "http://your.url?message=FUZZ" -t 25

node puff.js -w xss.txt -u "http://your.url?message=FUZZ" -d
```

installed via npm:
```
puff -w xss.txt -u "http://your.url?message=FUZZ"

puff -w xss.txt -u "http://your.url?message=FUZZ" -t 25

puff -w xss.txt -u "http://your.url?message=FUZZ" -d
```