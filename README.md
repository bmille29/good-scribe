# Good-Scribe

File logging module for [good](https://github.com/hapijs/good) process monitoring. Good-Scribe is a stripped down version of [good-file](https://github.com/hapijs/good-file) that, when writing to file, automatically removes the `_object` from a `[Joi](https://github.com/hapijs/joi) validation failure` within the Hapi request lifecycle.


## Usage

`good-scribe` is a [good-reporter](https://github.com/hapijs/good-reporter) implementation to write hapi server events to log files.

## Good Scribe
### new GoodScribe (options, events)

creates a new GoodScribe object with the following arguments
- `options` - specifications for the file that will be used. All file operations are done in "append" mode.
	- `String` - a string that indicates the log file to use. Opened in "append" mode.
- `events` - an object of key value pairs.
	- `key` - one of the supported [good events](https://github.com/hapijs/good) indicating the desired hapi event subscription
	- `value` - a single string or an array of strings to filter incoming events. "\*" indicates no filtering. `null` and `undefined` are assumed to be "\*"

### GoodScribe Methods
`good-scribe` implements the [good-reporter](https://github.com/hapijs/good-reporter) interface and has no additional public methods.


## Example usage within Hapi Manifest
```
{
    "server": {
        "load": { "sampleInterval": 1000 }
    },
    "connections": [
        {
            "port": 8080,
            "routes": { "timeout": { "server": 30000 } },
            "load": { "maxHeapUsedBytes": 1073741824, "maxRssBytes": 2147483648, "maxEventLoopDelay": 5000 },
            "labels": ["api", "http"]
        },
        {
            "port": 8443,
            "routes": { "timeout": { "server": 30000 } },
            "load": { "maxHeapUsedBytes": 1073741824, "maxRssBytes": 2147483648, "maxEventLoopDelay": 5000 },
            "labels": ["api", "https"]
        }
    ],
    "plugins": {
        "good": {
            "opsInterval": 5000,
            "logRequestHeaders": true,
            "reporters": [
                { "reporter": "good-console", "args": [{ "request": "*", "response": "*", "ops": "*", "log": "*", "error": "*" }] },
                { "reporter": "good-scribe", "args": ["./logs/request.log", { "request": "*" }] },
                { "reporter": "good-scribe", "args": ["./logs/response.log", { "response": "*" }] },
                { "reporter": "good-scribe", "args": ["./logs/ops.log", { "ops": "*" }] },
                { "reporter": "good-scribe", "args": ["./logs/log.log", { "log": "*" }] },
                { "reporter": "good-scribe", "args": ["./logs/error.log", { "error": "*" }] }
            ]
        }
    }
}
```