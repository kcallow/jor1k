// -------------------------------------------------
// ------------------ Utils ------------------------
// -------------------------------------------------

function SendToMaster(command, data) {
    postMessage(
    {
        "command" : command,
        "data" : data
    }
    );
}

function DebugMessage(message) {
    SendToMaster("Debug", message);
}

function abort() {
    DebugMessage("Abort execution.");
    SendToMaster("Stop");
    sys.PrintState();
    throw new Error('Kill worker');
}

function GetMilliseconds() {
    return (new Date()).getTime();
}

// big endian to little endian and vice versa
function Swap32(val) {
    return ((val & 0xFF) << 24) | ((val & 0xFF00) << 8) | ((val >>> 8) & 0xFF00) | ((val >>> 24) & 0xFF);
}

function Swap16(val) {
    return ((val & 0xFF) << 8) | ((val >> 8) & 0xFF);
}

// cast an integer to a signed integer
function int32(val) {
    return (val >> 0);
}

// cast an integer to a unsigned integer
function uint32(val) {
    return (val >>> 0);
}

function hex8(x) {
    var val = uint32(x);
    return ("0x" + ("00000000" + val.toString(16)).substr(-8).toUpperCase());
}

function CopyBinary(to, from, size, buffersrc, bufferdest) {
    var i = 0;
    for (i = 0; i < size; i++) {
        bufferdest[to + i] = buffersrc[from + i];
    }
}

function LoadBinaryResource(url, OnSuccess, OnError) {
    var req = new XMLHttpRequest();
    req.open('GET', url, true);
    req.responseType = "arraybuffer";
    req.onreadystatechange = function () {
        if (req.readyState != 4) {
            return;
        }
        if ((req.status != 200) && (req.status != 0)) {
            OnError("Error: Could not load file " + url);
            return;
        }
        var arrayBuffer = req.response;
        if (arrayBuffer) {
            OnSuccess(arrayBuffer);
        } else {
            OnError("Error: No data received from: " + url);
        }
    };
    /*
        req.onload = function(e)
        {
                var arrayBuffer = req.response;
                if (arrayBuffer) {
                    OnLoadFunction(arrayBuffer);
                }
        };
    */
    req.send(null);
}

function DownloadAllAsync(urls, OnSuccess, OnError) {
    var pending = urls.length;
    var result = [];
    if (pending === 0) {
        setTimeout(onsuccess.bind(null, result), 0);
        return;
    }
    urls.forEach(function(url, i)  {
        LoadBinaryResource(
            url, 
            function(buffer) {
                if (result) {
                    result[i] = buffer;
                    pending--;
                    if (pending === 0) {
                        OnSuccess(result);
                    }
                }
            }, 
            function(error) {
                if (result) {
                    result = null;
                    OnError(error);
                }
            }
        );
    });
}

// Inserts data from an array to a byte aligned struct in memory
function ArrayToStruct(typelist, input, struct, offset) {
    var item;
    for (var i=0; i < typelist.length; i++) {
        item = input[i];
        switch (typelist[i]) {
            case "w":
                struct[offset^3] = item & 0xFF;
                offset++;
                struct[offset^3] = (item >>> 8) & 0xFF;
                offset++;
                struct[offset^3] = (item >>> 16) & 0xFF;
                offset++;
                struct[offset^3] = item >>> 24;
                offset++;
                break;
            case "h":
                struct[offset^3] = item & 0xFF;
                offset++;
                struct[offset^3] = item >>> 8;
                offset++;
                break;
            case "b":
                struct[offset^3] = item;
                offset++;
                break;
            case "s":
                struct[offset^3] = item.length & 0xFF;
                offset++;
                struct[offset^3] = item.length >>> 8;
                offset++;
                for (var j in item) {
                    struct[offset^3] = item.charCodeAt(j);
                    offset++;
                }
                break;
            default:
                DebugMessage("ArrayToStruct: Unknown type=" + type[i]);
        }
    }
};


// Extracts data from a byte aligned struct in memory to an array
function StructToArray(typelist, struct, offset) {
    var output = [];
    
    for (var i=0; i < typelist.length; i++) {
        switch (typelist[i]) {
            case "w":
                var val = struct[offset^3];
                offset++;
                val += struct[offset^3] << 8;
                offset++;
                val += struct[offset^3] << 16;
                offset++;
                val += (struct[offset^3] << 24) >>> 0;
                offset++;
                output.push(val);
                break;
            case "h":
                var val = struct[offset^3];
                offset++;
                output.push(val + (struct[offset^3] << 8));
                offset++;
                break;
            case "b":
                output.push(struct[offset^3]);
                offset++;
                break;
            case "s":
                var len = struct[offset^3];
                offset++;
                len += struct[offset^3] << 8;
                offset++;
                var str = '';
                for (var j=0; j < len; j++)
                {
                    str += String.fromCharCode(struct[offset^3]);
                    offset++;
                }
                output.push(str);
                break;
            default:
                DebugMessage("StructToArray: Unknown type=" + type[i]);
        }
    }
    return output;
};
