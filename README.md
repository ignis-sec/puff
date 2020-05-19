# PUFF
Simple clientside vulnerability fuzzer, powered by puppeteer.

## Requirements
- npm

## INSTALL

```
git clone ..........
cd puff
npm install
```

OR

/* not yet, need release candidate first */
```
npm install -g puff
```

# Sample runs

```
node puff.js -w xss.txt -u http://your.url?message=FUZZ

node puff.js -w xss.txt -u http://your.url?message=FUZZ -t 25

node puff.js -w xss.txt -u http://your.url?message=FUZZ -d
```